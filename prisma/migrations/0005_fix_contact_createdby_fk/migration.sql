-- Migration 0005: Fix Contact.createdBy and Contact.updatedBy foreign keys
-- The initial migration (0001) incorrectly referenced Contact.id instead of User.id
-- for both createdBy and updatedBy fields. This migration corrects them to reference User.id,
-- matching the Prisma schema definition.

-- Drop incorrect foreign key constraints
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_createdBy_fkey";
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_updatedBy_fkey";

-- Recreate foreign keys referencing User.id (correct per Prisma schema)
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
