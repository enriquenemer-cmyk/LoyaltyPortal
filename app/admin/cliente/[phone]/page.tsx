import { CheckCircleIcon, GiftIcon, ReceiptPercentIcon, RectangleGroupIcon } from '@heroicons/react/24/outline';;
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SendMessageForm } from './SendMessageForm';
import { PrizeRecommendation } from './PrizeRecommendation';
import { AiCardGenerator } from './AiCardGenerator';
import {
  getClaimsByContact,
  getCustomerPoints,
  getStampCardsByPhone,
  getPool,
  getTierInfo,
  TIER_LABELS,
  type ClaimWithPrize,
  type CustomerPoints,
  type StampCard,
  type TicketClaim,
} from '@/lib/db';

// ── Types ─────────────────────────────────────────────────────────────────────

type TimelineEvent = {
  id: string;
  date: string;
  type: 'claim' | 'delivered' | 'game' | 'ticket';
  icon: string;
  description: string;
  meta?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function tierLabel(tier: string) {
  if (tier === 'gold') return 'Oro';
  if (tier === 'silver') return 'Plata';
  return 'Bronce';
}

function tierBadgeClass(tier: string) {
  if (tier === 'gold') return 'bg-yellow-50 text-yellow-700 border-yellow-300';
  if (tier === 'silver') return 'bg-slate-100 text-slate-700 border-slate-300';
  return 'bg-orange-50 text-orange-700 border-orange-200';
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getTicketClaimsByPhone(phone: string): Promise<TicketClaim[]> {
  try {
    const pool = getPool();
    const { rows } = await pool.query<TicketClaim>(
      `SELECT * FROM ticket_claims WHERE phone = $1 ORDER BY claimed_at DESC`,
      [phone]
    );
    return rows;
  } catch {
    return [];
  }
}

async function getGamePlaysByPhone(phone: string): Promise<Array<{ id: string; prize_name: string; game_type: string; played_at: string; bundle_name: string | null }>> {
  try {
    const pool = getPool();
    const { rows } = await pool.query<{ id: string; prize_name: string; game_type: string; played_at: string; bundle_name: string | null }>(
      `SELECT gpl.id, gp.name AS prize_name, gb.game_type, gpl.played_at, gb.name AS bundle_name
       FROM game_plays gpl
       JOIN game_prizes gp ON gp.id = gpl.game_prize_id
       JOIN game_bundles gb ON gb.id = gpl.bundle_id
       WHERE gpl.phone = $1
       ORDER BY gpl.played_at DESC`,
      [phone]
    );
    return rows;
  } catch {
    return [];
  }
}

// ── Stats helpers ─────────────────────────────────────────────────────────────

function computeStats(
  claims: ClaimWithPrize[],
  ticketClaims: TicketClaim[],
) {
  const totalVisits = claims.length + ticketClaims.length;

  const totalSpent = ticketClaims.reduce((sum, t) => sum + Number(t.amount ?? 0), 0);

  // Favorite prize type: most common prize_name
  const prizeFreq: Record<string, number> = {};
  for (const c of claims) prizeFreq[c.prize_name] = (prizeFreq[c.prize_name] ?? 0) + 1;
  let favPrize: string | null = null;
  let favCount = 0;
  for (const [name, count] of Object.entries(prizeFreq)) {
    if (count > favCount) { favCount = count; favPrize = name; }
  }

  // Avg time between visits (days) using claims + ticket dates combined
  const allDates = [
    ...claims.map(c => new Date(c.claimed_at).getTime()),
    ...ticketClaims.map(t => new Date(t.claimed_at).getTime()),
  ].sort((a, b) => a - b);

  let avgDaysBetween: number | null = null;
  if (allDates.length >= 2) {
    const gaps: number[] = [];
    for (let i = 1; i < allDates.length; i++) {
      gaps.push((allDates[i] - allDates[i - 1]) / (1000 * 60 * 60 * 24));
    }
    avgDaysBetween = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);
  }

  return { totalVisits, totalSpent, favPrize, avgDaysBetween };
}

function buildTimeline(
  claims: ClaimWithPrize[],
  ticketClaims: TicketClaim[],
  gamePlays: Array<{ id: string; prize_name: string; game_type: string; played_at: string; bundle_name: string | null }>,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const c of claims) {
    events.push({
      id: `claim-${c.id}`,
      date: c.claimed_at,
      type: 'claim',
      icon: 'gift',
      description: `Reclamó: ${c.prize_name}`,
      meta: c.restaurant_name ?? c.prize_location ?? undefined,
    });
    if (c.status === 'delivered' && c.delivered_at) {
      events.push({
        id: `delivered-${c.id}`,
        date: c.delivered_at,
        type: 'delivered',
        icon: 'check',
        description: `Cobró: ${c.prize_name}`,
        meta: c.delivered_by ? `por ${c.delivered_by}` : (c.restaurant_name ?? undefined),
      });
    }
  }

  for (const t of ticketClaims) {
    events.push({
      id: `ticket-${t.id}`,
      date: t.claimed_at,
      type: 'ticket',
      icon: 'receipt',
      description: `Ticket $${Number(t.amount).toLocaleString('es-MX')} → ganó: ${t.prize_name}`,
      meta: t.location ?? undefined,
    });
  }

  for (const g of gamePlays) {
    const gameLabel = g.bundle_name ?? g.game_type;
    events.push({
      id: `game-${g.id}`,
      date: g.played_at,
      type: 'game',
      icon: 'slot',
      description: `Jugó ${gameLabel} y ganó: ${g.prize_name}`,
    });
  }

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return events;
}

