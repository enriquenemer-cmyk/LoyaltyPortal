'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

type Prize = { label: string; color: string };

const DEFAULT_PRIZES: Prize[] = [
  { label: '10% descuento', color: '#2563EB' },
  { label: 'Postre gratis', color: '#7C3AED' },
  { label: 'Bebida gratis', color: '#059669' },
  { label: '¡Inténtalo de nuevo!', color: '#94A3B8' },
  { label: '20% descuento', color: '#D97706' },
  { label: 'Premio sorpresa', color: '#DC2626' },
  { label: 'Puntos dobles', color: '#0891B2' },
  { label: 'Appetizer gratis', color: '#65A30D' },
];

function SpinWheel({ prizes }: { prizes: Prize[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [angle, setAngle] = useState(0);
  const animRef = useRef<number | null>(null);

  const n = prizes.length;
  const arc = (2 * Math.PI) / n;

  function draw(currentAngle: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = cx - 10;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    prizes.forEach((p, i) => {
      const start = currentAngle + i * arc;
      const end = start + arc;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px system-ui';
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 2;
      const lines = p.label.split(' ');
      lines.forEach((line, li) => {
        ctx.fillText(line, r - 12, li * 14 - (lines.length - 1) * 7);
      });
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#E8E3DC';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pointer
    ctx.beginPath();
    ctx.moveTo(cx + r + 8, cy);
    ctx.lineTo(cx + r - 4, cy - 10);
    ctx.lineTo(cx + r - 4, cy + 10);
    ctx.closePath();
    ctx.fillStyle = '#1C1917';
    ctx.fill();
  }

  useEffect(() => { draw(angle); }, [prizes]);

  function spin() {
    if (spinning) return;
    setSpinning(true);
    setResult(null);

    const totalRotation = (5 + Math.random() * 5) * 2 * Math.PI;
    const duration = 4000;
    const start = performance.now();
    const startAngle = angle;

    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = startAngle + totalRotation * ease;
      draw(current);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setAngle(current % (2 * Math.PI));
        // Pointer is at angle 0 (right side), so winning slice is at -current
        const normalized = (((-current) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const winIdx = Math.floor(normalized / arc) % n;
        setResult(prizes[winIdx].label);
        setSpinning(false);
      }
    }
    animRef.current = requestAnimationFrame(animate);
  }

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <canvas ref={canvasRef} width={300} height={300} className="rounded-full shadow-lg" />
      </div>

      <button
        onClick={spin}
        disabled={spinning}
        className="px-10 py-4 rounded-2xl text-white font-extrabold text-lg shadow-lg disabled:opacity-50 transition-all active:scale-95"
        style={{ background: spinning ? '#64748B' : '#2563EB' }}
      >
        {spinning ? 'Girando...' : result ? 'Girar de nuevo' : '¡Girar!'}
      </button>

      {result && !spinning && (
        <div className="bg-white border-2 border-[#2563EB] rounded-2xl px-8 py-5 text-center shadow-md">
          <p className="text-xs font-bold text-[#2563EB] uppercase tracking-widest mb-1">Ganaste</p>
          <p className="text-2xl font-extrabold text-[#1C1917]">{result}</p>
          <p className="text-xs text-stone-400 mt-2">Muestra esta pantalla al cajero para reclamar</p>
        </div>
      )}
    </div>
  );
}

function RuletaContent() {
  const params = useSearchParams();
  const phone = params.get('phone') ?? '';

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8">
        <p className="text-xs font-bold text-[#2563EB] uppercase tracking-widest mb-1">3E</p>
        <h1 className="text-2xl font-bold text-[#1C1917]">Ruleta de Premios</h1>
        {phone && <p className="text-sm text-stone-400 mt-1">Para: {phone}</p>}
      </div>
      <SpinWheel prizes={DEFAULT_PRIZES} />
    </div>
  );
}

export default function RuletaPage() {
  return <Suspense><RuletaContent /></Suspense>;
}
