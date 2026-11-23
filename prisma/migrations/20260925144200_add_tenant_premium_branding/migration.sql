-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "customPortfolioUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "customPromoVideoUrl" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "defaultPortfolioUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "defaultPromoVideoUrl" TEXT,
ADD COLUMN     "whyChooseUs" TEXT[] DEFAULT ARRAY[]::TEXT[];
