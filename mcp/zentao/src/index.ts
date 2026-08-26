import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ZenTaoService } from "./services/zentao-service.js";
import type { ZenTaoConnection } from "./services/types.js";
import { getBugDetail } from "./tools/get-bug-detail.js";
import { getMyBugs } from "./tools/get-my-bugs.js";
import { getMyTasks } from "./tools/get-my-tasks.js";
import { resolveBug, resolveBugToolMetadata, resolutions } from "./tools/resolve-bug.js";

export function createZenTaoServer(connection: ZenTaoConnection) {
  const server = new McpServer({ name: "nisse-zentao", version: "0.1.0" });
  const service = new ZenTaoService(connection);

  server.registerTool(
    "get_my_tasks",
    {
      description: "查询当前 ZenTao 账号负责的未关闭任务。",
      inputSchema: { pageSize: z.number().int().min(1).max(1000).optional() },
      annotations: { readOnlyHint: true, destructiveHint: false },
      _meta: { risk: "read", approvalRequired: false },
    },
    (input) => getMyTasks(service, input, connection.account),
  );

  server.registerTool(
    "get_my_bugs",
    {
      description: "查询当前 ZenTao 账号负责的 Bug。",
      inputSchema: {
        projectId: z.union([z.string(), z.number().int().positive()]).optional(),
        status: z.enum(["all", "unresolved"]).optional(),
        pageSize: z.number().int().min(1).max(1000).optional(),
      },
      annotations: { readOnlyHint: true, destructiveHint: false },
      _meta: { risk: "read", approvalRequired: false },
    },
    (input) => getMyBugs(service, input, connection.account),
  );

  server.registerTool(
    "get_bug_detail",
    {
      description: "获取指定 ZenTao Bug 的详细信息。",
      inputSchema: { bugId: z.union([z.string(), z.number().int().positive()]) },
      annotations: { readOnlyHint: true, destructiveHint: false },
      _meta: { risk: "read", approvalRequired: false },
    },
    (input) => getBugDetail(service, input),
  );

  server.registerTool(
    "resolve_bug",
    {
      description: "解决指定 ZenTao Bug。此操作会修改远程数据，需要 Runtime Approval。",
      inputSchema: {
        bugId: z.union([z.string(), z.number().int().positive()]),
        resolution: z.enum(resolutions),
        resolvedDate: z.string().optional(),
        resolvedBuild: z.string().optional(),
        assignedTo: z.string().optional(),
        comment: z.string().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: true },
      _meta: { risk: resolveBugToolMetadata.risk, approvalRequired: true },
    },
    (input) => resolveBug(service, input),
  );

  return server;
}

async function start() {
  const endpoint = process.env.ZENTAO_ENDPOINT;
  const account = process.env.ZENTAO_ACCOUNT;
  const password = process.env.ZENTAO_PASSWORD;
  if (!endpoint || !account || !password) {
    throw new Error("ZENTAO_ENDPOINT, ZENTAO_ACCOUNT, and ZENTAO_PASSWORD are required");
  }
  const server = createZenTaoServer({ endpoint, account, password });
  await server.connect(new StdioServerTransport());
}

if (process.argv[1]?.endsWith("dist/index.js")) await start();

export { ZenTaoService } from "./services/zentao-service.js";
export type * from "./services/types.js";
