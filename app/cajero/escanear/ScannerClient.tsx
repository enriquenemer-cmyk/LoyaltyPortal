'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type ScanState = 'idle' | 'scanning' | 'loading';

type Claim = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  prize_name: string;
  location: string | null;
  prize_location: string;
  claimed_at: string;
  delivered_at: string | null;
  delivered_by: string | null;
  status: 'pending' | 'delivered';
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Hace un momento';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  return new Date(dateStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const colors = ['#E8521A', '#7c3aed', '#2563eb', '#be185d', '#0891b2'];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div style={{ width: size, height: size, borderRadius: size / 3, background: colors[idx], display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: size * 0.33, flexShrink: 0 }}>
      {initials(name)}
    </div>
  );
}

export default function ScannerClient() {
  const router = useRouter();
  const params = useSearchParams();
  const restaurantName = params.get('r') ?? 'Cajero';

  const html5QrCodeRef = useRef<unknown>(null);
  const isStartingRef = useRef(false);
  const [state, setState] = useState<ScanState>('idle');
  const [scanError, setScanError] = useState('');
  const [manualId, setManualId] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [history, setHistory] = useState<Claim[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/claims');
      const data = await res.json();
      if (!res.ok) return;
      // Filter by this restaurant's cashier name
      const all: Claim[] = data.claims ?? [];
      setHistory(all.filter((c) => c.delivered_by === restaurantName || c.status === 'pending'));
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }, [restaurantName]);

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 20000);
    return () => clearInterval(interval);
  }, [fetchHistory]);

  async function stopScanner() {
    const scanner = html5QrCodeRef.current as { stop?: () => Promise<void> } | null;
    if (scanner?.stop) { try { await scanner.stop(); } catch {} }
    html5QrCodeRef.current = null;
  }

  async function startScanner() {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setScanError('');
    setState('scanning');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText: string) => {
          const match = decodedText.match(/\/cajero\/([a-f0-9-]{36})/);
          const claimId = match?.[1];
          if (!claimId) { setScanError('Este QR no es un código de cobro válido.'); return; }
          await stopScanner();
          setState('loading');
          router.push(`/cajero/${claimId}?cajero=${encodeURIComponent(restaurantName)}`);
        },
        () => {}
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setScanError(msg.includes('permission') || msg.includes('NotAllowed')
        ? 'Necesitas permitir el acceso a la cámara.'
        : 'No se pudo iniciar la cámara. Usa el código manual.');
      setState('idle');
    } finally { isStartingRef.current = false; }
  }

  useEffect(() => () => { stopScanner(); }, []);

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = manualId.trim();
    if (!raw) return;
    const match = raw.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
    const id = match?.[1] || raw;
    setState('loading');
    router.push(`/cajero/${id}?cajero=${encodeURIComponent(restaurantName)}`);
  }

  const delivered = history.filter((c) => c.status === 'delivered');
  const pending   = history.filter((c) => c.status === 'pending');

  return (
    <div className="min-h-screen bg-[#fdf8f5]">

      {/* Header — orange brand bar, no back button */}
      <div className="sticky top-0 z-20 shadow-sm" style={{ background: 'linear-gradient(135deg,#E8521A,#C2410C)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Logo */}
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 font-extrabold text-white text-sm border border-white/30">
            {initials(restaurantName)}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-extrabold text-base leading-tight truncate">{restaurantName}</p>
            <p className="text-white/70 text-xs">Cajero · Tierra Burrito Bar</p>
          </div>

          <button
            onClick={() => setShowManual(!showManual)}
            className="text-white/80 hover:text-white text-xs font-bold rounded-lg px-3 py-1.5 transition-all"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
          >
            Manual
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* ── SCANNER SECTION ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-gray-900 font-extrabold text-lg">Escanear QR del Cliente</h2>
            <p className="text-gray-400 text-sm mt-0.5">Pide al cliente que muestre su QR y apunta la cámara hacia él</p>
          </div>

          <div className="p-5">
            {state === 'loading' ? (
              <div className="text-center py-10">
                <svg className="animate-spin w-10 h-10 mx-auto mb-3" style={{ color: '#E8521A' }} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <p className="text-gray-400 text-sm">Cargando información del premio...</p>
              </div>
            ) : (
              <>
                {/* Camera box */}
                <div
                  className="relative bg-gray-900 rounded-2xl overflow-hidden mb-4 mx-auto"
                  style={{ maxWidth: 320, aspectRatio: '1/1', border: '2px solid #f3f4f6' }}
                >
                  <div id="qr-reader" className="w-full h-full" />

                  {state === 'idle' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
                      <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-3">
                        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-sm">Cámara apagada</p>
                    </div>
                  )}

                  {state === 'scanning' && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-6 left-6 w-10 h-10 border-t-4 border-l-4 border-orange-400 rounded-tl-lg" />
                      <div className="absolute top-6 right-6 w-10 h-10 border-t-4 border-r-4 border-orange-400 rounded-tr-lg" />
                      <div className="absolute bottom-6 left-6 w-10 h-10 border-b-4 border-l-4 border-orange-400 rounded-bl-lg" />
                      <div className="absolute bottom-6 right-6 w-10 h-10 border-b-4 border-r-4 border-orange-400 rounded-br-lg" />
                      <div className="absolute inset-x-6 top-1/2 h-0.5 bg-orange-400 shadow-lg shadow-orange-400/60" style={{ animation: 'scan-line 2s ease-in-out infinite' }} />
                    </div>
                  )}
                </div>

                {scanError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm text-center">
                    {scanError}
                  </div>
                )}

                {state === 'idle' ? (
                  <button
                    onClick={startScanner}
                    className="w-full font-extrabold py-4 rounded-xl flex items-center justify-center gap-3 text-white transition-all text-base"
                    style={{ background: 'linear-gradient(135deg,#E8521A,#C2410C)', boxShadow: '0 8px 24px rgba(232,82,26,0.35)' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Activar Cámara y Escanear
                  </button>
                ) : (
                  <button
                    onClick={() => { stopScanner(); setState('idle'); setScanError(''); }}
                    className="w-full font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-gray-700 border border-gray-200 hover:bg-gray-50 transition-all text-base"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Detener Cámara
                  </button>
                )}

                {showManual && (
                  <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Código manual</p>
                    <form onSubmit={handleManualSubmit} className="flex gap-2">
                      <input
                        value={manualId}
                        onChange={(e) => setManualId(e.target.value)}
                        placeholder="ID del cobro o URL completa"
                        className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                      />
                      <button type="submit" className="text-white font-bold px-4 py-2.5 rounded-xl text-sm shrink-0 transition-colors" style={{ background: '#E8521A' }}>
                        Ir →
                      </button>
                    </form>
                  </div>
                )}

                {state === 'scanning' && (
                  <p className="text-gray-400 text-xs text-center mt-3">
                    Mantén el QR centrado y espera a que se detecte automáticamente
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── HISTORY SECTION ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Header with stats */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-900 font-extrabold text-base">Registro de este restaurante</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                <span className="text-orange-600 text-xs font-bold">En vivo</span>
              </div>
            </div>
            {/* Mini stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-2.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-orange-400 text-xs font-bold uppercase tracking-wide">Entregados</p>
                  <p className="text-orange-700 text-2xl font-black leading-none">{delivered.length}</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-amber-400 text-xs font-bold uppercase tracking-wide">Pendientes</p>
                  <p className="text-amber-700 text-2xl font-black leading-none">{pending.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* List */}
          {historyLoading ? (
            <div className="p-10 text-center">
              <svg className="animate-spin w-6 h-6 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          ) : history.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-500 font-semibold text-sm">Sin registros todavía</p>
              <p className="text-gray-400 text-xs mt-1">Los cobros confirmados aparecerán aquí</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {history.map((claim) => (
                <div key={claim.id} className="px-5 py-4 flex items-start gap-4 hover:bg-gray-50/70 transition-colors">
                  <Avatar name={claim.full_name} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-gray-900 font-bold text-sm truncate">{claim.full_name}</p>
                      <span className="text-gray-400 text-xs whitespace-nowrap shrink-0">
                        {claim.status === 'delivered' && claim.delivered_at
                          ? timeAgo(claim.delivered_at)
                          : timeAgo(claim.claimed_at)}
                      </span>
                    </div>
                    <p className="text-orange-600 text-xs font-semibold mt-0.5 truncate">{claim.prize_name}</p>
                    {(claim.location ?? claim.prize_location) && (
                      <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1 truncate">
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {claim.location ?? claim.prize_location}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {claim.status === 'delivered' ? (
                      <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-600 text-xs font-bold px-2.5 py-1 rounded-full border border-orange-200">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Entregado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Pendiente
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">{history.length} registros en total</p>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              Se actualiza cada 20 seg.
            </div>
          </div>
        </div>

      </div>

      <style>{`
        #qr-reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
        #qr-reader { border: none !important; }
        #qr-reader__scan_region { border: none !important; background: transparent !important; }
        #qr-reader__dashboard { display: none !important; }
        #qr-reader img[alt="Info icon"] { display: none !important; }
      `}</style>
    </div>
  );
}
