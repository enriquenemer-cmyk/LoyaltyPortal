'use client';

import { useEffect, useState } from 'react';

type Claim = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  prize_name: string;
  prize_location: string;
  claimed_at: string;
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  const colors = ['from-violet-500 to-purple-600', 'from-blue-500 to-indigo-600', 'from-emerald-500 to-teal-600', 'from-rose-500 to-pink-600', 'from-amber-500 to-orange-600'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
      {initials}
    </div>
  );
}

export default function RegistrosPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchClaims() {
      try {
        const res = await fetch('/api/claims');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setClaims(data.claims);
      } catch {
        setError('No se pudieron cargar los registros.');
      } finally {
        setLoading(false);
      }
    }
    fetchClaims();
    const interval = setInterval(fetchClaims, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = claims.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.full_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.prize_name.toLowerCase().includes(q) ||
      c.prize_location.toLowerCase().includes(q)
    );
  });

  const uniquePrizes = new Set(claims.map((c) => c.prize_name)).size;
  const uniqueLocations = new Set(claims.map((c) => c.prize_location)).size;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3 border border-blue-200">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Registros de Cobro
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Panel de Registros</h1>
          <p className="text-gray-500 mt-1.5">Historial de todas las personas que han reclamado premios.</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total cobros</p>
            <p className="text-4xl font-extrabold text-gray-900">{claims.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Premios distintos</p>
            <p className="text-4xl font-extrabold text-emerald-600">{uniquePrizes}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Sucursales</p>
            <p className="text-4xl font-extrabold text-blue-600">{uniqueLocations}</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-5">
          <div className="relative max-w-sm">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre, correo, premio o lugar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all shadow-sm"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-20 text-center">
            <svg className="animate-spin w-8 h-8 text-emerald-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-gray-400 text-sm">Cargando registros...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">{search ? 'Sin resultados para esa búsqueda' : 'Aún no hay registros de cobro'}</p>
            <p className="text-gray-400 text-sm mt-1">{search ? 'Prueba con otro término' : 'Los registros aparecerán aquí cuando alguien escanee un QR'}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Persona</th>
                    <th className="text-left px-5 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Celular</th>
                    <th className="text-left px-5 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Correo</th>
                    <th className="text-left px-5 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Premio</th>
                    <th className="text-left px-5 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Lugar de Cobro</th>
                    <th className="text-left px-5 py-4 font-bold text-gray-500 text-xs uppercase tracking-wider">Fecha y Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((claim) => (
                    <tr key={claim.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={claim.full_name} />
                          <span className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">{claim.full_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-600 font-mono text-xs">{claim.phone}</td>
                      <td className="px-5 py-4">
                        <a href={`mailto:${claim.email}`} className="text-blue-600 hover:text-blue-800 hover:underline text-xs">{claim.email}</a>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                          {claim.prize_name}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-amber-700">
                          <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-xs font-medium text-gray-700">{claim.prize_location}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-400 text-xs whitespace-nowrap">{formatDate(claim.claimed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Mostrando <span className="font-semibold text-gray-600">{filtered.length}</span> de <span className="font-semibold text-gray-600">{claims.length}</span> registros
              </p>
              <p className="text-xs text-gray-400">Se actualiza automáticamente cada 30 seg.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
