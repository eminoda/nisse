import assert from "node:assert/strict";
import test from "node:test";
import { PairingManager } from "../dist/pairing.js";

test("pairing manager exchanges the startup auth code only once", () => {
  const pairing = new PairingManager("runtime-token", "ABCD-EF12");

  assert.equal(pairing.code, "ABCD-EF12");
  assert.deepEqual(pairing.exchange("ABCD-EF12"), { token: "runtime-token" });
  assert.equal(pairing.isSessionToken("runtime-token"), true);
  assert.throws(() => pairing.exchange("ABCD-EF12"), /invalid_or_used_pairing_code/);
});

test("pairing manager rejects an incorrect auth code", () => {
  const pairing = new PairingManager("runtime-token", "ABCD-EF12");

  assert.throws(() => pairing.exchange("WRONG-CODE"), /invalid_or_used_pairing_code/);
});
