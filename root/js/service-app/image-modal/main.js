(function () {

  'use strict';

  class ImageModalService
  {
    constructor(options)
    {
      this.stack = [];
      this.jobs = null;
      this._historyHandler = null;
      this._historyDepth = 0;
      this._ignorePopstateCount = 0;
      this._closingFromHistory = false;
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

    _hasOpenModal()
    {
      return Array.isArray(this.stack) && this.stack.length > 0;
    }

    _ensureHistoryListener()
    {
      if (this._historyHandler) return;
      var self = this;
      this._historyHandler = function () {
        if (self._ignorePopstateCount > 0)
        {
          self._ignorePopstateCount--;
          return;
        }
        if (self._historyDepth > 0 && self._hasOpenModal())
        {
          self._historyDepth--;
          self._closingFromHistory = true;
          self.dismiss();
          self._closingFromHistory = false;
          self._teardownHistoryIfIdle();
        }
      };
      window.addEventListener('popstate', this._historyHandler);
    }

    _teardownHistoryIfIdle()
    {
      if (!this._hasOpenModal() && this._historyDepth <= 0 && this._historyHandler)
      {
        window.removeEventListener('popstate', this._historyHandler);
        this._historyHandler = null;
        this._ignorePopstateCount = 0;
        this._historyDepth = 0;
      }
    }

    _pushHistoryState()
    {
      this._ensureHistoryListener();
      history.pushState({ modal: 'image' }, document.title, window.location.href);
      this._historyDepth++;
    }

    _popHistorySilently(count)
    {
      var steps = (typeof count === 'number' && count > 0) ? count : 1;
      for (var i = 0; i < steps && this._historyDepth > 0; i++)
      {
        this._historyDepth--;
        this._ignorePopstateCount++;
        history.back();
      }
      this._teardownHistoryIfIdle();
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

      this._pushHistoryState();
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
      if (!this._closingFromHistory)
      {
        this._popHistorySilently(1);
      }
      else
      {
        this._teardownHistoryIfIdle();
      }
      return true;
    }

    dismissAll() {
      var historyCount = this._historyDepth;
      while (this.stack.length) {
        var e = this.stack.pop();
        this.jobs.modal.removeModal(e.node);
      }
      if (this.jobs.scroll.unlockAll) this.jobs.scroll.unlockAll();
      else this.jobs.scroll.unlock();
      if (historyCount > 0)
      {
        this._popHistorySilently(historyCount);
      }
      return true;
    }
  }

  window.Services = window.Services || {};
  window.Services.ImageModal = ImageModalService;

})(window, document);
