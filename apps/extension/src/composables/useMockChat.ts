import { computed, readonly, shallowRef } from "vue";
import type { ChatMessage } from "../types";
import { runtimeClient } from "../runtime/client";

const welcomeMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "你好，我是 nisse。告诉我你想了解或完成什么工作吧。",
  timestamp: "刚刚",
};

export function useMockChat() {
  const _messages = shallowRef<ChatMessage[]>([welcomeMessage]);
  const isSending = shallowRef(false);
  const errorMessage = shallowRef<string | null>(null);
  const toolStatus = shallowRef<string | null>(null);
  const conversationId = shallowRef<string | undefined>();
  const hasMessages = computed(() => _messages.value.length > 0);

  async function sendMessage(content: string) {
    const trimmedContent = content.trim();
    if (!trimmedContent || isSending.value) return;
    errorMessage.value = null;
    toolStatus.value = null;

    const now = new Date();
    const userMessage: ChatMessage = {
      id: `user-${now.getTime()}`,
      role: "user",
      content: trimmedContent,
      timestamp: "刚刚",
    };

    _messages.value = [..._messages.value, userMessage];
    isSending.value = true;

    try {
      if (runtimeClient.hasToken) {
        let assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: "",
          timestamp: "刚刚",
        };
        _messages.value = [..._messages.value, assistantMessage];

        await runtimeClient.streamChat(
          { message: trimmedContent, conversationId: conversationId.value },
          (event) => {
            const payload = JSON.parse(event.data) as {
              conversationId?: string;
              delta?: string;
            };
            if (payload.conversationId) conversationId.value = payload.conversationId;
            if (event.type === "tool.started") toolStatus.value = "正在查询工作状态...";
            if (event.type === "tool.completed") toolStatus.value = "✓ 查询完成";
            if (event.type === "tool.failed") toolStatus.value = "工具执行失败";
            if (event.type === "message.delta" && payload.delta) {
              assistantMessage = {
                ...assistantMessage,
                content: assistantMessage.content + payload.delta,
              };
              _messages.value = [..._messages.value.slice(0, -1), assistantMessage];
            }
            if (event.type === "message.failed") throw new Error("Agent stream failed");
          },
        );
        return;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 650));

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "这是 Mock 回复。连接 Desktop Runtime 后，我会通过 Agent 帮你查询和执行工作任务。",
        timestamp: "刚刚",
      };

      _messages.value = [..._messages.value, assistantMessage];
    } catch {
      errorMessage.value = "消息发送失败，请稍后重试。";
    } finally {
      isSending.value = false;
    }
  }

  return {
    messages: readonly(_messages),
    isSending: readonly(isSending),
    errorMessage: readonly(errorMessage),
    toolStatus: readonly(toolStatus),
    hasMessages,
    sendMessage,
  };
}
