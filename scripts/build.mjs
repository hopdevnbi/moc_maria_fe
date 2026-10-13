import { execFileSync, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

let releaseId = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA;
if (!releaseId) {
  try {
    releaseId = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    releaseId = createHash("sha256").update(randomUUID()).digest("hex");
  }
}
const result = spawnSync(
  process.execPath,
  [fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url)), "build"],
  {
    stdio: "inherit",
    env: { ...process.env, NEXT_PUBLIC_RELEASE_ID: releaseId },
  },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
