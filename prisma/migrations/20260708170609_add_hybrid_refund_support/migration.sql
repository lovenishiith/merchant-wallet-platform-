-- AlterTable
ALTER TABLE "PaymentOrder" ADD COLUMN     "refundedAmount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "gatewayProvider" TEXT,
ADD COLUMN     "gatewayRefundAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gatewayRefundReference" TEXT,
ADD COLUMN     "walletRefundAmount" INTEGER NOT NULL DEFAULT 0;
