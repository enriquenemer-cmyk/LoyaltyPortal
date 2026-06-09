export default function ApiDocsPage() {
  const endpoints = [
    {
      section: 'Premios',
      items: [
        { method: 'GET', path: '/api/prizes?id=:id', desc: 'Obtener premio por ID', response: '{ prize: Prize }' },
        { method: 'POST', path: '/api/prizes', desc: 'Crear nuevo premio', body: '{ name, reason, start_date, end_date, description, restaurant_id?, max_uses?, photo_url?, campaign_id? }', response: '{ prize: Prize, sig: string }' },
      ],
    },
    {
      section: 'Registros (Claims)',
      items: [
        { method: 'GET', path: '/api/claims', desc: 'Listar cobros', response: '{ claims: ClaimWithPrize[] }' },
        { method: 'GET', path: '/api/claims?status=pending', desc: 'Cobros pendientes', response: '{ claims: ClaimWithPrize[] }' },
        { method: 'POST', path: '/api/claims', desc: 'Registrar cobro de premio', body: '{ prize_id, full_name, phone, email, location? }', response: '{ claim: Claim, warning?: string }' },
      ],
    },
    {
      section: 'Restaurantes',
      items: [
        { method: 'GET', path: '/api/restaurants', desc: 'Listar restaurantes', response: '{ restaurants: Restaurant[] }' },
        { method: 'POST', path: '/api/restaurants', desc: 'Crear restaurante', body: '{ name, address, phone? }', response: '{ restaurant: Restaurant }' },
      ],
    },
    {
      section: 'Campañas',
      items: [
        { method: 'GET', path: '/api/campaigns', desc: 'Listar campañas', response: '{ campaigns: Campaign[] }' },
        { method: 'POST', path: '/api/campaigns', desc: 'Crear campaña', body: '{ name, description?, restaurant_id? }', response: '{ campaign: Campaign }' },
      ],
    },
    {
      section: 'Autenticación',
      items: [
        { method: 'POST', path: '/api/auth/login', desc: 'Iniciar sesión', body: '{ username, password, rememberMe? }', response: '{ ok: true, user: { username, role } }' },
        { method: 'POST', path: '/api/auth/logout', desc: 'Cerrar sesión', response: '{ ok: true }' },
        { method: 'GET', path: '/api/auth/me', desc: 'Usuario actual', response: '{ user: { username, role } | null }' },
      ],
    },
    {
      section: 'Exportación',
      items: [
        { method: 'GET', path: '/api/export', desc: 'Exportar todos los datos (JSON)', response: 'Archivo JSON descargable' },
      ],
    },
    {
      section: 'Webhooks',
      items: [
        { method: 'POST', path: '/api/webhooks', desc: 'Recibir eventos de webhook', body: '{ event: string, data: object }', response: '{ ok: true }' },
      ],
    },
  ];

  const webhookEvents = [
    { event: 'claim.registered', desc: 'Se dispara cuando un cliente registra un premio', data: '{ claim_id, prize_id, prize_name, full_name, phone, email, claimed_at }' },
    { event: 'claim.delivered', desc: 'Se dispara cuando un cajero entrega un premio', data: '{ claim_id, delivered_by, delivered_at }' },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF9] p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <p className="text-xs font-bold text-[#E8521A] uppercase tracking-widest mb-1">Desarrolladores</p>
          <h1 className="text-2xl font-bold text-[#1C1917]">Documentación de API</h1>
          <p className="text-sm text-[#78716c] mt-1">
            Base URL: <code className="bg-[#F5F5F4] px-2 py-0.5 rounded text-[#1C1917] font-mono text-xs">{typeof window !== 'undefined' ? window.location.origin : 'https://tu-dominio.vercel.app'}</code>
          </p>
        </div>

        <div className="space-y-8">
          {endpoints.map(section => (
            <div key={section.section}>
              <h2 className="text-base font-bold text-[#1C1917] mb-3">{section.section}</h2>
              <div className="flex flex-col gap-3">
                {section.items.map((ep, i) => (
                  <div key={i} className="bg-white border border-[#E8E3DC] rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(28,25,23,0.05)' }}>
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E8E3DC]">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${ep.method === 'GET' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                        {ep.method}
                      </span>
                      <code className="text-sm font-mono text-[#1C1917] font-semibold">{ep.path}</code>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      <p className="text-sm text-[#78716c]">{ep.desc}</p>
                      {(ep as { body?: string }).body && (
                        <div>
                          <p className="text-xs font-semibold text-[#a8a29e] uppercase tracking-widest mb-1">Body</p>
                          <pre className="bg-[#1C1917] text-green-300 text-xs rounded-lg px-4 py-3 overflow-x-auto font-mono">{(ep as { body?: string }).body}</pre>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-[#a8a29e] uppercase tracking-widest mb-1">Response</p>
                        <pre className="bg-[#1C1917] text-blue-300 text-xs rounded-lg px-4 py-3 overflow-x-auto font-mono">{ep.response}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Webhook events */}
          <div>
            <h2 className="text-base font-bold text-[#1C1917] mb-3">Eventos de Webhook</h2>
            <p className="text-sm text-[#78716c] mb-4">
              Configura <code className="bg-[#F5F5F4] px-1.5 py-0.5 rounded font-mono text-xs">WEBHOOK_URL</code> en tus variables de entorno para recibir eventos.
            </p>
            <div className="flex flex-col gap-3">
              {webhookEvents.map(ev => (
                <div key={ev.event} className="bg-white border border-[#E8E3DC] rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E8E3DC]">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">EVENT</span>
                    <code className="text-sm font-mono text-[#1C1917] font-semibold">{ev.event}</code>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-sm text-[#78716c]">{ev.desc}</p>
                    <pre className="bg-[#1C1917] text-yellow-300 text-xs rounded-lg px-4 py-3 overflow-x-auto font-mono">{ev.data}</pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
