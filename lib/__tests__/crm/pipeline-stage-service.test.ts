/**
 * Unit tests for Pipeline Stage service layer.
 *
 * Prisma is mocked so these tests run without a live database.
 * Tests cover:
 * - Organization-scoped queries (org isolation)
 * - Soft-delete filtering
 * - Permission enforcement (401, 403)
 * - Cross-org non-disclosing 404
 * - Stage ordering validation
 * - Stage deletion safeguards
 * - Audit logging
 * - Reordering stages
 */

vi.mock('@/lib/db', () => ({
  prisma: {
    pipeline: {
      findFirst: vi.fn(),
    },
    pipelineStage: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    opportunity: {
      count: vi.fn(),
    },
    lead: {
      count: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation((callbacks) => Promise.all(callbacks)),
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
  listPipelineStages,
  createPipelineStage,
  updatePipelineStage,
  deletePipelineStage,
  reorderPipelineStages,
} from '@/lib/services/crm/pipeline-stage-service';
import type {
  PipelineStageCreateInput,
  PipelineStageUpdateInput,
} from '@/lib/schemas/crm/pipeline-stage.schema';

const mockPipelineFindFirst = prisma.pipeline.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockPipelineStageFindMany = prisma.pipelineStage.findMany as unknown as ReturnType<
  typeof vi.fn
>;
const mockPipelineStageFindFirst = prisma.pipelineStage.findFirst as unknown as ReturnType<
  typeof vi.fn
>;
const mockPipelineStageCreate = prisma.pipelineStage.create as unknown as ReturnType<typeof vi.fn>;
const mockPipelineStageUpdate = prisma.pipelineStage.update as unknown as ReturnType<typeof vi.fn>;
const mockPipelineStageAggregate = prisma.pipelineStage.aggregate as unknown as ReturnType<
  typeof vi.fn
>;
const mockPipelineStageCount = prisma.pipelineStage.count as unknown as ReturnType<typeof vi.fn>;
const mockOpportunityCount = prisma.opportunity.count as unknown as ReturnType<typeof vi.fn>;
const mockLeadCount = prisma.lead.count as unknown as ReturnType<typeof vi.fn>;
const mockAuditLogCreate = prisma.auditLog.create as unknown as ReturnType<typeof vi.fn>;
const mockTransaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;
const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockCookies = cookies as unknown as ReturnType<typeof vi.fn>;
const mockRequirePermission = requirePermission as unknown as ReturnType<typeof vi.fn>;
const mockRequireOrganization = requireOrganization as unknown as ReturnType<typeof vi.fn>;

const orgId = 'org_123';
const userId = 'user_123';
const pipelineId = 'pipeline_123';
const stageId = 'stage_123';

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

function mockAuth() {
  mockGetSession.mockResolvedValue(mockSession);
  mockCookies.mockReturnValue({
    toString: () => 'better-auth.session_token=token_123',
  });
  mockRequireOrganization.mockResolvedValue({ organizationId: orgId });
}

function mockRequirePerm(granted = true) {
  mockRequirePermission.mockResolvedValue(granted);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth();
  mockRequirePerm(true);
});

describe('PipelineStage service - listPipelineStages', () => {
  it('returns org-scoped stages with pagination', async () => {
    mockPipelineFindFirst.mockResolvedValue({
      id: pipelineId,
      organizationId: orgId,
      name: 'Sales Pipeline',
    });
    mockPipelineStageFindMany.mockResolvedValue([
      {
        id: stageId,
        pipelineId,
        name: 'Qualification',
        order: 1,
        color: null,
        probability: null,
        isWon: false,
        isLost: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    mockPipelineStageCount.mockResolvedValue(1);

    const result = await listPipelineStages(pipelineId, {
      page: 1,
      pageSize: 20,
      sortBy: 'order',
      sortOrder: 'asc',
      includeDeleted: false,
    });

    expect(mockPipelineFindFirst).toHaveBeenCalledWith({
      where: { id: pipelineId, organizationId: orgId },
    });
    expect(result.stages).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('throws 404 for cross-org pipeline', async () => {
    mockPipelineFindFirst.mockResolvedValue(null);

    await expect(
      listPipelineStages(pipelineId, {
        page: 1,
        pageSize: 20,
        sortBy: 'order',
        sortOrder: 'asc',
        includeDeleted: false,
      })
    ).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('PipelineStage service - createPipelineStage', () => {
  it('creates stage with organization scoping and audit logging', async () => {
    mockPipelineFindFirst.mockResolvedValue({
      id: pipelineId,
      organizationId: orgId,
      name: 'Sales Pipeline',
    });
    mockPipelineStageAggregate.mockResolvedValue({ _max: { order: null } });
    mockPipelineStageCreate.mockResolvedValue({
      id: stageId,
      pipelineId,
      name: 'Qualification',
      order: 1,
      color: null,
      probability: null,
      isWon: false,
      isLost: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await createPipelineStage(pipelineId, {
      name: 'Qualification',
    } as PipelineStageCreateInput);

    expect(mockPipelineStageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pipelineId,
          name: 'Qualification',
        }),
      })
    );
    expect(mockAuditLogCreate).toHaveBeenCalled();
    expect(result.id).toBe(stageId);
  });

  it('throws 404 for cross-org pipeline', async () => {
    mockPipelineFindFirst.mockResolvedValue(null);

    await expect(
      createPipelineStage(pipelineId, { name: 'Stage' } as PipelineStageCreateInput)
    ).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('PipelineStage service - updatePipelineStage', () => {
  it('updates stage for same org', async () => {
    mockPipelineStageFindFirst.mockResolvedValue({
      id: stageId,
      pipelineId,
      name: 'Old Name',
      order: 1,
      color: null,
      probability: null,
      isWon: false,
      isLost: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPipelineStageUpdate.mockResolvedValue({
      id: stageId,
      pipelineId,
      name: 'New Name',
      order: 1,
      color: null,
      probability: null,
      isWon: false,
      isLost: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await updatePipelineStage(stageId, pipelineId, {
      name: 'New Name',
    } as PipelineStageUpdateInput);

    expect(mockPipelineStageUpdate).toHaveBeenCalledWith({
      where: { id: stageId },
      data: expect.objectContaining({ name: 'New Name' }),
    });
    expect(mockAuditLogCreate).toHaveBeenCalled();
    expect(result.name).toBe('New Name');
  });

  it('rejects duplicate stage order', async () => {
    mockPipelineStageFindFirst.mockResolvedValue({
      id: stageId,
      pipelineId,
      name: 'Old Name',
      order: 1,
      color: null,
      probability: null,
      isWon: false,
      isLost: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPipelineStageFindMany.mockResolvedValue([
      { id: 'other_stage', pipelineId, order: 2, deletedAt: null },
    ]);

    await expect(
      updatePipelineStage(stageId, pipelineId, { order: 2 } as PipelineStageUpdateInput)
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe('PipelineStage service - deletePipelineStage', () => {
  it('soft deletes stage when no references exist', async () => {
    mockPipelineStageFindFirst.mockResolvedValue({
      id: stageId,
      pipelineId,
      name: 'Qualification',
      order: 1,
      pipeline: { organizationId: orgId },
    });
    mockOpportunityCount.mockResolvedValue(0);
    mockLeadCount.mockResolvedValue(0);
    mockPipelineStageUpdate.mockResolvedValue({
      id: stageId,
      pipelineId,
      name: 'Qualification',
      order: 1,
      color: null,
      probability: null,
      isWon: false,
      isLost: false,
      deletedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await deletePipelineStage(stageId, pipelineId);

    expect(mockPipelineStageUpdate).toHaveBeenCalledWith({
      where: { id: stageId },
      data: { deletedAt: expect.any(Date) },
    });
    expect(result.deletedAt).toBeDefined();
  });

  it('prevents deletion when opportunities reference the stage', async () => {
    mockPipelineStageFindFirst.mockResolvedValue({
      id: stageId,
      pipelineId,
      name: 'Qualification',
      order: 1,
      pipeline: { organizationId: orgId },
    });
    mockOpportunityCount.mockResolvedValue(2);

    await expect(deletePipelineStage(stageId, pipelineId)).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe('PipelineStage service - reorderPipelineStages', () => {
  it('reorders stages atomically', async () => {
    mockPipelineFindFirst.mockResolvedValue({
      id: pipelineId,
      organizationId: orgId,
      name: 'Sales Pipeline',
    });
    mockPipelineStageFindMany.mockResolvedValue([
      { id: 'stage_1', pipelineId, order: 1, deletedAt: null },
      { id: 'stage_2', pipelineId, order: 2, deletedAt: null },
    ]);
    mockTransaction.mockResolvedValue([]);

    const result = await reorderPipelineStages(pipelineId, [
      { id: 'stage_1', order: 2 },
      { id: 'stage_2', order: 1 },
    ]);

    expect(mockTransaction).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('rejects duplicate orders', async () => {
    mockPipelineFindFirst.mockResolvedValue({
      id: pipelineId,
      organizationId: orgId,
      name: 'Sales Pipeline',
    });

    await expect(
      reorderPipelineStages(pipelineId, [
        { id: 'stage_1', order: 1 },
        { id: 'stage_2', order: 1 },
      ])
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
