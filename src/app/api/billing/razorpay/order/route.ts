import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { razorpayService } from '@/services/billing/razorpay.service';
import { DealerCommissionService } from '@/services/billing/dealer-commission.service';

export const runtime = 'nodejs';

const createOrderSchema = z.object({
  purchaseType: z.enum(['SUBSCRIPTION', 'PER_EVENT_AI', 'AI_CREDIT_PACK']).default('SUBSCRIPTION'),
  planId: z.string().optional(),
  billingCycle: z.enum(['MONTHLY', 'ANNUAL']).default('MONTHLY'),
  addonKeys: z.array(z.string()).default([]),
  dealerCode: z.string().optional(),
  eventId: z.string().optional(),
  addonFeatureKey: z.string().optional(),
});

const GST_RATE = 0.18; // 18% GST (9% CGST + 9% SGST or 18% IGST)

/**
 * POST /api/billing/razorpay/order
 * Authenticated endpoint to initialize a Razorpay checkout order for:
 * 1. SaaS Base Subscription & Modular Add-ons
 * 2. Pay-Per-Event AI Face Recognition Unlocks
 * 3. Prepaid AI Event Credit Packs
 */
export async function POST(req: Request) {
  try {
    // 1. Enforce authentication and tenant membership
    const session = await auth();
    const user = session?.user as { id?: string; name?: string | null; email?: string | null; tenantId?: string } | undefined;
    const userId = user?.id;
    const tenantId = user?.tenantId;

    if (!session || !user || !userId || !tenantId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    // 2. Validate request payload with Zod
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Bad Request: Missing JSON request body.' },
        { status: 400 }
      );
    }

    const parseResult = createOrderSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      purchaseType,
      planId,
      billingCycle,
      addonKeys,
      dealerCode,
      eventId,
      addonFeatureKey,
    } = parseResult.data;

    // 3. Verify tenant existence in database
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        contactPhone: true,
        referredByDealerId: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant record not found in system.' },
        { status: 404 }
      );
    }

    // =========================================================================
    // BRANCH A: PAY-PER-EVENT AI FACE RECOGNITION UNLOCK
    // =========================================================================
    if (purchaseType === 'PER_EVENT_AI') {
      if (!eventId) {
        return NextResponse.json(
          { success: false, error: 'eventId is required for per-event AI unlock.' },
          { status: 400 }
        );
      }

      const booking = await prisma.eventBooking.findFirst({
        where: { id: eventId, tenantId: tenant.id, deletedAt: null },
        select: { id: true, title: true, bookingNumber: true, aiFaceRecognitionUnlocked: true },
      });

      if (!booking) {
        return NextResponse.json(
          { success: false, error: 'Event booking not found or does not belong to your studio.' },
          { status: 404 }
        );
      }

      if (booking.aiFaceRecognitionUnlocked) {
        return NextResponse.json(
          { success: false, error: 'AI Face Recognition is already unlocked for this event.' },
          { status: 400 }
        );
      }

      // Resolve configured per-event price or default ₹149
      const addonConfig = await prisma.planAddonConfig.findUnique({
        where: { featureKey: 'AI_FACE_RECOGNITION_SINGLE' },
      });
      const netBaseAmount = addonConfig ? Number(addonConfig.monthlyPrice) : 149;
      const gstAmount = Math.round(netBaseAmount * GST_RATE * 100) / 100;
      const totalAmount = Math.round((netBaseAmount + gstAmount) * 100) / 100;
      const amountInPaise = Math.round(totalAmount * 100);

      const receiptId = `ai_evt_${tenant.id.slice(0, 6)}_${Date.now().toString().slice(-8)}`;
      const notes: Record<string, string> = {
        tenantId: tenant.id,
        tenantName: tenant.name.slice(0, 40),
        purchaseType: 'PER_EVENT_AI',
        eventId: booking.id,
        eventTitle: booking.title.slice(0, 40),
        userId,
        netBaseAmount: netBaseAmount.toFixed(2),
        gstAmount: gstAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
      };

      const order = await razorpayService.createOrder(amountInPaise, receiptId, notes, 'INR');

      await prisma.billingTransaction.create({
        data: {
          tenantId: tenant.id,
          amount: totalAmount,
          currency: 'INR',
          status: 'PENDING',
          purchaseType: 'PER_EVENT_AI',
          eventBookingId: booking.id,
          razorpayOrderId: order.id,
          notes: `AI Face Recognition Unlock for Event: ${booking.title} (${booking.bookingNumber})`,
        },
      });

      return NextResponse.json({
        success: true,
        purchaseType: 'PER_EVENT_AI',
        orderId: order.id,
        currency: order.currency,
        amount: order.amount,
        baseAmount: netBaseAmount,
        gstAmount,
        totalAmount,
        keyId: process.env.RAZORPAY_KEY_ID,
        eventId: booking.id,
        eventTitle: booking.title,
        customer: {
          name: tenant.name,
          email: tenant.email || user.email || '',
          contact: tenant.contactPhone || tenant.phone || '',
        },
      });
    }

    // =========================================================================
    // BRANCH B: PREPAID AI EVENT CREDIT PACK PURCHASE
    // =========================================================================
    if (purchaseType === 'AI_CREDIT_PACK') {
      const targetFeatureKey = addonFeatureKey || 'AI_FACE_RECOGNITION_PACK_10';
      const addonConfig = await prisma.planAddonConfig.findUnique({
        where: { featureKey: targetFeatureKey },
      });

      const netBaseAmount = addonConfig ? Number(addonConfig.monthlyPrice) : 1199;
      const creditsIncluded = addonConfig?.creditsIncluded && addonConfig.creditsIncluded > 0
        ? addonConfig.creditsIncluded
        : 10;
      const gstAmount = Math.round(netBaseAmount * GST_RATE * 100) / 100;
      const totalAmount = Math.round((netBaseAmount + gstAmount) * 100) / 100;
      const amountInPaise = Math.round(totalAmount * 100);

      const receiptId = `ai_pck_${tenant.id.slice(0, 6)}_${Date.now().toString().slice(-8)}`;
      const notes: Record<string, string> = {
        tenantId: tenant.id,
        tenantName: tenant.name.slice(0, 40),
        purchaseType: 'AI_CREDIT_PACK',
        addonFeatureKey: targetFeatureKey,
        creditsIncluded: String(creditsIncluded),
        userId,
        netBaseAmount: netBaseAmount.toFixed(2),
        gstAmount: gstAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
      };

      const order = await razorpayService.createOrder(amountInPaise, receiptId, notes, 'INR');

      await prisma.billingTransaction.create({
        data: {
          tenantId: tenant.id,
          amount: totalAmount,
          currency: 'INR',
          status: 'PENDING',
          purchaseType: 'AI_CREDIT_PACK',
          addonFeatureKey: targetFeatureKey,
          creditsPurchased: creditsIncluded,
          razorpayOrderId: order.id,
          notes: `Prepaid AI Event Credit Pack (${creditsIncluded} Credits)`,
        },
      });

      return NextResponse.json({
        success: true,
        purchaseType: 'AI_CREDIT_PACK',
        orderId: order.id,
        currency: order.currency,
        amount: order.amount,
        baseAmount: netBaseAmount,
        creditsIncluded,
        gstAmount,
        totalAmount,
        keyId: process.env.RAZORPAY_KEY_ID,
        customer: {
          name: tenant.name,
          email: tenant.email || user.email || '',
          contact: tenant.contactPhone || tenant.phone || '',
        },
      });
    }

    // =========================================================================
    // BRANCH C: SAAS SUBSCRIPTION PLAN & RECURRING ADD-ONS
    // =========================================================================
    if (!planId) {
      return NextResponse.json(
        { success: false, error: 'planId is required for subscription orders.' },
        { status: 400 }
      );
    }

    // Retrieve plan pricing and active status from Prisma
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { success: false, error: 'Selected subscription plan is inactive or does not exist.' },
        { status: 404 }
      );
    }

    // Calculate add-ons pricing if addonKeys are provided
    let addonsTotal = 0;
    let selectedAddonRows: { featureKey: string; name: string }[] = [];
    if (addonKeys && addonKeys.length > 0) {
      const activeAddons = await prisma.planAddonConfig.findMany({
        where: {
          featureKey: { in: addonKeys },
          isActive: true,
        },
      });
      selectedAddonRows = activeAddons.map((a) => ({ featureKey: a.featureKey, name: a.name }));
      addonsTotal = activeAddons.reduce(
        (sum, a) =>
          sum + (billingCycle === 'ANNUAL' ? Number(a.annualPrice) : Number(a.monthlyPrice)),
        0
      );
    }

    // Calculate base amount
    const planAmount =
      billingCycle === 'ANNUAL' ? Number(plan.annualPrice) : Number(plan.monthlyPrice);
    const grossBaseAmount = planAmount + addonsTotal;

    // Check and compute first-payment dealer discount
    const discountInfo = await DealerCommissionService.calculateFirstPaymentDiscount(
      tenant.id,
      dealerCode
    );

    let discountPercent = 0;
    let discountAmount = 0;
    let netBaseAmount = grossBaseAmount;

    if (discountInfo.eligible && discountInfo.discountPercent > 0) {
      discountPercent = discountInfo.discountPercent;
      discountAmount = Math.round(((grossBaseAmount * discountPercent) / 100) * 100) / 100;
      netBaseAmount = Math.max(0, grossBaseAmount - discountAmount);
    }

    const gstAmount = Math.round(netBaseAmount * GST_RATE * 100) / 100;
    const totalAmount = Math.round((netBaseAmount + gstAmount) * 100) / 100;
    const amountInPaise = Math.round(totalAmount * 100);

    const receiptId = `rcpt_${tenant.id.slice(0, 8)}_${Date.now().toString().slice(-8)}`;

    const notes: Record<string, string> = {
      tenantId: tenant.id,
      tenantName: tenant.name.slice(0, 40),
      purchaseType: 'SUBSCRIPTION',
      planId: plan.id,
      planName: plan.name,
      planSlug: plan.slug,
      billingCycle,
      userId,
      addonKeys: (addonKeys || []).join(','),
      addonsTotal: addonsTotal.toFixed(2),
      grossBaseAmount: grossBaseAmount.toFixed(2),
      discountPercent: discountPercent.toString(),
      discountAmount: discountAmount.toFixed(2),
      dealerId: discountInfo.dealerId || '',
      dealerCode: discountInfo.dealerCode || '',
      netBaseAmount: netBaseAmount.toFixed(2),
      gstAmount: gstAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
    };

    const order = await razorpayService.createOrder(
      amountInPaise,
      receiptId,
      notes,
      'INR'
    );

    await prisma.billingTransaction.create({
      data: {
        tenantId: tenant.id,
        amount: totalAmount,
        currency: 'INR',
        status: 'PENDING',
        purchaseType: 'SUBSCRIPTION',
        razorpayOrderId: order.id,
        notes: discountAmount > 0
          ? `Partner Discount: ₹${discountAmount} (${discountPercent}% off via Code ${discountInfo.dealerCode})`
          : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      purchaseType: 'SUBSCRIPTION',
      orderId: order.id,
      currency: order.currency,
      amount: order.amount,
      grossBaseAmount,
      discountPercent,
      discountAmount,
      dealerCode: discountInfo.dealerCode || null,
      baseAmount: netBaseAmount,
      planAmount,
      addonsTotal,
      gstAmount,
      totalAmount,
      keyId: process.env.RAZORPAY_KEY_ID,
      plan: {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
      },
      addons: selectedAddonRows,
      customer: {
        name: tenant.name,
        email: tenant.email || user.email || '',
        contact: tenant.contactPhone || tenant.phone || '',
      },
    });
  } catch (error: any) {
    console.error('[RAZORPAY_ORDER_FATAL_ERROR]', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to initialize payment gateway order.',
      },
      { status: 500 }
    );
  }
}
