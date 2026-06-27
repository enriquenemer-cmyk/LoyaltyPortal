'use client';

import { useEffect, useState } from 'react';
import { EmptyState } from '@/app/components/EmptyState';

type Module = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  question_count: number;
  completed_by_count: number;
};

type Question = {
  id: string;
  module_id: string;
  question: string;
  options: string[];
  correct_index: number;
  points: number;
  sort_order: number;
};

type LeaderboardRow = {
  id: string;
  full_name: string;
  position: string | null;
  photo_url: string | null;
  total_training_points: number;
  attempts_count: number;
  last_attempt_at: string | null;
};

const ICONS = ['📚', '🍔', '🧼', '💳', '🛎️', '🔥', '🧑‍🍳', '📦'];

const inputClass =
  'w-full bg-white border border-[#E8E3DC] rounded-lg px-3 py-2.5 text-sm text-[#1C1917] placeholder-[#a8a29e] focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors';

const labelClass = 'block text-[10px] font-semibold text-[#78716c] uppercase tracking-widest mb-1.5';

const MEDALS = ['🥇', '🥈', '🥉'];

function ModuleCard({
  mod,
  onUpdated,
  onDeleted,
}: {
  mod: Module;
  onUpdated: (m: Module) => void;
  onDeleted: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  async function handleToggleActive() {
    const next = !mod.active;
    onUpdated({ ...mod, active: next });
    try {
      const res = await fetch(`/api/admin/training/modules/${mod.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: next }),
      });
      if (!res.ok) onUpdated({ ...mod, active: mod.active });
    } catch {
      onUpdated({ ...mod, active: mod.active });
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar el módulo "${mod.title}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/admin/training/modules/${mod.id}`, { method: 'DELETE' });
      if (res.ok) onDeleted(mod.id);
    } catch {
      // ignore
    }
  }

  return (
    <div
      className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${
        mod.active ? 'border-blue-200' : 'border-[#E8E3DC] opacity-60'
      }`}
      style={mod.active ? { borderLeft: '4px solid #2563EB' } : { borderLeft: '4px solid #D6D3D1' }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-2xl bg-blue-50">
            {mod.icon || '📚'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-[#1C1917]">{mod.title}</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  mod.active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'
                }`}
              >
                {mod.active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            {mod.description && <p className="text-sm text-stone-500 mt-1 leading-snug">{mod.description}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-stone-400">
              <span>{mod.question_count} {mod.question_count === 1 ? 'pregunta' : 'preguntas'}</span>
              <span>{mod.completed_by_count} {mod.completed_by_count === 1 ? 'empleado completó' : 'empleados completaron'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleToggleActive}
            className={`relative w-11 h-6 rounded-full transition-colors ${mod.active ? 'bg-[#2563EB]' : 'bg-stone-200'}`}
            aria-label={mod.active ? 'Desactivar módulo' : 'Activar módulo'}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                mod.active ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
              expanded
                ? 'bg-[#2563EB] text-white border-[#2563EB]'
                : 'bg-white text-slate-500 border-slate-200 hover:border-[#2563EB] hover:text-[#2563EB]'
            }`}
          >
            Editar preguntas
            <svg
              className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button onClick={handleDelete} className="text-xs font-semibold text-red-500 hover:underline">
            Eliminar
          </button>
        </div>
      </div>

      {expanded && (
        <QuestionEditor moduleId={mod.id} onChanged={() => onUpdated({ ...mod })} />
      )}
    </div>
  );
}

function QuestionEditor({ moduleId, onChanged }: { moduleId: string; onChanged: () => void }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    question: '',
    options: ['', '', '', ''],
    correct_index: 0,
    points: 10,
  });

  function resetForm() {
    setForm({ question: '', options: ['', '', '', ''], correct_index: 0, points: 10 });
    setEditingId(null);
  }

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(`/api/admin/training/modules/${moduleId}/questions`)
      .then((r) => r.json())
      .then((data) => {
        if (mounted) setQuestions(data.questions ?? []);
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [moduleId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.options.some((o) => !o.trim())) {
      setError('Completa las 4 opciones.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/training/questions/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: form.question,
            options: form.options,
            correct_index: form.correct_index,
            points: form.points,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setQuestions((prev) => prev.map((q) => (q.id === editingId ? data.question : q)));
      } else {
        const res = await fetch('/api/admin/training/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            module_id: moduleId,
            question: form.question,
            options: form.options,
            correct_index: form.correct_index,
            points: form.points,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setQuestions((prev) => [...prev, data.question]);
      }
      resetForm();
      setShowForm(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    try {
      await fetch(`/api/admin/training/questions/${id}`, { method: 'DELETE' });
      onChanged();
    } catch {
      // ignore
    }
  }

  function startEdit(q: Question) {
    setEditingId(q.id);
    setForm({ question: q.question, options: [...q.options], correct_index: q.correct_index, points: q.points });
    setShowForm(true);
  }

  return (
    <div className="border-t border-[#E8E3DC] pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Preguntas ({questions.length})</p>
        <button
          onClick={() => {
            resetForm();
            setShowForm((v) => !v);
            setError('');
          }}
          className="text-xs font-bold text-[#2563EB] hover:underline"
        >
          {showForm ? 'Cancelar' : '+ Agregar pregunta'}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs mb-3">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#FAFAF9] border border-[#E8E3DC] rounded-xl p-4 space-y-3 mb-4">
          <div>
            <label className={labelClass}>Pregunta</label>
            <input
              className={inputClass}
              value={form.question}
              onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              placeholder="Ej. ¿Cuál es la temperatura correcta del refrigerador?"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${moduleId}`}
                  checked={form.correct_index === i}
                  onChange={() => setForm((f) => ({ ...f, correct_index: i }))}
                  className="shrink-0 accent-[#2563EB]"
                  title="Marcar como correcta"
                />
                <input
                  className={inputClass}
                  placeholder={`Opción ${i + 1}`}
                  value={opt}
                  onChange={(e) =>
                    setForm((f) => {
                      const options = [...f.options];
                      options[i] = e.target.value;
                      return { ...f, options };
                    })
                  }
                  required
                />
              </div>
            ))}
          </div>
          <div className="flex items-end gap-3">
            <div className="w-32">
              <label className={labelClass}>Puntos</label>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={form.points}
                onChange={(e) => setForm((f) => ({ ...f, points: Number(e.target.value) }))}
                required
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#2563EB] text-white text-sm font-semibold rounded-xl hover:bg-[#0891B2] transition-colors disabled:opacity-60"
            >
              {saving ? 'Guardando...' : editingId ? 'Actualizar pregunta' : 'Agregar pregunta'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-xs text-stone-400">Cargando...</p>
      ) : questions.length === 0 ? (
        <p className="text-xs text-stone-400">Aún no hay preguntas en este módulo.</p>
      ) : (
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} className="bg-white border border-[#E8E3DC] rounded-xl p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1C1917]">
                    {i + 1}. {q.question}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {q.options.map((o, oi) => (
                      <span
                        key={oi}
                        className={`text-[11px] px-2 py-0.5 rounded-full border ${
                          oi === q.correct_index
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
                            : 'bg-stone-50 text-stone-500 border-stone-200'
                        }`}
                      >
                        {oi === q.correct_index ? '✓ ' : ''}
                        {o}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1.5">{q.points} pts</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => startEdit(q)} className="text-xs font-semibold text-[#2563EB] hover:underline">
                    Editar
                  </button>
                  <button onClick={() => handleDelete(q.id)} className="text-xs font-semibold text-red-500 hover:underline">
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CapacitacionAdminPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({ title: '', description: '', icon: ICONS[0] });

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/training/modules').then((r) => r.json()),
      fetch('/api/admin/training/leaderboard').then((r) => r.json()),
    ])
      .then(([modsData, lbData]) => {
        setModules(modsData.modules ?? []);
        setLeaderboard(lbData.leaderboard ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/training/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Error al crear el módulo.');
      } else {
        setModules((prev) => [...prev, data.module]);
        setSuccess('Módulo creado exitosamente.');
        setShowForm(false);
        setForm({ title: '', description: '', icon: ICONS[0] });
      }
    } catch {
      setError('Error de conexión.');
    } finally {
      setSaving(false);
    }
  }

  function handleUpdated(mod: Module) {
    setModules((prev) => prev.map((m) => (m.id === mod.id ? mod : m)));
  }

  function handleDeleted(id: string) {
    setModules((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="max-w-5xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              🎓 Capacitación
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Capacitación</h1>
            <p className="text-blue-200/70 mt-1.5 text-sm">Entrena a tu equipo con quizzes gamificados</p>
          </div>
          <button
            onClick={() => {
              setShowForm((v) => !v);
              setError('');
              setSuccess('');
            }}
            className="flex items-center gap-2 font-bold px-5 py-3 rounded-xl text-sm transition-all"
            style={{ background: 'white', color: '#1d4ed8', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showForm ? 'M6 18L18 6M6 6l12 12' : 'M12 4v16m8-8H4'} />
            </svg>
            {showForm ? 'Cancelar' : '+ Nuevo Módulo'}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-10 py-6 space-y-6">
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm font-medium">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>
        )}

        {showForm && (
          <div className="bg-white border border-[#E8E3DC] rounded-2xl p-6 shadow-sm" style={{ borderTop: '3px solid #2563EB' }}>
            <h2 className="text-base font-bold text-[#1C1917] mb-5">Nuevo módulo de capacitación</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={labelClass}>Título</label>
                <input
                  className={inputClass}
                  placeholder="Ej. Higiene en la cocina"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Descripción</label>
                <textarea
                  className={inputClass + ' resize-none'}
                  rows={2}
                  placeholder="Breve descripción del módulo"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>Icono</label>
                <div className="flex gap-2 flex-wrap">
                  {ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, icon }))}
                      className={`w-11 h-11 rounded-xl text-xl flex items-center justify-center border transition-all ${
                        form.icon === icon ? 'border-[#2563EB] bg-blue-50' : 'border-[#E8E3DC] bg-white'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#2563EB] text-white text-sm font-semibold rounded-xl hover:bg-[#0891B2] transition-colors disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : 'Crear módulo'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modules list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="w-6 h-6 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : modules.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm">
            <EmptyState
              icon="star"
              title="Sin módulos de capacitación aún"
              description="Crea tu primer módulo para empezar a entrenar a tu equipo."
              action={{ label: '+ Nuevo Módulo', onClick: () => setShowForm(true) }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {modules.map((mod) => (
              <ModuleCard key={mod.id} mod={mod} onUpdated={handleUpdated} onDeleted={handleDeleted} />
            ))}
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-white border border-[#E8E3DC] rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-[#1C1917] mb-4">Tabla de líderes</h2>
          {loading ? (
            <p className="text-sm text-stone-400">Cargando...</p>
          ) : leaderboard.length === 0 ? (
            <p className="text-sm text-stone-400">Aún no hay empleados con puntos de capacitación.</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((row, i) => (
                <div
                  key={row.id}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl ${i < 3 ? 'bg-blue-50/60' : 'bg-[#FAFAF9]'}`}
                >
                  <div className="w-8 text-center text-lg font-black text-stone-400 shrink-0">
                    {i < 3 ? MEDALS[i] : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1C1917] truncate">{row.full_name}</p>
                    {row.position && <p className="text-xs text-stone-400">{row.position}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold text-[#2563EB]">
                      {row.total_training_points.toLocaleString('es-MX')} pts
                    </p>
                    <p className="text-[10px] text-stone-400">{row.attempts_count} intentos</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
