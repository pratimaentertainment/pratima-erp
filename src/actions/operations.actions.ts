'use server';

import { buildContextAndAuthorize } from '@/lib/application/utils/context';
import { PERMISSIONS } from '@/constants/permissions.constants';
import { OperationsMetricsService } from '@/services/operations/operations-metrics.service';
import { ActionResponse } from '@/actions/action-response';

export async function getOperationsMetricsAction(): Promise<ActionResponse<any>> {
  try {
    const ctx = await buildContextAndAuthorize(PERMISSIONS.PROJECTS.VIEW);
    
    const metrics = await OperationsMetricsService.getDashboardMetrics(ctx);
    
    return { success: true, data: metrics };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch operations metrics' };
  }
}
