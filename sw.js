// Çevrimdışı çalışma: uygulama dosyaları önbelleğe alınır, ağ varsa arka planda tazelenir.
// Önbellek adı kaynak tablonun sürüm damgasından türetilir; tablo değişince eski önbellek silinir.
importScripts('./js/excel-rows.js');
var CACHE = 'cift-aylik-' + ((self.SGK_EXCEL && self.SGK_EXCEL.meta && self.SGK_EXCEL.meta.sha256) || 'v1');
var ASSETS = [
  './', './index.html', './css/app.css', './css/fonts.css',
  './assets/fonts/ibm-plex-sans-latin.woff2', './assets/fonts/ibm-plex-sans-latin-ext.woff2',
  './js/config.js', './js/excel-rows.js', './js/rules.js', './js/engine.js', './js/derive.js', './js/texts.js', './js/wizard-steps.js', './js/app.js', './js/wizard.js',
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

// Sayfa ve betikler ağ öncelikli (kural güncellemeleri hemen yansısın), diğerleri
// önbellek öncelikli; her durumda ağ yoksa önbellekten sunulur.
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) { return; }
  var networkFirst = req.mode === 'navigate' || /\.(html|js|webmanifest)$/.test(new URL(req.url).pathname);
  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (cached) {
        var network = fetch(req).then(function (res) {
          if (res && res.ok) { cache.put(req, res.clone()); }
          return res;
        }).catch(function () { return cached || (req.mode === 'navigate' ? cache.match('./index.html') : undefined); });
        if (networkFirst) { return network; }
        return cached || network;
      });
    })
  );
});
