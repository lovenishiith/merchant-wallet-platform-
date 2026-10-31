import { IdempotencyScope, PaymentOrderStatus } from "@prisma/client";
import { idempotencyService } from "../../common/idempotency/idempotency.service";
import { AppError } from "../../common/utils/errors";
import { fromMinorUnits, toMinorUnits } from "../../common/utils/money";
import { refundRepository } from "./refund.repository";
import { CreateRefundInput } from "./refund.schema";
import { refundGatewayService } from "./refund-gateway.service";

export const refundService = {
  async createRefund(params: {
    merchantId: string;
    payload: CreateRefundInput;
    idempotencyKey: string;
  }) {
    return idempotencyService.execute({
      key: params.idempotencyKey,
      scope: IdempotencyScope.REFUND,
      actorId: params.merchantId,
      payload: {
        merchantId: params.merchantId,
        ...params.payload
      },
      execute: async () => {
        const order = await refundRepository.findPaymentOrderByIdAndMerchantId(
          params.payload.paymentOrderId,
          params.merchantId
        );

        if (!order) {
          throw new AppError("Payment order not found", 404);
        }

        if (
          order.status !== PaymentOrderStatus.PAID &&
          order.status !== PaymentOrderStatus.REFUNDED
        ) {
          throw new AppError(
            `Refund is allowed only for PAID/REFUNDED orders. Current status: ${order.status}`,
            400
          );
        }

        const refundAmountInMinorUnits = toMinorUnits(params.payload.amount);

        if (refundAmountInMinorUnits <= 0) {
          throw new AppError("Refund amount must be greater than 0", 400);
        }

        const remainingRefundableAmount = order.amount - order.refundedAmount;

        if (remainingRefundableAmount <= 0) {
          throw new AppError("Order is already fully refunded", 400);
        }

        if (refundAmountInMinorUnits > remainingRefundableAmount) {
          throw new AppError(
            "Refund amount exceeds remaining refundable amount",
            400
          );
        }

        // wallet-paid portion is refunded first, then gateway-paid portion
        const walletRefundAmount = Math.min(
          refundAmountInMinorUnits,
          Math.max(0, order.walletAmountUsed - order.refundedAmount)
        );

        const gatewayRefundAmount =
          refundAmountInMinorUnits - walletRefundAmount;

        const wallet = await refundRepository.findWalletByCustomerId(
          order.customerId
        );

        if (!wallet) {
          throw new AppError("Customer wallet not found", 404);
        }

        let gatewayProvider: string | undefined;
        let gatewayRefundReference: string | undefined;

        if (gatewayRefundAmount > 0) {
          const gatewayRefundResult = await refundGatewayService.refund({
            paymentOrderId: order.id,
            amount: gatewayRefundAmount,
            currency: order.currency,
            customerId: order.customerId
          });

          if (!gatewayRefundResult.success) {
            throw new AppError(
              gatewayRefundResult.failureReason ?? "Gateway refund failed",
              400
            );
          }

          gatewayProvider = gatewayRefundResult.provider;
          gatewayRefundReference =
            gatewayRefundResult.gatewayRefundReference;
        }

        const createdRefund = await refundRepository.createRefund({
          paymentOrderId: order.id,
          merchantId: params.merchantId,
          customerId: order.customerId,
          amount: refundAmountInMinorUnits,
          walletRefundAmount,
          gatewayRefundAmount,
          reason: params.payload.reason,
          gatewayProvider,
          gatewayRefundReference
        });

        const result = await refundRepository.processRefund({
          refundId: createdRefund.id,
          paymentOrderId: order.id,
          walletId: wallet.id,
          totalRefundAmount: refundAmountInMinorUnits,
          walletRefundAmount,
          gatewayRefundAmount
        });

        const response = {
          success: true,
          message: "Refund created successfully",
          data: {
            refund: {
              id: result.refund.id,
              paymentOrderId: result.refund.paymentOrderId,
              merchantId: result.refund.merchantId,
              customerId: result.refund.customerId,
              amount: fromMinorUnits(result.refund.amount),
              walletRefundAmount: fromMinorUnits(
                result.refund.walletRefundAmount
              ),
              gatewayRefundAmount: fromMinorUnits(
                result.refund.gatewayRefundAmount
              ),
              status: result.refund.status,
              reason: result.refund.reason,
              gatewayProvider: result.refund.gatewayProvider,
              gatewayRefundReference:
                result.refund.gatewayRefundReference,
              createdAt: result.refund.createdAt
            },
            wallet: {
              id: result.wallet.id,
              balance: fromMinorUnits(result.wallet.balance),
              reservedBalance: fromMinorUnits(result.wallet.reservedBalance),
              currency: result.wallet.currency
            },
            paymentOrder: {
              id: result.paymentOrder.id,
              status: result.paymentOrder.status,
              refundedAmount: fromMinorUnits(
                result.paymentOrder.refundedAmount
              ),
              walletAmountUsed: fromMinorUnits(
                result.paymentOrder.walletAmountUsed
              ),
              gatewayAmountUsed: fromMinorUnits(
                result.paymentOrder.gatewayAmountUsed
              )
            }
          }
        };

        return {
          statusCode: 201,
          response
        };
      }
    });
  },

  async listMerchantRefunds(merchantId: string) {
    const refunds = await refundRepository.findRefundsByMerchantId(merchantId);

    return refunds.map((refund) => ({
      id: refund.id,
      paymentOrderId: refund.paymentOrderId,
      merchantId: refund.merchantId,
      customerId: refund.customerId,
      amount: fromMinorUnits(refund.amount),
      walletRefundAmount: fromMinorUnits(refund.walletRefundAmount),
      gatewayRefundAmount: fromMinorUnits(refund.gatewayRefundAmount),
      status: refund.status,
      reason: refund.reason,
      gatewayProvider: refund.gatewayProvider,
      gatewayRefundReference: refund.gatewayRefundReference,
      createdAt: refund.createdAt,
      updatedAt: refund.updatedAt
    }));
  },

  async getMerchantRefund(merchantId: string, refundId: string) {
    const refund = await refundRepository.findRefundByIdAndMerchantId(
      refundId,
      merchantId
    );

    if (!refund) {
      throw new AppError("Refund not found", 404);
    }

    return {
      id: refund.id,
      paymentOrderId: refund.paymentOrderId,
      merchantId: refund.merchantId,
      customerId: refund.customerId,
      amount: fromMinorUnits(refund.amount),
      walletRefundAmount: fromMinorUnits(refund.walletRefundAmount),
      gatewayRefundAmount: fromMinorUnits(refund.gatewayRefundAmount),
      status: refund.status,
      reason: refund.reason,
      gatewayProvider: refund.gatewayProvider,
      gatewayRefundReference: refund.gatewayRefundReference,
      createdAt: refund.createdAt,
      updatedAt: refund.updatedAt
    };
  }
};