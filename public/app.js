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
const faucetAmountInput = $("#faucet-amount");
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
const apassCustomerIdInput = $("#apass-customer-id");
const apassSummary = $("#apass-summary");
const apassRecordGrid = $("#apass-record-grid");
const apassRecordJson = $("#apass-record-json");
const editAPassButton = $("#edit-apass");
const refreshAPassButton = $("#refresh-apass");
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
let apassActivationCheck = 0;
let latestAPassRegistration = null;

const APASS_REGISTRATION_KEY = "clearmandate.apassRegistration";

const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
const localDate = new Date(future.getTime() - future.getTimezoneOffset() * 60_000)
  .toISOString()
  .slice(0, 16);
$("#expires-at").value = localDate;

apassCustomerIdInput.value = `${Math.floor(Date.now() / 1000)}${Math.floor(
  Math.random() * 1_000_000,
)
  .toString()
  .padStart(6, "0")}`;

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

function apassRequestBody(address, identity) {
  return {
    address,
    customerId: identity.customerId,
    kycSource: identity.kycSource,
    kycId: identity.kycId,
    subTier: identity.subTier,
    subGroup: identity.subGroup,
    override: identity.override,
    expirationTime: identity.expirationTime,
    fullName: identity.fullName,
    idType: identity.idType,
    idNumber: identity.idNumber,
    validUntil: identity.validUntil,
    issuingCountryISO2: identity.issuingCountryISO2,
    bankCountry: identity.bankCountry,
    bankName: identity.bankName,
    bankAccount: identity.bankAccount,
    bankAccountType: identity.bankAccountType,
    bankBalance: identity.bankBalance,
    bankCurrency: identity.bankCurrency,
  };
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

function persistAPassRegistration(data) {
  latestAPassRegistration = data || null;
  if (latestAPassRegistration) {
    localStorage.setItem(APASS_REGISTRATION_KEY, JSON.stringify(latestAPassRegistration));
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

function restoreAPassRegistration() {
  try {
    const stored = localStorage.getItem(APASS_REGISTRATION_KEY);
    if (stored) latestAPassRegistration = JSON.parse(stored);
  } catch {
    localStorage.removeItem(APASS_REGISTRATION_KEY);
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
  restoreAPassRegistration();
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

function formatRecordValue(value) {
  if (value === undefined || value === null || value === "") return "--";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (!String(value).replaceAll("\u0000", "").trim()) return "--";
  return String(value);
}

function showAPassForm() {
  apassSummary.classList.add("hidden");
  apassForm.classList.remove("hidden");
}

function recordSection(title, copy) {
  const section = document.createElement("div");
  section.className = "record-section";
  const heading = document.createElement("strong");
  heading.textContent = title;
  const detail = document.createElement("span");
  detail.textContent = copy;
  section.append(heading, detail);
  return section;
}

function recordField(label, value) {
  const item = document.createElement("div");
  item.className = "record-field";
  const key = document.createElement("span");
  key.textContent = label;
  const content = document.createElement("strong");
  content.textContent = formatRecordValue(value);
  item.append(key, content);
  return item;
}

function showAPassSummary(statusData, registrationData = latestAPassRegistration) {
  const registrationWallet = registrationData?.wallet || {};
  const mergedRecord = {
    registration: registrationData || null,
    verification: statusData || null,
  };
  const fields = [
    recordSection(
      "Generate A-Pass response",
      registrationData
        ? "Accepted registration values returned by Cleanverse."
        : "Register through this app to capture the full generate_apass response.",
    ),
    recordField("Customer ID", registrationData?.customerId),
    recordField("CV record ID", registrationData?.cvRecordId || statusData?.cvRecordId),
    recordField("Tier", registrationData?.tier || statusData?.tier),
    recordField("Operation", registrationWallet.operate),
    recordField("Wallet", registrationWallet.address),
    recordField("Chain", registrationWallet.chain),
    recordField("A-Pass tx", registrationWallet.txHash),
    recordSection(
      "Cleanverse deposit wallets",
      "Send testnet USDC to the USDC deposit wallet when minting/receiving aUSDC.",
    ),
    recordField("Deposit USDC wallet", registrationWallet.depositUSDCWallet),
    recordField("Deposit USDC account", registrationWallet.depositUSDCAccount),
    recordField("Deposit USDT wallet", registrationWallet.depositUSDTWallet),
    recordField("Deposit USDT account", registrationWallet.depositUSDTAccount),
    recordField("A-Pass address", registrationWallet.apassAddress),
    recordSection("Query A-Pass status", "Latest verification record returned by query_apass."),
    recordField("Status", statusData?.status === 1 ? "Active" : statusData?.message || "Verified"),
    recordField("Sub tier", statusData?.subTier),
    recordField("Sub group", statusData?.subGroup),
    recordField("Expiration", statusData?.expirationTime),
    recordField("KYC hash", statusData?.currentKycHash),
    recordField("Group", statusData?.group),
    recordField("Status code", statusData?.status ?? statusData?.code),
  ];

  apassRecordGrid.replaceChildren(...fields);
  apassRecordJson.textContent = JSON.stringify(mergedRecord, null, 2);
  apassForm.classList.add("hidden");
  apassSummary.classList.remove("hidden");
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

function formatTokenAmount(amount, symbol = "") {
  if (amount === undefined || amount === null || amount === "") return "--";
  const normalizedSymbol = String(symbol).toLowerCase();
  const decimals =
    normalizedSymbol === "usdc" || normalizedSymbol === "ausdc"
      ? 6
      : chainConfig?.contracts?.[normalizedSymbol]?.decimals;

  if (decimals === undefined) return String(amount);

  try {
    return `${formatUnits(BigInt(amount), decimals, 6)} ${symbol}`.trim();
  } catch {
    return `${amount} ${symbol}`.trim();
  }
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

function renderAPassStatus(data, address = "") {
  const verified =
    Number(data?.code) === 4 ||
    Number(data?.status) === 1 ||
    Boolean(data?.cvRecordId);
  const matchingRegistration =
    latestAPassRegistration?.wallet?.address?.toLowerCase() === address.toLowerCase()
      ? latestAPassRegistration
      : null;
  apassStatus.textContent = verified ? "Verified" : "Not registered";
  apassStatus.classList.toggle("status-live", verified);
  apassNote.textContent = verified
    ? "This wallet has an active A-Pass and is ready for live verification."
    : "No active A-Pass was found for this wallet. Complete the form to register it.";
  setStepComplete("identity", verified);
  if (verified) showAPassSummary(data, matchingRegistration);
  else showAPassForm();
  return verified;
}

function renderAPassPending() {
  apassStatus.textContent = "Activation pending";
  apassStatus.classList.add("status-live");
  apassForm.classList.add("hidden");
  apassSummary.classList.add("hidden");
  apassNote.textContent =
    "Cleanverse accepted the registration. The A-Pass is not visible on query yet, so ClearMandate will keep checking for activation.";
}

async function scheduleAPassActivationChecks(address) {
  const checkId = Date.now();
  apassActivationCheck = checkId;
  renderAPassPending();

  for (let attempt = 1; attempt <= 6; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, attempt === 1 ? 3000 : 5000));
    if (apassActivationCheck !== checkId) return;

    try {
      const result = await request("/api/cleanverse/apass/query", {
        method: "POST",
        body: JSON.stringify({ chain: "monad", address }),
      });
      if (renderAPassStatus(result.data, address)) {
        showToast("A-Pass is active on Cleanverse.");
        return;
      }
    } catch (error) {
      if (!/apass not found/i.test(error.message)) {
        apassStatus.textContent = "Check failed";
        apassNote.textContent = error.message;
        return;
      }
    }

    apassStatus.textContent = `Activation pending ${attempt}/6`;
  }

  apassStatus.textContent = "Accepted, not active yet";
  showAPassForm();
  apassNote.textContent =
    "Cleanverse accepted the registration, but query_apass still does not return an active credential for this wallet. Wait a little, then use Check status. If it remains inactive, share the wallet, customer ID, and Generate A-Pass time with Cleanverse.";
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
    const verified = renderAPassStatus(result.data, address);
    if (!quiet) {
      showToast(verified ? "A-Pass is active." : "This wallet does not have an active A-Pass.");
    }
    return verified;
  } catch (error) {
    if (/apass not found/i.test(error.message)) {
      return renderAPassStatus({ code: 2 }, address);
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
    const result = await request("/api/cleanverse/apass/generate", {
      method: "POST",
      body: JSON.stringify(apassRequestBody(address, identity)),
    });
    persistAPassRegistration(result.data);
    apassStatus.textContent = "Registered";
    apassStatus.classList.add("status-live");
    apassNote.textContent =
      "Registration was accepted. Waiting for Cleanverse to expose it through query_apass...";
    showToast("A-Pass registration accepted by Cleanverse.");
    scheduleAPassActivationChecks(address);
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

async function requestFaucetAusdc() {
  try {
    await ensureWallet();
    const amount = Number(faucetAmountInput.value);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Enter a valid faucet amount.");
    }
    if (amount > 5) {
      throw new Error("Cleanverse faucet allows a maximum of 5 aUSDC per request.");
    }

    const hasAPass = await checkAPass({ quiet: true });
    if (!hasAPass) {
      throw new Error("This wallet needs an active A-Pass before using the faucet.");
    }

    walletNote.textContent = "Submitting faucet request to Cleanverse...";
    const faucet = await request("/api/cleanverse/faucet", {
      method: "POST",
      body: JSON.stringify({
        chain: "monad",
        symbol: "ausdc",
        depositAddress: connectedWallet,
        amount,
      }),
    });

    if (latestReceipt) {
      latestReceipt.settlement.faucet = {
        amount,
        requestedAt: new Date().toISOString(),
        response: faucet.data || faucet,
      };
      persistReceipt();
    }

    walletNote.textContent =
      "Faucet request accepted. Refresh balances after Cleanverse processes it.";
    showToast(`Requested ${amount} aUSDC from the Cleanverse faucet.`);
    await refreshWalletState();
  } catch (error) {
    walletNote.textContent = error.message || "Faucet request failed.";
    showToast(error.message || "Faucet request failed.");
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
    ["Amount", formatTokenAmount(tx.amount, tx.symbol)],
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
$("#request-faucet").addEventListener("click", requestFaucetAusdc);
$("#send-payment").addEventListener("click", sendPayment);
$("#lookup-transaction").addEventListener("click", lookupTransaction);
openExplorerButton.addEventListener("click", openExplorer);
getReportButton.addEventListener("click", getReport);
checkAPassButton.addEventListener("click", () => checkAPass());
refreshAPassButton.addEventListener("click", () => checkAPass());
editAPassButton.addEventListener("click", () => {
  showAPassForm();
  apassStatus.textContent = "Editing";
  apassStatus.classList.remove("status-live");
  apassNote.textContent =
    "The verified Cleanverse record is hidden while you prepare another registration attempt.";
});
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
