'use client';

import { useEffect, useState } from 'react';

type Mission = {
  id: string;
  title: string;
  description: string;
  goal_type: string;
  goal_value: number;
  reward_points: number;
  active: boolean;
  week_start: string;
  week_end: string;
  participants: number;
  completions: number;
};

const GOAL_LABELS: Record<string, string> = {
  visits: 'visitas',
  claims: 'premios canjeados',
  points: 'puntos acumulados',
};

export default function MisionesPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '',
    goal_type: 'visits', goal_value: 3, reward_points: 50,
  });

  async function load() {
    setLoading(true);
    const res = await fetch('/api/missions');
    const d = await res.json();
    setMissions(d.missions ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/missions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ title: '', description: '', goal_type: 'visits', goal_value: 3, reward_points: 50 });
    await load();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Desactivar esta misión?')) return;
    await fetch(`/api/missions?id=${id}`, { method: 'DELETE' });
    await load();
  }

  const activeMissions = missions.filter(m => m.active);
  const pastMissions = missions.filter(m => !m.active);

  return (
    <div className="min-h-screen">
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-4xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              🎯 Misiones
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Misiones</h1>
            <p className="text-blue-200/70 mt-1.5 text-sm">Los clientes ganan puntos al completar misiones activas esta semana</p>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 md:px-10 py-6">

        {/* Create form */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6 mb-6">
          <h2 className="text-sm font-bold text-[#1C1917] mb-4">Nueva misión para esta semana</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Título</label>
                <input
                  required value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ej: Visita 3 veces esta semana"
                  className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Descripción</label>
                <input
                  required value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Ej: Registra 3 tickets esta semana"
                  className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Tipo de meta</label>
                <select
                  value={form.goal_type}
                  onChange={e => setForm(f => ({ ...f, goal_type: e.target.value }))}
                  className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="visits">Visitas</option>
                  <option value="claims">Premios canjeados</option>
                  <option value="points">Puntos acumulados</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Meta (cantidad)</label>
                <input
                  type="number" min={1} required value={form.goal_value}
                  onChange={e => setForm(f => ({ ...f, goal_value: parseInt(e.target.value) || 1 }))}
                  className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Recompensa (pts)</label>
                <input
                  type="number" min={1} required value={form.reward_points}
                  onChange={e => setForm(f => ({ ...f, reward_points: parseInt(e.target.value) || 10 }))}
                  className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
            <button
              type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60 transition-opacity hover:opacity-90"
              style={{ background: '#2563EB' }}
            >
              {saving ? 'Guardando...' : '+ Crear misión'}
            </button>
          </form>
        </div>

        {/* Active missions */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-[#E8E3DC]">
            <h2 className="text-sm font-bold text-[#1C1917]">Misiones activas esta semana</h2>
          </div>
          {loading ? (
            <div className="py-10 text-center text-stone-400 text-sm">Cargando...</div>
          ) : activeMissions.length === 0 ? (
            <div className="py-10 text-center text-stone-400 text-sm">Sin misiones activas. Crea una arriba.</div>
          ) : (
            <div className="divide-y divide-[#F3EFE9]">
              {activeMissions.map(m => (
                <div key={m.id} className="flex items-start gap-4 px-6 py-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-[#1C1917]">{m.title}</span>
                      <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                        +{m.reward_points} pts
                      </span>
                    </div>
                    <p className="text-xs text-stone-500">{m.description}</p>
                    <p className="text-xs text-stone-400 mt-1">
                      Meta: {m.goal_value} {GOAL_LABELS[m.goal_type] ?? m.goal_type} ·
                      Semana {new Date(m.week_start).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}–
                      {new Date(m.week_end).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-extrabold text-[#1C1917] tabular-nums">{m.completions}<span className="text-sm font-normal text-stone-400">/{m.participants}</span></p>
                    <p className="text-xs text-stone-400">completados</p>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="mt-2 text-xs text-red-500 hover:text-red-700"
                    >
                      Desactivar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past missions */}
        {pastMissions.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E8E3DC] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E8E3DC]">
              <h2 className="text-sm font-bold text-stone-400">Historial de misiones</h2>
            </div>
            <div className="divide-y divide-[#F3EFE9]">
              {pastMissions.map(m => (
                <div key={m.id} className="flex items-center gap-4 px-6 py-3 opacity-60">
                  <div className="flex-1">
                    <span className="text-sm text-stone-600">{m.title}</span>
                    <span className="ml-2 text-xs text-stone-400">{m.completions} completados de {m.participants}</span>
                  </div>
                  <span className="text-xs text-stone-400">+{m.reward_points} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
