'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CreditCard, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { loadRazorpayScript } from '@/lib/razorpay-loader';
import type {
  RazorpayCheckoutOptions,
  RazorpaySuccessResponse,
  RazorpayFailureResponse,
} from '@/types/razorpay';
import { cn } from '@/lib/utils';

export interface RazorpayCheckoutButtonProps {
  planId?: string;
  purchaseType?: 'SUBSCRIPTION' | 'PER_EVENT_AI' | 'AI_CREDIT_PACK';
  eventBookingId?: string;
  addonFeatureKey?: string;
  billingCycle?: 'MONTHLY' | 'ANNUAL';
  addonKeys?: string[];
  dealerCode?: string;
  buttonText?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  showIcon?: boolean;
  onSuccess?: (response: RazorpaySuccessResponse) => void;
  onError?: (errorDescription: string) => void;
}

/**
 * Enterprise Client Component for Razorpay SaaS Subscription & On-Demand Add-on Checkout.
 * Initiates server-side order generation, loads client SDK, and handles modal lifecycle.
 * Supports subscriptions, pay-per-event AI unlocks, and prepaid credit packs.
 */
export function RazorpayCheckoutButton({
  planId,
  purchaseType = 'SUBSCRIPTION',
  eventBookingId,
  addonFeatureKey,
  billingCycle = 'MONTHLY',
  addonKeys,
  dealerCode,
  buttonText = 'Upgrade Now',
  className,
  variant = 'default',
  size = 'default',
  disabled = false,
  showIcon = true,
  onSuccess,
  onError,
}: RazorpayCheckoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleCheckout = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isLoading || disabled) return;

    setIsLoading(true);

    try {
      // 1. Request signed order from server
      const orderResponse = await fetch('/api/billing/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseType,
          planId,
          eventBookingId,
          addonFeatureKey,
          billingCycle,
          addonKeys,
          dealerCode,
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok || !orderData.success) {
        throw new Error(
          orderData.error || 'Failed to initialize payment order. Please check your credentials.'
        );
      }

      // 2. Dynamically load client-side Razorpay checkout.js script
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady || typeof window.Razorpay !== 'function') {
        throw new Error(
          'Unable to load Razorpay payment gateway. Please verify your network connection.'
        );
      }

      // 3. Configure Checkout Options
      const options: RazorpayCheckoutOptions = {
        key: orderData.keyId,
        amount: orderData.amount, // in paise
        currency: orderData.currency || 'INR',
        name: 'FRAMIQ by Pratima Entertainment & Technology',
        description:
          orderData.description ||
          `${orderData.plan?.name || 'Studio'} Plan (${
            billingCycle === 'ANNUAL' ? 'Annual Billing' : 'Monthly Billing'
          })`,
        image: '/icon.png',
        order_id: orderData.orderId,
        prefill: {
          name: orderData.customer?.name || '',
          email: orderData.customer?.email || '',
          contact: orderData.customer?.contact || '',
        },
        theme: {
          color: '#09090b',
          backdrop_color: 'rgba(0, 0, 0, 0.65)',
        },
        modal: {
          confirm_close: true,
          ondismiss: () => {
            setIsLoading(false);
            toast.info('Checkout cancelled');
          },
        },
        handler: (response: RazorpaySuccessResponse) => {
          (async () => {
            try {
              toast.loading('Verifying secure payment and activating entitlements...', {
                id: 'razorpay-verify',
              });

              const verifyResponse = await fetch('/api/billing/razorpay/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  purchaseType,
                  planId,
                  eventBookingId,
                  addonFeatureKey,
                  billingCycle,
                  addonKeys,
                  dealerCode,
                }),
              });

              const verifyData = await verifyResponse.json();

              if (!verifyResponse.ok || !verifyData.success) {
                throw new Error(verifyData.error || 'Payment signature verification failed.');
              }

              toast.success('Payment verified! Entitlements activated successfully.', {
                id: 'razorpay-verify',
              });

              if (onSuccess) {
                onSuccess(response);
              }

              // Hard reload to completely flush the Next.js router cache and instantly break any Hard Lock
              window.location.reload();
            } catch (verifyErr: any) {
              setIsLoading(false);
              console.error('[Razorpay Verification Error]', verifyErr);
              const errorMsg =
                verifyErr.message || 'Payment verification failed. Please contact support.';
              toast.error(errorMsg, { id: 'razorpay-verify' });
              if (onError) {
                onError(errorMsg);
              }
            }
          })();
        },
      };

      // 4. Instantiate and open Razorpay Checkout modal
      const razorpayInstance = new window.Razorpay(options);

      razorpayInstance.on('payment.failed', (failureResponse: RazorpayFailureResponse) => {
        setIsLoading(false);
        const reason =
          failureResponse?.error?.description ||
          failureResponse?.error?.reason ||
          'Payment processing failed.';
        toast.error(`Payment Failed: ${reason}`);
        if (onError) {
          onError(reason);
        }
      });

      razorpayInstance.open();
    } catch (err: any) {
      setIsLoading(false);
      console.error('[RazorpayCheckoutButton Error]', err);
      const message = err.message || 'An unexpected error occurred during checkout.';
      toast.error(message);
      if (onError) {
        onError(message);
      }
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={disabled || isLoading}
      onClick={handleCheckout}
      className={cn('gap-2 font-semibold shadow-xs transition-all', className)}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>Opening Checkout...</span>
        </>
      ) : (
        <>
          {showIcon && <CreditCard className="h-4 w-4 shrink-0" />}
          <span>{buttonText}</span>
        </>
      )}
    </Button>
  );
}
