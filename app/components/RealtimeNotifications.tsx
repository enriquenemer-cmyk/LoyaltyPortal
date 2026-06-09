'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useToast } from './Toast';

export default function RealtimeNotifications() {
  const { info } = useToast();
  const pathname = usePathname();
  const lastSeenRef = useRef<string>(new Date().toISOString());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAdmin = pathname?.startsWith('/admin') && !pathname?.startsWith('/admin/login');

  useEffect(() => {
    if (!isAdmin) return; // Only poll on admin pages
    function poll() {
      const since = lastSeenRef.current;
      fetch(`/api/claims?since=${encodeURIComponent(since)}`)
        .then((r) => r.json())
        .then((data: { claims?: Array<{ full_name: string; prize_name: string; claimed_at: string }> }) => {
          const claims = data.claims ?? [];
          if (claims.length > 0) {
            // Update last-seen to the newest claim
            const newest = claims.reduce((a, b) =>
              new Date(a.claimed_at) > new Date(b.claimed_at) ? a : b
            );
            lastSeenRef.current = newest.claimed_at;

            // Show toast for each new claim (max 3 at a time handled by Toast)
            claims.slice(0, 3).forEach((claim) => {
              info(`🎉 ${claim.full_name} reclamó ${claim.prize_name}`);
            });
          }
        })
        .catch(() => {});
    }

    intervalRef.current = setInterval(poll, 15_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [info]);

  return null;
}
