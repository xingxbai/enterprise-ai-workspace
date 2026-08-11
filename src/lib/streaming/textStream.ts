export async function readUtf8TextStream(
  source: ReadableStream<Uint8Array>,
  onTextChunk: (chunk: string) => void,
  signal?: AbortSignal,
) {
  const reader = source.getReader();
  const decoder = new TextDecoder();

  const cancelReader = () => {
    void reader.cancel();
  };

  signal?.addEventListener("abort", cancelReader, { once: true });

  try {
    while (true) {
      if (signal?.aborted) {
        throw new DOMException("请求已取消", "AbortError");
      }

      const { done, value } = await reader.read();
      console.log("readUtf8TextStream", { done, value });
      if (signal?.aborted) {
        throw new DOMException("请求已取消", "AbortError");
      }

      if (done) {
        const tail = decoder.decode();

        if (tail) {
          onTextChunk(tail);
        }

        return;
      }

      onTextChunk(decoder.decode(value, { stream: true }));
    }
  } finally {
    signal?.removeEventListener("abort", cancelReader);
    reader.releaseLock();
  }
}
