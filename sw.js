// IMPORTANTE: Mude o número da versão sempre que subir um novo ajuste
const cacheName = 'simulador-v41';
const assets = [
  './',
  './index.html',
  './info.html',
  './acoes.html',
  './economia-criativa.html',
  './info.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(cacheName).then(cache => cache.addAll(assets))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.filter(key => key !== cacheName).map(key => caches.delete(key)));
    })
  );
});

self.addEventListener('fetch', e => {
  // Network-First para a navegação principal (index.html)
  // Isso garante que o navegador tente buscar a versão nova antes de recorrer ao cache
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  // Cache-First para os demais recursos estáticos
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});

// Escuta o comando 'SKIP_WAITING' enviado pelo botão de atualizar na página
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});