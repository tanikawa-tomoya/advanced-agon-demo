(function (window, document) {
  'use strict';

  class JobEvents
  {
    constructor(context)
    {
      this.context = context;
    }

    async run()
    {
      this.bindRefresh();
      this.bindOpen();
    }

    bindRefresh()
    {
      var self = this;
      var selector = this.context.selectorConfig.refreshButton;
      jQuery(document)
        .off('click.pwaDownloaderRefresh', selector)
        .on('click.pwaDownloaderRefresh', selector, async function (ev) {
          ev.preventDefault();
          await self.handleRefresh();
        });
    }

    bindOpen()
    {
      var self = this;
      jQuery(document)
        .off('click.pwaDownloaderOpen', '[data-pwa-open]')
        .on('click.pwaDownloaderOpen', '[data-pwa-open]', function (ev) {
          ev.preventDefault();
          var id = this.getAttribute('data-pwa-open');
          self.openEntry(id);
        });
    }

    async handleRefresh()
    {
      this.context.state.isLoading = true;
      this.context.jobs.render.renderQueue();
      this.context.jobs.render.renderStatus();
      try
      {
        await this.context.jobs.state.fetchQueue();
        this.context.jobs.render.renderQueue();
        this.context.jobs.render.renderStatus();
      }
      catch (err)
      {
        this.context.state.isLoading = false;
        this.context.onError(err);
        this.context.jobs.render.renderQueue();
        this.context.jobs.render.renderStatus();
      }
    }

    openEntry(id)
    {
      if (!id)
      {
        return;
      }
      var queue = Array.isArray(this.context.state.queue) ? this.context.state.queue : [];
      var target = null;
      for (var i = 0; i < queue.length; i += 1)
      {
        if (String(queue[i].id) === String(id))
        {
          target = queue[i];
          break;
        }
      }
      if (!target || !target.downloadUrl)
      {
        return;
      }
      window.open(target.downloadUrl, '_blank');
    }
  }

  window.PwaDownloader = window.PwaDownloader || {};
  window.PwaDownloader.JobEvents = JobEvents;
})(window, document);
