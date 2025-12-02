const CACHE_NAME = 'pwa-downloader-cache-v1';
const APP_SHELL = [
  '/html/pwa-downloader.html',
  '/css/pwa-downloader.css',
  '/css/theme.css',
  '/js/entrypoint.js',
  '/js/page/pwa-downloader/main.js',
  '/js/page/pwa-downloader/job-state.js',
  '/js/page/pwa-downloader/job-render.js',
  '/js/page/pwa-downloader/job-events.js',
  '/js/page/pwa-downloader/job-service-worker.js',
  '/pwa-downloader/manifest.webmanifest',
  '/image/user-avatar.svg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
        return null;
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET')
  {
    return;
  }
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then(function (response) {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        var responseToCache = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(function () {
        return cached;
      });
    })
  );
});
