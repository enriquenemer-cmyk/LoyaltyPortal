'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ---- IndexedDB helpers -------------------------------------------------------

const DB_NAME = 'premia_cache';
const STORE_NAME = 'cache';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function setCache(key: string, data: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ key, data, cachedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCache(key: string): Promise<{ data: unknown; cachedAt: number } | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => {
        const r = req.result;
        if (!r) { resolve(null); return; }
        resolve({ data: r.data, cachedAt: r.cachedAt });
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

// ---- TTL config --------------------------------------------------------------

const TTL_MAP: Record<string, number> = {
  '/api/restaurants': 30 * 60 * 1000, // 30 min
};
const DEFAULT_TTL = 5 * 60 * 1000; // 5 min

function getTTL(endpoint: string): number {
  return TTL_MAP[endpoint] ?? DEFAULT_TTL;
}

function cacheKey(endpoint: string): string {
  return `premia_cache_${endpoint.replace(/\//g, '_')}`;
}

// ---- Hook -------------------------------------------------------------------

export interface UseDataCacheResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  cachedAt: number | null;
  refresh: () => Promise<void>;
}

export function useDataCache<T>(endpoint: string): UseDataCacheResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const fetchFresh = useCallback(async (silent = false): Promise<void> => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const now = Date.now();
      await setCache(cacheKey(endpoint), json);
      if (mountedRef.current) {
        setData(json as T);
        setCachedAt(now);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : 'Error desconocido');
      }
    } finally {
      if (mountedRef.current && !silent) setLoading(false);
    }
  }, [endpoint]);

  // On mount: serve from cache immediately, then revalidate in background
  useEffect(() => {
    mountedRef.current = true;

    async function init() {
      const cached = await getCache(cacheKey(endpoint));
      const ttl = getTTL(endpoint);
      const now = Date.now();

      if (cached) {
        setData(cached.data as T);
        setCachedAt(cached.cachedAt);
        setLoading(false);

        // Revalidate in background if stale
        if (now - cached.cachedAt > ttl) {
          fetchFresh(true);
        }
      } else {
        // No cache — fetch fresh (shows loading)
        await fetchFresh(false);
      }

      // Background refresh every 5 minutes
      intervalRef.current = setInterval(() => {
        fetchFresh(true);
      }, 5 * 60 * 1000);
    }

    init();

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  const refresh = useCallback(async () => {
    await fetchFresh(false);
  }, [fetchFresh]);

  return { data, loading, error, cachedAt, refresh };
}
