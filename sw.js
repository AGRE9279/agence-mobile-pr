// Service worker : l'appli s'ouvre même sans Internet.
// Les appels au serveur (Supabase) ne passent jamais par le cache.
// Les fichiers de l'appli sont toujours redemandés au site (cache HTTP contourné),
// pour qu'une mise à jour s'affiche dès la réouverture.
const CACHE = 'agence-pro-v10';
const FILES = ['./', './index.html', './supabase.js', './xlsx.full.min.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.hostname.endsWith('supabase.co')) return;
  const local = url.origin === location.origin;
  // Fichiers de l'appli : revalidés auprès du site à chaque fois (« no-cache »).
  const req = local ? fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(e.request);
  e.respondWith(
    req.then(r => {
      if (r.ok && (local || url.hostname.startsWith('fonts.g'))) {
        const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
