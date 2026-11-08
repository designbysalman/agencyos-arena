-- Migration 0011: Add missing fields to Invoice and Project models
-- Incremental only: preserves all existing invoice, payment, and project data.
--
-- Invoice changes:
--   - Add title (NOT NULL, backfilled from number for existing rows)
--   - Add notes (nullable)
--   - Add deletedAt (nullable, for soft deletion)
--   - Make clientId nullable (was required)
--   - Add clientId -> Contact.id foreign key (ON DELETE SET NULL)
--   - Add index on (organizationId, deletedAt)
--
-- Project changes:
--   - Add description (nullable)
--   - Add deletedAt (nullable, for soft deletion)
--   - Add createdBy (nullable)
--   - Add updatedBy (nullable)
--   - Add clientId -> Contact.id foreign key (ON DELETE SET NULL)
--   - Add createdBy -> User.id foreign key (ON DELETE SET NULL)
--   - Add updatedBy -> User.id foreign key (ON DELETE SET NULL)
--   - Add index on (organizationId, deletedAt)

-- ============================================
-- Invoice: add missing columns
-- ============================================

-- Add title column with temporary default, backfill from number
ALTER TABLE "Invoice" ADD COLUMN "title" TEXT NOT NULL DEFAULT '';

UPDATE "Invoice" SET "title" = "number" WHERE "title" = '';

-- Add notes column
ALTER TABLE "Invoice" ADD COLUMN "notes" TEXT;

-- Add deletedAt column for soft deletion
ALTER TABLE "Invoice" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Make clientId nullable
ALTER TABLE "Invoice" ALTER COLUMN "clientId" DROP NOT NULL;

-- Null out orphaned clientId values that don't match any Contact
UPDATE "Invoice" SET "clientId" = NULL
WHERE "clientId" IS NOT NULL
  AND "clientId" NOT IN (SELECT "id" FROM "Contact");

-- Add foreign key: Invoice.clientId -> Contact.id
ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Contact"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for org-scoped soft-delete queries
CREATE INDEX "Invoice_organizationId_deletedAt_idx"
  ON "Invoice"("organizationId", "deletedAt");

-- ============================================
-- Project: add missing columns
-- ============================================

-- Add description column
ALTER TABLE "Project" ADD COLUMN "description" TEXT;

-- Add deletedAt column for soft deletion
ALTER TABLE "Project" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Add createdBy column
ALTER TABLE "Project" ADD COLUMN "createdBy" TEXT;

-- Add updatedBy column
ALTER TABLE "Project" ADD COLUMN "updatedBy" TEXT;

-- Null out orphaned clientId values that don't match any Contact
UPDATE "Project" SET "clientId" = NULL
WHERE "clientId" IS NOT NULL
  AND "clientId" NOT IN (SELECT "id" FROM "Contact");

-- Add foreign key: Project.clientId -> Contact.id
ALTER TABLE "Project"
  ADD CONSTRAINT "Project_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Contact"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Add foreign key: Project.createdBy -> User.id
ALTER TABLE "Project"
  ADD CONSTRAINT "Project_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Add foreign key: Project.updatedBy -> User.id
ALTER TABLE "Project"
  ADD CONSTRAINT "Project_updatedBy_fkey"
  FOREIGN KEY ("updatedBy") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for org-scoped soft-delete queries
CREATE INDEX "Project_organizationId_deletedAt_idx"
  ON "Project"("organizationId", "deletedAt");
