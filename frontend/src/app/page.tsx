// Updated: 2026-02-27T04:35:00
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    router.replace(token ? '/dashboard' : '/login');
  }, [router]);

  return null;
}
