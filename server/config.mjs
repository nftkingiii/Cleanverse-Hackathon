import fs from "node:fs";
import path from "node:path";

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      }),
  );
}

const localEnv = parseEnvFile(path.resolve(".env.local"));
const env = { ...localEnv, ...process.env };

export const config = {
  host: env.HOST || "127.0.0.1",
  port: Number(env.PORT || 4173),
  cleanverse: {
    baseUrl:
      env.CLEANVERSE_BASE_URL ||
      "https://uatapi.cleanverse.com/api/cooperate",
    appId: env.CLEANVERSE_APP_ID || "",
    apiKey: env.CLEANVERSE_API_KEY || "",
  },
};

export function publicConfig() {
  return {
    environment: config.cleanverse.baseUrl.includes("uatapi")
      ? "sandbox"
      : "production",
    cleanverseConfigured: Boolean(config.cleanverse.appId),
    encryptedWritesConfigured: Boolean(
      config.cleanverse.appId && config.cleanverse.apiKey,
    ),
  };
}
