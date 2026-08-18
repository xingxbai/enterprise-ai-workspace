"use client";

import { RotateCcw, Sparkles, Square } from "lucide-react";
import { useRef, useState } from "react";

import StatusBadge from "@/components/workspace/statusBadge";
import {
  ticketPredictionApiResponseSchema,
  type TicketPredictionApiResponse,
} from "@/features/customer-service/ticketPredictionContract";

async function readApiError(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await response.json()) as { message?: unknown };

    if (typeof body.message === "string") {
      return body.message;
    }
  }

  return "AI 预测失败，请稍后重试";
}

export default function TicketPredictionCell({ ticketId }: { ticketId: string }) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<TicketPredictionApiResponse | null>(null);

  async function generatePrediction() {
    if (isPending) {
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setError(null);
    setIsPending(true);

    try {
      const response = await fetch("/api/ai/tickets/predict", {
        body: JSON.stringify({ ticketId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const parsedResponse = ticketPredictionApiResponseSchema.safeParse(
        await response.json(),
      );

      if (!parsedResponse.success) {
        throw new Error("AI 预测响应格式不正确");
      }

      setResult(parsedResponse.data);
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") {
        setError("预测已取消");
      } else {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "AI 预测失败，请稍后重试",
        );
      }
    } finally {
      abortControllerRef.current = null;
      setIsPending(false);
    }
  }

  function cancelPrediction() {
    abortControllerRef.current?.abort();
  }

  if (!result) {
    return (
      <div className="min-w-56">
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
            disabled={isPending}
            onClick={() => void generatePrediction()}
            type="button"
          >
            <Sparkles aria-hidden="true" className="size-3.5" />
            {isPending ? "预测中" : "AI 预测"}
          </button>
          {isPending ? (
            <button
              aria-label="取消 AI 预测"
              className="grid size-8 place-items-center rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100"
              onClick={cancelPrediction}
              title="取消预测"
              type="button"
            >
              <Square aria-hidden="true" className="size-3.5" />
            </button>
          ) : null}
        </div>
        {error ? <p className="mt-2 text-xs leading-5 text-red-600">{error}</p> : null}
      </div>
    );
  }

  const { prediction } = result;

  return (
    <div className="min-w-72 space-y-2 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-zinc-500">分类</span>
        <StatusBadge>{prediction.category}</StatusBadge>
        <span className="ml-1 text-zinc-500">优先级</span>
        <StatusBadge>{prediction.priority}</StatusBadge>
        <span className="ml-1 text-zinc-500">SLA 风险</span>
        <StatusBadge>{prediction.slaRisk}</StatusBadge>
      </div>
      <ul className="list-disc space-y-1 pl-4 leading-5 text-zinc-600">
        {prediction.evidence.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {prediction.uncertainty ? (
        <p className="leading-5 text-amber-700">待确认：{prediction.uncertainty}</p>
      ) : null}
      <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-2">
        <span className={prediction.needsHumanReview ? "text-amber-700" : "text-zinc-500"}>
          {prediction.needsHumanReview ? "需要人工复核" : "建议仍由人工确认"}
        </span>
        {isPending ? (
          <button
            aria-label="取消 AI 预测"
            className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-zinc-600 hover:bg-zinc-100"
            onClick={cancelPrediction}
            title="取消预测"
            type="button"
          >
            <Square aria-hidden="true" className="size-3" />
            更新中
          </button>
        ) : (
          <button
            aria-label="重新生成 AI 预测"
            className="grid size-7 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
            onClick={() => void generatePrediction()}
            title="重新预测"
            type="button"
          >
            <RotateCcw aria-hidden="true" className="size-3.5" />
          </button>
        )}
      </div>
      <p className="text-[11px] text-zinc-400">追踪号：{result.requestId}</p>
      {error ? <p className="leading-5 text-red-600">{error}</p> : null}
    </div>
  );
}
