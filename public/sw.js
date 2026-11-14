// Cache-first so the app works in airplane mode. Bump the version string whenever you change data.js or index.html.
const C = "fsng-v2", F = ["./", "index.html", "data.js", "zones.js"];
self.addEventListener("install", e => e.waitUntil(caches.open(C).then(c => c.addAll(F))));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== C).map(n => caches.delete(n))))));
self.addEventListener("fetch", e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
