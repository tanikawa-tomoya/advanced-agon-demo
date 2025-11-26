(function () {

  'use strict';
    
  class PrintLayoutService
  {
    constructor(options)
    {
      this.jobs = null;
      this.state = { node: null, region: null, container: null };
      this.initConfig(options);
    }

    initConfig(options)
    {
      // 旧 config.js の移行先: デフォルト設定とクラスマッピングをここで定義
      this.DEFAULTS = Object.freeze({
        pageSize: 'A4',          // A4 | Letter | Legal ...（必要に応じて拡張可能）
        orientation: 'portrait', // portrait | landscape
        margin: 'normal',        // none | narrow | normal | wide
        showToolbar: true,
        container: null,         // 既定は <body>
        idPrefix: 'printlayout-',
        zIndex: 10000
      });
      this.CLASS = Object.freeze({
        ORIENT_TO_CLASS: {
          'portrait': 'c-print-layout--portrait',
          'landscape': 'c-print-layout--landscape'
        },
        SIZE_TO_CLASS: {
          'A4': 'c-print-layout--size-A4',
          'Letter': 'c-print-layout--size-Letter',
          'Legal': 'c-print-layout--size-Legal'
        },
        MARGIN_TO_CLASS: {
          'none': 'c-print-layout--margin-none',
          'narrow': 'c-print-layout--margin-narrow',
          'normal': 'c-print-layout--margin-normal',
          'wide': 'c-print-layout--margin-wide'
        }
      });
      this.config = Object.assign({}, this.DEFAULTS, options || {});
    }

    async boot()
    {
      await window.Utils.loadScriptsSync([
        'js/service-app/print-layout/job-region.js',
        'js/service-app/print-layout/job-view.js',
        'js/service-app/print-layout/job-print.js'
      ]);
      
      this.jobs = {
        region: new window.ServicesPrintLayout.JobRegion(this),
        view: new window.ServicesPrintLayout.JobView(this),
        print: new window.ServicesPrintLayout.JobPrint(this)
      };
      return this;
    }

    open(opts) {
      var cfg = Object.assign({}, this.config, opts || {});
      var container = this.jobs.region.resolveContainer(cfg.container || document.body);
      var region = this.jobs.region.ensureRegion(container, cfg.zIndex);

      // 既存ノードがあれば再利用、なければ作成
      var node = this.state.node;
      if (!node) {
        node = this.jobs.view.createLayout({
          id: cfg.id || (cfg.idPrefix + Date.now()),
          showToolbar: cfg.showToolbar
        }, {
          onPrint: () => { this.print(); },
          onClose: () => { this.close(); }
        });
        region.appendChild(node);
        this.state.node = node;
        this.state.region = region;
        this.state.container = container;
      }

      // 変種クラス適用（向き・用紙サイズ・余白）
      this.jobs.view.applyVariantClasses(node, {
        orientation: cfg.orientation,
        pageSize: cfg.pageSize,
        margin: cfg.margin
      }, this.CLASS);

      // コンテンツ設定（HTML文字列または要素）
      if (opts && Object.prototype.hasOwnProperty.call(opts, 'content')) {
        this.jobs.view.setContent(node, opts.content);
      }

      // フォーカス
      try { node.focus(); } catch (e) {}

      return node;
    }

    update(opts) {
      if (!this.state.node) return false;
      if (!opts) return true;
      // 設定のアップデート
      this.config = Object.assign({}, this.config, opts || {});
      var node = this.state.node;
      this.jobs.view.applyVariantClasses(node, {
        orientation: this.config.orientation,
        pageSize: this.config.pageSize,
        margin: this.config.margin
      }, this.CLASS);
      if (Object.prototype.hasOwnProperty.call(opts, 'showToolbar')) {
        this.jobs.view.toggleToolbar(node, !!opts.showToolbar);
      }
      if (Object.prototype.hasOwnProperty.call(opts, 'content')) {
        this.jobs.view.setContent(node, opts.content);
      }
      return true;
    }

    setContent(content) {
      if (!this.state.node) return false;
      this.jobs.view.setContent(this.state.node, content);
      return true;
    }

    print() {
      if (!this.state.node) return false;
      this.jobs.print.doPrint(this.state.node);
      return true;
    }

    close() {
      var node = this.state.node;
      if (!node) return false;
      this.jobs.view.destroy(node);
      this.state.node = null;

      // リージョンが空なら削除
      var region = this.state.region;
      var container = this.state.container;
      if (region && this.jobs.region.isRegionEmpty(region)) {
        this.jobs.region.removeRegion(region);
      }
      this.state.region = null;
      this.state.container = null;
      return true;
    }
  }

  window.Services = window.Services || {};
  window.Services.PrintLayout = PrintLayoutService;

})(window, document);
