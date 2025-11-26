(function () {

  'use strict';

  class YoutubeVideoModalService
  {
    constructor(options)
    {
      this.options = options || {};
      this.jobs = null;
      this.stack = [];
      this.CSS = null;
      this.config = null;
    }

    initConfig(options)
    {
      var CSS = {
        region: 'c-video-modal-region',
        modal: 'c-video-modal',
        backdrop: 'c-video-modal__backdrop',
        dialog: 'c-video-modal__dialog',
        header: 'c-video-modal__header',
        title: 'c-video-modal__title',
        body: 'c-video-modal__body',
        close: 'c-video-modal__close',
        bodyOpen: 'is-modal-open'
      };
      var DEFAULTS = {
        zIndex: 10000,
        closeOnBackdrop: true,
        closeOnEsc: true,
        autoplay: true,
        allowFullscreen: true,
        iframeAllow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
        ariaLabel: 'YouTube video modal',
        container: null,
        idPrefix: 'ytvm-',
        youtubeParams: { rel: 0, playsinline: 1 }
      };
      this.CSS = Object.freeze(CSS);
      this.DEFAULTS = Object.freeze(DEFAULTS);
      this.config = Object.assign({}, DEFAULTS, options || {});
      return this.config;
    }

    async boot()
    {
      await window.Utils.loadScriptsSync([
        'js/service-app/youtube-video-modal/job-region.js',
        'js/service-app/youtube-video-modal/job-embed.js',
        'js/service-app/youtube-video-modal/job-modal.js'
      ]);

      this.initConfig(this.options);

      this.jobs = {
        region: new window.Services.YoutubeVideoModal.JobRegion(this),
        embed: new window.Services.YoutubeVideoModal.JobEmbed(this),
        modal: new window.Services.YoutubeVideoModal.JobModal(this)
      };
      return this;
    }

    _ensureRegion(container, zIndex)
    {
      return this.jobs.region.ensureRegion(container || document.body, this.CSS, zIndex);
    }

    _mount(modalEl, container)
    {
      this._ensureRegion(container, this.config.zIndex).appendChild(modalEl);
      this.stack.push({ node: modalEl, container: container || document.body });
      if ((container || document.body) === document.body) {
        this.jobs.modal.lockBodyScroll(this.CSS, true);
      }
    }

    _unmount(modalEl)
    {
      var idx = this.stack.findIndex(function (e) { return e.node === modalEl; });
      if (idx >= 0) this.stack.splice(idx, 1);
      this.jobs.modal.disposeModal(modalEl);
      if (modalEl && modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
      if (this.stack.length === 0) {
        this.jobs.modal.lockBodyScroll(this.CSS, false);
        this.jobs.region.cleanupIfEmpty(this.CSS);
      }
    }

    show(url, options)
    {
      if (!url) throw new Error('youtube-video-modal: url required');
      var cfg = Object.assign({}, this.config, options || {});
      var container = this.jobs.region.resolveContainer(cfg.container || document.body);
      var embedSpec = this.jobs.embed.toEmbedSpec(url, cfg);
      var id = cfg.id || (cfg.idPrefix + Date.now() + '-' + Math.floor(Math.random() * 10000));
      var modalEl = this.jobs.modal.createModal({
        CSS: this.CSS,
        ariaLabel: cfg.ariaLabel,
        id: id,
        embedSpec: embedSpec,
        closeOnBackdrop: !!cfg.closeOnBackdrop,
        closeOnEsc: !!cfg.closeOnEsc,
        allowFullscreen: !!cfg.allowFullscreen,
        iframeAllow: cfg.iframeAllow
      }, this._unmount.bind(this));
      this._mount(modalEl, container);
      this.jobs.modal.focusInitial(modalEl);
      return modalEl;
    }

    open(url, options) { return this.show(url, options); }
    hide(target) { return this.dismiss(target); }

    dismiss(target)
    {
      var idx = -1;
      if (!target) {
        idx = this.stack.length - 1;
      } else {
        idx = this.stack.findIndex(function (s) { return s.node === target || (s.node && s.node.id === target.id); });
      }
      if (idx < 0) return false;
      var entry = this.stack[idx];
      this._unmount(entry.node);
      return true;
    }

    dismissAll()
    {
      while (this.stack.length) {
        var e = this.stack.pop();
        this._unmount(e.node);
      }
      return true;
    }
  }

  window.Services = window.Services || {};
  window.Services.YoutubeVideoModal = YoutubeVideoModalService;

})(window, document);
