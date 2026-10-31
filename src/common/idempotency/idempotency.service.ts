import crypto from "crypto";
import { IdempotencyScope, Prisma } from "@prisma/client";
import { AppError } from "../utils/errors";
import { idempotencyRepository } from "./idempotency.repository";
import {
  IdempotencyExecutionResult,
  IdempotencyStoredResponse
} from "./idempotency.types";

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();

  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`)
    .join(",")}}`;
};

const createRequestHash = (payload: unknown): string => {
  return crypto
    .createHash("sha256")
    .update(stableStringify(payload))
    .digest("hex");
};

export const idempotencyService = {
  async execute<T>(params: {
    key: string;
    scope: IdempotencyScope;
    actorId: string;
    payload: unknown;
    execute: () => Promise<IdempotencyStoredResponse<T>>;
  }): Promise<IdempotencyExecutionResult<T>> {
    const requestHash = createRequestHash(params.payload);

    const existing = await idempotencyRepository.findByKey({
      key: params.key,
      scope: params.scope,
      actorId: params.actorId
    });

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new AppError(
          "Idempotency key already used with a different request payload",
          409
        );
      }

      return {
        fromCache: true,
        statusCode: existing.statusCode,
        response: existing.response as T
      };
    }

    const result = await params.execute();

    await idempotencyRepository.create({
      key: params.key,
      scope: params.scope,
      actorId: params.actorId,
      requestHash,
      statusCode: result.statusCode,
      response: result.response as Prisma.InputJsonValue
    });

    return {
      fromCache: false,
      statusCode: result.statusCode,
      response: result.response
    };
  }
};