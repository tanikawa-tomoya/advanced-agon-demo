(function () {

  'use strict';

  class DownloadModalService
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
        title: 'ダウンロード',
        subtitle: 'ダウンロード対象のファイル一覧',
        ariaLabel: 'Download progress',
        dismissOnBackdrop: false,
        dismissOnEsc: true,
        lockScroll: true,
        container: null,
        zIndex: 12000,
        idPrefix: 'downloadmodal-',
        stylesheetHref: '/css/download-modal.css',
        files: []
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
      history.pushState({ modal: 'download' }, document.title, window.location.href);
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
      this.ensureStylesheet(this.config.stylesheetHref);
      await window.Utils.loadScriptsSync([
        'js/service-app/download-modal/job-region.js',
        'js/service-app/download-modal/job-modal.js'
      ]);

      this.jobs = {
        region: new window.Services.DownloadModal.JobRegion(this),
        modal: new window.Services.DownloadModal.JobModal(this)
      };
      return this;
    }

    ensureStylesheet(source)
    {
      if (document.querySelector('link[data-download-modal-style="1"]')) return;

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
      candidates.push('/css/download-modal.css');

      var unique = [];
      for (var j = 0; j < candidates.length; j++) {
        if (unique.indexOf(candidates[j]) === -1) unique.push(candidates[j]);
      }

      (function tryNext(i) {
        if (i >= unique.length) return;
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = unique[i];
        link.setAttribute('data-download-modal-style', '1');
        link.onerror = function () {
          link.remove();
          tryNext(i + 1);
        };
        document.head.appendChild(link);
      })(0);
    }

    open(filesOrOpts, opts)
    {
      return this.show(filesOrOpts, opts);
    }

    show(filesOrOpts, opts)
    {
      var cfg;
      if (Array.isArray(filesOrOpts)) {
        cfg = Object.assign({}, this.config, opts || {}, { files: filesOrOpts });
      } else {
        cfg = Object.assign({}, this.config, filesOrOpts || {}, opts || {});
      }

      var normalizedFiles = this.normalizeFiles(cfg.files);
      var container = this.jobs.region.resolveContainer(cfg.container || document.body);
      var region = this.jobs.region.ensureRegion(container, cfg.zIndex);
      var id = cfg.id || (cfg.idPrefix + Date.now() + '-' + Math.floor(Math.random() * 10000));

      var node = this.jobs.modal.createModal({
        id: id,
        title: cfg.title,
        subtitle: cfg.subtitle,
        ariaLabel: cfg.ariaLabel,
        dismissOnBackdrop: !!cfg.dismissOnBackdrop,
        dismissOnEsc: !!cfg.dismissOnEsc,
        files: normalizedFiles
      });

      this._pushHistoryState();
      region.appendChild(node);
      this.stack.push({ id: id, node: node, container: container });

      var self = this;
      this.jobs.modal.bindInteractions(node, {
        onRequestClose: function () { self.dismiss(node); }
      });

      if (cfg.lockScroll && container === document.body) {
        this.lockScroll();
      }

      return node;
    }

    normalizeFiles(list)
    {
      if (!Array.isArray(list)) return [];
      var stamp = Date.now();
      return list.map(function (item, idx) {
        var entry = item || {};
        var id = entry.id;
        if (!id) {
          id = 'download-file-' + stamp + '-' + idx + '-' + Math.floor(Math.random() * 1000);
        }
        return {
          id: String(id),
          name: typeof entry.name === 'string' ? entry.name : 'File ' + (idx + 1),
          downloadedBytes: Number(entry.downloadedBytes) || 0,
          totalBytes: Number(entry.totalBytes) || 0,
          rate: entry.rate,
          rateBytesPerSec: entry.rateBytesPerSec,
          status: typeof entry.status === 'string' ? entry.status : '',
          progressPercent: (typeof entry.progressPercent === 'number') ? entry.progressPercent : null
        };
      });
    }

    update(target, updates)
    {
      if (updates == null && (typeof target === 'object' || typeof target === 'string' || target == null)) {
        updates = target; target = null;
      }
      var entry = this.resolveEntry(target);
      if (!entry) return false;

      var next = Object.assign({}, updates || {});
      if (Object.prototype.hasOwnProperty.call(next, 'files')) {
        next.files = this.normalizeFiles(next.files);
      }
      this.jobs.modal.updateModal(entry.node, next);
      return true;
    }

    updateFiles(target, files)
    {
      return this.update(target, { files: files });
    }

    updateFile(target, fileId, updates)
    {
      var entry = this.resolveEntry(target);
      if (!entry) return false;
      return this.jobs.modal.updateFile(entry.node, fileId, updates || {});
    }

    dismiss(target)
    {
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

      if (entry.container === document.body && !this.stack.some(function (s) { return s.container === document.body; })) {
        this.unlockScroll();
      }

      var region = this.jobs.region.getRegion(entry.container);
      if (region && this.jobs.region.isRegionEmpty(region)) {
        this.jobs.region.removeRegion(region);
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

    dismissAll()
    {
      var historyCount = this._historyDepth;
      this._closingFromHistory = true;
      while (this.stack.length) {
        var e = this.stack.pop();
        this.jobs.modal.removeModal(e.node);
      }
      this._closingFromHistory = false;
      this.unlockScroll();
      this.jobs.region.removeAllRegions();
      if (historyCount > 0)
      {
        this._popHistorySilently(historyCount);
      }
      return true;
    }

    resolveEntry(target)
    {
      if (!this.stack.length) return null;
      if (!target) {
        return this.stack[this.stack.length - 1];
      }
      if (typeof target === 'string') {
        return this.stack.find(function (s) { return s.id === target; }) || null;
      }
      return this.stack.find(function (s) { return s.node === target || (s.node && s.node.id === (target && target.id)); }) || null;
    }

    lockScroll()
    {
      if (!this.__lockCount) this.__lockCount = 0;
      if (!this.__prevOverflow) this.__prevOverflow = '';
      if (this.__lockCount === 0) {
        this.__prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      }
      this.__lockCount++;
    }

    unlockScroll()
    {
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
  window.Services.DownloadModal = DownloadModalService;

})(window, document);
