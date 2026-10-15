// Hymn Finder offline helper: keeps the app and the PDF reader on the device.
const VERSION = 'hymnal-finder-v8';
const APP = ['./', 'index.html', 'maps.js', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];
const LIBS = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(APP);
    // The PDF reader is saved too; if this fails it is retried on the next online visit.
    await Promise.all(LIBS.map(u => c.add(new Request(u, {mode: 'cors'})).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isApp = url.origin === location.origin;
  const isLib = LIBS.includes(req.url);
  const isFont = FONT_HOSTS.includes(url.hostname);
  if (!isApp && !isLib && !isFont) return;

  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    const hit = await c.match(req, {ignoreSearch: isApp}) || (req.mode === 'navigate' ? await c.match('index.html') : null);
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }          // use the saved copy, refresh it in the background
    return (await net) || new Response('Offline and not saved yet', {status: 503});
  })());
});
