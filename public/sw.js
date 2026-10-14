// MathQuest offline service worker: precache shell, then cache-first with background refresh.
const CACHE = 'mathquest-v1'
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png']
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())) })
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return
  const isNav = req.mode === 'navigate'
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const key = isNav ? './index.html' : req
    const hit = await c.match(key, { ignoreSearch: isNav })
    const net = fetch(req).then((res) => { if (res.ok) c.put(key, res.clone()); return res }).catch(() => hit)
    return hit || net
  }))
})
