import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const tokenPath = join(homedir(), ".nisse", "runtime-token");
const children = [];

function start(args, extraEnv = {}) {
  const child = spawn(pnpm, args, {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
    windowsHide: false,
  });
  children.push(child);
  return child;
}

function waitForToken(timeoutMs = 15_000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (existsSync(tokenPath)) {
        resolve();
        return;
      }
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`Runtime token was not created at ${tokenPath}`));
        return;
      }
      setTimeout(poll, 250);
    };
    poll();
  });
}

function stopAll() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);
process.on("exit", stopAll);

console.log("[dev] Building Extension once before starting the clients...");
const extensionBuild = start(["--filter", "@nisse/extension", "build"]);
await new Promise((resolve, reject) => {
  extensionBuild.once("exit", (code) =>
    code === 0 ? resolve() : reject(new Error("Extension build failed")),
  );
});

console.log("[dev] Starting Runtime and waiting for its local token...");
const runtime = start(["--filter", "@nisse/runtime", "dev"], {
  NISSE_DEV_ALLOW_EXTENSION_ORIGINS: "1",
});
await waitForToken();
const token = (await import("node:fs/promises"))
  .readFile(tokenPath, "utf8")
  .then((value) => value.trim());
const runtimeToken = await token;

console.log("[dev] Starting Tauri Desktop and Extension watch build...");
start(["--filter", "@nisse/desktop", "tauri", "dev"]);
start(["--filter", "@nisse/extension", "run", "build", "--watch"], {
  VITE_NISSE_RUNTIME_TOKEN: runtimeToken,
});

await new Promise((resolve) => {
  runtime.once("exit", resolve);
});
stopAll();
