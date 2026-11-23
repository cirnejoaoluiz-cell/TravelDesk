// Service worker: o app funciona offline depois do primeiro acesso, sem prender versões antigas.
// - Página: sempre da rede, ignorando o cache HTTP (cache só se estiver offline).
// - assets/ (nomes com hash, mudam a cada build): cache primeiro.
// - Demais arquivos (manifest, ícones): rede primeiro, cache se offline.
const CACHE = 'kcalc-v2';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function save(req, res) {
  if (res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.searchParams.has('check')) return; // verificação de versão: direto na rede

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => save(req, res))
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./'))),
    );
    return;
  }

  if (url.pathname.includes('/assets/')) {
    event.respondWith(caches.match(req).then((cached) => cached || fetch(req).then((res) => save(req, res))));
    return;
  }

  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => save(req, res))
      .catch(() => caches.match(req)),
  );
});
