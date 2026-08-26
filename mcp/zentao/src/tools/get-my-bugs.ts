import type { ZenTaoBug, ZenTaoProject } from "../services/types.js";
import type { BugsQuery, TextToolResult } from "./types.js";

type BugService = {
  listProjects(): Promise<ZenTaoProject[]>;
  listProjectBugs(
    projectId: string | number,
    options: { browseType: "all" | "unresolved"; pageSize: number; page: number },
  ): Promise<ZenTaoBug[]>;
};

export async function getMyBugs(
  service: BugService,
  input: BugsQuery = {},
  account?: string,
): Promise<TextToolResult> {
  const pageSize = input.pageSize ?? 100;
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) {
    throw new Error("pageSize must be an integer between 1 and 1000");
  }
  const projects = await service.listProjects();
  const selectedProjects = input.projectId === undefined
    ? projects
    : projects.filter((project) => String(project.id) === String(input.projectId));
  const results = await Promise.all(selectedProjects.map(async (project) => {
    try {
      return {
        project: { id: project.id, name: project.name },
        bugs: await service.listProjectBugs(project.id, {
          browseType: input.status ?? "all",
          pageSize,
          page: 1,
        }),
      };
    } catch {
      return { project: { id: project.id, name: project.name }, bugs: [] };
    }
  }));
  const bugs = results.flatMap(({ project, bugs: projectBugs }) =>
    projectBugs
      .filter((bug) => !account || bug.assignedTo === account)
      .map((bug) => ({ ...bug, project: bug.project ?? project.id, projectName: project.name })),
  );

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          bugs,
          projects: results.map(({ project, bugs: projectBugs }) => ({
            project,
            count: projectBugs.filter((bug) => !account || bug.assignedTo === account).length,
          })),
          filtering: {
            account: account ?? null,
            note: account ? "已按当前连接账号过滤 assignedTo。" : "未执行 assignedTo 过滤，请确认账号信息。",
          },
        }),
      },
    ],
  };
}
