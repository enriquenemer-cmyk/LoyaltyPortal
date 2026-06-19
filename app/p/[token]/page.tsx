import { notFound } from 'next/navigation';

const TIER_LABEL: Record<string, string> = { bronze: 'Bronce', silver: 'Plata', gold: 'Oro' };
const TIER_COLOR: Record<string, string> = { bronze: '#CD7F32', silver: '#94A3B8', gold: '#F59E0B' };
const TIER_EMOJI: Record<string, string> = { bronze: '🥉', silver: '🥈', gold: '🥇' };

type Profile = {
  full_name: string | null;
  tier: string;
  total_points: number;
  lifetime_points: number;
  streak_days: number;
  point_multiplier: number;
  boost_active: boolean;
  boost_expires_at: string | null;
};

type Claim = { id: string; prize_name: string; status: string; claimed_at: string };
type StampCard = { stamps_count: number; stamps_required: number; completed_at: string | null };

async function getData(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/customer-public/${token}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json() as Promise<{ profile: Profile; claims: Claim[]; stamp_card: StampCard | null }>;
}

export default async function PublicProfilePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getData(token);
  if (!data) notFound();

  const { profile, claims, stamp_card } = data;
  const tierColor = TIER_COLOR[profile.tier] ?? '#2563EB';
  const tierEmoji = TIER_EMOJI[profile.tier] ?? '';
  const stampPct = stamp_card ? Math.round((stamp_card.stamps_count / stamp_card.stamps_required) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF9', fontFamily: 'system-ui, sans-serif', padding: '24px 16px' }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: tierColor + '20', border: `3px solid ${tierColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 32 }}>
            {tierEmoji || '🏅'}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1C1917', margin: '0 0 4px' }}>
            {profile.full_name ?? 'Cliente Super Tierra'}
          </h1>
          <span style={{ fontSize: 13, fontWeight: 600, color: tierColor, background: tierColor + '15', padding: '3px 12px', borderRadius: 20 }}>
            Nivel {TIER_LABEL[profile.tier] ?? profile.tier}
          </span>
        </div>

        {/* Points cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Puntos actuales', value: profile.total_points.toLocaleString(), accent: '#2563EB' },
            { label: 'Puntos históricos', value: profile.lifetime_points.toLocaleString(), accent: '#7C3AED' },
          ].map(c => (
            <div key={c.label} style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8E3DC', padding: '14px 16px' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: c.accent, margin: '0 0 2px' }}>{c.value}</p>
              <p style={{ fontSize: 11, color: '#78716C', margin: 0 }}>{c.label}</p>
            </div>
          ))}
        </div>

        {/* Streak + Boost */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8E3DC', padding: '14px 16px' }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#F59E0B', margin: '0 0 2px' }}>🔥 {profile.streak_days}</p>
            <p style={{ fontSize: 11, color: '#78716C', margin: 0 }}>Días de racha</p>
          </div>
          <div style={{ background: profile.boost_active ? '#EAF3DE' : '#fff', borderRadius: 16, border: `1px solid ${profile.boost_active ? '#C0DD97' : '#E8E3DC'}`, padding: '14px 16px' }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: profile.boost_active ? '#3B6D11' : '#78716C', margin: '0 0 2px' }}>
              {profile.boost_active ? `⚡ ${profile.point_multiplier}×` : '—'}
            </p>
            <p style={{ fontSize: 11, color: '#78716C', margin: 0 }}>{profile.boost_active ? 'Boost activo' : 'Sin boost'}</p>
          </div>
        </div>

        {/* Stamp card */}
        {stamp_card && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8E3DC', padding: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#1C1917', margin: '0 0 8px' }}>Tarjeta de sellos</p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {Array.from({ length: stamp_card.stamps_required }).map((_, i) => (
                <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: i < stamp_card.stamps_count ? '#2563EB' : '#E8E3DC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff' }}>
                  {i < stamp_card.stamps_count ? '✓' : ''}
                </div>
              ))}
            </div>
            <div style={{ background: '#F5F3F0', borderRadius: 8, height: 6, overflow: 'hidden' }}>
              <div style={{ width: `${stampPct}%`, height: '100%', background: '#2563EB', borderRadius: 8 }} />
            </div>
            <p style={{ fontSize: 11, color: '#78716C', margin: '6px 0 0' }}>{stamp_card.stamps_count}/{stamp_card.stamps_required} sellos</p>
          </div>
        )}

        {/* Recent prizes */}
        {claims.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8E3DC', padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#1C1917', margin: '0 0 12px' }}>Premios recientes</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {claims.slice(0, 8).map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1C1917', margin: 0 }}>{c.prize_name}</p>
                    <p style={{ fontSize: 11, color: '#78716C', margin: 0 }}>
                      {new Date(c.claimed_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: c.status === 'delivered' ? '#EAF3DE' : '#E6F1FB', color: c.status === 'delivered' ? '#27500A' : '#0C447C' }}>
                    {c.status === 'delivered' ? 'Entregado' : 'Pendiente'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 11, color: '#A8A29E', marginTop: 24 }}>Powered by Super Tierra</p>
      </div>
    </div>
  );
}
