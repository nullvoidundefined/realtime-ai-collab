import type { Metadata } from 'next';
import './globals.scss';
import Providers from '@/components/Providers/Providers';

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
        <html lang="en">
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
