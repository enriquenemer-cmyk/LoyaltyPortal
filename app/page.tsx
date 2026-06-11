'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Stats {
  restaurants: number;
  prizes: number;
  claims: number;
}

function useCountUp(target: number, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start || target === 0) return;
    const startTime = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setValue(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration, start]);
  return value;
}

function AnimatedStat({ value, label, icon, delay = 0 }: { value: number; label: string; icon: string; delay?: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = useCountUp(value, 1600, visible);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative group"
      style={{ animationDelay: `${delay}ms`, animation: 'fadeSlideUp 0.7s ease-out both' }}
    >
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 blur-xl group-hover:from-blue-500/20 group-hover:to-cyan-500/20 transition-all duration-500" />
      <div className="relative bg-white/80 backdrop-blur-sm border border-white/60 rounded-3xl p-8 shadow-xl shadow-blue-500/5 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300">
        <div className="text-4xl mb-3">{icon}</div>
        <div className="text-5xl font-black tabular-nums" style={{ background: 'linear-gradient(135deg,#2563EB,#0EA5E9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          {count}
        </div>
        <p className="text-stone-500 text-sm font-medium mt-2">{label}</p>
      </div>
    </div>
  );
}

function FloatingOrb({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`absolute rounded-full blur-3xl pointer-events-none ${className}`} style={style} />;
}

function FeatureCard({ icon, title, desc, delay }: { icon: string; title: string; desc: string; delay: number }) {
  return (
    <div
      className="group relative bg-white/70 backdrop-blur-sm border border-stone-100 rounded-2xl p-6 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300"
      style={{ animation: 'fadeSlideUp 0.6s ease-out both', animationDelay: `${delay}ms` }}
    >
      <div className="text-3xl mb-4 group-hover:scale-110 transition-transform duration-300 inline-block">{icon}</div>
      <h3 className="font-bold text-stone-800 mb-1">{title}</h3>
      <p className="text-stone-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d?.user) router.push('/admin/generate'); else setCheckingAuth(false); })
      .catch(() => setCheckingAuth(false));
  }, [router]);

  useEffect(() => {
    if (checkingAuth) return;
    fetch('/api/system/health')
      .then((r) => r.json())
      .then((d) => {
        if (d?.total_records) {
          setStats({ restaurants: d.total_records.restaurants, prizes: d.total_records.prizes, claims: d.total_records.claims });
        }
      })
      .catch(() => {});
  }, [checkingAuth]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner-brand spinner-lg" />
      </div>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden" style={{ background: 'linear-gradient(160deg,#EFF6FF 0%,#F0F9FF 40%,#FAFAF9 100%)' }}>
      {/* Background orbs */}
      <FloatingOrb className="w-[600px] h-[600px] -top-40 -left-40 opacity-30" style={{ background: 'radial-gradient(circle,#BFDBFE,transparent)', animation: 'floatOrb 12s ease-in-out infinite' }} />
      <FloatingOrb className="w-[500px] h-[500px] top-1/3 -right-40 opacity-20" style={{ background: 'radial-gradient(circle,#BAE6FD,transparent)', animation: 'floatOrb 9s ease-in-out infinite reverse' }} />
      <FloatingOrb className="w-[400px] h-[400px] bottom-0 left-1/3 opacity-15" style={{ background: 'radial-gradient(circle,#DDD6FE,transparent)', animation: 'floatOrb 15s ease-in-out infinite' }} />

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-28 pb-20 text-center gap-8">
        {/* Badge */}
        <div style={{ animation: 'fadeSlideUp 0.5s ease-out both' }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-blue-700 border border-blue-200/60 backdrop-blur-sm" style={{ background: 'rgba(219,234,254,0.6)' }}>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" />
            Plataforma de premios QR
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-stone-900 max-w-4xl leading-none" style={{ animation: 'fadeSlideUp 0.6s ease-out 0.1s both' }}>
          Fideliza a tus<br />
          <span className="relative inline-block">
            <span style={{ background: 'linear-gradient(135deg,#2563EB 0%,#0EA5E9 50%,#7C3AED 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              clientes
            </span>
          </span>{' '}
          con premios
        </h1>

        <p className="text-xl text-stone-500 max-w-lg leading-relaxed" style={{ animation: 'fadeSlideUp 0.6s ease-out 0.2s both' }}>
          Genera QRs de premios, gestiona restaurantes y haz seguimiento de canjes en tiempo real.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 mt-2" style={{ animation: 'fadeSlideUp 0.6s ease-out 0.3s both' }}>
          <Link
            href="/admin/login"
            className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-base shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-200"
            style={{ background: 'linear-gradient(135deg,#2563EB,#0891B2)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Iniciar sesión
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
          <Link
            href="/cajero"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border border-stone-200 bg-white/80 backdrop-blur-sm text-stone-700 font-bold text-base hover:bg-white hover:border-stone-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
          >
            <svg className="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.24M16.24 12l1.76-4.76-4.76 1.76M12 12l-4.76 1.76 1.76-4.76" /></svg>
            Acceso cajero
          </Link>
        </div>

        {/* Dashboard preview mockup */}
        <div className="relative mt-10 w-full max-w-3xl" style={{ animation: 'fadeSlideUp 0.8s ease-out 0.4s both' }}>
          <div className="absolute inset-0 rounded-3xl blur-2xl opacity-30" style={{ background: 'linear-gradient(135deg,#2563EB,#0EA5E9)', transform: 'scale(0.95) translateY(20px)' }} />
          <div className="relative bg-white/90 backdrop-blur-md rounded-3xl border border-white/60 shadow-2xl shadow-blue-500/20 overflow-hidden">
            {/* Fake browser bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-100 bg-stone-50/80">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="ml-3 flex-1 bg-stone-200/60 rounded-md h-5 text-xs text-stone-400 flex items-center px-2">premia-tierra.vercel.app</div>
            </div>
            {/* Fake dashboard content */}
            <div className="p-6 grid grid-cols-3 gap-4">
              {[
                { label: 'Premios activos', val: '38', color: '#2563EB', bg: '#EFF6FF' },
                { label: 'Canjes hoy', val: '12', color: '#0891B2', bg: '#E0F2FE' },
                { label: 'Restaurantes', val: '25', color: '#7C3AED', bg: '#EDE9FE' },
              ].map((s, i) => (
                <div key={i} className="rounded-2xl p-4" style={{ background: s.bg }}>
                  <p className="text-xs font-medium text-stone-500 mb-1">{s.label}</p>
                  <p className="text-3xl font-black" style={{ color: s.color }}>{s.val}</p>
                </div>
              ))}
            </div>
            {/* Fake bar chart */}
            <div className="px-6 pb-6">
              <div className="bg-stone-50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-stone-400 mb-4 uppercase tracking-widest">Actividad esta semana</p>
                <div className="flex items-end gap-2 h-20">
                  {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                    <div key={i} className="flex-1 rounded-lg" style={{ height: `${h}%`, background: `linear-gradient(180deg,#2563EB,#0EA5E9)`, opacity: 0.6 + i * 0.06, animation: `fillGrow 0.6s ease-out ${i * 0.08}s both` }} />
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  {['L','M','X','J','V','S','D'].map((d, i) => (
                    <span key={i} className="text-xs text-stone-400 flex-1 text-center">{d}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      {stats && (
        <section className="relative max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-center text-2xl font-black text-stone-800 mb-10" style={{ animation: 'fadeSlideUp 0.5s ease-out both' }}>
            La plataforma en números
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <AnimatedStat value={stats.restaurants} label="Restaurantes activos" icon="🏪" delay={0} />
            <AnimatedStat value={stats.prizes} label="Premios generados" icon="🎁" delay={100} />
            <AnimatedStat value={stats.claims} label="Canjes realizados" icon="✅" delay={200} />
          </div>
        </section>
      )}

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <h2 className="text-center text-2xl font-black text-stone-800 mb-10" style={{ animation: 'fadeSlideUp 0.5s ease-out both' }}>
          Todo lo que necesitas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          <FeatureCard icon="📱" title="Escaneo de tickets" desc="Los clientes fotografían su ticket y la IA lee el monto automáticamente." delay={0} />
          <FeatureCard icon="🎰" title="Juegos y sorteos" desc="Slots, ruletas y más para mantener a tus clientes enganchados." delay={80} />
          <FeatureCard icon="📊" title="Reportes en tiempo real" desc="Ve canjes, premios activos y rendimiento por sucursal al instante." delay={160} />
          <FeatureCard icon="🔗" title="QR personalizable" desc="Genera códigos QR con tu diseño para campañas y mesas." delay={240} />
          <FeatureCard icon="🏆" title="Puntos y niveles" desc="Sistema de fidelidad con puntos, rangos y recompensas automáticas." delay={320} />
          <FeatureCard icon="🔔" title="Notificaciones push" desc="Avisos automáticos a clientes sobre premios y caducidades." delay={400} />
        </div>
      </section>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatOrb {
          0%,100% { transform: translateY(0) scale(1); }
          50%      { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes fillGrow {
          from { transform: scaleY(0); transform-origin: bottom; }
          to   { transform: scaleY(1); transform-origin: bottom; }
        }
      `}</style>
    </main>
  );
}
