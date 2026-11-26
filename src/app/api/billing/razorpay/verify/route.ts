import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { RazorpayService, razorpayService } from '@/services/billing/razorpay.service';
import { DealerCommissionService } from '@/services/billing/dealer-commission.service';

export const runtime = 'nodejs';

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, 'razorpay_order_id is required'),
  razorpay_payment_id: z.string().min(1, 'razorpay_payment_id is required'),
  razorpay_signature: z.string().min(1, 'razorpay_signature is required'),
  purchaseType: z.enum(['SUBSCRIPTION', 'PER_EVENT_AI', 'AI_CREDIT_PACK', 'STACKABLE_ADDON']).optional(),
  units: z.coerce.number().int().min(1).optional(),
  eventId: z.string().optional(),
  eventBookingId: z.string().optional(),
  addonFeatureKey: z.string().optional(),
  planId: z.string().optional(),
  billingCycle: z.enum(['MONTHLY', 'ANNUAL']).optional(),
  addonKeys: z.array(z.string()).optional(),
  dealerCode: z.string().optional(),
});

/**
 * POST /api/billing/razorpay/verify
 * Synchronous client-side payment signature verification endpoint.
 *
 * Verifies HMAC SHA-256 signature immediately after client checkout callback,
 * atomically updates the database, activates tenant subscription, unlocks
 * purchased add-ons, records lifetime recurring dealer commissions, and breaks
 * the Hard Lock screen without waiting for external webhooks.
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

    // 3.1 Idempotency & Replay Attack Defense Gate:
    // Prevent replaying captured payment signatures or double-crediting quotas/branches
    const existingSuccessTx = await prisma.billingTransaction.findFirst({
      where: {
        OR: [
          { razorpayPaymentId: razorpay_payment_id, status: 'SUCCESS' },
          { razorpayOrderId: razorpay_order_id, status: 'SUCCESS' },
        ],
      },
    });

    if (existingSuccessTx) {
      if (existingSuccessTx.tenantId === tenantId) {
        console.log(
          `[RAZORPAY_VERIFY_IDEMPOTENT] Payment ${razorpay_payment_id} / Order ${razorpay_order_id} already completed for tenant "${tenantId}".`
        );
        return NextResponse.json({
          success: true,
          idempotent: true,
          message: 'Payment has already been successfully verified and processed.',
        });
      } else {
        console.error(
          `[RAZORPAY_VERIFY_CROSS_TENANT_BREACH_ATTEMPT] Tenant "${tenantId}" attempted to verify payment "${razorpay_payment_id}" belonging to tenant "${existingSuccessTx.tenantId}".`
        );
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Payment record does not belong to your studio.' },
          { status: 403 }
        );
      }
    }

    // 4. Fetch order details from Razorpay to retrieve authentic notes metadata
    let resolvedPurchaseType:
      | 'SUBSCRIPTION'
      | 'PER_EVENT_AI'
      | 'AI_CREDIT_PACK'
      | 'STACKABLE_ADDON' = parseResult.data.purchaseType || 'SUBSCRIPTION';
    let resolvedEventId = parseResult.data.eventId || '';
    let resolvedAddonFeatureKey = parseResult.data.addonFeatureKey || '';
    let resolvedCreditsIncluded = 0;
    let resolvedUnits = 1;
    let resolvedPlanId = payloadPlanId;
    let resolvedBillingCycle: 'MONTHLY' | 'ANNUAL' =
      payloadBillingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
    let resolvedAmountInRupees = 0;
    let resolvedAddonKeys: string[] = payloadAddonKeys || [];
    let resolvedDealerId = '';
    let resolvedDealerCode = '';
    let resolvedDiscountAmount = 0;

    try {
      const client = razorpayService.getClient();
      const rzpOrder = await client.orders.fetch(razorpay_order_id);

      if (rzpOrder?.notes?.purchaseType && typeof rzpOrder.notes.purchaseType === 'string') {
        resolvedPurchaseType = rzpOrder.notes.purchaseType as any;
      }
      if (rzpOrder?.notes?.eventId && typeof rzpOrder.notes.eventId === 'string') {
        resolvedEventId = rzpOrder.notes.eventId;
      }
      if (rzpOrder?.notes?.addonFeatureKey && typeof rzpOrder.notes.addonFeatureKey === 'string') {
        resolvedAddonFeatureKey = rzpOrder.notes.addonFeatureKey;
      }
      if (rzpOrder?.notes?.creditsIncluded && typeof rzpOrder.notes.creditsIncluded === 'string') {
        resolvedCreditsIncluded = parseInt(rzpOrder.notes.creditsIncluded, 10) || 0;
      }
      if (rzpOrder?.notes?.units && typeof rzpOrder.notes.units === 'string') {
        resolvedUnits = parseInt(rzpOrder.notes.units, 10) || 1;
      }
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
      if (rzpOrder?.notes?.dealerId && typeof rzpOrder.notes.dealerId === 'string') {
        resolvedDealerId = rzpOrder.notes.dealerId;
      }
      if (rzpOrder?.notes?.dealerCode && typeof rzpOrder.notes.dealerCode === 'string') {
        resolvedDealerCode = rzpOrder.notes.dealerCode;
      }
      if (rzpOrder?.notes?.discountAmount && typeof rzpOrder.notes.discountAmount === 'string') {
        resolvedDiscountAmount = parseFloat(rzpOrder.notes.discountAmount) || 0;
      }
    } catch (orderFetchErr) {
      console.warn(
        '[RazorpayVerify] Unable to fetch order notes from Razorpay API, falling back to request payload:',
        orderFetchErr
      );
    }



    // =========================================================================
    // BRANCH C: STACKABLE ADD-ON PURCHASE (EXTRA_BRANCH or EXTRA_STAFF_5)
    // =========================================================================
    if (resolvedPurchaseType === 'STACKABLE_ADDON') {
      const addonKey = resolvedAddonFeatureKey || parseResult.data.addonFeatureKey || 'EXTRA_BRANCH';
      const unitsPurchased = resolvedUnits > 0 ? resolvedUnits : (parseResult.data.units || 1);

      let recordedTxId = '';
      await prisma.$transaction(async (tx) => {
        // Enforce tenant order authorization and prevent duplicate increment
        const pendingTx = await tx.billingTransaction.findFirst({
          where: { razorpayOrderId: razorpay_order_id },
        });

        if (pendingTx && pendingTx.tenantId !== tenantId) {
          throw new Error('Unauthorized: Order record belongs to another studio account.');
        }

        if (pendingTx?.status === 'SUCCESS') {
          recordedTxId = pendingTx.id;
          return;
        }

        const tenantRecord = await tx.tenant.findUnique({
          where: { id: tenantId },
          select: { enabledAddons: true, extraBranchUnits: true, extraStaffUnits: true },
        });

        const currentAddons = tenantRecord?.enabledAddons || [];
        const mergedAddons = Array.from(new Set([...currentAddons, addonKey]));

        if (addonKey === 'EXTRA_BRANCH') {
          await tx.tenant.update({
            where: { id: tenantId },
            data: {
              extraBranchUnits: { increment: unitsPurchased },
              enabledAddons: mergedAddons,
            },
          });
        } else if (addonKey === 'EXTRA_STAFF_5') {
          await tx.tenant.update({
            where: { id: tenantId },
            data: {
              extraStaffUnits: { increment: unitsPurchased },
              enabledAddons: mergedAddons,
            },
          });
        }

        if (pendingTx) {
          const updated = await tx.billingTransaction.update({
            where: { id: pendingTx.id },
            data: {
              status: 'SUCCESS',
              razorpayPaymentId: razorpay_payment_id,
              purchaseType: 'STACKABLE_ADDON',
              addonFeatureKey: addonKey,
              unitsPurchased: unitsPurchased,
              transactionDate: new Date(),
            },
          });
          recordedTxId = updated.id;
        } else {
          const created = await tx.billingTransaction.create({
            data: {
              tenantId,
              amount: resolvedAmountInRupees,
              currency: 'INR',
              status: 'SUCCESS',
              purchaseType: 'STACKABLE_ADDON',
              addonFeatureKey: addonKey,
              unitsPurchased: unitsPurchased,
              razorpayOrderId: razorpay_order_id,
              razorpayPaymentId: razorpay_payment_id,
              transactionDate: new Date(),
            },
          });
          recordedTxId = created.id;
        }
      });

      if (recordedTxId) {
        await DealerCommissionService.recordDealerCommissionForTransaction(recordedTxId);
      }

      return NextResponse.json({
        success: true,
        purchaseType: 'STACKABLE_ADDON',
        addonKey,
        unitsPurchased,
        message: `Successfully added ${unitsPurchased} ${addonKey === 'EXTRA_BRANCH' ? 'extra branch(es)' : 'extra staff pack(s)'}!`,
      });
    }

    // =========================================================================
    // BRANCH A: PAY-PER-EVENT AI FACE RECOGNITION UNLOCK
    // =========================================================================
    if (resolvedPurchaseType === 'PER_EVENT_AI') {
      const eventId = resolvedEventId || parseResult.data.eventId;
      if (!eventId) {
        return NextResponse.json(
          { success: false, error: 'eventId is missing for per-event unlock.' },
          { status: 400 }
        );
      }

      let recordedTxId = '';
      await prisma.$transaction(async (tx) => {
        // Enforce tenant authorization on target event booking
        const booking = await tx.eventBooking.findFirst({
          where: { id: eventId, tenantId, deletedAt: null },
        });

        if (!booking) {
          throw new Error('Event booking not found or does not belong to your studio.');
        }

        const pendingTx = await tx.billingTransaction.findFirst({
          where: { razorpayOrderId: razorpay_order_id },
        });

        if (pendingTx && pendingTx.tenantId !== tenantId) {
          throw new Error('Unauthorized: Order record belongs to another studio account.');
        }

        if (pendingTx?.status === 'SUCCESS') {
          recordedTxId = pendingTx.id;
          return;
        }

        await tx.eventBooking.update({
          where: { id: eventId },
          data: {
            aiFaceRecognitionUnlocked: true,
            aiUnlockedAt: new Date(),
          },
        });

        if (pendingTx) {
          const updated = await tx.billingTransaction.update({
            where: { id: pendingTx.id },
            data: {
              status: 'SUCCESS',
              razorpayPaymentId: razorpay_payment_id,
              purchaseType: 'PER_EVENT_AI',
              eventBookingId: eventId,
              transactionDate: new Date(),
            },
          });
          recordedTxId = updated.id;
        } else {
          const created = await tx.billingTransaction.create({
            data: {
              tenantId,
              amount: resolvedAmountInRupees,
              currency: 'INR',
              status: 'SUCCESS',
              purchaseType: 'PER_EVENT_AI',
              eventBookingId: eventId,
              razorpayOrderId: razorpay_order_id,
              razorpayPaymentId: razorpay_payment_id,
              transactionDate: new Date(),
            },
          });
          recordedTxId = created.id;
        }
      });

      if (recordedTxId) {
        await DealerCommissionService.recordDealerCommissionForTransaction(recordedTxId);
      }

      return NextResponse.json({
        success: true,
        purchaseType: 'PER_EVENT_AI',
        eventId,
        message: 'AI Face Recognition unlocked successfully for this event!',
      });
    }

    // =========================================================================
    // BRANCH B: PREPAID AI EVENT CREDIT PACK PURCHASE
    // =========================================================================
    if (resolvedPurchaseType === 'AI_CREDIT_PACK') {
      const addonKey = resolvedAddonFeatureKey || parseResult.data.addonFeatureKey || 'AI_FACE_RECOGNITION_PACK_10';
      const creditsIncluded = resolvedCreditsIncluded > 0 ? resolvedCreditsIncluded : 10;

      let recordedTxId = '';
      await prisma.$transaction(async (tx) => {
        // Enforce tenant order authorization and prevent duplicate credit increments
        const pendingTx = await tx.billingTransaction.findFirst({
          where: { razorpayOrderId: razorpay_order_id },
        });

        if (pendingTx && pendingTx.tenantId !== tenantId) {
          throw new Error('Unauthorized: Order record belongs to another studio account.');
        }

        if (pendingTx?.status === 'SUCCESS') {
          recordedTxId = pendingTx.id;
          return;
        }

        await tx.tenant.update({
          where: { id: tenantId },
          data: {
            aiEventCredits: { increment: creditsIncluded },
          },
        });

        if (pendingTx) {
          const updated = await tx.billingTransaction.update({
            where: { id: pendingTx.id },
            data: {
              status: 'SUCCESS',
              razorpayPaymentId: razorpay_payment_id,
              purchaseType: 'AI_CREDIT_PACK',
              addonFeatureKey: addonKey,
              creditsPurchased: creditsIncluded,
              transactionDate: new Date(),
            },
          });
          recordedTxId = updated.id;
        } else {
          const created = await tx.billingTransaction.create({
            data: {
              tenantId,
              amount: resolvedAmountInRupees,
              currency: 'INR',
              status: 'SUCCESS',
              purchaseType: 'AI_CREDIT_PACK',
              addonFeatureKey: addonKey,
              creditsPurchased: creditsIncluded,
              razorpayOrderId: razorpay_order_id,
              razorpayPaymentId: razorpay_payment_id,
              transactionDate: new Date(),
            },
          });
          recordedTxId = created.id;
        }
      });

      if (recordedTxId) {
        await DealerCommissionService.recordDealerCommissionForTransaction(recordedTxId);
      }

      return NextResponse.json({
        success: true,
        purchaseType: 'AI_CREDIT_PACK',
        creditsAdded: creditsIncluded,
        message: `${creditsIncluded} AI Event Credits added to your studio wallet!`,
      });
    }

    // =========================================================================
    // BRANCH C: SAAS SUBSCRIPTION PLAN & RECURRING ADD-ONS
    // =========================================================================
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
    let recordedTxId = '';

    await prisma.$transaction(async (tx) => {
      // a) Update or record BillingTransaction
      const pendingTx = await tx.billingTransaction.findFirst({
        where: { razorpayOrderId: razorpay_order_id },
      });

      if (pendingTx && pendingTx.tenantId !== tenantId) {
        throw new Error('Unauthorized: Order record belongs to another studio account.');
      }

      if (pendingTx?.status === 'SUCCESS') {
        recordedTxId = pendingTx.id;
        return;
      }

      const txNotes = resolvedDiscountAmount > 0
        ? `Partner Discount: ₹${resolvedDiscountAmount} (Code: ${resolvedDealerCode || 'N/A'})`
        : pendingTx?.notes || undefined;

      if (pendingTx) {
        const updated = await tx.billingTransaction.update({
          where: { id: pendingTx.id },
          data: {
            status: 'SUCCESS',
            razorpayPaymentId: razorpay_payment_id,
            amount: resolvedAmountInRupees > 0 ? resolvedAmountInRupees : pendingTx.amount,
            transactionDate: new Date(),
            notes: txNotes,
          },
        });
        recordedTxId = updated.id;
      } else {
        const created = await tx.billingTransaction.create({
          data: {
            tenantId,
            amount: resolvedAmountInRupees,
            currency: 'INR',
            status: 'SUCCESS',
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            transactionDate: new Date(),
            notes: txNotes,
          },
        });
        recordedTxId = created.id;
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
        select: { enabledAddons: true, referredByDealerId: true },
      });
      const currentAddons = existingTenant?.enabledAddons || [];
      mergedAddons = Array.from(new Set([...currentAddons, ...resolvedAddonKeys]));

      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionStatus: 'ACTIVE',
          trialEndsAt: null,
          enabledAddons: mergedAddons,
          referredByDealerId: existingTenant?.referredByDealerId || (resolvedDealerId || undefined),
        },
      });
    });

    // 8. Automatically record Dealer Lifetime Recurring Commission (Idempotent)
    if (recordedTxId) {
      await DealerCommissionService.recordDealerCommissionForTransaction(recordedTxId);
    }

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
