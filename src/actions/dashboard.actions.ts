'use server';

import { DashboardService } from '@/services/dashboard.service';
import { serializePrisma } from '@/lib/serialize';

/**
 * Server action to fetch role-partitioned dashboard metrics.
 * Multi-tenant isolation is strictly enforced via authenticated session tokens (no client override).
 */
export async function getOwnerDashboardMetricsAction() {
  try {
    const session = await DashboardService.validateSession();
    const metrics = await DashboardService.getOwnerDashboardMetrics(session);
    return { success: true, data: serializePrisma(metrics) };
  } catch (error: any) {
    console.error('[DashboardActions] Error fetching dashboard metrics:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch executive dashboard metrics',
    };
  }
}

/**
 * Server action to fetch lead conversion and follow-up metrics.
 */
export async function getDashboardMetrics() {
  try {
    const session = await DashboardService.validateSession();
    const metrics = await DashboardService.getMetrics({ tenantId: session.tenantId });
    return { success: true, data: serializePrisma(metrics) };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch follow-up metrics',
    };
  }
}
