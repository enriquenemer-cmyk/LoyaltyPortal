'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

type Prize = { id: string; name: string };
type Restaurant = { id: string; name: string };

const inputClass =
  'w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all hover:border-slate-300 shadow-sm';

const labelClass = 'block text-sm font-semibold text-slate-700 mb-1.5';

function SectionLabel({ step, label }: { step: number; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-extrabold shrink-0">
        {step}
      </div>
      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

function GenerateForm() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    name: searchParams.get('name') || '',
    reason: searchParams.get('reason') || '',
    start_date: '',
    end_date: '',
    description: searchParams.get('description') || '',
    restaurant_id: searchParams.get('restaurant_id') || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ prize: Prize; qrDataUrl: string; prizeUrl: string } | null>(null);
  const qrRef = useRef<HTMLImageElement>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/restaurants')
      .then((r) => r.json())
      .then((data) => { if (data.restaurants) setRestaurants(data.restaurants); })
      .finally(() => setRestaurantsLoading(false));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch('/api/prizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al crear el premio.'); return; }

      const QRCode = await import('qrcode');
      const prizeUrl = `${window.location.origin}/premio/${data.prize.id}`;
      const qrDataUrl = await QRCode.toDataURL(prizeUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      });

      setResult({ prize: data.prize, qrDataUrl, prizeUrl });
      setForm({ name: '', reason: '', start_date: '', end_date: '', description: '', restaurant_id: '' });
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.qrDataUrl;
    a.download = `qr-${result.prize.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  }

  function handlePrint() {
    if (!result) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>QR - ${result.prize.name}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Inter', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #f8fafc; padding: 40px; }
      .card { background: white; border-radius: 24px; padding: 40px; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.1); }
      .badge { display: inline-block; background: #ecfdf5; color: #065f46; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 12px; border-radius: 99px; margin-bottom: 16px; }
      h1 { font-size: 28px; font-weight: 900; color: #0f172a; margin-bottom: 8px; }
      p { color: #64748b; font-size: 14px; margin-bottom: 28px; }
      img { width: 280px; height: 280px; border: 3px solid #d1fae5; border-radius: 16px; padding: 12px; }
      .url { margin-top: 20px; font-size: 11px; color: #94a3b8; word-break: break-all; }
    </style></head><body>
    <div class="card">
      <div class="badge">Premio Verificado</div>
      <h1>${result.prize.name}</h1>
      <p>Escanea este código QR para reclamar tu premio</p>
      <img src="${result.qrDataUrl}" alt="QR Code" />
      <div class="url">${result.prizeUrl}</div>
    </div>
    </body></html>`);
    w.document.close();
    w.print();
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Page header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4 border border-emerald-200">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Premio
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Generar Premio <span className="gradient-text">QR</span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm">Completa los datos y genera el código QR listo para imprimir o compartir.</p>
        </div>

        <div className={`grid gap-6 ${result ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-fit">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Información del Premio</h2>
              <p className="text-xs text-slate-400 mt-0.5">Todos los campos son obligatorios</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Section 1 */}
              <div className="space-y-4">
                <SectionLabel step={1} label="Datos básicos" />
                <div>
                  <label className={labelClass}>Nombre del Premio</label>
                  <input name="name" value={form.name} onChange={handleChange} required placeholder="Ej: 2x1 en platillos principales" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Razón por la que Ganó</label>
                  <textarea name="reason" value={form.reason} onChange={handleChange} required rows={2} placeholder="Ej: Por participar en el concurso de Instagram" className={inputClass + ' resize-none'} />
                </div>
                <div>
                  <label className={labelClass}>Descripción del Premio</label>
                  <textarea name="description" value={form.description} onChange={handleChange} required rows={3} placeholder="Describe en qué consiste el premio exactamente" className={inputClass + ' resize-none'} />
                </div>
              </div>

              {/* Section 2 */}
              <div className="space-y-4">
                <SectionLabel step={2} label="Restaurante" />
                {restaurantsLoading ? (
                  <p className="text-sm text-slate-400">Cargando restaurantes...</p>
                ) : restaurants.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 text-sm">
                    Primero crea un restaurante en la sección <strong>Restaurantes</strong>.
                  </div>
                ) : (
                  <div>
                    <label className={labelClass}>Restaurante</label>
                    <select
                      name="restaurant_id"
                      value={form.restaurant_id}
                      onChange={(e) => setForm((prev) => ({ ...prev, restaurant_id: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="">— Sin restaurante —</option>
                      {restaurants.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Section 3 */}
              <div className="space-y-4">
                <SectionLabel step={3} label="Período de validez" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Fecha de Inicio</label>
                    <input type="date" name="start_date" value={form.start_date} onChange={handleChange} required className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Fecha de Fin</label>
                    <input type="date" name="end_date" value={form.end_date} onChange={handleChange} required className={inputClass} />
                  </div>
                </div>
              </div>


              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-emerald-200 hover:shadow-lg hover:shadow-emerald-300 text-sm tracking-wide"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Generando premio...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16.01 20H16m-8 0h.01M4 16.01V16m0-8.01V8M8 4h.01" />
                    </svg>
                    Generar Código QR
                  </span>
                )}
              </button>
            </div>
          </form>

          {/* QR Result */}
          {result && (
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden h-fit fade-in-up">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-5 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-emerald-100 text-xs font-semibold uppercase tracking-widest">Premio creado exitosamente</span>
                </div>
                <h2 className="text-xl font-extrabold mt-1">{result.prize.name}</h2>
              </div>

              <div className="p-6">
                <div className="flex justify-center mb-5">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
                    <img ref={qrRef} src={result.qrDataUrl} alt="Código QR del premio" className="rounded-lg" />
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 mb-5 border border-slate-200">
                  <p className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">URL del premio</p>
                  <p className="text-xs text-slate-600 break-all font-mono">{result.prizeUrl}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Descargar
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Imprimir
                  </button>
                </div>
              </div>
            </div>
          )}
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
