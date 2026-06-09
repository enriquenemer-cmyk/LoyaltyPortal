'use client';
import { useState, useEffect } from 'react';

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Ahora mismo';
  if (mins < 60) return `Hace ${mins} min`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function RelativeDate({ dateStr, showFull = false }: { dateStr: string; showFull?: boolean }) {
  const [relative, setRelative] = useState('');
  const [full, setFull] = useState('');

  useEffect(() => {
    setRelative(getRelativeTime(dateStr));
    setFull(new Date(dateStr).toLocaleString('es-ES', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }));
    const interval = setInterval(() => setRelative(getRelativeTime(dateStr)), 60000);
    return () => clearInterval(interval);
  }, [dateStr]);

  if (!relative) return null;
  return <span title={full}>{showFull ? full : relative}</span>;
}
