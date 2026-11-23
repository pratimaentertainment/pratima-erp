'use client';

import * as React from 'react';
import * as PortalPrimitive from '@radix-ui/react-portal';

export interface SharedPortalProps extends PortalPrimitive.PortalProps {
  children: React.ReactNode;
}

/**
 * Enterprise standard Shared Portal Layer.
 * All overlays (Dialog, Drawer, Tooltip, Dropdown, Popover, Command Palette)
 * must route through this Portal to ensure consistent DOM injection and z-index contexts.
 */
export function SharedPortal({ children, ...props }: SharedPortalProps) {
  return (
    <PortalPrimitive.Root {...props}>
      {children}
    </PortalPrimitive.Root>
  );
}
