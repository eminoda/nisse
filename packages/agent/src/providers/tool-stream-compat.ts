import type { LanguageModelMiddleware } from "ai";

type OpenAIStreamPayload = {
  choices?: Array<{
    delta?: {
      tool_calls?: Array<{
        index?: number;
        function?: { arguments?: string };
      }>;
    };
  }>;
};

/**
 * Some OpenAI-compatible endpoints emit an extra escaped empty-string token
 * after a complete JSON tool argument, which makes the AI SDK parse `{}""`.
 */
export function normalizeToolArgumentDelta(
  accumulated: string,
  delta: string,
): string {
  if (delta !== '""') {
    return delta;
  }

  try {
    JSON.parse(accumulated);
    return "";
  } catch {
    return delta;
  }
}

export function createToolStreamCompatibilityMiddleware(): LanguageModelMiddleware {
  return {
    specificationVersion: "v4",
    wrapStream: async ({ doStream }) => {
      const result = await doStream();
      const accumulated = new Map<string, string>();

      const stream = result.stream.pipeThrough(
        new TransformStream({
          transform(part, controller) {
            if (part.type !== "tool-input-delta") {
              controller.enqueue(part);
              return;
            }

            const previous = accumulated.get(part.id) ?? "";
            const delta = normalizeToolArgumentDelta(previous, part.delta);
            accumulated.set(part.id, previous + delta);

            if (delta !== "") {
              controller.enqueue({ ...part, delta });
            }
          },
        }),
      );

      return { ...result, stream };
    },
  };
}

export function createToolStreamCompatibilityFetch(
  baseFetch: typeof globalThis.fetch = globalThis.fetch,
): typeof globalThis.fetch {
  return async (input, init) => {
    const response = await baseFetch(input, init);
    const contentType = response.headers.get("content-type") ?? "";

    if (!response.body || !contentType.includes("text/event-stream")) {
      return response;
    }

    const accumulated = new Map<string, string>();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let pending = "";

    const stream = response.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          pending += decoder.decode(chunk, { stream: true });
          const lines = pending.split(/\r?\n/);
          pending = lines.pop() ?? "";

          for (const line of lines) {
            controller.enqueue(encoder.encode(normalizeSseLine(line, accumulated)));
          }
        },
        flush(controller) {
          pending += decoder.decode();
          if (pending) {
            controller.enqueue(encoder.encode(normalizeSseLine(pending, accumulated)));
          }
        },
      }),
    );

    return new Response(stream, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}

function normalizeSseLine(line: string, accumulated: Map<string, string>): string {
  if (!line.startsWith("data: ")) {
    return `${line}\n`;
  }

  const raw = line.slice("data: ".length);
  if (raw === "[DONE]") {
    return `${line}\n`;
  }

  try {
    const payload = JSON.parse(raw) as OpenAIStreamPayload;
    let changed = false;

    for (const choice of payload.choices ?? []) {
      for (const toolCall of choice.delta?.tool_calls ?? []) {
        const index = String(toolCall.index ?? 0);
        const delta = toolCall.function?.arguments;
        if (delta === undefined) continue;

        const previous = accumulated.get(index) ?? "";
        const normalized = normalizeToolArgumentDelta(previous, delta);
        accumulated.set(index, previous + normalized);

        if (normalized !== delta && toolCall.function) {
          toolCall.function.arguments = normalized;
          changed = true;
        }
      }
    }

    return `${changed ? `data: ${JSON.stringify(payload)}` : line}\n`;
  } catch {
    return `${line}\n`;
  }
}
