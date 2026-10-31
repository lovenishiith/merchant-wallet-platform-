import { NextFunction, Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response";
import { AppError } from "../../common/utils/errors";
import { refundService } from "./refund.service";
import { createRefundSchema } from "./refund.schema";

export const refundController = {
  async createRefund(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError("Unauthorized", 401);
      }

      const idempotencyKey = req.header("Idempotency-Key");

      if (!idempotencyKey) {
        throw new AppError("Idempotency-Key header is required", 400);
      }

      const payload = createRefundSchema.parse(req.body);

      const result = await refundService.createRefund({
        merchantId: req.user.userId,
        payload,
        idempotencyKey
      });

      return res.status(result.statusCode).json(result.response);
    } catch (error) {
      next(error);
    }
  },

  async listMerchantRefunds(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError("Unauthorized", 401);
      }

      const result = await refundService.listMerchantRefunds(req.user.userId);

      return res
        .status(200)
        .json(successResponse("Refunds fetched successfully", result));
    } catch (error) {
      next(error);
    }
  },

  async getMerchantRefund(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError("Unauthorized", 401);
      }

      const refundId = Array.isArray(req.params.refundId)
        ? req.params.refundId[0]
        : req.params.refundId;

      const result = await refundService.getMerchantRefund(
        req.user.userId,
        refundId
      );

      return res
        .status(200)
        .json(successResponse("Refund fetched successfully", result));
    } catch (error) {
      next(error);
    }
  }
};