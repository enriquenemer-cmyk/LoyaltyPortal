'use client';

import { useState, useEffect } from 'react';

type Props = { prizeId: string; prizeName: string };

const inp = [
  'w-full bg-white border border-[#E8E3DC] rounded-xl px-4 py-3.5',
  'text-sm text-[#1C1917] placeholder-[#a8a29e]',
  'focus:outline-none focus:ring-2 focus:ring-[#E8521A]/20 focus:border-[#E8521A]',
  'transition-all',
].join(' ');

const labelCls = 'block text-[10px] font-bold text-[#78716c] uppercase tracking-widest mb-1.5';

export default function ClaimForm({ prizeId, prizeName }: Props) {
  const [form, setForm] = useState({ full_name: '', phone: '', email: '' });
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [claimId, setClaimId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showParticles, setShowParticles] = useState(false);

  // Basic: at least 7 digits
  const phoneValid = form.phone.replace(/\D/g, '').length >= 7;
  const phoneError = phoneTouched && form.phone.length > 0 && !phoneValid;
  const phoneOk = phoneTouched && phoneValid;

  // Generate cashier QR once we have a claimId
  useEffect(() => {
    if (!claimId) return;
    import('qrcode').then(QR => {
      QR.toDataURL(`${window.location.origin}/cajero/${claimId}`, {
        width: 300, margin: 2,
        color: { dark: '#1c0a00', light: '#ffffff' },
      }).then(setQrDataUrl);
    });
  }, [claimId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prize_id: prizeId,
          full_name: form.full_name,
          phone: form.phone,
          email: form.email,
          location: '',
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al registrar.'); return; }
      setClaimId(data.claim.id);
      setShowParticles(true);
      setTimeout(() => setShowParticles(false), 900);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  // ── SUCCESS: boarding pass ──────────────────────────────────────────────────
  if (claimId) {
    const folio = claimId.slice(-8).toUpperCase();
    const cajeroUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/cajero/${claimId}`
      : '';
    const waPhone = form.phone.replace(/\D/g, '');
    const waMsg = `🎁 Tu premio en Tierra Burrito Bar está listo!\n\nPremio: ${prizeName}\nFolio: #${folio}\n\nMuestra este mensaje al cajero:\n${cajeroUrl}`;

    const PARTICLE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
    const PARTICLE_COLORS = ['#E8521A', '#F59E0B', '#FBBF24', '#F97316', '#EF4444', '#FB923C', '#FCD34D', '#E8521A'];

    return (
      <div style={{ position: 'relative' }}>
        {/* Burst particles */}
        {showParticles && (
          <div className="particles-container">
            {PARTICLE_ANGLES.map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const dist = 60 + (i % 3) * 20;
              return (
                <span
                  key={i}
                  className="particle"
                  style={{
                    background: PARTICLE_COLORS[i],
                    '--px': `${Math.round(Math.cos(rad) * dist)}px`,
                    '--py': `${Math.round(Math.sin(rad) * dist)}px`,
                    width: 8 + (i % 3) * 3,
                    height: 8 + (i % 3) * 3,
                    animationDelay: `${i * 30}ms`,
                  } as React.CSSProperties}
                />
              );
            })}
          </div>
        )}

        {/* Check icon + title */}
        <div className="text-center mb-6 spring-in">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: 'linear-gradient(135deg,#E8521A,#C2410C)', boxShadow: '0 8px 24px rgba(232,82,26,0.35)' }}
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-extrabold text-[#1C1917] mb-1">¡Registro exitoso!</h3>
          <p className="text-[#78716c] text-sm">Muestra este pase al cajero para cobrar tu premio</p>
        </div>

        {/* Boarding pass */}
        <div
          className="rounded-2xl overflow-hidden mb-5"
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.13), 0 0 0 1px rgba(232,82,26,0.12)' }}
        >
          {/* Header */}
          <div
            className="relative overflow-hidden px-5 pt-4 pb-5"
            style={{ background: 'linear-gradient(135deg,#E8521A 0%,#C2410C 100%)' }}
          >
            <div aria-hidden className="absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '200px' }} />
            <div className="relative flex items-start justify-between">
              <div className="flex-1 pr-4">
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Tierra Burrito Bar</p>
                <p className="text-white font-black text-xl leading-tight">{prizeName}</p>
              </div>
              <span aria-hidden className="text-white/20 font-black text-xs tracking-[0.15em] uppercase mt-1"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.18em' }}>
                PREMIO
              </span>
            </div>
          </div>

          {/* Perforation */}
          <div className="flex items-center bg-white">
            <div className="w-5 h-5 rounded-full shrink-0 -ml-2.5" style={{ background: '#F9FAFB', border: '1px solid #E8E3DC' }} />
            <div className="flex-1 border-t-[1.5px] border-dashed border-[#E8E3DC] mx-1" />
            <div className="w-5 h-5 rounded-full shrink-0 -mr-2.5" style={{ background: '#F9FAFB', border: '1px solid #E8E3DC' }} />
          </div>

          {/* Body: info + QR */}
          <div className="bg-white px-5 pt-4 pb-3">
            <div className="flex gap-4 items-stretch">
              {/* Info */}
              <div className="flex-1 flex flex-col gap-3 justify-center">
                {[
                  { label: 'Titular', value: form.full_name },
                  { label: 'Teléfono', value: form.phone },
                  { label: 'Folio', value: '#' + folio, mono: true },
                ].map(({ label, value, mono }) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#a8a29e] mb-0.5">{label}</p>
                    <p className={`text-sm font-semibold text-[#1C1917] leading-tight truncate ${mono ? 'font-mono tracking-wider' : ''}`}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Vertical dashed divider */}
              <div style={{ borderLeft: '1.5px dashed #E8E3DC' }} />

              {/* QR */}
              <div className="shrink-0 flex flex-col items-center justify-center gap-1.5">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#a8a29e]">Escanear en caja</p>
                <div className="p-2 rounded-xl" style={{ border: '2px solid #FED7AA', background: '#FFF7ED' }}>
                  {qrDataUrl
                    ? <img src={qrDataUrl} alt="QR de cobro" style={{ borderRadius: 8, display: 'block', width: 120, height: 120 }} />
                    : (
                      <div className="w-[120px] h-[120px] flex items-center justify-center">
                        <svg className="animate-spin w-7 h-7 text-orange-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      </div>
                    )
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Second perforation */}
          <div className="flex items-center bg-white">
            <div className="w-4 h-4 rounded-full shrink-0 -ml-2" style={{ background: '#F9FAFB', border: '1px solid #E8E3DC' }} />
            <div className="flex-1 border-t border-dashed border-[#E8E3DC] mx-1" />
            <div className="w-4 h-4 rounded-full shrink-0 -mr-2" style={{ background: '#F9FAFB', border: '1px solid #E8E3DC' }} />
          </div>

          {/* Footer */}
          <div className="bg-white rounded-b-2xl px-5 py-3 flex items-center justify-between">
            <p className="text-[#a8a29e] text-[10px] font-mono tracking-wider">ÚNICO · NO TRANSFERIBLE · UNA SOLA VEZ</p>
            <p className="text-[#E8521A] text-[10px] font-bold uppercase tracking-wide ml-2 shrink-0">Tierra Burrito Bar</p>
          </div>
        </div>

        {/* Tip */}
        <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 mb-4">
          <span className="text-xl shrink-0">💡</span>
          <p className="text-orange-700 text-sm font-medium">
            <strong>Toma captura</strong> de este pase o guárdalo en WhatsApp. El cajero lo escaneará al llegar.
          </p>
        </div>

        {/* WhatsApp button */}
        {qrDataUrl && (
          <a
            href={`https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-3 font-black py-4 rounded-2xl text-white text-base mb-3"
            style={{ background: '#25D366', boxShadow: '0 8px 24px rgba(37,211,102,0.35)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Guardar en WhatsApp
          </a>
        )}

        {/* Share / download */}
        {qrDataUrl && (
          <button
            onClick={async () => {
              try {
                const blob = await (await fetch(qrDataUrl)).blob();
                const file = new File([blob], 'mi-premio.png', { type: 'image/png' });
                if (navigator.canShare?.({ files: [file] })) {
                  await navigator.share({ files: [file], title: 'Premio: ' + prizeName, text: '¡Gané un premio en Tierra Burrito Bar!' });
                } else {
                  const a = document.createElement('a');
                  a.href = qrDataUrl; a.download = 'mi-premio.png'; a.click();
                }
              } catch { /* cancelado */ }
            }}
            className="w-full flex items-center justify-center gap-2 font-bold py-3.5 rounded-2xl text-sm border border-[#E8E3DC] bg-white text-[#1C1917] hover:bg-[#FAFAF9] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Compartir / Descargar
          </button>
        )}

        <p className="text-center text-[#a8a29e] text-xs mt-5">Tierra Burrito Bar · Plataforma de Premios</p>
      </div>
    );
  }

  // ── FORM ───────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Nombre */}
      <div>
        <label className={labelCls}>Nombre completo</label>
        <input
          name="full_name" type="text" value={form.full_name} required
          placeholder="Ej: Juan García López"
          onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
          className={inp}
        />
      </div>

      {/* Teléfono */}
      <div>
        <label className={labelCls}>Celular</label>
        <div className="relative flex items-center">
          <input
            name="phone" type="tel" value={form.phone} required
            placeholder="Ej: +34 612 345 678"
            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            onBlur={() => setPhoneTouched(true)}
            className={inp + ' pr-10 ' + (phoneError ? 'border-red-400 focus:border-red-400' : phoneOk ? 'border-green-400 focus:border-green-400' : '')}
          />
          {phoneOk && (
            <span className="absolute right-3 text-green-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            </span>
          )}
          {phoneError && (
            <span className="absolute right-3 text-red-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </span>
          )}
        </div>
        {phoneError && <p className="text-xs text-red-500 mt-1">Introduce un número de teléfono válido</p>}
      </div>

      {/* Email */}
      <div>
        <label className={labelCls}>Correo electrónico</label>
        <input
          name="email" type="email" value={form.email} required
          placeholder="Ej: juan@correo.com"
          onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
          className={inp}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm flex gap-2 items-center">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Privacy */}
      <div className="flex items-start gap-2.5">
        <input
          id="privacy-cb" type="checkbox" required checked={privacyAccepted}
          onChange={e => setPrivacyAccepted(e.target.checked)}
          className="mt-0.5 shrink-0 cursor-pointer accent-[#E8521A]"
          style={{ width: 16, height: 16 }}
        />
        <label htmlFor="privacy-cb" className="text-xs text-[#78716c] leading-snug cursor-pointer select-none">
          Acepto el{' '}
          <a href="/privacidad" target="_blank" rel="noopener noreferrer"
            className="text-[#E8521A] hover:underline font-semibold">
            Aviso de Privacidad
          </a>{' '}
          de Tierra Burrito Bar
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !privacyAccepted}
        className="w-full font-extrabold py-4 rounded-xl text-white text-base flex items-center justify-center gap-2 transition-all disabled:opacity-60"
        style={{
          background: (loading || !privacyAccepted)
            ? '#FED7AA'
            : 'linear-gradient(135deg,#E8521A,#C2410C)',
          boxShadow: (loading || !privacyAccepted) ? 'none' : '0 8px 24px rgba(232,82,26,0.35)',
        }}
      >
        {loading
          ? <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Registrando...
            </>
          : <>
              Reclamar mi premio
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
        }
      </button>

      <p className="text-center text-[#a8a29e] text-xs">
        Tus datos son privados y solo se usan para verificar la entrega
      </p>
    </form>
  );
}
