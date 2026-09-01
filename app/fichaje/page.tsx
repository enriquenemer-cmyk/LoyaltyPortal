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

const MAX_PIN = 6;
const ALL_DAYS = ['lun','mar','mie','jue','vie','sab','dom'];
const DAY_SHORT: Record<string,string> = { lun:'L',mar:'M',mie:'X',jue:'J',vie:'V',sab:'S',dom:'D' };
const TODAY_KEY = ['dom','lun','mar','mie','jue','vie','sab'][new Date().getDay()];

function fmtHours(h: number) {
  const hr = Math.floor(h), mn = Math.round((h - hr) * 60);
  return hr > 0 ? `${hr}h ${mn}m` : `${mn}m`;
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });
}
function fmtDateShort(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { weekday:'short', day:'numeric', month:'short' });
}
function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h/24)}d`;
}

// ── PIN pad button ──────────────────────────────────────────────────────────
function PinBtn({ label, onClick, disabled, accent }: { label: string; onClick: () => void; disabled: boolean; accent?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        aspectRatio: '1',
        borderRadius: 20,
        border: 'none',
        background: accent ? '#f97316' : 'rgba(255,255,255,0.12)',
        color: 'white',
        fontSize: accent ? 22 : 26,
        fontWeight: 900,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'transform 0.1s, opacity 0.1s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: accent ? '0 8px 24px rgba(249,115,22,0.5)' : 'none',
        backdropFilter: 'blur(8px)',
      }}
      onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)'; }}
      onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
    >
      {label}
    </button>
  );
}

export default function FichajePage() {
  const [phase, setPhase] = useState<Phase>('pin');
  const [pin, setPin]     = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [now, setNow]   = useState(new Date());
  const [tab, setTab]   = useState<'fichar'|'historial'|'turnos'|'avisos'>('fichar');

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const resetToPin = useCallback(() => {
    setPin(''); setError(null); setDashboard(null);
    setPhase('pin'); setTab('fichar');
  }, []);

  async function loadDashboard() {
    const res = await fetch('/api/employees/dashboard').catch(() => null);
    if (!res?.ok) return;
    const data = await res.json();
    if (data.employee) { setDashboard(data); setPhase('dashboard'); }
  }

  useEffect(() => { loadDashboard(); }, []);

  async function handlePin() {
    if (pin.length < 4) { setError('Mínimo 4 dígitos'); return; }
    setLoading(true); setError(null);
    const res = await fetch('/api/employees/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    }).catch(() => null);
    setLoading(false);
    if (!res) { setError('Sin conexión'); setPin(''); return; }
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'PIN incorrecto'); setPin(''); return; }
    setPin('');
    await loadDashboard();
  }

  async function handleClock(action: 'in'|'out') {
    setLoading(true); setError(null);
    const loc: Record<string,number> = {};
    try {
      await new Promise<void>(r => navigator.geolocation?.getCurrentPosition(
        p => { loc.latitude = p.coords.latitude; loc.longitude = p.coords.longitude; r(); },
        () => r(), { timeout: 4000 }
      ));
    } catch { /* no-op */ }
    const res = await fetch('/api/employees/clock', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...loc }),
    }).catch(() => null);
    setLoading(false);
    if (!res?.ok) { setError('No se pudo registrar'); return; }
    setConfirmMsg(action === 'in' ? '¡Entrada registrada!' : '¡Salida registrada!');
    setPhase('confirm');
    setTimeout(async () => {
      await fetch('/api/employees/logout', { method: 'POST' }).catch(() => {});
      resetToPin();
    }, 3000);
  }

  const timeStr = now.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  const dateStr = now.toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long' });
  const emp = dashboard?.employee;
  const workDays = (emp?.work_days ?? 'lun,mar,mie,jue,vie').split(',').map(d => d.trim());
  const unread = dashboard?.notifications.filter(n => !n.read_at).length ?? 0;

  // ── Shared page wrapper ────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(160deg,#0f0c29 0%,#1a1040 40%,#24243e 100%)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    }}>

      {/* ══════════════════ PIN PHASE ══════════════════ */}
      {phase === 'pin' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', gap: '2rem' }}>

          {/* Logo / brand */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg,#f97316,#c2410c)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 8px 32px rgba(249,115,22,0.45)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <h1 style={{ color: 'white', fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>Control de Asistencia</h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginTop: 6 }}>{dateStr} · {timeStr}</p>
          </div>

          {/* PIN display */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'center' }}>
            {Array.from({ length: MAX_PIN }).map((_,i) => (
              <div key={i} style={{
                width: 14, height: 14, borderRadius: '50%',
                background: i < pin.length ? '#f97316' : 'rgba(255,255,255,0.2)',
                transform: i < pin.length ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.15s cubic-bezier(0.34,1.56,0.64,1)',
                boxShadow: i < pin.length ? '0 0 12px rgba(249,115,22,0.7)' : 'none',
              }} />
            ))}
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', borderRadius: 12, padding: '10px 20px', fontSize: 14, fontWeight: 600 }}>
              {error}
            </div>
          )}

          {/* Keypad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, width: '100%', maxWidth: 280 }}>
            {['1','2','3','4','5','6','7','8','9'].map(d => (
              <PinBtn key={d} label={d} disabled={loading} onClick={() => { setError(null); setPin(p => p.length < MAX_PIN ? p+d : p); }} />
            ))}
            <PinBtn label="⌫" disabled={loading} onClick={() => setPin(p => p.slice(0,-1))} />
            <PinBtn label="0" disabled={loading} onClick={() => { setError(null); setPin(p => p.length < MAX_PIN ? p+'0' : p); }} />
            <PinBtn label={loading ? '…' : '✓'} accent disabled={loading || pin.length < 4} onClick={handlePin} />
          </div>

          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>3E Plataforma · Control de empleados</p>
        </div>
      )}

      {/* ══════════════════ DASHBOARD PHASE ══════════════════ */}
      {phase === 'dashboard' && dashboard && emp && (() => {
        const activeHrs = dashboard.openEntry
          ? (Date.now() - new Date(dashboard.openEntry.clock_in).getTime()) / 3600000
          : 0;

        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 480, width: '100%', margin: '0 auto' }}>

            {/* ── Top hero ── */}
            <div style={{ padding: '2rem 1.5rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
              {/* Glow */}
              <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(249,115,22,0.25),transparent 70%)', pointerEvents: 'none' }} />

              {/* Avatar + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#f97316,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: 'white', flexShrink: 0, boxShadow: '0 4px 16px rgba(249,115,22,0.4)' }}>
                  {emp.full_name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'white', fontWeight: 900, fontSize: 20, margin: 0, lineHeight: 1.2 }}>{emp.full_name}</p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '3px 0 0' }}>{emp.position ?? 'Empleado'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: 'white', fontWeight: 900, fontSize: 22, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{timeStr}</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '2px 0 0', textTransform: 'capitalize' }}>{now.toLocaleDateString('es-CO',{weekday:'short',day:'numeric',month:'short'})}</p>
                </div>
              </div>

              {/* KPI strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {[
                  { label: 'Esta semana', value: fmtHours(dashboard.weekHours), color: '#a78bfa' },
                  { label: 'Este mes',    value: fmtHours(dashboard.monthHours), color: '#34d399' },
                  { label: 'Vacaciones',  value: `${dashboard.vacationAvailable}d`, color: '#fbbf24' },
                ].map(k => (
                  <div key={k.label} style={{ borderRadius: 14, padding: '12px 10px', textAlign: 'center', background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <p style={{ color: k.color, fontWeight: 900, fontSize: 18, margin: 0 }}>{k.value}</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: '3px 0 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Tab bar ── */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', margin: '0 1.5rem', gap: 0 }}>
              {([
                { key: 'fichar',    label: 'Fichar' },
                { key: 'historial', label: 'Historial' },
                { key: 'turnos',    label: 'Turnos' },
                { key: 'avisos',    label: unread > 0 ? `Avisos ${unread}` : 'Avisos' },
              ] as const).map(t => (
                <button key={t.key} type="button" onClick={() => setTab(t.key)} style={{
                  flex: 1, padding: '12px 4px', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: 'transparent', textTransform: 'uppercase', letterSpacing: '0.05em',
                  color: tab === t.key ? '#f97316' : 'rgba(255,255,255,0.35)',
                  borderBottom: tab === t.key ? '2px solid #f97316' : '2px solid transparent',
                  marginBottom: -1, transition: 'color 0.2s',
                }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Tab content ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>

              {/* FICHAR */}
              {tab === 'fichar' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {error && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5', borderRadius: 12, padding: '12px 16px', fontSize: 14, fontWeight: 600, textAlign: 'center' }}>{error}</div>}

                  {dashboard.openEntry ? (
                    /* Active shift card */
                    <div style={{ borderRadius: 20, padding: '20px', background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.35)' }}>
                      <p style={{ color: '#fca5a5', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>⏱ Turno activo</p>
                      <p style={{ color: 'white', fontSize: 22, fontWeight: 900, margin: '0 0 4px' }}>
                        {fmtHours(activeHrs)} <span style={{ fontWeight: 400, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>trabajados</span>
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: 0 }}>Entrada: {fmtTime(dashboard.openEntry.clock_in)}</p>
                    </div>
                  ) : (
                    <div style={{ borderRadius: 20, padding: '20px', background: 'rgba(52,211,153,0.08)', border: '2px solid rgba(52,211,153,0.25)' }}>
                      <p style={{ color: '#6ee7b7', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' }}>Sin turno activo</p>
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0 }}>Marca tu entrada para comenzar</p>
                    </div>
                  )}

                  {/* Main action button */}
                  <button type="button" disabled={loading} onClick={() => handleClock(dashboard.openEntry ? 'out' : 'in')} style={{
                    width: '100%', padding: '22px 0', borderRadius: 22, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: 20, fontWeight: 900, color: 'white',
                    background: dashboard.openEntry
                      ? 'linear-gradient(135deg,#dc2626,#991b1b)'
                      : 'linear-gradient(135deg,#059669,#047857)',
                    boxShadow: dashboard.openEntry
                      ? '0 12px 40px rgba(220,38,38,0.5)'
                      : '0 12px 40px rgba(5,150,105,0.5)',
                    opacity: loading ? 0.6 : 1,
                    transition: 'transform 0.15s, opacity 0.15s',
                    letterSpacing: '-0.3px',
                  }}
                  onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
                  onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}>
                    {loading ? 'Registrando…' : dashboard.openEntry ? '🔴  Marcar Salida' : '🟢  Marcar Entrada'}
                  </button>

                  <button type="button" onClick={async () => { await fetch('/api/employees/logout',{method:'POST'}).catch(()=>{}); resetToPin(); }}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer', fontWeight: 600, padding: '4px 0' }}>
                    No soy yo — cambiar usuario
                  </button>
                </div>
              )}

              {/* HISTORIAL */}
              {tab === 'historial' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {dashboard.history.length === 0 && (
                    <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '2rem 0', fontSize: 14 }}>Sin registros recientes</p>
                  )}
                  {dashboard.history.map(h => (
                    <div key={h.id} style={{ borderRadius: 16, padding: '14px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div>
                        <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: '0 0 3px' }}>{fmtDateShort(h.clock_in)}</p>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>
                          {fmtTime(h.clock_in)}{h.clock_out ? ` → ${fmtTime(h.clock_out)}` : ' → en curso'}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontWeight: 900, fontSize: 16, margin: 0, color: h.clock_out ? '#34d399' : '#f97316' }}>
                          {fmtHours(h.hours_worked)}
                        </p>
                        {!h.clock_out && <p style={{ color: '#f97316', fontSize: 10, fontWeight: 700, margin: '2px 0 0' }}>activo</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TURNOS */}
              {tab === 'turnos' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Days row */}
                  <div style={{ borderRadius: 18, padding: '18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>Días laborales</p>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      {ALL_DAYS.map(d => {
                        const active = workDays.includes(d);
                        const isToday = d === TODAY_KEY;
                        return (
                          <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div style={{
                              width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 900, fontSize: 13,
                              background: isToday ? '#f97316' : active ? 'rgba(249,115,22,0.18)' : 'rgba(255,255,255,0.05)',
                              color: isToday ? 'white' : active ? '#fb923c' : 'rgba(255,255,255,0.2)',
                              border: isToday ? '2px solid #f97316' : '2px solid transparent',
                              boxShadow: isToday ? '0 4px 16px rgba(249,115,22,0.5)' : 'none',
                            }}>
                              {DAY_SHORT[d]}
                            </div>
                            {isToday && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#f97316' }} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Schedule details */}
                  <div style={{ borderRadius: 18, padding: '18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Horario</p>
                    {[
                      { label: 'Entrada programada', value: emp.scheduled_start_time ? emp.scheduled_start_time.slice(0,5) : '—' },
                      { label: 'Horas por día', value: emp.scheduled_hours_per_day ? `${emp.scheduled_hours_per_day}h` : '—' },
                      { label: 'Días por semana', value: `${workDays.length} días` },
                    ].map(r => (
                      <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{r.label}</span>
                        <span style={{ color: 'white', fontWeight: 900, fontSize: 15 }}>{r.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Vacaciones */}
                  <div style={{ borderRadius: 18, padding: '18px', background: 'rgba(251,191,36,0.08)', border: '2px solid rgba(251,191,36,0.25)' }}>
                    <p style={{ color: '#fbbf24', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>🏖 Vacaciones</p>
                    {[
                      { label: 'Acumuladas', value: `${dashboard.vacationAccrued} días` },
                      { label: 'Usadas', value: `${emp.vacation_days_used} días` },
                    ].map(r => (
                      <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{r.label}</span>
                        <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: 14 }}>{r.value}</span>
                      </div>
                    ))}
                    <div style={{ height: 1, background: 'rgba(251,191,36,0.2)', margin: '12px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>Disponibles</span>
                      <span style={{ color: '#fbbf24', fontWeight: 900, fontSize: 22 }}>{dashboard.vacationAvailable} días</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#fbbf24,#f59e0b)', width: `${Math.min(100,(dashboard.vacationAvailable/(emp.vacation_days_per_year||12))*100)}%`, transition: 'width 0.6s ease' }} />
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: '6px 0 0', textAlign: 'center' }}>{emp.vacation_days_per_year} días por año</p>
                  </div>
                </div>
              )}

              {/* AVISOS */}
              {tab === 'avisos' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {dashboard.notifications.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                      <p style={{ fontSize: 40, margin: '0 0 8px' }}>🔔</p>
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Sin avisos por ahora</p>
                    </div>
                  )}
                  {dashboard.notifications.map(n => (
                    <div key={n.id} style={{
                      borderRadius: 16, padding: '14px 16px', position: 'relative',
                      background: n.read_at ? 'rgba(255,255,255,0.05)' : 'rgba(249,115,22,0.1)',
                      border: n.read_at ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(249,115,22,0.35)',
                    }}>
                      {!n.read_at && <div style={{ position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: '50%', background: '#f97316', boxShadow: '0 0 8px rgba(249,115,22,0.8)' }} />}
                      <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: '0 0 4px', paddingRight: 16 }}>{n.title}</p>
                      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, margin: '0 0 6px', lineHeight: 1.5 }}>{n.body}</p>
                      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: 0 }}>{timeAgo(n.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ══════════════════ CONFIRM PHASE ══════════════════ */}
      {phase === 'confirm' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '2rem' }}>
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'rgba(52,211,153,0.15)', border: '3px solid rgba(52,211,153,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'scale-in 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: 'white', fontSize: 26, fontWeight: 900, margin: '0 0 8px' }}>{confirmMsg}</h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, margin: 0 }}>¡Que tengas un excelente turno!</p>
          </div>
        </div>
      )}
    </div>
  );
}
