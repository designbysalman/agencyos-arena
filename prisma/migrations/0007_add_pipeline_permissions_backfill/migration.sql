-- Migration 0007: Add pipeline permissions and backfill to existing admin roles
-- Adds pipeline.* permission codes and assigns them to all existing Administrator/system roles.

-- Insert pipeline permission codes (idempotent via unique constraint on code)
INSERT INTO "Permission" ("code", "description", "createdAt")
VALUES
  ('pipeline.create', 'Create pipelines', CURRENT_TIMESTAMP),
  ('pipeline.read', 'Read pipelines', CURRENT_TIMESTAMP),
  ('pipeline.update', 'Update pipelines', CURRENT_TIMESTAMP),
  ('pipeline.delete', 'Delete pipelines', CURRENT_TIMESTAMP),
  ('pipeline.stage.manage', 'Manage pipeline stages', CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- Backfill pipeline permissions to all existing Administrator/system roles
INSERT INTO "RolePermission" ("roleId", "permissionId", "grantedAt")
SELECT r.id, p.id, CURRENT_TIMESTAMP
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
