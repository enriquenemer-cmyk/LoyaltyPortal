'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

/* ─────────────────────────────────────────────
   SOUND UTILITIES (Web Audio API, no imports)
───────────────────────────────────────────── */
function getAudioCtx(): AudioContext | null {
  try { return new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; }
}
function playTone(ctx: AudioContext, freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.25) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  o.start(); o.stop(ctx.currentTime + dur);
}
function playWinFanfare() {
  const ctx = getAudioCtx(); if (!ctx) return;
  [523,659,784,1047].forEach((f, i) => setTimeout(() => playTone(ctx, f, 0.3, 'sine', 0.3), i * 120));
}
function playSlotSpin(stop: { current: boolean }) {
  const ctx = getAudioCtx(); if (!ctx) return;
  const freqs = [400,500,600,700,800]; let i = 0;
  const iv = setInterval(() => {
    if (stop.current) { clearInterval(iv); return; }
    playTone(ctx, freqs[i % freqs.length], 0.05, 'square', 0.15); i++;
  }, 60);
}
function playWheelSpin() {
  const ctx = getAudioCtx(); if (!ctx) return;
  playTone(ctx, 80, 4, 'sawtooth', 0.2);
}
function playKickSound() {
  const ctx = getAudioCtx(); if (!ctx) return;
  playTone(ctx, 200, 0.05, 'square', 0.4);
  setTimeout(() => [300,400,350,250].forEach((f,i) => setTimeout(() => playTone(ctx, f, 0.1, 'sine', 0.1), i*80)), 100);
}
function playScratchSound(ctx: AudioContext | null) {
  if (!ctx) return;
  playTone(ctx, 800 + Math.random() * 400, 0.03, 'sawtooth', 0.05);
}

function isMuted(): boolean {
  try { return localStorage.getItem('games_muted') === 'true'; } catch { return false; }
}

/* ─────────────────────────────────────────────
   FOOD CONFETTI
───────────────────────────────────────────── */
function FoodConfetti({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!active || !ref.current) return;
    const canvas = ref.current;
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const emojis = ['🌯','🎁','⭐','🏆','🎉','🌶️','🍹','✨'];
    const ps = Array.from({length: 28}, () => ({
      x: Math.random() * canvas.width, y: -30,
      vy: 2 + Math.random() * 4, vx: (Math.random() - 0.5) * 3,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      rot: Math.random() * 6.28, rotV: (Math.random() - 0.5) * 0.2,
      size: 22 + Math.random() * 18,
    }));
    let frame: number, t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t++; if (t > 200) return;
      ps.forEach(p => {
        p.y += p.vy; p.x += p.vx; p.vy += 0.08; p.rot += p.rotV;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.font = p.size + 'px serif'; ctx.textAlign = 'center';
        ctx.fillText(p.emoji, 0, 0); ctx.restore();
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [active]);
  return <canvas ref={ref} style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:1000}} />;
}

