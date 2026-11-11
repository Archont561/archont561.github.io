import { expect, test } from "@archont561/bun-test-utils";
import { servePortfolio } from "@/tests/support/portfolio-server";

test("the browser fixture serves exports, redirects directories, and rejects unsafe requests", async ({
  tmpdir,
}) => {
  tmpdir.write("index.html", "Home");
  tmpdir.write("docs/index.html", "Documentation");
  tmpdir.write("404.html", "Not found");
  tmpdir.write("app.js", "console.log('ready')");
  const request = (path: string, init?: RequestInit) =>
    servePortfolio(new Request(`http://localhost${path}`, init), tmpdir.dir);

  const home = await request("/");
  expect(home.status).toBe(200);
  expect(home.headers.get("content-type")).toContain("text/html");
  expect(await home.text()).toBe("Home");
  const redirect = await request("/docs?query=1");
  expect(redirect.status).toBe(308);
  expect(redirect.headers.get("location")).toBe("http://localhost/docs/?query=1");
  expect(await (await request("/docs/")).text()).toBe("Documentation");
  const script = await request("/app.js", { method: "HEAD" });
  expect(script.status).toBe(200);
  expect(script.headers.get("content-type")).toContain("javascript");
  expect(await script.text()).toBe("");
  const notFound = await request("/missing/");
  expect(notFound.status).toBe(404);
  expect(await notFound.text()).toBe("Not found");
  expect((await request("/", { method: "POST" })).status).toBe(405);
  expect((await request("/%2e%2e%2foutside")).status).toBe(400);
  expect((await request("/%E0%A4%A")).status).toBe(400);
});
