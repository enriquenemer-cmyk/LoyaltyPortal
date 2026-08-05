'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const QRPreviewMini = dynamic(() => import('../campanas/QRPreview'), { ssr: false });

type Restaurant = { id: string; name: string };
type Campaign = {
  id: string;
  name: string;
  qr_dot_color: string;
  qr_background: string;
  qr_dot_style: string;
  qr_corner_style: string;
  qr_gradient_end: string | null;
};
type QRResult = { id: string; url: string; qrDataUrl: string; index: number; sig?: string };

const inputClass =
  'w-full bg-white border border-[#E8E3DC] rounded-lg px-3 py-2.5 text-sm text-[#1C1917] placeholder-[#a8a29e] focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors';

const labelClass = 'block text-[10px] font-semibold text-[#78716c] uppercase tracking-widest mb-1.5';
const helperClass = 'text-xs text-stone-400 mt-1 leading-relaxed';

type Template = { name: string; reason: string; description: string; short: string; emoji: string };

const TEMPLATES: Template[] = [
  { name: '2x1 en principales', reason: 'Por tu visita especial', description: 'Disfruta dos principales al precio de uno en cualquier opción del menú.', short: 'Dos platillos al precio de uno', emoji: '🍽️' },
  { name: 'Bebida gratis', reason: 'Premio de fidelidad', description: 'Una bebida de tu elección completamente gratis con la compra de cualquier principal.', short: 'Con cualquier compra', emoji: '🥤' },
  { name: '10% de descuento', reason: 'Cliente frecuente', description: '10% de descuento en tu consumo total del día.', short: 'En el consumo total', emoji: '💰' },
  { name: 'Postre gratis', reason: 'Por tu cumpleaños', description: 'Un postre de temporada gratis para celebrar tu cumpleaños.', short: 'El día de tu cumpleaños', emoji: '🎂' },
  { name: 'Burrito gratis', reason: 'Concurso ganador', description: 'Un burrito de tu elección completamente gratis, del tamaño que prefieras.', short: 'Del tamaño que prefieras', emoji: '🌯' },
  { name: 'Combo especial', reason: 'Premio especial', description: 'Combo especial: principal + bebida + postre a precio especial.', short: 'Principal + bebida + postre', emoji: '🎁' },
];

const DRAFT_KEY = 'premia-draft';

async function addLogoToQR(qrDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = img.width;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(qrDataUrl); return; }
      ctx.drawImage(img, 0, 0, size, size);

      const overlaySize = Math.round(size * 0.20);
      const x = (size - overlaySize) / 2;
      const y = (size - overlaySize) / 2;
      const radius = overlaySize * 0.2;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + overlaySize - radius, y);
      ctx.quadraticCurveTo(x + overlaySize, y, x + overlaySize, y + radius);
      ctx.lineTo(x + overlaySize, y + overlaySize - radius);
      ctx.quadraticCurveTo(x + overlaySize, y + overlaySize, x + overlaySize - radius, y + overlaySize);
      ctx.lineTo(x + radius, y + overlaySize);
      ctx.quadraticCurveTo(x, y + overlaySize, x, y + overlaySize - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.15)';
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#2563EB';
      ctx.font = `bold ${Math.round(overlaySize * 0.38)}px sans-serif`;
      ctx.fillText('PT', size / 2, size / 2);
      ctx.restore();

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(qrDataUrl);
    img.src = qrDataUrl;
  });
}

