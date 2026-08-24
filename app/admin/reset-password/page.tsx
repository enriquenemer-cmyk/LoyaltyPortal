'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const haloBg = {
  background: '#FAFAF9',
  backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)',
  backgroundSize: '20px 20px',
};

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token no encontrado. Solicita un nuevo enlace.');
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al restablecer la contraseña.');
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push('/admin/login?reset=1'), 2000);
    } catch {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = { border: '2px solid #111', color: '#111', boxShadow: '3px 3px 0 rgba(0,0,0,0.12)', fontWeight: 600 } as const;
  const focusInput = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = '#F97316'; e.currentTarget.style.boxShadow = '3px 3px 0 rgba(249,115,22,0.4)'; };
  const blurInput = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = '#111'; e.currentTarget.style.boxShadow = '3px 3px 0 rgba(0,0,0,0.12)'; };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={haloBg}>
      <div className="w-full max-w-sm">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: '#F97316', border: '2px solid #111', boxShadow: '3px 3px 0 #111' }}
          >
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111', letterSpacing: '-0.03em' }}>Nueva contraseña</h1>
          <p style={{ color: '#6b7280', fontSize: 14, fontWeight: 500, marginTop: 8 }}>Elige una nueva contraseña segura para tu cuenta.</p>
        </div>

        <div style={{ background: '#fff', border: '2px solid #111', borderRadius: 20, boxShadow: '6px 6px 0 #111', padding: '2.25rem' }}>
          {success ? (
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: '#1a6b3c', border: '2px solid #111', boxShadow: '2px 2px 0 #111' }}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#111', marginBottom: 8 }}>Contraseña actualizada</p>
              <p style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Redirigiendo al inicio de sesión...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#111', marginBottom: 6 }}>Nueva contraseña</label>
                <div className="relative">
                  <svg
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: '#111', opacity: 0.5 }}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="mínimo 6 caracteres"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-[10px] transition-all focus:outline-none"
                    style={inputStyle}
                    onFocus={focusInput}
                    onBlur={blurInput}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#111', marginBottom: 6 }}>Confirmar contraseña</label>
                <div className="relative">
                  <svg
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: '#111', opacity: 0.5 }}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="repite la contraseña"
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-[10px] transition-all focus:outline-none"
                    style={inputStyle}
                    onFocus={focusInput}
                    onBlur={blurInput}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-[10px]" style={{ background: '#fef2f2', border: '2px solid #111', boxShadow: '3px 3px 0 rgba(220,38,38,0.3)' }}>
                  <svg style={{ width: 16, height: 16, color: '#dc2626', flexShrink: 0 }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd" />
                  </svg>
                  <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 700 }}>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full py-3 rounded-[12px] text-white text-sm transition-all"
                style={{
                  background: (loading || !token) ? '#6b9e7e' : '#F97316',
                  border: '2.5px solid #111',
                  boxShadow: (loading || !token) ? 'none' : '4px 4px 0 #111',
                  fontWeight: 800,
                  cursor: (loading || !token) ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={e => { if (!loading && token) { (e.currentTarget as HTMLButtonElement).style.transform = 'translate(-2px, -2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '6px 6px 0 #111'; } }}
                onMouseLeave={e => { if (!loading && token) { (e.currentTarget as HTMLButtonElement).style.transform = 'translate(0, 0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '4px 4px 0 #111'; } }}
                onMouseDown={e => { if (!loading && token) { (e.currentTarget as HTMLButtonElement).style.transform = 'translate(2px, 2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '1px 1px 0 #111'; } }}
                onMouseUp={e => { if (!loading && token) { (e.currentTarget as HTMLButtonElement).style.transform = 'translate(-2px, -2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '6px 6px 0 #111'; } }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Actualizando...
                  </span>
                ) : (
                  'Actualizar contraseña'
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={haloBg}>
        <svg className="animate-spin w-7 h-7" style={{ color: '#F97316' }} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
