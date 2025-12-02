(function () {

  'use strict';

  class PwaDownloaderService
  {
    constructor(options)
    {
      this.stack = [];
      this.jobs = null;
      this.contentsSelectModalService = null;
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
        idPrefix: 'pwa-downloader-',
        stylesheetHref: '/css/pwa-downloader.css',
        selectButtonLabel: 'コンテンツを選択',
        plannedLabel: 'ダウンロード予定',
        files: [],
        contentsSelectOptions: { multiple: true },
        manifestHref: '/manifest.webmanifest',
        serviceWorkerPath: '/service-worker.js',
        serviceWorkerScope: '/',
        enableServiceWorker: true
      });
      this.config = Object.assign({}, this.DEFAULTS, options || {});
    }

    async boot()
    {
      this.ensureStylesheet(this.config.stylesheetHref);
      await window.Utils.loadScriptsSync([
        'js/service-app/pwa-downloader/job-region.js',
        'js/service-app/pwa-downloader/job-modal.js',
        'js/service-app/pwa-downloader/job-pwa.js'
      ]);

      this.jobs = {
        region: new window.Services.PwaDownloader.JobRegion(this),
        modal: new window.Services.PwaDownloader.JobModal(this),
        pwa: new window.Services.PwaDownloader.JobPwa(this)
      };
      this.jobs.pwa.prepare(this.config);
      return this;
    }

    ensureStylesheet(source)
    {
      if (document.querySelector('link[data-pwa-downloader-style="1"]')) return;

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
      candidates.push('/css/pwa-downloader.css');

      var unique = [];
      for (var j = 0; j < candidates.length; j++) {
        if (unique.indexOf(candidates[j]) === -1) unique.push(candidates[j]);
      }

      (function tryNext(i) {
        if (i >= unique.length) return;
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = unique[i];
        link.setAttribute('data-pwa-downloader-style', '1');
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
        files: normalizedFiles,
        selectButtonLabel: cfg.selectButtonLabel,
        plannedLabel: cfg.plannedLabel
      });

      region.appendChild(node);
      this.stack.push({ id: id, node: node, container: container });

      var self = this;
      this.jobs.modal.bindInteractions(node, {
        onRequestClose: function () { self.dismiss(node); },
        onSelectContents: function () { self.handleSelectContents(node); },
        onPlay: function (fileId) { self.handlePlay(node, fileId); },
        onPause: function (fileId) { self.handlePause(node, fileId); },
        onRemove: function (fileId) { self.handleRemove(node, fileId); }
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
          id = 'pwa-download-file-' + stamp + '-' + idx + '-' + Math.floor(Math.random() * 1000);
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

    async handleSelectContents(target)
    {
      var entry = this.resolveEntry(target);
      if (!entry) return;
      var cfg = this.config || {};
      var modal = entry.node;
      var files = this.jobs.modal.exportFiles(modal) || [];
      var self = this;

      if (cfg && typeof cfg.onSelectContents === 'function') {
        cfg.onSelectContents({
          node: modal,
          files: files,
          updateFiles: function (nextFiles) { self.updateFiles(modal, nextFiles); },
          appendFiles: function (nextFiles) { self.appendFiles(modal, nextFiles); }
        });
        return;
      }

      var service = await this.getContentsSelectModalService();
      service.open(Object.assign({}, cfg.contentsSelectOptions || {}, {
        multiple: true,
        selected: files.map(function (file) { return { id: file.id, name: file.name }; }),
        onSelect: function (item) { if (item) self.applySelectedContents(modal, [item]); },
        onApply: function (items) { self.applySelectedContents(modal, items); }
      }));
    }

    async getContentsSelectModalService()
    {
      if (this.contentsSelectModalService) return this.contentsSelectModalService;

      await window.Utils.loadScriptsSync([
        'js/service-app/contents-select-modal/main.js'
      ]);

      var opts = Object.assign({ multiple: true }, this.config.contentsSelectOptions || {});
      if (typeof this.config.zIndex === 'number' && (opts.zIndex === undefined || opts.zIndex === null)) {
        opts.zIndex = this.config.zIndex + 1;
      }

      this.contentsSelectModalService = new window.Services.ContentsSelectModal(opts);
      await this.contentsSelectModalService.boot();
      return this.contentsSelectModalService;
    }

    applySelectedContents(target, items)
    {
      var files = this.extractFilesFromContents(items || []);
      if (!files.length) return false;
      return this.appendFiles(target, files);
    }

    extractFilesFromContents(items)
    {
      if (!Array.isArray(items)) return [];
      var stamp = Date.now();
      var list = [];
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (!item) continue;
        var raw = item.raw || item;
        var id = raw.id || raw.contentId || raw.contentID || raw.code || raw.contentCode;
        if (!id) {
          id = 'pwa-content-' + stamp + '-' + i;
        }
        var name = raw.title || raw.name || raw.contentName || raw.contentTitle || raw.code || ('コンテンツ ' + (i + 1));
        list.push({
          id: String(id),
          name: String(name),
          downloadedBytes: 0,
          totalBytes: 0,
          rate: raw.rate,
          rateBytesPerSec: raw.rateBytesPerSec,
          status: 'ダウンロード予定',
          progressPercent: 0
        });
      }
      return list;
    }

    appendFiles(target, files)
    {
      var entry = this.resolveEntry(target);
      if (!entry) return false;
      var current = this.jobs.modal.exportFiles(entry.node) || [];
      var merged = this.mergeFiles(current, files || []);
      this.jobs.modal.replaceFiles(entry.node, merged);
      return true;
    }

    mergeFiles(existing, additions)
    {
      var merged = [];
      var indexMap = Object.create(null);
      var listA = this.normalizeFiles(existing || []);
      var listB = this.normalizeFiles(additions || []);

      function pushItem(item)
      {
        if (!item || !item.id) return;
        var key = String(item.id);
        if (Object.prototype.hasOwnProperty.call(indexMap, key)) {
          var idx = indexMap[key];
          merged[idx] = Object.assign({}, merged[idx], item);
        } else {
          merged.push(Object.assign({}, item));
          indexMap[key] = merged.length - 1;
        }
      }

      for (var i = 0; i < listA.length; i++) pushItem(listA[i]);
      for (var j = 0; j < listB.length; j++) pushItem(listB[j]);

      return merged;
    }

    handlePlay(target, fileId)
    {
      var entry = this.resolveEntry(target);
      if (!entry) return false;
      var files = this.jobs.modal.exportFiles(entry.node) || [];
      var matched = null;
      for (var i = 0; i < files.length; i++) {
        if (String(files[i].id) === String(fileId)) {
          matched = files[i];
          break;
        }
      }
      if (this.config && typeof this.config.onPlay === 'function') {
        this.config.onPlay(matched, files, entry.node);
      }
      return true;
    }

    handlePause(target, fileId)
    {
      var entry = this.resolveEntry(target);
      if (!entry) return false;
      var files = this.jobs.modal.exportFiles(entry.node) || [];
      var matched = null;
      for (var i = 0; i < files.length; i++) {
        if (String(files[i].id) === String(fileId)) {
          matched = files[i];
          break;
        }
      }
      if (this.config && typeof this.config.onPause === 'function') {
        this.config.onPause(matched, files, entry.node);
      }
      return true;
    }

    handleRemove(target, fileId)
    {
      var entry = this.resolveEntry(target);
      if (!entry) return false;
      var files = this.jobs.modal.exportFiles(entry.node) || [];
      var filtered = files.filter(function (file) { return String(file.id) !== String(fileId); });
      this.jobs.modal.replaceFiles(entry.node, filtered);
      if (this.config && typeof this.config.onRemove === 'function') {
        this.config.onRemove(fileId, entry.node);
      }
      return true;
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
      return true;
    }

    dismissAll()
    {
      while (this.stack.length) {
        var e = this.stack.pop();
        this.jobs.modal.removeModal(e.node);
      }
      this.unlockScroll();
      this.jobs.region.removeAllRegions();
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
  window.Services.PwaDownloader = PwaDownloaderService;

})(window, document);
