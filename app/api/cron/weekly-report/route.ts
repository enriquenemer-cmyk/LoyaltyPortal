import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { Resend } from 'resend';

function auth(req: NextRequest) {
  const bearer = req.headers.get('authorization');
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  return (
    !process.env.CRON_SECRET ||
    bearer === `Bearer ${process.env.CRON_SECRET}` ||
    secret === process.env.CRON_SECRET
  );
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const pool = getPool();
  const now = new Date();

  // Week window: last 7 days
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const weekStartStr = weekStart.toISOString();

  // Previous week for comparison
  const prevStart = new Date(now);
  prevStart.setDate(now.getDate() - 14);
  const prevStartStr = prevStart.toISOString();

  const [
    newCustomersRes,
    prevCustomersRes,
    claimsRes,
    prevClaimsRes,
    topPrizesRes,
    totalPointsRes,
    birthdaysRes,
    topEmployeesRes,
    inventoryAlertRes,
  ] = await Promise.all([
    pool.query<{ count: string }>(
      `SELECT COUNT(DISTINCT phone)::text AS count FROM claims WHERE claimed_at >= $1`,
      [weekStartStr]
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(DISTINCT phone)::text AS count FROM claims WHERE claimed_at >= $1 AND claimed_at < $2`,
      [prevStartStr, weekStartStr]
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM claims WHERE claimed_at >= $1`,
      [weekStartStr]
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM claims WHERE claimed_at >= $1 AND claimed_at < $2`,
      [prevStartStr, weekStartStr]
    ),
    pool.query<{ prize_name: string; count: string }>(
      `SELECT p.name AS prize_name, COUNT(c.id)::text AS count
       FROM claims c JOIN prizes p ON c.prize_id = p.id
       WHERE c.claimed_at >= $1
       GROUP BY p.name ORDER BY count DESC LIMIT 5`,
      [weekStartStr]
    ),
    pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(total_points), 0)::text AS total FROM customer_points`
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM customer_points
       WHERE birthday IS NOT NULL
         AND EXTRACT(MONTH FROM birthday) = EXTRACT(MONTH FROM NOW())
         AND EXTRACT(DAY FROM birthday) BETWEEN EXTRACT(DAY FROM NOW())
           AND EXTRACT(DAY FROM NOW() + INTERVAL '7 days')`
    ),
    pool.query<{ full_name: string; position: string | null; hours: string }>(
      `SELECT e.full_name, e.position,
              ROUND(COALESCE(SUM(tc.duration_seconds), 0) / 3600.0, 1)::text AS hours
       FROM employees e
       LEFT JOIN time_clock_entries tc ON tc.employee_id = e.id
         AND tc.clock_in >= $1
       GROUP BY e.id, e.full_name, e.position
       ORDER BY hours DESC LIMIT 5`,
      [weekStartStr]
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM inventory_units
       WHERE status = 'active' AND quantity IS NOT NULL AND quantity < 5`
    ).catch(() => ({ rows: [{ count: '0' }] })),
  ]);

  const newCustomers = parseInt(newCustomersRes.rows[0]?.count ?? '0', 10);
  const prevCustomers = parseInt(prevCustomersRes.rows[0]?.count ?? '0', 10);
  const claims = parseInt(claimsRes.rows[0]?.count ?? '0', 10);
  const prevClaims = parseInt(prevClaimsRes.rows[0]?.count ?? '0', 10);
  const totalPoints = parseInt(totalPointsRes.rows[0]?.total ?? '0', 10);
  const upcomingBirthdays = parseInt(birthdaysRes.rows[0]?.count ?? '0', 10);
  const inventoryAlerts = parseInt(inventoryAlertRes.rows[0]?.count ?? '0', 10);

  const customerDelta = prevCustomers > 0 ? Math.round(((newCustomers - prevCustomers) / prevCustomers) * 100) : 0;
  const claimsDelta = prevClaims > 0 ? Math.round(((claims - prevClaims) / prevClaims) * 100) : 0;

  const stats = {
    newCustomers, prevCustomers, customerDelta,
    claims, prevClaims, claimsDelta,
    totalPoints, upcomingBirthdays, inventoryAlerts,
    topPrizes: topPrizesRes.rows,
    topEmployees: topEmployeesRes.rows,
  };

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || !process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: true, dry_run: true, stats });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const weekLabel = weekStart.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
  const todayLabel = now.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });

  function deltaTag(d: number) {
    if (d > 0) return `<span style="color:#16a34a;font-size:11px;font-weight:700">▲ ${d}%</span>`;
    if (d < 0) return `<span style="color:#dc2626;font-size:11px;font-weight:700">▼ ${Math.abs(d)}%</span>`;
    return `<span style="color:#9ca3af;font-size:11px">= sin cambio</span>`;
  }

  const topPrizesHtml = stats.topPrizes.length > 0
    ? stats.topPrizes.map((p, i) => `
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#374151">${i + 1}. ${p.prize_name}</td>
          <td style="padding:8px 0;font-size:13px;font-weight:700;color:#1a6b3c;text-align:right">${p.count} canjes</td>
        </tr>`).join('')
    : '<tr><td colspan="2" style="padding:8px 0;color:#9ca3af;font-size:13px">Sin canjes esta semana</td></tr>';

  const topEmployeesHtml = stats.topEmployees.filter(e => parseFloat(e.hours) > 0).length > 0
    ? stats.topEmployees.filter(e => parseFloat(e.hours) > 0).map((e, i) => `
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#374151">${i + 1}. ${e.full_name}${e.position ? ` <span style="color:#9ca3af">(${e.position})</span>` : ''}</td>
          <td style="padding:8px 0;font-size:13px;font-weight:700;color:#1a6b3c;text-align:right">${e.hours}h</td>
        </tr>`).join('')
    : '<tr><td colspan="2" style="padding:8px 0;color:#9ca3af;font-size:13px">Sin fichajes esta semana</td></tr>';

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://supertierra.mx';

  await resend.emails.send({
    from: process.env.RESEND_FROM ?? '3E <no-reply@supertierra.mx>',
    to: adminEmail,
    subject: `Resumen semanal 3E — ${weekLabel} al ${todayLabel}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 24px; color: #111827; }
  .wrap { max-width: 600px; margin: 0 auto; }
  .header { background: linear-gradient(135deg, #0d3d22 0%, #1a6b3c 100%); border-radius: 16px; padding: 28px 32px; margin-bottom: 20px; }
  .card { background: white; border-radius: 12px; padding: 20px 24px; margin-bottom: 16px; border: 1px solid #e5e7eb; }
  .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .kpi { background: #f9fafb; border-radius: 10px; padding: 16px; border: 1px solid #e5e7eb; }
  .kpi-value { font-size: 32px; font-weight: 900; color: #111827; line-height: 1; }
  .kpi-label { font-size: 12px; color: #6b7280; margin-top: 4px; font-weight: 600; }
  .section-title { font-size: 11px; font-weight: 800; color: #6b7280; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; }
  .alert { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; }
  .footer { font-size: 11px; color: #9ca3af; text-align: center; margin-top: 24px; }
</style></head>
<body>
<div class="wrap">

  <div class="header">
    <div style="font-size:11px;color:rgba(255,255,255,0.6);font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Resumen semanal</div>
    <div style="font-size:22px;font-weight:900;color:#fff">${weekLabel} — ${todayLabel}</div>
    <div style="margin-top:12px;font-size:13px;color:rgba(255,255,255,0.7)">Plataforma 3E by ENM</div>
  </div>

  ${inventoryAlerts > 0 ? `
  <div class="alert">
    <div style="font-size:13px;font-weight:700;color:#dc2626">⚠️ ${inventoryAlerts} producto${inventoryAlerts !== 1 ? 's' : ''} con stock bajo</div>
    <div style="font-size:12px;color:#6b7280;margin-top:4px">Revisa el inventario para evitar quiebres.</div>
  </div>` : ''}

  <div class="card">
    <div class="section-title">Clientes y canjes</div>
    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-value">${newCustomers}</div>
        <div class="kpi-label">Clientes activos esta semana</div>
        <div style="margin-top:6px">${deltaTag(customerDelta)} vs semana anterior</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">${claims}</div>
        <div class="kpi-label">Canjes realizados</div>
        <div style="margin-top:6px">${deltaTag(claimsDelta)} vs semana anterior</div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="section-title">Top premios canjeados</div>
    <table>${topPrizesHtml}</table>
  </div>

  <div class="card">
    <div class="section-title">Empleados — horas trabajadas</div>
    <table>${topEmployeesHtml}</table>
  </div>

  <div class="card">
    <div class="section-title">Estado del programa</div>
    <div style="display:flex;gap:24px;flex-wrap:wrap">
      <div>
        <div style="font-size:24px;font-weight:900;color:#111827">${totalPoints.toLocaleString('es-MX')}</div>
        <div style="font-size:12px;color:#6b7280;font-weight:600">Puntos en circulación</div>
      </div>
      <div>
        <div style="font-size:24px;font-weight:900;color:${upcomingBirthdays > 0 ? '#F97316' : '#111827'}">${upcomingBirthdays}</div>
        <div style="font-size:12px;color:#6b7280;font-weight:600">Cumpleaños próximos (7 días)</div>
      </div>
    </div>
  </div>

  <div style="text-align:center;margin:24px 0">
    <a href="${appUrl}/admin" style="background:#1a6b3c;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700;display:inline-block">
      Ver panel completo →
    </a>
  </div>

  <div class="footer">3E · Reporte automático semanal · <a href="${appUrl}/admin" style="color:#9ca3af">Desactivar</a></div>
</div>
</body>
</html>`,
  });

  return NextResponse.json({ ok: true, stats });
}
