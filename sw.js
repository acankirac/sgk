// Çevrimdışı çalışma: uygulama dosyaları önbelleğe alınır, ağ varsa arka planda tazelenir.
// Yeni sürüm yayınlarken CACHE adını değiştirin.
var CACHE = 'cift-aylik-v1';
var ASSETS = [
  './', './index.html', './css/app.css',
  './js/excel-rows.js', './js/rules.js', './js/engine.js', './js/derive.js', './js/app.js', './js/wizard.js',
  './manifest.webmanifest', './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(ASSETS.map(function (url) { return cache.add(url).catch(function () { /* tek dosya eksikse devam */ }); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) { return; }
  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (cached) {
        var network = fetch(req).then(function (res) {
          if (res && res.ok) { cache.put(req, res.clone()); }
          return res;
        }).catch(function () { return cached || (req.mode === 'navigate' ? cache.match('./index.html') : undefined); });
        return cached || network;
      });
    })
  );
});
