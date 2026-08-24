'use client';

import { useEffect, useState } from 'react';

interface Item {
  name: string;
  count: number;
  percentage: number;
}

interface Props {
  items: Item[];
}

export default function TopPremiosChart({ items }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <p className="text-xs text-slate-400 font-semibold">Sin datos de los últimos 30 días.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col gap-4">
      {items.map((item, i) => {
        const truncated = item.name.length > 20 ? item.name.slice(0, 20) + '…' : item.name;
        const delay = i * 80;
        return (
          <div key={i} className="flex items-center gap-3">
            {/* Name */}
            <span
              className="text-xs font-semibold text-slate-600 shrink-0"
              style={{ width: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              title={item.name}
            >
              {truncated}
            </span>

            {/* Bar track */}
            <div className="flex-1 bg-slate-100 rounded-full" style={{ height: 8 }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: mounted ? `${item.percentage}%` : '0%',
                  background: 'linear-gradient(90deg, #F97316, #F97316)',
                  transition: `width 0.6s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`,
                  borderRadius: 4,
                  minWidth: item.percentage > 0 ? 4 : 0,
                }}
              />
            </div>

            {/* Count */}
            <span className="text-xs font-black text-slate-700 shrink-0 tabular-nums w-8 text-right">
              {item.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
