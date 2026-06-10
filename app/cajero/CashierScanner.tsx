'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type ScanState = 'idle' | 'scanning' | 'loading';

type DeliveredClaim = {
  id: string;
  full_name: string;
  phone: string;
  prize_name: string;
  prize_location: string;
  delivered_at: string;
  delivered_by: string | null;
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'hace un momento';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  const colors = ['from-violet-500 to-purple-600', 'from-blue-500 to-indigo-600', 'from-emerald-500 to-teal-600', 'from-rose-500 to-pink-600', 'from-blue-500 to-blue-600'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
      {initials}
    </div>
  );
}

export default function CashierScanner() {
  const router = useRouter();
  const html5QrCodeRef = useRef<unknown>(null);
  const isStartingRef = useRef(false);
  const [state, setState] = useState<ScanState>('idle');
  const [scanError, setScanError] = useState('');
  const [manualId, setManualId] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [history, setHistory] = useState<DeliveredClaim[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/claims?status=delivered');
      const data = await res.json();
      setHistory(data.claims ?? []);
    } catch {}
    finally { setHistoryLoading(false); }
  }, []);

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
          router.push(`/cajero/${claimId}`);
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
    router.push(`/cajero/${id}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-white/5 border-b border-white/10 px-5 py-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-900/40">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">Premia · Cajero</p>
            <p className="text-white/40 text-xs">{history.length} premios entregados hoy</p>
          </div>
        </div>
        <button onClick={() => setShowManual(!showManual)}
          className="text-white/60 hover:text-white text-xs font-medium border border-white/20 rounded-lg px-3 py-1.5 transition-colors">
          Manual
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Scanner section */}
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
          <div className="p-5 border-b border-white/10">
            <h2 className="text-white font-bold text-lg">Escanear QR del Cliente</h2>
            <p className="text-white/40 text-sm mt-0.5">Apunta la cámara al código QR que muestra el cliente</p>
          </div>

          <div className="p-5">
            {state === 'loading' ? (
              <div className="text-center py-10">
                <svg className="animate-spin w-10 h-10 text-emerald-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <p className="text-white/50 text-sm">Cargando información...</p>
              </div>
            ) : (
              <>
                {/* Camera box */}
                <div className="relative bg-black rounded-2xl overflow-hidden mb-4 mx-auto" style={{ maxWidth: 320, aspectRatio: '1/1' }}>
                  <div id="qr-reader" className="w-full h-full" />

                  {state === 'idle' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95">
                      <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-3">
                        <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <p className="text-white/40 text-sm">Cámara apagada</p>
                    </div>
                  )}

                  {state === 'scanning' && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-6 left-6 w-10 h-10 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                      <div className="absolute top-6 right-6 w-10 h-10 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                      <div className="absolute bottom-6 left-6 w-10 h-10 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                      <div className="absolute bottom-6 right-6 w-10 h-10 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                      <div className="absolute inset-x-6 top-1/2 h-0.5 bg-emerald-400/80 shadow-lg" style={{ animation: 'scan-line 2s ease-in-out infinite' }} />
                    </div>
                  )}
                </div>

                {scanError && (
                  <div className="mb-4 bg-red-500/20 border border-red-400/30 text-red-300 rounded-xl px-4 py-3 text-sm text-center">
                    {scanError}
                  </div>
                )}

                {state === 'idle' ? (
                  <button onClick={startScanner}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Activar Cámara y Escanear
                  </button>
                ) : (
                  <button onClick={() => { stopScanner(); setState('idle'); setScanError(''); }}
                    className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Detener Cámara
                  </button>
                )}

                {showManual && (
                  <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-4">
                    <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">Código manual</p>
                    <form onSubmit={handleManualSubmit} className="flex gap-2">
                      <input value={manualId} onChange={e => setManualId(e.target.value)}
                        placeholder="ID del cobro o URL"
                        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50" />
                      <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors shrink-0">Ir →</button>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* History section */}
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-base">Registro de Cobros</h2>
              <p className="text-white/40 text-xs mt-0.5">Premios escaneados y entregados</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-400 text-xs font-semibold">{history.length} total</span>
            </div>
          </div>

          {historyLoading ? (
            <div className="p-8 text-center">
              <svg className="animate-spin w-6 h-6 text-white/30 mx-auto" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-white/30 text-sm">Aún no hay cobros registrados</p>
              <p className="text-white/20 text-xs mt-1">Aparecerán aquí cuando el cajero confirme entregas</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {history.map((claim) => (
                <div key={claim.id} className="px-5 py-4 flex items-start gap-4 hover:bg-white/5 transition-colors">
                  <Avatar name={claim.full_name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-white font-bold text-sm truncate">{claim.full_name}</p>
                      <span className="text-white/30 text-xs whitespace-nowrap shrink-0">{timeAgo(claim.delivered_at)}</span>
                    </div>
                    <p className="text-emerald-400 text-xs font-semibold mt-0.5 truncate">{claim.prize_name}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-white/30 text-xs">
                        <svg className="w-3 h-3 text-blue-500/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {claim.prize_location}
                      </span>
                      {claim.delivered_by && (
                        <span className="flex items-center gap-1 text-white/30 text-xs">
                          <svg className="w-3 h-3 text-blue-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {claim.delivered_by}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Entregado
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <style jsx global>{`
        #qr-reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
        #qr-reader { border: none !important; }
        #qr-reader__scan_region { border: none !important; background: transparent !important; }
        #qr-reader__dashboard { display: none !important; }
        #qr-reader img[alt="Info icon"] { display: none !important; }
      `}</style>
    </div>
  );
}
