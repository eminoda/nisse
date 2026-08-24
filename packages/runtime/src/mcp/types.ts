export type McpServerConfig = {
  id: string;
  name: string;
  transport: "stdio" | "streamable-http";
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  cwd?: string;
};

export type McpServerHealth = {
  id: string;
  status: "stopped" | "starting" | "ready" | "error";
  toolCount: number;
  error?: string;
};
