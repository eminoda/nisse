<script setup lang="ts">
import { onMounted, shallowRef, watch } from "vue";
import type { ConnectionInput } from "@nisse/shared";
import ConnectionForm from "./ConnectionForm.vue";
import { useConnections } from "../composables/useConnections";
import { useWatches } from "../composables/useWatches";
import { runtimeClient, type ZenTaoCacheStatus } from "../runtime/client";

const { schemas, connections, selectedType, selectedSchema, isLoading, errorMessage, save, test } =
  useConnections();
const actionMessage = shallowRef<string | null>(null);
const pairingCode = shallowRef("");
const pairingLoading = shallowRef(false);
const pairingToast = shallowRef<{ message: string; kind: "success" | "error" } | null>(null);
let pairingToastTimer: number | undefined;
const cacheLoading = shallowRef<"projects" | "executions" | null>(null);
const cacheStatus = shallowRef<ZenTaoCacheStatus>({
  projects: { status: "not_fetched" },
  executions: { status: "not_fetched" },
});
const intervalChoice = shallowRef("off");
const {
  watches,
  errorMessage: watchError,
  configureInterval,
  run: runWatch,
  remove: removeWatch,
} = useWatches();

watch(watches, (current) => {
  const watch = current.find((item) => item.source === "zentao_bugs");
  intervalChoice.value = !watch
    ? "off"
    : watch.schedule.type === "interval"
      ? String(watch.schedule.intervalMs / 60000)
      : "manual";
}, { immediate: true });

async function saveConnection(input: ConnectionInput) {
  try {
    await save(input);
    actionMessage.value = "连接已保存。";
  } catch {
    actionMessage.value = "保存失败，请检查必填字段。";
  }
}

async function testConnection(id: string) {
  try {
    await test(id);
    actionMessage.value = "连接测试成功。";
  } catch {
    actionMessage.value = "连接测试失败。";
  }
}

async function pairDesktop() {
  if (!pairingCode.value.trim()) {
    pairingToast.value = { message: "请输入 Desktop 配对码。", kind: "error" };
    return;
  }
  pairingLoading.value = true;
  try {
    await runtimeClient.pairWithAuthCode(pairingCode.value);
    pairingCode.value = "";
    pairingToast.value = { message: "Desktop 配对成功，已建立连接。", kind: "success" };
  } catch {
    pairingToast.value = { message: "Desktop 配对失败，请检查配对码或 Runtime 状态。", kind: "error" };
  } finally {
    pairingLoading.value = false;
    if (pairingToastTimer !== undefined) window.clearTimeout(pairingToastTimer);
    pairingToastTimer = window.setTimeout(() => {
      pairingToast.value = null;
    }, 3200);
  }
}

async function updateZenTaoSchedule() {
  try {
    await configureInterval(intervalChoice.value === "off" || intervalChoice.value === "manual" ? null : Number(intervalChoice.value));
    actionMessage.value = intervalChoice.value === "off" ? "定时监听已关闭。" : "定时监听已生效。";
  } catch {
    actionMessage.value = "定时监听设置失败，请先配置禅道连接。";
  }
}

async function refreshZenTaoCache(kind: "projects" | "executions") {
  if (!runtimeClient.hasToken) {
    actionMessage.value = "连接 Desktop Runtime 后才能刷新禅道缓存。";
    return;
  }
  cacheLoading.value = kind;
  cacheStatus.value = { ...cacheStatus.value, [kind]: { ...cacheStatus.value[kind], status: "refreshing" } };
  try {
    if (kind === "projects") {
      const result = await runtimeClient.refreshZenTaoProjects();
      actionMessage.value = `禅道项目缓存已刷新，共 ${result.result.projects} 个项目。`;
    } else {
      const result = await runtimeClient.refreshZenTaoExecutions();
      actionMessage.value = `禅道执行缓存已刷新，共 ${result.result.executions} 个执行。`;
    }
  } catch {
    actionMessage.value = `${kind === "projects" ? "禅道项目" : "禅道执行"}缓存刷新失败。`;
  } finally {
    cacheLoading.value = null;
    await loadZenTaoCacheStatus();
  }
}

