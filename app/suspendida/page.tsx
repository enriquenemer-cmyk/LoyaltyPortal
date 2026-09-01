export default function SuspendidaPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#FAFAF9', fontFamily: 'sans-serif', padding: 24,
    }}>
      <div style={{
        maxWidth: 440, width: '100%', background: '#fff',
        border: '2px solid #111', borderRadius: 16, boxShadow: '6px 6px 0 #111',
        padding: 40, textAlign: 'center',
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: '#111' }}>
          Cuenta suspendida
        </h1>
        <p style={{ color: '#666', fontSize: 15, marginBottom: 24, lineHeight: 1.6 }}>
          Tu acceso a la plataforma 3E ha sido suspendido, generalmente por falta de pago de la suscripción mensual.
        </p>
        <div style={{
          background: '#fff7ed', border: '2px solid #F97316', borderRadius: 12,
          padding: '16px 20px', marginBottom: 28,
        }}>
          <p style={{ margin: 0, fontWeight: 700, color: '#c2410c', fontSize: 14 }}>
            Para reactivar tu cuenta contacta a 3E:
          </p>
          <p style={{ margin: '8px 0 0', color: '#c2410c', fontSize: 14 }}>
            📧 enriquenemer@gmail.com
          </p>
        </div>
        <a href="/admin/login" style={{
          display: 'inline-block', padding: '12px 28px',
          background: '#111', color: '#fff', borderRadius: 10,
          border: '2px solid #111', fontWeight: 700, fontSize: 14,
          textDecoration: 'none', boxShadow: '3px 3px 0 #F97316',
        }}>
          ← Volver al login
        </a>
      </div>
    </div>
  );
}
