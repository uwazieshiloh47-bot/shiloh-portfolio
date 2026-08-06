import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const hostname = "127.0.0.1";
const port = 5500;
const root = process.cwd();
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".ttf": "font/ttf",
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);
    const requestedPath = pathname === "/" ? "/index.html" : pathname;
    const filePath = path.resolve(root, `.${requestedPath}`);

    if (!filePath.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    const fileStat = await stat(filePath);
    const resolvedPath = fileStat.isDirectory()
      ? path.join(filePath, "index.html")
      : filePath;
    const body = await readFile(resolvedPath);
    const contentType =
      contentTypes[path.extname(resolvedPath).toLowerCase()] ??
      "application/octet-stream";

    response.writeHead(200, { "content-type": contentType }).end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, hostname, () => {
  console.log(`Portfolio available at http://localhost:${port}`);
});
