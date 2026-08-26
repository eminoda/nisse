import assert from "node:assert/strict";
import test from "node:test";
import { getMyBugs } from "../dist/tools/get-my-bugs.js";
import { getBugDetail } from "../dist/tools/get-bug-detail.js";
import { getMyTasks } from "../dist/tools/get-my-tasks.js";

test("get_my_bugs traverses projects and filters by the configured account", async () => {
  const calls = [];
  const service = {
    async listProjects() {
      return [{ id: 1, name: "One" }, { id: 2, name: "Two" }];
    },
    async listProjectBugs(projectId, options) {
      calls.push({ projectId, options });
      return projectId === 1
        ? [{ id: "11", title: "Mine", assignedTo: "alice" }, { id: "12", assignedTo: "bob" }]
        : [{ id: "21", title: "Also mine", assignedTo: "alice" }];
    },
  };

  const result = await getMyBugs(service, { status: "unresolved", pageSize: 50 }, "alice");
  const payload = JSON.parse(result.content[0].text);

  assert.deepEqual(calls, [
    { projectId: 1, options: { browseType: "unresolved", pageSize: 50, page: 1 } },
    { projectId: 2, options: { browseType: "unresolved", pageSize: 50, page: 1 } },
  ]);
  assert.deepEqual(payload.bugs.map(({ id }) => id), ["11", "21"]);
  assert.equal(payload.filtering.account, "alice");
});

test("get_my_bugs supports a project filter and reports when account filtering is unavailable", async () => {
  const service = {
    async listProjects() {
      return [{ id: 1, name: "One" }, { id: 2, name: "Two" }];
    },
    async listProjectBugs(projectId) {
      return [{ id: String(projectId), assignedTo: "alice" }];
    },
  };

  const result = await getMyBugs(service, { projectId: 2 }, undefined);
  const payload = JSON.parse(result.content[0].text);

  assert.deepEqual(payload.bugs.map(({ id }) => id), ["2"]);
  assert.equal(payload.filtering.account, null);
  assert.match(payload.filtering.note, /未执行/);
});

test("get_my_bugs rejects a page size outside the API limit", async () => {
  await assert.rejects(
    () => getMyBugs({ listProjects: async () => [] }, { pageSize: 1001 }, "alice"),
    /pageSize/,
  );
});

test("get_bug_detail rejects non-positive bug IDs before calling the service", async () => {
  let called = false;
  await assert.rejects(
    () =>
      getBugDetail(
        {
          getBugDetail: async () => {
            called = true;
          },
        },
        { bugId: 0 },
      ),
    /positive integer/,
  );
  assert.equal(called, false);
});

test("get_my_tasks traverses unfinished executions and filters assigned tasks", async () => {
  const calls = [];
  const service = {
    async listProjects(options) {
      calls.push({ type: "projects", options });
      return [{ id: 1, name: "One" }, { id: 2, name: "Two" }];
    },
    async listProjectExecutions(projectId, options) {
      calls.push({ type: "executions", projectId, options });
      return projectId === 1 ? [{ id: 11, name: "Sprint 1" }] : [];
    },
    async listExecutionTasks(executionId, options) {
      calls.push({ type: "tasks", executionId, options });
      return [{ id: 101, name: "Mine", assignedTo: "alice" }, { id: 102, name: "Other", assignedTo: "bob" }];
    },
  };

  const result = await getMyTasks(service, { pageSize: 50 }, "alice");
  const payload = JSON.parse(result.content[0].text);
  assert.deepEqual(payload.tasks.map(({ id }) => id), [101, 102]);
  assert.equal(payload.tasks[0].project, 1);
  assert.deepEqual(calls, [
    { type: "projects", options: { browseType: "all", orderBy: "id_desc", pageSize: 100, page: 1 } },
    { type: "executions", projectId: 1, options: { status: "all", pageSize: 50, page: 1 } },
    { type: "executions", projectId: 2, options: { status: "all", pageSize: 50, page: 1 } },
    { type: "tasks", executionId: 11, options: { status: "assignedtome", pageSize: 50, page: 1 } },
  ]);
});
