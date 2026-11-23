import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        success: 'border-transparent bg-success/15 text-success hover:bg-success/25',
        warning: 'border-transparent bg-warning/15 text-warning hover:bg-warning/25',
        danger: 'border-transparent bg-danger/15 text-danger hover:bg-danger/25',
        info: 'border-transparent bg-info/15 text-info hover:bg-info/25',
        neutral: 'border-border bg-muted text-muted-foreground hover:bg-muted/80',
      },
      size: {
        sm: 'text-[10px] px-1.5 py-0',
        md: 'text-xs px-2.5 py-0.5',
        lg: 'text-sm px-3 py-1',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'md',
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

function Badge({ className, variant, size, icon, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {icon && <span className="mr-1 -ml-0.5 opacity-80">{icon}</span>}
      {children}
    </div>
  );
}
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
