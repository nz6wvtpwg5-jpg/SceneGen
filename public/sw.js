const CACHE = 'scenegen-road-pack-v2';
const CORE = ['/', '/offline', '/offline/day-sheet', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((entry) => entry.startsWith('scenegen-road-pack-') && entry !== CACHE).map((entry) => caches.delete(entry)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/external-day-sheets') || url.pathname.startsWith('/day-sheet-invite') || url.pathname.startsWith('/collaborator-access')) return;

  if (request.mode === 'navigate') {
    if (url.pathname === '/offline' || url.pathname === '/offline/day-sheet') {
      event.respondWith(caches.match(url.pathname).then((cached) => cached || fetch(request)));
      return;
    }
    event.respondWith(fetch(request).catch(async () => (await caches.match('/offline')) || Response.error()));
    return;
  }

  const cacheableAsset = CORE.includes(url.pathname) || url.pathname.startsWith('/_next/static/');
  if (!cacheableAsset) return;
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      return Response.error();
    }
  })());
});
