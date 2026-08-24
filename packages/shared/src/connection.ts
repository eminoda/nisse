export type ConnectionFieldType = "text" | "password" | "url" | "select" | "number" | "boolean";

export interface ConnectionFieldOption {
  label: string;
  value: string;
}

export interface ConnectionField {
  key: string;
  label: string;
  type: ConnectionFieldType;
  required?: boolean;
  placeholder?: string;
  options?: ConnectionFieldOption[];
}

export interface ConnectionSchema {
  type: string;
  name: string;
  description?: string;
  fields: ConnectionField[];
}

export type ConnectionStatus = "not_configured" | "configured" | "testing" | "ready" | "error";

export interface ConnectionSummary {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  status: ConnectionStatus;
  error?: string;
}

export interface ConnectionInput {
  id?: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  secrets: Record<string, string>;
}
