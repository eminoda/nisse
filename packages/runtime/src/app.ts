import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { ConnectionInput } from "@nisse/shared";
import { ConnectionManager } from "./connections/manager.js";
import type { RuntimeConfig } from "./config.js";

function isAllowedOrigin(
  origin: string | undefined,
  allowedOrigins: readonly string[],
  allowChromeExtensionOrigins: boolean,
) {
  return (
    !origin ||
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

    const authorization = context.req.header("Authorization");
    if (authorization !== `Bearer ${config.token}`) {
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
      await stream.writeSSE({
        event: "runtime.ready",
        data: JSON.stringify({ status: "running", version: config.version }),
        id: "runtime-ready",
      });

      let heartbeat = 0;
      while (!stream.aborted) {
        await stream.sleep(15_000);
        await stream.writeSSE({
          event: "runtime.heartbeat",
          data: JSON.stringify({ timestamp: new Date().toISOString() }),
          id: `heartbeat-${heartbeat++}`,
        });
      }
    });
  });

  app.notFound((context) => context.json({ error: "not_found" }, 404));

  return app;
}
