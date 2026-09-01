'use client';
import { useEffect, useState } from 'react';

type User = {
  id: string;
  username: string;
  role: string;
  restaurant_name: string | null;
  restaurant_id: string | null;
  created_at: string;
  allowed_sections: string[] | null;
};

type Restaurant = { id: string; name: string };

const ALL_SECTIONS = [
  { key: 'PRINCIPAL',       label: 'Dashboard',           icon: '🏠', desc: 'Panel principal y radar en vivo' },
  { key: 'PREMIOS',         label: 'Premios',             icon: '🎁', desc: 'Mis premios, registros, reglas, campañas' },
  { key: 'CLIENTES',        label: 'Clientes',            icon: '👥', desc: 'Base de clientes, leads, segmentación' },
  { key: 'OPERACIONES',     label: 'Operaciones',         icon: '⚙️',  desc: 'Ventas, POS, inventario, fichajes' },
  { key: 'CONTABILIDAD',    label: 'Contabilidad',        icon: '🧾', desc: 'Resumen contable, proveedores, fichas' },
  { key: 'JUEGOS Y TICKETS',label: 'Juegos y Tickets',   icon: '🎮', desc: 'Juegos con premios, premio por consumo' },
  { key: 'RESTAURANTES',    label: 'Restaurantes',        icon: '🏪', desc: 'Mis restaurantes, rendimiento, eventos' },
  { key: 'REPORTES',        label: 'Reportes',            icon: '📊', desc: 'Analítica, reportes, asistente IA' },
  { key: 'ACCESOS_EXTERNOS',label: 'Accesos Externos',   icon: '🔗', desc: 'Cajero QR, TPV, Fichaje, Comanda' },
  { key: 'CONFIGURACION',   label: 'Configuración',       icon: '🔧', desc: 'Ajustes del sistema' },
];

const ROLE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  admin:   { bg: 'rgba(249,115,22,0.12)', text: '#c2410c', dot: '#f97316' },
  manager: { bg: 'rgba(99,102,241,0.12)', text: '#4338ca', dot: '#6366f1' },
  cajero:  { bg: 'rgba(16,185,129,0.12)', text: '#047857', dot: '#10b981' },
};

