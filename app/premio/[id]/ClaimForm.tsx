'use client';
import { SparklesIcon } from '@heroicons/react/24/outline';

import { useState, useEffect } from 'react';

type Props = { prizeId: string; prizeName: string };

const inp = [
  'w-full bg-white border border-[#E8E3DC] rounded-xl px-4 py-3.5',
  'text-sm text-[#1C1917] placeholder-[#a8a29e]',
  'focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]',
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

  const [caption, setCaption] = useState<string | null>(null);
  const [captionLoading, setCaptionLoading] = useState(false);
  const [captionError, setCaptionError] = useState('');
  const [captionCopied, setCaptionCopied] = useState(false);

  async function generateCaption() {
    setCaptionLoading(true);
    setCaptionError('');
    try {
      const res = await fetch('/api/ai/share-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prize_name: prizeName, restaurant_name: '3E' }),
      });
      const data = await res.json();
      if (!res.ok || !data.caption) {
        setCaptionError(data.error || 'No se pudo generar el mensaje, intenta de nuevo');
        return;
      }
      setCaption(data.caption);
    } catch {
      setCaptionError('No se pudo generar el mensaje, intenta de nuevo');
    } finally {
      setCaptionLoading(false);
    }
  }

  async function copyCaption() {
    if (!caption) return;
    try {
      await navigator.clipboard.writeText(caption);
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 2000);
    } catch {
      // ignore
    }
  }

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

  // ── SUCCESS: QR card ──────────────────────────────────────────────────────
  if (claimId) {
    const folio = claimId.slice(-8).toUpperCase();
    const waPhone = form.phone.replace(/\D/g, '');
    const cajeroUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/cajero/${claimId}`
      : '';
    const waMsg = ` Mi premio en 3E\n\nPremio: ${prizeName}\nFolio: #${folio}\n\n${cajeroUrl}`;

    return (
      <div className="text-center space-y-5">

        {/* Título */}
        <div>
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: 'linear-gradient(135deg,#2563EB,#0891B2)', boxShadow: '0 8px 24px rgba(37,99,235,0.35)' }}>
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-extrabold text-[#1C1917] mb-1">¡Listo! Muestra este QR</h3>
          <p className="text-[#78716c] text-sm">Premio: <strong className="text-[#1C1917]">{prizeName}</strong></p>
          <p className="text-[#a8a29e] text-xs mt-0.5 font-mono">#{folio}</p>
        </div>

        {/* QR grande y centrado */}
        <div className="flex justify-center">
          <div className="p-4 rounded-3xl bg-white"
            style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.12)', border: '2px solid #E8E3DC' }}>
            {qrDataUrl
              ? <img src={qrDataUrl} alt="QR de cobro" style={{ display: 'block', width: 220, height: 220, borderRadius: 12 }} />
              : (
                <div className="w-[220px] h-[220px] flex items-center justify-center">
                  <svg className="animate-spin w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              )
            }
          </div>
        </div>

        {/* Botones */}
        {qrDataUrl && (
          <div className="space-y-3">
            {/* WhatsApp */}
            <a
              href={`https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-3 font-bold py-4 rounded-2xl text-white text-sm"
              style={{ background: '#25D366', boxShadow: '0 6px 20px rgba(37,211,102,0.35)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Guardar en WhatsApp
            </a>

            {/* Share/Download */}
            <button
              onClick={async () => {
                try {
                  const blob = await (await fetch(qrDataUrl)).blob();
                  const file = new File([blob], 'mi-premio.png', { type: 'image/png' });
                  if (navigator.canShare?.({ files: [file] })) {
                    await navigator.share({ files: [file], title: 'Premio: ' + prizeName, text: '¡Gané un premio en 3E!' });
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
              Compartir / Guardar imagen
            </button>
          </div>
        )}

        {/* AI share caption */}
        <div className="text-left bg-white rounded-2xl p-4" style={{ border: '1px solid #E8E3DC' }}>
          {!caption ? (
            <button
              onClick={generateCaption}
              disabled={captionLoading}
              className="w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl text-sm border border-[#E8E3DC] bg-white text-[#1C1917] hover:bg-[#FAFAF9] transition-colors disabled:opacity-60"
            >
              {captionLoading ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <span><SparklesIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span>
              )}
              {captionLoading ? 'Generando...' : 'Generar caption para compartir'}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-bold text-[#78716c] uppercase tracking-widest">Tu caption</p>
              <p className="text-sm text-[#1C1917] bg-[#FAFAF9] border border-[#E8E3DC] rounded-xl px-4 py-3">{caption}</p>
              <button
                onClick={copyCaption}
                className="w-full font-bold py-2.5 rounded-xl text-sm border border-[#E8E3DC] bg-white text-[#1C1917] hover:bg-[#FAFAF9] transition-colors"
              >
                {captionCopied ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
          )}
          {captionError && <p className="text-xs text-red-500 mt-2">{captionError}</p>}
        </div>

        <p className="text-[#a8a29e] text-xs">3E · Plataforma de Premios</p>
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
          className="mt-0.5 shrink-0 cursor-pointer accent-[#2563EB]"
          style={{ width: 16, height: 16 }}
        />
        <label htmlFor="privacy-cb" className="text-xs text-[#78716c] leading-snug cursor-pointer select-none">
          Acepto el{' '}
          <a href="/privacidad" target="_blank" rel="noopener noreferrer"
            className="text-[#2563EB] hover:underline font-semibold">
            Aviso de Privacidad
          </a>{' '}
          de 3E
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
            : 'linear-gradient(135deg,#2563EB,#0891B2)',
          boxShadow: (loading || !privacyAccepted) ? 'none' : '0 8px 24px rgba(37,99,235,0.35)',
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
