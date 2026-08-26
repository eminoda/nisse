import assert from "node:assert/strict";
import test from "node:test";
import { ZenTaoService } from "../dist/services/zentao-service.js";

function response(body, status = 200) {
  return new globalThis.Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("logs in at the ZenTao v2 endpoint and uses the token header", async () => {
  const requests = [];
  const service = new ZenTaoService(
    { endpoint: "https://zentao.example.com/", account: "alice", password: "pw" },
    async (input, init) => {
      requests.push({ input: String(input), init });
      return requests.length === 1
        ? response({ status: "success", token: "runtime-token" })
        : response({ status: "success", bug: { id: "7", title: "Broken" } });
    },
  );

  const bug = await service.getBugDetail(7);

  assert.deepEqual(bug, { id: "7", title: "Broken" });
  assert.equal(requests[0].input, "https://zentao.example.com/api.php/v2/users/login");
  assert.deepEqual(JSON.parse(requests[0].init.body), { account: "alice", password: "pw" });
  assert.equal(requests[1].input, "https://zentao.example.com/api.php/v2/bugs/7");
  assert.equal(requests[1].init.headers.token, "runtime-token");
});

test("accepts an endpoint that already includes the ZenTao v2 API path", async () => {
  const requests = [];
  const service = new ZenTaoService(
    { endpoint: "https://zentao.example.com/api.php/v2/", account: "alice", password: "pw" },
    async (input) => {
      requests.push(String(input));
      return response(
        requests.length === 1
          ? { status: "success", token: "runtime-token" }
          : { status: "success", bug: { id: "7" } },
      );
    },
  );

  await service.getBugDetail(7);
  assert.equal(requests[1], "https://zentao.example.com/api.php/v2/bugs/7");
});

test("converts ZenTao and HTTP failures into useful errors", async () => {
  const zenTaoFailure = new ZenTaoService(
    { endpoint: "https://zentao.example.com", account: "alice", password: "pw" },
    async () => response({ status: "fail", message: "Invalid credentials" }),
  );
  await assert.rejects(() => zenTaoFailure.testConnection(), /Invalid credentials/);

  const httpFailure = new ZenTaoService(
    { endpoint: "https://zentao.example.com", account: "alice", password: "pw" },
    async () => response({ error: "bad gateway" }, 502),
  );
  await assert.rejects(() => httpFailure.testConnection(), /HTTP 502/);
});

test("serializes the documented resolve payload", async () => {
  const requests = [];
  const service = new ZenTaoService(
    { endpoint: "https://zentao.example.com", account: "alice", password: "pw" },
    async (input, init) => {
      requests.push({ input: String(input), init });
      return requests.length === 1
        ? response({ status: "success", token: "runtime-token" })
        : response({ status: "success" });
    },
  );

  await service.resolveBug(9, {
    resolution: "fixed",
    resolvedDate: "2026-08-25",
    resolvedBuild: "trunk",
    assignedTo: "alice",
    comment: "已修复",
  });

  assert.equal(requests[1].init.method, "PUT");
  assert.deepEqual(JSON.parse(requests[1].init.body), {
    resolution: "fixed",
    resolvedDate: "2026-08-25",
    resolvedBuild: "trunk",
    assignedTo: "alice",
    comment: "已修复",
  });
});

test("retries an empty task response to work around ZenTao session context", async () => {
  const requests = [];
  let taskAttempt = 0;
  const service = new ZenTaoService(
    { endpoint: "https://zentao.example.com", account: "alice", password: "pw" },
    async (input, init) => {
      requests.push({ input: String(input), init });
      if (requests.length === 1) return response({ status: "success", token: "runtime-token" });
      taskAttempt += 1;
      return taskAttempt === 1
        ? response({ status: "success", tasks: [] })
        : response({ status: "success", tasks: [{ id: "7", assignedTo: "alice" }] });
    },
  );

  const tasks = await service.listExecutionTasks(1364, { status: "assignedtome", pageSize: 100, page: 1 });
  assert.deepEqual(tasks, [{ id: "7", assignedTo: "alice" }]);
  assert.equal(requests.length, 3);
  assert.match(requests[1].input, /\/executions\/1364\/tasks\?/);
  assert.equal(requests[1].init.headers.Connection, "close");
  assert.equal(requests[1].init.headers.token, "runtime-token");
});
