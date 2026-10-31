import { IdempotencyScope, Prisma } from "@prisma/client";
import { prisma } from "../../config/db";

export const idempotencyRepository = {
  findByKey(params: {
    key: string;
    scope: IdempotencyScope;
    actorId: string;
  }) {
    return prisma.idempotencyKey.findUnique({
      where: {
        key_scope_actorId: {
          key: params.key,
          scope: params.scope,
          actorId: params.actorId
        }
      }
    });
  },

  create(params: {
    key: string;
    scope: IdempotencyScope;
    actorId: string;
    requestHash: string;
    statusCode: number;
    response: Prisma.InputJsonValue;
  }) {
    return prisma.idempotencyKey.create({
      data: {
        key: params.key,
        scope: params.scope,
        actorId: params.actorId,
        requestHash: params.requestHash,
        statusCode: params.statusCode,
        response: params.response
      }
    });
  }
};