'use client';

import { useEffect, useState } from 'react';

interface BarItem {
  label: string;
  value: number;
  percentage: number;
  displayValue?: string;
}

interface Props {
  items: BarItem[];
  emptyMessage?: string;
  barColor?: string;
}

export default function HorizontalBarList({ items, emptyMessage, barColor }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6 shadow-sm">
        <p className="text-xs text-[#a8a29e] font-semibold">{emptyMessage ?? 'Sin datos disponibles.'}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6 shadow-sm flex flex-col gap-4">
      {items.map((item, i) => {
        const truncated = item.label.length > 24 ? item.label.slice(0, 24) + '…' : item.label;
        const delay = i * 80;
        return (
          <div key={i} className="flex items-center gap-3">
            <span
              className="text-xs font-semibold text-slate-600 shrink-0"
              style={{ width: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              title={item.label}
            >
              {truncated}
            </span>

            <div className="flex-1 bg-slate-100 rounded-full" style={{ height: 8 }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: mounted ? `${item.percentage}%` : '0%',
                  background: barColor ?? 'linear-gradient(90deg, #2563EB, #0EA5E9)',
                  transition: `width 0.6s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`,
                  borderRadius: 4,
                  minWidth: item.percentage > 0 ? 4 : 0,
                }}
              />
            </div>

            <span className="text-xs font-black text-slate-700 shrink-0 tabular-nums w-12 text-right">
              {item.displayValue ?? item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
