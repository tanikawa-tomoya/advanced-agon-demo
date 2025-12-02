var CACHE_NAME = 'pwa-uploader-cache-v1';
var ASSETS = [
  '/css/pwa-uploader.css',
  '/js/service-app/pwa-uploader/main.js',
  '/js/service-app/pwa-uploader/job-dom.js',
  '/js/service-app/pwa-uploader/job-upload.js',
  '/js/service-app/pwa-uploader/job-pwa.js',
  '/manifest.webmanifest'
];

self.addEventListener('install', function (event)
{
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache)
    {
      return cache.addAll(ASSETS);
    }).then(function ()
    {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event)
{
  event.waitUntil(
    caches.keys().then(function (keys)
    {
      return Promise.all(keys.map(function (key)
      {
        if (key.indexOf('pwa-uploader-cache-') === 0 && key !== CACHE_NAME)
        {
          return caches.delete(key);
        }
        return Promise.resolve(false);
      }));
    }).then(function ()
    {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event)
{
  var request = event.request;
  if (request.method !== 'GET')
  {
    return;
  }
  var url = new URL(request.url);
  var isAsset = ASSETS.indexOf(url.pathname) !== -1;
  if (!isAsset)
  {
    return;
  }
  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache)
    {
      return cache.match(request).then(function (cached)
      {
        if (cached)
        {
          fetch(request).then(function (response)
          {
            if (response && response.status === 200)
            {
              cache.put(request, response.clone());
            }
          }).catch(function () {});
          return cached;
        }
        return fetch(request).then(function (response)
        {
          if (response && response.status === 200)
          {
            cache.put(request, response.clone());
          }
          return response;
        });
      });
    })
  );
});
