import { ChartBarIcon, ClipboardDocumentListIcon, FireIcon, LinkIcon, TrophyIcon, UsersIcon } from '@heroicons/react/24/outline';
import { getReferralStats } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Build weekly bar chart data from chain dates (last 8 weeks)
function buildWeeklyData(chains: Array<{ referred_at: string }>) {
  const weeks: Record<string, number> = {};
  const now = Date.now();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now - i * 7 * 24 * 60 * 60 * 1000);
    const key = getWeekLabel(d);
    weeks[key] = 0;
  }
  for (const c of chains) {
    const key = getWeekLabel(new Date(c.referred_at));
    if (key in weeks) weeks[key]++;
  }
  return Object.entries(weeks).map(([week, count]) => ({ week, count }));
}

function getWeekLabel(d: Date) {
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return start.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
}

export default async function ReferidosAdminPage() {
  const stats = await getReferralStats();
  const weeklyData = buildWeeklyData(stats.chains);
  const maxWeekly = Math.max(...weeklyData.map((w) => w.count), 1);

  const gradient = 'linear-gradient(135deg, #2563EB 0%, #0891B2 100%)';

  const card: React.CSSProperties = {
    background: 'white',
    border: '1px solid #E2E8F0',
    borderRadius: 16,
    padding: '20px 24px',
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-[960px] mx-auto">
          <a href="/admin" className="inline-flex items-center gap-1.5 text-blue-200/70 text-xs font-semibold mb-4 hover:text-white transition-colors">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al panel
          </a>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <UsersIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Programa de Referidos
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Referidos</h1>
          <p className="text-blue-200/70 mt-1.5 text-sm">Rastrea quién está trayendo nuevos clientes</p>
        </div>
      </div>

    <div style={{
      minHeight: '100vh',
      background: '#F8FAFC',
      padding: '32px 16px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <style>{`
        .copy-btn { cursor: pointer; transition: background 0.15s, transform 0.1s; }
        .copy-btn:hover { background: #EFF6FF !important; }
        .copy-btn:active { transform: scale(0.96); }
        .row-hover { transition: background 0.1s; }
        .row-hover:hover { background: #F8FAFC !important; }
      `}</style>

      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* ── SUMMARY CARD ── */}
        <div style={{
          ...card, background: gradient, border: 'none',
          display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20, color: 'white',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="28" height="28" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              Total de referidos
            </p>
            <p style={{ fontSize: 48, fontWeight: 900, lineHeight: 1 }}>{stats.total_referrals}</p>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              Referidores activos
            </p>
            <p style={{ fontSize: 48, fontWeight: 900, lineHeight: 1 }}>{stats.top_referrers.length}</p>
          </div>
        </div>

        {/* ── WEEKLY BAR CHART ── */}
        <div style={{ ...card, marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1E293B', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span><ChartBarIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span> Referidos por semana (últimas 8 semanas)
          </h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
            {weeklyData.map((w) => {
              const pct = (w.count / maxWeekly) * 100;
              return (
                <div key={w.week} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }}>
                  {w.count > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB' }}>{w.count}</span>
                  )}
                  <div style={{
                    width: '100%', borderRadius: '6px 6px 0 0',
                    height: `${Math.max(pct, 3)}%`,
                    background: w.count > 0 ? gradient : '#E2E8F0',
                    minHeight: 3,
                  }} />
                  <span style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>{w.week}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── TWO-COLUMN: TOP REFERRERS + CHAINS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

          {/* TOP REFERRERS */}
          <div style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1E293B', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span><TrophyIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span> Top Referidores
            </h2>
            {stats.top_referrers.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
                Aún no hay referidos registrados
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stats.top_referrers.map((r, i) => {
                  const referralLink = `https://premia-tierra.vercel.app?ref=${r.referral_code}`;
                  return (
                    <div key={r.referral_code} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: i === 0 ? '#EFF6FF' : '#F8FAFC',
                      border: `1px solid ${i === 0 ? '#BFDBFE' : '#E2E8F0'}`,
                      borderRadius: 12, padding: '10px 12px',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: i === 0 ? gradient : '#E2E8F0',
                        fontWeight: 900, fontSize: 12, color: i === 0 ? 'white' : '#64748B',
                      }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <p style={{ fontWeight: 800, fontSize: 13, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
                            {r.full_name}
                          </p>
                          {i === 0 && (
                            <span style={{ background: '#FEF3C7', color: '#D97706', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
                              <FireIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Top referidor
                            </span>
                          )}
                        </div>
                        <p style={{ color: '#94A3B8', fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{r.referral_code}</p>
                      </div>
                      <p style={{ fontSize: 20, fontWeight: 900, color: '#2563EB', lineHeight: 1, flexShrink: 0 }}>{r.count}</p>
                      {/* Copy button */}
                      <button
                        className="copy-btn"
                        data-link={referralLink}
                        title="Copiar link de referido"
                        style={{
                          padding: '5px 8px', borderRadius: 7, background: 'white',
                          border: '1px solid #E2E8F0', flexShrink: 0,
                          display: 'flex', alignItems: 'center',
                        }}
                      >
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
                          <rect x="9" y="9" width="13" height="13" rx="2" stroke="#64748B" strokeWidth="2" />
                          <path stroke="#64748B" strokeWidth="2" strokeLinecap="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RECENT CHAINS */}
          <div style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1E293B', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span><LinkIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span> Cadenas recientes
            </h2>
            {stats.chains.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
                Aún no hay cadenas de referidos
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 320, overflowY: 'auto' }}>
                {stats.chains.slice(0, 20).map((c, i) => (
                  <div key={i} className="row-hover" style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 4px', background: 'white',
                    borderBottom: i < Math.min(stats.chains.length, 20) - 1 ? '1px solid #F1F5F9' : 'none',
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.referrer_name}</p>
                      <p style={{ fontSize: 10, color: '#38BDF8', fontFamily: 'monospace', fontWeight: 600 }}>{c.referral_code}</p>
                    </div>
                    <svg width="12" height="12" fill="none" stroke="#CBD5E1" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.referred_name}</p>
                      <p style={{ fontSize: 10, color: '#94A3B8' }}>
                        {new Date(c.referred_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── FULL TABLE ── */}
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1E293B', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span><ClipboardDocumentListIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span> Registro completo ({stats.chains.length})
          </h2>
          {stats.chains.length === 0 ? (
            <p style={{ color: '#94A3B8', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>No hay registros aún</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                    {['Quién refirió', 'Código', 'Nuevo cliente', 'Fecha'].map((h) => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '8px 12px', color: '#94A3B8',
                        fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.chains.map((c, i) => (
                    <tr key={i} className="row-hover" style={{ borderBottom: '1px solid #F1F5F9', background: 'white' }}>
                      <td style={{ padding: '11px 12px', fontWeight: 700, color: '#1E293B' }}>{c.referrer_name}</td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={{ background: '#EFF6FF', color: '#2563EB', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.06em' }}>
                          {c.referral_code}
                        </span>
                      </td>
                      <td style={{ padding: '11px 12px', color: '#475569' }}>{c.referred_name}</td>
                      <td style={{ padding: '11px 12px', color: '#94A3B8' }}>
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

      {/* Client-side copy-link handler */}
      <script dangerouslySetInnerHTML={{ __html: `
        document.addEventListener('DOMContentLoaded', function() {
          document.querySelectorAll('.copy-btn[data-link]').forEach(function(btn) {
            btn.addEventListener('click', function() {
              var link = btn.getAttribute('data-link');
              if (!link) return;
              navigator.clipboard.writeText(link).then(function() {
                var orig = btn.innerHTML;
                btn.innerHTML = '<svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path stroke="#16A34A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>';
                btn.style.background = '#F0FDF4';
                btn.style.borderColor = '#BBF7D0';
                setTimeout(function() { btn.innerHTML = orig; btn.style.background = 'white'; btn.style.borderColor = '#E2E8F0'; }, 1500);
              });
            });
          });
        });
      ` }} />
    </div>
    </div>
  );
}
