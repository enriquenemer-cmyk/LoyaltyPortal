'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { Restaurant, TicketTier, RestaurantTicketConfig } from '@/lib/db';

const GameGateway = dynamic(() => import('@/app/premio/[id]/GameGateway'), { ssr: false });

type State = 'intro' | 'scanning' | 'processing' | 'confirming' | 'result' | 'playing' | 'claiming' | 'consolation' | 'confirmed' | 'feedback' | 'farewell';

type ConsolationData = {
  name: string;
  description: string;
  code: string;
  is_consolation: true;
};

type ScanResult = {
  amount: number | null;
  image_hash?: string | null;
  tier: { prize_name: string; prize_description: string; game_type: string | null } | null;
  consolation?: ConsolationData | null;
  message: string;
  error_type?: string;
  error?: string;
  demo?: boolean;
  demo_note?: string;
  duplicate?: boolean;
  invalid?: boolean;
  outdated?: boolean;
};

export default function TicketScanner({
  restaurant,
  tiers,
  config,
}: {
  restaurant: Restaurant;
  tiers: TicketTier[];
  config: RestaurantTicketConfig | null;
}) {
  const searchParams = useSearchParams();
  const kiosk = searchParams.get('kiosk') === 'true';

  const [state, setState] = useState<State>('intro');
  const [howOpen, setHowOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [folio, setFolio] = useState<string | null>(null);
  const [consolationFolio, setConsolationFolio] = useState<string | null>(null);
  const [consolationPhase, setConsolationPhase] = useState<'amount' | 'reveal' | 'form'>('amount');
  const [formData, setFormData] = useState({ full_name: '', phone: '', location: '' });
  const [submitting, setSubmitting] = useState(false);
  const [scanLinePos, setScanLinePos] = useState(0);
  const [kioskCountdown, setKioskCountdown] = useState(8);
  const [retryMsg, setRetryMsg] = useState('');
  const [limitWarning, setLimitWarning] = useState('');
  const [limitExceeded, setLimitExceeded] = useState(false);
  const [activeEvent, setActiveEvent] = useState<{
    id: string;
    name: string;
    event_type: string;
    multiplier: number;
    max_participants: number | null;
    participants_count: number;
  } | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [feedbackStars, setFeedbackStars] = useState(0);
  const [feedbackHover, setFeedbackHover] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [lastClaimId, setLastClaimId] = useState<string | null>(null);
  const scanAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const kioskTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const selectedFile = useRef<File | null>(null);

  // Auto-reset on farewell (non-kiosk too)
  useEffect(() => {
    if (state === 'farewell') {
      const t = setTimeout(() => resetScan(), 3000);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Kiosk auto-reset after farewell
  useEffect(() => {
    if (kiosk && state === 'farewell') {
      let count = 8;
      setKioskCountdown(count);
      kioskTimerRef.current = setInterval(() => {
        count -= 1;
        setKioskCountdown(count);
        if (count <= 0) {
          clearInterval(kioskTimerRef.current!);
          resetScan();
        }
      }, 1000);
    }
    return () => {
      if (kioskTimerRef.current) clearInterval(kioskTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, kiosk]);

  // Fetch active events on load
  useEffect(() => {
    fetch(`/api/events?restaurant_id=${restaurant.id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.events?.length > 0) setActiveEvent(d.events[0]);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant.id]);

  const startScanAnimation = useCallback(() => {
    let pos = 0;
    let dir = 1;
    scanAnimRef.current = setInterval(() => {
      pos += dir * 2;
      if (pos >= 100) dir = -1;
      if (pos <= 0) dir = 1;
      setScanLinePos(pos);
    }, 20);
  }, []);

  const stopScanAnimation = useCallback(() => {
    if (scanAnimRef.current) {
      clearInterval(scanAnimRef.current);
      scanAnimRef.current = null;
    }
  }, []);

  async function handleFileSelect(file: File) {
    selectedFile.current = file;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setState('scanning');

    setTimeout(() => {
      setState('processing');
      startScanAnimation();
      uploadAndScan(file);
    }, 800);
  }

  async function uploadAndScan(file: File) {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('restaurant_id', restaurant.id);

    try {
      const res = await fetch('/api/scan-ticket', { method: 'POST', body: fd });
      const data: ScanResult = await res.json();
      stopScanAnimation();

      // Handle special errors
      if (res.status === 409 || data.duplicate) {
        setScanResult({ amount: null, tier: null, message: data.error ?? 'Este ticket ya fue utilizado.', error_type: 'duplicate', duplicate: true });
        setState('result');
        return;
      }
      if (data.invalid) {
        setScanResult({ amount: null, tier: null, message: data.error ?? 'El ticket no es de un restaurante.', error_type: 'invalid', invalid: true });
        setState('result');
        return;
      }
      if (data.outdated) {
        setScanResult({ amount: null, tier: null, message: data.error ?? 'Solo se aceptan tickets del día actual.', error_type: 'outdated', outdated: true });
        setState('result');
        return;
      }

      setScanResult(data);

      // Route to appropriate state
      if (data.amount !== null && data.tier) {
        setState('confirming');
      } else if (data.amount !== null && data.consolation) {
        setConsolationPhase('amount');
        setState('consolation');
      } else {
        setState('result');
      }
    } catch {
      stopScanAnimation();
      setScanResult({ amount: null, tier: null, message: 'Error de conexión. Intenta de nuevo.', error_type: 'network' });
      setState('result');
    }
  }

  function resetScan() {
    setPreviewUrl(null);
    setScanResult(null);
    selectedFile.current = null;
    setFormData({ full_name: '', phone: '', location: '' });
    setLimitWarning('');
    setLimitExceeded(false);
    setRetryMsg('');
    setConsolationPhase('amount');
    setConsolationFolio(null);
    setPrivacyAccepted(false);
    setState('intro');
  }

  async function checkDailyLimit(phone: string) {
    if (!phone || phone.length < 7) return;
    try {
      const res = await fetch(`/api/ticket-claims/check?phone=${encodeURIComponent(phone)}&restaurant_id=${restaurant.id}`);
      const data = await res.json();
      if (!data.allowed) {
        setLimitWarning(`Límite alcanzado: ya usaste ${data.count} de ${data.limit} tickets hoy.`);
        setLimitExceeded(true);
      } else {
        setLimitWarning('');
        setLimitExceeded(false);
      }
    } catch {
      // ignore
    }
  }

  async function submitClaim() {
    if (!scanResult?.tier || !scanResult.amount) return;
    if (!formData.full_name || !formData.phone) return;
    if (limitExceeded) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/ticket-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          amount: scanResult.amount,
          prize_name: scanResult.tier.prize_name,
          prize_description: scanResult.tier.prize_description,
          full_name: formData.full_name,
          phone: formData.phone,
          location: formData.location || null,
          image_hash: scanResult.image_hash ?? null,
        }),
      });
      const data = await res.json();
      setFolio(data.folio ?? data.claim?.id?.slice(0, 8).toUpperCase() ?? 'XXXXXX');
      setLastClaimId(data.claim?.id ?? null);
      setState('confirmed');
    } catch {
      alert('Error al registrar. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitConsolationClaim() {
    if (!scanResult?.consolation || !scanResult.amount) return;
    if (!formData.full_name || !formData.phone) return;
    if (limitExceeded) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/ticket-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          amount: scanResult.amount,
          prize_name: scanResult.consolation.name,
          prize_description: scanResult.consolation.description,
          full_name: formData.full_name,
          phone: formData.phone,
          location: formData.location || null,
          image_hash: scanResult.image_hash ?? null,
        }),
      });
      const data = await res.json();
      setConsolationFolio(scanResult.consolation.code ?? data.folio ?? data.claim?.id?.slice(0, 8).toUpperCase() ?? 'CONS-XXXX');
      setLastClaimId(data.claim?.id ?? null);
      setState('confirmed');
    } catch {
      alert('Error al registrar. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  // Determine if matched tier is VIP (highest tier = max min_amount OR no max_amount)
  function isVipTier(tierName: string): boolean {
    if (tiers.length === 0) return false;
    // Highest tier: the tier with no max_amount among tiers, or the one with highest min_amount
    const noMax = tiers.filter((t) => t.max_amount === null);
    if (noMax.length > 0) {
      // highest min_amount among no-max tiers
      const best = noMax.reduce((a, b) => Number(a.min_amount) >= Number(b.min_amount) ? a : b);
      return best.prize_name === tierName;
    }
    const best = tiers.reduce((a, b) => Number(a.min_amount) >= Number(b.min_amount) ? a : b);
    return best.prize_name === tierName;
  }

  const minTier = tiers.length > 0
    ? Math.min(...tiers.map((t) => Number(t.min_amount)))
    : 0;

  const primaryColor = config?.primary_color ?? '#2563EB';
  const welcomeTitle = config?.welcome_title ?? `${restaurant.name} te premia`;
  const welcomeSubtitle = config?.welcome_subtitle ?? 'Sube la foto de tu ticket y gana premios';

  const btnHeight = kiosk ? '72px' : '52px';
  const btnFontSize = kiosk ? 20 : 17;

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (state === 'intro') {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: '#1C1917',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '24px 16px 32px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <style>{`
          @keyframes pulse {
            0%,100%{box-shadow:0 0 0 0 rgba(37,99,235,0.5)}
            50%{box-shadow:0 0 0 20px rgba(37,99,235,0)}
          }
          @keyframes eventPulse {
            0%,100%{box-shadow:0 0 0 0 rgba(56,189,248,0.5), 0 0 24px rgba(56,189,248,0.35)}
            50%{box-shadow:0 0 0 8px rgba(56,189,248,0), 0 0 32px rgba(56,189,248,0.5)}
          }
          @keyframes fadeIn {
            from{opacity:0;transform:translateY(16px)}
            to{opacity:1;transform:translateY(0)}
          }
        `}</style>

        <div style={{ width: '100%', maxWidth: 400, animation: 'fadeIn 0.5s ease-out' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', marginBottom: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {restaurant.name}
          </p>

          {/* Kiosk fullscreen button */}
          {kiosk && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button
                onClick={() => document.documentElement.requestFullscreen?.()}
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: 'white', fontSize: 13, padding: '6px 12px', cursor: 'pointer' }}
              >
                ⛶ Pantalla completa
              </button>
            </div>
          )}

          {retryMsg && (
            <div style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              <p style={{ color: '#38BDF8', fontSize: 13 }}>{retryMsg}</p>
            </div>
          )}

          {/* Active event banner */}
          {activeEvent && (
            <div style={{
              background: 'linear-gradient(135deg, #1E40AF, #0EA5E9)',
              border: '2px solid #38BDF8',
              borderRadius: 14,
              padding: '14px 18px',
              marginBottom: 20,
              textAlign: 'center',
              boxShadow: '0 0 24px rgba(56,189,248,0.35)',
              animation: 'eventPulse 2s infinite',
            }}>
              <p style={{ color: '#fef3c7', fontWeight: 900, fontSize: 16, margin: 0, lineHeight: 1.4 }}>
                {activeEvent.event_type === 'double_points' && `⚡ ${activeEvent.name} — ¡Doble puntos hoy!`}
                {activeEvent.event_type === 'first_N' && `⚡ ¡Primeros ${activeEvent.max_participants ?? '?'} clientes ganan un extra! (${activeEvent.participants_count} registrados)`}
                {activeEvent.event_type === 'min_amount_boost' && `⚡ ${activeEvent.name} — ¡Monto mínimo reducido ${activeEvent.multiplier}%!`}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
            <div style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              background: primaryColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s infinite',
              boxShadow: `0 0 40px ${primaryColor}66`,
            }}>
              <svg width="48" height="48" fill="none" stroke="white" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 900, color: 'white', textAlign: 'center', margin: '0 0 8px' }}>
            {welcomeTitle}
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 32, lineHeight: 1.5 }}>
            {welcomeSubtitle}
          </p>

          {tiers.length > 0 && (
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16,
              padding: '16px',
              marginBottom: 28,
            }}>
              <p style={{ color: primaryColor, fontWeight: 700, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
                Premios disponibles
              </p>
              {tiers.map((t) => (
                <div key={t.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                    Desde ${Number(t.min_amount).toFixed(0)}
                    {t.max_amount ? ` – $${Number(t.max_amount).toFixed(0)}` : '+'}
                  </span>
                  <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>
                    {t.prize_name}
                    {t.game_type ? ' 🎰' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
          />

          <button
            onClick={() => fileRef.current?.click()}
            style={{
              width: '100%',
              minHeight: btnHeight,
              padding: '16px',
              borderRadius: 14,
              background: primaryColor,
              color: 'white',
              fontWeight: 800,
              fontSize: btnFontSize,
              border: 'none',
              cursor: 'pointer',
              marginBottom: 12,
              boxShadow: `0 4px 20px ${primaryColor}66`,
            }}
          >
            Tomar foto
          </button>
          <button
            onClick={() => galleryRef.current?.click()}
            style={{
              width: '100%',
              minHeight: btnHeight,
              padding: '16px',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.08)',
              color: 'white',
              fontWeight: 700,
              fontSize: btnFontSize,
              border: '1px solid rgba(255,255,255,0.15)',
              cursor: 'pointer',
            }}
          >
            Subir imagen
          </button>

          {/* ¿Cómo funciona? collapsible */}
          <div style={{ marginTop: 24 }}>
            <button
              onClick={() => setHowOpen((o) => !o)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.7)',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>¿Cómo funciona?</span>
              <span style={{ fontSize: 18, transition: 'transform 0.25s', transform: howOpen ? 'rotate(180deg)' : 'none' }}>⌄</span>
            </button>

            {howOpen && (
              <div style={{
                marginTop: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                padding: '20px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
              }}>
                {/* Step 1 */}
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{
                    minWidth: 40, height: 40, borderRadius: '50%',
                    background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>📸</div>
                  <div>
                    <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>
                      Toma una foto clara de tu cuenta o recibo
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                      Asegúrate que el <strong style={{ color: '#38BDF8' }}>TOTAL</strong> sea visible
                    </p>
                    {/* Receipt illustration */}
                    <div style={{ marginTop: 10 }}>
                      <svg width="140" height="90" viewBox="0 0 140 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Phone outline */}
                        <rect x="2" y="2" width="52" height="86" rx="8" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="rgba(255,255,255,0.06)" />
                        <rect x="8" y="12" width="40" height="64" rx="4" fill="rgba(255,255,255,0.08)" />
                        {/* Receipt inside phone */}
                        <rect x="12" y="16" width="32" height="52" rx="2" fill="white" opacity="0.9" />
                        <line x1="15" y1="24" x2="40" y2="24" stroke="#aaa" strokeWidth="1" />
                        <line x1="15" y1="30" x2="38" y2="30" stroke="#aaa" strokeWidth="1" />
                        <line x1="15" y1="36" x2="36" y2="36" stroke="#aaa" strokeWidth="1" />
                        <line x1="15" y1="42" x2="39" y2="42" stroke="#aaa" strokeWidth="1" />
                        {/* TOTAL highlight */}
                        <rect x="12" y="54" width="32" height="10" rx="2" fill="rgba(37,99,235,0.25)" stroke="#2563EB" strokeWidth="1" />
                        <text x="28" y="62" textAnchor="middle" fill="#2563EB" fontSize="5" fontWeight="bold">TOTAL</text>
                        {/* Arrow pointing to total */}
                        <path d="M 68 59 L 50 59" stroke="#38BDF8" strokeWidth="2" markerEnd="url(#arrowhead)" />
                        <defs>
                          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                            <path d="M0,0 L6,3 L0,6 Z" fill="#38BDF8" />
                          </marker>
                        </defs>
                        <text x="100" y="63" textAnchor="middle" fill="#38BDF8" fontSize="9" fontWeight="bold">TOTAL</text>
                        <text x="100" y="74" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8">aquí ↑</text>
                      </svg>
                    </div>
                  </div>
                </div>

                <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />

                {/* Step 2 */}
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{
                    minWidth: 40, height: 40, borderRadius: '50%',
                    background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>🤖</div>
                  <div>
                    <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>
                      Nuestra IA lee el monto automáticamente
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                      Nuestro sistema detecta el monto total de tu consumo
                    </p>
                  </div>
                </div>

                <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />

                {/* Step 3 */}
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{
                    minWidth: 40, height: 40, borderRadius: '50%',
                    background: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>🎁</div>
                  <div>
                    <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>
                      Gana un premio según tu consumo
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '0 0 10px', lineHeight: 1.5 }}>
                      A mayor consumo, mejor premio
                    </p>
                    {tiers.length > 0 && (
                      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 12px' }}>
                        {tiers.map((t) => (
                          <div key={t.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
                          }}>
                            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>
                              ${Number(t.min_amount).toFixed(0)}{t.max_amount ? `–$${Number(t.max_amount).toFixed(0)}` : '+'}
                            </span>
                            <span style={{ color: primaryColor, fontSize: 11, fontWeight: 700 }}>{t.prize_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── SCANNING + PROCESSING ──────────────────────────────────────────────────
  if (state === 'scanning' || state === 'processing') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: '#1C1917',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <style>{`
          @keyframes spinnerRot {
            to{transform:rotate(360deg)}
          }
          @keyframes dotBounce {
            0%,80%,100%{opacity:0.3;transform:scale(0.8)}
            40%{opacity:1;transform:scale(1)}
          }
        `}</style>

        <div style={{ width: '100%', maxWidth: 380 }}>
          <p style={{ color: '#2563EB', fontWeight: 700, textAlign: 'center', marginBottom: 16, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {state === 'scanning' ? 'Cargando imagen...' : 'Leyendo monto...'}
          </p>

          {previewUrl && (
            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Ticket"
                style={{ width: '100%', maxHeight: 420, objectFit: 'contain', display: 'block', background: '#0c0a09' }}
              />
              {state === 'processing' && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: `${scanLinePos}%`,
                  height: 3,
                  background: 'linear-gradient(90deg, transparent, #00ff88, transparent)',
                  boxShadow: '0 0 12px rgba(0,255,136,0.8)',
                  pointerEvents: 'none',
                  transition: 'top 0.02s linear',
                }} />
              )}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {state === 'processing' && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      border: '3px solid rgba(37,99,235,0.3)',
                      borderTop: '3px solid #2563EB',
                      animation: 'spinnerRot 0.8s linear infinite',
                      margin: '0 auto 12px',
                    }} />
                    <p style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>Analizando tu ticket...</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
                      {[0, 1, 2].map((i) => (
                        <div key={i} style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#2563EB',
                          animation: `dotBounce 1.2s ${i * 0.2}s ease-in-out infinite`,
                        }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── CONFIRMING ─────────────────────────────────────────────────────────────
  if (state === 'confirming' && scanResult) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: '#1C1917',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🧾</div>
          <h2 style={{ color: 'white', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
            Confirma tu monto
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, marginBottom: 28 }}>
            ¿Tu cuenta fue de este monto?
          </p>

          <div style={{
            background: '#2563EB',
            borderRadius: 20,
            padding: '28px 20px',
            marginBottom: 32,
            boxShadow: '0 0 40px rgba(37,99,235,0.4)',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 4 }}>Total detectado</p>
            <p style={{ color: 'white', fontSize: 52, fontWeight: 900, letterSpacing: '-0.02em' }}>
              ${scanResult.amount?.toFixed(2)}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 14 }}>
            <button
              onClick={() => setState('result')}
              style={{
                flex: 1,
                minHeight: btnHeight,
                padding: '16px',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.7)',
                fontWeight: 700,
                fontSize: btnFontSize,
                border: '1px solid rgba(255,255,255,0.15)',
                cursor: 'pointer',
              }}
            >
              ✗ No
            </button>
            <button
              onClick={() => {
                if (scanResult?.tier) {
                  setState('result');
                } else if (scanResult?.consolation) {
                  setConsolationPhase('amount');
                  setState('consolation');
                } else {
                  setState('result');
                }
              }}
              style={{
                flex: 2,
                minHeight: btnHeight,
                padding: '16px',
                borderRadius: 14,
                background: '#2563EB',
                color: 'white',
                fontWeight: 800,
                fontSize: btnFontSize,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
              }}
            >
              ✓ Sí, continuar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── RESULT ─────────────────────────────────────────────────────────────────
  if (state === 'result' && scanResult) {
    const unreadable = ['unreadable', 'network', 'duplicate', 'invalid', 'outdated'].includes(scanResult.error_type ?? '') || scanResult.amount === null;
    const noTier = !unreadable && !scanResult.tier;
    const hasTier = !unreadable && !!scanResult.tier;
    const vip = hasTier && isVipTier(scanResult.tier!.prize_name);

    let errorEmoji = '🤔';
    let errorTitle = 'No pudimos leer el monto';
    let errorBody = 'Por favor asegúrate que el ticket sea legible y el monto total sea visible';

    if (scanResult.duplicate) { errorEmoji = '🚫'; errorTitle = 'Ticket ya utilizado'; errorBody = 'Este ticket ya fue canjeado anteriormente.'; }
    else if (scanResult.invalid) { errorEmoji = '❌'; errorTitle = 'No es ticket de restaurante'; errorBody = 'Solo aceptamos tickets de restaurante o consumo de alimentos.'; }
    else if (scanResult.outdated) { errorEmoji = '📅'; errorTitle = 'Ticket no es de hoy'; errorBody = 'Solo se aceptan tickets del día actual.'; }

    return (
      <div style={{
        minHeight: '100dvh',
        background: '#1C1917',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 16px 40px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <style>{`
          @keyframes checkPop {
            0%{transform:scale(0);opacity:0}
            60%{transform:scale(1.2)}
            100%{transform:scale(1);opacity:1}
          }
          @keyframes confettiFall {
            0%{transform:translateY(-20px) rotate(0);opacity:1}
            100%{transform:translateY(100vh) rotate(720deg);opacity:0}
          }
          @keyframes slideUp {
            from{opacity:0;transform:translateY(20px)}
            to{opacity:1;transform:translateY(0)}
          }
        `}</style>

        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* UNREADABLE / errors */}
          {unreadable && (
            <div style={{ textAlign: 'center', animation: 'slideUp 0.5s ease-out' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>{errorEmoji}</div>
              <h2 style={{ color: 'white', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
                {errorTitle}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>
                {errorBody}
              </p>
              <button onClick={() => { setRetryMsg(''); resetScan(); }} style={{ ...orangeBtn, minHeight: btnHeight, fontSize: btnFontSize }}>
                Intentar de nuevo
              </button>
            </div>
          )}

          {/* NO TIER */}
          {noTier && (
            <div style={{ textAlign: 'center', animation: 'slideUp 0.5s ease-out' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>😔</div>
              <h2 style={{ color: 'white', fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
                Tu consumo fue de ${scanResult.amount?.toFixed(2)}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                ¡Sigue disfrutando! Con un consumo de ${minTier.toFixed(0)} o más ganas un premio
              </p>
              {tiers.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 16, marginBottom: 24 }}>
                  {tiers.map((t) => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Desde ${Number(t.min_amount).toFixed(0)}</span>
                      <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{t.prize_name}</span>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => { setRetryMsg(''); resetScan(); }} style={{ ...orangeBtn, minHeight: btnHeight, fontSize: btnFontSize }}>Escanear otro ticket</button>
            </div>
          )}

          {/* HAS TIER */}
          {hasTier && (
            <div style={{ animation: 'slideUp 0.5s ease-out' }}>
              {/* Confetti */}
              <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100 }}>
                {Array.from({ length: 14 }).map((_, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    left: `${5 + i * 6.5}%`,
                    top: -10,
                    fontSize: 16,
                    animation: `confettiFall ${2 + (i % 3) * 0.5}s ${i * 0.12}s linear forwards`,
                  }}>
                    {['🎉', '⭐', '🌟', '✨', '🎊'][i % 5]}
                  </div>
                ))}
              </div>

              {/* VIP Banner */}
              {vip && (
                <div style={{
                  background: 'linear-gradient(135deg, #1E40AF, #0EA5E9)',
                  border: '2px solid #38BDF8',
                  borderRadius: 14,
                  padding: '14px 20px',
                  marginBottom: 20,
                  textAlign: 'center',
                  boxShadow: '0 0 24px rgba(56,189,248,0.3)',
                }}>
                  <p style={{ color: '#fef3c7', fontWeight: 900, fontSize: 16, margin: 0 }}>
                    ⭐ ¡Cliente VIP! Tu consumo te da el mejor premio
                  </p>
                </div>
              )}

              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: '#22c55e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  animation: 'checkPop 0.5s ease-out',
                  boxShadow: '0 0 30px rgba(34,197,94,0.4)',
                }}>
                  <svg width="40" height="40" fill="none" stroke="white" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 4 }}>
                  Monto detectado: ${scanResult.amount?.toFixed(2)}
                </p>
                <h2 style={{ color: '#2563EB', fontSize: 26, fontWeight: 900, margin: '0 0 8px' }}>
                  {scanResult.tier!.prize_name}
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, marginBottom: 16 }}>
                  {scanResult.tier!.prize_description}
                </p>
                {scanResult.tier!.game_type && (
                  <p style={{ color: '#38BDF8', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
                    ¡Vas a jugar un juego para ganar!
                  </p>
                )}
              </div>

              {scanResult.demo && (
                <div style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
                  <p style={{ color: '#38BDF8', fontSize: 12 }}>{scanResult.demo_note}</p>
                </div>
              )}

              <button
                onClick={() => setState(scanResult.tier!.game_type ? 'playing' : 'claiming')}
                style={{ ...orangeBtn, minHeight: btnHeight, fontSize: btnFontSize }}
              >
                {scanResult.tier!.game_type ? '¡Jugar ahora!' : '¡Reclamar mi premio!'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── CONSOLATION ─────────────────────────────────────────────────────────────
  if (state === 'consolation' && scanResult?.consolation) {
    const cons = scanResult.consolation;
    return (
      <div style={{
        minHeight: '100dvh',
        background: '#1C1917',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 16px 48px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <style>{`
          @keyframes giftBounce {
            0%,100%{transform:translateY(0) scale(1)}
            40%{transform:translateY(-12px) scale(1.08)}
            60%{transform:translateY(-6px) scale(1.04)}
          }
          @keyframes warmReveal {
            from{opacity:0;transform:translateY(20px) scale(0.95)}
            to{opacity:1;transform:translateY(0) scale(1)}
          }
          @keyframes slideUpForm {
            from{opacity:0;transform:translateY(32px)}
            to{opacity:1;transform:translateY(0)}
          }
        `}</style>

        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Amount detected */}
          <div style={{ textAlign: 'center', marginBottom: 28, animation: 'warmReveal 0.5s ease-out' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              {restaurant.name}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 8 }}>
              Tu consumo de{' '}
              <span style={{ color: 'white', fontWeight: 700 }}>${scanResult.amount?.toFixed(2)}</span>
              {' '}aún no alcanza para el juego
            </p>
          </div>

          {/* Warm consolation reveal */}
          <div style={{
            background: 'rgba(37,99,235,0.1)',
            border: '1px solid rgba(37,99,235,0.3)',
            borderRadius: 20,
            padding: '24px 20px',
            marginBottom: 28,
            textAlign: 'center',
            animation: 'warmReveal 0.6s 0.2s ease-out both',
          }}>
            <div style={{
              fontSize: 64,
              marginBottom: 12,
              display: 'inline-block',
              animation: 'giftBounce 1.8s ease-in-out infinite',
            }}>🎁</div>
            <p style={{ color: '#0284C7', fontWeight: 900, fontSize: 18, marginBottom: 12 }}>
              ¡Pero tenemos algo para ti!
            </p>
            <p style={{ color: 'white', fontSize: 22, fontWeight: 800, marginBottom: 8, lineHeight: 1.3 }}>
              {cons.name}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              {cons.description}
            </p>

            {/* Consolation code — ticket-stub style */}
            <div style={{
              background: '#0284C7',
              borderRadius: 12,
              padding: '14px 20px',
              border: '2px dashed #1E40AF',
              display: 'inline-block',
              marginBottom: 10,
            }}>
              <p style={{ color: '#1E40AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                Tu código
              </p>
              <p style={{ color: '#1C1917', fontSize: 28, fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.12em', margin: 0 }}>
                {cons.code}
              </p>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 8 }}>
              Presenta este código al cajero
            </p>
          </div>

          {/* Claim form */}
          <div style={{ animation: 'slideUpForm 0.5s 0.4s ease-out both' }}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
              Regístra tus datos para guardar tu código
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Nombre completo *</label>
                <input
                  style={inputStyle}
                  placeholder="Tu nombre"
                  value={formData.full_name}
                  onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>Teléfono *</label>
                <input
                  style={inputStyle}
                  placeholder="Tu número de teléfono"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                  onBlur={(e) => checkDailyLimit(e.target.value)}
                />
                {limitWarning && (
                  <p style={{ color: '#38BDF8', fontSize: 12, marginTop: 6, background: 'rgba(56,189,248,0.1)', borderRadius: 8, padding: '6px 10px' }}>
                    ⚠️ {limitWarning}
                  </p>
                )}
              </div>
              <div>
                <label style={labelStyle}>Sucursal</label>
                <input
                  style={inputStyle}
                  placeholder="¿En qué sucursal estás?"
                  value={formData.location}
                  onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 20 }}>
              <input
                id="privacy-consolation"
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                style={{ marginTop: 2, width: 16, height: 16, accentColor: '#0284C7', cursor: 'pointer', flexShrink: 0 }}
              />
              <label htmlFor="privacy-consolation" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 1.5, cursor: 'pointer' }}>
                He leído y acepto el{' '}
                <a
                  href="/privacidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#2563EB', textDecoration: 'underline' }}
                >
                  Aviso de Privacidad
                </a>{' '}
                de Burrito Bar
              </label>
            </div>

            <button
              onClick={submitConsolationClaim}
              disabled={submitting || !formData.full_name || !formData.phone || limitExceeded || !privacyAccepted}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: 14,
                background: '#0284C7',
                color: '#1C1917',
                fontWeight: 800,
                fontSize: btnFontSize,
                border: 'none',
                cursor: submitting ? 'wait' : (limitExceeded || !privacyAccepted) ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
                marginTop: 16,
                opacity: (submitting || !formData.full_name || !formData.phone || limitExceeded || !privacyAccepted) ? 0.6 : 1,
                minHeight: btnHeight,
              }}
            >
              {submitting ? 'Guardando...' : 'Guardar mi código'}
            </button>
          </div>

          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginTop: 20, lineHeight: 1.5 }}>
            ¡Tu próxima visita te espera con un premio mejor!
          </p>
        </div>
      </div>
    );
  }

  // ── PLAYING ─────────────────────────────────────────────────────────────────
  if (state === 'playing' && scanResult?.tier?.game_type) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: '#1C1917',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <h2 style={{ color: 'white', textAlign: 'center', marginBottom: 24, fontWeight: 800, fontSize: 18 }}>
          ¡Juega para ganar tu premio!
        </h2>
        <GameGateway
          gameType={scanResult.tier.game_type}
          prizeName={scanResult.tier.prize_name}
          onWin={() => setState('claiming')}
        />
      </div>
    );
  }

  // ── CLAIMING ────────────────────────────────────────────────────────────────
  if (state === 'claiming') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: '#1C1917',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎁</div>
            <h2 style={{ color: 'white', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
              ¡Casi listo!
            </h2>
            <p style={{ color: '#2563EB', fontWeight: 700, fontSize: 16 }}>
              {scanResult?.tier?.prize_name}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 4 }}>
              Regístra tus datos para reclamar
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Nombre completo *</label>
              <input
                style={inputStyle}
                placeholder="Tu nombre"
                value={formData.full_name}
                onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Teléfono *</label>
              <input
                style={inputStyle}
                placeholder="Tu número de teléfono"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                onBlur={(e) => checkDailyLimit(e.target.value)}
              />
              {limitWarning && (
                <p style={{ color: '#38BDF8', fontSize: 12, marginTop: 6, background: 'rgba(56,189,248,0.1)', borderRadius: 8, padding: '6px 10px' }}>
                  ⚠️ {limitWarning}
                </p>
              )}
            </div>
            <div>
              <label style={labelStyle}>Sucursal</label>
              <input
                style={inputStyle}
                placeholder="¿En qué sucursal estás?"
                value={formData.location}
                onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 20 }}>
            <input
              id="privacy-ticket"
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              style={{ marginTop: 2, width: 16, height: 16, accentColor: '#2563EB', cursor: 'pointer', flexShrink: 0 }}
            />
            <label htmlFor="privacy-ticket" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 1.5, cursor: 'pointer' }}>
              He leído y acepto el{' '}
              <a
                href="/privacidad"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#2563EB', textDecoration: 'underline' }}
              >
                Aviso de Privacidad
              </a>{' '}
              de Burrito Bar
            </label>
          </div>

          <button
            onClick={submitClaim}
            disabled={submitting || !formData.full_name || !formData.phone || limitExceeded || !privacyAccepted}
            style={{
              ...orangeBtn,
              minHeight: btnHeight,
              fontSize: btnFontSize,
              marginTop: 16,
              opacity: (submitting || !formData.full_name || !formData.phone || limitExceeded || !privacyAccepted) ? 0.6 : 1,
              cursor: submitting ? 'wait' : (limitExceeded || !privacyAccepted) ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Guardando...' : 'Reclamar mi premio'}
          </button>
        </div>
      </div>
    );
  }

  // ── CONFIRMED (consolation) ──────────────────────────────────────────────────
  if (state === 'confirmed' && consolationFolio) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: '#1C1917',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <style>{`
          @keyframes popIn {
            0%{transform:scale(0.7);opacity:0}
            60%{transform:scale(1.05)}
            100%{transform:scale(1);opacity:1}
          }
          @keyframes confettiFall {
            0%{transform:translateY(-20px) rotate(0);opacity:1}
            100%{transform:translateY(100vh) rotate(720deg);opacity:0}
          }
        `}</style>

        {/* Food confetti */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${5 + i * 8}%`,
              top: -10,
              fontSize: 18,
              animation: `confettiFall ${2 + (i % 3) * 0.5}s ${i * 0.15}s linear forwards`,
            }}>
              {['🌮', '🍕', '🎉', '⭐', '🌟', '🎊', '🍔', '🥤'][i % 8]}
            </div>
          ))}
        </div>

        <div style={{
          width: '100%',
          maxWidth: 380,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(37,99,235,0.3)',
          borderRadius: 20,
          padding: 32,
          textAlign: 'center',
          animation: 'popIn 0.5s ease-out',
        }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🎁</div>
          <h2 style={{ color: 'white', fontSize: 22, fontWeight: 900, marginBottom: 8 }}>
            ¡Código registrado!
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 20 }}>
            Preséntalo al cajero antes de salir
          </p>

          {/* Code pill */}
          <div style={{
            background: '#0284C7',
            borderRadius: 14,
            padding: '18px 20px',
            border: '2px dashed #1E40AF',
            marginBottom: 20,
          }}>
            <p style={{ color: '#1E40AF', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              Tu código de consolación
            </p>
            <p style={{ color: '#1C1917', fontSize: 32, fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.1em', margin: 0 }}>
              {consolationFolio}
            </p>
          </div>

          <p style={{ color: '#0284C7', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            {scanResult?.consolation?.name}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 20 }}>
            {scanResult?.consolation?.description}
          </p>

          {/* WhatsApp share */}
          <button
            onClick={() => {
              const text = encodeURIComponent(`¡Gané un premio en ${restaurant.name}! 🎁 ${scanResult?.consolation?.name} — Código: ${consolationFolio}`);
              window.open(`https://wa.me/?text=${text}`, '_blank');
            }}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 12,
              background: 'rgba(37,211,102,0.15)',
              border: '1px solid rgba(37,211,102,0.3)',
              color: '#4ade80',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
              marginBottom: 12,
              minHeight: btnHeight,
            }}
          >
            📱 Compartir por WhatsApp
          </button>

          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
            ¡Gracias por ser parte de {restaurant.name}!<br />
            ¡Tu próxima visita te espera con un premio mejor!
          </p>

          {kiosk && (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 12 }}>
              Reiniciando en {kioskCountdown}...
            </p>
          )}

          <button
            onClick={resetScan}
            style={{ ...orangeBtn, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', minHeight: btnHeight, fontSize: btnFontSize }}
          >
            Escanear otro ticket
          </button>
        </div>
      </div>
    );
  }

  // ── CONFIRMED ───────────────────────────────────────────────────────────────
  if (state === 'confirmed') {
    const vip = scanResult?.tier && isVipTier(scanResult.tier.prize_name);

    function notifyCashier() {
      const waNumber = typeof window !== 'undefined' ? localStorage.getItem('admin_wa_number') : null;
      if (!waNumber) {
        alert('Configura el número del cajero en /admin/ticket-tiers');
        return;
      }
      const amount = scanResult?.amount?.toFixed(2) ?? '?';
      const prize = scanResult?.tier?.prize_name ?? '?';
      const name = formData.full_name;
      const text = encodeURIComponent(`¡Cliente VIP! Consumo: $${amount} Premio: ${prize} Nombre: ${name}`);
      window.open(`https://wa.me/${waNumber}?text=${text}`, '_blank');
    }

    return (
      <div style={{
        minHeight: '100dvh',
        background: '#1C1917',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <style>{`
          @keyframes popIn {
            0%{transform:scale(0.7);opacity:0}
            60%{transform:scale(1.05)}
            100%{transform:scale(1);opacity:1}
          }
        `}</style>

        <div style={{
          width: '100%',
          maxWidth: 380,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          padding: 32,
          textAlign: 'center',
          animation: 'popIn 0.5s ease-out',
        }}>
          {/* VIP banner */}
          {vip && (
            <div style={{
              background: 'linear-gradient(135deg, #1E40AF, #0EA5E9)',
              border: '2px solid #38BDF8',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 20,
              boxShadow: '0 0 20px rgba(56,189,248,0.3)',
            }}>
              <p style={{ color: '#fef3c7', fontWeight: 900, fontSize: 15, margin: 0 }}>
                ⭐ ¡Cliente VIP! Tu consumo te da el mejor premio
              </p>
            </div>
          )}

          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h2 style={{ color: 'white', fontSize: 24, fontWeight: 900, marginBottom: 8 }}>
            ¡Premio registrado!
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 24 }}>
            Muestra este folio al staff del restaurante
          </p>

          <div style={{
            background: '#2563EB',
            borderRadius: 14,
            padding: '20px',
            marginBottom: 24,
          }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>Folio</p>
            <p style={{ color: 'white', fontSize: 36, fontWeight: 900, letterSpacing: '0.1em' }}>{folio}</p>
          </div>

          <p style={{ color: '#38BDF8', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
            {scanResult?.tier?.prize_name}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
            {scanResult?.tier?.prize_description}
          </p>

          {/* Notify cashier button */}
          <button
            onClick={notifyCashier}
            style={{
              width: '100%',
              marginTop: 20,
              minHeight: btnHeight,
              padding: '14px',
              borderRadius: 12,
              background: 'rgba(37,211,102,0.15)',
              border: '1px solid rgba(37,211,102,0.3)',
              color: '#4ade80',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            📱 Notificar al cajero
          </button>

          {kiosk && (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 20 }}>
              Reiniciando en {kioskCountdown}...
            </p>
          )}

          <button
            onClick={() => setState('feedback')}
            style={{ ...orangeBtn, marginTop: kiosk ? 8 : 28, minHeight: btnHeight, fontSize: btnFontSize }}
          >
            Calificar experiencia
          </button>
          <button
            onClick={resetScan}
            style={{ ...orangeBtn, marginTop: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', minHeight: btnHeight, fontSize: btnFontSize }}
          >
            Escanear otro ticket
          </button>
        </div>
      </div>
    );
  }

  // ── FEEDBACK ─────────────────────────────────────────────────────────────────
  if (state === 'feedback') {
    async function submitFeedback() {
      if (feedbackStars === 0) return;
      setFeedbackSubmitting(true);
      try {
        await fetch('/api/ticket-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stars: feedbackStars,
            comment: feedbackComment || null,
            restaurant_id: restaurant.id,
            ticket_claim_id: lastClaimId,
          }),
        });
      } catch {
        // non-blocking
      } finally {
        setFeedbackSubmitting(false);
        setState('farewell');
      }
    }

    return (
      <div style={{
        minHeight: '100dvh',
        background: '#1C1917',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
          <h2 style={{ color: 'white', fontSize: 22, fontWeight: 900, marginBottom: 8 }}>
            ¿Cómo fue tu experiencia hoy?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 28 }}>
            Tu opinión nos ayuda a mejorar
          </p>

          {/* Stars */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 28 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setFeedbackStars(star)}
                onMouseEnter={() => setFeedbackHover(star)}
                onMouseLeave={() => setFeedbackHover(0)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 44,
                  lineHeight: 1,
                  transition: 'transform 0.1s',
                  transform: (feedbackHover || feedbackStars) >= star ? 'scale(1.2)' : 'scale(1)',
                  filter: (feedbackHover || feedbackStars) >= star ? 'none' : 'grayscale(1) opacity(0.4)',
                  padding: 0,
                }}
              >
                ⭐
              </button>
            ))}
          </div>

          {/* Comment */}
          <textarea
            placeholder="Cuéntanos más (opcional)"
            value={feedbackComment}
            onChange={(e) => setFeedbackComment(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'white',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
              resize: 'none',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              marginBottom: 20,
            }}
          />

          <button
            onClick={submitFeedback}
            disabled={feedbackStars === 0 || feedbackSubmitting}
            style={{
              ...orangeBtn,
              minHeight: btnHeight,
              fontSize: btnFontSize,
              opacity: feedbackStars === 0 ? 0.5 : 1,
              cursor: feedbackStars === 0 ? 'not-allowed' : 'pointer',
              marginBottom: 12,
            }}
          >
            {feedbackSubmitting ? 'Enviando...' : 'Enviar'}
          </button>

          <button
            onClick={() => setState('farewell')}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 14,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '8px',
            }}
          >
            Omitir
          </button>
        </div>
      </div>
    );
  }

  // ── FAREWELL ──────────────────────────────────────────────────────────────────
  if (state === 'farewell') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: '#1C1917',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textAlign: 'center',
      }}>
        <style>{`
          @keyframes heartbeat {
            0%,100%{transform:scale(1)}
            25%{transform:scale(1.15)}
            50%{transform:scale(1)}
            75%{transform:scale(1.1)}
          }
        `}</style>
        <div style={{ fontSize: 72, animation: 'heartbeat 1.5s ease-in-out infinite', marginBottom: 24 }}>🧡</div>
        <h2 style={{ color: 'white', fontSize: 26, fontWeight: 900, marginBottom: 12 }}>
          ¡Gracias! Tu opinión nos ayuda a mejorar 🧡
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>
          ¡Hasta pronto!
        </p>
      </div>
    );
  }

  return null;
}

const orangeBtn: React.CSSProperties = {
  width: '100%',
  padding: '16px',
  borderRadius: 14,
  background: '#2563EB',
  color: 'white',
  fontWeight: 800,
  fontSize: 17,
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'rgba(255,255,255,0.6)',
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: 'white',
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
};
