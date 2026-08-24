import assert from "node:assert/strict";
import test from "node:test";
import { createRuntimeApp } from "../dist/app.js";

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
