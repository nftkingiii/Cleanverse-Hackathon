const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;
const CUSTOMER_ID_PATTERN = /^\d{12,32}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ID_TYPES = new Map([
  ["NID", "NID"],
  ["NATIONAL_ID", "NID"],
  ["PASSPORT", "Passport"],
  ["DRIVER_LICENSE", "DRIVER_LICENSE"],
  ["HK_MACAO_TAIWAN_PASS", "HK_MACAO_TAIWAN_PASS"],
  ["OTHER", "OTHER"],
]);

function text(input, field, fallback = "") {
  return String(input[field] ?? fallback).trim();
}

function numberValue(input, field, fallback) {
  const raw = text(input, field, String(fallback));
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${field} must be a valid number.`);
  }
  return parsed;
}

function booleanValue(input, field, fallback = false) {
  const raw = text(input, field, String(fallback)).toLowerCase();
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`${field} must be true or false.`);
}

export function buildAPassPayload(input, now = Date.now()) {
  const address = text(input, "address");
  const fullName = text(input, "fullName");
  const issuingCountryISO2 = text(input, "issuingCountryISO2").toUpperCase();
  const requestedIdType = text(input, "idType", "OTHER").toUpperCase();
  const idType = ID_TYPES.get(requestedIdType);
  const idNumber = text(input, "idNumber");
  const requestedCustomerId = text(input, "customerId");
  const kycSource = text(input, "kycSource", "sumsub");
  const kycId = text(input, "kycId", idNumber);
  const subTier = numberValue(input, "subTier", 9);
  const subGroup = text(input, "subGroup", "CD").toUpperCase();
  const override = booleanValue(input, "override", false);
  const expirationTime = numberValue(
    input,
    "expirationTime",
    Math.floor(now / 1000) + 365 * 24 * 60 * 60,
  );
  const validUntil = text(
    input,
    "validUntil",
    new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const bankCountry = text(input, "bankCountry").toUpperCase();
  const bankName = text(input, "bankName");
  const bankAccount = text(input, "bankAccount");
  const bankAccountType = text(input, "bankAccountType", "A").toUpperCase();
  const bankBalance = numberValue(input, "bankBalance", 0);
  const bankCurrency = text(input, "bankCurrency", "USD").toUpperCase();

  if (!ADDRESS_PATTERN.test(address)) {
    throw new Error("A valid EVM wallet address is required.");
  }
  if (fullName.length < 2 || fullName.length > 120) {
    throw new Error("Full name must be between 2 and 120 characters.");
  }
  if (!COUNTRY_PATTERN.test(issuingCountryISO2)) {
    throw new Error("Issuing country must be a two-letter ISO code.");
  }
  if (!idType) {
    throw new Error("Unsupported identity document type.");
  }
  if (requestedCustomerId && !CUSTOMER_ID_PATTERN.test(requestedCustomerId)) {
    throw new Error("Customer ID must be 12 to 32 digits.");
  }
  if (!kycSource) {
    throw new Error("KYC source is required.");
  }
  if (!kycId) {
    throw new Error("KYC ID is required.");
  }
  if (!Number.isInteger(subTier) || subTier < 0) {
    throw new Error("Sub tier must be a non-negative integer.");
  }
  if (!subGroup) {
    throw new Error("Sub group is required.");
  }
  if (!Number.isInteger(expirationTime) || expirationTime <= 0) {
    throw new Error("Expiration time must be a positive Unix timestamp.");
  }
  if (!DATE_PATTERN.test(validUntil)) {
    throw new Error("Valid until must use YYYY-MM-DD format.");
  }
  if (!bankCountry || !COUNTRY_PATTERN.test(bankCountry)) {
    throw new Error("Bank country must be a two-letter ISO code.");
  }
  if (!bankName) {
    throw new Error("Bank name is required.");
  }
  if (!bankAccount) {
    throw new Error("Bank account is required.");
  }
  if (!bankAccountType) {
    throw new Error("Bank account type is required.");
  }

  const normalizedAddress = address.toLowerCase();
  const customerId =
    requestedCustomerId ||
    `${Math.floor(now / 1000)}${normalizedAddress.slice(-6).replace(/\D/g, "")}`
      .padEnd(16, "0")
      .slice(0, 16);

  return {
    customerId,
    kycSource,
    kycId,
    subTier,
    subGroup,
    override,
    expirationTime,
    wallet: {
      address: normalizedAddress,
      chain: "monad",
    },
    identityDataList: [
      {
        idType,
        fullName,
        issuingCountryISO2,
        validUntil,
        ...(idNumber ? { idNumber } : {}),
      },
    ],
    bankAccountList: [
      {
        bankCountry,
        bankName,
        bankAccount,
        bankAccountType,
        balance: bankBalance,
        currency: bankCurrency,
      },
    ],
  };
}
