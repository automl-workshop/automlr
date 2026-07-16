import { createServer } from "node:http";
import { readFile, rename, writeFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "parse5";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const publicRoot = join(root, "public");
const indexPath = join(publicRoot, "index.html");
const port = Number(process.env.PORT || 4174);

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function editableNodes(source) {
  const document = parse(source, { sourceCodeLocationInfo: true });
  const nodes = [];

  function visit(node) {
    const location = node.sourceCodeLocation;
    if (node.tagName && location?.startTag && location?.endTag) {
      nodes.push({ id: `copy-${nodes.length + 1}`, node, location });
    }
    node.childNodes?.forEach(visit);
  }

  visit(document);
  return nodes;
}

function editorPage(source) {
  const nodes = editableNodes(source);
  const insertions = nodes
    .map(({ id, location }) => ({
      offset: location.startTag.endOffset - 1,
      value: ` data-copy-id="${id}"`,
    }))
    .sort((a, b) => b.offset - a.offset);

  let html = source;
  for (const { offset, value } of insertions) {
    html = html.slice(0, offset) + value + html.slice(offset);
  }

  const editorAssets = `
    <link rel="stylesheet" href="/__copy-editor.css">
    <script type="module" src="/__copy-editor.js"></script>
  `;
  return html.replace("</head>", `${editorAssets}</head>`);
}

async function saveEdits(edits) {
  const source = await readFile(indexPath, "utf8");
  const nodes = editableNodes(source);
  const byId = new Map(nodes.map((entry) => [entry.id, entry]));
  const patches = [];

  for (const edit of edits) {
    const entry = byId.get(edit.id);
    if (!entry || typeof edit.html !== "string") {
      throw new Error(`The page changed while editing (${edit.id}). Reload and try again.`);
    }
    patches.push({
      start: entry.location.startTag.endOffset,
      end: entry.location.endTag.startOffset,
      value: edit.html,
    });
  }

  patches.sort((a, b) => b.start - a.start);
  let updated = source;
  for (const patch of patches) {
    updated = updated.slice(0, patch.start) + patch.value + updated.slice(patch.end);
  }

  const tempPath = `${indexPath}.copy-editor.tmp`;
  await writeFile(tempPath, updated, "utf8");
  await rename(tempPath, indexPath);
  return patches.length;
}

const editorCss = `
  :root { --copy-editor-bar: 58px; }
  html { scroll-padding-top: calc(var(--copy-editor-bar) + 18px) !important; }
  body { padding-top: var(--copy-editor-bar) !important; }
  .site-header { top: var(--copy-editor-bar) !important; }
  #copy-editor-bar {
    position: fixed; inset: 0 0 auto; z-index: 2147483647; height: var(--copy-editor-bar);
    display: flex; align-items: center; gap: 10px; padding: 0 18px;
    color: #eceae3; background: #151518; border-bottom: 1px solid #3b3b40;
    font: 500 12px/1.2 "IBM Plex Mono", ui-monospace, monospace;
    box-shadow: 0 8px 30px rgb(0 0 0 / 24%);
  }
  #copy-editor-bar strong { color: #fff; font-size: 13px; letter-spacing: .02em; }
  #copy-editor-bar .copy-editor-status { margin-right: auto; color: #9da0a7; }
  #copy-editor-bar button {
    appearance: none; border: 1px solid #54545b; border-radius: 999px; padding: 8px 13px;
    color: #eceae3; background: transparent; font: inherit; cursor: pointer;
  }
  #copy-editor-bar button:hover { border-color: #8ca9c4; }
  #copy-editor-bar button[data-save] { color: #101114; background: #d3a44f; border-color: #d3a44f; }
  #copy-editor-bar button:disabled { opacity: .45; cursor: default; }
  [data-copy-editable="true"] { cursor: text; outline: 1px dashed rgb(127 161 193 / 42%); outline-offset: 5px; border-radius: 2px; }
  [data-copy-editable="true"]:hover { outline-color: rgb(127 161 193 / 82%); background: rgb(127 161 193 / 7%); }
  [data-copy-editable="true"]:focus { outline: 2px solid #d3a44f; background: rgb(211 164 79 / 9%); }
  [data-copy-dirty="true"] { outline-color: #d3a44f; }
  #copy-editor-toast {
    position: fixed; right: 18px; bottom: 18px; z-index: 2147483647; padding: 11px 14px;
    color: #eceae3; background: #222226; border: 1px solid #55555d; border-radius: 5px;
    font: 12px/1.4 "IBM Plex Mono", ui-monospace, monospace; opacity: 0; transform: translateY(8px);
    transition: opacity .18s, transform .18s; pointer-events: none;
  }
  #copy-editor-toast.show { opacity: 1; transform: none; }
  @media (max-width: 700px) {
    #copy-editor-bar .copy-editor-help { display: none; }
  }
`;

const editorJs = await readFile(new URL("copy-editor-client.js", import.meta.url), "utf8");

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "POST" && url.pathname === "/__copy-editor/save") {
      let body = "";
      for await (const chunk of request) {
        body += chunk;
        if (body.length > 1_000_000) throw new Error("Edit payload is too large.");
      }
      const payload = JSON.parse(body);
      const saved = await saveEdits(Array.isArray(payload.edits) ? payload.edits : []);
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ saved }));
      return;
    }

    if (url.pathname === "/__copy-editor.css") {
      response.writeHead(200, { "content-type": types[".css"], "cache-control": "no-store" });
      response.end(editorCss);
      return;
    }

    if (url.pathname === "/__copy-editor.js") {
      response.writeHead(200, { "content-type": types[".js"], "cache-control": "no-store" });
      response.end(editorJs);
      return;
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      const source = await readFile(indexPath, "utf8");
      response.writeHead(200, { "content-type": types[".html"], "cache-control": "no-store" });
      response.end(editorPage(source));
      return;
    }

    const relative = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
    const filePath = join(publicRoot, relative);
    if (!filePath.startsWith(publicRoot)) throw new Error("Invalid path");
    const file = await readFile(filePath);
    response.writeHead(200, { "content-type": types[extname(filePath)] || "application/octet-stream" });
    response.end(file);
  } catch (error) {
    const status = error.code === "ENOENT" ? 404 : 500;
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: status === 404 ? "Not found" : error.message }));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Visual copy editor: http://127.0.0.1:${port}`);
  console.log("Edits save directly to public/index.html. Press Ctrl+C to stop.");
});
