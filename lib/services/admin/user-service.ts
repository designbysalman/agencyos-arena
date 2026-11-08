'use server';

import { prisma } from '@/lib/db';
import { requirePermission, requireOrganization, type AuthorizedUser } from '@/lib/permissions';
import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';

export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  status: string;
  organizationId: string | null;
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

export async function listUsers() {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'user.read');

  const users = await prisma.user.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });

  interface UserRecord {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: string;
    status: string;
    organizationId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }

  return users.map((u: UserRecord) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    image: u.image,
    role: u.role,
    status: u.status,
    organizationId: u.organizationId,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));
}

export async function updateUser(
  id: string,
  input: {
    role?: string;
    status?: string;
  }
) {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'user.update');

  const existing = await prisma.user.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      role: input.role ?? existing.role,
      status: input.status ?? existing.status,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
    status: user.status,
    organizationId: user.organizationId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
