'use server';

import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import {
  publicSignupSchema,
  publicSignupVerifySchema,
  type PublicSignupInput,
  type PublicSignupVerifyInput,
} from '@/schemas/auth.schema';
import { DealerCommissionService } from '@/services/billing/dealer-commission.service';
import {
  canonicalizeEmail,
  isDisposableEmail,
  normalizeIndianPhone,
  generateDeviceFingerprintHash,
} from '@/utils/anti-abuse.utils';
import { sendSecurityOtpEmail } from '@/lib/mailer';

/**
 * Generates a city-aware URL-safe unique slug for a newly registered studio.
 * Supports identical studio names across different cities (e.g. "Royal Studio" in Kolhapur
 * becomes "royal-studio-kolhapur", while in Pune becomes "royal-studio-pune").
 */
async function generateUniqueSlug(name: string, city: string): Promise<string> {
  const cleanName =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'studio';

  const cleanCity =
    city
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const baseSlug = cleanCity ? `${cleanName}-${cleanCity}` : cleanName;

  const existing = await prisma.tenant.findUnique({
    where: { slug: baseSlug },
  });

  if (!existing) {
    return baseSlug;
  }

  // If both studio name AND city collide, append a short random alphanumeric suffix
  for (let i = 0; i < 5; i++) {
    const candidate = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
    const collision = await prisma.tenant.findUnique({
      where: { slug: candidate },
    });
    if (!collision) {
      return candidate;
    }
  }

  return `${baseSlug}-${Date.now().toString().slice(-4)}`;
}

/**
 * Step 1: Validate Studio Details, Enforce Anti-Abuse (Disposable, Canonical Email, IP Limits)
 * and Dispatch 6-Digit Email OTP before trial account creation.
 */
