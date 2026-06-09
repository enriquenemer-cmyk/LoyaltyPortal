'use client';

import { useEffect, useRef } from 'react';
import { useToast } from './Toast';

const STORAGE_KEY = 'last_claim_count';

export default function ClaimNotifier() {
  const toast = useToast();
  const lastCountRef = useRef<number | null>(null);

  useEffect(() => {
    // Read initial count from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      lastCountRef.current = parseInt(stored, 10);
    }

    async function checkClaims() {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch('/api/claims');
        if (!res.ok) return;
        const data = await res.json();
        const claims: Array<{ full_name: string; prize_name: string }> = data.claims ?? [];
        const currentCount = claims.length;

        if (lastCountRef.current === null) {
          // First load — just store, don't notify
          lastCountRef.current = currentCount;
          localStorage.setItem(STORAGE_KEY, String(currentCount));
          return;
        }

        if (currentCount > lastCountRef.current) {
          const newClaims = claims.slice(0, currentCount - lastCountRef.current);
          for (const claim of newClaims) {
            toast.info(`Nuevo cobro: ${claim.full_name} — ${claim.prize_name}`);
          }
          lastCountRef.current = currentCount;
          localStorage.setItem(STORAGE_KEY, String(currentCount));
        }
      } catch {
        // Silently ignore network errors
      }
    }

    checkClaims();
    const interval = setInterval(checkClaims, 15_000);
    return () => clearInterval(interval);
  }, [toast]);

  return null;
}
