<script setup lang="ts">
import ChatComposer from "./ChatComposer.vue";
import ChatMessageList from "./ChatMessageList.vue";
import { useMockChat } from "../composables/useMockChat";

const { messages, isSending, errorMessage, toolStatus, sendMessage } = useMockChat();
</script>

<template>
  <section class="chat-view" aria-label="聊天">
    <ChatMessageList :messages="messages" :is-sending="isSending" />
    <p v-if="toolStatus" class="tool-progress">{{ toolStatus }}</p>
    <p v-if="errorMessage" class="chat-error" role="alert">{{ errorMessage }}</p>
    <div class="composer-wrap">
      <ChatComposer @send="sendMessage" />
    </div>
  </section>
</template>

<style scoped>
.chat-view {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.composer-wrap {
  background: var(--color-surface);
  padding: 12px 22px 18px;
}

.chat-error {
  background: rgba(239, 111, 111, 0.12);
  color: #f09a9a;
  font-size: 12px;
  margin: 0 22px 10px;
  padding: 8px 10px;
}
</style>
