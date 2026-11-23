export class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string = 'INTERNAL_ERROR',
    public status: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class PermissionError extends ApplicationError {
  constructor(message: string = 'Permission denied', details?: any) {
    super(message, 'FORBIDDEN', 403, details);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT', 409, details);
  }
}

export class BusinessRuleError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(message, 'BUSINESS_RULE_VIOLATION', 422, details);
  }
}
