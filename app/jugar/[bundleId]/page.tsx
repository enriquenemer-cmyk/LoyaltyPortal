import { notFound } from 'next/navigation';
import { getGameBundleById, getGamePrizesForBundle } from '@/lib/db';
import GamePlayer from './GamePlayer';

function Unavailable() {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'white', borderRadius: 24, padding: 40, textAlign: 'center', maxWidth: 360, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fef2f2', border: '2px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1C1917', marginBottom: 8 }}>Esta campaña ya no está disponible</h2>
        <p style={{ color: '#78716c', fontSize: 14, lineHeight: 1.6 }}>El establecimiento pausó o finalizó este juego. Pregunta en el mostrador por promociones activas.</p>
      </div>
    </div>
  );
}

export default async function JugarPage({
  params,
}: {
  params: Promise<{ bundleId: string }>;
}) {
  const { bundleId } = await params;
  const bundle = await getGameBundleById(bundleId);
  if (!bundle) notFound();
  if (!bundle.active) return <Unavailable />;

  const prizes = await getGamePrizesForBundle(bundleId);

  return (
    <main className="min-h-screen" style={{ background: '#1C1917' }}>
      <GamePlayer bundle={bundle} prizes={prizes} />
    </main>
  );
}
