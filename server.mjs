import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { cleanverse, CleanverseError } from "./server/cleanverse.mjs";
import { config, publicConfig } from "./server/config.mjs";
import { demoTokens, demoVerification } from "./server/demo.mjs";
import { evaluateMandate } from "./server/policy.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, "public");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error("Request body is too large.");
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function cleanverseErrorResponse(error) {
  if (error instanceof CleanverseError) {
    return {
      status: 502,
      body: {
        error: error.message,
        details: error.details,
      },
    };
  }
  return {
    status: 500,
    body: { error: error.message || "Unexpected server error." },
  };
}

async function runMandate(body) {
  const { mode = "demo", mandate, proposal } = body;
  let tokens = demoTokens;
  let trust = {
    mode: "demo",
    principal: demoVerification(mandate.principalWallet),
    counterparty: demoVerification(proposal.counterpartyWallet),
  };

  if (mode === "live") {
    tokens = await cleanverse.querySupportedTokens({
      chain: mandate.chain,
      symbol: proposal.originSymbol || "usdc",
    });
    const token = tokens.data?.tokens?.[0]?.atoken;
    if (!token?.address) {
      throw new CleanverseError(
        `No supported A-Token found for ${proposal.originSymbol || "usdc"} on ${mandate.chain}.`,
      );
    }

    const [principalResult, counterpartyResult] = await Promise.all([
      cleanverse.verifyAPass({
        chain: mandate.chain,
        atoken: token.address,
        address: mandate.principalWallet,
      }),
      cleanverse.verifyAPass({
        chain: mandate.chain,
        atoken: token.address,
        address: proposal.counterpartyWallet,
      }),
    ]);

    trust = {
      mode: "live",
      principal: principalResult.data,
      counterparty: counterpartyResult.data,
    };
  }

  const evaluation = evaluateMandate({ mandate, proposal, trust });
  return {
    runId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    mode,
    mandate,
    proposal,
    token: tokens.data?.tokens?.[0] || null,
    trust,
    evaluation,
    settlement: {
      status:
        evaluation.decision === "approved"
          ? "ready"
          : evaluation.decision === "approval_required"
            ? "waiting_for_human"
            : "not_authorized",
      note:
        mode === "demo"
          ? "Demo settlement is intentionally simulated. Live mode returns the verified A-Token contract for wallet execution."
          : "Use the returned A-Token contract in the connected wallet, then submit the transaction hash for Cleanverse indexing and reporting.",
    },
  };
}

async function handleApi(request, response, pathname) {
  if (request.method === "GET" && pathname === "/api/health") {
    return sendJson(response, 200, {
      ok: true,
      service: "ClearMandate",
      ...publicConfig(),
    });
  }

  if (request.method !== "POST") {
    return sendJson(response, 405, { error: "Method not allowed." });
  }

  const body = await readJson(request);

  try {
    if (pathname === "/api/mandates/run") {
      return sendJson(response, 200, await runMandate(body));
    }
    if (pathname === "/api/cleanverse/tokens") {
      return sendJson(response, 200, await cleanverse.querySupportedTokens(body));
    }
    if (pathname === "/api/cleanverse/apass/query") {
      return sendJson(response, 200, await cleanverse.queryAPass(body));
    }
    if (pathname === "/api/cleanverse/apass/verify") {
      return sendJson(response, 200, await cleanverse.verifyAPass(body));
    }
    if (pathname === "/api/cleanverse/transactions") {
      return sendJson(response, 200, await cleanverse.queryTransactions(body));
    }
    if (pathname === "/api/cleanverse/report") {
      return sendJson(
        response,
        200,
        await cleanverse.downloadTravelRuleReport(body),
      );
    }
    if (pathname === "/api/cleanverse/faucet") {
      return sendJson(response, 200, await cleanverse.faucet(body));
    }

    return sendJson(response, 404, { error: "API route not found." });
  } catch (error) {
    const { status, body: errorBody } = cleanverseErrorResponse(error);
    return sendJson(response, status, errorBody);
  }
}

function serveStatic(response, pathname) {
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.normalize(path.join(publicDir, relativePath));
  if (!filePath.startsWith(publicDir) || !fs.existsSync(filePath)) {
    return sendJson(response, 404, { error: "Not found." });
  }

  const stat = fs.statSync(filePath);
  if (!stat.isFile()) return sendJson(response, 404, { error: "Not found." });

  response.writeHead(200, {
    "Content-Type":
      MIME_TYPES[path.extname(filePath)] || "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url.pathname);
      return;
    }
    serveStatic(response, url.pathname);
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Server error." });
  }
});

server.listen(config.port, () => {
  console.log(`ClearMandate is running at http://localhost:${config.port}`);
});

