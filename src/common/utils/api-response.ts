export type ApiSuccessResponse<T = unknown> = {
  success: true;
  message: string;
  data?: T;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
  errors?: unknown;
};

export const successResponse = <T>(
  message: string,
  data?: T
): ApiSuccessResponse<T> => ({
  success: true,
  message,
  data
});

export const errorResponse = (
  message: string,
  errors?: unknown
): ApiErrorResponse => ({
  success: false,
  message,
  errors
});