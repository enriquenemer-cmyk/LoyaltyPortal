'use client';

import { useEffect, useRef, useState } from 'react';

type Restaurant = { id: string; name: string };
type Tier = {
  id?: string;
  min_amount: string;
  max_amount: string;
  prize_name: string;
  prize_description: string;
  game_type: string;
};

const GAME_OPTIONS = [
  { value: '', label: 'Sin juego (premio directo)' },
  { value: 'slots', label: 'Tragamonedas' },
  { value: 'roulette', label: 'Ruleta' },
  { value: 'penalty', label: 'Penales' },
  { value: 'scratch', label: 'Raspa y gana' },
];

const EMPTY_TIER: Tier = {
  min_amount: '0',
  max_amount: '',
  prize_name: '',
  prize_description: '',
  game_type: '',
};

function QRCode({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    import('qrcode').then((QRCodeLib) => {
      if (!mounted || !canvasRef.current) return;
      QRCodeLib.toCanvas(canvasRef.current, url, {
        width: 180,
        margin: 2,
        color: { dark: '#1C1917', light: '#FAFAF9' },
      }).catch(() => { if (mounted) setError(true); });
    });
    return () => { mounted = false; };
  }, [url]);

  if (error) return <p style={{ fontSize: 12, color: '#78716C' }}>Error al generar QR</p>;
  return <canvas ref={canvasRef} />;
}

