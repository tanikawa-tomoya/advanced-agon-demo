(function () {

  'use strict';

  class ImageModalService
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
        animation: 'fade',        // 'fade' | 'none'
        closeOnBackdrop: true,
        closeOnEsc: true,
        lockScroll: true,
        zIndex: 11000,
        ariaLabel: 'Image dialog',
        idPrefix: 'imgmodal-',
        maxStack: 1
      });
      this.ANIMATION_TO_CLASS = Object.freeze({
        'fade': 'is-anim-fade',
        'none': 'is-anim-none'
      });
      this.config = Object.assign({}, this.DEFAULTS, options || {});
    }

    async boot()
    {
      await window.Utils.loadScriptsSync([
        'js/service-app/image-modal/job-modal.js',
        'js/service-app/image-modal/job-scroll.js'
      ]);

      this.jobs = {
        modal: new window.Services.ImageModal.JobModal(this),
        scroll: new window.Services.ImageModal.JobScroll(this)
      };
      return this;
    }

    show(src, opts) {
      opts = opts || {};
      var cfg = Object.assign({}, this.config, opts);
      var id = cfg.id || (cfg.idPrefix + Date.now() + '-' + Math.floor(Math.random() * 10000));
      var animClass = this.ANIMATION_TO_CLASS[String(cfg.animation || 'fade')] || this.ANIMATION_TO_CLASS['fade'];

      var node = this.jobs.modal.createModal({
        id: id,
        src: src,
        alt: cfg.alt || '',
        caption: cfg.caption,
        ariaLabel: cfg.ariaLabel,
        zIndex: cfg.zIndex,
        animationClass: animClass,
        closeOnBackdrop: !!cfg.closeOnBackdrop,
        closeOnEsc: !!cfg.closeOnEsc
      });

      document.body.appendChild(node);
      this.stack.push({ id: id, node: node });

      if (cfg.lockScroll) this.jobs.scroll.lock();

      var self = this;
      this.jobs.modal.bindInteractions(node, {
        onRequestClose: function () { self.dismiss(node); }
      });

      this.jobs.modal.open(node);

      if (Number(cfg.maxStack) > 0) {
        while (this.stack.length > cfg.maxStack) {
          var victim = this.stack.shift();
          this.dismiss(victim.node);
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
      this.jobs.modal.updateModal(entry.node, updates || {});
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
      this.jobs.modal.removeModal(entry.node);
      this.stack.splice(idx, 1);

      if (!this.stack.length) {
        if (this.jobs.scroll.unlockAll) this.jobs.scroll.unlockAll();
        else this.jobs.scroll.unlock();
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
      return true;
    }
  }

  window.Services = window.Services || {};
  window.Services.ImageModal = ImageModalService;

})(window, document);
