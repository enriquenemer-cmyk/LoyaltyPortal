'use client';

import { useEffect, useState } from 'react';

type Tier = {
  level: number;
  points_required: string;
  reward_name: string;
  reward_description: string;
};

type SeasonTier = {
  id: string;
  level: number;
  points_required: number;
  reward_name: string;
  reward_description: string | null;
};

type Season = {
  id: string;
  name: string;
  restaurant_id: string | null;
  start_date: string;
  end_date: string;
  active: boolean;
  created_at: string;
  tiers: SeasonTier[];
  leaderboard?: LeaderboardEntry[];
};

type LeaderboardEntry = {
  phone: string;
  full_name: string | null;
  season_points: number;
};

const DEFAULT_TIERS: Tier[] = [
  { level: 1, points_required: '50', reward_name: 'Premio sorpresa', reward_description: 'Un pequeño obsequio de bienvenida a la temporada.' },
  { level: 2, points_required: '150', reward_name: 'Bebida gratis', reward_description: 'Canjea una bebida de cortesía.' },
  { level: 3, points_required: '300', reward_name: 'Postre gratis', reward_description: 'Un postre a elección sin costo.' },
  { level: 4, points_required: '500', reward_name: 'Descuento 20%', reward_description: '20% de descuento en tu próxima visita.' },
  { level: 5, points_required: '800', reward_name: 'Premio exclusivo', reward_description: 'Recompensa exclusiva de fin de temporada.' },
];

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function plus30DaysISO() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

