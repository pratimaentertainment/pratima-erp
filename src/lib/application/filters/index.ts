export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'startsWith' | 'endsWith';

export interface FilterParam {
  field: string;
  operator: FilterOperator;
  value: any;
}

export class FilterBuilder {
  static build(filters: FilterParam[]): Record<string, any> {
    const where: Record<string, any> = {};
    
    for (const filter of filters) {
      if (filter.operator === 'eq') {
        where[filter.field] = filter.value;
      } else {
        where[filter.field] = {
          ...where[filter.field],
          [filter.operator]: filter.value
        };
      }
    }
    
    return where;
  }
}
