'use server';

import { prisma } from '@/lib/db';
import { requirePermission, requireOrganization, type AuthorizedUser } from '@/lib/permissions';
import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';

export interface AuditLogResponse {
  id: string;
  organizationId: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
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

export async function listAuditLogs() {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'audit_log.read');

  const logs = await prisma.auditLog.findMany({
    where: { organizationId },
    include: {
      actor: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  interface AuditLogRecord {
    id: string;
    organizationId: string;
    actorId: string | null;
    actorName: string | null;
    action: string;
    entityType: string;
    entityId: string;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
    actor: { id: string; name: string | null; email: string | null } | null;
  }

  return logs.map((log: AuditLogRecord) => ({
    id: log.id,
    organizationId: log.organizationId,
    actorId: log.actorId,
    actorName: log.actorName,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    before: log.before,
    after: log.after,
    metadata: log.metadata,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt,
    actor: log.actor,
  }));
}
