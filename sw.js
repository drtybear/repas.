const CACHE = 'repas-v16';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => { try { c.put(req, copy); } catch (_) {} });
        return res;
      }).catch(() => cached)
    )
  );
});

// ===== minuteurs de cuisine (notifications best-effort) =====
const swTimers = {};
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === 'startTimer' && d.id) {
    if (swTimers[d.id]) clearTimeout(swTimers[d.id]);
    const ms = (d.at || 0) - Date.now();
    const fire = () => {
      delete swTimers[d.id];
      self.registration.showNotification(d.title || 'repas.', {
        body: d.body || 'Minuteur terminé',
        tag: d.id, renotify: true,
        icon: 'icon-192.png', badge: 'icon-192.png',
        vibrate: [200, 100, 200, 100, 400]
      });
    };
    if (ms <= 0) fire(); else swTimers[d.id] = setTimeout(fire, ms);
  } else if (d.type === 'cancelTimer' && d.id) {
    if (swTimers[d.id]) { clearTimeout(swTimers[d.id]); delete swTimers[d.id]; }
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      for (const c of cls) { if ('focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
