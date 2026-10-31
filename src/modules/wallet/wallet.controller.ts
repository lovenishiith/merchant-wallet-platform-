import { NextFunction, Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response";
import { AppError } from "../../common/utils/errors";
import { walletService } from "./wallet.service";
import {
  walletAmountActionSchema,
  walletTopUpSchema
} from "./wallet.schema";

export const walletController = {
  async getMyWallet(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError("Unauthorized", 401);
      }

      const result = await walletService.getMyWallet(req.user.userId);

      return res
        .status(200)
        .json(successResponse("Wallet fetched successfully", result));
    } catch (error) {
      next(error);
    }
  },

  async topUpWallet(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError("Unauthorized", 401);
      }

      const payload = walletTopUpSchema.parse(req.body);
      const result = await walletService.topUpWallet(req.user.userId, payload);

      return res
        .status(200)
        .json(successResponse("Wallet topped up successfully", result));
    } catch (error) {
      next(error);
    }
  },

  async getWalletTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError("Unauthorized", 401);
      }

      const result = await walletService.getWalletTransactions(req.user.userId);

      return res
        .status(200)
        .json(successResponse("Wallet transactions fetched successfully", result));
    } catch (error) {
      next(error);
    }
  },

  async reserveAmount(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError("Unauthorized", 401);
      }

      const payload = walletAmountActionSchema.parse(req.body);

      const result = await walletService.reserveAmount({
        customerId: req.user.userId,
        amount: payload.amount,
        reference: payload.reference,
        description: payload.description
      });

      return res
        .status(200)
        .json(successResponse("Wallet amount reserved successfully", result));
    } catch (error) {
      next(error);
    }
  },

  async releaseReservedAmount(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError("Unauthorized", 401);
      }

      const payload = walletAmountActionSchema.parse(req.body);

      const result = await walletService.releaseReservedAmount({
        customerId: req.user.userId,
        amount: payload.amount,
        reference: payload.reference,
        description: payload.description
      });

      return res
        .status(200)
        .json(successResponse("Reserved wallet amount released successfully", result));
    } catch (error) {
      next(error);
    }
  },

  async finalizeReservedDebit(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError("Unauthorized", 401);
      }

      const payload = walletAmountActionSchema.parse(req.body);

      const result = await walletService.finalizeReservedDebit({
        customerId: req.user.userId,
        amount: payload.amount,
        reference: payload.reference,
        description: payload.description
      });

      return res
        .status(200)
        .json(successResponse("Reserved wallet amount debited successfully", result));
    } catch (error) {
      next(error);
    }
  }
};