import * as React from 'react';
import { cn } from '@/lib/utils';
import type { SearchResultItemConfig } from './types';
import { FileText, User, Building, Folder, Settings, Search as SearchIcon } from 'lucide-react';

export function getCategoryIcon(category: string, className?: string) {
  const props = { className: cn("h-4 w-4", className) };
  switch (category) {
    case 'customers': return <Building {...props} />;
    case 'users': return <User {...props} />;
    case 'projects': return <Folder {...props} />;
    case 'quotations':
    case 'invoices':
    case 'documents': return <FileText {...props} />;
    case 'settings': return <Settings {...props} />;
    default: return <SearchIcon {...props} />;
  }
}

export function SearchResultItem({ item, active, onClick, className }: { item: SearchResultItemConfig, active?: boolean, onClick?: (item: SearchResultItemConfig) => void, className?: string }) {
  return (
    <div 
      onClick={() => onClick?.(item)}
      className={cn(
        "flex items-center gap-3 px-3 py-2 cursor-pointer text-sm rounded-md transition-colors",
        active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
        className
      )}
      role="option"
      aria-selected={active}
    >
      <div className="flex items-center justify-center h-8 w-8 rounded bg-muted text-muted-foreground shrink-0">
        {item.icon || getCategoryIcon(item.category)}
      </div>
      
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium truncate">{item.title}</span>
          {item.badges && item.badges.length > 0 && (
            <div className="flex gap-1 shrink-0">
              {item.badges.map((b, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium">{b.label}</span>
              ))}
            </div>
          )}
        </div>
        {item.subtitle && <span className="text-xs text-muted-foreground truncate">{item.subtitle}</span>}
      </div>
    </div>
  );
}
