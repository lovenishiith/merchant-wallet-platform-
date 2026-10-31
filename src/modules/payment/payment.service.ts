import {
  IdempotencyScope,
  PaymentAttemptMethod,
  PaymentOrderStatus,
  Prisma
} from "@prisma/client";
import { idempotencyService } from "../../common/idempotency/idempotency.service";
import { AppError } from "../../common/utils/errors";
import { generateId } from "../../common/utils/id-generator";
import { fromMinorUnits, toMinorUnits } from "../../common/utils/money";
import { gatewayService } from "./gateway.service";
import { paymentRepository } from "./payment.repository";
import {
  CreatePaymentOrderInput,
  PayPaymentOrderInput
} from "./payment.schema";

export const paymentService = {
  async createPaymentOrder(merchantId: string, payload: CreatePaymentOrderInput) {
    const amountInMinorUnits = toMinorUnits(payload.amount);

    const order = await paymentRepository.createOrder({
      merchantId,
      customerId: payload.customerId,
      orderRef: generateId("ord"),
      amount: amountInMinorUnits,
      currency: payload.currency ?? "INR",
      status: PaymentOrderStatus.CREATED,
      walletAmountUsed: 0,
      gatewayAmountUsed: 0,
      description: payload.description,
      metadata: payload.metadata as Prisma.InputJsonValue | undefined
    });

    return {
      id: order.id,
      orderRef: order.orderRef,
      merchantId: order.merchantId,
      customerId: order.customerId,
      amount: fromMinorUnits(order.amount),
      currency: order.currency,
      status: order.status,
      walletAmountUsed: fromMinorUnits(order.walletAmountUsed),
      gatewayAmountUsed: fromMinorUnits(order.gatewayAmountUsed),
      description: order.description,
      metadata: order.metadata,
      createdAt: order.createdAt
    };
  },

  async getMerchantPaymentOrder(merchantId: string, orderId: string) {
    const order = await paymentRepository.findOrderByIdAndMerchantId(orderId, merchantId);

    if (!order) {
      throw new AppError("Payment order not found", 404);
    }

    return {
      id: order.id,
      orderRef: order.orderRef,
      merchantId: order.merchantId,
      customerId: order.customerId,
      amount: fromMinorUnits(order.amount),
      currency: order.currency,
      status: order.status,
      walletAmountUsed: fromMinorUnits(order.walletAmountUsed),
      gatewayAmountUsed: fromMinorUnits(order.gatewayAmountUsed),
      description: order.description,
      metadata: order.metadata,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };
  },

  async listMerchantPaymentOrders(merchantId: string) {
    const orders = await paymentRepository.findOrdersByMerchantId(merchantId);

    return orders.map((order) => ({
      id: order.id,
      orderRef: order.orderRef,
      merchantId: order.merchantId,
      customerId: order.customerId,
      amount: fromMinorUnits(order.amount),
      currency: order.currency,
      status: order.status,
      walletAmountUsed: fromMinorUnits(order.walletAmountUsed),
      gatewayAmountUsed: fromMinorUnits(order.gatewayAmountUsed),
      description: order.description,
      metadata: order.metadata,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));
  },

  async getCustomerPaymentOrder(customerId: string, orderId: string) {
    const order = await paymentRepository.findOrderByIdAndCustomerId(orderId, customerId);

    if (!order) {
      throw new AppError("Payment order not found", 404);
    }

    return {
      id: order.id,
      orderRef: order.orderRef,
      merchantId: order.merchantId,
      customerId: order.customerId,
      amount: fromMinorUnits(order.amount),
      currency: order.currency,
      status: order.status,
      walletAmountUsed: fromMinorUnits(order.walletAmountUsed),
      gatewayAmountUsed: fromMinorUnits(order.gatewayAmountUsed),
      description: order.description,
      metadata: order.metadata,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };
  },

  async payOrder(params: {
    customerId: string;
    orderId: string;
    payload: PayPaymentOrderInput;
    idempotencyKey: string;
  }) {
    return idempotencyService.execute({
      key: params.idempotencyKey,
      scope: IdempotencyScope.PAYMENT,
      actorId: params.customerId,
      payload: {
        customerId: params.customerId,
        orderId: params.orderId,
        ...params.payload
      },
      execute: async () => {
        const order = await paymentRepository.findOrderByIdAndCustomerId(
          params.orderId,
          params.customerId
        );

        if (!order) {
          throw new AppError("Payment order not found", 404);
        }

        if (order.status !== PaymentOrderStatus.CREATED) {
          throw new AppError(
            `Payment order cannot be paid in status ${order.status}`,
            400
          );
        }

        const wallet = await paymentRepository.findWalletByCustomerId(params.customerId);

        if (!wallet) {
          throw new AppError("Wallet not found", 404);
        }

        const orderAmount = order.amount;
        const availableWalletBalance = wallet.balance;
        let walletAmountToUse = 0;
        let gatewayAmountToUse = 0;
        let method: PaymentAttemptMethod;

        if (params.payload.mode === "WALLET") {
          if (availableWalletBalance < orderAmount) {
            throw new AppError(
              "Insufficient wallet balance for wallet-only payment",
              400
            );
          }

          walletAmountToUse = orderAmount;
          gatewayAmountToUse = 0;
          method = PaymentAttemptMethod.WALLET;
        } else if (params.payload.mode === "GATEWAY") {
          walletAmountToUse = 0;
          gatewayAmountToUse = orderAmount;
          method = PaymentAttemptMethod.GATEWAY;
        } else {
          // AUTO mode
          if (availableWalletBalance >= orderAmount) {
            walletAmountToUse = orderAmount;
            gatewayAmountToUse = 0;
            method = PaymentAttemptMethod.WALLET;
          } else if (availableWalletBalance <= 0) {
            walletAmountToUse = 0;
            gatewayAmountToUse = orderAmount;
            method = PaymentAttemptMethod.GATEWAY;
          } else {
            walletAmountToUse = availableWalletBalance;
            gatewayAmountToUse = orderAmount - availableWalletBalance;
            method = PaymentAttemptMethod.HYBRID;
          }
        }

        let gatewayProvider: string | undefined;
        let gatewayReference: string | undefined;

        if (gatewayAmountToUse > 0) {
          const gatewayResult = await gatewayService.charge({
            paymentOrderId: order.id,
            amount: gatewayAmountToUse,
            currency: order.currency,
            customerId: params.customerId
          });

          if (!gatewayResult.success) {
            throw new AppError(
              gatewayResult.failureReason ?? "Gateway payment failed",
              400
            );
          }

          gatewayProvider = gatewayResult.provider;
          gatewayReference = gatewayResult.gatewayReference;
        }

        const result = await paymentRepository.payOrder({
          paymentOrderId: order.id,
          customerId: params.customerId,
          orderAmount,
          currency: order.currency,
          walletAmountToUse,
          gatewayAmountToUse,
          method,
          gatewayProvider,
          gatewayReference
        });

        if (!result.success) {
          throw new AppError(result.reason, 400);
        }

        const response = {
          success: true,
          message: "Payment processed successfully",
          data: {
            paymentOrder: {
              id: result.paymentOrder.id,
              orderRef: result.paymentOrder.orderRef,
              status: result.paymentOrder.status,
              amount: fromMinorUnits(result.paymentOrder.amount),
              walletAmountUsed: fromMinorUnits(result.paymentOrder.walletAmountUsed),
              gatewayAmountUsed: fromMinorUnits(result.paymentOrder.gatewayAmountUsed)
            },
            paymentAttempt: {
              id: result.paymentAttempt.id,
              status: result.paymentAttempt.status,
              method: result.paymentAttempt.method,
              amount: fromMinorUnits(result.paymentAttempt.amount),
              walletAmount: fromMinorUnits(result.paymentAttempt.walletAmount),
              gatewayAmount: fromMinorUnits(result.paymentAttempt.gatewayAmount),
              gatewayProvider: result.paymentAttempt.gatewayProvider,
              gatewayReference: result.paymentAttempt.gatewayReference
            },
            wallet: {
              id: result.wallet.id,
              balance: fromMinorUnits(result.wallet.balance),
              reservedBalance: fromMinorUnits(result.wallet.reservedBalance),
              currency: result.wallet.currency
            }
          }
        };

        return {
          statusCode: 200,
          response
        };
      }
    });
  }
};