function RestaurantCombobox({
  restaurants,
  value,
  onChange,
}: {
  restaurants: Restaurant[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = restaurants.find((r) => r.id === value) ?? null;
  const filtered = query.trim()
    ? restaurants.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))
    : restaurants;
  const visible = filtered.slice(0, 8);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = useCallback((r: Restaurant) => {
    onChange(r.id);
    setQuery('');
    setOpen(false);
  }, [onChange]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, visible.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (visible[highlighted]) handleSelect(visible[highlighted]); }
    else if (e.key === 'Escape') { setOpen(false); }
  }

  function handleClear() {
    onChange('');
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center w-full bg-white border border-[#E8E3DC] rounded-lg px-3 py-2.5 text-sm focus-within:ring-1 focus-within:ring-[#2563EB]/30 focus-within:border-[#2563EB] transition-colors cursor-text"
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
      >
        {selected && !open ? (
          <>
            <span className="flex-1 text-[#1C1917] truncate">{selected.name}</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); handleClear(); }} className="ml-2 text-[#a8a29e] hover:text-[#1C1917] transition-colors text-base leading-none" aria-label="Limpiar">×</button>
          </>
        ) : (
          <>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setHighlighted(0); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={selected ? selected.name : 'Buscar restaurante...'}
              className="flex-1 bg-transparent outline-none text-[#1C1917] placeholder-[#a8a29e] min-w-0"
            />
            {(query || selected) && (
              <button type="button" onClick={(e) => { e.stopPropagation(); handleClear(); }} className="ml-2 text-[#a8a29e] hover:text-[#1C1917] transition-colors text-base leading-none" aria-label="Limpiar">×</button>
            )}
          </>
        )}
      </div>
      {open && visible.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-[#E8E3DC] rounded-lg shadow-md overflow-y-auto max-h-[260px] py-1" role="listbox">
          <li
            key="__none__"
            role="option"
            aria-selected={value === ''}
            onMouseDown={(e) => { e.preventDefault(); onChange(''); setQuery(''); setOpen(false); }}
            className={`px-3 py-2 text-sm cursor-pointer transition-colors ${value === '' ? 'bg-blue-50 text-[#2563EB] font-medium' : 'text-[#78716c] hover:bg-[#FAFAF9]'}`}
          >
            Sin restaurante
          </li>
          {visible.map((r, i) => (
            <li
              key={r.id}
              role="option"
              aria-selected={r.id === value}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(r); }}
              onMouseEnter={() => setHighlighted(i)}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${r.id === value ? 'bg-blue-50 text-[#2563EB] font-medium' : i === highlighted ? 'bg-[#FAFAF9] text-[#1C1917]' : 'text-[#1C1917] hover:bg-[#FAFAF9]'}`}
            >
              {r.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StepBar({ step }: { step: 1 | 2 }) {
  const steps = [
    { n: 1, label: 'Premio' },
    { n: 2, label: 'Configuración' },
  ];
  return (
    <div className="bg-white border-b border-[#E8E3DC] px-6 py-4 mb-0">
      {/* Mobile: compact step indicator */}
      <div className="flex md:hidden items-center gap-2">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: '#2563EB', color: '#fff' }}
        >
          {step}
        </div>
        <span className="text-sm font-semibold text-[#1C1917]">
          {steps[step - 1].label}
        </span>
        <span className="text-xs text-[#a8a29e] ml-auto">Paso {step} de 2</span>
      </div>

      {/* Desktop: full stepper */}
      <div className="hidden md:flex items-center">
        {steps.map((s, idx) => {
          const done = step > s.n;
          const active = step === s.n;
          return (
            <div key={s.n} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all"
                  style={{
                    background: done || active ? '#2563EB' : '#e7e5e4',
                    color: done || active ? '#fff' : '#a8a29e',
                    border: !done && !active ? '2px solid #e7e5e4' : 'none',
                  }}
                >
                  {done ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : s.n}
                </div>
                <span
                  className="text-sm transition-all"
                  style={{
                    color: active ? '#1C1917' : done ? '#a8a29e' : '#a8a29e',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {s.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className="w-12 sm:w-20 h-px mx-3 bg-[#E8E3DC]" />
              )}
              {idx === steps.length - 1 && (
                <>
                  <div className="w-12 sm:w-20 h-px mx-3 bg-[#E8E3DC]" />
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                      style={{ background: '#e7e5e4', color: '#a8a29e', border: '2px solid #e7e5e4' }}
                    >
                      ✓
                    </div>
                    <span className="text-sm text-[#a8a29e]">Generar</span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExplainerCard() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-5 border border-[#E8E3DC] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#FAFAF9] hover:bg-[#F5F5F4] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">💡</span>
          <span className="text-sm font-semibold text-[#1C1917]">¿Para qué sirve esto?</span>
        </div>
        <svg
          className={`w-4 h-4 text-[#a8a29e] transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 py-3 bg-white border-t border-[#E8E3DC]">
          <p className="text-sm text-[#78716c] leading-relaxed">
            Los premios QR son códigos únicos que puedes imprimir, enviar por WhatsApp o mostrar en pantalla. El cliente los escanea, se registra, y va a tu sucursal a cobrarlo.
          </p>
        </div>
      )}
    </div>
  );
}

function MockQR() {
  const pattern = [
    [1,1,1,0,1,1,1],[1,0,1,0,1,0,1],[1,1,1,0,1,1,1],[0,0,0,0,0,0,0],[1,0,1,1,1,0,1],[0,1,0,0,0,1,0],[1,1,0,1,0,1,1]
  ];
  return (
    <svg width="56" height="56" viewBox="0 0 7 7">
      {pattern.map((row, y) => row.map((cell, x) => cell ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="white" /> : null))}
    </svg>
  );
}

