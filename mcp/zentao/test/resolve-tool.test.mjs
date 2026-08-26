import assert from "node:assert/strict";
import test from "node:test";
import { resolveBug, resolveBugToolMetadata } from "../dist/tools/resolve-bug.js";

test("resolve_bug validates the documented resolution values and preserves optional fields", async () => {
  let received;
  const result = await resolveBug(
    {
      resolveBug: async (bugId, input) => {
        received = { bugId, input };
        return { status: "success" };
      },
    },
    {
      bugId: 12,
      resolution: "fixed",
      resolvedDate: "2026-08-25",
      resolvedBuild: "trunk",
      assignedTo: "alice",
      comment: "已修复",
    },
  );

  assert.deepEqual(received, {
    bugId: 12,
    input: {
      resolution: "fixed",
      resolvedDate: "2026-08-25",
      resolvedBuild: "trunk",
      assignedTo: "alice",
      comment: "已修复",
    },
  });
  assert.deepEqual(JSON.parse(result.content[0].text), { status: "success", bugId: 12 });
});

test("resolve_bug exposes write risk metadata and rejects unknown resolution values", async () => {
  assert.equal(resolveBugToolMetadata.risk, "write");
  assert.equal(resolveBugToolMetadata.approvalRequired, true);
  await assert.rejects(
    () => resolveBug({ resolveBug: async () => ({ status: "success" }) }, { bugId: 12, resolution: "unknown" }),
    /resolution/,
  );
});
