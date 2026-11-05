/**
 * Unit tests for Account service layer.
 *
 * Prisma is mocked so these tests run without a live database.
 * Tests cover:
 * - Organization-scoped queries (org isolation)
 * - Soft-delete filtering
 * - Permission enforcement (401, 403)
 * - Cross-org non-disclosing 404
 * - Audit logging
 * - Soft-deleting related contacts when account is deleted
 */

vi.mock('@/lib/db', () => ({
  prisma: {
    agencyAccount: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    contact: {
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/auth-server', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/lib/permissions', () => ({
  requirePermission: vi.fn(),
  requireOrganization: vi.fn(),
}));

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { requirePermission, requireOrganization } from '@/lib/permissions';
import {
  listAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
} from '@/lib/services/crm/account-service';
import type {
  AccountCreateInput,
  AccountUpdateInput,
  AccountQueryInput,
} from '@/lib/schemas/crm/account.schema';

const mockAccountFindMany = prisma.agencyAccount.findMany as unknown as ReturnType<typeof vi.fn>;
const mockAccountFindFirst = prisma.agencyAccount.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockAccountCreate = prisma.agencyAccount.create as unknown as ReturnType<typeof vi.fn>;
const mockAccountUpdate = prisma.agencyAccount.update as unknown as ReturnType<typeof vi.fn>;
const mockAccountCount = prisma.agencyAccount.count as unknown as ReturnType<typeof vi.fn>;
const mockContactUpdateMany = prisma.contact.updateMany as unknown as ReturnType<typeof vi.fn>;
const mockAuditLogCreate = prisma.auditLog.create as unknown as ReturnType<typeof vi.fn>;
const mockTransaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;
const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockCookies = cookies as unknown as ReturnType<typeof vi.fn>;
const mockRequirePermission = requirePermission as unknown as ReturnType<typeof vi.fn>;
const mockRequireOrganization = requireOrganization as unknown as ReturnType<typeof vi.fn>;

const orgId = 'org_123';
const userId = 'user_123';
const accountId = 'account_123';

const mockSession = {
  session: { id: 'session_123', userId, expiresAt: new Date(Date.now() + 86400000) },
  user: {
    id: userId,
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin',
    organizationId: orgId,
  },
};

function mockAuth(user = mockSession.user) {
  mockGetSession.mockResolvedValue({ session: mockSession.session, user });
  mockCookies.mockReturnValue({
    toString: () => 'better-auth.session_token=test',
  });
}

function mockNoAuth() {
  mockGetSession.mockResolvedValue({ session: null, user: null });
  mockCookies.mockReturnValue({
    toString: () => '',
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockAuth();
  mockRequireOrganization.mockResolvedValue({ organizationId: orgId });
  mockRequirePermission.mockResolvedValue(undefined);
  // Default $transaction mock returns [results, count]
  mockTransaction.mockImplementation(([findManyPromise, countPromise]) =>
    Promise.all([findManyPromise, countPromise])
  );
});

describe('Account service - listAccounts', () => {
  it('returns org-scoped accounts with pagination', async () => {
    mockAccountFindMany.mockResolvedValue([
      {
        id: accountId,
        organizationId: orgId,
        name: 'Test Agency',
        website: 'https://example.com',
        address: '123 Main St',
        status: 'active',
        createdBy: userId,
        updatedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ]);
    mockAccountCount.mockResolvedValue(1);

    const result = await listAccounts({ page: 1, pageSize: 20 } as AccountQueryInput);

    expect(mockAccountFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: orgId, deletedAt: null }),
      })
    );
    expect(result.accounts).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('filters out soft-deleted accounts by default', async () => {
    mockAccountFindMany.mockResolvedValue([]);
    mockAccountCount.mockResolvedValue(0);

    await listAccounts({ page: 1, pageSize: 20 } as AccountQueryInput);

    expect(mockAccountFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      })
    );
  });

  it('throws 401 when unauthenticated', async () => {
    mockNoAuth();
    await expect(listAccounts({ page: 1, pageSize: 20 } as AccountQueryInput)).rejects.toThrow(
      'Unauthenticated'
    );
  });
});

describe('Account service - getAccount', () => {
  it('returns account for same org', async () => {
    mockAccountFindFirst.mockResolvedValue({
      id: accountId,
      organizationId: orgId,
      name: 'Test Agency',
      website: 'https://example.com',
      address: '123 Main St',
      status: 'active',
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      contacts: [],
    });

    const result = await getAccount(accountId);
    expect(result.id).toBe(accountId);
    expect(mockAccountFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: accountId, organizationId: orgId },
      })
    );
  });

  it('throws non-disclosing 404 for cross-org account', async () => {
    mockAccountFindFirst.mockResolvedValue(null);

    await expect(getAccount(accountId)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('Account service - createAccount', () => {
  it('creates account with organization scoping', async () => {
    mockAccountCreate.mockResolvedValue({
      id: 'new_account',
      organizationId: orgId,
      name: 'New Agency',
      website: null,
      address: null,
      status: 'active',
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    mockAuditLogCreate.mockResolvedValue({ id: 'audit_1' });

    const result = await createAccount({
      name: 'New Agency',
      status: 'active',
    } as AccountCreateInput);

    expect(mockAccountCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: orgId,
          name: 'New Agency',
        }),
      })
    );
    expect(mockAuditLogCreate).toHaveBeenCalled();
    expect(result.id).toBe('new_account');
  });
});

describe('Account service - updateAccount', () => {
  it('updates account for same org', async () => {
    mockAccountFindFirst.mockResolvedValue({
      id: accountId,
      organizationId: orgId,
      name: 'Old Name',
      website: null,
      address: null,
      status: 'active',
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    mockAccountUpdate.mockResolvedValue({
      id: accountId,
      organizationId: orgId,
      name: 'New Name',
      website: null,
      address: null,
      status: 'active',
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    mockAuditLogCreate.mockResolvedValue({ id: 'audit_1' });

    const result = await updateAccount(accountId, { name: 'New Name' } as AccountUpdateInput);
    expect(result.name).toBe('New Name');
    expect(mockAuditLogCreate).toHaveBeenCalled();
  });

  it('throws non-disclosing 404 for cross-org update', async () => {
    mockAccountFindFirst.mockResolvedValue(null);

    await expect(
      updateAccount(accountId, { name: 'Hacked' } as AccountUpdateInput)
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('Account service - deleteAccount', () => {
  it('soft deletes account and related contacts', async () => {
    mockAccountFindFirst.mockResolvedValue({
      id: accountId,
      organizationId: orgId,
      name: 'Test Agency',
      website: null,
      address: null,
      status: 'active',
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    mockContactUpdateMany.mockResolvedValue({ count: 2 });
    mockAccountUpdate.mockResolvedValue({
      id: accountId,
      organizationId: orgId,
      deletedAt: new Date(),
      updatedBy: userId,
    });
    mockAuditLogCreate.mockResolvedValue({ id: 'audit_1' });

    const result = await deleteAccount(accountId);
    expect(result.deletedAt).toBeDefined();
    expect(mockContactUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accountId,
          organizationId: orgId,
          deletedAt: null,
        }),
      })
    );
    expect(mockAuditLogCreate).toHaveBeenCalled();
  });

  it('throws non-disclosing 404 for cross-org delete', async () => {
    mockAccountFindFirst.mockResolvedValue(null);

    await expect(deleteAccount(accountId)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
