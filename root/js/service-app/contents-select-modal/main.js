(function ()
{
  'use strict';

  class ContentsSelectModalService
  {
    constructor(options)
    {
      this.options = options || {};
      this.jobs = null;
      this.activeSession = null;
      this.initConfig();
    }

    buildApiConfig(options)
    {
      var opts = options || {};
      var body = document.body || {};
      var dataset = body.dataset || {};
      var requestType = opts.requestType || dataset.apiRequestType || 'Contents';
      var listType = opts.listType || 'ContentList';
      var endpoint = opts.endpoint || dataset.apiEndpoint || '';
      var token = opts.token || dataset.apiToken || '';
      var utils = window.Utils;

      if (utils && typeof utils.buildApiRequestOptions === 'function')
      {
        try
        {
          var defaults = utils.buildApiRequestOptions(requestType, listType, {});
          if (!endpoint && defaults && typeof defaults.url === 'string')
          {
            endpoint = defaults.url;
          }
          if (!token && defaults && defaults.data && typeof defaults.data.get === 'function')
          {
            token = defaults.data.get('token') || token;
          }
        }
        catch (_err)
        {
          // ignore
        }
      }

      if (!endpoint && utils && typeof utils.getApiEndpoint === 'function')
      {
        endpoint = utils.getApiEndpoint();
      }

      if (!token && utils && typeof utils.getApiToken === 'function')
      {
        token = utils.getApiToken();
      }

      return {
        requestType: requestType,
        listType: listType,
        endpoint: endpoint,
        token: token
      };
    }

    getApiConfig(preferredType)
    {
      var base = this.config || {};
      var overrides = preferredType ? { listType: preferredType } : {};
      return this.buildApiConfig(Object.assign({}, base, overrides));
    }

    initConfig()
    {
      var textDefaults = {
        modalTitle: 'コンテンツを選択',
        modalDescription: '',
        keywordLabel: 'フリーワード',
        searchPlaceholder: 'タイトル・説明・コードで検索',
        kindLabel: '種別',
        viewListLabel: 'リスト',
        viewPanelLabel: 'パネル',
        emptyMessage: '表示できるコンテンツが見つかりません。',
        loadingMessage: 'コンテンツ情報を読み込んでいます…',
        errorMessage: 'コンテンツ情報の取得に失敗しました。',
        applyLabel: '選択中を追加',
        cancelLabel: 'キャンセル',
        selectAllLabel: '全選択',
        deselectAllLabel: '選択全解除',
        actionLabel: '選択',
        previewLabel: 'プレビュー',
        previewUnavailableMessage: 'プレビューを表示できませんでした。',
        previewUnsupportedMessage: 'プレビューできない形式です。',
        emptySelectionMessage: '追加するコンテンツを選択してください。'
      };
      var opts = this.options || {};
      var apiConfig = this.buildApiConfig(opts);
      this.config = {
        endpoint: apiConfig.endpoint,
        requestType: apiConfig.requestType,
        listType: apiConfig.listType,
        token: apiConfig.token,
        resultLimit: typeof opts.resultLimit === 'number' ? opts.resultLimit : 200,
        multiple: !!opts.multiple,
        zIndex: typeof opts.zIndex === 'number' ? opts.zIndex : null,
        text: Object.assign({}, textDefaults, opts.text || {})
      };
    }

    async boot()
    {
      await window.Utils.loadScriptsSync([
        'js/service-app/button/main.js',
        'js/service-app/toast/main.js',
        'js/service-app/contents-select-modal/job-data.js',
        'js/service-app/contents-select-modal/job-modal.js'
      ]);
      var Services = window.Services = window.Services || {};
      var NS = Services.ContentsSelectModal || (Services.ContentsSelectModal = {});
      this.buttonService = new window.Services.button();
      var toastOptions = (this.options && this.options.toastOptions)
        ? this.options.toastOptions
        : { position: 'top-right', duration: 3000 };
      this.toastService = (this.options && this.options.toastService)
        ? this.options.toastService
        : new window.Services.Toast(toastOptions);
      await Promise.all([
        this.buttonService.boot(),
        this.toastService.boot()
      ]);
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
        throw new Error('ContentsSelectModalService is not ready.');
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
  }

  window.Services = window.Services || {};
  window.Services.ContentsSelectModal = ContentsSelectModalService;

})(window, document);
