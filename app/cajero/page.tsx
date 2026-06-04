import Link from 'next/link';

const TOTAL = 25;

const COLORS = [
  'from-orange-500 to-orange-700',
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
];

export default function CajeroPage() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg,#150800 0%,#2D1200 45%,#150800 100%)' }}>

      {/* Header */}
      <div className="border-b border-white/10 px-5 py-5" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#F97316,#C2410C)', boxShadow: '0 4px 16px rgba(232,82,26,0.35)' }}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <div>
            <h1 className="text-white text-xl font-black leading-tight">
              Premia{' '}
              <span style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Tierra
              </span>
            </h1>
            <p className="text-white/35 text-sm">Selecciona tu restaurante para escanear</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Section badge */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-3"
            style={{ background: 'rgba(232,82,26,0.10)', border: '1px solid rgba(232,82,26,0.25)' }}
          >
            <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-orange-400 text-xs font-bold uppercase tracking-widest">Cajeros activos</span>
          </div>
          <p className="text-white/30 text-sm">Elige tu restaurante para activar el escáner de QR</p>
        </div>

        {/* 25 Profile cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: TOTAL }, (_, i) => {
            const num = i + 1;
            const name = `Restaurante ${num}`;
            const color = COLORS[i % COLORS.length];

            return (
              <Link
                key={num}
                href={`/cajero/escanear?r=${encodeURIComponent(name)}`}
                className="group block rounded-2xl p-5 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
              >
                {/* Avatar */}
                <div
                  className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center text-white font-black text-lg bg-gradient-to-br ${color} shadow-lg transition-transform duration-200 group-hover:scale-110`}
                >
                  R{num}
                </div>

                <p className="text-white text-sm font-bold leading-snug mb-2 group-hover:text-orange-300 transition-colors">
                  {name}
                </p>

                <div
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-all group-hover:bg-orange-400/20"
                  style={{ background: 'rgba(232,82,26,0.10)' }}
                >
                  <svg className="w-3 h-3 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16.01 20H16m-8 0h.01M4 16.01V16m0-8.01V8M8 4h.01" />
                  </svg>
                  <span className="text-orange-400 text-xs font-bold">Escanear</span>
                </div>
              </Link>
            );
          })}
        </div>

        <p className="text-center text-white/15 text-xs mt-10">
          Premia Tierra · Panel de Cajeros
        </p>
      </div>
    </div>
  );
}
