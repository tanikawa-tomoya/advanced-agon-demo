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
      if (!('serviceWorker' in navigator))
      {
        return;
      }
      try
      {
        await navigator.serviceWorker.register('/pwa-downloader/service-worker.js', { scope: '/pwa-downloader/' });
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
