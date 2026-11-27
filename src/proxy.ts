import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const { auth } = NextAuth(authConfig);

/**
 * Enterprise NextAuth Proxy for FRAMIQ (Next.js 16 `proxy.ts` convention)
 * - Enforces Edge-compatible IP-based Rate Limiting (DDoS & Brute-Force defense).
 * - Strictly guards internal routes (/dashboard, /admin, /settings, etc.).
 * - Redirects root '/' to /login for unauthenticated users, or /dashboard if authenticated.
 * - Passes public client portals, auth callbacks, and static assets.
 */
export const proxy = auth((req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  // 1. IP-Based Rate Limiting (DDoS, Brute-Force & Flooding Protection)
  const clientIp = getClientIp(req.headers);
  const rateLimit = checkRateLimit(clientIp, pathname);

  if (!rateLimit.allowed) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too Many Requests',
        message: `Rate limit threshold exceeded. Please retry after ${rateLimit.retryAfter} seconds.`,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimit.retryAfter),
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimit.resetTime),
        },
      }
    );
  }

  const isLoggedIn = Boolean(
    req.auth?.user?.id || req.auth?.user?.email || (req.auth?.user as any)?.sub
  );

  const userRole = (req.auth?.user as any)?.role;
  const isDealer = userRole === 'DEALER';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  // 2. Initial Route Protection: root '/' MUST redirect to /login for unauthenticated users, or /dealer / /dashboard if authenticated
  if (pathname === '/') {
    if (isLoggedIn) {
      if (isDealer) {
        return NextResponse.redirect(new URL('/dealer', nextUrl));
      }
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
    return NextResponse.redirect(new URL('/login', nextUrl));
  }

  // 3. Strict protected ERP internal routes list
  const isProtectedPath =
    pathname === '/dealer' ||
    pathname.startsWith('/dealer/') ||
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/super-admin' ||
    pathname.startsWith('/super-admin/') ||
    pathname === '/settings' ||
    pathname.startsWith('/settings/') ||
    pathname === '/operations' ||
    pathname.startsWith('/operations/') ||
    pathname === '/customers' ||
    pathname.startsWith('/customers/') ||
    pathname === '/leads' ||
    pathname.startsWith('/leads/') ||
    pathname === '/inquiries' ||
    pathname.startsWith('/inquiries/') ||
    pathname === '/quotations' ||
    pathname.startsWith('/quotations/') ||
    pathname === '/packages' ||
    pathname.startsWith('/packages/') ||
    pathname === '/sales' ||
    pathname.startsWith('/sales/') ||
    pathname === '/finance' ||
    pathname.startsWith('/finance/') ||
    pathname === '/profile' ||
    pathname.startsWith('/profile/') ||
    pathname === '/users' ||
    pathname.startsWith('/users/') ||
    pathname === '/roles' ||
    pathname.startsWith('/roles/') ||
    pathname === '/masters' ||
    pathname.startsWith('/masters/');

  // 4. Unauthenticated requests on protected routes MUST strictly redirect to /login
  if (isProtectedPath && !isLoggedIn) {
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4.0 Forced Password Change: Users with temporary/reset passwords must update before continuing
  const isProfileSecurity = pathname === '/profile/security' || pathname.startsWith('/profile/security');
  const isAuthApiOrPublic = pathname.startsWith('/api/auth') || pathname.startsWith('/api') || pathname === '/login';

  if (isLoggedIn && Boolean((req.auth?.user as any)?.mustChangePassword) && !isProfileSecurity && !isAuthApiOrPublic) {
    return NextResponse.redirect(new URL('/profile/security?forced=true', nextUrl));
  }

  // 4.1 Role isolation: DEALER cannot access internal ERP dashboard or super-admin
  if (isLoggedIn && isDealer && !pathname.startsWith('/dealer') && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/dealer', nextUrl));
  }

  // 4.2 Non-dealers (except SUPER_ADMIN) cannot access dealer portal
  if (isLoggedIn && (pathname === '/dealer' || pathname.startsWith('/dealer/')) && !isDealer && !isSuperAdmin) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  // 4.3 Non-super-admins cannot access super-admin portal
  if (isLoggedIn && (pathname === '/super-admin' || pathname.startsWith('/super-admin/')) && !isSuperAdmin) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  // 5. Authenticated users attempting to visit auth pages (/login, /signup) redirected to their portal
  if ((pathname === '/login' || pathname === '/signup') && isLoggedIn) {
    if (!nextUrl.searchParams.has('error')) {
      if (isDealer) {
        return NextResponse.redirect(new URL('/dealer', nextUrl));
      }
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', pathname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set('X-RateLimit-Limit', String(rateLimit.limit));
  response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
  response.headers.set('X-RateLimit-Reset', String(rateLimit.resetTime));

  return response;
});

export default proxy;

export const config = {
  // Guard all application routes including /api/* and /login while bypassing static assets & icons
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
