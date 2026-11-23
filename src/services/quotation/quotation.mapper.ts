import {
  Quotation,
  QuotationRevision,
  QuotationRevisionItem,
  Lead,
  Customer,
  Package,
  PackageItem,
  PackageDeliverable,
  TaxRate,
  QuotationEventSubject,
  QuotationFunction,
  QuotationDeliverable,
  Inquiry,
  Tenant,
  Branch,
  ServiceComponent,
} from '@prisma/client';
import {
  QuotationDto,
  QuotationDetailDto,
  QuotationRevisionDto,
  QuotationRevisionItemDto,
  CreateQuotationDto,
  CreateRevisionDto,
  QuotationItemInput,
} from './quotation.types';
import { ServiceQuotationStatus } from './quotation.constants';
import { serializePrisma } from '@/lib/serialize';

// Define explicit Prisma composite types that the repository fetches
export type PrismaQuotationItem = QuotationRevisionItem & {
  package?: (Package & {
    items?: Array<PackageItem & { serviceComponent?: ServiceComponent | null }>;
    deliverables?: PackageDeliverable[];
  }) | null;
  taxRate?: TaxRate | null;
  quotationFunction?: QuotationFunction | null;
};

export type PrismaQuotationRevision = QuotationRevision & {
  items?: PrismaQuotationItem[];
  tenant?: Tenant | null;
  branch?: Branch | null;
};

export type PrismaQuotationDetail = Quotation & {
  lead?: (Lead & {
    customer?: Customer | null;
    inquiry?: Inquiry | null;
    tenant?: Tenant | null;
    branch?: Branch | null;
  }) | null;
  quotationRevisions?: PrismaQuotationRevision[];
  subjects?: QuotationEventSubject[];
  functions?: QuotationFunction[];
  deliverables?: QuotationDeliverable[];
};

