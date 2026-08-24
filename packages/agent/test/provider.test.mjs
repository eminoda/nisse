import assert from "node:assert/strict";
import test from "node:test";
import { DeepSeekProvider, ProviderRegistry } from "../dist/index.js";

const config = {
  provider: "deepseek",
  model: "deepseek-chat",
  apiKey: { secretRef: "llm/deepseek/default/apiKey" },
};

test("registry exposes DeepSeek without provider-specific agent logic", () => {
  const registry = new ProviderRegistry().register(new DeepSeekProvider());

  assert.equal(
    registry
      .list()
      .map((provider) => provider.id)
      .join(","),
    "deepseek",
  );
  assert.throws(() => registry.get("missing"), /Unknown model provider/);
});

test("DeepSeek refuses unresolved secrets", () => {
  const provider = new DeepSeekProvider();
  assert.throws(() => provider.createModel(config), /has not been resolved/);
});
