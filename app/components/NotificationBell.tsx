'use client';
import {
  BellIcon,
  GiftIcon,
  ClockIcon,
  StarIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  SparklesIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type NotificationType = 'new_claim' | 'prize_expiring' | 'vip_customer' | 'new_delivery' | 'low_prizes' | 'daily_summary' | 'platform_update' | 'forgotten_clock_out';

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

function typeIcon(type: NotificationType) {
  const cls = 'w-4 h-4';
  switch (type) {
    case 'new_claim': return <GiftIcon className={`${cls} text-orange-500`} />;
    case 'prize_expiring': return <ClockIcon className={`${cls} text-amber-500`} />;
    case 'vip_customer': return <StarIcon className={`${cls} text-yellow-500`} />;
    case 'new_delivery': return <TruckIcon className={`${cls} text-blue-500`} />;
    case 'low_prizes': return <ExclamationTriangleIcon className={`${cls} text-red-500`} />;
    case 'daily_summary': return <ChartBarIcon className={`${cls} text-[#1a6b3c]`} />;
    case 'platform_update': return <SparklesIcon className={`${cls} text-purple-500`} />;
    case 'forgotten_clock_out': return <ExclamationCircleIcon className={`${cls} text-red-500`} />;
    default: return <BellIcon className={`${cls} text-stone-400`} />;
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
          className="absolute top-full mt-2 w-80 z-50 overflow-hidden"
          style={{
            left: 0,
            background: '#fff',
            border: '2px solid #111',
            boxShadow: '5px 5px 0 #111',
            borderRadius: 16,
            animation: 'comic-pop-in 0.25s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#111', borderBottom: '2px solid #111' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BellIcon style={{ width: 14, height: 14, color: '#F97316' }} />
              <span style={{ fontSize: 11, fontWeight: 900, color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Notificaciones</span>
              {count > 0 && (
                <span style={{ background: '#F97316', color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 4, padding: '1px 6px', border: '1.5px solid #fff' }}>{count}</span>
              )}
            </div>
            {count > 0 && (
              <button
                onClick={markAllRead}
                disabled={marking}
                style={{ fontSize: 10, fontWeight: 700, color: '#F97316', background: 'none', border: 'none', cursor: 'pointer', opacity: marking ? 0.5 : 1 }}
              >
                {marking ? 'Marcando...' : 'Leer todo'}
              </button>
            )}
          </div>

          {/* Notification list */}
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {visible.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, background: '#f5f5f5', border: '2px solid #111', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <BellIcon style={{ width: 22, height: 22, color: '#9ca3af' }} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 4 }}>Todo al día</p>
                <p style={{ fontSize: 12, color: '#9ca3af' }}>No hay notificaciones nuevas</p>
              </div>
            ) : (
              visible.map((n, i) => {
                const inner = (
                  <div
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 16px',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                      animationDelay: `${i * 40}ms`,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#fafafa'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
                  >
                    <span style={{ flexShrink: 0, marginTop: 2, width: 28, height: 28, background: '#f5f5f5', border: '1.5px solid #e5e5e5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {typeIcon(n.type)}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#111', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</p>
                      <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.body}</p>
                      <p style={{ fontSize: 10, color: '#d1d5db', marginTop: 4, fontWeight: 600 }}>{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                );

                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => setOpen(false)} style={{ textDecoration: 'none', display: 'block' }}>
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
            <div style={{ borderTop: '2px solid #111', padding: '10px 16px', textAlign: 'center' }}>
              <Link
                href="/admin/registros"
                onClick={() => setOpen(false)}
                style={{ fontSize: 11, fontWeight: 800, color: '#F97316', textDecoration: 'none' }}
              >
                Ver todos ({count}) →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
