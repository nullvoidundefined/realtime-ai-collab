import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary';
import Providers from '@/components/Providers/Providers';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from 'next';

import './globals.scss';

export const metadata: Metadata = {
  title: 'Realtime AI Collaboration',
  description: 'Collaborative document editing with AI suggestions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <body>
        <Providers>
          <ErrorBoundary>{children}</ErrorBoundary>
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
