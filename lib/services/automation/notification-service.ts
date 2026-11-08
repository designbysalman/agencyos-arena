'use server';

import { prisma } from '@/lib/db';
import { requirePermission, requireOrganization, type AuthorizedUser } from '@/lib/permissions';
import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';

export interface NotificationResponse {
  id: string;
  organizationId: string;
  userId: string;
  type: string;
  channel: string;
  read: boolean;
  payload: Record<string, unknown> | null;
  sentAt: Date | null;
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

export async function listNotifications(userId?: string) {
  const { userId: actorUserId, organizationId } = await getAuthorizedUser();

  await requirePermission(actorUserId, organizationId, 'notification.read');

  const targetUserId = userId ?? actorUserId;

  // Users can only read their own notifications unless they have admin permissions
  if (targetUserId !== actorUserId) {
    await requirePermission(actorUserId, organizationId, 'notification.update');
  }

  const notifications = await prisma.notification.findMany({
    where: { organizationId, userId: targetUserId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  interface NotificationRecord {
    id: string;
    organizationId: string;
    userId: string;
    type: string;
    channel: string;
    read: boolean;
    payload: Record<string, unknown> | null;
    sentAt: Date | null;
    createdAt: Date;
  }

  return notifications.map((n: NotificationRecord) => ({
    id: n.id,
    organizationId: n.organizationId,
    userId: n.userId,
    type: n.type,
    channel: n.channel,
    read: n.read,
    payload: n.payload,
    sentAt: n.sentAt,
    createdAt: n.createdAt,
  }));
}

export async function getNotification(id: string) {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'notification.read');

  const notification = await prisma.notification.findFirst({
    where: { id, organizationId },
  });

  if (!notification) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  // Users can only read their own notifications
  if (notification.userId !== userId) {
    await requirePermission(userId, organizationId, 'notification.update');
  }

  return {
    id: notification.id,
    organizationId: notification.organizationId,
    userId: notification.userId,
    type: notification.type,
    channel: notification.channel,
    read: notification.read,
    payload: notification.payload,
    sentAt: notification.sentAt,
    createdAt: notification.createdAt,
  };
}

export async function markNotificationRead(id: string) {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'notification.update');

  const notification = await prisma.notification.findFirst({
    where: { id, organizationId },
  });

  if (!notification) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  // Users can only mark their own notifications as read
  if (notification.userId !== userId) {
    await requirePermission(userId, organizationId, 'notification.update');
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { read: true },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'notification.read',
    entityType: 'Notification',
    entityId: id,
    before: { id, read: false },
    after: { id, read: true },
    organizationId,
  });

  return {
    id: updated.id,
    read: updated.read,
  };
}

export async function createNotification({
  userId,
  type,
  channel,
  payload,
}: {
  userId: string;
  type: string;
  channel: string;
  payload?: Record<string, unknown>;
}) {
  const { userId: actorUserId, organizationId } = await getAuthorizedUser();

  await requirePermission(actorUserId, organizationId, 'notification.update');

  // Verify user belongs to org
  const targetUser = await prisma.user.findFirst({
    where: { id: userId, organizationId },
  });

  if (!targetUser) {
    const error = new Error('User not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  const notification = await prisma.notification.create({
    data: {
      organizationId,
      userId,
      type,
      channel,
      read: false,
      payload: payload ?? null,
    },
  });

  await createAuditLog({
    actorId: actorUserId,
    actorName: 'system',
    action: 'notification.create',
    entityType: 'Notification',
    entityId: notification.id,
    after: {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      channel: notification.channel,
    },
    organizationId,
  });

  return {
    id: notification.id,
    organizationId: notification.organizationId,
    userId: notification.userId,
    type: notification.type,
    channel: notification.channel,
    read: notification.read,
    payload: notification.payload,
    createdAt: notification.createdAt,
  };
}

export async function getUnreadCount(userId: string) {
  const { userId: actorUserId, organizationId } = await getAuthorizedUser();

  await requirePermission(actorUserId, organizationId, 'notification.read');

  if (actorUserId !== userId) {
    await requirePermission(actorUserId, organizationId, 'notification.update');
  }

  const count = await prisma.notification.count({
    where: { organizationId, userId, read: false },
  });

  return { count };
}
