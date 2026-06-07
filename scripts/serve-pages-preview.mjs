import { createServer } from "node:http";
import { existsSync, statSync, createReadStream } from "node:fs";
import { extname, isAbsolute, join, relative, resolve } from "node:path";

const DIST_DIR = "dist";
const DIST_ROOT = resolve(DIST_DIR);
const BASE_PATH = "/notesense";
const DEFAULT_PORT = 4174;
const HOST = "127.0.0.1";

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
]);

function getPort() {
  const portFlagIndex = process.argv.indexOf("--port");
  const rawPort =
    portFlagIndex >= 0 && process.argv[portFlagIndex + 1] ? process.argv[portFlagIndex + 1] : process.env.PORT;

  if (!rawPort) {
    return DEFAULT_PORT;
  }

  const port = Number(rawPort);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid port: ${rawPort}`);
  }

  return port;
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, { "content-type": "text/plain; charset=utf-8" });
  response.end(text);
}

function sendFile(response, path) {
  const contentType = contentTypes.get(extname(path)) ?? "application/octet-stream";
  response.writeHead(200, {
    "cache-control": "no-store",
    "content-type": contentType,
  });
  createReadStream(path).pipe(response);
}

function resolveDistPath(pathname) {
  if (pathname === `${BASE_PATH}/`) {
    return join(DIST_ROOT, "index.html");
  }

  if (!pathname.startsWith(`${BASE_PATH}/`)) {
    return null;
  }

  let relativePath;

  try {
    relativePath = decodeURIComponent(pathname.slice(BASE_PATH.length + 1));
  } catch {
    return null;
  }

  const absolutePath = resolve(DIST_ROOT, relativePath);
  const relativeToDist = relative(DIST_ROOT, absolutePath);

  if (relativeToDist.startsWith("..") || isAbsolute(relativeToDist)) {
    return null;
  }

  return absolutePath;
}

const server = createServer((request, response) => {
  if (!request.url) {
    sendText(response, 400, "Bad request");
    return;
  }

  const { pathname } = new URL(request.url, `http://${HOST}`);

  if (pathname === BASE_PATH) {
    response.writeHead(308, { location: `${BASE_PATH}/` });
    response.end();
    return;
  }

  const path = resolveDistPath(pathname);

  if (!path || !existsSync(path) || !statSync(path).isFile()) {
    sendText(response, 404, "Not found");
    return;
  }

  sendFile(response, path);
});

server.listen(getPort(), HOST, () => {
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : DEFAULT_PORT;
  console.log(`Serving ${DIST_DIR} at http://${HOST}:${port}${BASE_PATH}/`);
});
