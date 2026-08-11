import { createTicketsApiUrl, getBusinessApiHeaders } from "@/data/tickets";

type ApproveTicketPayload = {
  ticketId?: unknown;
};

export async function POST(request: Request) {
  let payload: ApproveTicketPayload;

  try {
    payload = (await request.json()) as ApproveTicketPayload;
  } catch {
    return Response.json({ message: "请求体必须是 JSON" }, { status: 400 });
  }

  if (typeof payload.ticketId !== "string" || payload.ticketId.trim() === "") {
    return Response.json({ message: "ticketId 不能为空" }, { status: 400 });
  }

  const approveUrl = createTicketsApiUrl(
    `tickets/${encodeURIComponent(payload.ticketId)}/approve`,
  );

  if (!approveUrl) {
    return Response.json(
      { message: "未配置真实工单审批接口" },
      { status: 503 },
    );
  }

  const headers = getBusinessApiHeaders();
  headers.set("Content-Type", "application/json");

  const response = await fetch(
    approveUrl,
    {
      body: JSON.stringify({ ticketId: payload.ticketId }),
      headers,
      method: "POST",
    },
  );

  if (!response.ok) {
    return Response.json({ message: "工单审批失败" }, { status: 502 });
  }

  return Response.json({
    message: "工单审批已提交",
    ticketId: payload.ticketId,
  });
}
