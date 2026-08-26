import assert from "node:assert/strict";
import test from "node:test";
import {
  createToolStreamCompatibilityFetch,
  normalizeToolArgumentDelta,
} from "../dist/providers/tool-stream-compat.js";

test("drops an orphan empty-string delta after complete JSON arguments", () => {
  const deltas = ["", "{}", '""'];
  let accumulated = "";

  const normalized = deltas.map((delta) => {
    const result = normalizeToolArgumentDelta(accumulated, delta);
    accumulated += result;
    return result;
  });

  assert.deepEqual(normalized, ["", "{}", ""]);
  assert.equal(accumulated, "{}");
});

test("does not change ordinary or incomplete JSON deltas", () => {
  assert.equal(normalizeToolArgumentDelta('{"value":', '"x"}'), '"x"}');
  assert.equal(normalizeToolArgumentDelta('{"value":', '""'), '""');
  assert.equal(normalizeToolArgumentDelta("", "plain text"), "plain text");
});

test("repairs the malformed OpenAI-compatible SSE tool argument delta", async () => {
  const fetch = createToolStreamCompatibilityFetch(async () =>
    new globalThis.Response(
      [
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":""}}]}}]}',
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{}"}}]}}]}',
        String.raw`data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\"\""}}]}}]}`,
        "data: [DONE]",
        "",
      ].join("\n"),
      { headers: { "content-type": "text/event-stream" } },
    ),
  );

  const response = await fetch("https://example.test");
  const text = await response.text();

  assert.equal((text.match(/"arguments":""/g) ?? []).length, 2);
  assert.doesNotMatch(text, /"arguments":"\\"\\"/);
});
