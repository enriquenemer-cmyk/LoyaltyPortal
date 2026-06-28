'use client';

interface DayValue {
  label: string;
  value: number;
}

interface Props {
  data: DayValue[];
  valueSuffix?: string;
  formatValue?: (v: number) => string;
}

export default function WeekdayBarChart({ data, valueSuffix = '', formatValue }: Props) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const chartH = 130;
  const barW = 36;
  const gap = 16;
  const totalW = data.length * (barW + gap) - gap;
  const gridLines = [0.25, 0.5, 0.75, 1];

  function fmt(v: number) {
    if (formatValue) return formatValue(v);
    return `${v.toFixed(1)}${valueSuffix}`;
  }

  return (
    <svg
      viewBox={`0 0 ${totalW + 4} ${chartH + 28}`}
      width="100%"
      style={{ maxWidth: totalW + 4, overflow: 'visible' }}
      aria-label="Gráfica por día de la semana"
    >
      <defs>
        <linearGradient id="weekdayBarGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>
      </defs>

      {gridLines.map((frac) => {
        const y = chartH - Math.round(frac * chartH);
        return (
          <line key={frac} x1={0} y1={y} x2={totalW + 4} y2={y}
            stroke="#E8E3DC" strokeWidth="1" strokeDasharray="4 4" opacity="0.7" />
        );
      })}

      {data.map((d, i) => {
        const barH = max === 0 ? 4 : Math.max(Math.round((d.value / max) * chartH), d.value > 0 ? 6 : 0);
        const x = i * (barW + gap);
        const y = chartH - barH;
        return (
          <g key={d.label}>
            <rect x={x} y={0} width={barW} height={chartH} rx={8} fill="#EFF6FF" />
            {barH > 0 && (
              <rect
                x={x} y={y} width={barW} height={barH} rx={7}
                fill="url(#weekdayBarGrad)"
                style={{
                  transformOrigin: `${x + barW / 2}px ${chartH}px`,
                  animation: `bar-grow 0.7s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.08}s both`,
                }}
              />
            )}
            {d.value > 0 && (
              <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="11" fill="#2563EB" fontWeight="800">
                {fmt(d.value)}
              </text>
            )}
            <text x={x + barW / 2} y={chartH + 18} textAnchor="middle" fontSize="11" fill="#94a3b8" fontWeight="500">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
