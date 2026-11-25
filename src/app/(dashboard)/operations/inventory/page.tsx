import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { serializePrisma } from '@/lib/serialize';
import { InventoryClient } from './inventory-client';

export const metadata: Metadata = {
  title: 'Warehouse & Equipment Workbench | FRAMIQ',
  description:
    'Enterprise asset inventory management, QR barcode dispatch, digital accessory checklists, and maintenance tracking.',
};

export default async function OperationsInventoryPage() {
  const session = await auth();
  const user = session?.user as any;

  if (!user?.tenantId) {
    redirect('/login');
  }

  const tenantId = user.tenantId as string;

  // 1. Fetch Tenant details for inventory configuration
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      tradeName: true,
      currency: true,
      isAdvancedInventoryEnabled: true,
    },
  });

  if (!tenant) {
    redirect('/login');
  }

  // 2. Fetch all equipment items with maintenance and active allocations
  const equipments = await prisma.equipment.findMany({
    where: { tenantId },
    include: {
      branch: { select: { id: true, name: true } },
      maintenances: {
        orderBy: { sentDate: 'desc' },
        take: 3,
      },
      shootAllocations: {
        where: {
          status: { in: ['ALLOCATED', 'CHECKED_OUT', 'IN_FIELD'] },
        },
        include: {
          eventBooking: {
            select: { id: true, title: true, bookingNumber: true, startDate: true },
          },
          assignedTo: {
            select: { id: true, name: true, phone: true },
          },
        },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 3. Fetch active shoot allocations eligible for dispatch/checkin
  const activeAllocations = await prisma.shootGearAllocation.findMany({
    where: {
      tenantId,
      status: { in: ['ALLOCATED', 'CHECKED_OUT', 'IN_FIELD'] },
    },
    include: {
      equipment: true,
      assignedTo: {
        select: { id: true, name: true, phone: true, email: true },
      },
      eventBooking: {
        select: { id: true, title: true, bookingNumber: true, startDate: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 4. Fetch ongoing & recent maintenance records
  const maintenanceRecords = await prisma.equipmentMaintenance.findMany({
    where: { tenantId },
    include: {
      equipment: {
        select: { id: true, name: true, assetTag: true, serialNumber: true },
      },
    },
    orderBy: { sentDate: 'desc' },
    take: 20,
  });

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 max-w-7xl">
      <InventoryClient
        initialEquipments={serializePrisma(equipments) as any}
        initialTenant={serializePrisma(tenant) as any}
        initialActiveAllocations={serializePrisma(activeAllocations) as any}
        initialMaintenanceRecords={serializePrisma(maintenanceRecords) as any}
      />
    </div>
  );
}
