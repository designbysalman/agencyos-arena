/**
 * Backfill Proposal and Quotation permissions to existing Administrator roles.
 *
 * Migration 0010 created proposal/quotation permission codes and backfilled them
 * to existing system roles at migration time. However, organizations bootstrapped
 * after migration 0010 (or existing organizations whose Administrator role was
 * created without these permissions) are missing them.
 *
 * This script is idempotent:
 * - Ensures each proposal/quotation permission code exists (upsert, no-op if present)
 * - Assigns each permission to every Administrator role (isSystem=true AND name='Administrator')
 * - Safe to run multiple times; produces no duplicates
 * - Non-Administrator system roles are intentionally excluded.
 *
 * Usage (Windows PowerShell):
 *   $env:DATABASE_URL="postgresql://..."; npm run db:backfill-document-permissions
 *
 * Or with .env.local (DATABASE_URL is loaded automatically):
 *   npm run db:backfill-document-permissions
 */

import dotenv from 'dotenv';

// Load .env.local so DATABASE_URL is available without manual export
dotenv.config({ path: '.env.local' });

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg(process.env.DATABASE_URL);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
});

const DOCUMENT_PERMISSION_CODES = [
  'proposal.create',
  'proposal.read',
  'proposal.update',
  'proposal.delete',
  'quotation.create',
  'quotation.read',
  'quotation.update',
  'quotation.delete',
];

async function backfill() {
  console.log('Starting proposal/quotation permission backfill...');

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Define it in .env.local or export it before running.'
    );
  }

  // 1. Ensure permission codes exist (idempotent upsert)
  for (const code of DOCUMENT_PERMISSION_CODES) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: {
        code,
        description: `Document permission: ${code}`,
      },
    });
  }
  console.log(`Ensured ${DOCUMENT_PERMISSION_CODES.length} document permission code(s) exist.`);

  // 2. Fetch all Administrator roles across all organizations.
  // Restrict to name='Administrator' so unrelated system roles (if any)
  // never receive document permissions.
  const adminRoles = await prisma.role.findMany({
    where: {
      isSystem: true,
      name: 'Administrator',
    },
    include: {
      permissions: { include: { permission: true } },
    },
  });

  console.log(`Found ${adminRoles.length} Administrator role(s).`);

  // 3. For each role, assign any missing document permissions (idempotent)
  let totalAssigned = 0;
  for (const role of adminRoles) {
    const existingCodes = new Set(
      (role.permissions as Array<{ permission: { code: string } }>).map((rp) => rp.permission.code)
    );
    const missing = DOCUMENT_PERMISSION_CODES.filter((code) => !existingCodes.has(code));

    if (missing.length > 0) {
      const permissions = await prisma.permission.findMany({
        where: { code: { in: missing } },
      });
      await prisma.rolePermission.createMany({
        data: permissions.map((p: { id: string }) => ({
          roleId: role.id,
          permissionId: p.id,
        })),
        skipDuplicates: true,
      });
      totalAssigned += missing.length;
      console.log(`  Role ${role.id} (org ${role.organizationId}): assigned ${missing.join(', ')}`);
    } else {
      console.log(
        `  Role ${role.id} (org ${role.organizationId}): already has all document permissions`
      );
    }
  }

  console.log(
    `Backfill complete. Assigned ${totalAssigned} document permission(s) across ${adminRoles.length} role(s).`
  );

  await prisma.$disconnect();
}

backfill().catch(async (err) => {
  console.error('Backfill failed:', err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
