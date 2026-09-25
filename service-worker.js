const CACHE = 'ficha-unimed-v2';
const ARQUIVOS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-192.png', './icon-maskable-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
  );
  self.clients.claim();
});

// Rede primeiro (pega sempre a versão nova do GitHub); sem internet, usa a cópia salva.
// A busca da agenda (script.google.com) não passa por aqui.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin || e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((net) => {
      const clone = net.clone();
      caches.open(CACHE).then((c) => c.put(e.request, clone));
      return net;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
