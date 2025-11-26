(function () {

  'use strict';

  class GuidanceVideoModalService
  {
    constructor(options)
    {
      this.stack = [];
      this.jobs = null;
      this.initConfig(options);
    }

    initConfig(options)
    {
      // 旧 config.js の内容をこの initConfig に集約
      this.DEFAULTS = Object.freeze({
        position: 'center',          // モーダルの基準位置（region 側のクラスで制御）
        size: 'default',             // 'default' | 'wide' | 'large' など、CSSで制御
        lockScroll: true,            // 表示中は body のスクロールをロック
        dismissOnBackdrop: true,     // バックドロップクリックで閉じる
        dismissOnEsc: true,          // ESC で閉じる
        closeButton: true,           // 閉じるボタンを表示
        autoPlay: true,              // 再生可能なら自動再生する
        allowFullscreen: true,       // iframe の allowfullscreen
        container: null,             // 表示先コンテナ（未指定は <body>）
        ariaLabel: 'Video modal',
        zIndex: 10010,
        idPrefix: 'gvm-',
        maxStack: 1,                 // 同一コンテナでの最大スタック数（通常 1）
        // 許可ホスト（URL解析時に iframe 埋め込みを許可するホスト）
        allowedHosts: [
          'youtube.com','www.youtube.com','m.youtube.com','youtu.be',
          'vimeo.com','www.vimeo.com','player.vimeo.com'
        ],
        // 埋め込みパラメータ（必要に応じて拡張可能）
        youtubeParams: { autoplay: 1, rel: 0, modestbranding: 1 },
        vimeoParams: { autoplay: 1, title: 0, byline: 0, portrait: 0 }
      });
      this.config = Object.assign({}, this.DEFAULTS, options || {});
    }

    boot()
    {
      window.Utils.loadScriptsSync([
        'js/service-app/guidance-video-modal/job-region.js',
        'js/service-app/guidance-video-modal/job-embed.js',
        'js/service-app/guidance-video-modal/job-modal.js',
        'js/service-app/guidance-video-modal/job-scroll.js'
      ]);
      
      this.jobs = {
        region: new window.Services.GuidanceVideoModal.JobRegion(this),
        embed: new window.Services.GuidanceVideoModal.JobEmbed(this),
        modal: new window.Services.GuidanceVideoModal.JobModal(this),
        scroll: new window.Services.GuidanceVideoModal.JobScroll(this)
      };
      return this;
    }

    show(source, opts) {
      // source: URL or { type, url, id }
      opts = opts || {};
      var cfg = Object.assign({}, this.config, opts);
      var container = this.jobs.region.resolveContainer(cfg.container || document.body);
      var region = this.jobs.region.ensureRegion(container, cfg.position, cfg.zIndex);

      var id = cfg.id || (cfg.idPrefix + Date.now() + '-' + Math.floor(Math.random() * 10000));
      var embedSpec = this.jobs.embed.toEmbedSpec(source, cfg);

      var node = this.jobs.modal.createModal({
        id: id,
        size: cfg.size,
        ariaLabel: cfg.ariaLabel,
        dismissOnBackdrop: !!cfg.dismissOnBackdrop,
        dismissOnEsc: !!cfg.dismissOnEsc,
        closeButton: !!cfg.closeButton,
        embedSpec: embedSpec
      }, {
        onRequestClose: () => { this.dismiss(node); }
      });

      region.appendChild(node);
      this.stack.push({ id: id, node: node, container: container });

      if (cfg.lockScroll && container === document.body) {
        this.jobs.scroll.lock();
      }

      // スタック上限（通常 1）
      if (Number(cfg.maxStack) > 0) {
        var per = this.stack.filter(s => s.container === container);
        while (per.length > cfg.maxStack) {
          var victim = per.shift();
          this.dismiss(victim.node);
          per = this.stack.filter(s => s.container === container);
        }
      }

      this.jobs.modal.focusInitial(node);
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

      if (updates && (updates.source || updates.url || updates.type || updates.id)) {
        var cfg = Object.assign({}, this.config, updates || {});
        var embedSpec = this.jobs.embed.toEmbedSpec(updates.source || updates.url || { type: updates.type, id: updates.id, url: updates.url }, cfg);
        updates.embedSpec = embedSpec;
      }
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

      if (entry.container === document.body && !this.stack.some(s => s.container === document.body)) {
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
        this.jobs.modal.removeModal(e.node);
      }
      if (this.jobs.scroll.unlockAll) this.jobs.scroll.unlockAll();
      else this.jobs.scroll.unlock();
      this.jobs.region.removeAllRegions();
      return true;
    }

    hide(target) { return this.dismiss(target); }
    open(source, opts) { return this.show(source, opts); } // エイリアス
  }

  window.Services = window.Services || {};
  window.Services.GuidanceVideoModal = GuidanceVideoModal;   

})(window, document);
