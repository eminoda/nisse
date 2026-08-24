import { randomUUID } from "node:crypto";
import { stepCountIs, streamText, type LanguageModel, type ModelMessage } from "ai";
import type { ModelConfig } from "./types.js";
import { providerRegistry, ProviderRegistry } from "./index.js";
import { mockTools } from "./tools/mock-work-status.js";

export interface AgentReplyStream {
  conversationId: string;
  response: ReturnType<typeof streamText<typeof mockTools>>;
}

export class ConversationStore {
  private readonly conversations = new Map<string, ModelMessage[]>();

  getOrCreate(id?: string) {
    const conversationId = id || randomUUID();
    const messages = this.conversations.get(conversationId) ?? [];
    this.conversations.set(conversationId, messages);
    return { id: conversationId, messages };
  }

  append(id: string, message: ModelMessage) {
    this.getOrCreate(id).messages.push(message);
  }
}

export class AgentRuntime {
  private readonly model: LanguageModel;
  private readonly conversations: ConversationStore;

  constructor(
    config: ModelConfig,
    registry: ProviderRegistry = providerRegistry,
    conversations = new ConversationStore(),
  ) {
    this.model = registry.createModel(config);
    this.conversations = conversations;
  }

  streamReply(message: string, conversationId?: string): AgentReplyStream {
    const conversation = this.conversations.getOrCreate(conversationId);
    this.conversations.append(conversation.id, { role: "user", content: message });

    const response = streamText({
      model: this.model,
      messages: conversation.messages,
      tools: mockTools,
      stopWhen: stepCountIs(5),
      onFinish: ({ text }) => {
        if (text) {
          this.conversations.append(conversation.id, { role: "assistant", content: text });
        }
      },
    });

    return { conversationId: conversation.id, response };
  }
}
