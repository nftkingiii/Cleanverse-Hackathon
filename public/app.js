const mandateForm = document.querySelector("#mandate-form");
const proposalForm = document.querySelector("#proposal-form");
const modeButtons = [...document.querySelectorAll(".mode-option")];
const runButton = document.querySelector("#run-agent");
const emptyState = document.querySelector("#empty-state");
const runResult = document.querySelector("#run-result");
const decisionBanner = document.querySelector("#decision-banner");
const decisionTitle = document.querySelector("#decision-title");
const decisionCode = document.querySelector("#decision-code");
const checkList = document.querySelector("#check-list");
const settlementTitle = document.querySelector("#settlement-title");
const settlementNote = document.querySelector("#settlement-note");
const approveButton = document.querySelector("#approve-button");
const downloadButton = document.querySelector("#download-receipt");
const apiStatus = document.querySelector("#api-status");
const connectWalletButton = document.querySelector("#connect-wallet");
const useWalletButton = document.querySelector("#use-wallet");
const principalWalletInput = document.querySelector("#principal-wallet");
const toast = document.querySelector("#toast");

const evidence = {
  mandate: document.querySelector("#evidence-mandate"),
  identity: document.querySelector("#evidence-identity"),
  policy: document.querySelector("#evidence-policy"),
  settlement: document.querySelector("#evidence-settlement"),
};

let mode = "demo";
let connectedWallet = "";
let latestReceipt = null;
let toastTimer;

const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
const localDate = new Date(future.getTime() - future.getTimezoneOffset() * 60_000)
  .toISOString()
  .slice(0, 16);
document.querySelector("#expires-at").value = localDate;

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.remove("hidden");
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 3600);
}

function formObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const result = await response.json();
  if (!response.ok) {
    const detail = result.details?.code
      ? ` (${result.details.code})`
      : "";
    throw new Error(`${result.error || "Request failed"}${detail}`);
  }
  return result;
}

async function checkHealth() {
  try {
    const health = await request("/api/health");
    apiStatus.textContent = health.cleanverseConfigured
      ? `${health.environment} ready`
      : "Demo only";
    apiStatus.classList.toggle(
      "status-live",
      Boolean(health.cleanverseConfigured),
    );
  } catch {
    apiStatus.textContent = "Server offline";
  }
}

async function connectWallet() {
  if (!window.ethereum) {
    showToast("No browser wallet detected. Demo wallets remain available.");
    return;
  }

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    connectedWallet = accounts[0] || "";
    if (connectedWallet) {
      connectWalletButton.textContent = `${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}`;
      principalWalletInput.value = connectedWallet;
      showToast("Wallet connected and bound to the mandate.");
    }
  } catch (error) {
    showToast(error.message || "Wallet connection was cancelled.");
  }
}

function renderChecks(checks) {
  checkList.replaceChildren(
    ...checks.map((check) => {
      const item = document.createElement("li");
      item.className = `check-item ${check.passed ? "" : "failed"}`;

      const icon = document.createElement("span");
      icon.className = "check-icon";
      icon.textContent = check.passed ? "OK" : "!";

      const copy = document.createElement("div");
      copy.className = "check-copy";
      const title = document.createElement("strong");
      title.textContent = check.label;
      const detail = document.createElement("span");
      detail.textContent = check.detail;
      copy.append(title, detail);

      const state = document.createElement("span");
      state.className = "check-state";
      state.textContent = check.passed ? "Passed" : "Blocked";

      item.append(icon, copy, state);
      return item;
    }),
  );
}

