import assert from "node:assert/strict";
import test from "node:test";

import { buildAPassPayload } from "../server/apass.mjs";

test("builds the generate A-Pass request payload", () => {
  const payload = buildAPassPayload(
    {
      address: "0xc6cfa54eda215a62fd5495a9b6555bd85b6b7ddb",
      fullName: "Demo Builder",
      idType: "passport",
      issuingCountryISO2: "ng",
    },
    1_700_000_000_000,
  );

  assert.equal(payload.wallet.chain, "monad");
  assert.equal(payload.identityDataList[0].idType, "PASSPORT");
  assert.equal(payload.identityDataList[0].issuingCountryISO2, "NG");
  assert.equal(payload.identityDataList[0].idNumber, undefined);
  assert.equal(payload.identityDataList[0].validUntil, "2024-11-13");
  assert.equal(payload.subTier, 9);
  assert.equal(payload.subGroup, "CD");
  assert.match(payload.customerId, /^\d{16}$/);
  assert.equal(payload.bankAccountList, undefined);
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
