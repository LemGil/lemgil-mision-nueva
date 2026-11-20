// Service worker de la app nueva: la app abre sin internet.
// - Navegaciones: primero la red (para coger las versiones nuevas) y si
//   no hay red, la copia guardada.
// - Archivos con hash (/assets/…): primero la copia guardada (su nombre
//   ya cambia con cada versión), y se guardan al vuelo.
// - Todo lo demás (Supabase, mapas): red directa, sin tocar.
const CACHE = 'mision-nueva-v13';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['/'])).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const copia = r.clone();
          void caches.open(CACHE).then((c) => c.put('/', copia));
          return r;
        })
        .catch(() => caches.match('/').then((r) => r ?? Response.error())),
    );
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(e.request).then(
        (guardada) =>
          guardada ??
          fetch(e.request).then((r) => {
            const copia = r.clone();
            void caches.open(CACHE).then((c) => c.put(e.request, copia));
            return r;
          }),
      ),
    );
  }
});
