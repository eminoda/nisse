<script setup lang="ts">
import { shallowRef } from "vue";
import ChatView from "./components/ChatView.vue";
import ConnectionsView from "./components/ConnectionsView.vue";
import RuntimeStatus from "./components/RuntimeStatus.vue";
import { useRuntimeStatus } from "./composables/useRuntimeStatus";
import type { ExtensionView } from "./types";

const activeView = shallowRef<ExtensionView>("chat");
const { isConnected } = useRuntimeStatus();
</script>

<template>
  <main class="app-shell">
    <header class="app-header">
      <div class="brand-lockup">
        <div class="brand-mark" aria-hidden="true">n</div>
        <div>
          <h1>nisse</h1>
          <p>your work companion</p>
        </div>
      </div>
      <RuntimeStatus :connected="isConnected" />
    </header>

    <nav class="view-tabs" aria-label="主导航">
      <button :class="{ 'tab--active': activeView === 'chat' }" @click="activeView = 'chat'">
        <span aria-hidden="true">⌁</span> Chat
      </button>
      <button
        :class="{ 'tab--active': activeView === 'connections' }"
        @click="activeView = 'connections'"
      >
        <span aria-hidden="true">⊙</span> Connections
      </button>
    </nav>

    <ChatView v-if="activeView === 'chat'" />
    <ConnectionsView v-else />
  </main>
</template>

<style scoped>
.app-shell {
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-width: 320px;
}
.app-header {
  align-items: center;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  padding: 17px 22px 15px;
}
.brand-lockup {
  align-items: center;
  display: flex;
  gap: 10px;
}
.brand-mark {
  align-items: center;
  background: var(--color-accent);
  border-radius: 10px;
  color: white;
  display: flex;
  font-family: Georgia, serif;
  font-size: 20px;
  font-weight: 700;
  height: 32px;
  justify-content: center;
  width: 32px;
}
.brand-lockup h1 {
  color: var(--color-text);
  font-size: 15px;
  letter-spacing: -0.03em;
  margin: 0;
}
.brand-lockup p {
  color: var(--color-muted);
  font-size: 9px;
  letter-spacing: 0.02em;
  margin: 2px 0 0;
}
.view-tabs {
  border-bottom: 1px solid var(--color-border);
  display: flex;
  gap: 4px;
  padding: 0 14px;
}
.view-tabs button {
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  color: var(--color-muted);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  padding: 12px 9px 10px;
}
.view-tabs button:hover {
  color: var(--color-text-secondary);
}
.view-tabs button.tab--active {
  border-bottom-color: var(--color-accent);
  color: var(--color-accent);
}
.view-tabs button span {
  font-size: 15px;
  margin-right: 4px;
  vertical-align: -1px;
}
</style>
