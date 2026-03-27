import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

async function getUser() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
            Cookie: cookieHeader,
            'X-Requested-With': 'XMLHttpRequest',
        },
        cache: 'no-store',
    });

    if (!res.ok) return null;
    return res.json();
}

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const data = await getUser();
    if (!data?.user) {
        redirect('/login');
    }

    return <>{children}</>;
}
