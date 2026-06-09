'use client';

import { useState, useEffect, useRef } from 'react';
import type { GameBundle, GamePrize } from '@/lib/db';

type GameState = 'ready' | 'playing' | 'result' | 'claiming' | 'done';

const ORANGE_SHADES = ['#E8521A', '#F97316', '#EA580C', '#fb923c', '#c2410c', '#fdba74', '#9a3412', '#fed7aa'];

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
        style={{ top: -6, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderTop: '20px solid #E8521A' }}
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
        <circle cx={cx} cy={cy} r={18} fill="#1C1917" stroke="#E8521A" strokeWidth={3} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#E8521A" fontSize={10} fontWeight="bold">PT</text>
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
          style={{ background: '#292524', borderColor: '#E8521A', color: '#fff', padding: 8 }}
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
      <div className="relative w-64 h-36 border-4 rounded-b-lg flex items-center justify-center" style={{ borderColor: '#E8521A', background: 'rgba(232,82,26,0.08)' }}>
        <span className="text-[#a8a29e] text-sm font-bold tracking-widest uppercase">Portería</span>
        {revealed && chosen !== null && (
          <div className="absolute inset-0 flex items-center justify-center rounded-b-lg" style={{ background: 'rgba(232,82,26,0.9)' }}>
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
              background: chosen === i ? (revealed ? '#E8521A' : '#292524') : '#292524',
              borderColor: chosen === i ? '#E8521A' : '#44403c',
              color: '#fff',
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
                background: isScratched ? (isWinner ? '#E8521A' : '#292524') : '#78716c',
                borderColor: isScratched && isWinner ? '#fdba74' : '#44403c',
                color: isScratched ? '#fff' : '#1C1917',
                cursor: spinning && scratched.size === 0 ? 'pointer' : 'default',
              }}
            >
              {isScratched ? (
                isWinner ? (
                  <><span className="text-lg mb-1">✨</span><span>{prize.name}</span></>
                ) : (
                  <span className="text-[#a8a29e]">No premiado</span>
                )
              ) : (
                <span className="text-[#fafaf9] text-lg">🪙</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Confetti() {
  const colors = ['#E8521A', '#fb923c', '#fdba74', '#fde68a', '#fff'];
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

  const labelClass = 'block text-[10px] font-semibold text-[#a8a29e] uppercase tracking-widest mb-1';
  const inputClass = 'w-full bg-[#292524] border border-[#44403c] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#78716c] focus:outline-none focus:ring-1 focus:ring-[#E8521A]/50 focus:border-[#E8521A] transition-colors';

  // ── READY ──
  if (gameState === 'ready') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: '#1C1917' }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#E8521A' }}>
              {bundle.game_type === 'roulette' ? '🎡 Ruleta' : bundle.game_type === 'slots' ? '🎰 Tragamonedas' : bundle.game_type === 'penalty' ? '⚽ Penalti' : '🃏 Rasca y Gana'}
            </p>
            <h1 className="text-2xl font-bold text-white leading-tight">{bundle.name}</h1>
          </div>

          {/* Prize pills */}
          <div className="mb-8">
            <p className="text-xs font-semibold text-[#78716c] uppercase tracking-widest mb-3 text-center">¿Qué puedes ganar?</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {prizes.map((p, i) => {
                const shade = ORANGE_SHADES[i % ORANGE_SHADES.length];
                return (
                  <span
                    key={p.id}
                    className="px-3 py-1.5 rounded-full text-xs font-bold"
                    style={{ background: shade + '22', color: shade, border: `1px solid ${shade}44` }}
                  >
                    {p.name} — {p.probability}%
                  </span>
                );
              })}
            </div>
          </div>

          {/* Mini preview for roulette */}
          {bundle.game_type === 'roulette' && (
            <div className="flex justify-center mb-8 opacity-60">
              <RouletteWheel prizes={prizes} winnerIdx={0} spinning={false} onDone={() => {}} />
            </div>
          )}

          <button
            onClick={startGame}
            className="w-full py-4 rounded-2xl text-white text-lg font-bold transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg,#E8521A,#c2410c)', boxShadow: '0 8px 32px rgba(232,82,26,0.4)' }}
          >
            🎮 ¡Jugar ahora!
          </button>
        </div>
      </div>
    );
  }

  // ── PLAYING ──
  if (gameState === 'playing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: '#1C1917' }}>
        <div className="w-full max-w-md">
          <p className="text-center text-[#a8a29e] text-sm mb-6 font-semibold">{bundle.name}</p>
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
    );
  }

  // ── RESULT ──
  if (gameState === 'result') {
    return (
      <>
        <Confetti />
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: '#1C1917' }}>
          <div className="w-full max-w-md text-center">
            <div className="text-7xl mb-4 animate-bounce">🎉</div>
            <h1 className="text-4xl font-black text-white mb-2">¡GANASTE!</h1>
            <p
              className="text-3xl font-black mb-3 leading-tight"
              style={{ color: '#E8521A' }}
            >
              {winnerPrize?.name}
            </p>
            <p className="text-[#a8a29e] text-base">{winnerPrize?.description}</p>
          </div>
        </div>
      </>
    );
  }

  // ── CLAIMING ──
  if (gameState === 'claiming') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: '#1C1917' }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <p className="text-[#E8521A] font-bold text-sm mb-1">🎁 Tu premio</p>
            <h2 className="text-2xl font-black text-white">{winnerPrize?.name}</h2>
            <p className="text-[#a8a29e] text-sm mt-1">{winnerPrize?.description}</p>
          </div>
          <div className="bg-[#292524] rounded-2xl border border-[#44403c] p-6">
            <p className="text-sm text-[#a8a29e] mb-4">Regístra tus datos para reclamar tu premio:</p>
            <form onSubmit={handleClaim} className="space-y-4">
              <div>
                <label className={labelClass}>Nombre completo <span style={{ color: '#E8521A' }}>*</span></label>
                <input
                  required
                  value={claimForm.full_name}
                  onChange={(e) => setClaimForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Tu nombre"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Teléfono <span style={{ color: '#E8521A' }}>*</span></label>
                <input
                  required
                  type="tel"
                  value={claimForm.phone}
                  onChange={(e) => setClaimForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="10 dígitos"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Correo electrónico <span style={{ color: '#E8521A' }}>*</span></label>
                <input
                  required
                  type="email"
                  value={claimForm.email}
                  onChange={(e) => setClaimForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="tu@email.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Sucursal <span className="font-normal normal-case text-[#78716c]">(opcional)</span></label>
                <input
                  value={claimForm.location}
                  onChange={(e) => setClaimForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="¿En qué sucursal jugarás?"
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60"
                style={{ background: '#E8521A' }}
              >
                {submitting ? 'Registrando...' : 'Reclamar mi premio →'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── DONE ──
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: '#1C1917' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">✅</div>
          <h2 className="text-2xl font-black text-white mb-1">¡Premio registrado!</h2>
          <p className="text-[#a8a29e] text-sm">
            Preséntate con tu nombre y teléfono{claimForm.location ? ` en ${claimForm.location}` : ''} y di que jugaste{' '}
            <strong className="text-white">{bundle.name}</strong>.
          </p>
        </div>
        {/* Confirmation ticket */}
        <div
          className="rounded-2xl border-2 p-5 font-mono"
          style={{ background: '#292524', borderColor: '#E8521A', borderStyle: 'dashed' }}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] font-bold text-[#E8521A] uppercase tracking-widest">Premia Tierra</p>
              <p className="text-white font-bold text-base mt-0.5">{bundle.name}</p>
            </div>
            <span className="text-[#E8521A] text-2xl">🎁</span>
          </div>
          <div className="border-t border-[#44403c] pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#78716c]">Premio</span>
              <span className="text-white font-bold">{winnerPrize?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#78716c]">Nombre</span>
              <span className="text-white">{claimForm.full_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#78716c]">Teléfono</span>
              <span className="text-white">{claimForm.phone}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#78716c]">Fecha</span>
              <span className="text-white">{submittedAt}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#78716c]">Folio</span>
              <span style={{ color: '#E8521A' }} className="font-bold">{folio}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
