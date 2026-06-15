import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

import {
  decryptCleanversePayload,
  encryptCleanversePayload,
} from "../server/crypto.mjs";

test("Cleanverse AES/CBC encryption round-trips JSON with a zero IV", () => {
  const key = randomBytes(32).toString("base64");
  const payload = {
    customerId: "clearmandate-demo-001",
    wallet: { chain: "monad", address: "0x1234" },
  };

  const ciphertext = encryptCleanversePayload(payload, key);
  assert.notEqual(ciphertext, JSON.stringify(payload));
  assert.deepEqual(JSON.parse(decryptCleanversePayload(ciphertext, key)), payload);
});

