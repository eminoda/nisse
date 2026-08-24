<script setup lang="ts">
import { shallowRef } from "vue";

const emit = defineEmits<{
  send: [content: string];
}>();

const content = shallowRef("");

function submit() {
  if (!content.value.trim()) return;
  emit("send", content.value);
  content.value = "";
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    submit();
  }
}
</script>

<template>
  <form class="composer" @submit.prevent="submit">
    <textarea
      v-model="content"
      aria-label="输入消息"
      placeholder="问问 nisse..."
      rows="1"
      @keydown="handleKeydown"
    ></textarea>
    <button class="send-button" type="submit" :disabled="!content.trim()" aria-label="发送消息">
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="m4 10 12-6-3.5 12-3.1-4.2L4 10Z" />
        <path d="M9.4 11.8 16 4" />
      </svg>
    </button>
  </form>
  <p class="composer-hint">Enter 发送 · Shift + Enter 换行</p>
</template>

<style scoped>
.composer {
  align-items: flex-end;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border-strong);
  border-radius: 15px;
  display: flex;
  gap: 10px;
  padding: 10px 10px 10px 14px;
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease;
}

.composer:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}

.composer textarea {
  background: transparent;
  border: 0;
  color: var(--color-text);
  font: inherit;
  line-height: 1.5;
  max-height: 120px;
  outline: 0;
  padding: 3px 0;
  resize: none;
  width: 100%;
}

.composer textarea::placeholder {
  color: var(--color-muted);
}

.send-button {
  align-items: center;
  background: var(--color-accent);
  border: 0;
  border-radius: 10px;
  color: white;
  cursor: pointer;
  display: flex;
  flex: 0 0 34px;
  height: 34px;
  justify-content: center;
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}

.send-button:hover:not(:disabled) {
  transform: translateY(-1px);
}
.send-button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}
.send-button svg {
  fill: none;
  height: 17px;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
  width: 17px;
}

.composer-hint {
  color: var(--color-muted);
  font-size: 10px;
  margin: 8px 2px 0;
  text-align: right;
}
</style>
