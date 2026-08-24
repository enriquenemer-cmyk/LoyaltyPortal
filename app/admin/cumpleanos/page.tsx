'use client';
import { CakeIcon } from '@heroicons/react/24/outline';

import { useState, useEffect } from 'react';

type BirthdayResult = {
  prizeUrl: string;
  prize: {
    id: string;
    name: string;
    end_date: string;
    created_at: string;
  };
  email: string;
  full_name: string;
  generatedAt: string;
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.13)',
  borderRadius: 12,
  padding: '12px 16px',
  color: 'white',
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
};

const focusHandlers = {
  onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(249,115,22,0.6)';
    e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.12)';
    e.target.style.background = 'rgba(249,115,22,0.07)';
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(255,255,255,0.13)';
    e.target.style.boxShadow = 'none';
    e.target.style.background = 'rgba(255,255,255,0.06)';
  },
};

const STORAGE_KEY = 'birthday_prizes_history';

export default function CumpleanosPage() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successUrl, setSuccessUrl] = useState('');
  const [history, setHistory] = useState<BirthdayResult[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessUrl('');
    setLoading(true);
    try {
      const res = await fetch('/api/prizes/birthday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), full_name: fullName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al generar el premio.');
        return;
      }
      setSuccessUrl(data.prizeUrl);

      const entry: BirthdayResult = {
        prizeUrl: data.prizeUrl,
        prize: data.prize,
        email: email.trim(),
        full_name: fullName.trim(),
        generatedAt: new Date().toISOString(),
      };
      const updated = [entry, ...history].slice(0, 50);
      setHistory(updated);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }

      setEmail('');
      setFullName('');
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const [cronRunning, setCronRunning] = useState(false);
  const [cronResult, setCronResult] = useState<string | null>(null);

  async function runBirthdayCron() {
    setCronRunning(true);
    setCronResult(null);
    try {
      const res = await fetch('/api/cron/birthday');
      const d = await res.json();
      setCronResult(d.processed === 0
        ? 'No hay cumpleaños hoy registrados.'
        : `✓ ${d.processed} premios de cumpleaños generados.`);
    } catch {
      setCronResult('Error al ejecutar el cron.');
    } finally {
      setCronRunning(false);
    }
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-[700px] mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <CakeIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Puntos y Sellos
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Premios de Cumpleaños</h1>
          <p className="text-orange-200/70 mt-1.5 text-sm">Genera premios especiales — manual o automático</p>
        </div>
      </div>

      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#150800 0%,#2a0d00 50%,#3D1200 100%)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>

        {/* Auto section */}
        <div style={{
          background: 'rgba(234,88,12,0.08)',
          border: '1px solid rgba(234,88,12,0.25)',
          borderRadius: 16,
          padding: '18px 22px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ color: '#FDBA74', fontSize: 13, fontWeight: 700, margin: '0 0 4px' }}>Cumpleaños automáticos</p>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: 0 }}>
              El cron corre diariamente. Clientes con campo <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 4px', borderRadius: 4 }}>birthday</code> reciben un premio automático.
            </p>
            {cronResult && (
              <p style={{ color: '#86efac', fontSize: 12, marginTop: 8, fontWeight: 600 }}>{cronResult}</p>
            )}
          </div>
          <button
            onClick={runBirthdayCron}
            disabled={cronRunning}
            style={{
              background: cronRunning ? 'rgba(234,88,12,0.15)' : 'rgba(234,88,12,0.25)',
              border: '1px solid rgba(234,88,12,0.4)',
              color: '#FDBA74',
              fontWeight: 700,
              fontSize: 12,
              padding: '9px 16px',
              borderRadius: 10,
              cursor: cronRunning ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {cronRunning ? 'Ejecutando...' : '▶ Correr cron ahora'}
          </button>
        </div>

        {/* Form card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 20,
          padding: 28,
          marginBottom: 32,
          backdropFilter: 'blur(12px)',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
            Ingresa el correo y nombre del cliente. Si tiene registros previos, se generará automáticamente un <strong style={{ color: '#EA580C' }}>postre gratis</strong> válido por 30 días.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.40)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 7 }}>
                Nombre completo
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                type="text"
                placeholder="Ej: María González"
                style={inputStyle}
                {...focusHandlers}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.40)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 7 }}>
                Correo electrónico
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
                placeholder="cliente@correo.com"
                style={inputStyle}
                {...focusHandlers}
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 12, padding: '11px 15px', color: '#fca5a5', fontSize: 14 }}>
                {error}
              </div>
            )}

            {successUrl && (
              <div style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 12, padding: '14px 16px' }}>
                <p style={{ color: '#86efac', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Premio generado exitosamente</p>
                <a
                  href={successUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#4ade80', fontSize: 13, wordBreak: 'break-all' }}
                >
                  {successUrl}
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? 'rgba(249,115,22,0.25)' : 'linear-gradient(135deg,#EA580C,#EA580C)',
                color: 'white',
                fontWeight: 800,
                fontSize: 15,
                padding: '13px 24px',
                borderRadius: 13,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 8px 24px rgba(249,115,22,0.30)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 4,
              }}
            >
              {loading ? 'Generando...' : ' Generar premio de cumpleaños'}
            </button>
          </form>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div>
            <h2 style={{ color: 'rgba(255,255,255,0.60)', fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>
              Premios generados recientemente
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.map((item, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 14,
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(249,115,22,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    <CakeIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: 'white', fontSize: 14, fontWeight: 700, margin: 0, marginBottom: 2 }}>{item.full_name}</p>
                    <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 12, margin: 0 }}>{item.email}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ color: 'rgba(255,255,255,0.30)', fontSize: 11, margin: 0, marginBottom: 4 }}>
                      {new Date(item.generatedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    <a
                      href={item.prizeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: 'rgba(249,115,22,0.20)',
                        color: '#F97316',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 8,
                        textDecoration: 'none',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Ver premio
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
