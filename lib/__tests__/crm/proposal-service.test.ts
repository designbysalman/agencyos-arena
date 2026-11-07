/** Unit tests for Proposal service layer.
 *
 * Prisma is mocked so these tests run without a live database.
 * Tests cover:
 * - Organization-scoped queries (org isolation)
 * - Soft-delete filtering
 * - Permission enforcement (401, 403)
 * - Cross-org non-disclosing 404
 * - Cross-org opportunity/contact relationship validation
 * - Server-calculated totals from line items
 * - Immutable accepted records
 * - Status transition validation
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
    user: {
      findUnique: vi.fn(),
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
} from '@/lib/services/crm/proposal-service';
import type {
  ProposalCreateInput,
  ProposalUpdateInput,
  ProposalQueryInput,
  ProposalLineItemInput,
} from '@/lib/schemas/crm/proposal.schema';

const mockProposalFindMany = prisma.proposal.findMany as unknown as ReturnType<typeof vi.fn>;
const mockProposalFindFirst = prisma.proposal.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockProposalCreate = prisma.proposal.create as unknown as ReturnType<typeof vi.fn>;
const mockProposalUpdate = prisma.proposal.update as unknown as ReturnType<typeof vi.fn>;
const mockProposalCount = prisma.proposal.count as unknown as ReturnType<typeof vi.fn>;
const mockOppFindFirst = prisma.opportunity.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockContactFindFirst = prisma.contact.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockAuditLogCreate = prisma.auditLog.create as unknown as ReturnType<typeof vi.fn>;
const mockTransaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;
const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockCookies = cookies as unknown as ReturnType<typeof vi.fn>;
const mockRequirePermission = requirePermission as unknown as ReturnType<typeof vi.fn>;
const mockRequireOrganization = requireOrganization as unknown as ReturnType<typeof vi.fn>;

const orgId = 'org_123';
const userId = 'user_123';
const proposalId = 'proposal_123';

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

describe('Proposal service - listProposals', () => {
  it('returns org-scoped proposals with pagination', async () => {
    mockProposalFindMany.mockResolvedValue([
      {
        id: proposalId,
        organizationId: orgId,
        number: 'PRP-20260001',
        opportunityId: null,
        contactId: null,
        title: 'Test Proposal',
        status: 'draft',
        subtotal: 1000,
        tax: 100,
        total: 1100,
        currency: 'USD',
        validUntil: null,
        notes: null,
        deletedAt: null,
        createdBy: userId,
        updatedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
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
      number: 'PRP-20260001',
      opportunityId: null,
      contactId: null,
      title: 'Test Proposal',
      status: 'draft',
      subtotal: 1000,
      tax: 100,
      total: 1100,
      currency: 'USD',
      validUntil: null,
      notes: null,
      deletedAt: null,
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
      creator: null,
      updater: null,
      opportunity: null,
      contact: null,
    });

    const result = await getProposal(proposalId);
    expect(result.id).toBe(proposalId);
    expect(mockProposalFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: proposalId, organizationId: orgId },
      })
    );
  });

  it('throws non-disclosing 404 for cross-org proposal', async () => {
    mockProposalFindFirst.mockResolvedValue(null);

    await expect(getProposal(proposalId)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('Proposal service - createProposal', () => {
  const lineItems: ProposalLineItemInput[] = [
    {
      description: 'Design services',
      quantity: '10',
      unitPrice: '100',
      taxRate: '10',
      sortOrder: 0,
    },
  ];

  const createInput = {
    title: 'Test Proposal',
    status: 'draft',
    currency: 'USD',
    contactId: null,
    opportunityId: null,
    validUntil: null,
    notes: null,
  } as ProposalCreateInput;

  it('creates proposal with server-calculated totals and org scoping', async () => {
    mockProposalCreate.mockResolvedValue({
      id: 'new_proposal',
      organizationId: orgId,
      number: 'PRP-20260001',
      opportunityId: null,
      contactId: null,
      title: 'Test Proposal',
      status: 'draft',
      subtotal: 1000,
      tax: 100,
      total: 1100,
      currency: 'USD',
      validUntil: null,
      notes: null,
      deletedAt: null,
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
    });
    mockAuditLogCreate.mockResolvedValue({ id: 'audit_1' });

    const result = await createProposal(createInput, lineItems);

    expect(mockProposalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: orgId,
          title: 'Test Proposal',
          status: 'draft',
          currency: 'USD',
          subtotal: 1000,
          tax: 100,
          total: 1100,
        }),
      })
    );
    expect(mockAuditLogCreate).toHaveBeenCalled();
    expect(result.title).toBe('Test Proposal');
    expect(result.subtotal).toBe('1000');
    expect(result.total).toBe('1100');
  });

  it('calculates totals server-side from line items', async () => {
    mockProposalCreate.mockResolvedValue({
      id: 'new_proposal',
      organizationId: orgId,
      number: 'PRP-20260001',
      opportunityId: null,
      contactId: null,
      title: 'Test Proposal',
      status: 'draft',
      subtotal: 2000,
      tax: 200,
      total: 2200,
      currency: 'USD',
      validUntil: null,
      notes: null,
      deletedAt: null,
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
    });
    mockAuditLogCreate.mockResolvedValue({ id: 'audit_1' });

    const multiItemInput: ProposalLineItemInput[] = [
      { description: 'Item A', quantity: '2', unitPrice: '500', taxRate: '10', sortOrder: 0 },
      { description: 'Item B', quantity: '1', unitPrice: '1000', taxRate: '10', sortOrder: 1 },
    ];

    await createProposal({ ...createInput }, multiItemInput);

    expect(mockProposalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotal: 2000,
          tax: 200,
          total: 2200,
        }),
      })
    );
  });

  it('validates cross-org opportunity relationship', async () => {
    mockOppFindFirst.mockResolvedValue(null);

    await expect(
      createProposal({ ...createInput, opportunityId: 'foreign_opp' }, lineItems)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('validates cross-org contact relationship', async () => {
    mockContactFindFirst.mockResolvedValue(null);

    await expect(
      createProposal({ ...createInput, contactId: 'foreign_contact' }, lineItems)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 401 when unauthenticated', async () => {
    mockNoAuth();
    await expect(createProposal(createInput, lineItems)).rejects.toThrow('Unauthenticated');
  });

  it('throws 403 when user lacks proposal.create permission', async () => {
    mockRequirePermission.mockRejectedValueOnce(
      Object.assign(new Error('Forbidden: insufficient permissions'), {
        statusCode: 403,
      })
    );
    await expect(createProposal(createInput, lineItems)).rejects.toThrow('Forbidden');
  });
});

describe('Proposal service - updateProposal', () => {
  it('updates proposal for same org', async () => {
    mockProposalFindFirst.mockResolvedValue({
      id: proposalId,
      organizationId: orgId,
      number: 'PRP-20260001',
      opportunityId: null,
      contactId: null,
      title: 'Test Proposal',
      status: 'draft',
      subtotal: 1000,
      tax: 100,
      total: 1100,
      currency: 'USD',
      validUntil: null,
      notes: null,
      deletedAt: null,
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
    });
    mockProposalUpdate.mockResolvedValue({
      id: proposalId,
      organizationId: orgId,
      title: 'Updated Proposal',
      status: 'draft',
      subtotal: 1000,
      tax: 100,
      total: 1100,
      currency: 'USD',
      validUntil: null,
      notes: null,
      deletedAt: null,
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
    });
    mockAuditLogCreate.mockResolvedValue({ id: 'audit_1' });

    const result = await updateProposal(proposalId, {
      title: 'Updated Proposal',
    } as ProposalUpdateInput);
    expect(result.title).toBe('Updated Proposal');
    expect(mockAuditLogCreate).toHaveBeenCalled();
  });

  it('throws non-disclosing 404 for cross-org update', async () => {
    mockProposalFindFirst.mockResolvedValue(null);

    await expect(
      updateProposal(proposalId, { title: 'Hacked' } as ProposalUpdateInput)
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects update of accepted proposal (immutable)', async () => {
    mockProposalFindFirst.mockResolvedValue({
      id: proposalId,
      organizationId: orgId,
      status: 'accepted',
      items: [],
    });

    await expect(
      updateProposal(proposalId, { title: 'Hacked' } as ProposalUpdateInput)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 403 when user lacks proposal.update permission', async () => {
    mockProposalFindFirst.mockResolvedValue({
      id: proposalId,
      organizationId: orgId,
      status: 'draft',
      items: [],
    });
    mockRequirePermission.mockRejectedValueOnce(
      Object.assign(new Error('Forbidden: insufficient permissions'), {
        statusCode: 403,
      })
    );
    await expect(
      updateProposal(proposalId, { title: 'Updated' } as ProposalUpdateInput)
    ).rejects.toThrow('Forbidden');
  });

  it('rejects invalid status transition', async () => {
    mockProposalFindFirst.mockResolvedValue({
      id: proposalId,
      organizationId: orgId,
      status: 'accepted',
      items: [],
    });

    await expect(
      updateProposal(proposalId, { status: 'draft' } as ProposalUpdateInput)
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('Proposal service - deleteProposal', () => {
  it('soft deletes proposal for same org', async () => {
    mockProposalFindFirst.mockResolvedValue({
      id: proposalId,
      organizationId: orgId,
      number: 'PRP-20260001',
      title: 'Test Proposal',
      status: 'draft',
      deletedAt: null,
    });
    mockProposalUpdate.mockResolvedValue({
      id: proposalId,
      organizationId: orgId,
      deletedAt: new Date(),
    });
    mockAuditLogCreate.mockResolvedValue({ id: 'audit_1' });

    const result = await deleteProposal(proposalId);
    expect(result.deletedAt).toBeDefined();
    expect(mockProposalUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: proposalId },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
    expect(mockAuditLogCreate).toHaveBeenCalled();
  });

  it('throws non-disclosing 404 for cross-org delete', async () => {
    mockProposalFindFirst.mockResolvedValue(null);

    await expect(deleteProposal(proposalId)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws 403 when user lacks proposal.delete permission', async () => {
    mockProposalFindFirst.mockResolvedValue({
      id: proposalId,
      organizationId: orgId,
      status: 'draft',
    });
    mockRequirePermission.mockRejectedValueOnce(
      Object.assign(new Error('Forbidden: insufficient permissions'), {
        statusCode: 403,
      })
    );
    await expect(deleteProposal(proposalId)).rejects.toThrow('Forbidden');
  });

  it('refuses to delete accepted proposal', async () => {
    mockProposalFindFirst.mockResolvedValue({
      id: proposalId,
      organizationId: orgId,
      status: 'accepted',
    });

    await expect(deleteProposal(proposalId)).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
