"use client";

import { useState } from "react";

type ApproveButtonProps = {
  ticketId: string;
};

export default function ApproveButton({ ticketId }: ApproveButtonProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function approveTicket() {
    setIsPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/tickets/approve", {
        body: JSON.stringify({ ticketId }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as { message?: string };

      setMessage(payload.message ?? "审批请求已提交");
    } catch {
      setMessage("审批请求发送失败");
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
      {message ? (
        <span className="text-xs text-zinc-500">{message}</span>
      ) : null}
    </span>
  );
}
