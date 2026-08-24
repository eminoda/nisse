import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { McpManager } from "../dist/mcp/index.js";

test("MCP manager starts demo stdio server and adapts its tool", async () => {
  const manager = new McpManager().register({
    id: "demo",
    name: "Demo MCP",
    transport: "stdio",
    command: process.execPath,
    args: [path.resolve(process.cwd(), "../../mcp/demo/dist/index.js")],
  });

  const tools = await manager.start("demo");
  assert.deepEqual(
    tools.map((item) => item.name),
    ["get_current_work_status"],
  );
  assert.deepEqual(manager.health("demo"), {
    id: "demo",
    status: "ready",
    toolCount: 1,
  });

  const aiTools = manager.listAiSdkTools();
  const result = await aiTools.demo__get_current_work_status.execute({});
  assert.deepEqual(result.content[0].text, JSON.stringify({ bugs: 3, builds: 1 }));

  await manager.stop("demo");
  assert.equal(manager.health("demo").status, "stopped");
});
