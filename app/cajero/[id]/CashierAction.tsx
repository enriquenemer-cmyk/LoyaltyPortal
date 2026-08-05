'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NPSSurvey from './NPSSurvey';

async function sendInternalMessage(
  phone: string,
  prizeName: string,
  claimId: string
): Promise<boolean> {
  const folio = claimId.slice(-8).toUpperCase();
  try {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_phone: phone,
        subject: `Tu premio ${prizeName} fue entregado`,
        body: `Tu premio ${prizeName} fue entregado exitosamente. ¡Gracias por visitarnos! Folio: #${folio}`,
        claim_id: claimId,
        from_role: 'cajero',
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

type Props = {
  claimId: string;
  prizeName: string;
  defaultCajero?: string;
  phone: string;
  fullName: string;
  isExpired?: boolean;
  googleMapsUrl?: string | null;
};

export default function CashierAction({ claimId, prizeName, defaultCajero = '', phone, fullName, isExpired = false, googleMapsUrl }: Props) {
  const router = useRouter();
  const [name, setName] = useState(defaultCajero);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showNPS, setShowNPS] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [messageSent, setMessageSent] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  // Confirmation guard: first tap arms it, second tap fires
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!done) return;
    if (countdown <= 0) {
      router.push('/cajero');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [done, countdown, router]);

  const googleMapsLink = googleMapsUrl || `https://www.google.com/maps/search/Burrito+Bar`;
  const feedbackText = googleMapsUrl
    ? `Hola ${fullName}, esperamos que hayas disfrutado tu premio. ¿Nos dejas una reseña en Google Maps? Tu opinión nos ayuda mucho. 🧡 ${googleMapsLink}`
    : `Hola ${fullName}, esperamos que hayas disfrutado tu premio. ¿Nos dejas una reseña? 🧡 ${googleMapsLink}`;
  const digits = phone.replace(/\D/g, '');
  const waPhone = digits.startsWith('34') ? digits : `34${digits}`;
  const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(feedbackText)}`;

  async function handleDeliver() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivered_by: name.trim() || 'Cajero' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al confirmar.'); return; }
      setDone(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      setCountdown(3);
    } catch {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(feedbackText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for environments without clipboard API
    }
  }

  if (done) {
    return (
      <div className="text-center py-4 space-y-6">
        {showConfetti && (
          <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:999, overflow:'hidden' }}>
            <style>{`@keyframes cfFall { from { transform: translateY(-20px) rotate(0deg); opacity:1; } to { transform: translateY(110vh) rotate(720deg); opacity:0; } }`}</style>
            {['#2563EB','#38BDF8','#f9a8d4','#818cf8','#34d399','#2563EB','#38BDF8','#f9a8d4','#818cf8','#34d399','#2563EB','#38BDF8','#f9a8d4','#818cf8','#34d399','#2563EB'].map((c,i) => (
              <div key={i} style={{ position:'absolute', left:`${6 + i*6}%`, top:-16, width: i%2===0?10:7, height: i%2===0?10:7, borderRadius: i%3===0?'50%':3, background:c, opacity:0.9, animation:`cfFall ${2.2 + (i%4)*0.3}s ${i*0.12}s ease-in forwards` }} />
            ))}
          </div>
        )}
        <div>
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: 'linear-gradient(135deg,#059669,#047857)', boxShadow: '0 12px 36px rgba(5,150,105,0.45)' }}
          >
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-black text-[#1C1917] mb-2">¡Premio Entregado! 🎉</h3>
          <p className="text-stone-500 text-sm">
            Entrega de <strong className="text-[#1C1917]">{prizeName}</strong> registrada exitosamente.
          </p>
        </div>

        {/* WhatsApp self-send for client backup */}
        {(() => {
          const rawDigits = phone.replace(/\D/g, '');
          const waPhoneSelf = rawDigits.startsWith('34') ? rawDigits : `34${rawDigits}`;
          const folio = claimId.slice(-8).toUpperCase();
          const cajeroUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/cajero/${claimId}`;
          const selfMsg = `🎁 Tu premio en 3E está listo!\n\nPremio: ${prizeName}\nFolio: #${folio}\n\nMuestra este mensaje al cajero cuando llegues:\n${cajeroUrl}`;
          const waSelfUrl = `https://wa.me/${waPhoneSelf}?text=${encodeURIComponent(selfMsg)}`;
          return (
            <a
              href={waSelfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl text-white text-sm w-full"
              style={{ background: '#25D366', boxShadow: '0 4px 16px rgba(37,211,102,0.35)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Enviarle el QR por WhatsApp al cliente
            </a>
          );
        })()}

        {/* Auto-redirect countdown */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 space-y-3">
          <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-1.5 rounded-full bg-[#2563EB] transition-all duration-1000"
              style={{ width: `${(countdown / 3) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-stone-500 text-sm">
              Volviendo al escáner en <strong className="text-[#1C1917]">{countdown}...</strong>
            </p>
            <button
              onClick={() => router.push('/cajero')}
              className="text-sm font-bold text-[#2563EB] hover:underline"
            >
              Volver ahora →
            </button>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 text-left space-y-4">
          <p className="text-stone-600 text-sm font-semibold">Mensaje al cliente</p>
          <p className="text-stone-500 text-xs leading-relaxed bg-stone-50 rounded-xl p-3 border border-stone-200">
            {`Tu premio ${prizeName} fue entregado exitosamente. ¡Gracias por visitarnos! Folio: #${claimId.slice(-8).toUpperCase()}`}
          </p>
          <button
            disabled={sendingMessage || messageSent}
            onClick={async () => {
              setSendingMessage(true);
              const ok = await sendInternalMessage(phone, prizeName, claimId);
              setSendingMessage(false);
              if (ok) setMessageSent(true);
            }}
            className="w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl text-sm transition-all disabled:opacity-60"
            style={{
              background: messageSent
                ? 'linear-gradient(135deg,#059669,#047857)'
                : 'linear-gradient(135deg,#2563EB,#0891B2)',
              color: '#fff',
              boxShadow: messageSent
                ? '0 4px 16px rgba(5,150,105,0.30)'
                : '0 4px 16px rgba(37,99,235,0.30)',
            }}
          >
            {messageSent ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Mensaje enviado
              </>
            ) : sendingMessage ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Enviando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Enviar mensaje al cliente
              </>
            )}
          </button>
        </div>

        {googleMapsUrl && (
          <div className="bg-white border border-blue-200 rounded-2xl p-5 text-left space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#4285F4' }}>
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
              <div>
                <p className="text-[#1C1917] text-sm font-bold leading-tight">Reseña en Google Maps</p>
                <p className="text-stone-500 text-xs">Pide al cliente que deje una reseña</p>
              </div>
            </div>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full font-bold py-3 rounded-xl text-sm text-white transition-all"
              style={{ background: 'linear-gradient(135deg,#4285F4,#1a73e8)', boxShadow: '0 4px 12px rgba(66,133,244,0.35)' }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
              Pedir resena en Google Maps
            </a>
          </div>
        )}

        {showNPS && (
          <NPSSurvey claimId={claimId} onSkip={() => setShowNPS(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Cajero name input */}
      <div>
        <label className="block text-[#1C1917] text-sm font-bold mb-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Tu nombre (cajero que entrega)
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Carlos Méndez"
          className="w-full bg-[#FAFAF9] border border-[#E8E3DC] rounded-xl px-4 py-3.5 text-[#1C1917] placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-green-500 focus:bg-white transition-all"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {isExpired && (
        <div className="bg-blue-50 border border-blue-300 rounded-xl px-4 py-3.5 flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-blue-800 text-sm font-semibold leading-snug">
            El cliente tardó más de 2 horas. ¿Entregar de todas formas?
          </p>
        </div>
      )}

      {/* Two-step CANJEAR button */}
      {!armed ? (
        /* Step 1 — arm */
        <button
          onClick={() => setArmed(true)}
          disabled={loading}
          className="w-full disabled:opacity-50 text-white font-black py-6 rounded-2xl transition-all text-xl tracking-wide"
          style={{
            background: isExpired
              ? 'linear-gradient(135deg,#0EA5E9,#1D4ED8)'
              : 'linear-gradient(135deg,#2563EB,#0891B2)',
            boxShadow: isExpired
              ? '0 12px 36px rgba(217,119,6,0.45)'
              : '0 12px 36px rgba(37,99,235,0.50)',
            letterSpacing: '-0.01em',
          }}
        >
          <span className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 bg-white/25 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4h.01M8 8h.01M16 8h.01M4 12h.01M20 12h.01M8 16h.01M16 16h.01M12 20h.01M4 4h4v4H4zm12 0h4v4h-4zM4 16h4v4H4zm12 0h4v4h-4z" />
              </svg>
            </div>
            {isExpired ? 'Canjear Premio (Vencido)' : 'Canjear Premio'}
          </span>
        </button>
      ) : (
        /* Step 2 — confirm or cancel */
        <div className="rounded-2xl border-2 border-green-500 bg-green-50 p-4 space-y-3">
          <p className="text-green-800 font-bold text-sm text-center">
            ¿Confirmas que el cliente está presente y recibirá el premio ahora?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setArmed(false)}
              disabled={loading}
              className="flex-1 font-bold py-3.5 rounded-xl border border-[#E8E3DC] bg-white text-stone-600 text-sm hover:bg-stone-50 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeliver}
              disabled={loading}
              className="flex-1 font-black py-3.5 rounded-xl text-white text-sm transition-all disabled:opacity-50"
              style={{
                background: loading ? '#6b7280' : 'linear-gradient(135deg,#059669,#047857)',
                boxShadow: loading ? 'none' : '0 8px 24px rgba(5,150,105,0.45)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Canjeando...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  Sí, Canjear
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 text-stone-400 text-xs">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        El QR se invalida al canjear — acción irreversible
      </div>
    </div>
  );
}
