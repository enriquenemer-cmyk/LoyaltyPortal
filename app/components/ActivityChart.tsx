'use client';

import { useEffect, useRef, useState } from 'react';

interface DataPoint {
  day: string;
  count: number;
}

interface Props {
  data: DataPoint[];
}

export default function ActivityChart({ data }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; day: string; count: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const WIDTH = 600;
  const HEIGHT = 80;
  const PADDING = { top: 8, right: 8, bottom: 4, left: 8 };
  const plotW = WIDTH - PADDING.left - PADDING.right;
  const plotH = HEIGHT - PADDING.top - PADDING.bottom;

  // Fill in missing days so we always have 14 entries
  const filledData: DataPoint[] = (() => {
    const map = new Map(data.map((d) => [d.day, d.count]));
    const result: DataPoint[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      result.push({ day: iso, count: map.get(iso) ?? 0 });
    }
    return result;
  })();

  const maxVal = Math.max(...filledData.map((d) => d.count), 1);
  const n = filledData.length;

  function xOf(i: number) {
    return PADDING.left + (i / (n - 1)) * plotW;
  }
  function yOf(count: number) {
    return PADDING.top + plotH - (count / maxVal) * plotH;
  }

  const points = filledData.map((d, i) => ({ x: xOf(i), y: yOf(d.count), ...d }));

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath =
    `M${points[0].x},${PADDING.top + plotH} ` +
    points.map((p) => `L${p.x},${p.y}`).join(' ') +
    ` L${points[points.length - 1].x},${PADDING.top + plotH} Z`;

  function formatDay(iso: string) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
  }

  return (
    <div className="relative w-full" style={{ height: HEIGHT }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(249,115,22,0.15)" />
            <stop offset="100%" stopColor="rgba(249,115,22,0)" />
          </linearGradient>
        </defs>

        {/* Fill area */}
        <path d={areaPath} fill="url(#actGrad)" />

        {/* Line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#F97316"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Hover dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="white"
            stroke="#F97316"
            strokeWidth="2"
            style={{ cursor: 'pointer', opacity: tooltip?.day === p.day ? 1 : 0, transition: 'opacity 0.15s' }}
            onMouseEnter={() => setTooltip({ x: p.x, y: p.y, day: p.day, count: p.count })}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}

        {/* Invisible hit areas */}
        {points.map((p, i) => (
          <rect
            key={`hit-${i}`}
            x={p.x - (plotW / n) / 2}
            y={0}
            width={plotW / n}
            height={HEIGHT}
            fill="transparent"
            style={{ cursor: 'crosshair' }}
            onMouseEnter={() => setTooltip({ x: p.x, y: p.y, day: p.day, count: p.count })}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-lg text-xs font-semibold text-slate-700 whitespace-nowrap"
          style={{
            left: `${(tooltip.x / WIDTH) * 100}%`,
            top: tooltip.y < HEIGHT / 2 ? tooltip.y + 12 : tooltip.y - 44,
            transform: 'translateX(-50%)',
          }}
        >
          <span className="text-[#F97316] font-black">{tooltip.count}</span>{' '}
          cobro{tooltip.count !== 1 ? 's' : ''} · {formatDay(tooltip.day)}
        </div>
      )}
    </div>
  );
}
