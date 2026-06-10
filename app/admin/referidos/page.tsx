import { getReferralStats } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function ReferidosPage() {
  const stats = await getReferralStats();

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 16,
    padding: '20px 24px',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#150800 0%,#3D1200 50%,#150800 100%)', padding: '32px 16px', color: 'white', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <a href="/admin" style={{ color: 'rgba(255,255,255,0.40)', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al panel
          </a>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>Referidos</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>Rastrea quien esta trayendo nuevos clientes</p>
        </div>

        {/* Summary stat */}
        <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, background: 'linear-gradient(135deg,rgba(249,115,22,0.18),rgba(194,65,12,0.12))', border: '1px solid rgba(249,115,22,0.30)' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#0891B2,#0891B2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="24" height="24" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.50)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Total de referidos</p>
            <p style={{ fontSize: 40, fontWeight: 900, color: '#0891B2', lineHeight: 1 }}>{stats.total_referrals}</p>
          </div>
        </div>

        {/* Top referrers */}
        <div style={{ ...card, marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🏆</span> Top Referidores
          </h2>
          {stats.top_referrers.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
              Aun no hay referidos registrados
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.top_referrers.map((r, i) => (
                <div key={r.referral_code} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: i === 0 ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.04)',
                  border: i === 0 ? '1px solid rgba(249,115,22,0.28)' : '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 12, padding: '12px 16px',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i === 0 ? 'linear-gradient(135deg,#0891B2,#0891B2)' : 'rgba(255,255,255,0.10)',
                    fontWeight: 900, fontSize: 14, color: 'white',
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.full_name}</p>
                    <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 12, fontFamily: 'monospace', letterSpacing: '0.06em' }}>{r.referral_code}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 22, fontWeight: 900, color: i === 0 ? '#0891B2' : 'white', lineHeight: 1 }}>{r.count}</p>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>referidos</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Referral chains table */}
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🔗</span> Cadenas de Referidos
          </h2>
          {stats.chains.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
              Aun no hay cadenas de referidos
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
                    {['Quien refirió', 'Codigo', 'Nuevo cliente', 'Fecha'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'rgba(255,255,255,0.40)', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.chains.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{c.referrer_name}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#0891B2', letterSpacing: '0.06em' }}>{c.referral_code}</td>
                      <td style={{ padding: '10px 12px' }}>{c.referred_name}</td>
                      <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.45)' }}>
                        {new Date(c.referred_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
