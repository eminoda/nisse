import { serve } from "@hono/node-server";
import { createRuntimeApp } from "./app.js";
import { loadRuntimeConfig } from "./config.js";

const config = await loadRuntimeConfig();

if (config.host !== "127.0.0.1") {
  throw new Error("NISSE_RUNTIME_HOST must remain 127.0.0.1 for local runtime security");
}

const server = serve(
  {
    fetch: createRuntimeApp(config).fetch,
    hostname: config.host,
    port: config.port,
  },
  (info) => {
    console.log(`nisse Runtime listening on http://${info.address}:${info.port}`);
  },
);

function shutdown(signal: string) {
  console.log(`Received ${signal}; stopping nisse Runtime`);
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
export * from "./mcp/index.js";
export * from "./connections/index.js";
