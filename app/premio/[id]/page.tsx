import { getPrizeById, getPrizeClaimCount } from '@/lib/db';
import { notFound } from 'next/navigation';
import ClaimForm from './ClaimForm';

type Props = { params: Promise<{ id: string }> };

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

const CONFETTI = [
  { l: '5%',  c: '#fbbf24', s: 10, d: 0,   r: 4,   dur: 5.5, shape: 'circle' },
  { l: '12%', c: '#34d399', s: 7,  d: 0.6,  r: 2,   dur: 6.5, shape: 'rect'   },
  { l: '20%', c: '#f472b6', s: 9,  d: 1.2,  r: 6,   dur: 5,   shape: 'circle' },
  { l: '28%', c: '#818cf8', s: 6,  d: 0.3,  r: 3,   dur: 7,   shape: 'rect'   },
  { l: '36%', c: '#fbbf24', s: 11, d: 1.8,  r: 5,   dur: 6,   shape: 'circle' },
  { l: '45%', c: '#34d399', s: 8,  d: 0.9,  r: 2,   dur: 5.5, shape: 'rect'   },
  { l: '53%', c: '#f472b6', s: 7,  d: 2.1,  r: 4,   dur: 7.5, shape: 'circle' },
  { l: '62%', c: '#fb923c', s: 10, d: 0.4,  r: 3,   dur: 6,   shape: 'rect'   },
  { l: '70%', c: '#818cf8', s: 6,  d: 1.5,  r: 6,   dur: 5,   shape: 'circle' },
  { l: '78%', c: '#fbbf24', s: 9,  d: 0.7,  r: 2,   dur: 6.5, shape: 'rect'   },
  { l: '86%', c: '#34d399', s: 8,  d: 2.5,  r: 4,   dur: 7,   shape: 'circle' },
  { l: '93%', c: '#f472b6', s: 6,  d: 1.0,  r: 3,   dur: 5.5, shape: 'rect'   },
  { l: '15%', c: '#fb923c', s: 5,  d: 3.0,  r: 5,   dur: 8,   shape: 'circle' },
  { l: '40%', c: '#818cf8', s: 7,  d: 2.8,  r: 2,   dur: 6,   shape: 'rect'   },
  { l: '68%', c: '#fbbf24', s: 8,  d: 1.3,  r: 4,   dur: 7,   shape: 'circle' },
  { l: '88%', c: '#34d399', s: 5,  d: 3.5,  r: 3,   dur: 5,   shape: 'rect'   },
];

