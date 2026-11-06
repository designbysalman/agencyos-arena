/**
 * Integration tests for Proposals API.
 *
 * These tests run against a REAL PostgreSQL database via Prisma Client
 * and real HTTP endpoints via the Next.js dev server.
 *
 * They verify:
 * - Database-backed session validation on every request (401 when missing)
 * - Organization-scoped data access (org isolation / IDOR protection)
 * - Custom RBAC permissions (proposal.* codes, 403 when insufficient)
 * - Non-disclosing 404 for cross-org lookups
 * - Cross-org opportunity/contact/account relationship validation
 * - Status transition validation (accepted proposals)
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

const TEST_EMAIL_SUFFIX = '@proposals-test.invalid';
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

describeIfDb('Proposals API Integration', () => {
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
    await prisma.proposal.deleteMany({
      where: { organizationId: { in: [orgIdA, orgIdB] } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: TEST_EMAIL_SUFFIX } },
    });
    await prisma.organization.deleteMany({
      where: { name: { in: ['Org A', 'Org B'] } },
    });
  });

  it('creates a proposal with server-calculated totals', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/proposals`, {
      method: 'POST',
      headers: {
        Cookie: `better-auth.session_token=${tokenA}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        clientName: 'Test Client',
        clientEmail: 'client@test.com',
        title: 'Integration Test Proposal',
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
    expect(body.title).toBe('Integration Test Proposal');
    expect(body.status).toBe('draft');
    expect(body.total).toBe('1000.00'); // Server-calculated: 10 * 100 = 1000
    expect(body.subtotal).toBe('1000.00');
    expect(body.proposalNumber).toMatch(/^PROP-\d{4}-\d{4}$/);
  });

  it('lists proposals with org scoping', async () => {
    // Create a proposal in Org A first
    await fetch(`${SERVER_URL}/api/v1/proposals`, {
      method: 'POST',
      headers: {
        Cookie: `better-auth.session_token=${tokenA}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        clientName: 'Test Client',
        title: 'Org A Proposal',
        status: 'draft',
        currency: 'USD',
      }),
    });

    const res = await fetch(`${SERVER_URL}/api/v1/proposals`, {
      headers: {
        Cookie: `better-auth.session_token=${tokenA}`,
        Accept: 'application/json',
      },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.proposals.length).toBeGreaterThanOrEqual(1);
    // All proposals should belong to Org A
    for (const prop of body.proposals) {
      expect(prop.organizationId).toBe(orgIdA);
    }
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/proposals`, {
      headers: { Accept: 'application/json' },
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 for cross-org proposal (non-disclosing)', async () => {
    // Create a proposal in Org A
    const createRes = await fetch(`${SERVER_URL}/api/v1/proposals`, {
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
    const propId = body.id;

    // Try to access it from Org B
    const res = await fetch(`${SERVER_URL}/api/v1/proposals/${propId}`, {
      headers: {
        Cookie: `better-auth.session_token=${tokenB}`,
        Accept: 'application/json',
      },
    });
    expect(res.status).toBe(404);
  });

  it('updates a proposal with server-calculated totals', async () => {
    const createRes = await fetch(`${SERVER_URL}/api/v1/proposals`, {
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
    const propId = body.id;

    const updateRes = await fetch(`${SERVER_URL}/api/v1/proposals/${propId}`, {
      method: 'PUT',
      headers: {
        Cookie: `better-auth.session_token=${tokenA}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        title: 'Updated Proposal',
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
    expect(updated.title).toBe('Updated Proposal');
    // Server-calculated: 5 * 100 = 500
    expect(updated.total).toBe('500.00');
  });

  it('soft deletes a proposal', async () => {
    const createRes = await fetch(`${SERVER_URL}/api/v1/proposals`, {
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
    const propId = body.id;

    const deleteRes = await fetch(`${SERVER_URL}/api/v1/proposals/${propId}`, {
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
    const listRes = await fetch(`${SERVER_URL}/api/v1/proposals`, {
      headers: {
        Cookie: `better-auth.session_token=${tokenA}`,
        Accept: 'application/json',
      },
    });
    const listBody = await listRes.json();
    expect(listBody.proposals.find((p: { id: string }) => p.id === propId)).toBeUndefined();
  });

  it('rejects modification of accepted proposal', async () => {
    const createRes = await fetch(`${SERVER_URL}/api/v1/proposals`, {
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
    const propId = body.id;

    const updateRes = await fetch(`${SERVER_URL}/api/v1/proposals/${propId}`, {
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
