(function () {

  'use strict';

  class MultiVideoModalService
  {
    constructor(options)
    {
      this.options = options || {};
      this.stack = [];
      this.region = null;
      this.jobs = null;
      this.DEFAULTS = null;
      this.CSS = null;
      this.ALLOWED_IFRAME_HOSTS = null;
      this.buttonService = null;
    }

    initConfig(options)
    {
      var providedApi = options && options.api ? options.api : null;
      var apiDefaults = this._buildDefaultApiConfig(providedApi && providedApi.requestType);
      var DEFAULTS = {
        zIndex: 10000,
        closeOnBackdrop: true,
        closeOnEsc: true,
        autoplay: true,
        // iframe の allow 属性
        iframeAllow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
        api: apiDefaults
      };
      var CSS = {
        region: 'c-video-modal-region',
        modal: 'c-video-modal',
        backdrop: 'c-video-modal__backdrop',
        dialog: 'c-video-modal__dialog',
        header: 'c-video-modal__header',
        title: 'c-video-modal__title',
        titleWrap: 'c-video-modal__title-wrap',
        body: 'c-video-modal__body',
        actions: 'c-video-modal__actions',
        bitrateButton: 'c-video-modal__bitrate-button',
        close: 'c-video-modal__close',
        bodyOpen: 'is-modal-open'
      };
      var ALLOWED_IFRAME_HOSTS = {
        'www.youtube-nocookie.com': true,
        'www.youtube.com': true,
        'youtube.com': true,
        'youtu.be': true,
        'player.vimeo.com': true,
        'vimeo.com': true
      };

      this.DEFAULTS = Object.freeze(DEFAULTS);
      this.CSS = Object.freeze(CSS);
      this.ALLOWED_IFRAME_HOSTS = Object.freeze(ALLOWED_IFRAME_HOSTS);
      var merged = Object.assign({}, DEFAULTS, options || {});
      merged.api = Object.assign({}, apiDefaults, providedApi || {});
      this.config = merged;
      return this.config;
    }

    _buildDefaultApiConfig(preferredRequestType)
    {
      var dataset = (document.body && document.body.dataset) ? document.body.dataset : {};
      var requestType = preferredRequestType || dataset.apiRequestType || 'Contents';
      var endpoint = dataset.apiEndpoint || '';
      var token = dataset.apiToken || '';
      var utils = window.Utils;
      if ((!endpoint || !token) && utils && typeof utils.buildApiRequestOptions === 'function')
      {
        try
        {
          var built = utils.buildApiRequestOptions(requestType, 'ContentVideoGet', {});
          if (!endpoint && built && typeof built.url === 'string')
          {
            endpoint = built.url;
          }
          if (!token && built && built.data && typeof built.data.get === 'function')
          {
            token = built.data.get('token') || token;
          }
        }
        catch (_err)
        {
          // ignore and fall back to defaults
        }
      }
      if (!endpoint)
      {
        endpoint = window.Utils.getApiEndpoint();
      }
      return {
        requestType: requestType || 'Contents',
        apiEndpoint: endpoint,
        apiToken: token || ''
      };
    }

    async boot()
    {
      await window.Utils.loadScriptsSync([
        'js/service-app/multi-video-modal/job-embed.js',
        'js/service-app/multi-video-modal/job-modal.js',
        'js/service-app/multi-video-modal/job-content.js',
        'js/service-app/multi-video-modal/job-bitrate.js',
        'js/service-app/button/main.js'
      ]);

      // 設定初期化（旧 config.js をここに移行）
      this.initConfig(this.options);

      this.buttonService = new window.Services.button();
      await this.buttonService.boot();

      this.jobs = {
        embed: new window.Services.MultiVideoModal.JobEmbed(this),
        modal: new window.Services.MultiVideoModal.JobModal(this),
        content: new window.Services.MultiVideoModal.JobContent(this),
        bitrate: new window.Services.MultiVideoModal.JobBitrate(this, this.buttonService)
      };
      return this;
    }

    // 内部: リージョンを確保
    _ensureRegion()
    {
      if (this.region && document.contains(this.region)) return this.region;
      this.region = this.jobs.modal.ensureRegion(this.CSS, this.config.zIndex);
      return this.region;
    }

    // 内部: モーダルのマウント
    _mount(modalEl) {
      this._ensureRegion().appendChild(modalEl);
      this.stack.push({ node: modalEl });
      this.jobs.modal.lockBodyScroll(this.CSS, true);
    }

    // 内部: モーダルの取り外し
    _unmount(modalEl) {
      var idx = this.stack.findIndex(function (e) { return e.node === modalEl; });
      if (idx >= 0) this.stack.splice(idx, 1);
      this.jobs.modal.disposeModal(modalEl);
      if (modalEl && modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
      if (this.stack.length === 0) {
        this.jobs.modal.lockBodyScroll(this.CSS, false);
        this.jobs.modal.cleanupRegionIfEmpty(this.CSS);
      }
    }

    // 指定仕様に基づいて埋め込み要素を作成
    _createContentNode(spec, opts) {
      var provider = String(spec.provider || '').toLowerCase();
      if (provider === 'youtube') {
        var yid = this.jobs.embed.parseYouTubeId(spec.id || spec.url || '');
        if (!yid) throw new Error('multi-video-modal: invalid YouTube id/url');
        return this.jobs.embed.buildYouTubeIframe(yid, !!opts.autoplay, spec.title || 'YouTube', this.config.iframeAllow);
      }
      if (provider === 'vimeo') {
        var vid = this.jobs.embed.parseVimeoId(spec.id || spec.url || '');
        if (!vid) throw new Error('multi-video-modal: invalid Vimeo id/url');
        return this.jobs.embed.buildVimeoIframe(vid, !!opts.autoplay, spec.title || 'Vimeo', this.config.iframeAllow);
      }
      if (provider === 'html5') {
        var safe = this.jobs.embed.sanitizeUrl(spec.src || '', this.ALLOWED_IFRAME_HOSTS);
        if (!safe) throw new Error('multi-video-modal: src must be https or relative');
        return this.jobs.embed.buildHtml5Video(safe, !!opts.autoplay);
      }
      throw new Error('multi-video-modal: unsupported provider: ' + provider);
    }

    // ========== Public API ==========

    /**
     * Show a video modal.
     * spec: { provider: 'youtube'|'vimeo'|'html5', id|url|src, title? }
     * options: overrides default config fields
     * returns: modal DOM element
     */
    show(spec, options) {
      if (!spec) throw new Error('multi-video-modal: spec required');
      var opts = Object.assign({}, this.config, options || {});
      var contentNode = this._createContentNode(spec, opts);
      var modalEl = this.jobs.modal.createModal({
        CSS: this.CSS,
        title: (spec && spec.title) || '',
        contentNode: contentNode,
        closeOnBackdrop: !!opts.closeOnBackdrop,
        closeOnEsc: !!opts.closeOnEsc
      }, this._unmount.bind(this));
      this._mount(modalEl);
      return modalEl;
    }

    openYouTube(idOrUrl, options) {
      return this.show({ provider: 'youtube', id: idOrUrl, title: '' }, options);
    }

    openVimeo(idOrUrl, options) {
      return this.show({ provider: 'vimeo', id: idOrUrl, title: '' }, options);
    }

    openHtml5(src, options) {
      var title = (options && options.title) || '';
      return this.show({ provider: 'html5', src: src, title: title }, options);
    }

    getContentVideoUrl(spec)
    {
      if (!spec || !spec.contentCode)
      {
        return '';
      }
      return this.jobs.content.buildContentVideoUrl(this.config.api, spec);
    }

    async openContentVideo(spec, options)
    {
      var requestedSpec = Object.assign({}, spec || {});
      var baseSpec = Object.assign({}, requestedSpec);
      if (Object.prototype.hasOwnProperty.call(baseSpec, 'quality'))
      {
        delete baseSpec.quality;
      }
      var providedRecord = null;
      if (Object.prototype.hasOwnProperty.call(baseSpec, 'contentRecord'))
      {
        providedRecord = baseSpec.contentRecord;
        delete baseSpec.contentRecord;
      }
      if (Object.prototype.hasOwnProperty.call(baseSpec, 'proxyId'))
      {
        delete baseSpec.proxyId;
      }
      var baseSrc = this.getContentVideoUrl(baseSpec);
      var requestedSrc = this.getContentVideoUrl(requestedSpec);
      var fallbackSrc = requestedSrc || baseSrc;
      if (!fallbackSrc)
      {
        throw new Error('multi-video-modal: contentCode is required');
      }
      var title = (requestedSpec && requestedSpec.title) || '';
      var modalOptions = Object.assign({ autoplay: false }, options || {});
      var dataset = modalOptions.contentDataset || null;
      if (Object.prototype.hasOwnProperty.call(modalOptions, 'contentDataset'))
      {
        delete modalOptions.contentDataset;
      }
      var opts = Object.assign({}, this.config, modalOptions);

      var variants = [];
      try
      {
        variants = await this.jobs.bitrate.loadVariants(baseSpec, baseSrc, dataset, providedRecord);
      }
      catch (_err)
      {
        variants = [];
      }
      var requestedQuality = (requestedSpec && requestedSpec.quality) || (opts && opts.quality) || '';
      var requestedProxyId = (requestedSpec && requestedSpec.proxyId !== undefined && requestedSpec.proxyId !== null)
        ? String(requestedSpec.proxyId)
        : '';
      var initialVariant = this.jobs.bitrate.pickInitialVariant(variants, requestedQuality, requestedProxyId) || variants[0];
      if (!initialVariant || !initialVariant.src)
      {
        return this.openHtml5(fallbackSrc, Object.assign({}, opts, { title: title }));
      }

      var videoEl = this.jobs.embed.buildHtml5Video(initialVariant.src, !!opts.autoplay);
      var actionsNode = this.jobs.bitrate.createActions(variants, initialVariant.key);
      var disposeHandlers = [];
      if (actionsNode)
      {
        disposeHandlers.push(this.jobs.bitrate.bindActions(actionsNode, videoEl, variants, initialVariant.key, !!opts.autoplay));
      }

      var modalEl = this.jobs.modal.createModal({
        CSS: this.CSS,
        title: title,
        contentNode: videoEl,
        actionsNode: actionsNode,
        closeOnBackdrop: !!opts.closeOnBackdrop,
        closeOnEsc: !!opts.closeOnEsc,
        disposeHandlers: disposeHandlers
      }, this._unmount.bind(this));
      this._mount(modalEl);
      return modalEl;
    }

    hide(target) {
      if (!target) return this.dismissAll();
      this._unmount(target);
      return true;
    }

    dismissAll() {
      while (this.stack.length) {
        var e = this.stack.pop();
        this.jobs.modal.disposeModal(e.node);
        if (e.node && e.node.parentNode) e.node.parentNode.removeChild(e.node);
      }
      this.jobs.modal.lockBodyScroll(this.CSS, false);
      this.jobs.modal.cleanupRegionIfEmpty(this.CSS);
      return true;
    }
  }

  window.Services = window.Services || {};
  window.Services.MultiVideoModal = MultiVideoModalService;

})(window, document);
