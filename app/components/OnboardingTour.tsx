'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';

// Confetti particle types
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

const CONFETTI_COLORS = ['#2563EB', '#0EA5E9', '#38BDF8', '#34d399', '#60a5fa', '#a78bfa', '#f472b6'];

function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;

  const particles: Particle[] = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: -20,
    vx: (Math.random() - 0.5) * 6,
    vy: Math.random() * 4 + 2,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: Math.random() * 8 + 4,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 6,
    opacity: 1,
  }));

  let frame = 0;
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.rotation += p.rotationSpeed;
      if (frame > 100) p.opacity -= 0.015;
      if (p.opacity > 0 && p.y < canvas.height + 20) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
    }
    frame++;
    if (alive) requestAnimationFrame(animate);
    else canvas.remove();
  };
  requestAnimationFrame(animate);
}

// Tour step definitions
interface TourStep {
  id: number;
  message: string;
  targetSelector: string | null; // CSS selector for element to highlight
  position: 'bottom' | 'right' | 'center';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 1,
    message: ' Bienvenido a 3E. Te mostramos cómo funciona en 4 pasos.',
    targetSelector: null,
    position: 'center',
  },
  {
    id: 2,
    message: 'Aquí creas premios QR que tus clientes escanean.',
    targetSelector: '[data-tour="generar-premio"]',
    position: 'right',
  },
  {
    id: 3,
    message: 'Primero configura tu restaurante y comparte el link al cajero.',
    targetSelector: '[data-tour="restaurantes"]',
    position: 'right',
  },
  {
    id: 4,
    message: 'Con esto tus clientes suben su ticket y ganan premios automáticamente.',
    targetSelector: '[data-tour="ticket-scanner"]',
    position: 'right',
  },
  {
    id: 5,
    message: 'Recibirás alertas cuando lleguen nuevos cobros.',
    targetSelector: '[data-tour="notification-bell"]',
    position: 'bottom',
  },
];

interface TooltipPos {
  top: number;
  left: number;
  arrowDir: 'left' | 'top' | 'none';
  arrowOffset: number;
}

function getTooltipPos(el: Element | null, position: TourStep['position']): TooltipPos {
  if (!el || position === 'center') {
    return {
      top: window.innerHeight / 2 - 80,
      left: window.innerWidth / 2 - 160,
      arrowDir: 'none',
      arrowOffset: 0,
    };
  }
  const rect = el.getBoundingClientRect();
  const TOOLTIP_W = 320;
  const TOOLTIP_H = 140;
  const GAP = 12;

  if (position === 'right') {
    return {
      top: Math.min(rect.top + rect.height / 2 - TOOLTIP_H / 2, window.innerHeight - TOOLTIP_H - 16),
      left: Math.min(rect.right + GAP, window.innerWidth - TOOLTIP_W - 16),
      arrowDir: 'left',
      arrowOffset: rect.top + rect.height / 2,
    };
  }
  // bottom
  return {
    top: rect.bottom + GAP,
    left: Math.max(16, Math.min(rect.left + rect.width / 2 - TOOLTIP_W / 2, window.innerWidth - TOOLTIP_W - 16)),
    arrowDir: 'top',
    arrowOffset: rect.left + rect.width / 2,
  };
}

