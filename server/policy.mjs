const ADDRESS_PATTERNS = {
  monad: /^0x[a-fA-F0-9]{40}$/,
  base: /^0x[a-fA-F0-9]{40}$/,
  ethereum: /^0x[a-fA-F0-9]{40}$/,
  polygon: /^0x[a-fA-F0-9]{40}$/,
  arbitrum: /^0x[a-fA-F0-9]{40}$/,
  bsc: /^0x[a-fA-F0-9]{40}$/,
};

function normalizeList(values = []) {
  return values.map((value) => String(value).trim().toLowerCase()).filter(Boolean);
}

export function validateAddress(chain, address) {
  if (!address) return false;
  const pattern = ADDRESS_PATTERNS[String(chain).toLowerCase()];
  return pattern ? pattern.test(address) : address.length >= 20;
}

export function evaluateMandate({ mandate, proposal, trust = {} }) {
  const checks = [];
  const add = (id, label, passed, detail, severity = "block") => {
    checks.push({ id, label, passed, detail, severity });
  };

  const amount = Number(proposal.amount);
  const limit = Number(mandate.maxAmount);
  const approvalThreshold = Number(mandate.approvalThreshold);
  const allowedCategories = normalizeList(mandate.allowedCategories);
  const approvedVendors = normalizeList(mandate.approvedVendors);
  const expiresAt = new Date(mandate.expiresAt).getTime();

  add(
    "principal-address",
    "Principal wallet",
    validateAddress(mandate.chain, mandate.principalWallet),
    "A valid principal wallet is bound to the mandate.",
  );
  add(
    "counterparty-address",
    "Counterparty wallet",
    validateAddress(mandate.chain, proposal.counterpartyWallet),
    "The proposed recipient has a valid wallet format.",
  );
  add(
    "mandate-active",
    "Mandate active",
    Number.isFinite(expiresAt) && expiresAt > Date.now(),
    "The delegated authority has not expired.",
  );
  add(
    "amount-limit",
    "Spend limit",
    Number.isFinite(amount) && amount > 0 && amount <= limit,
    `${proposal.amount} ${proposal.symbol} requested against a ${mandate.maxAmount} ${proposal.symbol} limit.`,
  );
  add(
    "category",
    "Approved category",
    allowedCategories.includes(String(proposal.category).toLowerCase()),
    `${proposal.category} must be included in the mandate.`,
  );
  add(
    "vendor",
    "Approved vendor",
    approvedVendors.includes(String(proposal.vendor).toLowerCase()),
    `${proposal.vendor} must be included in the mandate.`,
  );

  if (trust.mode === "live") {
    add(
      "principal-apass",
      "Principal A-Pass",
      trust.principal?.code === 4,
      trust.principal?.message || "Principal verification was not completed.",
    );
    add(
      "counterparty-apass",
      "Counterparty A-Pass",
      trust.counterparty?.code === 4,
      trust.counterparty?.message ||
        "Counterparty verification was not completed.",
    );
  } else {
    add(
      "principal-apass",
      "Principal A-Pass",
      true,
      "Demo principal is verified.",
    );
    add(
      "counterparty-apass",
      "Counterparty A-Pass",
      true,
      "Demo counterparty is eligible to receive A-Token.",
    );
  }

  const blockers = checks.filter(
    (check) => !check.passed && check.severity === "block",
  );
  const requiresApproval =
    blockers.length === 0 &&
    Number.isFinite(approvalThreshold) &&
    amount > approvalThreshold;

  return {
    decision:
      blockers.length > 0
        ? "blocked"
        : requiresApproval
          ? "approval_required"
          : "approved",
    checks,
    blockers: blockers.map((check) => check.id),
    requiresApproval,
  };
}

