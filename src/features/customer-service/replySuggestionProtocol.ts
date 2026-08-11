import type { TextStreamPart, ToolSet } from "ai";

export type ReplySuggestionStreamEvent =
  | {
      createdAt: string;
      modelId: string;
      providerId: string;
      requestId: string;
      ticketId: string;
      type: "start";
    }
  | {
      text: string;
      type: "delta";
    }
  | {
      finishReason?: string;
      type: "finish";
      usage?: unknown;
    }
  | {
      message: string;
      type: "error";
    }
  | {
      message: string;
      type: "aborted";
    };

export const replySuggestionStreamHeaders = {
  "Cache-Control": "no-store, no-transform",
  "Content-Type": "application/x-ndjson; charset=utf-8",
};

const encoder = new TextEncoder();

function encodeReplySuggestionEvent(event: ReplySuggestionStreamEvent) {
  return encoder.encode(`${JSON.stringify(event)}\n`);
}

function isReplySuggestionStreamEvent(
  value: unknown,
): value is ReplySuggestionStreamEvent {
  if (!value || typeof value !== "object" || !("type" in value)) {
    return false;
  }

  const type = (value as { type: unknown }).type;

  return (
    type === "start" ||
    type === "delta" ||
    type === "finish" ||
    type === "error" ||
    type === "aborted"
  );
}

export function createReplySuggestionStreamResponse(input: {
  createdAt: string;
  modelId: string;
  providerId: string;
  requestId: string;
  stream: AsyncIterable<TextStreamPart<ToolSet>>;
  ticketId: string;
}) {
  const iterator = input.stream[Symbol.asyncIterator]();
  let hasStarted = false;
  let shouldClose = false;

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (shouldClose) {
        controller.close();
        return;
      }

      if (!hasStarted) {
        hasStarted = true;
        controller.enqueue(
          encodeReplySuggestionEvent({
            createdAt: input.createdAt,
            modelId: input.modelId,
            providerId: input.providerId,
            requestId: input.requestId,
            ticketId: input.ticketId,
            type: "start",
          }),
        );
        return;
      }

      while (true) {
        const { done, value } = await iterator.next();

        if (done) {
          controller.close();
          return;
        }
        console.log("value", JSON.stringify(value, null, 2) );
        if (value.type === "text-delta" && value.text) {
          controller.enqueue(
            encodeReplySuggestionEvent({
              text: value.text,
              type: "delta",
            }),
          );
          return;
        }

        if (value.type === "finish") {
          shouldClose = true;
          controller.enqueue(
            encodeReplySuggestionEvent({
              finishReason: value.finishReason,
              type: "finish",
              usage: value.totalUsage,
            }),
          );
          return;
        }

        if (value.type === "abort") {
          shouldClose = true;
          controller.enqueue(
            encodeReplySuggestionEvent({
              message: "已停止生成",
              type: "aborted",
            }),
          );
          return;
        }

        if (value.type === "error") {
          shouldClose = true;
          controller.enqueue(
            encodeReplySuggestionEvent({
              message: "模型服务暂时不可用，请稍后重试",
              type: "error",
            }),
          );
          return;
        }
      }
    },
    async cancel() {
      await iterator.return?.();
    },
  });

  return new Response(stream, {
    headers: replySuggestionStreamHeaders,
  });
}

export async function readReplySuggestionEventStream(
  source: ReadableStream<Uint8Array>,
  onEvent: (event: ReplySuggestionStreamEvent) => void,
  signal?: AbortSignal,
) {
  const reader = source.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const cancelReader = () => {
    void reader.cancel();
  };

  signal?.addEventListener("abort", cancelReader, { once: true });

  function flushCompleteLines() {
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      const parsedValue = JSON.parse(line) as unknown;

      if (isReplySuggestionStreamEvent(parsedValue)) {
        onEvent(parsedValue);
      }
    }
  }

  try {
    while (true) {
      if (signal?.aborted) {
        throw new DOMException("请求已取消", "AbortError");
      }

      const { done, value } = await reader.read();

      if (signal?.aborted) {
        throw new DOMException("请求已取消", "AbortError");
      }

      if (done) {
        buffer += decoder.decode();
        flushCompleteLines();
        return;
      }

      buffer += decoder.decode(value, { stream: true });
      flushCompleteLines();
    }
  } finally {
    signal?.removeEventListener("abort", cancelReader);
    reader.releaseLock();
  }
}
