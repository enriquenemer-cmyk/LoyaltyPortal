import { notFound } from 'next/navigation';
import GiftPoints from './GiftPoints';

const TIER_LABEL: Record<string, string> = { bronze: 'Bronce', silver: 'Plata', gold: 'Oro' };
const TIER_COLOR: Record<string, string> = { bronze: '#CD7F32', silver: '#94A3B8', gold: '#F59E0B' };
const TIER_EMOJI: Record<string, string> = { bronze: '🥉', silver: '🥈', gold: '🥇' };
const TIER_THRESHOLDS: Record<'silver' | 'gold', number> = { silver: 100, gold: 300 };

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

type SeasonTier = { id: string; level: number; points_required: number; reward_name: string; reward_description: string | null };
type SeasonData = {
  season: { id: string; name: string; start_date: string; end_date: string };
  tiers: SeasonTier[];
  progress: { season_points: number; claimed_levels: number[] };
} | null;

type CustomerCard = { image_url: string; prompt_used: string | null; created_at: string } | null;

function getTierProgress(tier: string, totalPoints: number) {
  const next = tier === 'gold' ? null : tier === 'silver' ? 'gold' : 'silver';
  const nextThreshold = next ? TIER_THRESHOLDS[next as 'silver' | 'gold'] : null;
  const prevThreshold = tier === 'gold' ? TIER_THRESHOLDS.gold : tier === 'silver' ? TIER_THRESHOLDS.silver : 0;
  const pointsToNext = nextThreshold ? Math.max(0, nextThreshold - totalPoints) : 0;
  const progressPct = nextThreshold
    ? Math.min(100, Math.max(0, Math.round(((totalPoints - prevThreshold) / (nextThreshold - prevThreshold)) * 100)))
    : 100;
  return { next, nextThreshold, pointsToNext, progressPct };
}

async function getData(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/customer-public/${token}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json() as Promise<{ profile: Profile; claims: Claim[]; stamp_card: StampCard | null }>;
}

async function getSeasonData(token: string): Promise<SeasonData> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  try {
    const res = await fetch(`${base}/api/seasons/active/${token}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.season ? data : null;
  } catch {
    return null;
  }
}

async function getCustomerCard(token: string): Promise<CustomerCard> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  try {
    const res = await fetch(`${base}/api/customer-card/${token}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.card ?? null;
  } catch {
    return null;
  }
}

