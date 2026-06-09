import { Suspense } from 'react';
import { getRestaurantById, getTicketTiersByRestaurant, getRestaurantTicketConfig } from '@/lib/db';
import { notFound } from 'next/navigation';
import TicketScanner from './TicketScanner';

export default async function TicketPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) notFound();

  const [tiers, config] = await Promise.all([
    getTicketTiersByRestaurant(restaurantId),
    getRestaurantTicketConfig(restaurantId),
  ]);

  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#1C1917' }} />}>
      <TicketScanner restaurant={restaurant} tiers={tiers} config={config} />
    </Suspense>
  );
}
