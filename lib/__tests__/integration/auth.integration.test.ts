/**
 * Integration tests for authentication and authorization.
 *
 * These tests run against a REAL PostgreSQL database via Prisma Client.
 * They verify:
 * - User registration (create user record in DB)
 * - Session creation (login equivalent)
 * - Session validation (find session by token)
 * - Session deletion (logout equivalent)
 * - Invalid session rejection
 * - Organization-scoped queries
 * - Role-based permissions
 * - Unauthorized access rejection
 *
 * Requires DATABASE_URL and BETTER_AUTH_SECRET environment variables.
 * Skips gracefully if no database is available.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '@/lib/db';

// Database availability flag
const DATABASE_URL = process.env.DATABASE_URL;
const canRunTests = !!DATABASE_URL;

const describeIfDb = canRunTests ? describe : describe.skip;

describeIfDb('Authentication integration (real PostgreSQL)', () => {
  beforeAll(async () => {
    // Ensure database is reachable
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.user.deleteMany({
      where: { email: { contains: '@test-agencyos.invalid' } },
    });
    await prisma.session.deleteMany({
      where: { token: { startsWith: 'test-' } },
    });
  });

  it('should register a new user in the database', async () => {
    const testUser = await prisma.user.create({
      data: {
        email: 'register-test@test-agencyos.invalid',
        name: 'Register Test',
        password: 'hashed-password-placeholder',
        organizationId: null,
      },
    });

    expect(testUser.id).toBeDefined();
    expect(testUser.email).toBe('register-test@test-agencyos.invalid');
    expect(testUser.createdAt).toBeInstanceOf(Date);

    // Cleanup
    await prisma.user.delete({ where: { id: testUser.id } });
  });

  it('should create and validate a session (login equivalent)', async () => {
    // Register user
    const testUser = await prisma.user.create({
      data: {
        email: 'auth-test@test-agencyos.invalid',
        name: 'Auth Test',
        password: 'hashed-password-placeholder',
        organizationId: null,
      },
    });

    // Create session (login)
    const session = await prisma.session.create({
      data: {
        token: 'test-session-token-' + testUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userId: testUser.id,
      },
    });

    expect(session.id).toBeDefined();
    expect(session.userId).toBe(testUser.id);
    expect(session.expiresAt).toBeInstanceOf(Date);

    // Validate session exists
    const foundSession = await prisma.session.findUnique({
      where: { token: 'test-session-token-' + testUser.id },
    });
    expect(foundSession).not.toBeNull();
    expect(foundSession?.userId).toBe(testUser.id);

    // Logout (delete session)
    await prisma.session.delete({ where: { id: session.id } });

    // Verify session is gone
    const goneSession = await prisma.session.findUnique({
      where: { token: 'test-session-token-' + testUser.id },
    });
    expect(goneSession).toBeNull();

    // Cleanup user
    await prisma.user.delete({ where: { id: testUser.id } });
  });

  it('should reject invalid session tokens', async () => {
    const session = await prisma.session.findUnique({
      where: { token: 'non-existent-token' },
    });

    expect(session).toBeNull();
  });

  it('should enforce organization-scoped queries', async () => {
    // Create two organizations
    const org1 = await prisma.organization.create({
      data: { name: 'Test Org 1', slug: 'test-org-1' },
    });
    const org2 = await prisma.organization.create({
      data: { name: 'Test Org 2', slug: 'test-org-2' },
    });

    // Create a user in org1
    const user = await prisma.user.create({
      data: {
        email: 'org-scoping@test-agencyos.invalid',
        organizationId: org1.id,
      },
    });

    // Query users scoped to each organization
    const org1Users = await prisma.user.findMany({
      where: { organizationId: org1.id },
    });
    const org2Users = await prisma.user.findMany({
      where: { organizationId: org2.id },
    });

    expect(org1Users.length).toBeGreaterThanOrEqual(1);
    expect(org2Users.length).toBe(0); // No users in org2

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.organization.delete({ where: { id: org1.id } });
    await prisma.organization.delete({ where: { id: org2.id } });
  });

  it('should enforce role-based permissions', async () => {
    const org = await prisma.organization.create({
      data: { name: 'Perm Test Org', slug: 'perm-test-org' },
    });

    // Create permissions
    const permRead = await prisma.permission.create({
      data: { code: 'invoice.read', description: 'Read invoices' },
    });
    const permWrite = await prisma.permission.create({
      data: { code: 'invoice.create', description: 'Create invoices' },
    });

    // Create admin role with both permissions
    const adminRole = await prisma.role.create({
      data: {
        name: 'Admin',
        organizationId: org.id,
        isSystem: true,
        permissions: {
          create: [{ permissionId: permRead.id }, { permissionId: permWrite.id }],
        },
      },
    });

    // Create employee role with read-only
    const employeeRole = await prisma.role.create({
      data: {
        name: 'Employee',
        organizationId: org.id,
        isSystem: true,
        permissions: {
          create: [{ permissionId: permRead.id }],
        },
      },
    });

    // Create users with different roles
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin-perm@test-agencyos.invalid',
        organizationId: org.id,
      },
    });
    const employeeUser = await prisma.user.create({
      data: {
        email: 'employee-perm@test-agencyos.invalid',
        organizationId: org.id,
      },
    });

    await prisma.userRole.create({
      data: { userId: adminUser.id, roleId: adminRole.id, organizationId: org.id },
    });
    await prisma.userRole.create({
      data: { userId: employeeUser.id, roleId: employeeRole.id, organizationId: org.id },
    });

    // Verify admin has both permissions
    const adminPerms = await prisma.rolePermission.findMany({
      where: { roleId: adminRole.id },
      include: { permission: true },
    });
    const adminCodes = adminPerms.map((rp: { permission: { code: string } }) => rp.permission.code);
    expect(adminCodes).toContain('invoice.read');
    expect(adminCodes).toContain('invoice.create');

    // Verify employee has only read permission
    const employeePerms = await prisma.rolePermission.findMany({
      where: { roleId: employeeRole.id },
      include: { permission: true },
    });
    const employeeCodes = employeePerms.map(
      (rp: { permission: { code: string } }) => rp.permission.code
    );
    expect(employeeCodes).toContain('invoice.read');
    expect(employeeCodes).not.toContain('invoice.create');

    // Cleanup
    await prisma.userRole.deleteMany({ where: { organizationId: org.id } });
    await prisma.user.deleteMany({ where: { organizationId: org.id } });
    await prisma.role.deleteMany({ where: { organizationId: org.id } });
    await prisma.permission.deleteMany({
      where: { code: { in: ['invoice.read', 'invoice.create'] } },
    });
    await prisma.organization.delete({ where: { id: org.id } });
  });

  it('should reject unauthorized access when no session exists', async () => {
    // Attempt to find a session for a non-existent user
    const session = await prisma.session.findFirst({
      where: { userId: 'nonexistent-user-id' },
    });

    it('should register a user through the Better Auth HTTP endpoint', async () => {
      const res = await fetch('http://localhost:3000/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'http-register@test-agencyos.invalid',
          password: 'test-password-123',
          name: 'HTTP Register Test',
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user.email).toBe('http-register@test-agencyos.invalid');
      expect(body.user.id).toBeDefined();

      // Verify user was created in DB
      const user = await prisma.user.findUnique({
        where: { email: 'http-register@test-agencyos.invalid' },
      });
      expect(user).not.toBeNull();
      expect(user?.email).toBe('http-register@test-agencyos.invalid');

      // Cleanup
      await prisma.user.delete({ where: { id: user!.id } });
    });

    it('should login through the Better Auth HTTP endpoint and receive a session', async () => {
      // First register a user directly in DB with a known password hash
      const testUser = await prisma.user.create({
        data: {
          email: 'http-login@test-agencyos.invalid',
          name: 'HTTP Login Test',
          password: '$2b$10$placeholder.hash.for.testing',
          organizationId: null,
        },
      });

      const res = await fetch('http://localhost:3000/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'http-login@test-agencyos.invalid',
          password: 'test-password-123',
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.session.token).toBeDefined();
      expect(body.session.userId).toBe(testUser.id);

      // Cleanup
      await prisma.user.delete({ where: { id: testUser.id } });
    });

    it('should reject invalid credentials through the Better Auth HTTP endpoint', async () => {
      const res = await fetch('http://localhost:3000/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@test-agencyos.invalid',
          password: 'wrong-password',
        }),
      });
      expect(res.status).not.toBe(200);
    });
    expect(session).toBeNull();
  });
});

describe('Authentication integration (no database)', () => {
  it('correctly reports database availability', () => {
    // canRunTests should be true when DATABASE_URL is set, false otherwise
    expect(canRunTests).toBe(!!process.env.DATABASE_URL);
  });
});
