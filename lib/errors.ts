export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_AUTH'
  | 'TRIP_CLOSED'
  | 'IDEMPOTENCY_KEY_REQUIRED'
  | 'INVALID_IDEMPOTENCY_KEY'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'UPLOAD_ERROR';

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    public statusCode: number,
    message: string,
    public fields?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: ErrorCode; message: string; fields?: Record<string, string> } };

export function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function err(code: ErrorCode, message: string, fields?: Record<string, string>): ApiResponse<never> {
  return { success: false, error: { code, message, ...(fields ? { fields } : {}) } };
}
