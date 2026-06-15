import assert from "node:assert/strict";
import test from "node:test";

import { evaluateMandate } from "../server/policy.mjs";

const mandate = {
  chain: "monad",
  principalWallet: "0x1111111111111111111111111111111111111111",
  maxAmount: 100,
  approvalThreshold: 75,
  allowedCategories: ["cloud"],
  approvedVendors: ["NovaCompute"],
  expiresAt: "2027-01-01T00:00:00.000Z",
};

const proposal = {
  amount: 80,
  symbol: "aUSDC",
  category: "cloud",
  vendor: "NovaCompute",
  counterpartyWallet: "0x2222222222222222222222222222222222222222",
};

test("requires human approval above the threshold", () => {
  const result = evaluateMandate({ mandate, proposal, trust: { mode: "demo" } });
  assert.equal(result.decision, "approval_required");
  assert.equal(result.blockers.length, 0);
});

test("blocks an amount above the mandate limit", () => {
  const result = evaluateMandate({
    mandate,
    proposal: { ...proposal, amount: 125 },
    trust: { mode: "demo" },
  });
  assert.equal(result.decision, "blocked");
  assert.ok(result.blockers.includes("amount-limit"));
});

test("blocks a failed live A-Pass verification", () => {
  const result = evaluateMandate({
    mandate,
    proposal,
    trust: {
      mode: "live",
      principal: { code: 4, message: "verified" },
      counterparty: { code: 2, message: "A-Pass missing" },
    },
  });
  assert.equal(result.decision, "blocked");
  assert.ok(result.blockers.includes("counterparty-apass"));
});

