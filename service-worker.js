const V = 'qd-v6', FONTS = 'qd-fonts', F = ['./', 'index.html', 'style.css', 'game.js', 'ai.js', 'script.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(F)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V && x !== FONTS).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) { // 筆フォントだけは保存して、オフラインでも使えるようにする
    if (/^fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) e.respondWith(caches.open(FONTS).then(c => c.match(e.request).then(r => r || fetch(e.request).then(n => { c.put(e.request, n.clone()); return n; }))));
    return;
  }
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});


