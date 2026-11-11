import { resolve, sep } from "node:path";

const app = resolve(import.meta.dir, "../..");
export const portfolioOutput = resolve(app, "out");

/** Browser tests always exercise a fresh production export, not a stale out/ directory. */
export async function buildPortfolio(): Promise<void> {
  const child = Bun.spawn([process.execPath, "run", "build"], {
    cwd: app,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(`Portfolio build failed with exit code ${exitCode}:\n${stdout}\n${stderr}`);
  }
}

async function responseForFile(path: string, method: string, status = 200): Promise<Response> {
  const file = Bun.file(path);
  return new Response(method === "HEAD" ? null : file, {
    status,
    headers: {
      "content-type": file.type || "application/octet-stream",
      "cache-control": "no-store",
    },
  });
}

/** Serve the exported Pages files through bun-test-utils' ephemeral test server. */
export async function servePortfolio(request: Request, root = portfolioOutput): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
  }
  const url = new URL(request.url);
  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return new Response("Invalid path", { status: 400 });
  }
  if (pathname.includes("\0")) return new Response("Invalid path", { status: 400 });
  const base = resolve(root);
  const target = resolve(base, `.${pathname}`);
  if (target !== base && !target.startsWith(`${base}${sep}`)) {
    return new Response("Invalid path", { status: 400 });
  }

  if (pathname.endsWith("/")) {
    const index = resolve(target, "index.html");
    if (await Bun.file(index).exists()) return responseForFile(index, request.method);
  } else {
    const index = resolve(target, "index.html");
    if (await Bun.file(index).exists()) {
      url.pathname += "/";
      return Response.redirect(url, 308);
    }
    if (await Bun.file(target).exists()) return responseForFile(target, request.method);
  }
  const fallback = resolve(base, "404.html");
  if (await Bun.file(fallback).exists()) return responseForFile(fallback, request.method, 404);
  return new Response("Not found", { status: 404 });
}
