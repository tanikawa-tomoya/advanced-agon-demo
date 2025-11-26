(function ()
{
  'use strict';

  class TargetSelectModalService
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
        modalTitle: 'ターゲットを検索',
        modalDescription: '参加中のターゲットを選択してください。',
        keywordLabel: 'キーワード',
        searchPlaceholder: 'タイトル・コードで検索',
        emptyMessage: '選択できるターゲットが見つかりません。',
        loadingMessage: 'ターゲット情報を読み込んでいます…',
        errorMessage: 'ターゲット情報の取得に失敗しました。',
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
        requestType: opts.requestType || 'TargetManagementTargets',
        token: opts.token || window.Utils.getApiToken(),
        targetListType: opts.targetListType || 'TargetListParticipating',
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
        'js/service-app/target-select-modal/job-data.js',
        'js/service-app/target-select-modal/job-modal.js'
      ]);
      var Services = window.Services = window.Services || {};
      var NS = Services.TargetSelectModal || (Services.TargetSelectModal = {});
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
        throw new Error('TargetSelectModalService is not ready.');
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
  window.Services.TargetSelectModal = TargetSelectModalService;

})(window, document);
