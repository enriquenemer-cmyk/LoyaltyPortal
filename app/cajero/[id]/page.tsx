import { getClaimById } from '@/lib/db';
import { notFound } from 'next/navigation';
import CashierAction from './CashierAction';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ cajero?: string }> };

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default async function CajeroPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { cajero } = await searchParams;
  const claim = await getClaimById(id);
  if (!claim) notFound();

  const alreadyDelivered = claim.status === 'delivered';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-700/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 py-10 pb-20">

        {/* Cajero badge */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-white/90 text-sm font-medium">Vista del Cajero</span>
          </div>
        </div>

        {/* Prize info */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl overflow-hidden shadow-2xl mb-5">
          <div className={`p-6 ${alreadyDelivered ? 'bg-gradient-to-br from-gray-600 to-gray-700' : 'bg-gradient-to-br from-orange-500 to-orange-700'}`}>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <div>
                <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Premio a entregar</p>
                <h1 className="text-2xl font-extrabold text-white leading-tight">{claim.prize_name}</h1>
                {alreadyDelivered && (
                  <span className="inline-flex items-center gap-1 mt-2 bg-gray-500/40 text-gray-200 text-xs font-bold px-2.5 py-1 rounded-full">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Ya entregado
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Customer info */}
          <div className="p-6 space-y-4">
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Datos del Cliente</p>

            <div className="grid grid-cols-1 gap-3">
              <div className="bg-white/10 rounded-2xl p-4 border border-white/10 flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/30 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white/40 text-xs font-bold uppercase tracking-wide">Nombre</p>
                  <p className="text-white font-bold text-lg">{claim.full_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-wide mb-1">Celular</p>
                  <p className="text-white font-semibold">{claim.phone}</p>
                </div>
                <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-wide mb-1">Registrado</p>
                  <p className="text-white/80 text-xs font-medium">{formatDateTime(claim.claimed_at)}</p>
                </div>
              </div>

              <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                <p className="text-white/40 text-xs font-bold uppercase tracking-wide mb-1">Correo</p>
                <p className="text-white/80 text-sm">{claim.email}</p>
              </div>

              <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                <p className="text-white/40 text-xs font-bold uppercase tracking-wide mb-1">Descripción del premio</p>
                <p className="text-white/80 text-sm">{claim.prize_description}</p>
              </div>
            </div>

            {/* Location */}
            <div className="bg-gradient-to-r from-amber-400/20 to-orange-400/20 border border-amber-400/30 rounded-2xl p-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <p className="text-amber-300 text-xs font-bold uppercase tracking-wide">Sucursal elegida por el cliente</p>
                <p className="text-white font-bold">{claim.location ?? claim.prize_location}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action or delivered state */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-2xl">
          {alreadyDelivered ? (
            <div className="text-center py-2">
              <div className="w-16 h-16 bg-gray-500/30 border-2 border-gray-400/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-extrabold text-white mb-2">Este premio ya fue entregado</h3>
              <p className="text-white/50 text-sm">
                Entregado el {formatDateTime(claim.delivered_at!)}
                {claim.delivered_by && <> por <strong className="text-white/70">{claim.delivered_by}</strong></>}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-5">
                <h2 className="text-lg font-bold text-white">Confirmar Entrega</h2>
                <p className="text-white/50 text-sm mt-1">Una vez que confirmes, quedará registrado en el sistema y el QR se invalida.</p>
              </div>
              <CashierAction claimId={claim.id} prizeName={claim.prize_name} defaultCajero={cajero ?? ''} />
            </>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-6">Premia Tierra · Panel de Cajero</p>
      </div>
    </div>
  );
}
