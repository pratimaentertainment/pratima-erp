export type PageMode = 'view' | 'create' | 'edit';

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export type SortDirection = 'asc' | 'desc' | null;

export interface TableColumn<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (info: any) => React.ReactNode;
  enableSorting?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface ActionMenuItem {
  label: string;
  icon?: React.ElementType;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

export interface NavItem {
  name: string;
  href: string;
  icon?: React.ElementType;
  children?: NavItem[];
}
