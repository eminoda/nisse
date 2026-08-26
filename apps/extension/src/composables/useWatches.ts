import { onMounted, readonly, shallowRef } from "vue";
import type { WatchSummary } from "../runtime/client";
import { runtimeClient } from "../runtime/client";

export function useWatches() {
  const watches = shallowRef<WatchSummary[]>([]);
  const errorMessage = shallowRef<string | null>(null);

  async function load() {
    if (!runtimeClient.hasToken) return;
    try {
      watches.value = await runtimeClient.getWatches();
    } catch {
      errorMessage.value = "监听配置加载失败，请检查 Runtime。";
    }
  }

  async function create(intervalMinutes: number | null) {
    const schedule = intervalMinutes === null
      ? { type: "manual" as const }
      : { type: "interval" as const, intervalMs: intervalMinutes * 60 * 1000 };
    const watch = await runtimeClient.createWatch({ source: "zentao_bugs", schedule });
    watches.value = [...watches.value, watch];
    return watch;
  }

  async function configureInterval(intervalMinutes: number | null) {
    const existing = watches.value.filter((watch) => watch.source === "zentao_bugs");
    for (const watch of existing) await remove(watch.id);
    if (intervalMinutes === null) return null;
    return create(intervalMinutes);
  }

  async function run(id: string) {
    return runtimeClient.runWatch(id);
  }

  async function remove(id: string) {
    await runtimeClient.deleteWatch(id);
    watches.value = watches.value.filter((watch) => watch.id !== id);
  }

  onMounted(load);

  return {
    watches: readonly(watches),
    errorMessage: readonly(errorMessage),
    create,
    configureInterval,
    run,
    remove,
  };
}
