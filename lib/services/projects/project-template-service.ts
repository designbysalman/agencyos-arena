'use server';

import { prisma } from '@/lib/db';
import { requirePermission, requireOrganization, type AuthorizedUser } from '@/lib/permissions';
import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import {
  ProjectTemplateCreateInput,
  ProjectTemplateUpdateInput,
} from '@/lib/schemas/projects/project-template.schema';

interface ProjectTemplateRecord {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectTemplateResponse {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
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

export async function listProjectTemplates() {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'project.template.read');

  const templates = await prisma.projectTemplate.findMany({
    where: { organizationId },
    orderBy: { updatedAt: 'desc' },
  });

  return templates.map((t: ProjectTemplateRecord) => ({
    id: t.id,
    organizationId: t.organizationId,
    name: t.name,
    description: t.description,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
}

export async function getProjectTemplate(id: string) {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'project.template.read');

  const template = await prisma.projectTemplate.findFirst({
    where: { id, organizationId },
  });

  if (!template) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  return {
    id: template.id,
    organizationId: template.organizationId,
    name: template.name,
    description: template.description,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

export async function createProjectTemplate(input: ProjectTemplateCreateInput) {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'project.template.create');

  const template = await prisma.projectTemplate.create({
    data: {
      organizationId,
      name: input.name,
      description: input.description ?? null,
    },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'project.template.create',
    entityType: 'ProjectTemplate',
    entityId: template.id,
    after: {
      id: template.id,
      name: template.name,
    },
    organizationId,
  });

  return {
    id: template.id,
    organizationId: template.organizationId,
    name: template.name,
    description: template.description,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

export async function updateProjectTemplate(id: string, input: ProjectTemplateUpdateInput) {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'project.template.update');

  const existing = await prisma.projectTemplate.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  const template = await prisma.projectTemplate.update({
    where: { id },
    data: {
      name: input.name ?? existing.name,
      description: input.description !== undefined ? input.description : existing.description,
    },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'project.template.update',
    entityType: 'ProjectTemplate',
    entityId: template.id,
    before: {
      id: existing.id,
      name: existing.name,
    },
    after: {
      id: template.id,
      name: template.name,
    },
    organizationId,
  });

  return {
    id: template.id,
    organizationId: template.organizationId,
    name: template.name,
    description: template.description,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

export async function deleteProjectTemplate(id: string) {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'project.template.delete');

  const existing = await prisma.projectTemplate.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  await prisma.projectTemplate.delete({
    where: { id },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'project.template.delete',
    entityType: 'ProjectTemplate',
    entityId: id,
    before: { id: existing.id, name: existing.name },
    after: null,
    organizationId,
  });

  return { id };
}
