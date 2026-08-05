'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Restaurant = {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  accent_color: string;
};

const SWATCHES = ['#2563EB', '#7c3aed', '#0ea5e9', '#be185d', '#059669', '#0EA5E9'];

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden animate-pulse" style={{ minHeight: '160px', border: '1px solid #E8E3DC', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      {/* Header skeleton */}
      <div className="bg-stone-200" style={{ height: '70px' }} />
      {/* Body skeleton */}
      <div className="bg-white px-4 py-3">
        <div className="h-4 bg-stone-200 rounded w-3/4 mx-auto mb-2" />
        <div className="h-3 bg-stone-100 rounded w-1/2 mx-auto" />
      </div>
    </div>
  );
}

export default function CajeroPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/restaurants')
      .then((r) => r.json())
      .then((data) => {
        if (data.restaurants) setRestaurants(data.restaurants);
        else setError('No se pudieron cargar las sucursales.');
      })
      .catch(() => setError('Error de conexión.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg,#FAFAF9 0%,#FFF7F3 60%,#FFF0E8 100%)' }}>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-stone-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#2563EB,#0891B2)', boxShadow: '0 4px 12px rgba(37,99,235,0.35)' }}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <div>
            <h1 className="text-stone-900 text-lg font-extrabold leading-tight">3E</h1>
            <p className="text-stone-400 text-xs font-medium">Selecciona tu sucursal para escanear</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6 text-center">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : restaurants.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8E3DC] p-16 text-center shadow-sm">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-stone-700 font-bold text-base">Sin sucursales disponibles</p>
            <p className="text-stone-400 text-sm mt-1">Pide al administrador que registre tu sucursal.</p>
          </div>
        ) : (
          <>
            <p className="text-stone-400 text-sm mb-5 text-center">
              <span className="font-semibold text-stone-600">{restaurants.length}</span> sucursal{restaurants.length !== 1 ? 'es' : ''} disponible{restaurants.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {restaurants.map((r, i) => {
                const accent = r.accent_color || SWATCHES[i % SWATCHES.length];
                // Create a slightly darker shade for gradient end
                const accentDark = accent + 'cc';
                return (
                  <Link
                    key={r.id}
                    href={`/cajero/escanear?r=${encodeURIComponent(r.name)}&color=${encodeURIComponent(accent)}`}
                    className="group block bg-white rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1"
                    style={{
                      border: '1px solid #E8E3DC',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                      minHeight: '160px',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px ${accent}55, 0 2px 8px ${accent}30`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
                    }}
                  >
                    {/* Full-color header */}
                    <div
                      className="relative flex flex-col items-center justify-center transition-all duration-200"
                      style={{
                        height: '70px',
                        background: `linear-gradient(135deg, ${accent}, ${accentDark})`,
                      }}
                    >
                      {/* Subtle circle behind initials */}
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ pointerEvents: 'none' }}
                      >
                        <div
                          className="rounded-full"
                          style={{
                            width: '52px',
                            height: '52px',
                            background: 'rgba(255,255,255,0.15)',
                          }}
                        />
                      </div>
                      {/* Initials */}
                      <span
                        className="relative z-10 font-black text-white leading-none select-none transition-transform duration-200 group-hover:scale-110"
                        style={{ fontSize: '32px', letterSpacing: '-1px' }}
                      >
                        {initials(r.name)}
                      </span>
                    </div>

                    {/* White body */}
                    <div className="px-3 pt-3 pb-3 flex flex-col items-center gap-1.5">
                      <p className="text-stone-900 font-extrabold text-sm text-center leading-snug line-clamp-2">
                        {r.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <svg
                          className="w-3 h-3 shrink-0"
                          style={{ color: accent }}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4h.01M8 8h.01M16 8h.01M4 12h.01M20 12h.01M8 16h.01M16 16h.01M12 20h.01M4 4h4v4H4zm12 0h4v4h-4zM4 16h4v4H4zm12 0h4v4h-4z" />
                        </svg>
                        <span className="text-xs font-bold" style={{ color: accent }}>
                          Escanear QR
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        <p className="text-center text-stone-300 text-xs mt-10">
          Burrito Bar · Panel de Cajeros · 3E
        </p>
      </div>
    </div>
  );
}
