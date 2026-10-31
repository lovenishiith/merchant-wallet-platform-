import { Merchant, Prisma } from "@prisma/client";
import { prisma } from "../../config/db";

export const merchantRepository = {
  findByEmail(email: string): Promise<Merchant | null> {
    return prisma.merchant.findUnique({
      where: { email }
    });
  },

  create(data: Prisma.MerchantCreateInput): Promise<Merchant> {
    return prisma.merchant.create({ data });
  }
};