(function (window, document) {
  'use strict';

  class JobState
  {
    constructor(context)
    {
      this.context = context;
    }

    async run()
    {
      await this.initServices();
      await this.fetchQueue();
    }

    async initServices()
    {
      var scripts = [
        { src: '/js/service-app/header/main.js' },
        { src: '/js/service-app/toast/main.js' },
        { src: '/js/service-app/loading/main.js' }
      ];
      await window.Utils.loadScriptsSync(scripts);

      this.context.services.header = new window.Services.Header();
      this.context.services.toast = new window.Services.Toast({ position: 'top-right', duration: 3000 });
      this.context.services.loading = new window.Services.Loading({ container: document.body });

      await Promise.all([
        this.context.services.header.boot('.site-header'),
        this.context.services.toast.boot(),
        this.context.services.loading.boot()
      ]);
    }

    async fetchQueue()
    {
      this.context.state.isLoading = true;
      this.context.setQueue([]);
      var result = await this.context.callApi(this.context.apiConfig.listType, {});
      var entries = this.normalizeQueue(result);
      this.context.setQueue(entries);
      this.context.state.isLoading = false;
    }

    normalizeQueue(response)
    {
      var list = [];
      if (Array.isArray(response))
      {
        list = response;
      }
      else if (response && Array.isArray(response.jobs))
      {
        list = response.jobs;
      }
      else if (response && Array.isArray(response.queue))
      {
        list = response.queue;
      }

      var normalized = [];
      for (var i = 0; i < list.length; i += 1)
      {
        var entry = list[i] || {};
        var id = entry.id || entry.queueId || entry.contentId || ('job-' + Date.now() + '-' + i);
        var title = entry.title || entry.name || entry.fileName || ('コンテンツ #' + (i + 1));
        var status = entry.status || entry.state || '待機中';
        var progress = null;
        if (typeof entry.progressPercent === 'number')
        {
          progress = entry.progressPercent;
        }
        else if (typeof entry.progress === 'number')
        {
          progress = entry.progress;
        }
        else if (typeof entry.percentage === 'number')
        {
          progress = entry.percentage;
        }
        var downloadUrl = entry.downloadUrl || entry.url || '';
        normalized.push({
          id: String(id),
          title: String(title),
          status: status,
          progressPercent: (typeof progress === 'number') ? progress : null,
          downloadUrl: downloadUrl
        });
      }
      return normalized;
    }
  }

  window.PwaDownloader = window.PwaDownloader || {};
  window.PwaDownloader.JobState = JobState;
})(window, document);
