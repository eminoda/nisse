import assert from "node:assert/strict";
import test from "node:test";
import { createRuntimeApp } from "../dist/app.js";
import { ApprovalStore } from "../dist/approvals/store.js";

const baseConfig = {
  host: "127.0.0.1",
  port: 4317,
  token: "test-token",
  allowedOrigins: [],
  allowChromeExtensionOrigins: false,
  version: "test",
};

test("approval endpoints require the runtime bearer token", async () => {
  const store = new ApprovalStore();
  const app = createRuntimeApp({ ...baseConfig, approvalStore: store });
  const pending = store.create({ tool: "mock_write", arguments: {}, summary: "写入", action: async () => ({ ok: true }) });
  const response = await app.request(`http://127.0.0.1/api/approvals/${pending.approvalId}/approve`, { method: "POST" });
  assert.equal(response.status, 401);
});

test("approve and reject endpoints resolve pending approvals", async () => {
  const store = new ApprovalStore();
  const app = createRuntimeApp({ ...baseConfig, approvalStore: store });
  const events = [];
  store.subscribe((event) => events.push(event));
  let calls = 0;
  const approved = store.create({ tool: "mock_write", arguments: { id: 1 }, summary: "写入", action: async () => { calls += 1; return { ok: true }; } });
  const approveResponse = await app.request(`http://127.0.0.1/api/approvals/${approved.approvalId}/approve`, {
    method: "POST",
    headers: { Authorization: "Bearer test-token" },
  });
  assert.equal(approveResponse.status, 200);
  assert.equal((await approveResponse.json()).approval.status, "approved");
  assert.equal(calls, 1);

  const rejected = store.create({ tool: "mock_write", arguments: {}, summary: "拒绝", action: async () => { calls += 1; } });
  const rejectResponse = await app.request(`http://127.0.0.1/api/approvals/${rejected.approvalId}/reject`, {
    method: "POST",
    headers: { Authorization: "Bearer test-token" },
  });
  assert.equal(rejectResponse.status, 200);
  assert.equal((await rejectResponse.json()).approval.status, "rejected");
  assert.equal(calls, 1);
  assert.deepEqual(events.map((event) => event.type), ["approval.required", "approval.resolved", "approval.required", "approval.resolved"]);
});
