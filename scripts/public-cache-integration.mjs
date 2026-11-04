// Loopback-only QA of the actual Next compiler/RAM handler. No production writes.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, writeFile, readFile, unlink, rm } from "node:fs/promises";
import { resolve } from "node:path";

const route = resolve("src/app/api/cache-integration-qa");
const apiPort = 3044;
const nextPort = 3018;
let revision = "a".repeat(24);
let label = "before";
let enabled = true;
let failed = false;
let serviceReads = 0;
let liveReads = 0;
let gateReads = 0;
const evidence = [];
const fixture = createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/api/v1/public-content/revision") {
    gateReads++;
    return res.end(JSON.stringify({ revision, enabled }));
  }
  if (req.url === "/api/v1/providers") {
    liveReads++;
    return res.end(JSON.stringify({ liveReads }));
  }
  if (req.url === "/api/v1/services") {
    serviceReads++;
    if (failed) {
      res.statusCode = 503;
      return res.end("{}");
    }
    res.setHeader("X-Public-Revision", revision);
    return res.end(JSON.stringify({ label }));
  }
  res.statusCode = 404;
  res.end("{}");
});
let next;
let createdRoute = false;
let log = "";
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
async function read(path = "/services") {
  const response = await fetch(
    `http://127.0.0.1:${nextPort}/api/cache-integration-qa?path=${encodeURIComponent(path)}`,
    { signal: AbortSignal.timeout(90000) },
  );
  assert.equal(response.status, 200);
  return response.json();
}
try {
  await mkdir(route); // Refuse to overwrite an existing route.
  createdRoute = true;
  await writeFile(
    resolve(route, "route.ts"),
    'import { publicRead } from "@/features/marketplace/public-api";\n' +
      'export async function GET(request: Request) { const path = new URL(request.url).searchParams.get("path") === "/providers" ? "/providers" : "/services"; return Response.json(await publicRead(path)); }\n',
  );
  await new Promise((done, reject) => {
    fixture.once("error", reject);
    fixture.listen(apiPort, "127.0.0.1", done);
  });
  next = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "-p", String(nextPort)],
    {
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: "development",
        NEXT_PUBLIC_API_BASE_URL: `http://127.0.0.1:${apiPort}/api/v1`,
        PUBLIC_CONTENT_CACHE_ENABLED: "true",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  for (const stream of [next.stdout, next.stderr])
    stream.on("data", (data) => {
      log = (log + data).slice(-12000);
    });
  let ready = false;
  for (let n = 0; n < 90; n++) {
    if (next.exitCode !== null) throw new Error("Next QA server exited");
    if (log.includes("Ready in")) {
      ready = true;
      break;
    }
    await pause(1000);
  }
  assert(ready, "Next QA server ready");
  assert.deepEqual(await read(), { ok: true, data: { label: "before" } });
  const firstReads = serviceReads;
  assert.deepEqual(await read(), { ok: true, data: { label: "before" } });
  assert.equal(serviceReads, firstReads, "second request uses Next RAM entry");
  assert(gateReads >= 2, "every request verifies revision");
  evidence.push("Next RAM HIT across separate HTTP requests; authoritative gate still read");
  revision = "b".repeat(24);
  label = "after";
  assert.deepEqual(await read(), { ok: true, data: { label: "after" } });
  assert(serviceReads > firstReads, "new revision fills a new cache key");
  evidence.push("new revision immediately bypasses old Next entry");
  const liveA = await read("/providers");
  const liveB = await read("/providers");
  assert.notEqual(liveA.data.liveReads, liveB.data.liveReads);
  evidence.push("availability path remains live");
  revision = "c".repeat(24);
  failed = true;
  assert.deepEqual(await read(), { ok: false, status: 503 });
  failed = false;
  label = "recovered";
  assert.deepEqual(await read(), { ok: true, data: { label: "recovered" } });
  evidence.push("failed cache fill is not persisted; same revision recovers");
  enabled = false;
  label = "flag-off";
  assert.deepEqual(await read(), { ok: true, data: { label: "flag-off" } });
  const beforeLive = serviceReads;
  label = "still-live";
  assert.deepEqual(await read(), { ok: true, data: { label: "still-live" } });
  assert(serviceReads > beforeLive);
  evidence.push("backend flag-off bypasses existing frontend entries");
  const report = {
    mode: "local-next-dev",
    productionWrites: false,
    evidence,
    serviceReads,
    gateReads,
    liveReads,
  };
  if (process.env.PUBLIC_CACHE_QA_REPORT)
    await writeFile(process.env.PUBLIC_CACHE_QA_REPORT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(log.slice(-8000));
  throw error;
} finally {
  if (next?.pid) {
    if (process.platform === "win32")
      spawnSync("taskkill", ["/PID", String(next.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      });
    else next.kill("SIGTERM");
  }
  await new Promise((done) => fixture.close(done));
  // Only this runner's freshly created directory, resolved inside the workspace.
  if (createdRoute && route === resolve("src/app/api/cache-integration-qa"))
    await rm(route, { recursive: true, force: true });
  // Next dev leaves generated validators pointing to the temporary route after exit.
  // Remove only those generated files containing our route; Next regenerates them.
  if (createdRoute) {
    for (const name of ["validator.ts", "routes.d.ts"]) {
      const target = resolve(".next/dev/types", name);
      const content = await readFile(target, "utf8").catch(() => "");
      if (
        content.startsWith("// This file is generated automatically by Next.js") &&
        content.includes("/api/cache-integration-qa")
      )
        await unlink(target);
    }
  }
}
