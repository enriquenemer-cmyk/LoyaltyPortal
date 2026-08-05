import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { Resend } from 'resend';

export async function GET(req: NextRequest) {
  const bearer = req.headers.get('authorization');
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  const authorized =
    !process.env.CRON_SECRET ||
    bearer === `Bearer ${process.env.CRON_SECRET}` ||
    secret === process.env.CRON_SECRET;
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pool = getPool();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split('T')[0];

  const [cobrosRes, clientesRes, vencenRes, pointsRes] = await Promise.all([
    pool.query<{ count: string; total: string }>(`
      SELECT COUNT(*)::text AS count, COALESCE(SUM(amount), 0)::text AS total
      FROM ticket_claims WHERE DATE(claimed_at) = $1
    `, [yStr]),
    pool.query<{ count: string }>(`
      SELECT COUNT(DISTINCT phone)::text AS count
      FROM (
        SELECT phone, claimed_at FROM claims
        UNION ALL SELECT phone, claimed_at FROM ticket_claims
      ) a
      WHERE DATE(claimed_at) = $1
    `, [yStr]),
    pool.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count FROM prizes
      WHERE end_date = TO_CHAR(NOW() + INTERVAL '3 days', 'YYYY-MM-DD')
        AND cancelled = false
    `, []),
    pool.query<{ total: string }>(`
      SELECT COALESCE(SUM(total_points), 0)::text AS total FROM customer_points
    `, []),
  ]);

  const cobros = parseInt(cobrosRes.rows[0]?.count ?? '0', 10);
  const totalVentas = parseFloat(cobrosRes.rows[0]?.total ?? '0');
  const nuevosClientes = parseInt(clientesRes.rows[0]?.count ?? '0', 10);
  const premiosVencen = parseInt(vencenRes.rows[0]?.count ?? '0', 10);
  const totalPuntos = parseInt(pointsRes.rows[0]?.total ?? '0', 10);

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || !process.env.RESEND_API_KEY) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      stats: { cobros, totalVentas, nuevosClientes, premiosVencen, totalPuntos },
    });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const dateStr = yesterday.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  await resend.emails.send({
    from: process.env.RESEND_FROM ?? '3E <no-reply@supertierra.mx>',
    to: adminEmail,
    subject: `Reporte diario 3E — ${dateStr}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, sans-serif; background: #FAFAF9; margin: 0; padding: 24px; color: #1C1917; }
  .card { background: white; border-radius: 16px; padding: 24px; margin-bottom: 16px; border: 1px solid #E8E3DC; }
  .kpi { display: inline-block; min-width: 140px; margin: 8px 16px 8px 0; }
  .kpi-value { font-size: 28px; font-weight: 800; color: #2563EB; }
  .kpi-label { font-size: 12px; color: #78716c; margin-top: 2px; }
  .warn { color: #dc2626; }
  h1 { font-size: 20px; font-weight: 800; margin: 0 0 4px; }
  p { font-size: 13px; color: #78716c; margin: 0 0 16px; }
  .footer { font-size: 11px; color: #a8a29e; text-align: center; margin-top: 24px; }
</style></head>
<body>
  <div style="max-width:560px;margin:0 auto">
    <h1>Reporte diario</h1>
    <p>${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}</p>

    <div class="card">
      <div style="font-size:11px;font-weight:700;color:#78716c;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px">Actividad de ayer</div>
      <div class="kpi">
        <div class="kpi-value">${cobros}</div>
        <div class="kpi-label">Cobros registrados</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">$${totalVentas.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div class="kpi-label">Ventas totales</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">${nuevosClientes}</div>
        <div class="kpi-label">Clientes activos</div>
      </div>
    </div>

    <div class="card">
      <div style="font-size:11px;font-weight:700;color:#78716c;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px">Estado del programa</div>
      <div class="kpi">
        <div class="kpi-value">${totalPuntos.toLocaleString()}</div>
        <div class="kpi-label">Puntos activos en circulación</div>
      </div>
      <div class="kpi">
        <div class="kpi-value ${premiosVencen > 0 ? 'warn' : ''}">${premiosVencen}</div>
        <div class="kpi-label">Premios que vencen en 3 días</div>
      </div>
    </div>

    <div style="text-align:center;margin-top:20px">
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://supertierra.mx'}/admin"
         style="background:#2563EB;color:white;padding:10px 24px;border-radius:10px;text-decoration:none;font-size:13px;font-weight:700">
        Ver panel completo →
      </a>
    </div>

    <div class="footer">3E · Reporte automático diario</div>
  </div>
</body>
</html>`,
  });

  return NextResponse.json({ ok: true, stats: { cobros, totalVentas, nuevosClientes, premiosVencen } });
}
