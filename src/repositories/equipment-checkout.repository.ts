import { Prisma, EquipmentCheckout, Equipment } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export class EquipmentCheckoutRepository {
  /**
   * Create a new equipment checkout
   */
  static async create(data: Prisma.EquipmentCheckoutCreateInput): Promise<EquipmentCheckout> {
    return prisma.equipmentCheckout.create({
      data,
      include: {
        equipment: true,
      },
    });
  }

  /**
   * Find checkout by ID
   */
  static async findById(id: string): Promise<EquipmentCheckout | null> {
    return prisma.equipmentCheckout.findUnique({
      where: { id },
      include: {
        equipment: true,
      },
    });
  }

  /**
   * Find active checkouts for an equipment
   */
  static async findActiveByEquipmentId(equipmentId: string): Promise<EquipmentCheckout[]> {
    return prisma.equipmentCheckout.findMany({
      where: {
        equipmentId,
        returnedAt: null,
      },
      include: {
        equipment: true,
      },
    });
  }

  /**
   * Update equipment checkout
   */
  static async update(id: string, data: Prisma.EquipmentCheckoutUpdateInput): Promise<EquipmentCheckout> {
    return prisma.equipmentCheckout.update({
      where: { id },
      data,
      include: {
        equipment: true,
      },
    });
  }

  /**
   * Delete equipment checkout
   */
  static async delete(id: string): Promise<EquipmentCheckout> {
    return prisma.equipmentCheckout.delete({
      where: { id },
    });
  }

  /**
   * Mark equipment as returned
   */
  static async returnEquipment(id: string, returnedAt: Date = new Date()): Promise<EquipmentCheckout> {
    return prisma.equipmentCheckout.update({
      where: { id },
      data: {
        returnedAt,
      },
      include: {
        equipment: true,
      },
    });
  }
}
