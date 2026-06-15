# ClearMandate

ClearMandate is a policy and compliance control plane for AI-agent payments. It
binds an agent action to a verified principal, an explicit spending mandate, a
verified counterparty, compliant settlement rails, and an audit-ready decision
record.

## Current MVP

- Interactive agent procurement mandate
- Deterministic policy engine with blocking and approval thresholds
- Cleanverse V5 supported-token discovery
- A-Pass verification for principal and counterparty
- Transaction lookup and Travel Rule report API adapters
- AES/CBC encryption for protected Cleanverse write endpoints
- Browser-wallet connection
- Downloadable JSON audit receipt
- Demo mode for a reliable presentation path

## Run locally

Requires Node.js 20 or newer.

```powershell
npm run dev
```

Open [http://localhost:4173](http://localhost:4173).

## Configuration

Copy `.env.example` to `.env.local` and add the hackathon credentials:

```text
CLEANVERSE_BASE_URL=https://uatapi.cleanverse.com/api/cooperate
CLEANVERSE_APP_ID=...
CLEANVERSE_API_KEY=...
PORT=4173
```

The API key is decoded locally and used only for AES/CBC encryption. It is
never sent as a request header or returned to the browser.

## Demo flow

1. Define a principal, amount limit, approval threshold, category, vendor, and
   expiration.
2. Run the procurement request in deterministic Demo mode.
3. Inspect each mandate and A-Pass decision.
4. Approve the payment when the amount exceeds the delegated threshold.
5. Download the complete audit receipt.

Live Sandbox mode calls Cleanverse V5 to discover the supported A-Token and
verify both wallet addresses. Real settlement requires a funded Monad testnet
wallet and a supported aUSDC contract returned by Cleanverse.

## Security notes

- `.env.local` is ignored by Git.
- Cleanverse credentials remain server-side.
- Authorization is deterministic code, not an LLM prompt.
- No private key is stored by the application.

