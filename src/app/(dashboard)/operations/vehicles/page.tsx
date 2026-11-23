import * as React from 'react';
import { redirect } from 'next/navigation';
import { getActiveContext } from '@/lib/context';
import {
  getVehiclesAction,
  getVehicleStatsAction,
  getUpcomingVehicleDispatchesAction,
} from '@/actions/vehicle.actions';
import { VehicleFleetDashboard } from '@/components/features/vehicles/VehicleFleetDashboard';

export const dynamic = 'force-dynamic';

export default async function VehicleFleetPage() {
  const context = await getActiveContext();
  if (!context || !context.tenantId) {
    redirect('/login');
  }

  const [vehiclesRes, statsRes, dispatchesRes] = await Promise.all([
    getVehiclesAction(),
    getVehicleStatsAction(),
    getUpcomingVehicleDispatchesAction(),
  ]);

  const vehicles = vehiclesRes.success && vehiclesRes.data ? vehiclesRes.data : [];
  const stats = statsRes.success && statsRes.data ? statsRes.data : { total: 0, available: 0, inUse: 0, maintenance: 0 };
  const dispatches = dispatchesRes.success && dispatchesRes.data ? dispatchesRes.data : [];

  const branches = context.branches.map((b) => ({
    id: b.id,
    name: b.name,
    code: b.code || null,
  }));

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <VehicleFleetDashboard
        initialVehicles={vehicles}
        initialStats={stats}
        initialDispatches={dispatches}
        branches={branches}
        isAllBranches={context.isAllBranches}
        activeBranchName={context.activeBranch?.name || 'Active Branch'}
      />
    </div>
  );
}
