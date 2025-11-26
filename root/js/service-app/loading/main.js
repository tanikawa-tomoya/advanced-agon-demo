(function () {

  'use strict';

  class LoadingService
  {
    constructor(config) {
      this.config = Object.assign({}, this.DEFAULTS, config || {});
      this.stack = [];
      this.jobs = null;
    }

    get DEFAULTS() {
      return {
        position: 'center',
        lockScroll: true,
        dismissOnBackdrop: false,
        dismissOnEsc: false,
        ariaLabel: 'Loading',
        zIndex: 9999,
        maxStack: 1,
        container: null,
        idPrefix: 'loading-'
      };
    }

    async boot()
    {
      await window.Utils.loadScriptsSync([
        '/js/service-app/loading/job-overlay.js',
        '/js/service-app/loading/job-region.js',
        '/js/service-app/loading/job-scroll.js'
      ]);

      this.jobs = {
        overlay: new window.Services.Loading.JobOverlay(this),
        region: new window.Services.Loading.JobRegion(this),
        scroll: new window.Services.Loading.JobScroll(this)
      };
      return this;
    }

    show(message, opts) {
      opts = opts || {};
      var cfg = Object.assign({}, this.DEFAULTS, this.config, opts);
      var container = this.jobs.region.resolveContainer(cfg.container || cfg.target || document.body);
      var root = this.jobs.region.ensureRegion(container, cfg.position, cfg.zIndex);
      var id = cfg.id || (cfg.idPrefix + Date.now() + '-' + Math.floor(Math.random() * 10000));
      var node = this.jobs.overlay.createOverlay({
        id: id,
        message: message,
        ariaLabel: cfg.ariaLabel,
        dismissOnBackdrop: cfg.dismissOnBackdrop,
        dismissOnEsc: cfg.dismissOnEsc
      });

      root.appendChild(node);

      this.stack.push({ id: id, node: node, container: container });

      if (cfg.lockScroll && container === document.body) {
        this.jobs.scroll.lock();
      }

      var self = this;
      this.jobs.overlay.bindInteractions(node, {
        onRequestClose: function () { self.dismiss(node); }
      });

      if (Number(cfg.maxStack) > 0) {
        var per = this.stack.filter(function (s) { return s.container === container; });
        while (per.length > cfg.maxStack) {
          var victim = per.shift();
          self.dismiss(victim.node);
          per = this.stack.filter(function (s) { return s.container === container; });
        }
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
      this.jobs.overlay.updateOverlay(entry.node, updates || {});
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
      this.jobs.overlay.removeOverlay(entry.node);
      this.stack.splice(idx, 1);

      // body 由来のオーバーレイが無くなったらスクロール解除
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
        this.jobs.overlay.removeOverlay(e.node);
      }
      if (this.jobs.scroll.unlockAll) this.jobs.scroll.unlockAll();
      else this.jobs.scroll.unlock();
      this.jobs.region.removeAllRegions();
      return true;
    }

    hide(target) { return this.dismiss(target); }
  }

  window.Services = window.Services || {};
  if (!window.Services.Loading) {
    window.Services.Loading = LoadingService;
  }
  if (!window.Services.loading) {
    window.Services.loading = window.Services.Loading;
  } else {
    window.Services.Loading = window.Services.loading;
  }

})(window, document);
