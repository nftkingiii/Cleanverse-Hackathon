const $ = (selector) => document.querySelector(selector);

const mandateForm = $("#mandate-form");
const proposalForm = $("#proposal-form");
const modeButtons = [...document.querySelectorAll(".mode-option")];
const runButton = $("#run-agent");
const emptyState = $("#empty-state");
const runResult = $("#run-result");
const decisionBanner = $("#decision-banner");
const decisionTitle = $("#decision-title");
const decisionCode = $("#decision-code");
const checkList = $("#check-list");
const settlementTitle = $("#settlement-title");
const settlementNote = $("#settlement-note");
const approveButton = $("#approve-button");
const downloadButton = $("#download-receipt");
const apiStatus = $("#api-status");
const connectWalletButton = $("#connect-wallet");
const useWalletButton = $("#use-wallet");
const principalWalletInput = $("#principal-wallet");
const toast = $("#toast");
const agentTrace = $("#agent-trace");
const agentObjective = $("#agent-objective");
const agentConfidence = $("#agent-confidence");
const agentTools = $("#agent-tools");
const walletNetwork = $("#wallet-network");
const usdcBalance = $("#usdc-balance");
const ausdcBalance = $("#ausdc-balance");
const monBalance = $("#mon-balance");
const walletNote = $("#wallet-note");
const transactionHashInput = $("#transaction-hash");
const transactionType = $("#transaction-type");
const transactionResult = $("#transaction-result");
const openExplorerButton = $("#open-explorer");
const getReportButton = $("#get-report");
const apassForm = $("#apass-form");
const apassStatus = $("#apass-status");
const apassNote = $("#apass-note");
const checkAPassButton = $("#check-apass");
const generateAPassButton = $("#generate-apass");
const workflowTabs = [...document.querySelectorAll(".workflow-tab")];
const tabPanels = [...document.querySelectorAll(".tab-panel")];
const pageTitle = $("#page-title");
const mobileStep = $("#mobile-step");
const mobileTitle = $("#mobile-title");
const mobilePrevious = $("#mobile-prev");
const mobileNext = $("#mobile-next");

const workflow = [
  { id: "identity", title: "Principal identity", shortTitle: "Identity" },
  { id: "mandate", title: "Agent mandate", shortTitle: "Mandate" },
  { id: "agent", title: "Agent action", shortTitle: "Agent action" },
  { id: "settlement", title: "Wallet settlement", shortTitle: "Settlement" },
  {
    id: "reconciliation",
    title: "Transaction reconciliation",
    shortTitle: "Reconciliation",
  },
  { id: "evidence", title: "Decision evidence", shortTitle: "Evidence" },
];

const evidence = {
  mandate: $("#evidence-mandate"),
  identity: $("#evidence-identity"),
  policy: $("#evidence-policy"),
  settlement: $("#evidence-settlement"),
};

let mode = "demo";
let connectedWallet = "";
let latestReceipt = null;
let chainConfig = null;
let toastTimer;
let activeTab = "identity";

const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
const localDate = new Date(future.getTime() - future.getTimezoneOffset() * 60_000)
  .toISOString()
  .slice(0, 16);
$("#expires-at").value = localDate;

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.remove("hidden");
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 4200);
}

function setStepComplete(id, complete = true) {
  const tab = workflowTabs.find((candidate) => candidate.dataset.tab === id);
  tab?.classList.toggle("complete", complete);
}

function navigateToTab(id, { updateHash = true } = {}) {
  const index = workflow.findIndex((step) => step.id === id);
  if (index < 0) return;
  activeTab = id;

  workflowTabs.forEach((tab) => {
    const selected = tab.dataset.tab === id;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-current", selected ? "step" : "false");
  });
  tabPanels.forEach((panel) =>
    panel.classList.toggle("active", panel.dataset.panel === id),
  );

  const step = workflow[index];
  pageTitle.textContent = step.title;
  mobileStep.textContent = `${String(index + 1).padStart(2, "0")} / 06`;
  mobileTitle.textContent = step.shortTitle;
  mobilePrevious.disabled = index === 0;
  mobileNext.disabled = index === workflow.length - 1;

  if (updateHash) history.replaceState(null, "", `#${id}`);
  document.querySelector(".app-stage")?.scrollTo({ top: 0, behavior: "smooth" });
}

