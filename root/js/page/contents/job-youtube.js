(function () {

  'use strict';

  class JobYouTube
  {
    constructor(pageInstance)
    {
      this.pageInstance = pageInstance;
    }

    async run(params)
    {
      var url = (params && params.url) || '';
      var title = (params && params.title) || '';
      if (!url) return;
      try {
        this.pageInstance.loading(true);
        await this.pageInstance.apiRegisterYouTube(url, title);
        // 成功後、必要に応じて再取得
        var res = await this.pageInstance.apiFetchList({ query: this.pageInstance.state.searchQuery, createdFrom: this.pageInstance.state.filterCreatedFrom, createdTo: this.pageInstance.state.filterCreatedTo, page: 1, pageSize: this.pageInstance.uiConfig.defaultPageSize });
        var items = (res && res.items) || [];
        this.pageInstance.state.items = items;
        this.pageInstance.state.page = res && res.page || 1;
        this.pageInstance.state.total = res && res.total || items.length;
        this.pageInstance.state.pageSize = res && res.pageSize || this.pageInstance.uiConfig.defaultPageSize;
        this.pageInstance.renderList(items);
        var selectors = this.pageInstance.selectorConfig || {};
        if (selectors.youtubeInput) {
          $(selectors.youtubeInput).val('');
        }
        if (selectors.youtubeTitleInput) {
          $(selectors.youtubeTitleInput).val('');
        }
        this.pageInstance.toast(this.pageInstance.textConfig.youtubeRegistered);
      } finally {
        this.pageInstance.loading(false);
      }
    }
  };

  window.Contents = window.Contents || {};
  window.Contents.JobYouTube = JobYouTube;

})(window, document);
