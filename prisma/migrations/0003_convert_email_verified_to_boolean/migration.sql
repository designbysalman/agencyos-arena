-- AlterTable: Convert emailVerified from TIMESTAMP(3) to BOOLEAN
-- Preserve existing verification state: non-null timestamp → true, null → false

-- Step 1: Add temporary boolean column
ALTER TABLE "User" ADD COLUMN "emailVerifiedNew" BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Convert existing data — users with a verification timestamp become true
UPDATE "User" SET "emailVerifiedNew" = true WHERE "emailVerified" IS NOT NULL;

-- Step 3: Drop old timestamp column
ALTER TABLE "User" DROP COLUMN "emailVerified";

-- Step 4: Rename new column to original name
ALTER TABLE "User" RENAME COLUMN "emailVerifiedNew" TO "emailVerified";
