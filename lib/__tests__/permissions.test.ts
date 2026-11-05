import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

/**
 * Permission system tests.
 *
 * Prisma is mocked so these tests run without a live database.
 * In production, `prisma generate` + `prisma db push` must be run locally
 * (Docker Compose provides PostgreSQL).
 */

vi.mock('@/lib/db', () => ({
  prisma: {
    userRole: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    organization: {
      create: vi.fn(),
      delete: vi.fn(),
    },
    permission: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    role: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';
import { getUserPermissions, hasPermission, requirePermission } from '@/lib/permissions';

const mockUserRoleFindMany = prisma.userRole.findMany as unknown as ReturnType<typeof vi.fn>;

describe('Permission system', () => {
  const orgId = 'org_123';
  const adminUserId = 'user_admin';
  const employeeUserId = 'user_employee';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  beforeAll(async () => {
    // Setup mock data through the mock functions
    (prisma.organization.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: orgId,
      name: 'Test Org',
      slug: 'test-org',
    });

    (prisma.permission.create as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        id: 'perm_create_inv',
        code: 'invoice.create',
        description: 'Create invoices',
      })
      .mockResolvedValueOnce({
        id: 'perm_read_inv',
        code: 'invoice.read',
        description: 'Read invoices',
      });

    (prisma.role.create as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        id: 'role_admin',
        name: 'Admin',
        organizationId: orgId,
        isSystem: true,
        permissions: {
          create: [{ permissionId: 'perm_create_inv' }, { permissionId: 'perm_read_inv' }],
        },
      })
      .mockResolvedValueOnce({
        id: 'role_employee',
        name: 'Employee',
        organizationId: orgId,
        isSystem: true,
        permissions: {
          create: [{ permissionId: 'perm_read_inv' }],
        },
      });

    (prisma.user.create as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        id: adminUserId,
        email: 'admin@test.org',
        name: 'Admin User',
        organizationId: orgId,
        role: 'admin',
      })
      .mockResolvedValueOnce({
        id: employeeUserId,
        email: 'employee@test.org',
        name: 'Employee User',
        organizationId: orgId,
        role: 'employee',
      });

    (prisma.userRole.create as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        id: 'ur1',
        userId: adminUserId,
        roleId: 'role_admin',
        organizationId: orgId,
      })
      .mockResolvedValueOnce({
        id: 'ur2',
        userId: employeeUserId,
        roleId: 'role_employee',
        organizationId: orgId,
      });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
  });

  it('admin user has invoice.create permission', async () => {
    mockUserRoleFindMany.mockResolvedValue([
      {
        id: 'ur1',
        userId: adminUserId,
        roleId: 'role_admin',
        organizationId: orgId,
        role: {
          id: 'role_admin',
          name: 'Admin',
          permissions: [
            { permission: { code: 'invoice.create' } },
            { permission: { code: 'invoice.read' } },
          ],
        },
      },
    ]);

    const perms = await getUserPermissions(adminUserId, orgId);
    expect(perms.has('invoice.create')).toBe(true);
    expect(perms.has('invoice.read')).toBe(true);
  });

  it('employee user does not have invoice.create permission', async () => {
    mockUserRoleFindMany.mockResolvedValue([
      {
        id: 'ur2',
        userId: employeeUserId,
        roleId: 'role_employee',
        organizationId: orgId,
        role: {
          id: 'role_employee',
          name: 'Employee',
          permissions: [{ permission: { code: 'invoice.read' } }],
        },
      },
    ]);

    const perms = await getUserPermissions(employeeUserId, orgId);
    expect(perms.has('invoice.create')).toBe(false);
    expect(perms.has('invoice.read')).toBe(true);
  });

  it('employee user has invoice.read permission', async () => {
    mockUserRoleFindMany.mockResolvedValue([
      {
        id: 'ur2',
        userId: employeeUserId,
        roleId: 'role_employee',
        organizationId: orgId,
        role: {
          id: 'role_employee',
          name: 'Employee',
          permissions: [{ permission: { code: 'invoice.read' } }],
        },
      },
    ]);

    const perms = await getUserPermissions(employeeUserId, orgId);
    expect(perms.has('invoice.read')).toBe(true);
  });

  it('hasPermission returns true for admin with invoice.create', async () => {
    mockUserRoleFindMany.mockResolvedValue([
      {
        id: 'ur1',
        userId: adminUserId,
        roleId: 'role_admin',
        organizationId: orgId,
        role: {
          id: 'role_admin',
          name: 'Admin',
          permissions: [{ permission: { code: 'invoice.create' } }],
        },
      },
    ]);

    const result = await hasPermission(adminUserId, orgId, 'invoice.create');
    expect(result).toBe(true);
  });

  it('hasPermission returns false for employee with invoice.create', async () => {
    mockUserRoleFindMany.mockResolvedValue([
      {
        id: 'ur2',
        userId: employeeUserId,
        roleId: 'role_employee',
        organizationId: orgId,
        role: { id: 'role_employee', name: 'Employee', permissions: [] },
      },
    ]);

    const result = await hasPermission(employeeUserId, orgId, 'invoice.create');
    expect(result).toBe(false);
  });

  it('hasPermission returns false when organizationId is undefined', async () => {
    const result = await hasPermission(adminUserId, undefined, 'invoice.create');
    expect(result).toBe(false);
  });

  it('requirePermission throws for insufficient permissions', async () => {
    mockUserRoleFindMany.mockResolvedValue([
      {
        id: 'ur2',
        userId: employeeUserId,
        roleId: 'role_employee',
        organizationId: orgId,
        role: { id: 'role_employee', name: 'Employee', permissions: [] },
      },
    ]);

    await expect(requirePermission(employeeUserId, orgId, 'invoice.create')).rejects.toThrow(
      'Forbidden'
    );
  });

  it('requirePermission succeeds for sufficient permissions', async () => {
    mockUserRoleFindMany.mockResolvedValue([
      {
        id: 'ur1',
        userId: adminUserId,
        roleId: 'role_admin',
        organizationId: orgId,
        role: {
          id: 'role_admin',
          name: 'Admin',
          permissions: [{ permission: { code: 'invoice.create' } }],
        },
      },
    ]);

    await expect(requirePermission(adminUserId, orgId, 'invoice.create')).resolves.toBeUndefined();
  });
});
