'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface ReferidoAmigo {
  referred_name: string;
  referred_at: string;
}

interface ReferidosData {
  code: string;
  count: number;
  full_name: string;
  friends: ReferidoAmigo[];
}

const REWARD_STEP = 3; // every 3 referrals = 1 extra prize

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const colors = ['#2563EB', '#0891B2', '#38BDF8', '#0EA5E9', '#6366F1'];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: colors[idx],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 800,
        fontSize: size * 0.35,
        flexShrink: 0,
        letterSpacing: '-0.02em',
      }}
    >
      {getInitials(name)}
    </div>
  );
}

function ReferidosContent() {
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') ?? '';
  const codeParam = searchParams.get('code') ?? '';

  const [data, setData] = useState<ReferidosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const fetchData = useCallback(async () => {
    if (!codeParam && !phone) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    try {
      const code = codeParam.toUpperCase();
      const [refRes, claimsRes] = await Promise.all([
        code ? fetch(`/api/referral?code=${code}`) : Promise.resolve(null),
        phone ? fetch(`/api/claims?duplicate_check=${encodeURIComponent(phone)}`) : Promise.resolve(null),
      ]);

      let count = 0;
      let fullName = '';
      let friends: ReferidoAmigo[] = [];

      if (refRes?.ok) {
        const refData = await refRes.json();
        count = refData.count ?? 0;
      }

      if (claimsRes?.ok) {
        const claimsData = await claimsRes.json();
        const claims = claimsData.claims ?? [];
        if (claims.length > 0) {
          fullName = claims[0].full_name ?? '';
        }
        // Friends who registered using this referral code
        friends = claims
          .filter((c: { referred_by?: string; full_name: string; claimed_at: string }) => code && c.referred_by === code)
          .map((c: { full_name: string; claimed_at: string }) => ({
            referred_name: c.full_name,
            referred_at: c.claimed_at,
          }));
      }

      if (!code && !fullName) {
        setNotFound(true);
      } else {
        setData({ code: code || 'SIN-CODIGO', count, full_name: fullName, friends });
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [codeParam, phone]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const referralLink = data ? `https://premia-tierra.vercel.app?ref=${data.code}` : '';

  const handleCopy = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      `¡Hola! Te invito a ganar premios gratis en 3E. Regístrate con mi link y ambos ganamos: ${referralLink}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const handleSMS = () => {
    const msg = encodeURIComponent(`¡Gana premios en 3E! Usa mi link: ${referralLink}`);
    window.open(`sms:?body=${msg}`, '_blank');
  };

  const progress = data ? ((data.count % REWARD_STEP) / REWARD_STEP) * 100 : 0;
  const nextRewardAt = data ? REWARD_STEP - (data.count % REWARD_STEP) : REWARD_STEP;
  const rewardsEarned = data ? Math.floor(data.count / REWARD_STEP) : 0;

  const gradient = 'linear-gradient(135deg, #2563EB 0%, #0891B2 100%)';

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '4px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#64748B', fontSize: 14 }}>Cargando tu programa...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1E293B', marginBottom: 8 }}>No encontramos tu perfil</h1>
          <p style={{ color: '#64748B', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
            Accede con tu código de referido o número de teléfono:
          </p>
          <code style={{ background: '#E0F2FE', color: '#0891B2', padding: '8px 16px', borderRadius: 8, fontSize: 13 }}>
            /referidos?code=TU-CODIGO
          </code>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .step-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .step-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(37,99,235,0.12) !important; }
        .cta-btn { transition: transform 0.15s ease, opacity 0.15s ease; cursor: pointer; border: none; }
        .cta-btn:hover { transform: scale(1.04); opacity: 0.92; }
        .cta-btn:active { transform: scale(0.97); }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background: gradient, padding: '48px 20px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, animation: 'fadeUp 0.5s ease' }}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
            </svg>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              3E — Referidos
            </span>
          </div>

          {data?.full_name && (
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, marginBottom: 6, animation: 'fadeUp 0.5s ease 0.05s both' }}>
              Hola, <strong style={{ color: 'white' }}>{data.full_name}</strong> 👋
            </p>
          )}
          <h1 style={{ fontSize: 'clamp(26px,6vw,40px)', fontWeight: 900, color: 'white', lineHeight: 1.15, marginBottom: 12, animation: 'fadeUp 0.5s ease 0.1s both' }}>
            Invita amigos.<br />Gana premios.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, lineHeight: 1.6, animation: 'fadeUp 0.5s ease 0.15s both' }}>
            Cada {REWARD_STEP} amigos que se registren = 1 premio extra para ti.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '-40px auto 0', padding: '0 16px 80px', position: 'relative', zIndex: 2 }}>

        {/* ── REFERRAL LINK CARD ── */}
        <div style={{ background: 'white', borderRadius: 20, padding: 28, boxShadow: '0 8px 40px rgba(37,99,235,0.14)', marginBottom: 16, animation: 'fadeUp 0.5s ease 0.2s both' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Tu link único</p>
          <div style={{ background: '#F0F9FF', border: '1.5px solid #BAE6FD', borderRadius: 12, padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path stroke="#0891B2" strokeWidth="2" strokeLinecap="round" d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
            <span style={{ fontSize: 12, color: '#0891B2', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {referralLink}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={handleCopy} className="cta-btn" style={{
              padding: '13px 10px', borderRadius: 12,
              background: copied ? '#DCFCE7' : '#EFF6FF',
              color: copied ? '#16A34A' : '#2563EB',
              fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              {copied ? (
                <><svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" /></svg> ¡Copiado!</>
              ) : (
                <><svg width="14" height="14" fill="none" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" /><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg> Copiar link</>
              )}
            </button>
            <button onClick={handleWhatsApp} className="cta-btn" style={{
              padding: '13px 10px', borderRadius: 12,
              background: '#DCFCE7', color: '#15803D',
              fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#15803D">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.553 4.122 1.522 5.852L0 24l6.335-1.507A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.813 9.813 0 01-5.006-1.371l-.36-.213-3.732.888.925-3.635-.235-.374A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z" />
              </svg>
              WhatsApp
            </button>
          </div>
        </div>

        {/* ── STATS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, animation: 'fadeUp 0.5s ease 0.25s both' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '20px 16px', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', textAlign: 'center' }}>
            <p style={{ fontSize: 42, fontWeight: 900, color: '#2563EB', lineHeight: 1, marginBottom: 4 }}>{data?.count ?? 0}</p>
            <p style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Amigos invitados</p>
          </div>
          <div style={{ background: 'white', borderRadius: 16, padding: '20px 16px', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', textAlign: 'center' }}>
            <p style={{ fontSize: 42, fontWeight: 900, color: '#0891B2', lineHeight: 1, marginBottom: 4 }}>{rewardsEarned}</p>
            <p style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Premios ganados</p>
          </div>
        </div>

        {/* ── PROGRESS ── */}
        <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 16px rgba(0,0,0,0.05)', marginBottom: 16, animation: 'fadeUp 0.5s ease 0.3s both' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#1E293B', marginBottom: 2 }}>Próxima recompensa</p>
              <p style={{ fontSize: 13, color: '#64748B' }}>
                Te faltan <strong style={{ color: '#2563EB' }}>{nextRewardAt}</strong> referido{nextRewardAt !== 1 ? 's' : ''} más
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 24, fontWeight: 900, color: '#2563EB', lineHeight: 1 }}>
                {data ? data.count % REWARD_STEP : 0}
                <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600 }}>/{REWARD_STEP}</span>
              </p>
            </div>
          </div>
          <div style={{ height: 10, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: gradient,
              borderRadius: 99,
              transition: 'width 1s ease',
            }} />
          </div>
          {data && data.count > 0 && data.count % REWARD_STEP === 0 && (
            <p style={{ fontSize: 12, color: '#16A34A', fontWeight: 700, marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              🎉 ¡Completaste un grupo! Revisa tus mensajes para tu premio extra.
            </p>
          )}
        </div>

        {/* ── FRIENDS LIST ── */}
        <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 16px rgba(0,0,0,0.05)', marginBottom: 16, animation: 'fadeUp 0.5s ease 0.35s both' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1E293B', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>👥</span> Amigos que has invitado
          </h2>
          {!data?.friends.length ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🤝</div>
              <p style={{ color: '#94A3B8', fontSize: 14, lineHeight: 1.6 }}>
                Aún no tienes amigos registrados.<br />¡Comparte tu link y empieza a ganar!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {data.friends.map((friend, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                  borderBottom: i < data.friends.length - 1 ? '1px solid #F1F5F9' : 'none',
                }}>
                  <Avatar name={friend.referred_name} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#1E293B', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {friend.referred_name}
                    </p>
                    <p style={{ fontSize: 12, color: '#94A3B8' }}>
                      {new Date(friend.referred_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ background: '#F0FDF4', color: '#16A34A', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    Registrado
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── HOW IT WORKS ── */}
        <div style={{ marginBottom: 20, animation: 'fadeUp 0.5s ease 0.4s both' }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1E293B', marginBottom: 14, textAlign: 'center' }}>¿Cómo funciona?</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '🔗', title: 'Comparte tu link', desc: 'Envía tu link único a amigos por WhatsApp, SMS o redes sociales.' },
              { icon: '📱', title: 'Tu amigo se registra', desc: 'Cuando usan tu link para registrar un premio, se cuenta como referido tuyo.' },
              { icon: '🎁', title: 'Ambos ganan', desc: `Cada ${REWARD_STEP} amigos registrados te dan un premio extra automáticamente.` },
            ].map((item, i) => (
              <div key={i} className="step-card" style={{
                background: 'white', borderRadius: 16, padding: '18px 20px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                display: 'flex', alignItems: 'flex-start', gap: 14,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'linear-gradient(135deg,#EFF6FF,#E0F2FE)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, flexShrink: 0,
                }}>
                  {item.icon}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#1E293B', marginBottom: 4 }}>{item.title}</p>
                  <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.55 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA BOTTOM ── */}
        <div style={{ background: gradient, borderRadius: 20, padding: 28, textAlign: 'center', animation: 'fadeUp 0.5s ease 0.45s both' }}>
          <p style={{ fontSize: 18, fontWeight: 900, color: 'white', marginBottom: 6 }}>¡Comparte ahora!</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 22, lineHeight: 1.5 }}>
            Cada amigo que se une suma a tu próxima recompensa.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleWhatsApp} className="cta-btn" style={{
              background: 'white', color: '#15803D',
              borderRadius: 12, padding: '12px 18px', fontWeight: 800, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="#15803D">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.553 4.122 1.522 5.852L0 24l6.335-1.507A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.813 9.813 0 01-5.006-1.371l-.36-.213-3.732.888.925-3.635-.235-.374A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z" />
              </svg>
              WhatsApp
            </button>
            <button onClick={handleCopy} className="cta-btn" style={{
              background: 'rgba(255,255,255,0.15)', color: 'white',
              border: '1.5px solid rgba(255,255,255,0.35)',
              borderRadius: 12, padding: '12px 18px', fontWeight: 800, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
                <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              {copied ? '¡Copiado!' : 'Copiar link'}
            </button>
            <button onClick={handleSMS} className="cta-btn" style={{
              background: 'rgba(255,255,255,0.15)', color: 'white',
              border: '1.5px solid rgba(255,255,255,0.35)',
              borderRadius: 12, padding: '12px 18px', fontWeight: 800, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              SMS
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function ReferidosPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 40, height: 40, border: '4px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    }>
      <ReferidosContent />
    </Suspense>
  );
}
