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
  hourly_rate: number | null;
  scheduled_hours_per_day: number | null;
  scheduled_start_time: string | null;
  created_at: string;
};

type TimeClockEntry = {
  id: string;
  employee_id: string;
  full_name: string;
  position: string | null;
  clock_in: string;
  clock_out: string | null;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
  duration_seconds: number | null;
  is_active: boolean;
};

function mapsLink(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

// Minutes late vs. the employee's expected start time, or null if not
// configured / not late. Compares local time-of-day only (not the date).
function lateMinutes(clockInIso: string, scheduledStartTime: string | null): number | null {
  if (!scheduledStartTime) return null;
  const clockIn = new Date(clockInIso);
  const [h, m] = scheduledStartTime.split(':').map(Number);
  const expected = new Date(clockIn);
  expected.setHours(h, m, 0, 0);
  const diffMin = Math.round((clockIn.getTime() - expected.getTime()) / 60000);
  return diffMin > 5 ? diffMin : null;
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
                  background: 'linear-gradient(90deg, #F97316, #F97316)',
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
  const [form, setForm] = useState({ full_name: '', pin: '', position: '', hourly_rate: '', scheduled_hours_per_day: '8', scheduled_start_time: '09:00' });
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [detailRate, setDetailRate] = useState('');
  const [detailHours, setDetailHours] = useState('');
  const [detailStartTime, setDetailStartTime] = useState('');
  const [savingDetail, setSavingDetail] = useState(false);

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
        body: JSON.stringify({
          full_name: form.full_name,
          pin: form.pin,
          position: form.position,
          hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
          scheduled_hours_per_day: form.scheduled_hours_per_day ? Number(form.scheduled_hours_per_day) : null,
          scheduled_start_time: form.scheduled_start_time || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Error al crear empleado.');
      } else {
        setForm({ full_name: '', pin: '', position: '', hourly_rate: '', scheduled_hours_per_day: '8', scheduled_start_time: '09:00' });
        setShowForm(false);
        await loadEmployees();
        setSuccess('Empleado creado exitosamente.');
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch {
      setError('Error de conexión.');
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
    } catch {
      setError('Error de conexión.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSaveDetail() {
    if (!selectedEmployee) return;
    setSavingDetail(true);
    try {
      const res = await fetch(`/api/admin/employees/${selectedEmployee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hourly_rate: detailRate ? Number(detailRate) : null,
          scheduled_hours_per_day: detailHours ? Number(detailHours) : null,
          scheduled_start_time: detailStartTime || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'No se pudo guardar.');
        return;
      }
      setSelectedEmployee(data.employee);
      await loadEmployees();
    } catch {
      setError('Error de conexión.');
    } finally {
      setSavingDetail(false);
    }
  }

  const selectedEntry = selectedEmployee
    ? entries.filter((e) => e.employee_id === selectedEmployee.id).sort((a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime())[0]
    : undefined;

  const selectedWorkedHours = selectedEntry
    ? selectedEntry.is_active
      ? (Date.now() - new Date(selectedEntry.clock_in).getTime()) / 3600000
      : (selectedEntry.duration_seconds ?? 0) / 3600
    : 0;

  const selectedScheduledHours = selectedEmployee?.scheduled_hours_per_day ? Number(selectedEmployee.scheduled_hours_per_day) : null;
  const selectedExpectedExit = selectedEntry && selectedScheduledHours
    ? new Date(new Date(selectedEntry.clock_in).getTime() + selectedScheduledHours * 3600000)
    : null;
  const selectedOvertimeHours = selectedScheduledHours != null ? Math.max(0, selectedWorkedHours - selectedScheduledHours) : 0;
  const selectedLateMinutes = selectedEntry ? lateMinutes(selectedEntry.clock_in, selectedEmployee?.scheduled_start_time ?? null) : null;
  const selectedHourlyRate = selectedEmployee?.hourly_rate != null ? Number(selectedEmployee.hourly_rate) : null;
  const selectedOvertimePay = selectedHourlyRate != null ? selectedOvertimeHours * selectedHourlyRate : null;
  const selectedRegularPay = selectedHourlyRate != null ? Math.min(selectedWorkedHours, selectedScheduledHours ?? selectedWorkedHours) * selectedHourlyRate : null;

  function exportPayrollCSV() {
    const headers = ['Empleado', 'Puesto', 'Entrada', 'Salida', 'Horas trabajadas', 'Minutos tarde', 'Pago por hora', 'Pago estimado'];
    const rows = entries.map((entry) => {
      const emp = employees.find((e) => e.id === entry.employee_id);
      const hours = entry.duration_seconds != null
        ? entry.duration_seconds / 3600
        : entry.is_active ? (Date.now() - new Date(entry.clock_in).getTime()) / 3600000 : 0;
      const rate = emp?.hourly_rate != null ? Number(emp.hourly_rate) : null;
      const late = lateMinutes(entry.clock_in, emp?.scheduled_start_time ?? null);
      return [
        entry.full_name,
        entry.position ?? '',
        new Date(entry.clock_in).toLocaleString('es-CO'),
        entry.clock_out ? new Date(entry.clock_out).toLocaleString('es-CO') : 'En curso',
        hours.toFixed(2),
        late != null ? String(late) : '0',
        rate != null ? rate.toFixed(0) : '',
        rate != null ? (hours * rate).toFixed(0) : '',
      ];
    });
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nomina-fichajes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
                  className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2.5 text-sm text-[#1C1917] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316] transition-colors"
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
                  className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2.5 text-sm text-[#1C1917] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316] transition-colors"
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
                  className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2.5 text-sm text-[#1C1917] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                  Pago por hora <span className="normal-case font-normal text-stone-400">(opcional)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={form.hourly_rate}
                  onChange={(e) => setForm((f) => ({ ...f, hourly_rate: e.target.value }))}
                  placeholder="Ej. 8000"
                  className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2.5 text-sm text-[#1C1917] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                  Horas programadas al día
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={form.scheduled_hours_per_day}
                  onChange={(e) => setForm((f) => ({ ...f, scheduled_hours_per_day: e.target.value }))}
                  placeholder="Ej. 8"
                  className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2.5 text-sm text-[#1C1917] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                  Hora de entrada esperada
                </label>
                <input
                  type="time"
                  value={form.scheduled_start_time}
                  onChange={(e) => setForm((f) => ({ ...f, scheduled_start_time: e.target.value }))}
                  className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2.5 text-sm text-[#1C1917] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316] transition-colors"
                />
              </div>
              <div className="sm:col-span-3 flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
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
                      <td className="px-5 py-3.5 font-medium text-[#1C1917]">
                        <button
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setDetailRate(emp.hourly_rate != null ? String(emp.hourly_rate) : '');
                            setDetailHours(emp.scheduled_hours_per_day != null ? String(emp.scheduled_hours_per_day) : '');
                            setDetailStartTime(emp.scheduled_start_time ? emp.scheduled_start_time.slice(0, 5) : '');
                          }}
                          className="hover:text-[#F97316] hover:underline transition-colors text-left"
                        >
                          {emp.full_name}
                        </button>
                      </td>
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
                              className="w-24 border border-[#E8E3DC] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/30"
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
                            className="text-xs font-semibold text-[#F97316] hover:text-[#C2410C] border border-[#F97316]/30 hover:border-[#F97316] px-3 py-1.5 rounded-lg transition-colors"
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
          <div className="px-5 py-3.5 border-b border-[#E8E3DC] bg-[#FAFAF9] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#1C1917]">Historial de fichajes</h2>
            <button
              onClick={exportPayrollCSV}
              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-orange-200 text-[#F97316] bg-orange-50 hover:bg-orange-100 transition-colors"
            >
              Exportar nómina CSV
            </button>
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
                        {new Date(entry.clock_in).toLocaleString('es-CO', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                        {(() => {
                          const emp = employees.find((e) => e.id === entry.employee_id);
                          const late = lateMinutes(entry.clock_in, emp?.scheduled_start_time ?? null);
                          return late != null ? (
                            <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                              {late}min tarde
                            </span>
                          ) : null;
                        })()}
                        {entry.clock_in_lat != null && entry.clock_in_lng != null && (
                          <a
                            href={mapsLink(entry.clock_in_lat, entry.clock_in_lng)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-[11px] font-semibold text-[#F97316] hover:underline mt-0.5"
                          >
                            📍 Ver ubicación
                          </a>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-stone-600">
                        {entry.clock_out
                          ? new Date(entry.clock_out).toLocaleString('es-CO', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                            })
                          : '—'}
                        {entry.clock_out_lat != null && entry.clock_out_lng != null && (
                          <a
                            href={mapsLink(entry.clock_out_lat, entry.clock_out_lng)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-[11px] font-semibold text-[#F97316] hover:underline mt-0.5"
                          >
                            📍 Ver ubicación
                          </a>
                        )}
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

      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setSelectedEmployee(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#1C1917]">{selectedEmployee.full_name}</h2>
                <p className="text-xs text-stone-400">{selectedEmployee.position ?? 'Sin puesto'}</p>
              </div>
              <button onClick={() => setSelectedEmployee(null)} className="text-stone-400 hover:text-stone-600 text-xl leading-none">✕</button>
            </div>

            {!selectedEntry ? (
              <p className="text-sm text-stone-400 py-6 text-center">Este empleado aún no tiene fichajes registrados.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-[#F0EDE8]">
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Fichó entrada</span>
                  <span className="text-sm font-bold text-[#1C1917] flex items-center gap-2">
                    {new Date(selectedEntry.clock_in).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {selectedLateMinutes != null && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                        {selectedLateMinutes}min tarde
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[#F0EDE8]">
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Tiempo trabajado</span>
                  <span className="text-sm font-bold text-[#1C1917]">
                    {formatDuration(Math.round(selectedWorkedHours * 3600))}
                    {selectedEntry.is_active && <span className="ml-1.5 text-emerald-600 text-xs font-semibold">● en curso</span>}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[#F0EDE8]">
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Hora de salida esperada</span>
                  <span className="text-sm font-bold text-[#1C1917]">
                    {selectedExpectedExit
                      ? selectedExpectedExit.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </span>
                </div>

                {selectedOvertimeHours > 0 && (
                  <div className="rounded-xl px-3 py-2.5 bg-amber-50 border border-amber-200">
                    <p className="text-xs font-bold text-amber-800">
                      +{selectedOvertimeHours.toFixed(1)}h de horas extra
                      {selectedOvertimePay != null && <> · estimado ${selectedOvertimePay.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</>}
                    </p>
                  </div>
                )}

                {selectedRegularPay != null && (
                  <div className="flex items-center justify-between py-2 border-b border-[#F0EDE8]">
                    <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Ganado hasta ahora</span>
                    <span className="text-sm font-bold text-[#1C1917]">
                      ${((selectedRegularPay ?? 0) + (selectedOvertimePay ?? 0)).toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between py-2 border-b border-[#F0EDE8]">
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Ubicación exacta</span>
                  {selectedEntry.clock_in_lat != null && selectedEntry.clock_in_lng != null ? (
                    <a
                      href={mapsLink(selectedEntry.clock_in_lat, selectedEntry.clock_in_lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-[#F97316] hover:underline"
                    >
                      📍 Ver en el mapa
                    </a>
                  ) : (
                    <span className="text-sm text-stone-400">No disponible</span>
                  )}
                </div>
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-[#F0EDE8]">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Configuración de pago y horario</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">Pago por hora</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={detailRate}
                    onChange={(e) => setDetailRate(e.target.value)}
                    placeholder="Ej. 8000"
                    className="w-full border border-[#E8E3DC] rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">Horas programadas/día</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={detailHours}
                    onChange={(e) => setDetailHours(e.target.value)}
                    placeholder="Ej. 8"
                    className="w-full border border-[#E8E3DC] rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-stone-400 mb-1">Hora de entrada esperada</label>
                  <input
                    type="time"
                    value={detailStartTime}
                    onChange={(e) => setDetailStartTime(e.target.value)}
                    className="w-full border border-[#E8E3DC] rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveDetail}
                disabled={savingDetail}
                className="mt-3 w-full py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60"
                style={{ background: '#F97316' }}
              >
                {savingDetail ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
