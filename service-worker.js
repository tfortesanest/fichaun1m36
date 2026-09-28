const CACHE = 'ficha-unimed-v3';
const ARQUIVOS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-192.png', './icon-maskable-512.png'];
const LIMITE_REDE_MS = 3000; // sinal ruim: depois de 3 s abre a cópia salva

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

// Rede primeiro, com tempo limite: se o GitHub responder em até 3 s, usa a versão nova;
// senão abre a cópia salva e a versão nova continua baixando para a próxima abertura.
// Só respostas válidas (200) substituem a cópia salva.
// Chamadas ao Apps Script (script.google.com) não passam por aqui.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin || e.request.method !== 'GET') return;

  const rede = fetch(e.request).then(async (resp) => {
    if (resp.ok) {
      try { const c = await caches.open(CACHE); await c.put(e.request, resp.clone()); } catch (err) {}
    }
    return resp;
  });
  e.waitUntil(rede.catch(() => {}));

  e.respondWith((async () => {
    const salvo = (await caches.match(e.request, { ignoreSearch: true })) ||
                  (e.request.mode === 'navigate' ? await caches.match('./index.html') : undefined);
    if (!salvo) return rede.catch(() => caches.match('./index.html'));
    const resp = await Promise.race([
      rede.catch(() => null),
      new Promise((res) => setTimeout(() => res(null), LIMITE_REDE_MS)),
    ]);
    return resp && resp.ok ? resp : salvo;
  })());
});
