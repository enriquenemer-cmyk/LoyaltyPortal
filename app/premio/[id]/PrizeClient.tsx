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
    setTimeout(() => { setGameWon(true); setTransitioning(false); }, 600);
  }

  if (showGame) {
    return (
      <div style={{
        minHeight: '100vh', background: '#FAFAF9',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0',
        animation: transitioning ? 'gameFadeOut 0.6s ease-out forwards' : 'none',
      }}>
        <style>{`@keyframes gameFadeOut{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(0.95)}}`}</style>
        <GameGateway gameType={prize.game_type!} prizeName={prize.name} onWin={handleWin} />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popIn  { 0%{opacity:0;transform:scale(0.92)} 60%{transform:scale(1.02)} 100%{opacity:1;transform:scale(1)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .s1{animation:slideUp .5s .05s ease-out both}
        .s2{animation:slideUp .5s .15s ease-out both}
        .s3{animation:slideUp .5s .25s ease-out both}
        .s4{animation:slideUp .5s .35s ease-out both}
        .badge-pulse{animation:pulse 2s ease-in-out infinite}
      `}</style>

      <div style={{ minHeight: '100vh', background: '#FAFAF9' }}>

        {/* ── HERO ── */}
        <div className="s1" style={{
          background: 'linear-gradient(160deg, #2563EB 0%, #0891B2 50%, #1E3A8A 100%)',
          padding: '48px 24px 40px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Subtle dot pattern */}
          <div aria-hidden style={{ position: 'absolute', inset: 0, opacity: 0.06,
            backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
            backgroundSize: '28px 28px' }} />
          {/* Glow orbs */}
          <div aria-hidden style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent)', pointerEvents: 'none' }} />
          <div aria-hidden style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.08), transparent)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Verified badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 99, padding: '6px 16px', marginBottom: 20 }}>
              <svg width="13" height="13" viewBox="0 0 20 20" fill="#E0F2FE">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              <span style={{ color: 'rgba(255,255,255,0.95)', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Premio auténtico</span>
            </div>

            {/* Prize icon */}
            <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
              </svg>
            </div>

            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>
              ¡Felicidades! Ganaste
            </p>
            <h1 style={{
              color: 'white',
              fontSize: prize.name.length > 22 ? 34 : prize.name.length > 14 ? 40 : 46,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              margin: '0 0 20px',
              padding: '0 8px',
              wordBreak: 'break-word',
            }}>
              {prize.name}
            </h1>

            {/* Weekly social proof */}
            {weeklyCount > 0 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 99, padding: '5px 14px' }}>
                <span style={{ fontSize: 13 }}>🎉</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 600 }}>{weeklyCount} canjeados esta semana</span>
              </div>
            )}
          </div>
        </div>

        {/* ── URGENCY BANNER ── */}
        {!alreadyClaimed && daysLeft <= 3 && daysLeft > 0 && (
          <div className="s1" style={{ background: '#fffbeb', borderBottom: '1px solid #fcd34d', padding: '11px 20px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span className="badge-pulse" style={{ fontSize: 16 }}>⏰</span>
            <span style={{ color: '#1E40AF', fontSize: 13, fontWeight: 700 }}>
              Vence en {daysLeft === 1 ? '1 día' : `${daysLeft} días`} — ¡No lo dejes pasar!
            </span>
          </div>
        )}

        {/* ── CONTENT ── */}
        <div style={{ maxWidth: 440, margin: '0 auto', padding: '20px 16px 60px' }}>

          {/* Info card */}
          <div className="s2" style={{ background: 'white', borderRadius: 24, border: '1px solid #E8E3DC', overflow: 'hidden', marginBottom: 14, boxShadow: '0 2px 16px rgba(28,25,23,0.07)' }}>

            {prize.reason && (
              <div style={{ padding: '18px 20px', borderBottom: '1px solid #F0EDE8', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 14, background: '#EFF6FF', border: '1px solid #BAE6FD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏆</div>
                <div>
                  <p style={{ color: '#2563EB', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>Por qué lo ganaste</p>
                  <p style={{ color: '#1C1917', fontSize: 14, fontWeight: 600, lineHeight: 1.5, margin: 0 }}>{prize.reason}</p>
                </div>
              </div>
            )}

            {prize.description && (
              <div style={{ padding: '18px 20px', borderBottom: '1px solid #F0EDE8', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 14, background: '#EFF6FF', border: '1px solid #BAE6FD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🎁</div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#2563EB', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>En qué consiste</p>
                  <p style={{ color: '#44403c', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{prize.description}</p>
                  {prize.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={prize.photo_url} alt={prize.name} style={{ marginTop: 12, width: '100%', maxWidth: 260, borderRadius: 14, objectFit: 'cover', border: '1px solid #E8E3DC' }} />
                  )}
                </div>
              </div>
            )}

            {/* Validity dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              {[
                { icon: '📅', label: 'Válido desde', val: formatDate(prize.start_date) },
                { icon: '📆', label: 'Válido hasta', val: formatDate(prize.end_date) },
              ].map(({ icon, label, val }, i) => (
                <div key={label} style={{ padding: '16px 18px', textAlign: 'center', borderRight: i === 0 ? '1px solid #F0EDE8' : 'none' }}>
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <p style={{ color: '#a8a29e', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '6px 0 3px' }}>{label}</p>
                  <p style={{ color: '#1C1917', fontSize: 12, fontWeight: 700, lineHeight: 1.4, margin: 0 }}>{val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Countdown */}
          <div className="s3" style={{ textAlign: 'center', marginBottom: 14 }}>
            <CountdownBadge endDate={prize.end_date} />
          </div>

          {/* Claim / Already claimed */}
          <div className="s4">
            {alreadyClaimed ? (
              <div style={{ background: 'white', borderRadius: 24, padding: '32px 24px', textAlign: 'center', boxShadow: '0 2px 16px rgba(28,25,23,0.07)', border: '1px solid #fecaca' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fef2f2', border: '2px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1C1917', marginBottom: 8 }}>QR ya utilizado</h3>
                <p style={{ color: '#78716c', fontSize: 14, lineHeight: 1.6, margin: 0 }}>Cada premio se canjea <strong style={{ color: '#1C1917' }}>una sola vez</strong>.</p>
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: 24, boxShadow: '0 2px 16px rgba(28,25,23,0.07)', border: '1px solid #E8E3DC', overflow: 'hidden' }}>
                {/* Form header */}
                <div style={{ background: '#FAFAF9', padding: '18px 22px', borderBottom: '1px solid #E8E3DC' }}>
                  {/* Stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                    {[
                      { n: 1, label: 'Escaneaste', done: true },
                      { n: 2, label: 'Regístrate', done: false },
                      { n: 3, label: 'Cobra', done: false },
                    ].map(({ n, label, done }, i) => (
                      <div key={n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                        {i < 2 && (
                          <div style={{ position: 'absolute', top: 13, left: '50%', width: '100%', height: 2, background: done ? '#2563EB' : '#E8E3DC', zIndex: 0 }} />
                        )}
                        <div style={{ position: 'relative', zIndex: 1, width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, background: done ? '#2563EB' : 'white', color: done ? 'white' : '#a8a29e', border: done ? 'none' : '2px solid #E8E3DC', marginBottom: 4 }}>
                          {done ? '✓' : n}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: done ? '#2563EB' : '#a8a29e' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1C1917', margin: '0 0 3px' }}>Regístrate para cobrar</h2>
                  <p style={{ color: '#78716c', fontSize: 13, margin: 0 }}>Solo tu nombre, teléfono y correo</p>
                </div>

                <div style={{ padding: '20px 22px' }}>
                  <ClaimForm prizeId={prize.id} prizeName={prize.name} />
                </div>
              </div>
            )}
          </div>

          <p style={{ textAlign: 'center', color: '#c4bfb8', fontSize: 11, marginTop: 24, letterSpacing: '0.04em' }}>
            3E · Plataforma de Premios
          </p>
        </div>
      </div>
    </>
  );
}
