(function () {

  'use strict';

  class QrModalService
  {
    constructor(options)
    {
      this.stack = [];
      this.jobs = null;
      this.initConfig(options);
    }

    initConfig(options)
    {
      this.DEFAULTS = Object.freeze({
        size: 256,                // QR画像の表示サイズ(px)
        dismissible: true,        // 閉じるボタンの表示
        overlayClosable: true,    // 背景クリックで閉じる
        escClosable: true,        // Escキーで閉じる
        lockScroll: true,         // モーダル表示中にbodyスクロールをロック
        container: null,          // 表示先コンテナ（未指定は <body>）
        zIndex: 12000,            // レイヤのベース z-index
        ariaLabel: 'QR code',     // ダイアログのARIAラベル
        closeLabel: 'Close',      // 閉じるボタンのARIAラベル
        idPrefix: 'qrmodal-',     // 要素IDの接頭辞
        maxStack: 1,              // 1コンテナ内の最大スタック（通常は1）
        title: '',                // タイトル（未指定なら非表示）
        alt: ''                   // 画像のalt（未指定なら自動でARIAラベルを利用）
      });
      this.config = Object.assign({}, this.DEFAULTS, options || {});
    }

    async boot()
    {
      await window.Utils.loadScriptsSync([
        'js/service-app/qr-modal/job-region.js',
        'js/service-app/qr-modal/job-modal.js',
        'js/service-app/qr-modal/job-scroll.js'
      ]);

      this.jobs = {
        region: new window.Services.QRModal.JobRegion(this),
        modal: new window.Services.QRModal.JobModal(this),
        scroll: new window.Services.QRModal.JobScroll(this)
      };
      return this;
    }

    // src だけ、または options({ src, title, size, ... }) いずれも受け付け
    show(srcOrOptions, opts) {
      var cfg = {};
      if (typeof srcOrOptions === 'string') {
        cfg = Object.assign({}, this.config, (opts || {}), { src: srcOrOptions });
      } else {
        cfg = Object.assign({}, this.config, (srcOrOptions || {}));
      }
      if (!cfg.src) return null;

      var container = this.jobs.region.resolveContainer(cfg.container || document.body);
      var region = this.jobs.region.ensureRegion(container, cfg.zIndex);

      var id = cfg.id || (cfg.idPrefix + Date.now() + '-' + Math.floor(Math.random() * 10000));

      var node = this.jobs.modal.createModal({
        id: id,
        title: cfg.title,
        src: cfg.src,
        alt: cfg.alt || cfg.ariaLabel || 'QR code',
        size: cfg.size,
        ariaLabel: cfg.ariaLabel,
        closeLabel: cfg.closeLabel,
        dismissible: !!cfg.dismissible
      });

      region.appendChild(node);
      this.stack.push({ id: id, node: node, container: container });

      // スクロールロック（body直下の場合のみ）
      if (cfg.lockScroll && container === document.body) {
        this.jobs.scroll.lock();
      }

      // インタラクション（背景クリック/Esc）
      this.jobs.modal.bindInteractions(node, {
        onRequestClose: () => { this.dismiss(node); }
      }, {
        overlayClosable: !!cfg.overlayClosable,
        escClosable: !!cfg.escClosable
      });

      // スタック上限（通常は1）
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
      this.jobs.modal.updateModal(entry.node, updates || {});
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
      this.jobs.modal.removeModal(entry.node);
      this.stack.splice(idx, 1);

      // body直下のモーダルがなくなったらスクロール解除
      if (entry.container === document.body && !this.stack.some(s => s.container === document.body)) {
        if (this.jobs.scroll.unlockAll) this.jobs.scroll.unlockAll();
        else this.jobs.scroll.unlock();
      }

      // 空のリージョンを削除
      var region = this.jobs.region.getRegion(entry.container);
      if (region && this.jobs.region.isRegionEmpty(region)) {
        this.jobs.region.removeRegion(region);
      }
      return true;
    }

    dismissAll() {
      while (this.stack.length) {
        var e = this.stack.pop();
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
  window.Services.QRModal = QRModalService;

})(window, document);
