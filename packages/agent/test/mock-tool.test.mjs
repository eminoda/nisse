import test from "node:test";
import assert from "node:assert/strict";
import { createMockTools, getCurrentWorkStatusTool } from "../dist/index.js";

test("work status reports ZenTao bugs without inventing build data", async () => {
  const result = await getCurrentWorkStatusTool.execute({});
  assert.deepEqual(result, { bugs: 3 });
  assert.equal("builds" in result, false);
});

test("Agent exposes ZenTao bug list and detail tools", async () => {
  const tools = createMockTools(undefined, {
    async listMyBugs() {
      return { bugs: [{ id: 12, title: "登录失败" }], projects: [] };
    },
    async listMyTasks() {
      return { tasks: [{ id: 21, name: "补充登录校验" }] };
    },
    async getBugDetail(bugId) {
      return { id: Number(bugId), title: "登录失败", status: "active" };
    },
    async resolveBug() {
      return { status: "success" };
    },
  });

  assert.ok(tools.get_my_bugs);
  assert.ok(tools.get_bug_detail);
  assert.ok(tools.get_my_tasks);
  assert.deepEqual(await tools.get_my_bugs.execute({ status: "unresolved" }), {
    bugs: [{ id: 12, title: "登录失败" }],
    projects: [],
  });
  assert.deepEqual(await tools.get_bug_detail.execute({ bugId: 12 }), {
    id: 12,
    title: "登录失败",
    status: "active",
  });
  assert.deepEqual(await tools.get_my_tasks.execute({}), {
    tasks: [{ id: 21, name: "补充登录校验" }],
  });
});

test("resolve_bug creates an approval and does not call ZenTao immediately", async () => {
  let resolveCalls = 0;
  let approvalRequest;
  const tools = createMockTools(
    {
      createApproval(input) {
        approvalRequest = input;
        return { approvalId: "approval-resolve-1", status: "pending" };
      },
    },
    {
      async listMyBugs() {
        return { bugs: [], projects: [] };
      },
      async getBugDetail() {
        return { id: 12, title: "登录失败" };
      },
      async listMyTasks() {
        return { tasks: [] };
      },
      async resolveBug() {
        resolveCalls += 1;
        return { status: "success" };
      },
    },
  );

  const result = await tools.resolve_bug.execute({ bugId: 12, resolution: "fixed" });

  assert.deepEqual(result, {
    approvalRequired: true,
    approvalId: "approval-resolve-1",
    status: "pending",
  });
  assert.equal(resolveCalls, 0);
  assert.equal(approvalRequest.tool, "resolve_bug");
  await approvalRequest.action();
  assert.equal(resolveCalls, 1);
});

test("mock write tool creates approval instead of executing the write", async () => {
  let executed = false;
  let request;
  const tools = createMockTools({
    createApproval(input) {
      request = input;
      return { approvalId: "approval-1", status: "pending" };
    },
  });

  const result = await tools.mock_write.execute({ value: "x" });

  assert.equal(executed, false);
  assert.deepEqual(result, { approvalRequired: true, approvalId: "approval-1", status: "pending" });
  assert.equal(request.tool, "mock_write");
  assert.deepEqual(request.arguments, { value: "x" });
  await request.action().then(() => { executed = true; });
});
