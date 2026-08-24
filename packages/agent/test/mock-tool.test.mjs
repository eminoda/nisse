import test from "node:test";
import assert from "node:assert/strict";
import { getCurrentWorkStatusTool } from "../dist/index.js";

test("mock work status tool returns stable development status", async () => {
  const result = await getCurrentWorkStatusTool.execute({});
  assert.deepEqual(result, { bugs: 3, builds: 1 });
});
