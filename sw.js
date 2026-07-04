// Service worker — PWA installable + notifications push
const CACHE = 'pronos-mcm-v2';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// Stratégie réseau d'abord (l'app a besoin de Supabase en direct),
// le cache sert juste de secours si hors-ligne.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
        return resp;
      })
      .catch(() => caches.match(e.request))
  );
});

// ====== NOTIFICATIONS PUSH ======
// Réception d'un push envoyé par l'Edge Function Supabase
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) { data = {}; }
  const title = data.title || 'MC Les Morfalous';
  const options = {
    body: data.body || 'Tes pronostics ferment bientôt !',
    icon: data.icon || 'splash-logo.png',
    badge: data.badge || 'splash-logo.png',
    tag: data.tag || 'prono-reminder',   // regroupe les notifs du même type
    renotify: true,
    data: { url: data.url || './' },     // où aller au clic
    vibrate: [80, 40, 80]
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// Clic sur la notif → ouvre/focus l'app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
