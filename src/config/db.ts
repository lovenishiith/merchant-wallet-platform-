import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ["warn", "error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

prisma
  .$connect()
  .then(() => {
    logger.info("Prisma connected successfully");
  })
  .catch((error) => {
    logger.error({ error }, "Prisma connection failed");
  });