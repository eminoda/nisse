import type { ZenTaoBug, ZenTaoProject, ZenTaoTask } from "@nisse/mcp-zentao";
import type { ZenTaoBugQuery, ZenTaoResolveInput, ZenTaoTaskQuery, ZenTaoToolGateway } from "@nisse/agent";

type ZenTaoGatewayService = {
  listProjects(): Promise<ZenTaoProject[]>;
  listProjectExecutions(projectId: string | number, options: { status: "all"; pageSize: number; page: number }): Promise<Array<{ id: string | number; name?: string }>>;
  listProjectBugs(
    projectId: string | number,
    options: { browseType: "all" | "unresolved"; pageSize: number; page: number },
  ): Promise<ZenTaoBug[]>;
  listProjectExecutions(projectId: string | number, options: { status: "undone"; pageSize: number; page: number }): Promise<Array<{ id: string | number; name?: string }>>;
  listExecutionTasks(executionId: string | number, options: { status: "assignedtome"; pageSize: number; page: number }): Promise<ZenTaoTask[]>;
  getBugDetail(bugId: string | number): Promise<ZenTaoBug>;
  resolveBug(bugId: string | number, input: Omit<ZenTaoResolveInput, "bugId">): Promise<{ status: "success" }>;
};

type ZenTaoExecution = { id: string | number; name?: string };
type TaskExecutionRef = { execution: ZenTaoExecution; project: ZenTaoProject };
type CacheState = "not_fetched" | "refreshing" | "ready" | "error";
const metadataCacheTtlMs = 5 * 60_000;
const taskCacheTtlMs = 5 * 60_000;

export interface ZenTaoGateway extends ZenTaoToolGateway {
  warmup(): Promise<void>;
  getCachedMyTasks(): Promise<Awaited<ReturnType<ZenTaoToolGateway["listMyTasks"]>> & { cacheReady: boolean }>;
  refreshMyTasksFromCachedExecutions(): Promise<Awaited<ReturnType<ZenTaoToolGateway["listMyTasks"]>> & { cacheReady: boolean }>;
  refreshProjects(): Promise<{ projects: number }>;
  refreshExecutions(): Promise<{ projects: number; executions: number }>;
  getCacheStatus(): {
    projects: { status: CacheState; count?: number };
    executions: { status: CacheState; count?: number };
  };
}