export default function TicketTiersPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [tiers, setTiers] = useState<Tier[]>([{ ...EMPTY_TIER }]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [kioskModal, setKioskModal] = useState(false);
  const [waNumber, setWaNumber] = useState('');
  const [waSaved, setWaSaved] = useState(false);
  const [consolationName, setConsolationName] = useState('Gracias por visitarnos');
  const [consolationDesc, setConsolationDesc] = useState('¡Gracias por visitarnos! Vuelve pronto.');
  const [consolationSaving, setConsolationSaving] = useState(false);
  const [consolationSaved, setConsolationSaved] = useState(false);
  const [welcomeTitle, setWelcomeTitle] = useState('');
  const [welcomeSubtitle, setWelcomeSubtitle] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#E8521A');
  const [avgRating, setAvgRating] = useState<{ avg_rating: number; total: number } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWaNumber(localStorage.getItem('admin_wa_number') ?? '');
    }
  }, []);

  useEffect(() => {
    fetch('/api/restaurants')
      .then((r) => r.json())
      .then((d) => setRestaurants(d.restaurants ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    fetch(`/api/ticket-tiers/${selectedId}`)
      .then((r) => r.json())
      .then((d) => {
        const t = d.tiers ?? [];
        setTiers(
          t.length > 0
            ? t.map((tier: {
                id?: string;
                min_amount: number | string;
                max_amount?: number | string | null;
                prize_name: string;
                prize_description: string;
                game_type?: string | null;
              }) => ({
                id: tier.id,
                min_amount: String(tier.min_amount ?? 0),
                max_amount: tier.max_amount != null ? String(tier.max_amount) : '',
                prize_name: tier.prize_name,
                prize_description: tier.prize_description,
                game_type: tier.game_type ?? '',
              }))
            : [{ ...EMPTY_TIER }]
        );
      })
      .catch(() => { setTiers([{ ...EMPTY_TIER }]); })
      .finally(() => setLoading(false));

    // Load consolation config + personalization
    fetch(`/api/restaurant-ticket-config/${selectedId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.config) {
          setConsolationName(d.config.consolation_prize_name ?? 'Gracias por visitarnos');
          setConsolationDesc(d.config.consolation_prize_description ?? '¡Gracias por visitarnos! Vuelve pronto.');
          setWelcomeTitle(d.config.welcome_title ?? '');
          setWelcomeSubtitle(d.config.welcome_subtitle ?? '');
          setPrimaryColor(d.config.primary_color ?? '#E8521A');
        }
      })
      .catch(() => {});

    // Load avg ticket rating
    fetch(`/api/ticket-feedback?restaurant_id=${selectedId}`)
      .then((r) => r.json())
      .then((d) => setAvgRating(d))
      .catch(() => {});
  }, [selectedId]);

  function updateTier(index: number, field: keyof Tier, value: string) {
    setTiers((prev) => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
    setSaved(false);
  }

  function addTier() {
    setTiers((prev) => [...prev, { ...EMPTY_TIER }]);
  }

  function removeTier(index: number) {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    if (!selectedId) return;
    setSaving(true);
    try {
      const body = tiers.map((t) => ({
        min_amount: parseFloat(t.min_amount) || 0,
        max_amount: t.max_amount !== '' ? parseFloat(t.max_amount) : null,
        prize_name: t.prize_name,
        prize_description: t.prize_description,
        game_type: t.game_type || null,
      }));
      const res = await fetch(`/api/ticket-tiers/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiers: body }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function saveConsolation() {
    if (!selectedId) return;
    setConsolationSaving(true);
    try {
      const minTierAmount = tiers.length > 0 ? Math.min(...tiers.map((t) => parseFloat(t.min_amount) || 0)) : 0;
      await fetch(`/api/restaurant-ticket-config/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consolation_prize_name: consolationName,
          consolation_prize_description: consolationDesc,
          min_amount_for_game: minTierAmount,
          welcome_title: welcomeTitle || null,
          welcome_subtitle: welcomeSubtitle || null,
          primary_color: primaryColor || '#E8521A',
        }),
      });
      setConsolationSaved(true);
      setTimeout(() => setConsolationSaved(false), 3000);
    } finally {
      setConsolationSaving(false);
    }
  }

  const ticketUrl = selectedId
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/ticket/${selectedId}`
    : '';

  const kioskUrl = selectedId
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/ticket/${selectedId}?kiosk=true`
    : '';

  function saveWaNumber() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_wa_number', waNumber);
      setWaSaved(true);
      setTimeout(() => setWaSaved(false), 2000);
    }
  }

  const selectedRestaurant = restaurants.find((r) => r.id === selectedId);

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF9', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1C1917', margin: '0 0 4px' }}>
            Ticket Scanner — Niveles de Premio
          </h1>
          <p style={{ color: '#78716C', fontSize: 14 }}>
            Configura qué premios se asignan según el monto del ticket del cliente.
          </p>
        </div>

        {/* Restaurant selector */}
        <div style={{ background: 'white', border: '1px solid #E8E3DC', borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C1917', marginBottom: 8 }}>
            Restaurante
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            style={selectStyle}
          >
            <option value="">Selecciona un restaurante...</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        {selectedId && (
          <>
            {/* Tier editor */}
            <div style={{ background: 'white', border: '1px solid #E8E3DC', borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1C1917', margin: 0 }}>
                  Niveles de premio
                </h2>
                {loading && <span style={{ fontSize: 12, color: '#78716C' }}>Cargando...</span>}
              </div>

              {/* Column headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '100px 100px 1fr 1fr 160px 36px', gap: 8, marginBottom: 8 }}>
                {['Desde $', 'Hasta $', 'Nombre del premio', 'Descripción', 'Juego', ''].map((h, i) => (
                  <span key={i} style={{ fontSize: 11, fontWeight: 600, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tiers.map((t, i) => (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '100px 100px 1fr 1fr 160px 36px',
                    gap: 8,
                    alignItems: 'center',
                    background: '#FAFAF9',
                    border: '1px solid #E8E3DC',
                    borderRadius: 10,
                    padding: '10px 12px',
                  }}>
                    <input
                      type="number"
                      min="0"
                      value={t.min_amount}
                      onChange={(e) => updateTier(i, 'min_amount', e.target.value)}
                      style={inputStyle}
                      placeholder="0"
                    />
                    <input
                      type="number"
                      min="0"
                      value={t.max_amount}
                      onChange={(e) => updateTier(i, 'max_amount', e.target.value)}
                      style={inputStyle}
                      placeholder="Sin límite"
                    />
                    <input
                      value={t.prize_name}
                      onChange={(e) => updateTier(i, 'prize_name', e.target.value)}
                      style={inputStyle}
                      placeholder="Bebida gratis"
                    />
                    <input
                      value={t.prize_description}
                      onChange={(e) => updateTier(i, 'prize_description', e.target.value)}
                      style={inputStyle}
                      placeholder="Descripción del premio"
                    />
                    <select
                      value={t.game_type}
                      onChange={(e) => updateTier(i, 'game_type', e.target.value)}
                      style={{ ...inputStyle, fontSize: 12 }}
                    >
                      {GAME_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeTier(i)}
                      disabled={tiers.length === 1}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: 'transparent',
                        border: '1px solid #E8E3DC',
                        cursor: tiers.length === 1 ? 'not-allowed' : 'pointer',
                        color: '#78716C',
                        fontSize: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: tiers.length === 1 ? 0.4 : 1,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button onClick={addTier} style={ghostBtn}>
                  + Agregar nivel
                </button>
                <button onClick={save} disabled={saving} style={primaryBtn}>
                  {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar configuración'}
                </button>
              </div>

              {saved && (
                <p style={{ color: '#16a34a', fontSize: 13, marginTop: 8 }}>
                  ✓ Configuración guardada correctamente
                </p>
              )}
            </div>

            {/* Consolation Prize Config */}
            <div style={{ background: 'white', border: '1px solid #E8E3DC', borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1C1917', margin: '0 0 4px' }}>
                🎁 Premio de Consolación
              </h2>
              <p style={{ color: '#78716C', fontSize: 13, marginBottom: 16 }}>
                Se entrega automáticamente cuando el monto del cliente no alcanza ningún nivel de premio.
                {tiers.length > 0 && (
                  <span style={{ color: '#E8521A', fontWeight: 600 }}>
                    {' '}Si el cliente gasta menos de ${Math.min(...tiers.map((t) => parseFloat(t.min_amount) || 0)).toFixed(0)}, verá este premio.
                  </span>
                )}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#1C1917', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Nombre del premio
                  </label>
                  <input
                    value={consolationName}
                    onChange={(e) => setConsolationName(e.target.value)}
                    placeholder="Ej: Gracias por visitarnos"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#1C1917', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Descripción
                  </label>
                  <input
                    value={consolationDesc}
                    onChange={(e) => setConsolationDesc(e.target.value)}
                    placeholder="Ej: Café gratis en tu próxima visita de más de $150"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Preview */}
              {consolationName && (
                <div style={{
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px dashed rgba(245,158,11,0.4)',
                  borderRadius: 10,
                  padding: '12px 16px',
                  marginTop: 14,
                }}>
                  <p style={{ fontSize: 11, color: '#92400e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    Vista previa del cliente
                  </p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1C1917', marginBottom: 2 }}>🎁 {consolationName}</p>
                  <p style={{ fontSize: 12, color: '#78716C', margin: 0 }}>{consolationDesc}</p>
                  <p style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, marginTop: 6, fontFamily: 'monospace' }}>Código: CONS-XXXXXX</p>
                </div>
              )}

              {/* Personalización */}
              <div style={{ marginTop: 20, borderTop: '1px solid #E8E3DC', paddingTop: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1C1917', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Personalización
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#1C1917', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Título de bienvenida
                    </label>
                    <input
                      value={welcomeTitle}
                      onChange={(e) => setWelcomeTitle(e.target.value)}
                      placeholder={`${selectedRestaurant?.name ?? 'Restaurante'} te premia`}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#1C1917', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Subtítulo
                    </label>
                    <input
                      value={welcomeSubtitle}
                      onChange={(e) => setWelcomeSubtitle(e.target.value)}
                      placeholder="Sube la foto de tu ticket y gana premios"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#1C1917', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Color principal
                    </label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {['#E8521A', '#7C3AED', '#0EA5E9', '#16A34A', '#DC2626', '#D97706'].map((c) => (
                        <button
                          key={c}
                          onClick={() => setPrimaryColor(c)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: c,
                            border: primaryColor === c ? '3px solid #1C1917' : '2px solid transparent',
                            cursor: 'pointer',
                            boxShadow: primaryColor === c ? `0 0 0 2px ${c}` : 'none',
                            outline: 'none',
                            flexShrink: 0,
                          }}
                        />
                      ))}
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #E8E3DC', cursor: 'pointer', padding: 2 }}
                        title="Color personalizado"
                      />
                      <span style={{ fontSize: 12, color: '#78716C', fontFamily: 'monospace' }}>{primaryColor}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
                <button onClick={saveConsolation} disabled={consolationSaving} style={primaryBtn}>
                  {consolationSaving ? 'Guardando...' : consolationSaved ? '✓ Guardado' : 'Guardar configuración de consolación'}
                </button>
                {consolationSaved && (
                  <span style={{ color: '#16a34a', fontSize: 13 }}>✓ Guardado correctamente</span>
                )}
              </div>
            </div>

            {/* Ticket Feedback Rating */}
            {avgRating !== null && (
              <div style={{ background: 'white', border: '1px solid #E8E3DC', borderRadius: 14, padding: 20, marginBottom: 20 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1C1917', margin: '0 0 4px' }}>
                  Calificación promedio del ticket scanner
                </h2>
                <p style={{ color: '#78716C', fontSize: 13, marginBottom: 12 }}>
                  Basado en las calificaciones de clientes al finalizar su experiencia.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 42, fontWeight: 900, color: '#E8521A', margin: 0, lineHeight: 1 }}>
                      {avgRating.avg_rating > 0 ? avgRating.avg_rating.toFixed(1) : '—'}
                    </p>
                    <p style={{ fontSize: 12, color: '#78716C', marginTop: 4 }}>de 5 estrellas</p>
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      {[1,2,3,4,5].map((s) => (
                        <span key={s} style={{ fontSize: 20, filter: avgRating.avg_rating >= s ? 'none' : 'grayscale(1) opacity(0.4)' }}>⭐</span>
                      ))}
                    </div>
                    <p style={{ fontSize: 13, color: '#78716C', margin: 0 }}>
                      {avgRating.total} {avgRating.total === 1 ? 'calificación' : 'calificaciones'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* QR Code section */}
            <div style={{ background: 'white', border: '1px solid #E8E3DC', borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1C1917', margin: '0 0 4px' }}>
                    Código QR — Ticket Scanner
                  </h2>
                  <p style={{ color: '#78716C', fontSize: 13, margin: 0 }}>
                    Imprime o comparte este QR para que los clientes escaneen su ticket
                    {selectedRestaurant ? ` de ${selectedRestaurant.name}` : ''}.
                  </p>
                </div>
                <button
                  onClick={() => setKioskModal(true)}
                  style={{ ...primaryBtn, background: '#1C1917', whiteSpace: 'nowrap' }}
                >
                  📱 Ver QR de Kiosk
                </button>
              </div>
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{
                  background: '#FAFAF9',
                  border: '1px solid #E8E3DC',
                  borderRadius: 12,
                  padding: 12,
                  display: 'inline-block',
                }}>
                  <QRCode url={ticketUrl} />
                </div>
                <div>
                  <p style={{ fontSize: 12, color: '#78716C', marginBottom: 8 }}>Enlace directo:</p>
                  <a
                    href={ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 13, color: '#E8521A', wordBreak: 'break-all', textDecoration: 'none', fontWeight: 600 }}
                  >
                    {ticketUrl}
                  </a>
                  <div style={{ marginTop: 12 }}>
                    <button
                      onClick={() => { if (ticketUrl) navigator.clipboard.writeText(ticketUrl); }}
                      style={ghostBtn}
                    >
                      Copiar enlace
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* WhatsApp cashier number */}
            <div style={{ background: 'white', border: '1px solid #E8E3DC', borderRadius: 14, padding: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1C1917', margin: '0 0 4px' }}>
                Número del cajero (WhatsApp VIP)
              </h2>
              <p style={{ color: '#78716C', fontSize: 13, marginBottom: 12 }}>
                Cuando un cliente VIP registre un premio, podrá notificar al cajero por WhatsApp.
              </p>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  value={waNumber}
                  onChange={(e) => setWaNumber(e.target.value)}
                  placeholder="Ej: 5215512345678 (con código de país, sin +)"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button onClick={saveWaNumber} style={primaryBtn}>
                  {waSaved ? '✓ Guardado' : 'Guardar'}
                </button>
              </div>
            </div>

            {/* Kiosk QR Modal */}
            {kioskModal && (
              <div
                onClick={() => setKioskModal(false)}
                style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ background: 'white', borderRadius: 20, padding: 32, maxWidth: 420, width: '90%', textAlign: 'center' }}
                >
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1C1917', marginBottom: 8 }}>
                    QR Modo Kiosk
                  </h3>
                  <p style={{ fontSize: 13, color: '#78716C', marginBottom: 16 }}>
                    Usa este QR en una tablet fija. El escáner se reinicia automáticamente después de cada uso.
                  </p>
                  <div style={{ display: 'inline-block', background: '#FAFAF9', border: '1px solid #E8E3DC', borderRadius: 12, padding: 12, marginBottom: 16 }}>
                    <QRCode url={kioskUrl} />
                  </div>
                  <p style={{ fontSize: 11, color: '#78716C', wordBreak: 'break-all', marginBottom: 16 }}>{kioskUrl}</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => navigator.clipboard.writeText(kioskUrl)}
                      style={{ ...ghostBtn, flex: 1 }}
                    >
                      Copiar URL
                    </button>
                    <button
                      onClick={() => setKioskModal(false)}
                      style={{ ...primaryBtn, flex: 1 }}
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #E8E3DC',
  background: 'white',
  fontSize: 13,
  color: '#1C1917',
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #E8E3DC',
  background: 'white',
  fontSize: 14,
  color: '#1C1917',
  outline: 'none',
};

const primaryBtn: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 10,
  background: '#E8521A',
  color: 'white',
  fontWeight: 700,
  fontSize: 14,
  border: 'none',
  cursor: 'pointer',
};

const ghostBtn: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 10,
  background: 'white',
  color: '#1C1917',
  fontWeight: 600,
  fontSize: 14,
  border: '1px solid #E8E3DC',
  cursor: 'pointer',
};
