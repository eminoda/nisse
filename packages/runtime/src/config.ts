import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { AgentRuntime } from "@nisse/agent";
import { ZenTaoService } from "@nisse/mcp-zentao";
import { EnvironmentSecretStore } from "@nisse/secret-store";
import { ApprovalStore } from "./approvals/store.js";
import { createZenTaoGateway } from "./zentao-gateway.js";
import { WatchManager } from "./watch/index.js";
import { PairingManager } from "./pairing.js";

export interface RuntimeConfig {
  host: string;
  port: number;
  token: string;
  allowedOrigins: string[];
  allowChromeExtensionOrigins: boolean;
  version: string;
  agent?: AgentRuntime;
  approvalStore?: ApprovalStore;
  watchManager?: WatchManager;
  pairingManager?: PairingManager;
  watchSources?: Record<string, () => Promise<unknown>>;
  dashboardSources?: {
    bugs?: () => Promise<unknown>;
    tasks?: () => Promise<unknown>;
  };
  dashboardCacheActions?: {
    refreshProjects?: () => Promise<unknown>;
    refreshExecutions?: () => Promise<unknown>;
    getStatus?: () => unknown;
  };
  zentaoWebUrl?: string;
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

  const approvalStore = new ApprovalStore();
  const watchManager = new WatchManager();
  const zentao = createZenTaoGatewayFromEnvironment();
  if (zentao) void zentao.warmup().catch(() => undefined);
  const token = await loadOrCreateToken();
  return {
    host: process.env.NISSE_RUNTIME_HOST?.trim() || "127.0.0.1",
    port: Number.parseInt(process.env.NISSE_RUNTIME_PORT || "4317", 10),
    token,
    pairingManager: new PairingManager(randomBytes(32).toString("hex")),
    allowedOrigins,
    allowChromeExtensionOrigins: process.env.NISSE_DEV_ALLOW_EXTENSION_ORIGINS === "1",
    version: process.env.NISSE_VERSION?.trim() || "0.1.0",
    agent: await createAgentFromEnvironment(approvalStore, zentao),
    approvalStore,
    watchManager,
    watchSources: zentao
      ? {
          zentao_bugs: async () => {
            return zentao.listMyBugs({ status: "unresolved" });
          },
        }
      : {},
    dashboardSources: zentao
      ? {
          bugs: () => zentao.listMyBugs({ status: "unresolved" }),
          tasks: () => zentao.refreshMyTasksFromCachedExecutions(),
        }
      : {},
    dashboardCacheActions: zentao
      ? {
          refreshProjects: () => zentao.refreshProjects(),
          refreshExecutions: () => zentao.refreshExecutions(),
          getStatus: () => zentao.getCacheStatus(),
        }
      : {},
    zentaoWebUrl: process.env.ZENTAO_ENDPOINT?.trim()
      ?.replace(/\/api\.php\/v2\/?$/, "")
      .replace(/\/+$/, ""),
  };
}

async function createAgentFromEnvironment(approvalStore: ApprovalStore, zentao?: ReturnType<typeof createZenTaoGatewayFromEnvironment>): Promise<AgentRuntime | undefined> {
  const secretStore = new EnvironmentSecretStore();
  const apiKey = (await secretStore.get("env/MODEL_API_KEY").catch(() => null))?.trim();
  if (!apiKey) return undefined;

  // Development-only bridge. Production resolves this SecretRef through SecretStore.
  return new AgentRuntime({
    provider: process.env.MODEL_PROVIDER?.trim() || "deepseek",
    endpoint: process.env.MODEL_ENDPOINT?.trim() || undefined,
    model: process.env.MODEL_NAME?.trim() || "deepseek-chat",
    apiKey: { secretRef: "env/MODEL_API_KEY", value: apiKey },
  }, undefined, undefined, {
    createApproval: (input) => approvalStore.create(input),
  }, zentao);
}

function createZenTaoGatewayFromEnvironment() {
  const endpoint = process.env.ZENTAO_ENDPOINT?.trim();
  const account = process.env.ZENTAO_ACCOUNT?.trim();
  const password = process.env.ZENTAO_PASSWORD;
  if (!endpoint || !account || !password) return undefined;
  return createZenTaoGateway(new ZenTaoService({ endpoint, account, password }), account);
}

export { defaultTokenPath };
