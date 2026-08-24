<script setup lang="ts">
import type { ChatMessage } from "../types";

defineProps<{
  messages: readonly ChatMessage[];
  isSending: boolean;
}>();
</script>

<template>
  <div class="message-list" aria-live="polite">
    <article
      v-for="message in messages"
      :key="message.id"
      class="message"
      :class="`message--${message.role}`"
    >
      <div class="message-avatar" aria-hidden="true">
        {{ message.role === "assistant" ? "n" : "你" }}
      </div>
      <div class="message-body">
        <div class="message-meta">
          <span>{{ message.role === "assistant" ? "nisse" : "你" }}</span>
          <time>{{ message.timestamp }}</time>
        </div>
        <p>{{ message.content }}</p>
      </div>
    </article>

    <div v-if="isSending" class="typing-indicator" aria-label="nisse 正在输入">
      <span></span><span></span><span></span>
    </div>
  </div>
</template>

<style scoped>
.message-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 22px;
  overflow-y: auto;
  padding: 26px 22px 18px;
}

.message {
  align-items: flex-start;
  display: flex;
  gap: 12px;
  max-width: 92%;
}

.message--user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-avatar {
  align-items: center;
  background: var(--color-accent-soft);
  border-radius: 11px;
  color: var(--color-accent);
  display: flex;
  flex: 0 0 28px;
  font-size: 12px;
  font-weight: 700;
  height: 28px;
  justify-content: center;
}

.message--user .message-avatar {
  background: var(--color-surface-raised);
  color: var(--color-text-secondary);
}

.message-body {
  min-width: 0;
}

.message-meta {
  align-items: baseline;
  color: var(--color-text-secondary);
  display: flex;
  font-size: 12px;
  gap: 8px;
  margin-bottom: 6px;
}

.message-meta time {
  color: var(--color-muted);
  font-size: 11px;
}

.message-body p {
  color: var(--color-text);
  font-size: 14px;
  line-height: 1.65;
  margin: 0;
  white-space: pre-wrap;
}

.message--user .message-body p {
  background: var(--color-accent);
  border-radius: 14px 4px 14px 14px;
  color: white;
  padding: 10px 13px;
}

.typing-indicator {
  align-items: center;
  background: var(--color-surface-raised);
  border-radius: 12px;
  display: flex;
  gap: 4px;
  margin-left: 40px;
  padding: 10px 12px;
  width: fit-content;
}

.typing-indicator span {
  animation: bounce 1s infinite ease-in-out;
  background: var(--color-muted);
  border-radius: 50%;
  height: 5px;
  width: 5px;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.12s;
}
.typing-indicator span:nth-child(3) {
  animation-delay: 0.24s;
}

@keyframes bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-3px);
  }
}
</style>
