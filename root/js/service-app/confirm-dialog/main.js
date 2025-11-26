(function () {
  'use strict';

  class ConfirmDialogService
  {
    constructor(options)
    {
      this.jobs = null;
      this.stack = [];
      this.initConfig(options);
    }

    initConfig(options) {
      // 旧 config.js の移行先: デフォルト設定とマップを定義・統合
      this.DEFAULTS = Object.freeze({
        titleText: '',
        confirmText: 'OK',
        cancelText: 'Cancel',
        type: 'info',                 // info | success | warning | error
        escToCancel: true,
        overlayToCancel: false,
        autoFocus: 'confirm',         // confirm | cancel | none
        ariaLabel: 'Confirmation',
        lockScroll: true,
        container: null,
        idPrefix: 'confirmdlg-',
        zIndex: 10000,
        stylesheetHref: '/css/confirm-dialog.css'
      });
      this.TYPE_TO_CLASS = Object.freeze({
        'info': 'is-info',
        'success': 'is-success',
        'warning': 'is-warning',
        'error': 'is-error'
      });
      this.config = Object.assign({}, this.DEFAULTS, options || {});
    }

    async boot()
    {
      this.ensureStylesheet(this.config.stylesheetHref);
      await window.Utils.loadScriptsSync([
        'js/service-app/confirm-dialog/job-region.js',
        'js/service-app/confirm-dialog/job-dialog.js'
      ]);
      
      this.jobs = {
        region: new window.Services.ConfirmDialog.JobRegion(this),
        dialog: new window.Services.ConfirmDialog.JobDialog(this)
      };
      return this;
    }

    ensureStylesheet(source)
    {
      if (document.querySelector('link[data-confirm-dialog-style="1"]')) return;

      var candidates = [];
      if (Array.isArray(source)) {
        for (var i = 0; i < source.length; i++) {
          var href = source[i];
          if (typeof href === 'string' && href.trim().length > 0) {
            candidates.push(href.trim());
          }
        }
      } else if (typeof source === 'string' && source.trim().length > 0) {
        candidates.push(source.trim());
      }
      candidates.push('/css/confirm-dialog.css');

      // remove duplicates while keeping order
      var unique = [];
      for (var j = 0; j < candidates.length; j++) {
        if (unique.indexOf(candidates[j]) === -1) unique.push(candidates[j]);
      }

      (function tryNext(i) {
        if (i >= unique.length) return;
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = unique[i];
        link.setAttribute('data-confirm-dialog-style', '1');
        link.onerror = function () {
          link.remove();
          tryNext(i + 1);
        };
        document.head.appendChild(link);
      })(0);
    }

    open(message, opts)
    {
      var cfg = Object.assign({}, this.config, opts || {});
      var typeClass = this.TYPE_TO_CLASS[String(cfg.type)] || this.TYPE_TO_CLASS['info'];
      var container = this.jobs.region.resolveContainer(cfg.container || document.body);
      var region = this.jobs.region.ensureRegion(container, cfg.zIndex);
      var id = cfg.id || (cfg.idPrefix + Date.now() + '-' + Math.floor(Math.random() * 10000));

      var self = this;
      var promiseResolve;
      var p = new Promise(function (resolve) { promiseResolve = resolve; });

      var node = this.jobs.dialog.createDialog({
        id: id,
        titleText: cfg.titleText,
        message: message,
        typeClass: typeClass,
        ariaLabel: cfg.ariaLabel,
        confirmText: cfg.confirmText,
        cancelText: cfg.cancelText,
        escToCancel: !!cfg.escToCancel,
        overlayToCancel: !!cfg.overlayToCancel,
        autoFocus: cfg.autoFocus
      }, {
        onConfirm: function () { self._finish(node, true, promiseResolve); },
        onCancel: function () { self._finish(node, false, promiseResolve); }
      });

      region.appendChild(node);
      this.stack.push({ id: id, node: node, container: container });

      if (cfg.lockScroll && container === document.body) {
        this._lockScroll();
      }

      return p;
    }

    _finish(node, ok, resolve) {
      this.dismiss(node);
      try { resolve(!!ok); } catch (e) {}
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
      this.jobs.dialog.updateDialog(entry.node, updates || {});
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
      this.jobs.dialog.removeDialog(entry.node);
      this.stack.splice(idx, 1);

      // body 由来のダイアログが無くなったらスクロール解除
      if (entry.container === document.body && !this.stack.some(function (s) { return s.container === document.body; })) {
        this._unlockScroll();
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
        this.jobs.dialog.removeDialog(e.node);
      }
      this._unlockScroll();
      this.jobs.region.removeAllRegions();
      return true;
    }

    _lockScroll() {
      if (!this.__lockCount) this.__lockCount = 0;
      if (!this.__prevOverflow) this.__prevOverflow = '';
      if (this.__lockCount === 0) {
        this.__prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      }
      this.__lockCount++;
    }

    _unlockScroll() {
      if (!this.__lockCount) this.__lockCount = 0;
      if (this.__lockCount > 0) {
        this.__lockCount--;
        if (this.__lockCount === 0) {
          document.body.style.overflow = this.__prevOverflow || '';
        }
      }
    }
  }

  window.Services = window.Services || {};
  window.Services.ConfirmDialog = ConfirmDialogService;

})(window, document);
