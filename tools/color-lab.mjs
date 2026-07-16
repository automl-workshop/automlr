import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const publicRoot = join(root, "public");
const indexPath = join(publicRoot, "index.html");
const clientPath = new URL("color-lab-client.js", import.meta.url);
const port = Number(process.env.PORT || 4175);

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const labCss = `
  :root { --color-lab-bar: 72px; }
  html { scroll-padding-top: calc(var(--color-lab-bar) + 18px) !important; }
  body { padding-top: var(--color-lab-bar) !important; }
  .site-header { top: var(--color-lab-bar) !important; }
  #color-lab {
    position: fixed; inset: 0 0 auto; z-index: 2147483647; min-height: var(--color-lab-bar);
    display: flex; align-items: center; gap: 10px; padding: 10px 18px;
    color: #eceae3; background: #151518; border-bottom: 1px solid #3b3b40;
    box-shadow: 0 8px 30px rgb(0 0 0 / 24%); font: 500 11px/1.2 "IBM Plex Mono", ui-monospace, monospace;
  }
  #color-lab strong { margin-right: 5px; color: #fff; font-size: 13px; white-space: nowrap; }
  #color-lab .palette-list { display: flex; gap: 7px; overflow-x: auto; scrollbar-width: none; }
  #color-lab .palette-list::-webkit-scrollbar { display: none; }
  #color-lab button {
    appearance: none; flex: 0 0 auto; min-height: 34px; padding: 7px 11px; color: #d8d7d2;
    background: #202024; border: 1px solid #45454b; border-radius: 999px; cursor: pointer; font: inherit;
  }
  #color-lab button:hover, #color-lab button[aria-pressed="true"] { color: #fff; border-color: #d3a44f; }
  #color-lab button[aria-pressed="true"] { background: #332c20; }
  #color-lab .swatches { display: inline-flex; margin-right: 7px; vertical-align: middle; }
  #color-lab .swatches i { width: 9px; height: 9px; border: 1px solid rgb(255 255 255 / 24%); border-radius: 50%; }
  #color-lab .swatches i + i { margin-left: -2px; }
  #color-lab [data-copy] { margin-left: auto; }
  #color-lab-output {
    position: fixed; right: 18px; top: calc(var(--color-lab-bar) + 14px); z-index: 2147483647;
    padding: 9px 12px; color: #eceae3; background: #222226; border: 1px solid #55555d;
    border-radius: 4px; opacity: 0; transform: translateY(-5px); transition: .18s; pointer-events: none;
    font: 11px/1.3 "IBM Plex Mono", ui-monospace, monospace;
  }
  #color-lab-output.show { opacity: 1; transform: none; }
  @media (max-width: 760px) {
    :root { --color-lab-bar: 116px; }
    #color-lab { align-items: flex-start; flex-wrap: wrap; }
    #color-lab .palette-list { order: 3; width: 100%; }
    #color-lab [data-copy] { margin-left: auto; }
  }
`;

function labPage(source) {
  return source.replace(
    "</head>",
    `<link rel="stylesheet" href="/__color-lab.css"><script type="module" src="/__color-lab.js"></script></head>`,
  );
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname === "/__color-lab.css") {
      response.writeHead(200, { "content-type": types[".css"], "cache-control": "no-store" });
      response.end(labCss);
      return;
    }
    if (url.pathname === "/__color-lab.js") {
      response.writeHead(200, { "content-type": types[".js"], "cache-control": "no-store" });
      response.end(await readFile(clientPath, "utf8"));
      return;
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      response.writeHead(200, { "content-type": types[".html"], "cache-control": "no-store" });
      response.end(labPage(await readFile(indexPath, "utf8")));
      return;
    }

    const relative = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
    const filePath = join(publicRoot, relative);
    if (!filePath.startsWith(publicRoot)) throw new Error("Invalid path");
    const file = await readFile(filePath);
    response.writeHead(200, { "content-type": types[extname(filePath)] || "application/octet-stream" });
    response.end(file);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 500, { "content-type": "text/plain; charset=utf-8" });
    response.end(error.code === "ENOENT" ? "Not found" : error.message);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Colour lab: http://127.0.0.1:${port}`);
  console.log("Choose palettes in the toolbar. No site files are changed.");
});
