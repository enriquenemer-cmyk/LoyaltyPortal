'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type VerifyResult =
  | { status: 'valid'; claim: { id: string; consolation_code: string | null; full_name: string; phone: string; prize_name: string; prize_description: string; amount: number; claimed_at: string; expires_at: string | null; restaurant_name: string | null } }
  | { status: 'already_redeemed'; redeemed_at: string; redeemed_by: string | null }
  | { status: 'expired'; expires_at: string }
  | { status: 'not_found' }
  | null;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function VerificarCodigoPage() {
  const [code, setCode] = useState('');
  const [cashierName, setCashierName] = useState('');
  const [result, setResult] = useState<VerifyResult>(null);
  const [loading, setLoading] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<import('@zxing/browser').IScannerControls | null>(null);

  const accentColor = '#F97316';

  async function stopScanner() {
    if (scannerRef.current) {
      try { scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream | null;
      stream?.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  }

  async function startQRScan() {
    setError('');
    setScanning(true);
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      const videoEl = videoRef.current;
      if (!videoEl) throw new Error('No video element');
      const controls = await reader.decodeFromVideoDevice(undefined, videoEl, async (res) => {
        if (!res) return;
        const text = res.getText();
        // Accept bare codes like CONS-XXXXXX or full URLs containing them
        const match = text.match(/CONS-[A-Z0-9]{6,}/i);
        const found = match ? match[0].toUpperCase() : text.trim().toUpperCase();
        await stopScanner();
        setCode(found);
        handleVerify(found);
      });
      scannerRef.current = controls;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg.includes('permission') || msg.includes('NotAllowed') ? 'Necesitas permitir el acceso a la cámara.' : 'No se pudo iniciar la cámara.');
      setScanning(false);
    }
  }

  useEffect(() => () => { stopScanner(); }, []);

  async function handleVerify(codeOverride?: string) {
    const target = (codeOverride ?? code).toUpperCase().trim();
    if (!target) return;
    setLoading(true);
    setResult(null);
    setError('');
    setRedeemSuccess(false);
    try {
      const res = await fetch(`/api/consolation/verify?code=${encodeURIComponent(target)}`);
      const data = await res.json();
      setResult(data as VerifyResult);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRedeem() {
    if (!result || result.status !== 'valid') return;
    if (!cashierName.trim()) {
      setError('Ingresa tu nombre de cajero para confirmar la entrega.');
      return;
    }
    setRedeeming(true);
    setError('');
    try {
      const res = await fetch('/api/consolation/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: result.claim.consolation_code ?? code, cashier_name: cashierName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Error al canjear');
        // Re-verify to show updated state
        handleVerify();
      } else {
        setRedeemSuccess(true);
        setResult(null);
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setRedeeming(false);
    }
  }

  function handleCodeChange(val: string) {
    setCode(val.toUpperCase());
    setResult(null);
    setRedeemSuccess(false);
    setError('');
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Header */}
      <div className="sticky top-0 z-20 shadow-md" style={{ background: `linear-gradient(135deg, #F97316, #EA580C)` }}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/cajero/escanear" className="text-white/80 hover:text-white rounded-lg p-1.5 transition-all" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1">
            <p className="text-white font-extrabold text-base leading-tight">Verificar Codigo de Premio</p>
            <p className="text-white/70 text-xs">Consolacion · Canjear</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Search card */}
        <div className="bg-white rounded-3xl border border-[#E8E3DC] overflow-hidden" style={{ boxShadow: '0 1px 2px rgba(28,25,23,0.04), 0 8px 32px rgba(28,25,23,0.08)' }}>
          <div className="px-5 py-4 border-b border-[#E8E3DC]">
            <h2 className="text-[#1C1917] font-extrabold text-base">Verificar Codigo</h2>
            <p className="text-[#a8a29e] text-xs mt-0.5">Ingresa el codigo o escanea el QR del cliente</p>
          </div>

          <div className="p-5 space-y-4">
            {/* QR Scanner area */}
            {scanning && (
              <div className="relative bg-[#1C1917] rounded-2xl overflow-hidden mx-auto" style={{ maxWidth: 340, aspectRatio: '1/1', border: `2px solid ${accentColor}`, boxShadow: `0 0 0 4px ${accentColor}22` }}>
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-6 left-6 w-12 h-12 border-t-4 border-l-4 rounded-tl-lg" style={{ borderColor: accentColor }} />
                  <div className="absolute top-6 right-6 w-12 h-12 border-t-4 border-r-4 rounded-tr-lg" style={{ borderColor: accentColor }} />
                  <div className="absolute bottom-6 left-6 w-12 h-12 border-b-4 border-l-4 rounded-bl-lg" style={{ borderColor: accentColor }} />
                  <div className="absolute bottom-6 right-6 w-12 h-12 border-b-4 border-r-4 rounded-br-lg" style={{ borderColor: accentColor }} />
                  <div className="absolute inset-x-6 top-1/2" style={{ height: 3, background: `linear-gradient(90deg,transparent,${accentColor},transparent)`, boxShadow: `0 0 12px ${accentColor}`, animation: 'scan-line 2s ease-in-out infinite' }} />
                </div>
              </div>
            )}

            {/* Code input */}
            <div className="flex gap-2">
              <input
                value={code}
                onChange={e => handleCodeChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleVerify()}
                placeholder="CONS-XXXXXX"
                className="flex-1 bg-[#FAFAF9] border border-[#E8E3DC] rounded-2xl px-4 py-3.5 text-[#1C1917] placeholder-stone-400 font-mono text-lg uppercase focus:outline-none focus:ring-2 focus:border-orange-500 transition-all tracking-widest"
                style={{ '--tw-ring-color': `${accentColor}40` } as React.CSSProperties}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                onClick={() => scanning ? stopScanner() : startQRScan()}
                title={scanning ? 'Detener camara' : 'Escanear QR'}
                className="rounded-2xl px-4 py-3.5 border border-[#E8E3DC] bg-white text-stone-600 hover:bg-stone-50 transition-all shrink-0"
              >
                {scanning ? (
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4h.01M8 8h.01M16 8h.01M4 12h.01M20 12h.01M8 16h.01M16 16h.01M12 20h.01M4 4h4v4H4zm12 0h4v4h-4zM4 16h4v4H4zm12 0h4v4h-4z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Verify button */}
            <button
              onClick={() => handleVerify()}
              disabled={!code.trim() || loading}
              className="w-full font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-white transition-all text-base disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: `linear-gradient(135deg, #F97316, #EA580C)`, boxShadow: '0 10px 32px rgba(249,115,22,0.35)' }}
            >
              {loading ? (
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {loading ? 'Verificando...' : 'Verificar Codigo'}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Redeem success */}
        {redeemSuccess && (
          <div className="bg-white rounded-3xl border border-emerald-200 overflow-hidden" style={{ boxShadow: '0 8px 32px rgba(16,185,129,0.12)' }}>
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0116 0z" />
                </svg>
              </div>
              <h3 className="text-emerald-700 font-extrabold text-xl mb-1">Premio entregado</h3>
              <p className="text-emerald-600 text-sm">El codigo fue marcado como entregado exitosamente.</p>
              <button onClick={() => { setCode(''); setRedeemSuccess(false); setResult(null); }} className="mt-5 text-emerald-600 font-bold text-sm underline">
                Verificar otro codigo
              </button>
            </div>
          </div>
        )}

        {/* VALID result */}
        {result?.status === 'valid' && (
          <div className="bg-white rounded-3xl border border-emerald-200 overflow-hidden" style={{ boxShadow: '0 8px 32px rgba(16,185,129,0.10)' }}>
            <div className="px-5 py-4 bg-emerald-50 border-b border-emerald-200 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-emerald-800 font-extrabold text-base">Codigo valido</p>
                <p className="text-emerald-600 text-xs">Listo para ser canjeado</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#FAFAF9] border border-[#E8E3DC] rounded-2xl px-4 py-3">
                  <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-1">Cliente</p>
                  <p className="text-[#1C1917] font-bold text-sm">{result.claim.full_name}</p>
                  <p className="text-stone-400 text-xs">{result.claim.phone}</p>
                </div>
                <div className="bg-[#FAFAF9] border border-[#E8E3DC] rounded-2xl px-4 py-3">
                  <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-1">Monto gastado</p>
                  <p className="text-[#1C1917] font-black text-xl">${Number(result.claim.amount).toFixed(2)}</p>
                </div>
                <div className="bg-[#FAFAF9] border border-[#E8E3DC] rounded-2xl px-4 py-3">
                  <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-1">Premio</p>
                  <p className="text-[#1C1917] font-bold text-sm">{result.claim.prize_name}</p>
                </div>
                <div className="bg-[#FAFAF9] border border-[#E8E3DC] rounded-2xl px-4 py-3">
                  <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-1">Fecha</p>
                  <p className="text-[#1C1917] font-bold text-xs">{formatDate(result.claim.claimed_at)}</p>
                </div>
              </div>

              {result.claim.expires_at && (
                <p className="text-orange-600 text-xs font-bold flex items-center gap-1.5">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Vence el {formatDate(result.claim.expires_at)}
                </p>
              )}

              {/* Cashier name input */}
              <div>
                <label className="block text-stone-500 text-xs font-bold uppercase tracking-widest mb-2">Tu nombre (cajero)</label>
                <input
                  value={cashierName}
                  onChange={e => setCashierName(e.target.value)}
                  placeholder="Ej: Maria Garcia"
                  className="w-full bg-[#FAFAF9] border border-[#E8E3DC] rounded-xl px-4 py-3 text-[#1C1917] placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:border-orange-500 transition-all"
                  style={{ '--tw-ring-color': '#F9731640' } as React.CSSProperties}
                />
              </div>

              <button
                onClick={handleRedeem}
                disabled={redeeming || !cashierName.trim()}
                className="w-full font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-white text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: `linear-gradient(135deg, #F97316, #EA580C)`, boxShadow: '0 10px 32px rgba(249,115,22,0.35)' }}
              >
                {redeeming ? (
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {redeeming ? 'Procesando...' : 'Marcar como entregado'}
              </button>
            </div>
          </div>
        )}

        {/* ALREADY REDEEMED */}
        {result?.status === 'already_redeemed' && (
          <div className="bg-white rounded-3xl border border-red-200 overflow-hidden" style={{ boxShadow: '0 8px 32px rgba(239,68,68,0.10)' }}>
            <div className="px-5 py-4 bg-red-50 border-b border-red-200 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="text-red-700 font-extrabold text-base">Ya fue canjeado</p>
                <p className="text-red-500 text-xs">Este codigo ya fue utilizado anteriormente</p>
              </div>
            </div>
            <div className="p-5 space-y-2">
              <div className="bg-[#FAFAF9] border border-[#E8E3DC] rounded-2xl px-4 py-3">
                <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-1">Canjeado el</p>
                <p className="text-[#1C1917] font-bold text-sm">{formatDate(result.redeemed_at)}</p>
              </div>
              {result.redeemed_by && (
                <div className="bg-[#FAFAF9] border border-[#E8E3DC] rounded-2xl px-4 py-3">
                  <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-1">Canjeado por</p>
                  <p className="text-[#1C1917] font-bold text-sm">{result.redeemed_by}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* EXPIRED */}
        {result?.status === 'expired' && (
          <div className="bg-white rounded-3xl border border-orange-200 overflow-hidden" style={{ boxShadow: '0 8px 32px rgba(249,115,22,0.10)' }}>
            <div className="px-5 py-4 bg-orange-50 border-b border-orange-200 flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <p className="text-orange-800 font-extrabold text-base">Codigo expirado</p>
                <p className="text-orange-600 text-xs">Este codigo ya no es valido</p>
              </div>
            </div>
            <div className="p-5">
              <div className="bg-[#FAFAF9] border border-[#E8E3DC] rounded-2xl px-4 py-3">
                <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-1">Expiro el</p>
                <p className="text-[#1C1917] font-bold text-sm">{formatDate(result.expires_at)}</p>
              </div>
            </div>
          </div>
        )}

        {/* NOT FOUND */}
        {result?.status === 'not_found' && (
          <div className="bg-white rounded-3xl border border-red-200 overflow-hidden" style={{ boxShadow: '0 8px 32px rgba(239,68,68,0.10)' }}>
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-red-700 font-extrabold text-lg">Codigo no encontrado</p>
              <p className="text-red-400 text-sm mt-1">Verifica que el codigo este bien escrito.</p>
            </div>
          </div>
        )}

      </div>

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
