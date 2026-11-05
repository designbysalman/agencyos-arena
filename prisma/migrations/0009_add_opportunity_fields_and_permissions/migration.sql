-- Migration 0009: Add opportunity fields and permissions
-- Incremental only: adds columns to existing Opportunity table and provisions opportunity permissions.

-- AlterTable Opportunity: add description, currency, probability, deletedAt, lossReason
ALTER TABLE "Opportunity" ADD COLUMN "description" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "Opportunity" ADD COLUMN "probability" DECIMAL;
ALTER TABLE "Opportunity" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Opportunity" ADD COLUMN "lossReason" TEXT;

-- Ensure opportunity permission codes exist (idempotent).
INSERT INTO "Permission" ("id", "code", "description", "createdAt")
SELECT
  md5(random()::text || clock_timestamp()::text || code) AS id,
  code,
  description,
  CURRENT_TIMESTAMP
FROM (VALUES
  ('opportunity.create', 'Create opportunities'),
  ('opportunity.read', 'Read opportunities'),
  ('opportunity.update', 'Update opportunities'),
  ('opportunity.delete', 'Delete opportunities'),
  ('opportunity.assign', 'Assign opportunities')
) AS v(code, description)
WHERE NOT EXISTS (
  SELECT 1 FROM "Permission" p WHERE p.code = v.code
);

-- Backfill opportunity permissions to all existing Administrator/system roles.
INSERT INTO "RolePermission" ("roleId", "permissionId", "grantedAt")
SELECT
  r.id,
  p.id,
  CURRENT_TIMESTAMP
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p.code IN (
  'opportunity.create',
  'opportunity.read',
  'opportunity.update',
  'opportunity.delete',
  'opportunity.assign'
)
  AND r."isSystem" = true
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    WHERE rp."roleId" = r.id AND rp."permissionId" = p.id
  );
