-- Migration 0010: Add Proposals & Quotations (Phase 2.1)
-- Incremental only: enhances Proposal table, creates Quotation, ProposalLineItem, QuotationLineItem tables,
-- and provisions proposal/quotation permissions.

-- AlterTable Proposal: add enhanced fields for document management
ALTER TABLE "Proposal" ADD COLUMN "number" TEXT;
ALTER TABLE "Proposal" ADD COLUMN "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "Proposal" ADD COLUMN "tax" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "Proposal" ADD COLUMN "validUntil" TIMESTAMP(3);
ALTER TABLE "Proposal" ADD COLUMN "notes" TEXT;
ALTER TABLE "Proposal" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Proposal" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "Proposal" ADD COLUMN "updatedBy" TEXT;

-- CreateTable Quotation
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "opportunityId" TEXT,
    "contactId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tax" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "validUntil" TIMESTAMP(3),
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable ProposalLineItem
CREATE TABLE "ProposalLineItem" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "taxRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "amount" DECIMAL(65,30) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable QuotationLineItem
CREATE TABLE "QuotationLineItem" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "taxRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "amount" DECIMAL(65,30) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationLineItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey ProposalLineItem
ALTER TABLE "ProposalLineItem" ADD CONSTRAINT "ProposalLineItem_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey QuotationLineItem
ALTER TABLE "QuotationLineItem" ADD CONSTRAINT "QuotationLineItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey Quotation: organization
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey Quotation: opportunity
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey Quotation: contact
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey Proposal: opportunity
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey Proposal: contact
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey Proposal: creator
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey Proposal: updater
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey Quotation: creator
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey Quotation: updater
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX "Proposal_organizationId_number_idx" ON "Proposal"("organizationId", "number");
CREATE INDEX "Proposal_organizationId_status_idx" ON "Proposal"("organizationId", "status");
CREATE UNIQUE INDEX "Proposal_organizationId_number_key" ON "Proposal"("organizationId", "number");

CREATE INDEX "Quotation_organizationId_number_idx" ON "Quotation"("organizationId", "number");
CREATE INDEX "Quotation_organizationId_status_idx" ON "Quotation"("organizationId", "status");
CREATE UNIQUE INDEX "Quotation_organizationId_number_key" ON "Quotation"("organizationId", "number");

CREATE INDEX "ProposalLineItem_proposalId_sortOrder_idx" ON "ProposalLineItem"("proposalId", "sortOrder");
CREATE INDEX "QuotationLineItem_quotationId_sortOrder_idx" ON "QuotationLineItem"("quotationId", "sortOrder");

-- Ensure proposal permission codes exist (idempotent).
INSERT INTO "Permission" ("id", "code", "description", "createdAt")
SELECT
  md5(random()::text || clock_timestamp()::text || code) AS id,
  code,
  description,
  CURRENT_TIMESTAMP
FROM (VALUES
  ('proposal.create', 'Create proposals'),
  ('proposal.read', 'Read proposals'),
  ('proposal.update', 'Update proposals'),
  ('proposal.delete', 'Delete proposals'),
  ('quotation.create', 'Create quotations'),
  ('quotation.read', 'Read quotations'),
  ('quotation.update', 'Update quotations'),
  ('quotation.delete', 'Delete quotations')
) AS v(code, description)
WHERE NOT EXISTS (
  SELECT 1 FROM "Permission" p WHERE p.code = v.code
);

-- Backfill proposal/quotation permissions to all existing Administrator/system roles.
INSERT INTO "RolePermission" ("roleId", "permissionId", "grantedAt")
SELECT
  r.id,
  p.id,
  CURRENT_TIMESTAMP
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p.code IN (
  'proposal.create',
  'proposal.read',
  'proposal.update',
  'proposal.delete',
  'quotation.create',
  'quotation.read',
  'quotation.update',
  'quotation.delete'
)
  AND r."isSystem" = true
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    WHERE rp."roleId" = r.id AND rp."permissionId" = p.id
  );
