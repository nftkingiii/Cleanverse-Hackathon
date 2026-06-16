import assert from "node:assert/strict";
import test from "node:test";

import { buildAPassPayload } from "../server/apass.mjs";

test("builds the generate A-Pass request payload", () => {
  const payload = buildAPassPayload(
    {
      address: "0xc6cfa54eda215a62fd5495a9b6555bd85b6b7ddb",
      fullName: "Demo Builder",
      customerId: "1234561234567892",
      idType: "passport",
      idNumber: "A123456789",
      kycSource: "sumsub",
      kycId: "1234567890",
      expirationTime: "1863690034",
      validUntil: "2030-12-31",
      issuingCountryISO2: "ng",
      bankCountry: "US",
      bankName: "Bank of America",
      bankAccount: "6222021234567890",
      bankAccountType: "A",
      bankBalance: "0",
      bankCurrency: "USD",
    },
    1_700_000_000_000,
  );

  assert.equal(payload.wallet.chain, "monad");
  assert.equal(payload.kycSource, "sumsub");
  assert.equal(payload.kycId, "1234567890");
  assert.equal(payload.identityDataList[0].idType, "Passport");
  assert.equal(payload.identityDataList[0].issuingCountryISO2, "NG");
  assert.equal(payload.identityDataList[0].idNumber, "A123456789");
  assert.equal(payload.identityDataList[0].validUntil, "2030-12-31");
  assert.equal(payload.subTier, 9);
  assert.equal(payload.subGroup, "CD");
  assert.equal(payload.expirationTime, 1863690034);
  assert.equal(payload.customerId, "1234561234567892");
  assert.deepEqual(payload.bankAccountList, [
    {
      bankCountry: "US",
      bankName: "Bank of America",
      bankAccount: "6222021234567890",
      bankAccountType: "A",
      balance: 0,
      currency: "USD",
    },
  ]);
});

test("rejects invalid A-Pass identity input", () => {
  assert.throws(
    () =>
      buildAPassPayload({
        address: "not-a-wallet",
        fullName: "D",
        issuingCountryISO2: "Nigeria",
      }),
    /wallet address/,
  );
});
