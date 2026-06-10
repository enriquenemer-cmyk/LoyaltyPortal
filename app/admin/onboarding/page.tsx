'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const brand = '#2563EB';
const cardShadow = '0 1px 2px rgba(28,25,23,0.04), 0 4px 16px rgba(28,25,23,0.06)';

function BurritoIllustration() {
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Plate */}
      <ellipse cx="80" cy="130" rx="60" ry="14" fill="#FDE8E0" />
      {/* Burrito body */}
      <rect x="30" y="72" width="100" height="50" rx="25" fill="#2563EB" />
      {/* Burrito wrap lines */}
      <path d="M50 72 Q80 60 110 72" stroke="#C94010" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M38 95 Q80 88 122 95" stroke="#C94010" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Filling peek */}
      <ellipse cx="80" cy="72" rx="30" ry="10" fill="#0891B2" />
      <ellipse cx="80" cy="72" rx="20" ry="7" fill="#FDE68A" />
      <circle cx="70" cy="72" r="4" fill="#4ADE80" />
      <circle cx="80" cy="70" r="4" fill="#F87171" />
      <circle cx="90" cy="72" r="4" fill="#4ADE80" />
      {/* Prize star */}
      <circle cx="120" cy="38" r="22" fill="#FEF3C7" />
      <circle cx="120" cy="38" r="18" fill="#F59E0B" />
      <path d="M120 22 L123.5 33 L135 33 L125.5 40.5 L129 51.5 L120 44.5 L111 51.5 L114.5 40.5 L105 33 L116.5 33 Z" fill="#FFF" />
      {/* Sparkles */}
      <circle cx="40" cy="35" r="4" fill="#FB923C" opacity="0.6" />
      <circle cx="28" cy="55" r="3" fill="#2563EB" opacity="0.4" />
      <circle cx="145" cy="68" r="3.5" fill="#F59E0B" opacity="0.5" />
      <path d="M52 28 L54 24 L56 28 L60 30 L56 32 L54 36 L52 32 L48 30 Z" fill="#2563EB" opacity="0.5" />
    </svg>
  );
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? 28 : 8,
            height: 8,
            backgroundColor: i <= current ? brand : '#E8E3DC',
          }}
        />
      ))}
    </div>
  );
}

function Step1({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <BurritoIllustration />
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-black text-[#1C1917]">Bienvenido a SuperTierra</h1>
        <p className="text-base text-[#78716c] max-w-sm mx-auto">
          La plataforma de premios y fidelidad para Tierra Burrito. Genera QRs de premio, gestiona restaurantes y haz seguimiento de cobros en tiempo real.
        </p>
      </div>
      <ul className="text-left flex flex-col gap-3 w-full max-w-sm">
        {[
          { icon: '🏪', text: 'Administra tus restaurantes y sucursales' },
          { icon: '🎁', text: 'Genera premios con QR únicos para tus clientes' },
          { icon: '📊', text: 'Monitorea cobros y métricas en el dashboard' },
        ].map(({ icon, text }) => (
          <li key={text} className="flex items-center gap-3 text-sm text-[#57534e]">
            <span className="text-xl shrink-0">{icon}</span>
            {text}
          </li>
        ))}
      </ul>
      <button
        onClick={onNext}
        className="w-full max-w-sm py-3 rounded-xl text-white font-bold text-base transition-opacity hover:opacity-90"
        style={{ backgroundColor: brand }}
      >
        Comenzar →
      </button>
    </div>
  );
}

function Step2({ onNext }: { onNext: () => void }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('El nombre es requerido.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), address: address.trim(), phone: phone.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al crear restaurante');
      }
      setDone(true);
      setTimeout(() => onNext(), 1400);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full rounded-xl border border-[#E8E3DC] bg-white px-4 py-2.5 text-sm text-[#1C1917] placeholder:text-[#a8a29e] outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-black text-[#1C1917]">Crea tu primer restaurante</h2>
        <p className="text-sm text-[#78716c] mt-1">Agrega la información básica de tu sucursal principal.</p>
      </div>

      {done ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-2xl">✓</div>
          <p className="font-bold text-emerald-700 text-lg">Restaurante creado</p>
          <p className="text-sm text-[#78716c]">Continuando al siguiente paso…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#78716c] uppercase tracking-wide">Nombre *</label>
            <input
              className={inputCls}
              placeholder="ej. Tierra Burrito Centro"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#78716c] uppercase tracking-wide">Dirección</label>
            <input
              className={inputCls}
              placeholder="ej. Av. Revolución 123, Col. Centro"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#78716c] uppercase tracking-wide">Teléfono</label>
            <input
              className={inputCls}
              placeholder="ej. 55 1234 5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
              type="tel"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 font-semibold bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-3 rounded-xl text-white font-bold text-base transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: brand }}
          >
            {loading ? 'Creando…' : 'Crear restaurante →'}
          </button>
        </form>
      )}
    </div>
  );
}

function Step3({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-black text-[#1C1917]">Genera tu primer premio</h2>
        <p className="text-sm text-[#78716c] mt-1">
          Crea un QR de premio personalizado para repartir a tus clientes.
        </p>
      </div>

      <div
        className="rounded-2xl border border-[#E8E3DC] bg-[#FAFAF9] p-6 flex flex-col gap-4"
        style={{ boxShadow: cardShadow }}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#fde8e0' }}>
            <svg width="24" height="24" fill="none" stroke={brand} strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-[#1C1917]">Generador de premios</p>
            <p className="text-xs text-[#a8a29e] mt-0.5">Elige nombre, fecha de vencimiento y restaurante</p>
          </div>
        </div>

        <ul className="flex flex-col gap-2 text-sm text-[#57534e]">
          {[
            'Nombre del premio (ej. "Burrito gratis")',
            'Restaurante donde se puede canjear',
            'Fecha de inicio y fin',
            'El sistema genera un QR descargable',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-[#2563EB] font-bold shrink-0">{i + 1}.</span>
              {item}
            </li>
          ))}
        </ul>

        <Link
          href="/admin/generate"
          onClick={onFinish}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-base transition-opacity hover:opacity-90"
          style={{ backgroundColor: brand }}
        >
          Ir a generar premio →
        </Link>
      </div>

      <button
        onClick={onFinish}
        className="text-sm font-semibold text-[#a8a29e] hover:text-[#78716c] transition-colors text-center"
      >
        Saltar por ahora — ir al panel
      </button>
    </div>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const router = useRouter();

  function finishOnboarding() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding_complete', 'true');
    }
    router.push('/admin');
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center p-6">
      <div
        className="bg-white rounded-3xl border border-[#E8E3DC] p-8 w-full max-w-md"
        style={{ boxShadow: '0 8px 40px rgba(28,25,23,0.1)' }}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: brand }}>
              <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <span className="text-sm font-bold text-[#1C1917]">SuperTierra</span>
          </div>
          <StepIndicator current={step} total={3} />
        </div>

        {step === 0 && <Step1 onNext={() => setStep(1)} />}
        {step === 1 && <Step2 onNext={() => setStep(2)} />}
        {step === 2 && <Step3 onFinish={finishOnboarding} />}
      </div>
    </div>
  );
}
