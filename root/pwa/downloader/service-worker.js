const CACHE_NAME = 'pwa-downloader-cache-v4';
const APP_SHELL = [
  '/pwa/downloader/index.html',
  '/pwa/downloader/css/main.css',
  '/css/theme.css',
  '/js/entrypoint.js',
  '/pwa/downloader/js/main.js',
  '/pwa/downloader/js/job-state.js',
  '/pwa/downloader/js/job-render.js',
  '/pwa/downloader/js/job-events.js',
  '/pwa/downloader/js/job-service-worker.js',
  '/pwa/downloader/manifest.webmanifest',
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
