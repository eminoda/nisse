import assert from "node:assert/strict";
import test from "node:test";
import { WatchManager } from "../dist/watch/index.js";

test("manual watch stores a snapshot and emits only when the result changes", async () => {
  let value = 1;
  const events = [];
  const manager = new WatchManager({ emit: (event) => events.push(event) });
  manager.register({
    id: "demo",
    source: "demo",
    schedule: { type: "manual" },
    query: async () => ({ value }),
  });

  await manager.runNow("demo");
  await manager.runNow("demo");
  value = 2;
  await manager.runNow("demo");

  assert.deepEqual(manager.get("demo").snapshot, { value: 2 });
  assert.equal(events.length, 1);
  assert.deepEqual(events[0].diff, { previous: { value: 1 }, current: { value: 2 } });
});

test("watch manager rejects duplicate IDs and unknown watches", async () => {
  const manager = new WatchManager();
  const watch = {
    id: "demo",
    source: "demo",
    schedule: { type: "manual" },
    query: async () => ({ value: 1 }),
  };
  manager.register(watch);
  assert.throws(() => manager.register(watch), /already exists/);
  await assert.rejects(() => manager.runNow("missing"), /not found/);
});
