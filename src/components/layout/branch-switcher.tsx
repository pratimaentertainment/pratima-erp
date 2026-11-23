'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { switchActiveBranchAction } from '@/actions/branch.actions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function BranchSwitcher({ context }: { context: any }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  if (!context || !context.userBranches || context.userBranches.length === 0) {
    return null; // Don't show if user has no branches assigned
  }

  const { activeBranch, userBranches } = context;

  const handleSelect = async (branchId: string) => {
    setOpen(false);
    if (branchId === activeBranch?.id) return;
    
    const result = await switchActiveBranchAction(branchId);
    if (result.success) {
      toast.success('Switched branch context');
      router.refresh();
    } else {
      toast.error('Failed to switch branch');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex w-[250px] justify-between items-center rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        role="combobox"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 truncate">
          <Building className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {activeBranch ? activeBranch.name : 'Select branch...'}
          </span>
        </div>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="Search branch..." />
          <CommandList>
            <CommandEmpty>No branch found.</CommandEmpty>
            <CommandGroup>
              {userBranches.map((ub: any) => (
                <CommandItem
                  key={ub.branch.id}
                  value={ub.branch.name}
                  onSelect={() => handleSelect(ub.branch.id)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      activeBranch?.id === ub.branch.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{ub.branch.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {ub.branch.code || 'No Code'}
                      {ub.branch.isHeadOffice ? ' • HO' : ''}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
