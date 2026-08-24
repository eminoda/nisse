import { computed, onMounted, onUnmounted, shallowRef } from "vue";
import type { RuntimeStatusResponse } from "@nisse/shared";
import { runtimeClient, type RuntimeEvent } from "../runtime/client";

const POLL_INTERVAL_MS = 15_000;

export function useRuntimeStatus() {
  const status = shallowRef<RuntimeStatusResponse | null>(null);
  const isChecking = shallowRef(false);
  const lastError = shallowRef<string | null>(null);
  const lastEvent = shallowRef<RuntimeEvent | null>(null);
  const isConnected = computed(() => status.value?.status === "running");
  let pollTimer: number | undefined;
  let eventController: AbortController | undefined;

  async function refresh() {
    if (isChecking.value) return;
    isChecking.value = true;
    try {
      status.value = await runtimeClient.getStatus();
      lastError.value = null;

      if (!eventController) {
        eventController = new AbortController();
        void runtimeClient
          .subscribeEvents((event) => {
            lastEvent.value = event;
          }, eventController.signal)
          .catch(() => {
            eventController = undefined;
          });
      }
    } catch (error) {
      status.value = null;
      lastError.value = error instanceof Error ? error.message : "Runtime unavailable";
    } finally {
      isChecking.value = false;
    }
  }

  onMounted(() => {
    void refresh();
    pollTimer = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
  });

  onUnmounted(() => {
    if (pollTimer !== undefined) window.clearInterval(pollTimer);
    eventController?.abort();
  });

  return { status, isChecking, isConnected, lastError, lastEvent, refresh };
}
