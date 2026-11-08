-- Migration 0013: Add project approvals and task comments
-- Phase 3: Projects & Delivery completion
--
-- New tables:
--   project_approvals — client feedback and approval records
--   task_comments — team collaboration comments on tasks
--
-- Extended tables:
--   project — approvals relation (no new columns, relation via project_approvals)
--   task — comments relation (no new columns, relation via task_comments)
--
-- Incremental only: preserves all existing data.

-- ============================================
-- CreateTable: ProjectApproval
-- ============================================

CREATE TABLE "ProjectApproval" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contactId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "feedback" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectApproval_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "ProjectApproval"
  ADD CONSTRAINT "ProjectApproval_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectApproval"
  ADD CONSTRAINT "ProjectApproval_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectApproval"
  ADD CONSTRAINT "ProjectApproval_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectApproval"
  ADD CONSTRAINT "ProjectApproval_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "ProjectApproval_projectId_status_idx"
  ON "ProjectApproval"("projectId", "status");

-- ============================================
-- CreateTable: TaskComment
-- ============================================

CREATE TABLE "TaskComment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "TaskComment"
  ADD CONSTRAINT "TaskComment_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskComment"
  ADD CONSTRAINT "TaskComment_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskComment"
  ADD CONSTRAINT "TaskComment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "TaskComment_taskId_createdAt_idx"
  ON "TaskComment"("taskId", "createdAt");

-- ============================================
-- Permission codes for new features (idempotent)
-- ============================================

INSERT INTO "Permission" ("id", "code", "description", "createdAt")
SELECT
  md5(random()::text || clock_timestamp()::text || code) AS id,
  code,
  description,
  CURRENT_TIMESTAMP
FROM (VALUES
  ('project.template.create', 'Create project templates'),
  ('project.template.read', 'Read project templates'),
  ('project.template.update', 'Update project templates'),
  ('project.template.delete', 'Delete project templates'),
  ('project.file.create', 'Upload project files'),
  ('project.file.read', 'Read project files'),
  ('project.file.delete', 'Delete project files'),
  ('project.approval.create', 'Create project approvals'),
  ('project.approval.read', 'Read project approvals'),
  ('project.approval.update', 'Update project approvals'),
  ('time.entry.create', 'Create time entries'),
  ('time.entry.read', 'Read time entries'),
  ('time.entry.update', 'Update time entries'),
  ('time.entry.delete', 'Delete time entries'),
  ('change.order.create', 'Create change orders'),
  ('change.order.read', 'Read change orders'),
  ('change.order.update', 'Update change orders'),
  ('change.order.delete', 'Delete change orders'),
  ('task.comment.create', 'Create task comments'),
  ('task.comment.read', 'Read task comments'),
  ('task.comment.update', 'Update task comments'),
  ('task.comment.delete', 'Delete task comments')
) AS v(code, description)
WHERE NOT EXISTS (
  SELECT 1 FROM "Permission" p WHERE p.code = v.code
);

-- Backfill new permissions to Administrator/system roles.
INSERT INTO "RolePermission" ("roleId", "permissionId", "grantedAt")
SELECT
  r.id,
  p.id,
  CURRENT_TIMESTAMP
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p.code IN (
  'project.template.create', 'project.template.read', 'project.template.update', 'project.template.delete',
  'project.file.create', 'project.file.read', 'project.file.delete',
  'project.approval.create', 'project.approval.read', 'project.approval.update',
  'time.entry.create', 'time.entry.read', 'time.entry.update', 'time.entry.delete',
  'change.order.create', 'change.order.read', 'change.order.update', 'change.order.delete',
  'task.comment.create', 'task.comment.read', 'task.comment.update', 'task.comment.delete'
)
  AND r."isSystem" = true
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    WHERE rp."roleId" = r.id AND rp."permissionId" = p.id
  );
