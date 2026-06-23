import { NextRequest, NextResponse } from 'next/server';
import { getPool, getAllPrizeRules, insertPrize, insertClaim, logActivity } from '@/lib/db';
import { randomUUID } from 'crypto';

// Called periodically (e.g. Vercel Cron) to execute prize_rules whose
// trigger_type is NOT already handled synchronously elsewhere:
//
//  - 'nth_claim' is evaluated inline on every claim creation
//    (see app/api/claims/route.ts) — NOT re-processed here to avoid double prizes.
//  - 'birthday' here means "grant the configured prize_rules reward on the
//    customer's birthday" (distinct from the tier-based birthday cron at
//    app/api/cron/birthday/route.ts, which is independent of prize_rules).
//  - 'points_milestone' had no execution logic anywhere before this route —
//    this is the primary gap this cron fills.
//
// Every grant is recorded in prize_rule_executions (rule_id, phone) so a
// given customer only ever receives a given rule's prize once.
//
// Auth: same Bearer/X-Cron-Secret pattern as app/api/cron/birthday/route.ts
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

  const rules = await getAllPrizeRules();
  const activeRules = rules.filter(r => r.active);

  const results: Array<{ rule_id: string; trigger_type: string; phone: string }> = [];

  for (const rule of activeRules) {
    try {
      if (rule.trigger_type === 'points_milestone') {
        await runPointsMilestone(rule, results);
      } else if (rule.trigger_type === 'birthday') {
        await runBirthday(rule, results);
      } else if (rule.trigger_type === 'nth_claim') {
        // Already handled synchronously in app/api/claims/route.ts — skip.
        continue;
      } else {
        // Unknown/future trigger_type — skip gracefully instead of crashing.
        continue;
      }
    } catch (err) {
      console.error(`run-rules: error processing rule ${rule.id} (${rule.trigger_type}):`, err);
      // Continue with the next rule — one bad rule shouldn't block the rest.
    }
  }

  return NextResponse.json({ processed: results.length, results });
}

async function grantPrizeForRule(
  rule: { id: string; restaurant_id: string | null; prize_template: string; prize_reason: string; prize_description: string; validity_days: number; name: string },
  customer: { phone: string; full_name: string | null; email: string },
  extraMeta: Record<string, unknown>,
  results: Array<{ rule_id: string; trigger_type: string; phone: string }>,
  triggerType: string
) {
  const now = new Date();
  const startDate = now.toISOString().split('T')[0];
  const endDate = new Date(now.getTime() + rule.validity_days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const prizeId = randomUUID();
  await insertPrize({
    id: prizeId,
    name: rule.prize_template,
    reason: rule.prize_reason,
    start_date: startDate,
    end_date: endDate,
    description: rule.prize_description,
    location: '',
    restaurant_id: rule.restaurant_id ?? null,
    cancelled: false,
    generated_by: `rule:${rule.id}`,
    max_uses: 1,
    photo_url: null,
    campaign_id: null,
  });

  await insertClaim({
    id: randomUUID(),
    prize_id: prizeId,
    full_name: customer.full_name ?? customer.phone,
    phone: customer.phone,
    email: customer.email,
    location: null,
    referral_code: null,
    referred_by: null,
  });

  await getPool().query(
    `INSERT INTO prize_rule_executions (id, rule_id, phone)
     VALUES ($1, $2, $3)
     ON CONFLICT (rule_id, phone) DO NOTHING`,
    [randomUUID(), rule.id, customer.phone]
  );

  logActivity({
    id: randomUUID(),
    restaurant_id: rule.restaurant_id ?? null,
    action: 'rule_triggered',
    description: `Regla "${rule.name}" activada para ${customer.full_name ?? customer.phone}: ${rule.prize_template}`,
    user_name: 'Sistema',
    metadata: { rule_id: rule.id, phone: customer.phone, prize_id: prizeId, trigger_type: triggerType, ...extraMeta },
  }).catch(() => {});

  results.push({ rule_id: rule.id, trigger_type: triggerType, phone: customer.phone });
}

async function runPointsMilestone(
  rule: Awaited<ReturnType<typeof getAllPrizeRules>>[number],
  results: Array<{ rule_id: string; trigger_type: string; phone: string }>
) {
  // Note: customer_points has no restaurant_id column, so points_milestone
  // rules are evaluated globally per phone regardless of rule.restaurant_id;
  // the generated prize itself is still scoped to rule.restaurant_id.
  const { rows: qualifying } = await getPool().query<{
    phone: string;
    full_name: string | null;
    email: string;
    total_points: number;
  }>(
    `SELECT phone, full_name, email, total_points
     FROM customer_points
     WHERE total_points >= $1
       AND phone NOT IN (SELECT phone FROM prize_rule_executions WHERE rule_id = $2)`,
    [rule.trigger_value, rule.id]
  );

  for (const customer of qualifying) {
    await grantPrizeForRule(
      rule,
      customer,
      { total_points: customer.total_points, milestone: rule.trigger_value },
      results,
      'points_milestone'
    );
  }
}

async function runBirthday(
  rule: Awaited<ReturnType<typeof getAllPrizeRules>>[number],
  results: Array<{ rule_id: string; trigger_type: string; phone: string }>
) {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const { rows: birthdays } = await getPool().query<{
    phone: string;
    full_name: string | null;
    email: string;
  }>(
    `SELECT phone, full_name, email
     FROM customer_points
     WHERE birthday IS NOT NULL
       AND EXTRACT(MONTH FROM birthday) = $1
       AND EXTRACT(DAY FROM birthday) = $2
       AND phone NOT IN (
         SELECT phone FROM prize_rule_executions
         WHERE rule_id = $3 AND executed_at >= NOW() - INTERVAL '300 days'
       )`,
    [month, day, rule.id]
  );

  for (const customer of birthdays) {
    await grantPrizeForRule(rule, customer, { birthday: true }, results, 'birthday');
  }
}
