import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateText, wrapLanguageModel } from "ai";
import type { LanguageModel } from "ai";
import type { ModelConfig, ModelProvider, ConnectionTestResult } from "../types.js";
import {
  createToolStreamCompatibilityFetch,
  createToolStreamCompatibilityMiddleware,
} from "./tool-stream-compat.js";

export class DeepSeekProvider implements ModelProvider {
  readonly id = "deepseek";

  createModel(config: ModelConfig): LanguageModel {
    const apiKey = config.apiKey.value;
    if (!apiKey) {
      throw new Error("DeepSeek API key has not been resolved from SecretStore");
    }

    const provider = createDeepSeek({
      apiKey,
      ...(config.endpoint ? { baseURL: config.endpoint } : {}),
      fetch: createToolStreamCompatibilityFetch(),
    });

    return wrapLanguageModel({
      model: provider(config.model),
      middleware: createToolStreamCompatibilityMiddleware(),
    });
  }

  async testConnection(config: ModelConfig): Promise<ConnectionTestResult> {
    try {
      const model = this.createModel(config);
      await generateText({
        model,
        prompt: "Reply with OK.",
        maxOutputTokens: 4,
      });

      return { ok: true, message: "DeepSeek connection is ready", model: config.model };
    } catch (error) {
      return {
        ok: false,
        message: getProviderErrorMessage(error),
        model: config.model,
      };
    }
  }
}

function getProviderErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "DeepSeek connection failed";
}
