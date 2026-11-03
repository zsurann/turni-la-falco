/* Service worker: prima la rete (così gli aggiornamenti del sito arrivano subito),
   se sei offline usa la copia salvata. */
const CACHE = 'turni-v1';
const ASSETS = [
  './', 'index.html', 'style.css', 'app.js', 'parser.js', 'manifest.webmanifest',
  'logo.png', 'favicon.png', 'icon-192.png', 'icon-512.png',
  'vendor/pdf.min.mjs', 'vendor/pdf.worker.min.mjs',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
  );
});
