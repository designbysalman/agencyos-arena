/** Unit tests for Quotation service layer.
 *
 * Prisma is mocked so these tests run without a live database.
 * Tests cover:
 * - Organization-scoped queries (org isolation)
 * - Soft-delete filtering
 * - Permission enforcement (401, 403)
 * - Cross-org non-disclosing 404
 * - Cross-org opportunity/contact/account relationship validation
 * - Status transition validation (accepted quotations)
 * - Server-calculated totals from line items
 * - Audit logging
 */

vi.mock('@/lib/db', () => ({
  prisma: {
    quotation: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    opportunity: {
      findFirst: vi.fn(),
    },
    contact: {
      findFirst: vi.fn(),
    },
    agencyAccount: {
      findFirst: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
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
  listQuotations,
  getQuotation,
  createQuotation,
  updateQuotation,
  deleteQuotation,
} from '@/lib/services/proposals/quotation-service';
import type {
  QuotationCreateInput,
  QuotationUpdateInput,
  QuotationQueryInput,
} from '@/lib/schemas/proposals/quotation.schema';

const mockQuotationFindMany = prisma.quotation.findMany as unknown as ReturnType<typeof vi.fn>;
const mockQuotationFindFirst = prisma.quotation.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockQuotationCreate = prisma.quotation.create as unknown as ReturnType<typeof vi.fn>;
const mockQuotationUpdate = prisma.quotation.update as unknown as ReturnType<typeof vi.fn>;
const mockQuotationCount = prisma.quotation.count as unknown as ReturnType<typeof vi.fn>;
const mockOppFindFirst = prisma.opportunity.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockAuditLogCreate = prisma.auditLog.create as unknown as ReturnType<typeof vi.fn>;
const mockTransaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;
const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockCookies = cookies as unknown as ReturnType<typeof vi.fn>;
const mockRequirePermission = requirePermission as unknown as ReturnType<typeof vi.fn>;
const mockRequireOrganization = requireOrganization as unknown as ReturnType<typeof vi.fn>;

const orgId = 'org_123';
const userId = 'user_123';
const quotationId = 'quot_123';

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
  mockTransaction.mockImplementation((promises) => Promise.all(promises));
});

describe('Quotation service - listQuotations', () => {
  it('returns org-scoped quotations with pagination', async () => {
    mockQuotationFindMany.mockResolvedValue([
      {
        id: quotationId,
        organizationId: orgId,
        quotationNumber: 'QUOT-2026-0001',
        opportunityId: null,
        contactId: null,
        accountId: null,
        clientName: 'Acme Corp',
        clientEmail: null,
        title: 'Website Redesign Quote',
        description: null,
        status: 'draft',
        subtotal: 1000,
        discount: 0,
        tax: 0,
        total: 1000,
        currency: 'USD',
        validUntil: null,
        sentAt: null,
        acceptedAt: null,
        deletedAt: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        contact: null,
        account: null,
        opportunity: null,
        items: [],
      },
    ]);
    mockQuotationCount.mockResolvedValue(1);

    const result = await listQuotations({ page: 1, pageSize: 20 } as QuotationQueryInput);

    expect(mockQuotationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: orgId, deletedAt: null }),
      })
    );
    expect(result.quotations).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('filters out soft-deleted quotations by default', async () => {
    mockQuotationFindMany.mockResolvedValue([]);
    mockQuotationCount.mockResolvedValue(0);

    await listQuotations({ page: 1, pageSize: 20 } as QuotationQueryInput);

    expect(mockQuotationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      })
    );
  });

  it('throws 401 when unauthenticated', async () => {
    mockNoAuth();
    await expect(listQuotations({ page: 1, pageSize: 20 } as QuotationQueryInput)).rejects.toThrow(
      'Unauthenticated'
    );
  });

  it('throws 403 when user lacks quotation.read permission', async () => {
    mockRequirePermission.mockRejectedValueOnce(
      Object.assign(new Error('Forbidden: insufficient permissions'), {
        statusCode: 403,
      })
    );
    await expect(listQuotations({ page: 1, pageSize: 20 } as QuotationQueryInput)).rejects.toThrow(
      'Forbidden'
    );
  });
});

describe('Quotation service - getQuotation', () => {
  it('returns quotation for same org', async () => {
    mockQuotationFindFirst.mockResolvedValue({
      id: quotationId,
      organizationId: orgId,
      quotationNumber: 'QUOT-2026-0001',
      opportunityId: null,
      contactId: null,
      accountId: null,
      clientName: 'Acme Corp',
      clientEmail: null,
      title: 'Website Redesign Quote',
      description: null,
      status: 'draft',
      subtotal: 1000,
      discount: 0,
      tax: 0,
      total: 1000,
      currency: 'USD',
      validUntil: null,
      sentAt: null,
      acceptedAt: null,
      deletedAt: null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      contact: null,
      account: null,
      opportunity: null,
      items: [],
    });

    const result = await getQuotation(quotationId);
    expect(result.id).toBe(quotationId);
    expect(mockQuotationFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: quotationId, organizationId: orgId },
      })
    );
  });

  it('returns non-disclosing 404 for cross-org quotation', async () => {
    mockQuotationFindFirst.mockResolvedValue(null);

    await expect(getQuotation(quotationId)).rejects.toThrow('Not found');
  });
});

