'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type Restaurant = {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  logo_url: string | null;
};

type Stats = {
  total_prizes: number;
  total_claims: number;
  delivered: number;
  pending: number;
};

type Claim = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  prize_name: string;
  prize_location: string;
  location: string | null;
  claimed_at: string;
  status: 'pending' | 'delivered';
  delivered_at: string | null;
  delivered_by: string | null;
};

type ActivityEntry = {
  id: string;
  action: string;
  description: string;
  user_name: string | null;
  created_at: string;
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

function activityIcon(action: string) {
  if (action === 'prize_created') return '🎁';
  if (action === 'prize_cancelled') return '⛔';
  if (action === 'claim_registered') return '👤';
  if (action === 'prize_delivered') return '✅';
  return '📋';
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  const colors = ['from-violet-500 to-purple-600', 'from-blue-500 to-indigo-600', 'from-orange-500 to-orange-700', 'from-rose-500 to-pink-600', 'from-amber-500 to-orange-600'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}>
      {initials}
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number | string; color: 'gray' | 'orange' | 'blue' | 'amber'; icon: React.ReactNode }) {
  const colorMap = {
    gray:    { border: 'border-l-gray-400',   bg: 'bg-gray-100',   text: 'text-gray-600',   num: 'text-gray-900'   },
    orange: { border: 'border-l-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', num: 'text-orange-600' },
    blue:    { border: 'border-l-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-700',    num: 'text-blue-600'   },
    amber:   { border: 'border-l-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-700',   num: 'text-amber-600'  },
  };
  const c = colorMap[color];
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 border-l-4 ${c.border} shadow-sm p-5 flex items-center gap-4`}>
      <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
        <span className={c.text}>{icon}</span>
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
        <p className={`text-3xl font-extrabold ${c.num}`}>{value}</p>
      </div>
    </div>
  );
}

const inputClass = 'w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all shadow-sm';
const labelClass = 'block text-sm font-semibold text-slate-700 mb-1.5';

export default function RestaurantProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Edit form
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', address: '', phone: '' });
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Manager form
  const [showManager, setShowManager] = useState(false);
  const [managerForm, setManagerForm] = useState({ username: '', password: '' });
  const [managerLoading, setManagerLoading] = useState(false);
  const [managerMsg, setManagerMsg] = useState('');
  const [managerError, setManagerError] = useState('');

  async function load() {
    try {
      const res = await fetch(`/api/restaurants/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRestaurant(data.restaurant);
      setStats(data.stats);
      setClaims(data.claims);
      setActivity(data.activity || []);
      setEditForm({ name: data.restaurant.name, address: data.restaurant.address, phone: data.restaurant.phone || '' });
    } catch {
      setError('No se pudo cargar el perfil del restaurante.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  const filtered = claims.filter((c) => {
    const q = search.toLowerCase();
    return c.full_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.prize_name.toLowerCase().includes(q);
  });

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditError('');
    setEditLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', editForm.name);
      formData.append('address', editForm.address);
      formData.append('phone', editForm.phone);
      if (editFile) formData.append('logo', editFile);
      const res = await fetch(`/api/restaurants/${id}`, { method: 'PUT', body: formData });
      const data = await res.json();
      if (!res.ok) { setEditError(data.error || 'Error al guardar.'); return; }
      setRestaurant(data.restaurant);
      setShowEdit(false);
    } catch {
      setEditError('Error de conexión.');
    } finally {
      setEditLoading(false);
    }
  }

  async function handleManagerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setManagerError('');
    setManagerMsg('');
    setManagerLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: managerForm.username, password: managerForm.password, restaurant_id: id }),
      });
      const data = await res.json();
      if (!res.ok) { setManagerError(data.error || 'Error.'); return; }
      setManagerMsg(`Usuario "${data.user.username}" creado exitosamente.`);
      setManagerForm({ username: '', password: '' });
    } catch {
      setManagerError('Error de conexión.');
    } finally {
      setManagerLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
        <svg className="animate-spin w-10 h-10 text-orange-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-red-200 p-10 text-center max-w-md">
          <p className="text-red-600 font-semibold">{error || 'Restaurante no encontrado.'}</p>
          <Link href="/admin/restaurantes" className="mt-4 inline-block text-orange-600 hover:underline text-sm">Volver a Restaurantes</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <div className="max-w-7xl mx-auto px-4 py-10">

        {/* Back */}
        <Link href="/admin/restaurantes" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-orange-700 font-medium mb-6 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a Restaurantes
        </Link>

        {/* Profile header */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="bg-gradient-to-br from-orange-500 to-orange-700 p-6 flex items-center justify-between gap-5 flex-wrap">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-white text-2xl font-extrabold shrink-0 overflow-hidden">
                {restaurant.logo_url ? (
                  <img src={restaurant.logo_url} alt={restaurant.name} className="w-full h-full object-cover" />
                ) : (
                  restaurant.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
                )}
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white">{restaurant.name}</h1>
                <div className="flex flex-wrap items-center gap-4 mt-1">
                  <span className="flex items-center gap-1.5 text-white/80 text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {restaurant.address}
                  </span>
                  {restaurant.phone && (
                    <span className="flex items-center gap-1.5 text-white/80 text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {restaurant.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowEdit((v) => !v)}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm border border-white/30"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
          </div>

          {/* Edit form */}
          {showEdit && (
            <form onSubmit={handleEditSubmit} className="p-5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nombre</label>
                <input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Dirección</label>
                <input value={editForm.address} onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Teléfono</label>
                <input value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Logo (imagen)</label>
                <input type="file" accept="image/*" onChange={(e) => setEditFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-orange-50 file:text-orange-700 file:font-semibold" />
              </div>
              {editError && <div className="sm:col-span-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2">{editError}</div>}
              <div className="sm:col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={editLoading} className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm">
                  {editLoading ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total premios" value={stats.total_prizes} color="blue"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>}
            />
            <StatCard label="Total cobros" value={stats.total_claims} color="gray"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            />
            <StatCard label="Entregados" value={stats.delivered} color="orange"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatCard label="Pendientes" value={stats.pending} color="amber"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
          </div>
        )}

        {/* Claims table */}
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-extrabold text-gray-900 flex-1">Cobros de este Restaurante</h2>
          <div className="relative max-w-xs flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all shadow-sm"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-14 text-center mb-8">
            <p className="text-gray-500 font-semibold">{search ? 'Sin resultados' : 'Aún no hay cobros para este restaurante'}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wider">Persona</th>
                    <th className="text-left px-5 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wider">Celular</th>
                    <th className="text-left px-5 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wider">Correo</th>
                    <th className="text-left px-5 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wider">Estado</th>
                    <th className="text-left px-5 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wider">Premio</th>
                    <th className="text-left px-5 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wider">Fecha y Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((claim) => (
                    <tr key={claim.id} className="hover:bg-gray-50/70 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={claim.full_name} />
                          <span className="font-semibold text-gray-900">{claim.full_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-600 font-mono text-xs">{claim.phone}</td>
                      <td className="px-5 py-4">
                        <a href={`mailto:${claim.email}`} className="text-blue-600 hover:underline text-xs">{claim.email}</a>
                      </td>
                      <td className="px-5 py-4">
                        {claim.status === 'delivered' ? (
                          <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full border border-orange-200">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            Entregado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-indigo-200">{claim.prize_name}</span>
                      </td>
                      <td className="px-5 py-4 text-gray-400 text-xs whitespace-nowrap">{formatDate(claim.claimed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Mostrando <span className="font-semibold text-gray-600">{filtered.length}</span> de <span className="font-semibold text-gray-600">{claims.length}</span> registros
              </p>
            </div>
          </div>
        )}

        {/* Manager creation */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Usuarios</h2>
              <p className="text-xs text-slate-400 mt-0.5">Crea una cuenta de manager para este restaurante</p>
            </div>
            <button onClick={() => setShowManager((v) => !v)} className="text-xs font-semibold text-orange-700 border border-orange-200 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition-colors">
              {showManager ? 'Cancelar' : '+ Nuevo usuario'}
            </button>
          </div>
          {showManager && (
            <form onSubmit={handleManagerSubmit} className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Usuario</label>
                <input value={managerForm.username} onChange={(e) => setManagerForm((p) => ({ ...p, username: e.target.value }))} required placeholder="Ej: manager_centro" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Contraseña</label>
                <input type="password" value={managerForm.password} onChange={(e) => setManagerForm((p) => ({ ...p, password: e.target.value }))} required placeholder="Contraseña segura" className={inputClass} />
              </div>
              {managerError && <div className="sm:col-span-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2">{managerError}</div>}
              {managerMsg && <div className="sm:col-span-2 text-orange-700 text-sm bg-orange-50 border border-orange-200 rounded-xl px-4 py-2">{managerMsg}</div>}
              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" disabled={managerLoading} className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm">
                  {managerLoading ? 'Creando...' : 'Crear usuario'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Activity log */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Actividad Reciente</h2>
          </div>
          {activity.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">Sin actividad registrada</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {activity.map((a) => (
                <div key={a.id} className="px-5 py-4 flex items-start gap-4">
                  <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-lg shrink-0">{activityIcon(a.action)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{a.description}</p>
                    {a.user_name && <p className="text-xs text-slate-400 mt-0.5">por {a.user_name}</p>}
                  </div>
                  <p className="text-xs text-slate-400 whitespace-nowrap shrink-0">{timeAgo(a.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
