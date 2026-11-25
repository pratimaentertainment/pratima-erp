import type { NextAuthConfig } from 'next-auth';

const resolvedAuthSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
if (!resolvedAuthSecret) {
  throw new Error('FATAL SECURITY ERROR: AUTH_SECRET or NEXTAUTH_SECRET environment variable is missing.');
}

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: parseInt(process.env.REMEMBER_ME_DAYS || '30', 10) * 24 * 60 * 60,
  },
  trustHost: true,
  secret: resolvedAuthSecret,
  providers: [
    // Providers are configured in auth.ts to avoid Edge compatibility issues with Prisma
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = (user as any).role;
        token.tenantId = (user as any).tenantId;
        token.sessionId = (user as any).sessionId;
        token.remember = (user as any).remember;
        
        // Calculate expiration dynamically
        const nowInSeconds = Math.floor(Date.now() / 1000);
        if (token.remember) {
          const days = parseInt(process.env.REMEMBER_ME_DAYS || '30', 10);
          token.exp = nowInSeconds + days * 24 * 60 * 60;
        } else {
          const hours = parseInt(process.env.SESSION_TIMEOUT_HOURS || '24', 10);
          token.exp = nowInSeconds + hours * 60 * 60;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) || (token.sub as string);
        if (token.name) session.user.name = token.name as string;
        if (token.email) session.user.email = token.email as string;
        if (token.role) (session.user as any).role = token.role;
        if (token.tenantId !== undefined) (session.user as any).tenantId = token.tenantId;
        if (token.sessionId) (session.user as any).sessionId = token.sessionId;
      }
      return session;
    },
    authorized({ auth, request }) {
      const pathname = request?.nextUrl?.pathname;
      // Completely ignore and bypass /api/auth routes
      if (!pathname || pathname.startsWith('/api/auth')) {
        return true;
      }

      const isLoggedIn = !!auth?.user?.id || !!(auth?.user as any)?.sub || !!auth?.user?.email;

      // Initial route protection: root '/' MUST redirect to login for unauthenticated users
      if (pathname === '/') {
        if (!isLoggedIn) return false;
        const role = (auth?.user as any)?.role;
        if (role === 'DEALER') {
          return Response.redirect(new URL('/dealer', request.nextUrl));
        }
        return Response.redirect(new URL('/dashboard', request.nextUrl));
      }

      const isProtectedPath = pathname.startsWith('/dashboard') || 
                              pathname.startsWith('/dealer') ||
                              pathname.startsWith('/admin') ||
                              pathname.startsWith('/super-admin') ||
                              pathname.startsWith('/settings') ||
                              pathname.startsWith('/operations') ||
                              pathname.startsWith('/customers') ||
                              pathname.startsWith('/leads') ||
                              pathname.startsWith('/inquiries') ||
                              pathname.startsWith('/quotations') ||
                              pathname.startsWith('/packages') ||
                              pathname.startsWith('/sales') ||
                              pathname.startsWith('/finance') ||
                              pathname.startsWith('/profile') ||
                              pathname.startsWith('/users') ||
                              pathname.startsWith('/roles') ||
                              pathname.startsWith('/masters');

      if (isProtectedPath) {
        if (isLoggedIn) {
          const role = (auth?.user as any)?.role;
          if (pathname.startsWith('/dealer') && role !== 'DEALER' && role !== 'SUPER_ADMIN') {
            return Response.redirect(new URL('/dashboard', request.nextUrl));
          }
          if (role === 'DEALER' && !pathname.startsWith('/dealer') && !pathname.startsWith('/api')) {
            return Response.redirect(new URL('/dealer', request.nextUrl));
          }
          return true;
        }
        return false; // Redirect unauthenticated users to login page
      }

      if (pathname === '/login' && isLoggedIn && !request.nextUrl.searchParams.has('error')) {
        const role = (auth?.user as any)?.role;
        if (role === 'DEALER') {
          return Response.redirect(new URL('/dealer', request.nextUrl));
        }
        return Response.redirect(new URL('/dashboard', request.nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
