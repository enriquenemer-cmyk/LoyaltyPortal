'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Stats {
  restaurants: number;
  prizes: number;
  claims: number;
}

export default function HomePage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) {
          router.push('/admin/generate');
        } else {
          setCheckingAuth(false);
        }
      })
      .catch(() => {
        setCheckingAuth(false);
      });
  }, [router]);

  useEffect(() => {
    if (checkingAuth) return;
    fetch('/api/restaurants')
      .then((res) => res.json())
      .then((data) => {
        setStats({
          restaurants: Array.isArray(data) ? data.length : (data?.total ?? 0),
          prizes: 0,
          claims: 0,
        });
      })
      .catch(() => {});
  }, [checkingAuth]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="spinner-brand spinner-lg" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 py-24 text-center gap-6">
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 text-blue-700 text-sm font-medium">
          <span>Plataforma de premios QR</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-black tracking-tight text-stone-900 max-w-3xl leading-tight">
          Fideliza a tus clientes con <span className="text-blue-600">Premia</span>
        </h1>
        <p className="text-lg text-stone-500 max-w-xl">
          Genera códigos QR de premios, gestiona tus restaurantes y haz seguimiento de canjes en tiempo real.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Link
            href="/admin/login"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/cajero"
            className="inline-flex items-center justify-center px-6 py-3 border border-stone-200 hover:bg-stone-50 text-stone-700 font-semibold rounded-xl transition-colors"
          >
            Acceso cajero
          </Link>
        </div>
      </section>

      {/* Stats */}
      {stats && (
        <section className="max-w-3xl mx-auto px-6 pb-20 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="bg-white border border-stone-100 rounded-2xl p-6 shadow-sm">
            <p className="text-4xl font-black text-blue-600">{stats.restaurants}</p>
            <p className="text-stone-500 text-sm mt-1">Restaurantes activos</p>
          </div>
          <div className="bg-white border border-stone-100 rounded-2xl p-6 shadow-sm">
            <p className="text-4xl font-black text-blue-600">{stats.prizes}</p>
            <p className="text-stone-500 text-sm mt-1">Premios generados</p>
          </div>
          <div className="bg-white border border-stone-100 rounded-2xl p-6 shadow-sm">
            <p className="text-4xl font-black text-blue-600">{stats.claims}</p>
            <p className="text-stone-500 text-sm mt-1">Canjes realizados</p>
          </div>
        </section>
      )}
    </main>
  );
}
