import type { ApiErrorEnvelope } from '../../src/shared/ranking-api';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;

  constructor(status: number, code: string, message: string, retryable = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

export function errorResponse(error: ApiError): Response {
  const body: ApiErrorEnvelope = {
    error: {
      code: error.code,
      message: error.message,
      retryable: error.retryable
    }
  };
  return jsonResponse(body, error.status);
}

export function internalErrorResponse(): Response {
  return errorResponse(new ApiError(
    500,
    'INTERNAL_ERROR',
    'The ranking service could not complete the request.',
    true
  ));
}
