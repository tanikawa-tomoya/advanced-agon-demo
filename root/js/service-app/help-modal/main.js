(function () {
  'use strict';

  class HelpModalService
  {
    constructor(options) {
      this.options = options || {};
      this.config = null;
      this.jobs = null;
      this._region = null;
      this._current = null; // { overlay, dialog, backdrop, escHandler, prevActive }
      this.initConfig();
    }

    initConfig()
    {
      const DEFAULTS = {
        position: 'center',       // 表示位置（領域クラスに反映）
        closeOnBackdrop: true,    // バックドロップクリックで閉じる
        closeOnEsc: true,         // ESCキーで閉じる
        focusTrap: true,          // フォーカストラップ
        zIndex: 10000,            // ベースの z-index
        idPrefix: 'helpmodal-',
        ariaLabelClose: 'Close',
        container: null,          // 未指定は body
        overlayClassName: 'c-help-modal',
        contentClassName: 'c-help-modal__content',
        showWatermark: true,      // HELP 透かしの表示有無
        defaultSanitizeFn: null
      };
      this.config = Object.assign({}, DEFAULTS, this.options || {});
    }
    
    async boot()
    {
      await window.Utils.loadScriptsSync([
        'js/service-app/help-modal/job-build-modal.js',
        'js/service-app/help-modal/job-region.js',
        'js/service-app/help-modal/job-focus.js',
        'js/service-app/help-modal/job-scroll.js'
      ]);
      
      var helpModalNS = window.Services && window.Services.HelpModal;
      this.jobs = {
        build: new helpModalNS.JobBuildModal(this),
        region: new helpModalNS.JobRegion(this),
        focus: new helpModalNS.JobFocus(this),
        scroll: new helpModalNS.JobScroll(this)
      };
      return this;
    }

    // content: string | { title, text, html, sanitizeFn, actions[], closeAriaLabel }
    show(content, opts) {
      opts = opts || {};
      var cfg = Object.assign({}, this.config, opts);

      var container = this.jobs.region.resolveContainer(cfg.container || document.body);
      var region = this.jobs.region.ensureRegion(container, cfg.position, cfg.zIndex);

      // 単一表示: 既存があれば閉じる
      if (this._current && this._current.overlay) {
        this.dismiss();
      }

      var id = (cfg.idPrefix || 'helpmodal-') + Date.now() + '-' + Math.floor(Math.random() * 100000);
      var normalized = this._normalizeContent(content, cfg);

      var built = this.jobs.build.buildModal({
        id: id,
        titleText: normalized.title || '',
        text: normalized.text,
        html: normalized.html,
        sanitizeFn: normalized.sanitizeFn,
        actions: normalized.actions,
        closeAriaLabel: normalized.closeAriaLabel || cfg.ariaLabelClose || 'Close',
        overlayClassName: cfg.overlayClassName,
        contentClassName: cfg.contentClassName,
        showWatermark: cfg.showWatermark
      });

      var overlay = built.overlay;
      var dialog  = built.dialog;
      var backdrop = built.backdrop;

      // バックドロップクリック
      if (cfg.closeOnBackdrop && backdrop) {
        backdrop.addEventListener('mousedown', (ev) => {
          if (ev.target === backdrop) this.dismiss();
        }, true);
      }

      // ESC クローズ
      var escHandler = null;
      if (cfg.closeOnEsc) {
        escHandler = (ev) => {
          ev = ev || window.event;
          var key = ev.key || ev.keyCode;
          if (key === 'Escape' || key === 'Esc' || key === 27) {
            ev.preventDefault && ev.preventDefault();
            this.dismiss();
          }
        };
        document.addEventListener('keydown', escHandler, true);
      }

      // マウント & フォーカス管理 & スクロールロック
      this.jobs.region.mount(region, overlay, cfg.zIndex);
      this.jobs.scroll.lock();
      var prevActive = document.activeElement;
      if (cfg.focusTrap) this.jobs.focus.trap(dialog);

      // 初期フォーカス
      this.jobs.build.requestFrame(function () {
        try { dialog.setAttribute('tabindex', '-1'); dialog.focus(); } catch (e) {}
      });

      // 状態保持
      this._current = { overlay: overlay, dialog: dialog, backdrop: backdrop, escHandler: escHandler, prevActive: prevActive, container: container };
      return dialog;
    }

    dismiss() {
      var cur = this._current;
      if (!cur || !cur.overlay) return false;

      // イベント解除
      if (cur.escHandler) document.removeEventListener('keydown', cur.escHandler, true);

      // フォーカス解除
      this.jobs.focus.release(cur.dialog);

      // アンマウント
      this.jobs.region.unmount(cur.overlay);

      // スクロール解除（カウントがずれていても確実に解除する）
      this.jobs.scroll.unlockAll();

      // フォーカス戻し
      try { if (cur.prevActive && typeof cur.prevActive.focus === 'function') cur.prevActive.focus(); } catch (e) {}

      this._current = null;

      // 空リージョンを片付け
      var region = this.jobs.region.getRegion(cur.container);
      if (region && this.jobs.region.isRegionEmpty(region)) {
        this.jobs.region.removeRegion(region);
      }
      return true;
    }

    isOpen() {
      return !!(this._current && this._current.overlay);
    }

    _normalizeContent(content, cfg) {
      if (content == null) return { title: '', text: '' };
      if (typeof content === 'string') return { title: '', text: String(content) };
      var o = (typeof content === 'object') ? content : { text: String(content) };
      var out = {
        title: (typeof o.title === 'string') ? o.title : '',
        closeAriaLabel: (typeof o.closeAriaLabel === 'string') ? o.closeAriaLabel : undefined
      };
      if (typeof o.html === 'string') {
        out.html = o.html;
        if (typeof o.sanitizeFn === 'function') out.sanitizeFn = o.sanitizeFn;
        else if (typeof cfg.sanitizeFn === 'function') out.sanitizeFn = cfg.sanitizeFn;
        else if (typeof cfg.defaultSanitizeFn === 'function') out.sanitizeFn = cfg.defaultSanitizeFn;
      } else if (typeof o.text === 'string') {
        out.text = o.text;
      }
      if (Array.isArray(o.actions)) out.actions = o.actions;
      return out;
    }
  }

  window.Services = window.Services || {};
  window.Services.HelpModal = HelpModalService;

})(window, document);
