'use client';
import { UserIcon } from '@heroicons/react/24/outline';

import { useEffect, useState } from 'react';

type User = {
  id: string;
  username: string;
  role: string;
  restaurant_name: string | null;
  created_at: string;
};

type Restaurant = {
  id: string;
  name: string;
};

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    username: '',
    password: '',
    restaurant_id: '',
    role: 'manager' as 'admin' | 'manager' | 'cajero',
  });

  async function loadUsers() {
    const res = await fetch('/api/users');
    const data = await res.json();
    if (data.users) setUsers(data.users);
  }

  async function loadRestaurants() {
    const res = await fetch('/api/restaurants');
    const data = await res.json();
    if (data.restaurants) setRestaurants(data.restaurants);
  }

  useEffect(() => {
    Promise.all([loadUsers(), loadRestaurants()]).finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Error al crear usuario.');
      } else {
        setForm({ username: '', password: '', restaurant_id: '', role: 'manager' });
        setShowForm(false);
        await loadUsers();
        setSuccess('Usuario creado exitosamente.');
        setTimeout(() => setSuccess(null), 4000);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, username: string) {
    if (!confirm(`¿Eliminar el usuario "${username}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== id));
        setSuccess('Usuario eliminado.');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json();
        setError(data.error ?? 'Error al eliminar usuario.');
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-5xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <UserIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Usuarios
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Usuarios del Sistema</h1>
            <p className="text-orange-200/70 mt-1.5 text-sm">Gestiona los managers por restaurante</p>
          </div>
          <button
            onClick={() => { setShowForm((v) => !v); setError(null); }}
            className="flex items-center gap-2 font-bold px-5 py-3 rounded-xl text-sm"
            style={{ background: 'white', color: '#1d4ed8', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Usuario
          </button>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 md:px-10 py-6">

        {/* Notifications */}
        {success && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium rounded-xl px-4 py-3">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <div className="bg-white border border-[#E8E3DC] rounded-2xl p-6 mb-6 shadow-sm">
            <h2 className="text-base font-semibold text-[#1C1917] mb-4">Crear nuevo usuario</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                  Nombre de usuario
                </label>
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="ej. manager_sucursal1"
                  className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2.5 text-sm text-[#1C1917] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                  Contraseña (mín. 8 caracteres)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2.5 text-sm text-[#1C1917] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                  Restaurante
                </label>
                <select
                  value={form.restaurant_id}
                  onChange={(e) => setForm((f) => ({ ...f, restaurant_id: e.target.value }))}
                  className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2.5 text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors bg-white"
                >
                  <option value="">Sin restaurante (Admin global)</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                  Rol
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'admin' | 'manager' | 'cajero' }))}
                  className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2.5 text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors bg-white"
                >
                  <option value="manager">Manager</option>
                  <option value="cajero">Cajero</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="sm:col-span-2 flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#2563EB] hover:bg-[#0891B2] disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                >
                  {submitting ? 'Creando…' : 'Crear usuario'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(null); }}
                  className="text-sm font-medium text-stone-500 hover:text-[#1C1917] border border-[#E8E3DC] px-5 py-2.5 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        <div className="bg-white border border-[#E8E3DC] rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-stone-400 text-sm">Cargando…</div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-stone-400">
              <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm font-medium">No hay usuarios creados aún</p>
              <p className="text-xs mt-1">Crea el primero con el botón &ldquo;Nuevo Usuario&rdquo;</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E8E3DC] bg-[#FAFAF9]">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Usuario</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Rol</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Restaurante</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Creado</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, i) => (
                    <tr
                      key={user.id}
                      className={`border-b border-[#E8E3DC] last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF9]/50'} hover:bg-orange-50/30 transition-colors`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#2563EB]/10 flex items-center justify-center shrink-0">
                            <svg className="w-3.5 h-3.5 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <span className="font-medium text-[#1C1917]">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center text-xs font-semibold rounded-full px-2.5 py-1 capitalize ${
                            user.role === 'admin'
                              ? 'bg-orange-100 text-orange-700'
                              : user.role === 'cajero'
                              ? 'bg-orange-50 text-orange-700'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-stone-600">
                        {user.restaurant_name ?? <span className="text-stone-400 italic">Sin restaurante</span>}
                      </td>
                      <td className="px-5 py-3.5 text-stone-500">
                        {new Date(user.created_at).toLocaleDateString('es-MX', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleDelete(user.id, user.username)}
                          disabled={deletingId === user.id}
                          className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {deletingId === user.id ? '…' : 'Eliminar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
