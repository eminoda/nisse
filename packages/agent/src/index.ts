export { ProviderRegistry } from "./registry.js";
export { DeepSeekProvider } from "./providers/deepseek.js";
export { AgentRuntime, ConversationStore } from "./runtime.js";
export { getCurrentWorkStatusTool, mockTools } from "./tools/mock-work-status.js";
export type { ConnectionTestResult, ModelConfig, ModelProvider } from "./types.js";

import { DeepSeekProvider } from "./providers/deepseek.js";
import { ProviderRegistry } from "./registry.js";

export const providerRegistry = new ProviderRegistry().register(new DeepSeekProvider());
