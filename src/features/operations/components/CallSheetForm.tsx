'use client';

import React, { useTransition } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { callSheetSchema } from '@/validations/callsheet.schema';
import { saveCallSheetAction } from '@/actions/callsheet.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type CallSheetFormValues = z.infer<typeof callSheetSchema>;

interface CallSheetFormProps {
  shootId: string;
  initialData?: Partial<CallSheetFormValues>;
}

export function CallSheetForm({ shootId, initialData }: CallSheetFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<CallSheetFormValues>({
    resolver: zodResolver(callSheetSchema),
    defaultValues: {
      shootId: shootId,
      clientInstructions: initialData?.clientInstructions || '',
      shotList: initialData?.shotList || [],
      moodboardLinks: initialData?.moodboardLinks || [],
    },
  });

  const shotList = form.watch('shotList');
  const moodboardLinks = form.watch('moodboardLinks');

  const addPrimitiveItem = (field: 'shotList' | 'moodboardLinks') => {
    const current = form.getValues(field);
    form.setValue(field, [...current, '']);
  };

  const updatePrimitiveItem = (field: 'shotList' | 'moodboardLinks', index: number, value: string) => {
    const next = [...form.getValues(field)];
    next[index] = value;
    form.setValue(field, next);
  };

  const removePrimitiveItem = (field: 'shotList' | 'moodboardLinks', index: number) => {
    const next = [...form.getValues(field)];
    next.splice(index, 1);
    form.setValue(field, next);
  };

  const onSubmit = (data: CallSheetFormValues) => {
    startTransition(async () => {
      try {
        const response = await saveCallSheetAction(data);
        if (response.success) {
          toast.success(response.message || 'Call sheet saved successfully');
        } else {
          toast.error(response.error || 'Failed to save call sheet');
        }
      } catch (err) {
        toast.error('An unexpected error occurred.');
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        
        <FormField
          control={form.control}
          name="clientInstructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client Instructions</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter specific instructions from the client..." 
                  className="resize-none" 
                  {...field} 
                  value={field.value || ''} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div>
            <FormLabel>Shot List</FormLabel>
            <p className="text-sm text-muted-foreground mb-2">Key moments required by the client.</p>
          </div>
          {shotList.map((shot, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input 
                value={shot}
                onChange={(e) => updatePrimitiveItem('shotList', index, e.target.value)}
                placeholder="E.g. Drone shot of the venue" 
                className="flex-1"
              />
              <Button type="button" variant="destructive" size="icon" onClick={() => removePrimitiveItem('shotList', index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addPrimitiveItem('shotList')}>
            <Plus className="mr-2 h-4 w-4" /> Add Shot
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <FormLabel>Moodboard Links</FormLabel>
            <p className="text-sm text-muted-foreground mb-2">URLs for inspiration or references.</p>
          </div>
          {moodboardLinks.map((link, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input 
                value={link}
                onChange={(e) => updatePrimitiveItem('moodboardLinks', index, e.target.value)}
                placeholder="https://pinterest.com/..." 
                className="flex-1"
              />
              <Button type="button" variant="destructive" size="icon" onClick={() => removePrimitiveItem('moodboardLinks', index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addPrimitiveItem('moodboardLinks')}>
            <Plus className="mr-2 h-4 w-4" /> Add Link
          </Button>
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Call Sheet
        </Button>
      </form>
    </Form>
  );
}
