"use client";

import { useState } from "react";

type ApproveButtonProps = {
  ticketId: string;
};

type ApprovalFeedback = {
  isError: boolean;
  message: string;
};

export default function ApproveButton({ ticketId }: ApproveButtonProps) {
  const [feedback, setFeedback] = useState<ApprovalFeedback | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function approveTicket() {
    setIsPending(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/tickets/approve", {
        body: JSON.stringify({ ticketId }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as { message?: string };

      setFeedback({
        isError: !response.ok,
        message:
          payload.message ??
          (response.ok ? "审批请求已提交" : "工单审批失败，请稍后重试"),
      });
    } catch {
      setFeedback({ isError: true, message: "审批请求发送失败" });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        className="font-medium text-emerald-700 hover:text-emerald-900 disabled:cursor-not-allowed disabled:text-zinc-400"
        disabled={isPending}
        onClick={approveTicket}
        type="button"
      >
        {isPending ? "审批中" : "审批"}
      </button>
      {feedback ? (
        <span
          className={
            feedback.isError ? "text-xs text-red-600" : "text-xs text-zinc-500"
          }
        >
          {feedback.message}
        </span>
      ) : null}
    </span>
  );
}
