/** Unit tests for database health check and error classification.
 *
 * Verifies that database connectivity errors are correctly classified
 * and produce safe, non-disclosing messages for clients.
 * No database is required - these are pure function tests.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock Prisma client so db-health can be imported without a generated client
vi.mock('@/lib/db', () => ({ prisma: {} }));

import { classifyDbError, isDbUnavailableError, DB_UNAVAILABLE_MESSAGE } from '@/lib/db-health';

describe('classifyDbError', () => {
  it('returns database_unavailable for ECONNREFUSED errno', () => {
    const err = new Error('connect ECONNREFUSED 127.0.0.1:5433');
    (err as unknown as Record<string, unknown>).code = 'ECONNREFUSED';
    expect(classifyDbError(err)).toBe('database_unavailable');
  });

  it('returns database_unavailable for ECONNRESET errno', () => {
    const err = new Error('read ECONNRESET');
    (err as unknown as Record<string, unknown>).code = 'ECONNRESET';
    expect(classifyDbError(err)).toBe('database_unavailable');
  });

  it('returns database_unavailable for ETIMEDOUT errno', () => {
    const err = new Error('connect ETIMEDOUT 127.0.0.1:5433');
    (err as unknown as Record<string, unknown>).code = 'ETIMEDOUT';
    expect(classifyDbError(err)).toBe('database_unavailable');
  });

  it('returns database_unavailable for Prisma P1001 code', () => {
    const err = new Error("PrismaClientKnownRequestError: Can't reach database server");
    (err as unknown as Record<string, unknown>).code = 'P1001';
    expect(classifyDbError(err)).toBe('database_unavailable');
  });

  it('returns database_unavailable for Prisma P1008 code', () => {
    const err = new Error('PrismaClientKnownRequestError: connection deadline exceeded');
    (err as unknown as Record<string, unknown>).code = 'P1008';
    expect(classifyDbError(err)).toBe('database_unavailable');
  });

  it('returns database_unavailable for message containing ECONNREFUSED', () => {
    const err = new Error('connect ECONNREFUSED localhost:5433');
    expect(classifyDbError(err)).toBe('database_unavailable');
  });

  it('returns database_error for unrelated errors', () => {
    const err = new Error('Something went wrong');
    expect(classifyDbError(err)).toBe('database_error');
  });

  it('returns database_error for plain strings', () => {
    expect(classifyDbError('some string error')).toBe('database_error');
  });

  it('returns database_error for null/undefined', () => {
    expect(classifyDbError(null)).toBe('database_error');
    expect(classifyDbError(undefined)).toBe('database_error');
  });
});

describe('isDbUnavailableError', () => {
  it('returns true for database unavailable errors', () => {
    const err = new Error('connect ECONNREFUSED');
    (err as unknown as Record<string, unknown>).code = 'ECONNREFUSED';
    expect(isDbUnavailableError(err)).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    const err = new Error('Not found');
    expect(isDbUnavailableError(err)).toBe(false);
  });
});

describe('DB_UNAVAILABLE_MESSAGE', () => {
  it('is a safe, non-disclosing message', () => {
    expect(DB_UNAVAILABLE_MESSAGE).toBe(
      'The database is temporarily unavailable. Please try again in a moment.'
    );
    // Must not contain connection details
    expect(DB_UNAVAILABLE_MESSAGE).not.toContain('localhost');
    expect(DB_UNAVAILABLE_MESSAGE).not.toContain('5433');
    expect(DB_UNAVAILABLE_MESSAGE).not.toContain('postgresql');
    expect(DB_UNAVAILABLE_MESSAGE).not.toContain('password');
  });
});
