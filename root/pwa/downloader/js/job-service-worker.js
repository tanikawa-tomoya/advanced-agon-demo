(function (window, document) {
  'use strict';

  class JobServiceWorker
  {
    constructor(context)
    {
      this.context = context;
    }

    async run()
    {
      this.preventInstallPrompt();
      await this.disableServiceWorker();
    }

    preventInstallPrompt()
    {
      window.addEventListener('beforeinstallprompt', function (event) {
        event.preventDefault();
      });
    }

    async disableServiceWorker()
    {
      if (!('serviceWorker' in navigator))
      {
        return;
      }
      try
      {
        var registrations = await navigator.serviceWorker.getRegistrations();
        for (var i = 0; i < registrations.length; i += 1)
        {
          var registration = registrations[i];
          if (registration)
          {
            await registration.unregister();
          }
        }
        if (typeof caches !== 'undefined' && caches.keys)
        {
          var keys = await caches.keys();
          for (var j = 0; j < keys.length; j += 1)
          {
            if (typeof caches.delete === 'function')
            {
              await caches.delete(keys[j]);
            }
          }
        }
      }
      catch (err)
      {
        this.context.onError(err);
      }
    }
  }

  window.PwaDownloader = window.PwaDownloader || {};
  window.PwaDownloader.JobServiceWorker = JobServiceWorker;
})(window, document);