export default function TemporadaPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(plus30DaysISO());
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function loadSeasons() {
    setLoading(true);
    fetch('/api/admin/seasons')
      .then((r) => r.json())
      .then((d) => setSeasons(d.seasons ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadSeasons(); }, []);

  function updateTier(index: number, field: keyof Tier, value: string) {
    setTiers((prev) => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  }

  function addTier() {
    setTiers((prev) => [...prev, {
      level: prev.length > 0 ? Math.max(...prev.map((t) => t.level)) + 1 : 1,
      points_required: '',
      reward_name: '',
      reward_description: '',
    }]);
  }

  function removeTier(index: number) {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  }

  async function createSeason() {
    setError('');
    if (!name || !startDate || !endDate) {
      setError('Completa el nombre y las fechas.');
      return;
    }
    if (tiers.length === 0) {
      setError('Agrega al menos un nivel.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          start_date: startDate,
          end_date: endDate,
          tiers: tiers.map((t) => ({
            level: t.level,
            points_required: parseInt(t.points_required, 10) || 0,
            reward_name: t.reward_name,
            reward_description: t.reward_description,
          })),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Error al crear la temporada.');
        return;
      }
      setName('');
      setStartDate(todayISO());
      setEndDate(plus30DaysISO());
      setTiers(DEFAULT_TIERS);
      loadSeasons();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(season: Season) {
    await fetch(`/api/admin/seasons/${season.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !season.active }),
    });
    loadSeasons();
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-[820px] mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
            🏆 Battle Pass
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Temporada / Battle Pass</h1>
          <p className="text-blue-200/70 mt-1.5 text-sm">
            Programa de niveles por temporada
          </p>
        </div>
      </div>

      <div style={{ minHeight: '100vh', background: '#FAFAF9', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>

          {/* Create season form */}
          <div style={{ background: 'white', border: '1px solid #E8E3DC', borderRadius: 14, padding: 20, marginBottom: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1C1917', margin: '0 0 16px' }}>
              Nueva temporada
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Nombre</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Temporada Verano 2026" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Inicio</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Fin</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1C1917', margin: 0 }}>Niveles del battle pass</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '60px 110px 1fr 1.5fr 36px', gap: 8, marginBottom: 8 }}>
              {['Nivel', 'Puntos', 'Nombre del premio', 'Descripción', ''].map((h, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 600, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tiers.map((t, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 110px 1fr 1.5fr 36px',
                  gap: 8,
                  alignItems: 'center',
                  background: '#FAFAF9',
                  border: '1px solid #E8E3DC',
                  borderRadius: 10,
                  padding: '10px 12px',
                }}>
                  <input
                    type="number"
                    min="1"
                    value={t.level}
                    onChange={(e) => updateTier(i, 'level', e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    type="number"
                    min="0"
                    value={t.points_required}
                    onChange={(e) => updateTier(i, 'points_required', e.target.value)}
                    style={inputStyle}
                    placeholder="Puntos"
                  />
                  <input
                    value={t.reward_name}
                    onChange={(e) => updateTier(i, 'reward_name', e.target.value)}
                    style={inputStyle}
                    placeholder="Premio sorpresa"
                  />
                  <input
                    value={t.reward_description}
                    onChange={(e) => updateTier(i, 'reward_description', e.target.value)}
                    style={inputStyle}
                    placeholder="Descripción del premio"
                  />
                  <button
                    onClick={() => removeTier(i)}
                    disabled={tiers.length === 1}
                    style={{
                      width: 32, height: 32, borderRadius: 8, background: 'transparent',
                      border: '1px solid #E8E3DC', cursor: tiers.length === 1 ? 'not-allowed' : 'pointer',
                      color: '#78716C', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: tiers.length === 1 ? 0.4 : 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 16, alignItems: 'center' }}>
              <button onClick={addTier} style={ghostBtn}>+ Agregar nivel</button>
              <button onClick={createSeason} disabled={saving} style={primaryBtn}>
                {saving ? 'Creando...' : 'Crear temporada'}
              </button>
              {error && <span style={{ color: '#DC2626', fontSize: 13 }}>{error}</span>}
            </div>
          </div>

          {/* Seasons list */}
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1C1917', margin: '0 0 12px' }}>
              Temporadas
            </h2>
            {loading && <p style={{ fontSize: 13, color: '#78716C' }}>Cargando...</p>}
            {!loading && seasons.length === 0 && (
              <p style={{ fontSize: 13, color: '#78716C' }}>Aún no hay temporadas creadas.</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {seasons.map((s) => (
                <SeasonCard key={s.id} season={s} onToggleActive={() => toggleActive(s)} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SeasonCard({ season, onToggleActive }: { season: Season; onToggleActive: () => void }) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    fetch(`/api/admin/seasons/${season.id}/leaderboard`)
      .then((r) => (r.ok ? r.json() : { leaderboard: [] }))
      .then((d) => setLeaderboard(d.leaderboard ?? []))
      .catch(() => setLeaderboard([]));
  }, [season.id]);

  const start = new Date(season.start_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  const end = new Date(season.end_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div style={{ background: 'white', border: '1px solid #E8E3DC', borderRadius: 14, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#1C1917' }}>🏆 {season.name}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: season.active ? '#EAF3DE' : '#F5F3F0',
              color: season.active ? '#27500A' : '#78716C',
            }}>
              {season.active ? 'Activa' : 'Inactiva'}
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#78716C', margin: 0 }}>{start} — {end}</p>
          <p style={{ fontSize: 12, color: '#78716C', margin: '2px 0 0' }}>{season.tiers.length} niveles</p>
        </div>
        <button onClick={onToggleActive} style={ghostBtn}>
          {season.active ? 'Desactivar' : 'Activar'}
        </button>
      </div>

      {leaderboard && leaderboard.length > 0 && (
        <div style={{ marginTop: 14, borderTop: '1px solid #E8E3DC', paddingTop: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Top 3 clientes
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {leaderboard.slice(0, 3).map((l, i) => (
              <div key={l.phone} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#1C1917' }}>
                  {['🥇', '🥈', '🥉'][i] ?? ''} {l.full_name ?? l.phone}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B' }}>{l.season_points} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#1C1917', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '0.06em',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E8E3DC',
  background: 'white', fontSize: 13, color: '#1C1917', outline: 'none', boxSizing: 'border-box',
};

const primaryBtn: React.CSSProperties = {
  padding: '10px 20px', borderRadius: 10, background: '#2563EB', color: 'white',
  fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
};

const ghostBtn: React.CSSProperties = {
  padding: '10px 20px', borderRadius: 10, background: 'white', color: '#1C1917',
  fontWeight: 600, fontSize: 14, border: '1px solid #E8E3DC', cursor: 'pointer',
};