async function loadZenTaoCacheStatus() {
  if (!runtimeClient.hasToken) return;
  try {
    cacheStatus.value = (await runtimeClient.getZenTaoCacheStatus()).status;
  } catch {
    // Keep the last known cache state when Runtime is temporarily unavailable.
  }
}

function cacheStatusLabel(kind: "projects" | "executions") {
  const state = cacheStatus.value[kind];
  if (state.status === "refreshing") return "抓取中";
  if (state.status === "ready") return `已缓存${state.count === undefined ? "" : ` · ${state.count}`}`;
  if (state.status === "error") return "刷新失败，保留旧缓存";
  return "未抓取";
}

onMounted(() => { void loadZenTaoCacheStatus(); });

async function runExistingWatch(id: string) {
  try {
    await runWatch(id);
    actionMessage.value = "监听已执行。";
  } catch {
    actionMessage.value = "监听执行失败。";
  }
}

async function deleteExistingWatch(id: string) {
  try {
    await removeWatch(id);
    actionMessage.value = "监听已删除。";
  } catch {
    actionMessage.value = "监听删除失败。";
  }
}
</script>

<template>
  <section class="connections-view" aria-label="Connections">
    <div class="section-heading">
      <p class="eyebrow">SETTINGS</p>
      <h2>设置</h2>
      <p>配置定时监听和 nisse 访问工作系统所需的连接。</p>
    </div>
    <section class="watch-section" aria-label="定时设置">
      <div class="watch-heading">
        <div>
          <p class="eyebrow">SCHEDULE</p>
          <h3>定时</h3>
          <p>选择后立即生效，禅道 Bug 变化会通过桌面通知提醒。</p>
        </div>
        <span class="connection-icon" aria-hidden="true">◷</span>
      </div>
      <div class="watch-create">
        <label for="watch-interval">执行频率</label>
        <select id="watch-interval" v-model="intervalChoice" @change="updateZenTaoSchedule">
          <option value="off">关闭</option>
          <option value="10">每 10 分钟</option>
          <option value="30">每 30 分钟</option>
          <option value="60">每 60 分钟</option>
        </select>
      </div>
      <p v-if="watchError" class="notice">{{ watchError }}</p>
    </section>
    <section class="watch-section" aria-label="Desktop 配对">
      <div class="watch-heading">
        <div>
          <p class="eyebrow">PAIRING</p>
          <h3>连接 Desktop</h3>
          <p>首次连接时输入 Desktop 当前显示的配对码。</p>
        </div>
        <span class="connection-icon" aria-hidden="true">⌁</span>
      </div>
      <div class="pairing-form">
        <label for="desktop-pairing-code">配对码</label>
        <div class="pairing-controls">
          <input id="desktop-pairing-code" v-model="pairingCode" placeholder="例如 ABCD-EF12" autocomplete="off" />
          <button type="button" :disabled="pairingLoading" @click="pairDesktop">
            {{ pairingLoading ? "连接中..." : "连接 Desktop" }}
          </button>
        </div>
      </div>
    </section>
    <section class="watch-section" aria-label="禅道缓存">
      <div class="watch-heading">
        <div>
          <p class="eyebrow">CACHE</p>
          <h3>禅道缓存</h3>
          <p>首次打开桌面应用会建立缓存，也可以按需主动刷新。</p>
        </div>
        <span class="connection-icon" aria-hidden="true">◫</span>
      </div>
      <div class="cache-actions">
        <div class="cache-action-item">
          <button type="button" :disabled="cacheLoading !== null" @click="refreshZenTaoCache('projects')">
            {{ cacheLoading === "projects" ? "刷新中..." : "刷新禅道项目" }}
          </button>
          <span class="cache-status-tag" :class="`cache-status-tag--${cacheStatus.projects.status}`">{{ cacheStatusLabel("projects") }}</span>
        </div>
        <div class="cache-action-item">
          <button type="button" :disabled="cacheLoading !== null" @click="refreshZenTaoCache('executions')">
            {{ cacheLoading === "executions" ? "刷新中..." : "刷新禅道执行" }}
          </button>
          <span class="cache-status-tag" :class="`cache-status-tag--${cacheStatus.executions.status}`">{{ cacheStatusLabel("executions") }}</span>
        </div>
      </div>
    </section>
    <p v-if="isLoading" class="notice">正在加载连接配置...</p>
    <p v-if="errorMessage" class="notice">{{ errorMessage }}</p>
    <div v-if="schemas.length" class="connection-layout">
      <div class="schema-list">
        <button
          v-for="schema in schemas"
          :key="schema.type"
          class="schema-card"
          :class="{ 'schema-card--active': selectedType === schema.type }"
          type="button"
          @click="selectedType = schema.type"
        >
          <span class="connection-icon" aria-hidden="true">◈</span>
          <span class="connection-copy"
            ><strong>{{ schema.name }}</strong
            ><small>{{ schema.description }}</small></span
          >
        </button>
      </div>
      <ConnectionForm v-if="selectedSchema" :schema="selectedSchema" @save="saveConnection" />
    </div>
    <div v-if="connections.length" class="saved-list">
      <h3>Saved connections</h3>
      <article v-for="connection in connections" :key="connection.id" class="saved-card">
        <div>
          <strong>{{ connection.name }}</strong
          ><small>{{ connection.status }}</small>
        </div>
        <button type="button" @click="testConnection(connection.id)">Test Connection</button>
      </article>
    </div>
    <p v-if="actionMessage" class="notice notice--success">{{ actionMessage }}</p>
    <section v-if="watches.length" class="watch-section" aria-label="当前监听">
      <div class="watch-heading">
        <div>
          <p class="eyebrow">ACTIVE</p>
          <h3>当前监听</h3>
        </div>
      </div>
      <article v-for="watch in watches" :key="watch.id" class="watch-card">
        <div>
          <strong>{{ watch.schedule.type === "manual" ? "手动监听" : `每 ${watch.schedule.intervalMs / 60000} 分钟` }}</strong>
          <small>禅道未解决 Bug</small>
        </div>
        <div class="watch-actions">
          <button type="button" @click="runExistingWatch(watch.id)">立即执行</button>
          <button type="button" class="watch-delete" @click="deleteExistingWatch(watch.id)">删除</button>
        </div>
      </article>
    </section>
    <div
      v-if="pairingToast"
      class="pairing-toast"
      :class="`pairing-toast--${pairingToast.kind}`"
      role="status"
      aria-live="polite"
    >
      <span aria-hidden="true">{{ pairingToast.kind === "success" ? "✓" : "!" }}</span>
      {{ pairingToast.message }}
    </div>
  </section>