function OnboardingTourInner() {
  // tourStep: 0 = not started/checking, 1-5 = active, -1 = completed
  const [tourStep, setTourStep] = useState(0);
  const [tooltipPos, setTooltipPos] = useState<TooltipPos>({ top: 0, left: 0, arrowDir: 'none', arrowOffset: 0 });
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem('tour_completed') !== 'true') {
        setTourStep(1);
      } else {
        setTourStep(-1);
      }
    } catch {
      setTourStep(-1);
    }
  }, []);

  const updatePosition = useCallback(() => {
    if (tourStep < 1 || tourStep > TOUR_STEPS.length) return;
    const step = TOUR_STEPS[tourStep - 1];
    const el = step.targetSelector ? document.querySelector(step.targetSelector) : null;
    setHighlightRect(el ? el.getBoundingClientRect() : null);
    setTooltipPos(getTooltipPos(el, step.position));
  }, [tourStep]);

  useEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [updatePosition]);

  const finish = useCallback(() => {
    try { localStorage.setItem('tour_completed', 'true'); } catch { /* ignore */ }
    setTourStep(-1);
    launchConfetti();
  }, []);

  const next = useCallback(() => {
    if (tourStep >= TOUR_STEPS.length) {
      finish();
    } else {
      setTourStep((s) => s + 1);
    }
  }, [tourStep, finish]);

  const skip = useCallback(() => {
    try { localStorage.setItem('tour_completed', 'true'); } catch { /* ignore */ }
    setTourStep(-1);
  }, []);

  if (tourStep < 1 || tourStep > TOUR_STEPS.length) return null;

  const currentStep = TOUR_STEPS[tourStep - 1];
  const isLast = tourStep === TOUR_STEPS.length;

  return (
    <>
      {/* Darkened overlay with hole for highlighted element */}
      <div
        className="fixed inset-0 z-[60] pointer-events-none"
        style={{
          background: highlightRect
            ? `radial-gradient(ellipse ${highlightRect.width + 24}px ${highlightRect.height + 24}px at ${highlightRect.left + highlightRect.width / 2}px ${highlightRect.top + highlightRect.height / 2}px, transparent 100%, rgba(0,0,0,0.45) 100%)`
            : 'rgba(0,0,0,0.45)',
        }}
        aria-hidden="true"
      />

      {/* Highlight ring around target */}
      {highlightRect && (
        <div
          className="fixed z-[61] pointer-events-none rounded-xl"
          style={{
            top: highlightRect.top - 6,
            left: highlightRect.left - 6,
            width: highlightRect.width + 12,
            height: highlightRect.height + 12,
            boxShadow: '0 0 0 3px #2563EB, 0 0 0 6px rgba(37,99,235,0.25)',
          }}
          aria-hidden="true"
        />
      )}

      {/* Click-blocker overlay so clicks outside tooltip dismiss nothing accidentally */}
      <div className="fixed inset-0 z-[62]" onClick={skip} aria-hidden="true" />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[63] w-80 bg-white rounded-2xl border border-[#E8E3DC] p-5 select-none"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          boxShadow: '0 8px 40px rgba(28,25,23,0.22)',
          maxWidth: 'calc(100vw - 32px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Arrow */}
        {tooltipPos.arrowDir === 'left' && (
          <div
            className="absolute w-0 h-0 pointer-events-none"
            style={{
              left: -10,
              top: tooltipPos.arrowOffset - tooltipPos.top - 8,
              borderTop: '8px solid transparent',
              borderBottom: '8px solid transparent',
              borderRight: '10px solid white',
              filter: 'drop-shadow(-2px 0 2px rgba(0,0,0,0.08))',
            }}
            aria-hidden="true"
          />
        )}
        {tooltipPos.arrowDir === 'top' && (
          <div
            className="absolute w-0 h-0 pointer-events-none"
            style={{
              top: -10,
              left: tooltipPos.arrowOffset - tooltipPos.left - 8,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderBottom: '10px solid white',
              filter: 'drop-shadow(0 -2px 2px rgba(0,0,0,0.08))',
            }}
            aria-hidden="true"
          />
        )}

        {/* Step counter + skip */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-[#a8a29e] uppercase tracking-widest">
            Paso {tourStep} de {TOUR_STEPS.length}
          </span>
          <button
            onClick={skip}
            className="text-[11px] font-semibold text-[#a8a29e] hover:text-[#78716c] transition-colors"
          >
            Saltar tour
          </button>
        </div>

        {/* Message */}
        <p className="text-sm font-semibold text-[#1C1917] leading-relaxed mb-4">
          {currentStep.message}
        </p>

        {/* Dots + buttons */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-200"
                style={{
                  width: i + 1 === tourStep ? 20 : 8,
                  height: 8,
                  background: i + 1 === tourStep ? '#2563EB' : i + 1 < tourStep ? '#0EA5E9' : '#e7e5e4',
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {tourStep > 1 && (
              <button
                onClick={() => setTourStep((s) => s - 1)}
                className="text-xs font-semibold text-stone-500 hover:text-stone-700 px-3 py-1.5 rounded-lg border border-[#E8E3DC] bg-stone-50 hover:bg-stone-100 transition-colors"
              >
                ← Anterior
              </button>
            )}
            <button
              onClick={isLast ? finish : next}
              className="text-xs font-bold text-white px-4 py-1.5 rounded-lg transition-opacity hover:opacity-90"
              style={{ background: '#2563EB' }}
            >
              {isLast ? '¡Listo!' : 'Siguiente →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function OnboardingTour() {
  const pathname = usePathname();
  // Never show to customers (/premio/) or cashiers (/cajero/)
  const isAdminPage = pathname?.startsWith('/admin') && !pathname?.startsWith('/admin/login');
  if (!isAdminPage) return null;
  return <OnboardingTourInner />;
}
