import { getPrizeById, getPrizeClaimCount } from '@/lib/db';
import { notFound } from 'next/navigation';

type Props = { params: Promise<{ id: string }> };

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function VerificarPage({ params }: Props) {
  const { id } = await params;
  const prize = await getPrizeById(id);
  if (!prize) notFound();

  const claimCount = await getPrizeClaimCount(id);
  const today = new Date().toISOString().split('T')[0];
  const isExpired = today > prize.end_date;
  const isCancelled = prize.cancelled;
  const isClaimed = claimCount > 0;

  let statusLabel: string;
  let statusColor: string;
  let statusBg: string;

  if (isCancelled) {
    statusLabel = 'Cancelado';
    statusColor = '#dc2626';
    statusBg = '#fef2f2';
  } else if (isExpired) {
    statusLabel = 'Vencido';
    statusColor = '#78716c';
    statusBg = '#f5f5f4';
  } else if (isClaimed) {
    statusLabel = 'Reclamado';
    statusColor = '#7c3aed';
    statusBg = '#ede9fe';
  } else {
    statusLabel = 'Activo';
    statusColor = '#059669';
    statusBg = '#d1fae5';
  }

  const verificationCode = id.replace(/-/g, '').slice(-8).toUpperCase();

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: 'system-ui,-apple-system,sans-serif' }}>

      {/* Header banner */}
      <div style={{ background: 'linear-gradient(155deg,#2563EB 0%,#0891B2 45%,#1E3A8A 100%)', padding: '40px 24px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'radial-gradient(circle,white 1.5px,transparent 1.5px)', backgroundSize: '30px 30px' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Verified badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 99, padding: '7px 18px', marginBottom: 20 }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="#86efac">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span style={{ color: 'rgba(255,255,255,0.95)', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Premio Verificado ✓</span>
          </div>
          <h1 style={{ fontSize: prize.name.length > 20 ? 34 : 42, fontWeight: 900, color: '#ffffff', lineHeight: 1.1, letterSpacing: '-0.02em', margin: 0, padding: '0 8px', wordBreak: 'break-word', textShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
            {prize.name}
          </h1>
        </div>
      </div>

      {/* Wave */}
      <svg viewBox="0 0 1440 72" height="72" style={{ display: 'block', width: '100%', marginTop: -2 }}>
        <polygon points="0,72 1440,72 1440,36 1080,72 720,36 360,72 0,36" fill="#ffffff" />
      </svg>

      {/* Content */}
      <div style={{ maxWidth: 420, margin: '0 auto', padding: '0 16px 60px', marginTop: -16 }}>

        {/* Status badge */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <span style={{ display: 'inline-block', background: statusBg, color: statusColor, fontWeight: 800, fontSize: 13, padding: '6px 18px', borderRadius: 99, border: `1.5px solid ${statusColor}33` }}>
            Estado: {statusLabel}
          </span>
        </div>

        {/* Info card */}
        <div style={{ background: 'white', borderRadius: 24, boxShadow: '0 2px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)', overflow: 'hidden', marginBottom: 14 }}>

          {/* Why */}
          <div style={{ padding: '20px 22px', borderBottom: '1px solid #F3F4F6', display: 'flex', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#fef3c7,#E0F2FE)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏆</div>
            <div>
              <p style={{ color: '#2563EB', fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4, margin: '0 0 4px' }}>Por qué lo ganó</p>
              <p style={{ color: '#111', fontSize: 14, fontWeight: 600, lineHeight: 1.55, margin: 0 }}>{prize.reason}</p>
            </div>
          </div>

          {/* What */}
          <div style={{ padding: '20px 22px', borderBottom: '1px solid #F3F4F6', display: 'flex', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#BAE6FD,#7DD3FC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🎁</div>
            <div>
              <p style={{ color: '#2563EB', fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4, margin: '0 0 4px' }}>En qué consiste</p>
              <p style={{ color: '#444', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{prize.description}</p>
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {[
              { emoji: '📅', label: 'Válido desde', val: formatDate(prize.start_date) },
              { emoji: '⏳', label: 'Válido hasta', val: formatDate(prize.end_date) },
            ].map(({ emoji, label, val }, i) => (
              <div key={label} style={{ padding: '16px 18px', textAlign: 'center', borderRight: i === 0 ? '1px solid #F3F4F6' : 'none' }}>
                <span style={{ fontSize: 20 }}>{emoji}</span>
                <p style={{ color: '#aaa', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '8px 0 4px' }}>{label}</p>
                <p style={{ color: '#222', fontSize: 12, fontWeight: 700, lineHeight: 1.4, margin: 0 }}>{val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Verification code */}
        <div style={{ background: '#FAFAF9', border: '1.5px solid #E8E3DC', borderRadius: 16, padding: '18px 22px', textAlign: 'center', marginBottom: 14 }}>
          <p style={{ color: '#78716c', fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 8px' }}>Código de verificación</p>
          <p style={{ color: '#1C1917', fontSize: 22, fontWeight: 900, letterSpacing: '0.22em', fontFamily: 'monospace', margin: 0 }}>{verificationCode}</p>
        </div>

        {/* Disclaimer */}
        <div style={{ background: '#EFF6FF', border: '1px solid #BAE6FD', borderRadius: 14, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>ℹ️</span>
          <p style={{ color: '#1E40AF', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
            Esta página solo verifica la autenticidad del premio. Para reclamarlo, usa el QR original.
          </p>
        </div>

        <p style={{ textAlign: 'center', color: '#bbb', fontSize: 11, marginTop: 24 }}>Tierra Burrito Bar · Plataforma de Premios</p>
      </div>
    </div>
  );
}
