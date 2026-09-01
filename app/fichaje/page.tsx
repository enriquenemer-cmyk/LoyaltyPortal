'use client';

import { useCallback, useEffect, useState } from 'react';

type Employee = {
  id: string;
  full_name: string;
  position: string | null;
  photo_url: string | null;
  scheduled_hours_per_day: number | null;
  scheduled_start_time: string | null;
  work_days: string | null;
  vacation_days_per_year: number;
  vacation_days_used: number;
};

type OpenEntry = { id: string; clock_in: string };

type HistoryEntry = {
  id: string;
  clock_in: string;
  clock_out: string | null;
  hours_worked: number;
};

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  created_at: string;
  read_at: string | null;
};

type Dashboard = {
  employee: Employee;
  openEntry: OpenEntry | null;
  history: HistoryEntry[];
  weekHours: number;
  monthHours: number;
  vacationAccrued: number;
  vacationAvailable: number;
  notifications: Notification[];
};

type Phase = 'pin' | 'dashboard' | 'confirm';

const MAX_PIN_LENGTH = 6;
const DAY_LABELS: Record<string, string> = {
  lun: 'L', mar: 'M', mie: 'X', jue: 'J', vie: 'V', sab: 'S', dom: 'D',
};
const ALL_DAYS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
const TODAY_KEY = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'][new Date().getDay()];

