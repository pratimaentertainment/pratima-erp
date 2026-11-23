export type SortDirection = 'asc' | 'desc';

export interface SortParam {
  field: string;
  direction: SortDirection;
}

export function parseSorting(sortString?: string): SortParam[] {
  if (!sortString) return [];
  
  return sortString.split(',').map(s => {
    const direction: SortDirection = s.startsWith('-') ? 'desc' : 'asc';
    const field = s.startsWith('-') ? s.substring(1) : s;
    return { field, direction };
  });
}
