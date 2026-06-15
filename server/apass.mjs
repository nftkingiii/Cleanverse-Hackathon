const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;
const ID_TYPES = new Set([
  "NID",
  "PASSPORT",
  "DRIVER_LICENSE",
  "HK_MACAO_TAIWAN_PASS",
  "OTHER",
]);

export function buildAPassPayload(input, now = Date.now()) {
  const address = String(input.address || "").trim();
  const fullName = String(input.fullName || "").trim();
  const issuingCountryISO2 = String(input.issuingCountryISO2 || "")
    .trim()
    .toUpperCase();
  const idType = String(input.idType || "OTHER").trim().toUpperCase();
  const idNumber = String(input.idNumber || "").trim();

  if (!ADDRESS_PATTERN.test(address)) {
    throw new Error("A valid EVM wallet address is required.");
  }
  if (fullName.length < 2 || fullName.length > 120) {
    throw new Error("Full name must be between 2 and 120 characters.");
  }
  if (!COUNTRY_PATTERN.test(issuingCountryISO2)) {
    throw new Error("Issuing country must be a two-letter ISO code.");
  }
  if (!ID_TYPES.has(idType)) {
    throw new Error("Unsupported identity document type.");
  }

  const normalizedAddress = address.toLowerCase();
  const customerId = createHash("sha256")
    .update(`clearmandate:${normalizedAddress}`)
    .digest("hex")
    .slice(0, 16)
    .split("")
    .map((character) => (Number.parseInt(character, 16) % 10).toString())
    .join("");

  return {
    customerId,
    subTier: 9,
    subGroup: "CD",
    override: false,
    expirationTime: Math.floor(now / 1000) + 365 * 24 * 60 * 60,
    wallet: {
      address: normalizedAddress,
      chain: "monad",
    },
    identityDataList: [
      {
        idType,
        fullName,
        issuingCountryISO2,
        ...(idNumber ? { idNumber } : {}),
      },
    ],
    bankAccountList: [],
  };
}
import { createHash } from "node:crypto";
