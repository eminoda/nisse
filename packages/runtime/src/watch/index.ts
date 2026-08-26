export type WatchSchedule =
  | { type: "manual" }
  | { type: "interval"; intervalMs: number };

export type WatchDefinition = {
  id: string;
  source: string;
  schedule: WatchSchedule;
  query: () => Promise<unknown>;
  enabled?: boolean;
  snapshot?: unknown;
};

export type WatchChangeEvent = {
  type: "watch.changed";
  watch: { id: string; source: string };
  diff: { previous: unknown; current: unknown };
};

export type WatchManagerOptions = {
  emit?: (event: WatchChangeEvent) => void;
};

type StoredWatch = WatchDefinition & { timer?: ReturnType<typeof setInterval> };

export class WatchManager {
  private readonly watches = new Map<string, StoredWatch>();
  private readonly listeners = new Set<(event: WatchChangeEvent) => void>();
  private readonly emitEvent: (event: WatchChangeEvent) => void;

  constructor(options: WatchManagerOptions = {}) {
    this.emitEvent = options.emit ?? (() => undefined);
  }

  register(watch: WatchDefinition) {
    if (this.watches.has(watch.id)) throw new Error(`Watch ${watch.id} already exists`);
    if (watch.schedule.type === "interval" && watch.schedule.intervalMs < 1) {
      throw new Error("Watch intervalMs must be positive");
    }

    const stored: StoredWatch = { ...watch };
    this.watches.set(watch.id, stored);
    if (watch.enabled !== false && watch.schedule.type === "interval") {
      stored.timer = setInterval(() => {
        void this.runNow(watch.id);
      }, watch.schedule.intervalMs);
    }
    return this.get(watch.id);
  }

  unregister(id: string) {
    const watch = this.require(id);
    if (watch.timer) clearInterval(watch.timer);
    this.watches.delete(id);
  }

  get(id: string) {
    const watch = this.require(id);
    return { id: watch.id, source: watch.source, schedule: watch.schedule, snapshot: watch.snapshot };
  }

  list() {
    return [...this.watches.keys()].map((id) => this.get(id));
  }

  subscribe(listener: (event: WatchChangeEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async runNow(id: string) {
    const watch = this.require(id);
    const current = await watch.query();
    const previous = watch.snapshot;
    watch.snapshot = current;

    if (previous !== undefined && !isEqual(previous, current)) {
      this.emitEvent({
        type: "watch.changed",
        watch: { id: watch.id, source: watch.source },
        diff: { previous, current },
      });
      for (const listener of this.listeners) {
        listener({
          type: "watch.changed",
          watch: { id: watch.id, source: watch.source },
          diff: { previous, current },
        });
      }
    }
    return current;
  }

  stopAll() {
    for (const watch of this.watches.values()) {
      if (watch.timer) clearInterval(watch.timer);
      watch.timer = undefined;
    }
  }

  private require(id: string) {
    const watch = this.watches.get(id);
    if (!watch) throw new Error(`Watch ${id} not found`);
    return watch;
  }
}

function isEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}
