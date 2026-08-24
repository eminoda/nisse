import type {
  ConnectionField,
  ConnectionInput,
  ConnectionSchema,
  ConnectionStatus,
  ConnectionSummary,
} from "@nisse/shared";

type StoredConnection = ConnectionInput & { id: string; status: ConnectionStatus; error?: string };

const mockSchema: ConnectionSchema = {
  type: "mock-work-system",
  name: "Mock Work System",
  description: "用于验证动态 Connection 表单和测试连接流程。",
  fields: [
    {
      key: "endpoint",
      label: "Endpoint",
      type: "url",
      required: true,
      placeholder: "https://example.test",
    },
    { key: "workspace", label: "Workspace", type: "text", required: true, placeholder: "my-team" },
    {
      key: "environment",
      label: "Environment",
      type: "select",
      options: [
        { label: "Production", value: "production" },
        { label: "Staging", value: "staging" },
      ],
    },
    { key: "timeout", label: "Timeout (seconds)", type: "number", placeholder: "30" },
    { key: "enabled", label: "Enabled", type: "boolean" },
    { key: "token", label: "Access Token", type: "password", required: true },
  ],
};

export class ConnectionManager {
  private readonly schemas = new Map<string, ConnectionSchema>([[mockSchema.type, mockSchema]]);
  private readonly connections = new Map<string, StoredConnection>();

  registerSchema(schema: ConnectionSchema) {
    this.schemas.set(schema.type, schema);
    return this;
  }

  listSchemas() {
    return [...this.schemas.values()];
  }

  listConnections(): ConnectionSummary[] {
    return [...this.connections.values()].map((connection) => this.toSummary(connection));
  }

  save(input: ConnectionInput) {
    const schema = this.requireSchema(input.type);
    this.validateRequired(schema.fields, input.config, input.secrets);
    const id = input.id || `${input.type}-${Date.now()}`;
    const existing = this.connections.get(id);
    const stored: StoredConnection = {
      ...input,
      id,
      secrets: { ...existing?.secrets, ...input.secrets },
      status: "configured",
      error: undefined,
    };
    this.connections.set(id, stored);
    return this.toSummary(stored);
  }

  async test(id: string) {
    const connection = this.connections.get(id);
    if (!connection) throw new Error(`Connection not found: ${id}`);
    connection.status = "testing";
    connection.error = undefined;
    await Promise.resolve();
    connection.status = "ready";
    return this.toSummary(connection);
  }

  private requireSchema(type: string) {
    const schema = this.schemas.get(type);
    if (!schema) throw new Error(`Connection schema not found: ${type}`);
    return schema;
  }

  private validateRequired(
    fields: ConnectionField[],
    config: Record<string, unknown>,
    secrets: Record<string, string>,
  ) {
    for (const field of fields) {
      if (!field.required) continue;
      const value = field.type === "password" ? secrets[field.key] : config[field.key];
      if (value === undefined || value === "")
        throw new Error(`Required connection field missing: ${field.key}`);
    }
  }

  private toSummary(connection: StoredConnection): ConnectionSummary {
    return {
      id: connection.id,
      type: connection.type,
      name: connection.name,
      config: connection.config,
      status: connection.status,
      ...(connection.error ? { error: connection.error } : {}),
    };
  }
}
