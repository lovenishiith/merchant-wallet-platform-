import { Refund, RefundStatus } from "@prisma/client";
import { prisma } from "../../config/db";

export const refundRepository = {
  findRefundById(refundId: string): Promise<Refund | null> {
    return prisma.refund.findUnique({
      where: { id: refundId }
    });
  },

  findRefundByIdAndMerchantId(
    refundId: string,
    merchantId: string
  ): Promise<Refund | null> {
    return prisma.refund.findFirst({
      where: {
        id: refundId,
        merchantId
      }
    });
  },

  findRefundsByMerchantId(merchantId: string): Promise<Refund[]> {
    return prisma.refund.findMany({
      where: { merchantId },
      orderBy: { createdAt: "desc" }
    });
  },

  findPaymentOrderByIdAndMerchantId(paymentOrderId: string, merchantId: string) {
    return prisma.paymentOrder.findFirst({
      where: {
        id: paymentOrderId,
        merchantId
      }
    });
  },

  findWalletByCustomerId(customerId: string) {
    return prisma.wallet.findUnique({
      where: { customerId }
    });
  },

  async createRefund(params: {
    paymentOrderId: string;
    merchantId: string;
    customerId: string;
    amount: number;
    walletRefundAmount: number;
    gatewayRefundAmount: number;
    reason?: string;
    gatewayProvider?: string;
    gatewayRefundReference?: string;
  }) {
    return prisma.refund.create({
      data: {
        paymentOrderId: params.paymentOrderId,
        merchantId: params.merchantId,
        customerId: params.customerId,
        amount: params.amount,
        walletRefundAmount: params.walletRefundAmount,
        gatewayRefundAmount: params.gatewayRefundAmount,
        status: RefundStatus.PENDING,
        reason: params.reason,
        gatewayProvider: params.gatewayProvider,
        gatewayRefundReference: params.gatewayRefundReference
      }
    });
  },

  async processRefund(params: {
    refundId: string;
    paymentOrderId: string;
    walletId: string;
    totalRefundAmount: number;
    walletRefundAmount: number;
    gatewayRefundAmount: number;
  }) {
    return prisma.$transaction(async (tx) => {
      let updatedWallet = await tx.wallet.findUniqueOrThrow({
        where: { id: params.walletId }
      });

      if (params.walletRefundAmount > 0) {
        updatedWallet = await tx.wallet.update({
          where: { id: params.walletId },
          data: {
            balance: {
              increment: params.walletRefundAmount
            }
          }
        });

        await tx.walletTransaction.create({
          data: {
            walletId: params.walletId,
            type: "REFUND",
            amount: params.walletRefundAmount,
            balanceAfter: updatedWallet.balance,
            reservedAfter: updatedWallet.reservedBalance,
            reference: params.refundId,
            description: "Refund credited to wallet"
          }
        });
      }

      await tx.ledgerEntry.create({
        data: {
          walletId: params.walletId,
          paymentOrderId: params.paymentOrderId,
          refundId: params.refundId,
          type: "REFUND_PROCESSED",
          amount: params.totalRefundAmount,
          description: "Refund processed"
        }
      });

      const refund = await tx.refund.update({
        where: { id: params.refundId },
        data: {
          status: RefundStatus.SUCCESS
        }
      });

      const orderAfterRefundIncrement = await tx.paymentOrder.update({
        where: { id: params.paymentOrderId },
        data: {
          refundedAmount: {
            increment: params.totalRefundAmount
          }
        }
      });

      const finalStatus =
        orderAfterRefundIncrement.refundedAmount >= orderAfterRefundIncrement.amount
          ? "REFUNDED"
          : "PAID";

      const updatedOrder = await tx.paymentOrder.update({
        where: { id: params.paymentOrderId },
        data: {
          status: finalStatus
        }
      });

      return {
        refund,
        wallet: updatedWallet,
        paymentOrder: updatedOrder
      };
    });
  }
};