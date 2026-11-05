-- Migration 0008: Add soft delete, priority, and lead permissions
-- Incremental only: adds columns to existing Lead table and provisions lead permissions.

-- AlterTable Lead: add deletedAt for soft deletion, priority for lead qualification
ALTER TABLE "Lead" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN "priority" TEXT;

-- Ensure lead permission codes exist (idempotent).
-- id is generated with md5() since Prisma's cuid() default is applied in the
-- application layer, not as a SQL DEFAULT on the column.
INSERT INTO "Permission" ("id", "code", "description", "createdAt")
SELECT
  md5(random()::text || clock_timestamp()::text || code) AS id,
  code,
  description,
  CURRENT_TIMESTAMP
FROM (VALUES
  ('lead.create', 'Create leads'),
  ('lead.read', 'Read leads'),
  ('lead.update', 'Update leads'),
  ('lead.delete', 'Delete leads'),
  ('lead.assign', 'Assign leads')
) AS v(code, description)
WHERE NOT EXISTS (
  SELECT 1 FROM "Permission" p WHERE p.code = v.code
);

-- Backfill lead permissions to all existing Administrator/system roles.
-- RolePermission uses composite primary key (roleId, permissionId) -- no id column.
INSERT INTO "RolePermission" ("roleId", "permissionId", "grantedAt")
SELECT
  r.id,
  p.id,
  CURRENT_TIMESTAMP
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p.code IN (
  'lead.create',
  'lead.read',
  'lead.update',
  'lead.delete',
  'lead.assign'
)
  AND r."isSystem" = true
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    WHERE rp."roleId" = r.id AND rp."permissionId" = p.id
  );
