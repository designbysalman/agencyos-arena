'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { session, loading } = useAuth();

  React.useEffect(() => {
    if (loading) return;
    if (session) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [session, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return null;
}
