'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const BENEFITS = [
  { text: 'Genera y gestiona premios QR', svg: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /> },
  { text: 'Panel de cajero por sucursal', svg: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /> },
  { text: 'Reportes y estadísticas en vivo', svg: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
];

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
      if (!res.ok) {
        if (data.error === 'CUENTA_SUSPENDIDA') {
          router.push('/suspendida');
          return;
        }
        setError(data.message || data.error || 'Credenciales inválidas.');
        return;
      }
      router.push('/admin/generate');
      router.refresh();
    } catch {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  }

  const field = 'w-full pl-10 pr-4 text-[15px] rounded-[10px] focus:outline-none';
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--apple-bg)' }}>

      {/* LEFT COLUMN — brand panel */}
      <div
        className="hidden md:flex md:w-[42%] flex-col justify-between relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #2C2C2E 0%, #000 100%)' }}
      >
        <div className="absolute pointer-events-none" style={{ width: 520, height: 520, borderRadius: '50%', top: -180, right: -200, background: 'radial-gradient(circle, rgba(249,115,22,0.35) 0%, transparent 65%)' }} />
        <div className="absolute pointer-events-none" style={{ width: 420, height: 420, borderRadius: '50%', bottom: -160, left: -160, background: 'radial-gradient(circle, rgba(52,199,89,0.22) 0%, transparent 65%)' }} />

        <div className="relative z-10 p-8" />

        <div className="relative z-10 flex flex-col items-center text-center gap-7 px-10">
          <div style={{ background: '#fff', borderRadius: 28, padding: 20, boxShadow: '0 20px 50px rgba(0,0,0,0.45)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-3e-oficial.webp" alt="3E" width={112} height={112} style={{ objectFit: 'contain', display: 'block' }} />
          </div>

          <div>
            <h2 style={{ color: '#fff', fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 10 }}>
              Plataforma de<br />Premios QR
            </h2>
            <p style={{ color: 'rgba(235,235,245,0.62)', fontSize: 15, lineHeight: 1.5 }}>
              Gestiona, genera y monitorea<br />tus premios en tiempo real.
            </p>
          </div>

          <ul className="text-left w-full max-w-[300px] overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 14, WebkitBackdropFilter: 'blur(20px)', backdropFilter: 'blur(20px)' }}>
            {BENEFITS.map((b, i) => (
              <li key={b.text} className="flex items-center gap-3" style={{ padding: '11px 14px', borderTop: i ? '0.5px solid rgba(255,255,255,0.12)' : 'none' }}>
                <span style={{ width: 28, height: 28, borderRadius: 7, background: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="15" height="15" fill="none" stroke="#fff" viewBox="0 0 24 24">{b.svg}</svg>
                </span>
                <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>{b.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-center pb-8" style={{ color: 'rgba(235,235,245,0.38)', fontSize: 11 }}>
          © {new Date().getFullYear()} 3E · Todos los derechos reservados
        </p>
      </div>

      {/* RIGHT COLUMN — form */}
      <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 md:px-16">

        <div className="md:hidden flex flex-col items-center mb-8">
          <div style={{ background: '#fff', borderRadius: 22, padding: 14, boxShadow: 'var(--apple-shadow-2)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-3e-oficial.webp" alt="3E" width={56} height={56} style={{ objectFit: 'contain', display: 'block' }} />
          </div>
        </div>

        <div className="w-full max-w-sm" style={{ background: 'var(--apple-bg-2)', borderRadius: 22, boxShadow: 'var(--apple-shadow-2)', padding: '2.25rem' }}>
          <div className="mb-7">
            <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--apple-label)', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 6 }}>
              Bienvenido
            </h1>
            <p style={{ color: 'var(--apple-label-2)', fontSize: 15 }}>
              Inicia sesión para acceder al panel.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--apple-label-2)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <input
                type="text"
                aria-label="Usuario"
                autoComplete="username"
                value={form.username}
                onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                required
                placeholder="Usuario"
                className={field}
                style={{ height: 46 }}
              />
            </div>

            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--apple-label-2)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                type="password"
                aria-label="Contraseña"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                required
                placeholder="Contraseña"
                className={field}
                style={{ height: 46 }}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer" style={{ fontSize: 14, color: 'var(--apple-label)' }}>
                <input type="checkbox" role="switch" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ transform: 'scale(0.78)', transformOrigin: 'left center', marginRight: -12 }} />
                Recordarme
              </label>
              <Link href="/admin/forgot-password" style={{ fontSize: 14, color: '#F97316', textDecoration: 'none' }}>
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3" style={{ background: 'rgba(255,59,48,0.1)', borderRadius: 12 }}>
                <svg style={{ width: 16, height: 16, color: '#FF3B30', flexShrink: 0 }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span style={{ fontSize: 14, color: '#FF3B30', fontWeight: 500 }}>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white"
              style={{ height: 48, borderRadius: 12, background: '#F97316', fontSize: 16, fontWeight: 600, marginTop: 8, boxShadow: 'none', border: 0 }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Iniciando sesión…
                </span>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          <p className="mt-7 text-center" style={{ fontSize: 12, color: 'var(--apple-label-3)' }}>
            © {new Date().getFullYear()} 3E · Acceso restringido al personal autorizado
          </p>
        </div>
      </div>
    </div>
  );
}
