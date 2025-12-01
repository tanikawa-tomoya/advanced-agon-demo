(function () {

  'use strict';
  
  class Contents
  {
    constructor(options)
    {
      this.options = options || {};
      this.path = 'js/page/contents'; // jobスクリプトの相対パス基点
      this.filterStorageKey = 'contents.filters';

      // 状態（必要に応じて旧 general.js のSTATEを統合）
      this.state = {
        items: [],
        searchQuery: '',
        filterKind: '',
        filterVisibility: 'visible',
        viewMode: 'list',
        page: 1,
        pageSize: 20,
        total: 0,
        uploadQueue: [],
        isUploadingQueue: false,
        uploadModalSnapshot: [],
        profile: null,
      };

      // サービス（header, toast, loading-overlay, help-modal など）
      this.services = {
        header: null,
        toast: null,
        loading: null,
        help: null,
        breadcrumb: null
      };

      this.confirmDialogService = null;
      this.audioModalService = null;
      this.videoModalService = null;
      this.youtubeVideoModalService = null;
      this.imageModalService = null;
      this.pdfModalService = null;
      this.downloadModalService = null;
      this.targetSelectModalService = null;
      this.buttonService = null;
      this.breadcrumbService = null;
      this.infoModalService = null;
      this.contentUploaderService = null;

      this.contentsDataset = { usersContents: [], usersContentsProxy: [] };

      this._uploadModalLastActive = null;
      this._uploadModalBodyClassManaged = false;
      this._loadingOverlayNode = null;
      this._autoRefreshTimer = null;
      this._isAutoRefreshing = false;
      this._panelP5Promise = null;
      this.uploadModalKeydownHandler = this.handleUploadModalKeydown.bind(this);

      // セレクタやテキストなどの設定
      this.textConfig = {};
      this.uiConfig = {};
        this.selectorConfig = {};
        this.apiConfig = {};
    }

    async boot()
    {
      if (await window.Services.sessionInstance.getUser() == null) {
        window.location.href = "/login.html";
        return;
      }
      
      try {
        this.initConfig();
        await this.initServices();
        const profile = await this.ensureProfile();
        if (!this.isContentsManagementEnabled(profile)) {
          window.location.href = '/dashboard';
          return;
        }
        this.loadSavedFilters();
        this.renderBreadcrumbs();
        await this.initContentUploader();
        this.renderUploaderButtons();
        this.renderRefreshButton();
        this.updateUploadModal([]);
        this.updateEvent();
        await this.runInitialLoad();
        this.startAutoRefresh();
      } catch (err) {
        this.onError(err);
      }
    }
    
    initConfig()
    {
      // テキスト・メッセージ
        this.textConfig = Object.freeze({
        loading: '読み込み中…',
        loadDone: '読み込みが完了しました',
        saving: '保存中…',
        saved: '保存しました',
        deleting: '削除中…',
        deleted: '削除しました',
        deleteConfirm: '選択した項目を削除します。よろしいですか？',
        uploadStart: 'アップロードを開始します',
        uploadDone: 'アップロードが完了しました',
        uploadStartButtonLabel: 'アップロードを開始',
        uploadStartButtonInProgressLabel: 'アップロード中…',
        uploadSelectButtonLabel: 'ファイルを選択',
        uploadDropMessage: 'ファイルをドラッグ＆ドロップ\nまたは「ファイルを選択」で追加',
        uploadQueueEmptyMessage: 'ファイルを選択するとここに表示されます。',
        uploadQueuePendingStatus: 'アップロード待機中',
        uploadQueueUploadingStatus: 'アップロード中…',
        uploadQueueDoneStatus: 'アップロードが完了しました',
        uploadQueueErrorStatus: 'エラーが発生しました',
        youtubeSubmitButtonLabel: 'YouTube動画を登録',
        youtubeRegistered: 'YouTube の登録が完了しました',
        uploadModalIdle: 'アップロードを開始すると進行状況が表示されます',
        uploadModalInProgress: 'アップロード中です…',
        uploadModalComplete: 'アップロードが完了しました',
        uploadModalButtonLabel: '完了',
        uploadModalButtonInProgressLabel: 'アップロード中…',
        previewUnavailable: 'このファイル形式はプレビューに対応していません',
        downloadPreparing: 'ダウンロードを準備しています…',
        downloadReady: 'ダウンロードを開始しました',
        downloadFailed: 'ダウンロードに失敗しました',
        downloadUnavailable: 'ダウンロードできるファイルが見つかりません。',
        downloadModalTitle: 'ダウンロード',
        downloadModalSubtitle: 'ファイルの取得状況',
        usageButtonLabel: '参照',
        usageDialogTitle: 'コンテンツの使用箇所',
        usageDialogIntro: 'このコンテンツが利用されているターゲットの一覧です。',
        usageDialogEmpty: 'このコンテンツが使用されている箇所はまだありません。',
        usageOpenLabel: '開く',
        usageLoading: '使用箇所を取得しています…',
        usageError: '使用箇所の取得に失敗しました',
        usageTypeLabels: Object.freeze({
          guidance: 'ガイダンスコンテンツ',
          reference: '参考資料',
          submission: '提出',
          review: 'レビュー'
        }),
        submitButtonLabel: '提出',
        submitHoverLabel: 'ターゲットに提出',
        submitSelectTitle: '提出先を選択',
        submitSelectDescription: '参加中のターゲットに提出します。提出先を選択してください。',
        submitLoading: '提出を登録しています…',
        submitSuccess: '提出を登録しました。',
        submitError: '提出に失敗しました。',
        submitUnavailable: '提出に利用できるターゲットを取得できませんでした。',
        submitNoSelection: '提出先が選択されていません。',
        proxyUnavailable: '動画以外では低レート動画を作成できません。',
        youtubeProxyUnavailable: 'YouTube動画では低レート動画を作成できません。',
        proxyRequested: '低レート動画の作成を受け付けました。',
        proxyQueued: '低レート動画の作成をキューに登録しました。',
        proxyAlreadyProcessing: '低レート動画の作成を開始済みです。',
        proxyCompleted: '低レート動画は既に作成済みです。',
        proxySourceMissing: '元ファイルが見つからないため低レート動画を作成できません。',
        proxyEncoding: '低レート動画をエンコード中です…',
        proxyButtonLabel: '低レート',
        visibilityHideLabel: '非表示',
        visibilityShowLabel: '表示化',
        visibilityHidden: 'コンテンツを非表示にしました',
        visibilityShown: 'コンテンツを表示しました',
        youtubeDownloadUnavailable: 'YouTube動画はダウンロードできません。',
        refreshButtonLabel: '再読み込み',
        error: '処理中にエラーが発生しました'
      });

      // UI 設定
      this.uiConfig = Object.freeze({
        debounceMs: 300,
        defaultPageSize: 20,
        autoRefreshIntervalMs: 0
      });

      this.state.pageSize = this.uiConfig.defaultPageSize;

      // セレクタ
      this.selectorConfig = Object.freeze({
        // ヘルプ
        helpButton: '#contents-help-button',

        // 検索
        searchInput: '[data-cp-search]',
        filterSelect: '[data-cp-filter-kind]',
        visibilityFilterSelect: '[data-cp-filter-visibility]',

        // 更新・再取得
        refreshButton: '[data-cp-refresh]',

        // リスト領域
        listContainer: '[data-cp="list"]',
        panelListContainer: '[data-cp="panel-list"]',
        listWrapper: '[data-cp-list-wrapper]',
        panelWrapper: '[data-cp-panel-wrapper]',
        listEmpty: '[data-cp-empty]',
        statusMessage: '[data-cp="status"]',
        pagination: '[data-cp-pagination]',
        paginationStatus: '[data-cp-pagination-status]',
        paginationButton: '[data-cp-page]',
        paginationPages: '[data-cp-pagination-pages]',
        paginationPrevButton: '[data-cp-pagination-prev]',
        paginationNextButton: '[data-cp-pagination-next]',

        // 表示モード
        viewModeButton: '[data-cp-view-mode]',

        // 個別操作
        openButton: '[data-cp-open]',
        submitButton: '[data-cp-submit]',
        referenceButton: '[data-cp-reference]',
        proxyButton: '[data-cp-proxy]',
        downloadButton: '[data-cp-download]',
        bitrateButton: '[data-cp-bitrate]',
        visibilityToggleButton: '[data-cp-visibility-toggle]',
        deleteButton: '[data-cp-delete]',

        // タブ
        tabsRoot: '[data-cp-tabs]',
        tabButton: '[data-cp-tab]',
        tabPanel: '[data-cp-panel]',

        // アップロード
        uploadHost: '[data-content-upload-host]',

        // YouTube 登録フォーム
        youtubeForm: '[data-cp-youtube-form]',
        youtubeInput: '[data-cp-youtube-url]',
        youtubeTitleInput: '[data-cp-youtube-title]',
        youtubeSubmitButton: '[data-cp-youtube-submit]',

        // アップロード進行モーダル
        uploadModal: '#contents-upload-modal',
        uploadModalStatus: '[data-cp-upload-modal-status]',
        uploadModalSummary: '[data-cp-upload-modal-summary]',
        uploadModalProgress: '[data-cp-upload-modal-progress]',
        uploadModalProgressBar: '[data-cp-upload-modal-progress-bar]',
        uploadModalList: '[data-cp-upload-modal-list]',
        uploadModalEmpty: '[data-cp-upload-modal-empty]',
        uploadModalCompleteButton: '[data-cp-upload-modal-complete]'
      });

      // API (必要に応じて差し替え)
      var body = document.body || {};
      var dataset = body.dataset || {};
      var apiRequestType = dataset.apiRequestType || 'Contents';
      var apiEndpoint = dataset.apiEndpoint || '';
      var apiToken = dataset.apiToken || '';
      if ((!apiEndpoint || !apiToken) && window.Utils && typeof window.Utils.buildApiRequestOptions === 'function')
      {
        try
        {
          var apiDefaults = window.Utils.buildApiRequestOptions(apiRequestType, 'ContentList', {});
          if (!apiEndpoint && apiDefaults && typeof apiDefaults.url === 'string')
          {
            apiEndpoint = apiDefaults.url;
          }
          if (!apiToken && apiDefaults && apiDefaults.data && typeof apiDefaults.data.get === 'function')
          {
            apiToken = apiDefaults.data.get('token') || apiToken;
          }
        }
        catch (_err)
        {
          // ignore fallback errors
        }
      }
      if (!apiEndpoint)
      {
        apiEndpoint = window.Utils.getApiEndpoint();
      }
        this.apiConfig = Object.freeze({
        requestType: apiRequestType,
        endpoint: apiEndpoint,
        token: apiToken,
        listTypes: ['ContentList'],
        visibilityUpdateType: 'ContentVisibilityUpdate',
        deleteTypes: {
          movie: 'ContentDelete',
          image: 'ContentDelete',
          audio: 'ContentDelete',
          file: 'ContentDelete'
        },
        uploadTargets: {
          movie: { type: 'ContentUpload', field: 'file', label: '動画' },
          image: { type: 'ContentUpload', field: 'file', label: '画像' },
          audio: { type: 'ContentUpload', field: 'file', label: '音声' },
          file: { type: 'ContentUpload', field: 'file', label: 'ファイル' }
        },
        youtubePrefix: 'content-youtube-',
        youtubeSuffix: '.json'
      });
    }

    renderUploaderButtons()
    {
      var svc = this.buttonService;
      if (!svc || typeof svc.createActionButton !== 'function') {
        return;
      }
      var selectors = this.selectorConfig || {};
      var configs = [
        {
          selector: selectors.youtubeSubmitButton,
          label: this.textConfig.youtubeSubmitButtonLabel,
          type: 'submit',
          attributes: { 'data-cp-youtube-submit': '' },
          extraClass: 'content-uploader__youtube-submit'
        }
      ];
      for (var i = 0; i < configs.length; i += 1) {
        this._renderUploaderButton(svc, configs[i]);
      }
    }

    renderRefreshButton()
    {
      var service = this.buttonService;
      var selectors = this.selectorConfig || {};
      var selector = selectors.refreshButton;
      if (!service || typeof service.createActionButton !== 'function' || !selector) {
        return;
      }
      var placeholder = document.querySelector(selector);
      if (!placeholder || !placeholder.parentNode) {
        return;
      }
      var label = (this.textConfig && this.textConfig.refreshButtonLabel) || '再読み込み';
      var button = service.createActionButton('expandable-icon-button/reload', {
        label: label,
        ariaLabel: label,
        hoverLabel: label,
        attributes: { 'data-cp-refresh': '' }
      });
      if (!button) {
        return;
      }
      if (placeholder.id) {
        button.id = placeholder.id;
      }
      if (placeholder.name) {
        button.name = placeholder.name;
      }
      button.setAttribute('type', 'button');
      placeholder.parentNode.replaceChild(button, placeholder);
    }

    _renderUploaderButton(service, config)
    {
      if (!service || !config || !config.selector) {
        return;
      }
      var nodes = document.querySelectorAll(config.selector);
      if (!nodes || !nodes.length) {
        return;
      }
      for (var i = 0; i < nodes.length; i += 1) {
        var placeholder = nodes[i];
        if (!placeholder || !placeholder.parentNode) {
          continue;
        }
        var resolvedLabel = '';
        if (typeof config.label === 'string' && config.label) {
          resolvedLabel = config.label;
        } else {
          resolvedLabel = (placeholder.textContent || '').trim();
        }
        var typeAttr = config.type || placeholder.getAttribute('type') || 'button';
        var attributes = Object.assign({}, config.attributes || {});
        var attributeKeys = Object.keys(attributes);
        for (var j = 0; j < attributeKeys.length; j += 1) {
          var attrKey = attributeKeys[j];
          if (attributes[attrKey] === undefined || attributes[attrKey] === null) {
            delete attributes[attrKey];
          }
        }
        var options = {
          label: resolvedLabel,
          type: typeAttr,
          attributes: attributes
        };
        var button = service.createActionButton('content-uploader-primary', options);
        if (!button) {
          continue;
        }
        if (config.extraClass) {
          button.className = button.className
            ? (button.className + ' ' + config.extraClass)
            : config.extraClass;
        }
        if (placeholder.id) {
          button.id = placeholder.id;
        }
        if (placeholder.name) {
          button.name = placeholder.name;
        }
        if (placeholder.disabled) {
          button.disabled = true;
          button.setAttribute('disabled', 'disabled');
        }
        button.setAttribute('type', typeAttr);
        placeholder.parentNode.replaceChild(button, placeholder);
      }
    }

    async initContentUploader()
    {
      var selector = this.selectorConfig && this.selectorConfig.uploadHost;
      var container = selector ? document.querySelector(selector) : null;
      if (!container) {
        return;
      }

      await window.Utils.loadScriptsSync(['/js/service-app/content-uploader/main.js']);

      var self = this;
      this.contentUploaderService = new window.Services.ContentUploader({
        container: container,
        multiple: true,
        autoCleanup: true,
        buttonService: this.buttonService,
        text: {
          dropMessage: this.textConfig.uploadDropMessage,
          selectButton: this.textConfig.uploadSelectButtonLabel,
          startButton: this.textConfig.uploadStartButtonLabel,
          startButtonInProgress: this.textConfig.uploadStartButtonInProgressLabel,
          emptyQueue: this.textConfig.uploadQueueEmptyMessage,
          pending: this.textConfig.uploadQueuePendingStatus,
          uploading: this.textConfig.uploadQueueUploadingStatus,
          done: this.textConfig.uploadQueueDoneStatus,
          error: this.textConfig.uploadQueueErrorStatus
        },
        uploadFile: function (file, options) {
          return self.apiUploadFile(file, options || {});
        },
        onQueueChange: function (queue, detail) {
          self.handleUploadQueueChange(queue, detail);
        },
        onStart: function (queue) {
          return self.handleUploadStart(queue);
        },
        onComplete: function (payload) {
          return self.handleUploadComplete(payload);
        }
      });

      await this.contentUploaderService.boot();
      this.contentUploaderService.mount(container);
    }

    async initServices()
    {
        const scripts = [
          { src: '/js/service-app/header/main.js' },
          { src: '/js/service-app/toast/main.js' },
          { src: '/js/service-app/loading/main.js' },
          { src: '/js/service-app/help-modal/main.js' },
          { src: '/js/service-app/info-modal/main.js' },
          { src: '/js/service-app/button/main.js' },
          { src: '/js/service-app/confirm-dialog/main.js' },
          { src: '/js/service-app/target-select-modal/main.js' },
          { src: '/js/service-app/breadcrumb/main.js' },
          { src: '/js/service-app/audio-modal/main.js' },
          { src: '/js/service-app/video-modal/main.js' },
        { src: '/js/service-app/youtube-video-modal/main.js' },
        { src: '/js/service-app/image-modal/main.js' },
        { src: '/js/service-app/pdf-modal/main.js' },
        { src: '/js/service-app/download-modal/main.js' }
      ];
      await window.Utils.loadScriptsSync(scripts);

      this.headerService = new window.Services.Header();
      this.toastService = new window.Services.Toast();
      this.loadingService = new window.Services.Loading();
      this.helpModalService = new window.Services.HelpModal();
      this.infoModalService = new window.Services.InfoModal();
      this.buttonService = new window.Services.button();
      this.confirmDialogService = new window.Services.ConfirmDialog();
      this.targetSelectModalService = new window.Services.TargetSelectModal({ targetListType: 'TargetListParticipating' });
      const breadcrumbContainer = document.querySelector('.screen-page') || document.body;
      this.breadcrumbService = new window.Services.Breadcrumb({ container: breadcrumbContainer });
      this.audioModalService = new window.Services.AudioModal();
      this.videoModalService = new window.Services.VideoModal({
        api: {
          requestType: this.apiConfig.requestType,
          apiEndpoint: this.apiConfig.endpoint,
          apiToken: this.apiConfig.token
        }
      });
      this.youtubeVideoModalService = new window.Services.YoutubeVideoModal({ autoplay: false });
      this.imageModalService = new window.Services.ImageModal();
      this.pdfModalService = new window.Services.PdfModal({
        showDownload: true,
        showOpenInNewTab: true
      });
      this.downloadModalService = new window.Services.DownloadModal({
        title: this.textConfig.downloadModalTitle,
        subtitle: this.textConfig.downloadModalSubtitle
      });

      this.services = {
        header: this.headerService,
        toast: this.toastService,
        loading: this.loadingService,
        help: this.helpModalService,
        info: this.infoModalService,
        button: this.buttonService,
        confirmDialog: this.confirmDialogService,
        targetSelectModal: this.targetSelectModalService,
        breadcrumb: this.breadcrumbService,
        audioModal: this.audioModalService,
        videoModal: this.videoModalService,
        youtubeVideoModal: this.youtubeVideoModalService,
        imageModal: this.imageModalService,
        pdfModal: this.pdfModalService,
        downloadModal: this.downloadModalService
      };

      await Promise.all([
        this.headerService.boot('.site-header'),
        this.toastService.boot(),
        this.loadingService.boot(),
        this.helpModalService.boot(),
        this.infoModalService.boot(),
        this.buttonService.boot(),
        this.confirmDialogService.boot(),
        this.targetSelectModalService.boot(),
        this.breadcrumbService.boot(breadcrumbContainer),
        this.audioModalService.boot(),
        this.videoModalService.boot(),
        this.youtubeVideoModalService.boot(),
        this.imageModalService.boot(),
        this.pdfModalService.boot(),
        this.downloadModalService.boot()
      ]);
    }

    loading(on, options)
    {
      var service = this.loadingService || (this.services && this.services.loading);
      if (!service)
      {
        return;
      }

      var opts;
      if (options == null)
      {
        opts = {};
      }
      else if (typeof options === 'string' || typeof options === 'number')
      {
        opts = { message: options };
      }
      else
      {
        opts = options;
      }

      var message = opts.message || (this.textConfig && this.textConfig.loading) || '';
      var container = opts.container || document.body;
      if (typeof container === 'string')
      {
        container = document.querySelector(container) || document.body;
      }
      else if (container && container.jquery)
      {
        container = container[0];
      }

      if (on)
      {
        if (this._loadingOverlayNode)
        {
          if (typeof service.update === 'function')
          {
            service.update(this._loadingOverlayNode, { message: message });
          }
          return;
        }
        if (typeof service.show === 'function')
        {
          this._loadingOverlayNode = service.show(message, {
            container: container,
            position: 'center',
            dismissOnBackdrop: false,
            dismissOnEsc: false
          });
        }
        return;
      }

      if (this._loadingOverlayNode && typeof service.hide === 'function')
      {
        service.hide(this._loadingOverlayNode);
        this._loadingOverlayNode = null;
      }
      else if (typeof service.hide === 'function')
      {
        service.hide();
      }
    }

    renderBreadcrumbs()
    {
      const service = this.services && this.services.breadcrumb;
      if (!service)
      {
        return;
      }
      const profile = this.state && this.state.profile ? this.state.profile : null;
      service.render([
        { label: 'ダッシュボード', href: this._resolveDashboardHref(profile) },
        { label: 'コンテンツ管理' }
      ]);
    }

    _resolveDashboardHref(profile)
    {
      return this._isPrivilegedProfile(profile) ? 'dashboard.html' : 'dashboard.html';
    }

    _isPrivilegedProfile(profile)
    {
      if (!profile)
      {
        return false;
      }
      const isSupervisor = profile.isSupervisor === true || profile.isSupervisor === 1 || profile.isSupervisor === '1';
      const isOperator = profile.isOperator === true || profile.isOperator === 1 || profile.isOperator === '1';
      return !!(isSupervisor || isOperator);
    }

    /**
     * 旧 event.js -> main.updateEvent()
     * jQuery の .off().on() を用いた委譲を集約
     */
    updateEvent() {
      var selectors = this.selectorConfig;
      var self = this;

      this.applySavedFiltersToUI();
      $(selectors.visibilityFilterSelect).val(this.state.filterVisibility);

      // 検索（入力）
      (function () {
        var timer = null;
        $(document)
          .off('input.contents', selectors.searchInput)
          .on('input.contents', selectors.searchInput, function () {
            if (timer) {
              clearTimeout(timer);
            }
            timer = setTimeout(async function () {
              try {
                var val = $(selectors.searchInput).val() || '';
                self.state.searchQuery = String(val);
                self.saveFilterState();
                await window.Utils.loadScriptsSync([self.path + '/job-search.js'], { cache: true });
                var C = window.Contents && window.Contents.JobSearch;
                if (C) {
                  await new C(self).run({ query: self.state.searchQuery });
                }
              } catch (err) {
                self.onError(err);
              }
            }, self.uiConfig.debounceMs);
          });
      })();

      // 種別フィルター
      $(document)
        .off('change.contents', selectors.filterSelect)
        .on('change.contents', selectors.filterSelect, async function () {
          try {
            var kind = $(this).val() || '';
            self.state.filterKind = String(kind);
            self.saveFilterState();
            await window.Utils.loadScriptsSync([self.path + '/job-refresh.js'], { cache: true });
            var RefreshJob = window.Contents && window.Contents.JobRefresh;
            if (RefreshJob) {
              await new RefreshJob(self).run({ page: 1 });
            }
          } catch (err) {
            self.onError(err);
          }
        });

      // 表示状態フィルター
      $(document)
        .off('change.contents', selectors.visibilityFilterSelect)
        .on('change.contents', selectors.visibilityFilterSelect, async function () {
          try {
            var visibility = $(this).val() || 'all';
            self.state.filterVisibility = String(visibility || 'all');
            self.saveFilterState();
            await window.Utils.loadScriptsSync([self.path + '/job-refresh.js'], { cache: true });
            var RefreshJobVisibility = window.Contents && window.Contents.JobRefresh;
            if (RefreshJobVisibility) {
              await new RefreshJobVisibility(self).run({ page: 1 });
            }
          } catch (err) {
            self.onError(err);
          }
        });

      async function runTabJob(targetTab) {
        if (!targetTab) return;
        await window.Utils.loadScriptsSync([self.path + '/job-tab.js'], { cache: true });
        var TabJob = window.Contents && window.Contents.JobTab;
        if (TabJob) {
          await new TabJob(self).run({ tab: targetTab });
        }
      }

      async function runItemJob(action, payload) {
        var params = payload || {};
        params.action = action;
        await window.Utils.loadScriptsSync([self.path + '/job-item.js'], { cache: true });
        var ItemJob = window.Contents && window.Contents.JobItem;
        if (ItemJob) {
          await new ItemJob(self).run(params);
        }
      }

      // タブ切り替え（クリック）
      $(document)
        .off('click.contents', selectors.tabButton)
        .on('click.contents', selectors.tabButton, async function (e) {
          e.preventDefault();
          try {
            var tab = $(this).attr('data-cp-tab');
            if (!tab) return;
            await runTabJob(tab);
          } catch (err) {
            self.onError(err);
          }
        });

      // タブ切り替え（左右キー）
      $(document)
        .off('keydown.contents', selectors.tabButton)
        .on('keydown.contents', selectors.tabButton, async function (e) {
          var key = e.key || '';
          var which = e.which;
          var normalizedKey = key;
          if (!normalizedKey) {
            if (which === 37) normalizedKey = 'ArrowLeft';
            if (which === 39) normalizedKey = 'ArrowRight';
            if (which === 9) normalizedKey = 'Tab';
          }
          var isArrowRight = normalizedKey === 'ArrowRight';
          var isArrowLeft = normalizedKey === 'ArrowLeft';
          var isTabKey = normalizedKey === 'Tab';
          if (!isArrowRight && !isArrowLeft && !isTabKey) {
            return;
          }
          e.preventDefault();
          try {
            var $scope = $(this).closest(selectors.tabsRoot);
            var $tabs = $scope.length ? $scope.find(selectors.tabButton) : $(selectors.tabButton);
            if (!$tabs.length) return;
            var currentIndex = $tabs.index(this);
            if (currentIndex < 0) return;
            var moveForward = isArrowRight || (isTabKey && !e.shiftKey);
            var moveBackward = isArrowLeft || (isTabKey && e.shiftKey);
            var nextIndex = currentIndex;
            if (moveForward) {
              nextIndex = (currentIndex + 1) % $tabs.length;
            } else if (moveBackward) {
              nextIndex = (currentIndex - 1 + $tabs.length) % $tabs.length;
            }
            if (nextIndex === currentIndex) {
              return;
            }
            var $next = $($tabs.get(nextIndex));
            var tab = $next.attr('data-cp-tab');
            if (!tab) return;
            await runTabJob(tab);
            $next.trigger('focus');
          } catch (err) {
            self.onError(err);
          }
        });

      // 更新（一覧再取得）
      $(document)
        .off('click.contents', selectors.refreshButton)
        .on('click.contents', selectors.refreshButton, async function (e) {
          e.preventDefault();
          try {
            await window.Utils.loadScriptsSync([self.path + '/job-refresh.js'], { cache: true });
            var C = window.Contents && window.Contents.JobRefresh;
            if (C) {
              await new C(self).run({ page: 1 });
            }
          } catch (err) {
            self.onError(err);
          }
        });

      // ページング
      $(document)
        .off('click.contents', selectors.paginationButton)
        .on('click.contents', selectors.paginationButton, async function (e) {
          e.preventDefault();
          if ($(this).is(':disabled')) {
            return;
          }
          try {
            var targetPage = Number($(this).attr('data-cp-page'));
            if (!targetPage || targetPage === self.state.page) {
              return;
            }
            await window.Utils.loadScriptsSync([self.path + '/job-refresh.js'], { cache: true });
            var PaginationRefresh = window.Contents && window.Contents.JobRefresh;
            if (PaginationRefresh) {
              await new PaginationRefresh(self).run({ page: targetPage });
            }
          } catch (err) {
            self.onError(err);
          }
        });

      // 表示モード切り替え
      $(document)
        .off('click.contents', selectors.viewModeButton)
        .on('click.contents', selectors.viewModeButton, function (e) {
          e.preventDefault();
          try {
            var mode = $(this).attr('data-cp-view-mode');
            self.setViewMode(mode);
          } catch (err) {
            self.onError(err);
          }
        });

      // 開く
      $(document)
        .off('click.contents', selectors.openButton)
        .on('click.contents', selectors.openButton, async function (e) {
          e.preventDefault();
          try {
            var id = $(this).attr('data-id');
            await runItemJob('open', { id: id });
          } catch (err) {
            self.onError(err);
          }
        });

      // 提出
      $(document)
        .off('click.contents', selectors.submitButton)
        .on('click.contents', selectors.submitButton, async function (e) {
          e.preventDefault();
          try {
            var id = $(this).attr('data-id');
            await runItemJob('submit', { id: id });
          } catch (err) {
            self.onError(err);
          }
        });

      // 使用箇所参照
      $(document)
        .off('click.contents', selectors.referenceButton)
        .on('click.contents', selectors.referenceButton, async function (e) {
          e.preventDefault();
          try {
            var id = $(this).attr('data-id');
            await runItemJob('reference', { id: id });
          } catch (err) {
            self.onError(err);
          }
        });

      // ビットレート別プレビュー
      $(document)
        .off('click.contents', selectors.bitrateButton)
        .on('click.contents', selectors.bitrateButton, async function (e) {
          e.preventDefault();
          try {
            var id = $(this).attr('data-id');
            var source = $(this).attr('data-bitrate-source');
            var proxyIndex = $(this).attr('data-bitrate-proxy-index');
            await runItemJob('bitrate', { id: id, source: source, proxyIndex: proxyIndex });
          } catch (err) {
            self.onError(err);
          }
        });

      // ダウンロード
      $(document)
        .off('click.contents', selectors.downloadButton)
        .on('click.contents', selectors.downloadButton, async function (e) {
          e.preventDefault();
          try {
            var id = $(this).attr('data-id');
            await runItemJob('download', { id: id });
          } catch (err) {
            self.onError(err);
          }
        });

      // 低レート生成
      $(document)
        .off('click.contents', selectors.proxyButton)
        .on('click.contents', selectors.proxyButton, async function (e) {
          e.preventDefault();
          try {
            var id = $(this).attr('data-id');
            await runItemJob('proxy', { id: id });
          } catch (err) {
            self.onError(err);
          }
        });

      // 表示状態トグル
      $(document)
        .off('click.contents', selectors.visibilityToggleButton)
        .on('click.contents', selectors.visibilityToggleButton, async function (e) {
          e.preventDefault();
          var $button = $(this);
          try {
            var id = $button.attr('data-id');
            var targetVisibleAttr = $button.attr('data-target-visible');
            var nextVisible = String(targetVisibleAttr).toLowerCase() === 'true';
            $button.prop('disabled', true);
            await runItemJob('update-visibility', { ids: [id], isVisible: nextVisible });
          } catch (err) {
            self.onError(err);
          } finally {
            $button.prop('disabled', false);
          }
        });

      // 削除（単体）
      $(document)
        .off('click.contents', selectors.deleteButton)
        .on('click.contents', selectors.deleteButton, async function (e) {
          e.preventDefault();
          try {
            var id = $(this).attr('data-id');
            await runItemJob('delete', { ids: [id] });
          } catch (err) {
            self.onError(err);
          }
        });

      // YouTube 登録
      $(document)
        .off('submit.contents', selectors.youtubeForm)
        .on('submit.contents', selectors.youtubeForm, async function (e) {
          e.preventDefault();
          try {
            var url = $(selectors.youtubeInput).val() || '';
            var title = selectors.youtubeTitleInput ? ($(selectors.youtubeTitleInput).val() || '') : '';
            await window.Utils.loadScriptsSync([self.path + '/job-youtube.js'], { cache: true });
            var C = window.Contents && window.Contents.JobYouTube;
            if (C) {
              await new C(self).run({ url: url, title: title });
            }
          } catch (err) {
            self.onError(err);
          }
        });

      // アップロードモーダルの完了
      $(document)
        .off('click.contents', selectors.uploadModalCompleteButton)
        .on('click.contents', selectors.uploadModalCompleteButton, async function (e) {
          e.preventDefault();
          if ($(this).is(':disabled')) return;
          try {
            self.closeUploadModal();
            await runTabJob('list');
            var listTab = document.querySelector('[data-cp-tab="list"]');
            if (listTab && typeof listTab.focus === 'function') {
              listTab.focus();
            }
          } catch (err) {
            self.onError(err);
          }
        });

      // ヘルプ
      $(document)
        .off('click.contents', selectors.helpButton)
        .on('click.contents', selectors.helpButton, async function (e) {
          e.preventDefault();
          try {
            await window.Utils.loadScriptsSync([self.path + '/job-help.js'], { cache: true });
            var C = window.Contents && window.Contents.JobHelp;
            if (C) {
              await new C(self).run({});
            }
          } catch (err) {
            self.onError(err);
          }
        });
    }

    handleUploadQueueChange(queue, detail)
    {
      var cloned = this.cloneUploadItems(queue);
      if (detail && typeof detail.isUploading === 'boolean') {
        this.state.isUploadingQueue = detail.isUploading;
      }
      this.state.uploadQueue = cloned;
      if (this.state.isUploadingQueue) {
        this.setUploadModalSnapshot(cloned);
      }
      this.updateUploadModal(cloned);
    }

    handleUploadStart(queue)
    {
      var cloned = this.cloneUploadItems(queue);
      this.state.uploadQueue = cloned;
      this.state.isUploadingQueue = true;
      this.setUploadModalSnapshot(cloned);
      this.openUploadModal();
      this.updateUploadModal(cloned);
      this.toast(this.textConfig.uploadStart);
    }

    async handleUploadComplete(payload)
    {
      this.state.isUploadingQueue = false;
      this.updateUploadModal(this.state.uploadQueue || []);
      var uploadedCount = payload && typeof payload.uploadedCount === 'number' ? payload.uploadedCount : 0;
      if (uploadedCount > 0) {
        await this.refreshListAfterUpload();
        this.toast(this.textConfig.uploadDone);
      }
    }

    async refreshListAfterUpload()
    {
      await window.Utils.loadScriptsSync([this.path + '/job-refresh.js'], { cache: true });
      var JobRefresh = window.Contents && window.Contents.JobRefresh;
      if (typeof JobRefresh === 'function') {
        await new JobRefresh(this).run({ page: 1 });
      }
    }

    async runInitialLoad()
    {
      await window.Utils.loadScriptsSync([this.path + '/job-init.js'], { cache: true });
      var JobInit = window.Contents && window.Contents.JobInit;
      if (typeof JobInit === 'function')
      {
        await new JobInit(this).run({ page: 1 });
      }
    }

    loadSavedFilters()
    {
      var stored = window.localStorage.getItem(this.filterStorageKey) || '';
      if (!stored)
      {
        return;
      }
      try
      {
        var parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object')
        {
          if (typeof parsed.searchQuery === 'string')
          {
            this.state.searchQuery = parsed.searchQuery;
          }
          if (typeof parsed.filterKind === 'string')
          {
            this.state.filterKind = parsed.filterKind;
          }
          if (typeof parsed.filterVisibility === 'string')
          {
            this.state.filterVisibility = parsed.filterVisibility;
          }
        }
      }
      catch (err)
      {
        // 保存データが壊れている場合は無視
      }
    }

    applySavedFiltersToUI()
    {
      var selectors = this.selectorConfig;
      if (selectors.searchInput)
      {
        $(selectors.searchInput).val(this.state.searchQuery);
      }
      if (selectors.filterSelect)
      {
        $(selectors.filterSelect).val(this.state.filterKind);
      }
    }

    saveFilterState()
    {
      var payload = {
        searchQuery: this.state.searchQuery,
        filterKind: this.state.filterKind,
        filterVisibility: this.state.filterVisibility
      };
      window.localStorage.setItem(this.filterStorageKey, JSON.stringify(payload));
    }

    startAutoRefresh()
    {
      this.stopAutoRefresh();
      var interval = this.uiConfig.autoRefreshIntervalMs || 0;
      if (!interval || interval <= 0)
      {
        return;
      }
      var self = this;
      var runRefresh = async function ()
      {
        self._autoRefreshTimer = null;
        if (document.visibilityState === 'hidden')
        {
          self._autoRefreshTimer = window.setTimeout(runRefresh, interval);
          return;
        }
        if (self._isAutoRefreshing)
        {
          self._autoRefreshTimer = window.setTimeout(runRefresh, interval);
          return;
        }
        self._isAutoRefreshing = true;
        try
        {
          await window.Utils.loadScriptsSync([self.path + '/job-refresh.js'], { cache: true });
          var C = window.Contents && window.Contents.JobRefresh;
          if (C)
          {
            await new C(self).run({ page: self.state.page || 1, silent: true });
          }
        }
        catch (err)
        {
          self.onError(err);
        }
        finally
        {
          self._isAutoRefreshing = false;
          self._autoRefreshTimer = window.setTimeout(runRefresh, interval);
        }
      };
      this._autoRefreshTimer = window.setTimeout(runRefresh, interval);
    }

    stopAutoRefresh()
    {
      if (this._autoRefreshTimer)
      {
        window.clearTimeout(this._autoRefreshTimer);
        this._autoRefreshTimer = null;
      }
    }

    async ensureProfile()
    {
      var service = (window.Services && window.Services.sessionInstance) || null;
      if (!service)
      {
        throw new Error('セッション情報を取得できません。再度ログインしてください。');
      }
      var profile = null;
      if (typeof service.getUser === 'function')
      {
        profile = await service.getUser();
      }
      if (!profile && typeof service.loadFromStorage === 'function')
      {
        profile = await service.loadFromStorage();
      }
      if (!profile && typeof service.syncFromServer === 'function')
      {
        profile = await service.syncFromServer();
      }
      if (!profile)
      {
        throw new Error('ユーザー情報が見つかりません。');
      }
      this.state.profile = profile;
      return profile;
    }

    isContentsManagementEnabled(profile)
    {
      if (!profile || typeof profile !== 'object')
      {
        return true;
      }
      var value = (typeof profile.useContentsManagement !== 'undefined')
        ? profile.useContentsManagement
        : profile.use_contents_management;
      if (typeof value === 'undefined')
      {
        return true;
      }
      if (value === true || value === 1 || value === '1')
      {
        return true;
      }
      if (typeof value === 'string')
      {
        var normalized = value.toLowerCase();
        return normalized === 'true' || normalized === 'yes' || normalized === 'on';
      }
      return false;
    }

    async callApi(type, payload, overrides)
    {
      if (!(window.Utils && typeof window.Utils.requestApi === 'function'))
      {
        throw new Error('APIクライアントが初期化されていません。');
      }
      var response = await window.Utils.requestApi(this.apiConfig.requestType, type, payload || {}, overrides);
      if (!response)
      {
        throw new Error(this.textConfig.error);
      }
      var statusRaw = typeof response.status === 'string' ? response.status : '';
      var status = statusRaw.toUpperCase();
      if (status && status !== 'OK')
      {
        var message = response.response || response.result || response.reason || this.textConfig.error;
        throw new Error(message);
      }
      if (Object.prototype.hasOwnProperty.call(response, 'result'))
      {
        return response.result;
      }
      return response;
    }

    async fetchMediaList(type)
    {
      this.contentsDataset = { usersContents: [], usersContentsProxy: [] };
      var result = await this.callApi(type, {});
      if (!result)
      {
        return [];
      }
      var dataset = this.extractContentsDataset(result);
      if (dataset)
      {
        this.contentsDataset = dataset;
        return this.mergeContentsWithProxies(dataset);
      }
      var list = [];
      if (Array.isArray(result))
      {
        list = result;
      }
      else if (result && Array.isArray(result.items))
      {
        list = result.items;
      }
      return list;
    }

    extractContentsDataset(payload)
    {
      if (!payload)
      {
        return null;
      }
      var contents = Array.isArray(payload.usersContents) ? payload.usersContents : null;
      var proxies = Array.isArray(payload.usersContentsProxy) ? payload.usersContentsProxy : null;
      if (!contents && !proxies)
      {
        return null;
      }
      return {
        usersContents: contents ? contents.slice() : [],
        usersContentsProxy: proxies ? proxies.slice() : []
      };
    }

    normalizeDatasetKey(value)
    {
      if (value === undefined || value === null)
      {
        return '';
      }
      return String(value);
    }

    buildProxyLookup(list)
    {
      var lookup = {};
      var proxies = Array.isArray(list) ? list : [];
      for (var i = 0; i < proxies.length; i += 1)
      {
        var proxy = proxies[i];
        if (!proxy)
        {
          continue;
        }
        var keys = [
          this.normalizeDatasetKey(proxy.usersContentsId),
          this.normalizeDatasetKey(proxy.usersContentsID),
          this.normalizeDatasetKey(proxy.contentCode),
          this.normalizeDatasetKey(proxy.contentId)
        ];
        for (var k = 0; k < keys.length; k += 1)
        {
          var key = keys[k];
          if (!key)
          {
            continue;
          }
          if (!lookup[key])
          {
            lookup[key] = [];
          }
          lookup[key].push(proxy);
        }
      }
      return lookup;
    }

    collectProxiesForContent(lookup, content)
    {
      var proxies = [];
      var keys = [
        this.normalizeDatasetKey(content && content.contentCode),
        this.normalizeDatasetKey(content && content.id),
        this.normalizeDatasetKey(content && content.usersContentsId),
        this.normalizeDatasetKey(content && content.usersContentsID)
      ];
      var seen = {};
      for (var i = 0; i < keys.length; i += 1)
      {
        var key = keys[i];
        if (!key || !lookup[key])
        {
          continue;
        }
        var list = lookup[key];
        for (var j = 0; j < list.length; j += 1)
        {
          var proxy = list[j];
          var proxyId = this.normalizeDatasetKey(proxy && proxy.id);
          var uniqueKey = proxyId ? (key + ':' + proxyId) : (key + ':' + j);
          if (!seen[uniqueKey])
          {
            proxies.push(proxy);
            seen[uniqueKey] = true;
          }
        }
      }
      return proxies;
    }

    mergeContentsWithProxies(dataset)
    {
      var contents = Array.isArray(dataset && dataset.usersContents) ? dataset.usersContents.slice() : [];
      var proxies = Array.isArray(dataset && dataset.usersContentsProxy) ? dataset.usersContentsProxy.slice() : [];
      if (!contents.length)
      {
        return [];
      }
      var lookup = this.buildProxyLookup(proxies);
      var merged = [];
      for (var i = 0; i < contents.length; i += 1)
      {
        var content = contents[i];
        if (!content)
        {
          continue;
        }
        var cloned = Object.assign({}, content);
        var baseList = Array.isArray(cloned.proxyList) ? cloned.proxyList.slice() : [];
        var matchedProxies = this.collectProxiesForContent(lookup, cloned);
        if (matchedProxies.length)
        {
          cloned.proxyList = baseList.concat(matchedProxies);
        }
        merged.push(cloned);
      }
      return merged;
    }

    normalizeItem(kind, record)
    {
      if (!record)
      {
        return null;
      }
      var resolvedKind = kind;
      var isYouTube = this.isYouTubeMetadataRecord(record);
      if (!resolvedKind && record)
      {
        var contentType = String(record.contentType || '').toLowerCase();
        var mimeType = String(record.mimeType || record.mime || '').toLowerCase();
        var isPdfContentType = contentType === 'pdf'
          || contentType === 'application/pdf'
          || contentType.indexOf('application/pdf') === 0;
        var isPdfMimeType = mimeType === 'pdf'
          || mimeType === 'application/pdf'
          || mimeType.indexOf('application/pdf') === 0;
        if (contentType === 'video') resolvedKind = 'movie';
        else if (contentType === 'image') resolvedKind = 'image';
        else if (contentType === 'audio') resolvedKind = 'audio';
        else if (isPdfContentType || isPdfMimeType) resolvedKind = 'pdf';
        else if (this.isPdfRecord(record)) resolvedKind = 'pdf';
        else resolvedKind = 'file';
      }
      if (isYouTube)
      {
        resolvedKind = 'youtube';
      }
      var idBase = record.contentCode || record.id;
      if (idBase == null)
      {
        idBase = String(Date.now());
      }
      var fileName = record.fileName || record.title || record.name || '';
      var resolvedTitle = isYouTube
        ? this.resolveYouTubeTitle(record, fileName)
        : (fileName || this.resolveCategoryLabel(resolvedKind));
      var durationSeconds = this.resolveDurationSecondsFromRecord(record);
      var durationLabel = durationSeconds > 0 ? this.formatDuration(durationSeconds) : '';
      var timestamp = this.parseTimestamp(record.updatedAt || record.createdAt || record.registeredAt);
      var proxyInfo = this.resolveProxyStatus(record);
      var isVisible = this.normalizeVisibilityFlag(record.isVisible);
      var visibilityLabel = isVisible ? '表示' : '非表示';
      return {
        id: resolvedKind + '-' + idBase,
        kind: resolvedKind,
        recordId: idBase,
        title: resolvedTitle,
        size: this.normalizeNumber(record.fileSize || record.size),
        bitrate: this.normalizeNumber(record.bitrate),
        durationSeconds: durationSeconds,
        durationLabel: durationLabel,
        updatedAtValue: timestamp.value,
        updatedAtLabel: timestamp.label,
        categoryLabel: this.resolveCategoryLabel(resolvedKind),
        proxyList: proxyInfo.list,
        proxyStatus: proxyInfo.status,
        proxyStatusLabel: proxyInfo.label,
        isProxyEncoding: proxyInfo.isEncoding,
        isVisible: isVisible,
        visibilityLabel: visibilityLabel,
        raw: record
      };
    }

    isYouTubeMetadataRecord(record)
    {
      if (!record)
      {
        return false;
      }
      var name = String(record.fileName || '').toLowerCase();
      var prefix = String(this.apiConfig.youtubePrefix || '').toLowerCase();
      var suffix = String(this.apiConfig.youtubeSuffix || '').toLowerCase();
      var hasPrefix = prefix ? name.indexOf(prefix) === 0 : name.indexOf('content-youtube-') === 0;
      var hasSuffix = suffix ? name.lastIndexOf(suffix) === (name.length - suffix.length) : true;
      return hasPrefix && hasSuffix;
    }

    isPdfRecord(record)
    {
      if (!record)
      {
        return false;
      }
      var contentType = String(record.contentType || '').toLowerCase();
      var mimeType = String(record.mimeType || record.mime || '').toLowerCase();
      var isPdfContentType = contentType === 'pdf'
        || contentType === 'application/pdf'
        || contentType.indexOf('application/pdf') === 0;
      var isPdfMimeType = mimeType === 'pdf'
        || mimeType === 'application/pdf'
        || mimeType.indexOf('application/pdf') === 0;
      if (isPdfContentType || isPdfMimeType)
      {
        return true;
      }
      var name = String(record.fileName || record.name || '').toLowerCase();
      var path = String(record.filePath || '').toLowerCase();
      return name.endsWith('.pdf') || path.endsWith('.pdf');
    }

    isPdfItem(item)
    {
      if (!item)
      {
        return false;
      }
      if (item.kind === 'pdf')
      {
        return true;
      }
      return this.isPdfRecord(item.raw);
    }

    resolveYouTubeTitle(record, fallback)
    {
      var fromRecord = (record && (record.title || record.name)) || '';
      var prefix = this.apiConfig.youtubePrefix || '';
      var suffix = this.apiConfig.youtubeSuffix || '';
      var fileName = (record && record.fileName) ? String(record.fileName) : '';
      var trimmed = fileName;
      if (prefix && trimmed.indexOf(prefix) === 0)
      {
        trimmed = trimmed.slice(prefix.length);
      }
      if (suffix && trimmed.lastIndexOf(suffix) === (trimmed.length - suffix.length))
      {
        trimmed = trimmed.slice(0, -suffix.length);
      }
      trimmed = trimmed.trim();
      if (fromRecord)
      {
        return String(fromRecord);
      }
      if (trimmed)
      {
        return trimmed;
      }
      if (fallback)
      {
        return String(fallback);
      }
      return 'YouTube動画';
    }

    normalizeProxyList(record)
    {
      if (!record)
      {
        return [];
      }
      var list = Array.isArray(record.proxyList) ? record.proxyList.slice() : [];
      for (var i = 0; i < list.length; i += 1)
      {
        if (!list[i])
        {
          continue;
        }
        if (list[i].bitrate !== undefined)
        {
          list[i].bitrate = this.normalizeNumber(list[i].bitrate);
        }
        if (!list[i].status)
        {
          list[i].status = 'completed';
        }
        if (list[i].encoding === undefined)
        {
          list[i].encoding = false;
        }
      }
      return list;
    }

    resolveProxyStatus(record)
    {
      var list = this.normalizeProxyList(record);
      var status = 'idle';
      var label = '';
      var isEncoding = false;
      for (var i = 0; i < list.length; i += 1)
      {
        var entry = list[i];
        if (!entry)
        {
          continue;
        }
        var entryStatus = (entry.status || '').toLowerCase();
        var encoding = !!entry.encoding || entryStatus === 'queued' || entryStatus === 'running';
        if (encoding)
        {
          status = entryStatus || 'processing';
          label = this.textConfig.proxyEncoding;
          isEncoding = true;
          break;
        }
      }
      return {
        list: list,
        status: status,
        label: label,
        isEncoding: isEncoding
      };
    }

    resolveCategoryLabel(kind)
    {
      if (!kind)
      {
        return '';
      }
      var map = { movie: '動画', image: '画像', audio: '音声', pdf: 'PDF', file: 'ファイル', youtube: 'YouTube' };
      return map[kind] || '';
    }

    resolveKindIcon(kind)
    {
      var map = {
        movie: '▶',
        youtube: '▶',
        image: '🖼',
        audio: '♪',
        pdf: '📄',
        file: '📄'
      };
      return map[kind] || map.file;
    }

    buildYouTubeThumbnailUrl(videoId)
    {
      if (!videoId)
      {
        return '';
      }
      return 'https://i.ytimg.com/vi/' + encodeURIComponent(String(videoId)) + '/hqdefault.jpg';
    }

    buildInlineYouTubeMetadata(record)
    {
      if (!record)
      {
        return null;
      }
      var url = record.youtubeUrl || record.url || record.watchUrl || record.contentUrl || '';
      var embedUrl = record.embedUrl || record.embed || '';
      var id = record.youtubeId || record.videoId || '';
      if (!id && record.id && /^[A-Za-z0-9_-]{5,}$/.test(String(record.id)))
      {
        id = String(record.id);
      }
      var title = record.youtubeTitle || record.name || record.title || '';
      if (!url && !embedUrl && !id)
      {
        return null;
      }
      return this.normalizeYouTubeMetadata({
        id: id,
        youtubeUrl: url,
        embedUrl: embedUrl,
        title: title
      });
    }

    normalizeYouTubeMetadata(payload)
    {
      if (!payload)
      {
        return null;
      }
      var title = '';
      if (payload.name)
      {
        title = String(payload.name);
      }
      else if (payload.title)
      {
        title = String(payload.title);
      }
      var id = payload.id || '';
      var url = payload.youtubeUrl || payload.url || payload.watchUrl || '';
      var embedUrl = payload.embedUrl || payload.embed || '';
      var normalizedUrl = null;
      if (url)
      {
        normalizedUrl = this.normalizeYouTubeUrl(url);
      }
      else if (id)
      {
        normalizedUrl = this.normalizeYouTubeUrl('https://youtu.be/' + id);
      }
      var videoId = (normalizedUrl && normalizedUrl.id) || id || '';
      var watchUrl = (normalizedUrl && normalizedUrl.watch) || url || (videoId ? 'https://www.youtube.com/watch?v=' + videoId : '');
      var embed = (normalizedUrl && normalizedUrl.embed) || embedUrl || (videoId ? 'https://www.youtube.com/embed/' + videoId : '');
      if (!title)
      {
        title = payload.youtubeTitle || payload.name || payload.title || '';
      }
      if (!title)
      {
        title = 'YouTube動画';
      }
      return {
        id: videoId,
        title: title,
        watchUrl: watchUrl,
        embedUrl: embed,
        thumbnailUrl: videoId ? this.buildYouTubeThumbnailUrl(videoId) : ''
      };
    }

    async fetchYouTubeMetadata(record)
    {
      var contentCode = record && (record.contentCode || record.id || '');
      if (!contentCode)
      {
        return null;
      }
      try
      {
        var result = await this.apiFetchYouTubeMetadata(contentCode);
        if (result && typeof result === 'object')
        {
          if (result.metadata && typeof result.metadata === 'object')
          {
            return result.metadata;
          }
          return result;
        }
      }
      catch (_err)
      {
        return null;
      }
      return null;
    }

    async enrichYouTubeItems(items)
    {
      var list = Array.isArray(items) ? items : [];
      var jobs = [];
      for (var i = 0; i < list.length; i += 1)
      {
        var item = list[i];
        if (!item || item.kind !== 'youtube' || !item.raw)
        {
          continue;
        }
        jobs.push(this.applyYouTubeMetadata(item));
      }
      await Promise.all(jobs);
    }

    async applyYouTubeMetadata(item)
    {
      var metadata = this.buildInlineYouTubeMetadata(item.raw);
      if (!metadata)
      {
        metadata = await this.fetchYouTubeMetadata(item.raw);
      }
      if (!metadata)
      {
        return;
      }
      var normalized = this.normalizeYouTubeMetadata(metadata);
      if (!normalized)
      {
        return;
      }
      item.youtube = normalized;
      item.title = normalized.title || item.title || 'YouTube動画';
      item.categoryLabel = this.resolveCategoryLabel('youtube');
      item.thumbnailUrl = normalized.thumbnailUrl || '';
    }

    normalizeNumber(value)
    {
      if (typeof value === 'number')
      {
        return Number.isFinite(value) ? value : 0;
      }
      var str = (typeof value === 'string') ? value.trim() : '';
      if (!str)
      {
        return 0;
      }
      var num = Number(str);
      if (Number.isFinite(num))
      {
        return num;
      }
      var match = /^([0-9]+(?:\.[0-9]+)?)([kKmMgG])?$/.exec(str.replace(/\s+/g, ''));
      if (!match)
      {
        return 0;
      }
      var base = Number(match[1]);
      if (!Number.isFinite(base))
      {
        return 0;
      }
      var unit = match[2] ? match[2].toLowerCase() : '';
      if (unit === 'k')
      {
        return base * 1000;
      }
      if (unit === 'm')
      {
        return base * 1000 * 1000;
      }
      if (unit === 'g')
      {
        return base * 1000 * 1000 * 1000;
      }
      return base;
    }

    resolveDurationSecondsFromRecord(record)
    {
      if (!record)
      {
        return 0;
      }
      var candidates = [
        record.duration,
        record.durationSeconds,
        record.durationLabel,
        record.lengthSeconds,
        record.length,
        record.videoDuration,
        record.movieDuration
      ];
      var meta = record.metadata || record.meta || null;
      if (meta && typeof meta === 'object')
      {
        candidates.push(meta.duration, meta.lengthSeconds);
      }
      for (var i = 0; i < candidates.length; i += 1)
      {
        var candidate = candidates[i];
        var seconds = this.normalizeNumber(candidate);
        if (seconds <= 0 && typeof candidate === 'string' && candidate.indexOf(':') >= 0)
        {
          seconds = this.parseDurationString(candidate);
        }
        if (seconds > 0)
        {
          return seconds;
        }
      }
      return 0;
    }

    resolveItemDurationSeconds(item)
    {
      if (!item)
      {
        return 0;
      }
      if (typeof item.durationSeconds === 'number' && item.durationSeconds > 0)
      {
        return item.durationSeconds;
      }
      return this.resolveDurationSecondsFromRecord(item.raw || item);
    }

    resolveDurationLabel(item)
    {
      var seconds = this.resolveItemDurationSeconds(item);
      if (seconds <= 0)
      {
        return (item && item.durationLabel) ? String(item.durationLabel) : '';
      }
      return this.formatDuration(seconds);
    }

    parseDurationString(value)
    {
      if (typeof value !== 'string')
      {
        return 0;
      }
      var parts = value.split(':');
      var total = 0;
      var multiplier = 1;
      for (var i = parts.length - 1; i >= 0; i -= 1)
      {
        var num = Number(parts[i]);
        if (!Number.isFinite(num))
        {
          return 0;
        }
        total += num * multiplier;
        multiplier *= 60;
      }
      return total;
    }

    normalizeVisibilityFlag(value)
    {
      if (value === undefined || value === null)
      {
        return true;
      }
      if (value === true || value === 1)
      {
        return true;
      }
      if (value === false || value === 0)
      {
        return false;
      }
      if (typeof value === 'string')
      {
        var normalized = value.trim().toLowerCase();
        if (!normalized)
        {
          return true;
        }
        if (['1', 'true', 'yes', 'on', 'visible', 'show'].indexOf(normalized) !== -1)
        {
          return true;
        }
        if (['0', 'false', 'no', 'off', 'hidden', 'hide'].indexOf(normalized) !== -1)
        {
          return false;
        }
      }
      if (!Number.isNaN(Number(value)))
      {
        return Number(value) !== 0;
      }
      return true;
    }

    parseTimestamp(value)
    {
      if (!value)
      {
        return { value: 0, label: '' };
      }
      var date = new Date(value);
      if (isNaN(date.getTime()))
      {
        return { value: 0, label: '' };
      }
      return { value: date.getTime(), label: this.formatDateTime(date) };
    }

    formatDateTime(date)
    {
      if (!(date instanceof Date) || isNaN(date.getTime()))
      {
        return '';
      }
      var y = date.getFullYear();
      var m = ('0' + (date.getMonth() + 1)).slice(-2);
      var d = ('0' + date.getDate()).slice(-2);
      var hh = ('0' + date.getHours()).slice(-2);
      var mm = ('0' + date.getMinutes()).slice(-2);
      return y + '/' + m + '/' + d + ' ' + hh + ':' + mm;
    }

    filterItems(items, params)
    {
      var list = Array.isArray(items) ? items.slice(0) : [];
      var query = params && params.query;
      var kind = params && params.kind;
      var visibility = params && params.visibility;
      var afterQuery = this.filterItemsByQuery(list, query);
      var afterKind = this.filterItemsByKind(afterQuery, kind);
      return this.filterItemsByVisibility(afterKind, visibility);
    }

    filterItemsByQuery(items, query)
    {
      if (!query)
      {
        return items.slice(0);
      }
      var normalized = String(query).toLowerCase();
      var filtered = [];
      for (var i = 0; i < items.length; i += 1)
      {
        var item = items[i];
        if (!item)
        {
          continue;
        }
        var title = (item.title || '').toLowerCase();
        if (title.indexOf(normalized) !== -1)
        {
          filtered.push(item);
        }
      }
      return filtered;
    }

    filterItemsByKind(items, kind)
    {
      if (!kind)
      {
        return Array.isArray(items) ? items.slice(0) : [];
      }
      var normalized = String(kind).toLowerCase();
      var filtered = [];
      for (var i = 0; i < items.length; i += 1)
      {
        var item = items[i];
        if (!item)
        {
          continue;
        }
        var itemKind = (item.kind || '').toLowerCase();
        if (itemKind === normalized)
        {
          filtered.push(item);
        }
      }
      return filtered;
    }

    filterItemsByVisibility(items, visibility)
    {
      var mode = typeof visibility === 'string' ? visibility.toLowerCase() : visibility;
      if (!mode || mode === 'all')
      {
        return Array.isArray(items) ? items.slice(0) : [];
      }
      var normalized = String(mode).toLowerCase();
      var targetVisible = normalized === 'visible';
      if (normalized !== 'visible' && normalized !== 'hidden')
      {
        return Array.isArray(items) ? items.slice(0) : [];
      }
      var filtered = [];
      for (var i = 0; i < items.length; i += 1)
      {
        var item = items[i];
        if (!item)
        {
          continue;
        }
        var isVisible = item.isVisible !== false;
        if (targetVisible && isVisible)
        {
          filtered.push(item);
        }
        else if (!targetVisible && !isVisible)
        {
          filtered.push(item);
        }
      }
      return filtered;
    }

    paginateItems(items, page, pageSize)
    {
      var resolvedPage = Number(page);
      if (!resolvedPage || resolvedPage < 1)
      {
        resolvedPage = 1;
      }
      var resolvedPageSize = Number(pageSize);
      if (!resolvedPageSize || resolvedPageSize < 1)
      {
        resolvedPageSize = this.uiConfig.defaultPageSize;
      }
      var list = Array.isArray(items) ? items : [];
      var totalItems = list.length;
      var totalPages = resolvedPageSize ? Math.max(1, Math.ceil(totalItems / resolvedPageSize)) : 1;
      if (resolvedPage > totalPages)
      {
        resolvedPage = totalPages;
      }
      var start = (resolvedPage - 1) * resolvedPageSize;
      var sliced = list.slice(start, start + resolvedPageSize);
      return {
        page: resolvedPage,
        items: sliced,
        total: totalItems,
        pageSize: resolvedPageSize,
        totalPages: totalPages
      };
    }

    getItemById(id)
    {
      var list = this.state.items || [];
      for (var i = 0; i < list.length; i += 1)
      {
        if (list[i] && list[i].id === id)
        {
          return list[i];
        }
      }
      return null;
    }

    resolveDeleteType(kind)
    {
      if (!kind)
      {
        return this.apiConfig.deleteTypes.file;
      }
      return this.apiConfig.deleteTypes[kind] || this.apiConfig.deleteTypes.file;
    }

    resolveUploadTarget(file)
    {
      var name = (file && file.name) ? String(file.name).toLowerCase() : '';
      var type = (file && file.type) ? String(file.type).toLowerCase() : '';
      if (type.indexOf('video/') === 0 || /\.(mp4|m4v|mov|avi|mkv|webm)$/.test(name))
      {
        return this.apiConfig.uploadTargets.movie;
      }
      if (type.indexOf('image/') === 0 || /\.(png|jpg|jpeg|gif|webp|heic|heif)$/.test(name))
      {
        return this.apiConfig.uploadTargets.image;
      }
      if (type.indexOf('audio/') === 0 || /\.(mp3|wav|aac|m4a|flac|ogg)$/.test(name))
      {
        return this.apiConfig.uploadTargets.audio;
      }
      return this.apiConfig.uploadTargets.file;
    }

    normalizeYouTubeUrl(url)
    {
      var raw = String(url || '').trim();
      if (!raw)
      {
        return null;
      }
      var videoId = '';
      var patterns = [
        /youtu\.be\/([A-Za-z0-9_-]{5,})/i,
        /v=([A-Za-z0-9_-]{5,})/i,
        /embed\/([A-Za-z0-9_-]{5,})/i
      ];
      for (var i = 0; i < patterns.length && !videoId; i += 1)
      {
        var match = raw.match(patterns[i]);
        if (match && match[1])
        {
          videoId = match[1];
        }
      }
      if (!videoId)
      {
        return null;
      }
      var watchUrl = 'https://www.youtube.com/watch?v=' + videoId;
      var embedUrl = 'https://www.youtube.com/embed/' + videoId;
      return { id: videoId, watch: watchUrl, embed: embedUrl, title: '' };
    }

    async sendRequestWithProgress(type, formData, options)
    {
      var requestOptions = window.Utils.buildApiRequestOptions(this.apiConfig.requestType, type, formData);
      var onProgress = options && typeof options.onProgress === 'function' ? options.onProgress : null;
      return new Promise(function (resolve, reject)
      {
        var xhr = new XMLHttpRequest();
        xhr.open(requestOptions.type || 'POST', requestOptions.url, true);
        if (xhr.upload && onProgress)
        {
          xhr.upload.addEventListener('progress', function (event)
          {
            if (!event)
            {
              return;
            }
            var total = event.total || 0;
            var loaded = event.loaded || 0;
            onProgress({ loaded: loaded, total: total });
          });
        }
        xhr.onreadystatechange = function ()
        {
          if (xhr.readyState !== 4)
          {
            return;
          }
          if (xhr.status >= 200 && xhr.status < 300)
          {
            var payload = null;
            try
            {
              payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
            }
            catch (_e)
            {
              payload = null;
            }
            if (payload)
            {
              var statusRaw = typeof payload.status === 'string' ? payload.status : '';
              var status = statusRaw.toUpperCase();
              if (status && status !== 'OK')
              {
                var message = payload.response || payload.result || payload.reason || 'アップロードに失敗しました。';
                reject(new Error(message));
                return;
              }
              resolve(payload.result || payload);
              return;
            }
            resolve({ ok: true });
            return;
          }
          reject(new Error('アップロードに失敗しました (status ' + xhr.status + ')'));
        };
        xhr.onerror = function ()
        {
          reject(new Error('ネットワークエラーが発生しました'));
        };
        xhr.send(requestOptions.data);
      });
    }

    /* ========== 以下は旧 general.js / API 置き換えのための小さなファサード ========== */

    /**
     * 一覧取得（検索・ページング対応）
     * @param {Object} params {query, page, pageSize}
    */
    async apiFetchList(params) {
      var listTypes = this.apiConfig.listTypes || [];
      var requests = [];
      for (var i = 0; i < listTypes.length; i += 1)
      {
        requests.push(this.fetchMediaList(listTypes[i]));
      }
      var responses = await Promise.all(requests);
      var aggregate = [];
      for (var j = 0; j < responses.length; j += 1)
      {
        var list = responses[j] || [];
        for (var k = 0; k < list.length; k += 1)
        {
          var normalized = this.normalizeItem(null, list[k]);
          if (normalized)
          {
            aggregate.push(normalized);
          }
        }
      }
      await this.enrichYouTubeItems(aggregate);
      aggregate.sort(function (a, b)
      {
        return (b.updatedAtValue || 0) - (a.updatedAtValue || 0);
      });
      var filtered = this.filterItems(aggregate, params || {});
      var paginated = this.paginateItems(filtered, params && params.page, params && params.pageSize);
      return {
        items: paginated.items,
        page: paginated.page,
        total: paginated.total,
        pageSize: paginated.pageSize,
        totalPages: paginated.totalPages
      };
    }

    /**
     * 単体削除
     */
    async apiDeleteOne(id) {
      if (!id)
      {
        return { ok: false };
      }
      var target = this.getItemById(id);
      if (!target)
      {
        return { ok: false };
      }
      await this.ensureContentDeletable(target);
      var deleteType = this.resolveDeleteType(target.kind);
      await this.callApi(deleteType, { contentCode: target.recordId });
      return { ok: true };
    }

    /**
     * 表示状態更新
     */
    async apiUpdateVisibility(id, isVisible)
    {
      if (!id)
      {
        return { ok: false };
      }
      var target = this.getItemById(id);
      if (!target)
      {
        return { ok: false };
      }
      var payload = {
        contentCode: target.recordId,
        isVisible: isVisible ? 1 : 0
      };
      await this.callApi(this.apiConfig.visibilityUpdateType, payload);
      target.isVisible = !!isVisible;
      target.visibilityLabel = target.isVisible ? '表示' : '非表示';
      return { ok: true };
    }

    /**
     * 一括削除
     */
    async apiBulkDelete(ids) {
      if (!Array.isArray(ids) || !ids.length)
      {
        return { ok: false };
      }
      for (var i = 0; i < ids.length; i += 1)
      {
        if (!ids[i])
        {
          continue;
        }
        // eslint-disable-next-line no-await-in-loop
        await this.apiDeleteOne(ids[i]);
      }
      return { ok: true };
    }

    /**
     * アップロード
     */
    async apiUploadFiles(files) {
      var list = Array.isArray(files) ? files : [];
      var results = [];
      for (var i = 0; i < list.length; i++) {
        if (!list[i]) continue;
        // eslint-disable-next-line no-await-in-loop
        results.push(await this.apiUploadFile(list[i]));
      }
      return { ok: true, uploaded: results };
    }

    async apiUploadFile(file, options) {
      if (!file)
      {
        return { ok: false };
      }
      var target = this.resolveUploadTarget(file);
      var formData = new FormData();
      formData.append('fileName', file.name || (target && target.label) || 'upload');
      formData.append(target.field, file, file.name || 'upload');
      await this.sendRequestWithProgress(target.type, formData, options || {});
      return { ok: true };
    }

    /**
     * YouTube 登録
     */
    async apiRegisterYouTube(url, title) {
      if (!url)
      {
        throw new Error('YouTubeのURLを入力してください');
      }
      var normalized = this.normalizeYouTubeUrl(url);
      if (!normalized)
      {
        throw new Error('有効なYouTubeのURLを入力してください');
      }
      var resolvedTitle = (title && String(title).trim()) || normalized.title || 'YouTube動画';
      var metadata = {
        id: String(Date.now()),
        name: resolvedTitle,
        youtubeUrl: normalized.watch,
        embedUrl: normalized.embed,
        createdAt: new Date().toISOString()
      };
      var fileName = (this.apiConfig.youtubePrefix || 'content-youtube-') + metadata.id + (this.apiConfig.youtubeSuffix || '.json');
      var blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      var uploadTarget = this.apiConfig.uploadTargets.file;
      var formData = new FormData();
      formData.append('fileName', fileName);
      formData.append(uploadTarget.field, blob, fileName);
      await this.sendRequestWithProgress(uploadTarget.type, formData, {});
      return { ok: true };
    }

    async apiFetchYouTubeMetadata(contentCode)
    {
      if (!contentCode)
      {
        return null;
      }
      var payload = await this.callApi('ContentYouTubeMetadata', { contentCode: contentCode });
      if (payload && payload.metadata)
      {
        return payload;
      }
      return payload || null;
    }

    async apiFetchUsageList(contentCode)
    {
      if (!contentCode)
      {
        return { items: [] };
      }
      var payload = await this.callApi('ContentUsageList', { contentCode: contentCode });
      if (payload && Array.isArray(payload.items))
      {
        return payload;
      }
      if (Array.isArray(payload))
      {
        return { items: payload };
      }
      return { items: [] };
    }

    resolveContentCodeFromItem(item)
    {
      if (!item)
      {
        return '';
      }
      var contentCode = (item && item.recordId != null) ? item.recordId : '';
      if (!contentCode && item && item.raw && item.raw.contentCode)
      {
        contentCode = item.raw.contentCode;
      }
      return contentCode ? String(contentCode) : '';
    }

    getViewerUserCode()
    {
      var profile = this.state && this.state.profile ? this.state.profile : null;
      if (!profile)
      {
        return '';
      }
      var candidates = [profile.userCode, profile.user_code, profile.code];
      for (var i = 0; i < candidates.length; i += 1)
      {
        var candidate = candidates[i];
        if (candidate)
        {
          return String(candidate);
        }
      }
      return '';
    }

    isVideoContent(item)
    {
      var kind = item && item.kind ? String(item.kind).toLowerCase() : '';
      return kind === 'movie' || kind === 'video' || kind === 'youtube';
    }

    canSubmitToTarget(item)
    {
      return !!(item && this.isVideoContent(item) && this.resolveContentCodeFromItem(item));
    }

    normalizeTargetCodes(list)
    {
      var normalized = [];
      var seen = {};
      var entries = Array.isArray(list) ? list : [];
      for (var i = 0; i < entries.length; i += 1)
      {
        var entry = entries[i];
        if (!entry)
        {
          continue;
        }
        var code = '';
        if (entry.targetCode)
        {
          code = String(entry.targetCode).trim();
        }
        else if (entry.userCode)
        {
          code = String(entry.userCode).trim();
        }
        else if (entry.code)
        {
          code = String(entry.code).trim();
        }
        else if (entry.id)
        {
          code = String(entry.id).trim();
        }
        if (!code)
        {
          continue;
        }
        var key = code.toLowerCase();
        if (seen[key])
        {
          continue;
        }
        seen[key] = true;
        normalized.push(code);
      }
      return normalized;
    }

    async openTargetSelectModalForSubmission()
    {
      var service = this.targetSelectModalService || (this.services && this.services.targetSelectModal);
      if (!service || typeof service.open !== 'function')
      {
        throw new Error('ターゲット選択モーダルサービスが初期化されていません。');
      }
      var text = this.textConfig || {};
      return new Promise(function (resolve, reject)
      {
        var resolved = false;
        var finalize = function (list)
        {
          if (resolved)
          {
            return;
          }
          resolved = true;
          resolve(Array.isArray(list) ? list : []);
        };
        var handleClose = function (reason)
        {
          if (reason === 'session-expired')
          {
            window.location.href = '/login.html';
            return;
          }
          finalize([]);
        };
        try
        {
          service.open({
            multiple: true,
            text: {
              modalTitle: text.submitSelectTitle || text.submitButtonLabel || '提出先を選択',
              modalDescription: text.submitSelectDescription || text.submitHoverLabel || '',
              actionLabel: text.submitButtonLabel || '提出'
            },
            loadOptions: { targetListType: 'TargetListParticipating' },
            onSelect: function (target)
            {
              finalize(target ? [target] : []);
            },
            onApply: function (targets)
            {
              finalize(targets);
            },
            onClose: handleClose
          });
        }
        catch (error)
        {
          reject(error);
        }
      });
    }

    async submitContentToTargets(id)
    {
      if (!id)
      {
        return;
      }
      var item = this.getItemById(id);
      if (!this.canSubmitToTarget(item))
      {
        this.toast(this.textConfig.submitUnavailable || this.textConfig.error);
        return;
      }
      var contentCode = this.resolveContentCodeFromItem(item);
      var userCode = this.getViewerUserCode();
      if (!contentCode || !userCode)
      {
        throw new Error('提出に必要な情報を取得できませんでした。');
      }
      var targets = await this.openTargetSelectModalForSubmission();
      var targetCodes = this.normalizeTargetCodes(targets);
      if (!targetCodes.length)
      {
        this.toast(this.textConfig.submitNoSelection || this.textConfig.submitUnavailable || this.textConfig.error);
        return;
      }
      this.loading(true, this.textConfig.submitLoading || this.textConfig.saving);
      try
      {
        for (var i = 0; i < targetCodes.length; i += 1)
        {
          var payload = {
            targetCode: targetCodes[i],
            userCode: userCode,
            contentCodes: [contentCode],
            content: item && item.title ? item.title : ''
          };
          // eslint-disable-next-line no-await-in-loop
          await this.requestSubmissionCreate(payload);
        }
        this.toast(this.textConfig.submitSuccess || this.textConfig.saved);
      }
      catch (err)
      {
        this.onError(err);
        this.toast(this.textConfig.submitError || this.textConfig.error);
      }
      finally
      {
        this.loading(false);
      }
    }

    async requestSubmissionCreate(payload)
    {
      if (!(window.Utils && typeof window.Utils.requestApi === 'function'))
      {
        throw new Error('APIクライアントが初期化されていません。');
      }
      var response = await window.Utils.requestApi('TargetManagementSubmissions', 'TargetSubmissionCreate', payload || {});
      if (!response)
      {
        throw new Error(this.textConfig.submitError || this.textConfig.error);
      }
      var status = typeof response.status === 'string' ? response.status.toUpperCase() : '';
      if (status !== 'OK')
      {
        var message = response.response || response.result || response.reason || this.textConfig.submitError || this.textConfig.error;
        var error = new Error(message);
        if (response.reason)
        {
          error.code = response.reason;
        }
        throw error;
      }
      return response.result || null;
    }

    async ensureContentDeletable(item)
    {
      var contentCode = this.resolveContentCodeFromItem(item);
      if (!contentCode)
      {
        return;
      }
      var payload = await this.apiFetchUsageList(contentCode);
      var list = (payload && payload.items) || [];
      var usageItems = this.normalizeUsageItems(list);
      var protectedTypes = ['guidance', 'reference', 'submission', 'review'];
      var typeLabels = this.textConfig.usageTypeLabels || {};
      var usedPlaces = [];
      var usedLookup = {};

      for (var i = 0; i < usageItems.length; i += 1)
      {
        var entry = usageItems[i];
        if (!entry)
        {
          continue;
        }
        var usageTypeRaw = entry.usageType || '';
        var usageType = String(usageTypeRaw).toLowerCase();
        if (protectedTypes.indexOf(usageType) === -1)
        {
          continue;
        }
        var targetTitle = entry.targetName || entry.targetCode || 'ターゲット';
        var usageLabel = typeLabels[usageType] || usageTypeRaw || usageType || '-';
        var key = targetTitle + '|' + usageLabel;
        if (usedLookup[key])
        {
          continue;
        }
        usedLookup[key] = true;
        usedPlaces.push('「' + targetTitle + '」の' + usageLabel);
      }

      if (!usedPlaces.length)
      {
        return;
      }
      var message = 'このコンテンツは' + usedPlaces.join('、') + 'で使用されているため削除できません。';
      throw new Error(message);
    }

    async openUsageList(id)
    {
      if (!id)
      {
        return;
      }
      var item = this.getItemById(id);
      var contentCode = this.resolveContentCodeFromItem(item);
      if (!contentCode)
      {
        return;
      }
      this.loading(true, this.textConfig.usageLoading || this.textConfig.loading);
      try
      {
        var payload = await this.apiFetchUsageList(contentCode);
        var list = (payload && payload.items) || [];
        this.showUsageModal(item, this.normalizeUsageItems(list));
      }
      catch (err)
      {
        this.onError(err);
        this.toast(this.textConfig.usageError || this.textConfig.error);
      }
      finally
      {
        this.loading(false);
      }
    }

    normalizeUsageItems(items)
    {
      var list = Array.isArray(items) ? items : [];
      var normalized = [];
      for (var i = 0; i < list.length; i += 1)
      {
        var entry = list[i];
        if (!entry)
        {
          continue;
        }
        var targetCode = (entry.targetCode != null) ? String(entry.targetCode).trim() : '';
        if (!targetCode)
        {
          continue;
        }
        var usageType = (entry.usageType != null) ? String(entry.usageType).trim() : '';
        var targetName = (entry.targetName != null) ? String(entry.targetName) : targetCode;
        var href = this.buildTargetDetailUrl(targetCode);
        normalized.push({
          targetCode: targetCode,
          targetName: targetName,
          usageType: usageType,
          href: href
        });
      }
      return normalized;
    }

    buildTargetDetailUrl(targetCode)
    {
      if (!targetCode)
      {
        return 'target-detail.html';
      }
      return 'target-detail.html?targetCode=' + encodeURIComponent(String(targetCode));
    }

    showUsageModal(item, usageItems)
    {
      var service = this.infoModalService || (this.services && this.services.info);
      if (!service || typeof service.show !== 'function')
      {
        throw new Error('info modal service is not available');
      }
      var label = this.textConfig.usageDialogTitle || '使用箇所';
      var intro = this.textConfig.usageDialogIntro || '';
      var subtitle = (item && item.title) ? this.escapeHtml(item.title) : '';
      var htmlParts = ['<div class="content-usage-modal">'];
      if (intro)
      {
        htmlParts.push('<p class="content-usage-modal__intro">' + this.escapeHtml(intro) + '</p>');
      }
      if (subtitle)
      {
        htmlParts.push('<p class="content-usage-modal__subtitle">' + subtitle + '</p>');
      }
      htmlParts.push(this.buildUsageTableHtml(usageItems));
      htmlParts.push('</div>');

      service.show({
        title: label,
        html: htmlParts.join('')
      });
    }

    buildUsageTableHtml(items)
    {
      var list = Array.isArray(items) ? items : [];
      if (!list.length)
      {
        var empty = this.textConfig.usageDialogEmpty || '';
        return '<p class="content-usage-modal__empty">' + this.escapeHtml(empty) + '</p>';
      }
      var typeLabels = this.textConfig.usageTypeLabels || {};
      var openLabel = this.textConfig.usageOpenLabel || '開く';
      var rows = [];
      for (var i = 0; i < list.length; i += 1)
      {
        var entry = list[i];
        var usageLabel = this.resolveUsageTypeLabel(entry && entry.usageType, typeLabels);
        var targetName = entry && entry.targetName ? this.escapeHtml(entry.targetName) : '';
        var targetCode = entry && entry.targetCode ? this.escapeHtml(entry.targetCode) : '';
        var href = entry && entry.href ? entry.href : '';
        var buttonHtml = this.buildUsageOpenButton(href, targetName || targetCode, openLabel);
        rows.push(''
          + '<tr>'
          + '<td class="content-usage-modal__cell content-usage-modal__cell--target">' + targetName + '</td>'
          + '<td class="content-usage-modal__cell content-usage-modal__cell--usage">' + usageLabel + '</td>'
          + '<td class="content-usage-modal__cell content-usage-modal__cell--action">' + buttonHtml + '</td>'
          + '</tr>');
      }
      return ''
        + '<div class="content-usage-modal__table-wrapper" role="region" aria-label="使用箇所一覧">'
        + '<table class="content-usage-modal__table">'
        + '<thead><tr>'
        + '<th scope="col">ターゲット名</th>'
        + '<th scope="col">使用箇所</th>'
        + '<th scope="col">操作</th>'
        + '</tr></thead>'
        + '<tbody>' + rows.join('') + '</tbody>'
        + '</table>'
        + '</div>';
    }

    buildUsageOpenButton(href, targetName, openLabel)
    {
      var service = this.buttonService;
      var label = openLabel || '';
      var resolvedHref = href || '#';
      if (service && typeof service.createActionButton === 'function')
      {
        try
        {
          var node = service.createActionButton('open-link', {
            label: label,
            ariaLabel: label + (targetName ? ' ' + targetName : ''),
            hoverLabel: label,
            elementTag: 'a',
            attributes: { href: resolvedHref, target: '_blank', rel: 'noreferrer', 'data-usage-open': 'true' }
          });
          if (node)
          {
            return this.nodeToHtml(node);
          }
        }
        catch (err)
        {
          if (window.console && typeof window.console.warn === 'function')
          {
            window.console.warn('[contents] failed to create usage open button', err);
          }
        }
      }
      var safeLabel = this.escapeHtml(label || '開く');
      var safeHref = this.escapeHtml(resolvedHref);
      return '<a class="content-usage-modal__open" href="' + safeHref + '" target="_blank" rel="noreferrer">' + safeLabel + '</a>';
    }

    resolveUsageTypeLabel(type, labels)
    {
      var map = labels || {};
      var key = type ? String(type).toLowerCase() : '';
      if (key && map[key])
      {
        return this.escapeHtml(String(map[key]));
      }
      return key ? this.escapeHtml(key) : '-';
    }

    renderPagination(total, page, pageSize)
    {
      var selectors = this.selectorConfig || {};
      var container = selectors.pagination ? document.querySelector(selectors.pagination) : null;
      var status = selectors.paginationStatus ? document.querySelector(selectors.paginationStatus) : null;
      var pagesHost = selectors.paginationPages ? document.querySelector(selectors.paginationPages) : null;
      var prevButton = selectors.paginationPrevButton ? document.querySelector(selectors.paginationPrevButton) : null;
      var nextButton = selectors.paginationNextButton ? document.querySelector(selectors.paginationNextButton) : null;

      var resolvedTotal = typeof total === 'number' ? total : 0;
      var resolvedPageSize = Number(pageSize) || this.uiConfig.defaultPageSize;
      var resolvedPage = Number(page) || 1;
      var totalPages = resolvedPageSize ? Math.max(1, Math.ceil(resolvedTotal / resolvedPageSize)) : 1;
      if (resolvedPage > totalPages)
      {
        resolvedPage = totalPages;
      }
      this.state.page = resolvedPage;
      this.state.pageSize = resolvedPageSize;

      var startIndex = resolvedTotal ? ((resolvedPage - 1) * resolvedPageSize) + 1 : 0;
      var endIndex = resolvedTotal ? Math.min(resolvedTotal, resolvedPage * resolvedPageSize) : 0;

      if (status)
      {
        var statusText = resolvedTotal
          ? (startIndex <= endIndex
            ? (startIndex + '～' + endIndex + '件を表示（全' + resolvedTotal + '件）')
            : '表示できるコンテンツがありません')
          : '表示できるコンテンツがありません';
        status.textContent = statusText;
      }

      if (container)
      {
        if (resolvedTotal > 0)
        {
          container.removeAttribute('hidden');
        }
        else
        {
          container.setAttribute('hidden', 'hidden');
        }
      }

      if (prevButton)
      {
        prevButton.setAttribute('data-cp-page', Math.max(1, resolvedPage - 1));
        prevButton.disabled = resolvedPage <= 1;
        prevButton.setAttribute('aria-disabled', prevButton.disabled ? 'true' : 'false');
      }
      if (nextButton)
      {
        nextButton.setAttribute('data-cp-page', Math.min(totalPages, resolvedPage + 1));
        nextButton.disabled = resolvedPage >= totalPages;
        nextButton.setAttribute('aria-disabled', nextButton.disabled ? 'true' : 'false');
      }

      if (pagesHost)
      {
        var pageButtons = [];
        var startPage = Math.max(1, resolvedPage - 2);
        var endPage = Math.min(totalPages, resolvedPage + 2);
        for (var p = startPage; p <= endPage; p += 1)
        {
          var isCurrent = p === resolvedPage;
          var classes = 'content-library__pagination-button';
          if (isCurrent)
          {
            classes += ' is-current';
          }
          var attrs = ['type="button"', 'class="' + classes + '"', 'data-cp-page="' + p + '"'];
          if (isCurrent)
          {
            attrs.push('aria-current="page"');
            attrs.push('disabled');
          }
          pageButtons.push('<button ' + attrs.join(' ') + '>' + p + '</button>');
        }
        pagesHost.innerHTML = pageButtons.join('');
      }
    }

    /**
     * 描画（最小限 / 旧 general.js の renderList 移行先）
     */
    renderList(items) {
      var sel = this.selectorConfig || {};
      var $tableList = sel.listContainer ? $(sel.listContainer) : $();
      var $panelList = sel.panelListContainer ? $(sel.panelListContainer) : $();
      var $empty = sel.listEmpty ? $(sel.listEmpty) : $();
      var $status = sel.statusMessage ? $(sel.statusMessage) : $();
      var listItems = Array.isArray(items) ? items : [];
      var count = listItems.length;
      var total = (typeof this.state.total === 'number') ? this.state.total : count;
      var page = this.state.page || 1;
      var pageSize = this.state.pageSize || this.uiConfig.defaultPageSize;

      if ($status.length) {
        var statusText = total
          ? total + '件のコンテンツが見つかりました'
          : '表示できるコンテンツがありません';
        $status.text(statusText);
      }

      if ($tableList.length) {
        $tableList.empty();
      }
      if ($panelList.length) {
        $panelList.empty();
      }

      if (!count) {
        if ($empty.length) {
          $empty.removeAttr('hidden');
        }
        this.renderPagination(total, page, pageSize);
        this.updateViewModeVisibility();
        return;
      }

      if ($empty.length) {
        $empty.attr('hidden', 'hidden');
      }

      if ($tableList.length) {
        var html = [];
        for (var i = 0; i < listItems.length; i += 1) {
          html.push(this.buildListItemHtml(listItems[i], i));
        }
        $tableList.append(html.join(''));
      }

      if ($panelList.length) {
        var panelHtml = [];
        for (var j = 0; j < listItems.length; j += 1) {
          panelHtml.push(this.buildPanelItemHtml(listItems[j], j));
        }
        $panelList.append(panelHtml.join(''));
        this.renderPanelThumbPlaceholders();
      }
      this.updateViewModeVisibility();
      this.renderPagination(total, page, pageSize);
    }

    buildItemDisplayProps(item, index)
    {
      if (!item)
      {
        return null;
      }
      var isYouTube = item.kind === 'youtube';
      var isVisible = !(item && item.isVisible === false);
      var id = (item.id != null) ? String(item.id) : String(index);
      var titleRaw = item.title || item.name || ('#' + (index + 1));
      var title = this.escapeHtml(titleRaw);
      var categoryRaw = item.categoryLabel || this.resolveCategoryLabel(item.kind) || 'コンテンツ';
      var categoryLabel = this.escapeHtml(categoryRaw);
      var sizeLabel = this.formatBytes(item.size);
      var visibilityLabel = item && item.visibilityLabel ? item.visibilityLabel : (isVisible ? '表示' : '非表示');
      var durationLabel = this.resolveDurationLabel(item);
      var visibilityLabelSafe = this.escapeHtml(visibilityLabel);
      var metaParts = [];
      if (visibilityLabelSafe)
      {
        metaParts.push(visibilityLabelSafe);
      }
      if (isYouTube)
      {
        var youtubeUrl = (item.youtube && item.youtube.watchUrl)
          || (item.raw && (item.raw.youtubeUrl || item.raw.url || item.raw.watchUrl || item.raw.contentUrl))
          || '';
        if (youtubeUrl)
        {
          metaParts.push(this.escapeHtml(String(youtubeUrl)));
        }
      }
      else
      {
        if (categoryLabel)
        {
          metaParts.push(categoryLabel);
        }
        if (sizeLabel)
        {
          metaParts.push(sizeLabel);
        }
      }
      if (item.updatedAtLabel)
      {
        metaParts.push(this.escapeHtml(item.updatedAtLabel));
      }
      var visibilityStateLabel = isVisible ? '表示' : '非表示';
      var visibilityToggleLabel = isVisible
        ? (this.textConfig.visibilityHideLabel || '非表示')
        : (this.textConfig.visibilityShowLabel || '表示化');
      return {
        id: id,
        item: item,
        isYouTube: isYouTube,
        titleRaw: titleRaw,
        title: title,
        categoryLabel: categoryLabel,
        categoryRaw: categoryRaw,
        sizeLabel: sizeLabel,
        meta: metaParts.join(' / '),
        durationLabel: durationLabel,
        isVisible: isVisible,
        visibilityLabel: visibilityLabel,
        visibilityStateLabel: visibilityStateLabel,
        visibilityToggleLabel: visibilityToggleLabel,
        openHoverLabel: titleRaw + 'を開く',
        proxyHoverLabel: titleRaw + 'の低レート版を作成する',
        downloadHoverLabel: titleRaw + 'をダウンロード',
        deleteHoverLabel: titleRaw + 'を削除',
        proxyStatusHtml: this.buildProxyStatusHtml(item),
        bitrateHtml: this.buildBitrateBadges(item, id)
      };
    }

    buildPanelItemHtml(item, index)
    {
      var view = this.buildItemDisplayProps(item, index);
      if (!view)
      {
        return '';
      }
      var actionsHtml = this.buildPanelActions(view);
      var panelClass = 'content-library__panel-card content-item';
      if (view.item && view.item.isVisible === false)
      {
        panelClass += ' content-item--hidden';
      }
      return '' +
        '<li class="content-library__panel-item">' +
          '<article class="' + panelClass + '" data-id="' + view.id + '">' +
            this.buildPanelPreview(item, view) +
            '<div class="content-item__meta content-library__panel-meta">' +
              '<div class="content-library__panel-meta-body">' +
                view.bitrateHtml +
                (view.meta ? '<p class="content-item__description content-library__panel-description">' + view.meta + '</p>' : '') +
                view.proxyStatusHtml +
              '</div>' +
              actionsHtml +
            '</div>' +
          '</article>' +
        '</li>';
    }

    buildSubmitActionButton(view, options)
    {
      if (!view || !this.canSubmitToTarget(view.item))
      {
        return '';
      }
      var cfg = options || {};
      var label = this.textConfig.submitButtonLabel || '提出';
      var hoverLabel = (this.textConfig.submitHoverLabel || '') || (view && view.titleRaw ? view.titleRaw + 'を提出' : label);
      var dataset = (cfg && cfg.dataset && typeof cfg.dataset === 'object') ? Object.assign({}, cfg.dataset) : {};
      if (!dataset.cpSubmit)
      {
        dataset.cpSubmit = 'true';
      }
      if (!dataset.id)
      {
        dataset.id = view && view.id ? view.id : '';
      }
      return this.buildActionButtonHtml('execute', Object.assign({}, cfg, {
        label: label,
        hoverLabel: hoverLabel,
        ariaLabel: hoverLabel,
        type: 'button',
        dataset: dataset
      }));
    }

    buildPanelActions(view)
    {
      var submitButtonHtml = this.buildSubmitActionButton(view, {
        baseClass: 'content-item__action table-action-button',
        fallbackClass: 'content-item__action btn btn--ghost'
      });
      var usageLabel = this.textConfig.usageButtonLabel || '参照';
      var usageButtonHtml = this.buildActionButtonHtml('usage', {
        label: usageLabel,
        hoverLabel: view.titleRaw + 'の使用箇所を確認',
        ariaLabel: view.titleRaw + 'の使用箇所を確認',
        baseClass: 'content-item__action table-action-button',
        fallbackClass: 'content-item__action btn btn--ghost',
        type: 'button',
        dataset: {
          cpReference: 'true',
          id: view.id
        }
      });
      var openButtonHtml = this.buildActionButtonHtml('detail', {
        label: '開く',
        hoverLabel: view.openHoverLabel,
        ariaLabel: view.openHoverLabel,
        baseClass: 'content-item__action table-action-button',
        fallbackClass: 'content-item__action btn btn--ghost',
        type: 'button',
        dataset: {
          cpOpen: 'true',
          id: view.id
        }
      });
      var proxyButtonHtml = this.buildActionButtonHtml('proxy', {
        label: this.textConfig.proxyButtonLabel,
        hoverLabel: view.proxyHoverLabel,
        ariaLabel: view.proxyHoverLabel,
        baseClass: 'content-item__action table-action-button',
        fallbackClass: 'content-item__action btn btn--ghost',
        type: 'button',
        dataset: {
          cpProxy: 'true',
          id: view.id
        },
        disabled: !!(view.item && view.item.isProxyEncoding)
      });
      var visibilityToggleHtml = this.buildVisibilityToggle(view);
      var downloadButtonHtml = this.buildActionButtonHtml('download', {
        label: 'DL',
        hoverLabel: view.downloadHoverLabel,
        ariaLabel: view.downloadHoverLabel,
        baseClass: 'content-item__action table-action-button',
        fallbackClass: 'content-item__action btn btn--ghost',
        type: 'button',
        dataset: {
          cpDownload: 'true',
          id: view.id
        }
      });
      var deleteButtonHtml = this.buildActionButtonHtml('delete', {
        label: '削除',
        hoverLabel: view.deleteHoverLabel,
        ariaLabel: view.deleteHoverLabel,
        baseClass: 'content-item__action table-action-button',
        fallbackClass: 'content-item__action table-action-button table-action-button--delete',
        type: 'button',
        dataset: {
          cpDelete: 'true',
          id: view.id
        }
      });
      return '<div class="content-item__actions content-library__panel-item-actions content-library__panel-actions">'
        + openButtonHtml
        + submitButtonHtml
        + usageButtonHtml
        + proxyButtonHtml
        + visibilityToggleHtml
        + downloadButtonHtml
        + deleteButtonHtml
        + '</div>';
    }

    buildVisibilityToggle(view)
    {
      var isVisible = !(view && view.item && view.item.isVisible === false);
      var stateLabel = view && view.visibilityStateLabel ? view.visibilityStateLabel : (isVisible ? '表示' : '非表示');
      var toggleLabel = view && view.visibilityToggleLabel ? view.visibilityToggleLabel : (isVisible ? '非表示' : '表示化');
      var ariaLabel = view && view.titleRaw
        ? view.titleRaw + 'を' + (isVisible ? '非表示' : '表示') + 'に切り替える'
        : (isVisible ? '非表示にする' : '表示する');
      var buttonClass = 'content-item__visibility-toggle content-item__action';
      buttonClass += isVisible ? ' is-visible' : ' is-hidden';
      var switchHtml = '' +
        '<span class="content-item__visibility-toggle-track" aria-hidden="true">' +
          '<span class="content-item__visibility-toggle-thumb"></span>' +
        '</span>';
      var hiddenTextHtml = '' +
        '<span class="visually-hidden">' +
          this.escapeHtml(stateLabel) + ' ' + this.escapeHtml(toggleLabel) +
        '</span>';
      return '' +
        '<button type="button" class="' + buttonClass + '"' +
          ' data-cp-visibility-toggle="true"' +
          ' data-id="' + this.escapeHtml(view && view.id ? view.id : '') + '"' +
          ' data-target-visible="' + (isVisible ? 'false' : 'true') + '"' +
          ' aria-pressed="' + (isVisible ? 'true' : 'false') + '"' +
          ' aria-checked="' + (isVisible ? 'true' : 'false') + '"' +
          ' role="switch"' +
          ' aria-label="' + this.escapeHtml(ariaLabel) + '">' +
          switchHtml + hiddenTextHtml +
        '</button>';
    }

    buildPanelPreview(item, view)
    {
      var preview = this.resolvePanelPreviewData(item, view);
      var badgeHtml = this.buildThumbBadges(preview, view);
      var mediaHtml = '';
      if (preview.imageSrc)
      {
        var alt = preview.imageAlt || view.titleRaw || 'コンテンツプレビュー';
        mediaHtml = '<img src="' + this.escapeHtml(preview.imageSrc) + '" alt="' + this.escapeHtml(alt) + '">';
      }
      else
      {
        var placeholderLabel = preview.placeholderLabel || preview.badgeLabel || 'コンテンツ';
        var placeholderKind = preview.badgeType || (item && item.kind) || 'file';
        mediaHtml = '' +
          '<div class="content-library__panel-thumb-placeholder">' +
            '<div class="content-library__panel-thumb-canvas"' +
              ' data-cp-panel-thumb="true"' +
              ' data-kind="' + this.escapeHtml(placeholderKind) + '"' +
              ' data-label="' + this.escapeHtml(placeholderLabel) + '"' +
              ' data-title="' + this.escapeHtml(view.titleRaw || '') + '"' +
            '></div>' +
          '</div>';
      }
      return '' +
        '<div class="content-library__panel-thumb">' +
          '<div class="content-library__panel-thumb-media">' + mediaHtml + '</div>' +
          badgeHtml +
          '<div class="content-library__panel-title-overlay">' +
            '<span class="content-library__panel-title-text">' + view.title + '</span>' +
          '</div>' +
        '</div>';
    }

    resolvePanelPreviewData(item, view)
    {
      var data = {
        badgeLabel: (view && view.categoryRaw) || (item && item.categoryLabel) || this.resolveCategoryLabel(item && item.kind) || 'コンテンツ',
        badgeType: 'file',
        placeholderLabel: this.resolveKindIcon(item && item.kind ? item.kind : 'file'),
        imageSrc: '',
        imageAlt: ''
      };
      if (!item)
      {
        return data;
      }
      if (item.kind === 'youtube')
      {
        data.badgeType = 'video';
        data.imageSrc = item.thumbnailUrl || '';
        data.imageAlt = (view && view.titleRaw) || 'YouTube サムネイル';
        data.placeholderLabel = 'YouTube';
        return data;
      }
      if (item.kind === 'movie')
      {
        data.badgeType = 'video';
        data.imageSrc = item.thumbnailUrl || this.resolveItemAssetUrl(item, 'image', { variant: 'thumbnail' }) || '';
        data.imageAlt = (view && view.titleRaw) || '動画プレビュー';
        data.placeholderLabel = '動画';
        return data;
      }
      if (item.kind === 'image')
      {
        data.badgeType = 'image';
        data.imageSrc = this.resolveItemAssetUrl(item, 'image', { variant: 'thumbnail' }) || '';
        data.imageAlt = (view && view.titleRaw) || '画像';
        data.placeholderLabel = '画像';
        return data;
      }
      if (item.kind === 'audio')
      {
        data.placeholderLabel = '音声';
        return data;
      }
      if (this.isPdfItem(item))
      {
        data.badgeType = 'pdf';
        data.placeholderLabel = 'PDF';
        data.imageSrc = '';
        data.imageAlt = '';
        return data;
      }
      return data;
    }

    normalizePanelPlaceholderType(kind)
    {
      var normalized = (kind ? String(kind) : 'file').toLowerCase();
      if (normalized === 'movie' || normalized === 'video' || normalized === 'youtube')
      {
        return 'video';
      }
      if (normalized === 'image' || normalized === 'img')
      {
        return 'image';
      }
      if (normalized === 'audio' || normalized === 'music')
      {
        return 'audio';
      }
      if (normalized === 'pdf')
      {
        return 'pdf';
      }
      return 'file';
    }

    resolvePanelPlaceholderPalette(kind)
    {
      var paletteMap = {
        video: {
          backgroundStart: 'rgba(12, 28, 56, 0.95)',
          backgroundEnd: 'rgba(5, 12, 26, 0.9)',
          card: 'rgba(9, 19, 36, 0.92)',
          accentLayer: 'rgba(59, 130, 246, 0.25)',
          fold: 'rgba(96, 165, 250, 0.95)',
          lines: 'rgba(226, 232, 240, 0.9)'
        },
        image: {
          backgroundStart: 'rgba(8, 36, 32, 0.95)',
          backgroundEnd: 'rgba(6, 20, 30, 0.9)',
          card: 'rgba(8, 26, 26, 0.9)',
          accentLayer: 'rgba(45, 212, 191, 0.22)',
          fold: 'rgba(34, 197, 94, 0.92)',
          lines: 'rgba(209, 250, 229, 0.92)'
        },
        pdf: {
          backgroundStart: 'rgba(46, 20, 28, 0.92)',
          backgroundEnd: 'rgba(24, 10, 18, 0.9)',
          card: 'rgba(34, 12, 20, 0.88)',
          accentLayer: 'rgba(248, 113, 113, 0.22)',
          fold: 'rgba(248, 113, 113, 0.95)',
          lines: 'rgba(254, 226, 226, 0.92)'
        },
        audio: {
          backgroundStart: 'rgba(20, 24, 54, 0.92)',
          backgroundEnd: 'rgba(18, 12, 38, 0.9)',
          card: 'rgba(20, 16, 42, 0.9)',
          accentLayer: 'rgba(129, 140, 248, 0.2)',
          fold: 'rgba(129, 140, 248, 0.95)',
          lines: 'rgba(224, 231, 255, 0.9)'
        },
        file: {
          backgroundStart: 'rgba(18, 38, 64, 0.95)',
          backgroundEnd: 'rgba(12, 22, 40, 0.9)',
          card: 'rgba(10, 24, 40, 0.92)',
          accentLayer: 'rgba(14, 165, 233, 0.22)',
          fold: 'rgba(56, 189, 248, 0.95)',
          lines: 'rgba(226, 232, 240, 0.9)'
        }
      };

      var normalized = this.normalizePanelPlaceholderType(kind);
      return paletteMap[normalized] || paletteMap.file;
    }

    loadPanelP5()
    {
      if (this._panelP5Promise)
      {
        return this._panelP5Promise;
      }

      var self = this;
      this._panelP5Promise = new Promise(function (resolve, reject)
      {
        if (window.p5)
        {
          resolve(window.p5);
          return;
        }

        var candidates = [
          'https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js',
          'https://unpkg.com/p5@1.9.0/lib/p5.min.js'
        ];

        (function tryNext(index)
        {
          if (index >= candidates.length)
          {
            self._panelP5Promise = null;
            reject(new Error('[contents] failed to load p5.js for panel thumbnail'));
            return;
          }

          var script = document.createElement('script');
          script.src = candidates[index];
          script.async = false;
          script.onload = function ()
          {
            if (window.p5)
            {
              resolve(window.p5);
              return;
            }
            tryNext(index + 1);
          };
          script.onerror = function ()
          {
            tryNext(index + 1);
          };
          document.head.appendChild(script);
        })(0);
      });

      return this._panelP5Promise;
    }

    renderPanelThumbPlaceholder(host)
    {
      if (!host)
      {
        return;
      }

      while (host.firstChild)
      {
        host.removeChild(host.firstChild);
      }

      var kind = this.normalizePanelPlaceholderType(host.getAttribute('data-kind'));
      var label = host.getAttribute('data-label') || 'コンテンツ';
      var title = host.getAttribute('data-title') || '';

      if (kind === 'file' || kind === 'pdf')
      {
        host.className = host.className + ' content-library__panel-thumb-emboss-host';

        var emboss = document.createElement('div');
        emboss.className = 'content-library__panel-thumb-emboss content-library__panel-thumb-emboss--' + kind;

        var fold = document.createElement('span');
        fold.className = 'content-library__panel-thumb-emboss-corner';
        emboss.appendChild(fold);

        host.appendChild(emboss);
        return;
      }

      var palette = this.resolvePanelPlaceholderPalette(kind);
      var self = this;

      window.requestAnimationFrame(function ()
      {
        self.loadPanelP5().then(function ()
        {
          var width = Math.max(host.clientWidth || 0, 320);
          var height = Math.max(host.clientHeight || 0, Math.round(width * 0.56));
          var foldSize = Math.min(width, height) * 0.12;
          var bodyWidth = width * 0.52;
          var bodyHeight = height * 0.62;
          var baseX = (width - bodyWidth) / 2;
          var baseY = (height - bodyHeight) / 2;

          var sketch = function (p)
          {
            p.setup = function ()
            {
              var canvas = p.createCanvas(width, height);
              canvas.parent(host);
              p.noLoop();
              p.pixelDensity(2);
            };

            p.draw = function ()
            {
              var ctx = p.drawingContext;
              var gradient = ctx.createLinearGradient(0, 0, width, height);
              gradient.addColorStop(0, palette.backgroundStart);
              gradient.addColorStop(1, palette.backgroundEnd);
              ctx.save();
              ctx.fillStyle = gradient;
              ctx.fillRect(0, 0, width, height);
              ctx.restore();

              p.noStroke();
              p.fill(palette.card);
              p.rect(baseX, baseY, bodyWidth, bodyHeight, 14);

              p.fill(palette.accentLayer);
              p.rect(baseX + 8, baseY + 10, bodyWidth - 16, bodyHeight - 20, 12);

              p.noStroke();
              p.fill('rgba(255, 255, 255, 0.12)');
              var iconWidth = bodyWidth * 0.38;
              var iconHeight = bodyHeight * 0.5;
              var iconX = baseX + (bodyWidth - iconWidth) / 2;
              var iconY = baseY + (bodyHeight - iconHeight) / 2 - 6;
              p.rect(iconX, iconY, iconWidth, iconHeight, 14);
              p.fill('rgba(255, 255, 255, 0.18)');
              p.beginShape();
              p.vertex(iconX + iconWidth - foldSize * 0.9, iconY);
              p.vertex(iconX + iconWidth, iconY);
              p.vertex(iconX + iconWidth, iconY + foldSize * 0.9);
              p.endShape(p.CLOSE);

              p.fill(palette.fold);
              p.beginShape();
              p.vertex(baseX + bodyWidth - foldSize, baseY);
              p.vertex(baseX + bodyWidth, baseY);
              p.vertex(baseX + bodyWidth, baseY + foldSize);
              p.endShape(p.CLOSE);

              p.stroke(palette.lines);
              p.strokeWeight(2.2);
              var lineY = baseY + foldSize + 16;
              for (var i = 0; i < 3; i += 1)
              {
                p.line(baseX + 16, lineY + i * 14, baseX + bodyWidth - 16, lineY + i * 14);
              }

              p.stroke(palette.fold);
              p.strokeWeight(3);
              p.noFill();
              p.rect(baseX + 12, baseY + bodyHeight - 52, bodyWidth - 24, 32, 10);

              p.noStroke();
              p.fill(palette.lines);
              p.textAlign(p.CENTER, p.CENTER);
              p.textStyle(p.BOLD);
              p.textSize(Math.min(18, bodyWidth * 0.18));
              p.text(label, baseX + bodyWidth / 2, baseY + bodyHeight - 34);

              if (title)
              {
                p.textSize(Math.min(14, bodyWidth * 0.14));
                p.text(title.slice(0, 18), baseX + bodyWidth / 2, baseY + bodyHeight - 14);
              }
            };
          };

          new window.p5(sketch); // eslint-disable-line no-new
        }).catch(function (error)
        {
          window.console.warn('[contents] failed to render panel placeholder', error);
        });
      });
    }

    renderPanelThumbPlaceholders()
    {
      var sel = this.selectorConfig || {};
      var $panelList = sel.panelListContainer ? $(sel.panelListContainer) : $();
      if (!$panelList.length)
      {
        return;
      }

      var self = this;
      $panelList.find('[data-cp-panel-thumb]').each(function ()
      {
        self.renderPanelThumbPlaceholder(this);
      });
    }

    buildListItemHtml(item, index) {
      var view = this.buildItemDisplayProps(item, index);
      if (!view) {
        return '';
      }
      var submitButtonHtml = this.buildSubmitActionButton(view, {
        baseClass: 'content-item__action table-action-button',
        fallbackClass: 'content-item__action btn btn--ghost'
      });
      var usageLabel = this.textConfig.usageButtonLabel || '参照';
      var usageButtonHtml = this.buildActionButtonHtml('usage', {
        label: usageLabel,
        hoverLabel: view.titleRaw + 'の使用箇所を確認',
        ariaLabel: view.titleRaw + 'の使用箇所を確認',
        baseClass: 'content-item__action table-action-button',
        fallbackClass: 'content-item__action btn btn--ghost',
        type: 'button',
        dataset: {
          cpReference: 'true',
          id: view.id
        }
      });
      var openButtonHtml = this.buildActionButtonHtml('detail', {
        label: '開く',
        hoverLabel: view.openHoverLabel,
        ariaLabel: view.openHoverLabel,
        baseClass: 'content-item__action table-action-button',
        fallbackClass: 'content-item__action btn btn--ghost',
        type: 'button',
        dataset: {
          cpOpen: 'true',
          id: view.id
        }
      });
      var proxyButtonHtml = this.buildActionButtonHtml('proxy', {
        label: this.textConfig.proxyButtonLabel,
        hoverLabel: view.proxyHoverLabel,
        ariaLabel: view.proxyHoverLabel,
        baseClass: 'content-item__action table-action-button',
        fallbackClass: 'content-item__action btn btn--ghost',
        type: 'button',
        dataset: {
          cpProxy: 'true',
          id: view.id
        },
        disabled: !!(view.item && view.item.isProxyEncoding)
      });
      var visibilityToggleHtml = this.buildVisibilityToggle(view);
      var downloadButtonHtml = this.buildActionButtonHtml('download', {
        label: 'DL',
        hoverLabel: view.downloadHoverLabel,
        ariaLabel: view.downloadHoverLabel,
        baseClass: 'content-item__action table-action-button',
        fallbackClass: 'content-item__action btn btn--ghost',
        type: 'button',
        dataset: {
          cpDownload: 'true',
          id: view.id
        }
      });
      var deleteButtonHtml = this.buildActionButtonHtml('delete', {
        label: '削除',
        hoverLabel: view.deleteHoverLabel,
        ariaLabel: view.deleteHoverLabel,
        baseClass: 'content-item__action table-action-button',
        fallbackClass: 'content-item__action btn btn--danger-outline',
        type: 'button',
        dataset: {
          cpDelete: 'true',
          id: view.id
        }
      });
      var rowClass = 'content-item';
      if (view.item && view.item.isVisible === false) {
        rowClass += ' content-item--hidden';
      }
      return '' +
        '<tr class="' + rowClass + '" data-id="' + view.id + '">' +
          '<td class="content-item__cell content-item__cell--preview">' +
            this.buildPreviewContent(view.item, view) +
          '</td>' +
          '<td class="content-item__cell content-item__cell--meta">' +
            '<div class="content-item__meta">' +
              '<button type="button" class="content-item__title-button" data-cp-open data-id="' + view.id + '">' + view.title + '</button>' +
              view.bitrateHtml +
              (view.meta ? '<p class="content-item__description">' + view.meta + '</p>' : '') +
              view.proxyStatusHtml +
            '</div>' +
          '</td>' +
          '<td class="content-item__cell content-item__cell--visibility">' +
            visibilityToggleHtml +
          '</td>' +
          '<td class="content-item__cell content-item__cell--actions">' +
            '<div class="content-item__actions">' +
              openButtonHtml +
              submitButtonHtml +
              usageButtonHtml +
              proxyButtonHtml +
              downloadButtonHtml +
              deleteButtonHtml +
            '</div>' +
          '</td>' +
        '</tr>';
    }

    buildPreviewContent(item, view)
    {
      var preview = this.resolvePanelPreviewData(item, view);
      var badgeHtml = this.buildThumbBadges(preview, view);

      if (preview.imageSrc)
      {
        var alt = this.escapeHtml(preview.imageAlt || (view && view.titleRaw) || 'コンテンツプレビュー');
        return '' +
          '<div class="content-item__preview content-item__preview--thumbnail">' +
            '<img src="' + this.escapeHtml(preview.imageSrc) + '" alt="' + alt + '">' +
            badgeHtml +
          '</div>';
      }

      return this.buildPreviewPlaceholder(item, badgeHtml);
    }

    buildPreviewPlaceholder(item, badgeHtml) {
      var kind = item && item.kind ? item.kind : 'file';
      var label = this.escapeHtml(this.resolveCategoryLabel(kind) || 'コンテンツ');
      var icon = this.escapeHtml(this.resolveKindIcon(kind));
      return '' +
        '<div class="content-item__preview content-item__preview-placeholder content-item__preview--thumbnail">' +
          (badgeHtml || '') +
          '<span class="content-item__preview-placeholder-icon" aria-hidden="true">' + icon + '</span>' +
          '<span class="content-item__preview-placeholder-label">' + label + '</span>' +
        '</div>';
    }

    buildThumbBadges(preview, view)
    {
      var badgeClass = 'content-library__panel-type-badge';
      if (preview.badgeType)
      {
        badgeClass += ' content-library__panel-type-badge--' + preview.badgeType;
      }
      var badgeHtml = preview.badgeLabel
        ? '<span class="' + badgeClass + '">' + this.escapeHtml(preview.badgeLabel) + '</span>'
        : '';
      var durationHtml = '';
      var hasDuration = (preview && preview.badgeType === 'video') && view && view.durationLabel;
      if (hasDuration)
      {
        durationHtml = '<span class="content-library__badge-duration">' + this.escapeHtml(view.durationLabel) + '</span>';
      }
      if (!badgeHtml && !durationHtml)
      {
        return '';
      }
      return '<div class="content-library__thumb-badges">' + badgeHtml + durationHtml + '</div>';
    }

    buildProxyStatusHtml(item)
    {
      if (!item || !item.isProxyEncoding)
      {
        return '';
      }
      var label = item.proxyStatusLabel || this.textConfig.proxyEncoding;
      return '<p class="content-item__proxy-status content-item__proxy-status--processing">' + this.escapeHtml(label) + '</p>';
    }

    buildBitrateBadges(item, itemId)
    {
      if (!item || item.kind !== 'movie')
      {
        return '';
      }

      var badges = [];
      var resolvedId = (itemId !== undefined && itemId !== null) ? String(itemId) : '';
      var baseBitrate = this.normalizeNumber(item.bitrate || (item.raw && item.raw.bitrate));
      if (baseBitrate > 0)
      {
        badges.push(this.buildBitrateBadge(baseBitrate, '元動画', {
          itemId: resolvedId,
          source: 'original'
        }));
      }

      var proxyList = Array.isArray(item.proxyList) ? item.proxyList : [];
      for (var i = 0; i < proxyList.length; i += 1)
      {
        var proxy = proxyList[i];
        if (!proxy)
        {
          continue;
        }
        var proxyBitrate = this.normalizeNumber(proxy.bitrate);
        if (proxyBitrate > 0)
        {
          badges.push(this.buildBitrateBadge(proxyBitrate, null, {
            itemId: resolvedId,
            source: 'proxy',
            proxyIndex: i
          }));
        }
      }

      if (!badges.length)
      {
        return '';
      }

      return '<div class="content-item__bitrates">' + badges.join('') + '</div>';
    }

    buildBitrateBadge(bitrateValue, sourceLabel, options)
    {
      var rate = this.normalizeNumber(bitrateValue);
      if (rate <= 0)
      {
        return '';
      }

      var text = this.formatBitrate(rate);
      if (!text)
      {
        return '';
      }

      var ariaLabel = sourceLabel ? sourceLabel + ' ' + text : 'ビットレート ' + text;
      var dataset = this.buildBitrateBadgeDataset(options);
      var service = this.buttonService;
      if (service && typeof service.createActionButton === 'function')
      {
        try
        {
          var node = service.createActionButton('content-bitrate', {
            label: text,
            ariaLabel: ariaLabel,
            dataset: dataset
          });
          if (node)
          {
            return this.nodeToHtml(node);
          }
        }
        catch (err)
        {
          if (window.console && typeof window.console.warn === 'function')
          {
            window.console.warn('[contents] failed to create bitrate badge', err);
          }
        }
      }

      var datasetAttrs = this.buildDatasetAttributeString(dataset);
      return '<span class="mock-avatar__upload-btn content-item__bitrate-badge"' + datasetAttrs + ' aria-label="' + this.escapeHtml(ariaLabel) + '">' + this.escapeHtml(text) + '</span>';
    }

    buildBitrateBadgeDataset(options)
    {
      var dataset = { cpBitrate: 'true' };
      if (options && options.itemId)
      {
        dataset.id = String(options.itemId);
      }
      if (options && options.source)
      {
        dataset.bitrateSource = String(options.source);
      }
      if (options && options.proxyIndex !== undefined && options.proxyIndex !== null)
      {
        dataset.bitrateProxyIndex = String(options.proxyIndex);
      }
      return dataset;
    }

    buildDatasetAttributeString(dataset)
    {
      var attrs = [];
      var keys = dataset ? Object.keys(dataset) : [];
      for (var i = 0; i < keys.length; i += 1)
      {
        var key = keys[i];
        if (!Object.prototype.hasOwnProperty.call(dataset, key))
        {
          continue;
        }
        var value = dataset[key];
        if (value === undefined || value === null)
        {
          continue;
        }
        var name = this.toDataAttributeName(key);
        attrs.push(' ' + name + '="' + this.escapeHtml(value) + '"');
      }
      return attrs.join('');
    }

    buildActionButtonHtml(type, config)
    {
      var fallbackHtml = this.buildFallbackActionButton(config);
      var service = this.buttonService;
      if (!service || typeof service.createActionButton !== 'function')
      {
        return fallbackHtml;
      }
      try
      {
        var opts = Object.assign({ type: 'button' }, config || {});
        if (opts && Object.prototype.hasOwnProperty.call(opts, 'fallbackClass'))
        {
          delete opts.fallbackClass;
        }
        var node = service.createActionButton(type, opts);
        if (node)
        {
          return this.nodeToHtml(node);
        }
      }
      catch (err)
      {
        if (window.console && typeof window.console.warn === 'function')
        {
          window.console.warn('[contents] failed to create action button', err);
        }
      }
      return fallbackHtml;
    }

    buildFallbackActionButton(config)
    {
      var opts = config || {};
      var labelText = '';
      if (opts.label !== undefined && opts.label !== null)
      {
        labelText = String(opts.label);
      }
      else if (opts.fallbackLabel !== undefined && opts.fallbackLabel !== null)
      {
        labelText = String(opts.fallbackLabel);
      }
      var attrs = {};
      var attrSource = (opts && opts.attributes && typeof opts.attributes === 'object') ? opts.attributes : null;
      if (attrSource)
      {
        var attrKeys = Object.keys(attrSource);
        for (var i = 0; i < attrKeys.length; i += 1)
        {
          var key = attrKeys[i];
          attrs[key] = attrSource[key];
        }
      }
      var dataset = (opts && opts.dataset && typeof opts.dataset === 'object') ? opts.dataset : null;
      if (dataset)
      {
        var dsKeys = Object.keys(dataset);
        for (var j = 0; j < dsKeys.length; j += 1)
        {
          var dsKey = dsKeys[j];
          var attrName = this.toDataAttributeName(dsKey);
          attrs[attrName] = dataset[dsKey];
        }
      }
      if (!attrs.type)
      {
        attrs.type = opts.type || 'button';
      }
      var baseClass = (typeof opts.baseClass === 'string' && opts.baseClass.trim()) ? opts.baseClass.trim() : '';
      var fallbackClass = (typeof opts.fallbackClass === 'string' && opts.fallbackClass.trim()) ? opts.fallbackClass.trim() : '';
      var className = fallbackClass || baseClass || 'content-item__action btn';
      attrs['class'] = className;
      if (opts.ariaLabel)
      {
        attrs['aria-label'] = opts.ariaLabel;
      }
      if (opts.hoverLabel)
      {
        attrs['data-hover-label'] = opts.hoverLabel;
      }
      if (opts.title)
      {
        attrs.title = opts.title;
      }
      if (opts.disabled)
      {
        attrs.disabled = 'disabled';
      }
      var attrParts = [];
      var finalAttrKeys = Object.keys(attrs);
      for (var k = 0; k < finalAttrKeys.length; k += 1)
      {
        var attrKey = finalAttrKeys[k];
        var value = attrs[attrKey];
        if (value === undefined || value === null)
        {
          continue;
        }
        if (value === true)
        {
          attrParts.push(attrKey);
        }
        else
        {
          attrParts.push(attrKey + '="' + this.escapeHtml(value) + '"');
        }
      }
      return '<button ' + attrParts.join(' ') + '>' + this.escapeHtml(labelText) + '</button>';
    }

    toDataAttributeName(key)
    {
      return 'data-' + String(key || '').replace(/([A-Z])/g, function (match)
      {
        return '-' + match.toLowerCase();
      });
    }

    nodeToHtml(node)
    {
      if (!node)
      {
        return '';
      }
      if (node.outerHTML)
      {
        return node.outerHTML;
      }
      var doc = document;
      var wrap = doc.createElement('div');
      wrap.appendChild(node);
      return wrap.innerHTML;
    }

    setViewMode(mode)
    {
      var next = mode === 'panel' ? 'panel' : 'list';
      if (this.state.viewMode === next)
      {
        this.updateViewModeVisibility();
        return;
      }
      this.state.viewMode = next;
      this.updateViewModeVisibility();
    }

    updateViewModeVisibility()
    {
      var selectors = this.selectorConfig || {};
      var currentMode = this.state.viewMode === 'panel' ? 'panel' : 'list';
      var $listWrapper = selectors.listWrapper ? $(selectors.listWrapper) : $();
      var $panelWrapper = selectors.panelWrapper ? $(selectors.panelWrapper) : $();
      if ($listWrapper.length)
      {
        if (currentMode === 'panel')
        {
          $listWrapper.attr('hidden', 'hidden');
        }
        else
        {
          $listWrapper.removeAttr('hidden');
        }
      }
      if ($panelWrapper.length)
      {
        if (currentMode === 'panel')
        {
          $panelWrapper.removeAttr('hidden');
        }
        else
        {
          $panelWrapper.attr('hidden', 'hidden');
        }
      }
      var $viewButtons = selectors.viewModeButton ? $(selectors.viewModeButton) : $();
      $viewButtons.each(function ()
      {
        var $btn = $(this);
        var mode = $btn.attr('data-cp-view-mode');
        var isActive = mode === currentMode;
        $btn.toggleClass('is-active', isActive);
        $btn.attr('aria-pressed', isActive ? 'true' : 'false');
      });
      this.refreshSelectAllCheckboxState();
    }

    refreshSelectAllCheckboxState()
    {
      var selectors = this.selectorConfig || {};
      var $checkboxes = selectors.selectAllCheckbox ? $(selectors.selectAllCheckbox) : $();
      if (!$checkboxes.length)
      {
        return;
      }
      var currentMode = this.state.viewMode === 'panel' ? 'panel' : 'list';
      $checkboxes.each(function ()
      {
        var $checkbox = $(this);
        var targetMode = $checkbox.attr('data-cp-view-mode');
        if (targetMode && targetMode !== currentMode)
        {
          return;
        }
        $checkbox.prop('checked', false);
      });
    }

    /**
     * プレビュー表示
     */
    async openItem(id)
    {
      if (!id)
      {
        return;
      }
      var item = this.getItemById(id);
      if (!item)
      {
        this.toast(this.textConfig.previewUnavailable);
        return;
      }
      if (item.kind === 'youtube')
      {
        await this.openYouTubeModal(item);
        return;
      }
      if (item.kind === 'movie' || item.kind === 'audio')
      {
        if (item.kind === 'audio')
        {
          await this.openMediaInAudioModal(item);
        }
        else
        {
          await this.openMediaInVideoModal(item);
        }
        return;
      }
      if (item.kind === 'image')
      {
        this.openImageModal(item);
        return;
      }
      if (this.isPdfItem(item))
      {
        await this.openPdfModal(item);
        return;
      }
      this.toast(this.textConfig.previewUnavailable);
    }

    async openYouTubeModal(item)
    {
      var service = this.youtubeVideoModalService || (this.services && this.services.youtubeVideoModal);
      if (!service)
      {
        throw new Error('YouTubeモーダルサービスが初期化されていません。');
      }
      var url = '';
      var title = (item && item.title) || '';
      var metadata = item && item.youtube ? item.youtube : null;
      if (!metadata)
      {
        metadata = this.buildInlineYouTubeMetadata(item && item.raw);
      }
      if (!metadata)
      {
        var fetched = await this.fetchYouTubeMetadata(item && item.raw);
        if (fetched)
        {
          metadata = this.normalizeYouTubeMetadata(fetched);
        }
      }
      if (metadata)
      {
        url = metadata.embedUrl || metadata.watchUrl || '';
        title = metadata.title || title;
        if (item)
        {
          item.youtube = metadata;
          if (!item.thumbnailUrl && metadata.thumbnailUrl)
          {
            item.thumbnailUrl = metadata.thumbnailUrl;
          }
          if (metadata.title)
          {
            item.title = metadata.title;
          }
        }
      }
      if (!url)
      {
        this.toast(this.textConfig.previewUnavailable);
        return;
      }
      try
      {
        service.show(url, { title: title, autoplay: false });
      }
      catch (err)
      {
        this.onError(err);
        this.toast(this.textConfig.previewUnavailable);
      }
    }

    async openMediaInAudioModal(item)
    {
      var service = this.audioModalService || (this.services && this.services.audioModal);
      if (!service)
      {
        throw new Error('音声モーダルサービスが初期化されていません。');
      }
      var src = this.resolveItemAssetUrl(item, 'audio');
      if (!src)
      {
        this.toast(this.textConfig.previewUnavailable);
        return;
      }
      try
      {
        service.show(src, { title: item && item.title ? item.title : '', autoplay: false });
      }
      catch (err)
      {
        this.onError(err);
        this.toast(this.textConfig.previewUnavailable);
      }
    }

    async openMediaInVideoModal(item)
    {
      var service = this.videoModalService || (this.services && this.services.videoModal);
      if (!service)
      {
        throw new Error('動画モーダルサービスが初期化されていません。');
      }
      var quality = '';
      if (item && item.kind === 'movie' && this.shouldUseLowRateVideo(item.raw))
      {
        quality = 'low';
      }
      var contentCode = item && item.recordId;
      if (!contentCode)
      {
        this.toast(this.textConfig.previewUnavailable);
        return;
      }
      try
      {
        await service.openContentVideo({
          contentCode: contentCode,
          quality: quality,
          title: item && item.title ? item.title : '',
          contentRecord: item && item.raw ? item.raw : null
        }, { autoplay: false, contentDataset: this.contentsDataset });
      }
      catch (err)
      {
        this.onError(err);
        this.toast(this.textConfig.previewUnavailable);
      }
    }

    async openBitrateVariant(id, options)
    {
      if (!id)
      {
        return;
      }
      var item = this.getItemById(id);
      if (!item || item.kind !== 'movie')
      {
        this.toast(this.textConfig.previewUnavailable);
        return;
      }
      var service = this.videoModalService || (this.services && this.services.videoModal);
      if (!service)
      {
        throw new Error('動画モーダルサービスが初期化されていません。');
      }
      var playback = this.resolveBitratePlaybackTarget(item, options);
      if (!playback)
      {
        this.toast(this.textConfig.previewUnavailable);
        return;
      }
      try
      {
        if (playback.spec)
        {
          service.openContentVideo(playback.spec, { autoplay: false, contentDataset: this.contentsDataset });
        }
        else if (playback.src)
        {
          service.openHtml5(playback.src, { title: playback.title, autoplay: false });
        }
      }
      catch (err)
      {
        this.onError(err);
        this.toast(this.textConfig.previewUnavailable);
      }
    }

    resolveBitratePlaybackTarget(item, options)
    {
      if (!item || item.kind !== 'movie')
      {
        return null;
      }
      var contentCode = item && item.recordId;
      if (!contentCode)
      {
        return null;
      }
      var source = options && options.source ? String(options.source) : '';
      if (source === 'proxy')
      {
        var list = Array.isArray(item.proxyList) ? item.proxyList : [];
        var rawIndex = (options && options.proxyIndex !== undefined) ? options.proxyIndex : null;
        var index = rawIndex === null ? -1 : parseInt(rawIndex, 10);
        if (!(index >= 0 && index < list.length))
        {
          return null;
        }
        var proxy = list[index];
        var qualityKey = this.resolveProxyQualityKey(proxy, index);
        if (!qualityKey)
        {
          return null;
        }
        var proxyId = this.resolveProxyId(proxy);
        return {
          type: 'content',
          spec: {
            contentCode: contentCode,
            quality: qualityKey,
            title: item && item.title ? item.title : '',
            proxyId: proxyId,
            contentRecord: item && item.raw ? item.raw : null
          }
        };
      }
      return {
        type: 'content',
        spec: {
          contentCode: contentCode,
          quality: '',
          title: item && item.title ? item.title : '',
          contentRecord: item && item.raw ? item.raw : null
        }
      };
    }

    openImageModal(item)
    {
      var service = this.imageModalService || (this.services && this.services.imageModal);
      if (!service)
      {
        throw new Error('画像モーダルサービスが初期化されていません。');
      }
      var src = this.resolveItemAssetUrl(item, 'image');
      if (!src)
      {
        this.toast(this.textConfig.previewUnavailable);
        return;
      }
      service.show(src, {
        alt: item && item.title ? item.title : '',
        caption: item && item.title ? item.title : ''
      });
    }

    async openPdfModal(item)
    {
      var service = this.pdfModalService || (this.services && this.services.pdfModal);
      if (!service)
      {
        throw new Error('PDFモーダルサービスが初期化されていません。');
      }
      var src = this.resolveItemAssetUrl(item, 'pdf');
      if (!src)
      {
        this.toast(this.textConfig.previewUnavailable);
        return;
      }
      var title = (item && item.title) ? item.title : (this.resolveCategoryLabel('pdf') || 'PDF');
      try
      {
        service.show({
          title: title,
          src: src,
          ariaLabel: title,
          showDownload: true,
          showOpenInNewTab: true
        });
      }
      catch (err)
      {
        this.onError(err);
        this.toast(this.textConfig.previewUnavailable);
      }
    }

    resolveItemAssetUrl(item, preferredKind, options)
    {
      var record = item && item.raw;
      var kind = preferredKind || '';
      if (!kind && record && record.contentType)
      {
        kind = String(record.contentType || '').toLowerCase();
      }
      if (kind === 'image')
      {
        var imageUrl = this.buildContentImageUrl(record, options || {});
        if (imageUrl)
        {
          return imageUrl;
        }
      }
      if (kind === 'audio')
      {
        var audioUrl = this.buildContentAudioUrl(record);
        if (audioUrl)
        {
          return audioUrl;
        }
      }
      if (kind === 'movie' || kind === 'video')
      {
        var service = this.videoModalService || (this.services && this.services.videoModal);
        if (!service || !record || !record.contentCode)
        {
          return '';
        }
        var quality = options && options.quality;
        return service.getContentVideoUrl({
          contentCode: record.contentCode,
          quality: quality
        });
      }
      return this.buildContentFileUrl(record);
    }

    resolveProxyVideoSrc(item, proxy)
    {
      if (!proxy || !proxy.filePath)
      {
        return '';
      }
      var baseRecord = (item && item.raw) ? item.raw : {};
      var record = Object.assign({}, baseRecord, { filePath: proxy.filePath });
      return this.buildContentFileUrl(record);
    }

    resolveProxyQualityKey(proxy, index)
    {
      var bitrate = this.normalizeNumber(proxy && proxy.bitrate);
      if (bitrate > 0)
      {
        return String(bitrate);
      }
      if (proxy && proxy.quality)
      {
        return String(proxy.quality);
      }
      var idx = (typeof index === 'number' && index >= 0) ? index : 0;
      return 'proxy-' + (idx + 1);
    }

    resolveProxyId(proxy)
    {
      if (!proxy)
      {
        return '';
      }
      var candidates = [proxy.id, proxy.usersContentsProxyId, proxy.usersContentsProxyID];
      for (var i = 0; i < candidates.length; i += 1)
      {
        if (candidates[i] !== undefined && candidates[i] !== null)
        {
          return String(candidates[i]);
        }
      }
      return '';
    }

    buildContentImageUrl(record, options)
    {
      if (!record || !record.filePath)
      {
        return '';
      }

      var variant = options && options.variant ? String(options.variant).toLowerCase() : '';
      var targetPath = record.filePath;
      if (variant === 'thumbnail' && record && record.thumbnailPath)
      {
        targetPath = record.thumbnailPath;
      }

      var normalizedPath = String(targetPath || '');
      if (/^https?:\/\//i.test(normalizedPath) || normalizedPath.indexOf('/') === 0)
      {
        return normalizedPath;
      }

      if (!record.contentCode)
      {
        return '';
      }

      var api = this.apiConfig || {};
      var requestType = api.requestType || 'Contents';
      var endpoint = api.endpoint || '';
      var token = api.token || '';

      if (window.Utils && typeof window.Utils.buildApiRequestOptions === 'function')
      {
        try
        {
          var defaults = window.Utils.buildApiRequestOptions(requestType, 'ContentImageGet', {});
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
          // ignore fallback errors
        }
      }

      if (!endpoint)
      {
        endpoint = window.Utils && typeof window.Utils.getApiEndpoint === 'function' ? window.Utils.getApiEndpoint() : '';
      }

      if (!endpoint)
      {
        return '';
      }

      var queryParams = [
        ['requestType', requestType],
        ['type', 'ContentImageGet'],
        ['token', token],
        ['contentCode', record.contentCode]
      ];

      if (variant === 'thumbnail')
      {
        queryParams.push(['variant', 'thumbnail']);
      }

      var query = queryParams
        .filter(function (entry)
        {
          return entry[1] !== undefined && entry[1] !== null;
        })
        .map(function (entry)
        {
          return encodeURIComponent(entry[0]) + '=' + encodeURIComponent(entry[1]);
        })
        .join('&');

      return endpoint + '?' + query;
    }

    buildContentAudioUrl(record)
    {
      if (!record || !record.filePath || !record.contentCode)
      {
        return '';
      }

      var normalizedPath = String(record.filePath || '');
      if (/^https?:\/\//i.test(normalizedPath) || normalizedPath.indexOf('/') === 0)
      {
        return normalizedPath;
      }

      var api = this.apiConfig || {};
      var requestType = api.requestType || 'Contents';
      var endpoint = api.endpoint || '';
      var token = api.token || '';

      if (window.Utils && typeof window.Utils.buildApiRequestOptions === 'function')
      {
        try
        {
          var defaults = window.Utils.buildApiRequestOptions(requestType, 'ContentAudioGet', {});
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
          // ignore fallback errors
        }
      }

      if (!endpoint)
      {
        endpoint = window.Utils && typeof window.Utils.getApiEndpoint === 'function' ? window.Utils.getApiEndpoint() : '';
      }

      if (!endpoint)
      {
        return '';
      }

      var queryParams = [
        ['requestType', requestType],
        ['type', 'ContentAudioGet'],
        ['token', token],
        ['contentCode', record.contentCode]
      ];

      var query = queryParams
        .filter(function (entry)
        {
          return entry[1] !== undefined && entry[1] !== null;
        })
        .map(function (entry)
        {
          return encodeURIComponent(entry[0]) + '=' + encodeURIComponent(entry[1]);
        })
        .join('&');

      return endpoint + '?' + query;
    }

    buildContentFileUrl(record)
    {
      if (!record || !record.filePath)
      {
        return '';
      }

      var recordKind = record.contentType ? String(record.contentType).toLowerCase() : '';
      if (recordKind === 'audio')
      {
        var audioUrl = this.buildContentAudioUrl(record);
        if (audioUrl)
        {
          return audioUrl;
        }
      }

      var path = String(record.filePath || '');
      if (/^https?:\/\//i.test(path) || path.indexOf('/') === 0)
      {
        return path;
      }

      if (record.contentCode)
      {
        var api = this.apiConfig || {};
        var requestType = api.requestType || 'Contents';
        var endpoint = api.endpoint || '';
        var token = api.token || '';

        if (window.Utils && typeof window.Utils.buildApiRequestOptions === 'function')
        {
          try
          {
            var defaults = window.Utils.buildApiRequestOptions(requestType, 'ContentFileGet', {});
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

        if (!endpoint)
        {
          endpoint = window.Utils && typeof window.Utils.getApiEndpoint === 'function' ? window.Utils.getApiEndpoint() : '';
        }

        if (!endpoint)
        {
          return '';
        }

        var queryParams = [
          ['requestType', requestType],
          ['type', 'ContentFileGet'],
          ['token', token],
          ['contentCode', record.contentCode]
        ];

        var query = queryParams
          .filter(function (entry)
          {
            return entry[1] !== undefined && entry[1] !== null;
          })
          .map(function (entry)
          {
            return encodeURIComponent(entry[0]) + '=' + encodeURIComponent(entry[1]);
          })
          .join('&');

        return endpoint + '?' + query;
      }

      var resolvedPath = path.replace(/^\/+/, '');
      var hasUserdataPrefix = resolvedPath.indexOf('data/userdata/') === 0 || resolvedPath.indexOf('userdata/') === 0;
      var userId = record.userId || (this.state && this.state.profile && this.state.profile.userId) || '';
      if (!hasUserdataPrefix && userId)
      {
        resolvedPath = 'data/userdata/' + encodeURIComponent(String(userId)) + '/' + resolvedPath;
      }
      var parts = resolvedPath
        .split('/')
        .filter(function (segment) { return segment !== ''; })
        .map(function (segment) { return encodeURIComponent(segment); });
      if (!parts.length)
      {
        return '';
      }
      return '/' + parts.join('/');
    }

    shouldUseLowRateVideo(record)
    {
      if (!record)
      {
        return false;
      }
      var flag = record.lowRateExists;
      if (typeof flag === 'string')
      {
        return flag === '1' || flag.toLowerCase() === 'true';
      }
      return !!flag;
    }

    resolveDownloadFileName(item)
    {
      if (!item)
      {
        return 'download';
      }
      if (item.raw && item.raw.fileName)
      {
        return String(item.raw.fileName);
      }
      if (item.title)
      {
        return String(item.title);
      }
      return 'download';
    }

    resolveDownloadSpec(item)
    {
      if (!item)
      {
        return null;
      }
      var fileName = this.resolveDownloadFileName(item);
      var totalBytes = typeof item.size === 'number' ? item.size : 0;
      var url = this.resolveItemAssetUrl(item, item.kind, null);
      if (!url)
      {
        return null;
      }
      return {
        fileName: fileName,
        totalBytes: totalBytes,
        request: {
          method: 'GET',
          url: url
        }
      };
    }

    async proxyItem(id)
    {
      if (!id)
      {
        return;
      }

      var item = this.getItemById(id);
      if (item && item.kind === 'youtube')
      {
        this.toast(this.textConfig.youtubeProxyUnavailable || this.textConfig.proxyUnavailable);
        return;
      }
      if (!item || item.kind !== 'movie')
      {
        this.toast(this.textConfig.proxyUnavailable);
        return;
      }

      this.loading(true);
      try
      {
        var result = await this.callApi('ContentProxy', { contentCode: item.recordId });
        var status = (result && result.status) ? String(result.status) : '';
        var message = result && result.message ? result.message : '';

        if (!message)
        {
          if (status === 'queued') message = this.textConfig.proxyQueued;
          else if (status === 'already_processing') message = this.textConfig.proxyAlreadyProcessing;
          else if (status === 'already_completed') message = this.textConfig.proxyCompleted;
          else message = this.textConfig.proxyRequested;
        }

        this.toast(message);
        return result;
      }
      catch (err)
      {
        var errorMessage = (err && err.message) ? String(err.message) : '';
        if (errorMessage === 'file_notfound')
        {
          this.toast(this.textConfig.proxySourceMissing);
          return null;
        }
        this.onError(err);
      }
      finally
      {
        this.loading(false);
      }
    }

    async downloadItem(id)
    {
      if (!id)
      {
        return;
      }
      var item = this.getItemById(id);
      if (!item)
      {
        this.toast(this.textConfig.downloadUnavailable);
        return;
      }
      if (item.kind === 'youtube')
      {
        this.toast(this.textConfig.youtubeDownloadUnavailable || this.textConfig.downloadUnavailable);
        return;
      }
      var spec = this.resolveDownloadSpec(item);
      if (!spec)
      {
        this.toast(this.textConfig.downloadUnavailable);
        return;
      }
      var service = this.downloadModalService || (this.services && this.services.downloadModal);
      if (!service)
      {
        throw new Error('ダウンロードモーダルサービスが初期化されていません。');
      }
      this.toast(this.textConfig.downloadPreparing);
      var fileId = 'download-' + Date.now();
      var modalNode = service.show({
        title: this.textConfig.downloadModalTitle,
        subtitle: this.textConfig.downloadModalSubtitle,
        files: [{
          id: fileId,
          name: spec.fileName,
          totalBytes: spec.totalBytes || 0,
          downloadedBytes: 0,
          status: 'pending'
        }]
      });
      try
      {
        var blob = await this.fetchBinaryWithProgress(spec.request, function (progress)
        {
          if (!progress)
          {
            return;
          }
          var total = progress.total || spec.totalBytes || 0;
          var pct = (typeof progress.percent === 'number' && !isNaN(progress.percent))
            ? progress.percent
            : (total > 0 ? (progress.loaded / total) * 100 : null);
          var updates = {
            downloadedBytes: progress.loaded,
            totalBytes: total,
            status: 'downloading'
          };
          if (pct !== null)
          {
            updates.progressPercent = pct;
          }
          service.updateFile(modalNode, fileId, updates);
        });
        var finalSize = blob && blob.size ? blob.size : (spec.totalBytes || 0);
        service.updateFile(modalNode, fileId, {
          downloadedBytes: finalSize,
          totalBytes: finalSize,
          progressPercent: 100,
          status: 'completed'
        });
        this.startBlobDownload(blob, spec.fileName);
        this.toast(this.textConfig.downloadReady);
      }
      catch (err)
      {
        service.updateFile(modalNode, fileId, {
          status: 'error',
          progressPercent: 100
        });
        this.toast(this.textConfig.downloadFailed);
        throw err;
      }
    }

    fetchBinaryWithProgress(request, onProgress)
    {
      if (!request || !request.url)
      {
        return Promise.reject(new Error('ダウンロード要求が無効です。'));
      }
      return new Promise(function (resolve, reject)
      {
        var xhr = new XMLHttpRequest();
        xhr.open(request.method || 'GET', request.url, true);
        xhr.withCredentials = true;
        xhr.responseType = 'blob';
        if (request.headers && typeof request.headers === 'object')
        {
          var headerKeys = Object.keys(request.headers);
          for (var i = 0; i < headerKeys.length; i += 1)
          {
            var headerName = headerKeys[i];
            xhr.setRequestHeader(headerName, request.headers[headerName]);
          }
        }
        if (typeof onProgress === 'function')
        {
          xhr.onprogress = function (event)
          {
            if (!event)
            {
              return;
            }
            var total = event.lengthComputable ? event.total : 0;
            var percent = total > 0 ? (event.loaded / total) * 100 : null;
            onProgress({ loaded: event.loaded, total: total, percent: percent });
          };
        }
        xhr.onerror = function ()
        {
          reject(new Error('ファイルのダウンロードに失敗しました。'));
        };
        xhr.onload = function ()
        {
          if (xhr.status >= 200 && xhr.status < 300)
          {
            resolve(xhr.response);
            return;
          }
          reject(new Error('ファイルのダウンロードに失敗しました (status ' + xhr.status + ')'));
        };
        xhr.send(request.body || null);
      });
    }

    startBlobDownload(blob, fileName)
    {
      if (!blob)
      {
        return;
      }
      var url = window.URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'download';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function ()
      {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
    }

    /**
     * トースト表示
     */
    toast(msg, options) {
      if (this.services.toast && typeof this.services.toast.show === 'function') {
        this.services.toast.show(msg, options || {});
      }
    }

    /**
     * エラーハンドラ（共通）
     */
    onError(err) {
      var message = (err && err.message) ? err.message : this.textConfig.error;
      if (window.console && console.error) console.error(err);
      this.toast(message, { type: 'error' });
    }

    /**
     * HTMLエスケープの簡易版（XSS対策）
     */
    escapeHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    formatBitrate(bps)
    {
      var rate = (typeof bps === 'number' && bps > 0) ? bps : 0;
      if (rate <= 0)
      {
        return '';
      }
      var units = ['bps', 'Kbps', 'Mbps', 'Gbps'];
      var unitIndex = 0;
      var value = rate;
      while (value >= 1000 && unitIndex < units.length - 1)
      {
        value = value / 1000;
        unitIndex += 1;
      }
      var fixed = unitIndex === 0 ? value.toFixed(0) : (value >= 10 ? value.toFixed(0) : value.toFixed(1));
      return fixed + ' ' + units[unitIndex];
    }

    formatBytes(bytes)
    {
      var size = (typeof bytes === 'number' && bytes > 0) ? bytes : 0;
      var units = ['B', 'KB', 'MB', 'GB', 'TB'];
      var unitIndex = 0;
      var value = size;
      while (value >= 1024 && unitIndex < units.length - 1)
      {
        value = value / 1024;
        unitIndex += 1;
      }
      var fixed = unitIndex === 0 ? value.toFixed(0) : (value >= 10 ? value.toFixed(0) : value.toFixed(1));
      return fixed + ' ' + units[unitIndex];
    }

    formatDuration(seconds)
    {
      var total = this.normalizeNumber(seconds);
      if (total <= 0)
      {
        return '';
      }
      var rounded = Math.max(0, Math.floor(total));
      var hours = Math.floor(rounded / 3600);
      var minutes = Math.floor((rounded % 3600) / 60);
      var secs = rounded % 60;
      var parts = [];
      if (hours > 0)
      {
        parts.push(String(hours));
        parts.push(String(minutes).padStart(2, '0'));
      }
      else
      {
        parts.push(String(minutes));
      }
      parts.push(String(secs).padStart(2, '0'));
      return parts.join(':');
    }

    openUploadModal()
    {
      var selectors = this.selectorConfig || {};
      var modal = selectors.uploadModal ? document.querySelector(selectors.uploadModal) : null;
      if (!modal)
      {
        return;
      }
      if (!modal.classList.contains('is-open'))
      {
        this._uploadModalLastActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      }
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      modal.removeAttribute('hidden');
      if (document.body && document.body.classList) {
        if (!document.body.classList.contains('is-modal-open')) {
          document.body.classList.add('is-modal-open');
          this._uploadModalBodyClassManaged = true;
        } else {
          this._uploadModalBodyClassManaged = false;
        }
      }
      modal.removeEventListener('keydown', this.uploadModalKeydownHandler);
      modal.addEventListener('keydown', this.uploadModalKeydownHandler);
      var title = document.getElementById('contents-upload-modal-title');
      if (title && typeof title.focus === 'function')
      {
        try { title.focus(); } catch (err) {}
      }
      this.updateUploadModal(this.state.uploadQueue || []);
    }

    closeUploadModal()
    {
      var selectors = this.selectorConfig || {};
      var modal = selectors.uploadModal ? document.querySelector(selectors.uploadModal) : null;
      if (!modal)
      {
        this.clearUploadModalSnapshot();
        this.updateUploadModal([]);
        return;
      }
      if (modal.classList.contains('is-open'))
      {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('hidden', 'hidden');
        modal.removeEventListener('keydown', this.uploadModalKeydownHandler);
      }
      var stillOpen = document.querySelector('.screen-modal.is-open');
      if (!stillOpen && this._uploadModalBodyClassManaged)
      {
        document.body.classList.remove('is-modal-open');
      }
      this._uploadModalBodyClassManaged = false;
      var lastActive = this._uploadModalLastActive;
      this._uploadModalLastActive = null;
      if (lastActive && typeof lastActive.focus === 'function')
      {
        try { lastActive.focus(); } catch (err) {}
      }
      this.clearUploadModalSnapshot();
      this.updateUploadModal([]);
    }

    updateUploadModal(queueInput)
    {
      var selectors = this.selectorConfig || {};
      var modal = selectors.uploadModal ? document.querySelector(selectors.uploadModal) : null;
      if (!modal)
      {
        return;
      }
      var queue = Array.isArray(queueInput) ? queueInput.slice(0) : [];
      if (!queue.length && !this.state.isUploadingQueue && Array.isArray(this.state.uploadModalSnapshot) && this.state.uploadModalSnapshot.length)
      {
        queue = this.state.uploadModalSnapshot.slice(0);
      }
      var statusNode = selectors.uploadModalStatus ? document.querySelector(selectors.uploadModalStatus) : null;
      var summaryNode = selectors.uploadModalSummary ? document.querySelector(selectors.uploadModalSummary) : null;
      var emptyNode = selectors.uploadModalEmpty ? document.querySelector(selectors.uploadModalEmpty) : null;
      var listNode = selectors.uploadModalList ? document.querySelector(selectors.uploadModalList) : null;
      var progressNode = selectors.uploadModalProgress ? document.querySelector(selectors.uploadModalProgress) : null;
      var barNode = selectors.uploadModalProgressBar ? document.querySelector(selectors.uploadModalProgressBar) : null;
      var buttonNode = selectors.uploadModalCompleteButton ? document.querySelector(selectors.uploadModalCompleteButton) : null;
      var isUploading = !!this.state.isUploadingQueue;
      var hasItems = queue.length > 0;
      var totalBytes = 0;
      var uploadedBytes = 0;
      var completedCount = 0;
      for (var i = 0; i < queue.length; i += 1)
      {
        var item = queue[i];
        if (!item)
        {
          continue;
        }
        var total = this.getUploadItemTotal(item);
        totalBytes += total;
        if (item.status === 'done')
        {
          completedCount += 1;
          uploadedBytes += total;
        }
        else if (item.status === 'error')
        {
          uploadedBytes += total || 0;
        }
        else
        {
          var loaded = typeof item.uploaded === 'number' ? item.uploaded : 0;
          if (loaded > total && total > 0)
          {
            loaded = total;
          }
          uploadedBytes += loaded;
        }
      }
      var percent = 0;
      if (totalBytes > 0)
      {
        percent = Math.round((uploadedBytes / totalBytes) * 100);
      }
      else if (hasItems)
      {
        percent = Math.round((completedCount / queue.length) * 100);
      }
      if (percent < 0) percent = 0;
      if (percent > 100) percent = 100;
      if (progressNode)
      {
        progressNode.setAttribute('aria-valuenow', String(percent));
      }
      if (barNode)
      {
        barNode.style.width = percent + '%';
      }
      if (statusNode)
      {
        var statusText = this.textConfig.uploadModalIdle;
        if (isUploading)
        {
          statusText = this.textConfig.uploadModalInProgress;
        }
        else if (hasItems)
        {
          statusText = this.textConfig.uploadModalComplete;
        }
        statusNode.textContent = statusText;
      }
      if (summaryNode)
      {
        var totalCount = hasItems ? queue.length : 0;
        summaryNode.textContent = completedCount + ' / ' + totalCount + ' 件完了';
      }
      if (emptyNode)
      {
        if (hasItems)
        {
          emptyNode.setAttribute('hidden', 'hidden');
        }
        else
        {
          emptyNode.removeAttribute('hidden');
        }
      }
      if (listNode)
      {
        while (listNode.firstChild)
        {
          listNode.removeChild(listNode.firstChild);
        }
        if (hasItems)
        {
          var fragment = document.createDocumentFragment();
          for (var j = 0; j < queue.length; j += 1)
          {
            var row = queue[j];
            if (!row)
            {
              continue;
            }
            var percentEach = this.calcUploadPercent(row);
            var li = document.createElement('li');
            li.className = 'content-uploader__item' + (row.status === 'error' ? ' is-error' : '');
            var header = document.createElement('div');
            header.className = 'content-uploader__item-header';
            var info = document.createElement('div');
            info.className = 'content-uploader__item-info';
            var name = document.createElement('p');
            name.className = 'content-uploader__item-name';
            name.textContent = row.name || 'ファイル';
            var meta = document.createElement('p');
            meta.className = 'content-uploader__item-meta';
            meta.textContent = this.formatBytes(row.size);
            info.appendChild(name);
            info.appendChild(meta);
            header.appendChild(info);
            li.appendChild(header);
            var progressWrap = document.createElement('div');
            progressWrap.className = 'content-uploader__progress' + (row.status === 'done' ? ' is-complete' : '');
            var bar = document.createElement('div');
            bar.className = 'content-uploader__progress-bar';
            bar.style.width = percentEach + '%';
            progressWrap.appendChild(bar);
            li.appendChild(progressWrap);
            var status = document.createElement('p');
            status.className = 'content-uploader__status';
            status.textContent = this.getUploadStatusText(row);
            li.appendChild(status);
            fragment.appendChild(li);
          }
          listNode.appendChild(fragment);
        }
      }
      if (buttonNode)
      {
        buttonNode.textContent = isUploading ? this.textConfig.uploadModalButtonInProgressLabel : this.textConfig.uploadModalButtonLabel;
        buttonNode.disabled = !!isUploading;
        if (buttonNode.disabled)
        {
          buttonNode.setAttribute('disabled', 'disabled');
        }
        else
        {
          buttonNode.removeAttribute('disabled');
        }
      }
    }

    cloneUploadItems(queue)
    {
      if (!Array.isArray(queue))
      {
        return [];
      }
      var snapshot = [];
      for (var i = 0; i < queue.length; i += 1)
      {
        var item = queue[i];
        if (!item)
        {
          continue;
        }
        var size = typeof item.size === 'number' ? item.size : 0;
        var total = typeof item.total === 'number' ? item.total : size;
        var uploaded = typeof item.uploaded === 'number' ? item.uploaded : 0;
        snapshot.push({
          id: item.id,
          name: item.name,
          size: size,
          total: total,
          uploaded: uploaded,
          status: item.status || 'pending',
          errorMessage: item.errorMessage || ''
        });
      }
      return snapshot;
    }

    setUploadModalSnapshot(queue)
    {
      this.state.uploadModalSnapshot = this.cloneUploadItems(queue);
    }

    clearUploadModalSnapshot()
    {
      this.state.uploadModalSnapshot = [];
    }

    calcUploadPercent(item)
    {
      var total = this.getUploadItemTotal(item);
      var loaded = typeof item.uploaded === 'number' ? item.uploaded : 0;
      if (!total)
      {
        return item && item.status === 'done' ? 100 : 0;
      }
      if (loaded > total)
      {
        loaded = total;
      }
      var percent = Math.round((loaded / total) * 100);
      if (percent < 0) percent = 0;
      if (percent > 100) percent = 100;
      if (item.status === 'error')
      {
        percent = 100;
      }
      return percent;
    }

    getUploadItemTotal(item)
    {
      if (!item)
      {
        return 0;
      }
      if (typeof item.total === 'number' && item.total > 0)
      {
        return item.total;
      }
      if (typeof item.size === 'number' && item.size > 0)
      {
        return item.size;
      }
      return 0;
    }

    getUploadStatusText(item)
    {
      if (!item)
      {
        return '';
      }
      if (item.status === 'uploading')
      {
        return 'アップロード中… ' + this.formatBytes(item.uploaded) + ' / ' + this.formatBytes(item.size) + ' (' + this.calcUploadPercent(item) + '%)';
      }
      if (item.status === 'done')
      {
        return 'アップロードが完了しました';
      }
      if (item.status === 'error')
      {
        return item.errorMessage || this.textConfig.error;
      }
      return 'アップロード待機中';
    }

    handleUploadModalKeydown(event)
    {
      var key = event && (event.key || event.keyCode);
      if (key === 'Escape' || key === 'Esc' || key === 27)
      {
        event.preventDefault();
        if (this.state.isUploadingQueue)
        {
          return;
        }
        this.closeUploadModal();
      }
    }
  }

  window.Contents = window.Contents || Contents;
  window.Contents = Contents;  

})(window, document);
