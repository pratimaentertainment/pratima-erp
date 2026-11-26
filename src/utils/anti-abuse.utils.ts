import crypto from 'crypto';

// 120+ known disposable / throwaway email domains
const DISPOSABLE_DOMAINS = new Set<string>([
  '10minutemail.com',
  '10minutemail.net',
  '10minutemail.co.uk',
  'tempmail.com',
  'temp-mail.org',
  'temp-mail.io',
  'temp-mail.ru',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.biz',
  'guerrillamailblock.com',
  'sharklasers.com',
  'grr.la',
  'spam4.me',
  'mailinator.com',
  'mailinator.net',
  'mailin8r.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'cool.fr.nf',
  'jetable.fr.nf',
  'nospam.ze.tc',
  'nomail.xl.cx',
  'mega.zik.dj',
  'speed.1s.fr',
  'courriel.fr.nf',
  'moncourrier.fr.nf',
  'monemail.fr.nf',
  'monmail.fr.nf',
  'throwawaymail.com',
  'trashmail.com',
  'trashmail.net',
  'trashmail.me',
  'getnada.com',
  'dispostable.com',
  'mohmal.com',
  'fakemailgenerator.com',
  'emailondeck.com',
  'mytemp.email',
  'crazymailing.com',
  'maildrop.cc',
  'generator.email',
  'inboxkitten.com',
  'mintemail.com',
  'tempail.com',
  'burnerdirectory.com',
  'burnermail.io',
  'tempinbox.com',
  'zillamail.com',
  'nada.ltd',
  'dropmail.me',
  'clipmail.eu',
  'luxusmail.org',
  'bupmail.com',
  'disposablemail.com',
  'tmpmail.org',
  'tmpmail.net',
  'tempr.email',
  'disposable.com',
  'discard.email',
  'discardmail.com',
  'spambox.us',
  'trash-mail.com',
  'mailnesia.com',
  'harakirimail.com',
  'tmailor.com',
  'smailpro.com',
  'inboxbear.com',
  'burner.email',
  'getairmail.com',
  'fakeinbox.com',
  'crazymail.com',
  'dayrep.com',
  'teleworm.us',
  'rhyta.com',
  'armyspy.com',
  'cuvox.de',
  'superrito.com',
  'jourrapide.com',
  'einrot.com',
  'fleckens.hu',
  'gustr.com',
  'chacuo.net',
  '0-mail.com',
  '0815.ru',
  '0clickemail.com',
  '0wnd.net',
  '0wnd.org',
  '10mail.org',
  '20minutemail.com',
  '2prong.com',
  '30minutemail.com',
  '3d-painting.com',
  '4warding.com',
  '4warding.net',
  '4warding.org',
  '9ox.net',
  'a-bc.net',
  'amilegit.com',
  'anonaddy.com',
  'anonaddy.me',
  'anonymbox.com',
  'antichef.com',
  'antichef.net',
  'binkmail.com',
  'bobmail.info',
  'bodhi.lawlita.com',
  'bofthew.com',
  'boun.cr',
  'bouncr.com',
  'breakthru.com',
  'bsnow.net',
  'bugmenot.com',
  'bund.us',
  'cachedot.net',
  'casualdx.com',
  'chogmail.com',
  'clrmail.com',
  'cmail.club',
  'cosmorph.com',
  'courrieltemporaire.com',
  'crapmail.org',
  'cross-law.com',
  'cust.in',
]);

/**
 * Strips sub-addressing (+tags) and provider-specific quirks (e.g. dots in Gmail)
 * to produce a canonical representation of the inbox identity.
 *
 * Examples:
 * - "royal.studio+trial2@gmail.com" -> "royalstudio@gmail.com"
 * - "studio+test@outlook.com"       -> "studio@outlook.com"
 * - "photographer@yahoo.com"       -> "photographer@yahoo.com"
 */
export function canonicalizeEmail(email: string): string {
  const clean = (email || '').trim().toLowerCase();
  const atIndex = clean.lastIndexOf('@');
  if (atIndex === -1) return clean;

  let local = clean.slice(0, atIndex);
  let domain = clean.slice(atIndex + 1);

  // Normalize Google domains
  if (domain === 'googlemail.com') {
    domain = 'gmail.com';
  }

  if (domain === 'gmail.com') {
    // Gmail ignores dots and anything after '+'
    local = local.split('+')[0];
    local = local.replace(/\./g, '');
    return `${local}@${domain}`;
  }

  // Microsoft, Apple, Yahoo sub-addressing (+tag stripping)
  if (
    domain === 'outlook.com' ||
    domain === 'hotmail.com' ||
    domain === 'live.com' ||
    domain === 'msn.com' ||
    domain === 'icloud.com' ||
    domain === 'me.com' ||
    domain === 'mac.com' ||
    domain === 'yahoo.com' ||
    domain === 'ymail.com'
  ) {
    local = local.split('+')[0];
    if (domain.startsWith('yahoo')) {
      local = local.split('-')[0];
    }
    return `${local}@${domain}`;
  }

  // Generic fallback: strip '+' alias if present
  local = local.split('+')[0];
  return `${local}@${domain}`;
}

/**
 * Validates whether an email belongs to a disposable or throwaway domain.
 */
export function isDisposableEmail(email: string): boolean {
  const clean = (email || '').trim().toLowerCase();
  const atIndex = clean.lastIndexOf('@');
  if (atIndex === -1) return false;

  const domain = clean.slice(atIndex + 1);
  return DISPOSABLE_DOMAINS.has(domain);
}

/**
 * Normalizes Indian mobile phone numbers into a strict 10-digit format (starting with 6-9).
 */
export function normalizeIndianPhone(phone: string): string {
  let digits = (phone || '').replace(/\D/g, '');

  // Strip international country code if present (e.g. 919876543210 -> 9876543210)
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return digits.slice(-10);
}

/**
 * Generates a stable device/network fingerprint hash for trial attribution.
 */
export function generateDeviceFingerprintHash(
  ipAddress?: string,
  userAgent?: string,
  clientSeed?: string
): string {
  const payload = [
    (ipAddress || 'unknown-ip').trim(),
    (userAgent || 'unknown-ua').trim(),
    (clientSeed || '').trim(),
  ].join('|');

  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 32);
}
