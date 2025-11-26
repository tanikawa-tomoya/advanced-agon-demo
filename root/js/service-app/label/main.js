(function () {

  'use strict';

  /**
   * LabelService
   * - initConfig() に旧 config.js の内容を統合
   * - job-resolve.js / job-render.js を初期化
   * - API: resolve, create, update, remove, renderInto
   */
  class LabelService
  {
    constructor(options)
    {
      this.options = options || {};
      this.config = {};
      this.jobs = null;
    }

    initConfig(opts)
    {
      var DEFAULTS = {
        elementTag: 'span',
        baseClass: 'c-label',
        variantPrefix: 'c-label--',
        attributeName: 'data-status-key',
        fallbackText: '-',

        // ステータス/テキストの取得候補キー
        statusKeyCandidates: ['status', 'state', 'key', 'code'],
        textKeyCandidates: ['label', 'text', 'name', 'title'],

        // ステータスキー -> 画面表示用ラベル
        labelMap: {
          active: '稼働中',
          completed: '完了',
          pending: '処理中',
          error: 'エラー',
          disabled: '無効'
        },

        // ステータスキー -> バリアント（class名に利用）
        // 実クラスは `${variantPrefix}${variant}` で組み立てます
        variantMap: {
          active: 'success',
          completed: 'success',
          pending: 'info',
          error: 'danger',
          disabled: 'muted'
        }
      };

      this.config = Object.assign({}, DEFAULTS, opts || {}, this.options || {});
      return this.config;
    }

    async boot()
    {
      await window.Utils.loadScriptsSync([
        'js/service-app/label/job-resolve.js',
        'js/service-app/label/job-render.js'
      ]);
      
      // 設定初期化は boot() で行う
      this.initConfig();

      this.jobs = {
        resolve: new window.Services.Label.JobResolve(this),
        render: new window.Services.Label.JobRender(this)
      };
      return this;
    }

    resolve(item, opts) {
      var cfg = Object.assign({}, this.config, opts || {});
      return this.jobs.resolve.resolve(item, cfg);
    }

    create(itemOrPresentation, opts) {
      var presentation = (itemOrPresentation && itemOrPresentation.__isLabelPresentation)
        ? itemOrPresentation
        : this.resolve(itemOrPresentation, opts);
      return this.jobs.render.create(presentation, this.config, opts || {});
    }

    update(target, updates) {
      return this.jobs.render.update(target, updates, this.config);
    }

    remove(target) {
      return this.jobs.render.remove(target);
    }

    renderInto(container, itemOrPresentation, opts) {
      var node = this.create(itemOrPresentation, opts);
      var el = (typeof container === 'string') ? document.querySelector(container) : container;
      if (el) el.appendChild(node);
      return node;
    }
  }

  window.Services = window.Services || {};
  window.Services.Label = LabelService;

})(window, document);
