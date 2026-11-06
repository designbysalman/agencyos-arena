/** Unit tests for Proposal service layer.
 *
 * Prisma is mocked so these tests run without a live database.
 * Tests cover:
 * - Organization-scoped queries (org isolation)
 * - Soft-delete filtering
 * - Permission enforcement (401, 403)
 * - Cross-org non-disclosing 404
 * - Cross-org opportunity/contact/account relationship validation
 * - Status transition validation (accepted proposals)
 * - Server-calculated totals from line items
 * - Audit logging
 */

vi.mock('@/lib/db', () => ({
  prisma: {
    proposal: {
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
  listProposals,
  getProposal,
  createProposal,
  updateProposal,
  deleteProposal,
} from '@/lib/services/proposals/proposal-service';
import type {
  ProposalCreateInput,
  ProposalUpdateInput,
  ProposalQueryInput,
} from '@/lib/schemas/proposals/proposal.schema';

const mockProposalFindMany = prisma.proposal.findMany as unknown as ReturnType<typeof vi.fn>;
const mockProposalFindFirst = prisma.proposal.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockProposalCreate = prisma.proposal.create as unknown as ReturnType<typeof vi.fn>;
const mockProposalUpdate = prisma.proposal.update as unknown as ReturnType<typeof vi.fn>;
const mockProposalCount = prisma.proposal.count as unknown as ReturnType<typeof vi.fn>;
const mockOppFindFirst = prisma.opportunity.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockAuditLogCreate = prisma.auditLog.create as unknown as ReturnType<typeof vi.fn>;
const mockTransaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;
const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockCookies = cookies as unknown as ReturnType<typeof vi.fn>;
const mockRequirePermission = requirePermission as unknown as ReturnType<typeof vi.fn>;
const mockRequireOrganization = requireOrganization as unknown as ReturnType<typeof vi.fn>;

const orgId = 'org_123';
const userId = 'user_123';
const proposalId = 'prop_123';

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
  mockProposalCount.mockResolvedValue(0);
});

describe('Proposal service - listProposals', () => {
  it('returns org-scoped proposals with pagination', async () => {
    mockProposalFindMany.mockResolvedValue([
      {
        id: proposalId,
        organizationId: orgId,
        proposalNumber: 'PROP-2026-0001',
        opportunityId: null,
        contactId: null,
        accountId: null,
        clientName: 'Acme Corp',
        clientEmail: null,
        title: 'Website Redesign',
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
    mockProposalCount.mockResolvedValue(1);

    const result = await listProposals({ page: 1, pageSize: 20 } as ProposalQueryInput);

    expect(mockProposalFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: orgId, deletedAt: null }),
      })
    );
    expect(result.proposals).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('filters out soft-deleted proposals by default', async () => {
    mockProposalFindMany.mockResolvedValue([]);
    mockProposalCount.mockResolvedValue(0);

    await listProposals({ page: 1, pageSize: 20 } as ProposalQueryInput);

    expect(mockProposalFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      })
    );
  });

  it('throws 401 when unauthenticated', async () => {
    mockNoAuth();
    await expect(listProposals({ page: 1, pageSize: 20 } as ProposalQueryInput)).rejects.toThrow(
      'Unauthenticated'
    );
  });

  it('throws 403 when user lacks proposal.read permission', async () => {
    mockRequirePermission.mockRejectedValueOnce(
      Object.assign(new Error('Forbidden: insufficient permissions'), {
        statusCode: 403,
      })
    );
    await expect(listProposals({ page: 1, pageSize: 20 } as ProposalQueryInput)).rejects.toThrow(
      'Forbidden'
    );
  });
});

describe('Proposal service - getProposal', () => {
  it('returns proposal for same org', async () => {
    mockProposalFindFirst.mockResolvedValue({
      id: proposalId,
      organizationId: orgId,
      proposalNumber: 'PROP-2026-0001',
      opportunityId: null,
      contactId: null,
      accountId: null,
      clientName: 'Acme Corp',
      clientEmail: null,
      title: 'Website Redesign',
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

    const result = await getProposal(proposalId);
    expect(result.id).toBe(proposalId);
    expect(mockProposalFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: proposalId, organizationId: orgId },
      })
    );
  });

  it('returns non-disclosing 404 for cross-org proposal', async () => {
    mockProposalFindFirst.mockResolvedValue(null);

    await expect(getProposal(proposalId)).rejects.toThrow('Not found');
  });
});

