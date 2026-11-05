/**
 * Integration tests for Organization Bootstrap API.
 *
 * These tests run against a REAL PostgreSQL database via Prisma Client
 * and real HTTP endpoints via the Next.js dev server.
 *
 * They verify:
 * - Successful organization bootstrap after registration
 * - Idempotent behavior on repeated bootstrap requests (409)
 * - Concurrent bootstrap attempts (only one succeeds)
 * - Database-backed session validation (401 when missing)
 * - CRM permissions assigned to the admin role
 * - User linked to the organization
 *
 * Requires DATABASE_URL and BETTER_AUTH_SECRET environment variables.
 * Requires a running Next.js dev server at http://localhost:3000 for HTTP tests.
 * Skips gracefully if no database is available.
 * Fails if the HTTP server is unavailable when the database is available.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/db';

const DATABASE_URL = process.env.DATABASE_URL;
const canRunTests = !!DATABASE_URL;

const SERVER_URL = 'http://localhost:3000';

const describeIfDb = canRunTests ? describe : describe.skip;
// HTTP describe blocks always run; beforeAll checks server readiness and fails if unavailable.

const TEST_EMAIL_SUFFIX = '@bootstrap-test.invalid';

describeIfDb('Organization Bootstrap integration (real PostgreSQL)', () => {
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
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/bootstrap-organization', () => {
    let bootstrapUserId: string | null;
    let bootstrapSessionToken: string | null;
    let bootstrapOrgId: string | null;

    beforeEach(async () => {
      bootstrapUserId = null;
      bootstrapSessionToken = null;
      bootstrapOrgId = null;
    });

    afterEach(async () => {
      // Clean up any test data created during the test
      if (bootstrapOrgId) {
        await prisma.userRole.deleteMany({
          where: { organizationId: bootstrapOrgId },
        });
        await prisma.role.deleteMany({
          where: { organizationId: bootstrapOrgId },
        });
        await prisma.permission.deleteMany({
          where: {
            code: {
              in: [
                'contact.create',
                'contact.read',
                'contact.update',
                'contact.delete',
                'account.create',
                'account.read',
                'account.update',
                'account.delete',
              ],
            },
          },
        });
        await prisma.organizationAccount.deleteMany({
          where: { organizationId: bootstrapOrgId },
        });
        await prisma.agencyAccount.deleteMany({
          where: { organizationId: bootstrapOrgId },
        });
        await prisma.organization.delete({ where: { id: bootstrapOrgId } });
      }
      if (bootstrapUserId) {
        await prisma.session.deleteMany({ where: { userId: bootstrapUserId } });
        await prisma.user.delete({ where: { id: bootstrapUserId } });
      }
    });

    it('returns 401 without a valid session', async () => {
      const res = await fetch(`${SERVER_URL}/api/auth/bootstrap-organization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ organizationName: 'Test Org' }),
      });
      expect(res.status).toBe(401);
    });

    it('creates an organization, assigns admin role with CRM permissions, and links user', async () => {
      // Create a test user without an organization
      const user = await prisma.user.create({
        data: {
          email: `bootstrap-user-${Date.now()}${TEST_EMAIL_SUFFIX}`,
          name: 'Bootstrap Test User',
          password: 'hashed-placeholder',
          organizationId: null,
        },
      });
      bootstrapUserId = user.id;

      // Create a session for the user
      const session = await prisma.session.create({
        data: {
          token: `bootstrap-session-${Date.now()}`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userId: user.id,
        },
      });
      bootstrapSessionToken = session.token;

      const res = await fetch(`${SERVER_URL}/api/auth/bootstrap-organization`, {
        method: 'POST',
        headers: {
          Cookie: `better-auth.session_token=${bootstrapSessionToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ organizationName: 'Bootstrap Test Org' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.organization.id).toBeDefined();
      expect(body.organization.name).toBe('Bootstrap Test Org');
      expect(body.organization.slug).toBeDefined();
      expect(body.user.organizationId).toBe(body.organization.id);
      bootstrapOrgId = body.organization.id;

      // Verify user is linked to the organization
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { organizationId: true },
      });
      expect(updatedUser?.organizationId).toBe(body.organization.id);

      // Verify CRM permissions exist and are assigned to the admin role
      const role = await prisma.role.findFirst({
        where: { organizationId: body.organization.id, isSystem: true },
        include: {
          permissions: { include: { permission: true } },
        },
      });
      expect(role).toBeDefined();
      const permissionCodes = role?.permissions.map(
        (rp: { permission: { code: string } }) => rp.permission.code
      );
      expect(permissionCodes).toContain('contact.create');
      expect(permissionCodes).toContain('contact.read');
      expect(permissionCodes).toContain('contact.update');
      expect(permissionCodes).toContain('contact.delete');
      expect(permissionCodes).toContain('account.create');
      expect(permissionCodes).toContain('account.read');
      expect(permissionCodes).toContain('account.update');
      expect(permissionCodes).toContain('account.delete');

      // Verify user-role assignment
      const userRole = await prisma.userRole.findFirst({
        where: { userId: user.id, organizationId: body.organization.id },
      });
      expect(userRole).toBeDefined();
      expect(userRole?.roleId).toBe(role?.id);
    });

    it('returns 409 on repeated bootstrap (idempotent)', async () => {
      // Create a test user without an organization
      const user = await prisma.user.create({
        data: {
          email: `bootstrap-idempotent-${Date.now()}${TEST_EMAIL_SUFFIX}`,
          name: 'Idempotent Bootstrap User',
          password: 'hashed-placeholder',
          organizationId: null,
        },
      });
      bootstrapUserId = user.id;

      // Bootstrap once
      const session1 = await prisma.session.create({
        data: {
          token: `bootstrap-idempotent-session-1-${Date.now()}`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userId: user.id,
        },
      });
      bootstrapSessionToken = session1.token;

      const firstRes = await fetch(`${SERVER_URL}/api/auth/bootstrap-organization`, {
        method: 'POST',
        headers: {
          Cookie: `better-auth.session_token=${session1.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ organizationName: 'Idempotent Org' }),
      });
      expect(firstRes.status).toBe(200);
      const firstBody = await firstRes.json();
      bootstrapOrgId = firstBody.organization.id;

      // Attempt again - should return 409
      const secondRes = await fetch(`${SERVER_URL}/api/auth/bootstrap-organization`, {
        method: 'POST',
        headers: {
          Cookie: `better-auth.session_token=${session1.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ organizationName: 'Another Org' }),
      });
      expect(secondRes.status).toBe(409);
    });

    it('allows only one concurrent bootstrap to succeed', async () => {
      // Create a fresh user without an organization
      const user = await prisma.user.create({
        data: {
          email: `bootstrap-concurrent-${Date.now()}${TEST_EMAIL_SUFFIX}`,
          name: 'Concurrent Bootstrap User',
          password: 'hashed-placeholder',
          organizationId: null,
        },
      });
      bootstrapUserId = user.id;

      const session = await prisma.session.create({
        data: {
          token: `bootstrap-concurrent-session-${Date.now()}`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userId: user.id,
        },
      });
      bootstrapSessionToken = session.token;

      // Fire two concurrent bootstrap requests
      const results = await Promise.all([
        fetch(`${SERVER_URL}/api/auth/bootstrap-organization`, {
          method: 'POST',
          headers: {
            Cookie: `better-auth.session_token=${session.token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ organizationName: 'Concurrent Org A' }),
        }),
        fetch(`${SERVER_URL}/api/auth/bootstrap-organization`, {
          method: 'POST',
          headers: {
            Cookie: `better-auth.session_token=${session.token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ organizationName: 'Concurrent Org B' }),
        }),
      ]);

      const statuses = results.map((r) => r.status);
      // Exactly one should succeed (200), the other should get 409
      expect(statuses.filter((s) => s === 200)).toHaveLength(1);
      expect(statuses.filter((s) => s === 409)).toHaveLength(1);

      // Find which org was created and set bootstrapOrgId for cleanup
      const orgs = await prisma.organization.findMany({
        where: {
          userRoles: { some: { userId: user.id } },
        },
      });
      if (orgs.length > 0) {
        bootstrapOrgId = orgs[0].id;
      }

      // Cleanup user directly (afterEach will also try, but ids are null after)
      await prisma.session.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    });

    it('returns 400 for invalid request body', async () => {
      // Create a test user without an organization
      const user = await prisma.user.create({
        data: {
          email: `bootstrap-invalid-${Date.now()}${TEST_EMAIL_SUFFIX}`,
          name: 'Invalid Bootstrap User',
          password: 'hashed-placeholder',
          organizationId: null,
        },
      });
      bootstrapUserId = user.id;

      const session = await prisma.session.create({
        data: {
          token: `bootstrap-invalid-session-${Date.now()}`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userId: user.id,
        },
      });
      bootstrapSessionToken = session.token;

      const res = await fetch(`${SERVER_URL}/api/auth/bootstrap-organization`, {
        method: 'POST',
        headers: {
          Cookie: `better-auth.session_token=${session.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ organizationName: '' }),
      });

      expect(res.status).toBe(400);
    });
  });
});
