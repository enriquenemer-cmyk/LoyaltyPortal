'use client';
import { useEffect, useState } from 'react';

const DAY_NAMES: Record<string, string> = {
  '1': 'lunes', '2': 'martes', '3': 'miércoles',
  '4': 'jueves', '5': 'viernes', '6': 'sábado', '7': 'domingo',
};

function formatDayList(validDays: string): string {
  const days = validDays.split(',').map((d) => DAY_NAMES[d.trim()]).filter(Boolean);
  if (days.length === 0) return '';
  if (days.length === 1) return days[0];
  return days.slice(0, -1).join(', ') + ' y ' + days[days.length - 1];
}

function isWithinWindow(validHours: string | null, validDays: string | null): boolean {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon…6=Sat
  // Convert JS day (0=Sun) to our format (1=Mon…7=Sun)
  const dayNum = dayOfWeek === 0 ? 7 : dayOfWeek;

  if (validDays) {
    const allowed = validDays.split(',').map((d) => parseInt(d.trim(), 10));
    if (!allowed.includes(dayNum)) return false;
  }

  if (validHours) {
    const [start, end] = validHours.split('-');
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    if (nowMins < startMins || nowMins >= endMins) return false;
  }

  return true;
}

type Props = {
  validHours: string | null;
  validDays: string | null;
  children: React.ReactNode;
};

export default function TimeWindowGuard({ validHours, validDays, children }: Props) {
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    setAllowed(isWithinWindow(validHours, validDays));
    setChecked(true);
  }, [validHours, validDays]);

  // Don't render anything until we've checked (avoids flash during SSR hydration)
  if (!checked) return null;

  if (!allowed) {
    const daysText = validDays ? formatDayList(validDays) : 'cualquier día';
    return (
      <div style={{
        background: 'white', borderRadius: 28, padding: 40, textAlign: 'center',
        maxWidth: 360, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
        margin: '0 auto',
      }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}></div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#111', marginBottom: 8 }}>
          Fuera de horario
        </h2>
        <p style={{ color: '#555', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          Este premio solo es válido{' '}
          {validHours && (
            <><strong style={{ color: '#2563EB' }}>{validHours.replace('-', ' – ')}</strong>{' '}</>
          )}
          {validDays && (
            <>los días <strong style={{ color: '#2563EB' }}>{daysText}</strong></>
          )}
          . Vuelve dentro del horario indicado.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
