import { NextFunction, Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response";
import { AppError } from "../../common/utils/errors";
import { paymentService } from "./payment.service";
import { createPaymentOrderSchema, payPaymentOrderSchema } from "./payment.schema";

export const paymentController = {
  async createPaymentOrder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError("Unauthorized", 401);
      }

      const payload = createPaymentOrderSchema.parse(req.body);
      const result = await paymentService.createPaymentOrder(req.user.userId, payload);

      return res
        .status(201)
        .json(successResponse("Payment order created successfully", result));
    } catch (error) {
      next(error);
    }
  },

  async getMerchantPaymentOrder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError("Unauthorized", 401);
      }

      const orderId = Array.isArray(req.params.orderId)
        ? req.params.orderId[0]
        : req.params.orderId;

      const result = await paymentService.getMerchantPaymentOrder(
        req.user.userId,
        orderId
      );

      return res
        .status(200)
        .json(successResponse("Payment order fetched successfully", result));
    } catch (error) {
      next(error);
    }
  },

  async listMerchantPaymentOrders(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError("Unauthorized", 401);
      }

      const result = await paymentService.listMerchantPaymentOrders(req.user.userId);

      return res
        .status(200)
        .json(successResponse("Payment orders fetched successfully", result));
    } catch (error) {
      next(error);
    }
  },

  async getCustomerPaymentOrder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError("Unauthorized", 401);
      }

      const orderId = Array.isArray(req.params.orderId)
        ? req.params.orderId[0]
        : req.params.orderId;

      const result = await paymentService.getCustomerPaymentOrder(
        req.user.userId,
        orderId
      );

      return res
        .status(200)
        .json(successResponse("Payment order fetched successfully", result));
    } catch (error) {
      next(error);
    }
  },

  async payOrder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError("Unauthorized", 401);
      }

      const orderId = Array.isArray(req.params.orderId)
        ? req.params.orderId[0]
        : req.params.orderId;

      const idempotencyKey = req.header("Idempotency-Key");

      if (!idempotencyKey) {
        throw new AppError("Idempotency-Key header is required", 400);
      }

      const payload = payPaymentOrderSchema.parse(req.body);

      const result = await paymentService.payOrder({
        customerId: req.user.userId,
        orderId,
        payload,
        idempotencyKey
      });

      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      next(error);
    }
  }
};