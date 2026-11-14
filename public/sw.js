// Network-first with cache fallback: fresh data online, still works in airplane mode. Bump C when you change the file list.
const C="fsng-v5",F=["./","index.html","data.js","zones.js","i18n.js"];
self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F))));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==C).map(n=>caches.delete(n))))));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET"||new URL(e.request.url).pathname.startsWith("/api"))return;e.respondWith(fetch(e.request).then(r=>{const y=r.clone();caches.open(C).then(c=>c.put(e.request,y));return r}).catch(()=>caches.match(e.request)))});