// ── Icon components (inline SVG to avoid deps) ────────────────────────────────

function IconGift() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconReceipt() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M3 10h18" />
    </svg>
  );
}
function IconSlot() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  );
}

function EventIcon({ icon }: { icon: string }) {
  if (icon === 'check') return <IconCheck />;
  if (icon === 'receipt') return <IconReceipt />;
  if (icon === 'slot') return <IconSlot />;
  return <IconGift />;
}

function eventIconBg(type: TimelineEvent['type']) {
  if (type === 'delivered') return 'bg-green-100 text-green-600';
  if (type === 'ticket') return 'bg-orange-100 text-orange-600';
  if (type === 'game') return 'bg-purple-100 text-purple-600';
  return 'bg-orange-100 text-orange-600';
}

function eventEmoji(type: TimelineEvent['type']) {
  if (type === 'delivered') return '';
  if (type === 'ticket') return '';
  if (type === 'game') return '';
  return '';
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ phone: string }>;
}) {
  const { phone: rawPhone } = await params;
  const phone = decodeURIComponent(rawPhone);

  const [claims, customerPoints, stampCards, ticketClaims, gamePlays] = await Promise.all([
    getClaimsByContact(phone),
    getCustomerPoints(phone),
    getStampCardsByPhone(phone),
    getTicketClaimsByPhone(phone),
    getGamePlaysByPhone(phone),
  ]);

  // Resolve identity: pull from first claim if no customerPoints row
  const name = claims[0]?.full_name ?? ticketClaims[0]?.full_name ?? phone;
  const email = claims[0]?.email ?? '';
  const memberSince =
    claims.length > 0
      ? [...claims].sort((a, b) => new Date(a.claimed_at).getTime() - new Date(b.claimed_at).getTime())[0].claimed_at
      : ticketClaims.length > 0
      ? [...ticketClaims].sort((a, b) => new Date(a.claimed_at).getTime() - new Date(b.claimed_at).getTime())[0].claimed_at
      : null;

  const tier = customerPoints?.tier ?? 'bronze';
  const totalPoints = customerPoints?.total_points ?? 0;
  const tierInfo = getTierInfo(totalPoints);

  if (!claims.length && !ticketClaims.length && !customerPoints) {
    notFound();
  }

  const timeline = buildTimeline(claims, ticketClaims, gamePlays);
  const stats = computeStats(claims, ticketClaims);

  // Active stamp card (most recent incomplete one)
  const activeStampCard: StampCard | undefined = stampCards.find(sc => !sc.completed_at);

  return (
    <div className="min-h-screen admin-bg">
      <div style={{ height: '2px', width: '100%', background: 'linear-gradient(90deg,#2563EB,#0891B2,#38BDF8,#0891B2,#2563EB)' }} />
      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* Back link */}
        <Link
          href="/admin/registros"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-[#2563EB] mb-6 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a Registros
        </Link>

        {/* ── Header card ── */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-[0_1px_2px_rgba(28,25,23,0.04),_0_4px_16px_rgba(28,25,23,0.06)] p-6 mb-6">
          <div className="flex items-start gap-5 flex-wrap">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shrink-0"
              style={{ background: 'linear-gradient(135deg,#2563EB,#0891B2)', boxShadow: '0 4px 14px rgba(37,99,235,0.30)' }}
            >
              {name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-2xl font-extrabold text-[#1C1917] tracking-tight">{name}</h1>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${tierBadgeClass(tier)}`}>
                  {tierLabel(tier)}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-stone-500">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {phone}
                </span>
                {email && (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {email}
                  </span>
                )}
                {memberSince && (
                  <span className="flex items-center gap-1.5 text-stone-400 text-xs">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Miembro desde {formatDateShort(memberSince)}
                  </span>
                )}
              </div>
            </div>

            {/* Points */}
            <div className="text-right shrink-0">
              <p className="text-3xl font-black text-[#2563EB]">{totalPoints.toLocaleString('es-MX')}</p>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">puntos totales</p>
              {customerPoints && (
                <p className="text-xs text-stone-400 mt-0.5">{customerPoints.lifetime_points.toLocaleString('es-MX')} de por vida</p>
              )}
            </div>
          </div>

          {/* Stamp card progress */}
          {activeStampCard && (
            <div className="mt-5 pt-5 border-t border-[#E8E3DC]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Tarjeta de Sellos</p>
                <p className="text-xs text-stone-500">{activeStampCard.stamps_count} / {activeStampCard.stamps_required}</p>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {Array.from({ length: activeStampCard.stamps_required }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs ${
                      i < activeStampCard.stamps_count
                        ? 'bg-[#2563EB] border-[#2563EB] text-white'
                        : 'border-stone-200 text-stone-300'
                    }`}
                  >
                    {i < activeStampCard.stamps_count ? '✓' : '·'}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tier progress + benefits */}
          <div className="mt-5 pt-5 border-t border-[#E8E3DC]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Nivel {tierLabel(tier)}</p>
              {tierInfo.next ? (
                <p className="text-xs text-stone-500">
                  {tierInfo.pointsToNext.toLocaleString('es-MX')} pts para nivel {TIER_LABELS[tierInfo.next]}
                </p>
              ) : (
                <p className="text-xs text-stone-500">Nivel máximo alcanzado</p>
              )}
            </div>
            <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  tier === 'gold' ? 'bg-yellow-400' : tier === 'silver' ? 'bg-slate-400' : 'bg-[#2563EB]'
                }`}
                style={{ width: `${tierInfo.progressPct}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {tierInfo.benefits.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1.5 bg-stone-50 text-stone-600 text-xs font-medium px-2.5 py-1 rounded-full border border-stone-200"
                >
                  ✓ {b}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Visitas totales', value: stats.totalVisits.toString(), color: 'bg-stone-50 border-stone-200 text-stone-700' },
            { label: 'Total gastado', value: stats.totalSpent > 0 ? `$${stats.totalSpent.toLocaleString('es-MX')}` : '—', color: 'bg-orange-50 border-orange-200 text-orange-700' },
            { label: 'Premio favorito', value: stats.favPrize ?? '—', color: 'bg-orange-50 border-orange-200 text-orange-700' },
            { label: 'Días entre visitas', value: stats.avgDaysBetween != null ? `~${stats.avgDaysBetween}d` : '—', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-60">{s.label}</p>
              <p className="text-lg font-extrabold leading-tight truncate">{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Timeline ── */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-[0_1px_2px_rgba(28,25,23,0.04),_0_4px_16px_rgba(28,25,23,0.06)] overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-[#E8E3DC] flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-[#1C1917] uppercase tracking-wider">Historial del cliente</h2>
            <span className="ml-auto text-xs text-stone-400 font-mono">{timeline.length} eventos</span>
          </div>

          {timeline.length === 0 ? (
            <div className="px-5 py-12 text-center text-stone-400 text-sm">Sin actividad registrada</div>
          ) : (
            <div className="divide-y divide-[#F0EDE8]">
              {timeline.map((ev) => (
                <div key={ev.id} className="flex items-start gap-4 px-5 py-4 hover:bg-[#FAFAF9] transition-colors">
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${eventIconBg(ev.type)}`}>
                    <EventIcon icon={ev.icon} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1C1917]">
                      <span className="mr-1.5">{eventEmoji(ev.type)}</span>
                      {ev.description}
                    </p>
                    {ev.meta && <p className="text-xs text-stone-400 mt-0.5 truncate">{ev.meta}</p>}
                  </div>

                  {/* Date */}
                  <p className="text-xs text-stone-400 whitespace-nowrap shrink-0 pt-0.5">{formatDate(ev.date)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── AI prize recommendation ── */}
        <div className="mb-6">
          <PrizeRecommendation phone={phone} />
        </div>

        {/* ── AI generated collectible card ── */}
        <div className="mb-6">
          <AiCardGenerator phone={phone} tier={tier} />
        </div>

        {/* ── Send message placeholder ── */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-[0_1px_2px_rgba(28,25,23,0.04),_0_4px_16px_rgba(28,25,23,0.06)] p-5">
          <h2 className="text-sm font-extrabold text-[#1C1917] uppercase tracking-wider mb-3">Enviar mensaje interno</h2>
          <SendMessageForm phone={phone} name={name} />
        </div>

      </div>
    </div>
  );
}

