import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { getClaimById, getRecentClaimsByContact, getRestaurantById } from '@/lib/db';
import { notFound } from 'next/navigation';
import CashierAction from './CashierAction';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ cajero?: string; restaurante?: string }> };

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default async function CajeroPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { cajero, restaurante } = await searchParams;
  const claim = await getClaimById(id);
  if (!claim) notFound();

  // Fetch restaurant for google_maps_url
  let googleMapsUrl: string | null = null;
  {
    const { getPool } = await import('@/lib/db');
    const pool = getPool();
    const { rows } = await pool.query<{ restaurant_id: string | null }>(
      `SELECT restaurant_id FROM prizes WHERE id = $1`,
      [claim.prize_id]
    );
    const restaurantId = rows[0]?.restaurant_id;
    if (restaurantId) {
      const restaurant = await getRestaurantById(restaurantId);
      googleMapsUrl = restaurant?.google_maps_url ?? null;
    }
  }

  const [recentByPhone, recentByEmail] = await Promise.all([
    getRecentClaimsByContact(claim.phone),
    getRecentClaimsByContact(claim.email),
  ]);
  const seenIds = new Set<string>();
  const recentClaims = [...recentByPhone, ...recentByEmail].filter(c => {
    if (seenIds.has(c.id)) return false;
    seenIds.add(c.id);
    return true;
  });
  const recentOtherClaimsCount = recentClaims.filter(c => c.id !== claim.id).length;

  const alreadyDelivered = claim.status === 'delivered';
  const isExpired = claim.expires_at ? new Date(claim.expires_at) < new Date() : false;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAF9' }}>

      {/* Sticky header */}
      <header className="sticky top-0 z-20 bg-white border-b border-[#E8E3DC] shadow-sm fade-in-up">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {/* Orange logo icon */}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #2563EB, #0891B2)' }}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-stone-400 font-medium leading-none mb-0.5">Cajero · 3E</p>
              {cajero && <p className="text-xs text-[#1C1917] font-semibold leading-none">{cajero}</p>}
            </div>
          </div>
          {restaurante && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full border border-[#E8E3DC] bg-[#FAFAF9] text-stone-600 shrink-0">
              {restaurante}
            </span>
          )}
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 pb-20 space-y-4">

        {/* Expiry warning */}
        {isExpired && !alreadyDelivered && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <span className="text-xl shrink-0"><ExclamationTriangleIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span>
            <p className="text-blue-800 font-semibold text-sm leading-snug">
              Este cobro expiró — el cliente tardó más de 2 horas. Puedes entregarlo de todas formas.
            </p>
          </div>
        )}

        {/* Duplicate warning */}
        {recentOtherClaimsCount > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4 flex items-start gap-3 slide-up-sm">
            <span className="text-xl shrink-0"><ExclamationTriangleIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span>
            <p className="text-blue-800 font-semibold text-sm leading-snug">
              Este cliente tiene {recentOtherClaimsCount} {recentOtherClaimsCount === 1 ? 'premio reclamado recientemente' : 'premios reclamados recientemente'}
            </p>
          </div>
        )}

        {/* Main card */}
        <div
          className="bg-white rounded-3xl overflow-hidden border border-[#E8E3DC] pop-in"
          style={{ animationDelay: '0.1s', boxShadow: '0 1px 2px rgba(28,25,23,0.04), 0 8px 32px rgba(28,25,23,0.10)' }}
        >
          {/* Prize header gradient */}
          <div
            className="px-6 pt-6 pb-6"
            style={{ background: alreadyDelivered ? 'linear-gradient(135deg,#1C1917,#292524)' : 'linear-gradient(135deg,#2563EB,#0891B2)' }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.25)' }}
              >
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1.5">Premio a entregar</p>
                <h1 className="text-2xl font-black text-white leading-tight">{claim.prize_name}</h1>
                {alreadyDelivered && (
                  <span className="inline-flex items-center gap-1.5 mt-3 bg-white/15 text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/25">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Ya fue entregado
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Customer section */}
          <div className="p-6 space-y-4">
            <p className="text-stone-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Datos del Cliente
            </p>

            {/* Info chips grid */}
            <div className="grid grid-cols-1 gap-3">
              {/* Name — full width, prominent */}
              <div className="rounded-xl border border-[#E8E3DC] bg-[#FAFAF9] px-4 py-3.5 stagger-item">
                <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-1">Nombre completo</p>
                <p className="text-[#1C1917] font-extrabold text-lg leading-tight">{claim.full_name}</p>
              </div>

              {/* Phone + Date side by side */}
              <div className="grid grid-cols-2 gap-3 stagger-item">
                <div className="rounded-xl border border-[#E8E3DC] bg-[#FAFAF9] px-4 py-3">
                  <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-1">Celular</p>
                  <p className="text-[#1C1917] font-bold text-sm font-mono">{claim.phone}</p>
                </div>
                <div className="rounded-xl border border-[#E8E3DC] bg-[#FAFAF9] px-4 py-3">
                  <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-1">Registrado</p>
                  <p className="text-[#1C1917] font-semibold text-xs leading-snug">{formatDateTime(claim.claimed_at)}</p>
                </div>
              </div>

              {/* Email */}
              <div className="rounded-xl border border-[#E8E3DC] bg-[#FAFAF9] px-4 py-3 stagger-item">
                <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-1">Correo electrónico</p>
                <p className="text-[#1C1917] font-semibold text-sm">{claim.email}</p>
              </div>
            </div>

            {/* Location chip — prominent */}
            <div
              className="rounded-xl px-4 py-3.5 flex items-center gap-3"
              style={{ background: 'linear-gradient(135deg,#FEF3C7,#FEF9C3)', border: '1px solid #FCD34D' }}
            >
              <div className="w-9 h-9 bg-orange-400/20 rounded-xl flex items-center justify-center shrink-0 pulse-glow">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-orange-600 text-[10px] font-bold uppercase tracking-widest mb-0.5">Sucursal elegida</p>
                <p className="text-blue-900 font-extrabold text-sm">{claim.location ?? claim.prize_location}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery card */}
        <div
          className="bg-white rounded-3xl border border-[#E8E3DC] overflow-hidden pop-in"
          style={{ boxShadow: '0 1px 2px rgba(28,25,23,0.04), 0 8px 32px rgba(28,25,23,0.08)', animationDelay: '0.2s' }}
        >
          {alreadyDelivered ? (
            <div className="text-center py-10 px-6">
              <div className="w-16 h-16 bg-stone-100 border-2 border-stone-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-extrabold text-[#1C1917] mb-2">Este premio ya fue entregado</h3>
              <p className="text-stone-400 text-sm">
                Entregado el {formatDateTime(claim.delivered_at!)}
                {claim.delivered_by && <> por <strong className="text-stone-600">{claim.delivered_by}</strong></>}
              </p>
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-[#E8E3DC] bg-[#FAFAF9]">
                <h2 className="text-base font-bold text-[#1C1917]">Canjear Premio</h2>
                <p className="text-stone-500 text-xs mt-0.5">Solo pulsar "Canjear Premio" invalida el QR y registra la entrega.</p>
              </div>
              <div className="p-6">
                <CashierAction claimId={claim.id} prizeName={claim.prize_name} defaultCajero={cajero ?? ''} phone={claim.phone} fullName={claim.full_name} isExpired={isExpired} googleMapsUrl={googleMapsUrl} />
              </div>
            </>
          )}
        </div>

        <p className="text-center text-stone-300 text-xs">3E · Panel de Cajero</p>
      </div>
    </div>
  );
}
