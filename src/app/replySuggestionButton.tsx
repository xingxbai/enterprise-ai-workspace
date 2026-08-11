"use client";

import { useRef, useState } from "react";
import { readReplySuggestionEventStream } from "@/features/customer-service/replySuggestionProtocol";

type ReplySuggestionButtonProps = {
  ticketId: string;
};

type StreamStatus = "idle" | "streaming" | "done" | "error" | "stopped";

export default function ReplySuggestionButton({
  ticketId,
}: ReplySuggestionButtonProps) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function generateReplySuggestion() {
    abortControllerRef.current?.abort();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setReply("");
    setMessage(null);
    setStatus("streaming");

    try {
      const response = await fetch("/api/ai/reply", {
        body: JSON.stringify({ ticketId }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: abortController.signal,
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        setMessage(payload.message ?? "回复建议生成失败");
        setStatus("error");
        return;
      }

      if (!response.body) {
        setMessage("回复建议流为空");
        setStatus("error");
        return;
      }

      let isFinished = false;
      let hasFailed = false;

      await readReplySuggestionEventStream(
        response.body,
        (event) => {
          if (event.type === "start") {
            setMessage("正在生成回复建议");
            return;
          }

          if (event.type === "delta") {
            setReply((currentReply) => currentReply + event.text);
            return;
          }

          if (event.type === "finish") {
            isFinished = true;
            setMessage("回复建议已生成");
            setStatus("done");
            return;
          }

          if (event.type === "aborted") {
            isFinished = true;
            setMessage(event.message);
            setStatus("stopped");
            return;
          }

          hasFailed = true;
          setMessage(event.message);
          setStatus("error");
        },
        abortController.signal,
      );

      if (!isFinished && !hasFailed) {
        setStatus("done");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setMessage("已停止生成");
        setStatus("stopped");
      } else {
        setMessage("回复建议生成失败");
        setStatus("error");
      }
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }

  function stopGenerating() {
    abortControllerRef.current?.abort();
  }

  return (
    <div className="min-w-52 whitespace-normal">
      <div className="flex items-center gap-3">
        <button
          className="font-medium text-violet-700 hover:text-violet-900 disabled:cursor-not-allowed disabled:text-zinc-400"
          disabled={status === "streaming"}
          onClick={generateReplySuggestion}
          type="button"
        >
          生成回复建议
        </button>
        {status === "streaming" ? (
          <button
            className="text-sm text-zinc-600 hover:text-zinc-950"
            onClick={stopGenerating}
            type="button"
          >
            停止
          </button>
        ) : null}
      </div>

      {reply ? (
        <p className="mt-2 max-w-md text-xs leading-5 text-zinc-600">{reply}</p>
      ) : null}
      {message ? (
        <p className="mt-2 text-xs leading-5 text-zinc-500">{message}</p>
      ) : null}
    </div>
  );
}
