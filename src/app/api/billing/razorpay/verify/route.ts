import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { RazorpayService, razorpayService } from '@/services/billing/razorpay.service';

export const runtime = 'nodejs';

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, 'razorpay_order_id is required'),
  razorpay_payment_id: z.string().min(1, 'razorpay_payment_id is required'),
  razorpay_signature: z.string().min(1, 'razorpay_signature is required'),
  planId: z.string().optional(),
  billingCycle: z.enum(['MONTHLY', 'ANNUAL']).optional(),
  addonKeys: z.array(z.string()).optional(),
});

/**
 * POST /api/billing/razorpay/verify
 * Synchronous client-side payment signature verification endpoint.
 *
 * Verifies HMAC SHA-256 signature immediately after client checkout callback,
 * atomically updates the database, activates tenant subscription, unlocks
 * purchased add-ons, and breaks the Hard Lock screen without waiting for external webhooks.
 */
export async function POST(req: Request) {
  try {
    // 1. Authenticate session and resolve tenant context
    const session = await auth();
    const user = session?.user as
      | { id?: string; name?: string | null; email?: string | null; tenantId?: string }
      | undefined;
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

    const parseResult = verifyPaymentSchema.safeParse(body);
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
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId: payloadPlanId,
      billingCycle: payloadBillingCycle,
      addonKeys: payloadAddonKeys,
    } = parseResult.data;

    // 3. Cryptographic Signature Verification via Razorpay Service
    const isValidSignature = RazorpayService.verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValidSignature) {
      console.error(
        `[RAZORPAY_VERIFY_ALERT] Forged or invalid signature for order: ${razorpay_order_id}, payment: ${razorpay_payment_id}`
      );
      return NextResponse.json(
        { success: false, error: 'Invalid payment signature. Verification failed.' },
        { status: 400 }
      );
    }

    // 4. Fetch order details from Razorpay to retrieve authentic notes metadata
    let resolvedPlanId = payloadPlanId;
    let resolvedBillingCycle: 'MONTHLY' | 'ANNUAL' =
      payloadBillingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
    let resolvedAmountInRupees = 0;
    let resolvedAddonKeys: string[] = payloadAddonKeys || [];

    try {
      const client = razorpayService.getClient();
      const rzpOrder = await client.orders.fetch(razorpay_order_id);

      if (rzpOrder?.notes?.planId && typeof rzpOrder.notes.planId === 'string') {
        resolvedPlanId = rzpOrder.notes.planId;
      }
      if (
        rzpOrder?.notes?.billingCycle &&
        (rzpOrder.notes.billingCycle === 'ANNUAL' || rzpOrder.notes.billingCycle === 'MONTHLY')
      ) {
        resolvedBillingCycle = rzpOrder.notes.billingCycle as 'MONTHLY' | 'ANNUAL';
      }
      if (rzpOrder?.amount) {
        resolvedAmountInRupees = Math.round(Number(rzpOrder.amount)) / 100;
      }
      if (rzpOrder?.notes?.addonKeys && typeof rzpOrder.notes.addonKeys === 'string') {
        const parsedKeys = rzpOrder.notes.addonKeys
          .split(',')
          .map((k: string) => k.trim())
          .filter(Boolean);
        if (parsedKeys.length > 0) {
          resolvedAddonKeys = parsedKeys;
        }
      }
    } catch (orderFetchErr) {
      console.warn(
        '[RazorpayVerify] Unable to fetch order notes from Razorpay API, falling back to request payload:',
        orderFetchErr
      );
    }

    // 5. Resolve active SubscriptionPlan
    let plan = resolvedPlanId
      ? await prisma.subscriptionPlan.findUnique({ where: { id: resolvedPlanId } })
      : null;

    if (!plan) {
      const existingSub = await prisma.tenantSubscription.findUnique({
        where: { tenantId },
        include: { plan: true },
      });
      if (existingSub?.plan) {
        plan = existingSub.plan;
      } else {
        plan = await prisma.subscriptionPlan.findFirst({
          where: { isActive: true },
          orderBy: { monthlyPrice: 'asc' },
        });
      }
    }

    if (!plan) {
      console.error('[RazorpayVerify] No valid subscription plan could be resolved.');
      return NextResponse.json(
        { success: false, error: 'No subscription plan available to activate.' },
        { status: 422 }
      );
    }

    // 6. Calculate subscription duration & validity window
    const durationDays = resolvedBillingCycle === 'ANNUAL' ? 365 : 30;
    const newEndDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    // 7. Atomic Database Transaction (Zero inconsistency guarantee)
    let mergedAddons: string[] = [];
    await prisma.$transaction(async (tx) => {
      // a) Update or record BillingTransaction
      const pendingTx = await tx.billingTransaction.findFirst({
        where: { razorpayOrderId: razorpay_order_id },
      });

      if (pendingTx) {
        await tx.billingTransaction.update({
          where: { id: pendingTx.id },
          data: {
            status: 'SUCCESS',
            razorpayPaymentId: razorpay_payment_id,
            amount: resolvedAmountInRupees > 0 ? resolvedAmountInRupees : pendingTx.amount,
            transactionDate: new Date(),
          },
        });
      } else {
        await tx.billingTransaction.create({
          data: {
            tenantId,
            amount: resolvedAmountInRupees,
            currency: 'INR',
            status: 'SUCCESS',
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            transactionDate: new Date(),
          },
        });
      }

      // b) Upsert TenantSubscription with verified plan and dates
      await tx.tenantSubscription.upsert({
        where: { tenantId },
        update: {
          planId: plan.id,
          billingCycle: resolvedBillingCycle,
          startDate: new Date(),
          endDate: newEndDate,
        },
        create: {
          tenantId,
          planId: plan.id,
          billingCycle: resolvedBillingCycle,
          startDate: new Date(),
          endDate: newEndDate,
        },
      });

      // c) Merge purchased add-ons and activate Tenant subscription status
      const existingTenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { enabledAddons: true },
      });
      const currentAddons = existingTenant?.enabledAddons || [];
      mergedAddons = Array.from(new Set([...currentAddons, ...resolvedAddonKeys]));

      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionStatus: 'ACTIVE',
          trialEndsAt: null,
          enabledAddons: mergedAddons,
        },
      });
    });

    console.log(
      `[RAZORPAY_VERIFY_SUCCESS] Tenant "${tenantId}" unlocked on plan "${plan.name}" with add-ons [${mergedAddons.join(', ')}] until ${newEndDate.toISOString()}`
    );

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully, subscription activated, and add-ons unlocked.',
      subscription: {
        planName: plan.name,
        billingCycle: resolvedBillingCycle,
        endDate: newEndDate.toISOString(),
        enabledAddons: mergedAddons,
      },
    });
  } catch (err: any) {
    console.error('[RazorpayVerify Fatal Error]:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal server error occurred while verifying payment.',
      },
      { status: 500 }
    );
  }
}
