'use server';

import { revalidatePath } from 'next/cache';
import { CustomerService } from '@/services/customer.service';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerIdSchema,
} from '@/schemas/customer.schema';
import { ActionResponse } from './action-response';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

export async function createCustomer(data: unknown): Promise<ActionResponse<any>> {
  try {
    const validated = createCustomerSchema.parse(data);
    const record = await CustomerService.create({
      ...validated,
      email: validated.email || undefined,
      stateId: validated.stateId || undefined,
      cityId: validated.cityId || undefined,
    });
    revalidatePath('/dashboard/customers');
    revalidatePath('/customers');
    return { success: true, data: record, message: 'Customer created successfully' };
  } catch (error: any) {
    console.error('createCustomer error:', error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Validation failed',
        fieldErrors: error.flatten().fieldErrors,
      };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { success: false, error: `Database error (${error.code}): ${error.message}` };
    }
    return { success: false, error: error.message || 'Failed to create customer' };
  }
}

export async function updateCustomer(id: string, data: unknown): Promise<ActionResponse<any>> {
  try {
    const validId = customerIdSchema.parse(id);
    const validated = updateCustomerSchema.parse(data);
    const record = await CustomerService.update(validId, {
      ...validated,
      email: validated.email || undefined,
      stateId: validated.stateId || undefined,
      cityId: validated.cityId || undefined,
    });
    revalidatePath('/dashboard/customers');
    revalidatePath('/customers');
    return { success: true, data: record, message: 'Customer updated successfully' };
  } catch (error: any) {
    console.error('updateCustomer error:', error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Validation failed',
        fieldErrors: error.flatten().fieldErrors,
      };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { success: false, error: `Database error (${error.code}): ${error.message}` };
    }
    return { success: false, error: error.message || 'Failed to update customer' };
  }
}

export async function deleteCustomer(id: string): Promise<ActionResponse<void>> {
  try {
    const validId = customerIdSchema.parse(id);
    await CustomerService.softDelete(validId);
    revalidatePath('/dashboard/customers');
    revalidatePath('/customers');
    return { success: true, data: undefined, message: 'Customer deleted successfully' };
  } catch (error: any) {
    console.error('deleteCustomer error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || 'Validation failed' };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { success: false, error: `Database error (${error.code}): ${error.message}` };
    }
    return { success: false, error: error.message || 'Failed to delete customer' };
  }
}
