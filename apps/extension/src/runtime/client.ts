import type {
  ConnectionInput,
  ConnectionSchema,
  ConnectionSummary,
  RuntimeStatusResponse,
} from "@nisse/shared";

export interface RuntimeEvent {
  type: string;
  data: string;
  id?: string;
}

export interface ApprovalSummary {
  approvalId: string;
  tool: string;
  arguments: Record<string, unknown>;
  summary: string;
  expiresAt: string;
  status: "pending" | "approved" | "rejected" | "expired" | "failed";
  result?: unknown;
  error?: string;
}

export interface WatchSummary {
  id: string;
  source: string;
  schedule: { type: "manual" } | { type: "interval"; intervalMs: number };
  snapshot?: unknown;
}

export interface ZenTaoDashboard {
  bugs: Array<Record<string, unknown>>;
  tasks?: Array<Record<string, unknown>>;
  projects: Array<{ project: { id: string | number; name?: string }; count: number }>;
  webUrl?: string;
  cacheReady?: boolean;
}

export interface ZenTaoCacheStatus {
  projects: { status: "not_fetched" | "refreshing" | "ready" | "error"; count?: number };
  executions: { status: "not_fetched" | "refreshing" | "ready" | "error"; count?: number };
}

export class RuntimeClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "RuntimeClientError";
  }
}

export interface RuntimeClientOptions {
  baseUrl?: string;
  token?: string | null;
}

export class RuntimeClient {
  private readonly baseUrl: string;
  private token: string | null;

