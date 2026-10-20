'use client';
import { useEffect, useMemo, useState } from 'react';

type Employee = { id: string; full_name: string };
type Shift = { id: string; employee_id: string; date: string; start_time: string; end_time: string; notes: string | null };
type Actual = { employee_id: string; date: string; first_clock_in: string; hours: string };

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Aritmética de fechas hecha toda en UTC a propósito: usar Date local +
// toISOString() desfasa un día completo para cualquier usuario en una zona
// horaria adelantada a UTC (toda Europa/África/Asia), porque toISOString()
// convierte la medianoche local a UTC y trunca hacia el día anterior.
function pad(n: number) { return String(n).padStart(2, '0'); }
function toDateStr(d: Date) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
function mondayOf(d: Date): string {
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = utc.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + diff);
  return toDateStr(utc);
}
function addDays(dateStr: string, n: number): string {
  const [y, m, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, day));
  d.setUTCDate(d.getUTCDate() + n);
  return toDateStr(d);
}
// "Hoy" según el calendario LOCAL de quien mira la pantalla (no UTC) — así
// coincide con el día que el negocio realmente está viviendo.
function todayLocalStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function hhmm(t: string) {
  return t.slice(0, 5);
}

export default function TurnosPage() {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [actuals, setActuals] = useState<Actual[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<{ employeeId: string; date: string } | null>(null);
  const [editStart, setEditStart] = useState('09:00');
  const [editEnd, setEditEnd] = useState('17:00');
  const [saving, setSaving] = useState(false);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/turnos?week_start=${weekStart}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudieron cargar los turnos');
      setEmployees(data.employees ?? []);
      setShifts(data.shifts ?? []);
      setActuals(data.actuals ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los turnos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [weekStart]);

  function shiftFor(employeeId: string, date: string) {
    return shifts.find((s) => s.employee_id === employeeId && s.date === date) ?? null;
  }
  function actualFor(employeeId: string, date: string) {
    return actuals.find((a) => a.employee_id === employeeId && a.date === date) ?? null;
  }

  function openEditor(employeeId: string, date: string) {
    const existing = shiftFor(employeeId, date);
    setEditStart(existing ? hhmm(existing.start_time) : '09:00');
    setEditEnd(existing ? hhmm(existing.end_time) : '17:00');
    setEditing({ employeeId, date });
  }

  async function guardarTurno() {
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/turnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: editing.employeeId, date: editing.date, start_time: editStart, end_time: editEnd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar el turno');
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el turno');
    } finally {
      setSaving(false);
    }
  }

  async function eliminarTurno() {
    if (!editing) return;
    const existing = shiftFor(editing.employeeId, editing.date);
    if (!existing) { setEditing(null); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/turnos/${existing.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo eliminar el turno');
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el turno');
    } finally {
      setSaving(false);
    }
  }

  const cardStyle = { background: 'var(--apple-bg-2)', border: '0.5px solid var(--apple-sep)', borderRadius: 12, boxShadow: 'var(--apple-shadow-2)' } as const;

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--apple-label)', margin: 0 }}>📅 Turnos Planeados</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Planea la semana y compara contra los fichajes reales.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} style={{ padding: '8px 12px', border: '0.5px solid var(--apple-sep)', borderRadius: 8, background: 'var(--apple-bg-2)', fontWeight: 800, cursor: 'pointer' }}>←</button>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{weekStart} — {days[6]}</span>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} style={{ padding: '8px 12px', border: '0.5px solid var(--apple-sep)', borderRadius: 8, background: 'var(--apple-bg-2)', fontWeight: 800, cursor: 'pointer' }}>→</button>
          <button onClick={() => setWeekStart(mondayOf(new Date()))} style={{ padding: '8px 12px', border: '2px solid #d1d5db', borderRadius: 8, background: 'var(--apple-bg-2)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Hoy</button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '2px solid #dc2626', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, fontWeight: 700, color: '#991b1b' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: '#9ca3af', fontSize: 13, padding: '32px 0', textAlign: 'center' }}>Cargando...</div>
      ) : employees.length === 0 ? (
        <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: '#9ca3af' }}>Sin empleados activos.</div>
      ) : (
        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '0.5px solid var(--apple-sep)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Empleado</th>
                  {days.map((d, i) => (
                    <th key={d} style={{ textAlign: 'center', padding: '10px 8px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280', minWidth: 90 }}>
                      {DAY_LABELS[i]}<br /><span style={{ fontWeight: 400, textTransform: 'none' }}>{d.slice(5)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, whiteSpace: 'nowrap' }}>{emp.full_name}</td>
                    {days.map((date) => {
                      const shift = shiftFor(emp.id, date);
                      const actual = actualFor(emp.id, date);
                      const isPast = date < todayLocalStr();
                      const noShow = shift && isPast && !actual;
                      let late = false;
                      if (shift && actual) {
                        const plannedStart = new Date(`${date}T${shift.start_time}`);
                        const realStart = new Date(actual.first_clock_in);
                        late = realStart.getTime() - plannedStart.getTime() > 15 * 60 * 1000;
                      }
                      return (
                        <td
                          key={date}
                          onClick={() => openEditor(emp.id, date)}
                          style={{
                            padding: '8px', textAlign: 'center', cursor: 'pointer',
                            background: noShow ? '#fee2e2' : late ? '#fef9c3' : shift ? '#f0fdf4' : 'transparent',
                          }}
                        >
                          {shift ? (
                            <div>
                              <div style={{ fontWeight: 800 }}>{hhmm(shift.start_time)}-{hhmm(shift.end_time)}</div>
                              {noShow && <div style={{ fontSize: 10, color: '#dc2626', fontWeight: 700 }}>Sin fichaje</div>}
                              {late && <div style={{ fontSize: 10, color: '#ca8a04', fontWeight: 700 }}>Llegó tarde</div>}
                              {actual && !noShow && !late && <div style={{ fontSize: 10, color: '#16a34a' }}>{Number(actual.hours).toFixed(1)}h reales</div>}
                            </div>
                          ) : (
                            <span style={{ color: '#d1d5db' }}>+</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 16, padding: '10px 14px', borderTop: '1px solid #f3f4f6', fontSize: 11, color: '#6b7280' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#f0fdf4', border: '1px solid #16a34a', marginRight: 4 }} />Planeado</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#fef9c3', border: '1px solid #ca8a04', marginRight: 4 }} />Llegó tarde</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#fee2e2', border: '1px solid #dc2626', marginRight: 4 }} />Sin fichaje</span>
          </div>
        </div>
      )}

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setEditing(null)}>
          <div style={{ background: 'var(--apple-bg-2)', border: '0.5px solid var(--apple-sep)', borderRadius: 12, padding: 20, width: 280, boxShadow: 'var(--apple-shadow-2)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
              {employees.find((e) => e.id === editing.employeeId)?.full_name}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>{editing.date}</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }}>Entrada</label>
                <input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} style={{ width: '100%', border: '2px solid #d1d5db', borderRadius: 8, padding: '6px 8px', fontSize: 13 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }}>Salida</label>
                <input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} style={{ width: '100%', border: '2px solid #d1d5db', borderRadius: 8, padding: '6px 8px', fontSize: 13 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {shiftFor(editing.employeeId, editing.date) && (
                <button onClick={eliminarTurno} disabled={saving} style={{ padding: '8px 12px', border: '2px solid #d1d5db', borderRadius: 8, background: 'var(--apple-bg-2)', color: '#dc2626', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  Eliminar
                </button>
              )}
              <button onClick={() => setEditing(null)} style={{ flex: 1, padding: '8px 0', border: '2px solid #d1d5db', borderRadius: 8, background: 'var(--apple-bg-2)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={guardarTurno} disabled={saving} style={{ flex: 1, padding: '8px 0', border: '0.5px solid var(--apple-sep)', borderRadius: 8, background: '#F97316', color: 'white', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
