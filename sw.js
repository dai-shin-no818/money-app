/* マネーアプリ: ページとフォントを端末に保存。お金のデータ（script.google.com）は保存しない */
const CACHE = 'money-v4';
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./']))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isPage = e.request.mode === 'navigate' && url.origin === self.location.origin;
  const isFont = url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com';
  if (!isPage && !isFont) return;
  if (isPage) {
    // 画面: まず新しいものを取りに行く。4秒で届かない・電波がないときだけ、保存してある画面を出す
    e.respondWith(caches.open(CACHE).then(async cache => {
      const net = fetch(url.origin + url.pathname, { cache: 'no-cache', credentials: 'same-origin' }).then(async res => {
        if (res.ok) await cache.put('./', res.clone());
        return res;
      });
      const timeout = new Promise(r => setTimeout(r, 4000));
      try {
        const res = await Promise.race([net, timeout]);
        if (res && res.ok) return res;
      } catch (err) {}
      const hit = await cache.match('./');
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
      return net;
    }));
    return;
  }
  // 文字（フォント）: 保存してあればそれを使い、なければ取りに行って保存する
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(e.request);
    if (hit) return hit;
    const res = await fetch(e.request);
    if (res.ok || res.type === 'opaque') await cache.put(e.request, res.clone());
    return res;
  }));
});