export async function requestSignupOtpAction(input: PublicSignupInput) {
  try {
    const validated = publicSignupSchema.parse(input);

    // 1. Anti-Abuse Check: Block temporary/disposable email services
    if (isDisposableEmail(validated.email)) {
      return {
        success: false,
        error:
          'Temporary or disposable email services are not permitted. Please use your studio or genuine business email address.',
      };
    }

    // 2. Normalize and check canonical email (stripping +tags, gmail dots, etc.)
    const canonicalEmail = canonicalizeEmail(validated.email);
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validated.email.trim().toLowerCase() },
          { canonicalEmail },
        ],
      },
    });

    if (existingUser) {
      return {
        success: false,
        error:
          'An account with this email address (or alias) is already registered. Please log in or use your primary studio email.',
      };
    }

    // 3. Normalize Indian mobile number and verify uniqueness across existing studios
    const cleanPhone = normalizeIndianPhone(validated.mobileNumber);
    const formattedPhone = `+91 ${cleanPhone}`;

    const existingTenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { contactPhone: cleanPhone },
          { contactPhone: formattedPhone },
          { contactPhone: `+91${cleanPhone}` },
          { phone: cleanPhone },
          { phone: formattedPhone },
        ],
      },
    });

    if (existingTenant) {
      return {
        success: false,
        error: `Mobile number "${cleanPhone}" is already registered with an existing studio. Please log in or use a different number.`,
      };
    }

    // 4. Rate-Limiting & Anti-Abuse: Max 2 free-trial studios per IP/Device within 30 days
    const reqHeaders = await headers();
    const rawIp =
      reqHeaders.get('x-forwarded-for') ||
      reqHeaders.get('x-real-ip') ||
      '127.0.0.1';
    const ipAddress = rawIp.split(',')[0].trim();
    const userAgent = reqHeaders.get('user-agent') || 'Unknown';
    const deviceFingerprint = generateDeviceFingerprintHash(ipAddress, userAgent);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentTrialsCount = await prisma.tenant.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        OR: [{ signupIp: ipAddress }, { deviceFingerprint }],
      },
    });

    if (recentTrialsCount >= 2) {
      return {
        success: false,
        error:
          'Maximum free trial limit reached from this network or device. To create additional studio workspaces, please subscribe or contact support.',
      };
    }

    // 5. Invalidate any prior pending signup OTPs for this email address
    await prisma.signupVerification.updateMany({
      where: {
        email: validated.email.trim().toLowerCase(),
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    // 6. Generate cryptographically secure 6-digit numeric OTP and store SHA-256 hash
    const otp = Math.floor(100000 + crypto.randomInt(900000)).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    await prisma.signupVerification.create({
      data: {
        email: validated.email.trim().toLowerCase(),
        canonicalEmail,
        phone: cleanPhone,
        hashedOtp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        attempts: 0,
      },
    });

    // 7. Dispatch verification code via transactional email
    await sendSecurityOtpEmail({
      to: validated.email.trim(),
      userName: validated.ownerName.trim(),
      otp,
      purpose: 'SIGNUP_VERIFICATION',
    });

    return {
      success: true,
      message: `A 6-digit verification code has been dispatched to ${validated.email}. Please enter it to complete your studio setup.`,
    };
  } catch (error: any) {
    console.error('[requestSignupOtpAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to dispatch verification code. Please check your details.',
    };
  }
}

/**
 * Step 2: Verify 6-Digit Email OTP and atomically provision Studio Tenant,
 * Headquarters Branch (with City), Owner User, and 15-Day Free Trial.
 */
export async function verifySignupOtpAndCreateStudioAction(input: PublicSignupVerifyInput) {
  try {
    const validated = publicSignupVerifySchema.parse(input);

    // 1. Locate active verification record for this email
    const verification = await prisma.signupVerification.findFirst({
      where: {
        email: validated.email.trim().toLowerCase(),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      return {
        success: false,
        error:
          'Verification code has expired or was not requested. Please request a new code.',
      };
    }

    // 2. Enforce brute-force attempt lockout on OTP verification
    if (verification.attempts >= 5) {
      await prisma.signupVerification.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      });
      return {
        success: false,
        error:
          'Too many invalid verification attempts. For your security, this code has been deactivated. Please request a new code.',
      };
    }

    const hashedInput = crypto.createHash('sha256').update(validated.otp.trim()).digest('hex');

    if (hashedInput !== verification.hashedOtp) {
      const nextAttempts = verification.attempts + 1;
      await prisma.signupVerification.update({
        where: { id: verification.id },
        data: { attempts: nextAttempts },
      });
      const remaining = Math.max(0, 5 - nextAttempts);
      return {
        success: false,
        error: `Invalid verification code. (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)`,
      };
    }

    // Mark verification as successfully consumed
    await prisma.signupVerification.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    });

    // 3. Final collision check on phone and email before atomic commit
    const cleanPhone = normalizeIndianPhone(validated.mobileNumber);
    const formattedPhone = `+91 ${cleanPhone}`;
    const canonicalEmail = canonicalizeEmail(validated.email);
    const normalizedEmail = validated.email.trim().toLowerCase();

    const existingTenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { contactPhone: cleanPhone },
          { contactPhone: formattedPhone },
          { contactPhone: `+91${cleanPhone}` },
          { phone: cleanPhone },
          { phone: formattedPhone },
        ],
      },
    });

    if (existingTenant) {
      return {
        success: false,
        error: `Mobile number "${cleanPhone}" is already registered. Please log in instead.`,
      };
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { canonicalEmail }],
      },
    });

    if (existingUser) {
      return {
        success: false,
        error: `An account with email "${normalizedEmail}" already exists. Please log in instead.`,
      };
    }

    // 4. Capture Client Network Identity & Evaluate Suspected Duplicate Flag
    const reqHeaders = await headers();
    const rawIp =
      reqHeaders.get('x-forwarded-for') ||
      reqHeaders.get('x-real-ip') ||
      '127.0.0.1';
    const ipAddress = rawIp.split(',')[0].trim();
    const userAgent = reqHeaders.get('user-agent') || 'Unknown';
    const deviceFingerprint = generateDeviceFingerprintHash(
      ipAddress,
      userAgent,
      validated.deviceSeed
    );

    // Business Anti-Abuse Rule:
    // Only mark isSuspectedDuplicate: true if:
    // (a) Exact same studio name inside the EXACT SAME city already exists, OR
    // (b) A prior tenant was created from the exact same signup IP / device fingerprint.
    // NOTE: Different cities sharing the same studio name are 100% legitimate and NEVER flagged!
    const sameNameAndCity = await prisma.tenant.findFirst({
      where: {
        name: { equals: validated.studioName.trim(), mode: 'insensitive' },
        city: { equals: validated.city.trim(), mode: 'insensitive' },
      },
    });

    const priorFromNetwork = await prisma.tenant.findFirst({
      where: {
        OR: [{ signupIp: ipAddress }, { deviceFingerprint }],
      },
    });

    const isSuspectedDuplicate = Boolean(sameNameAndCity || priorFromNetwork);

    // 5. Generate City-Aware Unique Slug
    const slug = await generateUniqueSlug(validated.studioName, validated.city);

    // 6. Hash Password & Calculate 15-day Free Trial
    const hashedPassword = await bcrypt.hash(validated.password, 10);
    const trialEndsAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

    // 7. Resolve target subscription plan
    let targetPlan = null;
    if (validated.planId) {
      targetPlan = await prisma.subscriptionPlan.findFirst({
        where: { id: validated.planId, isActive: true },
      });
    }

    if (!targetPlan) {
      targetPlan = await prisma.subscriptionPlan.findFirst({
        where: { isActive: true },
        orderBy: { monthlyPrice: 'asc' },
      });
    }

    // 8. Resolve dealer referral code if provided
    let referredByDealerId: string | null = null;
    if (validated.referralCode && validated.referralCode.trim()) {
      const activeDealer = await DealerCommissionService.resolveActiveDealerByCode(
        validated.referralCode.trim()
      );
      if (activeDealer) {
        // Anti-Fraud Guard: Prevent dealer from self-referring their own studio
        const dealerFull = await prisma.dealerProfile.findUnique({
          where: { id: activeDealer.id },
          include: { user: { select: { email: true, canonicalEmail: true, phone: true } } },
        });

        const dealerEmail = (dealerFull?.user?.email || '').toLowerCase().trim();
        const dealerCanonical = (dealerFull?.user?.canonicalEmail || dealerEmail).toLowerCase().trim();
        const dealerPhone = (dealerFull?.phone || '').replace(/\D/g, '').slice(-10);

        const isSelf =
          (dealerEmail && dealerEmail === normalizedEmail) ||
          (dealerCanonical && dealerCanonical === canonicalEmail) ||
          (dealerPhone && dealerPhone === cleanPhone);

        if (isSelf) {
          console.warn(
            `[SIGNUP_ANTI_FRAUD] Blocked self-referral signup attribution for dealer code "${activeDealer.dealerCode}" from email "${normalizedEmail}".`
          );
        } else {
          referredByDealerId = activeDealer.id;
        }
      }
    }

    // 9. Atomic Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create Tenant with City, Network Attribution, and 15-Day Trial
      const tenant = await tx.tenant.create({
        data: {
          name: validated.studioName.trim(),
          slug,
          city: validated.city.trim(),
          contactPhone: formattedPhone,
          phone: formattedPhone,
          email: normalizedEmail,
          subscriptionStatus: 'TRIAL',
          trialEndsAt,
          signupIp: ipAddress,
          signupUserAgent: userAgent,
          deviceFingerprint,
          isSuspectedDuplicate,
          referredByDealerId,
        },
      });

      // Create default Head Office Branch in the studio's city
      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: `${validated.studioName.trim()} Headquarters`,
          city: validated.city.trim(),
          isHeadOffice: true,
          isActive: true,
        },
      });

      // Create initial User with TENANT_OWNER role and canonical email
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: normalizedEmail,
          canonicalEmail,
          phone: formattedPhone,
          name: validated.ownerName.trim(),
          passwordHash: hashedPassword,
          role: Role.TENANT_OWNER,
          status: 'ACTIVE',
          canLogin: true,
          mustChangePassword: false,
        },
      });

      // Associate User with Headquarters branch
      await tx.userBranch.create({
        data: {
          userId: user.id,
          branchId: branch.id,
          isPrimary: true,
          isActive: true,
        },
      });

      // Associate Tenant with selected Subscription Plan on 15-Day Free Trial
      if (targetPlan) {
        await tx.tenantSubscription.create({
          data: {
            tenantId: tenant.id,
            planId: targetPlan.id,
            billingCycle: validated.billingCycle || 'MONTHLY',
            startDate: new Date(),
            endDate: trialEndsAt,
          },
        });
      }

      return { tenant, user, branch, plan: targetPlan };
    });

    revalidatePath('/super-admin');

    return {
      success: true,
      message: `Studio "${result.tenant.name}" in ${validated.city} registered successfully! Please log in to continue.`,
      data: {
        tenantId: result.tenant.id,
        studioName: result.tenant.name,
        city: result.tenant.city,
        slug: result.tenant.slug,
        email: result.user.email,
        planId: result.plan?.id,
      },
    };
  } catch (error: any) {
    console.error('[verifySignupOtpAndCreateStudioAction] Error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred while completing studio registration.',
    };
  }
}

/**
 * Backward-compatible single-step / direct API signup action
 */
export async function registerPublicStudioAction(input: any) {
  if (input?.otp) {
    return verifySignupOtpAndCreateStudioAction(input);
  }
  return requestSignupOtpAction(input);
}
