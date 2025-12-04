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
      this.bindTabs();
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
      if (this.context.state.isBlocked)
      {
        return;
      }
      var newWindow = window.open(target.downloadUrl, '_blank', 'noopener,noreferrer');
      if (newWindow && typeof newWindow.focus === 'function')
      {
        newWindow.focus();
      }
    }

    bindTabs()
    {
      var self = this;
      var selector = this.context.selectorConfig.tabButtons;
      jQuery(document)
        .off('click.pwaDownloaderTab', selector)
        .on('click.pwaDownloaderTab', selector, function (ev) {
          ev.preventDefault();
          var tab = this.getAttribute('data-pwa-tab');
          self.activateTab(tab);
        });

      var active = document.querySelector(selector + '.is-active');
      if (active)
      {
        this.activateTab(active.getAttribute('data-pwa-tab'));
      }
      else
      {
        this.activateTab('');
      }
    }

    activateTab(name)
    {
      var buttons = document.querySelectorAll(this.context.selectorConfig.tabButtons);
      var panels = document.querySelectorAll(this.context.selectorConfig.tabPanels);
      var target = name;
      if (!target && buttons && buttons.length > 0)
      {
        target = buttons[0].getAttribute('data-pwa-tab') || '';
      }

      for (var i = 0; i < buttons.length; i += 1)
      {
        var btn = buttons[i];
        var tabName = btn.getAttribute('data-pwa-tab') || '';
        var isActive = tabName === target;
        if (isActive)
        {
          btn.classList.add('is-active');
          btn.setAttribute('aria-selected', 'true');
          btn.removeAttribute('tabindex');
        }
        else
        {
          btn.classList.remove('is-active');
          btn.setAttribute('aria-selected', 'false');
          btn.setAttribute('tabindex', '-1');
        }
      }

      for (var j = 0; j < panels.length; j += 1)
      {
        var panel = panels[j];
        var panelName = panel.getAttribute('data-pwa-tab-panel') || '';
        var panelActive = panelName === target;
        if (panelActive)
        {
          panel.classList.add('is-active');
          panel.removeAttribute('hidden');
        }
        else
        {
          panel.classList.remove('is-active');
          panel.setAttribute('hidden', 'hidden');
        }
      }
    }
  }

  window.PwaDownloader = window.PwaDownloader || {};
  window.PwaDownloader.JobEvents = JobEvents;
})(window, document);
