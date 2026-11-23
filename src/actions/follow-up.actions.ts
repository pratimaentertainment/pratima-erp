'use server';

import { FollowUpService } from '@/services/follow-up.service';
import { revalidatePath } from 'next/cache';

export async function createFollowUp(data: any) {
  try {
    const followUp = await FollowUpService.create(data);
    revalidatePath(`/leads/${data.leadId}`);
    return { success: true, data: followUp };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create follow-up' };
  }
}

export async function updateFollowUp(id: string, data: any) {
  try {
    const followUp = await FollowUpService.update(id, data);
    revalidatePath(`/leads/${followUp.leadId}`);
    return { success: true, data: followUp };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update follow-up' };
  }
}

export async function deleteFollowUp(id: string) {
  try {
    await FollowUpService.softDelete(id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete follow-up' };
  }
}

export async function getLeadFollowUps(leadId: string) {
  try {
    const followUps = await FollowUpService.findByLeadId(leadId);
    return { success: true, data: followUps };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch follow-ups' };
  }
}

export async function markFollowUpCompleted(followUpId: string, outcome?: any, notes?: string) {
  try {
    const followUp = await FollowUpService.markCompleted(followUpId, outcome, notes);
    if (followUp?.leadId) {
      revalidatePath(`/leads/${followUp.leadId}`);
    }
    revalidatePath('/leads');
    revalidatePath('/dashboard');
    return { success: true, data: followUp };
  } catch (error: any) {
    console.error('[MARK_FOLLOW_UP_COMPLETED_ERROR]', error);
    return { success: false, error: error.message || 'Failed to mark follow-up as completed' };
  }
}

export async function getPendingFollowUps(filters?: any) {
  try {
    const followUps = await FollowUpService.getPendingFollowUps(filters);
    return { success: true, data: followUps };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch pending follow-ups' };
  }
}
