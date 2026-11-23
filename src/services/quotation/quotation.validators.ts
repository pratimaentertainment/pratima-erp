import { Prisma } from '@prisma/client';
import { 
  QUOTATION_STATUS_TRANSITIONS, 
  IMMUTABLE_REVISION_STATUSES, 
  ServiceQuotationStatus 
} from './quotation.constants';
import { 
  RevisionImmutableError, 
  InvalidStateTransitionError, 
  PackageInactiveError, 
  LeadIneligibleError,
  QuotationExpiredError,
  InvalidDiscountError,
  BusinessRuleError
} from './quotation.errors';
import { QuotationItemInput, QuotationDiscountInput } from './quotation.types';

/**
 * Pure Business Rule Validation Module for Quotations.
 * Zero database access, side effects, or third-party validation schemas (like Zod).
 * Throws strict domain errors (subclasses of BusinessRuleError).
 */
export class QuotationValidators {
  
  /**
   * Purpose: Validates if a Lead is eligible to receive a new Quotation.
   * Inputs: Partial lead object with basic metadata.
   * Business Rules: Lead must not be deleted or assigned to another tenant. (Tenant boundary is implicitly checked if loaded securely, but we check explicitly for deleted status).
   * Possible Errors: LeadIneligibleError
   */
  public static validateLeadEligibility(lead: { id: string; deletedAt?: Date | null; status?: string }): void {
    if (lead.deletedAt) {
      throw new LeadIneligibleError(lead.id, 'Lead has been deleted.');
    }
    if (lead.status === 'LOST') {
      throw new LeadIneligibleError(lead.id, 'Lead is marked as lost and cannot receive new quotations.');
    }
  }

  /**
   * Purpose: Validates if a Quotation Revision can be updated.
   * Inputs: Current status of the revision.
   * Business Rules: Only revisions in 'DRAFT' state can be modified.
   * Possible Errors: RevisionImmutableError
   */
  public static validateRevisionEditable(revisionId: string, currentStatus: ServiceQuotationStatus): void {
    if (IMMUTABLE_REVISION_STATUSES.includes(currentStatus)) {
      throw new RevisionImmutableError(revisionId);
    }
  }

  /**
   * Purpose: Validates state machine transitions.
   * Inputs: Current status, proposed next status.
   * Business Rules: Transition must exist in QUOTATION_STATUS_TRANSITIONS graph.
   * Possible Errors: InvalidStateTransitionError
   */
  public static validateStatusTransition(currentStatus: ServiceQuotationStatus, nextStatus: ServiceQuotationStatus): void {
    const allowedNextStates = QUOTATION_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedNextStates.includes(nextStatus)) {
      throw new InvalidStateTransitionError(currentStatus, nextStatus);
    }
  }

  /**
   * Purpose: Validates that selected packages exist and are active.
   * Inputs: User requested items, database loaded active packages.
   * Business Rules: Every requested packageId must exist in the activePackages list.
   * Possible Errors: PackageInactiveError
   */
  public static validatePackageSelection(
    requestedItems: QuotationItemInput[], 
    activePackages: Array<{ id: string; isActive: boolean; deletedAt: Date | null }>
  ): void {
    const activePackageIds = new Set(
      activePackages.filter(p => p.isActive && !p.deletedAt).map(p => p.id)
    );

    for (const item of requestedItems) {
      if (!activePackageIds.has(item.packageId)) {
        throw new PackageInactiveError(item.packageId);
      }
    }
  }

  /**
   * Purpose: Validates logic for global quotation discounts.
   * Inputs: Proposed discount, current taxable subtotal.
   * Business Rules: Percentage discounts must be 0-100. Fixed discounts cannot exceed subtotal.
   * Possible Errors: InvalidDiscountError
   */
  public static validateQuotationDiscount(discount: QuotationDiscountInput, subtotal: Prisma.Decimal): void {
    if (discount.discountType === 'NONE') return;

    const discountVal = discount.discountValue instanceof Prisma.Decimal
      ? discount.discountValue
      : new Prisma.Decimal(discount.discountValue || 0);

    if (discountVal.lessThan(0)) {
      throw new InvalidDiscountError('Discount value cannot be negative.');
    }

    if (discount.discountType === 'PERCENTAGE' && discountVal.greaterThan(100)) {
      throw new InvalidDiscountError('Percentage discount cannot exceed 100%.');
    }

    if ((discount.discountType === 'FIXED' || (discount.discountType as any) === 'FIXED_AMOUNT') && discountVal.greaterThan(subtotal)) {
      throw new InvalidDiscountError('Fixed discount cannot exceed the quotation subtotal.');
    }
  }

  /**
   * Purpose: Validates whether a new revision can be created for a quotation.
   * Inputs: Root quotation status.
   * Business Rules: Cannot revise a quotation that is already CONVERTED or EXPIRED.
   * Possible Errors: BusinessRuleError (or specific transition error)
   */
  public static validateRevisionCreation(quotationId: string, currentStatus: ServiceQuotationStatus): void {
    if (currentStatus === 'CONVERTED') {
      throw new BusinessRuleError(`Quotation ${quotationId} is already converted to a booking/project and cannot be revised.`);
    }
    if (currentStatus === 'EXPIRED') {
      throw new QuotationExpiredError(quotationId);
    }
  }

  /**
   * Purpose: Validates if a quotation is still valid based on its expiry date.
   * Inputs: Quotation ID, validUntil date.
   * Business Rules: If validUntil is set and is in the past, it is expired.
   * Possible Errors: QuotationExpiredError
   */
  public static validateQuotationExpiry(quotationId: string, validUntil?: Date | null): void {
    if (validUntil && validUntil.getTime() < Date.now()) {
      throw new QuotationExpiredError(quotationId);
    }
  }
}
