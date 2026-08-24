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
    this.token = options.token ?? import.meta.env.VITE_NISSE_RUNTIME_TOKEN ?? null;
  }

  setToken(token: string | null) {
    this.token = token;
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
