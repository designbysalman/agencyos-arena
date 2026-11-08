'use server';

import { prisma } from '@/lib/db';
import { requirePermission, requireOrganization, type AuthorizedUser } from '@/lib/permissions';
import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { TemplateCreateInput, TemplateUpdateInput } from '@/lib/schemas/documents/template.schema';

interface TemplateRecord {
  id: string;
  organizationId: string;
  title: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateResponse {
  id: string;
  organizationId: string;
  name: string;
  type: string;
  content: string | null;
  variables: Record<string, string> | null;
  isDefault: boolean;
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

export async function listTemplates() {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'template.read');

  const templates = await prisma.document.findMany({
    where: {
      organizationId,
      type: { contains: 'template', mode: 'insensitive' },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return templates.map((t: TemplateRecord) => ({
    id: t.id,
    organizationId: t.organizationId,
    name: t.title,
    type: t.type,
    content: null,
    variables: null,
    isDefault: false,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
}

export async function getTemplate(id: string) {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'template.read');

  const template = await prisma.document.findFirst({
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
    name: template.title,
    type: template.type,
    content: null,
    variables: null,
    isDefault: false,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

export async function createTemplate(input: TemplateCreateInput) {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'template.create');

  // If this is set as default, unset other defaults of same type
  if (input.isDefault) {
    await prisma.document.updateMany({
      where: {
        organizationId,
        type: input.type,
      },
      data: {},
    });
  }

  const template = await prisma.document.create({
    data: {
      organizationId,
      title: input.name,
      type: input.type,
      visibility: 'private',
      version: 1,
    },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'template.create',
    entityType: 'Template',
    entityId: template.id,
    after: {
      id: template.id,
      name: input.name,
      type: input.type,
    },
    organizationId,
  });

  return {
    id: template.id,
    organizationId: template.organizationId,
    name: input.name,
    type: input.type,
    content: input.content,
    variables: input.variables,
    isDefault: input.isDefault,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

export async function updateTemplate(id: string, input: TemplateUpdateInput) {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'template.update');

  const existing = await prisma.document.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  const template = await prisma.document.update({
    where: { id },
    data: {
      title: input.name ?? existing.title,
      type: input.type ?? existing.type,
    },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'template.update',
    entityType: 'Template',
    entityId: template.id,
    before: {
      id: existing.id,
      name: existing.title,
      type: existing.type,
    },
    after: {
      id: template.id,
      name: template.title,
      type: template.type,
    },
    organizationId,
  });

  return {
    id: template.id,
    organizationId: template.organizationId,
    name: template.title,
    type: template.type,
    content: null,
    variables: null,
    isDefault: false,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

export async function deleteTemplate(id: string) {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'template.delete');

  const existing = await prisma.document.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  await prisma.document.delete({
    where: { id },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'template.delete',
    entityType: 'Template',
    entityId: id,
    before: { id: existing.id, name: existing.title, type: existing.type },
    after: null,
    organizationId,
  });

  return { id };
}
