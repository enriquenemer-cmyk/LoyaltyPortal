'use client';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: 440, width: '100%' }}>
        {/* Brand icon */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg,#2563EB,#0891B2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(37,99,235,0.25)' }}>
            <span style={{ fontSize: 32 }}></span>
          </div>
        </div>

        {/* Big 404 with gradient */}
        <div style={{ fontSize: 120, fontWeight: 900, lineHeight: 1, background: 'linear-gradient(135deg,#2563EB,#0EA5E9,#2563EB)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 8 }}>
          404
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1C1917', marginBottom: 10 }}>
          Esta página no existe
        </h1>
        <p style={{ color: '#78716c', fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
          El enlace que seguiste ya no es válido, fue removido o nunca existió en el sistema de 3E.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#2563EB,#0891B2)', color: 'white', fontWeight: 700, fontSize: 15, padding: '12px 24px', borderRadius: 14, textDecoration: 'none', boxShadow: '0 8px 24px rgba(37,99,235,0.30)' }}>
            ← Volver al inicio
          </Link>
          <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', color: '#44403c', fontWeight: 700, fontSize: 15, padding: '12px 24px', borderRadius: 14, textDecoration: 'none', border: '1px solid #E8E3DC', boxShadow: '0 1px 4px rgba(28,25,23,0.06)' }}>
            Ir al panel
          </Link>
        </div>

        <p style={{ color: '#a8a29e', fontSize: 12, marginTop: 40 }}>3E · Plataforma de Premios</p>
      </div>
    </div>
  );
}
