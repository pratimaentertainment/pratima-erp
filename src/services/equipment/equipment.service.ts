import { EquipmentCheckoutRepository } from '@/repositories/equipment-checkout.repository';
import { ServiceContext } from '@/lib/application/utils/context';
import { CheckoutEquipmentDto } from './equipment.types';
import { EquipmentCheckout, Equipment } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export class EquipmentService {
  /**
   * Checkout equipment
   */
  static async checkoutEquipment(
    ctx: ServiceContext,
    data: CheckoutEquipmentDto
  ): Promise<EquipmentCheckout> {
    if (!ctx.branchId) {
      throw new Error('Branch context is required to checkout equipment');
    }

    // Verify equipment belongs to the same branch and is available
    const equipment = await prisma.equipment.findFirst({
      where: {
        id: data.equipmentId,
        branchId: ctx.branchId,
        ...(ctx.tenantId ? { tenantId: ctx.tenantId } : {}),
      },
    });

    if (!equipment) {
      throw new Error('Equipment not found in current branch');
    }

    if (equipment.status !== 'AVAILABLE') {
      throw new Error(`Equipment is currently ${equipment.status}`);
    }

    // Check for active checkout
    const activeCheckouts = await EquipmentCheckoutRepository.findActiveByEquipmentId(data.equipmentId);
    if (activeCheckouts.length > 0) {
      throw new Error('Equipment is already checked out');
    }

    // Transaction to create checkout and update equipment status
    return prisma.$transaction(async (tx) => {
      const checkout = await tx.equipmentCheckout.create({
        data: {
          equipment: { connect: { id: data.equipmentId } },
        },
        include: {
          equipment: true,
        },
      });

      await tx.equipment.update({
        where: { id: data.equipmentId },
        data: { status: 'IN_USE' },
      });

      return checkout;
    });
  }

  /**
   * Return equipment
   */
  static async returnEquipment(
    ctx: ServiceContext,
    id: string
  ): Promise<EquipmentCheckout> {
    if (!ctx.branchId) {
      throw new Error('Branch context is required to return equipment');
    }

    const checkout = await EquipmentCheckoutRepository.findById(id);
    if (!checkout) {
      throw new Error('Equipment checkout not found');
    }

    if (checkout.returnedAt) {
      throw new Error('Equipment is already returned');
    }

    // Transaction to mark returned and update equipment status
    return prisma.$transaction(async (tx) => {
      const updatedCheckout = await tx.equipmentCheckout.update({
        where: { id },
        data: { returnedAt: new Date() },
        include: { equipment: true },
      });

      // Reset equipment status
      await tx.equipment.update({
        where: { id: checkout.equipmentId },
        data: { status: 'AVAILABLE' },
      });

      return updatedCheckout;
    });
  }

  /**
   * Get equipment checkouts for an equipment or session
   */
  static async getShootEquipmentCheckouts(
    ctx: ServiceContext,
    equipmentIdOrTargetId: string
  ): Promise<EquipmentCheckout[]> {
    if (!ctx.branchId) {
      throw new Error('Branch context is required to get equipment checkouts');
    }

    return prisma.equipmentCheckout.findMany({
      where: {
        equipmentId: equipmentIdOrTargetId,
      },
      include: {
        equipment: true,
      },
      orderBy: {
        checkedOutAt: 'desc',
      },
    });
  }

  /**
   * Get all equipment for the current branch
   */
  static async getBranchEquipment(ctx: ServiceContext): Promise<Equipment[]> {
    if (!ctx.branchId) {
      throw new Error('Branch context is required to get equipment');
    }

    return prisma.equipment.findMany({
      where: {
        branchId: ctx.branchId,
        ...(ctx.tenantId ? { tenantId: ctx.tenantId } : {}),
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}
