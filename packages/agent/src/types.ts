import type { LanguageModel } from "ai";
import type { SecretRef } from "@nisse/shared";

export interface ModelConfig {
  provider: string;
  endpoint?: string;
  model: string;
  apiKey: SecretRef;
}

export interface ModelProvider {
  readonly id: string;
  createModel(config: ModelConfig): LanguageModel;
  testConnection(config: ModelConfig): Promise<ConnectionTestResult>;
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  model?: string;
}
