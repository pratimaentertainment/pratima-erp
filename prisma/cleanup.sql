ALTER TABLE "Quotation" DROP COLUMN IF EXISTS "quoteNumber";
ALTER TABLE "Quotation" DROP COLUMN IF EXISTS "deletedAt";
ALTER TABLE "Quotation" DROP CONSTRAINT IF EXISTS "Quotation_deletedById_fkey";
ALTER TABLE "Quotation" DROP COLUMN IF EXISTS "deletedById";
DROP TABLE IF EXISTS "QuoteCounter";