export default async function PremioPage({ params }: Props) {
  const { id } = await params;
  const prize = await getPrizeById(id);
  if (!prize) notFound();

  const claimCount = await getPrizeClaimCount(id);
  const alreadyClaimed = claimCount > 0;

  const today = new Date().toISOString().split('T')[0];
  const isExpired = today > prize.end_date;
  const isCancelled = prize.cancelled;

  if (isExpired || isCancelled) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(160deg,#150800 0%,#2D1200 45%,#150800 100%)' }}>
        <div className="max-w-sm w-full rounded-3xl p-8 text-center" style={{ background: 'rgba(100,100,100,0.10)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{isCancelled ? '⛔' : '😔'}</div>
          <h2 className="text-2xl font-extrabold text-white mb-3">
            {isCancelled ? 'Este premio fue cancelado' : 'Este premio ha expirado'}
          </h2>
          <p className="text-white/50 text-sm leading-relaxed">
            {isCancelled
              ? 'El establecimiento canceló este premio. Contáctalos para más información.'
              : `Este premio venció el ${formatDate(prize.end_date)}. Ya no es posible reclamarlo.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-20px) rotate(0deg) scale(1);   opacity: 1; }
          70%  { opacity: 0.8; }
          100% { transform: translateY(105vh) rotate(800deg) scale(0.5); opacity: 0; }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 30px rgba(251,191,36,0.4), 0 0 60px rgba(251,191,36,0.2); }
          50%       { box-shadow: 0 0 50px rgba(251,191,36,0.7), 0 0 90px rgba(251,191,36,0.3); }
        }
        @keyframes text-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes ring-expand {
          0%   { transform: scale(0.9); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50%       { transform: translateY(-12px) rotate(1deg); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .prize-hero  { animation: slide-up 0.7s ease-out both; }
        .prize-card  { animation: slide-up 0.7s 0.15s ease-out both; }
        .prize-form  { animation: slide-up 0.7s 0.30s ease-out both; }
        .trophy-icon { animation: float-slow 4s ease-in-out infinite; }
        .ring1 { animation: ring-expand 2s ease-out infinite; }
        .ring2 { animation: ring-expand 2s 0.7s ease-out infinite; }
        .prize-name-text {
          background: linear-gradient(90deg, #fde68a, #fbbf24, #f59e0b, #fb923c, #fbbf24, #fde68a);
          background-size: 300% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: text-shimmer 4s linear infinite;
        }
        .golden-glow { animation: glow-pulse 2.5s ease-in-out infinite; }
        .location-card {
          background: linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(234,88,12,0.18) 100%);
          border: 1px solid rgba(251,191,36,0.40);
        }
        .glass-card {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.11);
          backdrop-filter: blur(10px);
        }
        .steps-line::after {
          content: '';
          position: absolute;
          top: 50%; left: calc(50% + 16px);
          width: calc(100% - 32px);
          height: 1px;
          background: rgba(255,255,255,0.15);
          transform: translateY(-50%);
        }
      `}</style>

      <div className="min-h-screen relative overflow-x-hidden" style={{ background: 'linear-gradient(160deg,#150800 0%,#2D1200 45%,#150800 100%)' }}>

        {/* Confetti */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          {CONFETTI.map((p, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: p.l,
              top: '-30px',
              width: p.s,
              height: p.shape === 'rect' ? p.s * 0.5 : p.s,
              borderRadius: p.shape === 'circle' ? '50%' : p.r,
              background: p.c,
              animation: `confetti-fall ${p.dur}s ${p.d}s ease-in infinite`,
              opacity: 0.85,
            }} />
          ))}
        </div>

        {/* Background glow */}
        <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
          <div style={{ position:'absolute', top:'-10%', right:'-10%', width:700, height:700, background:'radial-gradient(circle, rgba(232,82,26,0.08) 0%, transparent 65%)', borderRadius:'50%' }} />
          <div style={{ position:'absolute', bottom:'-15%', left:'-10%', width:600, height:600, background:'radial-gradient(circle, rgba(194,65,12,0.07) 0%, transparent 65%)', borderRadius:'50%' }} />
          <div style={{ position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)', width:500, height:500, background:'radial-gradient(circle, rgba(251,191,36,0.05) 0%, transparent 60%)', borderRadius:'50%' }} />
        </div>

        <div className="relative z-10 max-w-md mx-auto px-4 pt-10 pb-24">

          {/* ── HERO ── */}
          <div className="prize-hero text-center mb-8">

            {/* Trophy */}
            <div className="relative inline-flex items-center justify-center mb-7">
              <div className="ring1 absolute w-32 h-32 rounded-full border-2 border-yellow-400/30" />
              <div className="ring2 absolute w-32 h-32 rounded-full border-2 border-yellow-400/20" />
              <div
                className="trophy-icon golden-glow relative w-28 h-28 rounded-3xl flex items-center justify-center"
                style={{ background: 'linear-gradient(145deg, #fbbf24 0%, #d97706 60%, #b45309 100%)' }}
              >
                {/* Stars on corners */}
                <span style={{ position:'absolute', top:-10, right:-8, fontSize:20, filter:'drop-shadow(0 0 6px #fbbf24)' }}>✦</span>
                <span style={{ position:'absolute', bottom:-8, left:-10, fontSize:14, filter:'drop-shadow(0 0 6px #fbbf24)' }}>✦</span>
                <span style={{ position:'absolute', top:4, left:-14, fontSize:10, color:'#fde68a' }}>✦</span>

                <svg style={{ width:56, height:56, color:'white', filter:'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
            </div>

            {/* Verified pill */}
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5" style={{ background:'rgba(232,82,26,0.12)', border:'1px solid rgba(232,82,26,0.30)' }}>
              <svg className="w-3.5 h-3.5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-orange-300 text-xs font-bold uppercase tracking-widest">Premio auténtico</span>
            </div>

            {/* Ganaste subtitle */}
            <p className="text-white/40 text-sm font-semibold uppercase tracking-[0.25em] mb-3">
              ¡Felicidades! Ganaste
            </p>

            {/* THE PRIZE NAME — protagonist */}
            <h1 className="prize-name-text text-5xl font-black leading-tight tracking-tight px-2 mb-2" style={{ wordBreak:'break-word' }}>
              {prize.name}
            </h1>

            {/* decorative dots row */}
            <div className="flex items-center justify-center gap-1.5 mt-4">
              {['#fbbf24','#34d399','#f472b6','#818cf8','#fb923c'].map((c, i) => (
                <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:c, opacity:0.7 }} />
              ))}
            </div>
          </div>

          {/* ── INFO CARDS ── */}
          <div className="prize-card space-y-3 mb-5">

            {/* Why */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex gap-3">
                <div style={{ width:40, height:40, borderRadius:10, background:'rgba(251,191,36,0.15)', border:'1px solid rgba(251,191,36,0.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:20 }}>🏆</div>
                <div>
                  <p className="text-yellow-400/70 text-xs font-bold uppercase tracking-widest mb-1.5">Por qué lo ganaste</p>
                  <p className="text-white/90 text-sm leading-relaxed font-medium">{prize.reason}</p>
                </div>
              </div>
            </div>

            {/* What */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex gap-3">
                <div style={{ width:40, height:40, borderRadius:10, background:'rgba(129,140,248,0.15)', border:'1px solid rgba(129,140,248,0.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:20 }}>🎁</div>
                <div>
                  <p className="text-indigo-300/70 text-xs font-bold uppercase tracking-widest mb-1.5">En qué consiste</p>
                  <p className="text-white/90 text-sm leading-relaxed">{prize.description}</p>
                </div>
              </div>
            </div>

            {/* Validity */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Válido desde', value: formatDate(prize.start_date), icon: '📅' },
                { label: 'Válido hasta', value: formatDate(prize.end_date),   icon: '⏳' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="glass-card rounded-2xl p-4 text-center">
                  <span className="text-xl">{icon}</span>
                  <p className="text-white/40 text-xs font-bold uppercase tracking-wider mt-2 mb-1">{label}</p>
                  <p className="text-white font-semibold text-xs leading-snug">{value}</p>
                </div>
              ))}
            </div>

          </div>

          {/* ── STEPS ── */}
          {!alreadyClaimed && (
            <div className="mb-6">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { n:1, label:'Escaneaste el QR',   done:true  },
                  { n:2, label:'Regístrate abajo',    done:false },
                  { n:3, label:'Ve a cobrar',         done:false },
                ].map(({ n, label, done }) => (
                  <div key={n} className="flex flex-col items-center gap-1.5">
                    <div style={{
                      width:32, height:32, borderRadius:'50%',
                      background: done ? 'linear-gradient(135deg,#F97316,#C2410C)' : 'rgba(255,255,255,0.08)',
                      border: done ? 'none' : '1px solid rgba(255,255,255,0.15)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color: done ? 'white' : 'rgba(255,255,255,0.35)',
                      fontSize:13, fontWeight:800,
                    }}>
                      {done ? '✓' : n}
                    </div>
                    <p className="text-xs leading-tight" style={{ color: done ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)' }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── FORM or CLAIMED ── */}
          {alreadyClaimed ? (
            <div className="prize-form rounded-3xl p-8 text-center" style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)' }}>
              <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(239,68,68,0.15)', border:'2px solid rgba(239,68,68,0.35)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-extrabold text-white mb-2">Este QR ya fue usado</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Cada premio puede canjearse <strong className="text-white/75">una sola vez</strong> por seguridad. Si crees que es un error, contacta al establecimiento.
              </p>
            </div>
          ) : (
            <div className="prize-form rounded-3xl overflow-hidden" style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.12)', boxShadow:'0 25px 80px rgba(0,0,0,0.5)' }}>
              <div className="px-6 py-5 text-center" style={{ background:'rgba(232,82,26,0.07)', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-orange-400/60 text-xs uppercase tracking-widest font-bold mb-1">Paso 2 de 3</p>
                <h2 className="text-xl font-extrabold text-white">Regístrate para cobrar</h2>
                <p className="text-white/35 text-sm mt-1">Recibirás un QR personal para presentar en caja</p>
              </div>
              <div className="p-6">
                <ClaimForm prizeId={prize.id} prizeName={prize.name} />
              </div>
            </div>
          )}

          <p className="text-center text-white/15 text-xs mt-10">Premia Tierra · Plataforma de Premios</p>
        </div>
      </div>
    </>
  );
}
