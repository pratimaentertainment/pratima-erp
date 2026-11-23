export const QUOTATION_PERMISSIONS = {
  VIEW: 'quotation.view',
  CREATE: 'quotation.create',
  UPDATE: 'quotation.update',
  DELETE: 'quotation.delete',
  CREATE_REVISION: 'quotation.create_revision',
  CHANGE_STATUS: 'quotation.change_status',
  PRINT: 'quotation.print',
  EXPORT: 'quotation.export',
  EMAIL: 'quotation.email',
} as const;

export type QuotationPermission = typeof QUOTATION_PERMISSIONS[keyof typeof QUOTATION_PERMISSIONS];
