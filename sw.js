// MathQuest offline service worker.
// The BUILD id and PRECACHE list placeholders are filled in at build time (vite.config.ts → swVersion plugin),
// so every deploy gets a new cache name and this file's bytes change → the browser installs it.
const BUILD = '0bd7bc103cb3'
const CACHE = `mathquest-${BUILD}`
const PRECACHE = ["./","./assets/index-BU9IZwSK.css","./assets/index-CR0k5Zi9.js","./icons/icon-180.png","./icons/icon-192.png","./icons/icon-512.png","./index.html","./manifest.webmanifest"]

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith('mathquest-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()))
})
self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== location.origin) return
  const isHtml = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html') || url.pathname.endsWith('sw.js') || url.pathname.endsWith('.webmanifest')
  if (isHtml) {
    // Network-first: always try to get the newest index.html; fall back to cache offline.
    e.respondWith(fetch(req, { cache: 'no-store' }).then((res) => {
      if (res.ok && req.mode === 'navigate') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)) }
      return res
    }).catch(async () => (await caches.match(req, { ignoreSearch: true })) || (await caches.match('./index.html')) || Response.error()))
    return
  }
  // Hashed assets/icons: cache-first, then network (and store).
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)) }
    return res
  })))
})
