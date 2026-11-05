-- Migration 0007: Add pipeline permissions and backfill to existing admin roles
-- Adds pipeline.* permission codes and assigns them to all existing Administrator/system roles.

-- Ensure pipeline permission codes exist (idempotent).
-- id is generated with md5() since Prisma's cuid() default is applied in the
-- application layer, not as a SQL DEFAULT on the column.
INSERT INTO "Permission" ("id", "code", "description", "createdAt")
SELECT
  md5(random()::text || clock_timestamp()::text || code) AS id,
  code,
  description,
  CURRENT_TIMESTAMP
FROM (VALUES
  ('pipeline.create', 'Create pipelines'),
  ('pipeline.read', 'Read pipelines'),
  ('pipeline.update', 'Update pipelines'),
  ('pipeline.delete', 'Delete pipelines'),
  ('pipeline.stage.manage', 'Manage pipeline stages')
) AS v(code, description)
WHERE NOT EXISTS (
  SELECT 1 FROM "Permission" p WHERE p.code = v.code
);

-- Backfill pipeline permissions to all existing Administrator/system roles.
-- RolePermission uses composite primary key (roleId, permissionId) -- no id column.
INSERT INTO "RolePermission" ("roleId", "permissionId", "grantedAt")
SELECT
  r.id,
  p.id,
  CURRENT_TIMESTAMP
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p.code IN (
  'pipeline.create',
  'pipeline.read',
  'pipeline.update',
  'pipeline.delete',
  'pipeline.stage.manage'
)
  AND r."isSystem" = true
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    WHERE rp."roleId" = r.id AND rp."permissionId" = p.id
  );
