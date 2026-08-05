import { getPrizeById, getPrizeClaimCount } from '@/lib/db';
import { notFound } from 'next/navigation';
import { createHmac } from 'crypto';
import type { Metadata } from 'next';
import PrizeClient from './PrizeClient';
import TimeWindowGuard from './TimeWindowGuard';
import ActivationCountdown from './ActivationCountdown';

async function getWeeklyClaimCount(): Promise<number> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/stats/week`, { next: { revalidate: 300 } });
    if (!res.ok) return 0;
    const data = await res.json() as { count: number };
    return data.count ?? 0;
  } catch {
    return 0;
  }
}

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ sig?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const prize = await getPrizeById(id);
  if (!prize) return { title: 'Premio no encontrado' };
  return {
    title: prize.name + ' — 3E',
    description: prize.description,
    openGraph: {
      title: '🎁 ' + prize.name,
      description: 'Gané un premio en 3E: ' + prize.description,
      siteName: '3E · by ENM',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: '🎁 ' + prize.name,
      description: prize.description,
    },
  };
}

export default async function PremioPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { sig } = await searchParams;
  const prize = await getPrizeById(id);
  if (!prize) notFound();

  // HMAC sig verification
  let sigInvalid = false;
  if (sig) {
    const secret = process.env.SESSION_SECRET ?? 'fallback-secret';
    const expected = createHmac('sha256', secret).update(prize.id).digest('hex').slice(0, 16);
    sigInvalid = sig !== expected;
  }

  if (sigInvalid) {
    return (
      <div style={{ minHeight:'100vh', background:'#f8f8f8', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div style={{ background:'white', borderRadius:24, padding:40, textAlign:'center', maxWidth:360, width:'100%', boxShadow:'0 8px 40px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize:56, marginBottom:16 }}>⛔</div>
          <h2 style={{ fontSize:20, fontWeight:900, color:'#111', marginBottom:8 }}>QR inválido</h2>
          <p style={{ color:'#888', fontSize:14, lineHeight:1.6 }}>Este código QR no es auténtico o ha sido alterado.</p>
        </div>
      </div>
    );
  }

  const [claimCount, weeklyCount] = await Promise.all([
    getPrizeClaimCount(id),
    getWeeklyClaimCount(),
  ]);
  const alreadyClaimed = claimCount > 0;
  const today = new Date().toISOString().split('T')[0];
  const isExpired = today > prize.end_date;

  // Urgency: days until expiry
  const endMs = new Date(prize.end_date + 'T23:59:59').getTime();
  const todayMs = new Date(today + 'T00:00:00').getTime();
  const daysLeft = Math.ceil((endMs - todayMs) / (1000 * 60 * 60 * 24));
  const isCancelled = prize.cancelled;

  if (isExpired || isCancelled) {
    return (
      <div style={{ minHeight:'100vh', background:'#f8f8f8', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div style={{ background:'white', borderRadius:24, padding:40, textAlign:'center', maxWidth:360, width:'100%', boxShadow:'0 8px 40px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize:56, marginBottom:16 }}>{isCancelled ? '⛔' : '😔'}</div>
          <h2 style={{ fontSize:20, fontWeight:900, color:'#111', marginBottom:8 }}>
            {isCancelled ? 'Premio cancelado' : 'Premio vencido'}
          </h2>
          <p style={{ color:'#888', fontSize:14, lineHeight:1.6 }}>
            {isCancelled ? 'El establecimiento canceló este premio.' : `Venció el ${new Date(prize.end_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.`}
          </p>
        </div>
      </div>
    );
  }

  // Prize content via client component (handles game gateway + prize reveal)
  const prizeContent = (
    <PrizeClient
      prize={prize}
      claimCount={claimCount}
      weeklyCount={weeklyCount}
      daysLeft={daysLeft}
    />
  );

  // Wrap with time-window guard if configured (client-side check)
  const withTimeGuard = (prize.valid_hours || prize.valid_days) ? (
    <TimeWindowGuard validHours={prize.valid_hours ?? null} validDays={prize.valid_days ?? null}>
      {prizeContent}
    </TimeWindowGuard>
  ) : prizeContent;

  // Wrap with activation countdown if activate_at is set (server pre-check + client countdown)
  if (prize.activate_at) {
    return (
      <div style={{ minHeight:'100vh', background:'#f8f8f8', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <ActivationCountdown activateAt={prize.activate_at}>
          {withTimeGuard}
        </ActivationCountdown>
      </div>
    );
  }

  return withTimeGuard;
}
