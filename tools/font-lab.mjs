import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const publicRoot = join(root, "public");
const indexPath = join(publicRoot, "index.html");
const clientPath = new URL("font-lab-client.js", import.meta.url);
const port = Number(process.env.PORT || 4176);

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const labCss = `
  :root { --font-lab-bar: 72px; }
  html { scroll-padding-top: calc(var(--font-lab-bar) + 18px) !important; }
  body { padding-top: var(--font-lab-bar) !important; }
  .site-header { top: var(--font-lab-bar) !important; }
  #font-lab {
    position: fixed; inset: 0 0 auto; z-index: 2147483647; min-height: var(--font-lab-bar);
    display: flex; align-items: center; gap: 10px; padding: 10px 18px;
    color: #eceae3; background: #151518; border-bottom: 1px solid #3b3b40;
    box-shadow: 0 8px 30px rgb(0 0 0 / 24%); font: 500 11px/1.2 "IBM Plex Mono", ui-monospace, monospace;
  }
  #font-lab strong { margin-right: 5px; color: #fff; font-size: 13px; white-space: nowrap; }
  #font-lab .font-list { display: flex; gap: 7px; overflow-x: auto; scrollbar-width: none; }
  #font-lab .font-list::-webkit-scrollbar { display: none; }
  #font-lab button {
    appearance: none; flex: 0 0 auto; min-height: 34px; padding: 7px 12px; color: #d8d7d2;
    background: #202024; border: 1px solid #45454b; border-radius: 999px; cursor: pointer; font: inherit;
  }
  #font-lab button:hover, #font-lab button[aria-pressed="true"] { color: #fff; border-color: #7187ed; }
  #font-lab button[aria-pressed="true"] { background: #252a43; }
  #font-lab [data-scale] { border-style: dashed; }
  #font-lab [data-copy] { margin-left: auto; }
  #font-lab-output {
    position: fixed; right: 18px; top: calc(var(--font-lab-bar) + 14px); z-index: 2147483647;
    padding: 9px 12px; color: #eceae3; background: #222226; border: 1px solid #55555d;
    border-radius: 4px; opacity: 0; transform: translateY(-5px); transition: .18s; pointer-events: none;
    font: 11px/1.3 "IBM Plex Mono", ui-monospace, monospace;
  }
  #font-lab-output.show { opacity: 1; transform: none; }

  html.font-scale-normalized {
    --type-display: clamp(52px, 6.2vw, 74px);
    --type-section: clamp(36px, 3.7vw, 42px);
    --type-subhead: 21px;
    --type-lead: 21px;
    --type-body: 18px;
    --type-small: 16px;
    --type-label: 12px;
  }
  html.font-scale-normalized body { font-size: var(--type-body) !important; }
  html.font-scale-normalized .hero h1 { font-size: var(--type-display) !important; }
  html.font-scale-normalized h2 { font-size: var(--type-section) !important; }
  html.font-scale-normalized h3,
  html.font-scale-normalized .paper-parts h3,
  html.font-scale-normalized .stages h3,
  html.font-scale-normalized .practical-grid h3 { font-size: var(--type-subhead) !important; }
  html.font-scale-normalized .lead,
  html.font-scale-normalized .hero-deck,
  html.font-scale-normalized blockquote { font-size: var(--type-lead) !important; }
  html.font-scale-normalized .hero-summary,
  html.font-scale-normalized .prose,
  html.font-scale-normalized .paper-parts p,
  html.font-scale-normalized .scope-note,
  html.font-scale-normalized .disclosure p,
  html.font-scale-normalized .stages p,
  html.font-scale-normalized .details-copy,
  html.font-scale-normalized .schedule,
  html.font-scale-normalized .faq-list p,
  html.font-scale-normalized .submission-status p { font-size: var(--type-body) !important; }
  html.font-scale-normalized .margin-note p,
  html.font-scale-normalized .small-note,
  html.font-scale-normalized .person-aff,
  html.font-scale-normalized .format-study-caption,
  html.font-scale-normalized .contact .lead { font-size: var(--type-small) !important; }
  html.font-scale-normalized .eyebrow,
  html.font-scale-normalized .section-index,
  html.font-scale-normalized .facts dt,
  html.font-scale-normalized .paper-parts li > span,
  html.font-scale-normalized .stages li > span,
  html.font-scale-normalized .people-label,
  html.font-scale-normalized .pending,
  html.font-scale-normalized .expander > summary,
  html.font-scale-normalized .nav-links a { font-size: var(--type-label) !important; }
  @media (max-width: 760px) {
    :root { --font-lab-bar: 116px; }
    #font-lab { align-items: flex-start; flex-wrap: wrap; }
    #font-lab .font-list { order: 3; width: 100%; }
    #font-lab [data-copy] { margin-left: auto; }
  }
`;

const extraFonts = "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300..600&family=DM+Serif+Display:ital@0;1&family=IBM+Plex+Sans:wght@400;500&family=Literata:ital,opsz,wght@0,7..72,300..600;1,7..72,300..600&family=Lora:ital,wght@0,400..600;1,400..600&family=Manrope:wght@400..600&display=swap";

function labPage(source) {
  return source.replace(
    "</head>",
    `<link rel="stylesheet" href="${extraFonts}"><link rel="stylesheet" href="/__font-lab.css"><script type="module" src="/__font-lab.js"></script></head>`,
  );
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname === "/__font-lab.css") {
      response.writeHead(200, { "content-type": types[".css"], "cache-control": "no-store" });
      response.end(labCss);
      return;
    }
    if (url.pathname === "/__font-lab.js") {
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
  console.log(`Font lab: http://127.0.0.1:${port}`);
  console.log("Choose type systems in the toolbar. No site files are changed.");
});
