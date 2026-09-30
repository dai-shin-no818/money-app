/* マネーアプリ: ページとフォントを端末に保存。お金のデータ（script.google.com）は保存しない */
const CACHE = 'money-v3';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./']))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isPage = e.request.mode === 'navigate' && url.origin === self.location.origin;
  const isFont = url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com';
  if (!isPage && !isFont) return;
  const key = isPage ? './' : e.request;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(key);
    const fresh = (isPage ? fetch(url.origin + url.pathname, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(e.request)).then(async res => {
      if (res.ok || res.type === 'opaque') {
        // 新しい版のページが届いたら、開いている画面に知らせる（画面が1回だけ読み込み直す）
        if (isPage && hit && res.ok) {
          const [a, b] = await Promise.all([hit.clone().text(), res.clone().text()]);
          if (a !== b) {
            await cache.put(key, res.clone());
            const cs = await self.clients.matchAll({ type: 'window' });
            cs.forEach(c => c.postMessage('money-updated'));
            return res;
          }
        }
        await cache.put(key, res.clone());
      }
      return res;
    }).catch(() => hit);
    if (hit) { e.waitUntil(fresh); return hit; }
    return fresh;
  }));
});
