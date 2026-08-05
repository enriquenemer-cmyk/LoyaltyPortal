'use client';
import { BellIcon } from '@heroicons/react/24/outline';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type NotificationType = 'new_claim' | 'prize_expiring' | 'vip_customer' | 'new_delivery' | 'low_prizes' | 'daily_summary' | 'platform_update';

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  restaurant_id: string | null;
  read_at: string | null;
  created_at: string;
};

function typeIcon(type: NotificationType): string {
  switch (type) {
    case 'new_claim': return '';
    case 'prize_expiring': return '';
    case 'vip_customer': return '';
    case 'new_delivery': return '';
    case 'low_prizes': return '';
    case 'daily_summary': return '';
    case 'platform_update': return '';
    default: return '';
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

async function registerPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const existingSub = await reg.pushManager.getSubscription();
    if (existingSub) return; // already subscribed

    const vapidRes = await fetch('/api/push/vapid-public-key');
    if (!vapidRes.ok) return;
    const { publicKey } = await vapidRes.json() as { publicKey: string };
    if (!publicKey) return;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKey,
    });

    const json = sub.toJSON();
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    });
  } catch {
    // Push not available or denied — silently ignore
  }
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchNotifications();
    registerPush();

    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      es = new EventSource('/api/notifications/stream');

      es.addEventListener('notifications', (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data);
          setNotifications(data.notifications ?? []);
        } catch {
          // ignore malformed payload
        }
      });

      es.onerror = () => {
        es?.close();
        if (!cancelled) {
          reconnectTimer = setTimeout(connect, 2000);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      es?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function markAllRead() {
    setMarking(true);
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH' });
      setNotifications([]);
      setOpen(false);
    } catch {
      // ignore
    } finally {
      setMarking(false);
    }
  }

  const count = notifications.length;
  const visible = notifications.slice(0, 8);

  // Briefly ring the bell when the notification count increases (not on
  // every render, and not on the initial mount).
  const [ringing, setRinging] = useState(false);
  const prevCountRef = useRef<number | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (prevCountRef.current !== null && count > prevCountRef.current) {
      setRinging(true);
      timer = setTimeout(() => setRinging(false), 600);
    }
    prevCountRef.current = count;
    return () => { if (timer) clearTimeout(timer); };
  }, [count]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificaciones"
        className="relative p-1.5 rounded-lg text-stone-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
      >
        <svg className={`w-4 h-4 ${ringing ? 'bell-ringing' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute left-0 top-full mt-2 w-72 bg-white border border-[#E8E3DC] rounded-xl shadow-xl z-50 overflow-hidden"
          style={{ boxShadow: '0 8px 32px rgba(28,25,23,0.14)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E3DC]">
            <span className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">Notificaciones</span>
            {count > 0 && (
              <button
                onClick={markAllRead}
                disabled={marking}
                className="text-[10px] font-semibold text-orange-500 hover:text-orange-700 transition-colors disabled:opacity-50"
              >
                {marking ? 'Marcando...' : 'Marcar todo como leido'}
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-[#F5F3F0]">
            {visible.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-2xl mb-1"><BellIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></p>
                <p className="text-xs text-stone-400">Sin notificaciones nuevas</p>
              </div>
            ) : (
              visible.map((n) => {
                const inner = (
                  <div className="flex items-start gap-3 px-4 py-3 hover:bg-[#FAFAF9] transition-colors cursor-pointer">
                    <span className="text-base shrink-0 mt-0.5">{typeIcon(n.type)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#1C1917] truncate">{n.title}</p>
                      <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-stone-300 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                );

                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => setOpen(false)}>
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {count > 8 && (
            <div className="border-t border-[#E8E3DC] px-4 py-2.5 text-center">
              <Link
                href="/admin/registros"
                onClick={() => setOpen(false)}
                className="text-[11px] font-semibold text-orange-500 hover:text-orange-700 transition-colors"
              >
                Ver todos ({count}) &rarr;
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
