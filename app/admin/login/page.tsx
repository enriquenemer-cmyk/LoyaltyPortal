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
    <div
      className="min-h-screen flex"
      style={{
        background: '#FAFAF9',
        backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >

      {/* LEFT COLUMN — brand panel */}
      <div
        className="hidden md:flex md:w-[42%] flex-col justify-between relative overflow-hidden"
        style={{ background: '#1a6b3c', borderRight: '4px solid #111' }}
      >
        {/* Halftone texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.14) 1.5px, transparent 1.5px)', backgroundSize: '18px 18px' }}
        />
        {/* Bold sticker shapes */}
        <div className="absolute pointer-events-none" style={{ width: 180, height: 180, borderRadius: 32, background: '#F97316', border: '3px solid #111', top: -50, right: -50, transform: 'rotate(18deg)' }} />
        <div className="absolute pointer-events-none" style={{ width: 90, height: 90, borderRadius: '50%', background: '#fff', border: '3px solid #111', bottom: 60, left: -40 }} />

        {/* Top logo mark */}
        <div className="relative z-10 p-8 flex items-center gap-2.5">
          <span style={{ width: 10, height: 10, borderRadius: 3, background: '#F97316', border: '2px solid #111' }} />
          <span style={{ color: '#fff', fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>3E</span>
        </div>

        {/* Centered content */}
        <div className="relative z-10 flex flex-col items-center text-center gap-7 px-10">
          <div style={{ background: '#fff', borderRadius: 20, padding: 22, border: '2px solid #111', boxShadow: '4px 4px 0 #111' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-3e-oficial.webp" alt="3E" width={130} height={130} style={{ objectFit: 'contain', display: 'block' }} />
          </div>

          <div>
            <h2 style={{ color: 'white', fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.08, marginBottom: 10 }}>
              Plataforma de<br />Premios QR
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 500, lineHeight: 1.6 }}>
              Gestiona, genera y monitorea<br />tus premios en tiempo real.
            </p>
          </div>

          <ul className="text-left space-y-3.5 w-full max-w-[280px]">
            {BENEFITS.map((b) => (
              <li key={b.text} className="flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(17,17,17,0.4)', borderRadius: 10, padding: '8px 12px' }}>
                <span style={{ width: 26, height: 26, borderRadius: 7, background: '#F97316', border: '2px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" fill="none" stroke="#111" viewBox="0 0 24 24">{b.svg}</svg>
                </span>
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{b.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-center pb-8" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600 }}>
          © {new Date().getFullYear()} 3E · Todos los derechos reservados
        </p>
      </div>

      {/* RIGHT COLUMN — form */}
      <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 md:px-16">

        {/* Mobile logo */}
        <div className="md:hidden flex flex-col items-center mb-8 gap-3">
          <div style={{ background: '#fff', borderRadius: 16, padding: 14, border: '2px solid #111', boxShadow: '3px 3px 0 #111' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-3e-oficial.webp" alt="3E" width={56} height={56} style={{ objectFit: 'contain', display: 'block' }} />
          </div>
          <span style={{ color: '#111', fontSize: 13, fontWeight: 800 }}>3E</span>
        </div>

        <div className="w-full max-w-sm" style={{ background: '#fff', border: '2px solid #111', borderRadius: 20, boxShadow: '6px 6px 0 #111', padding: '2.25rem' }}>
          {/* Heading */}
          <div className="mb-7">
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 8 }}>
              Bienvenido de vuelta
            </h1>
            <p style={{ color: '#6b7280', fontSize: 14, fontWeight: 500 }}>
              Ingresa tus credenciales para acceder al panel.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Username */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#111', marginBottom: 6 }}>Usuario</label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#111', opacity: 0.5 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                  required
                  placeholder="Nombre de usuario"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-[10px] transition-all focus:outline-none"
                  style={{ border: '2px solid #111', color: '#111', boxShadow: '3px 3px 0 rgba(0,0,0,0.12)', fontWeight: 600 }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#F97316'; e.currentTarget.style.boxShadow = '3px 3px 0 rgba(249,115,22,0.4)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#111'; e.currentTarget.style.boxShadow = '3px 3px 0 rgba(0,0,0,0.12)'; }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label style={{ fontSize: 13, fontWeight: 800, color: '#111' }}>Contraseña</label>
                <Link href="/admin/forgot-password" style={{ fontSize: 12, color: '#F97316', fontWeight: 700, textDecoration: 'none' }}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#111', opacity: 0.5 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-[10px] transition-all focus:outline-none"
                  style={{ border: '2px solid #111', color: '#111', boxShadow: '3px 3px 0 rgba(0,0,0,0.12)', fontWeight: 600 }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#F97316'; e.currentTarget.style.boxShadow = '3px 3px 0 rgba(249,115,22,0.4)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#111'; e.currentTarget.style.boxShadow = '3px 3px 0 rgba(0,0,0,0.12)'; }}
                />
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-[18px] h-[18px] cursor-pointer"
                style={{ accentColor: '#F97316', border: '2px solid #111', borderRadius: 4, boxShadow: '2px 2px 0 #111' }}
              />
              <label htmlFor="rememberMe" style={{ fontSize: 13, color: '#374151', fontWeight: 600, cursor: 'pointer' }}>
                Mantener sesión iniciada
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-[10px]" style={{ background: '#fef2f2', border: '2px solid #111', boxShadow: '3px 3px 0 rgba(220,38,38,0.3)' }}>
                <svg style={{ width: 16, height: 16, color: '#dc2626', flexShrink: 0 }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 700 }}>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-[12px] text-white text-sm transition-all"
              style={{
                background: loading ? '#6b9e7e' : '#F97316',
                border: '2.5px solid #111',
                boxShadow: loading ? 'none' : '4px 4px 0 #111',
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 4,
              }}
              onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.transform = 'translate(-2px, -2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '6px 6px 0 #111'; } }}
              onMouseLeave={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.transform = 'translate(0, 0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '4px 4px 0 #111'; } }}
              onMouseDown={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.transform = 'translate(2px, 2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '1px 1px 0 #111'; } }}
              onMouseUp={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.transform = 'translate(-2px, -2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '6px 6px 0 #111'; } }}
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
                'Iniciar sesión'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-7 pt-5" style={{ borderTop: '2px dashed rgba(17,17,17,0.15)' }}>
            <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', fontWeight: 600 }}>
              © {new Date().getFullYear()} 3E · Acceso restringido al personal autorizado
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
