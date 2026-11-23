import crypto from 'crypto';
import { cookies } from 'next/headers';

export const IMPERSONATION_COOKIE_NAME = 'pratima_impersonation';
export const IMPERSONATION_TTL_MS = 15 * 60 * 1000; // Strict 15-minute TTL

export interface ImpersonationState {
  superAdminId: string;
  superAdminEmail: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Resolves the signing secret for impersonation tokens.
 */
function getSecretKey(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'pratima-super-admin-impersonation-secret';
  return secret;
}

/**
 * Creates a cryptographically signed HMAC-SHA256 token encoding the impersonation state.
 * Format: `<base64urlPayload>.<base64urlSignature>`
 */
export function signImpersonationToken(payload: ImpersonationState): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSecretKey())
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

/**
 * Verifies and decodes an HMAC-SHA256 impersonation token.
 * Performs constant-time comparison to prevent timing attacks.
 * Returns null if token is malformed, invalid signature, or expired.
 */
export function verifyImpersonationToken(token: string): ImpersonationState | null {
  try {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [data, signature] = parts;
    if (!data || !signature) return null;

    const expectedSignature = crypto
      .createHmac('sha256', getSecretKey())
      .update(data)
      .digest('base64url');

    const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
    const actualBuf = Buffer.from(signature, 'utf-8');

    if (expectedBuf.length !== actualBuf.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      return null;
    }

    const payloadStr = Buffer.from(data, 'base64url').toString('utf-8');
    const payload: ImpersonationState = JSON.parse(payloadStr);

    // Validate payload shape
    if (
      !payload.superAdminId ||
      !payload.tenantId ||
      !payload.expiresAt ||
      typeof payload.expiresAt !== 'number'
    ) {
      return null;
    }

    // Strict 15-minute expiration check
    if (Date.now() > payload.expiresAt) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Reads and verifies the current active impersonation cookie.
 * Returns the ImpersonationState or null if no valid/unexpired session exists.
 */
export async function getActiveImpersonationState(): Promise<ImpersonationState | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(IMPERSONATION_COOKIE_NAME);
    if (!cookie?.value) return null;

    return verifyImpersonationToken(cookie.value);
  } catch {
    return null;
  }
}
