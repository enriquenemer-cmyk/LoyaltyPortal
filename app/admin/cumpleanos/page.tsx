'use client';

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

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#150800 0%,#2a0d00 50%,#3D1200 100%)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'linear-gradient(135deg,#F97316,#C2410C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, boxShadow: '0 0 0 6px rgba(249,115,22,0.15)',
            }}>
              🎂
            </div>
            <div>
              <h1 style={{ color: 'white', fontSize: 26, fontWeight: 900, margin: 0 }}>Premios de Cumpleaños</h1>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: 0 }}>Genera un premio especial para clientes frecuentes</p>
            </div>
          </div>
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
            Ingresa el correo y nombre del cliente. Si tiene registros previos, se generará automáticamente un <strong style={{ color: '#F97316' }}>postre gratis</strong> válido por 30 días.
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
                background: loading ? 'rgba(249,115,22,0.25)' : 'linear-gradient(135deg,#F97316,#C2410C)',
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
              {loading ? 'Generando...' : '🎁 Generar premio de cumpleaños'}
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
                    🎂
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: 'white', fontSize: 14, fontWeight: 700, margin: 0, marginBottom: 2 }}>{item.full_name}</p>
                    <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 12, margin: 0 }}>{item.email}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ color: 'rgba(255,255,255,0.30)', fontSize: 11, margin: 0, marginBottom: 4 }}>
                      {new Date(item.generatedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    <a
                      href={item.prizeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: 'rgba(249,115,22,0.20)',
                        color: '#fb923c',
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
  );
}
