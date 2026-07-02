 
 
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { AuthService } from '@/services/auth.service';
import { userAgent } from 'next/server';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const ipAddress = (req as { headers?: { get: (key: string) => string | null } }).headers?.get('x-forwarded-for') || undefined;
          
          const user = await AuthService.validateCredentials(
            credentials.email as string,
            credentials.password as string,
            ipAddress
          );

          const { browser, os, device } = userAgent(req as any);
          
          const loginSession = await AuthService.createSession(
            user.id,
            ipAddress,
            browser?.name || 'Unknown',
            os?.name || 'Unknown',
            device?.type || 'Desktop'
          );

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            tenantId: user.tenantId,
            sessionId: loginSession.id,
            remember: credentials.remember === 'true'
          } as any;
        } catch (error: any) {
          throw new Error(error.message);
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger }) {
      if (user) {
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
        (session.user as any).tenantId = token.tenantId;
        (session.user as any).sessionId = token.sessionId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: parseInt(process.env.REMEMBER_ME_DAYS || '30', 10) * 24 * 60 * 60, // Maximum possible age, JWT token.exp restricts actual expiration
  },
});