export function createZenTaoGateway(
  service: ZenTaoGatewayService,
  account: string,
): ZenTaoGateway {
  let projectsCache: { expiresAt: number; value: ZenTaoProject[] } | undefined;
  let projectsInFlight: Promise<ZenTaoProject[]> | undefined;
  const executionsCache = new Map<string, { expiresAt: number; value: ZenTaoExecution[] }>();
  const executionsInFlight = new Map<string, Promise<ZenTaoExecution[]>>();
  let assignedExecutionCache: { expiresAt: number; value: TaskExecutionRef[] } | undefined;
  let taskCache: { expiresAt: number; result: Awaited<ReturnType<ZenTaoToolGateway["listMyTasks"]>> } | undefined;
  let taskQueryInFlight: Promise<Awaited<ReturnType<ZenTaoToolGateway["listMyTasks"]>>> | undefined;
  let projectsRefreshInFlight: Promise<{ projects: number }> | undefined;
  let executionsRefreshInFlight: Promise<{ projects: number; executions: number }> | undefined;
  let projectsState: CacheState = "not_fetched";
  let executionsState: CacheState = "not_fetched";

  async function getProjects() {
    if (projectsCache && projectsCache.expiresAt > Date.now()) return projectsCache.value;
    if (projectsInFlight) return projectsInFlight;
    projectsInFlight = service.listProjects()
      .then((value) => {
        projectsCache = { expiresAt: Date.now() + metadataCacheTtlMs, value };
        projectsState = "ready";
        return value;
      })
      .catch((error) => {
        projectsState = "error";
        throw error;
      })
      .finally(() => {
        projectsInFlight = undefined;
      });
    return projectsInFlight;
  }

  async function getProjectExecutions(projectId: string | number) {
    const key = String(projectId);
    const cached = executionsCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const inFlight = executionsInFlight.get(key);
    if (inFlight) return inFlight;
    const request = service.listProjectExecutions(projectId, {
      status: "all",
      pageSize: 1000,
      page: 1,
    }).then((value) => {
      executionsCache.set(key, { expiresAt: Date.now() + metadataCacheTtlMs, value });
      executionsState = "ready";
      return value;
    }).finally(() => {
      executionsInFlight.delete(key);
    });
    executionsInFlight.set(key, request);
    return request;
  }

  async function refreshProjects() {
    if (projectsRefreshInFlight) return projectsRefreshInFlight;
    projectsState = "refreshing";
    projectsRefreshInFlight = service.listProjects()
      .then((projects) => {
        projectsCache = { expiresAt: Date.now() + metadataCacheTtlMs, value: projects };
        projectsState = "ready";
        return { projects: projects.length };
      })
      .catch((error) => {
        projectsState = "error";
        throw error;
      })
      .finally(() => {
        projectsRefreshInFlight = undefined;
      });
    return projectsRefreshInFlight;
  }

  async function refreshExecutions() {
    if (executionsRefreshInFlight) return executionsRefreshInFlight;
    executionsState = "refreshing";
    executionsRefreshInFlight = getProjects()
      .then(async (projects) => {
        const refreshed = await Promise.all(projects.map(async (project) => ({
          project,
          executions: await service.listProjectExecutions(project.id, {
            status: "all",
            pageSize: 1000,
            page: 1,
          }),
        })));
        const nextCache = new Map<string, { expiresAt: number; value: ZenTaoExecution[] }>();
        let executions = 0;
        for (const { project, executions: projectExecutions } of refreshed) {
          nextCache.set(String(project.id), {
            expiresAt: Date.now() + metadataCacheTtlMs,
            value: projectExecutions,
          });
          executions += projectExecutions.length;
        }
        executionsCache.clear();
        for (const [key, value] of nextCache) executionsCache.set(key, value);
        executionsState = "ready";
        return { projects: projects.length, executions };
      })
      .catch((error) => {
        executionsState = "error";
        throw error;
      })
      .finally(() => {
        executionsRefreshInFlight = undefined;
      });
    return executionsRefreshInFlight;
  }

  async function queryMyTasks(input: ZenTaoTaskQuery) {
    const cachedExecutions = assignedExecutionCache && assignedExecutionCache.expiresAt > Date.now()
      ? assignedExecutionCache.value
      : undefined;
    const projects = await getProjects();
    let executions: TaskExecutionRef[];
    const buildingIndex = !cachedExecutions;
    let skippedProjects = 0;
    if (cachedExecutions) {
      executions = cachedExecutions;
    } else {
      const executionResults = [];
      for (const project of projects) {
        try {
          executionResults.push({ project, executions: await getProjectExecutions(project.id) });
        } catch {
          skippedProjects += 1;
          executionResults.push({ project, executions: [], skipped: true });
        }
      }
      executions = executionResults.flatMap(({ project, executions: projectExecutions }) =>
        projectExecutions.map((execution) => ({ execution, project })),
      );
    }

    const taskResults = [];
    for (const { execution, project } of executions) {
      try {
        taskResults.push({
          execution,
          project,
          tasks: await service.listExecutionTasks(execution.id, {
            status: "assignedtome",
            pageSize: input.pageSize ?? 1000,
            page: 1,
          }),
        });
      } catch {
        taskResults.push({ execution, project, tasks: [] as ZenTaoTask[], skipped: true });
      }
    }

    const tasks = taskResults.flatMap(({ execution, project, tasks: executionTasks }) =>
      executionTasks.map((task) => ({
        ...task,
        execution: task.execution ?? execution.id,
        executionName: execution.name,
        project: task.project ?? project.id,
        projectName: project.name,
      })),
    );
    if (buildingIndex) {
      assignedExecutionCache = {
        expiresAt: Date.now() + metadataCacheTtlMs,
        value: taskResults.filter(({ tasks: executionTasks }) => executionTasks.length > 0)
          .map(({ execution, project }) => ({ execution, project })),
      };
    }
    return {
      tasks,
      skippedProjects,
      skippedExecutions: taskResults.filter((result) => result.skipped).length,
    };
  }

  async function warmup() {
    if (assignedExecutionCache && assignedExecutionCache.expiresAt > Date.now()) return;
    if (taskQueryInFlight) {
      await taskQueryInFlight;
      return;
    }
    const request = queryMyTasks({});
    taskQueryInFlight = request;
    try {
      const result = await request;
      taskCache = { expiresAt: Date.now() + taskCacheTtlMs, result };
    } finally {
      taskQueryInFlight = undefined;
    }
  }

  return {
    warmup,
    async getCachedMyTasks() {
      const cacheReady = Boolean(taskCache && taskCache.expiresAt > Date.now());
      return {
        ...(cacheReady
          ? taskCache!.result
          : { tasks: [], skippedProjects: 0, skippedExecutions: 0 }),
        cacheReady,
      };
    },
    async refreshMyTasksFromCachedExecutions() {
      const cacheReady = Boolean(assignedExecutionCache && assignedExecutionCache.expiresAt > Date.now());
      if (!cacheReady) {
        const previous = taskCache && taskCache.expiresAt > Date.now() ? taskCache.result : undefined;
        return {
          ...(previous ?? { tasks: [], skippedProjects: 0, skippedExecutions: 0 }),
          cacheReady: Boolean(previous),
        };
      }
      const result = await queryMyTasks({});
      const previous = taskCache && taskCache.expiresAt > Date.now() ? taskCache.result : undefined;
      if (previous && result.skippedExecutions > 0) {
        return { ...previous, cacheReady: true };
      }
      taskCache = { expiresAt: Date.now() + taskCacheTtlMs, result };
      return { ...result, cacheReady: true };
    },
    refreshProjects,
    refreshExecutions,
    getCacheStatus() {
      return {
        projects: {
          status: projectsRefreshInFlight ? "refreshing" : projectsState,
          ...(projectsCache ? { count: projectsCache.value.length } : {}),
        },
        executions: {
          status: executionsRefreshInFlight ? "refreshing" : executionsState,
          ...(executionsCache.size ? { count: Array.from(executionsCache.values()).reduce((total, entry) => total + entry.value.length, 0) } : {}),
        },
      };
    },
    async listMyBugs(input: ZenTaoBugQuery = {}) {
      const projects = await getProjects();
      const selectedProjects = input.projectId === undefined
        ? projects
        : projects.filter((project) => String(project.id) === String(input.projectId));
      const results = await Promise.all(selectedProjects.map(async (project) => {
        try {
          return {
            project: { id: project.id, name: project.name },
            bugs: await service.listProjectBugs(project.id, {
              browseType: input.status ?? "all",
              pageSize: input.pageSize ?? 100,
              page: 1,
            }),
          };
        } catch {
          return { project: { id: project.id, name: project.name }, bugs: [] };
        }
      }));
      const bugs = results.flatMap(({ project, bugs: projectBugs }) =>
        projectBugs
          .filter((bug) => bug.assignedTo === account)
          .map((bug) => ({ ...bug, project: bug.project ?? project.id, projectName: project.name })),
      );

      return {
        bugs,
        projects: results.map(({ project, bugs: projectBugs }) => ({
          project,
          count: projectBugs.filter((bug) => bug.assignedTo === account).length,
        })),
      };
    },
    getBugDetail: (bugId) => service.getBugDetail(bugId),
    async listMyTasks(input: ZenTaoTaskQuery = {}) {
      const isDefaultQuery = Object.keys(input).length === 0;
      if (isDefaultQuery && taskCache && taskCache.expiresAt > Date.now()) {
        return taskCache.result;
      }
      if (isDefaultQuery && taskQueryInFlight) return taskQueryInFlight;
      const request = queryMyTasks(input);
      if (!isDefaultQuery) return request;
      taskQueryInFlight = request;
      try {
        const result = await request;
        taskCache = { expiresAt: Date.now() + taskCacheTtlMs, result };
        return result;
      } finally {
        taskQueryInFlight = undefined;
      }
    },
    resolveBug: ({ bugId, ...input }) => service.resolveBug(bugId, input),
  };
}
