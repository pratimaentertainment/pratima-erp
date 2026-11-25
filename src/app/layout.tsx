import type { Metadata } from 'next';
import { Inter, Geist } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { cn } from "@/lib/utils";
import { Toaster } from 'sonner';
import { AutoLogout } from '@/components/auth/auto-logout';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'FRAMIQ — Photography Studio ERP by Pratima Entertainment & Technology',
    template: '%s | FRAMIQ by Pratima Entertainment & Technology',
  },
  description:
    'FRAMIQ by Pratima Entertainment & Technology (Est. 2008) — India\'s most advanced all-in-one Multi-Tenant Photography SaaS ERP. Quotations, automated GST billing, shoot scheduling, crew allocation, CRM, and client photo proofing portals.',
  keywords: [
    'FRAMIQ',
    'FRAMIQ ERP',
    'Pratima Entertainment & Technology',
    'Photography Studio ERP',
    'Photography Studio Software India',
    'Wedding Photography Management',
    'Studio Operating System',
    'Photography CRM',
  ],
  authors: [{ name: 'Pratima Entertainment & Technology', url: 'https://pratima-erp.vercel.app' }],
  creator: 'Suhas Wagire',
  publisher: 'Pratima Entertainment & Technology',
  metadataBase: new URL('https://pratima-erp.vercel.app'),
  openGraph: {
    title: 'FRAMIQ — Photography Studio ERP by Pratima Entertainment & Technology',
    description:
      'The complete cloud operating system for Indian wedding and commercial photography studios.',
    url: 'https://pratima-erp.vercel.app',
    siteName: 'FRAMIQ',
    locale: 'en_IN',
    type: 'website',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AutoLogout timeoutMinutes={30} />
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
