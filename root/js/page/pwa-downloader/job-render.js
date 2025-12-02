(function (window, document) {
  'use strict';

  class JobRender
  {
    constructor(context)
    {
      this.context = context;
      this.nodes = {
        queueBody: null,
        status: null,
        updated: null,
        refreshButton: null
      };
    }

    async run()
    {
      var selectors = this.context.selectorConfig;
      this.nodes.queueBody = document.querySelector(selectors.queueBody);
      this.nodes.status = document.querySelector(selectors.status);
      this.nodes.updated = document.querySelector(selectors.updated);
      this.nodes.refreshButton = document.querySelector(selectors.refreshButton);
      if (this.nodes.refreshButton)
      {
        this.nodes.refreshButton.textContent = this.context.textConfig.refreshButtonLabel;
      }
      this.renderQueue();
      this.renderStatus();
    }

    renderQueue()
    {
      var body = this.nodes.queueBody;
      if (!body)
      {
        return;
      }
      body.innerHTML = '';

      if (this.context.state.isLoading)
      {
        body.appendChild(this.createMessageRow(this.context.textConfig.loading));
        return;
      }

      var queue = Array.isArray(this.context.state.queue) ? this.context.state.queue : [];
      if (!queue.length)
      {
        body.appendChild(this.createMessageRow(this.context.textConfig.empty));
        return;
      }

      for (var i = 0; i < queue.length; i += 1)
      {
        var entry = queue[i];
        body.appendChild(this.createEntryRow(entry));
      }
    }

    renderStatus()
    {
      if (this.nodes.status)
      {
        var queue = Array.isArray(this.context.state.queue) ? this.context.state.queue : [];
        var message = this.context.textConfig.refreshed;
        if (this.context.state.isLoading)
        {
          message = this.context.textConfig.loading;
        }
        else if (!queue.length)
        {
          message = this.context.textConfig.empty;
        }
        this.nodes.status.textContent = message;
      }

      if (this.nodes.updated)
      {
        var stamp = this.context.state.lastUpdated;
        if (stamp instanceof Date)
        {
          this.nodes.updated.textContent = '最終更新: ' + stamp.toLocaleString();
        }
        else if (this.context.state.isLoading)
        {
          this.nodes.updated.textContent = '最新の状態を取得しています…';
        }
        else
        {
          this.nodes.updated.textContent = '';
        }
      }
    }

    createMessageRow(text)
    {
      var row = document.createElement('tr');
      row.className = 'c-pwa-downloader__row c-pwa-downloader__empty-row';
      var cell = document.createElement('td');
      cell.className = 'c-pwa-downloader__cell';
      cell.colSpan = 3;
      cell.textContent = text;
      row.appendChild(cell);
      return row;
    }

    createEntryRow(entry)
    {
      var row = document.createElement('tr');
      row.className = 'c-pwa-downloader__row';
      row.setAttribute('data-pwa-entry-id', entry.id);

      var titleCell = document.createElement('td');
      titleCell.className = 'c-pwa-downloader__cell';
      titleCell.textContent = entry.title || '';
      row.appendChild(titleCell);

      var statusCell = document.createElement('td');
      statusCell.className = 'c-pwa-downloader__cell';
      statusCell.textContent = this.formatStatus(entry);
      row.appendChild(statusCell);

      var actionsCell = document.createElement('td');
      actionsCell.className = 'c-pwa-downloader__cell c-pwa-downloader__cell--actions';
      actionsCell.appendChild(this.buildActions(entry));
      row.appendChild(actionsCell);

      return row;
    }

    formatStatus(entry)
    {
      var base = entry.status || '';
      if (typeof entry.progressPercent === 'number')
      {
        var percent = Math.max(0, Math.min(100, Math.round(entry.progressPercent)));
        return base ? (base + ' (' + percent + '%)') : (percent + '%');
      }
      return base || this.context.textConfig.empty;
    }

    buildActions(entry)
    {
      var container = document.createElement('div');
      container.className = 'c-pwa-downloader__actions';
      if (entry.downloadUrl)
      {
        var openButton = document.createElement('button');
        openButton.type = 'button';
        openButton.className = 'c-pwa-downloader__select';
        openButton.setAttribute('data-pwa-open', entry.id);
        openButton.textContent = '開く';
        container.appendChild(openButton);
      }
      else
      {
        var placeholder = document.createElement('span');
        placeholder.className = 'c-pwa-downloader__status-indicator';
        placeholder.textContent = '準備中';
        container.appendChild(placeholder);
      }
      return container;
    }
  }

  window.PwaDownloader = window.PwaDownloader || {};
  window.PwaDownloader.JobRender = JobRender;
})(window, document);