function renderDecision(receipt) {
  const { evaluation, settlement, trust } = receipt;
  const titles = {
    approved: "Payment authorized",
    approval_required: "Human approval required",
    blocked: "Payment blocked",
  };
  const codes = {
    approved: "POLICY / PASS",
    approval_required: "HUMAN / 01",
    blocked: "POLICY / BLOCK",
  };

  emptyState.classList.add("hidden");
  runResult.classList.remove("hidden");
  decisionBanner.className = `decision-banner ${
    evaluation.decision === "approval_required"
      ? ""
      : evaluation.decision
  }`;
  decisionTitle.textContent = titles[evaluation.decision];
  decisionCode.textContent = codes[evaluation.decision];
  renderChecks(evaluation.checks);

  settlementTitle.textContent =
    settlement.status === "ready"
      ? "Ready for wallet execution"
      : settlement.status === "waiting_for_human"
        ? "Waiting for owner approval"
        : "Settlement not authorized";
  settlementNote.textContent = settlement.note;

  approveButton.classList.toggle(
    "hidden",
    evaluation.decision !== "approval_required",
  );

  evidence.mandate.textContent = "Signed and active";
  evidence.identity.textContent =
    trust.principal?.code === 4 && trust.counterparty?.code === 4
      ? "Both wallets verified"
      : "Verification failed";
  evidence.policy.textContent =
    evaluation.decision === "blocked"
      ? `${evaluation.blockers.length} blocker(s)`
      : evaluation.decision === "approval_required"
        ? "Passed / approval"
        : "Passed";
  evidence.settlement.textContent =
    evaluation.decision === "blocked" ? "Not authorized" : "Prepared";
  downloadButton.disabled = false;
}

async function runAgent(event) {
  event.preventDefault();
  runButton.disabled = true;
  runButton.querySelector("span").textContent = "Evaluating mandate...";

  const mandateValues = formObject(mandateForm);
  const proposalValues = formObject(proposalForm);

  const payload = {
    mode,
    mandate: {
      chain: "monad",
      principalWallet: mandateValues.principalWallet,
      maxAmount: Number(mandateValues.maxAmount),
      approvalThreshold: Number(mandateValues.approvalThreshold),
      allowedCategories: [mandateValues.category],
      approvedVendors: [mandateValues.vendor],
      expiresAt: new Date(mandateValues.expiresAt).toISOString(),
    },
    proposal: {
      instruction: proposalValues.instruction,
      amount: Number(proposalValues.amount),
      symbol: "aUSDC",
      originSymbol: "usdc",
      category: mandateValues.category,
      vendor: mandateValues.vendor,
      counterpartyWallet: proposalValues.counterpartyWallet,
    },
  };

  try {
    latestReceipt = await request("/api/mandates/run", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    renderDecision(latestReceipt);
  } catch (error) {
    showToast(error.message);
  } finally {
    runButton.disabled = false;
    runButton.querySelector("span").textContent = "Run verified purchase";
  }
}

function approvePayment() {
  if (!latestReceipt) return;
  latestReceipt.humanApproval = {
    status: "approved",
    approvedAt: new Date().toISOString(),
    approvedBy:
      connectedWallet ||
      latestReceipt.mandate.principalWallet,
  };
  latestReceipt.evaluation.decision = "approved";
  latestReceipt.settlement.status = "ready";
  latestReceipt.settlement.note =
    "Owner approval recorded. The compliant A-Token transfer is ready for wallet execution.";
  renderDecision(latestReceipt);
  evidence.settlement.textContent = "Approved / ready";
  showToast("Human approval added to the audit receipt.");
}

function downloadReceipt() {
  if (!latestReceipt) return;

  const blob = new Blob([JSON.stringify(latestReceipt, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `clearmandate-${latestReceipt.runId}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    mode = button.dataset.mode;
    modeButtons.forEach((candidate) =>
      candidate.classList.toggle("selected", candidate === button),
    );
    showToast(
      mode === "live"
        ? "Live mode will call the Cleanverse sandbox."
        : "Demo mode uses deterministic verification results.",
    );
  });
});

connectWalletButton.addEventListener("click", connectWallet);
useWalletButton.addEventListener("click", () => {
  if (connectedWallet) {
    principalWalletInput.value = connectedWallet;
  } else {
    connectWallet();
  }
});
proposalForm.addEventListener("submit", runAgent);
approveButton.addEventListener("click", approvePayment);
downloadButton.addEventListener("click", downloadReceipt);

checkHealth();

