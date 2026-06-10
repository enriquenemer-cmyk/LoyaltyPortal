// Email utility — uses Resend if RESEND_API_KEY is set, else logs to console.

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'Premia <noreply@burritobar.mx>';

  if (!apiKey) {
    console.log('[email] No RESEND_API_KEY — skipping send to:', opts.to, '|', opts.subject);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[email] Resend error:', err);
  }
}

export async function sendClaimLink(opts: {
  to: string;
  full_name: string;
  prize_name: string;
  claim_url: string;
}): Promise<void> {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#2563EB,#0891B2);padding:28px 32px;">
      <p style="margin:0;color:#fff;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.8;">Burrito Bar</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:900;">Tu código de cobro</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#334155;font-size:15px;margin-bottom:8px;">Hola <strong>${opts.full_name}</strong>,</p>
      <p style="color:#64748b;font-size:14px;line-height:1.6;margin-bottom:24px;">
        Aquí tienes el enlace para cobrar tu premio <strong style="color:#2563EB;">${opts.prize_name}</strong> en cualquiera de nuestras sucursales.
      </p>
      <a href="${opts.claim_url}"
         style="display:block;background:linear-gradient(135deg,#2563EB,#0891B2);color:#fff;text-decoration:none;font-size:15px;font-weight:800;padding:14px 24px;border-radius:14px;text-align:center;">
        Cobrar mi premio →
      </a>
      <p style="color:#94a3b8;font-size:11px;margin-top:20px;text-align:center;word-break:break-all;">${opts.claim_url}</p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
      <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">© ${new Date().getFullYear()} Burrito Bar · Premia</p>
    </div>
  </div>
</body>
</html>`;

  await sendEmail({
    to: opts.to,
    subject: `Tu código de cobro: ${opts.prize_name}`,
    html,
  });
}

export async function sendExpirationReminder(opts: {
  to: string;
  full_name: string;
  prize_name: string;
  end_date: string;
  claim_url: string;
}): Promise<void> {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#2563EB,#0891B2);padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:900;">¡Tu premio vence pronto!</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#334155;font-size:15px;">Hola <strong>${opts.full_name}</strong>,</p>
      <p style="color:#64748b;font-size:14px;line-height:1.6;">
        Tu premio <strong>${opts.prize_name}</strong> vence el <strong>${opts.end_date}</strong>. ¡No olvides cobrarlo!
      </p>
      <a href="${opts.claim_url}"
         style="display:block;background:linear-gradient(135deg,#2563EB,#0891B2);color:#fff;text-decoration:none;font-size:15px;font-weight:800;padding:14px 24px;border-radius:14px;text-align:center;margin-top:20px;">
        Cobrar mi premio →
      </a>
    </div>
  </div>
</body>
</html>`;

  await sendEmail({
    to: opts.to,
    subject: `Recordatorio: tu premio "${opts.prize_name}" vence pronto`,
    html,
  });
}