  constructor(options: RuntimeClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "http://127.0.0.1:4317").replace(/\/$/, "");
    const storedToken = typeof localStorage !== "undefined" ? localStorage.getItem("nisse.runtimeToken") : null;
    this.token = options.token ?? storedToken ?? import.meta.env.VITE_NISSE_RUNTIME_TOKEN ?? null;
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof localStorage !== "undefined") {
      if (token) localStorage.setItem("nisse.runtimeToken", token);
      else localStorage.removeItem("nisse.runtimeToken");
    }
  }

  get hasToken() {
    return Boolean(this.token);
  }

  async getStatus(signal?: AbortSignal): Promise<RuntimeStatusResponse> {
    const response = await this.request("/api/runtime/status", { signal });
    if (!response.ok) {
      throw new RuntimeClientError("Runtime status request failed", response.status);
    }
    return (await response.json()) as RuntimeStatusResponse;
  }

  async getConnectionSchemas(signal?: AbortSignal) {
    const response = await this.request("/api/connections/schemas", { signal });
    if (!response.ok)
      throw new RuntimeClientError("Connection schemas request failed", response.status);
    return ((await response.json()) as { schemas: ConnectionSchema[] }).schemas;
  }

  async getConnections(signal?: AbortSignal) {
    const response = await this.request("/api/connections", { signal });
    if (!response.ok) throw new RuntimeClientError("Connections request failed", response.status);
    return ((await response.json()) as { connections: ConnectionSummary[] }).connections;
  }

  async saveConnection(input: ConnectionInput, signal?: AbortSignal) {
    const response = await this.request("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });
    if (!response.ok) throw new RuntimeClientError("Connection save failed", response.status);
    return ((await response.json()) as { connection: ConnectionSummary }).connection;
  }

  async testConnection(id: string, signal?: AbortSignal) {
    const response = await this.request(`/api/connections/${encodeURIComponent(id)}/test`, {
      method: "POST",
      signal,
    });
    if (!response.ok) throw new RuntimeClientError("Connection test failed", response.status);
    return ((await response.json()) as { connection: ConnectionSummary }).connection;
  }

  async pairWithAuthCode(code: string, signal?: AbortSignal) {
    const response = await this.request("/api/pairing/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
      signal,
    });
    if (!response.ok) throw new RuntimeClientError("Desktop 配对失败", response.status);
    const result = (await response.json()) as { token: string };
    this.setToken(result.token);
    return result;
  }

  async getWatches(signal?: AbortSignal) {
    const response = await this.request("/api/watches", { signal });
    if (!response.ok) throw new RuntimeClientError("Watch list request failed", response.status);
    return ((await response.json()) as { watches: WatchSummary[] }).watches;
  }

  async getZenTaoDashboard(signal?: AbortSignal) {
    const response = await this.request("/api/dashboard/zentao", { signal });
    if (!response.ok) throw new RuntimeClientError("Dashboard request failed", response.status);
    return ((await response.json()) as { dashboard: ZenTaoDashboard }).dashboard;
  }

  async getZenTaoBugs(signal?: AbortSignal) {
    const response = await this.request("/api/dashboard/zentao/bugs", { signal });
    if (!response.ok) throw new RuntimeClientError("Bug dashboard request failed", response.status);
    return (await response.json()) as Pick<ZenTaoDashboard, "bugs" | "projects" | "webUrl">;
  }

  async getZenTaoTasks(signal?: AbortSignal) {
    const response = await this.request("/api/dashboard/zentao/tasks", { signal });
    if (!response.ok) throw new RuntimeClientError("Task dashboard request failed", response.status);
    return (await response.json()) as Pick<ZenTaoDashboard, "tasks" | "webUrl" | "cacheReady">;
  }

  async getZenTaoCacheStatus(signal?: AbortSignal) {
    const response = await this.request("/api/dashboard/zentao/cache/status", { signal });
    if (!response.ok) throw new RuntimeClientError("禅道缓存状态查询失败", response.status);
    return (await response.json()) as { status: ZenTaoCacheStatus };
  }

  async refreshZenTaoProjects(signal?: AbortSignal) {
    const response = await this.request("/api/dashboard/zentao/cache/projects/refresh", {
      method: "POST",
      signal,
    });
    if (!response.ok) throw new RuntimeClientError("禅道项目缓存刷新失败", response.status);
    return (await response.json()) as { result: { projects: number } };
  }

  async refreshZenTaoExecutions(signal?: AbortSignal) {
    const response = await this.request("/api/dashboard/zentao/cache/executions/refresh", {
      method: "POST",
      signal,
    });
    if (!response.ok) throw new RuntimeClientError("禅道执行缓存刷新失败", response.status);
    return (await response.json()) as { result: { projects: number; executions: number } };
  }

  async createWatch(input: {
    id?: string;
    source: string;
    schedule: { type: "manual" } | { type: "interval"; intervalMs: number };
    enabled?: boolean;
  }, signal?: AbortSignal) {
    const response = await this.request("/api/watches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });
    if (!response.ok) throw new RuntimeClientError("Watch creation failed", response.status);
    return ((await response.json()) as { watch: WatchSummary }).watch;
  }

  async runWatch(id: string, signal?: AbortSignal) {
    const response = await this.request(`/api/watches/${encodeURIComponent(id)}/run`, {
      method: "POST",
      signal,
    });
    if (!response.ok) throw new RuntimeClientError("Watch run failed", response.status);
    return (await response.json()) as { result: unknown };
  }

  async deleteWatch(id: string, signal?: AbortSignal) {
    const response = await this.request(`/api/watches/${encodeURIComponent(id)}`, {
      method: "DELETE",
      signal,
    });
    if (!response.ok) throw new RuntimeClientError("Watch deletion failed", response.status);
  }

  async approveApproval(id: string, signal?: AbortSignal) {
    const response = await this.request(`/api/approvals/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      signal,
    });
    if (!response.ok) throw new RuntimeClientError("Approval failed", response.status);
    return ((await response.json()) as { approval: ApprovalSummary }).approval;
  }

  async rejectApproval(id: string, signal?: AbortSignal) {
    const response = await this.request(`/api/approvals/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      signal,
    });
    if (!response.ok) throw new RuntimeClientError("Rejection failed", response.status);
    return ((await response.json()) as { approval: ApprovalSummary }).approval;
  }

  async subscribeEvents(
    onEvent: (event: RuntimeEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const response = await this.request("/api/events", { signal });
    if (!response.ok || !response.body) {
      throw new RuntimeClientError("Runtime event stream could not be opened", response.status);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let eventType = "message";
    let eventData: string[] = [];
    let eventId: string | undefined;

    const dispatch = () => {
      if (eventData.length === 0) return;
      onEvent({ type: eventType, data: eventData.join("\n"), id: eventId });
      eventType = "message";
      eventData = [];
      eventId = undefined;
    };

    while (!signal?.aborted) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line === "") {
          dispatch();
        } else if (line.startsWith("event:")) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          eventData.push(line.slice(5).trimStart());
        } else if (line.startsWith("id:")) {
          eventId = line.slice(3).trim();
        }
      }

      if (done) {
        dispatch();
        return;
      }
    }

    await reader.cancel();
  }

  async streamChat(
    input: { message: string; conversationId?: string },
    onEvent: (event: RuntimeEvent) => void,
    signal?: AbortSignal,
  ) {
    const response = await this.request("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });
    if (!response.ok || !response.body) {
      throw new RuntimeClientError("Chat request failed", response.status);
    }

    await this.readEventStream(response.body, onEvent, signal);
  }

  private request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (this.token) headers.set("Authorization", `Bearer ${this.token}`);
    return fetch(`${this.baseUrl}${path}`, { ...init, headers });
  }

  private async readEventStream(
    body: ReadableStream<Uint8Array>,
    onEvent: (event: RuntimeEvent) => void,
    signal?: AbortSignal,
  ) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let eventType = "message";
    let eventData: string[] = [];
    let eventId: string | undefined;

    const dispatch = () => {
      if (eventData.length === 0) return;
      onEvent({ type: eventType, data: eventData.join("\n"), id: eventId });
      eventType = "message";
      eventData = [];
      eventId = undefined;
    };

    while (!signal?.aborted) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line === "") dispatch();
        else if (line.startsWith("event:")) eventType = line.slice(6).trim();
        else if (line.startsWith("data:")) eventData.push(line.slice(5).trimStart());
        else if (line.startsWith("id:")) eventId = line.slice(3).trim();
      }

      if (done) {
        dispatch();
        return;
      }
    }

    await reader.cancel();
  }
}

export const runtimeClient = new RuntimeClient();
