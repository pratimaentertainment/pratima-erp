import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, X, Megaphone } from 'lucide-react';
import { IconButton } from '@/components/buttons/IconButton';

interface AnnouncementBannerProps {
  title: string;
  message?: string;
  intent?: 'info' | 'warning' | 'danger' | 'success';
  onDismiss?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export function AnnouncementBanner({ title, message, intent = 'info', onDismiss, action, className }: AnnouncementBannerProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <div className={cn(
      "relative flex items-center justify-between p-3 pl-4 border-l-4 text-sm rounded-r-md shadow-sm",
      intent === 'info' && "bg-blue-50/50 border-blue-500 text-blue-900",
      intent === 'warning' && "bg-yellow-50/50 border-yellow-500 text-yellow-900",
      intent === 'danger' && "bg-red-50/50 border-red-500 text-red-900",
      intent === 'success' && "bg-green-50/50 border-green-500 text-green-900",
      className
    )}>
      <div className="flex flex-col flex-1 pr-4">
        <div className="flex items-center gap-2 font-semibold">
          {intent === 'warning' || intent === 'danger' ? <AlertCircle className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
          {title}
        </div>
        {message && <p className="mt-1 text-xs opacity-90">{message}</p>}
      </div>
      <div className="flex items-center gap-4 shrink-0">
        {action}
        {onDismiss && (
          <IconButton 
            icon={<X className="h-4 w-4" />} 
            onClick={handleDismiss} 
            variant="ghost" 
            size="sm" 
            className="hover:bg-black/5"
            aria-label="Dismiss announcement"
          />
        )}
      </div>
    </div>
  );
}