</template>

<style scoped>
.connections-view {
  overflow-y: auto;
  padding: 32px 22px;
}
.section-heading {
  margin-bottom: 26px;
}
.eyebrow {
  color: var(--color-accent);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  margin: 0 0 9px;
}
.section-heading h2 {
  color: var(--color-text);
  font-size: 24px;
  letter-spacing: -0.04em;
  margin: 0 0 8px;
}
.section-heading > p:last-child {
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
}
.notice {
  color: var(--color-muted);
  font-size: 12px;
  line-height: 1.5;
}
.notice--success {
  color: var(--color-accent);
}
.pairing-toast {
  align-items: center;
  border: 1px solid var(--color-border-strong);
  border-radius: 9px;
  bottom: 18px;
  display: flex;
  gap: 7px;
  left: 22px;
  padding: 9px 12px;
  position: fixed;
  right: 22px;
  z-index: 6;
}
.pairing-toast--success {
  background: var(--color-accent-soft);
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.pairing-toast--error {
  background: var(--color-surface-raised);
  color: var(--color-danger, #b54747);
}
.connection-layout {
  display: grid;
  gap: 18px;
}
.schema-list {
  display: grid;
  gap: 8px;
}
.schema-card,
.saved-card {
  align-items: center;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  color: inherit;
  display: flex;
  gap: 10px;
  padding: 12px;
  text-align: left;
}
.schema-card {
  cursor: pointer;
  width: 100%;
}
.schema-card--active {
  border-color: var(--color-accent);
}
.connection-icon {
  align-items: center;
  background: var(--color-accent-soft);
  border-radius: 8px;
  color: var(--color-accent);
  display: flex;
  flex: 0 0 30px;
  height: 30px;
  justify-content: center;
}
.connection-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.connection-copy strong,
.saved-card strong {
  color: var(--color-text);
  font-size: 12px;
}
.connection-copy small,
.saved-card small {
  color: var(--color-muted);
  font-size: 10px;
}
.saved-list {
  display: grid;
  gap: 8px;
  margin-top: 24px;
}
.saved-list h3 {
  color: var(--color-text-secondary);
  font-size: 11px;
  margin: 0;
}
.saved-card {
  justify-content: space-between;
}
.saved-card > div {
  display: grid;
  gap: 3px;
}
.saved-card button {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 7px;
  color: var(--color-accent);
  cursor: pointer;
  font: inherit;
  font-size: 10px;
  padding: 6px 8px;
}
.watch-section {
  border-top: 1px solid var(--color-border);
  display: grid;
  gap: 12px;
  margin-top: 30px;
  padding-top: 24px;
}
.watch-heading {
  align-items: flex-start;
  display: flex;
  justify-content: space-between;
}
.watch-heading h3 {
  color: var(--color-text);
  font-size: 16px;
  margin: 0 0 5px;
}
.watch-heading > div > p:last-child {
  color: var(--color-muted);
  font-size: 11px;
  margin: 0;
}
.watch-create {
  align-items: center;
  display: flex;
  gap: 8px;
}
.watch-create label {
  color: var(--color-text-secondary);
  font-size: 11px;
}
.watch-create select,
.watch-create button,
.cache-actions button,
.watch-actions button {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border-strong);
  border-radius: 7px;
  color: var(--color-text-secondary);
  cursor: pointer;
  font: inherit;
  font-size: 10px;
  padding: 7px 9px;
}
.cache-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.cache-action-item {
  align-items: center;
  display: flex;
  gap: 6px;
}
.pairing-form {
  display: grid;
  gap: 8px;
  margin-top: 16px;
}
.pairing-form label {
  color: var(--color-text-secondary);
  font-size: 11px;
}
.pairing-controls {
  display: flex;
  gap: 8px;
}
.pairing-controls input {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border-strong);
  border-radius: 7px;
  color: var(--color-text);
  flex: 1;
  font: inherit;
  font-size: 12px;
  min-width: 0;
  padding: 8px 9px;
}
.pairing-controls button {
  background: var(--color-accent);
  border: 0;
  border-radius: 7px;
  color: var(--color-surface);
  font: inherit;
  font-size: 11px;
  padding: 8px 10px;
  white-space: nowrap;
}
.cache-status-tag {
  border: 1px solid var(--color-border-strong);
  border-radius: 999px;
  color: var(--color-muted);
  font-size: 10px;
  line-height: 1;
  padding: 5px 7px;
  white-space: nowrap;
}
.cache-status-tag--ready {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.cache-status-tag--refreshing {
  color: var(--color-text-secondary);
}
.cache-status-tag--error {
  color: var(--color-danger, #b54747);
}
.cache-actions button {
  color: var(--color-accent);
}
.cache-actions button:disabled {
  cursor: wait;
  opacity: 0.55;
}
.watch-create button,
.watch-actions button {
  color: var(--color-accent);
}
.watch-card {
  align-items: center;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
}
.watch-card > div:first-child {
  display: grid;
  gap: 3px;
}
.watch-card strong {
  color: var(--color-text);
  font-size: 12px;
}
.watch-card small {
  color: var(--color-muted);
  font-size: 10px;
}
.watch-actions {
  display: flex;
  gap: 5px;
}
.watch-actions .watch-delete {
  color: var(--color-muted);
}
</style>