export default async function PublicProfilePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [data, seasonData, customerCard] = await Promise.all([getData(token), getSeasonData(token), getCustomerCard(token)]);

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', width: '100%', overflowX: 'hidden', background: '#FAFAF9', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C1917', margin: '0 0 8px' }}>Perfil no encontrado</h1>
          <p style={{ fontSize: 14, color: '#78716C', margin: '0 0 20px' }}>
            El enlace que intentas abrir no es válido o ha expirado.
          </p>
          <a
            href="/"
            style={{ display: 'inline-block', padding: '10px 20px', borderRadius: 12, background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
          >
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  const { profile, claims, stamp_card } = data;
  const tierColor = TIER_COLOR[profile.tier] ?? '#2563EB';
  const tierEmoji = TIER_EMOJI[profile.tier] ?? '';
  const stampPct = stamp_card ? Math.round((stamp_card.stamps_count / stamp_card.stamps_required) * 100) : 0;
  const { next, nextThreshold, pointsToNext, progressPct } = getTierProgress(profile.tier, profile.total_points);

  return (
    <div style={{ minHeight: '100vh', width: '100%', overflowX: 'hidden', background: '#FAFAF9', fontFamily: 'system-ui, sans-serif' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#1D4ED8,#2563EB,#3B82F6)', padding: '32px 16px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: 420, margin: '0 auto' }}>
          <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: `3px solid ${tierColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 34 }}>
            {tierEmoji || '🏅'}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>
            {profile.full_name ?? 'Cliente 3E'}
          </h1>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1D4ED8', background: '#fff', padding: '4px 14px', borderRadius: 20, display: 'inline-block' }}>
            Nivel {TIER_LABEL[profile.tier] ?? profile.tier}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 420, margin: '0 auto', padding: '20px 16px 32px' }}>

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

        {/* Progress to next tier */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8E3DC', padding: 16, marginBottom: 16 }}>
          {next ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1C1917', margin: 0 }}>
                  Progreso a {TIER_LABEL[next]} {TIER_EMOJI[next]}
                </p>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#78716C', margin: 0 }}>{progressPct}%</p>
              </div>
              <div style={{ background: '#F5F3F0', borderRadius: 8, height: 8, overflow: 'hidden' }}>
                <div style={{ width: `${progressPct}%`, height: '100%', background: `linear-gradient(90deg,${tierColor},#2563EB)`, borderRadius: 8 }} />
              </div>
              <p style={{ fontSize: 11, color: '#78716C', margin: '8px 0 0' }}>
                Te faltan {pointsToNext.toLocaleString()} puntos para llegar a {TIER_LABEL[next]} (meta: {nextThreshold?.toLocaleString()} pts)
              </p>
            </>
          ) : (
            <p style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', margin: 0, textAlign: 'center' }}>
              🏆 ¡Has alcanzado el nivel máximo!
            </p>
          )}
        </div>

        {/* Battle Pass / Season track */}
        {seasonData && <BattlePassTrack seasonData={seasonData} />}

        {/* Streak + Boost */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {profile.streak_days > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8E3DC', padding: '14px 16px' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#F59E0B', margin: '0 0 2px' }}>🔥 {profile.streak_days}</p>
              <p style={{ fontSize: 11, color: '#78716C', margin: 0 }}>Días de racha</p>
            </div>
          )}
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
                <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: i < stamp_card.stamps_count ? '#2563EB' : '#E8E3DC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', flexShrink: 0 }}>
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
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8E3DC', padding: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#1C1917', margin: '0 0 12px' }}>Premios recientes</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {claims.slice(0, 8).map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1C1917', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.prize_name}</p>
                    <p style={{ fontSize: 11, color: '#78716C', margin: 0 }}>
                      {new Date(c.claimed_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: c.status === 'delivered' ? '#EAF3DE' : '#E6F1FB', color: c.status === 'delivered' ? '#27500A' : '#0C447C', flexShrink: 0 }}>
                    {c.status === 'delivered' ? 'Entregado' : 'Pendiente'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI collectible card */}
        <CollectibleCard card={customerCard} name={profile.full_name} tier={profile.tier} tierColor={tierColor} tierEmoji={tierEmoji} />

        {/* Gift points */}
        <GiftPoints token={token} initialBalance={profile.total_points} />

        {/* Wallet button */}
        <div style={{ position: 'relative' }} title="Próximamente">
          <button
            disabled
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 14,
              border: '1px solid #E8E3DC',
              background: '#F5F3F0',
              color: '#A8A29E',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            📲 Agregar a Wallet
            <span style={{ fontSize: 10, fontWeight: 600, background: '#E8E3DC', color: '#78716C', padding: '2px 8px', borderRadius: 10 }}>
              Próximamente
            </span>
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#A8A29E', marginTop: 24 }}>Powered by 3E</p>
      </div>
    </div>
  );
}

