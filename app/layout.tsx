import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/app/providers';

export const metadata: Metadata = {
  title: 'AgencyOS',
  description: 'Agency operating system for creative, design, and digital marketing agencies.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
