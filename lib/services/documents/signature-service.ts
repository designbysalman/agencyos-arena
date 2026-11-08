'use server';

import { prisma } from '@/lib/db';
import { requirePermission, requireOrganization, type AuthorizedUser } from '@/lib/permissions';
import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';

interface SignatureRecord {
  id: string;
  organizationId: string;
  documentId: string | null;
  contractId: string | null;
  signerName: string;
  signerEmail: string;
  signedAt: Date;
  signatureMethod: string;
  signatureReference: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  contract: { id: string; title: string; status: string } | null;
  document: { id: string; title: string } | null;
}

export interface SignatureResponse {
  id: string;
  organizationId: string;
  documentId: string | null;
  contractId: string | null;
  signerName: string;
  signerEmail: string;
  signedAt: Date;
  signatureMethod: string;
  signatureReference: string | null;
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

export async function listSignatures() {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'contract.read');

  const signatures = await prisma.signature.findMany({
    where: { organizationId },
    include: {
      contract: { select: { id: true, title: true, status: true } },
      document: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return signatures.map((s: SignatureRecord) => ({
    id: s.id,
    organizationId: s.organizationId,
    documentId: s.documentId,
    contractId: s.contractId,
    signerName: s.signerName,
    signerEmail: s.signerEmail,
    signedAt: s.signedAt,
    signatureMethod: s.signatureMethod,
    signatureReference: s.signatureReference,
    ipAddress: s.ipAddress,
    userAgent: s.userAgent,
    createdAt: s.createdAt,
  }));
}

export async function getSignature(id: string) {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'contract.read');

  const signature = await prisma.signature.findFirst({
    where: { id, organizationId },
    include: {
      contract: { select: { id: true, title: true, status: true } },
      document: { select: { id: true, title: true } },
    },
  });

  if (!signature) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  return {
    id: signature.id,
    organizationId: signature.organizationId,
    documentId: signature.documentId,
    contractId: signature.contractId,
    signerName: signature.signerName,
    signerEmail: signature.signerEmail,
    signedAt: signature.signedAt,
    signatureMethod: signature.signatureMethod,
    signatureReference: signature.signatureReference,
    ipAddress: signature.ipAddress,
    userAgent: signature.userAgent,
    createdAt: signature.createdAt,
  };
}
