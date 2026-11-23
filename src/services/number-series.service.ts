import { prisma } from '@/lib/prisma';

export class NumberSeriesService {
  /**
   * Generates the next sequential number for a given entity type.
   * Runs in a transaction to prevent race conditions.
   * Returns a formatted code like 'CUS-001'
   */
  static async getNextNumber(
    tx: any, 
    tenantId: string, 
    entityType: 'CUSTOMER' | 'INQUIRY' | 'LEAD' | 'PACKAGE' | 'INVOICE' | 'PAYMENT' | 'BOOKING'
  ) {
    // Determine default prefix based on entity type
    let defaultPrefix = '';
    switch (entityType) {
      case 'CUSTOMER': defaultPrefix = 'CUS'; break;
      case 'INQUIRY': defaultPrefix = 'INQ'; break;
      case 'LEAD': defaultPrefix = 'LED'; break;
      case 'PACKAGE': defaultPrefix = 'PKG'; break;
      case 'INVOICE': defaultPrefix = 'INV'; break;
      case 'PAYMENT': defaultPrefix = 'REC'; break;
      case 'BOOKING': defaultPrefix = 'BKG'; break;
    }

    // Upsert the series counter
    const series = await tx.numberSeries.upsert({
      where: {
        tenantId_entityType: {
          tenantId,
          entityType,
        }
      },
      update: {
        nextNumber: {
          increment: 1
        }
      },
      create: {
        tenantId,
        entityType,
        prefix: defaultPrefix,
        nextNumber: 2 // Created as 1, so next will be 2
      }
    });

    // Determine the actual number to use for THIS call
    // If we just created it, the current number is 1.
    // If we updated it, the current number is series.nextNumber - 1.
    const currentNumber = series.nextNumber - 1;
    
    // Format to 4 digits, e.g. 0001
    const padded = currentNumber.toString().padStart(4, '0');
    return `${series.prefix}-${padded}`;
  }
}
