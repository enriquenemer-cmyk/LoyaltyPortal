'use client';

import { useEffect, useState } from 'react';

type Note = {
  id: string;
  note: string;
  created_by: string | null;
  created_at: string;
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('es-CO', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function CustomerNotes({ phone }: { phone: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      const res = await fetch(`/api/admin/customer-notes?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      setNotes(data.notes ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [phone]);

  async function handleAdd() {
    if (!text.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/customer-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, note: text.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Error al guardar la nota');
        return;
      }
      setText('');
      await load();
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="Ej. Pidió sin cebolla, prefiere mesa junto a la ventana..."
          className="flex-1 px-3 py-2.5 text-sm bg-[#FAFAF9] border border-[#E8E3DC] rounded-xl text-[#1C1917] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all"
        />
        <button
          onClick={handleAdd}
          disabled={saving || !text.trim()}
          className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-[#F97316] hover:bg-[#EA580C] transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {saving ? 'Guardando…' : '+ Agregar'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}

      {loading ? (
        <p className="text-xs text-stone-400">Cargando...</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-stone-400">Sin preferencias anotadas aún. Cada nota que agregues aquí queda visible para todo el equipo.</p>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="flex items-start justify-between gap-3 bg-[#FAFAF9] border border-[#F0EDE8] rounded-xl px-3 py-2.5">
              <p className="text-sm text-[#1C1917] flex-1">{n.note}</p>
              <p className="text-[11px] text-stone-400 whitespace-nowrap shrink-0">
                {n.created_by ?? 'admin'} · {formatDate(n.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
