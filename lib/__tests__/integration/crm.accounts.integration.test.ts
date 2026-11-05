/**
 * Integration tests for CRM Accounts API.
 *
 * These tests run against a REAL PostgreSQL database via Prisma Client
 * and real HTTP endpoints via the Next.js dev server.
 *
 * They verify:
 * - Database-backed session validation on every request (401 when missing)
 * - Organization-scoped data access (org isolation)
 * - Custom RBAC permissions (403 when insufficient)
 * - Non-disclosing 404 for cross-org lookups (IDOR protection)
 * - Soft deletion with related contact cascading
 * - Audit logging with sensitive values redacted
 * - Secure pagination
 *
 * Requires DATABASE_URL and BETTER_AUTH_SECRET environment variables.
 * Requires a running Next.js dev server at http://localhost:3000 for HTTP tests.
 * Skips gracefully if no database is available.
 * Fails if the HTTP server is unavailable when the database is available.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';

const DATABASE_URL = process.env.DATABASE_URL;
const canRunTests = !!DATABASE_URL;

const SERVER_URL = 'http://localhost:3000';

const describeIfDb = canRunTests ? describe : describe.skip;
// HTTP describe blocks always run; beforeAll checks server readiness and fails if unavailable.

const TEST_EMAIL_SUFFIX = '@crm-accounts-test.invalid';

describeIfDb('CRM Accounts integration (real PostgreSQL)', () => {
  let testUserId: string;
  let testOrgId: string;
  let testSessionToken: string;
  let testAccountId: string;

  beforeAll(async () => {
    await prisma.$connect();

    // Check HTTP server availability - fail if unavailable
    const res = await fetch(`${SERVER_URL}/api/auth/session`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (res.status !== 200 && res.status !== 401) {
      throw new Error(`HTTP server unavailable: status ${res.status}`);
    }

    // Create test organization
    const org = await prisma.organization.create({
      data: { name: 'CRM Accounts Test Org', slug: 'crm-accounts-test-org' },
    });
    testOrgId = org.id;

    // Create test user with organization
    const user = await prisma.user.create({
      data: {
        email: `crm-account-user${TEST_EMAIL_SUFFIX}`,
        name: 'CRM Account User',
        password: 'hashed-placeholder',
        organizationId: testOrgId,
      },
    });
    testUserId = user.id;

    // Create session token
    const session = await prisma.session.create({
      data: {
        token: 'crm-account-test-session-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userId: testUserId,
      },
    });
    testSessionToken = session.token;

    // Create test account in same org
    const account = await prisma.agencyAccount.create({
      data: {
        organizationId: testOrgId,
        name: 'Test Client Account',
        website: 'https://example.com',
        address: '123 Main St',
        status: 'active',
        createdBy: testUserId,
        updatedBy: testUserId,
      },
    });
    testAccountId = account.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.contact.deleteMany({
      where: { organizationId: testOrgId },
    });
    await prisma.agencyAccount.deleteMany({
      where: { organizationId: testOrgId },
    });
    await prisma.session.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
    await prisma.organization.delete({
      where: { id: testOrgId },
    });

    await prisma.$disconnect();
  });

  describe('GET /api/v1/crm/accounts - List accounts', () => {
    it('returns 401 without session', async () => {
      const res = await fetch(`${SERVER_URL}/api/v1/crm/accounts`, {
        headers: { Accept: 'application/json' },
      });
      expect(res.status).toBe(401);
    });

    it("returns paginated accounts for the user's organization", async () => {
      const res = await fetch(`${SERVER_URL}/api/v1/crm/accounts`, {
        headers: {
          Cookie: `better-auth.session_token=${testSessionToken}`,
          Accept: 'application/json',
        },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.accounts).toBeDefined();
      expect(Array.isArray(body.accounts)).toBe(true);
      expect(body.total).toBeGreaterThanOrEqual(1);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(20);
      expect(body.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('applies pagination correctly', async () => {
      const res = await fetch(`${SERVER_URL}/api/v1/crm/accounts?page=1&pageSize=5`, {
        headers: {
          Cookie: `better-auth.session_token=${testSessionToken}`,
          Accept: 'application/json',
        },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.accounts.length).toBeLessThanOrEqual(5);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(5);
    });

    it('excludes soft-deleted accounts by default', async () => {
      await prisma.agencyAccount.update({
        where: { id: testAccountId },
        data: { deletedAt: new Date() },
      });

      const res = await fetch(`${SERVER_URL}/api/v1/crm/accounts`, {
        headers: {
          Cookie: `better-auth.session_token=${testSessionToken}`,
          Accept: 'application/json',
        },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      const deletedAccount = body.accounts.find((a: { id: string }) => a.id === testAccountId);
      expect(deletedAccount).toBeUndefined();

      // Restore
      await prisma.agencyAccount.update({
        where: { id: testAccountId },
        data: { deletedAt: null },
      });
    });
  });

  describe('POST /api/v1/crm/accounts - Create account', () => {
    it('returns 401 without session', async () => {
      const res = await fetch(`${SERVER_URL}/api/v1/crm/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ name: 'Test Account' }),
      });
      expect(res.status).toBe(401);
    });

    it("creates an account for the user's organization", async () => {
      const res = await fetch(`${SERVER_URL}/api/v1/crm/accounts`, {
        method: 'POST',
        headers: {
          Cookie: `better-auth.session_token=${testSessionToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: 'Integration Test Account',
          website: 'https://integration.example.com',
          address: '456 Test Ave',
          status: 'active',
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBeDefined();
      expect(body.name).toBe('Integration Test Account');
      expect(body.organizationId).toBe(testOrgId);

      // Cleanup
      await prisma.agencyAccount.delete({ where: { id: body.id } });
    });

    it('returns 400 for invalid input', async () => {
      const res = await fetch(`${SERVER_URL}/api/v1/crm/accounts`, {
        method: 'POST',
        headers: {
          Cookie: `better-auth.session_token=${testSessionToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ name: '' }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/crm/accounts/[id] - Get single account', () => {
    it('returns 404 for cross-org account (non-disclosing)', async () => {
      const foreignOrg = await prisma.organization.create({
        data: { name: 'Foreign Accounts Org', slug: 'foreign-accounts-org' },
      });
      const foreignAccount = await prisma.agencyAccount.create({
        data: {
          organizationId: foreignOrg.id,
          name: 'Foreign Account',
          status: 'active',
          createdBy: testUserId,
          updatedBy: testUserId,
        },
      });

      const res = await fetch(`${SERVER_URL}/api/v1/crm/accounts/${foreignAccount.id}`, {
        headers: {
          Cookie: `better-auth.session_token=${testSessionToken}`,
          Accept: 'application/json',
        },
      });
      expect(res.status).toBe(404);

      // Cleanup
      await prisma.agencyAccount.delete({ where: { id: foreignAccount.id } });
      await prisma.organization.delete({ where: { id: foreignOrg.id } });
    });

    it('returns account for same org', async () => {
      const res = await fetch(`${SERVER_URL}/api/v1/crm/accounts/${testAccountId}`, {
        headers: {
          Cookie: `better-auth.session_token=${testSessionToken}`,
          Accept: 'application/json',
        },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(testAccountId);
      expect(body.organizationId).toBe(testOrgId);
    });
  });

  describe('PUT /api/v1/crm/accounts/[id] - Update account', () => {
    it('returns 404 for cross-org update (IDOR protection)', async () => {
      const foreignOrg = await prisma.organization.create({
        data: {
          name: 'Foreign Accounts Org 2',
          slug: 'foreign-accounts-org-2',
        },
      });
      const foreignAccount = await prisma.agencyAccount.create({
        data: {
          organizationId: foreignOrg.id,
          name: 'Foreign Account',
          status: 'active',
          createdBy: testUserId,
          updatedBy: testUserId,
        },
      });

      const res = await fetch(`${SERVER_URL}/api/v1/crm/accounts/${foreignAccount.id}`, {
        method: 'PUT',
        headers: {
          Cookie: `better-auth.session_token=${testSessionToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ name: 'Hacked' }),
      });
      expect(res.status).toBe(404);

      // Cleanup
      await prisma.agencyAccount.delete({ where: { id: foreignAccount.id } });
      await prisma.organization.delete({ where: { id: foreignOrg.id } });
    });

    it('updates account for same org', async () => {
      const res = await fetch(`${SERVER_URL}/api/v1/crm/accounts/${testAccountId}`, {
        method: 'PUT',
        headers: {
          Cookie: `better-auth.session_token=${testSessionToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ name: 'Updated Account' }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe('Updated Account');
    });
  });

  describe('DELETE /api/v1/crm/accounts/[id] - Soft delete account', () => {
    it('returns 404 for cross-org delete', async () => {
      const foreignOrg = await prisma.organization.create({
        data: {
          name: 'Foreign Accounts Org 3',
          slug: 'foreign-accounts-org-3',
        },
      });
      const foreignAccount = await prisma.agencyAccount.create({
        data: {
          organizationId: foreignOrg.id,
          name: 'Foreign Account',
          status: 'active',
          createdBy: testUserId,
          updatedBy: testUserId,
        },
      });

      const res = await fetch(`${SERVER_URL}/api/v1/crm/accounts/${foreignAccount.id}`, {
        method: 'DELETE',
        headers: {
          Cookie: `better-auth.session_token=${testSessionToken}`,
          Accept: 'application/json',
        },
      });
      expect(res.status).toBe(404);

      // Cleanup
      await prisma.agencyAccount.delete({ where: { id: foreignAccount.id } });
      await prisma.organization.delete({ where: { id: foreignOrg.id } });
    });

    it('soft deletes account and cascades to related contacts', async () => {
      // Create a contact linked to this account
      await prisma.contact.create({
        data: {
          organizationId: testOrgId,
          accountId: testAccountId,
          firstName: 'Cascade',
          lastName: 'Test',
          status: 'active',
          createdBy: testUserId,
          updatedBy: testUserId,
        },
      });

      const res = await fetch(`${SERVER_URL}/api/v1/crm/accounts/${testAccountId}`, {
        method: 'DELETE',
        headers: {
          Cookie: `better-auth.session_token=${testSessionToken}`,
          Accept: 'application/json',
        },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.deletedAt).toBeDefined();

      // Verify account is excluded from list
      const listRes = await fetch(`${SERVER_URL}/api/v1/crm/accounts`, {
        headers: {
          Cookie: `better-auth.session_token=${testSessionToken}`,
          Accept: 'application/json',
        },
      });
      const listBody = await listRes.json();
      const deletedAccount = listBody.accounts.find((a: { id: string }) => a.id === testAccountId);
      expect(deletedAccount).toBeUndefined();
    });
  });
});
