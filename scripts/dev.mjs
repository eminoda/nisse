import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const tokenPath = join(homedir(), ".nisse", "runtime-token");
const children = [];
const localEnvPath = join(root, ".env.local");
let stopping = false;

if (existsSync(localEnvPath) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(localEnvPath);
}

function start(args, extraEnv = {}) {
  const child = spawn(pnpm, args, {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
    windowsHide: false,
    shell: process.platform === "win32",
  });
  children.push(child);
  return child;
}

function startRuntime() {
  const runtime = start(["--filter", "@nisse/runtime", "dev"], {
    NISSE_DEV_ALLOW_EXTENSION_ORIGINS: "1",
  });
  runtime.once("exit", () => {
    if (stopping) return;
    console.warn("[dev] Runtime exited unexpectedly; restarting in 1 second...");
    setTimeout(() => {
      if (!stopping) startRuntime();
    }, 1000);
  });
  return runtime;
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

async function runtimeHealthy() {
  if (!existsSync(tokenPath)) return false;
  const token = (await import("node:fs/promises")).readFile(tokenPath, "utf8").then((value) => value.trim());
  try {
    const response = await fetch("http://127.0.0.1:4317/api/runtime/status", {
      headers: { Authorization: `Bearer ${await token}` },
      signal: AbortSignal.timeout(1500),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForRuntime(timeoutMs = 15_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= timeoutMs) {
    if (await runtimeHealthy()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Runtime did not become healthy on http://127.0.0.1:4317");
}

function stopAll() {
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);
process.on("exit", stopAll);

console.log("[dev] Starting Runtime and waiting for its local token...");
startRuntime();
await waitForToken();
await waitForRuntime();
const token = (await import("node:fs/promises"))
  .readFile(tokenPath, "utf8")
  .then((value) => value.trim());
const runtimeToken = await token;

console.log("[dev] Starting Tauri Desktop and Extension watch build...");
const tauri = start(["--filter", "@nisse/desktop", "tauri", "dev"], {
  NISSE_RUNTIME_ALREADY_STARTED: "1",
});
start(["--filter", "@nisse/extension", "build:watch"], {
  VITE_NISSE_RUNTIME_TOKEN: runtimeToken,
});

tauri.once("exit", () => {
  console.log("[dev] Desktop exited; stopping Runtime and extension watcher...");
  stopAll();
});

await new Promise((resolve) => {
  tauri.once("exit", resolve);
});
stopAll();
