export const QUOTATION_ROUTES = {
  LIST: '/sales/quotations',
  CREATE: '/sales/quotations/create',
  DETAIL: (id: string) => `/sales/quotations/${id}`,
  EDIT: (id: string) => `/sales/quotations/${id}/edit`,
  PRINT: (id: string) => `/sales/quotations/${id}/print`,
} as const;