function SectionToggle({ skey, label, icon, desc, checked, onChange }: {
  skey: string; label: string; icon: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-start gap-3 text-left p-3 rounded-xl transition-all w-full"
      style={{
        background: checked ? 'rgba(249,115,22,0.08)' : 'rgba(0,0,0,0.02)',
        border: `1.5px solid ${checked ? '#f97316' : '#e5e7eb'}`,
      }}
    >
      <div className="mt-0.5 shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all"
        style={{ background: checked ? '#f97316' : '#e5e7eb' }}>
        {checked && (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none">{icon}</span>
          <span className="text-sm font-semibold text-[#1C1917]">{label}</span>
        </div>
        <p className="text-xs text-stone-400 mt-0.5 leading-snug">{desc}</p>
      </div>
    </button>
  );
}

function UserCard({ user, onEdit, onDelete, deleting }: {
  user: User;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const colors = ROLE_COLORS[user.role] ?? ROLE_COLORS.manager;
  const sectionCount = user.allowed_sections?.length ?? ALL_SECTIONS.length;
  const isFullAccess = !user.allowed_sections;

  return (
    <div className="bg-white border border-[#E8E3DC] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0"
            style={{ background: colors.bg, color: colors.dot }}>
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-[#1C1917] text-sm">{user.username}</p>
            <p className="text-xs text-stone-400">{user.restaurant_name ?? 'Sin restaurante'}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 capitalize shrink-0"
          style={{ background: colors.bg, color: colors.text }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: colors.dot }} />
          {user.role}
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: isFullAccess ? 'rgba(16,185,129,0.06)' : 'rgba(99,102,241,0.06)', border: `1px solid ${isFullAccess ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)'}` }}>
        <span className="text-sm">{isFullAccess ? '🔓' : '🔒'}</span>
        <p className="text-xs font-medium" style={{ color: isFullAccess ? '#047857' : '#4338ca' }}>
          {isFullAccess ? 'Acceso completo' : `${sectionCount} sección${sectionCount !== 1 ? 'es' : ''} habilitada${sectionCount !== 1 ? 's' : ''}`}
        </p>
      </div>

      {!isFullAccess && user.allowed_sections && (
        <div className="flex flex-wrap gap-1">
          {user.allowed_sections.map((s) => {
            const sec = ALL_SECTIONS.find((x) => x.key === s);
            return sec ? (
              <span key={s} className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(249,115,22,0.08)', color: '#c2410c' }}>
                {sec.icon} {sec.label}
              </span>
            ) : null;
          })}
        </div>
      )}

      <div className="flex gap-2 pt-1 border-t border-[#E8E3DC]">
        <button onClick={onEdit}
          className="flex-1 text-xs font-semibold py-2 rounded-lg transition-colors"
          style={{ background: 'rgba(99,102,241,0.08)', color: '#4338ca' }}>
          ✏️ Editar accesos
        </button>
        <button onClick={onDelete} disabled={deleting}
          className="text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-40"
          style={{ background: 'rgba(239,68,68,0.07)', color: '#dc2626' }}>
          {deleting ? '…' : '🗑'}
        </button>
      </div>
    </div>
  );
}

function EditModal({ user, restaurants, onClose, onSaved }: {
  user: User;
  restaurants: Restaurant[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [sections, setSections] = useState<string[]>(user.allowed_sections ?? ALL_SECTIONS.map((s) => s.key));
  const [fullAccess, setFullAccess] = useState(!user.allowed_sections);
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSection(key: string, val: boolean) {
    setSections((prev) => val ? [...prev, key] : prev.filter((k) => k !== key));
  }

  function toggleFull(v: boolean) {
    setFullAccess(v);
    if (v) setSections(ALL_SECTIONS.map((s) => s.key));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          allowed_sections: fullAccess ? [] : sections,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Error al guardar.');
      } else {
        onSaved();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E8E3DC] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-[#1C1917]">Permisos de {user.username}</h2>
            <p className="text-xs text-stone-400 mt-0.5">Controla a qué secciones tiene acceso</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors text-stone-500 text-sm">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          {/* Role */}
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Rol</label>
            <div className="flex gap-2">
              {(['manager', 'cajero', 'admin'] as const).map((r) => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition-all"
                  style={{
                    background: role === r ? ROLE_COLORS[r].bg : '#f5f5f4',
                    color: role === r ? ROLE_COLORS[r].text : '#78716c',
                    border: `1.5px solid ${role === r ? ROLE_COLORS[r].dot : 'transparent'}`,
                  }}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Full access toggle */}
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Nivel de acceso</label>
            <button type="button" onClick={() => toggleFull(!fullAccess)}
              className="w-full flex items-center justify-between p-3 rounded-xl transition-all"
              style={{ background: fullAccess ? 'rgba(16,185,129,0.08)' : 'rgba(0,0,0,0.02)', border: `1.5px solid ${fullAccess ? '#10b981' : '#e5e7eb'}` }}>
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{fullAccess ? '🔓' : '🔒'}</span>
                <div className="text-left">
                  <p className="text-sm font-bold text-[#1C1917]">{fullAccess ? 'Acceso completo' : 'Acceso personalizado'}</p>
                  <p className="text-xs text-stone-400">{fullAccess ? 'Ve todo el panel sin restricciones' : 'Solo las secciones seleccionadas abajo'}</p>
                </div>
              </div>
              <div className="w-11 h-6 rounded-full flex items-center transition-all px-0.5 shrink-0"
                style={{ background: fullAccess ? '#10b981' : '#d1d5db' }}>
                <div className="w-5 h-5 bg-white rounded-full shadow transition-transform"
                  style={{ transform: fullAccess ? 'translateX(20px)' : 'translateX(0)' }} />
              </div>
            </button>
          </div>

          {/* Section grid */}
          {!fullAccess && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Secciones habilitadas</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSections(ALL_SECTIONS.map((s) => s.key))}
                    className="text-xs text-indigo-600 font-semibold hover:text-indigo-800">Todas</button>
                  <span className="text-stone-300">|</span>
                  <button type="button" onClick={() => setSections([])}
                    className="text-xs text-stone-400 font-semibold hover:text-stone-600">Ninguna</button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {ALL_SECTIONS.map((s) => (
                  <SectionToggle
                    key={s.key}
                    skey={s.key}
                    label={s.label}
                    icon={s.icon}
                    desc={s.desc}
                    checked={sections.includes(s.key)}
                    onChange={(v) => toggleSection(s.key, v)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E8E3DC] flex gap-3">
          <button onClick={save} disabled={saving || (!fullAccess && sections.length === 0)}
            className="flex-1 py-3 rounded-xl font-black text-white text-sm transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
            {saving ? 'Guardando…' : 'Guardar permisos'}
          </button>
          <button onClick={onClose}
            className="px-5 py-3 rounded-xl font-semibold text-stone-500 text-sm border border-[#E8E3DC] hover:bg-stone-50">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    username: '',
    password: '',
    restaurant_id: '',
    role: 'manager' as 'admin' | 'manager' | 'cajero',
    allowed_sections: ALL_SECTIONS.map((s) => s.key) as string[],
    fullAccess: true,
  });

  async function load() {
    const [u, r] = await Promise.all([fetch('/api/users'), fetch('/api/restaurants')]);
    const ud = await u.json();
    const rd = await r.json();
    if (ud.users) setUsers(ud.users);
    if (rd.restaurants) setRestaurants(rd.restaurants);
  }

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    setSubmitting(true); setError(null);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          restaurant_id: form.restaurant_id,
          role: form.role,
          allowed_sections: form.fullAccess ? null : form.allowed_sections,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al crear usuario.'); }
      else {
        setForm({ username: '', password: '', restaurant_id: '', role: 'manager', allowed_sections: ALL_SECTIONS.map((s) => s.key), fullAccess: true });
        setShowCreate(false);
        await load();
        setSuccess('Usuario creado exitosamente.');
        setTimeout(() => setSuccess(null), 4000);
      }
    } finally { setSubmitting(false); }
  }

  async function handleDelete(id: string, username: string) {
    if (!confirm(`¿Eliminar el usuario "${username}"?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== id));
        setSuccess('Usuario eliminado.'); setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json(); setError(data.error ?? 'Error al eliminar.');
      }
    } finally { setDeletingId(null); }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Hero */}
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-5xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              👤 Usuarios & Permisos
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Control de Acceso</h1>
            <p className="text-orange-200/70 mt-1.5 text-sm">Define exactamente a qué puede acceder cada usuario</p>
          </div>
          <button onClick={() => { setShowCreate((v) => !v); setError(null); }}
            className="flex items-center gap-2 font-bold px-5 py-3 rounded-xl text-sm"
            style={{ background: 'white', color: '#111', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Usuario
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-10 py-6">
        {success && <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium rounded-xl px-4 py-3">{success}</div>}
        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl px-4 py-3">{error}</div>}

        {/* Create form */}
        {showCreate && (
          <div className="bg-white border border-[#E8E3DC] rounded-2xl p-6 mb-6 shadow-sm">
            <h2 className="text-base font-black text-[#1C1917] mb-4">Crear nuevo usuario</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Usuario</label>
                  <input type="text" required value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    placeholder="ej. manager_norte"
                    className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Contraseña</label>
                  <input type="password" required minLength={8} value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="mínimo 8 caracteres"
                    className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Restaurante</label>
                  <select value={form.restaurant_id} onChange={(e) => setForm((f) => ({ ...f, restaurant_id: e.target.value }))}
                    className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]">
                    <option value="">Sin restaurante (Admin global)</option>
                    {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">Rol</label>
                  <div className="flex gap-2">
                    {(['manager', 'cajero', 'admin'] as const).map((r) => (
                      <button key={r} type="button" onClick={() => setForm((f) => ({ ...f, role: r }))}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all"
                        style={{
                          background: form.role === r ? ROLE_COLORS[r].bg : '#f5f5f4',
                          color: form.role === r ? ROLE_COLORS[r].text : '#78716c',
                          border: `1.5px solid ${form.role === r ? ROLE_COLORS[r].dot : 'transparent'}`,
                        }}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Access level for new user */}
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Acceso</label>
                <button type="button" onClick={() => setForm((f) => ({ ...f, fullAccess: !f.fullAccess }))}
                  className="w-full flex items-center justify-between p-3 rounded-xl transition-all mb-2"
                  style={{ background: form.fullAccess ? 'rgba(16,185,129,0.08)' : 'rgba(0,0,0,0.02)', border: `1.5px solid ${form.fullAccess ? '#10b981' : '#e5e7eb'}` }}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{form.fullAccess ? '🔓' : '🔒'}</span>
                    <p className="text-sm font-bold text-[#1C1917]">{form.fullAccess ? 'Acceso completo' : 'Acceso personalizado'}</p>
                  </div>
                  <div className="w-11 h-6 rounded-full flex items-center transition-all px-0.5 shrink-0"
                    style={{ background: form.fullAccess ? '#10b981' : '#d1d5db' }}>
                    <div className="w-5 h-5 bg-white rounded-full shadow transition-transform"
                      style={{ transform: form.fullAccess ? 'translateX(20px)' : 'translateX(0)' }} />
                  </div>
                </button>

                {!form.fullAccess && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ALL_SECTIONS.map((s) => (
                      <SectionToggle key={s.key} skey={s.key} label={s.label} icon={s.icon} desc={s.desc}
                        checked={form.allowed_sections.includes(s.key)}
                        onChange={(v) => setForm((f) => ({
                          ...f,
                          allowed_sections: v ? [...f.allowed_sections, s.key] : f.allowed_sections.filter((k) => k !== s.key),
                        }))} />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting}
                  className="bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-60 text-white text-sm font-bold px-6 py-3 rounded-xl transition-colors">
                  {submitting ? 'Creando…' : 'Crear usuario'}
                </button>
                <button type="button" onClick={() => { setShowCreate(false); setError(null); }}
                  className="text-sm font-medium text-stone-500 hover:text-[#1C1917] border border-[#E8E3DC] px-5 py-3 rounded-xl transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-stone-400 text-sm">Cargando…</div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-stone-400">
            <div className="text-5xl mb-4">👤</div>
            <p className="text-sm font-semibold">No hay usuarios creados aún</p>
            <p className="text-xs mt-1">Crea el primero con el botón &ldquo;Nuevo Usuario&rdquo;</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onEdit={() => setEditingUser(user)}
                onDelete={() => handleDelete(user.id, user.username)}
                deleting={deletingId === user.id}
              />
            ))}
          </div>
        )}
      </div>

      {editingUser && (
        <EditModal
          user={editingUser}
          restaurants={restaurants}
          onClose={() => setEditingUser(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
