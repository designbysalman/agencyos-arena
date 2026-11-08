'use server';

import { prisma } from '@/lib/db';
import { requirePermission, requireOrganization, type AuthorizedUser } from '@/lib/permissions';
import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import {
  ProjectApprovalCreateInput,
  ProjectApprovalUpdateInput,
} from '@/lib/schemas/projects/project-approval.schema';

interface ProjectApprovalRecord {
  id: string;
  organizationId: string;
  projectId: string;
  contactId: string | null;
  status: string;
  feedback: string | null;
  approvedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  contact: { id: string; firstName: string | null; lastName: string; email: string | null } | null;
  creator: { id: string; name: string | null; email: string | null } | null;
}

export interface ProjectApprovalResponse {
  id: string;
  organizationId: string;
  projectId: string;
  contactId: string | null;
  status: string;
  feedback: string | null;
  approvedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

async function getAuthorizedUser(): Promise<AuthorizedUser> {
  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    const error = new Error('Unauthenticated') as Error & { statusCode?: number };
    error.statusCode = 401;
    throw error;
  }

  const user = result.user as { role?: string; organizationId?: string };
  const { organizationId } = await requireOrganization(result.user.id);
  return {
    userId: result.user.id,
    organizationId,
    email: result.user.email ?? '',
    role: user.role ?? 'employee',
  };
}

async function createAuditLog({
  actorId,
  actorName,
  action,
  entityType,
  entityId,
  before,
  after,
  metadata,
  organizationId,
}: {
  actorId: string;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  organizationId: string;
}) {
  await prisma.auditLog.create({
    data: {
      actorId,
      actorName,
      action,
      entityType,
      entityId,
      before: before ?? null,
      after: after ?? null,
      metadata: metadata ?? null,
      organizationId,
    },
  });
}

export async function listProjectApprovals(projectId: string) {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'project.approval.read');

  // Verify project belongs to org
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
  });

  if (!project) {
    const error = new Error('Project not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  const approvals = await prisma.projectApproval.findMany({
    where: { projectId, organizationId },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      creator: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return approvals.map((a: ProjectApprovalRecord) => ({
    id: a.id,
    organizationId: a.organizationId,
    projectId: a.projectId,
    contactId: a.contactId,
    status: a.status,
    feedback: a.feedback,
    approvedAt: a.approvedAt,
    createdBy: a.createdBy,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    contact: a.contact,
    creator: a.creator,
  }));
}

export async function createProjectApproval(input: ProjectApprovalCreateInput) {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'project.approval.create');

  // Verify project belongs to org
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, organizationId },
  });

  if (!project) {
    const error = new Error('Project not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  // Verify contact belongs to org if provided
  if (input.contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: input.contactId, organizationId },
    });
    if (!contact) {
      const error = new Error('Contact not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }
  }

  const approval = await prisma.projectApproval.create({
    data: {
      organizationId,
      projectId: input.projectId,
      contactId: input.contactId ?? null,
      status: input.status,
      feedback: input.feedback ?? null,
      ...(input.status === 'approved' ? { approvedAt: new Date() } : {}),
      createdBy: userId,
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'project.approval.create',
    entityType: 'ProjectApproval',
    entityId: approval.id,
    after: {
      id: approval.id,
      projectId: approval.projectId,
      status: approval.status,
    },
    organizationId,
  });

  return {
    id: approval.id,
    organizationId: approval.organizationId,
    projectId: approval.projectId,
    contactId: approval.contactId,
    status: approval.status,
    feedback: approval.feedback,
    approvedAt: approval.approvedAt,
    createdBy: approval.createdBy,
    createdAt: approval.createdAt,
    updatedAt: approval.updatedAt,
  };
}

export async function updateProjectApproval(id: string, input: ProjectApprovalUpdateInput) {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'project.approval.update');

  const existing = await prisma.projectApproval.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  const approval = await prisma.projectApproval.update({
    where: { id },
    data: {
      contactId: input.contactId !== undefined ? input.contactId : existing.contactId,
      status: input.status ?? existing.status,
      feedback: input.feedback !== undefined ? input.feedback : existing.feedback,
      ...(input.status === 'approved' && existing.status !== 'approved'
        ? { approvedAt: new Date() }
        : {}),
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'project.approval.update',
    entityType: 'ProjectApproval',
    entityId: approval.id,
    before: {
      id: existing.id,
      status: existing.status,
    },
    after: {
      id: approval.id,
      status: approval.status,
    },
    organizationId,
  });

  return {
    id: approval.id,
    organizationId: approval.organizationId,
    projectId: approval.projectId,
    contactId: approval.contactId,
    status: approval.status,
    feedback: approval.feedback,
    approvedAt: approval.approvedAt,
    createdBy: approval.createdBy,
    createdAt: approval.createdAt,
    updatedAt: approval.updatedAt,
  };
}
