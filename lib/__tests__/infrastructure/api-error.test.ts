/** Unit tests for API error handling.
 *
 * Verifies that database connectivity errors produce safe 503 responses
 * with full detail logged server-side, while 401/403/404 errors pass
 * through with their original status codes and messages.
 * No database is required - these mock NextResponse and test pure logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma client so db-health (imported by api-error) can be loaded
vi.mock('@/lib/db', () => ({ prisma: {} }));

// Mock NextResponse before importing the module under test
const jsonMock = vi.fn();
vi.mock('next/server', () => ({
  NextResponse: {
    json: (...args: unknown[]) => {
      jsonMock(...args);
      return {
        status: (args[1] as { status?: number } | undefined)?.status ?? 200,
        body: args[0],
      };
    },
  },
}));

import { handleApiError } from '@/lib/api-error';

type MockResponse = { status: number; body: unknown };

describe('handleApiError', () => {
  beforeEach(() => {
    jsonMock.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns 503 with safe message for ECONNREFUSED errors', () => {
    const err = new Error('connect ECONNREFUSED 127.0.0.1:5433');
    (err as unknown as Record<string, unknown>).code = 'ECONNREFUSED';

    const result = handleApiError(err, 'proposals.list') as unknown as MockResponse;

    expect(result.status).toBe(503);
    const body = result.body as Record<string, unknown>;
    expect(body.error).toBe(
      'The database is temporarily unavailable. Please try again in a moment.'
    );
    expect(body.code).toBe('database_unavailable');
    // Must not leak connection details
    expect(JSON.stringify(body)).not.toContain('127.0.0.1');
    expect(JSON.stringify(body)).not.toContain('5433');
    expect(JSON.stringify(body)).not.toContain('ECONNREFUSED');
  });

  it('returns 503 with safe message for Prisma P1001 errors', () => {
    const err = new Error("Can't reach database server");
    (err as unknown as Record<string, unknown>).code = 'P1001';

    const result = handleApiError(err, 'proposals.create') as unknown as MockResponse;

    expect(result.status).toBe(503);
    const body = result.body as Record<string, unknown>;
    expect(body.code).toBe('database_unavailable');
  });

  it('returns 401 for unauthenticated errors', () => {
    const err = new Error('Missing session') as Error & { statusCode?: number };
    err.statusCode = 401;

    const result = handleApiError(err, 'proposals.list') as unknown as MockResponse;

    expect(result.status).toBe(401);
    const body = result.body as Record<string, unknown>;
    expect(body.error).toBe('Unauthenticated');
  });

  it('returns 403 for forbidden errors', () => {
    const err = new Error('Insufficient permissions') as Error & {
      statusCode?: number;
    };
    err.statusCode = 403;

    const result = handleApiError(err, 'proposals.update') as unknown as MockResponse;

    expect(result.status).toBe(403);
    const body = result.body as Record<string, unknown>;
    expect(body.error).toBe('Forbidden');
  });

  it('returns 404 for not found errors', () => {
    const err = new Error('Proposal not found') as Error & { statusCode?: number };
    err.statusCode = 404;

    const result = handleApiError(err, 'proposals.get') as unknown as MockResponse;

    expect(result.status).toBe(404);
    const body = result.body as Record<string, unknown>;
    expect(body.error).toBe('Not found');
  });

  it('returns 500 for unexpected errors and logs them', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('Unexpected boom');

    const result = handleApiError(err, 'proposals.list') as unknown as MockResponse;

    expect(result.status).toBe(500);
    const body = result.body as Record<string, unknown>;
    expect(body.error).toBe('Internal server error');
    expect(body.code).toBe('internal_error');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('passes through custom error messages for non-standard status codes', () => {
    const err = new Error('Custom conflict message') as Error & {
      statusCode?: number;
    };
    err.statusCode = 409;

    const result = handleApiError(err, 'proposals.get') as unknown as MockResponse;

    expect(result.status).toBe(409);
    const body = result.body as Record<string, unknown>;
    expect(body.error).toBe('Custom conflict message');
  });
});