function BattlePassTrack({ seasonData }: { seasonData: NonNullable<SeasonData> }) {
  const { season, tiers, progress } = seasonData;
  const sortedTiers = [...tiers].sort((a, b) => a.level - b.level);
  const points = progress.season_points;

  const nextTier = sortedTiers.find((t) => points < t.points_required);
  const prevThreshold = sortedTiers
    .filter((t) => points >= t.points_required)
    .reduce((max, t) => Math.max(max, t.points_required), 0);
  const nextThreshold = nextTier ? nextTier.points_required : prevThreshold;
  const progressPct = nextTier
    ? Math.min(100, Math.max(0, Math.round(((points - prevThreshold) / (nextThreshold - prevThreshold)) * 100)))
    : 100;
  const pointsToNext = nextTier ? Math.max(0, nextTier.points_required - points) : 0;

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      border: '1px solid #E8E3DC',
      padding: 16,
      marginBottom: 16,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes bp-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.45); }
          50% { box-shadow: 0 0 0 6px rgba(245,158,11,0); }
        }
        @keyframes bp-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        .bp-unlocked { animation: bp-glow 2.2s ease-in-out infinite; }
        .bp-next { animation: bp-pulse 1.6s ease-in-out infinite; }
        .bp-track::-webkit-scrollbar { height: 6px; }
        .bp-track::-webkit-scrollbar-thumb { background: #E8E3DC; border-radius: 4px; }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: '#1C1917', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          🏆 {season.name}
        </p>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', background: 'rgba(124,58,237,0.1)', padding: '2px 8px', borderRadius: 20 }}>
          Battle Pass
        </span>
      </div>
      <p style={{ fontSize: 11, color: '#78716C', margin: '0 0 14px' }}>
        Hasta {new Date(season.end_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
      </p>

      {/* Horizontal scrollable track */}
      <div
        className="bp-track"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 0,
          overflowX: 'auto',
          paddingBottom: 8,
          marginBottom: 14,
        }}
      >
        {sortedTiers.map((t, i) => {
          const unlocked = points >= t.points_required;
          const isNext = !unlocked && t.id === nextTier?.id;
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 76 }}>
                <div
                  className={unlocked ? 'bp-unlocked' : isNext ? 'bp-next' : undefined}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 15,
                    fontWeight: 800,
                    color: unlocked ? '#fff' : isNext ? '#1D4ED8' : '#A8A29E',
                    background: unlocked
                      ? 'linear-gradient(135deg,#F59E0B,#D97706)'
                      : isNext
                        ? 'linear-gradient(135deg,#DBEAFE,#EDE9FE)'
                        : '#F5F3F0',
                    border: unlocked ? '2px solid #FBBF24' : isNext ? '2px solid #2563EB' : '2px solid #E8E3DC',
                    flexShrink: 0,
                  }}
                >
                  {unlocked ? '✓' : t.level}
                </div>
                <p style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: unlocked ? '#B45309' : '#78716C',
                  margin: '6px 0 0',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {t.reward_name}
                </p>
                <p style={{ fontSize: 9, color: '#A8A29E', margin: '2px 0 0' }}>{t.points_required} pts</p>
              </div>
              {i < sortedTiers.length - 1 && (
                <div style={{
                  width: 28,
                  height: 3,
                  marginTop: 21,
                  borderRadius: 2,
                  background: unlocked ? 'linear-gradient(90deg,#F59E0B,#D97706)' : '#E8E3DC',
                  flexShrink: 0,
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Big progress bar */}
      <div style={{ background: '#F5F3F0', borderRadius: 8, height: 10, overflow: 'hidden' }}>
        <div style={{
          width: `${progressPct}%`,
          height: '100%',
          background: 'linear-gradient(90deg,#2563EB,#7C3AED)',
          borderRadius: 8,
          transition: 'width 0.3s ease',
        }} />
      </div>
      <p style={{ fontSize: 11, color: '#78716C', margin: '8px 0 0', textAlign: 'center' }}>
        {nextTier
          ? <>{pointsToNext.toLocaleString()} / {(nextThreshold - prevThreshold).toLocaleString()} puntos para el siguiente nivel</>
          : <span style={{ color: '#F59E0B', fontWeight: 700 }}>🏆 ¡Completaste el battle pass de esta temporada!</span>}
      </p>
    </div>
  );
}

function CollectibleCard({
  card,
  name,
  tier,
  tierColor,
  tierEmoji,
}: {
  card: CustomerCard;
  name: string | null;
  tier: string;
  tierColor: string;
  tierEmoji: string;
}) {
  const tierLabel = TIER_LABEL[tier] ?? tier;
  const glow = `0 0 28px ${tierColor}55, 0 6px 18px ${tierColor}33`;

  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 800, color: '#1C1917', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
        ✨ Tu tarjeta coleccionable
      </p>

      {card ? (
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1 / 1',
            borderRadius: 20,
            overflow: 'hidden',
            border: `2px solid ${tierColor}`,
            boxShadow: glow,
          }}
        >
          <img
            src={card.image_url}
            alt="Tarjeta coleccionable"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {/* Gradient overlay for legibility */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0) 60%)',
            }}
          />
          {/* Tier badge top-right */}
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              fontSize: 12,
              fontWeight: 800,
              color: '#fff',
              background: `${tierColor}CC`,
              padding: '4px 12px',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              backdropFilter: 'blur(4px)',
            }}
          >
            {tierEmoji} {tierLabel}
          </div>
          {/* Name overlay bottom */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '16px' }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>
              {name ?? 'Cliente 3E'}
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', margin: '2px 0 0' }}>
              Edición coleccionable · 3E
            </p>
          </div>
        </div>
      ) : (
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1 / 1',
            borderRadius: 20,
            overflow: 'hidden',
            border: `1px dashed ${tierColor}88`,
            background: `linear-gradient(135deg, ${tierColor}22, ${tierColor}05)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 24,
          }}
        >
          <div>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔒</div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1C1917', margin: '0 0 4px' }}>
              Tarjeta coleccionable bloqueada
            </p>
            <p style={{ fontSize: 12, color: '#78716C', margin: 0, maxWidth: 240, marginLeft: 'auto', marginRight: 'auto' }}>
              Tu tarjeta coleccionable se desbloqueará cuando subas de nivel
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
