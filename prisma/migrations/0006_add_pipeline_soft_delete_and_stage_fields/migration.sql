-- Migration 0006: Add soft delete and stage fields to Pipeline and PipelineStage
-- Incremental only: adds columns to existing CRM tables.

-- AlterTable Pipeline: add deletedAt for soft deletion
ALTER TABLE "Pipeline" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable PipelineStage: add deletedAt, color, probability
ALTER TABLE "PipelineStage" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "PipelineStage" ADD COLUMN "color" TEXT;
ALTER TABLE "PipelineStage" ADD COLUMN "probability" DECIMAL(65,30);
