import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const tokenPath = join(homedir(), ".nisse", "runtime-token");
const children = [];
const localEnvPath = join(root, ".env.local");
let runtime;
let restartTimer;
let healthTimer;
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

function waitForToken(timeoutMs = 15_000) {
  if (existsSync(tokenPath)) return Promise.resolve();
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (existsSync(tokenPath)) return resolve();
      if (Date.now() - startedAt > timeoutMs) {
        return reject(new Error(`Runtime token was not created at ${tokenPath}`));
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

function scheduleRuntimeRestart(reason) {
  if (stopping || restartTimer) return;
  console.warn(`[dev:desktop] Runtime ${reason}; restarting...`);
  restartTimer = setTimeout(() => {
    restartTimer = undefined;
    startRuntime();
  }, 1000);
}

function startRuntime() {
  if (stopping || runtime) return;
  runtime = start(["--filter", "@nisse/runtime", "dev"], {
    NISSE_DEV_ALLOW_EXTENSION_ORIGINS: "1",
  });
  runtime.once("exit", () => {
    runtime = undefined;
    scheduleRuntimeRestart("stopped");
  });
}

async function waitForRuntime(timeoutMs = 15_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= timeoutMs) {
    if (await runtimeHealthy()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Runtime did not become healthy on http://127.0.0.1:4317");
}

async function monitorRuntime() {
  if (stopping || process.env.NISSE_RUNTIME_ALREADY_STARTED === "1") return;
  if (await runtimeHealthy()) return;
  if (runtime && !runtime.killed) runtime.kill();
  else startRuntime();
}

function stopAll() {
  stopping = true;
  if (restartTimer) clearTimeout(restartTimer);
  if (healthTimer) clearInterval(healthTimer);
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);
process.on("exit", stopAll);

if (process.env.NISSE_RUNTIME_ALREADY_STARTED !== "1") {
  if (await runtimeHealthy()) {
    console.log("[dev:desktop] Reusing the healthy Runtime on 4317.");
  } else {
    console.log("[dev:desktop] Starting Runtime...");
    startRuntime();
    await waitForToken();
  }
  await waitForRuntime();
  healthTimer = setInterval(() => { void monitorRuntime(); }, 5000);
}

console.log("[dev:desktop] Starting Desktop Vite server...");
const desktop = start(["--filter", "@nisse/desktop", "dev"]);
await new Promise((resolve) => desktop.once("exit", resolve));
stopAll();
