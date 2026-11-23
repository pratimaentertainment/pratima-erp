import Razorpay from 'razorpay';
import crypto from 'crypto';
import type { Orders } from 'razorpay/dist/types/orders';

export type RazorpayOrder = Orders.RazorpayOrder;

export interface CreateOrderParams {
  amountInPaise: number;
  receiptId: string;
  notes?: Record<string, string | number>;
  currency?: string;
}

/**
 * Enterprise Singleton Service for Razorpay Payment Gateway integration.
 * Manages order creation, webhook verification, and payment signature validation.
 */
export class RazorpayService {
  private static instance: RazorpayService | null = null;
  private client: Razorpay | null = null;

  private constructor() {
    // Lazy initialization handled in getClient()
  }

  /**
   * Retrieves the singleton instance of RazorpayService
   */
  public static getInstance(): RazorpayService {
    if (!RazorpayService.instance) {
      RazorpayService.instance = new RazorpayService();
    }
    return RazorpayService.instance;
  }

  /**
   * Lazily initializes and validates the Razorpay SDK instance.
   * Throws a fatal descriptive error if credentials are absent.
   */
  public getClient(): Razorpay {
    if (this.client) {
      return this.client;
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      const errorMsg =
        '[RazorpayService Fatal Error] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing from the environment. ' +
        'Please configure valid Razorpay credentials in your environment variables.';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    this.client = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    return this.client;
  }

  /**
   * Generates a new Razorpay Order for a tenant subscription or billing transaction.
   *
   * @param amountInPaise - Order amount in smallest currency unit (e.g., paise for INR)
   * @param receiptId - Internal receipt tracking ID (max 40 characters)
   * @param notes - Key-value metadata attached to the order
   * @param currency - 3-letter ISO currency code (default: 'INR')
   * @returns The generated RazorpayOrder object
   */
  public async createOrder(
    amountInPaise: number,
    receiptId: string,
    notes?: Record<string, string | number>,
    currency: string = 'INR'
  ): Promise<RazorpayOrder> {
    if (!amountInPaise || amountInPaise <= 0) {
      throw new Error(
        `[RazorpayService] Invalid order amount: ${amountInPaise}. Amount in paise must be a positive integer.`
      );
    }

    // Razorpay receipt length limit is 40 characters
    const sanitizedReceipt = receiptId.trim().slice(0, 40);

    const client = this.getClient();
    const order = await client.orders.create({
      amount: Math.round(amountInPaise),
      currency,
      receipt: sanitizedReceipt,
      notes: notes || {},
    });

    return order;
  }

  /**
   * Validates incoming webhook signatures using crypto.createHmac ('sha256')
   * with constant-time equality check to prevent timing analysis attacks.
   *
   * @param rawBody - Raw unparsed webhook request payload string
   * @param signature - Signature provided in 'x-razorpay-signature' header
   * @param secret - Optional secret override (defaults to process.env.RAZORPAY_WEBHOOK_SECRET)
   * @returns boolean indicating whether the webhook signature is authentic
   */
  public verifyWebhookSignature(
    rawBody: string,
    signature: string,
    secret?: string
  ): boolean {
    const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('[RazorpayService] RAZORPAY_WEBHOOK_SECRET is not configured in environment.');
      return false;
    }

    if (!rawBody || !signature) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      const signatureBuffer = Buffer.from(signature, 'utf8');

      if (expectedBuffer.length !== signatureBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
    } catch (err) {
      console.error('[RazorpayService] Webhook signature verification error:', err);
      return false;
    }
  }

  /**
   * Validates checkout payment signatures returned from Razorpay client-side handler.
   * Formula: hmac_sha256(order_id + "|" + razorpay_payment_id, secret)
   *
   * @param orderId - Razorpay order ID
   * @param paymentId - Razorpay payment ID
   * @param signature - Razorpay signature returned by checkout callback
   * @param secret - Optional secret override (defaults to process.env.RAZORPAY_KEY_SECRET)
   * @returns boolean indicating whether the checkout payment is authentic
   */
  public verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string,
    secret?: string
  ): boolean {
    const keySecret = secret || process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      console.error('[RazorpayService] RAZORPAY_KEY_SECRET is not configured in environment.');
      return false;
    }

    try {
      const payload = `${orderId}|${paymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(payload)
        .digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      const signatureBuffer = Buffer.from(signature, 'utf8');

      if (expectedBuffer.length !== signatureBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
    } catch (err) {
      console.error('[RazorpayService] Payment signature verification error:', err);
      return false;
    }
  }

  /**
   * Static helper for validating payment signatures.
   */
  public static verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string,
    secret?: string
  ): boolean {
    return RazorpayService.getInstance().verifyPaymentSignature(orderId, paymentId, signature, secret);
  }
}

export const razorpayService = RazorpayService.getInstance();
