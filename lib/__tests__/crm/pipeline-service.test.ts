/**
 * Unit tests for Pipeline service layer.
 *
 * Prisma is mocked so these tests run without a live database.
 * Tests cover:
 * - Organization-scoped queries (org isolation)
 * - Soft-delete filtering
 * - Permission enforcement (401, 403)
 * - Cross-org non-disclosing 404
 * - Default pipeline management
 * - Audit logging
 * - Pipeline deletion safeguards
 */

vi.mock('@/lib/db', () => ({
  prisma: {
    pipeline: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    pipelineStage: {
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
  listPipelines,
  getPipeline,
  createPipeline,
  updatePipeline,
  deletePipeline,
} from '@/lib/services/crm/pipeline-service';
import type { PipelineCreateInput, PipelineUpdateInput } from '@/lib/schemas/crm/pipeline.schema';

const mockPipelineFindMany = prisma.pipeline.findMany as unknown as ReturnType<typeof vi.fn>;
const mockPipelineFindFirst = prisma.pipeline.findFirst as unknown as ReturnType<typeof vi.fn>;
const mockPipelineCreate = prisma.pipeline.create as unknown as ReturnType<typeof vi.fn>;
const mockPipelineUpdate = prisma.pipeline.update as unknown as ReturnType<typeof vi.fn>;
const mockPipelineUpdateMany = prisma.pipeline.updateMany as unknown as ReturnType<typeof vi.fn>;
const mockPipelineCount = prisma.pipeline.count as unknown as ReturnType<typeof vi.fn>;
const mockPipelineStageCount = prisma.pipelineStage.count as unknown as ReturnType<typeof vi.fn>;
const mockAuditLogCreate = prisma.auditLog.create as unknown as ReturnType<typeof vi.fn>;
const mockGetSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const mockCookies = cookies as unknown as ReturnType<typeof vi.fn>;
const mockRequirePermission = requirePermission as unknown as ReturnType<typeof vi.fn>;
const mockRequireOrganization = requireOrganization as unknown as ReturnType<typeof vi.fn>;

const orgId = 'org_123';
const userId = 'user_123';
const pipelineId = 'pipeline_123';

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
  if (granted) {
    mockRequirePermission.mockResolvedValue(true);
  } else {
    const err = new Error('Forbidden: insufficient permissions') as Error & {
      statusCode?: number;
    };
    err.statusCode = 403;
    mockRequirePermission.mockRejectedValue(err);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth();
  mockRequirePerm(true);
});

describe('Pipeline service - listPipelines', () => {
  it('returns org-scoped pipelines with pagination', async () => {
    mockPipelineFindMany.mockResolvedValue([
      {
        id: pipelineId,
        organizationId: orgId,
        name: 'Sales Pipeline',
        description: null,
        isDefault: true,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    mockPipelineCount.mockResolvedValue(1);

    const result = await listPipelines({
      page: 1,
      pageSize: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      includeDeleted: false,
    });

    expect(mockPipelineFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: orgId, deletedAt: null },
      })
    );
    expect(result.pipelines).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
  });

  it('throws 401 when unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(
      listPipelines({
        page: 1,
        pageSize: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        includeDeleted: false,
      })
    ).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('throws 403 when missing pipeline.read permission', async () => {
    mockRequirePerm(false);

    await expect(
      listPipelines({
        page: 1,
        pageSize: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        includeDeleted: false,
      })
    ).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});

describe('Pipeline service - getPipeline', () => {
  it('returns pipeline for same org', async () => {
    mockPipelineFindFirst.mockResolvedValue({
      id: pipelineId,
      organizationId: orgId,
      name: 'Sales Pipeline',
      description: null,
      isDefault: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await getPipeline(pipelineId);

    expect(mockPipelineFindFirst).toHaveBeenCalledWith({
      where: { id: pipelineId, organizationId: orgId },
    });
    expect(result.id).toBe(pipelineId);
  });

  it('throws non-disclosing 404 for cross-org pipeline', async () => {
    mockPipelineFindFirst.mockResolvedValue(null);

    await expect(getPipeline(pipelineId)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('Pipeline service - createPipeline', () => {
  it('creates pipeline with organization scoping and audit logging', async () => {
    mockPipelineFindFirst.mockResolvedValue(null);
    mockPipelineCreate.mockResolvedValue({
      id: pipelineId,
      organizationId: orgId,
      name: 'Sales Pipeline',
      description: null,
      isDefault: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await createPipeline({
      name: 'Sales Pipeline',
    } as PipelineCreateInput);

    expect(mockPipelineCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: orgId,
          name: 'Sales Pipeline',
        }),
      })
    );
    expect(mockAuditLogCreate).toHaveBeenCalled();
    expect(result.id).toBe(pipelineId);
  });

  it('unsets existing default when creating new default pipeline', async () => {
    mockPipelineUpdateMany.mockResolvedValue({ count: 1 });
    mockPipelineCreate.mockResolvedValue({
      id: pipelineId,
      organizationId: orgId,
      name: 'Default Pipeline',
      description: null,
      isDefault: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await createPipeline({
      name: 'Default Pipeline',
      isDefault: true,
    } as PipelineCreateInput);

    expect(mockPipelineUpdateMany).toHaveBeenCalledWith({
      where: { organizationId: orgId, isDefault: true },
      data: { isDefault: false },
    });
  });
});

describe('Pipeline service - updatePipeline', () => {
  it('updates pipeline for same org', async () => {
    mockPipelineFindFirst.mockResolvedValue({
      id: pipelineId,
      organizationId: orgId,
      name: 'Old Name',
      description: null,
      isDefault: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPipelineUpdate.mockResolvedValue({
      id: pipelineId,
      organizationId: orgId,
      name: 'New Name',
      description: null,
      isDefault: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await updatePipeline(pipelineId, {
      name: 'New Name',
    } as PipelineUpdateInput);

    expect(mockPipelineUpdate).toHaveBeenCalledWith({
      where: { id: pipelineId },
      data: expect.objectContaining({ name: 'New Name' }),
    });
    expect(mockAuditLogCreate).toHaveBeenCalled();
    expect(result.name).toBe('New Name');
  });

  it('throws non-disclosing 404 for cross-org update', async () => {
    mockPipelineFindFirst.mockResolvedValue(null);

    await expect(
      updatePipeline(pipelineId, { name: 'New' } as PipelineUpdateInput)
    ).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('Pipeline service - deletePipeline', () => {
  it('soft deletes pipeline', async () => {
    mockPipelineFindFirst.mockResolvedValue({
      id: pipelineId,
      organizationId: orgId,
      name: 'Sales Pipeline',
      description: null,
      isDefault: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPipelineStageCount.mockResolvedValue(0);
    mockPipelineUpdate.mockResolvedValue({
      id: pipelineId,
      organizationId: orgId,
      name: 'Sales Pipeline',
      description: null,
      isDefault: false,
      deletedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await deletePipeline(pipelineId);

    expect(mockPipelineUpdate).toHaveBeenCalledWith({
      where: { id: pipelineId },
      data: { deletedAt: expect.any(Date) },
    });
    expect(mockAuditLogCreate).toHaveBeenCalled();
    expect(result.deletedAt).toBeDefined();
  });

  it('prevents deletion when pipeline has stages', async () => {
    mockPipelineFindFirst.mockResolvedValue({
      id: pipelineId,
      organizationId: orgId,
      name: 'Sales Pipeline',
      description: null,
      isDefault: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPipelineStageCount.mockResolvedValue(3);

    await expect(deletePipeline(pipelineId)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('throws non-disclosing 404 for cross-org delete', async () => {
    mockPipelineFindFirst.mockResolvedValue(null);

    await expect(deletePipeline(pipelineId)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
