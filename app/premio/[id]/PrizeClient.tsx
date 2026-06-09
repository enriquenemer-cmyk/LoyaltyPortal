'use client';

import { useState } from 'react';
import GameGateway from './GameGateway';
import type { Prize } from '@/lib/db';
import ClaimForm from './ClaimForm';
import CountdownBadge from './CountdownBadge';

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

interface PrizeClientProps {
  prize: Prize;
  claimCount: number;
  weeklyCount: number;
  daysLeft: number;
}

export default function PrizeClient({ prize, claimCount, weeklyCount, daysLeft }: PrizeClientProps) {
  const [gameWon, setGameWon] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const alreadyClaimed = claimCount > 0;
  const showGame = !!prize.game_type && !alreadyClaimed && !gameWon;

  function handleWin() {
    setTransitioning(true);
    setTimeout(() => {
      setGameWon(true);
      setTransitioning(false);
    }, 600);
  }

  // Game screen
  if (showGame) {
    return (
      <>
        <style>{`
          @keyframes gameFadeOut {
            from{opacity:1;transform:scale(1)}
            to{opacity:0;transform:scale(0.95)}
          }
          @keyframes celebIn {
            0%{opacity:0;transform:scale(0.8) translateY(10px)}
            60%{transform:scale(1.05) translateY(-4px)}
            100%{opacity:1;transform:scale(1) translateY(0)}
          }
        `}</style>
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #0c0a09 0%, #1c1917 50%, #292524 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 0',
          animation: transitioning ? 'gameFadeOut 0.6s ease-out forwards' : 'none',
        }}>
          <GameGateway
            gameType={prize.game_type!}
            prizeName={prize.name}
            onWin={handleWin}
          />
        </div>
      </>
    );
  }

  // Prize content (after game win or no game)
  const springIn = prize.game_type && gameWon ? 'celebIn 0.7s ease-out' : 'none';

  return (
    <>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes confetti { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(900deg);opacity:0} }
        @keyframes pulseIcon { 0%,100%{transform:scale(1)} 50%{transform:scale(1.25)} }
        @keyframes celebIn {
          0%{opacity:0;transform:scale(0.8) translateY(20px)}
          60%{transform:scale(1.03) translateY(-4px)}
          100%{opacity:1;transform:scale(1) translateY(0)}
        }
        .trophy-anim { animation: float 3.5s ease-in-out infinite; }
        .clock-pulse { animation: pulseIcon 1.4s ease-in-out infinite; display:inline-block; }
        .prize-text {
          background: linear-gradient(135deg, #E8521A 0%, #fb923c 40%, #fbbf24 70%, #E8521A 100%);
          background-size: 200% auto;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          animation: shimmer 3s linear infinite;
        }
        .fade1 { animation: fadeUp 0.6s 0.00s ease-out both; }
        .fade2 { animation: fadeUp 0.6s 0.12s ease-out both; }
        .fade3 { animation: fadeUp 0.6s 0.24s ease-out both; }
        .cp { animation: confetti linear infinite; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#ffffff', animation: springIn }}>

        {/* Win celebration banner */}
        {prize.game_type && gameWon && (
          <div style={{
            background: 'linear-gradient(135deg, #E8521A, #c2410c)',
            padding: '14px 20px',
            textAlign: 'center',
            color: 'white',
            fontWeight: 800,
            fontSize: 15,
            letterSpacing: '0.03em',
          }}>
            🎉 ¡Felicidades! Tu premio está listo
          </div>
        )}

        {/* Confetti */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
          {[
            { l: '7%', c: '#E8521A', s: 8, d: 0, dur: 5 }, { l: '17%', c: '#fbbf24', s: 6, d: 0.7, dur: 6 },
            { l: '28%', c: '#f9a8d4', s: 9, d: 1.3, dur: 4.5 }, { l: '40%', c: '#E8521A', s: 5, d: 0.4, dur: 5.5 },
            { l: '52%', c: '#fbbf24', s: 7, d: 1.8, dur: 5 }, { l: '63%', c: '#a5f3fc', s: 8, d: 0.2, dur: 6.5 },
            { l: '74%', c: '#E8521A', s: 6, d: 1.1, dur: 4 }, { l: '84%', c: '#fbbf24', s: 9, d: 2.0, dur: 5.5 },
            { l: '93%', c: '#f9a8d4', s: 5, d: 0.6, dur: 6 },
          ].map((p, i) => (
            <div key={i} className="cp" style={{
              position: 'absolute', left: p.l, top: '-20px',
              width: p.s, height: p.s * 0.55,
              borderRadius: i % 2 === 0 ? '50%' : 3,
              background: p.c, opacity: 0.4,
              animationDuration: `${p.dur}s`, animationDelay: `${p.d}s`,
            }} />
          ))}
        </div>

        {/* HERO BANNER */}
        <div className="fade1" style={{ position: 'relative', zIndex: 1, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(155deg,#E8521A 0%,#C2410C 45%,#7C2D12 100%)', padding: '52px 24px 96px', textAlign: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'radial-gradient(circle,white 1.5px,transparent 1.5px)', backgroundSize: '30px 30px' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              {weeklyCount > 0 && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.30)', borderRadius: 99, padding: '5px 14px', marginBottom: 14 }}>
                  <span style={{ fontSize: 14 }}>🎉</span>
                  <span style={{ color: 'rgba(255,255,255,0.95)', fontSize: 12, fontWeight: 700 }}>{weeklyCount} canjeados esta semana</span>
                </div>
              )}
              <div className="trophy-anim" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 96, height: 96, borderRadius: 26, marginBottom: 18, background: 'linear-gradient(145deg,#fde68a,#fbbf24,#f59e0b)', boxShadow: '0 12px 40px rgba(0,0,0,0.22),0 0 0 5px rgba(255,255,255,0.18),inset 0 1px 0 rgba(255,255,255,0.35)' }}>
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }}>
                  <path d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 99, padding: '5px 14px', marginBottom: 16 }}>
                <svg width="13" height="13" viewBox="0 0 20 20" fill="#fde68a">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span style={{ color: 'rgba(255,255,255,0.95)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Premio auténtico</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 8 }}>¡Felicidades! Ganaste</p>
              <h1 className="prize-text" style={{ fontSize: prize.name.length > 20 ? 38 : 46, fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.02em', margin: 0, padding: '0 8px', wordBreak: 'break-word' }}>
                {prize.name}
              </h1>
            </div>
          </div>
          <svg viewBox="0 0 1440 100" height="100" fill="none" style={{ display: 'block', width: '100%', marginTop: -2 }}>
            <path d="M0,100 L0,50 C240,100 480,10 720,50 C960,90 1200,10 1440,50 L1440,100 Z" fill="#ffffff" />
          </svg>
          {!alreadyClaimed && daysLeft <= 3 && daysLeft > 0 && (
            <div style={{ background: '#fffbeb', borderTop: '1px solid #fcd34d', borderBottom: '1px solid #fcd34d', padding: '10px 20px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span className="clock-pulse" style={{ fontSize: 18 }}>⏰</span>
              <span style={{ color: '#92400e', fontSize: 13, fontWeight: 700 }}>
                Este premio vence en {daysLeft === 1 ? '1 día' : `${daysLeft} días`} — ¡No lo dejes pasar!
              </span>
            </div>
          )}
        </div>

        {/* CARDS */}
        <div style={{ maxWidth: 420, margin: '0 auto', padding: '0 16px 60px', position: 'relative', zIndex: 1, marginTop: -16 }}>
          <div className="fade2" style={{ position: 'relative', borderRadius: 28, boxShadow: '0 2px 24px rgba(0,0,0,0.07),0 0 0 1px rgba(0,0,0,0.05)', overflow: 'hidden', marginBottom: 14, background: 'white' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle,#F0EDE8 1px,transparent 1px)', backgroundSize: '20px 20px', opacity: 0.3, pointerEvents: 'none', zIndex: 0 }} />
            <div style={{ padding: '20px 22px', borderBottom: '1px solid #F3F4F6', display: 'flex', gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg,#fef3c7,#fde68a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, boxShadow: '0 2px 8px rgba(251,191,36,0.2)' }}>🏆</div>
              <div>
                <p style={{ color: '#E8521A', fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 5 }}>Por qué lo ganaste</p>
                <p style={{ color: '#111', fontSize: 14, fontWeight: 600, lineHeight: 1.55, margin: 0 }}>{prize.reason}</p>
              </div>
            </div>
            <div style={{ padding: '20px 22px', borderBottom: '1px solid #F3F4F6', display: 'flex', gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg,#fed7aa,#fdba74)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, boxShadow: '0 2px 8px rgba(251,146,60,0.2)' }}>🎁</div>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#E8521A', fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 5 }}>En qué consiste</p>
                <p style={{ color: '#444', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{prize.description}</p>
                {prize.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={prize.photo_url} alt={prize.name} style={{ marginTop: 12, width: '100%', maxWidth: 280, borderRadius: 12, objectFit: 'cover', border: '1px solid #F3F4F6' }} />
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              {[
                { emoji: '📅', label: 'Válido desde', val: formatDate(prize.start_date) },
                { emoji: '⏳', label: 'Válido hasta', val: formatDate(prize.end_date) },
              ].map(({ emoji, label, val }, i) => (
                <div key={label} style={{ padding: '16px 18px', textAlign: 'center', borderRight: i === 0 ? '1px solid #F3F4F6' : 'none' }}>
                  <span style={{ fontSize: 22 }}>{emoji}</span>
                  <p style={{ color: '#aaa', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '8px 0 4px' }}>{label}</p>
                  <p style={{ color: '#222', fontSize: 12, fontWeight: 700, lineHeight: 1.4, margin: 0 }}>{val}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <CountdownBadge endDate={prize.end_date} />
          </div>

          <div className="fade3">
            {alreadyClaimed ? (
              <div style={{ background: 'white', borderRadius: 28, padding: 32, textAlign: 'center', boxShadow: '0 2px 24px rgba(0,0,0,0.07)', border: '1px solid #fee2e2' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#fef2f2', border: '2px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#111', marginBottom: 8 }}>QR ya utilizado</h3>
                <p style={{ color: '#888', fontSize: 14, lineHeight: 1.6, margin: 0 }}>Cada premio se canjea <strong style={{ color: '#555' }}>una sola vez</strong>.</p>
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: 28, boxShadow: '0 2px 24px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div style={{ background: '#FAFAF9', padding: '20px 22px', borderBottom: '1px solid #E8E3DC' }}>
                  {/* Step indicators */}
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                    {[
                      { n: 1, label: 'Escaneaste', done: true },
                      { n: 2, label: 'Regístrate', done: false },
                      { n: 3, label: 'Cobra', done: false },
                    ].map(({ n, label, done }, i) => (
                      <div key={n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                        {i < 2 && (
                          <div style={{ position: 'absolute', top: 13, left: '50%', width: '100%', height: 2, background: done ? '#E8521A' : '#E8E3DC', zIndex: 0 }} />
                        )}
                        <div style={{ position: 'relative', zIndex: 1, width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, background: done ? '#E8521A' : 'white', color: done ? 'white' : '#a8a29e', border: done ? 'none' : '2px solid #E8E3DC', marginBottom: 4 }}>
                          {done ? '✓' : n}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: done ? '#E8521A' : '#a8a29e' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1C1917', margin: '0 0 2px' }}>Regístrate para cobrar</h2>
                  <p style={{ color: '#78716c', fontSize: 13, margin: 0 }}>Solo necesitamos tu nombre, teléfono y correo</p>
                </div>
                <div style={{ padding: 22 }}>
                  <ClaimForm prizeId={prize.id} prizeName={prize.name} />
                </div>
              </div>
            )}
          </div>

          <p style={{ textAlign: 'center', color: '#bbb', fontSize: 11, marginTop: 24 }}>Tierra Burrito Bar · Plataforma de Premios</p>
        </div>
      </div>
    </>
  );
}
