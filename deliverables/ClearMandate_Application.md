# ClearMandate

**Track:** Trusted AI Agent Transactions  
**Tagline:** AI agents that can spend without losing human accountability.

## Project Description

ClearMandate is a compliance and authorization layer for AI agents that make business purchases and payments. It allows a person or organization to delegate a narrowly defined financial mandate to an agent, including a spending limit, permitted category, approved counterparties, expiration time, and human-approval threshold.

When the agent identifies a purchase, ClearMandate verifies the principal and counterparty, evaluates the proposed transaction against the mandate, and either blocks it, routes it for approval, or executes it through compliant payment rails. Every decision is recorded with the mandate, policy result, authorization, counterparty verification, and transaction reference, producing an audit-ready receipt.

The hackathon demo will show an agent instructed to purchase cloud credits for no more than 100 USDC from a verified vendor. The agent will select an offer, verify eligibility, trigger human approval when required, complete a sandbox A-Token payment, and generate a downloadable evidence bundle.

ClearMandate addresses a core barrier to agent commerce: agents may be capable of finding and initiating transactions, but organizations still need to know who authorized each payment, whether it complied with policy, whether the counterparty was eligible, and how the transaction can be reconstructed later.

## Cleanverse Integration Plan

ClearMandate uses Cleanverse as the trust and compliance foundation for agent-initiated transactions.

1. **Principal verification:** Before a mandate becomes active, the backend queries and verifies the principal's A-Pass status. The mandate is bound to the verified wallet and principal record.
2. **Counterparty verification:** Before payment authorization, ClearMandate verifies the recipient's A-Pass and confirms that the wallet is eligible to receive the relevant compliant asset.
3. **Policy-aware settlement:** The payment flow uses an A-Token or wrapped compliant asset whose transfer rules are evaluated against A-Pass attributes. This ensures that application-level authorization and asset-level compliance work together.
4. **Transaction confirmation:** After execution, ClearMandate queries the transaction record and stores the returned status and transaction hash in the evidence bundle.
5. **Travel Rule and audit evidence:** Where applicable, the application retrieves the Travel Rule report and combines it with the signed mandate, policy evaluation, approval event, and transaction record.
6. **Secure server integration:** Cleanverse credentials remain in the backend. Requests that require encrypted bodies are encrypted server-side using the documented AES/CBC process, and the API key is never exposed to the agent or browser.
7. **Agent interface:** The control plane is exposed as an MCP-compatible tool so an agent can request authorization, verify a counterparty, execute an approved payment, and retrieve a receipt without bypassing policy.

The 48-hour MVP will prioritize A-Pass verification, mandate evaluation, an approval path, sandbox settlement, transaction lookup, and an audit receipt. If sandbox access or issuance timing limits a full A-Token transfer, the interface will preserve the real Cleanverse verification calls and use a clearly labeled simulated settlement adapter for the final step.

## Business Plan

### Customer

The initial customer is an AI-first company, fintech platform, marketplace, or finance team that wants agents to purchase APIs, cloud resources, data, services, or operational supplies. The economic buyer is typically a CFO, Head of Finance, Compliance Lead, or Platform Lead.

### Value Proposition

ClearMandate lets organizations increase agent automation while retaining enforceable budgets, verified counterparties, approval controls, and auditability. Agent platforms gain a reusable transaction-control layer instead of rebuilding financial permissions and compliance logic for every workflow.

### Revenue Model

- **Starter:** $99 per month for mandate creation, approvals, sandbox agents, and basic receipts.
- **Growth:** $499 per month for team policies, reusable templates, roles, and audit exports.
- **Platform:** Usage-based pricing plus an annual contract for embedded APIs, higher transaction volume, compliance integrations, and service-level commitments.
- Future revenue can include per-transaction verification fees and enterprise implementation support.

Pricing is an initial hypothesis for validation rather than a claim of proven willingness to pay.

### Go-To-Market

ClearMandate will first integrate with MCP-compatible agent frameworks and automation platforms where financial actions already occur. Design partnerships with AI-first businesses will validate procurement policies and approval workflows. Cleanverse ecosystem institutions, gateways, and merchant partners can provide compliant settlement and verified supply. Successful pilots can expand from one purchasing workflow into broader agent treasury and accounts-payable controls.

### Competitive Position

Wallets and payment APIs move funds, while agent frameworks plan and invoke tools. ClearMandate sits between them as the enforceable authorization and evidence layer. Its advantage is combining signed mandates, policy evaluation, Cleanverse identity verification, compliant assets, and audit records in one transaction loop.

### Milestones

- **Hackathon:** Demonstrate mandate creation, A-Pass checks, approval routing, sandbox payment, and evidence generation.
- **First 30 days:** Add reusable policy templates, MCP SDK packaging, and three design-partner interviews.
- **First 90 days:** Pilot one live procurement workflow and introduce organization roles and reporting.
- **Six months:** Launch an embedded platform API and pursue partnerships with agent frameworks, payment providers, and compliant marketplaces.

### Risks and Mitigation

- **API or sandbox dependency:** Use modular adapters and preserve clear separation between verified API calls and simulated components.
- **Agent prompt manipulation:** Keep all authorization decisions in deterministic server-side policy code.
- **Key exposure:** Isolate signing and Cleanverse credentials from the agent runtime.
- **Enterprise adoption cycle:** Start with narrow, low-value procurement workflows and visible human approval before expanding autonomy.

## Suggested One-Line Pitch

ClearMandate is the trust layer that turns an AI agent's purchasing intent into a verified, policy-bound, and auditable payment.

## Alternative Names

- MandateFlow
- AgentAuthority
- VerifiSpend
- ProofPay Agent
