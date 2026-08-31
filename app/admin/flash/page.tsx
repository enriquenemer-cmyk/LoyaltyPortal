'use client';
import { BoltIcon } from '@heroicons/react/24/outline';

import { useEffect, useState, useRef, useCallback } from 'react';

type Restaurant = { id: string; name: string };

const TEMPLATES = [
  { name: '2x1 en principales', reason: 'Por tu visita especial', description: 'Disfruta dos principales al precio de uno en cualquier opción del menú.', short: 'Dos platillos al precio de uno' },
  { name: 'Bebida gratis', reason: 'Premio de fidelidad', description: 'Una bebida de tu elección completamente gratis con la compra de cualquier principal.', short: 'Con cualquier compra' },
  { name: '10% de descuento', reason: 'Cliente frecuente', description: '10% de descuento en tu consumo total del día.', short: 'En el consumo total' },
  { name: 'Postre gratis', reason: 'Por tu cumpleaños', description: 'Un postre de temporada gratis para celebrar tu cumpleaños.', short: 'El día de tu cumpleaños' },
  { name: 'Burrito gratis', reason: 'Concurso ganador', description: 'Un burrito de tu elección completamente gratis, del tamaño que prefieras.', short: 'Del tamaño que prefieras' },
  { name: 'Combo especial', reason: 'Premio especial', description: 'Combo especial: principal + bebida + postre a precio especial.', short: 'Principal + bebida + postre' },
];

const DURATIONS = [
  { label: '6 hrs', hours: 6 },
  { label: '12 hrs', hours: 12 },
  { label: '24 hrs', hours: 24 },
  { label: '48 hrs', hours: 48 },
];

type GeneratedPrize = { id: string; url: string };

type ActiveFlash = {
  id: string;
  name: string;
  end_date: string;
  restaurant_name?: string;
};

