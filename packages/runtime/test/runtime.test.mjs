import assert from "node:assert/strict";
import test from "node:test";
import { createRuntimeApp } from "../dist/app.js";
import { WatchManager } from "../dist/watch/index.js";
import { PairingManager } from "../dist/pairing.js";

const config = {
  host: "127.0.0.1",
  port: 4317,
  token: "test-token",
  allowedOrigins: ["chrome-extension://test-extension"],
  allowChromeExtensionOrigins: false,
  version: "test",
};

const app = createRuntimeApp(config);
const request = (path, init = {}) => app.request(`http://127.0.0.1${path}`, init);
const watchManager = new WatchManager();
const watchApp = createRuntimeApp({
  ...config,
  watchManager,
  watchSources: {
    demo: async () => ({ ok: true }),
    zentao_bugs: async () => ({ bugs: [{ id: 1 }], tasks: [{ id: 2 }], projects: [{ count: 1 }] }),
  },
  dashboardSources: {
    bugs: async () => ({ bugs: [{ id: 3 }], projects: [{ count: 1 }] }),
    tasks: async () => ({ tasks: [{ id: 4 }] }),
  },
  dashboardCacheActions: {
    refreshProjects: async () => ({ projects: 36 }),
    refreshExecutions: async () => ({ projects: 36, executions: 122 }),
    getStatus: () => ({
      projects: { status: "ready", count: 36 },
      executions: { status: "ready", count: 122 },
    }),
  },
  pairingManager: new PairingManager("test-token", "ABCD-EF12"),
});
const watchRequest = (path, init = {}) => watchApp.request(`http://127.0.0.1${path}`, init);

test("status requires a bearer token", async () => {
  const response = await request("/api/runtime/status");
  assert.equal(response.status, 401);
});

test("status accepts an allowed origin and returns runtime metadata", async () => {
  const response = await request("/api/runtime/status", {
    headers: {
      Authorization: "Bearer test-token",
      Origin: "chrome-extension://test-extension",
    },
  });

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("Access-Control-Allow-Origin"),
    "chrome-extension://test-extension",
  );
  assert.deepEqual(await response.json(), { status: "running", version: "test" });
});

test("rejects an origin that is not on the allowlist", async () => {
  const response = await request("/api/runtime/status", {
    headers: {
      Authorization: "Bearer test-token",
      Origin: "https://evil.example",
    },
  });

  assert.equal(response.status, 403);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
});

test("supports browser preflight without exposing wildcard CORS", async () => {
  const response = await request("/api/runtime/status", {
    method: "OPTIONS",
    headers: { Origin: "chrome-extension://test-extension" },
  });

  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get("Access-Control-Allow-Origin"),
    "chrome-extension://test-extension",
  );
  assert.notEqual(response.headers.get("Access-Control-Allow-Origin"), "*");
});

test("serves dynamic connection schemas and keeps secrets out of summaries", async () => {
  const schemas = await request("/api/connections/schemas", {
    headers: { Authorization: "Bearer test-token" },
  });
  const schemaPayload = await schemas.json();
  assert.equal(
    schemaPayload.schemas[0].fields.some((field) => field.type === "password"),
    true,
  );

  const saved = await request("/api/connections", {
    method: "POST",
    headers: { Authorization: "Bearer test-token", "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "mock-work-system",
      name: "Local Demo",
      config: { endpoint: "https://example.test", workspace: "demo" },
      secrets: { token: "do-not-return" },
    }),
  });
  assert.equal(saved.status, 200);
  const savedPayload = await saved.json();
  assert.equal("secrets" in savedPayload.connection, false);

  const tested = await request(`/api/connections/${savedPayload.connection.id}/test`, {
    method: "POST",
    headers: { Authorization: "Bearer test-token" },
  });
  assert.equal((await tested.json()).connection.status, "ready");
});

test("status accepts the local Tauri origin", async () => {
  const response = await request("/api/runtime/status", {
    headers: {
      Authorization: "Bearer test-token",
      Origin: "http://tauri.localhost",
    },
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "http://tauri.localhost");
});

test("status accepts the Tauri development server origin", async () => {
  const response = await request("/api/runtime/status", {
    headers: {
      Authorization: "Bearer test-token",
      Origin: "http://localhost:1420",
    },
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "http://localhost:1420");
});

test("pairing exchanges the startup code without requiring a bearer token", async () => {
  const response = await watchRequest("/api/pairing/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "abcd-ef12" }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { token: "test-token" });
});

test("pairing code is protected by the runtime bearer token", async () => {
  const response = await watchRequest("/api/pairing/code", {
    headers: { Authorization: "Bearer test-token" },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { code: "ABCD-EF12" });
});

test("manages watches and runs them on demand", async () => {
  const headers = { Authorization: "Bearer test-token", "Content-Type": "application/json" };
  const created = await watchRequest("/api/watches", {
    method: "POST",
    headers,
    body: JSON.stringify({ id: "demo-watch", source: "demo", schedule: { type: "manual" } }),
  });
  assert.equal(created.status, 201);

  const listed = await watchRequest("/api/watches", { headers });
  assert.equal((await listed.json()).watches.length, 1);

  const run = await watchRequest("/api/watches/demo-watch/run", { method: "POST", headers });
  assert.equal(run.status, 200);
});

test("dashboard refresh directly queries the ZenTao source", async () => {
  const response = await watchRequest("/api/dashboard/zentao", {
    headers: { Authorization: "Bearer test-token" },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    dashboard: { bugs: [{ id: 1 }], tasks: [{ id: 2 }], projects: [{ count: 1 }] },
  });
});

test("dashboard cards can refresh through independent ZenTao endpoints", async () => {
  const headers = { Authorization: "Bearer test-token" };
  const [bugs, tasks] = await Promise.all([
    watchRequest("/api/dashboard/zentao/bugs", { headers }),
    watchRequest("/api/dashboard/zentao/tasks", { headers }),
  ]);

  assert.equal(bugs.status, 200);
  assert.deepEqual(await bugs.json(), {
    bugs: [{ id: 3 }],
    projects: [{ count: 1 }],
  });
  assert.equal(tasks.status, 200);
  assert.deepEqual(await tasks.json(), { tasks: [{ id: 4 }] });
});

test("dashboard settings can refresh ZenTao project and execution caches", async () => {
  const headers = { Authorization: "Bearer test-token" };
  const projects = await watchRequest("/api/dashboard/zentao/cache/projects/refresh", {
    method: "POST",
    headers,
  });
  const executions = await watchRequest("/api/dashboard/zentao/cache/executions/refresh", {
    method: "POST",
    headers,
  });

  assert.deepEqual(await projects.json(), { result: { projects: 36 } });
  assert.deepEqual(await executions.json(), { result: { projects: 36, executions: 122 } });
});

test("dashboard settings exposes ZenTao cache status", async () => {
  const response = await watchRequest("/api/dashboard/zentao/cache/status", {
    headers: { Authorization: "Bearer test-token" },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: {
      projects: { status: "ready", count: 36 },
      executions: { status: "ready", count: 122 },
    },
  });
});
