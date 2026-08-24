import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { AgentRuntime } from "@nisse/agent";

export interface RuntimeConfig {
  host: string;
  port: number;
  token: string;
  allowedOrigins: string[];
  allowChromeExtensionOrigins: boolean;
  version: string;
  agent?: AgentRuntime;
}

const defaultTokenPath = join(homedir(), ".nisse", "runtime-token");

async function loadOrCreateToken(tokenPath = defaultTokenPath): Promise<string> {
  const configuredToken = process.env.NISSE_RUNTIME_TOKEN?.trim();
  if (configuredToken) return configuredToken;

  try {
    const token = (await readFile(tokenPath, "utf8")).trim();
    if (token) return token;
  } catch {
    // The first run creates the token below.
  }

  const token = randomBytes(32).toString("hex");
  await mkdir(dirname(tokenPath), { recursive: true });
  await writeFile(tokenPath, `${token}\n`, { encoding: "utf8", mode: 0o600 });
  return token;
}

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  const configuredOrigins = process.env.NISSE_ALLOWED_EXTENSION_ORIGIN ?? "";
  const allowedOrigins = configuredOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    host: process.env.NISSE_RUNTIME_HOST?.trim() || "127.0.0.1",
    port: Number.parseInt(process.env.NISSE_RUNTIME_PORT || "4317", 10),
    token: await loadOrCreateToken(),
    allowedOrigins,
    allowChromeExtensionOrigins: process.env.NISSE_DEV_ALLOW_EXTENSION_ORIGINS === "1",
    version: process.env.NISSE_VERSION?.trim() || "0.1.0",
    agent: createAgentFromEnvironment(),
  };
}

function createAgentFromEnvironment(): AgentRuntime | undefined {
  const apiKey = process.env.NISSE_DEEPSEEK_API_KEY?.trim();
  if (!apiKey) return undefined;

  // Development-only bridge. Production resolves this SecretRef through SecretStore.
  return new AgentRuntime({
    provider: process.env.NISSE_MODEL_PROVIDER?.trim() || "deepseek",
    endpoint: process.env.NISSE_MODEL_ENDPOINT?.trim() || undefined,
    model: process.env.NISSE_MODEL?.trim() || "deepseek-chat",
    apiKey: { secretRef: "env/NISSE_DEEPSEEK_API_KEY", value: apiKey },
  });
}

export { defaultTokenPath };
