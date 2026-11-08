'use server';

import { prisma } from '@/lib/db';
import { requirePermission, requireOrganization, type AuthorizedUser } from '@/lib/permissions';
import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';

interface ProposalVersionRecord {
  id: string;
  organizationId: string;
  proposalId: string;
  version: number;
  title: string;
  status: string;
  subtotal: { toString: () => string };
  tax: { toString: () => string };
  total: { toString: () => string };
  currency: string;
  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
}

interface DocumentVersionRecord {
  id: string;
  organizationId: string;
  documentId: string;
  version: number;
  title: string;
  fileAssetId: string | null;
  createdAt: Date;
  createdBy: string | null;
}

export interface ProposalVersionResponse {
  id: string;
  organizationId: string;
  proposalId: string;
  version: number;
  title: string;
  status: string;
  subtotal: string;
  tax: string;
  total: string;
  currency: string;
  notes: string | null;
  createdAt: Date;
  createdBy: string | null;
}

export interface DocumentVersionResponse {
  id: string;
  organizationId: string;
  documentId: string;
  version: number;
  title: string;
  fileAssetId: string | null;
  createdAt: Date;
  createdBy: string | null;
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

/** Create a versioned snapshot of a proposal before editing */
export async function createProposalVersion(proposalId: string): Promise<ProposalVersionResponse> {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'proposal.read');

  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, organizationId },
  });

  if (!proposal) {
    const error = new Error('Proposal not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  // Get next version number
  const lastVersion = await prisma.proposalVersion.findFirst({
    where: { proposalId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });

  const nextVersion = (lastVersion?.version ?? 0) + 1;

  const version = await prisma.proposalVersion.create({
    data: {
      organizationId,
      proposalId,
      version: nextVersion,
      title: proposal.title,
      status: proposal.status,
      subtotal: proposal.subtotal,
      tax: proposal.tax,
      total: proposal.total,
      currency: proposal.currency,
      notes: proposal.notes,
      snapshot: {
        title: proposal.title,
        status: proposal.status,
        subtotal: proposal.subtotal.toString(),
        tax: proposal.tax.toString(),
        total: proposal.total.toString(),
        currency: proposal.currency,
        notes: proposal.notes,
      },
      createdBy: userId,
    },
  });

  await createAuditLog({
    actorId: userId,
    actorName: '',
    action: 'proposal.version',
    entityType: 'ProposalVersion',
    entityId: version.id,
    after: {
      proposalId,
      version: nextVersion,
    },
    organizationId,
  });

  return {
    id: version.id,
    organizationId: version.organizationId,
    proposalId: version.proposalId,
    version: version.version,
    title: version.title,
    status: version.status,
    subtotal: version.subtotal.toString(),
    tax: version.tax.toString(),
    total: version.total.toString(),
    currency: version.currency,
    notes: version.notes,
    createdAt: version.createdAt,
    createdBy: version.createdBy,
  };
}

export async function listProposalVersions(proposalId: string) {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'proposal.read');

  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, organizationId },
  });

  if (!proposal) {
    const error = new Error('Proposal not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  const versions = await prisma.proposalVersion.findMany({
    where: { proposalId },
    orderBy: { version: 'desc' },
    include: {
      creator: { select: { id: true, name: true, email: true } },
    },
  });

  return versions.map((v: ProposalVersionRecord) => ({
    id: v.id,
    organizationId: v.organizationId,
    proposalId: v.proposalId,
    version: v.version,
    title: v.title,
    status: v.status,
    subtotal: v.subtotal.toString(),
    tax: v.tax.toString(),
    total: v.total.toString(),
    currency: v.currency,
    notes: v.notes,
    createdAt: v.createdAt,
    createdBy: v.createdBy,
  }));
}

export async function listDocumentVersions(documentId: string) {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'document.read');

  const document = await prisma.document.findFirst({
    where: { id: documentId, organizationId },
  });

  if (!document) {
    const error = new Error('Document not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  const versions = await prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { version: 'desc' },
    include: {
      creator: { select: { id: true, name: true, email: true } },
    },
  });

  return versions.map((v: DocumentVersionRecord) => ({
    id: v.id,
    organizationId: v.organizationId,
    documentId: v.documentId,
    version: v.version,
    title: v.title,
    fileAssetId: v.fileAssetId,
    createdAt: v.createdAt,
    createdBy: v.createdBy,
  }));
}
