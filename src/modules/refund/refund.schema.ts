import { z } from "zod";

export const createRefundSchema = z.object({
  paymentOrderId: z.string().min(1, "paymentOrderId is required"),
  amount: z.number().positive("amount must be greater than 0"),
  reason: z.string().optional()
});

export type CreateRefundInput = z.infer<typeof createRefundSchema>;