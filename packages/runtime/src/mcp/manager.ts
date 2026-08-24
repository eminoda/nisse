import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { jsonSchema, tool, type ToolSet } from "ai";
import type { McpServerConfig, McpServerHealth } from "./types.js";

type McpClient = Client;

type ManagedServer = {
  config: McpServerConfig;
  client?: McpClient;
  transport?: StdioClientTransport | StreamableHTTPClientTransport;
  tools: Awaited<ReturnType<Client["listTools"]>>["tools"];
  health: McpServerHealth;
};

export class McpManager {
  private readonly servers = new Map<string, ManagedServer>();

  register(config: McpServerConfig) {
    if (!config.id || !config.name) throw new Error("MCP id and name are required");
    if (config.transport === "stdio" && !config.command) {
      throw new Error("stdio MCP requires a command");
    }
    if (config.transport === "streamable-http" && !config.url) {
      throw new Error("streamable HTTP MCP requires a url");
    }
    this.servers.set(config.id, {
      config,
      tools: [],
      health: { id: config.id, status: "stopped", toolCount: 0 },
    });
    return this;
  }

  list() {
    return [...this.servers.values()].map(({ config, health }) => ({ config, health }));
  }

  async start(id: string) {
    const managed = this.requireServer(id);
    managed.health = { ...managed.health, status: "starting", error: undefined };
    try {
      const client = new Client({ name: "nisse-runtime", version: "0.1.0" });
      const transport =
        managed.config.transport === "stdio"
          ? new StdioClientTransport({
              command: managed.config.command!,
              args: managed.config.args,
              env: managed.config.env,
              cwd: managed.config.cwd,
            })
          : new StreamableHTTPClientTransport(new URL(managed.config.url!));
      await client.connect(transport);
      const result = await client.listTools();
      managed.client = client;
      managed.transport = transport;
      managed.tools = result.tools;
      managed.health = { id, status: "ready", toolCount: result.tools.length };
      return result.tools;
    } catch (error) {
      managed.health = {
        id,
        status: "error",
        toolCount: 0,
        error: error instanceof Error ? error.message : "MCP connection failed",
      };
      throw error;
    }
  }

  async stop(id: string) {
    const managed = this.requireServer(id);
    await managed.client?.close();
    managed.client = undefined;
    managed.transport = undefined;
    managed.tools = [];
    managed.health = { id, status: "stopped", toolCount: 0 };
  }

  async restart(id: string) {
    await this.stop(id);
    return this.start(id);
  }

  health(id: string) {
    return this.requireServer(id).health;
  }

  listAiSdkTools(): ToolSet {
    const result: ToolSet = {};
    for (const managed of this.servers.values()) {
      if (!managed.client || managed.health.status !== "ready") continue;
      for (const definition of managed.tools) {
        const name = `${managed.config.id}__${definition.name}`;
        result[name] = tool({
          description: definition.description ?? `${managed.config.name}: ${definition.name}`,
          inputSchema: jsonSchema(definition.inputSchema as Parameters<typeof jsonSchema>[0]),
          execute: async (input) =>
            managed.client!.callTool({
              name: definition.name,
              arguments: input as Record<string, unknown>,
            }),
        });
      }
    }
    return result;
  }

  private requireServer(id: string) {
    const server = this.servers.get(id);
    if (!server) throw new Error(`MCP server not registered: ${id}`);
    return server;
  }
}
