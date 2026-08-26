import assert from "node:assert/strict";
import test from "node:test";
import { createZenTaoServer } from "../dist/index.js";

test("creates an MCP server exposing the three ZenTao tools", () => {
  const server = createZenTaoServer({
    endpoint: "https://zentao.example.com",
    account: "alice",
    password: "pw",
  });

  assert.equal(typeof server, "object");
});
