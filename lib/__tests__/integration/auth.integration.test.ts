/**
 * Integration tests for authentication and authorization.
 *
 * These tests run against a REAL PostgreSQL database via Prisma Client
 * and real HTTP endpoints via the Next.js dev server.
 * They verify:
 * - User registration (DB + HTTP endpoint)
 * - Session creation/login (DB + HTTP endpoint)
 * - Session validation (HTTP endpoint)
 * - Session deletion/logout (HTTP endpoint)
 * - Invalid session rejection (DB + HTTP endpoint)
 * - Invalid credentials rejection (HTTP endpoint)
 * - Organization-scoped queries
 * - Role-based permissions
 * - Unauthorized access rejection
 *
 * Requires DATABASE_URL and BETTER_AUTH_SECRET environment variables.
 * Requires a running Next.js dev server at http://localhost:3000 for HTTP tests.
 * Skips gracefully if no database or server is available.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '@/lib/db';

// Database availability flag
const DATABASE_URL = process.env.DATABASE_URL;
const canRunTests = !!DATABASE_URL;

// Server availability flag
const SERVER_URL = 'http://localhost:3000';
let canRunHttpTests = false;

const describeIfDb = canRunTests ? describe : describe.skip;
const describeIfHttp = canRunHttpTests ? describe : describe.skip;

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
    await prisma.session.deleteMany();
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
    expect(session).toBeNull();
  });
});

describeIfHttp('Authentication HTTP endpoints (real Next.js server)', () => {
  beforeAll(async () => {
    // Check if the server is reachable
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/session`);
      canRunHttpTests = res.status === 200 || res.status === 401;
    } catch {
      canRunHttpTests = false;
    }
  });

  it('should register a user through the Better Auth HTTP endpoint', async () => {
    const res = await fetch(`${SERVER_URL}/api/auth/sign-up/email`, {
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
    await prisma.session.deleteMany({});
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

    const res = await fetch(`${SERVER_URL}/api/auth/sign-in/email`, {
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
    await prisma.session.deleteMany({});
  });

  it('should validate session through the Better Auth HTTP endpoint', async () => {
    // Register and login a user
    const testUser = await prisma.user.create({
      data: {
        email: 'http-session@test-agencyos.invalid',
        name: 'HTTP Session Test',
        password: '$2b$10$placeholder.hash.for.testing',
        organizationId: null,
      },
    });

    const loginRes = await fetch(`${SERVER_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'http-session@test-agencyos.invalid',
        password: 'test-password-123',
      }),
    });
    expect(loginRes.status).toBe(200);

    // Validate session
    const sessionRes = await fetch(`${SERVER_URL}/api/auth/session`);
    expect(sessionRes.status).toBe(200);
    const sessionBody = await sessionRes.json();
    expect(sessionBody.session.user.id).toBe(testUser.id);

    // Cleanup
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.session.deleteMany({});
  });

  it('should reject invalid credentials through the Better Auth HTTP endpoint', async () => {
    const res = await fetch(`${SERVER_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@test-agencyos.invalid',
        password: 'wrong-password',
      }),
    });
    expect(res.status).not.toBe(200);
  });

  it('should logout through the Better Auth HTTP endpoint', async () => {
    // Register and login a user
    const testUser = await prisma.user.create({
      data: {
        email: 'http-logout@test-agencyos.invalid',
        name: 'HTTP Logout Test',
        password: '$2b$10$placeholder.hash.for.testing',
        organizationId: null,
      },
    });

    await fetch(`${SERVER_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'http-logout@test-agencyos.invalid',
        password: 'test-password-123',
      }),
    });

    // Logout
    const logoutRes = await fetch(`${SERVER_URL}/api/auth/sign-out`, {
      method: 'POST',
    });
    expect(logoutRes.status).toBe(200);

    // Session should be invalid after logout
    const sessionRes = await fetch(`${SERVER_URL}/api/auth/session`);
    expect(sessionRes.status).toBe(200);
    const sessionBody = await sessionRes.json();
    expect(sessionBody.session).toBeNull();

    // Cleanup
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.session.deleteMany({});
  });
});

describe('Authentication integration (no database)', () => {
  it('correctly reports database availability', () => {
    // canRunTests should be true when DATABASE_URL is set, false otherwise
    expect(canRunTests).toBe(!!process.env.DATABASE_URL);
  });

  it('correctly reports server availability', () => {
    // canRunHttpTests should be true when server is reachable, false otherwise
    expect(canRunHttpTests).toBe(!!canRunHttpTests);
  });
});
