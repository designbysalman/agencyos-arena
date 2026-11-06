/** AgencyOS — Database health check and connection diagnostics.
 *
 * Provides a lightweight way to verify that PostgreSQL is reachable before
 * the app serves requests, plus helpers to classify database errors for
 * safe user-facing handling.
 *
 * Used by the Codespaces startup script, health-check endpoint, and API
 * error boundary.
 */

import { prisma } from '@/lib/db';

/** Prisma error codes that indicate the database is unreachable. */
const DB_CONNECT_ERROR_CODES = new Set([
  'P1001', // Can't reach database server
  'P1008', // Database connection deadline exceeded
  'P1009', // Database connection already closed
  'P1010', // Failed to parse connection string
]);

/** Raw Node error codes that indicate connection refusal. */
const DB_CONNECT_ERRNO_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ENETUNREACH',
]);

/** Result of a database health check. */
export interface DbHealthResult {
  healthy: boolean;
  latencyMs?: number;
  error?: string;
}

/** Check whether PostgreSQL is reachable by running a trivial query. */
export async function checkDbHealth(): Promise<DbHealthResult> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { healthy: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      healthy: false,
      error: classifyDbError(err),
    };
  }
}

/** Classify a database error into a safe, user-facing message. */
export function classifyDbError(err: unknown): string {
  const errorObj = err as Record<string, unknown> | undefined;
  if (err instanceof Error) {
    const errnoCode = (errorObj?.code ?? '') as string;
    if (DB_CONNECT_ERRNO_CODES.has(errnoCode)) {
      return 'database_unavailable';
    }
    if (typeof errorObj?.code === 'string' && DB_CONNECT_ERROR_CODES.has(errorObj.code)) {
      return 'database_unavailable';
    }
    if (
      err.message.includes('ECONNREFUSED') ||
      err.message.includes('connect ECONNREFUSED') ||
      err.message.includes('database server') ||
      err.message.includes('connection deadline')
    ) {
      return 'database_unavailable';
    }
  }
  return 'database_error';
}

/** Determine whether an error is a database connectivity problem. */
export function isDbUnavailableError(err: unknown): boolean {
  return classifyDbError(err) === 'database_unavailable';
}

/** Safe, user-facing message for a database-unavailable error. Never leaks
 * connection strings, hostnames, ports, or credentials. */
export const DB_UNAVAILABLE_MESSAGE =
  'The database is temporarily unavailable. Please try again in a moment.';
