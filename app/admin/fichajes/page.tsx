'use client';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import WeekdayBarChart from '@/app/components/WeekdayBarChart';

type Employee = {
  id: string;
  restaurant_id: string | null;
  full_name: string;
  position: string | null;
  photo_url: string | null;
  active: boolean;
  total_training_points: number;
  created_at: string;
};

type TimeClockEntry = {
  id: string;
  employee_id: string;
  full_name: string;
  position: string | null;
  clock_in: string;
  clock_out: string | null;
  duration_seconds: number | null;
  is_active: boolean;
};

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

type LeaderboardEntry = {
  employee_id: string;
  full_name: string;
  position: string | null;
  total_hours: number;
};

type Anomaly = {
  id: string;
  type: 'long_shift' | 'forgotten_clock_out';
  employee_id: string;
  full_name: string;
  clock_in: string;
  clock_out: string | null;
  hours: number;
};

type WeekdayHour = { label: string; value: number };

function AnomalyWarnings({ anomalies }: { anomalies: Anomaly[] }) {
  if (anomalies.length === 0) return null;
  return (
    <div
      className="rounded-2xl border border-amber-200 bg-amber-50 p-5 mb-6"
      style={{ boxShadow: '0 1px 2px rgba(217,119,6,0.05), 0 4px 12px rgba(217,119,6,0.08)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg leading-none"><ExclamationTriangleIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span>
        <span className="font-bold text-amber-800 text-sm">
          {anomalies.length === 1 ? '1 anomalía detectada en fichajes' : `${anomalies.length} anomalías detectadas en fichajes`}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {anomalies.map((a) => (
          <li key={a.id} className="text-xs text-amber-900 flex items-center justify-between gap-2 flex-wrap">
            <span className="font-semibold">{a.full_name}</span>
            <span className="text-amber-700">
              {a.type === 'long_shift'
                ? `Turno de ${a.hours.toFixed(1)}h (excede 12h)`
                : `Sin fichar salida desde hace ${a.hours.toFixed(1)}h — posible olvido`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HoursLeaderboard({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  if (leaderboard.length === 0) {
    return (
      <div className="bg-white border border-[#E8E3DC] rounded-2xl p-6 shadow-sm">
        <p className="text-sm text-stone-400">Sin horas registradas esta semana.</p>
      </div>
    );
  }
  const max = Math.max(...leaderboard.map((l) => l.total_hours), 1);
  return (
    <div className="bg-white border border-[#E8E3DC] rounded-2xl p-6 shadow-sm flex flex-col gap-3">
      {leaderboard.map((entry, i) => {
        const pct = Math.round((entry.total_hours / max) * 100);
        return (
          <div key={entry.employee_id} className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600 shrink-0 w-36 truncate" title={entry.full_name}>
              {i + 1}. {entry.full_name}
            </span>
            <div className="flex-1 bg-slate-100 rounded-full" style={{ height: 8 }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #2563EB, #0EA5E9)',
                  borderRadius: 4,
                  minWidth: pct > 0 ? 4 : 0,
                  transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
                }}
              />
            </div>
            <span className="text-xs font-black text-slate-700 shrink-0 tabular-nums w-16 text-right">
              {entry.total_hours.toFixed(1)}h
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function FichajesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<TimeClockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ full_name: '', pin: '', position: '' });

  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetPinValue, setResetPinValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [weekdayHours, setWeekdayHours] = useState<WeekdayHour[]>([]);

  async function loadReports() {
    const res = await fetch('/api/admin/time-clock/reports');
    if (res.ok) {
      const data = await res.json();
      setLeaderboard(data.leaderboard ?? []);
      setAnomalies(data.anomalies ?? []);
      setWeekdayHours(data.weekdayHours ?? []);
    }
  }

  async function loadEmployees() {
    const res = await fetch('/api/admin/employees');
    if (res.ok) {
      const data = await res.json();
      setEmployees(data.employees ?? []);
    }
  }

  async function loadEntries() {
    const res = await fetch('/api/admin/time-clock');
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries ?? []);
    }
  }

  useEffect(() => {
    Promise.all([loadEmployees(), loadEntries(), loadReports()]).finally(() => setLoading(false));
  }, []);

  const kpis = useMemo(() => {
    const activeEmployees = employees.filter((e) => e.active).length;
    const clockedNow = entries.filter((e) => e.is_active).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hoursToday = entries.reduce((sum, e) => {
      const clockIn = new Date(e.clock_in);
      if (clockIn < today) return sum;
      if (e.duration_seconds) return sum + e.duration_seconds / 3600;
      if (e.is_active) {
        return sum + (Date.now() - clockIn.getTime()) / 1000 / 3600;
      }
      return sum;
    }, 0);

    return { activeEmployees, clockedNow, hoursToday: hoursToday.toFixed(1) };
  }, [employees, entries]);

  async function handleCreateEmployee(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{4,6}$/.test(form.pin)) {
      setError('El PIN debe tener entre 4 y 6 dígitos.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: form.full_name, pin: form.pin, position: form.position }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Error al crear empleado.');
      } else {
        setForm({ full_name: '', pin: '', position: '' });
        setShowForm(false);
        await loadEmployees();
        setSuccess('Empleado creado exitosamente.');
        setTimeout(() => setSuccess(null), 4000);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPin(id: string) {
    if (!/^\d{4,6}$/.test(resetPinValue)) {
      setError('El nuevo PIN debe tener entre 4 y 6 dígitos.');
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/admin/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: resetPinValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Error al resetear PIN.');
      } else {
        setResettingId(null);
        setResetPinValue('');
        setSuccess('PIN actualizado.');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch {
      setError('Error de conexión.');
    }
  }

  async function handleDeactivate(id: string, name: string) {
    if (!confirm(`¿Desactivar a "${name}"? Ya no podrá fichar con su PIN.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/employees/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadEmployees();
        setSuccess('Empleado desactivado.');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json();
        setError(data.error ?? 'Error al desactivar empleado.');
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-6xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              ⏰ Fichajes
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Fichajes</h1>
            <p className="text-orange-200/70 mt-1.5 text-sm">Control de horarios y asistencia del personal</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/fichaje"
              target="_blank"
              className="flex items-center gap-2 font-bold px-5 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              Abrir pantalla de fichaje
            </Link>
            <button
              onClick={() => { setShowForm((v) => !v); setError(null); }}
              className="flex items-center gap-2 font-bold px-5 py-3 rounded-xl text-sm"
              style={{ background: 'white', color: '#111111', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Empleado
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-10 py-6">
        {success && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium rounded-xl px-4 py-3">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Anomaly warnings */}
        {!loading && <AnomalyWarnings anomalies={anomalies} />}

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-[#E8E3DC] rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Empleados activos</p>
            <p className="text-3xl font-black text-[#1C1917] mt-1">{kpis.activeEmployees}</p>
          </div>
          <div className="bg-white border border-[#E8E3DC] rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Fichados ahora</p>
            <p className="text-3xl font-black text-emerald-600 mt-1">{kpis.clockedNow}</p>
          </div>
          <div className="bg-white border border-[#E8E3DC] rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Horas trabajadas hoy</p>
            <p className="text-3xl font-black text-[#1C1917] mt-1">{kpis.hoursToday}h</p>
          </div>
        </div>

        {/* Reporting: leaderboard + weekday hours */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Horas trabajadas esta semana</p>
              <HoursLeaderboard leaderboard={leaderboard} />
            </div>
            <div className="bg-white border border-[#E8E3DC] rounded-2xl p-6 shadow-sm">
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Horas totales por día de la semana</p>
              <WeekdayBarChart data={weekdayHours} valueSuffix="h" />
            </div>
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <div className="bg-white border border-[#E8E3DC] rounded-2xl p-6 mb-6 shadow-sm">
            <h2 className="text-base font-semibold text-[#1C1917] mb-4">Crear nuevo empleado</h2>
            <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                  Nombre completo
                </label>
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="ej. Juan Pérez"
                  className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2.5 text-sm text-[#1C1917] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                  PIN (4-6 dígitos)
                </label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  pattern="\d{4,6}"
                  value={form.pin}
                  onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
                  placeholder="1234"
                  className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2.5 text-sm text-[#1C1917] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                  Puesto
                </label>
                <input
                  type="text"
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                  placeholder="ej. Cajero"
                  className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2.5 text-sm text-[#1C1917] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors"
                />
              </div>
              <div className="sm:col-span-3 flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#2563EB] hover:bg-[#0891B2] disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                >
                  {submitting ? 'Creando…' : 'Crear empleado'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(null); }}
                  className="text-sm font-medium text-stone-500 hover:text-[#1C1917] border border-[#E8E3DC] px-5 py-2.5 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Employees table */}
        <div className="bg-white border border-[#E8E3DC] rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-3.5 border-b border-[#E8E3DC] bg-[#FAFAF9]">
            <h2 className="text-sm font-semibold text-[#1C1917]">Empleados</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-stone-400 text-sm">Cargando…</div>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-stone-400">
              <p className="text-sm font-medium">No hay empleados creados aún</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E8E3DC] bg-[#FAFAF9]">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Nombre</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Puesto</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Estado</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Reset PIN</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, i) => (
                    <tr
                      key={emp.id}
                      className={`border-b border-[#E8E3DC] last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF9]/50'} hover:bg-orange-50/30 transition-colors`}
                    >
                      <td className="px-5 py-3.5 font-medium text-[#1C1917]">{emp.full_name}</td>
                      <td className="px-5 py-3.5 text-stone-600">{emp.position ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center text-xs font-semibold rounded-full px-2.5 py-1 ${
                            emp.active ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {emp.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {resettingId === emp.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="\d{4,6}"
                              value={resetPinValue}
                              onChange={(e) => setResetPinValue(e.target.value.replace(/\D/g, ''))}
                              placeholder="Nuevo PIN"
                              className="w-24 border border-[#E8E3DC] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                            />
                            <button
                              onClick={() => handleResetPin(emp.id)}
                              className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => { setResettingId(null); setResetPinValue(''); }}
                              className="text-xs font-semibold text-stone-400 hover:text-stone-600"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setResettingId(emp.id); setResetPinValue(''); }}
                            className="text-xs font-semibold text-[#2563EB] hover:text-[#1d4ed8] border border-[#2563EB]/30 hover:border-[#2563EB] px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Resetear PIN
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {emp.active && (
                          <button
                            onClick={() => handleDeactivate(emp.id, emp.full_name)}
                            disabled={deletingId === emp.id}
                            className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {deletingId === emp.id ? '…' : 'Desactivar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Time clock history */}
        <div className="bg-white border border-[#E8E3DC] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#E8E3DC] bg-[#FAFAF9]">
            <h2 className="text-sm font-semibold text-[#1C1917]">Historial de fichajes</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-stone-400 text-sm">Cargando…</div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-stone-400">
              <p className="text-sm font-medium">Aún no hay fichajes registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E8E3DC] bg-[#FAFAF9]">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Empleado</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Entrada</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Salida</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Horas trabajadas</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => (
                    <tr
                      key={entry.id}
                      className={`border-b border-[#E8E3DC] last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF9]/50'} hover:bg-orange-50/30 transition-colors`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-[#1C1917]">{entry.full_name}</div>
                        {entry.position && <div className="text-xs text-stone-400">{entry.position}</div>}
                      </td>
                      <td className="px-5 py-3.5 text-stone-600">
                        {new Date(entry.clock_in).toLocaleString('es-MX', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-stone-600">
                        {entry.clock_out
                          ? new Date(entry.clock_out).toLocaleString('es-MX', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-stone-600">{formatDuration(entry.duration_seconds)}</td>
                      <td className="px-5 py-3.5">
                        {entry.is_active ? (
                          <span className="inline-flex items-center text-xs font-semibold rounded-full px-2.5 py-1 bg-emerald-100 text-emerald-700">
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-semibold rounded-full px-2.5 py-1 bg-stone-100 text-stone-500">
                            Cerrado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
