'use client';

import Link from 'next/link';

const GAMES = [
  {
    id: 'slots',
    emoji: '🎰',
    name: 'Tragamonedas',
    desc: 'Tres carretes que giran al tocar la pantalla. Si coinciden los símbolos, el cliente gana el premio.',
    badge: 'Clásico',
    badgeColor: '#2563EB',
    href: '/admin/generate?game_type=slots',
  },
  {
    id: 'roulette',
    emoji: '🎡',
    name: 'Ruleta de la Suerte',
    desc: 'Ruleta con 8 segmentos. El cliente gira y donde caiga la flecha, ese es su premio.',
    badge: 'Popular',
    badgeColor: '#059669',
    href: '/admin/generate?game_type=roulette',
  },
  {
    id: 'penalty',
    emoji: '⚽',
    name: 'Tiro de Penalti',
    desc: 'El cliente elige un ángulo y lanza el balón. Si entra, gana el premio instantáneamente.',
    badge: 'Deportivo',
    badgeColor: '#2563EB',
    href: '/admin/generate?game_type=penalty',
  },
  {
    id: 'scratch',
    emoji: '🃏',
    name: 'Rasca y Gana',
    desc: 'Tarjeta dorada que el cliente raspa con el dedo. Debajo aparece si ganó o no.',
    badge: 'Retro',
    badgeColor: '#D97706',
    href: '/admin/generate?game_type=scratch',
  },
];

export default function GameBundlesPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-bold text-[#2563EB] uppercase tracking-widest mb-2">Juegos con Premios</p>
          <h1 className="text-2xl font-black text-[#1C1917] tracking-tight">Premios gamificados 🎮</h1>
          <p className="text-sm text-[#78716c] mt-1.5 max-w-xl">
            Convierte cada premio en una experiencia. El cliente escanea el QR y antes de ver su premio, juega un mini-juego. Más emoción, más recuerdo de marca.
          </p>
        </div>

        {/* How it works banner */}
        <div className="bg-white border border-[#E8E3DC] rounded-2xl p-5 mb-8 flex gap-4 items-start">
          <div className="text-2xl shrink-0">💡</div>
          <div>
            <p className="text-sm font-bold text-[#1C1917] mb-1">¿Cómo funciona?</p>
            <ol className="text-sm text-[#78716c] space-y-0.5 list-decimal list-inside">
              <li>Genera un premio normal en <strong className="text-[#1C1917]">Generar Premio</strong></li>
              <li>En el paso 2, selecciona el tipo de juego</li>
              <li>El cliente escanea el QR → juega → descubre su premio</li>
              <li>Va al cajero a cobrarlo como siempre</li>
            </ol>
          </div>
        </div>

        {/* Game cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {GAMES.map((game) => (
            <Link
              key={game.id}
              href={game.href}
              className="bg-white border border-[#E8E3DC] rounded-2xl p-6 hover:border-[#2563EB]/40 hover:shadow-md transition-all group flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <div className="text-4xl">{game.emoji}</div>
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider text-white"
                  style={{ background: game.badgeColor }}
                >
                  {game.badge}
                </span>
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1C1917] mb-1 group-hover:text-[#2563EB] transition-colors">{game.name}</h2>
                <p className="text-sm text-[#78716c] leading-relaxed">{game.desc}</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-[#2563EB] mt-auto pt-1">
                Generar premio con este juego
                <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-[#2563EB] to-[#c94315] rounded-2xl p-6 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-bold text-lg">¿Listo para crear tu primer juego?</p>
            <p className="text-white/75 text-sm mt-0.5">Elige un juego arriba o genera desde el panel principal.</p>
          </div>
          <Link
            href="/admin/generate"
            className="shrink-0 bg-white text-[#2563EB] font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors text-center"
          >
            Generar Premio →
          </Link>
        </div>

      </div>
    </div>
  );
}
