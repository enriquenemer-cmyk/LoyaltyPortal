'use client';
import { BoltIcon, ExclamationTriangleIcon, HandRaisedIcon, RocketLaunchIcon, SparklesIcon } from '@heroicons/react/24/outline';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import RelativeDate from '@/app/components/RelativeDate';
import OnboardingTour from '@/app/components/OnboardingTour';
import { getCache, setCache } from '@/app/components/useDataCache';
import ActivityChart from '@/app/components/ActivityChart';
import TopPremiosChart from '@/app/components/TopPremiosChart';
import HourHeatmap from '@/app/components/HourHeatmap';
import { useScrollReveal } from '@/app/hooks/useScrollReveal';

interface Claim {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: 'pending' | 'delivered';
  claimed_at: string;
  prize_id: string;
  prize_name?: string;
  delivered_by?: string;
}

interface Restaurant {
  id: string;
  name: string;
}

interface Prize {
  id: string;
  name: string;
  cancelled: boolean;
}

interface ExpiringPrize {
  id: string;
  name: string;
  end_date: string;
  claim_count: number;
}

interface DayBar {
  label: string;
  count: number;
}

interface ConversionData {
  total_prizes: number;
  total_claims: number;
  rate: number;
}

interface WeeklyData {
  this_week: number;
  last_week: number;
  change_pct: number;
}

interface AtRiskClient {
  full_name: string;
  phone: string;
  email: string;
  last_visit: string;
  days_ago: number;
  total_claims: number;
}

interface HeatmapHour {
  hour: number;
  count: number;
}

interface ActiveEvent {
  id: string;
  restaurant_id: string;
  restaurant_name: string | null;
  name: string;
  description: string | null;
  multiplier: number;
  starts_at: string;
  ends_at: string;
  active: boolean;
}

function useAnimatedCounter(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return value;
}

const cardShadow = '0 1px 2px rgba(28,25,23,0.04), 0 4px 16px rgba(28,25,23,0.06)';

function StatCard({
  label, value, borderColor, bgColor, textColor, icon, trend, trendLabel, suffix, gradient,
}: {
  label: string;
  value: number;
  borderColor: string;
  bgColor: string;
  textColor: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  trendLabel?: string;
  suffix?: string;
  gradient?: string;
}) {
  const animated = useAnimatedCounter(value);
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3 stagger-item group cursor-default"
      style={{
        background: gradient ?? 'white',
        boxShadow: `0 4px 24px ${borderColor}22, 0 1px 4px rgba(0,0,0,0.04)`,
        transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px) scale(1.02)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 40px ${borderColor}44, 0 4px 12px rgba(0,0,0,0.06)`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 24px ${borderColor}22, 0 1px 4px rgba(0,0,0,0.04)`; }}
    >
      {/* Glow blob */}
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-30 blur-xl pointer-events-none" style={{ background: borderColor }} />
      <div className="flex items-center justify-between relative z-10">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: gradient ? 'rgba(255,255,255,0.75)' : '#78716c' }}>{label}</span>
        <span className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: bgColor, color: textColor }}>
          {icon}
        </span>
      </div>
      <span className="text-4xl font-black tabular-nums relative z-10" style={{ color: gradient ? 'white' : '#1C1917' }}>{animated}{suffix}</span>
      {trend && trendLabel && (
        <div className="flex items-center gap-1 relative z-10" style={{ color: gradient ? 'rgba(255,255,255,0.85)' : (trend === 'up' ? '#059669' : '#dc2626') }}>
          {trend === 'up' ? (
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          ) : (
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          )}
          <span className="text-xs font-semibold">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}

function StatCardGrid({ children, loading }: { children: React.ReactNode; loading: boolean }) {
  const { ref, visible } = useScrollReveal<HTMLDivElement>(0.1);
  return (
    <div
      ref={ref}
      className={`grid grid-cols-2 lg:grid-cols-5 gap-4 ${!loading && visible ? 'scroll-reveal-children-visible' : !loading ? 'scroll-reveal-children' : ''}`}
    >
      {children}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6 flex flex-col gap-3" style={{ boxShadow: cardShadow }}>
      <div className="flex items-center justify-between">
        <div className="skeleton-neutral h-4 w-32" />
        <div className="skeleton-neutral w-10 h-10 rounded-xl" />
      </div>
      <div className="skeleton-neutral h-10 w-20" />
    </div>
  );
}

function BarChart({ data }: { data: DayBar[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const chartH = 130;
  const barW = 32;
  const gap = 14;
  const totalW = data.length * (barW + gap) - gap;
  const gridLines = [0.25, 0.5, 0.75, 1];
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'short' }).charAt(0).toUpperCase() + new Date().toLocaleDateString('es-ES', { weekday: 'short' }).slice(1, 2);

  return (
    <svg
      viewBox={`0 0 ${totalW + 4} ${chartH + 28}`}
      width="100%"
      style={{ maxWidth: totalW + 4, overflow: 'visible' }}
      aria-label="Actividad de los últimos 7 días"
    >
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
        <linearGradient id="barGradToday" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a6b3c" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
        <filter id="barGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {gridLines.map((frac) => {
        const y = chartH - Math.round(frac * chartH);
        return (
          <line key={frac} x1={0} y1={y} x2={totalW + 4} y2={y}
            stroke="#E8E3DC" strokeWidth="1" strokeDasharray="4 4" opacity="0.7" />
        );
      })}

      {data.map((d, i) => {
        const barH = max === 0 ? 4 : Math.max(Math.round((d.count / max) * chartH), d.count > 0 ? 6 : 0);
        const x = i * (barW + gap);
        const y = chartH - barH;
        const isToday = d.label === today;
        const grad = isToday ? 'url(#barGradToday)' : 'url(#barGrad)';
        return (
          <g key={d.label}>
            {/* Track */}
            <rect x={x} y={0} width={barW} height={chartH} rx={8} fill={isToday ? '#EDE9FE' : '#FFF7ED'} />
            {/* Bar with grow animation */}
            {barH > 0 && (
              <>
                <rect
                  x={x} y={y} width={barW} height={barH} rx={7}
                  fill={grad}
                  style={{
                    transformOrigin: `${x + barW / 2}px ${chartH}px`,
                    animation: `bar-grow 0.7s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.08}s both`,
                  }}
                />
                {/* Shine overlay */}
                <rect x={x + 4} y={y + 3} width={barW / 3} height={Math.min(barH - 6, 20)} rx={3}
                  fill="white" opacity="0.2"
                  style={{ transformOrigin: `${x + barW / 2}px ${chartH}px`, animation: `bar-grow 0.7s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.08}s both` }}
                />
              </>
            )}
            {/* Count label */}
            {d.count > 0 && (
              <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="11" fill={isToday ? '#1a6b3c' : '#F97316'} fontWeight="800"
                style={{ animation: `fade-in-up 0.4s ease-out ${i * 0.08 + 0.3}s both` }}>
                {d.count}
              </text>
            )}
            {/* Day label */}
            <text x={x + barW / 2} y={chartH + 18} textAnchor="middle" fontSize="11"
              fill={isToday ? '#1a6b3c' : '#94a3b8'} fontWeight={isToday ? '800' : '500'}>
              {d.label}
            </text>
            {/* Today dot */}
            {isToday && <circle cx={x + barW / 2} cy={chartH + 24} r="2.5" fill="#1a6b3c" />}
          </g>
        );
      })}
    </svg>
  );
}

// ---- Section A: Period Comparison Chart -------------------------------------

