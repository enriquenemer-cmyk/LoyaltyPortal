'use client';
import { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

type Status = {
  whatsapp: { access_token: boolean; phone_number_id: boolean; verify_token: boolean };
  google: { place_id: boolean };
  stripe: { secret_key: boolean; webhook_secret: boolean; vip_price_id: boolean };
  email: { resend_api_key: boolean; admin_email: boolean; resend_from: boolean };
  push: { vapid_public: boolean; vapid_private: boolean };
  app: { app_url: boolean; cron_secret: boolean; db_url: boolean };
};

type Integration = {
  key: string;
  name: string;
  description: string;
  emoji: string;
  vars: { key: string; label: string; how: string; configured: boolean }[];
  docsUrl?: string;
};

function StatusDot({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0" />
    : <XCircleIcon className="w-4 h-4 text-red-400 shrink-0" />;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export default function ConfiguracionPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/config-status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function copy(text: string, key: string) {
    copyToClipboard(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const integrations: Integration[] = status ? [
    {
      key: 'email',
      name: 'Email (Resend)',
      description: 'Reportes diarios, semanales, encuestas, cumpleaños y alertas al dueño.',
      emoji: '📧',
      docsUrl: 'https://resend.com/api-keys',
      vars: [
        {
          key: 'RESEND_API_KEY',
          label: 'API Key de Resend',
          how: '1. Entra a resend.com → API Keys → Create API Key',
          configured: status.email.resend_api_key,
        },
        {
          key: 'ADMIN_EMAIL',
          label: 'Email del dueño (recibe alertas)',
          how: 'El email donde quieres recibir reportes y alertas. Ej: tu@email.com',
          configured: status.email.admin_email,
        },
        {
          key: 'RESEND_FROM',
          label: 'Email de envío (opcional)',
          how: 'Ej: 3E <no-reply@tudominio.com> — requiere dominio verificado en Resend',
          configured: status.email.resend_from,
        },
      ],
    },
    {
      key: 'whatsapp',
      name: 'WhatsApp Business',
      description: 'Mensajes de cumpleaños, encuestas post-visita y alertas a clientes por WhatsApp.',
      emoji: '💬',
      docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
      vars: [
        {
          key: 'WHATSAPP_ACCESS_TOKEN',
          label: 'Access Token (permanente)',
          how: '1. Meta Business → WhatsApp → API Setup → Generate permanent token',
          configured: status.whatsapp.access_token,
        },
        {
          key: 'WHATSAPP_PHONE_NUMBER_ID',
          label: 'Phone Number ID',
          how: 'Meta Business → WhatsApp → API Setup → Phone Number ID (número largo)',
          configured: status.whatsapp.phone_number_id,
        },
        {
          key: 'WHATSAPP_VERIFY_TOKEN',
          label: 'Verify Token (webhook)',
          how: 'Una palabra secreta que tú inventas, ej: "premia-tierra-2025". Se usa al configurar el webhook en Meta.',
          configured: status.whatsapp.verify_token,
        },
      ],
    },
    {
      key: 'google',
      name: 'Google Reviews',
      description: 'Clientes con 5 estrellas en la encuesta ven un botón directo a dejar reseña en Google.',
      emoji: '⭐',
      docsUrl: 'https://support.google.com/business/answer/7035772',
      vars: [
        {
          key: 'NEXT_PUBLIC_GOOGLE_PLACE_ID',
          label: 'Google Place ID',
          how: '1. Busca tu negocio en maps.google.com\n2. Clic en "Compartir" → copia la URL\n3. O en Google Business → Info → ver el Place ID en la URL (empieza con ChIJ...)',
          configured: status.google.place_id,
        },
      ],
    },
    {
      key: 'stripe',
      name: 'Stripe (Membresías VIP)',
      description: 'Cobro de membresías de pago a clientes. Ya integrado — solo faltan las claves.',
      emoji: '💳',
      docsUrl: 'https://dashboard.stripe.com/apikeys',
      vars: [
        {
          key: 'STRIPE_SECRET_KEY',
          label: 'Secret Key',
          how: 'Stripe Dashboard → Developers → API Keys → Secret key (sk_live_...)',
          configured: status.stripe.secret_key,
        },
        {
          key: 'STRIPE_WEBHOOK_SECRET',
          label: 'Webhook Secret',
          how: 'Stripe → Developers → Webhooks → Add endpoint: tudominio.com/api/stripe/webhook → copia el "Signing secret"',
          configured: status.stripe.webhook_secret,
        },
        {
          key: 'STRIPE_VIP_PRICE_ID',
          label: 'Price ID del plan VIP',
          how: 'Stripe → Products → Crea un producto "VIP" con precio mensual → copia el Price ID (price_...)',
          configured: status.stripe.vip_price_id,
        },
      ],
    },
    {
      key: 'push',
      name: 'Notificaciones Push (Web)',
      description: 'Notificaciones push al navegador del cliente cuando hay actividad.',
      emoji: '🔔',
      docsUrl: 'https://www.npmjs.com/package/web-push',
      vars: [
        {
          key: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
          label: 'VAPID Public Key',
          how: 'En terminal: npx web-push generate-vapid-keys — copia la Public Key',
          configured: status.push.vapid_public,
        },
        {
          key: 'VAPID_PRIVATE_KEY',
          label: 'VAPID Private Key',
          how: 'De los mismos generate-vapid-keys — copia la Private Key (nunca la compartas)',
          configured: status.push.vapid_private,
        },
      ],
    },
    {
      key: 'app',
      name: 'Variables de la App',
      description: 'Configuración base que necesita la plataforma para funcionar correctamente.',
      emoji: '⚙️',
      vars: [
        {
          key: 'NEXT_PUBLIC_APP_URL',
          label: 'URL de la app',
          how: 'La URL de tu deploy en Vercel, ej: https://3e-enm.vercel.app o tu dominio propio',
          configured: status.app.app_url,
        },
        {
          key: 'CRON_SECRET',
          label: 'Cron Secret',
          how: 'Una clave secreta aleatoria para proteger los crons. Ej: genera una en random.org',
          configured: status.app.cron_secret,
        },
        {
          key: 'DATABASE_URL',
          label: 'URL de la base de datos',
          how: 'Vercel Postgres → Storage → tu base → .env.local → copia DATABASE_URL',
          configured: status.app.db_url,
        },
      ],
    },
  ] : [];

  const totalVars = integrations.reduce((a, i) => a + i.vars.length, 0);
  const configuredVars = integrations.reduce((a, i) => a + i.vars.filter(v => v.configured).length, 0);
  const pct = totalVars > 0 ? Math.round((configuredVars / totalVars) * 100) : 0;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span /><span /><span /></div>
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
            ⚙️ Plataforma
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Configuración de Integraciones</h1>
          <p className="text-white/70 text-sm mt-1">Activa cada servicio agregando sus variables en Vercel → Settings → Environment Variables</p>

          {!loading && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 max-w-xs h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${pct}%`, background: pct === 100 ? '#4ade80' : '#F97316' }}
                />
              </div>
              <span className="text-white font-bold text-sm">{configuredVars}/{totalVars} configuradas</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-10 py-6 space-y-4">
        {/* Instructions banner */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
          <p className="text-sm font-bold text-blue-800 mb-1">¿Cómo agregar una variable?</p>
          <p className="text-xs text-blue-700">
            Entra a <strong>vercel.com</strong> → tu proyecto → <strong>Settings</strong> → <strong>Environment Variables</strong> → agrega el nombre y valor → <strong>Save</strong> → luego haz un nuevo deploy (o redeploy) para que tome efecto.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-2xl bg-white border border-[#E8E3DC] animate-pulse" />)}
          </div>
        ) : (
          integrations.map(integration => {
            const allConfigured = integration.vars.every(v => v.configured);
            const someConfigured = integration.vars.some(v => v.configured);
            const statusColor = allConfigured ? '#16a34a' : someConfigured ? '#d97706' : '#9ca3af';
            const statusLabel = allConfigured ? 'Activo' : someConfigured ? 'Parcial' : 'Pendiente';
            const statusBg = allConfigured ? '#f0fdf4' : someConfigured ? '#fffbeb' : '#f9fafb';

            return (
              <div key={integration.key} className="rounded-2xl bg-white border border-[#E8E3DC] shadow-sm overflow-hidden">
                {/* Integration header */}
                <div className="px-5 py-4 border-b border-[#E8E3DC] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{integration.emoji}</span>
                    <div>
                      <div className="font-bold text-[#1C1917] text-sm">{integration.name}</div>
                      <div className="text-xs text-stone-400 mt-0.5">{integration.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: statusBg, color: statusColor, border: `1px solid ${statusColor}40` }}
                    >
                      {statusLabel}
                    </span>
                    {integration.docsUrl && (
                      <a
                        href={integration.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-blue-500 font-semibold hover:underline hidden sm:block"
                      >
                        Docs →
                      </a>
                    )}
                  </div>
                </div>

                {/* Variables */}
                <div className="divide-y divide-[#F5F3F0]">
                  {integration.vars.map(v => (
                    <div key={v.key} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <StatusDot ok={v.configured} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <code
                                className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                                style={{ background: '#f4f4f5', color: '#18181b' }}
                              >
                                {v.key}
                              </code>
                              {v.configured
                                ? <span className="text-[10px] text-green-600 font-semibold">✓ Configurada</span>
                                : <span className="text-[10px] text-red-400 font-semibold">Sin configurar</span>
                              }
                            </div>
                            <div className="text-xs text-stone-500 mt-1.5 font-medium">{v.label}</div>
                            {!v.configured && (
                              <div className="mt-2 text-[11px] text-stone-400 leading-relaxed whitespace-pre-line">
                                {v.how}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => copy(v.key, v.key)}
                          title="Copiar nombre de variable"
                          className="shrink-0 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                        >
                          {copied === v.key
                            ? <CheckCircleIcon className="w-4 h-4 text-green-500" />
                            : <ClipboardDocumentIcon className="w-4 h-4 text-stone-400" />
                          }
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}

        {/* Footer note */}
        <div className="rounded-xl border border-[#E8E3DC] bg-[#FAFAF9] px-5 py-4 text-center">
          <p className="text-xs text-stone-400">
            Los cambios en variables de entorno requieren un nuevo deploy para tomar efecto.<br />
            En Vercel: <strong>Deployments → ···  → Redeploy</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
