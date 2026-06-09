import { notFound } from 'next/navigation';
import { getGameBundleById, getGamePrizesForBundle } from '@/lib/db';
import GamePlayer from './GamePlayer';

export default async function JugarPage({
  params,
}: {
  params: Promise<{ bundleId: string }>;
}) {
  const { bundleId } = await params;
  const bundle = await getGameBundleById(bundleId);
  if (!bundle) notFound();

  const prizes = await getGamePrizesForBundle(bundleId);

  return (
    <main className="min-h-screen" style={{ background: '#1C1917' }}>
      <GamePlayer bundle={bundle} prizes={prizes} />
    </main>
  );
}
