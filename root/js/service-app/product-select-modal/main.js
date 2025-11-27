(function ()
{
  'use strict';

  class ProductSelectModalService
  {
    constructor(options)
    {
      this.options = options || {};
      this.jobs = null;
      this.activeSession = null;
      this.initConfig();
    }

    initConfig()
    {
      var textDefaults = {
        modalTitle: '商品を検索',
        modalDescription: '商品を選択してください。',
        keywordLabel: 'キーワード',
        searchPlaceholder: 'タイトル・コードで検索',
        emptyMessage: '選択できる商品資料が見つかりません。',
        loadingMessage: '商品資料を読み込んでいます…',
        errorMessage: '商品資料の取得に失敗しました。',
        applyLabel: '選択中を追加',
        cancelLabel: 'キャンセル',
        selectAllLabel: '全選択',
        deselectAllLabel: '選択全解除',
        actionLabel: '選択',
        multipleActionHeader: '選択',
        singleActionHeader: '操作'
      };
      var opts = this.options || {};
      this.config = {
        endpoint: window.Utils.getApiEndpoint(),
        requestType: opts.requestType || 'TargetManagementProducts',
        requestName: opts.requestName || 'TargetProductList',
        token: opts.token || window.Utils.getApiToken(),
        targetCode: opts.targetCode || '',
        resultLimit: typeof opts.resultLimit === 'number' ? opts.resultLimit : 100,
        multiple: !!opts.multiple,
        zIndex: typeof opts.zIndex === 'number' ? opts.zIndex : null,
        sessionExpiredReasons: Array.isArray(opts.sessionExpiredReasons)
          ? opts.sessionExpiredReasons.map(function (reason)
          {
            return String(reason || '').toLowerCase();
          })
          : ['login_required', 'session_expired', 'unauthorized'],
        text: Object.assign({}, textDefaults, opts.text || {})
      };
    }

    async boot()
    {
      await window.Utils.loadScriptsSync([
        'js/service-app/product-select-modal/job-data.js',
        'js/service-app/product-select-modal/job-modal.js'
      ]);
      var Services = window.Services = window.Services || {};
      var NS = Services.ProductSelectModal || (Services.ProductSelectModal = {});
      this.jobs = {
        data: new NS.JobData(this),
        modal: new NS.JobModal(this)
      };
      return this;
    }

    open(options)
    {
      if (!this.jobs || !this.jobs.modal)
      {
        throw new Error('ProductSelectModalService is not ready.');
      }
      return this.jobs.modal.open(options || {});
    }

    clearCache()
    {
      if (this.jobs && this.jobs.data && typeof this.jobs.data.clearCache === 'function')
      {
        this.jobs.data.clearCache();
      }
    }

    isSessionExpiredReason(reason)
    {
      if (!reason)
      {
        return false;
      }
      var normalized = String(reason).toLowerCase();
      return this.config.sessionExpiredReasons.indexOf(normalized) >= 0;
    }
  }

  window.Services = window.Services || {};
  window.Services.ProductSelectModal = ProductSelectModalService;

})(window, document);
