import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { createZenTaoGateway } from "../dist/zentao-gateway.js";

test("ZenTao gateway filters bug list by the configured account", async () => {
  const gateway = createZenTaoGateway(
    {
      async listProjects() {
        return [{ id: 1, name: "核心项目" }];
      },
      async listProjectBugs() {
        return [
          { id: 10, assignedTo: "alice", title: "登录失败" },
          { id: 11, assignedTo: "bob", title: "不应返回" },
        ];
      },
      async getBugDetail(id) {
        return { id: Number(id), title: "登录失败" };
      },
    },
    "alice",
  );

  assert.deepEqual(await gateway.listMyBugs({ status: "unresolved" }), {
    bugs: [{ id: 10, assignedTo: "alice", title: "登录失败", project: 1, projectName: "核心项目" }],
    projects: [{ project: { id: 1, name: "核心项目" }, count: 1 }],
  });
  assert.deepEqual(await gateway.getBugDetail(10), { id: 10, title: "登录失败" });
});

test("ZenTao gateway reuses a short-lived task result for dashboard refreshes", async () => {
  let projectCalls = 0;
  const gateway = createZenTaoGateway(
    {
      async listProjects() {
        projectCalls += 1;
        return [{ id: 1, name: "核心项目" }];
      },
      async listProjectExecutions() {
        return [{ id: 2, name: "迭代一" }];
      },
      async listExecutionTasks() {
        return [{ id: 3, name: "修复登录" }];
      },
    },
    "alice",
  );

  const first = await gateway.listMyTasks();
  const second = await gateway.listMyTasks();

  assert.deepEqual(second, first);
  assert.equal(projectCalls, 1);
});

test("ZenTao gateway reuses project and execution metadata across task queries", async () => {
  let projectCalls = 0;
  let executionCalls = 0;
  const gateway = createZenTaoGateway(
    {
      async listProjects() {
        projectCalls += 1;
        return [{ id: 1, name: "核心项目" }];
      },
      async listProjectExecutions() {
        executionCalls += 1;
        return [{ id: 2, name: "迭代一" }];
      },
      async listExecutionTasks() {
        return [{ id: 3, name: "修复登录" }];
      },
    },
    "alice",
  );

  await gateway.listMyTasks({ pageSize: 100 });
  await gateway.listMyTasks({ pageSize: 200 });

  assert.equal(projectCalls, 1);
  assert.equal(executionCalls, 1);
});

test("ZenTao gateway caches executions that contain my tasks", async () => {
  let taskCalls = 0;
  const gateway = createZenTaoGateway(
    {
      async listProjects() {
        return [{ id: 1, name: "核心项目" }];
      },
      async listProjectExecutions() {
        return [{ id: 2, name: "有任务的迭代" }, { id: 3, name: "没有任务的迭代" }];
      },
      async listExecutionTasks(executionId) {
        taskCalls += 1;
        return executionId === 2 ? [{ id: 4, name: "我的任务" }] : [];
      },
    },
    "alice",
  );

  await gateway.listMyTasks({ pageSize: 100 });
  const second = await gateway.listMyTasks({ pageSize: 200 });

  assert.equal(second.tasks.length, 1);
  assert.equal(taskCalls, 3);
});

test("ZenTao gateway returns an empty cached snapshot before startup warmup completes", async () => {
  const gateway = createZenTaoGateway(
    {
      async listProjects() {
        throw new Error("startup query should not run for a cache-only read");
      },
    },
    "alice",
  );

  assert.deepEqual(await gateway.getCachedMyTasks(), {
    tasks: [],
    skippedProjects: 0,
    skippedExecutions: 0,
    cacheReady: false,
  });
});

test("ZenTao dashboard refresh queries only executions from the startup index", async () => {
  const queriedExecutions = [];
  const gateway = createZenTaoGateway(
    {
      async listProjects() {
        return [{ id: 1, name: "核心项目" }];
      },
      async listProjectExecutions() {
        return [{ id: 2, name: "有任务的迭代" }, { id: 3, name: "没有任务的迭代" }];
      },
      async listExecutionTasks(executionId) {
        queriedExecutions.push(executionId);
        return executionId === 2 ? [{ id: 4, name: "我的任务" }] : [];
      },
    },
    "alice",
  );

  await gateway.warmup();
  queriedExecutions.length = 0;
  const result = await gateway.refreshMyTasksFromCachedExecutions();

  assert.equal(result.tasks.length, 1);
  assert.deepEqual(queriedExecutions, [2]);
});

test("ZenTao metadata refresh keeps the previous task cache available until replacement succeeds", async () => {
  let releaseRefresh;
  let refreshing = false;
  const gateway = createZenTaoGateway(
    {
      async listProjects() {
        return [{ id: 1, name: "核心项目" }];
      },
      async listProjectExecutions() {
        if (refreshing) {
          await new Promise((resolve) => { releaseRefresh = resolve; });
        }
        return [{ id: 2, name: "迭代一" }];
      },
      async listExecutionTasks() {
        return [{ id: 3, name: "修复登录" }];
      },
    },
    "alice",
  );

  await gateway.warmup();
  refreshing = true;
  const refresh = gateway.refreshExecutions();
  await delay(0);

  const duringRefresh = await gateway.refreshMyTasksFromCachedExecutions();
  assert.deepEqual(duringRefresh.tasks, [{
    id: 3,
    name: "修复登录",
    execution: 2,
    executionName: "迭代一",
    project: 1,
    projectName: "核心项目",
  }]);

  releaseRefresh();
  await refresh;
});
