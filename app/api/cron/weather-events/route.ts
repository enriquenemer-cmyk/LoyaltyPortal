import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import {
  getRestaurantsWithLocation,
  createEvent,
  logDynamicEvent,
  getSlowestDayOfWeek,
} from '@/lib/db';

// Called periodically via cron (e.g. Vercel Cron). Checks live weather for each
// restaurant with a configured lat/lng and auto-creates a point-multiplier
// restaurant_event when conditions warrant it (rain, extreme heat). Also checks
// whether today is historically each restaurant's slowest day and, if so,
// creates a smaller automatic boost. Dedup is enforced via the
// dynamic_event_log table (UNIQUE restaurant_id + trigger_type + triggered_date),
// so this route is safe to call multiple times a day.

function isAuthorized(req: NextRequest): boolean {
  const bearer = req.headers.get('authorization');
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  return (
    !process.env.CRON_SECRET ||
    bearer === `Bearer ${process.env.CRON_SECRET}` ||
    secret === process.env.CRON_SECRET
  );
}

function endOfTodayISO(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function todayDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

async function tryCreateEvent(params: {
  restaurant_id: string;
  trigger_type: string;
  name: string;
  description: string;
  multiplier: number;
}): Promise<boolean> {
  const eventId = randomUUID();
  const now = new Date().toISOString();
  try {
    await createEvent({
      id: eventId,
      restaurant_id: params.restaurant_id,
      name: params.name,
      description: params.description,
      event_type: 'double_points',
      multiplier: params.multiplier,
      max_participants: null,
      starts_at: now,
      ends_at: endOfTodayISO(),
      active: true,
    });

    await logDynamicEvent({
      id: randomUUID(),
      restaurant_id: params.restaurant_id,
      trigger_type: params.trigger_type,
      event_id: eventId,
      triggered_date: todayDateStr(),
    });
    return true;
  } catch (err: unknown) {
    // Unique violation on dynamic_event_log means this trigger already ran today
    // for this restaurant — skip gracefully instead of crashing the whole cron.
    const code = (err as { code?: string } | null)?.code;
    if (code === '23505') {
      return false;
    }
    console.error('weather-events: failed to create event', params.restaurant_id, params.trigger_type, err);
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const restaurants = await getRestaurantsWithLocation();
  const eventsCreated: Array<{ restaurant_id: string; trigger_type: string }> = [];

  for (const restaurant of restaurants) {
    // ── Weather-based triggers ──────────────────────────────────────────
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${restaurant.lat}&longitude=${restaurant.lng}&current=precipitation,temperature_2m&timezone=auto`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const precipitation = Number(data?.current?.precipitation ?? 0);
        const temperature = Number(data?.current?.temperature_2m ?? NaN);

        if (precipitation > 0.5) {
          const created = await tryCreateEvent({
            restaurant_id: restaurant.id,
            trigger_type: 'rain',
            name: '🌧️ Lluvia = Puntos Dobles',
            description: 'Hoy llueve, ¡duplica tus puntos en cada compra!',
            multiplier: 2,
          });
          if (created) eventsCreated.push({ restaurant_id: restaurant.id, trigger_type: 'rain' });
        }

        if (!Number.isNaN(temperature) && temperature > 32) {
          const created = await tryCreateEvent({
            restaurant_id: restaurant.id,
            trigger_type: 'heat',
            name: '🔥 Día de Calor = +50% Puntos',
            description: 'Hace mucho calor hoy, ¡recibe 50% más puntos en cada compra!',
            multiplier: 1.5,
          });
          if (created) eventsCreated.push({ restaurant_id: restaurant.id, trigger_type: 'heat' });
        }
      }
    } catch (err) {
      console.error('weather-events: weather check failed for', restaurant.id, err);
      // Continue with other restaurants/triggers even if weather lookup fails.
    }

    // ── Slow-day trigger (no external API needed) ──────────────────────
    try {
      const slowestDow = await getSlowestDayOfWeek(restaurant.id);
      if (slowestDow !== null) {
        const todayDow = new Date().getDay();
        if (todayDow === slowestDow) {
          const created = await tryCreateEvent({
            restaurant_id: restaurant.id,
            trigger_type: 'slow_day',
            name: '📉 Día tranquilo = +30% puntos extra',
            description: 'Hoy suele ser un día tranquilo, ¡aprovecha 30% más puntos en tu compra!',
            multiplier: 1.3,
          });
          if (created) eventsCreated.push({ restaurant_id: restaurant.id, trigger_type: 'slow_day' });
        }
      }
    } catch (err) {
      console.error('weather-events: slow-day check failed for', restaurant.id, err);
    }
  }

  return NextResponse.json({ processed: restaurants.length, events_created: eventsCreated });
}
