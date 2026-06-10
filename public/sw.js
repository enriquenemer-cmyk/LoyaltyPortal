// Premia Service Worker
// Caches cajero pages for offline use and queues delivery confirmations.

const CACHE_NAME = 'supertierra-v2';
const OFFLINE_QUEUE_KEY = 'offline_delivery_queue';

const PRECACHE_URLS = [
  '/cajero',
  '/cajero/escanear',
];

// ---- Install: precache cajero pages -----------------------------------------

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache each URL individually so one failure doesn't block all
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch(() => {
            // Non-critical — page may not exist at install time
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ---- Activate: clean up old caches ------------------------------------------

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== 'premia-delivery-queue')
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ---- Fetch: serve from cache when offline -----------------------------------

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // For delivery confirmation API calls while offline — queue them
  if (
    request.method === 'POST' &&
    url.pathname.startsWith('/api/claims')
  ) {
    event.respondWith(handleDeliveryRequest(request));
    return;
  }

  // For GET requests: network-first for API, cache-first for cajero pages
  if (request.method !== 'GET') return;

  if (url.pathname.startsWith('/api/')) {
    // Network first — fall back to a JSON error (API responses are not cached)
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ error: 'Sin conexión — intenta de nuevo cuando tengas internet.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  // Cajero pages: stale-while-revalidate
  if (
    url.pathname === '/cajero' ||
    url.pathname.startsWith('/cajero/')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => null);

        return cached ?? fetchPromise ?? new Response('Sin conexión', { status: 503 });
      })
    );
    return;
  }

  // Other navigation: network first, fall back to login page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/admin/login'))
    );
  }
});

// ---- Delivery queue ---------------------------------------------------------

async function handleDeliveryRequest(request) {
  try {
    const res = await fetch(request.clone());
    return res;
  } catch {
    // Offline — save to queue
    const body = await request.clone().json().catch(() => ({}));
    await enqueueDelivery({ url: request.url, body, method: request.method });
    return new Response(
      JSON.stringify({
        queued: true,
        message: 'Sin conexión — el cobro se enviará automáticamente cuando vuelva internet.',
      }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Store queued deliveries in Cache Storage
async function enqueueDelivery(item) {
  const cache = await caches.open('premia-delivery-queue');
  const existing = await cache.match(OFFLINE_QUEUE_KEY);
  const queue = existing ? await existing.json() : [];
  queue.push({ ...item, queuedAt: Date.now() });
  await cache.put(
    OFFLINE_QUEUE_KEY,
    new Response(JSON.stringify(queue), { headers: { 'Content-Type': 'application/json' } })
  );
}

async function flushDeliveryQueue() {
  const cache = await caches.open('premia-delivery-queue');
  const existing = await cache.match(OFFLINE_QUEUE_KEY);
  if (!existing) return;

  const queue = await existing.json().catch(() => []);
  if (!queue.length) return;

  const remaining = [];
  for (const item of queue) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.body),
      });
      if (!res.ok) remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }

  await cache.put(
    OFFLINE_QUEUE_KEY,
    new Response(JSON.stringify(remaining), { headers: { 'Content-Type': 'application/json' } })
  );

  // Notify clients
  const clients = await self.clients.matchAll();
  clients.forEach((client) =>
    client.postMessage({ type: 'QUEUE_FLUSHED', flushed: queue.length - remaining.length })
  );
}

// ---- Push Notifications -----------------------------------------------------

self.addEventListener('push', (event) => {
  let data = { title: 'Premia', body: '¡Tienes un mensaje!', url: '/', icon: '/icon-192.png' };
  if (event.data) {
    try { data = { ...data, ...event.data.json() }; } catch {}
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' },
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// ---- Sync: flush queue when connection restored -----------------------------

self.addEventListener('sync', (event) => {
  if (event.tag === 'delivery-sync') {
    event.waitUntil(flushDeliveryQueue());
  }
});

// Flush on explicit message from page
self.addEventListener('message', (event) => {
  if (event.data?.type === 'FLUSH_QUEUE') {
    flushDeliveryQueue();
  }
});
