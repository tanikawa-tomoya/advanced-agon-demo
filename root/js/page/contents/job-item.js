(function () {

  'use strict';

  class JobItem
  {
    constructor(pageInstance)
    {
      this.pageInstance = pageInstance;
    }

    async run(params)
    {
      var action = params && params.action;
      switch (action)
      {
        case 'open':
          await this.openItem(params);
          break;
        case 'download':
          await this.downloadItem(params);
          break;
        case 'delete':
          await this.deleteItems(params);
          break;
        case 'hide':
          await this.updateVisibility(params, false);
          break;
        case 'show':
          await this.updateVisibility(params, true);
          break;
        case 'update-visibility':
          await this.updateVisibility(params, params && params.isVisible);
          break;
        case 'proxy':
          await this.proxyItem(params);
          break;
        case 'bitrate':
          await this.openBitrate(params);
          break;
        case 'reference':
          await this.openUsage(params);
          break;
        case 'submit':
          await this.submitItem(params);
          break;
      }
    }

    async openItem(params)
    {
      var id = params && params.id;
      if (!id || !this.pageInstance || typeof this.pageInstance.openItem !== 'function')
      {
        return;
      }
      await this.pageInstance.openItem(String(id));
    }

    async openBitrate(params)
    {
      var id = params && params.id;
      if (!id || !this.pageInstance || typeof this.pageInstance.openBitrateVariant !== 'function')
      {
        return;
      }
      await this.pageInstance.openBitrateVariant(String(id), params || {});
    }

    async openUsage(params)
    {
      var id = params && params.id;
      if (!id || !this.pageInstance || typeof this.pageInstance.openUsageList !== 'function')
      {
        return;
      }
      await this.pageInstance.openUsageList(String(id));
    }

    async submitItem(params)
    {
      var id = params && params.id;
      if (!id || !this.pageInstance || typeof this.pageInstance.submitContentToTargets !== 'function')
      {
        return;
      }
      await this.pageInstance.submitContentToTargets(String(id));
    }

    async downloadItem(params)
    {
      if (!this.pageInstance || typeof this.pageInstance.downloadItem !== 'function')
      {
        return;
      }
      var id = params && params.id;
      if (!id)
      {
        return;
      }
      await this.pageInstance.downloadItem(String(id));
    }

    async deleteItems(params)
    {
      var ids = (params && params.ids) || [];
      if (!ids.length) return;

      // 先行実装に合わせて最低限の確認（confirm を想定）
      var confirmService = this.pageInstance.confirmDialogService || (this.pageInstance.services && this.pageInstance.services.confirmDialog);
      var ok = await confirmService.open(this.pageInstance.textConfig.deleteConfirm, { type: 'warning' });
      if (!ok) return;

      try {
        this.pageInstance.loading(true);
        if (ids.length === 1) {
          await this.pageInstance.apiDeleteOne(ids[0]);
        } else {
          await this.pageInstance.apiBulkDelete(ids);
        }
        // 再取得
        var res = await this.pageInstance.apiFetchList({ query: this.pageInstance.state.searchQuery, kind: this.pageInstance.state.filterKind, visibility: this.pageInstance.state.filterVisibility, page: 1, pageSize: this.pageInstance.uiConfig.defaultPageSize });
        var items = (res && res.items) || [];
        this.pageInstance.state.items = items;
        this.pageInstance.state.page = res && res.page || 1;
        this.pageInstance.state.total = res && res.total || items.length;
        this.pageInstance.state.pageSize = res && res.pageSize || this.pageInstance.uiConfig.defaultPageSize;
        this.pageInstance.renderList(items);
        this.pageInstance.toast(this.pageInstance.textConfig.deleted);
      } finally {
        this.pageInstance.loading(false);
      }
    }

    async proxyItem(params)
    {
      var id = params && params.id;
      if (!id || !this.pageInstance)
      {
        return;
      }
      var item = this.pageInstance.getItemById(id);
      if (item && item.kind === 'youtube')
      {
        this.pageInstance.toast(this.pageInstance.textConfig.youtubeProxyUnavailable || this.pageInstance.textConfig.proxyUnavailable);
        return;
      }
      if (!item || item.kind !== 'movie')
      {
        this.pageInstance.toast(this.pageInstance.textConfig.proxyUnavailable);
        return;
      }
      await this.pageInstance.proxyItem(String(id));
    }

    async updateVisibility(params, isVisible)
    {
      var ids = (params && params.ids) || [];
      if (!ids.length) return;

      var nextVisible = typeof isVisible === 'boolean'
        ? isVisible
        : (isVisible === 1 || isVisible === '1' || String(isVisible).toLowerCase() === 'true');

      try {
        this.pageInstance.loading(true);
        for (var i = 0; i < ids.length; i += 1)
        {
          var targetId = ids[i];
          if (!targetId)
          {
            continue;
          }
          // eslint-disable-next-line no-await-in-loop
          await this.pageInstance.apiUpdateVisibility(targetId, nextVisible);
        }
        var res = await this.pageInstance.apiFetchList({
          query: this.pageInstance.state.searchQuery,
          kind: this.pageInstance.state.filterKind,
          visibility: this.pageInstance.state.filterVisibility,
          page: 1,
          pageSize: this.pageInstance.uiConfig.defaultPageSize
        });
        var items = (res && res.items) || [];
        this.pageInstance.state.items = items;
        this.pageInstance.state.page = res && res.page || 1;
        this.pageInstance.state.total = res && res.total || items.length;
        this.pageInstance.state.pageSize = res && res.pageSize || this.pageInstance.uiConfig.defaultPageSize;
        this.pageInstance.renderList(items);
        var toastKey = nextVisible ? 'visibilityShown' : 'visibilityHidden';
        var message = this.pageInstance.textConfig[toastKey] || this.pageInstance.textConfig.saved;
        this.pageInstance.toast(message);
      } finally {
        this.pageInstance.loading(false);
      }
    }
  };

  window.Contents = window.Contents || {};
  window.Contents.JobItem = JobItem;

})(window, document);
