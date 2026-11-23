import * as React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, XCircle } from 'lucide-react';
import type { WorkflowProgressStep } from './types';

interface WorkflowProgressProps {
  steps: WorkflowProgressStep[];
  className?: string;
}

export function WorkflowProgress({ steps, className }: WorkflowProgressProps) {
  return (
    <div className={cn("flex items-center w-full overflow-x-auto pb-4 scrollbar-hide", className)}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        
        let Icon = Circle;
        let iconClass = "text-muted-foreground";
        let bgClass = "bg-muted";
        let textClass = "text-muted-foreground";

        if (step.status === 'completed') {
          Icon = CheckCircle2;
          iconClass = "text-primary";
          bgClass = "bg-primary";
          textClass = "text-foreground";
        } else if (step.status === 'active') {
          iconClass = "text-primary border-2 border-primary rounded-full";
          bgClass = "bg-border";
          textClass = "text-primary font-semibold";
        } else if (step.status === 'rejected') {
          Icon = XCircle;
          iconClass = "text-destructive";
          bgClass = "bg-border";
          textClass = "text-destructive";
        }

        return (
          <div key={step.id} className="flex items-center shrink-0">
            <div className="flex flex-col items-center gap-2 relative">
              <div className="h-6 w-6 flex items-center justify-center bg-background relative z-10">
                <Icon className={cn("h-5 w-5", iconClass)} />
              </div>
              <span className={cn("text-xs whitespace-nowrap absolute top-8", textClass)}>
                {step.label}
              </span>
            </div>
            
            {!isLast && (
              <div className={cn("h-[2px] w-12 sm:w-24 md:w-32 mx-2 mb-6", bgClass)} />
            )}
          </div>
        );
      })}
    </div>
  );
}
