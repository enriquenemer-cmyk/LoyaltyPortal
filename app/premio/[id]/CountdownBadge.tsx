'use client';
import { useEffect, useState } from 'react';

type TimeLeft = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function calcTimeLeft(endDate: string): TimeLeft | null {
  const [y, m, d] = endDate.split('-').map(Number);
  const end = new Date(y, m - 1, d, 23, 59, 59).getTime();
  const diff = end - Date.now();
  if (diff <= 0) return null;
  return {
    totalMs: diff,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function FlipUnit({ value, label }: { value: string; label: string }) {
  const [prev, setPrev] = useState(value);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (value !== prev) {
      setFlipping(true);
      const t = setTimeout(() => {
        setPrev(value);
        setFlipping(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [value, prev]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div
        style={{
          position: 'relative',
          width: 44,
          height: 52,
          borderRadius: 8,
          background: 'linear-gradient(180deg, #1a0a00 0%, #2d1208 100%)',
          border: '1px solid rgba(249,115,22,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}
      >
        {/* Divider line */}
        <div style={{ position: 'absolute', inset: '0 0 auto', height: 1, top: '50%', background: 'rgba(0,0,0,0.5)', zIndex: 2 }} />
        {/* Value */}
        <span
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '-0.5px',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            transform: flipping ? 'scaleY(0.1)' : 'scaleY(1)',
            transition: flipping ? 'transform 0.15s ease-in' : 'transform 0.15s ease-out',
            display: 'block',
          }}
        >
          {flipping ? prev : value}
        </span>
      </div>
      <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
    </div>
  );
}

export default function CountdownBadge({ endDate }: { endDate: string }) {
  const [tl, setTl] = useState<TimeLeft | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTl(calcTimeLeft(endDate));
    const t = setInterval(() => setTl(calcTimeLeft(endDate)), 1000);
    return () => clearInterval(t);
  }, [endDate]);

  if (!mounted || !tl) return null;

  const isUnder24h = tl.days < 1;
  const isUnder2h  = isUnder24h && tl.hours < 2;
  const isSameDay  = isUnder24h;

  // Only show if within 3 days
  if (tl.days >= 3) return null;

  // For > 24h remaining: simple badge (original style but nicer)
  if (!isUnder24h) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700,
        background: '#FFF7ED', color: '#c2410c', border: '1px solid #FED7AA',
      }}>
        Vence en {tl.days}d {tl.hours}h
      </span>
    );
  }

  // Under 24 hours: dramatic countdown
  return (
    <div style={{ display: 'inline-block' }}>
      {/* ULTIMO DIA banner */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '12px 16px',
        borderRadius: 16,
        background: isUnder2h
          ? 'linear-gradient(135deg, #450a0a, #7f1d1d)'
          : 'linear-gradient(135deg, #1c0a00, #431407)',
        border: isUnder2h
          ? '2px solid #ef4444'
          : '2px solid #F97316',
        boxShadow: isUnder2h
          ? '0 0 0 3px rgba(239,68,68,0.25), 0 4px 20px rgba(239,68,68,0.3)'
          : '0 0 0 3px rgba(249,115,22,0.2), 0 4px 16px rgba(0,0,0,0.3)',
        animation: isUnder2h ? 'pulse-border 1.5s ease-in-out infinite' : undefined,
        minWidth: 200,
      }}>
        {/* Banner */}
        <div style={{
          background: isUnder2h ? '#ef4444' : '#F97316',
          borderRadius: 6,
          padding: '2px 10px',
          fontSize: 10,
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>
          {isUnder2h ? 'Vence MUY PRONTO' : '¡ULTIMO DIA!'}
        </div>

        {/* Flip cards */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <FlipUnit value={pad(tl.hours)} label="horas" />
          <span style={{ fontSize: 28, fontWeight: 900, color: 'rgba(255,255,255,0.6)', lineHeight: '52px', marginTop: 0 }}>:</span>
          <FlipUnit value={pad(tl.minutes)} label="min" />
          <span style={{ fontSize: 28, fontWeight: 900, color: 'rgba(255,255,255,0.6)', lineHeight: '52px' }}>:</span>
          <FlipUnit value={pad(tl.seconds)} label="seg" />
        </div>

        {/* Bottom label */}
        {isSameDay && (
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#fca5a5', letterSpacing: '0.04em' }}>
            Vence <span style={{ color: '#f87171', fontWeight: 900 }}>HOY</span>
          </p>
        )}
      </div>

      <style>{`
        @keyframes pulse-border {
          0%, 100% { box-shadow: 0 0 0 3px rgba(239,68,68,0.25), 0 4px 20px rgba(239,68,68,0.3); }
          50%       { box-shadow: 0 0 0 6px rgba(239,68,68,0.4),  0 4px 28px rgba(239,68,68,0.5); }
        }
      `}</style>
    </div>
  );
}