function PeriodComparisonChart({ claims }: { claims: Claim[] }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = prevMonthDate.getMonth();

  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
  const maxDays = Math.max(daysInCurrentMonth, daysInPrevMonth);

  const currentCounts: number[] = Array(maxDays + 1).fill(0);
  const prevCounts: number[] = Array(maxDays + 1).fill(0);

  for (const c of claims) {
    const d = new Date(c.claimed_at);
    const y = d.getFullYear();
    const m = d.getMonth();
    const day = d.getDate();
    if (y === currentYear && m === currentMonth) {
      currentCounts[day] = (currentCounts[day] || 0) + 1;
    } else if (y === prevYear && m === prevMonth) {
      prevCounts[day] = (prevCounts[day] || 0) + 1;
    }
  }

  const totalCurrent = currentCounts.reduce((s, v) => s + v, 0);
  const totalPrev = prevCounts.reduce((s, v) => s + v, 0);
  const pctChange = totalPrev > 0
    ? Math.round(((totalCurrent - totalPrev) / totalPrev) * 100)
    : totalCurrent > 0 ? 100 : 0;
  const changeUp = pctChange >= 0;

  const chartH = 100;
  const barW = 8;
  const pairGap = 2;
  const groupGap = 6;
  const pairW = barW * 2 + pairGap;
  const days = Array.from({ length: maxDays }, (_, i) => i + 1);
  const totalW = days.length * (pairW + groupGap) - groupGap;
  const allVals = [...currentCounts.slice(1, maxDays + 1), ...prevCounts.slice(1, maxDays + 1)];
  const maxVal = Math.max(...allVals, 1);

  const currentMonthName = now.toLocaleDateString('es-CO', { month: 'long' });
  const prevMonthName = prevMonthDate.toLocaleDateString('es-CO', { month: 'long' });

  return (
    <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6" style={{ boxShadow: cardShadow }}>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold text-[#1C1917] mb-1">Este mes vs mes anterior</h2>
          <p className="text-xs text-[#6b7280]">Cobros diarios — {currentMonthName} vs {prevMonthName}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-base font-black text-[#1C1917]">
            Este mes: <span style={{ color: '#F97316' }}>{totalCurrent} cobros</span>
          </span>
          <span className="text-xs font-semibold flex items-center gap-1" style={{ color: changeUp ? '#059669' : '#dc2626' }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d={changeUp ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {changeUp ? '+' : ''}{pctChange}% vs {prevMonthName}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: '#F97316' }} />
          <span className="text-[11px] font-semibold text-[#6b7280] capitalize">{currentMonthName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: '#a8a29e' }} />
          <span className="text-[11px] font-semibold text-[#6b7280] capitalize">{prevMonthName}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${totalW + 2} ${chartH + 20}`}
          width="100%"
          style={{ minWidth: Math.min(totalW + 2, 600) }}
          aria-label="Comparativa mensual de cobros"
        >
          {[0.25, 0.5, 0.75, 1].map((frac) => {
            const y = chartH - Math.round(frac * chartH);
            return (
              <line key={frac} x1={0} y1={y} x2={totalW + 2} y2={y}
                stroke="#E8E3DC" strokeWidth="1" strokeDasharray="3 3" />
            );
          })}

          {days.map((day, i) => {
            const curr = currentCounts[day] || 0;
            const prev = prevCounts[day] || 0;
            const x = i * (pairW + groupGap);
            const currH = Math.round((curr / maxVal) * chartH);
            const prevH = Math.round((prev / maxVal) * chartH);
            const showLabel = day === 1 || day % 5 === 0;
            return (
              <g key={day}>
                {/* previous month bar */}
                {prevH > 0 && (
                  <rect
                    x={x} y={chartH - prevH} width={barW} height={prevH} rx={2}
                    fill="#d6d3d1"
                  >
                    <title>Día {day} · {prevMonthName}: {prev} cobro{prev !== 1 ? 's' : ''}</title>
                  </rect>
                )}
                {prevH === 0 && (
                  <rect x={x} y={chartH - 2} width={barW} height={2} rx={1} fill="#e7e5e4" />
                )}
                {/* current month bar */}
                {currH > 0 && (
                  <rect
                    x={x + barW + pairGap} y={chartH - currH} width={barW} height={currH} rx={2}
                    fill="#F97316"
                  >
                    <title>Día {day} · {currentMonthName}: {curr} cobro{curr !== 1 ? 's' : ''}</title>
                  </rect>
                )}
                {currH === 0 && (
                  <rect x={x + barW + pairGap} y={chartH - 2} width={barW} height={2} rx={1} fill="#f5ede8" />
                )}
                {showLabel && (
                  <text x={x + pairW / 2} y={chartH + 14} textAnchor="middle" fontSize="9" fill="#a8a29e">
                    {day}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ---- Section B: Sucursal Performance Heatmap --------------------------------

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function sucursalHeatmapColor(count: number, max: number): string {
  if (count === 0) return '#fafaf9';
  const intensity = count / max;
  if (intensity < 0.2) return '#FFF7ED';
  if (intensity < 0.4) return '#FFF7ED';
  if (intensity < 0.6) return '#FED7AA';
  if (intensity < 0.8) return '#F97316';
  return '#C2410C';
}

function sucursalTextColor(count: number, max: number): string {
  const intensity = max > 0 ? count / max : 0;
  return intensity >= 0.6 ? '#FFF7ED' : '#78716c';
}

function SucursalHeatmap({ claims }: { claims: Claim[] }) {
  // Build set of restaurants from delivered_by field
  const restaurantSet = new Set<string>();
  for (const c of claims) {
    if (c.delivered_by) restaurantSet.add(c.delivered_by);
  }
  const restaurants = Array.from(restaurantSet).sort();

  if (restaurants.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6" style={{ boxShadow: cardShadow }}>
        <h2 className="text-sm font-bold text-[#1C1917] mb-1">Rendimiento por sucursal</h2>
        <p className="text-xs text-[#6b7280] mb-4">Cobros por día de semana y sucursal</p>
        <p className="text-sm text-[#6b7280]">Sin datos de sucursales aún.</p>
      </div>
    );
  }

  // grid[restaurant][weekday 0=Mon..6=Sun]
  const grid: Record<string, number[]> = {};
  for (const r of restaurants) grid[r] = [0, 0, 0, 0, 0, 0, 0];

  for (const c of claims) {
    if (!c.delivered_by) continue;
    const d = new Date(c.claimed_at);
    // JS: 0=Sun, convert to Mon=0..Sun=6
    const jsDay = d.getDay();
    const weekday = jsDay === 0 ? 6 : jsDay - 1;
    grid[c.delivered_by][weekday]++;
  }

  const allValues = restaurants.flatMap((r) => grid[r]);
  const maxVal = Math.max(...allValues, 1);

  const cellW = 52;
  const cellH = 28;

  return (
    <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6" style={{ boxShadow: cardShadow }}>
      <h2 className="text-sm font-bold text-[#1C1917] mb-1">Rendimiento por sucursal</h2>
      <p className="text-xs text-[#6b7280] mb-5">Cobros por día de semana — intensidad de color = volumen</p>

      <div className="overflow-x-auto">
        <table className="border-separate" style={{ borderSpacing: '3px' }}>
          <thead>
            <tr>
              <th className="text-left pr-3 pb-1" style={{ minWidth: 120 }}>
                <span className="text-[10px] font-semibold text-[#6b7280]">Sucursal</span>
              </th>
              {WEEKDAY_LABELS.map((day) => (
                <th key={day} style={{ width: cellW }} className="pb-1">
                  <span className="text-[10px] font-semibold text-[#6b7280]">{day}</span>
                </th>
              ))}
              <th className="pl-3 pb-1">
                <span className="text-[10px] font-semibold text-[#6b7280]">Total</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((restaurant) => {
              const row = grid[restaurant];
              const rowTotal = row.reduce((s, v) => s + v, 0);
              return (
                <tr key={restaurant}>
                  <td className="pr-3 py-0.5">
                    <span className="text-xs font-semibold text-[#1C1917] whitespace-nowrap block max-w-[160px] truncate" title={restaurant}>
                      {restaurant}
                    </span>
                  </td>
                  {row.map((count, wi) => {
                    const bg = sucursalHeatmapColor(count, maxVal);
                    const textCol = sucursalTextColor(count, maxVal);
                    const title = `${restaurant} · ${WEEKDAY_LABELS[wi]} — ${count} cobro${count !== 1 ? 's' : ''}`;
                    return (
                      <td key={wi} title={title}>
                        <div
                          className="rounded-md flex items-center justify-center text-[10px] font-bold cursor-default select-none transition-colors"
                          style={{
                            width: cellW,
                            height: cellH,
                            backgroundColor: bg,
                            color: textCol,
                          }}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      </td>
                    );
                  })}
                  <td className="pl-3">
                    <span className="text-xs font-bold" style={{ color: '#F97316' }}>{rowTotal}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4">
        <span className="text-[10px] text-[#6b7280] font-semibold">Menos</span>
        {['#fafaf9', '#FFF7ED', '#FED7AA', '#F97316', '#C2410C'].map((c) => (
          <div key={c} className="w-5 h-5 rounded" style={{ backgroundColor: c, border: c === '#fafaf9' ? '1px solid #e7e5e4' : undefined }} />
        ))}
        <span className="text-[10px] text-[#6b7280] font-semibold">Más</span>
      </div>
    </div>
  );
}

// ---- Section C: Customer Lifecycle Funnel -----------------------------------

function CustomerLifecycleFunnel({ claims }: { claims: Claim[] }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  // Group all claims by phone
  const byPhone: Record<string, string[]> = {};
  for (const c of claims) {
    if (!byPhone[c.phone]) byPhone[c.phone] = [];
    byPhone[c.phone].push(c.claimed_at);
  }

  // Sort each customer's claims chronologically
  for (const phone of Object.keys(byPhone)) {
    byPhone[phone].sort();
  }

  let firstTimers = 0;
  let returned = 0;
  let loyal = 0;
  let dormant = 0;

  for (const [, dates] of Object.entries(byPhone)) {
    const claimCount = dates.length;
    const firstClaimDate = new Date(dates[0]);
    const lastClaimDate = new Date(dates[dates.length - 1]);

    const isFirstThisMonth =
      firstClaimDate.getFullYear() === currentYear &&
      firstClaimDate.getMonth() === currentMonth;

    const isDormant = lastClaimDate.getTime() < thirtyDaysAgo;

    if (isDormant) {
      dormant++;
    } else if (claimCount >= 3) {
      loyal++;
    } else if (claimCount >= 2) {
      returned++;
    } else if (isFirstThisMonth) {
      firstTimers++;
    }
  }

  const totalCustomers = Object.keys(byPhone).length;
  const funnelTotal = firstTimers + returned + loyal + dormant;

  const steps = [
    {
      label: 'Nuevos este mes',
      sublabel: 'Primera visita en el mes actual',
      count: firstTimers,
      color: '#FED7AA',
      textColor: '#9A3412',
      accentColor: '#F97316',
    },
    {
      label: 'Recurrentes',
      sublabel: '2+ cobros en total',
      count: returned,
      color: '#86EFAC',
      textColor: '#14532D',
      accentColor: '#22C55E',
    },
    {
      label: 'Leales',
      sublabel: '3+ cobros en total',
      count: loyal,
      color: '#1a6b3c',
      textColor: '#F0FDF4',
      accentColor: '#F97316',
    },
    {
      label: 'Dormidos',
      sublabel: 'Sin cobro en 30+ días',
      count: dormant,
      color: '#e7e5e4',
      textColor: '#57534e',
      accentColor: '#a8a29e',
    },
  ];

  const maxCount = Math.max(...steps.map((s) => s.count), 1);

  return (
    <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6" style={{ boxShadow: cardShadow }}>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <h2 className="text-sm font-bold text-[#1C1917] mb-1">Ciclo de vida del cliente</h2>
          <p className="text-xs text-[#6b7280]">Segmentación de {totalCustomers} clientes únicos</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-[#6b7280] font-semibold">
            {funnelTotal} clasificados
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {steps.map((step, i) => {
          const widthPct = Math.round((step.count / maxCount) * 100);
          const totalPct = totalCustomers > 0 ? Math.round((step.count / totalCustomers) * 100) : 0;
          // Funnel narrowing: each step is slightly narrower on the left
          const leftIndent = i * 12;

          return (
            <div key={step.label} className="flex items-center gap-4">
              {/* Funnel bar */}
              <div
                className="relative h-11 rounded-xl flex items-center overflow-hidden transition-all duration-500"
                style={{
                  width: `${Math.max(widthPct, 8)}%`,
                  minWidth: 80,
                  marginLeft: leftIndent,
                  background: step.color,
                }}
              >
                {/* Gradient overlay for depth */}
                <div
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: `linear-gradient(90deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)`,
                  }}
                />
                <span className="relative px-4 text-sm font-black whitespace-nowrap" style={{ color: step.textColor }}>
                  {step.count}
                  {totalPct > 0 && (
                    <span className="ml-1.5 text-xs font-semibold opacity-75">({totalPct}%)</span>
                  )}
                </span>
              </div>

              {/* Label */}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#1C1917]">{step.label}</p>
                <p className="text-[10px] text-[#6b7280]">{step.sublabel}</p>
              </div>

              {/* Arrow connector (except last) */}
              {i < steps.length - 1 && (
                <div className="shrink-0 hidden sm:block">
                  <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
                    <path d="M4 8h8M9 5l3 3-3 3" stroke="#d6d3d1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary row */}
      <div className="mt-5 pt-4 border-t border-[#E8E3DC] flex flex-wrap gap-4">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: step.accentColor }} />
            <span className="text-[11px] text-[#6b7280]">
              <span className="font-bold text-[#1C1917]">{step.count}</span> {step.label.toLowerCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Heatmap ----------------------------------------------------------------
// Rows: Mon–Sun (Spanish). Columns: 4 time blocks.

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const BLOCK_SHORT = ['0–5h', '6–11h', '12–17h', '18–23h'];
const BLOCK_FULL = ['Madrugada 0–5h', 'Mañana 6–11h', 'Tarde 12–17h', 'Noche 18–23h'];

function blockIndex(hour: number): number {
  if (hour < 6) return 0;
  if (hour < 12) return 1;
  if (hour < 18) return 2;
  return 3;
}

// JS getDay(): 0=Sun → map to index 6 (Sun last); 1=Mon → 0
function dayIndex(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

function heatmapColor(count: number): string {
  if (count === 0) return '#f5f5f4';   // stone-100
  if (count <= 2) return '#FFF7ED';   // orange-100
  if (count <= 5) return '#FED7AA';   // orange-200
  return '#F97316';                   // orange-400
}

function ActivityHeatmap({ claims }: { claims: Claim[] }) {
  const grid: number[][] = Array.from({ length: 7 }, () => [0, 0, 0, 0]);

  for (const c of claims) {
    const d = new Date(c.claimed_at);
    const day = dayIndex(d.getDay());
    const block = blockIndex(d.getHours());
    grid[day][block]++;
  }

  const maxVal = Math.max(...grid.flat(), 1);

  return (
    <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6" style={{ boxShadow: cardShadow }}>
      <h2 className="text-sm font-bold text-[#1C1917] mb-1">Actividad por hora y día</h2>
      <p className="text-xs text-[#6b7280] mb-5">Cobros agrupados por franja horaria y día de la semana</p>

      <div className="overflow-x-auto">
        <table className="border-separate" style={{ borderSpacing: '4px' }}>
          <thead>
            <tr>
              <th className="w-10" />
              {BLOCK_SHORT.map((label) => (
                <th
                  key={label}
                  className="text-[10px] font-semibold text-[#6b7280] text-center pb-1 whitespace-nowrap"
                  style={{ minWidth: 64 }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAY_LABELS.map((dayLabel, di) => (
              <tr key={dayLabel}>
                <td className="text-[11px] font-semibold text-[#6b7280] pr-2 text-right whitespace-nowrap">
                  {dayLabel}
                </td>
                {grid[di].map((count, bi) => {
                  const bg = heatmapColor(count);
                  const opacity = count === 0 ? 1 : 0.4 + 0.6 * (count / maxVal);
                  const title = `${dayLabel} · ${BLOCK_FULL[bi]} — ${count} cobro${count !== 1 ? 's' : ''}`;
                  return (
                    <td key={bi} title={title}>
                      <div
                        className="rounded-lg flex items-center justify-center text-[10px] font-bold cursor-default select-none"
                        style={{
                          width: 64,
                          height: 32,
                          backgroundColor: bg,
                          opacity,
                          color: count >= 3 ? '#7C2D12' : '#a8a29e',
                        }}
                      >
                        {count > 0 ? count : ''}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-4">
        <span className="text-[10px] text-[#6b7280] font-semibold">Menos</span>
        {['#f5f5f4', '#FFF7ED', '#FED7AA', '#F97316'].map((c) => (
          <div key={c} className="w-5 h-5 rounded" style={{ backgroundColor: c }} />
        ))}
        <span className="text-[10px] text-[#6b7280] font-semibold">Más</span>
      </div>
    </div>
  );
}

// ---- Expiring Alert ---------------------------------------------------------

function ExpiringAlert({ prizes }: { prizes: ExpiringPrize[] }) {
  if (prizes.length === 0) return null;

  return (
    <div
      className="rounded-2xl border border-[#E8E3DC] bg-orange-50 p-5 flex flex-col gap-3"
      style={{ boxShadow: '0 1px 2px rgba(180,130,0,0.06), 0 4px 12px rgba(180,130,0,0.08)' }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none"><ExclamationTriangleIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span>
          <span className="font-bold text-[#111111] text-sm">
            {prizes.length === 1
              ? '1 premio vence en los próximos 3 días'
              : `${prizes.length} premios vencen en los próximos 3 días`}
          </span>
        </div>
        <Link
          href="/admin/premios"
          className="text-xs font-bold text-orange-700 hover:text-[#111111] transition-colors"
        >
          Ver todos →
        </Link>
      </div>
      <ul className="flex flex-col gap-1.5">
        {prizes.map((p) => {
          const date = new Date(p.end_date + 'T00:00:00').toLocaleDateString('es-CO', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          });
          return (
            <li key={p.id} className="flex items-center justify-between text-xs text-[#111111]">
              <span className="font-semibold truncate max-w-[260px]">{p.name}</span>
              <span className="text-orange-600 shrink-0 ml-2">Vence {date}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---- Smart Alerts -----------------------------------------------------------

interface SmartAlert {
  id: string;
  icon: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
}

function buildSmartAlerts(
  prizes: Prize[],
  claimsThisWeek: number,
  claimsLastWeek: number,
  pendientes: number,
): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const now = new Date();
  const MS7 = 7 * 24 * 60 * 60 * 1000;

  // 1. Prizes expiring tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = tomorrow.toISOString().split('T')[0];
  const expiringTomorrow = (prizes as unknown as (Prize & { end_date?: string })[]).filter(
    (p) => p.end_date && p.end_date.startsWith(tomorrowIso) && !p.cancelled,
  );
  if (expiringTomorrow.length > 0) {
    alerts.push({
      id: `expiring-tomorrow-${tomorrowIso}`,
      icon: '',
      message: expiringTomorrow.length === 1
        ? '1 premio vence mañana'
        : `${expiringTomorrow.length} premios vencen mañana`,
      ctaLabel: 'Ver premios',
      ctaHref: '/admin/premios',
    });
  }

  // 2. Performance drop >30% this week vs last week
  if (claimsLastWeek > 0 && claimsThisWeek < claimsLastWeek) {
    const dropPct = Math.round(((claimsLastWeek - claimsThisWeek) / claimsLastWeek) * 100);
    if (dropPct > 30) {
      alerts.push({
        id: `perf-drop-${now.getFullYear()}-${now.getMonth()}-${Math.floor(now.getDate() / 7)}`,
        icon: '',
        message: `Los cobros bajaron ${dropPct}% vs la semana anterior — Considera crear una campaña`,
        ctaLabel: 'Crear campaña',
        ctaHref: '/admin/campanas',
      });
    }
  }

  // 3. Pending claims not delivered > 5
  if (pendientes > 5) {
    alerts.push({
      id: `pending-undelivered-week-${now.getFullYear()}-${now.getMonth()}-${Math.floor(now.getDate() / 7)}`,
      icon: '⏳',
      message: `${pendientes} premios registrados sin entregar`,
      ctaLabel: 'Ver registros',
      ctaHref: '/admin/registros',
    });
  }

  // 4. No prizes generated this week
  const prizesThisWeek = (prizes as unknown as (Prize & { created_at?: string })[]).filter(
    (p) => p.created_at && Date.now() - new Date(p.created_at).getTime() < MS7,
  );
  if (prizes.length > 0 && prizesThisWeek.length === 0) {
    alerts.push({
      id: `no-prizes-week-${now.getFullYear()}-${now.getMonth()}-${Math.floor(now.getDate() / 7)}`,
      icon: '',
      message: 'No has generado premios esta semana — ¿Crear uno?',
      ctaLabel: 'Generar premio',
      ctaHref: '/admin/generate',
    });
  }

  return alerts;
}

function SmartAlerts({
  prizes, claimsThisWeek, claimsLastWeek, pendientes,
}: {
  prizes: Prize[];
  claimsThisWeek: number;
  claimsLastWeek: number;
  pendientes: number;
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('dismissed_alerts');
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set<string>();
    } catch { return new Set<string>(); }
  });

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem('dismissed_alerts', JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const alerts = buildSmartAlerts(prizes, claimsThisWeek, claimsLastWeek, pendientes)
    .filter((a) => !dismissed.has(a.id));

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-bold text-[#6b7280] uppercase tracking-widest">Alertas</span>
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="flex items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3"
          style={{ boxShadow: '0 1px 2px rgba(249,115,22,0.04), 0 4px 12px rgba(249,115,22,0.07)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-base leading-none shrink-0">{alert.icon}</span>
            <span className="text-sm font-semibold text-[#111111] leading-snug">{alert.message}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={alert.ctaHref}
              className="text-xs font-bold text-white px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
              style={{ background: '#F97316' }}
            >
              {alert.ctaLabel}
            </Link>
            <button
              onClick={() => dismiss(alert.id)}
              className="text-[#1a6b3c] hover:text-orange-600 transition-colors text-sm font-bold leading-none"
              aria-label="Descartar alerta"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- ROI Estimate Card ------------------------------------------------------

function ROIEstimateCard({ claims }: { claims: Claim[] }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const thisMonthDelivered = claims.filter((c) => {
    const d = new Date(c.claimed_at);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth && c.status === 'delivered';
  }).length;

  const deliveredTotal = claims.filter((c) => c.status === 'delivered').length;
  if (deliveredTotal === 0) return null;

  const ESTIMATED_TICKET = 28000; // COP — approximate average ticket
  const additionalRevenue = thisMonthDelivered * ESTIMATED_TICKET;
  const formatted = new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(additionalRevenue);

  return (
    <div
      className="rounded-2xl border border-orange-200 bg-orange-50 p-5 flex items-center gap-4"
      style={{ boxShadow: '0 1px 2px rgba(5,150,105,0.04), 0 4px 12px rgba(5,150,105,0.08)' }}
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#d1fae5' }}>
        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-orange-700 uppercase tracking-widest mb-0.5">Impacto estimado este mes</p>
        <p className="text-base font-black text-[#111111] leading-snug">
          Este mes generaste aprox. <span style={{ color: '#059669' }}>{formatted}</span> adicionales gracias a los premios
        </p>
        <p className="text-[11px] text-orange-600 mt-0.5">
          Aproximación: {thisMonthDelivered} premios entregados este mes × $28.000 COP ticket promedio
        </p>
      </div>
    </div>
  );
}

// ---- Avatar helpers ---------------------------------------------------------

const AVATAR_COLORS = [
  '#F97316', '#1a6b3c', '#EA580C', '#be185d', '#059669', '#F97316',
];

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

// ---- Conversion Rate Widget -------------------------------------------------

function ConversionRateWidget({ data }: { data: ConversionData | null }) {
  const circumference = 226; // 2 * pi * 36
  const rate = data?.rate ?? 0;
  const offset = circumference * (1 - rate / 100);
  const color = rate >= 50 ? '#059669' : rate >= 25 ? '#d97706' : '#dc2626';

  return (
    <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6 flex flex-col gap-4" style={{ boxShadow: '0 1px 2px rgba(28,25,23,0.04), 0 4px 16px rgba(28,25,23,0.06)' }}>
      <div>
        <h2 className="text-sm font-bold text-[#1C1917]">Tasa de conversión</h2>
        <p className="text-xs text-[#6b7280] mt-0.5">Últimos 30 días</p>
      </div>
      <div className="flex items-center gap-6">
        {/* Circular ring */}
        <div className="relative shrink-0" style={{ width: 88, height: 88 }}>
          <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform: 'rotate(-90deg)' }}>
            {/* Track */}
            <circle cx="44" cy="44" r="36" fill="none" stroke="#f5f5f4" strokeWidth="8" />
            {/* Progress */}
            <circle
              cx="44" cy="44" r="36" fill="none"
              stroke={color} strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-black" style={{ color }}>{rate.toFixed(1)}%</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-black text-[#1C1917]">{data?.total_claims ?? 0}</p>
          <p className="text-xs text-[#6b7280] mt-1 leading-snug">
            de {data?.total_prizes ?? 0} premios canjeados este mes
          </p>
        </div>
      </div>
    </div>
  );
}

// ---- Week-over-Week Widget --------------------------------------------------

function WeeklyWidget({ data }: { data: WeeklyData | null }) {
  const changePct = data?.change_pct ?? 0;
  const direction = changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'flat';
  const arrowColor = direction === 'up' ? '#059669' : direction === 'down' ? '#dc2626' : '#a8a29e';
  const arrowLabel = direction === 'up'
    ? `▲ +${changePct}%`
    : direction === 'down'
      ? `▼ ${changePct}%`
      : '= 0%';

  return (
    <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6 flex flex-col gap-4" style={{ boxShadow: '0 1px 2px rgba(28,25,23,0.04), 0 4px 16px rgba(28,25,23,0.06)' }}>
      <div>
        <h2 className="text-sm font-bold text-[#1C1917]">Esta semana</h2>
        <p className="text-xs text-[#6b7280] mt-0.5">Comparativa semanal de cobros</p>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-end gap-3">
          <span className="text-4xl font-black text-[#1C1917]">{data?.this_week ?? 0}</span>
          <span className="text-xs font-semibold text-[#6b7280] mb-2">cobros</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-black" style={{ color: arrowColor }}>{arrowLabel}</span>
        </div>
        <p className="text-xs text-[#6b7280]">vs semana anterior: <span className="font-semibold text-[#6b7280]">{data?.last_week ?? 0}</span></p>
      </div>
    </div>
  );
}

// ---- At-Risk Clients Widget -------------------------------------------------

function AtRiskWidget({ clients }: { clients: AtRiskClient[] }) {
  const AVATAR_COLORS_LOCAL = ['#F97316', '#1a6b3c', '#EA580C', '#be185d', '#059669'];
  const [aiMessages, setAiMessages] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiError, setAiError] = useState<Record<string, string>>({});

  function localAvatarColor(name: string): string {
    return AVATAR_COLORS_LOCAL[name.charCodeAt(0) % AVATAR_COLORS_LOCAL.length];
  }

  function daysColor(days: number): string {
    if (days >= 90) return '#dc2626';
    if (days >= 60) return '#ea580c';
    return '#d97706';
  }

  function tierFromClaims(totalClaims: number): string {
    if (totalClaims >= 10) return 'oro';
    if (totalClaims >= 4) return 'plata';
    return 'bronce';
  }

  async function generateAiMessage(client: AtRiskClient) {
    const key = client.phone;
    setAiLoading((p) => ({ ...p, [key]: true }));
    setAiError((p) => ({ ...p, [key]: '' }));
    try {
      const res = await fetch('/api/admin/ai/winback-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: client.phone,
          full_name: client.full_name,
          days_inactive: client.days_ago,
          tier: tierFromClaims(client.total_claims),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.message) {
        setAiError((p) => ({ ...p, [key]: 'No se pudo generar el mensaje, intenta de nuevo' }));
        return;
      }
      setAiMessages((p) => ({ ...p, [key]: data.message }));
    } catch {
      setAiError((p) => ({ ...p, [key]: 'No se pudo generar el mensaje, intenta de nuevo' }));
    } finally {
      setAiLoading((p) => ({ ...p, [key]: false }));
    }
  }

  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6" style={{ boxShadow: '0 1px 2px rgba(28,25,23,0.04), 0 4px 16px rgba(28,25,23,0.06)' }}>
        <h2 className="text-sm font-bold text-[#1C1917] mb-1">Clientes en riesgo de perderse</h2>
        <p className="text-xs text-[#6b7280] mb-4">Sin cobro en más de 30 días</p>
        <p className="text-sm text-[#6b7280]"><SparklesIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Todos tus clientes han visitado recientemente</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6" style={{ boxShadow: '0 1px 2px rgba(28,25,23,0.04), 0 4px 16px rgba(28,25,23,0.06)' }}>
      <h2 className="text-sm font-bold text-[#1C1917] mb-1">Clientes en riesgo de perderse</h2>
      <p className="text-xs text-[#6b7280] mb-4">Sin cobro en más de 30 días</p>
      <div className="flex flex-col gap-4">
        {clients.map((client) => {
          const initials = client.full_name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
          const bg = localAvatarColor(client.full_name);
          const dc = daysColor(client.days_ago);
          const key = client.phone;
          const aiMsg = aiMessages[key];
          const isLoading = !!aiLoading[key];
          const errMsg = aiError[key];
          const defaultText = `Hola ${client.full_name}, te extrañamos en 3E...`;
          const waText = aiMsg || defaultText;
          const waLink = `https://wa.me/52${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(waText)}`;
          return (
            <div key={`${client.phone}-${client.last_visit}`} className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: bg }}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1C1917] truncate">{client.full_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: dc }}>
                    hace {client.days_ago} días sin visitar
                  </p>
                </div>
                <button
                  onClick={() => generateAiMessage(client)}
                  disabled={isLoading}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#F97316] border border-[#F97316]/30 bg-[#F97316]/5 transition-opacity hover:opacity-80 disabled:opacity-60"
                  title="Generar mensaje con IA"
                >
                  {isLoading ? (
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <span><SparklesIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> IA</span>
                  )}
                </button>
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-80"
                  style={{ background: '#25D366' }}
                  title="Enviar WhatsApp"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span>WA</span>
                </a>
              </div>
              {aiMsg && (
                <p className="text-xs text-[#6b7280] bg-[#FAFAF9] border border-[#E8E3DC] rounded-lg px-3 py-2 ml-12">
                  {aiMsg}
                </p>
              )}
              {errMsg && (
                <p className="text-xs text-red-500 ml-12">{errMsg}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Setup Checklist --------------------------------------------------------

interface SetupStep {
  number: number;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  done: boolean;
}

function SetupChecklist({
  restaurants,
  prizes,
  claims,
  tickerTiersConfigured,
}: {
  restaurants: Restaurant[];
  prizes: Prize[];
  claims: Claim[];
  tickerTiersConfigured: boolean;
}) {
  const [dismissed, setDismissed] = useState(() => {
    try { return typeof window !== 'undefined' && !!localStorage.getItem('setup_dismissed'); }
    catch { return false; }
  });

  const restaurantExists = restaurants.length > 0;
  const prizeExists = prizes.length > 0;
  const claimExists = claims.length > 0;

  const steps: SetupStep[] = [
    {
      number: 1,
      title: 'Crear primer restaurante',
      description: 'Registra tu sucursal para empezar a generar premios.',
      ctaLabel: 'Ir a Restaurantes',
      ctaHref: '/admin/restaurantes',
      done: restaurantExists,
    },
    {
      number: 2,
      title: 'Generar primer premio',
      description: 'Crea un QR de premio para repartir a tus clientes.',
      ctaLabel: 'Generar Premio',
      ctaHref: '/admin/generate',
      done: prizeExists,
    },
    {
      number: 3,
      title: 'Compartir link al cajero',
      description: 'Comparte el acceso de cajero con tu equipo de caja.',
      ctaLabel: 'Ver Restaurantes',
      ctaHref: '/admin/restaurantes',
      done: restaurantExists,
    },
    {
      number: 4,
      title: 'Primer cobro registrado',
      description: 'Un cliente ha canjeado su primer premio exitosamente.',
      ctaLabel: 'Ver Registros',
      ctaHref: '/admin/registros',
      done: claimExists,
    },
    {
      number: 5,
      title: 'Configurar Premio por Consumo',
      description: 'Activa los niveles de premio automáticos por monto de consumo.',
      ctaLabel: 'Configurar Tiers',
      ctaHref: '/admin/ticket-tiers',
      done: tickerTiersConfigured,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  const dismiss = () => {
    try { localStorage.setItem('setup_dismissed', '1'); } catch { /* ignore */ }
    setDismissed(true);
  };

  if (dismissed) return null;

  if (allDone) {
    return (
      <div
        className="rounded-2xl border border-orange-200 bg-orange-50 p-6 flex items-center justify-between gap-4"
        style={{ boxShadow: cardShadow }}
      >
        <div className="flex items-center gap-4">
          <span className="text-3xl shrink-0"><SparklesIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span>
          <div>
            <p className="font-bold text-[#111111] text-base">¡Configuracion completa!</p>
            <p className="text-sm text-orange-700 mt-0.5">Tu plataforma 3E esta lista para usarse.</p>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="text-[#1a6b3c] hover:text-orange-600 transition-colors text-lg font-bold leading-none shrink-0"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>
    );
  }

  const progressPct = Math.round((completedCount / steps.length) * 100);

  return (
    <div
      className="bg-white rounded-2xl border border-[#E8E3DC] overflow-hidden"
      style={{ boxShadow: cardShadow }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl leading-none"><RocketLaunchIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span>
            <h2 className="text-base font-bold text-[#1C1917]">Empieza aqui</h2>
          </div>
          <button
            onClick={dismiss}
            className="text-[#6b7280] hover:text-[#6b7280] transition-colors text-sm font-bold leading-none"
            aria-label="Cerrar checklist"
          >
            ✕
          </button>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#6b7280]">
            {completedCount} de {steps.length} pasos completados
          </span>
          <span className="text-xs font-bold" style={{ color: '#F97316' }}>{progressPct}%</span>
        </div>
        <div className="h-2 bg-[#F5F0EB] rounded-full overflow-hidden">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg,#F97316,#1a6b3c)' }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="px-6 pb-6 flex flex-col gap-4">
        {steps.map((step) => (
          <div
            key={step.number}
            className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
              step.done
                ? 'border-orange-100 bg-orange-50/50'
                : 'border-[#E8E3DC] bg-[#FAFAF9]'
            }`}
          >
            {/* Circle */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold mt-0.5"
              style={
                step.done
                  ? { background: '#059669', color: '#fff' }
                  : { background: '#F97316', color: '#fff' }
              }
            >
              {step.done ? (
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                step.number
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold mb-0.5 ${step.done ? 'text-[#111111] line-through opacity-70' : 'text-[#1C1917]'}`}>
                {step.title}
              </p>
              <p className="text-xs text-[#6b7280]">{step.description}</p>
            </div>

            {/* CTA */}
            {!step.done && (
              <Link
                href={step.ctaHref}
                className="text-xs font-bold text-white px-3 py-1.5 rounded-lg shrink-0 transition-opacity hover:opacity-90"
                style={{ background: '#F97316' }}
              >
                {step.ctaLabel}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- KPI Pill with counter animation ----------------------------------------

function KpiPill({ value, label }: { value: number; label: string }) {
  const animated = useAnimatedCounter(value, 800);
  const [popped, setPopped] = useState(false);

  useEffect(() => {
    if (value === 0) return;
    const timer = setTimeout(() => {
      setPopped(true);
      const reset = setTimeout(() => setPopped(false), 300);
      return () => clearTimeout(reset);
    }, 800);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <span className="text-sm font-bold text-white">
      <span className={popped ? 'count-pop' : undefined}>{animated.toLocaleString()}</span> {label}
    </span>
  );
}

// ---- Dashboard --------------------------------------------------------------

export default function AdminDashboard() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [expiringPrizes, setExpiringPrizes] = useState<ExpiringPrize[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState('');
  const [todayLabel, setTodayLabel] = useState('');
  const [dataCachedAt, setDataCachedAt] = useState<number | null>(null);
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(false);
  const [ticketTiersConfigured, setTicketTiersConfigured] = useState(false);
  const [activityData, setActivityData] = useState<Array<{ day: string; count: number }>>([]);
  const [topPremios, setTopPremios] = useState<Array<{ name: string; count: number; percentage: number }>>([]);
  const [conversionData, setConversionData] = useState<ConversionData | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [atRiskClients, setAtRiskClients] = useState<AtRiskClient[]>([]);
  const [heatmapHours, setHeatmapHours] = useState<HeatmapHour[]>([]);
  const [activeEvents, setActiveEvents] = useState<ActiveEvent[]>([]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour <= 11) setGreeting('Buenos días');
    else if (hour >= 12 && hour <= 18) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');

    setTodayLabel(
      new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
    );
  }, []);

  const loadDashboard = useRef<() => void>(() => {});

  useEffect(() => {
    const CACHE_KEY = 'premia_cache__api_dashboard_v1';
    const TTL = 5 * 60 * 1000; // 5 minutes

    function applyDashboardData(claimsData: { claims?: Claim[] }, prizesData: { prizes?: Prize[] }, restaurantsData: { restaurants?: Restaurant[] }, expiringData: { prizes?: ExpiringPrize[] }, tiersData: { tiers?: unknown[] } | unknown[]) {
      const fetchedRestaurants: Restaurant[] = restaurantsData.restaurants ?? [];
      setClaims(claimsData.claims ?? []);
      setPrizes(prizesData.prizes ?? []);
      setRestaurants(fetchedRestaurants);
      setExpiringPrizes(expiringData.prizes ?? []);
      const tiers = (tiersData as { tiers?: unknown[] }).tiers ?? tiersData ?? [];
      setTicketTiersConfigured(Array.isArray(tiers) && tiers.length > 0);
      if (
        fetchedRestaurants.length === 0 &&
        typeof window !== 'undefined' &&
        !localStorage.getItem('onboarding_complete')
      ) {
        setShowOnboardingBanner(true);
      }
    }

    async function fetchFresh(silent = false) {
      if (!silent) { setLoading(true); setDashboardError(null); }
      try {
        const [claimsData, prizesData, restaurantsData, expiringData, tiersData] = await Promise.all([
          fetch('/api/claims').then((r) => { if (!r.ok) throw new Error('claims'); return r.json(); }),
          fetch('/api/prizes/list').then((r) => { if (!r.ok) throw new Error('prizes'); return r.json(); }),
          fetch('/api/restaurants').then((r) => { if (!r.ok) throw new Error('restaurants'); return r.json(); }),
          fetch('/api/prizes/expiring?days=3').then((r) => r.json()).catch(() => ({ prizes: [] })),
          fetch('/api/ticket-tiers').then((r) => r.json()).catch(() => ({ tiers: [] })),
        ]);
        const bundle = { claimsData, prizesData, restaurantsData, expiringData, tiersData };
        const now = Date.now();
        await setCache(CACHE_KEY, bundle);
        setDataCachedAt(now);
        applyDashboardData(claimsData, prizesData, restaurantsData, expiringData, tiersData);
      } catch {
        if (!silent) setDashboardError('No se pudo cargar el dashboard. Verifica tu conexión e intenta de nuevo.');
      } finally {
        if (!silent) setLoading(false);
      }
    }

    async function fetchDashboard(forceRefresh = false) {
      if (!forceRefresh) {
        const cached = await getCache(CACHE_KEY);
        if (cached) {
          const { claimsData, prizesData, restaurantsData, expiringData, tiersData } = cached.data as {
            claimsData: { claims?: Claim[] };
            prizesData: { prizes?: Prize[] };
            restaurantsData: { restaurants?: Restaurant[] };
            expiringData: { prizes?: ExpiringPrize[] };
            tiersData: { tiers?: unknown[] };
          };
          applyDashboardData(claimsData, prizesData, restaurantsData, expiringData, tiersData);
          setDataCachedAt(cached.cachedAt);
          setLoading(false);

          // Revalidate in background if stale
          if (Date.now() - cached.cachedAt > TTL) {
            fetchFresh(true);
          }
          return;
        }
      }
      await fetchFresh(false);
    }

    loadDashboard.current = () => fetchDashboard(true);
    fetchDashboard(false);

    // Fetch chart data independently (not cached with main bundle)
    void fetch('/api/admin/activity').then((r) => r.json()).then((d: { days?: Array<{ day: string; count: number }> }) => {
      if (d.days) setActivityData(d.days);
    }).catch(() => { /* ignore */ });

    void fetch('/api/admin/top-premios').then((r) => r.json()).then((d: { items?: Array<{ name: string; count: number; percentage: number }> }) => {
      if (d.items) setTopPremios(d.items);
    }).catch(() => { /* ignore */ });

    void fetch('/api/admin/conversion').then((r) => r.json()).then((d: ConversionData) => {
      setConversionData(d);
    }).catch(() => { /* ignore */ });

    void fetch('/api/admin/weekly').then((r) => r.json()).then((d: WeeklyData) => {
      setWeeklyData(d);
    }).catch(() => { /* ignore */ });

    void fetch('/api/admin/at-risk').then((r) => r.json()).then((d: { clients?: AtRiskClient[] }) => {
      if (d.clients) setAtRiskClients(d.clients);
    }).catch(() => { /* ignore */ });

    void fetch('/api/admin/heatmap').then((r) => r.json()).then((d: { hours?: HeatmapHour[] }) => {
      if (d.hours) setHeatmapHours(d.hours);
    }).catch(() => { /* ignore */ });

    void fetch('/api/events?all=true').then((r) => r.json()).then((d: { events?: ActiveEvent[] }) => {
      if (!d.events) return;
      const now = Date.now();
      const active = d.events.filter((e) => e.active && new Date(e.starts_at).getTime() <= now && new Date(e.ends_at).getTime() >= now);
      setActiveEvents(active);
    }).catch(() => { /* ignore */ });

    // Background refresh every 5 min
    const interval = setInterval(() => fetchFresh(true), TTL);
    return () => clearInterval(interval);
  }, []);

  const filteredClaims = selectedRestaurant === 'all'
    ? claims
    : claims.filter((c) => c.delivered_by === selectedRestaurant);

  const totalPremios = prizes.length;
  const totalCobros = filteredClaims.length;
  const pendientes = filteredClaims.filter((c) => c.status === 'pending').length;
  const entregados = filteredClaims.filter((c) => c.status === 'delivered').length;

  const now = Date.now();
  const MS7 = 7 * 24 * 60 * 60 * 1000;
  const claimsThisWeek = filteredClaims.filter((c) => {
    const t = new Date(c.claimed_at).getTime();
    return t >= now - MS7;
  }).length;
  const claimsLastWeek = filteredClaims.filter((c) => {
    const t = new Date(c.claimed_at).getTime();
    return t >= now - 2 * MS7 && t < now - MS7;
  }).length;
  const claimsTrend: 'up' | 'down' | undefined =
    claimsThisWeek > claimsLastWeek ? 'up' : claimsThisWeek < claimsLastWeek ? 'down' : undefined;
  const claimsDiff = Math.abs(claimsThisWeek - claimsLastWeek);
  const claimsTrendLabel = claimsDiff > 0
    ? `${claimsDiff} vs semana anterior`
    : undefined;

  const days7: DayBar[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const iso = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('es-CO', { weekday: 'short' }).slice(0, 2);
    const count = filteredClaims.filter((c) => (c.claimed_at ?? '').startsWith(iso)).length;
    return { label, count };
  });

  const recent5 = [...filteredClaims]
    .sort((a, b) => new Date(b.claimed_at).getTime() - new Date(a.claimed_at).getTime())
    .slice(0, 5);

  const brand = '#F97316';

  if (dashboardError) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex flex-col items-center justify-center gap-6 px-4 text-center p-10">
        <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center">
          <svg className="w-7 h-7 text-[#1a6b3c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-stone-800 mb-2">No se pudo cargar el dashboard</h2>
          <p className="text-sm text-stone-500 max-w-sm">{dashboardError}</p>
          <p className="text-xs font-bold mt-3 px-3 py-1.5 rounded-full inline-block" style={{ color: '#F97316', background: '#fff7f5', border: '1px solid #fde8e0' }}>
            Estamos trabajando en ello
          </p>
        </div>
        <button
          onClick={() => loadDashboard.current()}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold transition-all shadow-sm hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#F97316,#ea6a0a)', boxShadow: '0 4px 16px rgba(249,115,22,0.3)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Intentar de nuevo
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ── Hero Banner ── */}
      <div className="hero-gradient px-6 md:px-10 pt-8 pb-10">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between flex-wrap gap-6">
            <div>
              {greeting && (
                <p className="text-sm font-semibold text-orange-200/80 mb-1 uppercase tracking-widest">{greeting}</p>
              )}
              <h1 className="text-3xl md:text-4xl font-black text-white leading-tight tracking-tight">
                Panel Principal
              </h1>
              {todayLabel && (
                <p className="text-sm text-orange-200/70 mt-1.5 capitalize">{todayLabel}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="flex gap-2.5">
                <Link
                  href="/admin/generate"
                  className="px-5 py-2.5 rounded-xl text-sm font-black transition-all"
                  style={{ background: '#F97316', color: 'white', border: '2px solid #111', boxShadow: '3px 3px 0 #111' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translate(-1px,-1px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '5px 5px 0 #111'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = ''; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '3px 3px 0 #111'; }}
                >
                  + Generar Premio
                </Link>
                <Link
                  href="/admin/registros"
                  className="px-5 py-2.5 rounded-xl text-sm font-black transition-all"
                  style={{ background: 'white', color: '#111111', border: '2px solid #111', boxShadow: '3px 3px 0 #111' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translate(-1px,-1px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '5px 5px 0 #111'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = ''; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '3px 3px 0 #111'; }}
                >
                  Ver Registros
                </Link>
              </div>
              <div className="flex items-center gap-2">
                {dataCachedAt && (
                  <span className="text-xs text-orange-200/60">
                    Actualizado hace {Math.round((Date.now() - dataCachedAt) / 60000)} min
                  </span>
                )}
                <button
                  onClick={() => loadDashboard.current()}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className={loading ? 'animate-spin' : ''}>
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Actualizar
                </button>
              </div>
            </div>
          </div>

          {/* Hero KPI pills */}
          {!loading && (
            <div className="flex flex-wrap gap-3 mt-6">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}>
                <span className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 8px rgba(52,211,153,0.8)' }} />
                <KpiPill value={totalCobros} label="cobros totales" />
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}>
                <KpiPill value={pendientes} label="pendientes" />
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}>
                <KpiPill value={totalPremios} label="premios activos" />
              </div>
              {claimsTrend === 'up' && claimsTrendLabel && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.3)' }}>
                  <span className="text-sm font-bold text-emerald-300">↑ {claimsTrendLabel}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 md:px-10 py-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">

        {/* Setup checklist — shown until dismissed or all steps complete */}
        {!loading && (
          <SetupChecklist
            restaurants={restaurants}
            prizes={prizes}
            claims={claims}
            tickerTiersConfigured={ticketTiersConfigured}
          />
        )}

        {/* Active dynamic/manual events — weather, slow-day, or manually created */}
        {!loading && activeEvents.length > 0 && (
          <div
            className="rounded-2xl border border-amber-200 p-5"
            style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE8E0 100%)', boxShadow: '0 1px 2px rgba(217,119,6,0.06), 0 4px 12px rgba(217,119,6,0.1)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl"><BoltIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span>
              <h2 className="font-bold text-[#1C1917] text-base">Eventos activos hoy</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {activeEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 bg-white/80 border border-amber-200 rounded-xl px-4 py-2.5"
                >
                  <div>
                    <p className="text-sm font-bold text-[#1C1917]">{ev.name}</p>
                    {ev.restaurant_name && (
                      <p className="text-xs text-stone-500">{ev.restaurant_name}</p>
                    )}
                  </div>
                  <span className="text-xs font-extrabold text-white bg-amber-500 px-2.5 py-1 rounded-full shrink-0">
                    x{ev.multiplier}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Onboarding banner — shown when no restaurants and onboarding not complete */}
        {!loading && showOnboardingBanner && (
          <div
            className="rounded-2xl border border-orange-200 p-5 flex items-center justify-between flex-wrap gap-4"
            style={{ background: 'linear-gradient(135deg, #FDE8E0 0%, #FEF3C7 100%)', boxShadow: '0 1px 2px rgba(249,115,22,0.06), 0 4px 12px rgba(249,115,22,0.1)' }}
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl shrink-0"><HandRaisedIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span>
              <div>
                <p className="font-bold text-[#1C1917] text-base">¡Bienvenido! Comienza configurando tu primer restaurante.</p>
                <p className="text-sm text-[#6b7280] mt-0.5">Sigue el asistente de configuración para poner en marcha 3E.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/admin/onboarding"
                className="px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: brand }}
              >
                Comenzar onboarding →
              </Link>
              <button
                onClick={() => setShowOnboardingBanner(false)}
                className="text-[#6b7280] hover:text-[#6b7280] transition-colors text-sm font-semibold"
                aria-label="Cerrar banner"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Expiring alert — shown after data loads */}
        {!loading && <ExpiringAlert prizes={expiringPrizes} />}

        {/* Smart alerts — shown below greeting, above stats */}
        {!loading && (
          <SmartAlerts
            prizes={prizes}
            claimsThisWeek={claimsThisWeek}
            claimsLastWeek={claimsLastWeek}
            pendientes={pendientes}
          />
        )}

        {/* ROI estimate card */}
        {!loading && <ROIEstimateCard claims={filteredClaims} />}

        {/* ── Business Analytics Row ── */}
        {!loading && (
          <div>
            <span className="text-xs font-bold text-[#6b7280] uppercase tracking-widest block mb-3">Analítica de negocio</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ConversionRateWidget data={conversionData} />
              <WeeklyWidget data={weeklyData} />
            </div>
          </div>
        )}

        {/* ── Hour Heatmap ── */}
        {!loading && heatmapHours.length > 0 && (
          <HourHeatmap hours={heatmapHours} />
        )}

        {/* ── At-Risk Clients ── */}
        {!loading && (
          <AtRiskWidget clients={atRiskClients} />
        )}

        {/* Stat cards + restaurant filter */}
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <span className="text-sm font-bold text-[#6b7280] uppercase tracking-widest">Resumen</span>
            <select
              value={selectedRestaurant}
              onChange={(e) => setSelectedRestaurant(e.target.value)}
              className="bg-white rounded-xl border border-[#E8E3DC] text-stone-600 text-sm font-medium px-3 py-2 outline-none focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] transition-all cursor-pointer"
              style={{ boxShadow: cardShadow }}
            >
              <option value="all">Todas las sucursales</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>
          <StatCardGrid loading={loading}>
            {loading ? (
              <><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
            ) : (
              <>
                <StatCard
                  label="Entregados"
                  value={entregados}
                  borderColor="#F97316"
                  bgColor="rgba(255,255,255,0.25)"
                  textColor="white"
                  gradient="linear-gradient(135deg,#F97316 0%,#F97316 100%)"
                  trend={claimsTrend}
                  trendLabel={claimsTrendLabel}
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.22)" /><path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                />
                <StatCard
                  label="Pendientes"
                  value={pendientes}
                  borderColor="#F59E0B"
                  bgColor="rgba(255,255,255,0.25)"
                  textColor="white"
                  gradient="linear-gradient(135deg,#F59E0B 0%,#EF4444 100%)"
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="rgba(255,255,255,0.22)" /><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                />
                <StatCard
                  label="Total Premios"
                  value={totalPremios}
                  borderColor="#1a6b3c"
                  bgColor="rgba(255,255,255,0.25)"
                  textColor="white"
                  gradient="linear-gradient(135deg,#1a6b3c 0%,#A78BFA 100%)"
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="9" width="18" height="11" rx="2" fill="rgba(255,255,255,0.22)" /><path d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                />
                <StatCard
                  label="Total Cobros"
                  value={totalCobros}
                  borderColor="#059669"
                  bgColor="rgba(255,255,255,0.25)"
                  textColor="white"
                  gradient="linear-gradient(135deg,#059669 0%,#10B981 100%)"
                  trend={claimsTrend}
                  trendLabel={claimsTrendLabel}
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" fill="rgba(255,255,255,0.22)" /><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                />
                <StatCard
                  label="Conversión"
                  value={totalCobros > 0 ? Math.round((entregados / totalCobros) * 100) : 0}
                  suffix="%"
                  borderColor="#EC4899"
                  bgColor="rgba(255,255,255,0.25)"
                  textColor="white"
                  gradient="linear-gradient(135deg,#EC4899 0%,#F97316 100%)"
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M13 7h8v8L13 7z" fill="rgba(255,255,255,0.22)" /><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                />
              </>
            )}
          </StatCardGrid>
        </div>

        {/* Actividad últimos 14 días */}
        {!loading && (
          <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6" style={{ boxShadow: cardShadow }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-[#1C1917]">Actividad últimos 14 días</h2>
                <p className="text-xs text-[#6b7280]">Cobros diarios registrados</p>
              </div>
              {activityData.length > 0 && (
                <span className="text-xs font-bold text-[#F97316] tabular-nums">
                  {activityData.reduce((s, d) => s + d.count, 0)} total
                </span>
              )}
            </div>
            <ActivityChart data={activityData} />
          </div>
        )}

        {/* Top premios canjeados */}
        {!loading && topPremios.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="label-caps slide-up-sm">Top premios canjeados</h2>
              <span className="text-xs text-[#6b7280]">Últimos 30 días</span>
            </div>
            <TopPremiosChart items={topPremios} />
          </div>
        )}

        {/* Acciones rápidas */}
        <div>
          <h2 className="label-caps mb-3 slide-up-sm">Acciones rápidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/admin/generate"
              className="group flex items-center gap-4 p-5 rounded-2xl border border-[#E8E3DC] bg-white hover:border-[#F97316] hover:bg-orange-50 transition-all stagger-item card-hover"
              style={{ boxShadow: cardShadow }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#fde8e0' }}>
                <svg width="24" height="24" fill="none" stroke={brand} strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-[#1C1917] group-hover:text-[#F97316] transition-colors">Generar Premio</p>
                <p className="text-xs text-[#6b7280] mt-0.5">Crea un nuevo QR de premio</p>
              </div>
            </Link>

            <Link
              href="/admin/generate/masivo"
              className="group flex items-center gap-4 p-5 rounded-2xl border border-[#E8E3DC] bg-white hover:border-stone-300 hover:bg-stone-50 transition-all stagger-item card-hover"
              style={{ boxShadow: cardShadow }}
            >
              <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                <svg width="24" height="24" fill="none" stroke="#78716c" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-[#1C1917] group-hover:text-stone-700 transition-colors">Generar Masivo</p>
                <p className="text-xs text-[#6b7280] mt-0.5">Genera múltiples premios a la vez</p>
              </div>
            </Link>

            <Link
              href="/admin/registros"
              className="group flex items-center gap-4 p-5 rounded-2xl border border-[#E8E3DC] bg-white hover:border-orange-200 hover:bg-orange-50 transition-all stagger-item card-hover"
              style={{ boxShadow: cardShadow }}
            >
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                <svg width="24" height="24" fill="none" stroke="#F97316" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M4 6h16M4 10h16M4 14h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-[#1C1917] group-hover:text-orange-600 transition-colors">Ver Registros</p>
                <p className="text-xs text-[#6b7280] mt-0.5">Historial completo de cobros</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Embudo de conversión */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6" style={{ boxShadow: cardShadow }}>
          <h2 className="text-sm font-bold text-[#1C1917] mb-1">Embudo de conversión</h2>
          <p className="text-xs text-[#6b7280] mb-6">De QRs generados a premios cobrados</p>

          {loading ? (
            <div className="flex flex-col gap-4">
              {[80, 55, 30].map((w, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-9 rounded-lg skeleton-neutral" style={{ width: `${w}%` }} />
                  <div className="h-4 w-20 rounded skeleton-neutral" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {(() => {
                const steps = [
                  { label: 'QRs Generados', count: totalPremios, color: '#F97316', widthPct: 100 },
                  {
                    label: 'Registrados', count: totalCobros, color: '#F97316',
                    widthPct: totalPremios > 0 ? Math.round((totalCobros / totalPremios) * 100) : 0,
                  },
                  {
                    label: 'Cobrados', count: entregados, color: '#059669',
                    widthPct: totalPremios > 0 ? Math.round((entregados / totalPremios) * 100) : 0,
                  },
                ];
                const convReg = totalPremios > 0 ? Math.round((totalCobros / totalPremios) * 100) : 0;
                const convDel = totalCobros > 0 ? Math.round((entregados / totalCobros) * 100) : 0;

                return (
                  <>
                    {steps.map((step, i) => (
                      <div key={step.label}>
                        <div className="flex items-center gap-3 mb-1">
                          <div
                            className="h-9 rounded-lg flex items-center px-4 transition-all duration-500"
                            style={{ width: `${Math.max(step.widthPct, 6)}%`, background: step.color, minWidth: 56 }}
                          >
                            <span className="text-white text-xs font-bold whitespace-nowrap">{step.count}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-[#1C1917]">{step.label}</span>
                            {step.widthPct < 100 && (
                              <span className="text-[11px]" style={{ color: step.color }}>{step.widthPct}% del total</span>
                            )}
                          </div>
                        </div>
                        {i === 0 && (
                          <div className="flex items-center gap-2 my-1 pl-2">
                            <svg width="14" height="14" fill="none" stroke="#a8a29e" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="text-[11px] font-semibold" style={{ color: convReg > 0 ? '#F97316' : '#a8a29e' }}>
                              {convReg}% de conversión (generados → registrados)
                            </span>
                          </div>
                        )}
                        {i === 1 && (
                          <div className="flex items-center gap-2 my-1 pl-2">
                            <svg width="14" height="14" fill="none" stroke="#a8a29e" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="text-[11px] font-semibold" style={{ color: convDel > 0 ? '#059669' : '#a8a29e' }}>
                              {convDel}% de conversión (registrados → cobrados)
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Chart + Recent feed */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Bar chart */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-[#E8E3DC] p-6" style={{ boxShadow: cardShadow }}>
            <h2 className="text-sm font-bold text-[#1C1917] mb-1">Actividad — últimos 7 días</h2>
            <p className="text-xs text-[#6b7280] mb-4">
              Cobros registrados por día
              {selectedRestaurant !== 'all' && (
                <span className="ml-1 font-semibold text-[#F97316]">· {selectedRestaurant}</span>
              )}
            </p>
            {loading ? (
              <div className="flex items-end gap-3 h-36">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex-1 rounded-lg skeleton-neutral" style={{ height: `${30 + (i * 13) % 70}%` }} />
                ))}
              </div>
            ) : (
              <BarChart data={days7} />
            )}
          </div>

          {/* Recent claims feed */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E8E3DC] p-6 flex flex-col gap-4" style={{ boxShadow: cardShadow }}>
            <div>
              <h2 className="text-sm font-bold text-[#1C1917]">Cobros Recientes</h2>
              <p className="text-xs text-[#6b7280] mt-0.5">
                {selectedRestaurant === 'all' ? 'Últimas actividades' : `Sucursal: ${selectedRestaurant}`}
              </p>
            </div>
            {loading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="skeleton-neutral w-9 h-9 rounded-full shrink-0" />
                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="skeleton-neutral h-3 rounded w-3/4" />
                      <div className="skeleton-neutral h-2.5 rounded w-1/2" />
                    </div>
                    <div className="skeleton-neutral h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : recent5.length === 0 ? (
              <p className="text-sm text-[#6b7280] mt-2">Sin cobros aún.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {recent5.map((c) => {
                  const isPending = c.status === 'pending';
                  const initials = c.full_name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
                  const color = avatarColor(c.full_name);
                  return (
                    <div key={c.id} className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ backgroundColor: color }}
                      >
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1C1917] truncate">{c.full_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-xs text-[#6b7280]"><RelativeDate dateStr={c.claimed_at} /></p>
                          {c.prize_name && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full truncate max-w-[90px]"
                              style={{ backgroundColor: '#fde8e0', color: brand }}
                            >
                              {c.prize_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                          isPending ? 'bg-orange-100 text-orange-700' : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {isPending ? 'Pendiente' : 'Entregado'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {!loading && filteredClaims.length > 0 && (
              <Link href="/admin/registros" className="text-xs font-bold mt-auto" style={{ color: brand }}>
                Ver todos los registros →
              </Link>
            )}
          </div>
        </div>

        {/* Section A: Period comparison chart */}
        {!loading && <PeriodComparisonChart claims={filteredClaims} />}

        {/* Activity heatmap */}
        {!loading && <ActivityHeatmap claims={filteredClaims} />}

        {/* Section B: Sucursal performance heatmap */}
        {!loading && filteredClaims.length > 0 && (
          <SucursalHeatmap claims={filteredClaims} />
        )}

        {/* Section C: Customer lifecycle funnel */}
        {!loading && filteredClaims.length > 0 && (
          <CustomerLifecycleFunnel claims={filteredClaims} />
        )}

        {/* Insights */}
        {!loading && (
          <div>
            <h2 className="label-caps mb-3">Insights</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Best hour */}
              <div className="bg-white rounded-2xl border border-[#E8E3DC] p-5 flex items-center gap-4" style={{ boxShadow: cardShadow }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#fde8e0' }}>
                  <svg className="w-5 h-5" style={{ color: brand }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-0.5">Mejor hora del día</p>
                  {(() => {
                    if (filteredClaims.length === 0) return <p className="text-sm text-stone-400">Sin datos aún</p>;
                    const counts: number[] = Array(24).fill(0);
                    for (const c of filteredClaims) counts[new Date(c.claimed_at).getHours()]++;
                    const best = counts.indexOf(Math.max(...counts));
                    return <p className="text-lg font-black text-[#1C1917]">Las {best}:00h</p>;
                  })()}
                  <p className="text-xs text-stone-400 mt-0.5">Franja con más cobros</p>
                </div>
              </div>

              {/* Best day */}
              <div className="bg-white rounded-2xl border border-[#E8E3DC] p-5 flex items-center gap-4" style={{ boxShadow: cardShadow }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#ede9fe' }}>
                  <svg className="w-5 h-5 text-[#1a6b3c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-0.5">Mejor día</p>
                  {(() => {
                    if (filteredClaims.length === 0) return <p className="text-sm text-stone-400">Sin datos aún</p>;
                    const DAY_NAMES = ['Los Domingos', 'Los Lunes', 'Los Martes', 'Los Miércoles', 'Los Jueves', 'Los Viernes', 'Los Sábados'];
                    const counts: number[] = Array(7).fill(0);
                    for (const c of filteredClaims) counts[new Date(c.claimed_at).getDay()]++;
                    const best = counts.indexOf(Math.max(...counts));
                    return <p className="text-lg font-black text-[#1C1917]">{DAY_NAMES[best]}</p>;
                  })()}
                  <p className="text-xs text-stone-400 mt-0.5">Día con más cobros</p>
                </div>
              </div>

              {/* Most popular prize */}
              <div className="bg-white rounded-2xl border border-[#E8E3DC] p-5 flex items-center gap-4" style={{ boxShadow: cardShadow }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#fef3c7' }}>
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-0.5">Premio más popular</p>
                  {(() => {
                    if (filteredClaims.length === 0) return <p className="text-sm text-stone-400">Sin datos aún</p>;
                    const byPrize: Record<string, number> = {};
                    for (const c of filteredClaims) {
                      const key = (c as { prize_name?: string }).prize_name ?? c.prize_id;
                      byPrize[key] = (byPrize[key] || 0) + 1;
                    }
                    const best = Object.entries(byPrize).sort((a, b) => b[1] - a[1])[0];
                    return <p className="text-base font-black text-[#1C1917] truncate">{best?.[0] ?? '—'}</p>;
                  })()}
                  <p className="text-xs text-stone-400 mt-0.5">El más canjeado</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Analytics */}
        {!loading && filteredClaims.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Clientes recurrentes */}
            <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6" style={{ boxShadow: cardShadow }}>
              <h2 className="text-sm font-bold text-[#1C1917] mb-1">Clientes recurrentes</h2>
              <p className="text-xs text-[#6b7280] mb-4">Clientes con 2 o más cobros</p>
              {(() => {
                const byPhone: Record<string, number> = {};
                for (const c of filteredClaims) { byPhone[c.phone] = (byPhone[c.phone] || 0) + 1; }
                const total = Object.keys(byPhone).length;
                const recurring = Object.values(byPhone).filter(n => n >= 2).length;
                const pct = total > 0 ? Math.round((recurring / total) * 100) : 0;
                return (
                  <div className="flex items-center gap-6">
                    <div className="relative w-20 h-20 shrink-0">
                      <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f5f5f4" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F97316" strokeWidth="3"
                          strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-black text-[#1C1917]">{pct}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-[#1C1917]">{recurring}</p>
                      <p className="text-xs text-[#6b7280] mt-1">de {total} clientes únicos</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Premio más popular */}
            <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6" style={{ boxShadow: cardShadow }}>
              <h2 className="text-sm font-bold text-[#1C1917] mb-1">Premios más populares</h2>
              <p className="text-xs text-[#6b7280] mb-4">Top 3 por cobros</p>
              {(() => {
                const byPrize: Record<string, number> = {};
                for (const c of filteredClaims) {
                  const key = (c as { prize_name?: string }).prize_name ?? c.prize_id;
                  byPrize[key] = (byPrize[key] || 0) + 1;
                }
                const sorted = Object.entries(byPrize).sort((a, b) => b[1] - a[1]).slice(0, 3);
                const maxVal = sorted[0]?.[1] || 1;
                return (
                  <div className="flex flex-col gap-3">
                    {sorted.map(([name, count], i) => (
                      <div key={name} className="flex items-center gap-3">
                        <span className="w-5 text-xs font-bold text-[#6b7280] shrink-0">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-[#1C1917] truncate max-w-[140px]">{name}</span>
                            <span className="text-xs font-bold text-[#F97316] shrink-0 ml-2">{count}</span>
                          </div>
                          <div className="h-2 bg-[#f5f5f4] rounded-full overflow-hidden">
                            <div className="h-2 rounded-full transition-all" style={{ width: `${(count / maxVal) * 100}%`, background: i === 0 ? '#F97316' : i === 1 ? '#F97316' : '#FED7AA' }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Mejor día de la semana */}
            <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6" style={{ boxShadow: cardShadow }}>
              <h2 className="text-sm font-bold text-[#1C1917] mb-1">Mejor día de la semana</h2>
              <p className="text-xs text-[#6b7280] mb-4">Cobros por día</p>
              {(() => {
                const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                const counts = [0, 0, 0, 0, 0, 0, 0];
                for (const c of filteredClaims) {
                  const d = new Date(c.claimed_at).getDay();
                  counts[d]++;
                }
                const maxDay = counts.indexOf(Math.max(...counts));
                return (
                  <div className="flex gap-2 flex-wrap">
                    {DAYS.map((day, i) => {
                      const isTop = i === maxDay;
                      return (
                        <div key={day} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isTop ? 'text-white' : 'text-[#6b7280] bg-[#FAFAF9]'}`}
                          style={isTop ? { background: '#F97316' } : {}}>
                          <span>{day}</span>
                          <span className={isTop ? 'text-white/80 font-normal' : 'text-[#6b7280] font-normal'}>{counts[i]}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Tiempo promedio de cobro */}
            <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6" style={{ boxShadow: cardShadow }}>
              <h2 className="text-sm font-bold text-[#1C1917] mb-1">Tiempo promedio de cobro</h2>
              <p className="text-xs text-[#6b7280] mb-4">Desde registro hasta entrega</p>
              {(() => {
                const delivered = filteredClaims.filter((c) => c.status === 'delivered' && (c as { delivered_at?: string | null }).delivered_at);
                if (delivered.length === 0) {
                  return <p className="text-sm text-[#6b7280]">Sin cobros entregados aún</p>;
                }
                const avgMs = delivered.reduce((sum, c) => {
                  const start = new Date(c.claimed_at).getTime();
                  const end = new Date((c as unknown as { delivered_at: string }).delivered_at).getTime();
                  return sum + (end - start);
                }, 0) / delivered.length;
                const avgH = avgMs / (1000 * 60 * 60);
                const display = avgH < 1
                  ? `${Math.round(avgH * 60)} min`
                  : avgH < 24
                    ? `${avgH.toFixed(1)} hrs`
                    : `${(avgH / 24).toFixed(1)} días`;
                return (
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#fde8e0' }}>
                      <svg className="w-6 h-6" style={{ color: '#F97316' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-3xl font-black text-[#1C1917]">{display}</p>
                      <p className="text-xs text-[#6b7280] mt-1">sobre {delivered.length} cobros entregados</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

      </div>

      {/* Guided onboarding tooltip tour */}
      <OnboardingTour />
      </div>{/* px-6 py-8 */}
    </div>
  );
}
