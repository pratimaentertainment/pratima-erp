-- Add quoteNumber field with UNIQUE constraint to Quotation
-- Add soft delete fields to Quotation
-- Add QuoteCounter table for sequential numbering

-- Step 1: Add quoteNumber column (nullable first to handle existing rows)
ALTER TABLE "Quotation" ADD COLUMN "quoteNumber" TEXT;

-- Step 2: Backfill existing rows with a generated quote number using CTE
WITH numbered AS (
  SELECT id, TO_CHAR("createdAt", 'YYYY') as yr, ROW_NUMBER() OVER (ORDER BY "createdAt") as rn
  FROM "Quotation"
)
UPDATE "Quotation"
SET "quoteNumber" = 'QT-' || n.yr || '-' || LPAD(n.rn::TEXT, 4, '0')
FROM numbered n
WHERE "Quotation".id = n.id;

-- Step 3: Make quoteNumber NOT NULL and add UNIQUE constraint
ALTER TABLE "Quotation" ALTER COLUMN "quoteNumber" SET NOT NULL;
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_quoteNumber_key" UNIQUE ("quoteNumber");

-- Step 4: Add soft delete fields to Quotation
ALTER TABLE "Quotation" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Quotation" ADD COLUMN "deletedById" UUID;
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 5: Create QuoteCounter table
CREATE TABLE "QuoteCounter" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuoteCounter_pkey" PRIMARY KEY ("id")
);

-- Step 6: Add unique constraint on QuoteCounter
ALTER TABLE "QuoteCounter" ADD CONSTRAINT "QuoteCounter_tenantId_year_key" UNIQUE ("tenantId", "year");

-- Step 7: Add foreign key from QuoteCounter to Tenant
ALTER TABLE "QuoteCounter" ADD CONSTRAINT "QuoteCounter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
