(function () {

  'use strict';

  class PdfModalService
  {
    constructor(options)
    {
      this.stack = [];
      this.jobs = null;
      this.initConfig(options);
    }

    initConfig(options)
    {
      // 旧 config.js の内容をここに移行（必要最低限の構成）
      this.DEFAULTS = Object.freeze({
        title: 'Document',
        src: '',
        size: 'lg',                 // sm | md | lg | xl
        dismissOnBackdrop: true,
        dismissOnEsc: true,
        lockScroll: true,
        container: null,
        zIndex: 10000,
        idPrefix: 'pdfmodal-',
        ariaLabel: 'PDF Viewer',
        showOpenInNewTab: true,
        openInNewTabLabel: 'Open in new tab',
        showDownload: true,
        downloadLabel: 'Download'
      });
      // サイズ→クラス
      this.SIZE_TO_CLASS = Object.freeze({
        'sm': 'is-sm',
        'md': 'is-md',
        'lg': 'is-lg',
        'xl': 'is-xl'
      });
      this.config = Object.assign({}, this.DEFAULTS, options || {});
    }

    async boot()
    {
      await window.Utils.loadScriptsSync([
        'js/vendor/pdfjs/pdf.min.js',
        'js/service-app/pdf-modal/job-region.js',
        'js/service-app/pdf-modal/job-modal.js',
        'js/service-app/pdf-modal/job-focus.js',
        'js/service-app/pdf-modal/job-scroll.js'
      ]);

      if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions)
      {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdfjs/pdf.worker.min.js';
      }

      this.jobs = {
        region: new window.Services.PdfModal.JobRegion(this),
        modal: new window.Services.PdfModal.JobModal(this),
        focus: new window.Services.PdfModal.JobFocus(this),
        scroll: new window.Services.PdfModal.JobScroll(this)
      };
      return this;
    }

    open(src, opts) { return this.show(src, opts); }

    show(srcOrOpts, opts) {
      var optsObj = (typeof srcOrOpts === 'object' && srcOrOpts !== null) ? srcOrOpts : (opts || {});
      if (typeof srcOrOpts === 'string') optsObj.src = srcOrOpts;

      var cfg = Object.assign({}, this.config, optsObj || {});
      var sizeClass = this.SIZE_TO_CLASS[cfg.size] || this.SIZE_TO_CLASS['lg'];
      var container = this.jobs.region.resolveContainer(cfg.container || document.body);
      var region = this.jobs.region.ensureRegion(container, cfg.zIndex);

      var id = cfg.id || (cfg.idPrefix + Date.now() + '-' + Math.floor(Math.random() * 10000));
      var node = this.jobs.modal.createModal({
        id: id,
        title: cfg.title,
        src: cfg.src,
        sizeClass: sizeClass,
        ariaLabel: cfg.ariaLabel,
        dismissOnBackdrop: !!cfg.dismissOnBackdrop,
        dismissOnEsc: !!cfg.dismissOnEsc,
        showOpenInNewTab: !!cfg.showOpenInNewTab,
        openInNewTabLabel: cfg.openInNewTabLabel,
        showDownload: !!cfg.showDownload,
        downloadLabel: cfg.downloadLabel
      });

      region.appendChild(node);
      this.stack.push({ id: id, node: node, container: container });

      this.jobs.modal.renderPdf(node, cfg.src);

      // 介入バインド
      var self = this;
      this.jobs.modal.bindInteractions(node, {
        onRequestClose: function () { self.dismiss(node); }
      });

      // フォーカス制御
      this.jobs.focus.trap(node);

      // スクロールロック（body 配下のみ）
      if (cfg.lockScroll && container === document.body) {
        this.jobs.scroll.lock();
      }

      // 単一運用（必要なら）: PDF モーダルは通常 1 つ想定
      if (this.stack.length > 1) {
        // 直前のものを閉じる
        var prev = this.stack[0];
        this.dismiss(prev.node);
      }

      return node;
    }

    update(target, updates) {
      if (updates == null && (typeof target === 'object' || typeof target === 'string' || target == null)) {
        updates = target; target = null;
      }
      var entry = null;
      if (!target) {
        entry = this.stack[this.stack.length - 1];
      } else if (typeof target === 'string') {
        entry = this.stack.find(function (s) { return s.id === target; });
      } else {
        entry = this.stack.find(function (s) { return s.node === target || (s.node && s.node.id === target.id); });
      }
      if (!entry) return false;

      var u = Object.assign({}, updates || {});
      if (Object.prototype.hasOwnProperty.call(u, 'size')) {
        u.sizeClass = this.SIZE_TO_CLASS[String(u.size)] || this.SIZE_TO_CLASS['lg'];
      }
      this.jobs.modal.updateModal(entry.node, u);
      return true;
    }

    dismiss(target) {
      var idx = -1;
      if (!target) {
        idx = this.stack.length - 1;
      } else if (typeof target === 'string') {
        idx = this.stack.findIndex(function (s) { return s.id === target; });
      } else {
        idx = this.stack.findIndex(function (s) { return s.node === target || (s.node && s.node.id === target.id); });
      }
      if (idx < 0) return false;
      var entry = this.stack[idx];

      this.jobs.focus.release(entry.node);
      this.jobs.modal.removeModal(entry.node);
      this.stack.splice(idx, 1);

      if (entry.container === document.body && !this.stack.some(function (s) { return s.container === document.body; })) {
        if (this.jobs.scroll.unlockAll) this.jobs.scroll.unlockAll();
        else this.jobs.scroll.unlock();
      }

      var region = this.jobs.region.getRegion(entry.container);
      if (region && this.jobs.region.isRegionEmpty(region)) {
        this.jobs.region.removeRegion(region);
      }
      return true;
    }

    dismissAll() {
      while (this.stack.length) {
        var e = this.stack.pop();
        this.jobs.focus.release(e.node);
        this.jobs.modal.removeModal(e.node);
      }
      if (this.jobs.scroll.unlockAll) this.jobs.scroll.unlockAll();
      else this.jobs.scroll.unlock();
      this.jobs.region.removeAllRegions();
      return true;
    }

    hide(target) { return this.dismiss(target); }
  }

  window.Services = window.Services || {};
  window.Services.PdfModal = PdfModalService;

})(window, document);
