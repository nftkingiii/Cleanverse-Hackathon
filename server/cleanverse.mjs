import { randomUUID } from "node:crypto";

import { config } from "./config.mjs";
import { encryptCleanversePayload } from "./crypto.mjs";

export class CleanverseError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "CleanverseError";
    this.details = details;
  }
}

async function post(endpoint, payload, { encrypted = false } = {}) {
  if (!config.cleanverse.appId) {
    throw new CleanverseError("Cleanverse App ID is not configured.");
  }

  const body = encrypted
    ? {
        data: encryptCleanversePayload(payload, config.cleanverse.apiKey),
      }
    : payload;

  const requestId = randomUUID();
  let response;
  try {
    response = await fetch(`${config.cleanverse.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-id": config.cleanverse.appId,
        "X-Request-ID": requestId,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw new CleanverseError("Could not reach the Cleanverse sandbox.", {
      cause: error.message,
    });
  }

  const raw = await response.text();
  let result;
  try {
    result = raw ? JSON.parse(raw) : {};
  } catch {
    throw new CleanverseError("Cleanverse returned a non-JSON response.", {
      status: response.status,
      raw: raw.slice(0, 500),
    });
  }

  if (!response.ok || result.code !== "0000") {
    throw new CleanverseError(
      result.message || `Cleanverse request failed with HTTP ${response.status}.`,
      {
        endpoint,
        requestId,
        status: response.status,
        code: result.code,
        data: result.data,
      },
    );
  }

  return result;
}

export const cleanverse = {
  querySupportedTokens({ chain, symbol }) {
    return post("/query_deposit_atoken_list", {
      chain,
      ...(symbol ? { symbol } : {}),
    });
  },

  queryAPass({ chain, address }) {
    return post("/query_apass", { chain, address });
  },

  queryDepositAddress({ chain, address }) {
    return post("/query_deposit_address", { chain, address });
  },

  queryInstitutionWhitelist({ chain, symbol }) {
    return post("/query_institution_white_list", {
      chain,
      ...(symbol ? { symbol } : {}),
    });
  },

  verifyAPass({ chain, atoken, address }) {
    return post("/verify_apass", { chain, atoken, address });
  },

  queryTransactions({
    chain,
    address,
    symbol,
    txHash,
    type,
    page = 1,
    pageSize = 10,
  }) {
    return post("/query_txs", {
      chain,
      address,
      ...(symbol ? { symbol } : {}),
      ...(txHash ? { txHash } : {}),
      ...(type ? { type } : {}),
      page,
      pageSize,
    });
  },

  downloadTravelRuleReport({ customerId, cvRecordId, txHash, wallet }) {
    return post("/download_travel_rule", {
      ...(customerId ? { customerId } : {}),
      ...(cvRecordId ? { cvRecordId } : {}),
      txHash,
      wallet,
    });
  },

  faucet({ chain, symbol, depositAddress, amount }) {
    return post("/faucet", { chain, symbol, depositAddress, amount });
  },

  generateAPass(payload) {
    return post("/generate_apass", payload, { encrypted: true });
  },
};