function moveTab(direction) {
  const index = workflow.findIndex((step) => step.id === activeTab);
  const next = workflow[index + direction];
  if (next) navigateToTab(next.id);
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
    const detail = result.details?.code ? ` (${result.details.code})` : "";
    const error = new Error(`${result.error || "Request failed"}${detail}`);
    error.details = result.details || {};
    throw error;
  }
  return result;
}

function persistReceipt() {
  if (latestReceipt) {
    localStorage.setItem("clearmandate.latestReceipt", JSON.stringify(latestReceipt));
  }
}

function restoreReceipt() {
  try {
    const stored = localStorage.getItem("clearmandate.latestReceipt");
    if (!stored) return;
    latestReceipt = JSON.parse(stored);
    renderDecision(latestReceipt);
    setStepComplete("mandate");
    setStepComplete("agent");
    if (latestReceipt.settlement?.txHash) {
      transactionHashInput.value = latestReceipt.settlement.txHash;
      openExplorerButton.disabled = false;
      getReportButton.disabled = false;
      setStepComplete("settlement");
    }
    if (latestReceipt.cleanverseTransaction) setStepComplete("reconciliation");
  } catch {
    localStorage.removeItem("clearmandate.latestReceipt");
  }
}

async function initialize() {
  try {
    const [health, chain] = await Promise.all([
      request("/api/health"),
      request("/api/chain"),
    ]);
    chainConfig = chain;
    apiStatus.textContent = health.cleanverseConfigured
      ? `${health.environment} ready`
      : "Demo only";
    apiStatus.classList.toggle("status-live", Boolean(health.cleanverseConfigured));
  } catch {
    apiStatus.textContent = "Server offline";
  }
  restoreReceipt();
  const initialTab = location.hash.slice(1);
  navigateToTab(
    workflow.some((step) => step.id === initialTab) ? initialTab : "identity",
    { updateHash: false },
  );
}

function shortAddress(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "--";
}

function padWord(value) {
  return value.replace(/^0x/, "").padStart(64, "0");
}

function encodeBalanceOf(address) {
  return `0x70a08231${padWord(address)}`;
}

function encodeTransfer(address, amount) {
  return `0xa9059cbb${padWord(address)}${amount.toString(16).padStart(64, "0")}`;
}

function parseUnits(value, decimals = 6) {
  const [whole = "0", fraction = ""] = String(value).split(".");
  const normalized = `${whole}${fraction.padEnd(decimals, "0").slice(0, decimals)}`;
  return BigInt(normalized || "0");
}

function formatUnits(value, decimals = 6, precision = 4) {
  const raw = BigInt(value);
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const fraction = (raw % base)
    .toString()
    .padStart(decimals, "0")
    .slice(0, precision)
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

async function ensureWallet() {
  if (!window.ethereum) {
    throw new Error("No EVM wallet was detected in this browser.");
  }
  if (!connectedWallet) await connectWallet();
  if (!connectedWallet) throw new Error("Connect a wallet to continue.");
}

async function connectWallet() {
  if (!window.ethereum) {
    showToast("No browser wallet detected. Demo mode remains available.");
    return;
  }

  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    connectedWallet = accounts[0] || "";
    if (connectedWallet) {
      connectWalletButton.textContent = shortAddress(connectedWallet);
      principalWalletInput.value = connectedWallet;
      await refreshWalletState();
      await checkAPass({ quiet: true });
      showToast("Wallet connected and bound to the mandate.");
    }
  } catch (error) {
    showToast(error.message || "Wallet connection was cancelled.");
  }
}

function renderAPassStatus(data) {
  const verified = Number(data?.code) === 4;
  apassStatus.textContent = verified ? "Verified" : "Not registered";
  apassStatus.classList.toggle("status-live", verified);
  apassNote.textContent = verified
    ? "This wallet has an active A-Pass and is ready for live verification."
    : "No active A-Pass was found for this wallet. Complete the form to register it.";
  setStepComplete("identity", verified);
  return verified;
}

