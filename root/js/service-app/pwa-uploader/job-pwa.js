(function () {

  'use strict';

  class JobPwa
  {
    constructor(service)
    {
      this.service = service;
      this.registration = null;
    }

    prepare(config)
    {
      this.ensureManifest(config && config.manifestHref);
      this.registerServiceWorker({
        path: config && config.serviceWorkerPath,
        scope: config && config.serviceWorkerScope,
        enabled: !config || config.enableServiceWorker !== false
      });
    }

    ensureManifest(source)
    {
      var existing = document.querySelector('link[rel="manifest"]');
      if (existing)
      {
        existing.setAttribute('data-pwa-uploader-manifest', '1');
        return existing;
      }

      var href = this.resolveManifestHref(source);
      if (!href)
      {
        return null;
      }

      var link = document.createElement('link');
      link.rel = 'manifest';
      link.href = href;
      link.setAttribute('data-pwa-uploader-manifest', '1');
      document.head.appendChild(link);
      return link;
    }

    resolveManifestHref(source)
    {
      var candidates = [];
      if (Array.isArray(source))
      {
        for (var i = 0; i < source.length; i++)
        {
          var href = source[i];
          if (typeof href === 'string' && href.trim().length > 0)
          {
            candidates.push(href.trim());
          }
        }
      }
      else if (typeof source === 'string' && source.trim().length > 0)
      {
        candidates.push(source.trim());
      }
      candidates.push('/manifest.webmanifest');

      for (var j = 0; j < candidates.length; j++)
      {
        var candidate = candidates[j];
        if (candidate)
        {
          return candidate;
        }
      }
      return '';
    }

    registerServiceWorker(options)
    {
      if (!options || options.enabled === false)
      {
        return null;
      }
      if (!navigator.serviceWorker)
      {
        return null;
      }
      var path = (options && options.path) ? options.path : '/service-worker.js';
      var scope = (options && typeof options.scope === 'string') ? options.scope : '/';
      var self = this;
      var promise = navigator.serviceWorker.register(path, { scope: scope });
      promise.then(function (registration)
      {
        self.registration = registration;
      });
      return promise;
    }
  }

  window.Services = window.Services || {};
  window.Services.PwaUploader = window.Services.PwaUploader || {};
  window.Services.PwaUploader.JobPwa = JobPwa;

})();
