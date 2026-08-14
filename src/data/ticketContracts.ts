import { z } from "zod";

export const ticketSummarySchema = z
  .object({
    customerName: z.string().trim().min(1),
    id: z.string().trim().min(1),
    priority: z.enum(["低", "中", "高"]),
    status: z.enum(["待处理", "处理中", "已解决"]),
    subject: z.string().trim().min(1),
    updatedAt: z.string().trim().min(1),
  })
  .strict();

export const ticketSummariesSchema = z.array(ticketSummarySchema);

export type TicketSummary = z.infer<typeof ticketSummarySchema>;

export function parseTicketSummaries(value: unknown) {
  return ticketSummariesSchema.safeParse(value);
}

export function canUseDemoTicketFixtures(input: {
  enabledFlag: string | undefined;
  failureKind?: "authentication" | "configuration" | "network" | "response" | "validation";
  nodeEnv: string | undefined;
}) {
  // 企业重点：生产环境永远不能用演示数据掩盖真实业务 API 故障。
  return (
    input.nodeEnv !== "production" &&
    input.enabledFlag !== "false" &&
    input.failureKind !== "authentication"
  );
}
