import { Resend } from 'resend';

let resend: Resend | null = null;
function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendExpirationReminder(opts: {
  to: string;
  prizeName: string;
  description: string;
  endDate: string;
  location: string;
  claimId: string;
}) {
  try {
    const client = getResend();
    if (!client) return;
    const claimUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://premia-tierra.vercel.app'}/cajero/${opts.claimId}`;
    await client.emails.send({
      from: 'Premia Tierra <noreply@premia-tierra.vercel.app>',
      to: opts.to,
      subject: `Tu premio está por vencer — ${opts.prizeName}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:32px 16px;">
          <div style="background:linear-gradient(135deg,#059669,#0d9488);border-radius:16px;padding:32px 24px;text-align:center;margin-bottom:24px;">
            <h1 style="color:white;font-size:28px;font-weight:900;margin:0 0 8px;">¡Tu premio está por vencer!</h1>
            <p style="color:rgba(255,255,255,0.8);margin:0;font-size:16px;">${opts.prizeName}</p>
          </div>
          <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px;border:1px solid #e2e8f0;">
            <p style="color:#64748b;font-size:14px;margin:0 0 16px;">Tienes un premio pendiente por cobrar. No dejes que expire.</p>
            <div style="background:#f0fdf4;border-radius:12px;padding:16px;margin-bottom:16px;">
              <p style="color:#166534;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px;">Premio</p>
              <p style="color:#15803d;font-size:18px;font-weight:800;margin:0;">${opts.prizeName}</p>
            </div>
            <p style="color:#475569;font-size:14px;margin:0 0 8px;">${opts.description}</p>
            <p style="color:#ef4444;font-size:14px;font-weight:700;margin:0 0 16px;">Válido hasta: ${opts.endDate}</p>
            <p style="color:#64748b;font-size:13px;margin:0 0 20px;">Sucursal: ${opts.location}</p>
            <a href="${claimUrl}" style="display:inline-block;background:linear-gradient(135deg,#059669,#0d9488);color:white;font-weight:700;font-size:16px;padding:14px 32px;border-radius:12px;text-decoration:none;">
              Ver mi código de cobro
            </a>
          </div>
          <p style="text-align:center;color:#94a3b8;font-size:12px;margin:0;">Premia Tierra · Plataforma de Premios</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Error sending email:', err);
  }
}
