/**
 * AgencyOS Organization Bootstrap API
 *
 * POST /api/auth/bootstrap-organization
 *
 * Creates an organization for the authenticated user, assigns them to an
 * admin role with CRM permissions, and links their user record to the
 * organization. Called after registration to complete the bootstrap flow.
 *
 * Security:
 * - Requires a valid database-backed session (401 if missing/invalid)
 * - Organization ID is never trusted from the client
 * - No global administrative privileges are assigned by default
 * - One bootstrap per user (idempotent if user already has an organization)
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';

import { auth } from '@/lib/auth-server';
import { prisma } from '@/lib/db';

const bootstrapSchema = z.object({
  organizationName: z.string().min(1, 'Organization name is required').max(200),
});

/** CRM permission codes that the admin role gets by default */
const CRM_PERMISSION_CODES = [
  'contact.create',
  'contact.read',
  'contact.update',
  'contact.delete',
  'account.create',
  'account.read',
  'account.update',
  'account.delete',
];

/** Validate session and return the authenticated user */
async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const result = await auth.api.getSession({
    headers: { cookie: cookieStore.toString() },
  });

  if (!result?.session || !result.user) {
    const error = new Error('Unauthenticated') as Error & {
      statusCode?: number;
    };
    error.statusCode = 401;
    throw error;
  }

  return result.user as { id: string; email: string | null; organizationId?: string };
}

/** Ensure CRM permissions exist in the database using the transaction client */
async function ensureCrmPermissions(tx: typeof prisma) {
  for (const code of CRM_PERMISSION_CODES) {
    await tx.permission.upsert({
      where: { code },
      update: {},
      create: {
        code,
        description: `CRM permission: ${code}`,
      },
    });
  }
}

/** POST /api/auth/bootstrap-organization */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();

    // If user already has an organization, bootstrap is complete (idempotent)
    if (user.organizationId) {
      return NextResponse.json({ error: 'Organization already bootstrapped' }, { status: 409 });
    }

    const body = await request.json();
    const parsed = bootstrapSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { organizationName } = parsed.data;

    // Generate a unique slug from the organization name
    const baseSlug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Create organization, role, permissions, and user membership atomically
    const result = await prisma.$transaction(async (tx: typeof prisma) => {
      // 1. Create the organization
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug,
        },
      });

      // 2. Ensure CRM permissions exist (using transaction client)
      await ensureCrmPermissions(tx);

      // 3. Create an admin role for this organization
      const role = await tx.role.create({
        data: {
          name: 'Administrator',
          description: 'Full access to all organization resources',
          organizationId: organization.id,
          isSystem: true,
        },
      });

      // 4. Assign all CRM permissions to the admin role
      const permissions = await tx.permission.findMany({
        where: { code: { in: CRM_PERMISSION_CODES } },
      });
      await tx.rolePermission.createMany({
        data: permissions.map((p: { id: string }) => ({
          roleId: role.id,
          permissionId: p.id,
        })),
      });

      // 5. Assign the user to the admin role in this organization
      const userRole = await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
          organizationId: organization.id,
          assignedBy: user.id,
        },
      });

      // 6. Link the user to the organization
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { organizationId: organization.id },
      });

      return { organization, role, userRole, user: updatedUser };
    });

    return NextResponse.json({
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        organizationId: result.user.organizationId,
      },
    });
  } catch (err) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return NextResponse.json(
      { error: statusCode === 401 ? 'Unauthenticated' : 'Internal error' },
      { status: statusCode }
    );
  }
}