const toNum = (val: unknown): number => {
  if (val === null || val === undefined) return 0;
  if (typeof (val as { toNumber?: () => number })?.toNumber === 'function') {
    return (val as { toNumber: () => number }).toNumber();
  }
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

const toNullableNum = (val: unknown): number | null => {
  if (val === null || val === undefined) return null;
  if (typeof (val as { toNumber?: () => number })?.toNumber === 'function') {
    return (val as { toNumber: () => number }).toNumber();
  }
  const num = Number(val);
  return isNaN(num) ? null : num;
};

export class QuotationMapper {
  /**
   * Maps a base Quotation entity to QuotationDto
   */
  public static toQuotationDto(entity: Quotation): QuotationDto {
    return serializePrisma({
      id: entity.id,
      totalAmount: toNum(entity.totalAmount),
      status: entity.status as ServiceQuotationStatus,
      pricingMode: entity.pricingMode || 'ITEMIZED',
      lumpSumAmount: toNullableNum(entity.lumpSumAmount),
      validUntil: entity.validUntil,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  /**
   * Maps DTO input to Prisma Quotation creation payload, explicitly preserving frontend CUIDs
   * for functions, subjects, and deliverables so line item foreign keys remain consistent.
   */
  public static toPrismaInput(dto: CreateQuotationDto) {
    return {
      ...(dto.pricingMode ? { pricingMode: dto.pricingMode } : {}),
      ...(dto.lumpSumAmount != null ? { lumpSumAmount: dto.lumpSumAmount } : {}),
      validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      subjects: dto.subjects && dto.subjects.length > 0 ? {
        create: dto.subjects
          .filter((s) => s && s.name && s.name.trim().length > 0)
          .map((s) => ({
            ...(s.id ? { id: s.id } : {}),
            role: s.role || 'Bride',
            name: s.name.trim(),
            phone: s.phone || null,
            email: s.email || null,
            birthDate: s.birthDate ? new Date(s.birthDate) : null,
            anniversaryDate: s.anniversaryDate ? new Date(s.anniversaryDate) : null,
          })),
      } : undefined,
      functions: dto.functions && dto.functions.length > 0 ? {
        create: dto.functions
          .filter((f) => f && f.name && f.name.trim().length > 0)
          .map((f) => ({
            ...(f.id ? { id: f.id } : {}),
            name: f.name.trim(),
            date: f.date ? new Date(f.date) : null,
            venue: f.venue || null,
          })),
      } : undefined,
      deliverables: dto.deliverables && dto.deliverables.length > 0 ? {
        create: dto.deliverables
          .filter((d) => d && d.name && d.name.trim().length > 0)
          .map((d) => ({
            ...(d.id ? { id: d.id } : {}),
            name: d.name.trim(),
            itemType: d.itemType || 'ALBUM',
            quantity: d.quantity ? Number(d.quantity) : 1,
            basePageLimit: d.basePageLimit != null ? Number(d.basePageLimit) : null,
          })),
      } : undefined,
    };
  }

  /**
   * Maps DTO revision items preserving function relation in snapshotExtra
   */
  public static toRevisionPrismaInput(dto: CreateRevisionDto, validFunctionIds?: string[]) {
    return {
      revisionReason: dto.revisionReason,
      revisionComment: dto.revisionComment,
      pricingMode: dto.pricingMode || 'ITEMIZED',
      lumpSumAmount: dto.lumpSumAmount,
      items: dto.items?.map((item: QuotationItemInput) => {
        let funcRef: string | null = null;
        if (item.quotationFunctionId && item.quotationFunctionId !== 'none') {
          const raw = item.quotationFunctionId.trim();
          if (validFunctionIds) {
            funcRef = validFunctionIds.includes(raw) ? raw : null;
          } else {
            funcRef = raw;
          }
        }
        const { quotationFunctionId: _ignored, ...cleanItem } = item;
        const extraObj = (item as unknown as { snapshotExtra?: Record<string, unknown> }).snapshotExtra || {};
        const customDesc = (item.description && typeof item.description === 'string' && item.description.trim().length > 0)
          ? item.description.trim()
          : ((extraObj.customDescription as string) || null);
        const itemDesc = customDesc || (extraObj.description as string) || null;
        return {
          ...cleanItem,
          description: itemDesc,
          snapshotExtra: {
            ...extraObj,
            customDescription: customDesc,
            description: itemDesc,
            functionReference: funcRef || (item.quotationFunctionId && item.quotationFunctionId !== 'none' ? String(item.quotationFunctionId).trim() : null),
          },
        };
      }),
    };
  }

  /**
   * Maps a Quotation entity with relational data to a QuotationDetailDto
   */
  public static toQuotationDetailDto(entity: PrismaQuotationDetail): QuotationDetailDto {
    const baseDto = this.toQuotationDto(entity);
    
    // Safely handle potentially missing nested relations for robustness
    const customer = entity.lead?.customer;
    const customerName = [customer?.firstName, customer?.lastName].filter(Boolean).join(' ').trim() || 'Valued Client';
    const rawLatestRev = entity.quotationRevisions && entity.quotationRevisions.length > 0
      ? entity.quotationRevisions[0]
      : undefined;
    const latestRevision = rawLatestRev
      ? this.toQuotationRevisionDto(rawLatestRev)
      : undefined;
    const revisions = (entity.quotationRevisions || []).map(r => this.toQuotationRevisionDto(r));

    const quoteNumber = latestRevision?.revisionNumber
      ? `${entity.lead?.leadCode || 'QT'}-R${latestRevision.revisionNumber}`
      : (entity.lead?.leadCode || `QT-${entity.id.slice(0, 8)}`);

    const inquiry = entity.lead?.inquiry;
    const eventType = inquiry?.eventType || 'Photography Services';
    const title = inquiry?.eventType ? `${inquiry.eventType} Photography` : 'Commercial Quotation';

    const grandTotal = toNum(latestRevision?.grandTotal ?? entity.totalAmount);
    const subtotal = toNum(latestRevision?.subtotal ?? entity.totalAmount);
    const totalDiscount = toNum(latestRevision?.discountAmount ?? 0);
    const totalTax = toNum(latestRevision?.taxAmount ?? 0);
    const currency = latestRevision?.currencyCode || 'INR';
    const version = latestRevision?.revisionNumber || 1;
    const items = latestRevision?.items || [];
    const clientSignature = entity.clientSignature || latestRevision?.clientSignature || null;
    const acceptedAt = entity.acceptedAt || latestRevision?.acceptedAt || null;
    const clientIpAddress = entity.clientIpAddress || latestRevision?.clientIpAddress || null;
    const acceptanceTerms = entity.acceptanceTerms || latestRevision?.acceptanceTerms || null;
    const terms = acceptanceTerms;
    const advanceRequired = Math.round(grandTotal * 0.5);
    const notes = latestRevision?.revisionComment || entity.lead?.notes || inquiry?.notes || null;
    
    return serializePrisma({
      ...baseDto,
      leadId: entity.leadId,
      documentUrl: entity.documentUrl,
      quoteNumber,
      quotationNumber: quoteNumber,
      customerName,
      customerPhone: customer?.phone || null,
      customerEmail: customer?.email || null,
      title,
      eventType,
      subtotal,
      totalDiscount,
      totalTax,
      grandTotal,
      currencyCode: currency,
      currency,
      version,
      items,
      revisions,
      clientSignature,
      acceptedAt,
      clientIpAddress,
      acceptanceTerms,
      terms,
      termsAndConditions: terms,
      advanceRequired,
      subjects: entity.subjects || [],
      functions: entity.functions || [],
      deliverables: entity.deliverables || [],
      customPortfolioUrls: entity.customPortfolioUrls || [],
      customPromoVideoUrl: entity.customPromoVideoUrl || null,
      portfolioUrls: (entity.customPortfolioUrls && entity.customPortfolioUrls.length > 0)
        ? entity.customPortfolioUrls
        : (entity.lead?.tenant?.defaultPortfolioUrls || []),
      promoVideoUrl: entity.customPromoVideoUrl || entity.lead?.tenant?.defaultPromoVideoUrl || null,
      whyChooseUs: entity.lead?.tenant?.whyChooseUs || [],
      tenant: entity.lead?.tenant || rawLatestRev?.tenant || null,
      branch: entity.lead?.branch || rawLatestRev?.branch || null,
      notes,
      lead: {
        id: entity.lead?.id || entity.leadId,
        leadCode: entity.lead?.leadCode || '',
        eventType,
        customer: {
          id: customer?.id || '',
          firstName: customer?.firstName || '',
          lastName: customer?.lastName || '',
          name: customerName,
          companyName: null,
          email: customer?.email,
          phone: customer?.phone,
          customerCode: customer?.customerCode || null,
        },
        inquiry: inquiry ? {
          id: inquiry.id,
          eventType: inquiry.eventType,
          eventDate: inquiry.eventDate,
          notes: inquiry.notes,
        } : null,
      },
      latestRevision,
    });
  }

  /**
   * Maps a QuotationRevision entity with items to QuotationRevisionDto
   */
  public static toQuotationRevisionDto(entity: PrismaQuotationRevision): QuotationRevisionDto {
    const acceptanceTerms = entity.acceptanceTerms || null;
    return serializePrisma({
      id: entity.id,
      quotationId: entity.quotationId,
      revisionNumber: entity.revisionNumber,
      revisionReason: entity.revisionReason,
      revisionComment: entity.revisionComment,
      notes: entity.revisionComment || null,
      terms: acceptanceTerms,
      termsAndConditions: acceptanceTerms,
      acceptanceTerms,
      currencyCode: entity.currencyCode,
      status: entity.status as ServiceQuotationStatus,
      pricingMode: entity.pricingMode || 'ITEMIZED',
      lumpSumAmount: toNullableNum(entity.lumpSumAmount),
      subtotal: toNum(entity.subtotal),
      discountType: entity.discountType,
      discountValue: toNullableNum(entity.discountValue),
      discountAmount: toNum(entity.discountAmount),
      couponCode: entity.couponCode,
      taxAmount: toNum(entity.taxAmount),
      roundOff: toNum(entity.roundOff),
      totalAmount: toNum(entity.totalAmount),
      grandTotal: toNum(entity.grandTotal),
      createdAt: entity.createdAt,
      items: (entity.items || []).map(item => this.toQuotationRevisionItemDto(item)),
      clientSignature: entity.clientSignature,
      acceptedAt: entity.acceptedAt,
      clientIpAddress: entity.clientIpAddress,
    });
  }

  /**
   * Maps a QuotationRevisionItem entity with relational tax data to QuotationRevisionItemDto
   */
  public static toQuotationRevisionItemDto(entity: PrismaQuotationItem): QuotationRevisionItemDto {
    const extra = entity.snapshotExtra && typeof entity.snapshotExtra === 'object'
      ? (entity.snapshotExtra as Record<string, unknown>)
      : null;

    const pkg = entity.package;
    const packageDesc = pkg?.notes || null;
    const packageItemsDesc = Array.isArray(pkg?.items) && pkg.items.length > 0
      ? pkg.items.map((pi) => pi.description || pi.serviceComponent?.name).filter(Boolean).join('\n')
      : null;

    const resolvedDescription = 
      entity.description || 
      (extra?.customDescription as string) || 
      (extra?.description as string) || 
      packageDesc || 
      packageItemsDesc || 
      (extra?.packageDetails as string) || 
      null;

    const funcRef = (extra?.functionReference as string) || (extra?.resolvedFunctionId as string) || null;

    return serializePrisma({
      id: entity.id,
      packageId: entity.packageId,
      quotationFunctionId: entity.quotationFunctionId || entity.quotationFunction?.id || funcRef || null,
      functionName: entity.quotationFunction?.name || null,
      itemName: entity.itemName || pkg?.name || 'Photography Service',
      description: resolvedDescription,
      package: pkg ? {
        id: pkg.id,
        name: pkg.name,
        description: pkg.notes || null,
        categoryName: pkg.categoryName || null,
      } : null,
      snapshotExtra: extra,
      quantity: entity.quantity,
      unitPrice: toNum(entity.unitPrice),
      priceOverride: toNullableNum(entity.priceOverride),
      itemDiscountType: entity.itemDiscountType,
      itemDiscountValue: toNullableNum(entity.itemDiscountValue),
      gstInclusive: entity.gstInclusive,
      taxPercentage: toNullableNum(entity.taxPercentage),
      calculatedSubtotal: toNum(entity.calculatedSubtotal),
      calculatedDiscountAmount: toNum(entity.calculatedDiscountAmount),
      calculatedTaxAmount: toNum(entity.calculatedTaxAmount),
      calculatedTotal: toNum(entity.calculatedTotal),
      lineItemType: entity.lineItemType,
      taxRate: entity.taxRate ? {
        id: entity.taxRate.id,
        name: entity.taxRate.name,
        percentage: toNum(entity.taxRate.percentage),
      } : null,
    });
  }
}
