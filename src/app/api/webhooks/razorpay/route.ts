import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { razorpayService } from '@/services/billing/razorpay.service';

export const runtime = 'nodejs';

/**
 * POST /api/webhooks/razorpay
 * Listens for Razorpay webhook notifications (payment.captured, order.paid, payment.failed).
 * Strictly verifies the HMAC SHA256 signature to prevent forged requests.
 */
export async function POST(req: Request) {
  try {
    // 1. Extract raw request payload text
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!rawBody || !signature) {
      console.warn('[RAZORPAY_WEBHOOK_REJECTED] Missing payload body or signature header');
      return NextResponse.json(
        { error: 'Bad Request: Missing body or signature header.' },
        { status: 400 }
      );
    }

    // 2. Cryptographic signature validation with timing-safe comparison
    const isValidSignature = razorpayService.verifyWebhookSignature(rawBody, signature);
    if (!isValidSignature) {
      console.error('[RAZORPAY_WEBHOOK_SECURITY_ALERT] Invalid webhook signature detected.');
      return NextResponse.json(
        { error: 'Unauthorized: Invalid webhook signature.' },
        { status: 400 }
      );
    }

    // 3. Parse validated JSON payload
    const body = JSON.parse(rawBody);
    const event = body.event;

    console.log(`[RAZORPAY_WEBHOOK_EVENT_RECEIVED] Event: "${event}"`);

    // 4. Handle Successful Payment Events (payment.captured, order.paid)
    if (event === 'payment.captured' || event === 'order.paid') {
      const payment = body.payload?.payment?.entity;
      const order = body.payload?.order?.entity;

      const razorpayPaymentId = payment?.id;
      const razorpayOrderId = payment?.order_id || order?.id;
      const amountInPaise = payment?.amount ?? order?.amount ?? 0;
      const amountInRupees = Math.round(Number(amountInPaise)) / 100;
      const currency = payment?.currency || order?.currency || 'INR';

      const notes = (payment?.notes || order?.notes || {}) as Record<string, string>;
      let tenantId = notes.tenantId;
      let planId = notes.planId;
      const rawCycle = notes.billingCycle?.toUpperCase();
      const billingCycle: 'MONTHLY' | 'ANNUAL' = rawCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';

      // Idempotency Gate: Check if payment was already processed
      if (razorpayPaymentId) {
        const existingTx = await prisma.billingTransaction.findFirst({
          where: {
            OR: [
              { razorpayPaymentId, status: 'SUCCESS' },
              { razorpayOrderId, status: 'SUCCESS' },
            ],
          },
        });

        if (existingTx && existingTx.status === 'SUCCESS') {
          console.log(
            `[RAZORPAY_WEBHOOK_IDEMPOTENT] Payment ${razorpayPaymentId} / Order ${razorpayOrderId} already fulfilled.`
          );
          return NextResponse.json({ status: 'ok', message: 'Transaction already completed.' });
        }
      }

      // If tenantId was not found in notes, look up pending BillingTransaction
      if (!tenantId && razorpayOrderId) {
        const pendingTx = await prisma.billingTransaction.findUnique({
          where: { razorpayOrderId },
        });
        if (pendingTx) {
          tenantId = pendingTx.tenantId;
        }
      }

      if (!tenantId) {
        console.error('[RAZORPAY_WEBHOOK_ERROR] Cannot resolve tenantId for payment:', {
          razorpayPaymentId,
          razorpayOrderId,
        });
        return NextResponse.json(
          { error: 'Cannot correlate payment to an existing tenant.' },
          { status: 422 }
        );
      }

      // Verify Tenant exists
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        console.error(`[RAZORPAY_WEBHOOK_ERROR] Tenant "${tenantId}" not found in database.`);
        return NextResponse.json({ error: 'Tenant record not found.' }, { status: 404 });
      }

      // Resolve Plan
      let plan = null;
      if (planId) {
        plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      }

      if (!plan) {
        // Fall back to existing tenant subscription plan or default active plan
        const existingSub = await prisma.tenantSubscription.findUnique({
          where: { tenantId: tenant.id },
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
        console.error('[RAZORPAY_WEBHOOK_ERROR] No active subscription plan could be resolved.');
        return NextResponse.json({ error: 'No subscription plan available.' }, { status: 422 });
      }

      // Calculate new subscription validity duration
      const durationDays = billingCycle === 'ANNUAL' ? 365 : 30;
      const newEndDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

      // Execute Atomic Database Transaction
      await prisma.$transaction(async (tx) => {
        // 1. Update or Create BillingTransaction
        const pendingTx = razorpayOrderId
          ? await tx.billingTransaction.findFirst({
              where: { razorpayOrderId },
            })
          : null;

        if (pendingTx) {
          await tx.billingTransaction.update({
            where: { id: pendingTx.id },
            data: {
              status: 'SUCCESS',
              razorpayPaymentId,
              amount: amountInRupees > 0 ? amountInRupees : pendingTx.amount,
              currency,
              transactionDate: new Date(),
            },
          });
        } else {
          await tx.billingTransaction.create({
            data: {
              tenantId: tenant.id,
              amount: amountInRupees,
              currency,
              status: 'SUCCESS',
              razorpayPaymentId,
              razorpayOrderId,
              transactionDate: new Date(),
            },
          });
        }

        // 2. Upsert TenantSubscription with activated dates
        await tx.tenantSubscription.upsert({
          where: { tenantId: tenant.id },
          update: {
            planId: plan.id,
            billingCycle,
            startDate: new Date(),
            endDate: newEndDate,
          },
          create: {
            tenantId: tenant.id,
            planId: plan.id,
            billingCycle,
            startDate: new Date(),
            endDate: newEndDate,
          },
        });

        // 3. Activate Tenant subscription status and clear trial flag
        await tx.tenant.update({
          where: { id: tenant.id },
          data: {
            subscriptionStatus: 'ACTIVE',
            trialEndsAt: null,
          },
        });
      });

      console.log(
        `[RAZORPAY_WEBHOOK_SUCCESS] Studio "${tenant.name}" (${tenant.id}) activated on plan "${plan.name}" until ${newEndDate.toISOString()}`
      );

      return NextResponse.json({
        status: 'ok',
        received: true,
        message: 'Payment captured and subscription activated successfully.',
      });
    }

    // 5. Handle Payment Failure Events
    if (event === 'payment.failed') {
      const payment = body.payload?.payment?.entity;
      const razorpayOrderId = payment?.order_id;
      const razorpayPaymentId = payment?.id;

      if (razorpayOrderId) {
        await prisma.billingTransaction.updateMany({
          where: { razorpayOrderId },
          data: {
            status: 'FAILED',
            razorpayPaymentId,
          },
        });
        console.warn(
          `[RAZORPAY_WEBHOOK_PAYMENT_FAILED] Order "${razorpayOrderId}" marked as FAILED.`
        );
      }

      return NextResponse.json({
        status: 'ok',
        received: true,
        message: 'Payment failure recorded.',
      });
    }

    // Acknowledge other webhook events
    return NextResponse.json({
      status: 'ok',
      received: true,
      message: `Event "${event}" acknowledged.`,
    });
  } catch (error: any) {
    console.error('[RAZORPAY_WEBHOOK_EXCEPTION]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while processing webhook.' },
      { status: 500 }
    );
  }
}
