import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const publicRoot = join(root, "public");
const labRoot = join(root, "tools");
const port = Number(process.env.PORT || 4177);

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === "/" || url.pathname === "/index.html") {
      response.writeHead(200, { "content-type": types[".html"], "cache-control": "no-store" });
      response.end(await readFile(join(labRoot, "ascii-lab.html"), "utf8"));
      return;
    }
    if (url.pathname === "/ascii-lab-client.js") {
      response.writeHead(200, { "content-type": types[".js"], "cache-control": "no-store" });
      response.end(await readFile(join(publicRoot, "ascii-animation.js"), "utf8"));
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
  console.log(`ASCII lab: http://127.0.0.1:${port}`);
  console.log("Experiments only. No site files are changed.");
});
