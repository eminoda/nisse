import assert from "node:assert/strict";
import test from "node:test";
import { InMemorySecretStore, assertSecretKey } from "../dist/index.js";

test("secret store supports set, get, and delete", async () => {
  const store = new InMemorySecretStore();
  await store.set("llm/deepseek/default/apiKey", "secret-value");

  assert.equal(await store.get("llm/deepseek/default/apiKey"), "secret-value");
  await store.delete("llm/deepseek/default/apiKey");
  assert.equal(await store.get("llm/deepseek/default/apiKey"), null);
});

test("secret keys reject unsafe path characters", () => {
  assert.throws(() => assertSecretKey("../credentials"), /Invalid secret key/);
});
