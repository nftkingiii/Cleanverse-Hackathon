import assert from "node:assert/strict";
import test from "node:test";

import { planProcurement } from "../server/agent.mjs";

test("agent extracts a structured procurement proposal", () => {
  const plan = planProcurement(
    "Purchase 20 aUSDC of cloud credits from NovaCompute.",
  );

  assert.equal(plan.proposal.amount, 20);
  assert.equal(plan.proposal.vendor, "NovaCompute");
  assert.equal(plan.proposal.category, "cloud");
  assert.equal(
    plan.proposal.counterpartyWallet,
    "0x2222222222222222222222222222222222222222",
  );
  assert.deepEqual(plan.missing, []);
  assert.equal(plan.tools.length, 5);
});

test("agent reports fields it cannot infer", () => {
  const plan = planProcurement("Buy something useful.");
  assert.ok(plan.missing.includes("amount"));
  assert.ok(plan.missing.includes("vendor"));
});