async function checkAPass({ quiet = false } = {}) {
  const address = connectedWallet || principalWalletInput.value.trim();
  if (!address) {
    if (!quiet) showToast("Connect or enter the principal wallet first.");
    return false;
  }

  checkAPassButton.disabled = true;
  apassStatus.textContent = "Checking";
  try {
    const result = await request("/api/cleanverse/apass/query", {
      method: "POST",
      body: JSON.stringify({ chain: "monad", address }),
    });
    const verified = renderAPassStatus(result.data);
    if (!quiet) {
      showToast(verified ? "A-Pass is active." : "This wallet does not have an active A-Pass.");
    }
    return verified;
  } catch (error) {
    if (/apass not found/i.test(error.message)) {
      return renderAPassStatus({ code: 2 });
    }
    apassStatus.textContent = "Check failed";
    if (!quiet) showToast(error.message);
    return false;
  } finally {
    checkAPassButton.disabled = false;
  }
}

async function generateAPass(event) {
  event.preventDefault();
  const address = connectedWallet || principalWalletInput.value.trim();
  const identity = formObject(apassForm);
  generateAPassButton.disabled = true;
  generateAPassButton.querySelector("span").textContent = "Registering...";
  apassStatus.textContent = "Registering";

  try {
    await request("/api/cleanverse/apass/generate", {
      method: "POST",
      body: JSON.stringify({
        address,
        fullName: identity.fullName,
        idType: identity.idType,
        issuingCountryISO2: identity.issuingCountryISO2,
        idNumber: identity.idNumber,
      }),
    });
    apassForm.elements.idNumber.value = "";
    apassStatus.textContent = "Registered";
    apassStatus.classList.add("status-live");
    apassNote.textContent =
      "Registration was accepted. Checking the wallet's current A-Pass status...";
    showToast("A-Pass registration accepted by Cleanverse.");
    await checkAPass({ quiet: true });
  } catch (error) {
    apassStatus.textContent = "Registration failed";
    const requestReference = error.details?.requestId
      ? ` Reference: ${error.details.requestId}.`
      : "";
    const message = /system error|0002/i.test(error.message)
      ? `Cleanverse returned an internal processing error.${requestReference}`
      : error.message;
    apassNote.textContent = message;
    showToast(message);
  } finally {
    generateAPassButton.disabled = false;
    generateAPassButton.querySelector("span").textContent = "Register A-Pass";
  }
}

async function switchToMonad() {
  await ensureWallet();
  if (!chainConfig) throw new Error("Monad configuration is unavailable.");

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainConfig.chainIdHex }],
    });
  } catch (error) {
    if (error.code !== 4902) throw error;
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: chainConfig.chainIdHex,
          chainName: chainConfig.chainName,
          nativeCurrency: chainConfig.nativeCurrency,
          rpcUrls: chainConfig.rpcUrls,
          blockExplorerUrls: chainConfig.blockExplorerUrls,
        },
      ],
    });
  }
  await refreshWalletState();
}

async function tokenBalance(tokenAddress, wallet) {
  const result = await window.ethereum.request({
    method: "eth_call",
    params: [{ to: tokenAddress, data: encodeBalanceOf(wallet) }, "latest"],
  });
  return BigInt(result || "0x0");
}

async function refreshWalletState() {
  if (!window.ethereum || !connectedWallet || !chainConfig?.contracts) return;

  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  walletNetwork.textContent =
    chainId.toLowerCase() === chainConfig.chainIdHex.toLowerCase()
      ? "Monad testnet"
      : `Wrong network (${chainId})`;

  if (chainId.toLowerCase() !== chainConfig.chainIdHex.toLowerCase()) return;

  const [native, usdc, ausdc] = await Promise.all([
    window.ethereum.request({
      method: "eth_getBalance",
      params: [connectedWallet, "latest"],
    }),
    tokenBalance(chainConfig.contracts.usdc.address, connectedWallet),
    tokenBalance(chainConfig.contracts.ausdc.address, connectedWallet),
  ]);

  monBalance.textContent = `${formatUnits(BigInt(native), 18, 4)} MON`;
  usdcBalance.textContent = `${formatUnits(usdc, chainConfig.contracts.usdc.decimals)} USDC`;
  ausdcBalance.textContent = `${formatUnits(ausdc, chainConfig.contracts.ausdc.decimals)} aUSDC`;
}

