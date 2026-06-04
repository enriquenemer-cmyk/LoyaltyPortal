import { getPrizeById } from '@/lib/db';
import { notFound } from 'next/navigation';
import ClaimForm from './ClaimForm';

type Props = {
  params: Promise<{ id: string }>;
};

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default async function PremioPage({ params }: Props) {
  const { id } = await params;
  const prize = await getPrizeById(id);

  if (!prize) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
      {/* Background decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-900/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 py-10 pb-20">

        {/* Logo / brand top */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2">
            <div className="w-5 h-5 bg-emerald-400 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-white/90 text-sm font-medium">Premio Verificado</span>
          </div>
        </div>

        {/* Main prize card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl overflow-hidden shadow-2xl mb-5">
          {/* Header with gift icon and confetti feel */}
          <div className="relative bg-gradient-to-br from-emerald-400 to-teal-500 p-8 text-center overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-2 left-6 w-3 h-3 bg-white rounded-full" />
              <div className="absolute top-8 left-16 w-2 h-2 bg-yellow-300 rounded-full" />
              <div className="absolute top-4 right-10 w-4 h-4 bg-white rounded-full" />
              <div className="absolute top-12 right-4 w-2 h-2 bg-yellow-300 rounded-full" />
              <div className="absolute bottom-4 left-10 w-3 h-3 bg-white/60 rounded-full" />
              <div className="absolute bottom-6 right-16 w-2 h-2 bg-white/60 rounded-full" />
            </div>
            <div className="relative">
              <div className="float-animation inline-flex w-20 h-20 bg-white/25 backdrop-blur-sm rounded-2xl items-center justify-center mb-4 shadow-xl">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">{prize.name}</h1>
              <p className="text-emerald-100 text-sm mt-2 font-medium">¡Felicidades, este premio es tuyo!</p>
            </div>
          </div>

          {/* Prize details */}
          <div className="p-6 space-y-5">
            <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
              <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-1.5">¿Por qué lo ganaste?</p>
              <p className="text-white font-medium leading-relaxed">{prize.reason}</p>
            </div>

            <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
              <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-1.5">En qué consiste tu premio</p>
              <p className="text-white/90 leading-relaxed">{prize.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-2xl p-4 border border-white/10 text-center">
                <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-1">Válido desde</p>
                <p className="text-white text-sm font-semibold">{formatDate(prize.start_date)}</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-4 border border-white/10 text-center">
                <p className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-1">Válido hasta</p>
                <p className="text-white text-sm font-semibold">{formatDate(prize.end_date)}</p>
              </div>
            </div>
          </div>

          {/* Location — most prominent element */}
          <div className="mx-6 mb-6">
            <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl p-5 shadow-lg shadow-amber-500/30">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/30 rounded-xl flex items-center justify-center shrink-0 pulse-ring">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-amber-900/80 text-xs font-bold uppercase tracking-widest mb-0.5">📍 Preséntate aquí para cobrar</p>
                  <p className="text-amber-950 text-xl font-extrabold leading-tight">{prize.location}</p>
                  <p className="text-amber-800/70 text-xs mt-1">Muestra este QR o el registro al llegar</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Claim Form */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-2xl">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white">Regístrate para Cobrar</h2>
            <p className="text-white/60 text-sm mt-1">Solo necesitamos tus datos básicos para entregarte el premio</p>
          </div>
          <ClaimForm prizeId={prize.id} location={prize.location} />
        </div>

        <p className="text-center text-white/30 text-xs mt-6">Premia Tierra · Plataforma de Premios</p>
      </div>
    </div>
  );
}
