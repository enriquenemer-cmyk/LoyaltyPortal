'use client';
import { CurrencyDollarIcon, GiftIcon, SparklesIcon } from '@heroicons/react/24/outline';

import { useState, useEffect, useRef } from 'react';
import type { GameBundle, GamePrize } from '@/lib/db';

type GameState = 'ready' | 'playing' | 'result' | 'claiming' | 'done';

const ORANGE_SHADES = ['#2563EB', '#0891B2', '#0369A1', '#0EA5E9', '#c2410c', '#7DD3FC', '#1E3A8A', '#BAE6FD'];

function RouletteWheel({
  prizes,
  winnerIdx,
  spinning,
  onDone,
}: {
  prizes: GamePrize[];
  winnerIdx: number;
  spinning: boolean;
  onDone: () => void;
}) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;
  const n = prizes.length;
  const segAngle = 360 / n;

  // rotation state
  const [rotation, setRotation] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!spinning) return;
    doneRef.current = false;
    // target: winner segment should land at top (270deg)
    // segment i center is at i * segAngle + segAngle/2
    const winnerCenter = winnerIdx * segAngle + segAngle / 2;
    const targetAngle = 270 - winnerCenter;
    const spins = 5 * 360;
    const finalRotation = spins + targetAngle;
    setRotation(finalRotation);
    const timer = setTimeout(() => {
      if (!doneRef.current) { doneRef.current = true; onDone(); }
    }, 4200);
    return () => clearTimeout(timer);
  }, [spinning]); // eslint-disable-line

  function polarToCart(cx: number, cy: number, r: number, angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function makeSegPath(i: number) {
    const start = i * segAngle;
    const end = start + segAngle;
    const p1 = polarToCart(cx, cy, r, start);
    const p2 = polarToCart(cx, cy, r, end);
    const largeArc = segAngle > 180 ? 1 : 0;
    return `M${cx},${cy} L${p1.x},${p1.y} A${r},${r} 0 ${largeArc} 1 ${p2.x},${p2.y} Z`;
  }

  return (
    <div className="relative flex items-center justify-center">
      {/* pointer */}
      <div
        className="absolute z-10"
        style={{ top: -6, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: '20px solid #2563EB' }}
      />
      <svg
        width={size}
        height={size}
        style={{
          transition: spinning ? 'transform 4s cubic-bezier(0.17,0.67,0.12,0.99)' : 'none',
          transform: `rotate(${rotation}deg)`,
        }}
      >
        {prizes.map((prize, i) => {
          const midAngle = i * segAngle + segAngle / 2;
          const textPos = polarToCart(cx, cy, r * 0.65, midAngle);
          const color = ORANGE_SHADES[i % ORANGE_SHADES.length];
          return (
            <g key={prize.id}>
              <path d={makeSegPath(i)} fill={color} stroke="#1C1917" strokeWidth={1.5} />
              <text
                x={textPos.x}
                y={textPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${midAngle}, ${textPos.x}, ${textPos.y})`}
                fill="#fff"
                fontSize={n <= 4 ? 11 : 9}
                fontWeight="bold"
                style={{ pointerEvents: 'none' }}
              >
                {prize.name.length > 12 ? prize.name.slice(0, 11) + '…' : prize.name}
              </text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={18} fill="#1C1917" stroke="#2563EB" strokeWidth={3} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#2563EB" fontSize={10} fontWeight="bold">PT</text>
      </svg>
    </div>
  );
}

function SlotsGame({
  prizes,
  winnerIdx,
  spinning,
  onDone,
}: {
  prizes: GamePrize[];
  winnerIdx: number;
  spinning: boolean;
  onDone: () => void;
}) {
  const [reels, setReels] = useState([0, 0, 0]);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!spinning) return;
    doneRef.current = false;
    const n = prizes.length;
    let step = 0;
    const interval = setInterval(() => {
      setReels([
        Math.floor(Math.random() * n),
        Math.floor(Math.random() * n),
        Math.floor(Math.random() * n),
      ]);
      step++;
    }, 120);

    // Stop reels sequentially
    setTimeout(() => {
      setReels((r) => [winnerIdx, r[1], r[2]]);
    }, 1800);
    setTimeout(() => {
      setReels((r) => [r[0], winnerIdx, r[2]]);
    }, 2400);
    setTimeout(() => {
      clearInterval(interval);
      setReels([winnerIdx, winnerIdx, winnerIdx]);
      if (!doneRef.current) { doneRef.current = true; onDone(); }
    }, 3000);

    return () => clearInterval(interval);
  }, [spinning]); // eslint-disable-line

  return (
    <div className="flex gap-3 justify-center">
      {reels.map((idx, i) => (
        <div
          key={i}
          className="w-24 h-28 rounded-xl flex items-center justify-center text-center font-bold text-sm border-2"
          style={{ background: '#FFF7F3', borderColor: '#2563EB', color: '#1C1917', padding: 8 }}
        >
          <span style={{ lineHeight: 1.3 }}>
            {prizes[idx]?.name ?? '?'}
          </span>
        </div>
      ))}
    </div>
  );
}

function PenaltyGame({
  prizes,
  winnerIdx,
  spinning,
  onDone,
}: {
  prizes: GamePrize[];
  winnerIdx: number;
  spinning: boolean;
  onDone: () => void;
}) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!spinning && chosen !== null) {
      setTimeout(() => {
        setRevealed(true);
        if (!doneRef.current) { doneRef.current = true; onDone(); }
      }, 1200);
    }
  }, [spinning, chosen]); // eslint-disable-line

  // zones: up to 6 zones in a 2-col grid
  const zones = prizes.slice(0, 6);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Goal */}
      <div className="relative w-64 h-36 border-4 rounded-b-lg flex items-center justify-center" style={{ borderColor: '#2563EB', background: 'rgba(37,99,235,0.08)' }}>
        <span className="text-[#a8a29e] text-sm font-bold tracking-widest uppercase">Portería</span>
        {revealed && chosen !== null && (
          <div className="absolute inset-0 flex items-center justify-center rounded-b-lg" style={{ background: 'rgba(37,99,235,0.9)' }}>
            <span className="text-white font-bold text-lg text-center px-2">¡Gol! {prizes[winnerIdx]?.name}</span>
          </div>
        )}
      </div>
      {/* Zones */}
      <p className="text-[#a8a29e] text-sm">Elige una zona para disparar:</p>
      <div className="grid grid-cols-3 gap-2">
        {zones.map((prize, i) => (
          <button
            key={prize.id}
            disabled={chosen !== null}
            onClick={() => { setChosen(i); }}
            className="h-16 rounded-lg text-xs font-bold text-center border-2 transition-all p-1"
            style={{
              background: chosen === i ? (revealed ? '#2563EB' : '#FFF0E8') : '#FAFAF9',
              borderColor: chosen === i ? '#2563EB' : '#E8E3DC',
              color: chosen === i && revealed ? '#fff' : '#1C1917',
              opacity: chosen !== null && chosen !== i ? 0.4 : 1,
            }}
          >
            {prize.name.length > 14 ? prize.name.slice(0, 13) + '…' : prize.name}
            <div className="text-[10px] mt-0.5 font-normal opacity-70">{prize.probability}%</div>
          </button>
        ))}
      </div>
      {chosen === null && (
        <p className="text-[10px] text-[#78716c]">El resultado ya está determinado — ¡tú decides la zona!</p>
      )}
    </div>
  );
}

function ScratchGame({
  prizes,
  winnerIdx,
  spinning,
  onDone,
}: {
  prizes: GamePrize[];
  winnerIdx: number;
  spinning: boolean;
  onDone: () => void;
}) {
  const [scratched, setScratched] = useState<Set<number>>(new Set());
  const doneRef = useRef(false);

  function scratch(i: number) {
    if (!spinning) return;
    setScratched((prev) => {
      const next = new Set(prev);
      next.add(i);
      return next;
    });
    if (!doneRef.current) {
      doneRef.current = true;
      setTimeout(onDone, 800);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-[#a8a29e] text-sm">Rasca cualquier tarjeta para revelar tu premio:</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {prizes.map((prize, i) => {
          const isScratched = scratched.has(i);
          const isWinner = i === winnerIdx;
          return (
            <button
              key={prize.id}
              onClick={() => scratch(i)}
              disabled={!spinning || scratched.size > 0}
              className="w-28 h-24 rounded-xl border-2 flex flex-col items-center justify-center text-center p-2 text-xs font-bold transition-all"
              style={{
                background: isScratched ? (isWinner ? '#2563EB' : '#FAFAF9') : '#E8E3DC',
                borderColor: isScratched && isWinner ? '#2563EB' : '#E8E3DC',
                color: isScratched && isWinner ? '#fff' : '#1C1917',
                cursor: spinning && scratched.size === 0 ? 'pointer' : 'default',
              }}
            >
              {isScratched ? (
                isWinner ? (
                  <><span className="text-lg mb-1"><SparklesIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span><span>{prize.name}</span></>
                ) : (
                  <span className="text-[#a8a29e]">No premiado</span>
                )
              ) : (
                <span className="text-[#fafaf9] text-lg"><CurrencyDollarIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Confetti() {
  const colors = ['#2563EB', '#0EA5E9', '#7DD3FC', '#E0F2FE', '#fff'];
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-sm opacity-80"
          style={{
            background: colors[i % colors.length],
            left: `${Math.random() * 100}%`,
            top: `-10px`,
            animation: `confettiFall ${1.5 + Math.random() * 2}s linear ${Math.random() * 1}s forwards`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          to { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function GamePlayer({
  bundle,
  prizes,
}: {
  bundle: GameBundle;
  prizes: GamePrize[];
}) {
  const [gameState, setGameState] = useState<GameState>('ready');
  const [winnerIdx, setWinnerIdx] = useState(0);
  const [winnerPrize, setWinnerPrize] = useState<GamePrize | null>(null);
  const [claimForm, setClaimForm] = useState({ full_name: '', phone: '', email: '', location: '' });
  const [submitting, setSubmitting] = useState(false);
  const [folio, setFolio] = useState('');
  const [submittedAt, setSubmittedAt] = useState('');

  async function startGame() {
    // Pre-determine winner from server
    const res = await fetch(`/api/game-bundles/${bundle.id}/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    const idx = prizes.findIndex((p) => p.id === data.game_prize_id);
    setWinnerIdx(idx >= 0 ? idx : 0);
    setWinnerPrize(prizes[idx >= 0 ? idx : 0]);
    setGameState('playing');
  }

  function onGameDone() {
    setTimeout(() => {
      setGameState('result');
      setTimeout(() => setGameState('claiming'), 2500);
    }, 300);
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/game-bundles/${bundle.id}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...claimForm,
          pre_selected_prize_id: winnerPrize?.id,
        }),
      });
      if (res.ok) {
        const f = `PT-${Date.now().toString(36).toUpperCase()}`;
        setFolio(f);
        setSubmittedAt(new Date().toLocaleString('es-ES'));
        setGameState('done');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const labelCls = 'block text-[10px] font-bold text-[#78716c] uppercase tracking-widest mb-1.5';
  const inputCls = [
    'w-full bg-white border border-[#E8E3DC] rounded-xl px-4 py-3.5',
    'text-sm text-[#1C1917] placeholder-[#a8a29e]',
    'focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all',
  ].join(' ');

  const gameLabel = bundle.game_type === 'roulette' ? ' Ruleta'
    : bundle.game_type === 'slots' ? ' Tragamonedas'
    : bundle.game_type === 'penalty' ? ' Penalti'
    : '🃏 Rasca y Gana';

  // ── READY ──
  if (gameState === 'ready') {
    return (
      <div className="min-h-screen" style={{ background: '#FAFAF9' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#2563EB,#0891B2)' }} className="px-5 pt-10 pb-8 text-center">
          <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-2">{gameLabel}</p>
          <h1 className="text-2xl font-black text-white leading-tight">{bundle.name}</h1>
          <p className="text-white/60 text-sm mt-1">3E</p>
        </div>

        <div className="max-w-md mx-auto px-4 py-6 space-y-5">
          {/* Prizes card */}
          <div className="bg-white rounded-2xl border border-[#E8E3DC] p-5" style={{ boxShadow: '0 1px 4px rgba(28,25,23,0.06)' }}>
            <p className="text-[10px] font-bold text-[#a8a29e] uppercase tracking-widest mb-3">¿Qué puedes ganar?</p>
            <div className="flex flex-wrap gap-2">
              {prizes.map((p, i) => {
                const shade = ORANGE_SHADES[i % ORANGE_SHADES.length];
                return (
                  <span
                    key={p.id}
                    className="px-3 py-1.5 rounded-full text-xs font-bold"
                    style={{ background: shade + '18', color: shade, border: `1px solid ${shade}40` }}
                  >
                    {p.name}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Mini roulette preview */}
          {bundle.game_type === 'roulette' && (
            <div className="bg-white rounded-2xl border border-[#E8E3DC] p-4 flex justify-center" style={{ boxShadow: '0 1px 4px rgba(28,25,23,0.06)' }}>
              <div className="opacity-70">
                <RouletteWheel prizes={prizes} winnerIdx={0} spinning={false} onDone={() => {}} />
              </div>
            </div>
          )}

          <button
            onClick={startGame}
            className="w-full py-5 rounded-2xl text-white text-lg font-black transition-all active:scale-95 flex items-center justify-center gap-3"
            style={{ background: 'linear-gradient(135deg,#2563EB,#0891B2)', boxShadow: '0 8px 32px rgba(37,99,235,0.40)' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ¡Jugar ahora!
          </button>
        </div>
      </div>
    );
  }

  // ── PLAYING ──
  if (gameState === 'playing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: '#FAFAF9' }}>
        <div className="w-full max-w-md">
          <p className="text-center text-[#a8a29e] text-xs font-bold uppercase tracking-widest mb-2">{gameLabel}</p>
          <p className="text-center text-[#1C1917] font-extrabold text-lg mb-6">{bundle.name}</p>
          <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6 flex justify-center" style={{ boxShadow: '0 2px 16px rgba(28,25,23,0.08)' }}>
            {bundle.game_type === 'roulette' && (
              <RouletteWheel prizes={prizes} winnerIdx={winnerIdx} spinning={true} onDone={onGameDone} />
            )}
            {bundle.game_type === 'slots' && (
              <SlotsGame prizes={prizes} winnerIdx={winnerIdx} spinning={true} onDone={onGameDone} />
            )}
            {bundle.game_type === 'penalty' && (
              <PenaltyGame prizes={prizes} winnerIdx={winnerIdx} spinning={true} onDone={onGameDone} />
            )}
            {bundle.game_type === 'scratch' && (
              <ScratchGame prizes={prizes} winnerIdx={winnerIdx} spinning={true} onDone={onGameDone} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── RESULT ──
  if (gameState === 'result') {
    return (
      <>
        <Confetti />
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: '#FAFAF9' }}>
          <div className="w-full max-w-md text-center">
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: 'linear-gradient(135deg,#2563EB,#0891B2)', boxShadow: '0 12px 40px rgba(37,99,235,0.45)' }}
            >
              <span className="text-5xl"><GiftIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span>
            </div>
            <p className="text-[10px] font-bold text-[#2563EB] uppercase tracking-widest mb-2">¡Felicidades!</p>
            <h1 className="text-3xl font-black text-[#1C1917] mb-2 leading-tight">{winnerPrize?.name}</h1>
            {winnerPrize?.description && (
              <p className="text-[#78716c] text-base">{winnerPrize.description}</p>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── CLAIMING ──
  if (gameState === 'claiming') {
    return (
      <div className="min-h-screen" style={{ background: '#FAFAF9' }}>
        {/* Prize banner */}
        <div style={{ background: 'linear-gradient(135deg,#2563EB,#0891B2)' }} className="px-5 pt-8 pb-6 text-center">
          <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Tu premio</p>
          <h2 className="text-xl font-black text-white leading-tight">{winnerPrize?.name}</h2>
        </div>

        <div className="max-w-md mx-auto px-4 py-6">
          <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6" style={{ boxShadow: '0 1px 4px rgba(28,25,23,0.06)' }}>
            <p className="text-[#1C1917] font-extrabold text-base mb-1">Completa tus datos</p>
            <p className="text-[#a8a29e] text-sm mb-5">Solo necesitamos tu nombre, teléfono y correo</p>
            <form onSubmit={handleClaim} className="space-y-4">
              <div>
                <label className={labelCls}>Nombre completo</label>
                <input
                  required
                  value={claimForm.full_name}
                  onChange={(e) => setClaimForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Tu nombre completo"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Teléfono</label>
                <div className="relative">
                  <input
                    required
                    type="tel"
                    value={claimForm.phone}
                    onChange={(e) => setClaimForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="Ej: +34 612 345 678"
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Correo electrónico</label>
                <input
                  required
                  type="email"
                  value={claimForm.email}
                  onChange={(e) => setClaimForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="tu@correo.com"
                  className={inputCls}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-xl text-white font-black text-base transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#2563EB,#0891B2)', boxShadow: '0 6px 20px rgba(37,99,235,0.35)' }}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Registrando...
                  </>
                ) : 'Reclamar mi premio →'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── DONE ──
  return (
    <div className="min-h-screen" style={{ background: '#FAFAF9' }}>
      {/* Success header */}
      <div style={{ background: 'linear-gradient(135deg,#059669,#047857)' }} className="px-5 pt-10 pb-8 text-center">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/30">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-white">¡Premio registrado!</h2>
        <p className="text-white/70 text-sm mt-1">Muéstrale este comprobante al cajero</p>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Boarding pass style ticket */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(28,25,23,0.10)' }}>
          <div className="px-5 py-4 border-b border-[#E8E3DC]" style={{ background: '#FAFAF9' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-[#2563EB] uppercase tracking-widest">3E</p>
                <p className="text-[#1C1917] font-extrabold text-base mt-0.5">{bundle.name}</p>
              </div>
              <span className="text-3xl"><GiftIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span>
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            {[
              { label: 'Premio', value: winnerPrize?.name ?? '' },
              { label: 'Nombre', value: claimForm.full_name },
              { label: 'Teléfono', value: claimForm.phone },
              { label: 'Fecha', value: submittedAt },
              { label: 'Folio', value: folio, accent: true },
            ].map(({ label, value, accent }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[#a8a29e] text-sm">{label}</span>
                <span
                  className="text-sm font-bold"
                  style={{ color: accent ? '#2563EB' : '#1C1917' }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
          {/* Dashed divider */}
          <div className="border-t border-dashed border-[#E8E3DC] mx-5" />
          <div className="px-5 py-4 bg-orange-50">
            <p className="text-[#2563EB] text-xs font-bold text-center">
              Presenta este comprobante al cajero para recibir tu premio
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
