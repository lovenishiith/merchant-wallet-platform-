import { z } from "zod";

export const createPaymentOrderSchema = z.object({
  customerId: z.string().min(1, "customerId is required"),
  amount: z.number().positive("amount must be greater than 0"),
  currency: z.string().optional().default("INR"),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

export const payPaymentOrderSchema = z.object({
  mode: z.enum(["AUTO", "WALLET", "GATEWAY"]).optional().default("AUTO")
});

export type CreatePaymentOrderInput = z.infer<typeof createPaymentOrderSchema>;
export type PayPaymentOrderInput = z.infer<typeof payPaymentOrderSchema>;