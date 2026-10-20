'use client';
import { useEffect, useState } from 'react';
import WeekdayBarChart from '@/app/components/WeekdayBarChart';

type HourRow = { hour: number; count: number; total: number };
type DayRow = { dow: number; label: string; count: number; total: number };

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });
}

const cardStyle = { background: 'var(--apple-bg-2)', border: '0.5px solid var(--apple-sep)', borderRadius: 12, padding: 18, boxShadow: 'var(--apple-shadow-2)' } as const;

export default function HoraPicoPage() {
  const [byHour, setByHour] = useState<HourRow[]>([]);
  const [byDay, setByDay] = useState<DayRow[]>([]);
  const [peakHour, setPeakHour] = useState<HourRow | null>(null);
  const [peakDay, setPeakDay] = useState<DayRow | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(d: number) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/reportes/hora-pico?days=${d}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo calcular el reporte');
      setByHour(data.by_hour ?? []);
      setByDay(data.by_day ?? []);
      setPeakHour(data.peak_hour ?? null);
      setPeakDay(data.peak_day ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo calcular el reporte');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(days); }, [days]);

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--apple-label)', margin: 0 }}>⏰ Hora Pico</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Cuándo vende más tu negocio, para planear personal.</p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 10, padding: 4 }}>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                background: days === d ? 'white' : 'transparent', color: 'var(--apple-label)',
                boxShadow: days === d ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
              }}
            >
              {d} días
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '2px solid #dc2626', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, fontWeight: 700, color: '#991b1b' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: '#9ca3af', fontSize: 13, padding: '32px 0', textAlign: 'center' }}>Calculando...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 24 }}>
            <div style={cardStyle}>
              <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Hora más fuerte</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#F97316' }}>{peakHour ? `${peakHour.hour}:00 - ${peakHour.hour + 1}:00` : '—'}</div>
              {peakHour && <div style={{ fontSize: 11, color: '#9ca3af' }}>{fmt(peakHour.total)} · {peakHour.count} ventas</div>}
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Día más fuerte</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#F97316' }}>{peakDay?.label ?? '—'}</div>
              {peakDay && <div style={{ fontSize: 11, color: '#9ca3af' }}>{fmt(peakDay.total)} · {peakDay.count} ventas</div>}
            </div>
          </div>

          <div style={{ ...cardStyle, marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', marginBottom: 12 }}>Ventas por día de la semana</p>
            <WeekdayBarChart data={byDay.map((d) => ({ label: d.label, value: d.total }))} formatValue={(v) => fmt(v)} />
          </div>

          <div style={cardStyle}>
            <p style={{ fontSize: 12, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', marginBottom: 12 }}>Ventas por hora del día</p>
            <div style={{ overflowX: 'auto' }}>
              <WeekdayBarChart
                data={byHour.filter((h) => h.count > 0).map((h) => ({ label: `${h.hour}h`, value: h.total }))}
                formatValue={(v) => fmt(v)}
              />
            </div>
            {byHour.every((h) => h.count === 0) && (
              <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 20 }}>Sin ventas registradas en este periodo.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