function GenerateForm() {
  const searchParams = useSearchParams();

  const [step, setStep] = useState<1 | 2>(1);
  const [previewName, setPreviewName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<number | 'custom' | null>(null);

  const [form, setForm] = useState({
    name: searchParams.get('name') || '',
    reason: searchParams.get('reason') || '',
    start_date: '',
    end_date: '',
    description: searchParams.get('description') || '',
    restaurant_id: searchParams.get('restaurant_id') || '',
    photo_url: '',
    campaign_id: '',
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  const [quantity, setQuantity] = useState(1);
  const [singleUse, setSingleUse] = useState(true);
  const [maxUses, setMaxUses] = useState(2);
  const [stockLimit, setStockLimit] = useState<string>('');

  // Scheduling
  const [activateAt, setActivateAt] = useState(''); // datetime-local value
  // Time-window validity
  const [validDays, setValidDays] = useState<number[]>([]); // e.g. [1,2,3,4,5]
  const [validHoursFrom, setValidHoursFrom] = useState('');
  const [validHoursTo, setValidHoursTo] = useState('');

  const [gameType, setGameType] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [results, setResults] = useState<QRResult[]>([]);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(true);
  const [savedIndicator, setSavedIndicator] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        setForm((prev) => ({
          ...prev,
          name: draft.name ?? prev.name,
          reason: draft.reason ?? prev.reason,
          description: draft.description ?? prev.description,
        }));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ name: form.name, reason: form.reason, description: form.description }));
        setSavedIndicator(true);
        setTimeout(() => setSavedIndicator(false), 2000);
      } catch { /* ignore */ }
    }, 800);
    return () => clearTimeout(timer);
  }, [form.name, form.reason, form.description]);

  useEffect(() => {
    fetch('/api/restaurants')
      .then((r) => r.json())
      .then((data) => { if (data.restaurants) setRestaurants(data.restaurants); })
      .finally(() => setRestaurantsLoading(false));
  }, []);

  useEffect(() => {
    setCampaignsLoading(true);
    const url = form.restaurant_id
      ? `/api/campaigns?restaurant_id=${form.restaurant_id}`
      : '/api/campaigns';
    fetch(url)
      .then((r) => r.json())
      .then((data) => { if (data.campaigns) setCampaigns(data.campaigns); })
      .finally(() => setCampaignsLoading(false));
  }, [form.restaurant_id]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'name') setPreviewName(value);
  }

  function setQuickEndDate(days: number) {
    const now = new Date();
    const start = form.start_date || now.toISOString().split('T')[0];
    const end = new Date(now);
    end.setDate(now.getDate() + days);
    setForm((prev) => ({ ...prev, start_date: start, end_date: end.toISOString().split('T')[0] }));
  }

  function setQuickDates(days: number | 'week' | 'month') {
    const now = new Date();
    const start = now.toISOString().split('T')[0];
    let end: Date;
    if (days === 'week') {
      end = new Date(now);
      end.setDate(now.getDate() + (7 - now.getDay()));
    } else if (days === 'month') {
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else {
      end = new Date(now);
      end.setDate(now.getDate() + (days as number));
    }
    setForm((prev) => ({ ...prev, start_date: start, end_date: end.toISOString().split('T')[0] }));
  }

  function downloadOne(r: QRResult) {
    const a = document.createElement('a');
    a.href = r.qrDataUrl;
    a.download = `qr-${form.name.toLowerCase().replace(/\s+/g, '-')}-${r.index}.png`;
    a.click();
  }

  async function downloadAll() {
    if (results.length === 1) { downloadOne(results[0]); return; }
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    results.forEach(r => {
      const b64 = r.qrDataUrl.split(',')[1];
      zip.file(`qr-${form.name.replace(/\s+/g, '-')}-${r.index}.png`, b64, { base64: true });
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `qrs-${form.name.replace(/\s+/g, '-')}.zip`; a.click();
    URL.revokeObjectURL(url);
  }

  function printAll() {
    const w = window.open('', '_blank');
    if (!w) return;
    const cards = results.map(r => `
      <div class="card">
        <div class="badge">Premio Verificado</div>
        <h2>${form.name}</h2>
        <p>${form.reason}</p>
        <img src="${r.qrDataUrl}" alt="QR ${r.index}" />
        ${results.length > 1 ? `<p class="num">QR #${r.index} de ${results.length}</p>` : ''}
      </div>`).join('');
    w.document.write(`<!DOCTYPE html><html><head><title>QR - ${form.name}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#f8fafc;padding:20px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
    .card{background:white;border-radius:12px;padding:24px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.08);page-break-inside:avoid}
    .badge{display:inline-block;background:#f5f5f4;color:#44403c;font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:3px 10px;border-radius:4px;margin-bottom:10px}
    h2{font-size:16px;font-weight:700;color:#1c1917;margin-bottom:4px}p{color:#78716c;font-size:12px;margin-bottom:12px}
    img{width:200px;height:200px;border:1px solid #e8e3dc;border-radius:8px;padding:8px}.num{color:#a8a29e;font-size:11px;margin-top:8px}
    @media print{body{background:white}}</style></head>
    <body><div class="grid">${cards}</div></body></html>`);
    w.document.close(); w.print();
  }

  async function generateStyledQR(url: string, campaign?: Campaign | null): Promise<string> {
    const QRCodeStyling = (await import('qr-code-styling')).default;
    const dotColor = campaign?.qr_dot_color ?? '#0f172a';
    const bgColor = campaign?.qr_background ?? '#ffffff';
    const cornerStyle = (campaign?.qr_corner_style ?? 'square') as 'square' | 'extra-rounded' | 'dot';
    const gradientEnd = campaign?.qr_gradient_end;

    const dotOptions: Record<string, unknown> = gradientEnd ? {
      type: campaign?.qr_dot_style ?? 'square',
      gradient: {
        type: 'linear',
        rotation: 45,
        colorStops: [
          { offset: 0, color: dotColor },
          { offset: 1, color: gradientEnd },
        ],
      },
    } : { type: campaign?.qr_dot_style ?? 'square', color: dotColor };

    const qr = new QRCodeStyling({
      width: 320,
      height: 320,
      type: 'canvas',
      data: url,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dotsOptions: dotOptions as any,
      cornersSquareOptions: { type: cornerStyle, color: dotColor },
      cornersDotOptions: { type: 'dot', color: dotColor },
      backgroundOptions: { color: bgColor },
      qrOptions: { errorCorrectionLevel: 'M' },
    });

    const blob = await qr.getRawData('png');
    if (!blob) throw new Error('QR generation failed');
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob as Blob);
    });
  }

  async function handleGenerate() {
    setError('');
    setResults([]);
    setProgress(0);
    setLoading(true);

    const selectedCampaign = campaigns.find(c => c.id === form.campaign_id) ?? null;
    const generated: QRResult[] = [];

    try {
      for (let i = 0; i < quantity; i++) {
        const res = await fetch('/api/prizes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            max_uses: singleUse ? 1 : maxUses,
            stock_limit: stockLimit !== '' ? parseInt(stockLimit, 10) : null,
            activate_at: activateAt ? new Date(activateAt).toISOString() : null,
            valid_days: validDays.length > 0 ? validDays.join(',') : null,
            valid_hours: validHoursFrom && validHoursTo ? `${validHoursFrom}-${validHoursTo}` : null,
            game_type: gameType || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Error al crear el premio.'); break; }

        const sig = data.sig as string | undefined;
        const url = `${window.location.origin}/premio/${data.prize.id}${sig ? `?sig=${sig}` : ''}`;
        const rawQr = await generateStyledQR(url, selectedCampaign);
        const qrDataUrl = await addLogoToQR(rawQr);

        generated.push({ id: data.prize.id, url, qrDataUrl, index: i + 1, sig });
        setProgress(i + 1);
        setResults([...generated]);
      }
    } catch {
      setError('Error de conexion. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function resetWizard() {
    setStep(1);
    setSelectedTemplate(null);
    setForm({ name: '', reason: '', start_date: '', end_date: '', description: '', restaurant_id: '', photo_url: '', campaign_id: '' });
    setQuantity(1);
    setSingleUse(true);
    setMaxUses(2);
    setStockLimit('');
    setActivateAt('');
    setValidDays([]);
    setValidHoursFrom('');
    setValidHoursTo('');
    setGameType('');
    setResults([]);
    setError('');
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  }

  // ——— RESULTS VIEW ———
  if (results.length > 0 && !loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9]">
        <div className="max-w-2xl mx-auto px-4 py-10">
          {/* Header */}
          <div className="mb-8">
            <p className="text-xs font-semibold text-[#2563EB] uppercase tracking-widest mb-2">Completado</p>
            <h1 className="text-2xl font-bold text-[#1C1917]">
              {results.length === 1 ? 'Código generado' : `${results.length} códigos generados`}
            </h1>
            <p className="text-sm text-[#78716c] mt-1">{form.name}</p>
          </div>

          {/* QR display */}
          {results.length === 1 ? (
            <div className="bg-white border border-[#E8E3DC] rounded-2xl p-8 mb-4 flex flex-col items-center">
              <img
                src={results[0].qrDataUrl}
                alt="QR"
                className="block"
                style={{ width: 240, height: 240 }}
              />
              <p className="mt-4 text-xs text-[#a8a29e] font-mono break-all text-center">{results[0].url}</p>
              <div className="flex gap-6 mt-5">
                <button
                  onClick={() => downloadOne(results[0])}
                  className="flex items-center gap-1.5 text-sm text-[#1C1917] hover:text-[#2563EB] transition-colors font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Descargar PNG
                </button>
                <button
                  onClick={printAll}
                  className="flex items-center gap-1.5 text-sm text-[#1C1917] hover:text-[#2563EB] transition-colors font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  Imprimir
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
                {results.map(r => (
                  <div key={r.id} className="bg-white border border-[#E8E3DC] rounded-xl p-3 flex flex-col items-center">
                    <img src={r.qrDataUrl} alt={`QR ${r.index}`} className="block rounded" style={{ width: 80, height: 80 }} />
                    <button
                      onClick={() => downloadOne(r)}
                      className="mt-2 text-[10px] text-[#78716c] hover:text-[#2563EB] transition-colors"
                    >
                      Descargar
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={downloadAll}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-[#E8E3DC] rounded-xl text-sm font-medium text-[#1C1917] hover:bg-[#FAFAF9] transition-colors mb-4"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Descargar todos (ZIP)
              </button>
            </>
          )}

          <button
            onClick={resetWizard}
            className="flex items-center gap-1.5 text-sm text-[#78716c] hover:text-[#1C1917] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" /></svg>
            Generar otro
          </button>
        </div>
      </div>
    );
  }

  // ——— WIZARD ———
  const step1Valid = form.name.trim() !== '' && form.reason.trim() !== '' && form.description.trim() !== '';

  // Date validation
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const oneYearFromNow = new Date(today); oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  const startD = form.start_date ? new Date(form.start_date + 'T00:00:00') : null;
  const endD = form.end_date ? new Date(form.end_date + 'T00:00:00') : null;
  const dateError = startD && endD && startD > endD ? 'La fecha de fin debe ser posterior a la fecha de inicio' : null;
  const dateWarnPast = endD && endD < today ? 'La fecha de fin ya pasó — el premio vencerá inmediatamente' : null;
  const dateWarnFuture = startD && startD > oneYearFromNow ? 'Fecha de inicio muy lejana' : null;

  const step2Valid = step1Valid && form.start_date !== '' && form.end_date !== '' && !dateError;

  // Live prize-card preview
  const QRPreview = (
    <div className="sticky top-6">
      <div className="text-[10px] font-bold text-[#a8a29e] uppercase tracking-widest mb-2 text-center">Vista previa</div>
      {/* Prize card */}
      <div
        className="rounded-2xl overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0891B2 100%)' }}
      >
        <div className="px-5 pt-5 pb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200 mb-1">3E</p>
          <p
            className="text-white font-extrabold text-lg leading-tight min-h-[2rem] transition-all duration-300"
            style={{ wordBreak: 'break-word' }}
          >
            {previewName || 'Tu premio'}
          </p>
          <p className="text-blue-200 text-xs mt-1">
            {form.end_date ? `Válido hasta: ${form.end_date}` : 'Fecha por definir'}
          </p>
        </div>

        {/* QR area */}
        <div className="mx-5 mb-5 bg-white/15 rounded-xl flex flex-col items-center py-4 gap-2">
          <MockQR />
          <p className="text-white/60 text-[10px] uppercase tracking-widest">Escanea aquí</p>
        </div>
      </div>

      <p className="text-[10px] text-[#a8a29e] text-center mt-3 leading-relaxed">
        Así verá el cliente su premio al escanear el QR
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-[#1C1917] tracking-tight">Generar premio QR</h1>
          <p className="text-sm text-[#78716c] mt-1">Crea un premio digital con código QR en 2 pasos.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form card */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E8E3DC] overflow-hidden">
            <StepBar step={step} />

            {/* ——— STEP 1: Premio ——— */}
            {step === 1 && (
              <div className="p-6">
                <div className="mb-5">
                  <h2 className="text-base font-bold text-[#1C1917]">Detalles del premio</h2>
                  <p className="text-sm text-[#a8a29e] mt-0.5">Nombre, razón, descripción y plantilla</p>
                  {savedIndicator && <span className="text-xs text-[#a8a29e] mt-1 block">Borrador guardado</span>}
                </div>

                {/* Explainer card */}
                <ExplainerCard />

                {/* Template grid cards */}
                <div className="mb-5">
                  <label className={labelClass}>Plantilla rápida</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {TEMPLATES.map((tpl, i) => {
                      const active = selectedTemplate === i;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setSelectedTemplate(i);
                            setForm((prev) => ({ ...prev, name: tpl.name, reason: tpl.reason, description: tpl.description }));
                            setPreviewName(tpl.name);
                          }}
                          className={`relative text-left rounded-xl p-4 border cursor-pointer transition-all ${
                            active
                              ? 'border-[#2563EB] bg-blue-50 shadow-sm'
                              : 'border-[#E8E3DC] bg-white hover:border-[#2563EB]/40 hover:shadow-sm'
                          }`}
                        >
                          {active && (
                            <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#2563EB] flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                          <div className="text-3xl mb-2">{tpl.emoji}</div>
                          <p className="text-sm font-bold text-[#1C1917] leading-tight mb-0.5">{tpl.name}</p>
                          <p className="text-[11px] text-[#a8a29e] leading-snug">{tpl.short}</p>
                        </button>
                      );
                    })}
                    {/* Custom card */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTemplate('custom');
                        setForm((prev) => ({ ...prev, name: '', reason: '', description: '' }));
                        setPreviewName('');
                      }}
                      className={`relative text-left rounded-xl p-4 border cursor-pointer transition-all ${
                        selectedTemplate === 'custom'
                          ? 'border-[#2563EB] bg-blue-50 shadow-sm'
                          : 'border-dashed border-[#E8E3DC] bg-white hover:border-[#2563EB]/40 hover:shadow-sm'
                      }`}
                    >
                      {selectedTemplate === 'custom' && (
                        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#2563EB] flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                      <div className="text-3xl mb-2">✏️</div>
                      <p className="text-sm font-bold text-[#1C1917] leading-tight mb-0.5">Personalizado</p>
                      <p className="text-[11px] text-[#a8a29e] leading-snug">Crea desde cero</p>
                    </button>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className={labelClass}>Nombre del premio <span className="text-[#2563EB]">*</span></label>
                    <input name="name" value={form.name} onChange={handleChange} required placeholder="Ej: 2x1 en principales" className={inputClass} />
                    <p className={helperClass}>Lo que el cliente verá en grande. Ej: &ldquo;2x1 en principales&rdquo; o &ldquo;Bebida gratis&rdquo;</p>
                  </div>
                  <div>
                    <label className={labelClass}>Razón por la que ganan <span className="text-[#2563EB]">*</span></label>
                    <textarea name="reason" value={form.reason} onChange={handleChange} required rows={2} placeholder="Ej: Por participar en el concurso de Instagram" className={inputClass + ' resize-none'} />
                    <p className={helperClass}>Por qué ganaron este premio. Ej: &ldquo;Por ser nuestro cliente del mes&rdquo; o &ldquo;Por participar en Instagram&rdquo;</p>
                  </div>
                  <div>
                    <label className={labelClass}>Descripción <span className="text-[#2563EB]">*</span></label>
                    <textarea name="description" value={form.description} onChange={handleChange} required rows={3} placeholder="Describe en qué consiste el premio exactamente" className={inputClass + ' resize-none'} />
                    <p className={helperClass}>Detalles del premio. Qué incluye exactamente, qué no incluye, condiciones</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!step1Valid}
                    onClick={() => setStep(2)}
                    className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: '#2563EB' }}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}

            {/* ——— STEP 2: Configuración ——— */}
            {step === 2 && (
              <div className="p-6">
                <div className="mb-5">
                  <h2 className="text-base font-bold text-[#1C1917]">Configuración</h2>
                  <p className="text-sm text-[#a8a29e] mt-0.5">Restaurante, fechas, cantidad y tipo de uso</p>
                </div>

                <div className="space-y-5 mb-6">
                  {/* Restaurante */}
                  <div>
                    <label className={labelClass}>Restaurante</label>
                    {restaurantsLoading ? (
                      <p className="text-sm text-[#a8a29e] py-2">Cargando...</p>
                    ) : restaurants.length === 0 ? (
                      <p className="text-sm text-[#78716c] py-2">
                        Primero crea un restaurante en la sección <strong>Restaurantes</strong>.
                      </p>
                    ) : (
                      <RestaurantCombobox
                        restaurants={restaurants}
                        value={form.restaurant_id}
                        onChange={(id) => setForm((prev) => ({ ...prev, restaurant_id: id }))}
                      />
                    )}
                    <p className={helperClass}>¿En qué sucursal se puede cobrar este premio?</p>
                  </div>

                  {/* Fechas */}
                  <div>
                    <label className={labelClass}>Período de validez</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                      <input type="date" name="start_date" value={form.start_date} onChange={handleChange} required className={inputClass} />
                      <input type="date" name="end_date" value={form.end_date} onChange={handleChange} required className={inputClass} />
                    </div>
                    {dateError && (
                      <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        {dateError}
                      </p>
                    )}
                    {!dateError && dateWarnPast && (
                      <p className="text-xs text-blue-600 font-medium mt-1 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        {dateWarnPast}
                      </p>
                    )}
                    {!dateError && dateWarnFuture && (
                      <p className="text-xs text-blue-600 font-medium mt-1 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        {dateWarnFuture}
                      </p>
                    )}
                    {!dateError && !dateWarnPast && !dateWarnFuture && <p className={helperClass}>El QR solo funcionará dentro de estas fechas</p>}
                    <div className="flex gap-2 flex-wrap mt-2">
                      {[
                        { label: 'Hoy', days: 0 },
                        { label: '+7 días', days: 7 },
                        { label: '+30 días', days: 30 },
                        { label: '+3 meses', days: 90 },
                      ].map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => {
                            if (opt.days === 0) {
                              const today = new Date().toISOString().split('T')[0];
                              setForm((prev) => ({ ...prev, start_date: today, end_date: today }));
                            } else {
                              setQuickEndDate(opt.days);
                            }
                          }}
                          className="px-2.5 py-1 rounded-md text-xs font-medium border border-[#E8E3DC] bg-white text-[#78716c] hover:border-[#2563EB]/50 hover:text-[#2563EB] transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Campaña */}
                  <div>
                    <label className={labelClass}>Campana <span className="text-[#a8a29e] font-normal normal-case">(opcional)</span></label>
                    {campaignsLoading ? (
                      <p className="text-sm text-[#a8a29e] py-2">Cargando...</p>
                    ) : (
                      <select value={form.campaign_id} onChange={(e) => setForm((prev) => ({ ...prev, campaign_id: e.target.value }))} className={inputClass}>
                        <option value="">Sin campana</option>
                        {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                    {form.campaign_id && (() => {
                      const sel = campaigns.find(c => c.id === form.campaign_id);
                      if (!sel) return null;
                      return (
                        <div className="mt-2 flex items-center gap-3">
                          <div className="p-1 bg-[#FAFAF9] border border-[#E8E3DC] rounded-lg">
                            <QRPreviewMini
                              size={56}
                              style={{
                                qr_dot_color: sel.qr_dot_color,
                                qr_background: sel.qr_background,
                                qr_dot_style: sel.qr_dot_style,
                                qr_corner_style: sel.qr_corner_style,
                                qr_gradient_end: sel.qr_gradient_end,
                              }}
                            />
                          </div>
                          <p className="text-xs text-[#78716c]">Estilo QR de la campana <strong className="text-[#1C1917]">{sel.name}</strong></p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Cantidad */}
                  <div>
                    <label className={labelClass}>QRs a generar</label>
                    <input
                      type="number" min={1} max={100} value={quantity}
                      onChange={(e) => setQuantity(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                      className={inputClass + ' w-24'}
                    />
                    <p className={helperClass}>Cada QR es único e independiente. Para eventos genera múltiples</p>
                    {quantity > 1 && <p className="text-xs text-[#a8a29e] mt-1">Se generarán {quantity} códigos únicos e independientes</p>}
                  </div>

                  {/* Uso */}
                  <div>
                    <label className={labelClass}>Modalidad de uso</label>
                    <div className="flex gap-1 p-1 bg-[#F5F5F4] rounded-lg w-fit">
                      <button type="button" onClick={() => setSingleUse(true)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${singleUse ? 'bg-white text-[#1C1917] shadow-sm' : 'text-[#78716c] hover:text-[#1C1917]'}`}>
                        Uso único
                      </button>
                      <button type="button" onClick={() => setSingleUse(false)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${!singleUse ? 'bg-white text-[#1C1917] shadow-sm' : 'text-[#78716c] hover:text-[#1C1917]'}`}>
                        Multi-uso
                      </button>
                    </div>
                    {!singleUse && (
                      <div className="mt-3">
                        <label className={labelClass}>Usos por código</label>
                        <input type="number" min={2} max={1000} value={maxUses} onChange={(e) => setMaxUses(Math.min(1000, Math.max(2, parseInt(e.target.value) || 2)))} className={inputClass + ' w-24'} />
                      </div>
                    )}
                  </div>

                  {/* Límite de inventario total */}
                  <div>
                    <label className={labelClass}>
                      Límite de inventario total{' '}
                      <span className="text-[#a8a29e] font-normal normal-case">(opcional)</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={999999}
                      value={stockLimit}
                      onChange={(e) => setStockLimit(e.target.value)}
                      placeholder="Sin límite"
                      className={inputClass + ' w-32'}
                    />
                    <p className="text-xs text-[#a8a29e] mt-1.5">
                      Cuántos clientes en total pueden canjear este premio (todos los QRs combinados)
                    </p>
                  </div>

                  {/* Activación programada */}
                  <div>
                    <label className={labelClass}>
                      Activar el{' '}
                      <span className="text-[#a8a29e] font-normal normal-case">(opcional — por defecto inmediato)</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={activateAt}
                      onChange={(e) => setActivateAt(e.target.value)}
                      className={inputClass + ' w-64'}
                    />
                    {activateAt && (
                      <p className="text-xs text-[#a8a29e] mt-1.5">
                        El QR existirá pero mostrará una cuenta regresiva hasta esta fecha y hora.
                      </p>
                    )}
                  </div>

                  {/* Horario de validez */}
                  <div>
                    <label className={labelClass}>
                      Horario de validez{' '}
                      <span className="text-[#a8a29e] font-normal normal-case">(opcional)</span>
                    </label>
                    {/* Day checkboxes */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {[
                        { n: 1, label: 'Lu' }, { n: 2, label: 'Ma' }, { n: 3, label: 'Mi' },
                        { n: 4, label: 'Ju' }, { n: 5, label: 'Vi' }, { n: 6, label: 'Sa' }, { n: 7, label: 'Do' },
                      ].map(({ n, label }) => {
                        const active = validDays.includes(n);
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() =>
                              setValidDays((prev) =>
                                active ? prev.filter((d) => d !== n) : [...prev, n].sort()
                              )
                            }
                            className="w-9 h-9 rounded-lg text-xs font-bold border transition-all"
                            style={{
                              background: active ? '#2563EB' : 'white',
                              color: active ? 'white' : '#78716c',
                              borderColor: active ? '#2563EB' : '#E8E3DC',
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    {/* Hour range */}
                    <div className="flex items-center gap-3">
                      <div>
                        <label className={labelClass}>Desde</label>
                        <input
                          type="time"
                          value={validHoursFrom}
                          onChange={(e) => setValidHoursFrom(e.target.value)}
                          className={inputClass + ' w-32'}
                        />
                      </div>
                      <div style={{ paddingTop: 20, color: '#a8a29e', fontSize: 12 }}>–</div>
                      <div>
                        <label className={labelClass}>Hasta</label>
                        <input
                          type="time"
                          value={validHoursTo}
                          onChange={(e) => setValidHoursTo(e.target.value)}
                          className={inputClass + ' w-32'}
                        />
                      </div>
                    </div>
                    {(validDays.length > 0 || validHoursFrom || validHoursTo) && (
                      <p className="text-xs text-[#a8a29e] mt-2">
                        Fuera de este horario/días, los clientes verán un mensaje de &ldquo;Fuera de horario&rdquo;.
                      </p>
                    )}
                  </div>

                  {/* Game type */}
                  <div>
                    <label className={labelClass}>
                      Tipo de juego{' '}
                      <span className="text-[#a8a29e] font-normal normal-case">(opcional)</span>
                    </label>
                    <p className={helperClass + ' mb-2'}>Opcional. Si seleccionas un juego, el cliente tendrá que jugar antes de ver el premio</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { value: '', emoji: '🚫', label: 'Sin juego', desc: 'Acceso directo' },
                        { value: 'slots', emoji: '🎰', label: 'Tragamonedas', desc: '3 carretes' },
                        { value: 'roulette', emoji: '🎡', label: 'Ruleta', desc: '8 segmentos' },
                        { value: 'penalty', emoji: '⚽', label: 'Penales', desc: 'Tiro de penalti' },
                        { value: 'scratch', emoji: '🃏', label: 'Rasca y Gana', desc: 'Tarjeta dorada' },
                      ].map((opt) => {
                        const active = gameType === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setGameType(opt.value)}
                            className={`text-left rounded-xl p-3 border transition-all ${
                              active ? 'border-[#2563EB] bg-blue-50 shadow-sm' : 'border-[#E8E3DC] bg-white hover:border-[#2563EB]/40'
                            }`}
                          >
                            <div className="text-xl mb-1">{opt.emoji}</div>
                            <p className="text-xs font-bold text-[#1C1917] leading-tight">{opt.label}</p>
                            <p className="text-[10px] text-[#a8a29e] leading-snug">{opt.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* URL de imagen */}
                  {form.photo_url !== undefined && (
                    <div>
                      <label className={labelClass}>URL de imagen <span className="text-[#a8a29e] font-normal normal-case">(opcional)</span></label>
                      <input
                        type="url"
                        name="photo_url"
                        value={form.photo_url}
                        onChange={handleChange}
                        placeholder="https://..."
                        className={inputClass}
                      />
                      <p className={helperClass}>Opcional. Pega la URL de una foto del plato o producto. Ej: imagen de tu menú digital</p>
                    </div>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>
                )}

                {/* Progress */}
                {loading && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-[#78716c] mb-1.5">
                      <span>Generando {progress} de {quantity}...</span>
                      <span>{Math.round((progress / quantity) * 100)}%</span>
                    </div>
                    <div className="w-full bg-[#F5F5F4] rounded-full h-1 overflow-hidden">
                      <div className="h-1 rounded-full transition-all duration-300" style={{ width: `${(progress / quantity) * 100}%`, background: '#2563EB' }} />
                    </div>
                  </div>
                )}

                {/* Nav */}
                <div className="flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-3">
                  <button type="button" onClick={() => setStep(1)} disabled={loading} className="w-full md:w-auto flex items-center justify-center gap-1.5 text-sm text-[#78716c] hover:text-[#1C1917] transition-colors border border-[#E8E3DC] rounded-lg px-4 py-2.5 md:border-0 md:px-0 md:py-0 disabled:opacity-40">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" /></svg>
                    ← Atrás
                  </button>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      type="button"
                      disabled={loading || !step2Valid}
                      onClick={handleGenerate}
                      className="w-full md:w-auto py-3 px-6 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                      style={{ background: '#2563EB' }}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Generando...
                        </>
                      ) : (
                        `Generar ${quantity === 1 ? '1 código QR' : `${quantity} códigos QR`}`
                      )}
                    </button>
                    <Link href="/admin/generate/masivo" className="text-xs text-[#78716c] hover:text-[#1C1917] transition-colors">
                      Generación masiva
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* QR Preview — right column on desktop, below on mobile */}
          <div className="lg:col-span-1 order-last lg:order-none">
            {QRPreview}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense>
      <GenerateForm />
    </Suspense>
  );
}