/* ─────────────────────────────────────────────
   MUTE BUTTON
───────────────────────────────────────────── */
function MuteButton() {
  const [muted, setMuted] = useState(false);
  useEffect(() => { setMuted(isMuted()); }, []);
  function toggle() {
    const next = !muted;
    setMuted(next);
    try { localStorage.setItem('games_muted', String(next)); } catch {}
  }
  return (
    <button
      onClick={toggle}
      title={muted ? 'Activar sonido' : 'Silenciar'}
      style={{
        position: 'absolute', top: 8, right: 8,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 8,
        color: 'white',
        fontSize: 18,
        width: 36, height: 36,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10,
      }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}

/* ─────────────────────────────────────────────
   INSTRUCTION OVERLAY
───────────────────────────────────────────── */
function InstructionOverlay({
  icon,
  text,
  extra,
  onDismiss,
}: {
  icon: string;
  text: string;
  extra?: React.ReactNode;
  onDismiss: () => void;
}) {
  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        borderRadius: 'inherit',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 16,
          padding: '24px 20px',
          maxWidth: 260,
          textAlign: 'center',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontSize: 44, marginBottom: 10 }}>{icon}</div>
        <p style={{ color: '#1c1917', fontSize: 15, fontWeight: 700, lineHeight: 1.5, margin: '0 0 12px' }}>
          {text}
        </p>
        {extra}
        <button
          onClick={onDismiss}
          style={{
            marginTop: 12,
            padding: '10px 24px',
            borderRadius: 10,
            background: '#E8521A',
            color: 'white',
            fontWeight: 800,
            fontSize: 14,
            border: 'none',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          ¡Entendido!
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SLOTS GAME
───────────────────────────────────────────── */
function SlotsGame({ prizeName, onWin }: { prizeName: string; onWin: () => void }) {
  const SYMBOLS = ['🌯', '🎁', '⭐', '🏆', '💰', '🎰'];
  const WIN_SYMBOL = '🌯';
  const WIN_IDX = SYMBOLS.indexOf(WIN_SYMBOL);

  type SlotState = 'instructing' | 'idle' | 'spinning' | 'won';
  const [state, setState] = useState<SlotState>('instructing');
  const [stopped, setStopped] = useState([false, false, false]);

  useEffect(() => {
    const t = setTimeout(() => setState((s) => s === 'instructing' ? 'idle' : s), 2500);
    return () => clearTimeout(t);
  }, []);
  const [showBtn, setShowBtn] = useState(false);
  const spinStop = useRef(false);

  const SYMBOL_H = 64;

  const reelRef = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];

  function spin() {
    if (state === 'instructing') { setState('idle'); return; }
    if (state !== 'idle') return;
    setState('spinning');
    setStopped([false, false, false]);
    spinStop.current = false;
    if (!isMuted()) playSlotSpin(spinStop);

    const stopTimes = [1500, 2100, 2700];
    stopTimes.forEach((delay, i) => {
      setTimeout(() => {
        setStopped((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
        if (i === 2) {
          spinStop.current = true;
          setTimeout(() => {
            setState('won');
            if (!isMuted()) playWinFanfare();
            setTimeout(() => setShowBtn(true), 900);
          }, 300);
        }
      }, delay);
    });
  }

  const totalSymbols = SYMBOLS.length * 4;
  const winPos = -(WIN_IDX + SYMBOLS.length * 2) * SYMBOL_H;

  return (
    <div style={{ textAlign: 'center', padding: '0 16px' }}>
      <style>{`
        @keyframes reelSpin {
          0%   { transform: translateY(0px); }
          100% { transform: translateY(-${totalSymbols * SYMBOL_H}px); }
        }
        @keyframes flash {
          0%,100% { opacity:1 } 50% { opacity:0.3 }
        }
        @keyframes bounce {
          0%,100%{transform:scale(1)} 30%{transform:scale(1.4)} 60%{transform:scale(0.9)} 80%{transform:scale(1.1)}
        }
        @keyframes starFall {
          0%   { transform: translateY(-30px) rotate(0deg); opacity:1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity:0; }
        }
        @keyframes slideUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>

      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 20 }}>
        Vas a ganar: <strong style={{ color: '#fbbf24' }}>{prizeName}</strong>
      </p>

      <div style={{
        background: '#1C1917',
        border: '3px solid #44403c',
        borderRadius: 20,
        padding: '24px 16px',
        maxWidth: 340,
        margin: '0 auto',
        boxShadow: '0 0 40px rgba(232,82,26,0.3), inset 0 2px 0 rgba(255,255,255,0.05)',
        position: 'relative',
      }}>
        {state === 'instructing' && (
          <InstructionOverlay
            icon="🎰"
            text="Toca el botón para girar los rodillos"
            extra={
              <div style={{ fontSize: 28, animation: 'bounceDown 0.8s ease-in-out infinite' }}>
                <style>{`@keyframes bounceDown{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}`}</style>
                ↓
              </div>
            }
            onDismiss={() => setState('idle')}
          />
        )}
        <MuteButton />
        <div style={{ fontSize: 14, fontWeight: 800, color: '#E8521A', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>
          🎰 Tragamonedas
        </div>

        <div style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'center',
          background: '#0c0a09',
          borderRadius: 12,
          padding: '12px 8px',
          border: '2px solid #292524',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', left: 0, right: 0,
            top: '50%', height: 2,
            background: 'rgba(232,82,26,0.6)',
            pointerEvents: 'none',
          }} />

          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: 80,
              height: SYMBOL_H,
              overflow: 'hidden',
              borderRadius: 8,
              background: '#1a1614',
              border: `2px solid ${state === 'won' ? '#E8521A' : '#292524'}`,
              boxShadow: state === 'won' ? '0 0 12px rgba(232,82,26,0.5)' : 'none',
              transition: 'border-color 0.3s, box-shadow 0.3s',
            }}>
              <div
                ref={reelRef[i]}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  transition: stopped[i] ? 'transform 0.4s cubic-bezier(0.22,1,0.36,1)' : 'none',
                  transform: state === 'idle'
                    ? `translateY(${winPos}px)`
                    : stopped[i]
                      ? `translateY(${winPos}px)`
                      : undefined,
                  animation: state === 'spinning' && !stopped[i]
                    ? `reelSpin 0.${4 - i}s linear infinite`
                    : 'none',
                }}
              >
                {Array.from({ length: 4 }, () => SYMBOLS).flat().map((sym, j) => (
                  <div key={j} style={{
                    height: SYMBOL_H,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 32,
                    filter: state === 'spinning' && !stopped[i] ? 'blur(2px)' : 'none',
                  }}>{sym}</div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {state === 'won' && (
          <div style={{ animation: 'flash 0.4s 2, bounce 0.6s 0.5s ease-out both', marginTop: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#E8521A', letterSpacing: '0.05em' }}>
              ¡¡GANASTE!!
            </div>
            <div style={{ fontSize: 24 }}>🎉🎊🎉</div>
          </div>
        )}

        {state !== 'won' && (
          <button
            onClick={spin}
            disabled={state === 'spinning'}
            style={{
              width: '100%',
              marginTop: 20,
              padding: '14px 0',
              borderRadius: 12,
              background: state === 'spinning' ? '#78350f' : '#E8521A',
              color: 'white',
              fontWeight: 900,
              fontSize: 18,
              border: 'none',
              cursor: state === 'spinning' ? 'not-allowed' : 'pointer',
              opacity: state === 'spinning' ? 0.7 : 1,
              letterSpacing: '0.05em',
              transition: 'background 0.2s',
            }}
          >
            {state === 'spinning' ? '⏳ Girando...' : '🎰 JALAR'}
          </button>
        )}

        {showBtn && (
          <button
            onClick={onWin}
            style={{
              width: '100%',
              marginTop: 12,
              padding: '14px 0',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              color: '#1c1917',
              fontWeight: 900,
              fontSize: 16,
              border: 'none',
              cursor: 'pointer',
              animation: 'slideUp 0.5s ease-out',
              letterSpacing: '0.03em',
            }}
          >
            Ver tu premio →
          </button>
        )}
      </div>

      <FoodConfetti active={state === 'won'} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROULETTE GAME
───────────────────────────────────────────── */
function RouletteGame({ prizeName, onWin }: { prizeName: string; onWin: () => void }) {
  type RouletteState = 'instructing' | 'idle' | 'spinning' | 'won';
  const [state, setState] = useState<RouletteState>('instructing');
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setState((s) => s === 'instructing' ? 'idle' : s), 2500);
    return () => clearTimeout(t);
  }, []);
  const [showBtn, setShowBtn] = useState(false);

  const SEGMENTS = 8;
  const LABELS = ['¡PREMIO!', 'Gira\notra vez', 'Inténtalo', 'Casi...', 'Sigue\narriba', 'Casi\nganas', 'Última\nchance', 'Gira más'];
  const COLORS = ['#E8521A', '#c2410c', '#ea580c', '#b45309', '#d97706', '#92400e', '#f97316', '#a16207'];
  const WIN_SEGMENT = 0;

  const segAngle = 360 / SEGMENTS;
  const fullSpins = (5 + Math.floor(Math.random() * 3)) * 360;
  const targetAngle = fullSpins + (360 - WIN_SEGMENT * segAngle - segAngle / 2);

  function spin() {
    if (state === 'instructing') { setState('idle'); return; }
    if (state !== 'idle') return;
    setState('spinning');
    setRotation(targetAngle);
    if (!isMuted()) playWheelSpin();
    setTimeout(() => {
      setState('won');
      if (!isMuted()) playWinFanfare();
      setTimeout(() => setShowBtn(true), 800);
    }, 4200);
  }

  function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
    const rad = (angle - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function segPath(i: number) {
    const start = i * segAngle;
    const end = start + segAngle;
    const cx = 100, cy = 100, r = 95;
    const s = polarToCartesian(cx, cy, r, start);
    const e = polarToCartesian(cx, cy, r, end);
    const large = segAngle > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
  }

  function textPos(i: number) {
    const mid = (i + 0.5) * segAngle;
    return polarToCartesian(100, 100, 62, mid);
  }

  return (
    <div style={{ textAlign: 'center', padding: '0 16px' }}>
      <style>{`
        @keyframes glowPulse {
          0%,100%{box-shadow:0 0 20px rgba(232,82,26,0.5)}
          50%{box-shadow:0 0 50px rgba(232,82,26,0.9)}
        }
        @keyframes winPop {
          0%{transform:scale(0);opacity:0}
          60%{transform:scale(1.2)}
          100%{transform:scale(1);opacity:1}
        }
        @keyframes slideUp2 {
          from{opacity:0;transform:translateY(16px)}
          to{opacity:1;transform:translateY(0)}
        }
      `}</style>

      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 20 }}>
        Vas a ganar: <strong style={{ color: '#fbbf24' }}>{prizeName}</strong>
      </p>

      <div style={{
        background: '#1C1917',
        border: '3px solid #44403c',
        borderRadius: 20,
        padding: '24px 16px',
        maxWidth: 340,
        margin: '0 auto',
        boxShadow: state === 'won' ? '0 0 40px rgba(232,82,26,0.6)' : '0 0 40px rgba(0,0,0,0.4)',
        transition: 'box-shadow 0.5s',
        position: 'relative',
      }}>
        {state === 'instructing' && (
          <InstructionOverlay
            icon="🎡"
            text="Toca GIRAR para hacer girar la ruleta"
            onDismiss={() => setState('idle')}
          />
        )}
        <MuteButton />
        <div style={{ fontSize: 14, fontWeight: 800, color: '#E8521A', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>
          🎡 Ruleta de la Suerte
        </div>

        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div style={{
            position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderTop: '22px solid #fbbf24',
            zIndex: 10,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
          }} />
          <div style={{
            width: 220, height: 220,
            borderRadius: '50%',
            border: '4px solid #292524',
            overflow: 'hidden',
            transform: `rotate(${rotation}deg)`,
            transition: state === 'spinning' ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
            boxShadow: state === 'won' ? '0 0 30px rgba(232,82,26,0.7)' : 'none',
          }}>
            <svg viewBox="0 0 200 200" width="220" height="220">
              {Array.from({ length: SEGMENTS }).map((_, i) => (
                <g key={i}>
                  <path d={segPath(i)} fill={COLORS[i]} stroke="#1C1917" strokeWidth="1" />
                  <text
                    x={textPos(i).x}
                    y={textPos(i).y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="9"
                    fontWeight="800"
                    transform={`rotate(${(i + 0.5) * segAngle}, ${textPos(i).x}, ${textPos(i).y})`}
                    style={{ userSelect: 'none' }}
                  >
                    {i === 0 ? '⭐' : ''}{LABELS[i].split('\n').map((line, li) => (
                      <tspan key={li} x={textPos(i).x} dy={li === 0 ? (LABELS[i].includes('\n') ? '-5' : '0') : '12'}>{line}</tspan>
                    ))}
                  </text>
                </g>
              ))}
              <circle cx="100" cy="100" r="12" fill="#1C1917" stroke="#44403c" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {state === 'won' && (
          <div style={{ animation: 'winPop 0.5s ease-out', marginTop: 16 }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#fbbf24' }}>⭐ ¡PREMIO! ⭐</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 }}>¡Caíste en el segmento dorado!</div>
          </div>
        )}

        {state !== 'won' && (
          <button
            onClick={spin}
            disabled={state === 'spinning'}
            style={{
              width: '100%',
              marginTop: 20,
              padding: '14px 0',
              borderRadius: 12,
              background: state === 'spinning' ? '#78350f' : '#E8521A',
              color: 'white',
              fontWeight: 900,
              fontSize: 18,
              border: 'none',
              cursor: state === 'spinning' ? 'not-allowed' : 'pointer',
              opacity: state === 'spinning' ? 0.7 : 1,
              transition: 'background 0.2s',
            }}
          >
            {state === 'spinning' ? '⏳ Girando...' : '🎡 GIRAR'}
          </button>
        )}

        {showBtn && (
          <button
            onClick={onWin}
            style={{
              width: '100%',
              marginTop: 12,
              padding: '14px 0',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              color: '#1c1917',
              fontWeight: 900,
              fontSize: 16,
              border: 'none',
              cursor: 'pointer',
              animation: 'slideUp2 0.5s ease-out',
            }}
          >
            Ver tu premio →
          </button>
        )}
      </div>

      <FoodConfetti active={state === 'won'} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   PENALTY GAME
───────────────────────────────────────────── */
function PenaltyGame({ prizeName, onWin }: { prizeName: string; onWin: () => void }) {
  type PenaltyState = 'instructing' | 'idle' | 'kicking' | 'goal';
  const [state, setState] = useState<PenaltyState>('instructing');
  const [ballPos, setBallPos] = useState({ x: 50, y: 85 });

  useEffect(() => {
    const t = setTimeout(() => setState((s) => s === 'instructing' ? 'idle' : s), 2500);
    return () => clearTimeout(t);
  }, []);
  const [keeperPos, setKeeperPos] = useState(50);
  const [showBtn, setShowBtn] = useState(false);

  const ZONES = [
    { x: 20, y: 25 }, { x: 50, y: 25 }, { x: 80, y: 25 },
    { x: 20, y: 65 }, { x: 50, y: 65 }, { x: 80, y: 65 },
  ];

  function kick(zone: { x: number; y: number }) {
    if (state === 'instructing') { setState('idle'); return; }
    if (state !== 'idle') return;
    setState('kicking');
    if (!isMuted()) playKickSound();

    const keeperTarget = zone.x < 50 ? 80 : zone.x > 50 ? 20 : (Math.random() > 0.5 ? 15 : 85);
    setKeeperPos(keeperTarget);
    setBallPos({ x: zone.x, y: zone.y });

    setTimeout(() => {
      setState('goal');
      if (!isMuted()) playWinFanfare();
      setTimeout(() => setShowBtn(true), 800);
    }, 700);
  }

  return (
    <div style={{ textAlign: 'center', padding: '0 16px' }}>
      <style>{`
        @keyframes netShake {
          0%,100%{transform:skewX(0)} 25%{transform:skewX(-3deg)} 75%{transform:skewX(3deg)}
        }
        @keyframes goalPop {
          0%{transform:scale(0) rotate(-10deg);opacity:0}
          60%{transform:scale(1.3) rotate(2deg)}
          100%{transform:scale(1) rotate(0);opacity:1}
        }
        @keyframes slideUp3 {
          from{opacity:0;transform:translateY(16px)}
          to{opacity:1;transform:translateY(0)}
        }
        @keyframes confetti2 {
          0%{transform:translateY(-20px) rotate(0);opacity:1}
          100%{transform:translateY(80vh) rotate(720deg);opacity:0}
        }
      `}</style>

      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 20 }}>
        Vas a ganar: <strong style={{ color: '#fbbf24' }}>{prizeName}</strong>
      </p>

      <div style={{
        background: '#1C1917',
        border: '3px solid #44403c',
        borderRadius: 20,
        padding: '24px 16px',
        maxWidth: 340,
        margin: '0 auto',
        position: 'relative',
      }}>
        {state === 'instructing' && (
          <InstructionOverlay
            icon="⚽"
            text="Elige una zona de la portería para patear"
            extra={
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginTop: 4 }}>
                {['↖', '↑', '↗', '↙', '↓', '↘'].map((arrow, i) => (
                  <span key={i} style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, borderRadius: 6,
                    background: 'rgba(232,82,26,0.15)', border: '1px dashed rgba(232,82,26,0.5)',
                    fontSize: 16, color: '#E8521A', fontWeight: 700,
                  }}>{arrow}</span>
                ))}
              </div>
            }
            onDismiss={() => setState('idle')}
          />
        )}
        <MuteButton />
        <div style={{ fontSize: 14, fontWeight: 800, color: '#E8521A', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>
          ⚽ Penales
        </div>

        {(state === 'idle' || state === 'instructing') && (
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 12 }}>
            Elige dónde disparar
          </p>
        )}

        <div style={{ position: 'relative', margin: '0 auto', maxWidth: 300 }}>
          <div style={{
            background: 'linear-gradient(180deg, #166534 0%, #15803d 40%, #16a34a 100%)',
            borderRadius: '12px 12px 0 0',
            height: 160,
            position: 'relative',
            overflow: 'hidden',
            animation: state === 'goal' ? 'netShake 0.4s 1' : 'none',
          }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{
                position: 'absolute', left: `${i*20}%`, top: 0, bottom: 0, width: '20%',
                background: i % 2 === 0 ? 'rgba(0,0,0,0.05)' : 'transparent',
              }} />
            ))}

            <div style={{
              position: 'absolute',
              top: 8, left: '10%', right: '10%',
              height: 90,
              border: '4px solid white',
              borderBottom: 'none',
              borderRadius: '4px 4px 0 0',
              zIndex: 2,
            }}>
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'repeating-linear-gradient(0deg,rgba(255,255,255,0.15) 0,rgba(255,255,255,0.15) 1px,transparent 1px,transparent 12px),repeating-linear-gradient(90deg,rgba(255,255,255,0.15) 0,rgba(255,255,255,0.15) 1px,transparent 1px,transparent 12px)',
              }} />
            </div>

            <div style={{
              position: 'absolute',
              top: 28,
              left: `calc(${keeperPos}% - 16px)`,
              fontSize: 28,
              zIndex: 3,
              transition: 'left 0.35s cubic-bezier(0.22,1,0.36,1)',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
            }}>🧤</div>

            <div style={{
              position: 'absolute',
              left: `calc(${ballPos.x}% - 14px)`,
              top: `calc(${ballPos.y}% - 14px)`,
              fontSize: 26,
              zIndex: 4,
              transition: state === 'kicking' || state === 'goal' ? 'left 0.5s ease-in, top 0.5s ease-in' : 'none',
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))',
            }}>⚽</div>

            {state === 'goal' && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(232,82,26,0.3)',
                zIndex: 5,
                pointerEvents: 'none',
              }} />
            )}

            {(state === 'idle' || state === 'instructing') && ZONES.map((z, i) => (
              <button
                key={i}
                onClick={() => kick(z)}
                style={{
                  position: 'absolute',
                  left: `${z.x - 14}%`,
                  top: `${z.y - 14}%`,
                  width: '28%',
                  height: '28%',
                  background: 'rgba(232,82,26,0.12)',
                  border: '1px dashed rgba(232,82,26,0.4)',
                  borderRadius: 6,
                  cursor: 'pointer',
                  zIndex: 10,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(232,82,26,0.35)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(232,82,26,0.12)')}
              />
            ))}
          </div>

          <div style={{
            background: '#14532d',
            height: 30,
            borderRadius: '0 0 12px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} />
          </div>
        </div>

        {state === 'goal' && (
          <div style={{ animation: 'goalPop 0.5s ease-out', marginTop: 16 }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#E8521A' }}>⚽ ¡GOOOOOL!</div>
            <div style={{ color: '#fbbf24', fontSize: 18, fontWeight: 900 }}>¡GANASTE!</div>
          </div>
        )}

        {(state === 'idle' || state === 'instructing') && (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 12 }}>
            Toca una zona del arco para disparar
          </p>
        )}

        {showBtn && (
          <button
            onClick={onWin}
            style={{
              width: '100%',
              marginTop: 16,
              padding: '14px 0',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              color: '#1c1917',
              fontWeight: 900,
              fontSize: 16,
              border: 'none',
              cursor: 'pointer',
              animation: 'slideUp3 0.5s ease-out',
            }}
          >
            Ver tu premio →
          </button>
        )}
      </div>

      <FoodConfetti active={state === 'goal'} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   SCRATCH GAME
───────────────────────────────────────────── */
function ScratchGame({ prizeName, onWin }: { prizeName: string; onWin: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [instructing, setInstructing] = useState(true);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setInstructing(false), 2500);
    return () => clearTimeout(t);
  }, []);
  const [showBtn, setShowBtn] = useState(false);
  const isDrawing = useRef(false);
  const totalPixels = useRef(0);
  const autoRevealDone = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const CARD_W = 280;
  const CARD_H = 140;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    grad.addColorStop(0, '#d97706');
    grad.addColorStop(0.3, '#fbbf24');
    grad.addColorStop(0.6, '#f59e0b');
    grad.addColorStop(1, '#b45309');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦ RASCA AQUÍ ✦', CARD_W / 2, CARD_H / 2);

    totalPixels.current = CARD_W * CARD_H;
  }, []);

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CARD_W / rect.width;
    const scaleY = CARD_H / rect.height;
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function scratch(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing.current || revealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!isMuted()) {
      if (!audioCtxRef.current) audioCtxRef.current = getAudioCtx();
      playScratchSound(audioCtxRef.current);
    }

    const { x, y } = getPos(e, canvas);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fill();

    if (!autoRevealDone.current) {
      const data = ctx.getImageData(0, 0, CARD_W, CARD_H).data;
      let transparent = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 128) transparent++;
      }
      const pct = transparent / (CARD_W * CARD_H);
      if (pct > 0.6) {
        autoRevealDone.current = true;
        revealAll(canvas, ctx);
      }
    }
  }

  function revealAll(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    let opacity = 1;
    const interval = setInterval(() => {
      opacity -= 0.05;
      canvas.style.opacity = String(Math.max(0, opacity));
      if (opacity <= 0) {
        clearInterval(interval);
        setRevealed(true);
        if (!isMuted()) playWinFanfare();
        setTimeout(() => setShowBtn(true), 600);
      }
    }, 30);
  }

  return (
    <div style={{ textAlign: 'center', padding: '0 16px' }}>
      <style>{`
        @keyframes prizeReveal {
          0%{transform:scale(0.8);opacity:0}
          60%{transform:scale(1.05)}
          100%{transform:scale(1);opacity:1}
        }
        @keyframes slideUp4 {
          from{opacity:0;transform:translateY(16px)}
          to{opacity:1;transform:translateY(0)}
        }
        @keyframes shimmerPrize {
          0%{background-position:-200% center}
          100%{background-position:200% center}
        }
      `}</style>

      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 20 }}>
        Vas a ganar: <strong style={{ color: '#fbbf24' }}>{prizeName}</strong>
      </p>

      <div style={{
        background: '#1C1917',
        border: '3px solid #44403c',
        borderRadius: 20,
        padding: '24px 16px',
        maxWidth: 340,
        margin: '0 auto',
        position: 'relative',
      }}>
        {instructing && (
          <InstructionOverlay
            icon="🎫"
            text="Rasca la tarjeta con el dedo para revelar tu premio"
            extra={
              <div style={{ marginTop: 4 }}>
                <style>{`
                  @keyframes scratchFinger {
                    0%{transform:translate(0,0) rotate(-20deg)}
                    50%{transform:translate(20px,8px) rotate(-10deg)}
                    100%{transform:translate(0,0) rotate(-20deg)}
                  }
                `}</style>
                <span style={{ fontSize: 32, display: 'inline-block', animation: 'scratchFinger 1s ease-in-out infinite' }}>👆</span>
              </div>
            }
            onDismiss={() => setInstructing(false)}
          />
        )}
        <MuteButton />
        <div style={{ fontSize: 14, fontWeight: 800, color: '#E8521A', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>
          🃏 Rasca y Gana
        </div>

        {!revealed && (
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 12 }}>
            Rasca la tarjeta dorada para revelar tu premio
          </p>
        )}

        <div style={{ position: 'relative', width: CARD_W, height: CARD_H, margin: '0 auto', borderRadius: 12, overflow: 'hidden', userSelect: 'none' }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, #1a0a00, #2d1500)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            animation: revealed ? 'prizeReveal 0.5s ease-out' : 'none',
          }}>
            <div style={{ fontSize: 28 }}>🎉</div>
            <div style={{
              fontSize: 15,
              fontWeight: 900,
              background: 'linear-gradient(135deg, #E8521A, #fbbf24)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'shimmerPrize 2s linear infinite',
              padding: '0 8px',
              textAlign: 'center',
            }}>
              {prizeName}
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#fbbf24', letterSpacing: '0.1em' }}>¡GANASTE!</div>
          </div>

          <canvas
            ref={canvasRef}
            width={CARD_W}
            height={CARD_H}
            style={{
              position: 'absolute', inset: 0,
              cursor: 'crosshair',
              borderRadius: 12,
              touchAction: 'none',
              width: '100%',
              height: '100%',
            }}
            onMouseDown={() => { isDrawing.current = true; }}
            onMouseUp={() => { isDrawing.current = false; }}
            onMouseLeave={() => { isDrawing.current = false; }}
            onMouseMove={scratch}
            onTouchStart={(e) => { e.preventDefault(); isDrawing.current = true; }}
            onTouchEnd={() => { isDrawing.current = false; }}
            onTouchMove={(e) => { e.preventDefault(); scratch(e); }}
          />
        </div>

        {showBtn && (
          <button
            onClick={onWin}
            style={{
              width: '100%',
              marginTop: 20,
              padding: '14px 0',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              color: '#1c1917',
              fontWeight: 900,
              fontSize: 16,
              border: 'none',
              cursor: 'pointer',
              animation: 'slideUp4 0.5s ease-out',
            }}
          >
            Ver tu premio →
          </button>
        )}
      </div>

      <FoodConfetti active={revealed} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   ANALYTICS HELPERS
───────────────────────────────────────────── */
async function analyticsStart(gameType: string, bundleId?: string | null): Promise<string | null> {
  try {
    const res = await fetch('/api/game-analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', game_type: gameType, bundle_id: bundleId ?? null }),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d.session_id ?? null;
  } catch {
    return null;
  }
}

async function analyticsComplete(sessionId: string, timeSpent: number, prizeWon?: string | null): Promise<void> {
  try {
    await fetch('/api/game-analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete', session_id: sessionId, time_spent: timeSpent, prize_won: prizeWon ?? null }),
    });
  } catch {
    // non-blocking
  }
}

async function analyticsClaim(sessionId: string): Promise<void> {
  try {
    await fetch('/api/game-analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'claim', session_id: sessionId }),
    });
  } catch {
    // non-blocking
  }
}

/* ─────────────────────────────────────────────
   GATEWAY
───────────────────────────────────────────── */
export default function GameGateway({
  gameType,
  prizeName,
  bundleId,
  onWin,
  onFormSubmit,
}: {
  gameType: string;
  prizeName: string;
  bundleId?: string | null;
  onWin: () => void;
  onFormSubmit?: (sessionId: string | null) => void;
}) {
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
    analyticsStart(gameType, bundleId).then((sid) => {
      sessionIdRef.current = sid;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleWin() {
    const elapsed = Date.now() - startTimeRef.current;
    if (sessionIdRef.current) {
      analyticsComplete(sessionIdRef.current, elapsed, prizeName);
    }
    onWin();
    if (onFormSubmit && sessionIdRef.current) {
      // Notify parent so it can call analyticsClaim after form submit
      onFormSubmit(sessionIdRef.current);
    }
  }

  if (gameType === 'slots')    return <SlotsGame    prizeName={prizeName} onWin={handleWin} />;
  if (gameType === 'roulette') return <RouletteGame  prizeName={prizeName} onWin={handleWin} />;
  if (gameType === 'penalty')  return <PenaltyGame   prizeName={prizeName} onWin={handleWin} />;
  if (gameType === 'scratch')  return <ScratchGame   prizeName={prizeName} onWin={handleWin} />;
  return null;
}

// Export helper so parent (ClaimForm/PrizeClient) can mark form submission
export { analyticsClaim };
