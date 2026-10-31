import { z } from "zod";

export const walletTopUpSchema = z.object({
  amount: z.number().positive("amount must be greater than 0")
});

export const walletAmountActionSchema = z.object({
  amount: z.number().positive("amount must be greater than 0"),
  reference: z.string().optional(),
  description: z.string().optional()
});

export type WalletTopUpInput = z.infer<typeof walletTopUpSchema>;
export type WalletAmountActionInput = z.infer<typeof walletAmountActionSchema>;