import { Request, Response, NextFunction } from "express";
import { successResponse } from "../../common/utils/api-response";
import { authService } from "./auth.service";
import {
  customerLoginSchema,
  customerSignupSchema,
  merchantLoginSchema,
  merchantSignupSchema
} from "./auth.schema";

export const authController = {
  async merchantSignup(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = merchantSignupSchema.parse(req.body);
      const result = await authService.merchantSignup(payload);

      return res
        .status(201)
        .json(successResponse("Merchant signup successful", result));
    } catch (error) {
      next(error);
    }
  },

  async merchantLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = merchantLoginSchema.parse(req.body);
      const result = await authService.merchantLogin(payload);

      return res
        .status(200)
        .json(successResponse("Merchant login successful", result));
    } catch (error) {
      next(error);
    }
  },

  async customerSignup(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = customerSignupSchema.parse(req.body);
      const result = await authService.customerSignup(payload);

      return res
        .status(201)
        .json(successResponse("Customer signup successful", result));
    } catch (error) {
      next(error);
    }
  },

  async customerLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = customerLoginSchema.parse(req.body);
      const result = await authService.customerLogin(payload);

      return res
        .status(200)
        .json(successResponse("Customer login successful", result));
    } catch (error) {
      next(error);
    }
  }
};