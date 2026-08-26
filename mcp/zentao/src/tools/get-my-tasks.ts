import type { ZenTaoTask } from "../services/types.js";
import type { TextToolResult } from "./types.js";

type TaskService = {
  listProjects(options: { browseType: "all"; orderBy: "id_desc"; pageSize: number; page: number }): Promise<Array<{ id: string | number; name?: string }>>;
  listProjectExecutions(projectId: string | number, options: { status: "all"; pageSize: number; page: number }): Promise<Array<{ id: string | number; name?: string }>>;
  listExecutionTasks(executionId: string | number, options: { status: "assignedtome"; pageSize: number; page: number }): Promise<ZenTaoTask[]>;
};

export async function getMyTasks(
  service: TaskService,
  input: { pageSize?: number } = {},
  account?: string,
): Promise<TextToolResult> {
  const pageSize = input.pageSize ?? 1000;
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) {
    throw new Error("pageSize must be an integer between 1 and 1000");
  }

  const projects = await service.listProjects({ browseType: "all", orderBy: "id_desc", pageSize: 100, page: 1 });
  const executionResults = [];
  for (const project of projects) {
    try {
      executionResults.push({
        project,
        executions: await service.listProjectExecutions(project.id, { status: "all", pageSize, page: 1 }),
      });
    } catch {
      executionResults.push({ project, executions: [], skipped: true });
    }
  }
  const executions = executionResults.flatMap(({ project, executions: projectExecutions }) =>
    projectExecutions.map((execution) => ({ execution, project })),
  );
  const taskResults = [];
  for (const { execution, project } of executions) {
    try {
      taskResults.push({
        execution,
        project,
        tasks: await service.listExecutionTasks(execution.id, { status: "assignedtome", pageSize, page: 1 }),
      });
    } catch {
      taskResults.push({ execution, project, tasks: [] as ZenTaoTask[], skipped: true });
    }
  }
  const tasks = taskResults.flatMap(({ execution, project, tasks: executionTasks }) =>
    executionTasks
      .map((task) => ({ ...task, execution: task.execution ?? execution.id, executionName: execution.name, project: task.project ?? project.id, projectName: project.name })),
  );

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        tasks,
        skippedProjects: executionResults.filter((result) => result.skipped).length,
        skippedExecutions: taskResults.filter((result) => result.skipped).length,
        filtering: { account: account ?? null },
      }),
    }],
  };
}
