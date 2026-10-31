import { Customer, Prisma } from "@prisma/client";
import { prisma } from "../../config/db";

export const customerRepository = {
  findByEmail(email: string): Promise<Customer | null> {
    return prisma.customer.findUnique({
      where: { email }
    });
  },

  create(data: Prisma.CustomerCreateInput): Promise<Customer> {
    return prisma.customer.create({ data });
  }
};