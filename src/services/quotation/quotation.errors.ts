export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessRuleError';
  }
}

export class QuotationNotFoundError extends BusinessRuleError {
  constructor(quotationId: string) {
    super(`Quotation with ID ${quotationId} not found or access denied.`);
    this.name = 'QuotationNotFoundError';
  }
}

export class RevisionImmutableError extends BusinessRuleError {
  constructor(revisionId: string) {
    super(`Revision with ID ${revisionId} is no longer a draft and cannot be modified.`);
    this.name = 'RevisionImmutableError';
  }
}

export class InvalidStateTransitionError extends BusinessRuleError {
  constructor(currentStatus: string, nextStatus: string) {
    super(`Cannot transition quotation from ${currentStatus} to ${nextStatus}.`);
    this.name = 'InvalidStateTransitionError';
  }
}

export class PackageInactiveError extends BusinessRuleError {
  constructor(packageId: string) {
    super(`Package with ID ${packageId} is inactive or deleted.`);
    this.name = 'PackageInactiveError';
  }
}

export class LeadIneligibleError extends BusinessRuleError {
  constructor(leadId: string, reason: string) {
    super(`Lead with ID ${leadId} is ineligible for quotation: ${reason}`);
    this.name = 'LeadIneligibleError';
  }
}

export class QuotationExpiredError extends BusinessRuleError {
  constructor(quotationId: string) {
    super(`Quotation with ID ${quotationId} has expired.`);
    this.name = 'QuotationExpiredError';
  }
}

export class InvalidDiscountError extends BusinessRuleError {
  constructor(reason: string) {
    super(`Invalid discount applied: ${reason}`);
    this.name = 'InvalidDiscountError';
  }
}
