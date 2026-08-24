'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
      setSent(true);
    } catch {
      setSent(true); // Still show success to avoid enumeration
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: '#FAFAF9',
        backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <div className="w-full max-w-sm">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: '#F97316', border: '2px solid #111', boxShadow: '3px 3px 0 #111' }}
          >
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111', letterSpacing: '-0.03em' }}>Restablecer contraseña</h1>
          <p style={{ color: '#6b7280', fontSize: 14, fontWeight: 500, marginTop: 8 }}>
            Ingresa tu nombre de usuario y te enviaremos las instrucciones.
          </p>
        </div>

        <div style={{ background: '#fff', border: '2px solid #111', borderRadius: 20, boxShadow: '6px 6px 0 #111', padding: '2.25rem' }}>
          {sent ? (
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: '#1a6b3c', border: '2px solid #111', boxShadow: '2px 2px 0 #111' }}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#111', marginBottom: 8 }}>Instrucciones enviadas</p>
              <p style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>
                Si el usuario existe, recibirás las instrucciones. Revisa tu panel de Seguridad.
              </p>
              <Link
                href="/admin/login"
                style={{ marginTop: 24, display: 'inline-block', fontSize: 13, fontWeight: 800, color: '#F97316' }}
              >
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#111', marginBottom: 6 }}>Usuario</label>
                <div className="relative">
                  <svg
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: '#111', opacity: 0.5 }}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="admin"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-[10px] transition-all focus:outline-none"
                    style={{ border: '2px solid #111', color: '#111', boxShadow: '3px 3px 0 rgba(0,0,0,0.12)', fontWeight: 600 }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#F97316'; e.currentTarget.style.boxShadow = '3px 3px 0 rgba(249,115,22,0.4)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#111'; e.currentTarget.style.boxShadow = '3px 3px 0 rgba(0,0,0,0.12)'; }}
                  />
                </div>
              </div>

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
                    Enviando...
                  </span>
                ) : (
                  'Enviar instrucciones'
                )}
              </button>

              <div className="text-center">
                <Link href="/admin/login" style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>
                  Volver al inicio de sesión
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
