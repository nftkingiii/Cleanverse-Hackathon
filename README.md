# ClearMandate

ClearMandate is a policy and compliance control plane for AI-agent payments. It
binds an agent action to a verified principal, an explicit spending mandate, a
verified counterparty, compliant settlement rails, and an audit-ready decision
record.

## Current MVP

- Interactive agent procurement mandate
- Natural-language procurement planner with an explicit five-tool execution trace
- Deterministic policy engine with blocking and approval thresholds
- Cleanverse V5 supported-token discovery
- Direct A-Pass registration and status checks
- A-Pass verification for principal and counterparty
- Transaction lookup and Travel Rule report API adapters
- AES/CBC encryption for protected Cleanverse write endpoints
- Browser-wallet connection and Monad network switching
- Live USDC and aUSDC balance reads
- Wallet-signed USDC deposit to the Cleanverse deposit address
- Wallet-signed aUSDC vendor transfer
- On-chain receipt polling and Cleanverse reconciliation UI
- Local persistence of the latest audit receipt
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
HOST=127.0.0.1
PORT=4173
```

The API key is decoded locally and used only for AES/CBC encryption. It is
never sent as a request header or returned to the browser.

## Demo flow

1. Register or check the principal wallet's A-Pass.
2. Define a principal, amount limit, approval threshold, category, vendor, and
   expiration.
3. Give the agent a natural-language procurement instruction.
4. Inspect the agent's tool plan and each mandate/A-Pass decision.
5. Approve the payment when the amount exceeds the delegated threshold.
6. In Live mode, switch the wallet to Monad and inspect token balances.
7. Deposit USDC to the wallet-specific Cleanverse deposit address to receive
   aUSDC, or sign an approved aUSDC payment.
8. Reconcile the transaction hash and download the complete audit receipt.

Live Sandbox mode calls Cleanverse V5 to discover the supported A-Token and
verify both wallet addresses. Real settlement requires a funded Monad testnet
wallet, MON for gas, and valid A-Passes for the sending and receiving wallets.
Every transfer remains user-authorized in the wallet; the agent prepares the
transaction but cannot silently sign it.

The current demo principal wallet is:

```text
0xc6cfa54eda215a62fd5495a9b6555bd85b6b7ddb
```

## Security notes

- `.env.local` is ignored by Git.
- Cleanverse credentials remain server-side.
- The development server binds to localhost by default.
- Authorization is deterministic code, not an LLM prompt.
- No private key is stored by the application.
- Demo mode cannot send funds.
- Live wallet actions remain blocked until the policy decision is approved.
