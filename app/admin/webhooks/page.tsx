'use client';
import { Cog6ToothIcon, LinkIcon } from '@heroicons/react/24/outline';

import { useState, useEffect } from 'react';

const EVENTS = [
  { event: 'prize.generated', description: 'Se genera un nuevo premio QR' },
  { event: 'claim.registered', description: 'Un cliente registra un premio' },
  { event: 'claim.delivered', description: 'El cajero marca un premio como entregado' },
];

export default function WebhooksPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const webhookEndpoint = `${appUrl}/api/webhooks`;

  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [recentEvents, setRecentEvents] = useState<Array<{ id: string; action: string; description: string; created_at: string; user_name: string | null }>>([]);

  useEffect(() => {
    fetch('/api/webhooks')
      .then(r => r.json())
      .catch(() => {});

    // Load recent activity log entries related to webhook-triggering events
    fetch('/api/claims?status=pending')
      .then(r => r.json())
      .then(d => {
        if (d.claims) {
          const recent = d.claims.slice(0, 10).map((c: { id: string; full_name: string; claimed_at: string; prize_name?: string }) => ({
            id: c.id,
            action: 'claim.registered',
            description: `${c.full_name} registró un premio${c.prize_name ? `: ${c.prize_name}` : ''}`,
            created_at: c.claimed_at,
            user_name: c.full_name,
          }));
          setRecentEvents(recent);
        }
      })
      .catch(() => {});
  }, []);

  async function copyUrl() {
    await navigator.clipboard.writeText(webhookEndpoint).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function sendTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'claim.registered',
          data: {
            claim_id: 'test-' + Date.now(),
            prize_name: 'Burrito gratis (prueba)',
            full_name: 'Cliente de Prueba',
            phone: '5500000000',
            email: 'prueba@ejemplo.mx',
            claimed_at: new Date().toISOString(),
          },
        }),
      });
      const json = await res.json();
      if (json.sent) {
        setTestResult({ ok: true, message: `Enviado correctamente (HTTP ${json.status})` });
      } else {
        setTestResult({ ok: false, message: json.reason ?? 'No se pudo enviar' });
      }
    } catch {
      setTestResult({ ok: false, message: 'Error de conexión' });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF9' }}>
      {/* Hero */}
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <LinkIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Webhooks
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Integración con Zapier / Make / n8n</h1>
          <p className="text-orange-200/70 mt-1.5 text-sm">Conecta 3E con tus flujos de automatización</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Webhook URL */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6 mb-5" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <h2 className="text-sm font-bold text-stone-700 uppercase tracking-widest mb-3">URL del Webhook</h2>
          <p className="text-stone-500 text-sm mb-3">
            Configura esta URL como destino en Zapier, Make o n8n para recibir eventos en tiempo real.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 font-mono text-sm text-blue-900 break-all">
              {webhookEndpoint}
            </div>
            <button
              onClick={copyUrl}
              className="shrink-0 px-4 py-3 rounded-xl font-bold text-sm text-white transition-all"
              style={{ background: copied ? '#22c55e' : 'linear-gradient(135deg,#2563EB,#0891B2)' }}
            >
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Env var setup */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-5">
          <div className="flex gap-3">
            <span className="text-xl shrink-0"><Cog6ToothIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span>
            <div>
              <p className="font-bold text-blue-800 text-sm mb-1">Configura la variable de entorno</p>
              <p className="text-orange-700 text-sm mb-2">
                Para que 3E envíe eventos a tu plataforma, agrega esta variable en Vercel (Settings → Environment Variables):
              </p>
              <code className="block bg-orange-100 border border-blue-300 rounded-lg px-3 py-2 text-xs font-mono text-blue-900">
                WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/...
              </code>
              <p className="text-orange-600 text-xs mt-2">Reemplaza el valor con la URL que te da Zapier, Make o n8n al crear el trigger.</p>
            </div>
          </div>
        </div>

        {/* Available events */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6 mb-5" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <h2 className="text-sm font-bold text-stone-700 uppercase tracking-widest mb-4">Eventos disponibles</h2>
          <div className="space-y-3">
            {EVENTS.map(e => (
              <div key={e.event} className="flex items-center gap-3 p-3 rounded-xl bg-[#FAFAF9] border border-[#E8E3DC]">
                <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                <div>
                  <p className="font-bold text-[#1C1917] text-sm font-mono">{e.event}</p>
                  <p className="text-stone-500 text-xs">{e.description}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-stone-400 text-xs mt-4">
            Cada evento llega como <code className="bg-stone-100 px-1 rounded">POST</code> con el body:{' '}
            <code className="bg-stone-100 px-1 rounded">{'{ event, data, timestamp, source }'}</code>
          </p>
        </div>

        {/* Test button */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6 mb-5" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <h2 className="text-sm font-bold text-stone-700 uppercase tracking-widest mb-2">Prueba tu webhook</h2>
          <p className="text-stone-500 text-sm mb-4">
            Envía un payload de prueba (evento <code className="bg-stone-100 px-1 rounded text-xs">claim.registered</code>) al webhook configurado.
          </p>
          <button
            onClick={sendTest}
            disabled={testing}
            className="w-full font-bold py-3.5 rounded-xl text-white flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#2563EB,#0891B2)', boxShadow: '0 4px 16px rgba(37,99,235,0.30)' }}
          >
            {testing
              ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Enviando...</>
              : <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Enviar payload de prueba
              </>}
          </button>
          {testResult && (
            <div className={`mt-3 rounded-xl px-4 py-3 text-sm flex gap-2 items-center ${testResult.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
              <span>{testResult.ok ? '' : ''}</span>
              {testResult.message}
            </div>
          )}
        </div>

        {/* Recent webhook events */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <h2 className="text-sm font-bold text-stone-700 uppercase tracking-widest mb-4">Eventos recientes</h2>
          {recentEvents.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-4">Sin eventos recientes</p>
          ) : (
            <div className="space-y-2">
              {recentEvents.map(ev => (
                <div key={ev.id} className="flex items-start gap-3 p-3 rounded-xl bg-[#FAFAF9] border border-[#E8E3DC]">
                  <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#1C1917] text-sm font-semibold truncate">{ev.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-orange-600 text-xs font-mono">{ev.action}</span>
                      <span className="text-gray-300 text-xs">·</span>
                      <span className="text-stone-400 text-xs">
                        {new Date(ev.created_at).toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
