import { z } from "zod";

export const ticketPredictionSchema = z
  .object({
    category: z.enum([
      "数据同步",
      "数据导入",
      "权限配置",
      "审批流程",
      "报表配置",
      "消息通知",
      "其他",
      "无法判断",
    ]),
    evidence: z.array(z.string().trim().min(1).max(120)).min(1).max(3),
    needsHumanReview: z.boolean(),
    priority: z.enum(["高", "中", "低", "无法判断"]),
    slaRisk: z.enum(["高", "中", "低", "无法判断"]),
    uncertainty: z.string().trim().min(1).max(200).nullable(),
  })
  .strict();

export const ticketPredictionApiResponseSchema = z
  .object({
    generatedAt: z.string(),
    prediction: ticketPredictionSchema,
    requestId: z.string(),
  })
  .strict();

export type TicketPrediction = z.infer<typeof ticketPredictionSchema>;
export type TicketPredictionApiResponse = z.infer<
  typeof ticketPredictionApiResponseSchema
>;
