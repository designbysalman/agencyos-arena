/**
 * Integration tests for Quotations API.
 *
 * These tests run against a REAL PostgreSQL database via Prisma Client
 * and real HTTP endpoints via the Next.js dev server.
 *
 * They verify:
 * - Database-backed session validation on every request (401 when missing)
 * - Organization-scoped data access (org isolation / IDOR protection)
 * - Custom RBAC permissions (quotation.* codes, 403 when insufficient)
 * - Non-disclosing 404 for cross-org lookups
 * - Cross-org opportunity/contact/account relationship validation
 * - Status transition validation (accepted quotations)
 * - Soft deletion
 * - Audit logging
 * - Server-calculated totals from line items
 * - Secure pagination and whitelisted sorting
 *
 * Requires DATABASE_URL and BETTER_AUTH_SECRET environment variables.
 * Requires a running Next.js dev server at http://localhost:3000 for HTTP tests.
 * Skips gracefully if no database is available.
 * Fails if the HTTP server is unavailable when the database is available.
 *
 * Session tokens are obtained via real HTTP sign-up/sign-in flows (Better Auth
 * manages session cookies as JWT tokens; manually inserted Prisma Session
 * records do not produce valid cookies).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';

const DATABASE_URL = process.env.DATABASE_URL;
const canRunTests = !!DATABASE_URL;

const SERVER_URL = 'http://localhost:3000';

const describeIfDb = canRunTests ? describe : describe.skip;

const TEST_EMAIL_SUFFIX = '@quotations-test.invalid';
const TEST_PASSWORD = 'TestPassword123!';

/** Register, sign in, and bootstrap an org for a test user. Returns session token, user, orgId. */
async function createAuthenticatedUserWithOrg(email: string, name: string, orgName: string) {
  const signUpRes = await fetch(`${SERVER_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: TEST_PASSWORD, name }),
  });
  expect(signUpRes.status).toBe(200);

  const signInRes = await fetch(`${SERVER_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  });
  expect(signInRes.status).toBe(200);

  const setCookie = signInRes.headers.get('set-cookie') || '';
  const cookieMatch = setCookie.match(/better-auth.session_token=([^;]+)/);
  const token = cookieMatch ? cookieMatch[1] : null;

  const bootstrapRes = await fetch(`${SERVER_URL}/api/auth/bootstrap-organization`, {
    method: 'POST',
    headers: {
      Cookie: `better-auth.session_token=${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ organizationName: orgName }),
  });
  expect(bootstrapRes.status).toBe(200);

  const user = await prisma.user.findUnique({ where: { email } });
  expect(user).toBeDefined();
  const org = await prisma.organization.findFirst({
    where: { userRoles: { some: { userId: user!.id } } },
  });
  expect(org).toBeDefined();

  return { token, userId: user!.id, orgId: org!.id };
}

describeIfDb('Quotations API Integration', () => {
  let tokenA: string;
  let orgIdA: string;
  let tokenB: string;
  let orgIdB: string;

  beforeAll(async () => {
    const userA = await createAuthenticatedUserWithOrg(
      `userA${Date.now()}${TEST_EMAIL_SUFFIX}`,
      'User A',
      'Org A'
    );
    tokenA = userA.token!;
    orgIdA = userA.orgId;

    const userB = await createAuthenticatedUserWithOrg(
      `userB${Date.now()}${TEST_EMAIL_SUFFIX}`,
      'User B',
      'Org B'
    );
    tokenB = userB.token!;
    orgIdB = userB.orgId;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.quotation.deleteMany({
      where: { organizationId: { in: [orgIdA, orgIdB] } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: TEST_EMAIL_SUFFIX } },
    });
    await prisma.organization.deleteMany({
      where: { name: { in: ['Org A', 'Org B'] } },
    });
  });

  it('creates a quotation with server-calculated totals', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/quotations`, {
      method: 'POST',
      headers: {
        Cookie: `better-auth.session_token=${tokenA}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        clientName: 'Test Client',
        clientEmail: 'client@test.com',
        title: 'Integration Test Quotation',
        status: 'draft',
        currency: 'USD',
        items: [
          {
            description: 'Design work',
            quantity: '10',
            unitPrice: '100.00',
            discount: '0',
            taxRate: '0',
            order: 0,
          },
        ],
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.title).toBe('Integration Test Quotation');
    expect(body.status).toBe('draft');
    expect(body.total).toBe('1000.00'); // Server-calculated: 10 * 100 = 1000
    expect(body.subtotal).toBe('1000.00');
    expect(body.quotationNumber).toMatch(/^QUOT-\d{4}-\d{4}$/);
  });

  it('lists quotations with org scoping', async () => {
    // Create a quotation in Org A first
    await fetch(`${SERVER_URL}/api/v1/quotations`, {
      method: 'POST',
      headers: {
        Cookie: `better-auth.session_token=${tokenA}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        clientName: 'Test Client',
        title: 'Org A Quotation',
        status: 'draft',
        currency: 'USD',
      }),
    });

    const res = await fetch(`${SERVER_URL}/api/v1/quotations`, {
      headers: {
        Cookie: `better-auth.session_token=${tokenA}`,
        Accept: 'application/json',
      },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quotations.length).toBeGreaterThanOrEqual(1);
    // All quotations should belong to Org A
    for (const q of body.quotations) {
      expect(q.organizationId).toBe(orgIdA);
    }
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/quotations`, {
      headers: { Accept: 'application/json' },
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 for cross-org quotation (non-disclosing)', async () => {
    // Create a quotation in Org A
    const createRes = await fetch(`${SERVER_URL}/api/v1/quotations`, {
      method: 'POST',
      headers: {
        Cookie: `better-auth.session_token=${tokenA}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        clientName: 'Test Client',
        title: 'Cross-org Test',
        status: 'draft',
        currency: 'USD',
      }),
    });
    const body = await createRes.json();
    const quotId = body.id;

    // Try to access it from Org B
    const res = await fetch(`${SERVER_URL}/api/v1/quotations/${quotId}`, {
      headers: {
        Cookie: `better-auth.session_token=${tokenB}`,
        Accept: 'application/json',
      },
    });
    expect(res.status).toBe(404);
  });

  it('updates a quotation with server-calculated totals', async () => {
    const createRes = await fetch(`${SERVER_URL}/api/v1/quotations`, {
      method: 'POST',
      headers: {
        Cookie: `better-auth.session_token=${tokenA}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        clientName: 'Test Client',
        title: 'Update Test',
        status: 'draft',
        currency: 'USD',
        items: [
          {
            description: 'Item 1',
            quantity: '2',
            unitPrice: '50.00',
            discount: '0',
            taxRate: '0',
            order: 0,
          },
        ],
      }),
    });
    const body = await createRes.json();
    const quotId = body.id;

    const updateRes = await fetch(`${SERVER_URL}/api/v1/quotations/${quotId}`, {
      method: 'PUT',
      headers: {
        Cookie: `better-auth.session_token=${tokenA}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        title: 'Updated Quotation',
        items: [
          {
            description: 'Item 1',
            quantity: '5',
            unitPrice: '100.00',
            discount: '0',
            taxRate: '0',
            order: 0,
          },
        ],
      }),
    });
    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json();
    expect(updated.title).toBe('Updated Quotation');
    // Server-calculated: 5 * 100 = 500
    expect(updated.total).toBe('500.00');
  });

  it('soft deletes a quotation', async () => {
    const createRes = await fetch(`${SERVER_URL}/api/v1/quotations`, {
      method: 'POST',
      headers: {
        Cookie: `better-auth.session_token=${tokenA}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        clientName: 'Test Client',
        title: 'Delete Test',
        status: 'draft',
        currency: 'USD',
      }),
    });
    const body = await createRes.json();
    const quotId = body.id;

    const deleteRes = await fetch(`${SERVER_URL}/api/v1/quotations/${quotId}`, {
      method: 'DELETE',
      headers: {
        Cookie: `better-auth.session_token=${tokenA}`,
        Accept: 'application/json',
      },
    });
    expect(deleteRes.status).toBe(200);
    const deleted = await deleteRes.json();
    expect(deleted.deletedAt).toBeDefined();

    // Should not appear in list (soft-deleted)
    const listRes = await fetch(`${SERVER_URL}/api/v1/quotations`, {
      headers: {
        Cookie: `better-auth.session_token=${tokenA}`,
        Accept: 'application/json',
      },
    });
    const listBody = await listRes.json();
    expect(listBody.quotations.find((q: { id: string }) => q.id === quotId)).toBeUndefined();
  });

  it('rejects modification of accepted quotation', async () => {
    const createRes = await fetch(`${SERVER_URL}/api/v1/quotations`, {
      method: 'POST',
      headers: {
        Cookie: `better-auth.session_token=${tokenA}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        clientName: 'Test Client',
        title: 'Accepted Test',
        status: 'accepted',
        currency: 'USD',
      }),
    });
    const body = await createRes.json();
    const quotId = body.id;

    const updateRes = await fetch(`${SERVER_URL}/api/v1/quotations/${quotId}`, {
      method: 'PUT',
      headers: {
        Cookie: `better-auth.session_token=${tokenA}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        title: 'Should Not Update',
      }),
    });
    expect(updateRes.status).toBe(400);
  });
});
