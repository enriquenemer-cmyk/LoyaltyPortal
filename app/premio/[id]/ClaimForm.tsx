'use client';

import { useState, useEffect } from 'react';

type Props = { prizeId: string; prizeName: string; prizeEndDate?: string; prizeLocation?: string };

export default function ClaimForm({ prizeId, prizeName }: Props) {
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', location: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [claimId, setClaimId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!claimId) return;
    import('qrcode').then((QRCode) => {
      const url = `${window.location.origin}/cajero/${claimId}`;
      QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: { dark: '#3D1200', light: '#ffffff' },
      }).then(setQrDataUrl);
    });
  }, [claimId]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prize_id: prizeId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al registrar.'); return; }
      setClaimId(data.claim.id);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const inputBase: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 12,
    padding: '13px 16px',
    color: 'white',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
  };

  const focusHandlers = {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.style.borderColor = 'rgba(232,82,26,0.55)';
      e.target.style.boxShadow = '0 0 0 3px rgba(232,82,26,0.12)';
      e.target.style.background = 'rgba(232,82,26,0.06)';
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.style.borderColor = 'rgba(255,255,255,0.14)';
      e.target.style.boxShadow = 'none';
      e.target.style.background = 'rgba(255,255,255,0.07)';
    },
  };

  /* ── SUCCESS: Digital Ticket ── */
  if (claimId) {
    return (
      <div className="fade-in-up">
        <div className="text-center mb-6">
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg,#F97316,#C2410C)',
            boxShadow: '0 0 0 8px rgba(232,82,26,0.15), 0 0 0 16px rgba(232,82,26,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg style={{ width: 32, height: 32, color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 style={{ color: 'white', fontSize: 24, fontWeight: 900, marginBottom: 6 }}>¡Ya eres oficial!</h3>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
            Tu premio <strong style={{ color: '#F97316' }}>{prizeName}</strong> está registrado
          </p>
        </div>

        {/* Ticket */}
        <div style={{
          background: 'white', borderRadius: 24, overflow: 'hidden',
          boxShadow: '0 0 0 1px rgba(232,82,26,0.3), 0 0 0 6px rgba(232,82,26,0.10), 0 30px 80px rgba(0,0,0,0.6)',
          marginBottom: 20,
        }}>
          <div style={{ background: 'linear-gradient(135deg,#3D1200,#7C2D12,#9A3412)', padding: '20px 24px', textAlign: 'center' }}>
            <p style={{ color: 'rgba(251,146,60,0.7)', fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>
              🎉 Premia Tierra — Ticket de Cobro
            </p>
            <p style={{ color: 'white', fontSize: 18, fontWeight: 900, lineHeight: 1.2 }}>{prizeName}</p>
          </div>

          {/* Perforated edge */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#150800', flexShrink: 0, marginLeft: -10 }} />
            <div style={{ flex: 1, borderTop: '2px dashed #e5e7eb' }} />
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#150800', flexShrink: 0, marginRight: -10 }} />
          </div>

          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p style={{ color: '#6b7280', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              Muestra este código al cajero
            </p>
            <div style={{ padding: 12, borderRadius: 16, border: '2px solid #ffedd5', background: '#fff7ed' }}>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR de cobro" style={{ borderRadius: 10, display: 'block', width: 220, height: 220 }} />
              ) : (
                <div style={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg style={{ width: 36, height: 36, color: '#F97316', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', width: '100%', margin: '20px 0 16px', padding: '0 8px' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#f3f4f6', flexShrink: 0, marginLeft: -32 }} />
              <div style={{ flex: 1, borderTop: '1px dashed #d1d5db' }} />
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#f3f4f6', flexShrink: 0, marginRight: -32 }} />
            </div>

            {/* Chosen location */}
            <div style={{ width: '100%', background: '#fffbeb', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>📍</span>
              <div>
                <p style={{ color: '#92400e', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
                  Tu sucursal elegida
                </p>
                <p style={{ color: '#78350f', fontSize: 16, fontWeight: 900, lineHeight: 1.2 }}>{form.location}</p>
              </div>
            </div>

            <p style={{ color: '#9ca3af', fontSize: 11, marginTop: 14, textAlign: 'center' }}>
              Código único · No transferible · Válido una vez
            </p>
          </div>
        </div>

        <div style={{ background: 'rgba(232,82,26,0.10)', border: '1px solid rgba(232,82,26,0.25)', borderRadius: 14, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
          <p style={{ color: 'rgba(255,255,255,0.60)', fontSize: 13, lineHeight: 1.5 }}>
            Guarda o toma captura de este QR. El cajero lo escaneará para confirmar tu entrega.
          </p>
        </div>

        {/* WhatsApp share */}
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`¡Gané un premio! 🎁 Aquí está mi código de cobro: ${typeof window !== 'undefined' ? window.location.origin : 'https://premia-tierra.vercel.app'}/cajero/${claimId}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: '#25D366', color: 'white', fontWeight: 800, fontSize: 15,
            padding: '13px 24px', borderRadius: 14, textDecoration: 'none',
            boxShadow: '0 8px 24px rgba(37,211,102,0.30)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Compartir por WhatsApp
        </a>
      </div>
    );
  }

  /* ── FORM ── */
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Personal fields */}
      {[
        { name: 'full_name', label: 'Nombre completo', type: 'text',  placeholder: 'Ej: Juan García López', icon: '👤' },
        { name: 'phone',     label: 'Celular',         type: 'tel',   placeholder: 'Ej: 5512345678',       icon: '📱' },
        { name: 'email',     label: 'Correo',          type: 'email', placeholder: 'Ej: juan@correo.com',  icon: '✉️'  },
        { name: 'location',  label: '¿En qué sucursal vas a cobrar?', type: 'text', placeholder: 'Ej: Sucursal Centro, Av. Juárez 45', icon: '📍' },
      ].map(({ name, label, type, placeholder, icon }) => (
        <div key={name}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.40)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 7 }}>
            <span>{icon}</span> {label}
          </label>
          <input
            name={name}
            value={form[name as keyof typeof form]}
            onChange={handleChange}
            required
            type={type}
            placeholder={placeholder}
            style={inputBase}
            {...focusHandlers}
          />
        </div>
      ))}

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 12, padding: '12px 16px', color: '#fca5a5', fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
          <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          background: loading ? 'rgba(232,82,26,0.25)' : 'linear-gradient(135deg,#F97316 0%,#C2410C 100%)',
          color: 'white',
          fontWeight: 800,
          fontSize: 16,
          padding: '15px 24px',
          borderRadius: 14,
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: loading ? 'none' : '0 10px 30px rgba(232,82,26,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'all 0.2s',
          marginTop: 4,
          letterSpacing: '0.02em',
        }}
      >
        {loading ? (
          <>
            <svg style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
              <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Registrando...
          </>
        ) : (
          <>
            Reclamar mi premio
            <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </>
        )}
      </button>

      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.20)', fontSize: 12, marginTop: 4 }}>
        Tus datos son privados y solo se usan para verificar la entrega
      </p>
    </form>
  );
}
