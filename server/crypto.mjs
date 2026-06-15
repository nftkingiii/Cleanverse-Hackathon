import { createCipheriv, createDecipheriv } from "node:crypto";

const ZERO_IV = Buffer.alloc(16);

export function encryptCleanversePayload(payload, base64Key) {
  if (!base64Key) {
    throw new Error("CLEANVERSE_API_KEY is required for encrypted requests.");
  }

  const key = Buffer.from(base64Key, "base64");
  if (![16, 24, 32].includes(key.length)) {
    throw new Error("Cleanverse API key must decode to a valid AES key length.");
  }

  const cipher = createCipheriv(`aes-${key.length * 8}-cbc`, key, ZERO_IV);
  return Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]).toString("base64");
}

export function decryptCleanversePayload(ciphertext, base64Key) {
  const key = Buffer.from(base64Key, "base64");
  const decipher = createDecipheriv(
    `aes-${key.length * 8}-cbc`,
    key,
    ZERO_IV,
  );
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

