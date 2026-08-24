import type { LanguageModel } from "ai";
import type { ConnectionTestResult, ModelConfig, ModelProvider } from "./types.js";

export class ProviderRegistry {
  private readonly providers = new Map<string, ModelProvider>();

  register(provider: ModelProvider) {
    if (this.providers.has(provider.id)) {
      throw new Error(`Model provider already registered: ${provider.id}`);
    }
    this.providers.set(provider.id, provider);
    return this;
  }

  get(providerId: string) {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Unknown model provider: ${providerId}`);
    return provider;
  }

  list() {
    return [...this.providers.values()];
  }

  createModel(config: ModelConfig): LanguageModel {
    return this.get(config.provider).createModel(config);
  }

  testConnection(config: ModelConfig): Promise<ConnectionTestResult> {
    return this.get(config.provider).testConnection(config);
  }
}
