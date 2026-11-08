-- Migration 0012: Add document, contract, version, link, and signature models
-- Phase 2: Proposals & Documents completion
--
-- New tables:
--   proposal_versions — versioned snapshots of proposals
--   document_versions — versioned snapshots of documents
--   document_links — shareable, time-bound document links
--   signatures — audit-trail signature recording (interface-only for e-sign)
--
-- Extended tables:
--   contract — signatureReference, signedAt, signedBy + relations
--   document — fileAssetId, version + relations
--   proposal — versions relation
--   user — signedContracts relation
--
-- Incremental only: preserves all existing data.

-- ============================================
-- Contract: add signature fields
-- ============================================

ALTER TABLE "Contract" ADD COLUMN "signatureReference" TEXT;
ALTER TABLE "Contract" ADD COLUMN "signedAt" TIMESTAMP(3);
ALTER TABLE "Contract" ADD COLUMN "signedBy" TEXT;

-- Foreign key: Contract.signedBy -> User.id
ALTER TABLE "Contract"
  ADD CONSTRAINT "Contract_signedBy_fkey"
  FOREIGN KEY ("signedBy") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign key: Contract.proposalId -> Proposal.id (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Contract_proposalId_fkey'
  ) THEN
    ALTER TABLE "Contract"
      ADD CONSTRAINT "Contract_proposalId_fkey"
      FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Foreign key: Contract.projectId -> Project.id (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Contract_projectId_fkey'
  ) THEN
    ALTER TABLE "Contract"
      ADD CONSTRAINT "Contract_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================
-- Document: add fileAssetId and version
-- ============================================

ALTER TABLE "Document" ADD COLUMN "fileAssetId" TEXT;
ALTER TABLE "Document" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Foreign key: Document.fileAssetId -> FileAsset.id
ALTER TABLE "Document"
  ADD CONSTRAINT "Document_fileAssetId_fkey"
  FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- Proposal: versions relation (no new columns, relation is via proposal_versions table)
-- ============================================

-- ============================================
-- CreateTable: ProposalVersion
-- ============================================

CREATE TABLE "ProposalVersion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tax" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "ProposalVersion_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "ProposalVersion"
  ADD CONSTRAINT "ProposalVersion_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProposalVersion"
  ADD CONSTRAINT "ProposalVersion_proposalId_fkey"
  FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProposalVersion"
  ADD CONSTRAINT "ProposalVersion_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "ProposalVersion_proposalId_version_idx"
  ON "ProposalVersion"("proposalId", "version");

-- ============================================
-- CreateTable: DocumentVersion
-- ============================================

CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "fileAssetId" TEXT,
    "snapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "DocumentVersion"
  ADD CONSTRAINT "DocumentVersion_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentVersion"
  ADD CONSTRAINT "DocumentVersion_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentVersion"
  ADD CONSTRAINT "DocumentVersion_fileAssetId_fkey"
  FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DocumentVersion"
  ADD CONSTRAINT "DocumentVersion_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "DocumentVersion_documentId_version_idx"
  ON "DocumentVersion"("documentId", "version");

-- ============================================
-- CreateTable: DocumentLink
-- ============================================

CREATE TABLE "DocumentLink" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "maxAccess" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "DocumentLink_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "DocumentLink"
  ADD CONSTRAINT "DocumentLink_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentLink"
  ADD CONSTRAINT "DocumentLink_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentLink"
  ADD CONSTRAINT "DocumentLink_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE UNIQUE INDEX "DocumentLink_token_key" ON "DocumentLink"("token");
CREATE INDEX "DocumentLink_expiresAt_idx" ON "DocumentLink"("expiresAt");

-- ============================================
-- CreateTable: Signature
-- ============================================

CREATE TABLE "Signature" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentId" TEXT,
    "contractId" TEXT,
    "signerName" TEXT NOT NULL,
    "signerEmail" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signatureMethod" TEXT NOT NULL DEFAULT 'audit_trail',
    "signatureReference" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "Signature"
  ADD CONSTRAINT "Signature_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Signature"
  ADD CONSTRAINT "Signature_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Signature"
  ADD CONSTRAINT "Signature_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "Contract"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

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
  ('contract.create', 'Create contracts'),
  ('contract.read', 'Read contracts'),
  ('contract.update', 'Update contracts'),
  ('contract.delete', 'Delete contracts'),
  ('contract.sign', 'Sign contracts'),
  ('document.create', 'Create documents'),
  ('document.read', 'Read documents'),
  ('document.update', 'Update documents'),
  ('document.delete', 'Delete documents'),
  ('document.share', 'Share documents via links'),
  ('template.create', 'Create document templates'),
  ('template.read', 'Read document templates'),
  ('template.update', 'Update document templates'),
  ('template.delete', 'Delete document templates')
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
  'contract.create', 'contract.read', 'contract.update', 'contract.delete', 'contract.sign',
  'document.create', 'document.read', 'document.update', 'document.delete', 'document.share',
  'template.create', 'template.read', 'template.update', 'template.delete'
)
  AND r."isSystem" = true
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    WHERE rp."roleId" = r.id AND rp."permissionId" = p.id
  );
