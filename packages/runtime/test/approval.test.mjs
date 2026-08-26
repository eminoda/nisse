import assert from "node:assert/strict";
import test from "node:test";
import { ApprovalStore } from "../dist/approvals/store.js";

test("approving a pending approval executes its action exactly once", async () => {
  let calls = 0;
  const store = new ApprovalStore({ now: () => 1_000 });
  const pending = store.create({
    tool: "mock_write",
    arguments: { value: "x" },
    summary: "执行 Mock 写操作",
    action: async () => {
      calls += 1;
      return { ok: true };
    },
  });

  const approved = await store.approve(pending.approvalId);
  assert.equal(calls, 1);
  assert.equal(approved.status, "approved");
  assert.deepEqual(approved.result, { ok: true });
  await assert.rejects(() => store.approve(pending.approvalId), /already resolved/);
});

test("rejecting an approval never executes its action", async () => {
  let calls = 0;
  const store = new ApprovalStore({ now: () => 1_000 });
  const pending = store.create({
    tool: "mock_write",
    arguments: {},
    summary: "拒绝 Mock 写操作",
    action: async () => {
      calls += 1;
    },
  });

  const rejected = await store.reject(pending.approvalId);
  assert.equal(calls, 0);
  assert.equal(rejected.status, "rejected");
});

test("expired approvals cannot execute", async () => {
  let now = 1_000;
  let calls = 0;
  const store = new ApprovalStore({ now: () => now, ttlMs: 100 });
  const pending = store.create({
    tool: "mock_write",
    arguments: {},
    summary: "过期操作",
    action: async () => {
      calls += 1;
    },
  });

  now = 1_101;
  await assert.rejects(() => store.approve(pending.approvalId), /expired/);
  assert.equal(calls, 0);
  assert.equal(store.get(pending.approvalId).status, "expired");
});
