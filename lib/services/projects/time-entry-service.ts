'use server';

import { prisma } from '@/lib/db';
import { requirePermission, requireOrganization, type AuthorizedUser } from '@/lib/permissions';
import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import {
  TimeEntryCreateInput,
  TimeEntryUpdateInput,
} from '@/lib/schemas/projects/time-entry.schema';

interface TimeEntryRecord {
  id: string;
  organizationId: string;
  userId: string;
  taskId: string | null;
  date: Date;
  hours: { toString: () => string };
  description: string | null;
  billable: boolean;
  createdAt: Date;
  user: { id: string; name: string | null; email: string | null } | null;
  task: { id: string; title: string; projectId: string } | null;
}

export interface TimeEntryResponse {
  id: string;
  organizationId: string;
  userId: string;
  taskId: string | null;
  date: Date;
  hours: string;
  description: string | null;
  billable: boolean;
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

export async function listTimeEntries(taskId?: string, projectId?: string) {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'time.entry.read');

  const where: Record<string, unknown> = { organizationId };

  if (taskId) {
    // Verify task belongs to org
    const task = await prisma.task.findFirst({
      where: { id: taskId, organizationId },
    });
    if (!task) {
      const error = new Error('Task not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }
    where.taskId = taskId;
  }

  if (projectId) {
    // Verify project belongs to org
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) {
      const error = new Error('Project not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }
    where.task = { projectId };
  }

  const timeEntries = await prisma.timeEntry.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      task: { select: { id: true, title: true, projectId: true } },
    },
    orderBy: { date: 'desc' },
  });

  return timeEntries.map((te: TimeEntryRecord) => ({
    id: te.id,
    organizationId: te.organizationId,
    userId: te.userId,
    taskId: te.taskId,
    date: te.date,
    hours: te.hours.toString(),
    description: te.description,
    billable: te.billable,
    createdAt: te.createdAt,
  }));
}

export async function createTimeEntry(input: TimeEntryCreateInput) {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'time.entry.create');

  // Verify task belongs to org if provided
  if (input.taskId) {
    const task = await prisma.task.findFirst({
      where: { id: input.taskId, organizationId },
    });
    if (!task) {
      const error = new Error('Task not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }
  }

  const timeEntry = await prisma.timeEntry.create({
    data: {
      organizationId,
      userId: input.userId ?? userId,
      taskId: input.taskId ?? null,
      date: new Date(input.date),
      hours: Number(input.hours),
      description: input.description ?? null,
      billable: input.billable,
    },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'time.entry.create',
    entityType: 'TimeEntry',
    entityId: timeEntry.id,
    after: {
      id: timeEntry.id,
      taskId: timeEntry.taskId,
      hours: timeEntry.hours.toString(),
      billable: timeEntry.billable,
    },
    organizationId,
  });

  return {
    id: timeEntry.id,
    organizationId: timeEntry.organizationId,
    userId: timeEntry.userId,
    taskId: timeEntry.taskId,
    date: timeEntry.date,
    hours: timeEntry.hours.toString(),
    description: timeEntry.description,
    billable: timeEntry.billable,
    createdAt: timeEntry.createdAt,
  };
}

export async function updateTimeEntry(id: string, input: TimeEntryUpdateInput) {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'time.entry.update');

  const existing = await prisma.timeEntry.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  const timeEntry = await prisma.timeEntry.update({
    where: { id },
    data: {
      userId: input.userId !== undefined ? input.userId : existing.userId,
      taskId: input.taskId !== undefined ? input.taskId : existing.taskId,
      date: input.date ? new Date(input.date) : existing.date,
      hours: input.hours !== undefined ? Number(input.hours) : existing.hours,
      description: input.description !== undefined ? input.description : existing.description,
      billable: input.billable !== undefined ? input.billable : existing.billable,
    },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'time.entry.update',
    entityType: 'TimeEntry',
    entityId: timeEntry.id,
    before: {
      id: existing.id,
      hours: existing.hours.toString(),
    },
    after: {
      id: timeEntry.id,
      hours: timeEntry.hours.toString(),
    },
    organizationId,
  });

  return {
    id: timeEntry.id,
    organizationId: timeEntry.organizationId,
    userId: timeEntry.userId,
    taskId: timeEntry.taskId,
    date: timeEntry.date,
    hours: timeEntry.hours.toString(),
    description: timeEntry.description,
    billable: timeEntry.billable,
    createdAt: timeEntry.createdAt,
  };
}

export async function deleteTimeEntry(id: string) {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'time.entry.delete');

  const existing = await prisma.timeEntry.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  await prisma.timeEntry.delete({
    where: { id },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'time.entry.delete',
    entityType: 'TimeEntry',
    entityId: id,
    before: { id: existing.id, taskId: existing.taskId, hours: existing.hours.toString() },
    after: null,
    organizationId,
  });

  return { id };
}
