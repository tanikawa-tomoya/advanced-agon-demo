(function () {
  
  'use strict';

  /**
   * GuidanceCreatorService
   * - 旧 config.js の設定は initConfig() へ移行
   * - 旧 general.js 相当の処理は job-*.js へ分割
   * - style.css / template.html のロードを行い、UI を生成・破棄する
   */
  class GuidanceCreatorService
  {
    constructor(options)
    {
      this.jobs = null;
      this.root = null;        // ルート要素（UIのルート）
      this.container = null;   // 追加先（未指定は body）
      this._opened = false;
      this._handlers = null;
      this._templateHtml = null;
      this.initConfig(options);
    }

    /**
     * 旧 config.js からの移行先。
     * - DEFAULTS: 旧 DEFAULT_CONFIG 相当
     * - templatePath/stylePath: 旧 TEMPLATE_URL/STYLE_URL 相当
     */
    initConfig(options)
    {
      this.DEFAULTS = Object.freeze({
        container: null,                // 追加先コンテナ（未指定は <body>）
        templatePath: 'js/service-app/guidance-creator/template.html',
        stylePath:    'js/service-app/guidance-creator/style.css',
        zIndex: 10000,
        escToClose: true,
        closeOnBackdrop: false,
        idPrefix: 'guidance-creator-',
        initialData: { title: '', steps: [] },
        onSubmit: null,
        onCancel: null
      });
      this.config = Object.assign({}, this.DEFAULTS, options || {});
    }

    /**
     * ヘッダー実装と同様、必要な job-*.js を同期ロード（Utils があれば利用）し、
     * ジョブをインスタンス化。style の挿入と template のプリロードも行う。
     */
    async boot()
    {
      await window.Utils.loadScriptsSync([
        'js/service-app/guidance-creator/job-template.js',
        'js/service-app/guidance-creator/job-ui.js'
      ]);

      this.jobs = {
        template: new window.Services.GuidanceCreator.JobTemplate(this),
        ui:       new window.Services.GuidanceCreator.JobUI(this)
      };
      // style 挿入（重複可避）
      this.jobs.template.ensureStyle(this.config.stylePath, this.config.zIndex);
      // template をキャッシュ（失敗しても open() 内でリトライ）
      try {
        this._templateHtml = this.jobs.template.loadTemplateSync(this.config.templatePath);
      } catch (e) {
        // noop: open() 時にリトライ
      }
      return self || this;
    }

    /**
     * UI を表示
     * @param {Object} opts - open 時のオプション（config を上書き）
     * @returns {HTMLElement} 生成したルート要素
     */
    open(opts) {
      var cfg = Object.assign({}, this.config, opts || {});
      var container = this.jobs.template.resolveContainer(cfg.container || document.body);
      this.container = container;

      // スタイル確保
      this.jobs.template.ensureStyle(cfg.stylePath, cfg.zIndex);

      // テンプレート読込（同期）
      var html = this._templateHtml;
      if (!html) {
        html = this.jobs.template.loadTemplateSync(cfg.templatePath);
        this._templateHtml = html;
      }

      // ルート生成・イベント束縛
      var self = this;
      var handlers = {
        onSubmit: function (payload) {
          try { if (typeof cfg.onSubmit === 'function') cfg.onSubmit(payload); } finally { self.close(); }
        },
        onCancel: function () {
          try { if (typeof cfg.onCancel === 'function') cfg.onCancel(); } finally { self.close(); }
        },
        onRequestClose: function () {
          self.close();
        }
      };
      var root = this.jobs.ui.buildFromTemplate(html, handlers, { zIndex: cfg.zIndex });
      container.appendChild(root);

      // 初期データ反映
      if (cfg.initialData) {
        this.jobs.ui.setData(root, cfg.initialData);
      }

      // キーイベント（Escで閉じる）
      if (cfg.escToClose) {
        this._onKeyDown = function (ev) {
          if (ev && (ev.key === 'Escape' || ev.key === 'Esc' || ev.keyCode === 27)) {
            self.close();
          }
        };
        document.addEventListener('keydown', this._onKeyDown, true);
      }

      this.root = root;
      this._opened = true;
      return root;
    }

    /**
     * UI を閉じて破棄
     */
    close() {
      if (!this._opened) return false;
      if (this._onKeyDown) {
        document.removeEventListener('keydown', this._onKeyDown, true);
        this._onKeyDown = null;
      }
      if (this.root) {
        this.jobs.ui.teardown(this.root);
        if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
      }
      this.root = null;
      this._opened = false;
      return true;
    }

    /**
     * データ取得／設定
     */
    getData() {
      if (!this.root) return { title: '', steps: [] };
      return this.jobs.ui.getData(this.root);
    }
    setData(data) {
      if (!this.root) return false;
      this.jobs.ui.setData(this.root, data || { title: '', steps: [] });
      return true;
    }

  }

  window.Services = window.Services || {};
  window.Services.GuidanceCreatorService = GuidanceCreatorService; 
  
})(window, document);