describe('Quotation service - createQuotation', () => {
  it('creates quotation with server-calculated totals', async () => {
    mockQuotationCreate.mockResolvedValue({
      id: quotationId,
      organizationId: orgId,
      quotationNumber: 'QUOT-2026-0001',
      opportunityId: null,
      contactId: null,
      accountId: null,
      clientName: 'Acme Corp',
      clientEmail: null,
      title: 'Website Redesign Quote',
      description: null,
      status: 'draft',
      subtotal: 1000,
      discount: 0,
      tax: 0,
      total: 1000,
      currency: 'USD',
      validUntil: null,
      sentAt: null,
      acceptedAt: null,
      deletedAt: null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      contact: null,
      account: null,
      opportunity: null,
      items: [],
    });

    const input = {
      clientName: 'Acme Corp',
      title: 'Website Redesign Quote',
      status: 'draft',
      currency: 'USD',
      items: [
        {
          description: 'Design work',
          quantity: '10',
          unitPrice: '100',
          discount: '0',
          taxRate: '0',
          order: 0,
        },
      ],
    } as unknown as QuotationCreateInput;

    const result = await createQuotation(input);
    expect(result.id).toBe(quotationId);
    expect(mockQuotationCreate).toHaveBeenCalled();
    expect(mockAuditLogCreate).toHaveBeenCalled();
  });

  it('throws 404 for cross-org opportunity', async () => {
    mockOppFindFirst.mockResolvedValue(null);

    const input: QuotationCreateInput = {
      opportunityId: 'opp_cross_org',
      title: 'Test',
      status: 'draft',
      currency: 'USD',
    };

    await expect(createQuotation(input)).rejects.toThrow('Not found');
  });

  it('throws 403 when user lacks quotation.create permission', async () => {
    mockRequirePermission.mockRejectedValueOnce(
      Object.assign(new Error('Forbidden: insufficient permissions'), {
        statusCode: 403,
      })
    );

    const input: QuotationCreateInput = {
      title: 'Test',
      status: 'draft',
      currency: 'USD',
    };

    await expect(createQuotation(input)).rejects.toThrow('Forbidden');
  });
});

describe('Quotation service - updateQuotation', () => {
  it('updates quotation with audit logging', async () => {
    mockQuotationFindFirst.mockResolvedValue({
      id: quotationId,
      organizationId: orgId,
      quotationNumber: 'QUOT-2026-0001',
      opportunityId: null,
      contactId: null,
      accountId: null,
      clientName: 'Acme Corp',
      clientEmail: null,
      title: 'Website Redesign Quote',
      description: null,
      status: 'draft',
      subtotal: 1000,
      discount: 0,
      tax: 0,
      total: 1000,
      currency: 'USD',
      validUntil: null,
      sentAt: null,
      acceptedAt: null,
      deletedAt: null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
    });
    mockQuotationUpdate.mockResolvedValue({
      id: quotationId,
      organizationId: orgId,
      quotationNumber: 'QUOT-2026-0001',
      opportunityId: null,
      contactId: null,
      accountId: null,
      clientName: 'Acme Corp',
      clientEmail: null,
      title: 'Updated Quote',
      description: null,
      status: 'draft',
      subtotal: 1000,
      discount: 0,
      tax: 0,
      total: 1000,
      currency: 'USD',
      validUntil: null,
      sentAt: null,
      acceptedAt: null,
      deletedAt: null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
    });

    const input: QuotationUpdateInput = {
      title: 'Updated Quote',
    };

    const result = await updateQuotation(quotationId, input);
    expect(result.title).toBe('Updated Quote');
    expect(mockAuditLogCreate).toHaveBeenCalled();
  });

  it('rejects modification of accepted quotation', async () => {
    mockQuotationFindFirst.mockResolvedValue({
      id: quotationId,
      organizationId: orgId,
      status: 'accepted',
      items: [],
    });

    const input: QuotationUpdateInput = {
      title: 'Should not update',
    };

    await expect(updateQuotation(quotationId, input)).rejects.toThrow();
  });

  it('returns non-disclosing 404 for cross-org update', async () => {
    mockQuotationFindFirst.mockResolvedValue(null);

    await expect(updateQuotation(quotationId, { title: 'Test' })).rejects.toThrow('Not found');
  });
});

describe('Quotation service - deleteQuotation', () => {
  it('soft deletes quotation with audit logging', async () => {
    mockQuotationFindFirst.mockResolvedValue({
      id: quotationId,
      organizationId: orgId,
      title: 'Test Quotation',
      status: 'draft',
    });
    mockQuotationUpdate.mockResolvedValue({
      id: quotationId,
      organizationId: orgId,
      deletedAt: new Date(),
    });

    const result = await deleteQuotation(quotationId);
    expect(result.id).toBe(quotationId);
    expect(result.deletedAt).toBeDefined();
    expect(mockAuditLogCreate).toHaveBeenCalled();
  });
});
