'use client';
import { GiftIcon, SparklesIcon } from '@heroicons/react/24/outline';

import { useEffect, useState, useCallback } from 'react';

type Transfer = {
  id: string;
  other_phone: string;
  other_name: string;
  points: number;
  message: string | null;
  created_at: string;
};

const QUICK_AMOUNTS = [10, 25, 50, 100];

export default function GiftPoints({ token, initialBalance }: { token: string; initialBalance: number }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ phone: string; points: number } | null>(null);
  const [balance, setBalance] = useState(initialBalance);
  const [sent, setSent] = useState<Transfer[]>([]);
  const [received, setReceived] = useState<Transfer[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const loadHistory = useCallback(() => {
    fetch(`/api/points/transfers/${token}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSent(data.sent ?? []);
          setReceived(data.received ?? []);
        }
        setHistoryLoaded(true);
      })
      .catch(() => setHistoryLoaded(true));
  }, [token]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const phoneValid = /^\d{10}$/.test(phone);
  const amountNum = typeof amount === 'number' ? amount : 0;
  const canSubmit =
    phoneValid &&
    amountNum >= 10 &&
    amountNum <= balance &&
    Number.isInteger(amountNum) &&
    message.length <= 100 &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/points/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_token: token, to_phone: phone, points: amountNum, message: message || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Ocurrió un error.');
        setSubmitting(false);
        return;
      }
      setBalance(data.new_balance);
      setSuccess({ phone, points: amountNum });
      setPhone('');
      setAmount('');
      setMessage('');
      loadHistory();
    } catch {
      setError('Ocurrió un error de red.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetAndCloseSuccess() {
    setSuccess(null);
    setOpen(false);
  }

  const recentHistory: Array<Transfer & { direction: 'sent' | 'received' }> = [
    ...sent.map((t) => ({ ...t, direction: 'sent' as const })),
    ...received.map((t) => ({ ...t, direction: 'received' as const })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8E3DC', padding: 16, marginBottom: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#1C1917', margin: '0 0 12px' }}><GiftIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Regalar puntos</p>

      {success ? (
        <div className="gift-success" style={{ position: 'relative', textAlign: 'center', padding: '16px 8px', overflow: 'hidden' }}>
          <div className="confetti-wrap">
            {Array.from({ length: 18 }).map((_, i) => (
              <span key={i} className={`confetti-piece c${i % 6}`} style={{ left: `${(i * 5.5) % 100}%`, animationDelay: `${(i % 8) * 0.12}s` }} />
            ))}
          </div>
          <div style={{ fontSize: 32, marginBottom: 6, position: 'relative', zIndex: 1 }}><SparklesIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1C1917', margin: '0 0 4px', position: 'relative', zIndex: 1 }}>
            ¡Listo! Le regalaste {success.points} puntos a {success.phone}
          </p>
          <button
            onClick={resetAndCloseSuccess}
            style={{ marginTop: 10, padding: '8px 18px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', position: 'relative', zIndex: 1 }}
          >
            Cerrar
          </button>
          <style jsx>{`
            .confetti-wrap { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
            .confetti-piece { position: absolute; top: -10px; width: 7px; height: 12px; opacity: 0.9; animation: confetti-fall 1.8s linear infinite; }
            .c0 { background: #2563eb; } .c1 { background: #7c3aed; } .c2 { background: #10b981; }
            .c3 { background: #f59e0b; } .c4 { background: #ef4444; } .c5 { background: #0ea5e9; }
            @keyframes confetti-fall {
              0% { transform: translateY(0) rotate(0deg); opacity: 1; }
              100% { transform: translateY(220px) rotate(540deg); opacity: 0; }
            }
          `}</style>
        </div>
      ) : !open ? (
        <button
          onClick={() => setOpen(true)}
          style={{ width: '100%', padding: '12px 16px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          Regalar puntos a un amigo
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#78716C', display: 'block', marginBottom: 4 }}>
              Teléfono del destinatario (10 dígitos)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="5512345678"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E8E3DC', fontSize: 14, boxSizing: 'border-box' }}
            />
            {phone.length > 0 && !phoneValid && (
              <p style={{ fontSize: 10, color: '#DC2626', margin: '4px 0 0' }}>Debe tener 10 dígitos.</p>
            )}
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#78716C', display: 'block', marginBottom: 4 }}>
              Puntos a regalar (tienes {balance.toLocaleString()})
            </label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  onClick={() => setAmount(q)}
                  disabled={q > balance}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 10,
                    border: amount === q ? '1px solid #2563EB' : '1px solid #E8E3DC',
                    background: amount === q ? '#E6F1FB' : '#fff',
                    color: q > balance ? '#A8A29E' : '#1C1917',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: q > balance ? 'not-allowed' : 'pointer',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={10}
              max={balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Math.max(0, Math.floor(Number(e.target.value))))}
              placeholder="Cantidad personalizada"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E8E3DC', fontSize: 14, boxSizing: 'border-box' }}
            />
            {amount !== '' && amountNum > balance && (
              <p style={{ fontSize: 10, color: '#DC2626', margin: '4px 0 0' }}>No tienes suficientes puntos.</p>
            )}
            {amount !== '' && amountNum > 0 && amountNum < 10 && (
              <p style={{ fontSize: 10, color: '#DC2626', margin: '4px 0 0' }}>Mínimo 10 puntos.</p>
            )}
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#78716C', display: 'block', marginBottom: 4 }}>
              Mensaje (opcional, máx. 100 caracteres)
            </label>
            <input
              type="text"
              value={message}
              maxLength={100}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="¡Disfruta tus puntos!"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E8E3DC', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          {error && <p style={{ fontSize: 11, color: '#DC2626', margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setOpen(false); setError(null); }}
              style={{ flex: 1, padding: '10px 16px', borderRadius: 12, border: '1px solid #E8E3DC', background: '#fff', color: '#78716C', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                flex: 2,
                padding: '10px 16px',
                borderRadius: 12,
                border: 'none',
                background: canSubmit ? 'linear-gradient(135deg,#2563EB,#1D4ED8)' : '#E8E3DC',
                color: canSubmit ? '#fff' : '#A8A29E',
                fontSize: 13,
                fontWeight: 700,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
              }}
            >
              {submitting ? 'Enviando…' : 'Enviar regalo'}
            </button>
          </div>
        </div>
      )}

      {historyLoaded && recentHistory.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #F5F3F0' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#78716C', margin: '0 0 8px' }}>Historial de regalos</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentHistory.map((t) => (
              <div key={`${t.direction}-${t.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#1C1917', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.direction === 'sent' ? '↑' : '↓'} {t.direction === 'sent' ? 'Enviado a' : 'Recibido de'} {t.other_name}
                  </p>
                  <p style={{ fontSize: 10, color: '#78716C', margin: 0 }}>
                    {new Date(t.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {t.message ? ` · "${t.message}"` : ''}
                  </p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: t.direction === 'sent' ? '#DC2626' : '#16A34A', flexShrink: 0 }}>
                  {t.direction === 'sent' ? '-' : '+'}{t.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
