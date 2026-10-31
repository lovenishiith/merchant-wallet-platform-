import { NextFunction, Request, Response } from "express";
import jwt, {
  JsonWebTokenError,
  NotBeforeError,
  TokenExpiredError
} from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../common/utils/errors";
import { AuthenticatedUser, JwtUserRole } from "../common/types/auth.types";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

type JwtPayload = {
  userId: string;
  role: JwtUserRole;
  iat?: number;
  exp?: number;
};

export const authMiddleware = (allowedRoles?: JwtUserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        throw new AppError("Authorization header is missing", 401);
      }

      if (!authHeader.startsWith("Bearer ")) {
        throw new AppError("Invalid authorization header format", 401);
      }

      const token = authHeader.substring("Bearer ".length).trim();

      if (!token) {
        throw new AppError("Access token is missing", 401);
      }

      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

      req.user = {
        userId: decoded.userId,
        role: decoded.role
      };

      if (allowedRoles && !allowedRoles.includes(decoded.role)) {
        throw new AppError("Forbidden", 403);
      }

      next();
    } catch (error) {
      if (
        error instanceof JsonWebTokenError ||
        error instanceof TokenExpiredError ||
        error instanceof NotBeforeError
      ) {
        return next(new AppError("Invalid or expired access token", 401));
      }

      return next(error);
    }
  };
};