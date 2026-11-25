import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { razorpayService } from '@/services/billing/razorpay.service';

export const runtime = 'nodejs';

const createOrderSchema = z.object({
  planId: z.string().min(1, 'planId is required'),
  billingCycle: z.enum(['MONTHLY', 'ANNUAL']).default('MONTHLY'),
  addonKeys: z.array(z.string()).default([]),
});

const GST_RATE = 0.18; // 18% GST (9% CGST + 9% SGST or 18% IGST)

/**
 * POST /api/billing/razorpay/order
 * Authenticated endpoint to initialize a Razorpay checkout order for a SaaS subscription
 * and optional modular add-on capabilities.
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

    const { planId, billingCycle, addonKeys } = parseResult.data;

    // 3. Verify tenant existence in database
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        contactPhone: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant record not found in system.' },
        { status: 404 }
      );
    }

    // 4. Retrieve plan pricing and active status from Prisma
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { success: false, error: 'Selected subscription plan is inactive or does not exist.' },
        { status: 404 }
      );
    }

    // 5. Calculate add-ons pricing if addonKeys are provided
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

    // 6. Calculate exact pricing and tax amounts
    const planAmount =
      billingCycle === 'ANNUAL' ? Number(plan.annualPrice) : Number(plan.monthlyPrice);
    const baseAmount = planAmount + addonsTotal;
    const gstAmount = Math.round(baseAmount * GST_RATE * 100) / 100;
    const totalAmount = Math.round((baseAmount + gstAmount) * 100) / 100;
    const amountInPaise = Math.round(totalAmount * 100);

    // 7. Generate a unique internal receipt number (max 40 chars)
    const receiptId = `rcpt_${tenant.id.slice(0, 8)}_${Date.now().toString().slice(-8)}`;

    // 8. Attach structured metadata notes for audit and webhook correlation
    const notes: Record<string, string> = {
      tenantId: tenant.id,
      tenantName: tenant.name.slice(0, 40),
      planId: plan.id,
      planName: plan.name,
      planSlug: plan.slug,
      billingCycle,
      userId,
      addonKeys: (addonKeys || []).join(','),
      addonsTotal: addonsTotal.toFixed(2),
      baseAmount: baseAmount.toFixed(2),
      gstAmount: gstAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
    };

    // 9. Generate Order via Razorpay Enterprise Service
    const order = await razorpayService.createOrder(
      amountInPaise,
      receiptId,
      notes,
      'INR'
    );

    // 10. Persist PENDING transaction in Prisma for immediate audit trail
    await prisma.billingTransaction.create({
      data: {
        tenantId: tenant.id,
        amount: totalAmount,
        currency: 'INR',
        status: 'PENDING',
        razorpayOrderId: order.id,
      },
    });

    // 11. Return checkout parameters to client
    return NextResponse.json({
      success: true,
      orderId: order.id,
      currency: order.currency,
      amount: order.amount, // in paise
      baseAmount,
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
