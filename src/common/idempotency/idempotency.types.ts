export type IdempotencyStoredResponse<T = unknown> = {
  statusCode: number;
  response: T;
};

export type IdempotencyExecutionResult<T = unknown> = {
  fromCache: boolean;
  statusCode: number;
  response: T;
};