/**
 * Real-time admin alert emails.
 * Sends instant email to ADMIN_EMAIL for high-priority events.
 * All functions are fire-and-forget (catch errors silently).
 */
import { Resend } from 'resend';

function resend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

const from = () => process.env.RESEND_FROM ?? '3E <no-reply@supertierra.mx>';
const adminEmail = () => process.env.ADMIN_EMAIL;
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? 'https://supertierra.mx';

function baseHtml(emoji: string, title: string, body: string, ctaLabel?: string, ctaUrl?: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f9fafb;padding:20px;color:#111827">
<div style="max-width:480px;margin:0 auto">
  <div style="background:#111;border-radius:14px;padding:20px 24px;margin-bottom:16px;display:flex;align-items:center;gap:14px">
    <span style="font-size:28px">${emoji}</span>
    <div>
      <div style="font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Alerta 3E</div>
      <div style="font-size:16px;font-weight:900;color:#fff;margin-top:2px">${title}</div>
    </div>
  </div>
  <div style="background:white;border-radius:12px;padding:20px 24px;border:1px solid #e5e7eb;margin-bottom:16px">
    ${body}
  </div>
  ${ctaLabel && ctaUrl ? `
  <div style="text-align:center">
    <a href="${ctaUrl}" style="background:#1a6b3c;color:white;padding:11px 24px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:700;display:inline-block">${ctaLabel} →</a>
  </div>` : ''}
  <div style="font-size:10px;color:#9ca3af;text-align:center;margin-top:16px">3E by ENM · Alerta automática · <a href="${appUrl()}/admin" style="color:#9ca3af">Ir al panel</a></div>
</div>
</body></html>`;
}

/** Called when a VIP (gold) customer makes a claim */
export async function alertVipClaim(opts: {
  customerName: string;
  phone: string;
  prizeName: string;
}) {
  const email = adminEmail();
  const r = resend();
  if (!email || !r) return;

  r.emails.send({
    from: from(),
    to: email,
    subject: `⭐ Cliente VIP: ${opts.customerName} canjeó un premio`,
    html: baseHtml(
      '⭐',
      `Cliente VIP — ${opts.customerName}`,
      `<p style="font-size:14px;color:#374151;margin:0 0 12px">Un cliente <strong>nivel Oro</strong> acaba de registrar un canje:</p>
       <div style="background:#fffbeb;border-radius:8px;padding:12px 16px;border:1px solid #fde68a">
         <div style="font-size:13px;font-weight:700;color:#92400e">${opts.prizeName}</div>
         <div style="font-size:12px;color:#9ca3af;margin-top:4px">${opts.phone}</div>
       </div>`,
      'Ver en registros',
      `${appUrl()}/admin/registros`
    ),
  }).catch(() => {});
}

/** Called when inventory of a prize/item reaches zero */
export async function alertStockCero(opts: {
  itemName: string;
  location?: string | null;
}) {
  const email = adminEmail();
  const r = resend();
  if (!email || !r) return;

  r.emails.send({
    from: from(),
    to: email,
    subject: `🚨 Stock agotado: ${opts.itemName}`,
    html: baseHtml(
      '🚨',
      'Stock agotado',
      `<p style="font-size:14px;color:#dc2626;font-weight:700;margin:0 0 8px">${opts.itemName}</p>
       <p style="font-size:13px;color:#6b7280;margin:0">El inventario llegó a cero. Revisa el panel de inventario para reponer.</p>
       ${opts.location ? `<p style="font-size:12px;color:#9ca3af;margin-top:8px">Ubicación: ${opts.location}</p>` : ''}`,
      'Ver inventario',
      `${appUrl()}/admin/inventario`
    ),
  }).catch(() => {});
}

/** Called when an employee has been clocked in for more than X hours */
export async function alertLongShift(opts: {
  employeeName: string;
  hours: number;
}) {
  const email = adminEmail();
  const r = resend();
  if (!email || !r) return;

  r.emails.send({
    from: from(),
    to: email,
    subject: `🕐 ${opts.employeeName} lleva ${opts.hours}h fichado`,
    html: baseHtml(
      '🕐',
      'Turno inusualmente largo',
      `<p style="font-size:14px;color:#374151;margin:0 0 8px"><strong>${opts.employeeName}</strong> lleva <strong>${opts.hours} horas</strong> fichado sin registrar salida.</p>
       <p style="font-size:13px;color:#6b7280;margin:0">Verifica si olvidó marcar la salida o si sigue en turno.</p>`,
      'Ver fichajes',
      `${appUrl()}/admin/fichajes`
    ),
  }).catch(() => {});
}

/** Called when fraud is detected on a customer */
export async function alertFraud(opts: {
  customerName: string;
  phone: string;
  reason: string;
}) {
  const email = adminEmail();
  const r = resend();
  if (!email || !r) return;

  r.emails.send({
    from: from(),
    to: email,
    subject: `⚠️ Actividad sospechosa: ${opts.customerName}`,
    html: baseHtml(
      '⚠️',
      'Alerta de fraude',
      `<p style="font-size:14px;color:#374151;margin:0 0 12px">Se detectó actividad sospechosa en la cuenta:</p>
       <div style="background:#fef2f2;border-radius:8px;padding:12px 16px;border:1px solid #fecaca">
         <div style="font-size:13px;font-weight:700;color:#dc2626">${opts.customerName}</div>
         <div style="font-size:12px;color:#9ca3af">${opts.phone}</div>
         <div style="font-size:12px;color:#374151;margin-top:8px">${opts.reason}</div>
       </div>`,
      'Ver reporte de fraude',
      `${appUrl()}/admin/fraude`
    ),
  }).catch(() => {});
}
