import { tool, type ToolSet } from "ai";
import { z } from "zod";

export type ZenTaoBugQuery = {
  projectId?: string | number;
  status?: "all" | "unresolved";
  pageSize?: number;
};

export type ZenTaoTaskQuery = { pageSize?: number };

export type ZenTaoResolveInput = {
  bugId: string | number;
  resolution: "fixed" | "notrepro" | "bydesign" | "duplicate" | "external" | "postponed" | "willnotfix" | "tostory";
  resolvedDate?: string;
  resolvedBuild?: string;
  assignedTo?: string;
  comment?: string;
};

export type ZenTaoToolGateway = {
  listMyBugs(input?: ZenTaoBugQuery): Promise<{ bugs: unknown[]; projects: unknown[] }>;
  listMyTasks(input?: ZenTaoTaskQuery): Promise<{ tasks: unknown[] }>;
  getBugDetail(bugId: string | number): Promise<unknown>;
  resolveBug(input: ZenTaoResolveInput): Promise<{ status: "success" }>;
};

export const getCurrentWorkStatusTool: ToolSet[string] = tool({
  description: "查询当前工作状态，返回 ZenTao 中待处理 Bug 数量。",
  inputSchema: z.object({}),
  execute: async () => ({ bugs: 3 }),
});

export type ApprovalRequest = {
  tool: string;
  arguments: Record<string, unknown>;
  summary: string;
  action: () => Promise<unknown>;
};

export type ApprovalGateway = {
  createApproval(input: ApprovalRequest): {
    approvalId: string;
    status: "pending" | "approved" | "rejected" | "expired" | "failed";
  };
};

export function createMockTools(
  approvalGateway?: ApprovalGateway,
  zentao?: ZenTaoToolGateway,
): Record<string, ToolSet[string]> {
  const getCurrentWorkStatus = tool({
    description: "查询当前工作状态，返回 ZenTao 中待处理 Bug 数量。",
    inputSchema: z.object({}),
    execute: async () => {
      if (!zentao) return { bugs: 3 };
      const result = await zentao.listMyBugs({ status: "unresolved" });
      return { bugs: result.bugs.length };
    },
  });

  const getMyBugs = tool({
    description: "查询当前 ZenTao 账号负责的 Bug 列表。",
    inputSchema: z.object({
      projectId: z.union([z.string(), z.number().int().positive()]).optional(),
      status: z.enum(["all", "unresolved"]).optional(),
      pageSize: z.number().int().min(1).max(1000).optional(),
    }),
    execute: async (input) => {
      if (!zentao) return { bugs: [], projects: [] };
      return zentao.listMyBugs(input);
    },
  });

  const getBugDetail = tool({
    description: "获取指定 ZenTao Bug 的详细信息。",
    inputSchema: z.object({ bugId: z.union([z.string(), z.number().int().positive()]) }),
    execute: async ({ bugId }) => {
      if (!zentao) throw new Error("ZenTao connection is not configured");
      return zentao.getBugDetail(bugId);
    },
  });

  const getMyTasks = tool({
    description: "查询当前 ZenTao 账号负责的未关闭任务。",
    inputSchema: z.object({ pageSize: z.number().int().min(1).max(1000).optional() }),
    execute: async (input) => {
      if (!zentao) return { tasks: [] };
      return zentao.listMyTasks(input);
    },
  });

  const resolveBug = tool({
    description: "解决指定 ZenTao Bug。此操作会修改远程数据，需要用户 Approval。",
    inputSchema: z.object({
      bugId: z.union([z.string(), z.number().int().positive()]),
      resolution: z.enum(["fixed", "notrepro", "bydesign", "duplicate", "external", "postponed", "willnotfix", "tostory"]),
      resolvedDate: z.string().optional(),
      resolvedBuild: z.string().optional(),
      assignedTo: z.string().optional(),
      comment: z.string().optional(),
    }),
    execute: async (input) => {
      if (!zentao) throw new Error("ZenTao connection is not configured");
      if (!approvalGateway) throw new Error("Approval gateway is not configured");
      const approval = approvalGateway.createApproval({
        tool: "resolve_bug",
        arguments: input,
        summary: `解决 ZenTao Bug #${input.bugId}`,
        action: () => zentao.resolveBug(input),
      });
      return { approvalRequired: true, ...approval };
    },
  });

  const mockWriteTool = tool({
    description: "执行一个仅用于验证 Approval 流程的写操作。",
    inputSchema: z.object({ value: z.string().min(1) }),
    execute: async ({ value }) => {
      if (!approvalGateway) throw new Error("Approval gateway is not configured");
      const approval = approvalGateway.createApproval({
        tool: "mock_write",
        arguments: { value },
        summary: "执行 Mock 写操作",
        action: async () => ({ written: true, value }),
      });
      return { approvalRequired: true, ...approval };
    },
  });

  return {
    get_current_work_status: getCurrentWorkStatus,
    get_my_bugs: getMyBugs,
    get_bug_detail: getBugDetail,
    get_my_tasks: getMyTasks,
    resolve_bug: resolveBug,
    mock_write: mockWriteTool,
  };
}

export const mockTools: Record<string, ToolSet[string]> = createMockTools();
