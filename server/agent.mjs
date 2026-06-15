const VENDORS = [
  {
    id: "nova-compute",
    name: "NovaCompute",
    category: "cloud",
    description: "GPU and cloud compute credits",
    wallet: "0x2222222222222222222222222222222222222222",
  },
  {
    id: "vector-api",
    name: "VectorAPI",
    category: "data",
    description: "Hosted embedding and retrieval APIs",
    wallet: "0x3333333333333333333333333333333333333333",
  },
  {
    id: "atlas-data",
    name: "AtlasData",
    category: "data",
    description: "Verified business and market datasets",
    wallet: "0x4444444444444444444444444444444444444444",
  },
];

function findAmount(instruction) {
  const matches = [...String(instruction).matchAll(/(?:\$|usd(?:c)?\s*)?(\d+(?:\.\d+)?)/gi)];
  return matches.length ? Number(matches[0][1]) : null;
}

function findVendor(instruction) {
  const text = String(instruction).toLowerCase();
  return VENDORS.find((vendor) => text.includes(vendor.name.toLowerCase())) || null;
}

function findCategory(instruction, vendor) {
  if (vendor) return vendor.category;
  const text = String(instruction).toLowerCase();
  if (/(cloud|compute|gpu|hosting|server)/.test(text)) return "cloud";
  if (/(data|api|dataset|embedding|retrieval)/.test(text)) return "data";
  if (/(software|subscription|saas|license)/.test(text)) return "software";
  return null;
}

export function planProcurement(instruction, context = {}) {
  const vendor = findVendor(instruction);
  const amount = findAmount(instruction);
  const category = findCategory(instruction, vendor);
  const missing = [];

  if (!amount) missing.push("amount");
  if (!vendor && !context.vendor) missing.push("vendor");
  if (!category && !context.category) missing.push("category");

  const selectedVendor =
    vendor ||
    VENDORS.find(
      (candidate) =>
        candidate.name.toLowerCase() === String(context.vendor || "").toLowerCase(),
    );

  const proposal = {
    instruction,
    amount: amount || Number(context.amount) || 0,
    symbol: "aUSDC",
    originSymbol: "usdc",
    vendor: selectedVendor?.name || context.vendor || "",
    category: category || context.category || "",
    counterpartyWallet:
      selectedVendor?.wallet || context.counterpartyWallet || "",
  };

  return {
    objective: "Purchase a permitted business service with compliant aUSDC.",
    confidence: missing.length === 0 ? 0.96 : 0.58,
    missing,
    proposal,
    tools: [
      {
        name: "discover_supported_atoken",
        purpose: "Resolve the compliant settlement token for the target chain.",
      },
      {
        name: "verify_apass",
        purpose: "Verify principal and counterparty transfer eligibility.",
      },
      {
        name: "evaluate_mandate",
        purpose: "Enforce amount, vendor, category, expiry, and approval rules.",
      },
      {
        name: "prepare_wallet_transaction",
        purpose: "Prepare, but never silently sign, the compliant payment.",
      },
      {
        name: "query_transaction_evidence",
        purpose: "Reconcile the signed transaction with Cleanverse records.",
      },
    ],
  };
}

export function vendorCatalog() {
  return VENDORS;
}

