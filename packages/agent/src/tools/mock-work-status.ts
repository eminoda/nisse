import { tool, type ToolSet } from "ai";
import { z } from "zod";

export const getCurrentWorkStatusTool: ToolSet[string] = tool({
  description: "查询当前工作状态，包括待处理 Bug 数量和正在运行的构建数量。",
  inputSchema: z.object({}),
  execute: async () => ({ bugs: 3, builds: 1 }),
});

export const mockTools: Record<string, ToolSet[string]> = {
  get_current_work_status: getCurrentWorkStatusTool,
};
