'use server';

import { prisma } from '@/lib/db';
import { requirePermission, requireOrganization, type AuthorizedUser } from '@/lib/permissions';
import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import {
  ContractCreateInput,
  ContractUpdateInput,
  ContractSignInput,
} from '@/lib/schemas/documents/contract.schema';

interface ContractRecord {
  id: string;
  organizationId: string;
  proposalId: string | null;
  projectId: string | null;
  title: string;
  status: string;
  signatureReference: string | null;
  signedAt: Date | null;
  signedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  proposal: { id: string; number: string; title: string; status: string } | null;
  project: { id: string; name: string; status: string } | null;
  signer: { id: string; name: string | null; email: string | null } | null;
}

export interface ContractResponse {
  id: string;
  organizationId: string;
  proposalId: string | null;
  projectId: string | null;
  title: string;
  status: string;
  signatureReference: string | null;
  signedAt: Date | null;
  signedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  proposal: { id: string; number: string; title: string; status: string } | null;
  project: { id: string; name: string; status: string } | null;
  signer: { id: string; name: string | null; email: string | null } | null;
}

const CONTRACT_STATUSES = ['draft', 'sent', 'signed', 'voided'];

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
  ipAddress,
  userAgent,
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
  ipAddress?: string | null;
  userAgent?: string | null;
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
      ipAddress,
      userAgent,
      organizationId,
    },
  });
}

