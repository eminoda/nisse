<script setup lang="ts">
import { shallowRef } from "vue";
import { useDashboard } from "../composables/useDashboard";

const {
  dashboard,
  isBugLoading,
  isTaskLoading,
  bugError,
  taskError,
} = useDashboard();
const showBugList = shallowRef(false);
const showTaskList = shallowRef(false);

function toggleBugList() {
  showBugList.value = !showBugList.value;
  if (showBugList.value) showTaskList.value = false;
}

function toggleTaskList() {
  showTaskList.value = !showTaskList.value;
  if (showTaskList.value) showBugList.value = false;
}

function bugTitle(bug: Record<string, unknown>) {
  return String(bug.title ?? bug.name ?? `Bug #${bug.id ?? "未命名"}`);
}

function bugMeta(bug: Record<string, unknown>) {
  const id = bug.id ? `#${bug.id}` : "";
  const status = bug.status ? String(bug.status) : "未解决";
  return [id, status].filter(Boolean).join(" · ");
}

function taskTitle(task: Record<string, unknown>) {
  return String(task.name ?? task.title ?? `Task #${task.id ?? "未命名"}`);
}

function taskMeta(task: Record<string, unknown>) {
  const id = task.id ? `#${task.id}` : "";
  const status = task.status ? String(task.status) : "未关闭";
  return [id, status].filter(Boolean).join(" · ");
}

function openZenTao(type: "bug" | "task", id?: unknown) {
  if (!dashboard.value.webUrl) return;
  const target = id
    ? `${dashboard.value.webUrl}/index.php?m=${type}&f=view&${type}ID=${encodeURIComponent(String(id))}`
    : `${dashboard.value.webUrl}/index.php?m=my&f=${type}`;
  window.open(target, "_blank", "noopener,noreferrer");
}
</script>

<template>
  <section class="dashboard-view" aria-label="工作 Dashboard">
    <p v-if="bugError || taskError" class="dashboard-notice">{{ bugError || taskError }}</p>
    <div class="dashboard-grid">
      <article class="metric-card metric-card--accent">
        <span class="zentao-tag">禅道</span>
        <span class="metric-title">我的 Bug</span>
        <button class="metric-number" type="button" :disabled="isBugLoading" @click="toggleBugList">
          <span v-if="isBugLoading" class="metric-loading" aria-label="加载中"></span>
          <template v-else>{{ dashboard.bugs.length }}</template>
        </button>
      </article>
      <article class="metric-card">
        <span class="zentao-tag">禅道</span>
        <span class="metric-title">我的 Task</span>
        <button class="metric-number" type="button" :disabled="isTaskLoading" @click="toggleTaskList">
          <span v-if="isTaskLoading" class="metric-loading" aria-label="加载中"></span>
          <template v-else>{{ dashboard.tasks?.length ?? 0 }}</template>
        </button>
      </article>
    </div>

    <div v-if="showBugList" class="bug-list">
      <h3>我的 Bug</h3>
      <article v-for="(bug, index) in dashboard.bugs" :key="String(bug.id ?? index)" class="bug-row">
        <div class="bug-row-content">
          <strong>{{ bugTitle(bug) }}</strong>
          <small>{{ bugMeta(bug) }}</small>
        </div>
        <button v-if="bug.id" class="row-link-button" type="button" aria-label="在禅道中打开 Bug" title="在禅道中打开" @click="openZenTao('bug', bug.id)">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 3.5h-2A2.5 2.5 0 0 0 2 6v4a2.5 2.5 0 0 0 2.5 2.5h4A2.5 2.5 0 0 0 11 10V8.5M8 2h6v6M14 2 7 9" /></svg>
        </button>
      </article>
      <p v-if="!dashboard.bugs.length" class="empty-state">暂无未解决 Bug。</p>
    </div>

    <div v-if="showBugList && dashboard.bugs.length" class="bug-list-footer">
      点击「我的 Bug」数字收起列表
    </div>

    <div v-if="showTaskList" class="bug-list">
      <h3>我的 Task</h3>
      <article v-for="(task, index) in dashboard.tasks || []" :key="String(task.id ?? index)" class="bug-row">
        <div class="bug-row-content">
          <strong>{{ taskTitle(task) }}</strong>
          <small>{{ taskMeta(task) }}</small>
        </div>
        <button v-if="task.id" class="row-link-button" type="button" aria-label="在禅道中打开 Task" title="在禅道中打开" @click="openZenTao('task', task.id)">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 3.5h-2A2.5 2.5 0 0 0 2 6v4a2.5 2.5 0 0 0 2.5 2.5h4A2.5 2.5 0 0 0 11 10V8.5M8 2h6v6M14 2 7 9" /></svg>
        </button>
      </article>
      <p v-if="!dashboard.tasks?.length" class="empty-state">暂无可展示的 Task。</p>
    </div>

  </section>
</template>

<style scoped>
.dashboard-view {
  overflow-y: auto;
  padding: 32px 22px;
  position: relative;
}
.dashboard-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.metric-card {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  min-height: 104px;
  padding: 16px;
  position: relative;
  text-align: center;
}
.metric-card--accent {
  border-color: var(--color-accent);
}
.metric-title,
.metric-number {
  display: block;
}
.metric-loading {
  animation: metric-loading-spin 0.8s linear infinite;
  border: 2px solid var(--color-border-strong);
  border-radius: 50%;
  border-top-color: var(--color-accent);
  display: inline-block;
  height: 19px;
  width: 19px;
}
@keyframes metric-loading-spin {
  to { transform: rotate(360deg); }
}
.metric-title {
  color: var(--color-text-secondary);
  font-size: 12px;
  margin: 10px 0 12px;
}
.metric-number {
  background: transparent;
  border: 0;
  color: var(--color-text);
  cursor: pointer;
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  margin: 0 auto;
  padding: 0;
}
.metric-number:hover {
  color: var(--color-accent);
}
.metric-number--static {
  cursor: default;
}
.metric-number--static:hover {
  color: var(--color-text);
}
.zentao-tag {
  background: var(--color-accent-soft);
  border-radius: 4px;
  color: var(--color-accent);
  font-size: 9px;
  padding: 3px 5px;
  position: absolute;
  right: 9px;
  top: 9px;
}
.bug-list {
  margin-top: 24px;
}
.bug-list h3 {
  color: var(--color-text-secondary);
  font-size: 12px;
  margin: 0 0 9px;
}
.bug-row {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border);
  padding: 9px 2px;
}
.bug-row-content {
  min-width: 0;
}
.bug-row strong,
.bug-row small {
  display: block;
}
.row-link-button {
  align-items: center;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  color: var(--color-muted);
  cursor: pointer;
  display: flex;
  flex: 0 0 auto;
  height: 24px;
  justify-content: center;
  padding: 0;
  width: 24px;
}
.row-link-button:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.row-link-button svg {
  fill: none;
  height: 13px;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.5;
  width: 13px;
}
.bug-row strong {
  color: var(--color-text);
  font-size: 11px;
  font-weight: 500;
}
.bug-row small {
  color: var(--color-muted);
  font-size: 10px;
  margin-top: 4px;
}
.bug-list-footer {
  color: var(--color-text-secondary);
  font-size: 10px;
  margin-top: 10px;
  text-align: center;
}
.empty-state,
.dashboard-notice {
  color: var(--color-muted);
  font-size: 12px;
}
</style>
