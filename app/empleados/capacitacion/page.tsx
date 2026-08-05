'use client';
import { BookOpenIcon } from '@heroicons/react/24/outline';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Module = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  question_count: number;
  completed: boolean;
  best_score: number | null;
  best_total_points: number | null;
};

export default function CapacitacionListPage() {
  const router = useRouter();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch('/api/employees/me');
        if (meRes.status === 401) {
          router.replace('/empleados');
          return;
        }
        const res = await fetch('/api/employee/training/modules');
        if (res.status === 401) {
          router.replace('/empleados');
          return;
        }
        const data = await res.json();
        setModules(data.modules ?? []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FAFAF9]" style={{ minHeight: '100vh' }}>
      <div className="hero-gradient px-4 pt-8 pb-10">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => router.push('/empleados/panel')}
            className="text-blue-100 text-sm font-semibold mb-3 flex items-center gap-1"
          >
            ← Volver
          </button>
          <div className="text-2xl"><BookOpenIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">Capacitación</h1>
          <p className="text-orange-200/70 mt-1.5 text-sm">Completa los módulos y gana puntos</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-6 relative z-10 pb-10">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-stone-400 text-sm">Cargando…</div>
        ) : modules.length === 0 ? (
          <div className="bg-white border border-[#E8E3DC] rounded-2xl p-10 text-center shadow-sm">
            <p className="text-stone-500 font-medium">Aún no hay módulos de capacitación disponibles.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {modules.map((mod) => (
              <Link
                key={mod.id}
                href={`/empleados/capacitacion/${mod.id}`}
                className="relative bg-white border border-[#E8E3DC] rounded-2xl p-5 shadow-sm hover:border-[#2563EB] hover:shadow-md transition-all flex flex-col gap-2"
                style={{ minHeight: 140 }}
              >
                {mod.completed && (
                  <span className="absolute top-3 right-3 text-[11px] font-bold bg-emerald-100 text-emerald-700 rounded-full px-2.5 py-1">
                    Completado ✓
                  </span>
                )}
                <div className="text-3xl">{mod.icon || ''}</div>
                <div className="text-base font-bold text-[#1C1917]">{mod.title}</div>
                {mod.description && (
                  <p className="text-sm text-stone-500 leading-snug flex-1">{mod.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-stone-400 mt-1">
                  <span>{mod.question_count} {mod.question_count === 1 ? 'pregunta' : 'preguntas'}</span>
                  {mod.best_total_points !== null && (
                    <span className="font-bold text-[#2563EB]">{mod.best_total_points} pts</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
