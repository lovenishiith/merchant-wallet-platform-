import { z } from "zod";

export const merchantSignupSchema = z.object({
  businessName: z.string().min(2, "businessName is required"),
  email: z.email("valid email is required"),
  password: z.string().min(6, "password must be at least 6 characters")
});

export const merchantLoginSchema = z.object({
  email: z.email("valid email is required"),
  password: z.string().min(1, "password is required")
});

export const customerSignupSchema = z.object({
  fullName: z.string().min(2, "fullName is required"),
  email: z.email("valid email is required"),
  password: z.string().min(6, "password must be at least 6 characters")
});

export const customerLoginSchema = z.object({
  email: z.email("valid email is required"),
  password: z.string().min(1, "password is required")
});

export type MerchantSignupInput = z.infer<typeof merchantSignupSchema>;
export type MerchantLoginInput = z.infer<typeof merchantLoginSchema>;
export type CustomerSignupInput = z.infer<typeof customerSignupSchema>;
export type CustomerLoginInput = z.infer<typeof customerLoginSchema>;