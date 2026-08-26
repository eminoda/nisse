import assert from "node:assert/strict";
import test from "node:test";
import { ConnectionManager } from "../dist/connections/manager.js";

test("registers the ZenTao connection fields for the dynamic settings form", () => {
  const manager = new ConnectionManager();
  const schema = manager.listSchemas().find((item) => item.type === "zentao");

  assert.ok(schema);
  assert.deepEqual(
    schema.fields.map(({ key, type, required }) => ({ key, type, required })),
    [
      { key: "endpoint", type: "url", required: true },
      { key: "account", type: "text", required: true },
      { key: "password", type: "password", required: true },
    ],
  );
});

test("requires ZenTao endpoint, account, and password", () => {
  const manager = new ConnectionManager();

  assert.throws(
    () =>
      manager.save({
        type: "zentao",
        name: "Company ZenTao",
        config: { endpoint: "https://zentao.example", account: "alice" },
        secrets: {},
      }),
    /password/,
  );
});

test("does not expose the ZenTao password in a saved connection summary", () => {
  const manager = new ConnectionManager();
  const summary = manager.save({
    type: "zentao",
    name: "Company ZenTao",
    config: { endpoint: "https://zentao.example", account: "alice" },
    secrets: { password: "secret-value" },
  });

  assert.equal("secrets" in summary, false);
  assert.equal(JSON.stringify(summary).includes("secret-value"), false);
});
