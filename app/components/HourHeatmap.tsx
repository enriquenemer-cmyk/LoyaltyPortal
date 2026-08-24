'use client';

import { useState } from 'react';

interface HeatmapHour {
  hour: number;
  count: number;
}

function formatHour(h: number): string {
  if (h === 0) return '12am';
  if (h < 12) return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}

export default function HourHeatmap({ hours }: { hours: HeatmapHour[] }) {
  const [tooltip, setTooltip] = useState<{ hour: number; count: number } | null>(null);
  const maxCount = Math.max(...hours.map((h) => h.count), 1);

  const keyHours = new Set([0, 6, 12, 18]);

  const row1 = hours.slice(0, 12);
  const row2 = hours.slice(12, 24);

  function blockColor(count: number): string {
    if (count === 0) return '#FFF7ED';
    const opacity = 0.15 + 0.85 * (count / maxCount);
    // interpolate from light blue to dark blue
    const r = Math.round(37 + (239 - 37) * (1 - opacity));
    const g = Math.round(99 + (246 - 99) * (1 - opacity));
    const b = Math.round(235 + (255 - 235) * (1 - opacity));
    return `rgba(${r},${g},${b},1)`;
  }

  function textColor(count: number): string {
    if (count === 0) return '#FDBA74';
    const opacity = 0.15 + 0.85 * (count / maxCount);
    return opacity > 0.5 ? 'white' : '#C2410C';
  }

  function renderRow(rowHours: HeatmapHour[]) {
    return (
      <div className="flex gap-1">
        {rowHours.map(({ hour, count }) => {
          const bg = blockColor(count);
          const tc = textColor(count);
          const isKey = keyHours.has(hour);
          return (
            <div key={hour} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
              <div
                className="w-full rounded-lg flex items-center justify-center text-[9px] font-bold cursor-default select-none transition-transform hover:scale-110 relative"
                style={{ height: 36, backgroundColor: bg, color: tc }}
                onMouseEnter={() => setTooltip({ hour, count })}
                onMouseLeave={() => setTooltip(null)}
                title={`${formatHour(hour)}: ${count} cobro${count !== 1 ? 's' : ''}`}
              >
                {count > 0 ? count : ''}
                {tooltip?.hour === hour && (
                  <div
                    className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-20 px-2 py-1 rounded-lg text-[10px] font-semibold text-white whitespace-nowrap pointer-events-none"
                    style={{ background: '#7C2D12', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
                  >
                    {formatHour(hour)}: {count} cobro{count !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
              {isKey && (
                <span className="text-[9px] font-semibold text-[#94a3b8]">{formatHour(hour)}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6" style={{ boxShadow: '0 1px 2px rgba(28,25,23,0.04), 0 4px 16px rgba(28,25,23,0.06)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-[#1C1917]">¿Cuándo canjean más?</h2>
          <p className="text-xs text-[#a8a29e] mt-0.5">Cobros por hora del día (hora de México)</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#a8a29e] font-semibold">Menos</span>
          {['#FFF7ED', '#FED7AA', '#FB923C', '#F97316', '#7C2D12'].map((c) => (
            <div key={c} className="w-4 h-4 rounded" style={{ backgroundColor: c }} />
          ))}
          <span className="text-[10px] text-[#a8a29e] font-semibold">Más</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {renderRow(row1)}
        {renderRow(row2)}
      </div>
    </div>
  );
}
