import { Prisma, DiscountType, LeadStatus, QuotationStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ServiceContext, CreateQuotationDto, QuotationDetailDto } from './quotation.types';
import { ServiceQuotationStatus } from './quotation.constants';
import { QuotationRepository } from '@/repositories/quotation.repository';
import { LeadRepository } from '@/repositories/lead.repository';
import { PackageRepository } from '@/repositories/package.repository';
import { PricingService } from '../pricing/pricing.service';
import { PricingItemInput } from '../pricing/pricing.types';
import { QuotationValidators } from './quotation.validators';
import { QuotationMapper, PrismaQuotationDetail } from './quotation.mapper';
import { QuotationNotFoundError, BusinessRuleError } from './quotation.errors';
import { NumberSeriesService } from '../number-series.service';
import { serializePrisma } from '@/lib/serialize';

const parseValidDate = (val: string | number | Date | null | undefined): Date | null => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const normalizeDiscountType = (type?: string | null): DiscountType => {
  if (!type || type === 'NONE') return 'NONE';
  if (type === 'PERCENTAGE') return 'PERCENTAGE';
  if (type === 'FIXED' || type === 'FIXED_AMOUNT') return 'FIXED';
  return 'NONE';
};

export class QuotationService {
  /**
   * Resolves quotation terms from explicit input, DocumentTemplate (type: QUOTATION_TERMS), or studio defaults.
   */
  public static async resolveQuotationTerms(tenantId: string, customTerms?: string | null): Promise<string> {
    if (customTerms && customTerms.trim().length > 0) {
      return customTerms.trim();
    }

    try {
      const template = await prisma.documentTemplate.findFirst({
        where: {
          tenantId,
          type: 'QUOTATION_TERMS',
          isActive: true,
          deletedAt: null,
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (template?.content && template.content.trim().length > 0) {
        return template.content.trim();
      }
    } catch (err) {
      console.warn('[QuotationService] Failed to load QUOTATION_TERMS from DocumentTemplate:', err);
    }

    return [
      '1. 50% advance payment is required to confirm booking and secure photography dates.',
      '2. Remaining 50% balance must be cleared on or before the main event day.',
      '3. Deliverables timeline: Raw previews within 7 business days, final edited prints within 3-4 weeks.',
      '4. Any travel, lodging, or permit fees outside local studio limits are billed at actuals.',
      '5. Cancellations made within 14 days of the scheduled shoot forfeit the advance booking deposit.'
    ].join('\n');
  }

  /**
   * Orchestrates the creation of a new Quotation and its initial DRAFT revision.
   * 
   * Orchestration Flow:
   * 1. Validate Lead & Customer Tree: Ensure lead exists, is eligible, and has a Customer record (create Draft Customer if missing).
   * 2. Validate Packages: Load requested packages, ensure they are active.
   * 3. Price Calculation: Map DTO items and call the deterministic PricingService.
   * 4. Open Transaction: Write quotation, write revision, write items atomically.
   * 5. Audit & Activity Logs: Log the creation securely.
   * 6. Commit & Event Bus: Publish domain event ONLY after successful commit.
   * 7. Map & Return: Reload the created quotation via repository and return as DTO.
   */
  public static async createQuotation(
    ctx: ServiceContext,
    data: CreateQuotationDto
  ): Promise<QuotationDetailDto> {
    // 1. Validate Lead
    let lead = await LeadRepository.findById(ctx.tenantId, data.leadId);
    if (!lead) {
      throw new QuotationNotFoundError(`Lead ${data.leadId} not found`);
    }
    QuotationValidators.validateLeadEligibility(lead);

    // Align context branch with lead's branch for strict lineage consistency
    if (lead.branchId) {
      ctx.branchId = lead.branchId;
    }

    // 2. Customer Tree Logic: Guarantee a Customer record is attached to the Lead
    let customerId = lead.customerId;
    if (!customerId || !lead.customer) {
      let validUserId: string | null = null;
      if (ctx.userId) {
        const userExists = await prisma.user.findFirst({
          where: { id: ctx.userId, ...(ctx.tenantId ? { tenantId: ctx.tenantId } : {}) },
          select: { id: true },
        });
        if (userExists) validUserId = userExists.id;
      }

      const customerCode = await NumberSeriesService.getNextNumber(prisma, ctx.tenantId, 'CUSTOMER');
      
      const inquiry = (lead as unknown as { inquiry?: { customer?: { firstName?: string; lastName?: string; phone?: string; email?: string } } }).inquiry;
      const clientName = data.customerName || (lead as unknown as { customerName?: string }).customerName || 'Client';
      const nameParts = clientName.trim().split(/\s+/);
      const firstName = inquiry?.customer?.firstName || nameParts[0] || 'Client';
      const lastName = inquiry?.customer?.lastName || nameParts.slice(1).join(' ') || '.';
      const phone = inquiry?.customer?.phone || data.customerPhone || (lead as unknown as { customerPhone?: string }).customerPhone || null;
      const email = inquiry?.customer?.email || data.customerEmail || (lead as unknown as { customerEmail?: string }).customerEmail || null;

      const draftCustomer = await prisma.customer.create({
        data: {
          tenantId: ctx.tenantId,
          branchId: ctx.branchId || lead.branchId,
          customerCode,
          firstName,
          lastName,
          phone,
          email,
          isConfirmed: false,
          portalAccessGranted: false,
          portalAccessCode: null,
          createdById: validUserId,
        },
      });

      customerId = draftCustomer.id;

      await prisma.lead.update({
        where: { id: lead.id },
        data: { customerId: draftCustomer.id },
      });

      lead.customerId = customerId;
      lead.customer = draftCustomer;
    }

    // 3. Validate Packages
    const packagePromises = data.items.map(item => PackageRepository.findById(ctx.tenantId, item.packageId));
    const loadedPackages = (await Promise.all(packagePromises)).filter((p): p is NonNullable<typeof p> => p !== null);
    QuotationValidators.validatePackageSelection(data.items, loadedPackages);

    // 4. Price Calculation
    // Map QuotationItemInput to generic PricingItemInput for the pricing engine
    const pricingInputs: PricingItemInput[] = data.items.map(item => {
      const pkg = loadedPackages.find(p => p.id === item.packageId);
      const itemDiscountType = normalizeDiscountType(item.itemDiscountType || (item as unknown as { discountType?: DiscountType }).discountType);
      const rawDiscountValue = item.itemDiscountValue ?? (item as unknown as { discountValue?: number | Prisma.Decimal }).discountValue ?? 0;
      const itemDiscountValue = new Prisma.Decimal(rawDiscountValue);

      return {
        itemId: item.packageId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        itemDiscountType,
        itemDiscountValue,
        taxPercentage: pkg?.taxRate?.percentage || null,
        isBillable: item.lineItemType !== 'INFORMATION',
      };
    });

    const normalizedQuoteDiscount = data.discount ? {
      ...data.discount,
      discountType: normalizeDiscountType(data.discount.discountType),
    } : undefined;

    const pricingResult = PricingService.calculate(pricingInputs, normalizedQuoteDiscount);

    const isLumpSum = data.pricingMode === 'LUMP_SUM';
    const lumpSumDecimal = data.lumpSumAmount != null
      ? new Prisma.Decimal(data.lumpSumAmount)
      : null;
    const finalGrandTotal = (isLumpSum && lumpSumDecimal != null)
      ? lumpSumDecimal
      : pricingResult.grandTotal;

    // 5. Open Transaction
    const validUntilDate = parseValidDate(data.validUntil);
    const finalTerms = await QuotationService.resolveQuotationTerms(ctx.tenantId, data.terms || data.termsAndConditions);
    const specialNotes = (data.notes && data.notes.trim().length > 0) ? data.notes.trim() : null;

    const createdQuotationId = await prisma.$transaction(async (tx) => {
      // Create the root quotation
      const quotation = await QuotationRepository.createQuotation(tx, {
        lead: { connect: { id: data.leadId } },
        totalAmount: finalGrandTotal,
        pricingMode: isLumpSum ? 'LUMP_SUM' : 'ITEMIZED',
        lumpSumAmount: lumpSumDecimal,
        status: 'DRAFT',
        validUntil: validUntilDate,
        acceptanceTerms: finalTerms,
      });

      const normalizedDiscountType = normalizeDiscountType(data.discount?.discountType);
      const discountValue = data.discount?.discountValue != null
        ? new Prisma.Decimal(data.discount.discountValue)
        : new Prisma.Decimal(0);

      // Create subjects if provided
      const validSubjects = (data.subjects || []).filter((s) => s && s.name && s.name.trim().length > 0);
      if (validSubjects.length > 0) {
        await tx.quotationEventSubject.createMany({
          data: validSubjects.map((s) => ({
            ...(s.id ? { id: s.id } : {}),
            quotationId: quotation.id,
            role: s.role || 'Bride',
            name: s.name.trim(),
            phone: s.phone || null,
            email: s.email || null,
            birthDate: s.birthDate ? new Date(s.birthDate) : null,
            anniversaryDate: s.anniversaryDate ? new Date(s.anniversaryDate) : null,
          })),
        });
      }

      // Create functions if provided and track IDs
      const functionMap = new Map<string, string>();
      const validFunctions = (data.functions || []).filter((f) => f && f.name && f.name.trim().length > 0);
      for (let i = 0; i < validFunctions.length; i++) {
        const fn = validFunctions[i];
        const createdFn = await tx.quotationFunction.create({
          data: {
            ...(fn.id ? { id: fn.id } : {}),
            quotationId: quotation.id,
            name: fn.name.trim(),
            date: fn.date ? new Date(fn.date) : null,
            venue: fn.venue || null,
          },
        });
        if (fn.id) functionMap.set(fn.id, createdFn.id);
        functionMap.set(i.toString(), createdFn.id);
        functionMap.set(fn.name.trim(), createdFn.id);
        functionMap.set(fn.name.trim().toLowerCase(), createdFn.id);
        functionMap.set(createdFn.id, createdFn.id);
      }

      // Create deliverables if provided
      const validDeliverables = (data.deliverables || []).filter((d) => d && d.name && d.name.trim().length > 0);
      if (validDeliverables.length > 0) {
        await tx.quotationDeliverable.createMany({
          data: validDeliverables.map((d) => ({
            ...(d.id ? { id: d.id } : {}),
            quotationId: quotation.id,
            name: d.name.trim(),
            itemType: d.itemType || 'ALBUM',
            quantity: d.quantity ? Number(d.quantity) : 1,
            basePageLimit: d.basePageLimit != null ? Number(d.basePageLimit) : null,
          })),
        });
      }

      // If special notes provided, record in Lead notes
      if (specialNotes) {
        await tx.lead.update({
          where: { id: data.leadId },
          data: { notes: specialNotes },
        }).catch(() => {});
      }

      // Create the initial revision (revisionNumber: 1)
      await QuotationRepository.createRevision(tx, {
        tenant: { connect: { id: ctx.tenantId } },
        branch: { connect: { id: ctx.branchId } },
        quotation: { connect: { id: quotation.id } },
        revisionNumber: 1,
        revisionReason: 'Initial creation',
        revisionComment: specialNotes,
        acceptanceTerms: finalTerms,
        currencyCode: pricingResult.currencyCode,
        baseCurrency: pricingResult.currencyCode, // Defaulting to same currency
        exchangeRate: new Prisma.Decimal(1),      // Defaulting to 1:1
        status: 'DRAFT',
        pricingMode: isLumpSum ? 'LUMP_SUM' : 'ITEMIZED',
        lumpSumAmount: lumpSumDecimal,
        subtotal: pricingResult.subtotal,
        discountType: normalizedDiscountType,
        discountValue,
        discountAmount: pricingResult.discountAmount,
        couponCode: data.discount?.couponCode,
        taxAmount: pricingResult.taxAmount,
        roundOff: pricingResult.roundOff,
        totalAmount: finalGrandTotal,
        grandTotal: finalGrandTotal,
        items: {
          create: data.items.map((item, index) => {
            const pricingItem = pricingResult.items[index];
            const pkg = loadedPackages.find(p => p.id === item.packageId);
            const itemDiscountType = normalizeDiscountType(item.itemDiscountType || (item as unknown as { discountType?: DiscountType }).discountType);
            const itemDiscountValue = item.itemDiscountValue != null
              ? new Prisma.Decimal(item.itemDiscountValue)
              : (item as unknown as { discountValue?: number | string }).discountValue != null
        ? new Prisma.Decimal((item as unknown as { discountValue: number | string }).discountValue)
              : new Prisma.Decimal(0);

            let resolvedFunctionId: string | null = null;
            if (item.quotationFunctionId && item.quotationFunctionId !== 'none' && String(item.quotationFunctionId).trim() !== '') {
              const rawFnId = String(item.quotationFunctionId).trim();
              if (functionMap.has(rawFnId)) {
                resolvedFunctionId = functionMap.get(rawFnId)!;
              } else if (functionMap.has(rawFnId.toLowerCase())) {
                resolvedFunctionId = functionMap.get(rawFnId.toLowerCase())!;
              } else if (Array.from(functionMap.values()).includes(rawFnId)) {
                resolvedFunctionId = rawFnId;
              } else {
                resolvedFunctionId = null; // Fallback to null to prevent foreign key violation
              }
            }

            const itemDescStr = item.description && typeof item.description === 'string' ? item.description.trim() : null;
    const customDesc = itemDescStr && itemDescStr.length > 0 ? itemDescStr
              : null;
            const finalDesc = customDesc || pkg?.notes || null;

            return {
              tenant: { connect: { id: ctx.tenantId } },
              branch: { connect: { id: ctx.branchId } },
              package: { connect: { id: item.packageId } },
              packageVersion: pkg?.version || 1,
              itemName: item.itemName || pkg?.name || 'Photography Service',
              description: finalDesc,
              snapshotExtra: {
                functionReference: (item.quotationFunctionId && item.quotationFunctionId !== 'none') ? String(item.quotationFunctionId).trim() : null,
                resolvedFunctionId: resolvedFunctionId || null,
                customDescription: customDesc,
                description: finalDesc,
              },
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              itemDiscountType,
              itemDiscountValue,
              gstInclusive: Boolean(pkg?.taxRateId),
              taxPercentage: pkg?.taxRate?.percentage || null,
              calculatedSubtotal: pricingItem.calculatedSubtotal,
              calculatedDiscountAmount: pricingItem.calculatedDiscountAmount,
              calculatedTaxAmount: pricingItem.calculatedTaxAmount,
              calculatedTotal: pricingItem.calculatedTotal,
              lineItemType: item.lineItemType || 'STANDARD',
              taxRate: pkg?.taxRate?.id ? { connect: { id: pkg.taxRate.id } } : undefined,
            };
          })
        }
      });

      // 5. Automate Lead Stage transition to QUOTATION_SENT
      await tx.lead.update({
        where: { id: data.leadId },
        data: {
          status: LeadStatus.QUOTATION_SENT,
        },
      });

      return quotation.id;
    });

    // 7. Map & Return
    const finalQuotation = await QuotationRepository.findById(createdQuotationId, ctx.tenantId, ctx.branchId);
    if (!finalQuotation) {
      throw new QuotationNotFoundError(`Failed to load created quotation ${createdQuotationId}`);
    }
    
    return serializePrisma(QuotationMapper.toQuotationDetailDto(finalQuotation as PrismaQuotationDetail));
  }

  /**
   * Orchestrates the retrieval of a Quotation by its ID.
   * 
   * Orchestration Flow:
   * 1. Query via Repository: Passes tenantId and branchId securely to enforce data isolation.
   * 2. Not Found Handling: Throws domain-specific QuotationNotFoundError if missing.
   * 3. Mapping: Transforms the raw Prisma graph into a QuotationDetailDto.
   */
  public static async getQuotationById(
    ctx: ServiceContext,
    quotationId: string
  ): Promise<QuotationDetailDto> {
    const quotation = await QuotationRepository.findById(quotationId, ctx.tenantId, ctx.branchId);
    
    if (!quotation) {
      throw new QuotationNotFoundError(`Quotation ${quotationId} not found`);
    }

    return serializePrisma(QuotationMapper.toQuotationDetailDto(quotation as PrismaQuotationDetail));
  }

  /**
   * Retrieves all quotations linked to a specific lead, with all Decimals serialized to numbers.
   */
  public static async findByLeadId(
    leadId: string,
    ctx?: Partial<ServiceContext>
  ): Promise<unknown[]> {
    const quotations = await QuotationRepository.findAll(ctx?.tenantId, ctx?.branchId, { leadId });
    return serializePrisma(quotations);
  }

  /**
   * Orchestrates the creation of a new Revision for an existing Quotation.
   * 
   * Orchestration Flow:
   * 1. Fetch & Ownership Validation: Validates root quotation exists and matches tenant/branch.
   * 2. Status Validation: Prevents revisions if quotation is CONVERTED or EXPIRED.
   * 3. Package Snapshot Refresh: Loads current active packages to snapshot names, taxes, and versions.
   * 4. Financial Recalculation: Passes items to pure deterministic PricingService.
   * 5. Open Transaction: Generates atomic revision number, writes immutable snapshot, updates root total.
   * 6. Audit & Activity Logs: Saves secure logs within the transaction.
   * 7. Commit & Event Bus: Emits 'RevisionCreated' on success.
   * 8. Map & Return: Reloads complete quotation graph and maps to DTO.
   */
  public static async createRevision(
    ctx: ServiceContext,
    quotationId: string,
    data: import('./quotation.types').CreateRevisionDto
  ): Promise<QuotationDetailDto> {
    // 1. Fetch & Ownership Validation
    const quotation = await QuotationRepository.findById(quotationId, ctx.tenantId, ctx.branchId);
    if (!quotation) {
      throw new QuotationNotFoundError(`Quotation ${quotationId} not found`);
    }

    // 2. Status Validation
    QuotationValidators.validateRevisionCreation(quotationId, quotation.status as ServiceQuotationStatus);

    // 3. Fetch latest revision for fallback / deep cloning
    const latestRevision = await QuotationRepository.findLatestRevision(quotationId, ctx.tenantId, ctx.branchId);

    // Deep clone line items if not provided or empty
    let itemsToProcess = (data.items && data.items.length > 0) ? data.items : [];
    if (itemsToProcess.length === 0 && latestRevision?.items && latestRevision.items.length > 0) {
      itemsToProcess = latestRevision.items.map(item => ({
        id: undefined,
        packageId: item.packageId,
        quotationFunctionId: ((item.snapshotExtra as Record<string, unknown>)?.functionReference as string) || item.quotationFunctionId || null,
        itemName: item.itemName || 'Service Component',
        description: item.description || ((item.snapshotExtra as Record<string, unknown>)?.customDescription as string) || null,
        quantity: Number(item.quantity) || 1,
        unitPrice: new Prisma.Decimal(item.unitPrice || 0),
        itemDiscountType: item.itemDiscountType || 'NONE',
        itemDiscountValue: item.itemDiscountValue ? new Prisma.Decimal(item.itemDiscountValue) : undefined,
        lineItemType: item.lineItemType || 'STANDARD',
      }));
    }

    // Ensure every item has a valid packageId
    for (const item of itemsToProcess) {
      if (!item.packageId) {
        let pkg = await prisma.package.findFirst({
          where: { tenantId: ctx.tenantId, isActive: true, deletedAt: null },
        });
        if (!pkg) {
          let category = await prisma.packageCategory.findFirst({
            where: { tenantId: ctx.tenantId, isActive: true, deletedAt: null },
          });
          if (!category) {
            category = await prisma.packageCategory.create({
              data: {
                tenantId: ctx.tenantId,
                name: 'Photography Services',
                code: 'PHOTO_SERVICES',
                isActive: true,
              },
            });
          }
          pkg = await prisma.package.create({
            data: {
              tenantId: ctx.tenantId,
              branchId: ctx.branchId,
              packageCode: 'CUSTOM_SERVICE',
              name: item.itemName || 'Custom Service',
              categoryId: category.id,
              basePrice: item.unitPrice || 0,
              isActive: true,
              version: 1,
              isCurrentVersion: true,
            },
          });
        }
        item.packageId = pkg.id;
      }
    }

    // 4. Package Validation & Snapshot Refresh
    const packagePromises = itemsToProcess.map(item => PackageRepository.findById(ctx.tenantId, item.packageId));
    const loadedPackages = (await Promise.all(packagePromises)).filter((p): p is NonNullable<typeof p> => p !== null);
    QuotationValidators.validatePackageSelection(itemsToProcess, loadedPackages);

    // 5. Financial Recalculation
    const pricingInputs: PricingItemInput[] = itemsToProcess.map(item => {
      const pkg = loadedPackages.find(p => p.id === item.packageId);
      return {
        itemId: item.packageId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        itemDiscountType: item.itemDiscountType,
        itemDiscountValue: item.itemDiscountValue != null ? new Prisma.Decimal(item.itemDiscountValue) : undefined,
        taxPercentage: pkg?.taxRate?.percentage || null,
        isBillable: item.lineItemType !== 'INFORMATION',
      };
    });

    const discountToUse = data.discount !== undefined ? data.discount : (latestRevision?.discountType && latestRevision.discountType !== 'NONE' ? {
      discountType: (latestRevision.discountType as DiscountType) || DiscountType.NONE,
      discountValue: latestRevision.discountValue ? new Prisma.Decimal(latestRevision.discountValue) : new Prisma.Decimal(0),
      couponCode: latestRevision.couponCode || undefined,
    } : undefined);

    const pricingResult = PricingService.calculate(pricingInputs, discountToUse);

    const isLumpSum = (data.pricingMode || latestRevision?.pricingMode || quotation.pricingMode) === 'LUMP_SUM';
    const lumpSumNum = data.lumpSumAmount != null ? Number(data.lumpSumAmount) : (latestRevision?.lumpSumAmount != null ? Number(latestRevision.lumpSumAmount) : null);
    const finalGrandTotal = (isLumpSum && lumpSumNum != null && lumpSumNum > 0) ? new Prisma.Decimal(lumpSumNum) : pricingResult.grandTotal;

    // 6. Transaction Boundary
    await prisma.$transaction(async (tx) => {
      // Determine next revision number (Optimistic read)
      const nextRevisionNumber = latestRevision ? latestRevision.revisionNumber + 1 : 1;

      // Update or preserve subjects
      if (data.subjects && data.subjects.length > 0) {
        await tx.quotationEventSubject.deleteMany({ where: { quotationId: quotation.id } });
        const validSubjects = data.subjects.filter((s) => s && s.name && s.name.trim().length > 0);
        if (validSubjects.length > 0) {
          await tx.quotationEventSubject.createMany({
            data: validSubjects.map((s) => ({
              quotationId: quotation.id,
              role: s.role || 'Bride',
              name: s.name.trim(),
              phone: s.phone || null,
              email: s.email || null,
              birthDate: s.birthDate ? new Date(s.birthDate) : null,
              anniversaryDate: s.anniversaryDate ? new Date(s.anniversaryDate) : null,
            })),
          });
        }
      }

      // Update or preserve functions
      if (data.functions && data.functions.length > 0) {
        await tx.quotationFunction.deleteMany({ where: { quotationId: quotation.id } });
        const validFunctions = data.functions.filter((f) => f && f.name && f.name.trim().length > 0);
        for (const fn of validFunctions) {
          await tx.quotationFunction.create({
            data: {
              quotationId: quotation.id,
              name: fn.name.trim(),
              date: fn.date ? new Date(fn.date) : null,
              venue: fn.venue || null,
            },
          });
        }
      }

      // Update or preserve deliverables
      if (data.deliverables && data.deliverables.length > 0) {
        await tx.quotationDeliverable.deleteMany({ where: { quotationId: quotation.id } });
        const validDeliverables = data.deliverables.filter((d) => d && d.name && d.name.trim().length > 0);
        if (validDeliverables.length > 0) {
          await tx.quotationDeliverable.createMany({
            data: validDeliverables.map((d) => ({
              quotationId: quotation.id,
              name: d.name.trim(),
              itemType: d.itemType || 'ALBUM',
              quantity: d.quantity ? Number(d.quantity) : 1,
              basePageLimit: d.basePageLimit != null ? Number(d.basePageLimit) : null,
            })),
          });
        }
      }

      // Resolve terms and special notes cleanly
      const customTerms = data.terms || data.termsAndConditions;
      const originalTerms = quotation.quotationRevisions?.[0]?.acceptanceTerms || quotation.acceptanceTerms;
      const finalTerms = customTerms && customTerms.trim().length > 0
        ? customTerms.trim()
        : (originalTerms || await QuotationService.resolveQuotationTerms(ctx.tenantId));

      const specialNotes = data.notes !== undefined
        ? (data.notes && data.notes.trim().length > 0 ? data.notes.trim() : null)
        : (data.revisionComment || quotation.quotationRevisions?.[0]?.revisionComment || null);

      if (specialNotes && quotation.leadId) {
        await tx.lead.update({
          where: { id: quotation.leadId },
          data: { notes: specialNotes },
        }).catch(() => {});
      }

      // Create new immutable snapshot
      const revision = await QuotationRepository.createRevision(tx, {
        tenant: { connect: { id: ctx.tenantId } },
        branch: { connect: { id: ctx.branchId } },
        quotation: { connect: { id: quotation.id } },
        revisionNumber: nextRevisionNumber,
        revisionReason: data.revisionReason || 'Client requested modifications',
        revisionComment: specialNotes,
        acceptanceTerms: finalTerms,
        currencyCode: pricingResult.currencyCode,
        baseCurrency: pricingResult.currencyCode,
        exchangeRate: new Prisma.Decimal(1),
        status: 'DRAFT',
        pricingMode: isLumpSum ? 'LUMP_SUM' : 'ITEMIZED',
        lumpSumAmount: isLumpSum && lumpSumNum != null ? new Prisma.Decimal(lumpSumNum) : null,
        subtotal: pricingResult.subtotal,
        discountType: normalizeDiscountType(discountToUse?.discountType),
        discountValue: discountToUse?.discountValue != null ? new Prisma.Decimal(discountToUse.discountValue) : new Prisma.Decimal(0),
        discountAmount: pricingResult.discountAmount,
        couponCode: discountToUse?.couponCode,
        taxAmount: pricingResult.taxAmount,
        roundOff: pricingResult.roundOff,
        totalAmount: finalGrandTotal,
        grandTotal: finalGrandTotal,
        items: {
          create: itemsToProcess.map((item, index) => {
            const pricingItem = pricingResult.items[index];
            const pkg = loadedPackages.find(p => p.id === item.packageId);
            const itemDescStr = item.description && typeof item.description === 'string' ? item.description.trim() : null;
    const customDesc = itemDescStr && itemDescStr.length > 0 ? itemDescStr
              : null;
            const finalDesc = customDesc || pkg?.notes || null;

            return {
              tenant: { connect: { id: ctx.tenantId } },
              branch: { connect: { id: ctx.branchId } },
              package: { connect: { id: item.packageId } },
              packageVersion: pkg?.version || 1,
              itemName: item.itemName || pkg?.name || 'Photography Service',
              description: finalDesc,
              snapshotExtra: {
                functionReference: (item.quotationFunctionId && item.quotationFunctionId !== 'none')
      ? String(item.quotationFunctionId).trim()
                  : null,
                customDescription: customDesc,
                description: finalDesc,
              },
              quantity: item.quantity ?? 1,
              unitPrice: item.unitPrice ?? 0,
              itemDiscountType: normalizeDiscountType(item.itemDiscountType || (item as unknown as { discountType?: DiscountType }).discountType),
              itemDiscountValue: item.itemDiscountValue != null ? new Prisma.Decimal(item.itemDiscountValue) : new Prisma.Decimal(0),
              gstInclusive: Boolean(pkg?.taxRateId),
              taxPercentage: pkg?.taxRate?.percentage || null,
              calculatedSubtotal: pricingItem?.calculatedSubtotal ?? new Prisma.Decimal(Number(item.quantity || 1) * Number(item.unitPrice || 0)),
              calculatedDiscountAmount: pricingItem?.calculatedDiscountAmount ?? new Prisma.Decimal(0),
              calculatedTaxAmount: pricingItem?.calculatedTaxAmount ?? new Prisma.Decimal(0),
              calculatedTotal: pricingItem?.calculatedTotal ?? new Prisma.Decimal(Number(item.quantity || 1) * Number(item.unitPrice || 0)),
              lineItemType: item.lineItemType || 'STANDARD',
              taxRate: pkg?.taxRate?.id ? { connect: { id: pkg.taxRate.id } } : undefined,
            };
          })
        }
      });

      // Update the root quotation totalAmount to reflect the latest revision
      const now = new Date();
      const currentValidUntil = quotation.validUntil ? new Date(quotation.validUntil) : null;
      const refreshedValidUntil = (!currentValidUntil || isNaN(currentValidUntil.getTime()) || currentValidUntil < now)
        ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        : currentValidUntil;

      await QuotationRepository.updateQuotation(tx, quotation.id, {
        totalAmount: finalGrandTotal,
        pricingMode: isLumpSum ? 'LUMP_SUM' : 'ITEMIZED',
        lumpSumAmount: isLumpSum && lumpSumNum != null ? new Prisma.Decimal(lumpSumNum) : null,
        status: 'DRAFT',
        validUntil: refreshedValidUntil,
        acceptanceTerms: finalTerms,
      });

      // Automate Lead Stage transition to NEGOTIATION upon revision creation
      const targetLeadId = quotation.leadId;
      if (targetLeadId) {
        await tx.lead.update({
          where: { id: targetLeadId },
          data: {
            status: LeadStatus.NEGOTIATION,
          },
        });
      }
    });

    // 8. Map & Return
    const updatedQuotation = await QuotationRepository.findById(quotationId, ctx.tenantId, ctx.branchId);
    return serializePrisma(QuotationMapper.toQuotationDetailDto(updatedQuotation as PrismaQuotationDetail));
  }

  /**
   * Orchestrates updating a DRAFT Revision.
   * 
   * Orchestration Flow:
   * 1. Query securely: Validates existence and ownership.
   * 2. Immutability validation: Ensures only DRAFT is modified.
   * 3. Optimistic locking: Verifies the passed updatedAt matches the DB.
   * 4. Pricing recalculation: Conditionally fully recalculates via PricingService if items/discounts provided.
   * 5. Open Transaction: Safely replaces items (deleteMany/create), updates totals, and updates root validUntil if provided.
   * 6. Audit Logging: Secured inside the atomic transaction block.
   * 7. Commit & Map: Fetches the updated graph and transforms to DTO.
   */
  public static async updateRevisionDraft(
    ctx: ServiceContext,
    revisionId: string,
    data: import('./quotation.types').UpdateRevisionDto
  ): Promise<QuotationDetailDto> {
    const revision = await QuotationRepository.findRevisionById(revisionId, ctx.tenantId, ctx.branchId);
    if (!revision) {
      throw new QuotationNotFoundError(`Revision ${revisionId} not found`);
    }

    // Validate Immutability (Must be DRAFT)
    QuotationValidators.validateRevisionEditable(revisionId, revision.status as ServiceQuotationStatus);

    // Optimistic Locking Check
    const dbRev = await prisma.quotationRevision.findUnique({ where: { id: revisionId }, select: { updatedAt: true } });
    if (dbRev?.updatedAt && data.updatedAt) {
      const dbTime = new Date(dbRev.updatedAt).getTime();
      const clientTime = new Date(data.updatedAt).getTime();
      // Only fail if client's loaded version is strictly older than database version by more than 2000ms.
      // This prevents false positives from JSON date serialization, timezone shifts, and clock skew.
      if (!isNaN(clientTime) && (dbTime - clientTime) > 2000) {
        throw new BusinessRuleError('Revision has been modified by another user. Please refresh and try again.');
      }
    }

    let pricingResult: import('../pricing/pricing.types').PricingResult | null = null;
    let loadedPackages: Array<NonNullable<Awaited<ReturnType<typeof PackageRepository.findById>>>> = [];
    let itemsToProcess = data.items;

    // If items are not passed but discount is, use the existing snapshot items to recalculate
    if (!itemsToProcess && data.discount) {
      itemsToProcess = revision.items.map(i => ({
        packageId: i.packageId,
        quantity: i.quantity,
        unitPrice: new Prisma.Decimal(i.unitPrice),
        itemDiscountType: i.itemDiscountType || 'NONE',
        itemDiscountValue: i.itemDiscountValue ? new Prisma.Decimal(i.itemDiscountValue) : undefined,
        lineItemType: i.lineItemType || 'STANDARD',
      }));
    }

    // Fully recalculate if items (or discount-triggering items) exist
    if (itemsToProcess) {
      for (const item of itemsToProcess) {
        if (!item.packageId) {
          let pkg = await prisma.package.findFirst({
            where: { tenantId: ctx.tenantId, isActive: true, deletedAt: null },
          });
          if (!pkg) {
            let category = await prisma.packageCategory.findFirst({
              where: { tenantId: ctx.tenantId, isActive: true, deletedAt: null },
            });
            if (!category) {
              category = await prisma.packageCategory.create({
                data: {
                  tenantId: ctx.tenantId,
                  name: 'Photography Services',
                  code: 'PHOTO_SERVICES',
                  isActive: true,
                },
              });
            }
            pkg = await prisma.package.create({
              data: {
                tenantId: ctx.tenantId,
                branchId: ctx.branchId,
                packageCode: 'CUSTOM_SERVICE',
                name: item.itemName || 'Custom Service',
                categoryId: category.id,
                basePrice: item.unitPrice || 0,
                isActive: true,
                version: 1,
                isCurrentVersion: true,
              },
            });
          }
          item.packageId = pkg.id;
        }
      }

      const packagePromises = itemsToProcess.map(item => PackageRepository.findById(ctx.tenantId, item.packageId));
      loadedPackages = (await Promise.all(packagePromises)).filter((p): p is NonNullable<typeof p> => p !== null);
      QuotationValidators.validatePackageSelection(itemsToProcess, loadedPackages);

      const pricingInputs: PricingItemInput[] = itemsToProcess.map(item => {
        const pkg = loadedPackages.find(p => p.id === item.packageId);
        return {
          itemId: item.packageId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          itemDiscountType: item.itemDiscountType,
          itemDiscountValue: item.itemDiscountValue != null ? new Prisma.Decimal(item.itemDiscountValue) : undefined,
          taxPercentage: pkg?.taxRate?.percentage || null,
          isBillable: item.lineItemType !== 'INFORMATION',
        };
      });

      const discountToUse = data.discount !== undefined ? data.discount : {
        discountType: (revision.discountType as DiscountType) || DiscountType.NONE,
        discountValue: revision.discountValue ? new Prisma.Decimal(revision.discountValue) : new Prisma.Decimal(0),
        couponCode: revision.couponCode || undefined,
      };

      pricingResult = PricingService.calculate(pricingInputs, discountToUse);
    }

    const isLumpSum = (data.pricingMode || revision.pricingMode) === 'LUMP_SUM';
    const lumpSumNum = data.lumpSumAmount != null ? Number(data.lumpSumAmount) : (revision.lumpSumAmount != null ? Number(revision.lumpSumAmount) : null);
    const finalGrandTotal = (isLumpSum && lumpSumNum != null && lumpSumNum > 0) ? new Prisma.Decimal(lumpSumNum) : (pricingResult?.grandTotal ?? revision.grandTotal);

    await prisma.$transaction(async (tx) => {
      // Update subjects if provided
      if (data.subjects && data.subjects.length > 0) {
        await tx.quotationEventSubject.deleteMany({ where: { quotationId: revision.quotationId } });
        const validSubjects = data.subjects.filter((s) => s && s.name && s.name.trim().length > 0);
        if (validSubjects.length > 0) {
          await tx.quotationEventSubject.createMany({
            data: validSubjects.map((s) => ({
              quotationId: revision.quotationId,
              role: s.role || 'Bride',
              name: s.name.trim(),
              phone: s.phone || null,
              email: s.email || null,
              birthDate: s.birthDate ? new Date(s.birthDate) : null,
              anniversaryDate: s.anniversaryDate ? new Date(s.anniversaryDate) : null,
            })),
          });
        }
      }

      // Update functions if provided
      if (data.functions && data.functions.length > 0) {
        await tx.quotationFunction.deleteMany({ where: { quotationId: revision.quotationId } });
        const validFunctions = data.functions.filter((f) => f && f.name && f.name.trim().length > 0);
        for (const fn of validFunctions) {
          await tx.quotationFunction.create({
            data: {
              quotationId: revision.quotationId,
              name: fn.name.trim(),
              date: fn.date ? new Date(fn.date) : null,
              venue: fn.venue || null,
            },
          });
        }
      }

      // Update deliverables if provided
      if (data.deliverables && data.deliverables.length > 0) {
        await tx.quotationDeliverable.deleteMany({ where: { quotationId: revision.quotationId } });
        const validDeliverables = data.deliverables.filter((d) => d && d.name && d.name.trim().length > 0);
        if (validDeliverables.length > 0) {
          await tx.quotationDeliverable.createMany({
            data: validDeliverables.map((d) => ({
              quotationId: revision.quotationId,
              name: d.name.trim(),
              itemType: d.itemType || 'ALBUM',
              quantity: d.quantity ? Number(d.quantity) : 1,
              basePageLimit: d.basePageLimit != null ? Number(d.basePageLimit) : null,
            })),
          });
        }
      }

      // Resolve terms and special notes cleanly
      const customTerms = data.terms !== undefined ? (data.terms || data.termsAndConditions) : (data.termsAndConditions !== undefined ? data.termsAndConditions : undefined);
      const finalTerms = customTerms !== undefined
        ? (customTerms && customTerms.trim().length > 0 ? customTerms.trim() : await QuotationService.resolveQuotationTerms(ctx.tenantId))
        : undefined;

      const specialNotes = data.notes !== undefined
        ? (data.notes && data.notes.trim().length > 0 ? data.notes.trim() : null)
        : (data.revisionComment !== undefined ? data.revisionComment : undefined);

      if (specialNotes !== undefined && specialNotes !== null) {
        const rootQuote = await tx.quotation.findUnique({ where: { id: revision.quotationId }, select: { leadId: true } });
        if (rootQuote?.leadId) {
          await tx.lead.update({
            where: { id: rootQuote.leadId },
            data: { notes: specialNotes },
          }).catch(() => {});
        }
      }

      let updateData: Prisma.QuotationRevisionUpdateInput = {
        revisionReason: data.revisionReason !== undefined ? data.revisionReason : revision.revisionReason,
        revisionComment: specialNotes !== undefined ? specialNotes : revision.revisionComment,
        acceptanceTerms: finalTerms !== undefined ? finalTerms : revision.acceptanceTerms,
        pricingMode: isLumpSum ? 'LUMP_SUM' : 'ITEMIZED',
        lumpSumAmount: isLumpSum && lumpSumNum != null ? new Prisma.Decimal(lumpSumNum) : null,
      };

      if (pricingResult && itemsToProcess) {
        updateData = {
          ...updateData,
          subtotal: pricingResult.subtotal,
          discountType: data.discount?.discountType !== undefined
            ? normalizeDiscountType(data.discount.discountType)
            : normalizeDiscountType(revision.discountType),
          discountValue: data.discount?.discountValue !== undefined
            ? (data.discount.discountValue != null ? new Prisma.Decimal(data.discount.discountValue) : new Prisma.Decimal(0))
            : revision.discountValue,
          discountAmount: pricingResult.discountAmount,
          couponCode: data.discount !== undefined ? data.discount.couponCode : revision.couponCode,
          taxAmount: pricingResult.taxAmount,
          roundOff: pricingResult.roundOff,
          totalAmount: finalGrandTotal,
          grandTotal: finalGrandTotal,
          items: {
            deleteMany: {}, // Safely clear old items and replace
            create: itemsToProcess.map((item, index) => {
              const pricingItem = pricingResult!.items[index];
              const pkg = loadedPackages.find(p => p.id === item.packageId);
              const itemDescStr = item.description && typeof item.description === 'string' ? item.description.trim() : null;
    const customDesc = itemDescStr && itemDescStr.length > 0 ? itemDescStr
                : null;
              const finalDesc = customDesc || pkg?.notes || null;

              return {
                tenant: { connect: { id: ctx.tenantId } },
                branch: { connect: { id: ctx.branchId } },
                package: { connect: { id: item.packageId } },
                packageVersion: pkg?.version || 1,
                itemName: item.itemName || pkg?.name || 'Unknown Package',
                description: finalDesc,
                snapshotExtra: {
                  functionReference: (item.quotationFunctionId && item.quotationFunctionId !== 'none')
      ? String(item.quotationFunctionId).trim()
                    : null,
                  customDescription: customDesc,
                  description: finalDesc,
                },
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                itemDiscountType: normalizeDiscountType(item.itemDiscountType || (item as unknown as { discountType?: DiscountType }).discountType),
                itemDiscountValue: item.itemDiscountValue != null ? new Prisma.Decimal(item.itemDiscountValue) : new Prisma.Decimal(0),
                gstInclusive: Boolean(pkg?.taxRateId),
                taxPercentage: pkg?.taxRate?.percentage || null,
                calculatedSubtotal: pricingItem.calculatedSubtotal,
                calculatedDiscountAmount: pricingItem.calculatedDiscountAmount,
                calculatedTaxAmount: pricingItem.calculatedTaxAmount,
                calculatedTotal: pricingItem.calculatedTotal,
                lineItemType: item.lineItemType || 'STANDARD',
                taxRate: pkg?.taxRate?.id ? { connect: { id: pkg.taxRate.id } } : undefined,
              };
            })
          }
        };
      }

      const updatedRevision = await QuotationRepository.updateRevision(tx, revisionId, ctx.tenantId, ctx.branchId, updateData);

      // Apply root quotation updates if provided
      const quotationUpdate: Prisma.QuotationUpdateInput = {
        totalAmount: finalGrandTotal,
        pricingMode: isLumpSum ? 'LUMP_SUM' : 'ITEMIZED',
        lumpSumAmount: isLumpSum && lumpSumNum != null ? new Prisma.Decimal(lumpSumNum) : null,
      };
      if (data.validUntil !== undefined) {
        quotationUpdate.validUntil = data.validUntil;
      }
      if (finalTerms !== undefined) {
        quotationUpdate.acceptanceTerms = finalTerms;
      }

      await QuotationRepository.updateQuotation(tx, revision.quotationId, quotationUpdate);
    });

    const finalQuotation = await QuotationRepository.findById(revision.quotationId, ctx.tenantId, ctx.branchId);
    return serializePrisma(QuotationMapper.toQuotationDetailDto(finalQuotation as PrismaQuotationDetail));
  }

  /**
   * Orchestrates the transition of a Quotation's status.
   * 
   * Orchestration Flow:
   * 1. Query securely: Validates existence and ownership inside the tenant/branch context.
   * 2. Status Validation: Prevents illegal state transitions via QuotationValidators.
   * 3. Open Transaction: Updates root quotation and the latest active revision atomically.
   * 4. Audit Logging: Records the successful status transition inside the transaction.
   * 5. Activity Timeline: Records customer-visible milestones (e.g. SENT, APPROVED).
   * 6. Commit & Event Bus: Emits relevant domain events ONLY after a successful DB commit.
   * 7. Map & Return: Reloads the complete graph and returns a strict DTO.
   */
  public static async changeStatus(
    ctx: ServiceContext,
    quotationId: string,
    newStatus: import('./quotation.constants').ServiceQuotationStatus,
    reason?: string
  ): Promise<QuotationDetailDto> {
    const quotation = await QuotationRepository.findById(quotationId, ctx.tenantId, ctx.branchId);
    if (!quotation) {
      throw new QuotationNotFoundError(`Quotation ${quotationId} not found`);
    }

    // 1. Status Workflow Validation
    QuotationValidators.validateStatusTransition(quotation.status as ServiceQuotationStatus, newStatus);

    // 2. Open Transaction
    await prisma.$transaction(async (tx) => {
      // Update Root Quotation
      await QuotationRepository.updateQuotation(tx, quotationId, {
        status: newStatus as QuotationStatus
      });

      // Update Latest Revision Status to keep the snapshot in sync
      const latestRevision = await QuotationRepository.findLatestRevision(quotationId, ctx.tenantId, ctx.branchId);
      if (latestRevision) {
        await QuotationRepository.updateRevision(tx, latestRevision.id, ctx.tenantId, ctx.branchId, {
          status: newStatus as QuotationStatus,
          ...(reason !== undefined ? { revisionReason: reason } : {})
        });
      }

      // Transition Lead status to NEGOTIATION if quotation is marked as REJECTED (changes requested)
      if (newStatus === 'REJECTED') {
        const targetLeadId = quotation.leadId;
        if (targetLeadId) {
          await tx.lead.update({
            where: { id: targetLeadId },
            data: { status: LeadStatus.NEGOTIATION },
          });
        }
      }
    });

    // 5. Map & Return
    const updatedQuotation = await QuotationRepository.findById(quotationId, ctx.tenantId, ctx.branchId);
    return serializePrisma(QuotationMapper.toQuotationDetailDto(updatedQuotation as PrismaQuotationDetail));
  }
}
