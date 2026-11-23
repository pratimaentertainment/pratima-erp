import * as React from 'react';
import { cn } from '@/lib/utils';

interface EntitySectionProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function EntitySection({ title, description, action, children, className }: EntitySectionProps) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      {(title || description || action) && (
        <div className="flex items-end justify-between border-b pb-4">
          <div className="space-y-1">
            {title && <h3 className="text-lg font-medium tracking-tight">{title}</h3>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div>
        {children}
      </div>
    </section>
  );
}
