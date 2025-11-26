(function () {

  'use strict';

  class JobInit
  {
    constructor(pageInstance)
    {
      this.pageInstance = pageInstance;
    }

    async run(params)
    {
      this.pageInstance.loading(true);
      try
      {
        var page = (params && params.page) || 1;
        var res = await this.pageInstance.apiFetchList({ query: this.pageInstance.state.searchQuery, kind: this.pageInstance.state.filterKind, visibility: this.pageInstance.state.filterVisibility, page: page, pageSize: this.pageInstance.uiConfig.defaultPageSize });
        var items = (res && res.items) || [];
        this.pageInstance.state.items = items;
        this.pageInstance.state.page = res && res.page || page;
        this.pageInstance.state.total = res && res.total || items.length;
        this.pageInstance.renderList(items);
      }
      finally
      {
        this.pageInstance.loading(false);
      }
    }
  }
  
  window.Contents = window.Contents || {};
  window.Contents.JobInit = JobInit;

})(window, document);
