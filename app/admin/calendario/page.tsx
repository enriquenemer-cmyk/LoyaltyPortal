'use client';
import { CalendarIcon } from '@heroicons/react/24/outline';

import { useEffect, useState, useCallback } from 'react';

type Prize = {
  id: string;
  name: string;
  reason: string;
  start_date: string;
  end_date: string;
  description: string;
  location: string;
  restaurant_id: string | null;
  cancelled: boolean;
  created_at: string;
  restaurant_name: string | null;
  claim_count: number;
};

function getPrizeStatus(prize: Prize, date: Date): 'active' | 'expiring' | 'expired' | null {
  const start = new Date(prize.start_date + 'T00:00:00');
  const end = new Date(prize.end_date + 'T23:59:59');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  if (dayStart < start || dayStart > end) return null;
  if (prize.cancelled) return 'expired';

  const endMidnight = new Date(prize.end_date + 'T00:00:00');
  const diffMs = endMidnight.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'expired';
  if (diffDays <= 3) return 'expiring';
  return 'active';
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function CalendarioPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/prizes/list')
      .then((r) => r.json())
      .then((data) => {
        setPrizes(data.prizes ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError('No se pudieron cargar los premios.');
        setLoading(false);
      });
  }, []);

  const goToPrevMonth = useCallback(() => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setSelectedDay(null);
  }, [month]);

  const goToNextMonth = useCallback(() => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setSelectedDay(null);
  }, [month]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const getPrizesForDay = (day: number) => {
    const date = new Date(year, month, day);
    return prizes
      .map((p) => ({ prize: p, status: getPrizeStatus(p, date) }))
      .filter((x) => x.status !== null) as { prize: Prize; status: 'active' | 'expiring' | 'expired' }[];
  };

  const selectedDayPrizes = selectedDay !== null ? getPrizesForDay(selectedDay) : [];

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const statusDotClass: Record<string, string> = {
    active: 'bg-green-500',
    expiring: 'bg-[#2563EB]',
    expired: 'bg-stone-400',
  };

  const statusLabel: Record<string, string> = {
    active: 'Activo',
    expiring: 'Por vencer',
    expired: 'Expirado',
  };

  return (
    <div className="min-h-screen">
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-5xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <CalendarIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Calendario
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Calendario</h1>
            <p className="text-blue-200/70 mt-1.5 text-sm">Visualiza los premios activos, por vencer y expirados por día.</p>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 md:px-10 py-6">

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>
        )}

        <div className="flex gap-6 items-start">
          {/* Calendar card */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-[#E8E3DC] p-6" style={{ boxShadow: '0 1px 2px rgba(28,25,23,0.04), 0 4px 16px rgba(28,25,23,0.06)' }}>

            {/* Month navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={goToPrevMonth}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#78716c] border border-[#E8E3DC] bg-white rounded-full px-4 py-2 hover:border-blue-200 hover:text-[#2563EB] transition-all"
                aria-label="Mes anterior"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Anterior
              </button>
              <h2 className="text-lg font-extrabold text-[#1C1917]">
                {MONTH_NAMES[month]} {year}
              </h2>
              <button
                onClick={goToNextMonth}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#78716c] border border-[#E8E3DC] bg-white rounded-full px-4 py-2 hover:border-blue-200 hover:text-[#2563EB] transition-all"
                aria-label="Mes siguiente"
              >
                Siguiente
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-center text-[10px] font-bold text-[#a8a29e] uppercase tracking-widest py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            {loading ? (
              <div className="h-56 flex items-center justify-center">
                <svg className="animate-spin w-8 h-8 text-[#2563EB]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, idx) => {
                  if (day === null) return <div key={`empty-${idx}`} />;

                  const dayPrizes = getPrizesForDay(day);
                  const isSelected = selectedDay === day;
                  const todayCell = isToday(day);

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      className={`
                        relative min-h-[56px] rounded-xl p-1.5 text-left transition-all border
                        ${todayCell
                          ? 'bg-[#2563EB] border-[#2563EB] shadow-md shadow-blue-200'
                          : isSelected
                            ? 'ring-2 ring-[#2563EB] bg-blue-50 border-blue-200'
                            : 'border-transparent hover:bg-blue-50 hover:border-blue-100'
                        }
                      `}
                    >
                      <span className={`text-xs font-bold ${todayCell ? 'text-white' : isSelected ? 'text-[#2563EB]' : 'text-[#1C1917]'}`}>
                        {day}
                      </span>
                      {dayPrizes.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {dayPrizes.slice(0, 4).map(({ prize, status }) => (
                            <span
                              key={prize.id}
                              className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-green-500' + (todayCell ? '' : ' ') : statusDotClass[status]} ${status === 'active' && !todayCell ? 'animate-pulse' : ''}`}
                              title={prize.name}
                              style={{ width: 8, height: 8, borderRadius: 4, display: 'inline-block', backgroundColor: status === 'active' ? '#22c55e' : status === 'expiring' ? '#2563EB' : '#a8a29e' }}
                            />
                          ))}
                          {dayPrizes.length > 4 && (
                            <span className={`text-[9px] leading-none self-end font-bold ${todayCell ? 'text-white/80' : 'text-[#a8a29e]'}`}>
                              +{dayPrizes.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-[#E8E3DC] flex items-center gap-3 flex-wrap">
              <span className="text-[10px] font-bold text-[#a8a29e] uppercase tracking-widest">Leyenda</span>
              <span className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-2.5 py-1 text-xs font-semibold text-green-700">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
                Activo
              </span>
              <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-1 text-xs font-semibold text-[#2563EB]">
                <span className="w-2 h-2 rounded-full bg-[#2563EB] inline-block" />
                Por vencer (3 días)
              </span>
              <span className="inline-flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-full px-2.5 py-1 text-xs font-semibold text-stone-500">
                <span className="w-2 h-2 rounded-full bg-stone-400 inline-block" />
                Expirado
              </span>
            </div>
          </div>

          {/* Side panel */}
          {selectedDay !== null && (
            <div className="w-72 bg-white rounded-2xl border border-[#E8E3DC] p-5 self-start shrink-0" style={{ boxShadow: '0 1px 2px rgba(28,25,23,0.04), 0 4px 16px rgba(28,25,23,0.06)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold text-[#a8a29e] uppercase tracking-widest">
                    {MONTH_NAMES[month]} {year}
                  </p>
                  <h3 className="font-extrabold text-[#1C1917] text-lg leading-tight">
                    {selectedDay} de {MONTH_NAMES[month]}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-[#E8E3DC] text-[#a8a29e] hover:text-[#1C1917] transition-colors"
                  aria-label="Cerrar panel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {selectedDayPrizes.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-stone-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                  </div>
                  <p className="text-sm text-[#78716c] font-medium">Sin premios este día</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-[#a8a29e] uppercase tracking-widest mb-3">
                    {selectedDayPrizes.length} premio{selectedDayPrizes.length !== 1 ? 's' : ''}
                  </p>
                  {selectedDayPrizes.map(({ prize, status }) => {
                    const isExpanded = expandedId === prize.id;
                    return (
                      <div key={prize.id} className="rounded-xl border border-[#E8E3DC] overflow-hidden">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : prize.id)}
                          className="w-full flex items-center gap-2.5 p-3 text-left hover:bg-[#FAFAF9] transition-colors"
                        >
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${status === 'active' ? 'bg-green-500 animate-pulse' : status === 'expiring' ? 'bg-[#2563EB]' : 'bg-stone-400'}`}
                          />
                          <p className="text-sm font-semibold text-[#1C1917] truncate flex-1">{prize.name}</p>
                          <svg
                            className={`w-3.5 h-3.5 text-[#a8a29e] shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-3 border-t border-[#E8E3DC] bg-[#FAFAF9]">
                            <div className="pt-2 space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-[#a8a29e] uppercase tracking-widest">Estado</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${status === 'active' ? 'bg-green-100 text-green-700' : status === 'expiring' ? 'bg-blue-100 text-[#2563EB]' : 'bg-stone-100 text-stone-500'}`}>
                                  {statusLabel[status]}
                                </span>
                              </div>
                              {prize.reason && <p className="text-xs text-[#78716c]">{prize.reason}</p>}
                              {prize.restaurant_name && (
                                <p className="text-xs text-[#a8a29e] flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                  </svg>
                                  {prize.restaurant_name}
                                </p>
                              )}
                              <p className="text-[10px] text-[#a8a29e]">
                                {prize.start_date} — {prize.end_date}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
