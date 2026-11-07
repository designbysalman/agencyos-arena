'use server';

import { prisma } from '@/lib/db';
import { requirePermission, requireOrganization, type AuthorizedUser } from '@/lib/permissions';
import { auth } from '@/lib/auth-server';
import { cookies } from 'next/headers';

/** Organization settings shape stored in Organization.settings JSON */
export interface OrganizationSettings {
  /** Agency branding */
  brandName?: string;
  brandColor?: string;
  logoUrl?: string;
  /** Contact information */
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  /** Defaults */
  defaultCurrency?: string;
  dateFormat?: string;
  /** Invoice preferences */
  invoiceNumberPrefix?: string;
  invoiceNextNumber?: number;
  invoiceTaxDefault?: number;
  /** Proposal preferences */
  proposalNumberPrefix?: string;
  proposalNextNumber?: number;
  proposalValidDays?: number;
}

/** Serialized organization with settings */
export interface OrganizationResponse {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  settings: OrganizationSettings;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Validate session and resolve authorized user context */
async function getAuthorizedUser(): Promise<AuthorizedUser> {
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

  const user = result.user as { role?: string; organizationId?: string };
  const { organizationId } = await requireOrganization(result.user.id);
  return {
    userId: result.user.id,
    organizationId,
    email: result.user.email ?? '',
    role: user.role ?? 'employee',
  };
}

/** Check if the user is an Administrator of their organization */
async function isOrganizationAdmin(userId: string, organizationId: string): Promise<boolean> {
  const userRole = await prisma.userRole.findFirst({
    where: { userId, organizationId },
    include: {
      role: {
        where: { isSystem: true, name: 'Administrator' },
      },
    },
  });
  return !!userRole;
}

/** Get organization settings for the current user's organization */
export async function getOrganizationSettings() {
  const { userId, organizationId } = await getAuthorizedUser();

  // Any authenticated user can read their organization's settings
  await requirePermission(userId, organizationId, 'invoice.read');

  const [organization, admin] = await prisma.$transaction([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    isOrganizationAdmin(userId, organizationId),
  ]);

  if (!organization) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    domain: organization.domain,
    settings: (organization.settings as OrganizationSettings) ?? {},
    isAdmin: admin,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
  };
}

/** Update organization settings (Administrator only) */
export async function updateOrganizationSettings(input: {
  name?: string;
  settings?: Partial<OrganizationSettings>;
}) {
  const { userId, organizationId } = await getAuthorizedUser();

  // Only Administrators can update organization-level settings
  const isAdmin = await isOrganizationAdmin(userId, organizationId);
  if (!isAdmin) {
    const error = new Error(
      'Forbidden: organization settings require Administrator role'
    ) as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, settings: true },
  });

  if (!organization) {
    const error = new Error('Not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  const mergedSettings: OrganizationSettings = {
    ...((organization.settings as OrganizationSettings) ?? {}),
    ...input.settings,
  };

  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      settings: mergedSettings,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      domain: true,
      settings: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    domain: updated.domain,
    settings: (updated.settings as OrganizationSettings) ?? {},
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}
