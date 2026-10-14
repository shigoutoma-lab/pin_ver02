// 現調図面ピン留めツール オフライン用 Service Worker
// index.html と同じフォルダに置く。HTTPS または localhost で有効。
const CACHE_NAME = 'survey-cache-v11';
const PRECACHE = ['./'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(PRECACHE.map(u => cache.add(new URL(u, self.registration.scope).href)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// キャッシュ優先で即表示し、オンライン時は裏で最新版に更新（次回起動から反映）
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then((res) => {
      if (res && res.status === 200) cache.put(req, res.clone()).catch(() => {});
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    if (res) return res;
    if (req.mode === 'navigate') {
      const k = (await cache.keys()).find(r => /(\.html?|\/)$/.test(new URL(r.url).pathname));
      if (k) return cache.match(k);
    }
    return Response.error();
  })());
});
