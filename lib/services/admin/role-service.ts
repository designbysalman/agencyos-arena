'use server';

import { prisma } from '@/lib/db';
import { requirePermission, requireOrganization, type AuthorizedUser } from '@/lib/permissions';
import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';

export interface RoleResponse {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions: Array<{ id: string; code: string; description: string | null }>;
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

export async function listRoles() {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'role.read');

  const roles = await prisma.role.findMany({
    where: { organizationId },
    include: {
      permissions: {
        include: { permission: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  interface RoleRecord {
    id: string;
    organizationId: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    createdAt: Date;
    updatedAt: Date;
    permissions: Array<{
      permission: { id: string; code: string; description: string | null };
    }>;
  }

  return roles.map((r: RoleRecord) => ({
    id: r.id,
    organizationId: r.organizationId,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    permissions: r.permissions.map((rp) => ({
      id: rp.permission.id,
      code: rp.permission.code,
      description: rp.permission.description,
    })),
  }));
}

export async function updateRole(
  id: string,
  input: {
    name?: string;
    description?: string;
    permissionCodes?: string[];
  }
) {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'role.update');

  const existing = await prisma.role.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  if (existing.isSystem) {
    const error = new Error('Cannot modify system roles') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  const role = await prisma.role.update({
    where: { id },
    data: {
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
    },
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });

  // Update permissions if provided
  if (input.permissionCodes !== undefined) {
    // Get or create permissions
    const permissions = await Promise.all(
      input.permissionCodes.map(async (code) => {
        const perm = await prisma.permission.upsert({
          where: { code },
          update: {},
          create: { code, description: `Auto-created: ${code}` },
        });
        return perm;
      })
    );

    // Replace role permissions
    await prisma.rolePermission.deleteMany({
      where: { roleId: id },
    });

    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({
        roleId: id,
        permissionId: p.id,
      })),
    });
  }

  return {
    id: role.id,
    organizationId: role.organizationId,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
    permissions: role.permissions.map(
      (rp: { permission: { id: string; code: string; description: string | null } }) => ({
        id: rp.permission.id,
        code: rp.permission.code,
        description: rp.permission.description,
      })
    ),
  };
}

interface PermissionRecord {
  id: string;
  code: string;
  description: string | null;
}

export async function listPermissions() {
  const { userId, organizationId } = await getAuthorizedUser();

  await requirePermission(userId, organizationId, 'role.read');

  const permissions = await prisma.permission.findMany({
    orderBy: { code: 'asc' },
  });

  return permissions.map((p: PermissionRecord) => ({
    id: p.id,
    code: p.code,
    description: p.description,
  }));
}
