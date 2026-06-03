self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open('raei-offline-v1');
    await cache.addAll(['./', './index.html', './viewer.html', './manifest.webmanifest', './viewer-manifest.webmanifest']);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n !== 'raei-offline-v1').map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.includes('/~oauth')) return;

  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(event.request);
        const cache = await caches.open('raei-offline-v1');
        cache.put(event.request, fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open('raei-offline-v1');
        return (await cache.match(event.request)) || (url.pathname.endsWith('/viewer.html') ? await cache.match('./viewer.html') : await cache.match('./index.html'));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open('raei-offline-v1');
    const cached = await cache.match(event.request);
    const fetchPromise = fetch(event.request).then((res) => {
      if (res && res.status === 200) cache.put(event.request, res.clone());
      return res;
    }).catch(() => cached);
    return cached || fetchPromise;
  })());
});