export async function listContracts(): Promise<ContractResponse[]> {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'contract.read');

  const contracts = await prisma.contract.findMany({
    where: { organizationId },
    include: {
      proposal: { select: { id: true, number: true, title: true, status: true } },
      project: { select: { id: true, name: true, status: true } },
      signer: { select: { id: true, name: true, email: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return contracts.map((c: ContractRecord) => ({
    id: c.id,
    organizationId: c.organizationId,
    proposalId: c.proposalId,
    projectId: c.projectId,
    title: c.title,
    status: c.status,
    signatureReference: c.signatureReference,
    signedAt: c.signedAt,
    signedBy: c.signedBy,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    proposal: c.proposal
      ? {
          id: c.proposal.id,
          number: c.proposal.number,
          title: c.proposal.title,
          status: c.proposal.status,
        }
      : null,
    project: c.project
      ? { id: c.project.id, name: c.project.name, status: c.project.status }
      : null,
    signer: c.signer ? { id: c.signer.id, name: c.signer.name, email: c.signer.email } : null,
  }));
}

export async function getContract(id: string): Promise<ContractResponse> {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'contract.read');

  const contract = await prisma.contract.findFirst({
    where: { id, organizationId },
    include: {
      proposal: { select: { id: true, number: true, title: true, status: true } },
      project: { select: { id: true, name: true, status: true } },
      signer: { select: { id: true, name: true, email: true } },
    },
  });

  if (!contract) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  return {
    id: contract.id,
    organizationId: contract.organizationId,
    proposalId: contract.proposalId,
    projectId: contract.projectId,
    title: contract.title,
    status: contract.status,
    signatureReference: contract.signatureReference,
    signedAt: contract.signedAt,
    signedBy: contract.signedBy,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
    proposal: contract.proposal
      ? {
          id: contract.proposal.id,
          number: contract.proposal.number,
          title: contract.proposal.title,
          status: contract.proposal.status,
        }
      : null,
    project: contract.project
      ? { id: contract.project.id, name: contract.project.name, status: contract.project.status }
      : null,
    signer: contract.signer
      ? { id: contract.signer.id, name: contract.signer.name, email: contract.signer.email }
      : null,
  };
}

export async function createContract(input: ContractCreateInput): Promise<ContractResponse> {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'contract.create');

  // Validate proposal belongs to same org if provided
  if (input.proposalId) {
    const proposal = await prisma.proposal.findFirst({
      where: { id: input.proposalId, organizationId },
    });
    if (!proposal) {
      const error = new Error('Proposal not found') as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }
  }

  // Validate project belongs to same org if provided
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

  const contract = await prisma.contract.create({
    data: {
      organizationId,
      proposalId: input.proposalId ?? null,
      projectId: input.projectId ?? null,
      title: input.title,
      status: input.status,
    },
    include: {
      proposal: { select: { id: true, number: true, title: true, status: true } },
      project: { select: { id: true, name: true, status: true } },
    },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'contract.create',
    entityType: 'Contract',
    entityId: contract.id,
    after: {
      id: contract.id,
      title: contract.title,
      status: contract.status,
      proposalId: contract.proposalId,
      projectId: contract.projectId,
    },
    organizationId,
  });

  return {
    id: contract.id,
    organizationId: contract.organizationId,
    proposalId: contract.proposalId,
    projectId: contract.projectId,
    title: contract.title,
    status: contract.status,
    signatureReference: contract.signatureReference,
    signedAt: contract.signedAt,
    signedBy: contract.signedBy,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
    proposal: contract.proposal
      ? {
          id: contract.proposal.id,
          number: contract.proposal.number,
          title: contract.proposal.title,
          status: contract.proposal.status,
        }
      : null,
    project: contract.project
      ? { id: contract.project.id, name: contract.project.name, status: contract.project.status }
      : null,
    signer: contract.signer
      ? { id: contract.signer.id, name: contract.signer.name, email: contract.signer.email }
      : null,
  };
}

export async function updateContract(
  id: string,
  input: ContractUpdateInput
): Promise<ContractResponse> {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'contract.update');

  const existing = await prisma.contract.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  if (input.status !== undefined && !CONTRACT_STATUSES.includes(input.status)) {
    const error = new Error(`Invalid contract status: ${input.status}`) as Error & {
      statusCode?: number;
    };
    error.statusCode = 400;
    throw error;
  }

  const contract = await prisma.contract.update({
    where: { id },
    data: {
      proposalId: input.proposalId !== undefined ? input.proposalId : existing.proposalId,
      projectId: input.projectId !== undefined ? input.projectId : existing.projectId,
      title: input.title ?? existing.title,
      status: input.status ?? existing.status,
    },
    include: {
      proposal: { select: { id: true, number: true, title: true, status: true } },
      project: { select: { id: true, name: true, status: true } },
    },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'contract.update',
    entityType: 'Contract',
    entityId: contract.id,
    before: {
      id: existing.id,
      title: existing.title,
      status: existing.status,
    },
    after: {
      id: contract.id,
      title: contract.title,
      status: contract.status,
    },
    organizationId,
  });

  return {
    id: contract.id,
    organizationId: contract.organizationId,
    proposalId: contract.proposalId,
    projectId: contract.projectId,
    title: contract.title,
    status: contract.status,
    signatureReference: contract.signatureReference,
    signedAt: contract.signedAt,
    signedBy: contract.signedBy,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
    proposal: contract.proposal
      ? {
          id: contract.proposal.id,
          number: contract.proposal.number,
          title: contract.proposal.title,
          status: contract.proposal.status,
        }
      : null,
    project: contract.project
      ? { id: contract.project.id, name: contract.project.name, status: contract.project.status }
      : null,
    signer: contract.signer
      ? { id: contract.signer.id, name: contract.signer.name, email: contract.signer.email }
      : null,
  };
}

export async function signContract(
  id: string,
  input: ContractSignInput,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<{
  id: string;
  status: string;
  signedAt: Date | null;
  signedBy: string | null;
  signatureReference: string | null;
}> {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'contract.sign');

  const contract = await prisma.contract.findFirst({
    where: { id, organizationId },
  });

  if (!contract) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  if (contract.status === 'signed') {
    const error = new Error('Contract is already signed') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  const updated = await prisma.contract.update({
    where: { id },
    data: {
      status: 'signed',
      signedAt: new Date(),
      signedBy: userId,
      signatureReference: input.signatureReference ?? null,
    },
  });

  // Record signature audit entry
  await prisma.signature.create({
    data: {
      organizationId,
      contractId: id,
      signerName: input.signerName,
      signerEmail: input.signerEmail,
      signatureMethod: 'audit_trail',
      signatureReference: input.signatureReference ?? null,
      ipAddress,
      userAgent,
    },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'contract.sign',
    entityType: 'Contract',
    entityId: id,
    before: { status: contract.status },
    after: { status: 'signed', signedAt: updated.signedAt },
    organizationId,
    ipAddress,
    userAgent,
  });

  return {
    id: updated.id,
    status: updated.status,
    signedAt: updated.signedAt,
    signedBy: updated.signedBy,
    signatureReference: updated.signatureReference,
  };
}

export async function deleteContract(id: string) {
  const { userId, organizationId, email: actorEmail } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'contract.delete');

  const existing = await prisma.contract.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  if (existing.status === 'signed') {
    const error = new Error('Cannot delete a signed contract') as Error & {
      statusCode?: number;
    };
    error.statusCode = 400;
    throw error;
  }

  await prisma.contract.delete({
    where: { id },
  });

  await createAuditLog({
    actorId: userId,
    actorName: actorEmail,
    action: 'contract.delete',
    entityType: 'Contract',
    entityId: id,
    before: { id: existing.id, title: existing.title, status: existing.status },
    after: null,
    organizationId,
  });

  return { id };
}
