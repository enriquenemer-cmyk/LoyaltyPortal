'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Avatar } from '@/app/components/Avatar';

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
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function darken(hex: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return '#0891B2';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return '#' + [r * 0.8, g * 0.8, b * 0.8].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

export default function ScannerClient() {
  const router = useRouter();
  const params = useSearchParams();
  const restaurantName = params.get('r') ?? 'Cajero';
  const accentColor = params.get('color') ?? '#2563EB';
  const accentDark = darken(accentColor);

  const codeReaderRef = useRef<import('@zxing/browser').IScannerControls | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isStartingRef = useRef(false);
  const [state, setState] = useState<ScanState>('idle');
  const [scanError, setScanError] = useState('');
  const [manualId, setManualId] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [kioskMode, setKioskMode] = useState(false);
  const [history, setHistory] = useState<Claim[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyTab, setHistoryTab] = useState<'today' | 'all'>('today');

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/claims');
      const data = await res.json();
      if (!res.ok) return;
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
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.stop();
      } catch {}
      codeReaderRef.current = null;
    }
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
  }

  async function startScanner() {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setScanError('');
    setState('scanning');
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const codeReader = new BrowserMultiFormatReader();

      const videoEl = videoRef.current;
      if (!videoEl) throw new Error('No video element');

      const controls = await codeReader.decodeFromVideoDevice(
        undefined,
        videoEl,
        async (result, err) => {
          if (!result) return;
          const text = result.getText();
          const match = text.match(/\/cajero\/([a-f0-9-]{36})/);
          const claimId = match?.[1];
          if (!claimId) {
            setScanError('Este QR no es un código de cobro válido.');
            return;
          }
          // Haptic feedback on successful scan
          try { navigator.vibrate?.(100); } catch {}
          await stopScanner();
          setState('loading');
          router.push(`/cajero/${claimId}?cajero=${encodeURIComponent(restaurantName)}`);
        }
      );
      codeReaderRef.current = controls;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setScanError(
        msg.includes('permission') || msg.includes('NotAllowed') || msg.includes('Permission')
          ? 'Necesitas permitir el acceso a la cámara.'
          : 'No se pudo iniciar la cámara. Usa el código manual.'
      );
      setState('idle');
    } finally {
      isStartingRef.current = false;
    }
  }

  useEffect(() => () => { stopScanner(); }, []);

  async function toggleKiosk() {
    if (!kioskMode) {
      try {
        await (document.documentElement.requestFullscreen?.() ?? document.body.requestFullscreen?.());
      } catch { /* user denied or unsupported */ }
      setKioskMode(true);
    } else {
      try { await document.exitFullscreen?.(); } catch {}
      setKioskMode(false);
    }
  }

  useEffect(() => {
    if (kioskMode) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [kioskMode]);

  useEffect(() => {
    function onFullscreenChange() {
      if (!document.fullscreenElement) setKioskMode(false);
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

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

  const todayClaims = history.filter(c => c.claimed_at.slice(0, 10) === new Date().toISOString().slice(0, 10));
  const displayedHistory = historyTab === 'today' ? todayClaims : history;

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF9' }}>

      {/* Header — brand gradient bar */}
      <div className="sticky top-0 z-20 shadow-md" style={{ background: `linear-gradient(135deg,${accentColor},${accentDark})` }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 font-extrabold text-white text-sm border border-white/30"
            style={{ backdropFilter: 'blur(4px)' }}
          >
            {initials(restaurantName)}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-extrabold text-base leading-tight truncate">{restaurantName}</p>
            <p className="text-white/70 text-xs">Cajero · 3E</p>
          </div>

          {kioskMode && (
            <span className="text-white text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)' }}>
              Modo kiosco
            </span>
          )}

          <a
            href="/cajero/verificar-codigo"
            className="text-white/80 hover:text-white text-xs font-bold rounded-lg px-3 py-1.5 transition-all shrink-0 flex items-center gap-1"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Verificar
          </a>

          <button
            onClick={() => setShowManual(!showManual)}
            className="text-white/80 hover:text-white text-xs font-bold rounded-lg px-3 py-1.5 transition-all shrink-0"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
          >
            Manual
          </button>

          <button
            onClick={toggleKiosk}
            title={kioskMode ? 'Salir de kiosco' : 'Modo kiosco'}
            className="text-white/80 hover:text-white rounded-lg p-1.5 transition-all shrink-0"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
          >
            {kioskMode ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-2xl lg:max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">

        {/* SCANNER SECTION */}
        <div className="lg:w-1/2">
        <div className="bg-white rounded-3xl border border-[#E8E3DC] overflow-hidden" style={{ boxShadow: '0 1px 2px rgba(28,25,23,0.04), 0 8px 32px rgba(28,25,23,0.08)' }}>
          {/* Card header */}
          <div className="px-5 py-4 border-b border-[#E8E3DC] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: accentColor + '18' }}>
              <svg className="w-5 h-5" style={{ color: accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4h.01M8 8h.01M16 8h.01M4 12h.01M20 12h.01M8 16h.01M16 16h.01M12 20h.01M4 4h4v4H4zm12 0h4v4h-4zM4 16h4v4H4zm12 0h4v4h-4z" />
              </svg>
            </div>
            <div>
              <h2 className="text-[#1C1917] font-extrabold text-base leading-tight">Escanear QR del Cliente</h2>
              <p className="text-[#a8a29e] text-xs mt-0.5">Pide al cliente que muestre su QR y apunta la cámara hacia él</p>
            </div>
          </div>

          <div className="p-5">
            {state === 'loading' ? (
              <div className="text-center py-12">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: accentColor + '18' }}
                >
                  <svg className="animate-spin w-8 h-8" style={{ color: accentColor }} fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
                <p className="text-[#1C1917] font-bold text-sm">Cargando información del premio...</p>
                <p className="text-[#a8a29e] text-xs mt-1">Un momento por favor</p>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-bold text-[#a8a29e] uppercase tracking-widest text-center mb-3">
                  Centra el QR del cliente en el recuadro
                </p>

                {/* Camera box */}
                <div
                  className="relative bg-[#1C1917] rounded-2xl overflow-hidden mb-5 mx-auto"
                  style={{
                    maxWidth: kioskMode ? 520 : 340,
                    aspectRatio: '1/1',
                    border: state === 'scanning' ? `2px solid ${accentColor}` : '2px dashed #3c2a20',
                    boxShadow: state === 'scanning' ? `0 0 0 4px ${accentColor}22, 0 8px 32px rgba(0,0,0,0.35)` : '0 4px 20px rgba(0,0,0,0.25)',
                    transition: 'box-shadow 0.3s, border-color 0.3s',
                  }}
                >
                  {/* Native video element for @zxing/browser */}
                  <video
                    ref={videoRef}
                    id="zxing-video"
                    className="w-full h-full object-cover"
                    style={{ display: state === 'scanning' ? 'block' : 'none' }}
                    autoPlay
                    muted
                    playsInline
                  />

                  {state === 'idle' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="absolute top-5 left-5 w-8 h-8 border-t-2 border-l-2 border-white/20 rounded-tl-lg" />
                      <div className="absolute top-5 right-5 w-8 h-8 border-t-2 border-r-2 border-white/20 rounded-tr-lg" />
                      <div className="absolute bottom-5 left-5 w-8 h-8 border-b-2 border-l-2 border-white/20 rounded-bl-lg" />
                      <div className="absolute bottom-5 right-5 w-8 h-8 border-b-2 border-r-2 border-white/20 rounded-br-lg" />

                      <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mb-4 backdrop-blur-sm">
                        <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <p className="text-white/50 text-sm font-semibold">Cámara apagada</p>
                      <p className="text-white/30 text-xs mt-1">Presiona el botón para activar</p>
                    </div>
                  )}

                  {state === 'scanning' && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-6 left-6 w-12 h-12 border-t-4 border-l-4 rounded-tl-lg" style={{ borderColor: accentColor }} />
                      <div className="absolute top-6 right-6 w-12 h-12 border-t-4 border-r-4 rounded-tr-lg" style={{ borderColor: accentColor }} />
                      <div className="absolute bottom-6 left-6 w-12 h-12 border-b-4 border-l-4 rounded-bl-lg" style={{ borderColor: accentColor }} />
                      <div className="absolute bottom-6 right-6 w-12 h-12 border-b-4 border-r-4 rounded-br-lg" style={{ borderColor: accentColor }} />
                      <div
                        className="absolute inset-x-6 top-1/2"
                        style={{
                          height: 3,
                          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                          boxShadow: `0 0 12px ${accentColor}`,
                          animation: 'scan-line 2s ease-in-out infinite',
                        }}
                      />
                    </div>
                  )}
                </div>

                {scanError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm text-center flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {scanError}
                  </div>
                )}

                {state === 'idle' ? (
                  <button
                    onClick={startScanner}
                    className="w-full font-black py-5 rounded-2xl flex items-center justify-center gap-3 text-white transition-all text-lg tracking-wide"
                    style={{
                      background: `linear-gradient(135deg,${accentColor},${accentDark})`,
                      boxShadow: `0 10px 32px ${accentColor}55`,
                    }}
                  >
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Activar Cámara y Escanear
                  </button>
                ) : (
                  <button
                    onClick={() => { stopScanner(); setState('idle'); setScanError(''); }}
                    className="w-full font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-stone-700 border border-[#E8E3DC] bg-white hover:bg-stone-50 transition-all text-base"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Detener Cámara
                  </button>
                )}

                {showManual && (
                  <div className="mt-4 bg-[#FAFAF9] border border-[#E8E3DC] rounded-2xl p-4">
                    <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Código manual
                    </p>
                    <form onSubmit={handleManualSubmit} className="flex gap-2">
                      <input
                        value={manualId}
                        onChange={(e) => setManualId(e.target.value)}
                        placeholder="ID del cobro o URL completa"
                        className="flex-1 bg-white border border-[#E8E3DC] rounded-xl px-3 py-2.5 text-[#1C1917] placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                      />
                      <button type="submit" className="text-white font-bold px-4 py-2.5 rounded-xl text-sm shrink-0 transition-colors" style={{ background: accentColor }}>
                        Ir &rarr;
                      </button>
                    </form>
                  </div>
                )}

                {state === 'scanning' && (
                  <p className="text-stone-400 text-xs text-center mt-3 flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ backgroundColor: accentColor }} />
                    Mantén el QR centrado y espera a que se detecte automáticamente
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        </div>{/* end scanner lg:w-1/2 */}

        {/* HISTORY SECTION */}
        <div className="lg:w-1/2">
        <div className="bg-white rounded-3xl border border-[#E8E3DC] overflow-hidden" style={{ boxShadow: '0 1px 2px rgba(28,25,23,0.04), 0 4px 16px rgba(28,25,23,0.06)' }}>

          <div className="px-5 py-4 border-b border-[#E8E3DC]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-[#1C1917] font-extrabold text-base">Registro de este turno</h3>
              </div>
              <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-full px-3 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
                <span className="text-[#2563EB] text-xs font-bold">En vivo</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#FAFAF9] border border-[#E8E3DC] rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: accentColor + '18' }}>
                  <svg className="w-5 h-5" style={{ color: accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest">Entregados</p>
                  <p className="font-black text-2xl leading-none" style={{ color: accentColor }}>{delivered.length}</p>
                </div>
              </div>
              <div className="bg-[#FAFAF9] border border-[#E8E3DC] rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest">Pendientes</p>
                  <p className="text-orange-700 font-black text-2xl leading-none">{pending.length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 px-5 pt-4 pb-2">
            {(['today', 'all'] as const).map(tab => {
              const count = tab === 'today' ? todayClaims.length : history.length;
              const active = historyTab === tab;
              return (
                <button key={tab} onClick={() => setHistoryTab(tab)}
                  className={`text-xs font-bold px-4 py-2 rounded-full border transition-all ${active ? 'text-white border-transparent' : 'bg-[#FAFAF9] text-stone-600 border-[#E8E3DC] hover:border-stone-300'}`}
                  style={active ? { background: `linear-gradient(135deg,${accentColor},${accentDark})`, boxShadow: `0 4px 12px ${accentColor}35` } : {}}>
                  {tab === 'today' ? `Hoy (${count})` : `Historial (${count})`}
                </button>
              );
            })}
          </div>

          {historyLoading ? (
            <div className="p-10 text-center">
              <svg className="animate-spin w-6 h-6 mx-auto text-stone-300" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          ) : displayedHistory.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-[#FAFAF9] border border-[#E8E3DC] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-stone-600 font-bold text-sm">Sin registros todavía</p>
              <p className="text-stone-400 text-xs mt-1">Los cobros confirmados aparecerán aquí</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F0EDE8]">
              {displayedHistory.map((claim) => (
                <div key={claim.id} className="px-5 py-4 flex items-start gap-3 hover:bg-[#FAFAF9] transition-colors">
                  <Avatar name={claim.full_name} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[#1C1917] font-bold text-sm truncate">{claim.full_name}</p>
                      <span className="text-stone-400 text-xs whitespace-nowrap shrink-0">
                        {claim.status === 'delivered' && claim.delivered_at
                          ? timeAgo(claim.delivered_at)
                          : timeAgo(claim.claimed_at)}
                      </span>
                    </div>
                    <span className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full truncate max-w-[160px]" style={{ backgroundColor: accentColor + '18', color: accentColor }}>{claim.prize_name}</span>
                    {(claim.location ?? claim.prize_location) && (
                      <p className="text-stone-400 text-xs mt-0.5 flex items-center gap-1 truncate">
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {claim.location ?? claim.prize_location}
                      </p>
                    )}
                    {claim.status === 'pending' && (
                      <p className="mt-1 flex items-center gap-1.5 text-orange-600 text-[10px] font-bold">
                        <span className="w-2 h-2 rounded-full bg-orange-400 inline-block animate-pulse shrink-0" />
                        Pendiente de entrega
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {claim.status === 'delivered' ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        Entregado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full border border-orange-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block animate-pulse" />
                        Pendiente
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-5 py-3 bg-[#FAFAF9] border-t border-[#E8E3DC] flex items-center justify-between">
            <p className="text-xs text-stone-400">{history.length} registros totales</p>
            <div className="flex items-center gap-1.5 text-xs text-stone-400">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              Se actualiza cada 20 seg.
            </div>
          </div>
        </div>
        </div>{/* end history lg:w-1/2 */}

      </div>{/* end flex row wrapper */}
      </div>{/* end max-w outer */}

      <style>{`
        @keyframes scan-line {
          0%   { transform: translateY(-80px); opacity: 0.4; }
          50%  { transform: translateY(80px);  opacity: 1;   }
          100% { transform: translateY(-80px); opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
