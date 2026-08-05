'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf: number;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    const count = 55;
    const dots = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      o: Math.random() * 0.5 + 0.15,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = canvas.width;
        if (d.x > canvas.width) d.x = 0;
        if (d.y < 0) d.y = canvas.height;
        if (d.y > canvas.height) d.y = 0;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${d.o})`;
        ctx.fill();
      }
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(255,255,255,${0.12 * (1 - dist / 90)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, password: form.password, rememberMe }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Credenciales inválidas.'); return; }
      router.push('/admin/generate');
      router.refresh();
    } catch {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* LEFT COLUMN — orange brand side, hidden on mobile */}
      <div
        className="hidden md:flex md:w-[40%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg,#0a2218 0%,#1a6b3c 60%,#0a2218 100%)' }}
      >
        {/* Animated particles */}
        <Particles />

        {/* Decorative circles */}
        <div
          className="absolute pointer-events-none rounded-full"
          style={{ width: 384, height: 384, background: 'rgba(255,255,255,0.05)', bottom: -80, right: -80 }}
        />
        <div
          className="absolute pointer-events-none rounded-full"
          style={{ width: 256, height: 256, background: 'rgba(255,255,255,0.05)', top: -60, left: -60 }}
        />

        {/* Decorative geometric pattern — abstract QR/rewards motif */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 400 800"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          {/* Rounded squares suggesting QR modules */}
          <rect x="40" y="90" width="46" height="46" rx="10" fill="rgba(255,255,255,0.06)" />
          <rect x="100" y="90" width="46" height="46" rx="10" fill="rgba(255,255,255,0.04)" />
          <rect x="40" y="150" width="46" height="46" rx="10" fill="rgba(255,255,255,0.04)" />
          <rect x="290" y="120" width="60" height="60" rx="14" fill="rgba(255,255,255,0.05)" />
          {/* Translucent circles suggesting data points / coins */}
          <circle cx="330" cy="560" r="70" fill="rgba(255,255,255,0.04)" />
          <circle cx="60" cy="640" r="44" fill="rgba(255,255,255,0.05)" />
          <circle cx="350" cy="680" r="20" fill="rgba(255,255,255,0.07)" />
          {/* Thin outlined rounded square — like a QR frame corner */}
          <rect x="250" y="600" width="90" height="90" rx="18" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
          <rect x="270" y="620" width="50" height="50" rx="10" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
        </svg>

        {/* Top spacer */}
        <div />

        {/* Centered content */}
        <div className="relative z-10 flex flex-col items-center text-center gap-6">
          {/* Logo ST */}
          <div className="relative flex items-center justify-center" style={{ animation: 'float 4s ease-in-out infinite' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-3e-oficial.webp" alt="3E by ENM" width={220} height={220} style={{ objectFit: 'contain', mixBlendMode: 'multiply' }} />
          </div>

          <div>
            <p className="text-white font-black text-3xl leading-tight">3E</p>
            <p className="text-white/60 text-base mt-1">Plataforma de Premios QR</p>
          </div>

          {/* Divider */}
          <div className="w-16 h-px bg-white/20" />

          {/* Benefit bullets */}
          <ul className="text-white/80 text-sm space-y-3 text-left">
            {[
              'Genera y gestiona premios QR',
              'Panel de cajero por sucursal',
              'Reportes y estadísticas en tiempo real',
            ].map((benefit) => (
              <li key={benefit} className="flex items-center gap-3">
                <span
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)' }}
                >
                  <svg
                    className="w-3.5 h-3.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom copyright */}
        <p className="relative z-10 text-white/30 text-xs text-center">
          {new Date().getFullYear()} · 3E
        </p>
      </div>

      {/* RIGHT COLUMN — white form side */}
      <div className="flex-1 md:w-[60%] bg-white flex flex-col items-center justify-between py-12 px-8">
        {/* Top spacer (keeps content vertically centered) */}
        <div />

        {/* Form content */}
        <div className="w-full max-w-sm mx-auto">
          {/* Logo + heading */}
          <div className="mb-8 flex flex-col items-center gap-3">
            {/* Show logo on mobile (left panel is hidden) */}
            <div className="md:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-3e-oficial.webp" alt="3E by ENM" width={110} height={110} style={{ objectFit: 'contain' }} />
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-black text-[#1C1917] leading-tight">
                Bienvenido de vuelta
              </h1>
              <p className="text-stone-400 text-sm mt-1">
                Ingresa tus credenciales para continuar
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[#1C1917] mb-2">Usuario</label>
              <div className="relative">
                <svg
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                  required
                  placeholder="admin"
                  className="w-full bg-[#FAFAF9] border border-[#E8E3DC] rounded-xl pl-10 pr-4 py-3.5 text-sm text-[#1C1917] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1C1917] mb-2">Contraseña</label>
              <div className="relative">
                <svg
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  required
                  placeholder="••••••••"
                  className="w-full bg-[#FAFAF9] border border-[#E8E3DC] rounded-xl pl-10 pr-4 py-3.5 text-sm text-[#1C1917] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 accent-[#F97316] cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-sm text-[#1C1917] cursor-pointer select-none">
                Recordarme por 30 días
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2.5">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-bold py-4 rounded-xl transition-all text-base disabled:opacity-60 mt-2"
              style={{
                background: 'linear-gradient(135deg,#F97316,#ea6a0a)',
                boxShadow: loading ? 'none' : '0 8px 24px rgba(37,99,235,0.40)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Iniciando sesión...
                </span>
              ) : (
                'Entrar al panel →'
              )}
            </button>

            <div className="text-center">
              <Link
                href="/admin/forgot-password"
                className="text-sm text-[#78716c] hover:text-[#F97316] transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </form>
        </div>

        {/* Bottom copyright */}
        <p className="text-stone-300 text-xs mt-8">
          © {new Date().getFullYear()} 3E
        </p>
      </div>
    </div>
  );
}
