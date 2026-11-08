'use server';

import { prisma } from '@/lib/db';
import { requirePermission, requireOrganization, type AuthorizedUser } from '@/lib/permissions';
import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';

export interface WorkflowRuleResponse {
  id: string;
  organizationId: string;
  name: string;
  trigger: string;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowExecutionResponse {
  id: string;
  organizationId: string;
  ruleId: string;
  recordType: string;
  recordId: string;
  status: string;
  resultLog: Record<string, unknown> | null;
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

export async function listWorkflowRules() {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'workflow.read');

  const rules = await prisma.workflowRule.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });

  interface WorkflowRuleRecord {
    id: string;
    organizationId: string;
    name: string;
    trigger: string;
    conditions: Record<string, unknown>;
    actions: Record<string, unknown>;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  }

  return rules.map((r: WorkflowRuleRecord) => ({
    id: r.id,
    organizationId: r.organizationId,
    name: r.name,
    trigger: r.trigger,
    conditions: r.conditions,
    actions: r.actions,
    enabled: r.enabled,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function getWorkflowRule(id: string) {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'workflow.read');

  const rule = await prisma.workflowRule.findFirst({
    where: { id, organizationId },
  });

  if (!rule) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  return {
    id: rule.id,
    organizationId: rule.organizationId,
    name: rule.name,
    trigger: rule.trigger,
    conditions: rule.conditions,
    actions: rule.actions,
    enabled: rule.enabled,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}

export async function createWorkflowRule(input: {
  name: string;
  trigger: string;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  enabled?: boolean;
}) {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'workflow.create');

  const rule = await prisma.workflowRule.create({
    data: {
      organizationId,
      name: input.name,
      trigger: input.trigger,
      conditions: input.conditions,
      actions: input.actions,
      enabled: input.enabled ?? true,
    },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'workflow.create',
    entityType: 'WorkflowRule',
    entityId: rule.id,
    after: {
      id: rule.id,
      name: rule.name,
      trigger: rule.trigger,
      enabled: rule.enabled,
    },
    organizationId,
  });

  return {
    id: rule.id,
    organizationId: rule.organizationId,
    name: rule.name,
    trigger: rule.trigger,
    conditions: rule.conditions,
    actions: rule.actions,
    enabled: rule.enabled,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}

export async function updateWorkflowRule(
  id: string,
  input: {
    name?: string;
    trigger?: string;
    conditions?: Record<string, unknown>;
    actions?: Record<string, unknown>;
    enabled?: boolean;
  }
) {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'workflow.update');

  const existing = await prisma.workflowRule.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  const rule = await prisma.workflowRule.update({
    where: { id },
    data: {
      name: input.name ?? existing.name,
      trigger: input.trigger ?? existing.trigger,
      conditions: input.conditions ?? existing.conditions,
      actions: input.actions ?? existing.actions,
      enabled: input.enabled ?? existing.enabled,
    },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'workflow.update',
    entityType: 'WorkflowRule',
    entityId: rule.id,
    before: { id: existing.id, name: existing.name, enabled: existing.enabled },
    after: { id: rule.id, name: rule.name, enabled: rule.enabled },
    organizationId,
  });

  return {
    id: rule.id,
    organizationId: rule.organizationId,
    name: rule.name,
    trigger: rule.trigger,
    conditions: rule.conditions,
    actions: rule.actions,
    enabled: rule.enabled,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}

export async function deleteWorkflowRule(id: string) {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'workflow.delete');

  const existing = await prisma.workflowRule.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  await prisma.workflowRule.delete({
    where: { id },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'workflow.delete',
    entityType: 'WorkflowRule',
    entityId: id,
    before: { id: existing.id, name: existing.name },
    after: null,
    organizationId,
  });

  return { id };
}

export async function listWorkflowExecutions(ruleId?: string) {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'workflow.read');

  const where: Record<string, unknown> = { organizationId };
  if (ruleId) where.ruleId = ruleId;

  const executions = await prisma.workflowExecution.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  interface WorkflowExecutionRecord {
    id: string;
    organizationId: string;
    ruleId: string;
    recordType: string;
    recordId: string;
    status: string;
    resultLog: Record<string, unknown> | null;
    createdAt: Date;
  }

  return executions.map((e: WorkflowExecutionRecord) => ({
    id: e.id,
    organizationId: e.organizationId,
    ruleId: e.ruleId,
    recordType: e.recordType,
    recordId: e.recordId,
    status: e.status,
    resultLog: e.resultLog,
    createdAt: e.createdAt,
  }));
}

export async function createWorkflowExecution(input: {
  ruleId: string;
  recordType: string;
  recordId: string;
  status?: string;
  resultLog?: Record<string, unknown>;
}) {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'workflow.update');

  const execution = await prisma.workflowExecution.create({
    data: {
      organizationId,
      ruleId: input.ruleId,
      recordType: input.recordType,
      recordId: input.recordId,
      status: input.status ?? 'pending',
      resultLog: input.resultLog ?? null,
    },
  });

  return {
    id: execution.id,
    organizationId: execution.organizationId,
    ruleId: execution.ruleId,
    recordType: execution.recordType,
    recordId: execution.recordId,
    status: execution.status,
    resultLog: execution.resultLog,
    createdAt: execution.createdAt,
  };
}
