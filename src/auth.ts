import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { AuthService } from '@/services/auth.service';
import { userAgent } from 'next/server';
import { authConfig } from './auth.config';
import { prisma } from '@/lib/prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      let updatedToken = token;
      if (authConfig.callbacks?.jwt) {
        updatedToken =
          (await authConfig.callbacks.jwt({ token, user, trigger, session } as any)) || token;
      }

      if (trigger === 'update') {
        if (typeof session?.mustChangePassword === 'boolean') {
          updatedToken.mustChangePassword = session.mustChangePassword;
        }
        if (session?.user && typeof session.user.mustChangePassword === 'boolean') {
          updatedToken.mustChangePassword = session.user.mustChangePassword;
        }
      }

      // Database Self-Heal Safeguard:
      // Whenever token.mustChangePassword === true and user ID exists, query DB directly
      const userId = (updatedToken.id as string) || (updatedToken.sub as string);
      if (updatedToken.mustChangePassword && userId) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { mustChangePassword: true },
          });
          if (dbUser && dbUser.mustChangePassword === false) {
            updatedToken.mustChangePassword = false;
          }
        } catch (dbErr) {
          console.error('[auth.jwt] Self-heal check failed:', dbErr);
        }
      }

      return updatedToken;
    },
    session({ session, token }) {
      if (authConfig.callbacks?.session) {
        session = authConfig.callbacks.session({ session, token } as any);
      }
      if (session?.user) {
        (session.user as any).mustChangePassword = Boolean(token.mustChangePassword);
      }
      return session;
    },
  },
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
          let ipAddress: string | undefined;
          try {
            if (req && 'headers' in req && typeof (req as any).headers?.get === 'function') {
              ipAddress = (req as any).headers.get('x-forwarded-for') || (req as any).headers.get('x-real-ip') || undefined;
            }
          } catch {
            // ignore header access errors
          }
          
          const user = await AuthService.validateCredentials(
            (credentials.email as string).trim(),
            credentials.password as string,
            ipAddress
          );

          let browserName = 'Unknown';
          let osName = 'Unknown';
          let deviceType = 'Desktop';
          try {
            if (req) {
              const ua = userAgent(req as any);
              browserName = ua.browser?.name || 'Unknown';
              osName = ua.os?.name || 'Unknown';
              deviceType = ua.device?.type || 'Desktop';
            }
          } catch {
            // ignore userAgent parsing errors
          }
          
          let loginSessionId: string | undefined;
          try {
            const loginSession = await AuthService.createSession(
              user.id,
              ipAddress,
              browserName,
              osName,
              deviceType
            );
            loginSessionId = loginSession.id;
          } catch (sessionErr) {
            console.error('Failed to create session log in authorize:', sessionErr);
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            sessionId: loginSessionId || user.id,
            mustChangePassword: (user as any).mustChangePassword ?? false,
            remember: (credentials as any).remember === 'true'
          } as any;
        } catch (error: any) {
          throw new Error(error.message);
        }
      },
    }),
  ],
});