function renderAgentPlan(plan) {
  agentTrace.classList.remove("hidden");
  agentObjective.textContent = plan.objective;
  agentConfidence.textContent = `${Math.round(plan.confidence * 100)}% confidence`;
  agentTools.replaceChildren(
    ...plan.tools.map((tool, index) => {
      const item = document.createElement("li");
      item.className = "agent-tool";
      const number = document.createElement("span");
      number.textContent = String(index + 1).padStart(2, "0");
      const copy = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = tool.name.replaceAll("_", " ");
      const purpose = document.createElement("small");
      purpose.textContent = tool.purpose;
      copy.append(name, purpose);
      item.append(number, copy);
      return item;
    }),
  );
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
  const { evaluation, settlement, trust, agentPlan } = receipt;
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

  if (agentPlan) renderAgentPlan(agentPlan);
  emptyState.classList.add("hidden");
  runResult.classList.remove("hidden");
  decisionBanner.className = `decision-banner ${
    evaluation.decision === "approval_required" ? "" : evaluation.decision
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
  approveButton.classList.toggle("hidden", evaluation.decision !== "approval_required");

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
    settlement.txHash
      ? "Transaction submitted"
      : evaluation.decision === "blocked"
        ? "Not authorized"
        : "Prepared";
  walletNote.textContent =
    mode === "live"
      ? "Live mode may prepare a wallet transaction only after every compliance check passes."
      : "Demo mode never sends a real payment. Switch to Live sandbox for wallet execution.";
  downloadButton.disabled = false;
}

async function runAgent(event) {
  event.preventDefault();
  runButton.disabled = true;
  runButton.querySelector("span").textContent = "Agent is invoking tools...";

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
    proposalForm.elements.amount.value = latestReceipt.proposal.amount;
    proposalForm.elements.counterpartyWallet.value =
      latestReceipt.proposal.counterpartyWallet;
    mandateForm.elements.vendor.value = latestReceipt.proposal.vendor;
    mandateForm.elements.category.value = latestReceipt.proposal.category;
    renderDecision(latestReceipt);
    setStepComplete("mandate");
    setStepComplete("agent");
    persistReceipt();
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
    approvedBy: connectedWallet || latestReceipt.mandate.principalWallet,
  };
  latestReceipt.evaluation.decision = "approved";
  latestReceipt.settlement.status = "ready";
  latestReceipt.settlement.note =
    "Owner approval recorded. The compliant A-Token transfer is ready for wallet execution.";
  renderDecision(latestReceipt);
  evidence.settlement.textContent = "Approved / ready";
  persistReceipt();
  showToast("Human approval added to the audit receipt.");
  navigateToTab("settlement");
}

async function sendErc20Transfer(token, recipient, amount, type) {
  await ensureWallet();
  await switchToMonad();
  const rawAmount = parseUnits(amount, token.decimals);
  const txHash = await window.ethereum.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: connectedWallet,
        to: token.address,
        data: encodeTransfer(recipient, rawAmount),
      },
    ],
  });
  transactionHashInput.value = txHash;
  transactionType.value = type;
  openExplorerButton.disabled = false;
  getReportButton.disabled = false;
  walletNote.textContent = "Transaction submitted. Waiting for an on-chain receipt...";
  const receipt = await waitForWalletReceipt(txHash);
  walletNote.textContent =
    receipt?.status === "0x1"
      ? "Transaction confirmed on Monad. Cleanverse indexing may take a short time."
      : "Transaction submitted. Check the explorer for final confirmation.";
  await refreshWalletState();
  return { txHash, receipt };
}

async function waitForWalletReceipt(txHash) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const receipt = await window.ethereum.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    });
    if (receipt) return receipt;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return null;
}

async function depositUsdc() {
  try {
    await ensureWallet();
    if (!latestReceipt?.token) throw new Error("Run the agent before depositing.");
    const deposit = await request("/api/cleanverse/deposit-address", {
      method: "POST",
      body: JSON.stringify({ chain: "monad", address: connectedWallet }),
    });
    const depositAddress = deposit.data?.depositUSDCWallet;
    if (!depositAddress) {
      throw new Error("Cleanverse did not return a USDC deposit address.");
    }
    const { txHash, receipt } = await sendErc20Transfer(
      latestReceipt.token.origin_token,
      depositAddress,
      latestReceipt.proposal.amount,
      "deposit",
    );
    latestReceipt.settlement.depositTxHash = txHash;
    latestReceipt.settlement.depositAddress = depositAddress;
    latestReceipt.settlement.depositReceipt = receipt;
    persistReceipt();
    showToast("USDC deposit submitted. Cleanverse will issue aUSDC after indexing.");
  } catch (error) {
    showToast(error.message || "USDC deposit failed.");
  }
}

async function sendPayment() {
  try {
    if (mode !== "live") {
      throw new Error("Switch to Live sandbox before signing a real payment.");
    }
    if (!latestReceipt || latestReceipt.evaluation.decision !== "approved") {
      throw new Error("The mandate must be fully approved before payment.");
    }
    const { txHash, receipt } = await sendErc20Transfer(
      latestReceipt.token.atoken,
      latestReceipt.proposal.counterpartyWallet,
      latestReceipt.proposal.amount,
      "transfer",
    );
    latestReceipt.settlement.status = "submitted";
    latestReceipt.settlement.txHash = txHash;
    latestReceipt.settlement.walletReceipt = receipt;
    latestReceipt.settlement.submittedAt = new Date().toISOString();
    setStepComplete("settlement");
    evidence.settlement.textContent = "Transaction submitted";
    settlementTitle.textContent = "Payment submitted";
    settlementNote.textContent =
      "The wallet signed the aUSDC transfer. Query Cleanverse after the transaction is indexed.";
    persistReceipt();
    showToast("aUSDC payment submitted from the connected wallet.");
  } catch (error) {
    showToast(error.message || "Payment could not be submitted.");
  }
}

function renderTransaction(tx) {
  transactionResult.replaceChildren();
  const grid = document.createElement("div");
  grid.className = "transaction-grid";
  const fields = [
    ["Status", tx.status || "unknown"],
    ["Type", tx.type || "--"],
    ["Amount", tx.amount || "--"],
    ["Symbol", tx.symbol || "--"],
    ["From", shortAddress(tx.from_address)],
    ["To", shortAddress(tx.to_address)],
    ["Block", String(tx.block_number || "--")],
    ["Hash", shortAddress(tx.tx_hash)],
  ];
  for (const [label, value] of fields) {
    const item = document.createElement("div");
    const key = document.createElement("span");
    key.textContent = label;
    const content = document.createElement("strong");
    content.textContent = value;
    item.append(key, content);
    grid.append(item);
  }
  transactionResult.append(grid);
}

async function lookupTransaction() {
  const txHash = transactionHashInput.value.trim();
  const wallet = connectedWallet || principalWalletInput.value.trim();
  if (!txHash) return showToast("Enter a transaction hash first.");

  try {
    const result = await request("/api/cleanverse/transactions", {
      method: "POST",
      body: JSON.stringify({
        chain: "monad",
        address: wallet,
        symbol: transactionType.value === "deposit" ? "usdc" : "ausdc",
        txHash,
        type: transactionType.value,
        page: 1,
        pageSize: 10,
      }),
    });
    const tx = result.data?.txs?.[0];
    if (!tx) throw new Error("Transaction is not indexed by Cleanverse yet.");
    renderTransaction(tx);
    latestReceipt = latestReceipt || {};
    latestReceipt.cleanverseTransaction = tx;
    setStepComplete("reconciliation");
    persistReceipt();
    openExplorerButton.disabled = false;
    getReportButton.disabled = false;
  } catch (error) {
    transactionResult.innerHTML = `<p>${error.message}</p>`;
    showToast(error.message);
  }
}

async function getReport() {
  const txHash = transactionHashInput.value.trim();
  const wallet = connectedWallet || principalWalletInput.value.trim();
  if (!txHash) return showToast("Enter a transaction hash first.");
  try {
    const result = await request("/api/cleanverse/report", {
      method: "POST",
      body: JSON.stringify({
        txHash,
        wallet: { chain: "monad", address: wallet },
      }),
    });
    latestReceipt = latestReceipt || {};
    latestReceipt.report = result.data;
    persistReceipt();
    window.open(result.data.downloadUrl, "_blank", "noopener,noreferrer");
  } catch (error) {
    showToast(error.message);
  }
}

function openExplorer() {
  const txHash = transactionHashInput.value.trim();
  if (txHash && chainConfig?.blockExplorerUrls?.[0]) {
    window.open(
      `${chainConfig.blockExplorerUrls[0]}/tx/${txHash}`,
      "_blank",
      "noopener,noreferrer",
    );
  }
}

function downloadReceipt() {
  if (!latestReceipt) return;
  const blob = new Blob([JSON.stringify(latestReceipt, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `clearmandate-${latestReceipt.runId || "receipt"}.json`;
  link.click();
  URL.revokeObjectURL(url);
  setStepComplete("evidence");
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    mode = button.dataset.mode;
    modeButtons.forEach((candidate) =>
      candidate.classList.toggle("selected", candidate === button),
    );
    showToast(
      mode === "live"
        ? "Live mode will call Cleanverse and permit explicit wallet actions after approval."
        : "Demo mode uses deterministic trust checks and never sends funds.",
    );
  });
});

connectWalletButton.addEventListener("click", connectWallet);
useWalletButton.addEventListener("click", () => {
  if (connectedWallet) principalWalletInput.value = connectedWallet;
  else connectWallet();
});
proposalForm.addEventListener("submit", runAgent);
approveButton.addEventListener("click", approvePayment);
downloadButton.addEventListener("click", downloadReceipt);
$("#switch-network").addEventListener("click", () =>
  switchToMonad().catch((error) => showToast(error.message)),
);
$("#refresh-balances").addEventListener("click", () =>
  refreshWalletState().catch((error) => showToast(error.message)),
);
$("#deposit-usdc").addEventListener("click", depositUsdc);
$("#send-payment").addEventListener("click", sendPayment);
$("#lookup-transaction").addEventListener("click", lookupTransaction);
openExplorerButton.addEventListener("click", openExplorer);
getReportButton.addEventListener("click", getReport);
checkAPassButton.addEventListener("click", () => checkAPass());
apassForm.addEventListener("submit", generateAPass);
workflowTabs.forEach((tab) =>
  tab.addEventListener("click", () => navigateToTab(tab.dataset.tab)),
);
document.querySelectorAll("[data-go]").forEach((button) =>
  button.addEventListener("click", () => navigateToTab(button.dataset.go)),
);
mobilePrevious.addEventListener("click", () => moveTab(-1));
mobileNext.addEventListener("click", () => moveTab(1));
window.addEventListener("hashchange", () => {
  const requested = location.hash.slice(1);
  if (workflow.some((step) => step.id === requested)) {
    navigateToTab(requested, { updateHash: false });
  }
});

window.ethereum?.on?.("accountsChanged", ([account]) => {
  connectedWallet = account || "";
  connectWalletButton.textContent = connectedWallet
    ? shortAddress(connectedWallet)
    : "Connect wallet";
  if (connectedWallet) {
    principalWalletInput.value = connectedWallet;
    refreshWalletState().catch(() => {});
  }
});
window.ethereum?.on?.("chainChanged", () => refreshWalletState().catch(() => {}));

initialize();
