import {
  PaymentOrder,
  PaymentAttempt,
  Prisma,
  PaymentAttemptMethod,
  PaymentAttemptStatus,
  PaymentOrderStatus,
  Wallet
} from "@prisma/client";
import { prisma } from "../../config/db";

export const paymentRepository = {
  createOrder(data: Prisma.PaymentOrderUncheckedCreateInput): Promise<PaymentOrder> {
    return prisma.paymentOrder.create({
      data
    });
  },

  findOrderById(orderId: string): Promise<PaymentOrder | null> {
    return prisma.paymentOrder.findUnique({
      where: { id: orderId }
    });
  },

  findOrderByIdAndMerchantId(
    orderId: string,
    merchantId: string
  ): Promise<PaymentOrder | null> {
    return prisma.paymentOrder.findFirst({
      where: {
        id: orderId,
        merchantId
      }
    });
  },

  findOrdersByMerchantId(merchantId: string): Promise<PaymentOrder[]> {
    return prisma.paymentOrder.findMany({
      where: { merchantId },
      orderBy: { createdAt: "desc" }
    });
  },

  findOrderByIdAndCustomerId(
    orderId: string,
    customerId: string
  ): Promise<PaymentOrder | null> {
    return prisma.paymentOrder.findFirst({
      where: {
        id: orderId,
        customerId
      }
    });
  },

  findWalletByCustomerId(customerId: string): Promise<Wallet | null> {
    return prisma.wallet.findUnique({
      where: { customerId }
    });
  },

  findPaymentAttemptsByOrderId(paymentOrderId: string): Promise<PaymentAttempt[]> {
    return prisma.paymentAttempt.findMany({
      where: { paymentOrderId },
      orderBy: { createdAt: "desc" }
    });
  },

  async payOrder(params: {
    paymentOrderId: string;
    customerId: string;
    orderAmount: number; // minor units
    currency: string;
    walletAmountToUse: number; // minor units
    gatewayAmountToUse: number; // minor units
    method: PaymentAttemptMethod;
    gatewayProvider?: string;
    gatewayReference?: string;
  }) {
    const wallet = await prisma.wallet.findUnique({
      where: { customerId: params.customerId }
    });

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    return prisma.$transaction(async (tx) => {
      const paymentAttempt = await tx.paymentAttempt.create({
        data: {
          paymentOrderId: params.paymentOrderId,
          customerId: params.customerId,
          method: params.method,
          status: PaymentAttemptStatus.INITIATED,
          amount: params.orderAmount,
          walletAmount: params.walletAmountToUse,
          gatewayAmount: params.gatewayAmountToUse,
          gatewayProvider: params.gatewayProvider,
          gatewayReference: params.gatewayReference
        }
      });

      let updatedWallet = wallet;

      // Wallet part
      if (params.walletAmountToUse > 0) {
        if (wallet.balance < params.walletAmountToUse) {
          const failedAttempt = await tx.paymentAttempt.update({
            where: { id: paymentAttempt.id },
            data: {
              status: PaymentAttemptStatus.FAILED,
              failureReason: "Insufficient wallet balance"
            }
          });

          return {
            success: false as const,
            reason: "Insufficient wallet balance",
            paymentAttempt: failedAttempt
          };
        }

        const reservedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: {
              decrement: params.walletAmountToUse
            },
            reservedBalance: {
              increment: params.walletAmountToUse
            }
          }
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "RESERVE",
            amount: params.walletAmountToUse,
            balanceAfter: reservedWallet.balance,
            reservedAfter: reservedWallet.reservedBalance,
            reference: params.paymentOrderId,
            description: "Reserved for payment order"
          }
        });

        updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            reservedBalance: {
              decrement: params.walletAmountToUse
            }
          }
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "DEBIT",
            amount: params.walletAmountToUse,
            balanceAfter: updatedWallet.balance,
            reservedAfter: updatedWallet.reservedBalance,
            reference: params.paymentOrderId,
            description: "Wallet debited for payment order"
          }
        });
      }

      const updatedOrder = await tx.paymentOrder.update({
        where: { id: params.paymentOrderId },
        data: {
          status: PaymentOrderStatus.PAID,
          walletAmountUsed: params.walletAmountToUse,
          gatewayAmountUsed: params.gatewayAmountToUse
        }
      });

      const successfulAttempt = await tx.paymentAttempt.update({
        where: { id: paymentAttempt.id },
        data: {
          status: PaymentAttemptStatus.SUCCESS
        }
      });

      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          paymentOrderId: params.paymentOrderId,
          type: "PAYMENT_CAPTURE",
          amount: params.orderAmount,
          description: `Payment captured via ${params.method}`
        }
      });

      return {
        success: true as const,
        wallet: updatedWallet,
        paymentAttempt: successfulAttempt,
        paymentOrder: updatedOrder
      };
    });
  }
};