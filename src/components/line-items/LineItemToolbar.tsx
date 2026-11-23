import * as React from 'react';

interface LineItemToolbarProps {
  title?: React.ReactNode;
  actions?: React.ReactNode;
}

export function LineItemToolbar({ title = "Line Items", actions }: LineItemToolbarProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-medium">{title}</h3>
      {actions && <div>{actions}</div>}
    </div>
  );
}
