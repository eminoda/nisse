import type {
  ResolveBugInput,
  ZenTaoBug,
  ZenTaoConnection,
  ZenTaoFetch,
  ZenTaoProject,
  ZenTaoTask,
} from "./types.js";

type ApiEnvelope = {
  status?: string;
  message?: string;
  token?: string;
  projects?: ZenTaoProject[];
  bugs?: ZenTaoBug[];
  bug?: ZenTaoBug;
  executions?: Array<{ id: string | number; name?: string; [key: string]: unknown }>;
  tasks?: ZenTaoTask[];
};

function normalizeBaseUrl(endpoint: string) {
  const value = endpoint.trim().replace(/\/+$/, "");
  if (!value) throw new Error("ZenTao endpoint is required");
  return value.endsWith("/api.php/v2") ? value : `${value}/api.php/v2`;
}

export class ZenTaoService {
  private readonly baseUrl: string;
  private token?: string;
  private readonly fetcher: ZenTaoFetch;

  constructor(
    private readonly connection: ZenTaoConnection,
    fetcher: ZenTaoFetch = (input, init) => fetch(input, init),
  ) {
    this.baseUrl = normalizeBaseUrl(connection.endpoint);
    this.fetcher = fetcher;
  }

  async testConnection() {
    await this.authenticate();
    return { account: this.connection.account, status: "ready" as const };
  }

  async listProjects(
    options: { browseType?: "all" | "undone"; orderBy?: string; pageSize?: number; page?: number } = {},
  ) {
    const params = new URLSearchParams({
      browseType: options.browseType ?? "all",
      orderBy: options.orderBy ?? "id_desc",
      recPerPage: String(options.pageSize ?? 100),
      pageID: String(options.page ?? 1),
    });
    const payload = await this.request(`/projects?${params}`);
    return payload.projects ?? [];
  }

  async listProjectBugs(
    projectId: string | number,
    options: { browseType?: "all" | "unresolved"; pageSize?: number; page?: number } = {},
  ) {
    const params = new URLSearchParams({
      browseType: options.browseType ?? "all",
      recPerPage: String(options.pageSize ?? 100),
      pageID: String(options.page ?? 1),
    });
    const payload = await this.request(`/projects/${encodeURIComponent(String(projectId))}/bugs?${params}`);
    return payload.bugs ?? [];
  }

  async listProjectExecutions(
    projectId: string | number,
    options: { status?: "all" | "undone" | "wait" | "doing"; pageSize?: number; page?: number } = {},
  ) {
    const params = new URLSearchParams({
      status: options.status ?? "undone",
      recPerPage: String(options.pageSize ?? 1000),
      pageID: String(options.page ?? 1),
    });
    const payload = await this.request(`/projects/${encodeURIComponent(String(projectId))}/executions?${params}`);
    return payload.executions ?? [];
  }

  async listExecutions(
    options: { status?: "all" | "undone" | "wait" | "doing"; pageSize?: number; page?: number } = {},
  ) {
    const params = new URLSearchParams({
      status: options.status ?? "undone",
      recPerPage: String(options.pageSize ?? 1000),
      pageID: String(options.page ?? 1),
    });
    const payload = await this.request(`/executions?${params}`);
    return payload.executions ?? [];
  }

  async listExecutionTasks(
    executionId: string | number,
    options: { status?: "all" | "unclosed" | "assignedtome"; pageSize?: number; page?: number } = {},
  ) {
    const params = new URLSearchParams({
      status: options.status ?? "assignedtome",
      orderBy: "id_desc",
      recPerPage: String(options.pageSize ?? 1000),
      pageID: String(options.page ?? 1),
    });
    const path = `/executions/${encodeURIComponent(String(executionId))}/tasks?${params}`;
    const requestTasks = async () => {
      const payload = await this.request(path, { headers: { Connection: "close" } });
      return payload.tasks ?? [];
    };
    const tasks = await requestTasks();
    // ZenTao may return an empty list on the first request because the
    // execution context is attached to a reused TLS session. Match the
    // reference client and retry once with a fresh connection hint.
    return tasks.length ? tasks : requestTasks();
  }

  async getBugDetail(bugId: string | number) {
    const payload = await this.request(`/bugs/${encodeURIComponent(String(bugId))}`);
    if (!payload.bug) throw new Error("ZenTao response did not include bug detail");
    return payload.bug;
  }

  async resolveBug(bugId: string | number, input: ResolveBugInput) {
    await this.request(`/bugs/${encodeURIComponent(String(bugId))}/resolve`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    return { status: "success" as const };
  }

  private async authenticate() {
    const payload = await this.requestPublic("/users/login", {
      method: "POST",
      body: JSON.stringify({ account: this.connection.account, password: this.connection.password }),
    });
    if (!payload.token) throw new Error("ZenTao login response did not include a token");
    this.token = payload.token;
    return this.token;
  }

  private async request(path: string, init: RequestInit = {}) {
    if (!this.token) await this.authenticate();
    return this.requestPublic(path, {
      ...init,
      headers: { ...(init.headers ?? {}), token: this.token! },
    });
  }

  private async requestPublic(path: string, init: RequestInit = {}): Promise<ApiEnvelope> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    let payload: ApiEnvelope;
    try {
      payload = (await response.json()) as ApiEnvelope;
    } catch {
      throw new Error(`ZenTao returned invalid JSON (HTTP ${response.status})`);
    }
    if (!response.ok) {
      throw new Error(`ZenTao request failed with HTTP ${response.status}: ${payload.message ?? "unknown error"}`);
    }
    if (payload.status === "fail") {
      throw new Error(`ZenTao request failed: ${payload.message ?? "unknown error"}`);
    }
    return payload;
  }
}

export { normalizeBaseUrl };
