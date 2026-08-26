import { onMounted, onUnmounted, readonly, shallowRef } from "vue";
import { runtimeClient, type ZenTaoDashboard } from "../runtime/client";

export function useDashboard() {
  const dashboard = shallowRef<ZenTaoDashboard>({ bugs: [], tasks: [], projects: [] });
  const isBugLoading = shallowRef(false);
  const isTaskLoading = shallowRef(false);
  const bugError = shallowRef<string | null>(null);
  const taskError = shallowRef<string | null>(null);
  const bugLoaded = shallowRef(false);
  const taskCacheReady = shallowRef(false);

  async function refreshBugs() {
    if (isBugLoading.value) return;
    if (!runtimeClient.hasToken) {
      bugError.value = "连接 Desktop Runtime 后才能刷新 Dashboard。";
      return;
    }
    isBugLoading.value = true;
    bugError.value = null;
    try {
      const result = await runtimeClient.getZenTaoBugs();
      dashboard.value = { ...dashboard.value, ...result };
      bugLoaded.value = true;
    } catch {
      bugError.value = "Bug 查询失败，请检查连接配置。";
    } finally {
      isBugLoading.value = false;
    }
  }

  async function refreshTasks() {
    if (isTaskLoading.value) return;
    if (!runtimeClient.hasToken) {
      taskError.value = "连接 Desktop Runtime 后才能刷新 Dashboard。";
      return;
    }
    isTaskLoading.value = true;
    taskError.value = null;
    try {
      const result = await runtimeClient.getZenTaoTasks();
      dashboard.value = { ...dashboard.value, ...result };
      taskCacheReady.value = result.cacheReady !== false;
    } catch {
      taskError.value = "Task 查询失败，请检查连接配置。";
    } finally {
      isTaskLoading.value = false;
    }
  }

  async function refresh() {
    await Promise.allSettled([refreshBugs(), refreshTasks()]);
  }

  let refreshTimer: number | undefined;
  onMounted(() => {
    void refresh();
    refreshTimer = window.setInterval(() => { void refresh(); }, 10_000);
  });
  onUnmounted(() => {
    if (refreshTimer !== undefined) window.clearInterval(refreshTimer);
  });

  return {
    dashboard: readonly(dashboard),
    isBugLoading: readonly(isBugLoading),
    isTaskLoading: readonly(isTaskLoading),
    bugError: readonly(bugError),
    taskError: readonly(taskError),
    bugLoaded: readonly(bugLoaded),
    taskCacheReady: readonly(taskCacheReady),
    refreshBugs,
    refreshTasks,
    refresh,
  };
}
