'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col items-center justify-center gap-6 px-4 text-center">
      {/* Branding */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-black" style={{ background: 'linear-gradient(135deg,#2563EB,#0891B2)' }}>
          P
        </div>
        <span className="text-sm font-bold text-stone-500 uppercase tracking-widest">Burrito Bar</span>
      </div>

      {/* Error number */}
      <span
        className="text-9xl font-black leading-none select-none"
        style={{ background: 'linear-gradient(135deg, #2563EB 0%, #0891B2 50%, #38BDF8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
      >
        500
      </span>

      {/* Title */}
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold text-stone-800">Algo salió mal</h1>
        <p className="text-sm text-stone-500 max-w-sm leading-relaxed">
          Nuestros servidores están tomando un descanso. Intenta de nuevo en unos segundos.
        </p>
      </div>

      {/* Error detail (collapsed) */}
      {error.message && (
        <p className="text-xs text-stone-300 max-w-xs break-words bg-stone-50 border border-stone-100 rounded-xl px-4 py-2 font-mono">
          {error.message}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mt-2">
        <button
          onClick={() => window.location.reload()}
          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white font-bold text-sm transition-all shadow-sm hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#2563EB,#0891B2)', boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Recargar página
        </button>
        <Link
          href="/"
          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-semibold text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver al inicio
        </Link>
      </div>

      {/* Subtle branding footer */}
      <p className="text-xs text-stone-300 mt-4">Premia &mdash; Burrito Bar</p>
    </div>
  )
}
