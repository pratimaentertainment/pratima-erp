-- CreateEnum
CREATE TYPE "PricingMode" AS ENUM ('ITEMIZED', 'LUMP_SUM');

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "lumpSumAmount" DECIMAL(10,2),
ADD COLUMN     "pricingMode" "PricingMode" NOT NULL DEFAULT 'ITEMIZED';

-- AlterTable
ALTER TABLE "QuotationRevision" ADD COLUMN     "lumpSumAmount" DECIMAL(10,2),
ADD COLUMN     "pricingMode" "PricingMode" NOT NULL DEFAULT 'ITEMIZED';
