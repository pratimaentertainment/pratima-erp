'use client';

import * as React from 'react';
import { Loader2, AlertTriangle, FileText, Search } from 'lucide-react';

export function DataGridLoadingState({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="h-48 text-center align-middle">
        <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading data...</p>
        </div>
      </td>
    </tr>
  );
}

export function DataGridErrorState({ colSpan, error }: { colSpan: number; error?: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="h-48 text-center align-middle">
        <div className="flex flex-col items-center justify-center text-danger space-y-2">
          <AlertTriangle className="h-8 w-8" />
          <p className="text-sm font-medium">{error || "An error occurred while loading data."}</p>
        </div>
      </td>
    </tr>
  );
}

export function DataGridEmptyState({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="h-48 text-center align-middle">
        <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
          <FileText className="h-8 w-8 opacity-20" />
          <p className="text-sm font-medium">No records found.</p>
        </div>
      </td>
    </tr>
  );
}

export function DataGridNoResultsState({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="h-48 text-center align-middle">
        <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
          <Search className="h-8 w-8 opacity-20" />
          <p className="text-sm font-medium">No results match your filters.</p>
        </div>
      </td>
    </tr>
  );
}
