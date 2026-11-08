'use server';

import { prisma } from '@/lib/db';
import { requirePermission, requireOrganization, type AuthorizedUser } from '@/lib/permissions';
import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { ProjectFileCreateInput } from '@/lib/schemas/projects/project-file.schema';

interface ProjectFileRecord {
  id: string;
  organizationId: string;
  projectId: string;
  taskId: string | null;
  fileAssetId: string;
  userId: string | null;
  createdAt: Date;
  fileAsset: {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    storagePath: string;
  };
  user: { id: string; name: string | null; email: string | null } | null;
  task: { id: string; title: string } | null;
}

export interface ProjectFileResponse {
  id: string;
  organizationId: string;
  projectId: string;
  taskId: string | null;
  fileAssetId: string;
  userId: string | null;
  createdAt: Date;
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

export async function listProjectFiles(projectId: string) {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'project.file.read');

  // Verify project belongs to org
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
  });

  if (!project) {
    const error = new Error('Project not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  const files = await prisma.projectFile.findMany({
    where: { projectId, organizationId },
    include: {
      fileAsset: {
        select: { id: true, originalName: true, mimeType: true, size: true, storagePath: true },
      },
      user: { select: { id: true, name: true, email: true } },
      task: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return files.map((f: ProjectFileRecord) => ({
    id: f.id,
    organizationId: f.organizationId,
    projectId: f.projectId,
    taskId: f.taskId,
    fileAssetId: f.fileAssetId,
    userId: f.userId,
    createdAt: f.createdAt,
    fileAsset: f.fileAsset,
    user: f.user,
    task: f.task,
  }));
}

export async function createProjectFile(input: ProjectFileCreateInput) {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'project.file.create');

  // Verify project belongs to org
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, organizationId },
  });

  if (!project) {
    const error = new Error('Project not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  const file = await prisma.projectFile.create({
    data: {
      organizationId,
      projectId: input.projectId,
      taskId: input.taskId ?? null,
      fileAssetId: input.fileAssetId,
      userId: input.userId ?? null,
    },
    include: {
      fileAsset: { select: { id: true, originalName: true, mimeType: true, size: true } },
    },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'project.file.create',
    entityType: 'ProjectFile',
    entityId: file.id,
    after: {
      id: file.id,
      projectId: file.projectId,
      fileAssetId: file.fileAssetId,
    },
    organizationId,
  });

  return {
    id: file.id,
    organizationId: file.organizationId,
    projectId: file.projectId,
    taskId: file.taskId,
    fileAssetId: file.fileAssetId,
    userId: file.userId,
    createdAt: file.createdAt,
  };
}

export async function deleteProjectFile(id: string) {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'project.file.delete');

  const existing = await prisma.projectFile.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  await prisma.projectFile.delete({
    where: { id },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'project.file.delete',
    entityType: 'ProjectFile',
    entityId: id,
    before: { id: existing.id, projectId: existing.projectId, fileAssetId: existing.fileAssetId },
    after: null,
    organizationId,
  });

  return { id };
}
