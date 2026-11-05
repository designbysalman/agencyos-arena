-- Migration 0004: Add deletedAt to Contact and AgencyAccount (soft deletion)
-- Incremental only: adds deleted_at columns to existing CRM tables.

-- AlterTable Contact
ALTER TABLE "Contact" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable AgencyAccount
ALTER TABLE "AgencyAccount" ADD COLUMN "deletedAt" TIMESTAMP(3);
