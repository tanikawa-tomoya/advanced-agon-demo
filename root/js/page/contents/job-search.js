(function () {

  'use strict';

  class JobSearch
  {
    constructor(pageInstance)
    {
      this.pageInstance = pageInstance;
    }

    async run(params)
    {
        var q = (params && params.query) || '';
        try {
          this.pageInstance.loading(true);
        var res = await this.pageInstance.apiFetchList({ query: q, kind: this.pageInstance.state.filterKind, visibility: this.pageInstance.state.filterVisibility, createdFrom: this.pageInstance.state.filterCreatedFrom, createdTo: this.pageInstance.state.filterCreatedTo, page: 1, pageSize: this.pageInstance.uiConfig.defaultPageSize });
        var items = (res && res.items) || [];
        this.pageInstance.state.items = items;
        this.pageInstance.state.page = res && res.page || 1;
        this.pageInstance.state.total = res && res.total || items.length;
        this.pageInstance.state.pageSize = res && res.pageSize || this.pageInstance.uiConfig.defaultPageSize;
        this.pageInstance.renderList(items);
      } finally {
        this.pageInstance.loading(false);
      }
    }
  };

  window.Contents = window.Contents || {};
  window.Contents.JobSearch = JobSearch;
  
})(window, document);
