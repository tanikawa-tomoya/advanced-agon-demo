(function () {
  
  'use strict';

  class ToastService
  {
    constructor(options)
    {
      this.stack = [];
      this.jobs = null;
      this.initConfig(options);
    }

    initConfig(options) {
      // 旧 config.js の移行先: ここでデフォルト設定とマップを定義・統合
      this.DEFAULTS = Object.freeze({
        position: 'top-center',   // top-right | top-left | bottom-right | bottom-left | top-center | bottom-center
        duration: 3000,           // 自動消去までの時間(ms)。0または負なら自動消去しない
        maxStack: 3,              // 1表示領域あたりの最大スタック数
        dismissible: true,        // 閉じるボタンを表示
        container: null,          // 表示先コンテナ（未指定は <body>）
        ariaLive: 'polite',       // polite | assertive
        ariaRole: 'status',       // status | alert
        idPrefix: 'toast-',
        zIndex: 10000
      });
      this.TYPE_TO_CLASS = Object.freeze({
        'default': 'c-toast--info',
        'info': 'c-toast--info',
        'success': 'c-toast--success',
        'warning': 'c-toast--warning',
        'error': 'c-toast--error'
      });
      this.config = Object.assign({}, this.DEFAULTS, options || {});
    }

    async boot()
    {
      await window.Utils.loadScriptsSync([
        'js/service-app/toast/job-region.js',
        'js/service-app/toast/job-toast.js'
      ]);

      this.jobs = {
        region: new window.Services.Toast.JobRegion(this),
        toast: new window.Services.Toast.JobToast(this)
      };
      return this;
    }

    // 便宜メソッド
    info(message, opts)    { return this.show(message, Object.assign({ type: 'info' }, opts || {})); }
    success(message, opts) { return this.show(message, Object.assign({ type: 'success' }, opts || {})); }
    warning(message, opts) { return this.show(message, Object.assign({ type: 'warning' }, opts || {})); }
    error(message, opts)   { return this.show(message, Object.assign({ type: 'error' }, opts || {})); }

    show(message, opts)
    {
      opts = opts || {};
      var cfg = Object.assign({}, this.config, opts);
      var type = String(cfg.type || 'default');
      var typeClass = this.TYPE_TO_CLASS[type] || this.TYPE_TO_CLASS['default'];
      var container = this.jobs.region.resolveContainer(cfg.container || document.body);
      var region = this.jobs.region.ensureRegion(container, cfg.position, cfg.zIndex);

      var id = cfg.id || (cfg.idPrefix + Date.now() + '-' + Math.floor(Math.random() * 10000));

      var node = this.jobs.toast.createToast({
        id: id,
        message: message,
        typeClass: typeClass,
        role: cfg.ariaRole,
        ariaLive: cfg.ariaLive,
        dismissible: !!cfg.dismissible,
        duration: (cfg.duration == null ? this.DEFAULTS.duration : cfg.duration)
      }, {
        onRequestClose: () => { this.dismiss(node); }
      });

      // 追加
      region.appendChild(node);
      this.stack.push({ id: id, node: node, container: container });

      if (typeof window.requestAnimationFrame === 'function')
      {
        window.requestAnimationFrame(function ()
                                      {
                                        node.classList.add('is-visible');
                                      });
      }
      else
      {
        node.classList.add('is-visible');
      }

      // スタック上限を超える場合は古いものから削除
      if (Number(cfg.maxStack) > 0) {
        var per = this.stack.filter(s => s.container === container);
        while (per.length > cfg.maxStack) {
          var victim = per.shift();
          this.dismiss(victim.node);
          per = this.stack.filter(s => s.container === container);
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
        entry = this.stack.find(s => s.id === target);
      } else {
        entry = this.stack.find(s => s.node === target || (s.node && s.node.id === target.id));
      }
      if (!entry) return false;
      if (updates && Object.prototype.hasOwnProperty.call(updates, 'type')) {
        var typeClass = this.TYPE_TO_CLASS[String(updates.type)] || this.TYPE_TO_CLASS['default'];
        updates.typeClass = typeClass;
      }
      this.jobs.toast.updateToast(entry.node, updates || {});
      return true;
    }

    dismiss(target) {
      var idx = -1;
      if (!target) {
        idx = this.stack.length - 1;
      } else if (typeof target === 'string') {
        idx = this.stack.findIndex(s => s.id === target);
      } else {
        idx = this.stack.findIndex(s => s.node === target || (s.node && s.node.id === target.id));
      }
      if (idx < 0) return false;
      var entry = this.stack[idx];
      this.jobs.toast.removeToast(entry.node);
      this.stack.splice(idx, 1);

      // 表示領域が空なら破棄
      var region = this.jobs.region.getRegion(entry.container);
      if (region && this.jobs.region.isRegionEmpty(region)) {
        this.jobs.region.removeRegion(region);
      }
      return true;
    }

    dismissAll() {
      while (this.stack.length) {
        var e = this.stack.pop();
        this.jobs.toast.removeToast(e.node);
      }
      this.jobs.region.removeAllRegions();
      return true;
    }
  }

  window.Services = window.Services || {};
  if (!window.Services.Toast) {
    window.Services.Toast = ToastService;
  }
  if (!window.Services.toast) {
    window.Services.toast = window.Services.Toast;
  } else {
    window.Services.Toast = window.Services.toast;
  }

})(window, document);
