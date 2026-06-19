import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { getUnreadNotifications } from '@/lib/db';
import { SessionData, sessionOptions } from '@/lib/session';

export const runtime = 'nodejs';

const POLL_MS = 4000;
const MAX_DURATION_MS = 50_000;

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  const restaurantId = session.restaurantId ?? null;

  const encoder = new TextEncoder();
  let closed = false;

  let interval: ReturnType<typeof setInterval> | undefined;
  let maxTimer: ReturnType<typeof setTimeout> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
          if (interval) clearInterval(interval);
        }
      };

      let lastSignature = '';

      const tick = async () => {
        if (closed) return;
        try {
          const notifications = await getUnreadNotifications(restaurantId);
          const signature = notifications.map((n) => n.id).join(',');
          if (signature !== lastSignature) {
            lastSignature = signature;
            send('notifications', { notifications });
          } else {
            send('ping', {});
          }
        } catch {
          // ignore transient errors, retry on next tick
        }
      };

      await tick();
      interval = setInterval(tick, POLL_MS);

      maxTimer = setTimeout(() => {
        closed = true;
        if (interval) clearInterval(interval);
        try {
          controller.close();
        } catch {
          // already closed by client disconnect
        }
      }, MAX_DURATION_MS);
    },
    cancel() {
      closed = true;
      if (interval) clearInterval(interval);
      if (maxTimer) clearTimeout(maxTimer);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
