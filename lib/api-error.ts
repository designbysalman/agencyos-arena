/** AgencyOS — Safe API error handling for route handlers.
 *
 * Wraps Next.js route handler functions so that database connectivity
 * errors are logged server-side with full detail but returned to the
 * client as a safe, non-disclosing 503 response.
 *
 * Authentication (401), authorization (403), and not-found (404) errors
 * keep their existing status codes and messages.
 *
 * Usage:
 *   export const GET = withDbErrorHandling(async (request) => {
 *     // ... handler logic
 *   });
 */

import { NextResponse } from 'next/server';

import { isDbUnavailableError, DB_UNAVAILABLE_MESSAGE } from '@/lib/db-health';

/** Shape of an error that may carry a status code. */
type StatusError = Error & { statusCode?: number };

/** Log a database error server-side with full detail (for debugging). */
function logDbError(err: unknown, context?: string): void {
  const timestamp = new Date().toISOString();
  const prefix = context ? `[api-error:${context}]` : '[api-error]';
  console.error(
    `${prefix} Database error at ${timestamp}:`,
    err instanceof Error
      ? {
          name: err.name,
          message: err.message,
          code: (err as unknown as Record<string, unknown>).code,
          stack: err.stack,
        }
      : err
  );
}

/** Handle an error from a route handler and return a safe response. */
export function handleApiError(
  err: unknown,
  context?: string
): ReturnType<typeof NextResponse.json> {
  const statusError = err as StatusError;
  const statusCode = statusError.statusCode;

  // Database connectivity errors -> 503, safe message, full detail in logs
  if (isDbUnavailableError(err)) {
    logDbError(err, context);
    return NextResponse.json(
      { error: DB_UNAVAILABLE_MESSAGE, code: 'database_unavailable' },
      { status: 503 }
    );
  }

  // Known status codes (401, 403, 400, 404, etc.) -> pass through
  if (statusCode && statusCode >= 400 && statusCode < 600) {
    const message =
      statusCode === 401
        ? 'Unauthenticated'
        : statusCode === 403
          ? 'Forbidden'
          : statusCode === 404
            ? 'Not found'
            : statusError.message || 'Request failed';
    return NextResponse.json({ error: message }, { status: statusCode });
  }

  // Unexpected errors -> 500, safe message, log server-side
  logDbError(err, context);
  return NextResponse.json(
    { error: 'Internal server error', code: 'internal_error' },
    { status: 500 }
  );
}

/** Wrap an async route handler with safe database error handling.
 *
 * The wrapped function receives the same arguments as the original handler.
 * Any error thrown is converted to a safe response via handleApiError.
 */
export function withDbErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<ReturnType<typeof NextResponse.json>>,
  context?: string
): (...args: T) => Promise<ReturnType<typeof NextResponse.json>> {
  return async (...args: T): Promise<ReturnType<typeof NextResponse.json>> => {
    try {
      return await handler(...args);
    } catch (err) {
      return handleApiError(err, context);
    }
  };
}
