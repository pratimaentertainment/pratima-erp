import * as React from 'react';
import { cn } from '@/lib/utils';

interface ReportSignatureProps {
  signatures: { id: string; label: string; date?: string; signedBy?: string }[];
  className?: string;
}

export function ReportSignature({ signatures, className }: ReportSignatureProps) {
  if (!signatures || signatures.length === 0) return null;

  return (
    <div className={cn("grid gap-8 avoid-break-inside mt-12", `grid-cols-${Math.min(signatures.length, 4)}`, className)}>
      {signatures.map(sig => (
        <div key={sig.id} className="flex flex-col items-center text-center">
          <div className="h-20 w-48 border-b-2 border-dashed border-gray-300 mb-2 flex items-end justify-center pb-2">
            {sig.signedBy && <span className="font-handwriting text-2xl text-blue-800">{sig.signedBy}</span>}
          </div>
          <p className="font-semibold text-sm text-gray-800">{sig.label}</p>
          {sig.date && <p className="text-xs text-gray-500 mt-1">Date: {sig.date}</p>}
        </div>
      ))}
    </div>
  );
}
