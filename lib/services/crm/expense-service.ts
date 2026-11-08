'use server';

import { prisma } from '@/lib/db';
import { requirePermission, requireOrganization, type AuthorizedUser } from '@/lib/permissions';
import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { ExpenseCreateInput, ExpenseUpdateInput } from '@/lib/schemas/crm/expense.schema';

export interface ExpenseResponse {
  id: string;
  organizationId: string;
  projectId: string | null;
  category: string;
  amount: string;
  expenseDate: Date;
  receiptUrl: string | null;
  billable: boolean;
  createdAt: Date;
}

interface ExpenseRecord {
  id: string;
  organizationId: string;
  projectId: string | null;
  category: string;
  amount: { toString: () => string };
  expenseDate: Date;
  receiptUrl: string | null;
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

export async function listExpenses() {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'expense.read');

  const expenses = await prisma.expenseItem.findMany({
    where: { organizationId },
    orderBy: { expenseDate: 'desc' },
  });

  return expenses.map((e: ExpenseRecord) => ({
    id: e.id,
    organizationId: e.organizationId,
    projectId: e.projectId,
    category: e.category,
    amount: e.amount.toString(),
    expenseDate: e.expenseDate,
    receiptUrl: e.receiptUrl,
    billable: e.billable,
    createdAt: e.createdAt,
  }));
}

export async function getExpense(id: string) {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'expense.read');

  const expense = await prisma.expenseItem.findFirst({
    where: { id, organizationId },
  });

  if (!expense) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  return {
    id: expense.id,
    organizationId: expense.organizationId,
    projectId: expense.projectId,
    category: expense.category,
    amount: expense.amount.toString(),
    expenseDate: expense.expenseDate,
    receiptUrl: expense.receiptUrl,
    billable: expense.billable,
    createdAt: expense.createdAt,
  };
}

export async function createExpense(input: ExpenseCreateInput) {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'expense.create');

  // Verify project belongs to org if provided
  if (input.projectId) {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, organizationId },
    });
    if (!project) {
      const error = new Error('Project not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }
  }

  const expense = await prisma.expenseItem.create({
    data: {
      organizationId,
      projectId: input.projectId ?? null,
      category: input.category,
      amount: Number(input.amount),
      expenseDate: new Date(input.expenseDate),
      receiptUrl: input.receiptUrl ?? null,
      billable: input.billable,
    },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'expense.create',
    entityType: 'ExpenseItem',
    entityId: expense.id,
    after: {
      id: expense.id,
      category: expense.category,
      amount: expense.amount.toString(),
      billable: expense.billable,
    },
    organizationId,
  });

  return {
    id: expense.id,
    organizationId: expense.organizationId,
    projectId: expense.projectId,
    category: expense.category,
    amount: expense.amount.toString(),
    expenseDate: expense.expenseDate,
    receiptUrl: expense.receiptUrl,
    billable: expense.billable,
    createdAt: expense.createdAt,
  };
}

export async function updateExpense(id: string, input: ExpenseUpdateInput) {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'expense.update');

  const existing = await prisma.expenseItem.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  if (input.projectId !== undefined && input.projectId !== null) {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, organizationId },
    });
    if (!project) {
      const error = new Error('Project not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }
  }

  const expense = await prisma.expenseItem.update({
    where: { id },
    data: {
      projectId: input.projectId !== undefined ? input.projectId : existing.projectId,
      category: input.category ?? existing.category,
      amount: input.amount !== undefined ? Number(input.amount) : existing.amount,
      expenseDate: input.expenseDate ? new Date(input.expenseDate) : existing.expenseDate,
      receiptUrl: input.receiptUrl !== undefined ? input.receiptUrl : existing.receiptUrl,
      billable: input.billable !== undefined ? input.billable : existing.billable,
    },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'expense.update',
    entityType: 'ExpenseItem',
    entityId: expense.id,
    before: { id: existing.id, amount: existing.amount.toString(), billable: existing.billable },
    after: { id: expense.id, amount: expense.amount.toString(), billable: expense.billable },
    organizationId,
  });

  return {
    id: expense.id,
    organizationId: expense.organizationId,
    projectId: expense.projectId,
    category: expense.category,
    amount: expense.amount.toString(),
    expenseDate: expense.expenseDate,
    receiptUrl: expense.receiptUrl,
    billable: expense.billable,
    createdAt: expense.createdAt,
  };
}

export async function deleteExpense(id: string) {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'expense.delete');

  const existing = await prisma.expenseItem.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  await prisma.expenseItem.delete({
    where: { id },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'expense.delete',
    entityType: 'ExpenseItem',
    entityId: id,
    before: { id: existing.id, category: existing.category, amount: existing.amount.toString() },
    after: null,
    organizationId,
  });

  return { id };
}
