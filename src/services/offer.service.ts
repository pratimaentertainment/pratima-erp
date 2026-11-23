import { prisma } from '@/lib/prisma';
import { Prisma, DiscountType } from '@prisma/client';
import { formatDate } from '@/lib/date';

export interface CreatePromotionalOfferInput {
  title: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  validUntil: Date | string;
  isActive?: boolean;
}

export interface BroadcastRecipient {
  customerId: string;
  customerName: string;
  phone: string;
  directWhatsAppUrl: string;
  status: 'PENDING' | 'DISPATCHED' | 'FAILED';
}

export class OfferService {
  /**
   * Create a new Promotional Offer for a tenant
   */
  static async createPromotionalOffer(tenantId: string, data: CreatePromotionalOfferInput) {
    if (!data.title || data.title.trim() === '') {
      throw new Error('Offer title is required');
    }

    if (data.discountValue == null || isNaN(Number(data.discountValue)) || Number(data.discountValue) <= 0) {
      throw new Error('Valid discount value is required');
    }

    const validUntil = new Date(data.validUntil);
    if (isNaN(validUntil.getTime())) {
      throw new Error('Valid expiration date is required');
    }

    return prisma.promotionalOffer.create({
      data: {
        tenantId,
        title: data.title.trim(),
        description: data.description ? data.description.trim() : null,
        discountType: data.discountType,
        discountValue: new Prisma.Decimal(data.discountValue),
        validUntil,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      },
    });
  }

  /**
   * Retrieve all promotional offers for a tenant
   */
  static async getPromotionalOffers(tenantId: string, options?: { isActive?: boolean }) {
    const where: Prisma.PromotionalOfferWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    return prisma.promotionalOffer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single offer by ID
   */
  static async getPromotionalOfferById(tenantId: string, offerId: string) {
    return prisma.promotionalOffer.findFirst({
      where: { id: offerId, tenantId, deletedAt: null },
    });
  }

  /**
   * Update a promotional offer
   */
  static async updatePromotionalOffer(
    tenantId: string,
    offerId: string,
    data: Partial<CreatePromotionalOfferInput>
  ) {
    const existing = await prisma.promotionalOffer.findFirst({
      where: { id: offerId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new Error('Promotional offer not found');
    }

    const updateData: Prisma.PromotionalOfferUpdateInput = {};

    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined) updateData.description = data.description ? data.description.trim() : null;
    if (data.discountType !== undefined) updateData.discountType = data.discountType;
    if (data.discountValue !== undefined) updateData.discountValue = new Prisma.Decimal(data.discountValue);
    if (data.validUntil !== undefined) updateData.validUntil = new Date(data.validUntil);
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

    return prisma.promotionalOffer.update({
      where: { id: offerId },
      data: updateData,
    });
  }

  /**
   * Soft-delete a promotional offer
   */
  static async deletePromotionalOffer(tenantId: string, offerId: string) {
    const existing = await prisma.promotionalOffer.findFirst({
      where: { id: offerId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new Error('Promotional offer not found');
    }

    return prisma.promotionalOffer.update({
      where: { id: offerId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  /**
   * Broadcast promotional offer to all confirmed customers via WhatsApp
   */
  static async broadcastOfferToCustomers(tenantId: string, offerId: string) {
    const offer = await prisma.promotionalOffer.findFirst({
      where: { id: offerId, tenantId, deletedAt: null },
    });

    if (!offer) {
      throw new Error('Promotional offer not found');
    }

    if (!offer.isActive) {
      throw new Error('Cannot broadcast an inactive offer');
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        tradeName: true,
        companyLegalName: true,
        phone: true,
      },
    });

    const studioName = tenant?.tradeName || tenant?.companyLegalName || tenant?.name || 'Pratima Photography Studio';

    // Query confirmed customers with valid contact numbers
    const customers = await prisma.customer.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          { isConfirmed: true },
          { leads: { some: { status: 'WON' } } },
          { eventBookings: { some: {} } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        whatsapp: true,
      },
    });

    // Format discount message
    let discountStr = '';
    if (offer.discountType === 'PERCENTAGE') {
      discountStr = `${offer.discountValue}% OFF`;
    } else {
      discountStr = `Flat ₹${Number(offer.discountValue).toLocaleString('en-IN')} OFF`;
    }

    const expiryStr = formatDate(offer.validUntil, 'dd MMMM yyyy');

    // Check if tenant has active WhatsApp integration configured
    const whatsappIntegration = await prisma.tenantIntegration.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'WHATSAPP',
        },
      },
    });

    const recipients: BroadcastRecipient[] = [];

    for (const customer of customers) {
      const rawPhone = customer.whatsapp || customer.phone || '';
      let cleanPhone = rawPhone.replace(/\D/g, '');
      if (cleanPhone.length === 10) {
        cleanPhone = `91${cleanPhone}`;
      } else if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
        cleanPhone = `91${cleanPhone.slice(1)}`;
      }

      if (!cleanPhone || cleanPhone.length < 10) {
        continue; // Skip customers without reachable phone
      }

      const customerFullName = `${customer.firstName} ${customer.lastName}`.trim();
      const message = `✨ Special Exclusive Offer from ${studioName}!\n\nDear ${customerFullName},\n\nWe are delighted to announce our festive campaign: *${offer.title}*!\n\n🎉 Offer Privilege: *${discountStr}*\n⏳ Valid Until: ${expiryStr}${offer.description ? `\n\n📝 Details:\n${offer.description}` : ''}\n\nBook your dream session today or reply directly to this message to claim your celebratory discount!\n\nWarm regards,\n${studioName}`;

      const directWhatsAppUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

      recipients.push({
        customerId: customer.id,
        customerName: customerFullName,
        phone: cleanPhone,
        directWhatsAppUrl,
        status: whatsappIntegration?.isActive ? 'DISPATCHED' : 'PENDING',
      });
    }

    return {
      success: true,
      offerId: offer.id,
      offerTitle: offer.title,
      totalEligible: customers.length,
      dispatchedCount: recipients.length,
      integrationConnected: Boolean(whatsappIntegration?.isActive),
      recipients,
    };
  }
}