function fmt(d: string) {
  return new Date(d).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function fmtHours(h: number) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
}
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export default function FichajePage() {
  const [phase, setPhase] = useState<Phase>('pin');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [now, setNow] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'fichar' | 'historial' | 'turnos' | 'notif'>('fichar');

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const resetToPin = useCallback(() => {
    setPin('');
    setError(null);
    setDashboard(null);
    setPhase('pin');
    setActiveTab('fichar');
  }, []);

  async function loadDashboard() {
    try {
      const res = await fetch('/api/employees/dashboard');
      if (res.ok) {
        const data = await res.json();
        if (data.employee) {
          setDashboard(data);
          setPhase('dashboard');
        }
      }
    } catch { /* ignore */ }
  }

  useEffect(() => { loadDashboard(); }, []);

  function handleDigit(d: string) {
    if (loading) return;
    setError(null);
    setPin(p => p.length < MAX_PIN_LENGTH ? p + d : p);
  }

  async function handleConfirmPin() {
    if (pin.length < 4) { setError('El PIN debe tener al menos 4 dígitos.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/employees/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'PIN incorrecto.'); setPin(''); }
      else { setPin(''); await loadDashboard(); }
    } catch { setError('Error de conexión.'); }
    finally { setLoading(false); }
  }

  function getLocation(): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise(resolve => {
      if (!('geolocation' in navigator)) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  }

  async function handleClockAction(action: 'in' | 'out') {
    setLoading(true);
    setError(null);
    try {
      const location = await getLocation();
      const res = await fetch('/api/employees/clock', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...(location ?? {}) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'No se pudo registrar.'); return; }
      setConfirmMessage(action === 'in' ? '¡Entrada registrada!' : '¡Salida registrada!');
      setPhase('confirm');
      setTimeout(async () => {
        await fetch('/api/employees/logout', { method: 'POST' }).catch(() => {});
        resetToPin();
      }, 3000);
    } catch { setError('Error de conexión.'); }
    finally { setLoading(false); }
  }

  const timeStr = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

  const emp = dashboard?.employee;
  const workDays = (emp?.work_days ?? 'lun,mar,mie,jue,vie').split(',').map(d => d.trim());
  const unreadCount = dashboard?.notifications.filter(n => !n.read_at).length ?? 0;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: 'linear-gradient(135deg,#7C2D12 0%,#C2410C 35%,#F97316 60%,#7c3aed 100%)' }}>
      <div className="w-full max-w-md">

        {/* ── PIN phase ── */}
        {phase === 'pin' && (
          <div className="rounded-3xl p-6 sm:p-8" style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(249,115,22,0.1)', color: '#C2410C' }}>
                ⏰ Control de Horarios
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#1C1917]">Ingresa tu PIN</h1>
              <p className="text-stone-500 text-sm mt-1 capitalize">{dateStr} · {timeStr}</p>
            </div>
            <div className="flex items-center justify-center gap-3 mb-6">
              {Array.from({ length: MAX_PIN_LENGTH }).map((_, i) => (
                <div key={i} className="w-4 h-4 rounded-full transition-all"
                  style={{ background: i < pin.length ? '#F97316' : '#e5e7eb', transform: i < pin.length ? 'scale(1.15)' : 'scale(1)' }} />
              ))}
            </div>
            {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl px-4 py-3 text-center">{error}</div>}
            <div className="grid grid-cols-3 gap-3">
              {['1','2','3','4','5','6','7','8','9'].map(d => (
                <button key={d} type="button" onClick={() => handleDigit(d)} disabled={loading}
                  className="aspect-square rounded-2xl text-2xl font-bold text-[#1C1917] bg-stone-100 hover:bg-orange-50 active:scale-95 transition-all disabled:opacity-50">
                  {d}
                </button>
              ))}
              <button type="button" onClick={() => setPin(p => p.slice(0, -1))} disabled={loading}
                className="aspect-square rounded-2xl text-lg font-bold text-stone-500 bg-stone-100 hover:bg-stone-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center">⌫</button>
              <button type="button" onClick={() => handleDigit('0')} disabled={loading}
                className="aspect-square rounded-2xl text-2xl font-bold text-[#1C1917] bg-stone-100 hover:bg-orange-50 active:scale-95 transition-all disabled:opacity-50">0</button>
              <button type="button" onClick={handleConfirmPin} disabled={loading || pin.length < 4}
                className="aspect-square rounded-2xl text-lg font-bold text-white bg-[#F97316] hover:bg-[#C2410C] active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center">
                {loading ? '…' : '✓'}
              </button>
            </div>
          </div>
        )}

        {/* ── Dashboard phase ── */}
        {phase === 'dashboard' && dashboard && emp && (
          <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
            {/* Header */}
            <div className="px-6 pt-6 pb-4" style={{ background: 'linear-gradient(135deg,#7C2D12,#C2410C)' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black text-white shrink-0"
                  style={{ background: 'rgba(255,255,255,0.2)' }}>
                  {emp.full_name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-black text-lg leading-tight truncate">{emp.full_name}</p>
                  {emp.position && <p className="text-orange-200 text-xs">{emp.position}</p>}
                </div>
                <div className="text-right">
                  <p className="text-white font-black tabular-nums text-lg">{timeStr}</p>
                  <p className="text-orange-200 text-xs capitalize">{now.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                </div>
              </div>

              {/* KPI row */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[
                  { label: 'Esta semana', value: fmtHours(dashboard.weekHours) },
                  { label: 'Este mes', value: fmtHours(dashboard.monthHours) },
                  { label: 'Vacaciones', value: `${dashboard.vacationAvailable}d` },
                ].map(k => (
                  <div key={k.label} className="rounded-xl px-3 py-2 text-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <p className="text-white font-black text-base">{k.value}</p>
                    <p className="text-orange-200 text-[10px] font-medium">{k.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-stone-100">
              {([
                { key: 'fichar', label: 'Fichar' },
                { key: 'historial', label: 'Historial' },
                { key: 'turnos', label: 'Mis Turnos' },
                { key: 'notif', label: unreadCount > 0 ? `Avisos (${unreadCount})` : 'Avisos' },
              ] as const).map(t => (
                <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
                  className="flex-1 py-3 text-xs font-bold transition-all"
                  style={activeTab === t.key
                    ? { color: '#C2410C', borderBottom: '2px solid #C2410C' }
                    : { color: '#9ca3af' }}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="px-5 py-5">
              {/* ── Tab: Fichar ── */}
              {activeTab === 'fichar' && (
                <div className="space-y-4">
                  {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl px-4 py-3 text-center">{error}</div>}
                  {dashboard.openEntry ? (
                    <>
                      <div className="rounded-2xl p-4 text-center" style={{ background: '#fef2f2', border: '2px solid #fecaca' }}>
                        <p className="text-red-700 text-xs font-bold uppercase tracking-wide mb-1">Turno activo desde</p>
                        <p className="text-red-800 font-black text-lg">{fmt(dashboard.openEntry.clock_in)}</p>
                        <p className="text-red-600 text-sm mt-1">
                          {fmtHours((Date.now() - new Date(dashboard.openEntry.clock_in).getTime()) / 3600000)} trabajados
                        </p>
                      </div>
                      <button type="button" onClick={() => handleClockAction('out')} disabled={loading}
                        className="w-full py-5 rounded-2xl text-xl font-black text-white transition-all disabled:opacity-60"
                        style={{ background: '#ef4444', boxShadow: '0 8px 24px rgba(239,68,68,0.35)' }}>
                        {loading ? 'Registrando…' : '🔴 Marcar Salida'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="rounded-2xl p-4 text-center" style={{ background: '#f0fdf4', border: '2px solid #bbf7d0' }}>
                        <p className="text-emerald-700 text-xs font-bold uppercase tracking-wide mb-1">Sin turno activo</p>
                        <p className="text-emerald-800 font-black text-sm">Marca tu entrada para comenzar</p>
                      </div>
                      <button type="button" onClick={() => handleClockAction('in')} disabled={loading}
                        className="w-full py-5 rounded-2xl text-xl font-black text-white transition-all disabled:opacity-60"
                        style={{ background: '#10b981', boxShadow: '0 8px 24px rgba(16,185,129,0.35)' }}>
                        {loading ? 'Registrando…' : '🟢 Marcar Entrada'}
                      </button>
                    </>
                  )}
                  <button type="button" onClick={async () => { await fetch('/api/employees/logout', { method: 'POST' }); resetToPin(); }}
                    className="w-full text-sm font-medium text-stone-400 hover:text-stone-600 pt-1">
                    No soy yo — cambiar usuario
                  </button>
                </div>
              )}

              {/* ── Tab: Historial ── */}
              {activeTab === 'historial' && (
                <div className="space-y-2">
                  {dashboard.history.length === 0 && (
                    <p className="text-stone-400 text-sm text-center py-6">Sin registros recientes</p>
                  )}
                  {dashboard.history.map(h => (
                    <div key={h.id} className="flex items-center justify-between rounded-xl px-4 py-3"
                      style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div>
                        <p className="text-stone-800 font-bold text-sm">{fmtDate(h.clock_in)}</p>
                        <p className="text-stone-500 text-xs">
                          {new Date(h.clock_in).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                          {h.clock_out ? ` → ${new Date(h.clock_out).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}` : ' → en curso'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-sm" style={{ color: h.clock_out ? '#059669' : '#F97316' }}>
                          {fmtHours(h.hours_worked)}
                        </span>
                        {!h.clock_out && <p className="text-[10px] text-orange-500 font-bold">activo</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Tab: Turnos ── */}
              {activeTab === 'turnos' && (
                <div className="space-y-4">
                  {/* Days of week */}
                  <div>
                    <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mb-3">Días de trabajo</p>
                    <div className="flex gap-2 justify-center">
                      {ALL_DAYS.map(d => {
                        const active = workDays.includes(d);
                        const isToday = d === TODAY_KEY;
                        return (
                          <div key={d} className="flex flex-col items-center gap-1">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm"
                              style={{
                                background: active ? (isToday ? '#C2410C' : '#fff7ed') : '#f1f5f9',
                                color: active ? (isToday ? '#fff' : '#C2410C') : '#94a3b8',
                                border: isToday ? '2px solid #C2410C' : '2px solid transparent',
                              }}>
                              {DAY_LABELS[d]}
                            </div>
                            {isToday && <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Schedule info */}
                  <div className="rounded-2xl p-4 space-y-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500 text-sm">Hora de entrada</span>
                      <span className="font-black text-stone-800">
                        {emp.scheduled_start_time
                          ? emp.scheduled_start_time.slice(0, 5)
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500 text-sm">Horas por día</span>
                      <span className="font-black text-stone-800">{emp.scheduled_hours_per_day ?? '—'}h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500 text-sm">Días laborales</span>
                      <span className="font-black text-stone-800">{workDays.length} días/semana</span>
                    </div>
                  </div>

                  {/* Vacation */}
                  <div className="rounded-2xl p-4" style={{ background: '#fffbeb', border: '2px solid #fde68a' }}>
                    <p className="text-amber-700 text-xs font-bold uppercase tracking-widest mb-3">Vacaciones</p>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-amber-800 text-sm">Acumuladas</span>
                      <span className="font-black text-amber-800">{dashboard.vacationAccrued} días</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-amber-800 text-sm">Usadas</span>
                      <span className="font-black text-amber-800">{emp.vacation_days_used} días</span>
                    </div>
                    <div className="h-px bg-amber-200 my-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-amber-900 font-bold text-sm">Disponibles</span>
                      <span className="font-black text-amber-900 text-lg">{dashboard.vacationAvailable} días</span>
                    </div>
                    {/* progress bar */}
                    <div className="mt-3 h-2 rounded-full bg-amber-100 overflow-hidden">
                      <div className="h-full rounded-full bg-amber-400 transition-all"
                        style={{ width: `${Math.min(100, (dashboard.vacationAvailable / (emp.vacation_days_per_year || 12)) * 100)}%` }} />
                    </div>
                    <p className="text-amber-600 text-[10px] mt-1 text-center">{emp.vacation_days_per_year} días por año</p>
                  </div>
                </div>
              )}

              {/* ── Tab: Notificaciones ── */}
              {activeTab === 'notif' && (
                <div className="space-y-3">
                  {dashboard.notifications.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-4xl mb-2">🔔</p>
                      <p className="text-stone-400 text-sm">Sin notificaciones</p>
                    </div>
                  )}
                  {dashboard.notifications.map(n => (
                    <div key={n.id} className="rounded-xl px-4 py-3 relative"
                      style={{
                        background: n.read_at ? '#f8fafc' : '#fff7ed',
                        border: n.read_at ? '1px solid #e2e8f0' : '2px solid #fed7aa',
                      }}>
                      {!n.read_at && (
                        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-orange-500" />
                      )}
                      <p className="text-stone-800 font-bold text-sm pr-4">{n.title}</p>
                      <p className="text-stone-600 text-xs mt-0.5 leading-relaxed">{n.body}</p>
                      <p className="text-stone-400 text-[10px] mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Confirm phase ── */}
        {phase === 'confirm' && (
          <div className="rounded-3xl p-10 text-center" style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
            <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)' }}>
              <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-[#1C1917]">{confirmMessage}</h2>
            <p className="text-stone-500 text-sm mt-2">¡Que tengas un excelente turno!</p>
          </div>
        )}
      </div>
    </div>
  );
}