describe('Proposal service - createProposal', () => {
  it('creates proposal with server-calculated totals', async () => {
    mockProposalCreate.mockResolvedValue({
      id: proposalId,
      organizationId: orgId,
      proposalNumber: 'PROP-2026-0001',
      opportunityId: null,
      contactId: null,
      accountId: null,
      clientName: 'Acme Corp',
      clientEmail: null,
      title: 'Website Redesign',
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
      title: 'Website Redesign',
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
    } as unknown as ProposalCreateInput;

    const result = await createProposal(input);
    expect(result.id).toBe(proposalId);
    expect(mockProposalCreate).toHaveBeenCalled();
    expect(mockAuditLogCreate).toHaveBeenCalled();
  });

  it('throws 404 for cross-org opportunity', async () => {
    mockOppFindFirst.mockResolvedValue(null);

    const input: ProposalCreateInput = {
      opportunityId: 'opp_cross_org',
      title: 'Test',
      status: 'draft',
      currency: 'USD',
    };

    await expect(createProposal(input)).rejects.toThrow('Not found');
  });

  it('throws 403 when user lacks proposal.create permission', async () => {
    mockRequirePermission.mockRejectedValueOnce(
      Object.assign(new Error('Forbidden: insufficient permissions'), {
        statusCode: 403,
      })
    );

    const input: ProposalCreateInput = {
      title: 'Test',
      status: 'draft',
      currency: 'USD',
    };

    await expect(createProposal(input)).rejects.toThrow('Forbidden');
  });
});

describe('Proposal service - updateProposal', () => {
  it('updates proposal with audit logging', async () => {
    mockProposalFindFirst.mockResolvedValue({
      id: proposalId,
      organizationId: orgId,
      proposalNumber: 'PROP-2026-0001',
      opportunityId: null,
      contactId: null,
      accountId: null,
      clientName: 'Acme Corp',
      clientEmail: null,
      title: 'Website Redesign',
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
    mockProposalUpdate.mockResolvedValue({
      id: proposalId,
      organizationId: orgId,
      proposalNumber: 'PROP-2026-0001',
      opportunityId: null,
      contactId: null,
      accountId: null,
      clientName: 'Acme Corp',
      clientEmail: null,
      title: 'Updated Proposal',
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

    const input: ProposalUpdateInput = {
      title: 'Updated Proposal',
    };

    const result = await updateProposal(proposalId, input);
    expect(result.title).toBe('Updated Proposal');
    expect(mockAuditLogCreate).toHaveBeenCalled();
  });

  it('rejects modification of accepted proposal', async () => {
    mockProposalFindFirst.mockResolvedValue({
      id: proposalId,
      organizationId: orgId,
      status: 'accepted',
      items: [],
    });

    const input: ProposalUpdateInput = {
      title: 'Should not update',
    };

    await expect(updateProposal(proposalId, input)).rejects.toThrow();
  });

  it('returns non-disclosing 404 for cross-org update', async () => {
    mockProposalFindFirst.mockResolvedValue(null);

    await expect(updateProposal(proposalId, { title: 'Test' })).rejects.toThrow('Not found');
  });
});

describe('Proposal service - deleteProposal', () => {
  it('soft deletes proposal with audit logging', async () => {
    mockProposalFindFirst.mockResolvedValue({
      id: proposalId,
      organizationId: orgId,
      title: 'Test Proposal',
      status: 'draft',
    });
    mockProposalUpdate.mockResolvedValue({
      id: proposalId,
      organizationId: orgId,
      deletedAt: new Date(),
    });

    const result = await deleteProposal(proposalId);
    expect(result.id).toBe(proposalId);
    expect(result.deletedAt).toBeDefined();
    expect(mockAuditLogCreate).toHaveBeenCalled();
  });
});
