'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

type Restaurant = { id: string; name: string };
type QRResult = { id: string; url: string; qrDataUrl: string; index: number };

const inputClass = 'w-full bg-white border border-[#E8E3DC] rounded-xl px-4 py-3 text-sm text-[#1C1917] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-stone-300 shadow-sm';
const labelClass = 'block text-sm font-semibold text-stone-700 mb-1.5';

export default function MasivoPage() {
  const [form, setForm] = useState({
    name: '', reason: '', description: '',
    start_date: '', end_date: '', restaurant_id: '',
    quantity: 10,
  });
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<QRResult[]>([]);
  const [error, setError] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/restaurants').then(r => r.json()).then(d => {
      if (d.restaurants) setRestaurants(d.restaurants);
    });
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const val = e.target.name === 'quantity' ? Math.max(1, Math.min(100, Number(e.target.value))) : e.target.value;
    setForm(p => ({ ...p, [e.target.name]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(form.quantity);
    if (qty > 100) {
      setError('Máximo 100 QRs por generación. Para más, genera en lotes.');
      return;
    }
    setError(''); setResults([]); setProgress(0);
    setStartTime(Date.now());
    setLoading(true);

    const QRCode = await import('qrcode');
    const generated: QRResult[] = [];

    try {
      for (let i = 0; i < qty; i++) {
        const res = await fetch('/api/prizes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            reason: form.reason,
            description: form.description,
            start_date: form.start_date,
            end_date: form.end_date,
            restaurant_id: form.restaurant_id || null,
            location: '',
          }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Error al crear premio.'); break; }

        const url = `${window.location.origin}/premio/${data.prize.id}`;
        const rawQr = await QRCode.toDataURL(url, {
          width: 280, margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        const qrDataUrl = await addLogoToQR(rawQr);

        generated.push({ id: data.prize.id, url, qrDataUrl, index: i + 1 });
        setProgress(i + 1);
        setResults([...generated]);
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function downloadOne(r: QRResult) {
    const a = document.createElement('a');
    a.href = r.qrDataUrl;
    a.download = `qr-${form.name.toLowerCase().replace(/\s+/g, '-')}-${r.index}.png`;
    a.click();
  }

  async function downloadAll() {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const folder = zip.folder('qrs') as InstanceType<typeof JSZip>;
    results.forEach(r => {
      const base64 = r.qrDataUrl.split(',')[1];
      folder.file(`qr-${form.name.replace(/\s+/g, '-')}-${r.index}.png`, base64, { base64: true });
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qrs-${form.name.replace(/\s+/g, '-')}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printAll() {
    const w = window.open('', '_blank');
    if (!w) return;

    // Split results into pages of 9 (3×3 grid)
    const pages: QRResult[][] = [];
    for (let i = 0; i < results.length; i += 9) {
      pages.push(results.slice(i, i + 9));
    }

    const pagesHtml = pages.map((pageItems) => {
      // Fill to 9 cells so the grid is always complete
      const cells = [...pageItems];
      while (cells.length < 9) cells.push(null as unknown as QRResult);

      const cellsHtml = cells.map((r, ci) => {
        if (!r) return `<div class="card card-empty"></div>`;
        const col = ci % 3;
        const row = Math.floor(ci / 3);
        const borderRight = col < 2 ? 'border-right:1px dashed #94a3b8;' : '';
        const borderBottom = row < 2 ? 'border-bottom:1px dashed #94a3b8;' : '';
        return `
          <div class="card" style="${borderRight}${borderBottom}">
            <div class="card-inner">
              <p class="prize-name">${form.name}</p>
              <img src="${r.qrDataUrl}" alt="QR ${r.index}" class="qr-img" />
              <p class="url">${r.url}</p>
              <p class="num">N° ${r.index} de ${results.length}</p>
            </div>
          </div>`;
      }).join('');

      return `
        <div class="page">
          <div class="page-header">
            <div class="brand">
              <span class="brand-icon">🌱</span>
              <span class="brand-name">Burrito Bar</span>
            </div>
            <div class="brand-right">
              <span class="prize-badge">Premio: ${form.name}</span>
            </div>
          </div>
          <div class="grid">${cellsHtml}</div>
        </div>`;
    }).join('');

    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>QRs A4 — ${form.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

    body {
      font-family: 'Inter', sans-serif;
      background: #f1f5f9;
    }

    /* ---- Page layout ---- */
    .page {
      width: 210mm;
      height: 297mm;
      background: white;
      display: flex;
      flex-direction: column;
      page-break-after: always;
      overflow: hidden;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 5mm 8mm 4mm;
      border-bottom: 2px solid #059669;
      flex-shrink: 0;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .brand-icon { font-size: 18px; }

    .brand-name {
      font-size: 14px;
      font-weight: 900;
      color: #065f46;
      letter-spacing: -.3px;
    }

    .prize-badge {
      font-size: 9px;
      font-weight: 700;
      color: #065f46;
      background: #d1fae5;
      border: 1px solid #6ee7b7;
      border-radius: 99px;
      padding: 3px 10px;
      text-transform: uppercase;
      letter-spacing: .06em;
    }

    /* ---- 3×3 grid filling remaining height ---- */
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(3, 1fr);
      flex: 1;
      border-top: none;
    }

    .card {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4mm;
    }

    .card-empty {
      background: #f8fafc;
    }

    .card-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      width: 100%;
    }

    .prize-name {
      font-size: 9px;
      font-weight: 800;
      color: #0f172a;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: .04em;
    }

    .qr-img {
      width: 44mm;
      height: 44mm;
      border: 1.5px solid #d1fae5;
      border-radius: 6px;
      padding: 2mm;
      display: block;
    }

    .url {
      font-size: 6px;
      color: #94a3b8;
      text-align: center;
      word-break: break-all;
      max-width: 100%;
    }

    .num {
      font-size: 7px;
      font-weight: 700;
      color: #64748b;
      text-align: center;
    }

    /* ---- Print rules ---- */
    @media print {
      @page {
        size: A4 portrait;
        margin: 0;
      }

      html, body {
        width: 210mm;
        height: 297mm;
        background: white !important;
      }

      .page {
        page-break-after: always;
        break-after: page;
      }

      /* Hide browser-injected headers/footers */
      head title { display: none; }
    }

    /* Screen preview */
    @media screen {
      body { padding: 10mm; display: flex; flex-direction: column; gap: 10mm; align-items: center; }
    }
  </style>
</head>
<body>
${pagesHtml}
<script>window.onload = () => window.print();<\/script>
</body>
</html>`);
    w.document.close();
  }

  const qty = Number(form.quantity);
  const done = results.length;
  const pct = loading ? Math.round((progress / qty) * 100) : done > 0 ? 100 : 0;
  // Estimated time remaining
  const estSecsRemaining = (() => {
    if (!loading || !startTime || progress === 0) return null;
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = progress / elapsed; // items per second
    if (rate <= 0) return null;
    return Math.ceil((qty - progress) / rate);
  })();

  return (
    <div className="min-h-screen">
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="max-w-5xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              🚀 Generación Masiva
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Generación Masiva</h1>
            <p className="text-blue-200/70 mt-1.5 text-sm">Crea hasta 100 QRs únicos del mismo premio en un solo clic.</p>
          </div>
          <Link href="/admin/generate" className="flex items-center gap-2 font-bold px-5 py-3 rounded-xl text-sm" style={{ background: 'white', color: '#1d4ed8', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a individual
          </Link>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 md:px-10 py-6">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm overflow-hidden h-fit lg:col-span-1">
            <div className="p-5 border-b border-[#E8E3DC] bg-[#FAFAF9]">
              <h2 className="text-sm font-bold text-[#1C1917]">Datos del Premio</h2>
              <p className="text-xs text-stone-400 mt-0.5">Todos los QRs tendrán estos datos</p>
            </div>

            <div className="p-5 space-y-4">
              {/* Quantity — prominente */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <label className="block text-sm font-bold text-blue-800 mb-2">
                  ¿Cuántos QRs generar?
                </label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setForm(p => ({ ...p, quantity: Math.max(1, Number(p.quantity) - 1) }))}
                    className="w-10 h-10 rounded-xl bg-white border border-blue-200 text-blue-700 font-black text-lg flex items-center justify-center hover:bg-blue-100 transition-colors shadow-sm">−</button>
                  <input
                    name="quantity" type="number" min={1} max={100}
                    value={form.quantity}
                    onChange={handleChange}
                    className="flex-1 text-center bg-white border border-blue-200 rounded-xl py-2.5 text-2xl font-black text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                  />
                  <button type="button" onClick={() => setForm(p => ({ ...p, quantity: Math.min(100, Number(p.quantity) + 1) }))}
                    className="w-10 h-10 rounded-xl bg-white border border-blue-200 text-blue-700 font-black text-lg flex items-center justify-center hover:bg-blue-100 transition-colors shadow-sm">+</button>
                </div>
                <p className="text-blue-600 text-xs mt-2 text-center font-medium">Máximo 100 QRs por lote</p>
              </div>

              <div>
                <label className={labelClass}>Nombre del Premio</label>
                <input name="name" value={form.name} onChange={handleChange} required placeholder="Ej: 2x1 en principales" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Razón por la que Ganaron</label>
                <textarea name="reason" value={form.reason} onChange={handleChange} required rows={2} placeholder="Ej: Participantes del evento" className={inputClass + ' resize-none'} />
              </div>
              <div>
                <label className={labelClass}>Descripción</label>
                <textarea name="description" value={form.description} onChange={handleChange} required rows={2} placeholder="En qué consiste el premio" className={inputClass + ' resize-none'} />
              </div>
              <div>
                <label className={labelClass}>Restaurante</label>
                <select name="restaurant_id" value={form.restaurant_id} onChange={handleChange} className={inputClass}>
                  <option value="">— Sin restaurante —</option>
                  {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Inicio</label>
                  <input type="date" name="start_date" value={form.start_date} onChange={handleChange} required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Fin</label>
                  <input type="date" name="end_date" value={form.end_date} onChange={handleChange} required className={inputClass} />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
              )}

              <button type="submit" disabled={loading}
                className="w-full disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#2563EB,#0891B2)', boxShadow: '0 4px 16px rgba(37,99,235,0.30)' }}>
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Generando {progress}/{qty}...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    Generar {qty} QR{qty > 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Results */}
          <div className="lg:col-span-2">
            {/* Progress bar */}
            {(loading || done > 0) && (
              <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm p-5 mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-stone-700">
                    {loading
                      ? `Generando... ${progress} de ${qty}${estSecsRemaining !== null ? ` — aprox. ${estSecsRemaining}s restantes` : ''}`
                      : `✅ ${done} QRs generados`}
                  </span>
                  <span className="text-sm font-bold text-[#2563EB]">{pct}%</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
                  <div className="h-2.5 rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #2563EB, #0EA5E9)' }} />
                </div>

                {done > 0 && !loading && (
                  <div className="flex gap-3 mt-4 flex-wrap">
                    <button onClick={downloadAll}
                      className="flex-1 flex items-center justify-center gap-2 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-sm min-w-[140px]"
                      style={{ background: 'linear-gradient(135deg,#2563EB,#0891B2)' }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Descargar ZIP ({done})
                    </button>
                    <button onClick={printAll}
                      className="flex-1 flex items-center justify-center gap-2 border border-[#E8E3DC] hover:bg-[#FAFAF9] text-stone-700 font-bold py-2.5 rounded-xl text-sm transition-colors min-w-[140px]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Imprimir A4 (9/hoja)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* QR grid */}
            {results.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {results.map(r => (
                  <div key={r.id} className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm overflow-hidden group hover:shadow-md hover:border-blue-200 transition-all">
                    <div className="py-2 px-3 flex items-center justify-between border-b border-[#E8E3DC] bg-[#FAFAF9]">
                      <span className="text-[#2563EB] text-xs font-bold">#{r.index} de {qty}</span>
                    </div>
                    <div className="p-3 flex flex-col items-center">
                      <div className="p-2 bg-[#FAFAF9] rounded-xl border border-[#E8E3DC] mb-2">
                        <img src={r.qrDataUrl} alt={`QR ${r.index}`} className="w-full rounded-lg" style={{ maxWidth: 140 }} />
                      </div>
                      <p className="text-stone-600 text-xs font-semibold truncate w-full text-center mb-2">{form.name}</p>
                      <button onClick={() => downloadOne(r)}
                        className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-[#2563EB] bg-blue-50 hover:bg-blue-100 border border-blue-200 py-1.5 rounded-lg transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Descargar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {results.length === 0 && !loading && (
              <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm p-16 text-center h-full flex flex-col items-center justify-center min-h-[300px]">
                <div className="w-20 h-20 bg-[#FAFAF9] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#E8E3DC]">
                  <svg className="w-10 h-10 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                </div>
                <p className="text-stone-500 font-semibold mb-1">Los QRs aparecerán aquí</p>
                <p className="text-stone-400 text-sm">Completa el formulario y presiona Generar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
