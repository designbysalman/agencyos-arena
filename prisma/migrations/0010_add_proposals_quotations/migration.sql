-- Migration 0010: Add Proposals and Quotations foundation
-- Incremental only: enhances existing Proposal table and adds Quotation, ProposalLineItem, QuotationLineItem tables.
-- Does not modify any previously merged migration.

-- AlterTable Proposal: add new fields for full proposal/quotation foundation
ALTER TABLE "Proposal" ADD COLUMN "proposalNumber" TEXT;
ALTER TABLE "Proposal" ADD COLUMN "accountId" TEXT;
ALTER TABLE "Proposal" ADD COLUMN "clientName" TEXT;
ALTER TABLE "Proposal" ADD COLUMN "clientEmail" TEXT;
ALTER TABLE "Proposal" ADD COLUMN "description" TEXT;
ALTER TABLE "Proposal" ADD COLUMN "subtotal" DECIMAL NOT NULL DEFAULT 0;
ALTER TABLE "Proposal" ADD COLUMN "discount" DECIMAL NOT NULL DEFAULT 0;
ALTER TABLE "Proposal" ADD COLUMN "tax" DECIMAL NOT NULL DEFAULT 0;
ALTER TABLE "Proposal" ADD COLUMN "validUntil" TIMESTAMP(3);
ALTER TABLE "Proposal" ADD COLUMN "sentAt" TIMESTAMP(3);
ALTER TABLE "Proposal" ADD COLUMN "acceptedAt" TIMESTAMP(3);
ALTER TABLE "Proposal" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Proposal" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Add foreign keys and unique constraint on Proposal
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AgencyAccount"("id") ON DELETE SET NULL;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_organizationId_proposalNumber_key" UNIQUE ("organizationId", "proposalNumber");

-- CreateTable ProposalLineItem
CREATE TABLE "ProposalLineItem" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "discount" DECIMAL NOT NULL DEFAULT 0,
    "taxRate" DECIMAL NOT NULL DEFAULT 0,
    "amount" DECIMAL NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalLineItem_pkey" PRIMARY KEY ("id")
);

-- Add foreign key on ProposalLineItem
ALTER TABLE "ProposalLineItem" ADD CONSTRAINT "ProposalLineItem_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE;

-- CreateTable Quotation
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "quotationNumber" TEXT NOT NULL,
    "opportunityId" TEXT,
    "contactId" TEXT,
    "accountId" TEXT,
    "clientName" TEXT,
    "clientEmail" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "subtotal" DECIMAL NOT NULL DEFAULT 0,
    "discount" DECIMAL NOT NULL DEFAULT 0,
    "tax" DECIMAL NOT NULL DEFAULT 0,
    "total" DECIMAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "validUntil" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys and unique constraint on Quotation
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL;
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL;
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AgencyAccount"("id") ON DELETE SET NULL;
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_organizationId_quotationNumber_key" UNIQUE ("organizationId", "quotationNumber");

-- CreateTable QuotationLineItem
CREATE TABLE "QuotationLineItem" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "discount" DECIMAL NOT NULL DEFAULT 0,
    "taxRate" DECIMAL NOT NULL DEFAULT 0,
    "amount" DECIMAL NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationLineItem_pkey" PRIMARY KEY ("id")
);

-- Add foreign key on QuotationLineItem
ALTER TABLE "QuotationLineItem" ADD CONSTRAINT "QuotationLineItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE;

-- Ensure proposal permission codes exist (idempotent)
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
  ('proposal.delete', 'Delete proposals')
) AS v(code, description)
WHERE NOT EXISTS (
  SELECT 1 FROM "Permission" p WHERE p.code = v.code
);

-- Ensure quotation permission codes exist (idempotent)
INSERT INTO "Permission" ("id", "code", "description", "createdAt")
SELECT
  md5(random()::text || clock_timestamp()::text || code) AS id,
  code,
  description,
  CURRENT_TIMESTAMP
FROM (VALUES
  ('quotation.create', 'Create quotations'),
  ('quotation.read', 'Read quotations'),
  ('quotation.update', 'Update quotations'),
  ('quotation.delete', 'Delete quotations')
) AS v(code, description)
WHERE NOT EXISTS (
  SELECT 1 FROM "Permission" p WHERE p.code = v.code
);

-- Backfill proposal/quotation permissions to all existing Administrator/system roles
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
