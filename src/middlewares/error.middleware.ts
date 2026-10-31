import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../common/utils/errors";
import { errorResponse } from "../common/utils/api-response";
import { logger } from "../config/logger";

export const errorMiddleware = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ZodError) {
    return res.status(400).json(
      errorResponse("Validation failed", err.flatten().fieldErrors)
    );
  }

  if (err instanceof AppError) {
    return res
      .status(err.statusCode)
      .json(errorResponse(err.message, err.details));
  }

  if (err instanceof Error) {
    logger.error(
      {
        name: err.name,
        message: err.message,
        stack: err.stack
      },
      "Unhandled error"
    );
  } else {
    logger.error({ err }, "Unhandled non-error throwable");
  }

  return res.status(500).json(errorResponse("Internal server error"));
};