function useCountdown(target: Date | null) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!target) return;
    function update() {
      const diff = target!.getTime() - Date.now();
      if (diff <= 0) { setRemaining('Expirado'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [target]);

  return remaining;
}

function CountdownBadge({ endDate }: { endDate: string }) {
  const target = useRef(new Date(endDate));
  const remaining = useCountdown(target.current);
  const diff = target.current.getTime() - Date.now();
  const urgent = diff < 3 * 3600000;

  return (
    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${urgent ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-700'}`}>
      {remaining}
    </span>
  );
}

export default function FlashPage() {
  const [templateIdx, setTemplateIdx] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(50);
  const [durationHours, setDurationHours] = useState(24);
  const [restaurantId, setRestaurantId] = useState('');
  const [message, setMessage] = useState('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);

  const [launching, setLaunching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generated, setGenerated] = useState<GeneratedPrize[]>([]);
  const [campaignEndDate, setCampaignEndDate] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [activeFlashes, setActiveFlashes] = useState<ActiveFlash[]>([]);
  const [loadingActive, setLoadingActive] = useState(true);

  const endDateTarget = campaignEndDate;
  const campaignCountdown = useCountdown(endDateTarget);

  useEffect(() => {
    fetch('/api/restaurants')
      .then((r) => r.json())
      .then((d) => { if (d.restaurants) setRestaurants(d.restaurants); })
      .finally(() => setLoadingRestaurants(false));
  }, []);

  const fetchActiveFlashes = useCallback(async () => {
    try {
      const res = await fetch('/api/prizes/expiring?hours=48');
      if (!res.ok) return;
      const data = await res.json();
      setActiveFlashes(data.prizes ?? []);
    } catch {
      // ignore
    } finally {
      setLoadingActive(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveFlashes();
  }, [fetchActiveFlashes]);

  const selectedTemplate = templateIdx !== null ? TEMPLATES[templateIdx] : null;
  const restaurantName = restaurants.find((r) => r.id === restaurantId)?.name ?? '';

  const defaultMessage = selectedTemplate
    ? ` CAMPAÑA FLASH - ${selectedTemplate.name.toUpperCase()}\n\nPor tiempo limitado (${durationHours}h) en ${restaurantName || 'el restaurante'}:\n\n${selectedTemplate.description}\n\n¡Escanea tu QR exclusivo y canjea hoy mismo!`
    : '';

  async function handleLaunch() {
    if (templateIdx === null) { setError('Selecciona un tipo de premio.'); return; }
    setError('');
    setGenerated([]);
    setProgress(0);
    setLaunching(true);

    const now = new Date();
    const endDate = new Date(now.getTime() + durationHours * 3600 * 1000);
    const startStr = now.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const tpl = TEMPLATES[templateIdx];
    const payload = {
      name: tpl.name,
      reason: tpl.reason,
      description: tpl.description,
      start_date: startStr,
      end_date: endStr,
      restaurant_id: restaurantId || undefined,
      max_uses: 1,
    };

    const prizes: GeneratedPrize[] = [];
    try {
      for (let i = 0; i < quantity; i++) {
        const res = await fetch('/api/prizes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Error al crear premio.'); break; }
        const sig = data.sig as string | undefined;
        const url = `${window.location.origin}/premio/${data.prize.id}${sig ? `?sig=${sig}` : ''}`;
        prizes.push({ id: data.prize.id, url });
        setProgress(i + 1);
        setGenerated([...prizes]);
      }
      setCampaignEndDate(endDate);
      fetchActiveFlashes();
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLaunching(false);
    }
  }

  function copyAllLinks() {
    const text = generated.map((p, i) => `QR ${i + 1}: ${p.url}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message || defaultMessage)}`;

  const progressPct = quantity > 0 ? Math.round((progress / quantity) * 100) : 0;
  const done = generated.length === quantity && quantity > 0 && !launching;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <BoltIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Campaña Flash
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">CAMPAÑA FLASH</h1>
          <p className="text-orange-200/70 mt-1.5 text-sm">
            Genera decenas de QRs en segundos. Activa una campaña de tiempo limitado ahora mismo.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* ── FORM CARD ────────────────────────────────────────── */}
        {!done && (
          <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm overflow-hidden">

            {/* 1. Premio */}
            <div className="px-6 pt-6 pb-5 border-b border-[#F0EDE8]">
              <label className="block text-[10px] font-bold tracking-[0.2em] text-[#1a6b3c] uppercase mb-3">
                1. Tipo de Premio
              </label>
              <div className="rounded-xl overflow-hidden border border-[#E8E3DC]">
                {TEMPLATES.map((tpl, i) => {
                  const active = templateIdx === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setTemplateIdx(i)}
                      className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-all ${
                        i < TEMPLATES.length - 1 ? 'border-b border-[#F0EDE8]' : ''
                      } ${active ? 'bg-orange-50' : 'hover:bg-stone-50'}`}
                    >
                      <div
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                        style={{
                          borderColor: active ? '#F97316' : '#D6D0C4',
                          background: active ? '#F97316' : 'transparent',
                        }}
                      >
                        {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-sm font-semibold text-stone-900 flex-1 truncate">{tpl.name}</span>
                      <span className="text-xs text-stone-400 hidden sm:block shrink-0">{tpl.short}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Cantidad */}
            <div className="px-6 py-5 border-b border-[#F0EDE8]">
              <label className="block text-[10px] font-bold tracking-[0.2em] text-[#1a6b3c] uppercase mb-3">
                2. Cantidad de QRs <span className="text-stone-400 normal-case font-normal">(10–500)</span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={10}
                  max={500}
                  step={5}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="flex-1 accent-orange-500"
                />
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.min(500, Math.max(10, parseInt(e.target.value) || 10)))}
                  className="w-20 bg-white border border-[#E8E3DC] rounded-lg px-3 py-2 text-sm text-stone-900 text-center focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <p className="text-xs text-stone-400 mt-2">{quantity} códigos únicos de un solo uso</p>
            </div>

            {/* 3. Duración */}
            <div className="px-6 py-5 border-b border-[#F0EDE8]">
              <label className="block text-[10px] font-bold tracking-[0.2em] text-[#1a6b3c] uppercase mb-3">
                3. Duración
              </label>
              <div className="flex gap-2 flex-wrap">
                {DURATIONS.map((d) => (
                  <button
                    key={d.hours}
                    type="button"
                    onClick={() => setDurationHours(d.hours)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                      durationHours === d.hours
                        ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30'
                        : 'bg-white border-[#E8E3DC] text-stone-500 hover:border-stone-300 hover:text-stone-700'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Restaurante */}
            <div className="px-6 py-5 border-b border-[#F0EDE8]">
              <label className="block text-[10px] font-bold tracking-[0.2em] text-[#1a6b3c] uppercase mb-3">
                4. Restaurante
              </label>
              {loadingRestaurants ? (
                <p className="text-sm text-stone-400">Cargando...</p>
              ) : (
                <select
                  value={restaurantId}
                  onChange={(e) => setRestaurantId(e.target.value)}
                  className="w-full bg-white border border-[#E8E3DC] rounded-lg px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Sin restaurante específico</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* 5. Mensaje personalizado */}
            <div className="px-6 py-5">
              <label className="block text-[10px] font-bold tracking-[0.2em] text-[#1a6b3c] uppercase mb-1">
                5. Mensaje para WhatsApp <span className="text-stone-400 normal-case font-normal">(opcional)</span>
              </label>
              <p className="text-xs text-stone-400 mb-3">Se pre-completará con los datos del premio si lo dejas vacío.</p>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={defaultMessage || 'Escribe el mensaje que enviarás...'}
                className="w-full bg-white border border-[#E8E3DC] rounded-lg px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* ── ERROR ─────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── PROGRESS ──────────────────────────────────────────── */}
        {(launching || (progress > 0 && !done)) && (
          <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm px-6 py-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-base font-bold text-stone-900">
                Generando {progress}/{quantity}...
              </p>
              <span className="text-[#1a6b3c] font-bold text-sm">{progressPct}%</span>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full transition-all duration-200"
                style={{
                  width: `${progressPct}%`,
                  background: 'linear-gradient(90deg, #F97316, #EA580C)',
                  boxShadow: '0 0 12px rgba(249,115,22,0.4)',
                }}
              />
            </div>
            <p className="text-xs text-stone-400 mt-2">{quantity - progress} restantes...</p>
          </div>
        )}

        {/* ── LAUNCH BUTTON ─────────────────────────────────────── */}
        {!done && (
          <button
            type="button"
            disabled={launching || templateIdx === null}
            onClick={handleLaunch}
            className="w-full py-5 rounded-2xl text-white text-xl font-black tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            style={{
              background: launching ? '#7c2d12' : 'linear-gradient(135deg, #F97316 0%, #C2410C 50%, #c2410c 100%)',
              boxShadow: launching ? 'none' : '0 8px 32px rgba(249,115,22,0.45)',
            }}
          >
            {launching ? (
              <>
                <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Lanzando campaña...
              </>
            ) : (
              <><BoltIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Lanzar Campaña Flash</>
            )}
          </button>
        )}

        {/* ── SUCCESS VIEW ──────────────────────────────────────── */}
        {done && (
          <>
            {/* Hero success */}
            <div
              className="rounded-2xl px-6 py-8 text-center"
              style={{ background: 'linear-gradient(135deg, #14532d 0%, #166534 100%)', border: '1px solid rgba(34,197,94,0.3)' }}
            >
              <div className="text-5xl mb-3"><BoltIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></div>
              <h2 className="text-3xl font-black text-white mb-1">¡Campaña activa!</h2>
              <p className="text-green-200 text-sm mb-5">
                {generated.length} QRs generados exitosamente
              </p>
              {campaignEndDate && (
                <div className="inline-flex items-center gap-2 bg-black/20 rounded-full px-4 py-2">
                  <span className="text-xs text-green-200">Expira en</span>
                  <span className="font-mono font-bold text-white text-sm">{campaignCountdown}</span>
                </div>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'QRs generados', value: generated.length },
                { label: 'Duración', value: `${durationHours}h` },
                { label: 'Premio', value: selectedTemplate?.name ?? '—' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white border border-[#E8E3DC] shadow-sm rounded-xl px-4 py-4 text-center">
                  <p className="text-xl font-black text-[#1a6b3c] truncate">{stat.value}</p>
                  <p className="text-[10px] text-stone-400 mt-1 uppercase tracking-widest">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Copy all links */}
            <div className="bg-white border border-[#E8E3DC] shadow-sm rounded-2xl px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-stone-900 text-sm">Links generados</h3>
                <button
                  onClick={copyAllLinks}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{ background: copied ? '#dcfce7' : 'rgba(249,115,22,0.1)', color: copied ? '#166534' : '#C2410C', border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(249,115,22,0.25)'}` }}
                >
                  {copied ? (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> ¡Copiado!</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copiar todos los links</>
                  )}
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {generated.slice(0, 20).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 text-xs">
                    <span className="text-stone-400 w-6 text-right shrink-0">#{i + 1}</span>
                    <a href={p.url} target="_blank" rel="noreferrer" className="text-[#1a6b3c] hover:text-orange-600 font-mono truncate transition-colors">
                      {p.url}
                    </a>
                  </div>
                ))}
                {generated.length > 20 && (
                  <p className="text-xs text-stone-400 pl-8">... y {generated.length - 20} más</p>
                )}
              </div>
            </div>

            {/* WhatsApp section */}
            <div className="bg-white border border-[#E8E3DC] shadow-sm rounded-2xl px-6 py-5">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <h3 className="font-bold text-stone-900 text-sm">Mensaje para blast de WhatsApp</h3>
              </div>
              <div className="bg-stone-50 border border-[#F0EDE8] rounded-xl px-4 py-3 mb-4">
                <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
                  {message || defaultMessage}
                </p>
              </div>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm text-white transition-all"
                style={{ background: '#25D366', boxShadow: '0 4px 16px rgba(37,211,102,0.3)' }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Enviar por WhatsApp
              </a>
            </div>

            {/* Nueva campaña */}
            <button
              onClick={() => {
                setGenerated([]);
                setProgress(0);
                setTemplateIdx(null);
                setCampaignEndDate(null);
                setError('');
                setMessage('');
              }}
              className="w-full py-3 rounded-xl text-sm font-semibold text-stone-500 hover:text-stone-900 border border-[#E8E3DC] hover:border-stone-300 transition-all"
            >
              Lanzar otra campaña flash
            </button>
          </>
        )}

        {/* ── CAMPAÑAS ACTIVAS ───────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#F0EDE8] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <h3 className="font-bold text-stone-900 text-sm">Campanas activas</h3>
              <span className="text-[10px] text-stone-400 uppercase tracking-wider">(expiran en 48h)</span>
            </div>
            <button
              onClick={fetchActiveFlashes}
              className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
            >
              Actualizar
            </button>
          </div>

          {loadingActive ? (
            <div className="px-6 py-8 text-center text-sm text-stone-400">Cargando...</div>
          ) : activeFlashes.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-stone-400">No hay campanas expirando pronto.</p>
              <p className="text-xs text-stone-300 mt-1">Lanza tu primera campaña flash arriba.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F0EDE8]">
              {activeFlashes.map((flash) => (
                <div key={flash.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{flash.name}</p>
                    {flash.restaurant_name && (
                      <p className="text-xs text-stone-500 mt-0.5">{flash.restaurant_name}</p>
                    )}
                  </div>
                  <CountdownBadge endDate={flash.end_date} />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
