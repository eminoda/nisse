import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({ name: "nisse-demo", version: "0.1.0" });

server.tool(
  "get_current_work_status",
  "查询当前工作状态，包括待处理 Bug 和正在运行的构建。",
  {},
  async () => ({
    content: [{ type: "text", text: JSON.stringify({ bugs: 3, builds: 1 }) }],
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
