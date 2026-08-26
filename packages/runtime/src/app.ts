import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { ConnectionInput } from "@nisse/shared";
import { ConnectionManager } from "./connections/manager.js";
import type { RuntimeConfig } from "./config.js";
import { ApprovalStore } from "./approvals/store.js";
import { WatchManager } from "./watch/index.js";
import { PairingManager } from "./pairing.js";

function isAllowedOrigin(
  origin: string | undefined,
  allowedOrigins: readonly string[],
  allowChromeExtensionOrigins: boolean,
) {
  const tauriOrigin =
    origin === "http://tauri.localhost" ||
    origin === "https://tauri.localhost" ||
    origin === "tauri://localhost" ||
    origin === "http://localhost:1420";
  return (
    !origin ||
    tauriOrigin ||
    allowedOrigins.includes(origin) ||
    (allowChromeExtensionOrigins && origin.startsWith("chrome-extension://"))
  );
}

function applyCorsHeaders(
  headers: Headers,
  origin: string | undefined,
  allowedOrigins: readonly string[],
  allowChromeExtensionOrigins: boolean,
) {
  if (origin && isAllowedOrigin(origin, allowedOrigins, allowChromeExtensionOrigins)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Vary", "Origin");
  }
}

export function createRuntimeApp(config: RuntimeConfig) {
  const app = new Hono();
  const connections = new ConnectionManager();
  const approvals = config.approvalStore ?? new ApprovalStore();
  const watches = config.watchManager ?? new WatchManager();
  const pairing = config.pairingManager ?? new PairingManager(config.token);

  app.use("*", async (context, next) => {
    const origin = context.req.header("Origin");
    if (!isAllowedOrigin(origin, config.allowedOrigins, config.allowChromeExtensionOrigins)) {
      return context.json({ error: "origin_not_allowed" }, 403);
    }

    if (context.req.method === "OPTIONS") {
      const response = new Response(null, { status: 204 });
      applyCorsHeaders(
        response.headers,
        origin,
        config.allowedOrigins,
        config.allowChromeExtensionOrigins,
      );
      return response;
    }

    const isPairingExchange = context.req.path === "/api/pairing/exchange" && context.req.method === "POST";
    const authorization = context.req.header("Authorization");
    const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!isPairingExchange && authorization !== `Bearer ${config.token}` && !pairing.isSessionToken(bearer)) {
      const response = context.json({ error: "unauthorized" }, 401);
      applyCorsHeaders(
        response.headers,
        origin,
        config.allowedOrigins,
        config.allowChromeExtensionOrigins,
      );
      return response;
    }

    await next();
    applyCorsHeaders(
      context.res.headers,
      origin,
      config.allowedOrigins,
      config.allowChromeExtensionOrigins,
    );
  });

  app.get("/api/runtime/status", (context) => {
    return context.json({ status: "running", version: config.version });
  });

  app.get("/api/connections/schemas", (context) =>
    context.json({ schemas: connections.listSchemas() }),
  );

  app.get("/api/connections", (context) =>
    context.json({ connections: connections.listConnections() }),
  );

  app.post("/api/connections", async (context) => {
    const body = await context.req.json<ConnectionInput>().catch(() => null);
    if (!body?.type || !body.name || !body.config || !body.secrets) {
      return context.json({ error: "connection_payload_required" }, 400);
    }
    try {
      return context.json({ connection: connections.save(body) });
    } catch (error) {
      return context.json(
        { error: error instanceof Error ? error.message : "connection_save_failed" },
        400,
      );
    }
  });

  app.post("/api/connections/:id/test", async (context) => {
    try {
      return context.json({ connection: await connections.test(context.req.param("id")) });
    } catch (error) {
      return context.json(
        { error: error instanceof Error ? error.message : "connection_test_failed" },
        400,
      );
    }
  });

  app.get("/api/pairing/code", (context) => context.json({ code: pairing.code }));

  app.post("/api/pairing/exchange", async (context) => {
    const body = await context.req.json<{ code?: string }>().catch(() => null);
    if (!body?.code) return context.json({ error: "pairing_code_required" }, 400);
    try {
      return context.json(pairing.exchange(body.code));
    } catch (error) {
      return context.json({ error: error instanceof Error ? error.message : "pairing_failed" }, 401);
    }
  });

  app.get("/api/watches", (context) => context.json({ watches: watches.list() }));

  app.get("/api/dashboard/zentao", async (context) => {
    const query = config.watchSources?.zentao_bugs;
    if (!query) return context.json({ error: "zentao_not_configured" }, 503);
    try {
      const dashboard = await query();
      return context.json({
        dashboard: {
          ...(dashboard && typeof dashboard === "object" ? dashboard : {}),
          ...(config.zentaoWebUrl ? { webUrl: config.zentaoWebUrl } : {}),
        },
      });
    } catch (error) {
      return context.json(
        { error: error instanceof Error ? error.message : "zentao_dashboard_failed" },
        502,
      );
    }
  });

  app.get("/api/dashboard/zentao/bugs", async (context) => {
    const query = config.dashboardSources?.bugs;
    if (!query) return context.json({ error: "zentao_not_configured" }, 503);
    try {
      const dashboard = await query();
      return context.json({
        ...(dashboard && typeof dashboard === "object" ? dashboard : {}),
        ...(config.zentaoWebUrl ? { webUrl: config.zentaoWebUrl } : {}),
      });
    } catch (error) {
      return context.json(
        { error: error instanceof Error ? error.message : "zentao_bugs_failed" },
        502,
      );
    }
  });

  app.get("/api/dashboard/zentao/tasks", async (context) => {
    const query = config.dashboardSources?.tasks;
    if (!query) return context.json({ error: "zentao_not_configured" }, 503);
    try {
      const dashboard = await query();
      return context.json({
        ...(dashboard && typeof dashboard === "object" ? dashboard : {}),
        ...(config.zentaoWebUrl ? { webUrl: config.zentaoWebUrl } : {}),
      });
    } catch (error) {
      return context.json(
        { error: error instanceof Error ? error.message : "zentao_tasks_failed" },
        502,
      );
    }
  });

  app.get("/api/dashboard/zentao/cache/status", (context) => {
    const getStatus = config.dashboardCacheActions?.getStatus;
    if (!getStatus) return context.json({ error: "zentao_not_configured" }, 503);
    return context.json({ status: getStatus() });
  });

  app.post("/api/dashboard/zentao/cache/projects/refresh", async (context) => {
    const refresh = config.dashboardCacheActions?.refreshProjects;
    if (!refresh) return context.json({ error: "zentao_not_configured" }, 503);
    try {
      return context.json({ result: await refresh() });
    } catch (error) {
      return context.json(
        { error: error instanceof Error ? error.message : "zentao_projects_refresh_failed" },
        502,
      );
    }
  });

  app.post("/api/dashboard/zentao/cache/executions/refresh", async (context) => {
    const refresh = config.dashboardCacheActions?.refreshExecutions;
    if (!refresh) return context.json({ error: "zentao_not_configured" }, 503);
    try {
      return context.json({ result: await refresh() });
    } catch (error) {
      return context.json(
        { error: error instanceof Error ? error.message : "zentao_executions_refresh_failed" },
        502,
      );
    }
  });

  app.post("/api/watches", async (context) => {
    const body = await context.req.json<{
      id?: string;
      source?: string;
      schedule?: { type?: string; intervalMs?: number };
      enabled?: boolean;
    }>().catch(() => null);
    const source = body?.source?.trim();
    const query = source ? config.watchSources?.[source] : undefined;
    if (!source || !query || !body?.schedule?.type) {
      return context.json({ error: "watch_source_and_schedule_required" }, 400);
    }
    const intervalMs = body.schedule.intervalMs;
    const schedule = body.schedule.type === "manual"
      ? { type: "manual" as const }
      : body.schedule.type === "interval" && typeof intervalMs === "number" && Number.isInteger(intervalMs) && intervalMs > 0
        ? { type: "interval" as const, intervalMs }
        : undefined;
    if (!schedule) return context.json({ error: "watch_schedule_invalid" }, 400);
    try {
      const watch = watches.register({
        id: body.id?.trim() || `${source}-${Date.now()}`,
        source,
        schedule,
        query,
        enabled: body.enabled,
      });
      return context.json({ watch }, 201);
    } catch (error) {
      return context.json(
        { error: error instanceof Error ? error.message : "watch_create_failed" },
        409,
      );
    }
  });

  app.post("/api/watches/:id/run", async (context) => {
    try {
      const result = await watches.runNow(context.req.param("id"));
      return context.json({ result });
    } catch (error) {
      return context.json(
        { error: error instanceof Error ? error.message : "watch_run_failed" },
        404,
      );
    }
  });

  app.delete("/api/watches/:id", (context) => {
    try {
      watches.unregister(context.req.param("id"));
      return context.body(null, 204);
    } catch (error) {
      return context.json(
        { error: error instanceof Error ? error.message : "watch_delete_failed" },
        404,
      );
    }
  });

  app.post("/api/approvals/:id/approve", async (context) => {
    try {
      return context.json({ approval: await approvals.approve(context.req.param("id")) });
    } catch (error) {
      return context.json(
        { error: error instanceof Error ? error.message : "approval_failed" },
        error instanceof Error && error.message === "Approval not found" ? 404 : 409,
      );
    }
  });

  app.post("/api/approvals/:id/reject", (context) => {
    try {
      return context.json({ approval: approvals.reject(context.req.param("id")) });
    } catch (error) {
      return context.json(
        { error: error instanceof Error ? error.message : "approval_rejection_failed" },
        error instanceof Error && error.message === "Approval not found" ? 404 : 409,
      );
    }
  });

  app.post("/api/chat", async (context) => {
    if (!config.agent) {
      return context.json({ error: "model_not_configured" }, 503);
    }

    const body = await context.req
      .json<{ conversationId?: string; message?: string }>()
      .catch(() => null);
    const message = body?.message?.trim();
    if (!message) {
      return context.json({ error: "message_required" }, 400);
    }

    try {
      const reply = config.agent.streamReply(message, body?.conversationId);
      return streamSSE(
        context,
        async (stream) => {
          await stream.writeSSE({
            event: "message.started",
            data: JSON.stringify({ conversationId: reply.conversationId }),
          });

          for await (const chunk of reply.response.fullStream) {
            const part = chunk as {
              type: string;
              text?: string;
              toolName?: string;
              input?: unknown;
              output?: unknown;
            };

            if ((part.type === "text-delta" || part.type === "text") && part.text) {
              await stream.writeSSE({
                event: "message.delta",
                data: JSON.stringify({ conversationId: reply.conversationId, delta: part.text }),
              });
            } else if (part.type === "tool-call") {
              await stream.writeSSE({
                event: "tool.started",
                data: JSON.stringify({
                  conversationId: reply.conversationId,
                  toolName: part.toolName,
                  input: part.input,
                }),
              });
            } else if (part.type === "tool-result") {
              await stream.writeSSE({
                event: "tool.completed",
                data: JSON.stringify({
                  conversationId: reply.conversationId,
                  toolName: part.toolName,
                  output: part.output,
                }),
              });
            } else if (part.type === "tool-error") {
              await stream.writeSSE({
                event: "tool.failed",
                data: JSON.stringify({
                  conversationId: reply.conversationId,
                  toolName: part.toolName,
                }),
              });
            }
          }

          await stream.writeSSE({
            event: "message.completed",
            data: JSON.stringify({ conversationId: reply.conversationId }),
          });
        },
        async (error, stream) => {
          console.error(
            "Agent stream failed",
            error instanceof Error ? error.message : "unknown error",
          );
          await stream.writeSSE({
            event: "message.failed",
            data: JSON.stringify({ error: "agent_stream_failed" }),
          });
        },
      );
    } catch {
      return context.json({ error: "agent_unavailable" }, 503);
    }
  });

  app.get("/api/events", (context) => {
    return streamSSE(context, async (stream) => {
      const queuedEvents: Array<{ type: string; data: unknown }> = [];
      let wake: (() => void) | undefined;
      const unsubscribeApproval = approvals.subscribe((event) => {
        queuedEvents.push({ type: event.type, data: event.approval });
        wake?.();
        wake = undefined;
      });
      const unsubscribeWatch = watches.subscribe((event) => {
        queuedEvents.push({ type: event.type, data: event });
        wake?.();
        wake = undefined;
      });
      await stream.writeSSE({
        event: "runtime.ready",
        data: JSON.stringify({ status: "running", version: config.version }),
        id: "runtime-ready",
      });

      let heartbeat = 0;
      try {
        while (!stream.aborted) {
          if (queuedEvents.length) {
            const event = queuedEvents.shift()!;
            await stream.writeSSE({ event: event.type, data: JSON.stringify(event.data) });
          } else {
            await Promise.race([
              new Promise<void>((resolve) => {
                wake = resolve;
              }),
              stream.sleep(15_000),
            ]);
            if (!queuedEvents.length && !stream.aborted) {
              await stream.writeSSE({
                event: "runtime.heartbeat",
                data: JSON.stringify({ timestamp: new Date().toISOString() }),
                id: `heartbeat-${heartbeat++}`,
              });
            }
          }
        }
      } finally {
        unsubscribeApproval();
        unsubscribeWatch();
      }
    });
  });

  app.notFound((context) => context.json({ error: "not_found" }, 404));

  return app;
}
