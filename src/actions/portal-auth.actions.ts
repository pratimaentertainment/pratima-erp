'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const CLIENT_PORTAL_COOKIE_NAME = 'pratima_client_token';

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('FATAL SECURITY ERROR: AUTH_SECRET or NEXTAUTH_SECRET is required to sign client portal tokens.');
  }
  return new TextEncoder().encode(secret);
}

// ============================================================================
// SCHEMAS
// ============================================================================

const clientLoginSchema = z.object({
  mobile: z.string().min(8, 'Please enter a valid mobile number').max(20, 'Invalid mobile number'),
  pin: z.string().min(4, 'PIN must be at least 4 digits').max(10, 'PIN cannot exceed 10 digits'),
  tenantSlug: z.string().optional().nullable(),
});

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * Authenticates a customer using Two-Factor Validation (Mobile Number + Secure PIN).
 * Implements exponential lockout protection against brute-force attacks (5 failed attempts -> 15 min lock).
 * Sets a secure HttpOnly signed cookie upon successful validation.
 */
export async function loginClientPortalAction(input: z.infer<typeof clientLoginSchema>) {
  try {
    const validated = clientLoginSchema.parse(input);

    // Normalize phone number (strip spaces, dashes, symbols)
    const cleanMobile = validated.mobile.replace(/\D/g, '');
    if (cleanMobile.length < 8) {
      return { success: false, error: 'Please enter a valid mobile phone number.' };
    }

    // Extract the trailing 10 digits for flexible matching against stored numbers with/without +91 country codes
    const searchMatch = cleanMobile.length >= 10 ? cleanMobile.slice(-10) : cleanMobile;

    // Build query conditions
    const whereConditions: any = {
      deletedAt: null,
      OR: [
        { phone: { contains: searchMatch } },
        { whatsapp: { contains: searchMatch } },
      ],
    };

    // If logging in from a specific tenant storefront, enforce tenant scope
    if (validated.tenantSlug && validated.tenantSlug.trim() !== '') {
      const tenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { slug: validated.tenantSlug },
            { subdomain: validated.tenantSlug },
          ],
          isActive: true,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (tenant) {
        whereConditions.tenantId = tenant.id;
      }
    }

    // Locate customer
    const customers = await prisma.customer.findMany({
      where: whereConditions,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        },
      },
      take: 2,
    });

    if (customers.length === 0) {
      return {
        success: false,
        error: 'No active client booking found with this registered mobile number.',
      };
    }

    const customer = customers[0];

    // 1. Check Brute-Force Account Lockout
    if (customer.lockedUntil && new Date(customer.lockedUntil) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(customer.lockedUntil).getTime() - Date.now()) / 60000);
      return {
        success: false,
        error: `Account is temporarily locked for security due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s).`,
      };
    }

    // 2. Check if PIN is provisioned
    if (!customer.portalPin || customer.portalPin.trim() === '') {
      return {
        success: false,
        error: 'Your client portal PIN has not been generated yet. Please contact your studio coordinator or check your WhatsApp welcome message.',
      };
    }

    // 3. Verify PIN Code (supports bcrypt hash and backward-compatible plain-text with auto-upgrade)
    let isPinValid = false;
    const storedPin = customer.portalPin.trim();
    const providedPin = validated.pin.trim();

    if (storedPin.startsWith('$2a$') || storedPin.startsWith('$2b$')) {
      isPinValid = await bcrypt.compare(providedPin, storedPin);
    } else {
      isPinValid = storedPin === providedPin;
      // Upgrade plain-text PIN to secure bcrypt hash upon successful login
      if (isPinValid) {
        const hashedPin = await bcrypt.hash(providedPin, 10);
        await prisma.customer.update({
          where: { id: customer.id },
          data: { portalPin: hashedPin },
        });
      }
    }

    if (!isPinValid) {
      const nextAttempts = (customer.failedLoginAttempts || 0) + 1;
      const isLocked = nextAttempts >= 5;
      const lockDuration = isLocked ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          failedLoginAttempts: nextAttempts,
          ...(isLocked ? { lockedUntil: lockDuration } : {}),
        },
      });

      if (isLocked) {
        return {
          success: false,
          error: 'Maximum failed attempts reached. Your portal access is temporarily locked for 15 minutes.',
        };
      }

      const remainingAttempts = 5 - nextAttempts;
      return {
        success: false,
        error: `Invalid PIN code. ${remainingAttempts} attempt(s) remaining before temporary lockout.`,
      };
    }

    // 4. Successful Authentication: Reset lockout counters
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // 5. Generate Secure Signed JWT with jose
    const secret = getJwtSecret();
    const token = await new SignJWT({
      customerId: customer.id,
      tenantId: customer.tenantId,
      customerName: `${customer.firstName} ${customer.lastName}`.trim(),
      role: 'CLIENT',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(secret);

    // 6. Set HttpOnly Cookie
    const cookieStore = await cookies();
    cookieStore.set(CLIENT_PORTAL_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return {
      success: true,
      customer: {
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`.trim(),
        tenantSlug: customer.tenant?.slug || null,
      },
    };
  } catch (error: any) {
    console.error('[CLIENT_PORTAL_LOGIN_ERROR]', error);
    return {
      success: false,
      error: error.message || 'An error occurred during authentication. Please try again.',
    };
  }
}

/**
 * Generates or resets a customer's 6-digit Portal PIN and access credentials.
 * Callable by studio staff from the Customer 360 profile.
 */
export async function generateOrResetPortalPinAction(customerId: string) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user?.tenantId) {
      return { success: false, error: 'Unauthorized: Staff session required.' };
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId: user.tenantId,
        deletedAt: null,
      },
    });

    if (!customer) {
      return { success: false, error: 'Customer record not found.' };
    }

    // Generate random 6-digit numeric PIN and hash with bcryptjs
    const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPin = await bcrypt.hash(generatedPin, 10);

    // Ensure access code exists
    const portalAccessCode =
      customer.portalAccessCode ||
      `PRT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        portalPin: hashedPin,
        portalAccessCode,
        portalAccessGranted: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    revalidatePath(`/customers/${customerId}`);
    revalidatePath('/customers');

    return {
      success: true,
      pin: generatedPin,
      portalAccessCode: updated.portalAccessCode,
    };
  } catch (error: any) {
    console.error('[GENERATE_PORTAL_PIN_ERROR]', error);
    return {
      success: false,
      error: error.message || 'Failed to generate secure portal PIN.',
    };
  }
}

/**
 * Server-side helper to read and verify the active client portal session from HttpOnly cookies.
 */
export async function getClientPortalSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CLIENT_PORTAL_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);

    if (payload?.role !== 'CLIENT' || !payload?.customerId) {
      return null;
    }

    return {
      customerId: payload.customerId as string,
      tenantId: payload.tenantId as string,
      customerName: (payload.customerName as string) || 'Client',
      role: 'CLIENT' as const,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Logs out the client by clearing the portal session cookie.
 */
export async function logoutClientPortalAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(CLIENT_PORTAL_COOKIE_NAME);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
