import { prisma } from "../src/config/db";

beforeAll(async () => {
  // DB connection is initialized through prisma import
});

beforeEach(async () => {
  // delete in child -> parent order to avoid FK issues
  await prisma.idempotencyKey.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.paymentAttempt.deleteMany();
  await prisma.paymentOrder.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.merchant.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});