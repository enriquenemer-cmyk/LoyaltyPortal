'use client';
import { useEffect, useState } from 'react';

type Table = { id: string; name: string; active: boolean };

const cardStyle = { background: 'white', border: '2px solid #111', borderRadius: 12, padding: 18, boxShadow: '4px 4px 0 #111' } as const;

export default function MesasPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/mesas');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudieron cargar las mesas');
      setTables(data.tables ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las mesas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function crear() {
    if (!newName.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/mesas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear la mesa');
      setNewName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la mesa');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(t: Table) {
    setError('');
    try {
      const res = await fetch(`/api/admin/mesas/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !t.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar la mesa');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la mesa');
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111', margin: '0 0 4px' }}>🍽️ Mesas</h1>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>
        Administra las mesas de tu restaurante para asignarlas a las ventas en el Punto de Venta.
      </p>

      {error && (
        <div style={{ background: '#fee2e2', border: '2px solid #dc2626', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, fontWeight: 700, color: '#991b1b' }}>
          {error}
        </div>
      )}

      <div style={{ ...cardStyle, marginBottom: 20, display: 'flex', gap: 10 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && crear()}
          placeholder="Ej. Mesa 1, Barra, Terraza 2"
          style={{ flex: 1, border: '2px solid #d1d5db', borderRadius: 8, padding: '9px 12px', fontSize: 14 }}
        />
        <button
          onClick={crear}
          disabled={saving || !newName.trim()}
          style={{ padding: '9px 20px', border: '2px solid #111', borderRadius: 8, background: '#F97316', color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '3px 3px 0 #111' }}
        >
          + Agregar
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 20 }}>Cargando...</div>
      ) : tables.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', color: '#9ca3af' }}>Sin mesas registradas todavía.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
          {tables.map((t) => (
            <div key={t.id} style={{ ...cardStyle, padding: 14, opacity: t.active ? 1 : 0.5 }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>{t.name}</div>
              <button
                onClick={() => toggleActive(t)}
                style={{
                  fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: t.active ? '#fee2e2' : '#dcfce7', color: t.active ? '#dc2626' : '#16a34a',
                }}
              >
                {t.active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
