<script setup lang="ts">
import { shallowRef, watch } from "vue";
import ChatView from "./components/ChatView.vue";
import DashboardView from "./components/DashboardView.vue";
import ConnectionsView from "./components/ConnectionsView.vue";
import RuntimeStatus from "./components/RuntimeStatus.vue";
import { useRuntimeStatus } from "./composables/useRuntimeStatus";
import { useTheme } from "./composables/useTheme";
import type { ExtensionView } from "./types";

const activeView = shallowRef<ExtensionView>("dashboard");
const { isConnected, lastEvent } = useRuntimeStatus();
const { theme, toggleTheme } = useTheme();
const watchToast = shallowRef<string | null>(null);

watch(lastEvent, (event) => {
  if (event?.type !== "watch.changed") return;
  try {
    const payload = JSON.parse(event.data) as {
      watch?: { source?: string; schedule?: { type?: string } };
      diff?: { current?: { bugs?: unknown[] } };
    };
    const count = payload.diff?.current?.bugs?.length ?? 0;
    watchToast.value = `${payload.watch?.source === "zentao_bugs" ? "我的 Bug" : "工作数据"} 已更新：${count} 个待处理 Bug`;
    window.setTimeout(() => { watchToast.value = null; }, 3200);
  } catch {
    // Ignore malformed runtime events.
  }
});
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
      <div class="header-actions">
        <RuntimeStatus :connected="isConnected" />
        <button
          class="settings-toggle"
          type="button"
          aria-label="打开设置"
          title="设置"
          :class="{ 'settings-toggle--active': activeView === 'connections' }"
          @click="activeView = 'connections'"
        >
          <span aria-hidden="true">⚙</span>
        </button>
        <button
          class="theme-toggle"
          type="button"
          :aria-label="theme === 'light' ? '切换到深色主题' : '切换到浅色主题'"
          :title="theme === 'light' ? '深色主题' : '浅色主题'"
          @click="toggleTheme"
        >
          <span aria-hidden="true">{{ theme === "light" ? "☾" : "☀" }}</span>
        </button>
      </div>
    </header>

    <nav class="view-tabs" aria-label="主导航">
      <button :class="{ 'tab--active': activeView === 'dashboard' }" @click="activeView = 'dashboard'">
        <span aria-hidden="true">▦</span> Dashboard
      </button>
      <button :class="{ 'tab--active': activeView === 'chat' }" @click="activeView = 'chat'">
        <span aria-hidden="true">⌁</span> Chat
      </button>
    </nav>

    <DashboardView v-if="activeView === 'dashboard'" />
    <ChatView v-else-if="activeView === 'chat'" />
    <ConnectionsView v-else />
    <div v-if="watchToast" class="global-toast" role="status">↻ {{ watchToast }}</div>
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
.header-actions {
  align-items: center;
  display: flex;
  gap: 10px;
}
.theme-toggle {
  align-items: center;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border-strong);
  border-radius: 9px;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  font-size: 16px;
  height: 30px;
  justify-content: center;
  width: 30px;
}
.theme-toggle:hover {
  color: var(--color-accent);
}
.settings-toggle {
  align-items: center;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border-strong);
  border-radius: 9px;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  font-size: 16px;
  height: 30px;
  justify-content: center;
  width: 30px;
}
.settings-toggle:hover,
.settings-toggle--active {
  color: var(--color-accent);
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
.global-toast {
  background: var(--color-text);
  border-radius: 9px;
  bottom: 18px;
  color: var(--color-surface);
  font-size: 11px;
  left: 22px;
  padding: 9px 12px;
  position: fixed;
  right: 22px;
  text-align: center;
  z-index: 5;
}
</style>
