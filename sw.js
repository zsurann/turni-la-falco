/* Service worker: prima la rete (così gli aggiornamenti del sito arrivano subito),
 se sei offline usa la copia salvata. */
try { importScripts('config.js'); } catch (e) { /* senza notifiche push */ }
const CACHE = 'turni-v10';
const CORE_ASSETS = [
 './', 'index.html', 'style.css', 'app.js', 'parser.js', 'scenes.js', 'manifest.webmanifest',
 'logo.png', 'favicon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png',
 'polyfill.js', 'config.js',
];
const HEAVY_ASSETS = [
 'pdf.min.mjs', 'pdf.worker.min.mjs',
];

self.addEventListener('install', (e) => {
 e.waitUntil(
 caches.open(CACHE).then(async (c) => {
 await c.addAll(CORE_ASSETS);
 // Scarica pdf.js in background senza far fallire l'installazione se la rete mobile è lenta
 c.addAll(HEAVY_ASSETS).catch(() => {});
 }).then(() => self.skipWaiting())
 );
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
 // solo risposte complete (niente 206 parziali) finiscono nella copia offline
 if (res.status === 200 && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
 return res;
 })
 // offline: la copia salvata; la pagina principale solo per le navigazioni (non al posto di un'immagine o di uno script)
 .catch(() => caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then((r) => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
 );
});

/* ---------- Notifiche push ---------- */
// Il testo arriva cifrato dentro la push; se manca lo si chiede al server. Ogni push deve mostrare una notifica.
self.addEventListener('push', (e) => {
 e.waitUntil((async () => {
 let list = [];
 try { const d = e.data && e.data.json(); if (d && (d.title || d.body)) list = [d]; } catch (err) { /* nessun contenuto */ }
 if (!list.length) { // push senza testo: lo chiedo al server
 try {
 const sub = await self.registration.pushManager.getSubscription();
 if (sub && self.TURNI_PUSH) {
 const r = await fetch(self.TURNI_PUSH.replace(/\/$/, '') + '/api/due', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) });
 if (r.ok) list = await r.json();
 }
 } catch (err) { /* offline: notifica generica */ }
 }
 if (!list.length) list = [{ title: 'Turni La Falco', body: 'Hai un promemoria per il tuo turno.' }];
 for (const n of list) {
 await self.registration.showNotification(n.title || 'Turni La Falco', { body: n.body || '', icon: 'icon-192.png', badge: 'favicon.png', tag: n.id === 'test' ? 'test-' + Date.now() : (n.id || 'turno'), renotify: true });
 }
 })());
});

self.addEventListener('notificationclick', (e) => {
 e.notification.close();
 e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
 for (const c of cs) { if ('focus' in c) return c.focus(); }
 return self.clients.openWindow('./');
 }));
});