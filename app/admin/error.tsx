'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function AdminError({
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
      <span className="text-8xl font-black bg-gradient-to-r from-orange-500 to-orange-300 bg-clip-text text-transparent leading-none">
        500
      </span>
      <span className="text-5xl">🌯</span>
      <h1 className="text-2xl font-bold text-stone-800">Algo salió mal</h1>
      {error.message && (
        <p className="text-sm text-stone-400 max-w-sm break-words">{error.message}</p>
      )}
      <div className="flex flex-col sm:flex-row gap-3 mt-2">
        <button
          onClick={reset}
          className="px-6 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors"
        >
          Intentar de nuevo
        </button>
        <Link
          href="/admin/generate"
          className="px-6 py-2 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-100 font-semibold transition-colors"
        >
          ← Inicio
        </Link>
      </div>
    </div>
  )
}
