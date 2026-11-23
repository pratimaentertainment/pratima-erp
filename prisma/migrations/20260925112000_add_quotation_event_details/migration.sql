-- AlterTable
ALTER TABLE "QuotationRevisionItem" ADD COLUMN     "quotationFunctionId" TEXT;

-- CreateTable
CREATE TABLE "QuotationEventSubject" (
    "id" TEXT NOT NULL,
    "quotationId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "birthDate" TIMESTAMP(3),
    "anniversaryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotationEventSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationFunction" (
    "id" TEXT NOT NULL,
    "quotationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "venue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotationFunction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationDeliverable" (
    "id" TEXT NOT NULL,
    "quotationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "basePageLimit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotationDeliverable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuotationEventSubject_quotationId_idx" ON "QuotationEventSubject"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationFunction_quotationId_idx" ON "QuotationFunction"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationDeliverable_quotationId_idx" ON "QuotationDeliverable"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationRevisionItem_quotationFunctionId_idx" ON "QuotationRevisionItem"("quotationFunctionId");

-- AddForeignKey
ALTER TABLE "QuotationRevisionItem" ADD CONSTRAINT "QuotationRevisionItem_quotationFunctionId_fkey" FOREIGN KEY ("quotationFunctionId") REFERENCES "QuotationFunction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationEventSubject" ADD CONSTRAINT "QuotationEventSubject_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationFunction" ADD CONSTRAINT "QuotationFunction_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationDeliverable" ADD CONSTRAINT "QuotationDeliverable_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
