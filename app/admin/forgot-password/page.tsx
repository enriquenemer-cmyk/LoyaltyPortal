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
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg,#E8521A,#C2410C)',
              boxShadow: '0 8px 24px rgba(232,82,26,0.35)',
            }}
          >
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-[#1C1917]">Restablecer contraseña</h1>
          <p className="text-stone-400 text-sm mt-2">
            Ingresa tu nombre de usuario y te enviaremos las instrucciones.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8E3DC] p-8" style={{ boxShadow: '0 1px 4px rgba(28,25,23,0.06)' }}>
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[#1C1917] mb-2">Instrucciones enviadas</p>
              <p className="text-sm text-[#78716c]">
                Si el usuario existe, recibirás las instrucciones. Revisa tu panel de Seguridad.
              </p>
              <Link
                href="/admin/login"
                className="mt-6 inline-block text-sm font-semibold text-[#E8521A] hover:underline"
              >
                Volver al inicio de sesion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#1C1917] mb-2">Usuario</label>
                <div className="relative">
                  <svg
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400"
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
                    className="w-full bg-[#FAFAF9] border border-[#E8E3DC] rounded-xl pl-10 pr-4 py-3.5 text-sm text-[#1C1917] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-bold py-4 rounded-xl transition-all text-base disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg,#E8521A,#C2410C)',
                  boxShadow: loading ? 'none' : '0 8px 24px rgba(232,82,26,0.40)',
                }}
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
                <Link href="/admin/login" className="text-sm text-[#78716c] hover:text-[#E8521A] transition-colors">
                  Volver al inicio de sesion
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
