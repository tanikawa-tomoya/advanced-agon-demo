(function () {

  'use strict';

  class AudioModalService
  {
    constructor(options)
    {
      this.options = options || {};
      this.jobs = null;
      this.stack = [];
      this.config = null;
      this.CSS = null;
    }

    initConfig(options)
    {
      var CSS = {
        region: 'c-audio-modal-region',
        modal: 'c-audio-modal',
        backdrop: 'c-audio-modal__backdrop',
        dialog: 'c-audio-modal__dialog',
        header: 'c-audio-modal__header',
        title: 'c-audio-modal__title',
        body: 'c-audio-modal__body',
        close: 'c-audio-modal__close',
        bodyOpen: 'is-modal-open'
      };
      var DEFAULTS = {
        zIndex: 10000,
        closeOnBackdrop: true,
        closeOnEsc: true,
        autoplay: false,
        loop: false,
        muted: false,
        controls: true,
        preload: 'metadata',
        ariaLabel: 'Audio modal',
        container: null,
        idPrefix: 'audm-'
      };
      this.CSS = Object.freeze(CSS);
      this.DEFAULTS = Object.freeze(DEFAULTS);
      this.config = Object.assign({}, DEFAULTS, options || {});
      return this.config;
    }

    async boot()
    {
      await window.Utils.loadScriptsSync([
        'js/service-app/audio-modal/job-region.js',
        'js/service-app/audio-modal/job-audio.js',
        'js/service-app/audio-modal/job-modal.js'
      ]);

      this.initConfig(this.options);

      this.jobs = {
        region: new window.Services.AudioModal.JobRegion(this),
        audio: new window.Services.AudioModal.JobAudio(this),
        modal: new window.Services.AudioModal.JobModal(this)
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
      try
      {
        requestAnimationFrame(function () { modalEl.classList.add('is-open'); });
      }
      catch (_err) {}
      if ((container || document.body) === document.body)
      {
        this.jobs.modal.lockBodyScroll(this.CSS, true);
      }
    }

    _unmount(modalEl)
    {
      var idx = this.stack.findIndex(function (e) { return e.node === modalEl; });
      if (idx >= 0) this.stack.splice(idx, 1);
      this.jobs.modal.disposeModal(modalEl);
      if (modalEl && modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
      if (this.stack.length === 0)
      {
        this.jobs.modal.lockBodyScroll(this.CSS, false);
        this.jobs.region.cleanupIfEmpty(this.CSS);
      }
    }

    show(srcOrSpec, options)
    {
      var cfg = Object.assign({}, this.config, options || {});
      var spec = {};
      if (typeof srcOrSpec === 'string')
      {
        spec.src = srcOrSpec;
      }
      else if (srcOrSpec && typeof srcOrSpec === 'object')
      {
        spec = Object.assign({}, srcOrSpec);
      }

      if (!spec.src && !(Array.isArray(spec.sources) && spec.sources.length))
      {
        throw new Error('audio-modal: src is required');
      }

      var container = this.jobs.region.resolveContainer(cfg.container || document.body);
      var audioNode = this.jobs.audio.createAudio({
        src: spec.src,
        sources: spec.sources,
        autoplay: spec.autoplay != null ? spec.autoplay : cfg.autoplay,
        loop: spec.loop != null ? spec.loop : cfg.loop,
        muted: spec.muted != null ? spec.muted : cfg.muted,
        controls: spec.controls != null ? spec.controls : cfg.controls,
        preload: spec.preload || cfg.preload,
        title: spec.title || cfg.title
      });

      var id = cfg.id || (cfg.idPrefix + Date.now() + '-' + Math.floor(Math.random() * 10000));
      var modalEl = this.jobs.modal.createModal({
        CSS: this.CSS,
        id: id,
        title: spec.title || cfg.title || '',
        ariaLabel: cfg.ariaLabel,
        contentNode: audioNode,
        closeOnBackdrop: !!cfg.closeOnBackdrop,
        closeOnEsc: !!cfg.closeOnEsc
      }, this._unmount.bind(this));

      this._mount(modalEl, container);
      this.jobs.modal.focusInitial(modalEl);
      return modalEl;
    }

    open(srcOrSpec, options) { return this.show(srcOrSpec, options); }

    hide(target) { return this.dismiss(target); }

    dismiss(target)
    {
      var idx = -1;
      if (!target)
      {
        idx = this.stack.length - 1;
      }
      else
      {
        idx = this.stack.findIndex(function (s) { return s.node === target || (s.node && s.node.id === target.id); });
      }
      if (idx < 0) return false;
      var entry = this.stack[idx];
      this._unmount(entry.node);
      return true;
    }

    dismissAll()
    {
      while (this.stack.length)
      {
        var e = this.stack.pop();
        this._unmount(e.node);
      }
      return true;
    }
  }

  window.Services = window.Services || {};
  window.Services.AudioModal = AudioModalService;

})(window, document);
