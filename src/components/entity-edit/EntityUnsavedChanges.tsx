'use client';

import * as React from 'react';

// Normally this would hook into the router or next/navigation to block navigation.
// For now it is a conceptual shell indicating unsaved changes.
export function EntityUnsavedChanges({ isDirty }: { isDirty: boolean }) {
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return null;
}
