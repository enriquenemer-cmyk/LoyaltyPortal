'use client';

const VERSION = '1.0.0';
const RELEASE_BASE = `https://github.com/enriquenemer-cmyk/LoyaltyPortal/releases/download/v${VERSION}`;

const DOWNLOADS = [
  {
    os: 'Windows',
    emoji: '🪟',
    file: `3E Plataforma Setup ${VERSION}.exe`,
    size: '76 MB',
    desc: 'Windows 10 / 11 · 64-bit',
    color: '#0078d4',
    glow: 'rgba(0,120,212,0.3)',
    note: 'Instalador NSIS — doble clic y sigue los pasos',
  },
  {
    os: 'Mac',
    emoji: '🍎',
    file: `3E Plataforma-${VERSION}-arm64.dmg`,
    size: '91 MB',
    desc: 'macOS 12+ · Apple Silicon (M1/M2/M3)',
    color: '#555',
    glow: 'rgba(100,100,100,0.25)',
    note: 'Arrastra la app a tu carpeta Aplicaciones',
  },
];

const STEPS = [
  { n: '1', title: 'Descarga el instalador', body: 'Elige tu sistema operativo y haz clic en el botón de descarga.' },
  { n: '2', title: 'Ejecuta el instalador', body: 'En Windows: doble clic en el .exe. En Mac: abre el .dmg y arrastra la app.' },
  { n: '3', title: 'Ingresa tu clave de licencia', body: 'Al abrir la app por primera vez te pedirá la clave. Encuéntrala en el Panel de Licencias → Editar.' },
  { n: '4', title: '¡Listo!', body: 'La app valida tu licencia en línea. Si no hay internet, funciona 7 días con la validación guardada.' },
];

export default function DescargarPage() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg,#0f0c29 0%,#1a1040 50%,#0f172a 100%)' }}>

      {/* Hero */}
      <div className="px-6 pt-12 pb-10 text-center" style={{ maxWidth: 720, margin: '0 auto' }}>
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-4"
          style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.35)', color: '#fb923c' }}>
          App de Escritorio · v{VERSION}
        </div>
        <h1 className="font-black text-white mb-3" style={{ fontSize: 'clamp(28px,5vw,44px)', letterSpacing: '-1px' }}>
          Descarga 3E Plataforma
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>
          Instala la app en tu ordenador. Funciona con y sin internet. Tu licencia controla el acceso — si no pagas, se bloquea automáticamente.
        </p>
      </div>

      {/* Download cards */}
      <div className="px-4 pb-10" style={{ maxWidth: 720, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
        {DOWNLOADS.map(d => (
          <div key={d.os} style={{
            borderRadius: 24, padding: '28px 24px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 40 }}>{d.emoji}</div>
              <div>
                <p style={{ color: 'white', fontWeight: 900, fontSize: 22, margin: 0 }}>{d.os}</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '2px 0 0' }}>{d.desc}</p>
              </div>
            </div>

            <div style={{ borderRadius: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Archivo</p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: 'monospace', margin: 0 }}>{d.file}</p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: '4px 0 0' }}>{d.size}</p>
            </div>

            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{d.note}</p>

            <a
              href={`${RELEASE_BASE}/${encodeURIComponent(d.file)}`}
              download
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '16px 0', borderRadius: 14, textDecoration: 'none',
                background: `linear-gradient(135deg,${d.color},${d.color}cc)`,
                color: 'white', fontWeight: 900, fontSize: 16,
                boxShadow: `0 8px 28px ${d.glow}`,
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = ''; }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 12l-4 4-4-4M12 4v12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Descargar para {d.os}
            </a>
          </div>
        ))}
      </div>

      {/* Steps */}
      <div className="px-4 pb-12" style={{ maxWidth: 720, margin: '0 auto' }}>
        <h2 style={{ color: 'white', fontWeight: 900, fontSize: 22, marginBottom: 20, textAlign: 'center' }}>Cómo instalar</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {STEPS.map(s => (
            <div key={s.n} style={{
              display: 'flex', alignItems: 'flex-start', gap: 16,
              borderRadius: 16, padding: '16px 20px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg,#f97316,#c2410c)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 16, color: 'white',
                boxShadow: '0 4px 14px rgba(249,115,22,0.4)',
              }}>
                {s.n}
              </div>
              <div>
                <p style={{ color: 'white', fontWeight: 800, fontSize: 15, margin: '0 0 4px' }}>{s.title}</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0, lineHeight: 1.6 }}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* License key hint */}
        <div style={{ marginTop: 20, borderRadius: 16, padding: '16px 20px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)' }}>
          <p style={{ color: '#c4b5fd', fontWeight: 800, fontSize: 14, margin: '0 0 6px' }}>🔑 ¿Dónde encuentro mi clave de licencia?</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
            Ve a <strong style={{ color: '#c4b5fd' }}>Licencias SaaS → Panel de Licencias</strong>, haz clic en <strong style={{ color: '#c4b5fd' }}>Editar</strong> en tu cuenta y copia la clave que aparece ahí (formato: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>3E-XXXXXXXX-XXXXXX</code>).
          </p>
        </div>
      </div>
    </div>
  );
}
