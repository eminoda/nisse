export const projectName = "nisse" as const;

export type RuntimeStatus = "running" | "stopped" | "starting" | "error";

export interface RuntimeStatusResponse {
  status: RuntimeStatus;
  version: string;
}

export interface SecretRef {
  secretRef: string;
  /** Runtime-only value supplied by SecretStore; never persist this field. */
  value?: string;
}

export * from "./connection.js";
