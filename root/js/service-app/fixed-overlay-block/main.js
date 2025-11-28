(function () {
  'use strict';

  class FixedOverlayBlockService
  {
    constructor(options)
    {
      this.jobs = null;
      this.DEFAULTS = Object.freeze({
        headerHtml: '',
        titleHtml: '',
        footerHtml: '',
        outerLabelHtml: '',
        backgroundImage: '',
        imageOpacity: 0.85,
        imageSize: 'cover',
        width: 640,
        minHeight: 280,
        position: 'right',
        offsetBottom: 24,
        offsetLeft: 24,
        offsetRight: 24,
        borderWidth: 8,
        borderColor: '#c44732',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        zIndex: 9000,
        container: null,
        stylesheetHref: '/css/fixed-overlay-block.css'
      });
      this.config = Object.assign({}, this.DEFAULTS, options || {});
    }

    async boot(options)
    {
      if (options && typeof options === 'object') {
        this.config = Object.assign({}, this.config, options);
      }
      this.ensureStylesheet(this.config.stylesheetHref);
      await window.Utils.loadScriptsSync([
        '/js/service-app/fixed-overlay-block/job-view.js'
      ]);
      this.jobs = {
        view: new window.Services.FixedOverlayBlock.JobView(this)
      };
      return this;
    }

    render(options)
    {
      var cfg = this._mergeOptions(options);
      var container = this.jobs.view.resolveContainer(cfg.container);
      var block = this.jobs.view.createBlock(cfg);
      container.appendChild(block);
      return block;
    }

    update(target, updates)
    {
      if (!target) { return null; }
      var cfg = this._mergeOptions(updates);
      return this.jobs.view.updateBlock(target, cfg);
    }

    remove(target)
    {
      return this.jobs.view.removeBlock(target);
    }

    ensureStylesheet(source)
    {
      if (document.querySelector('link[data-fixed-overlay-block-style="1"]')) { return; }

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
      candidates.push('/css/fixed-overlay-block.css');

      var unique = [];
      for (var j = 0; j < candidates.length; j++) {
        if (unique.indexOf(candidates[j]) === -1) { unique.push(candidates[j]); }
      }

      (function tryNext(i) {
        if (i >= unique.length) { return; }
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = unique[i];
        link.setAttribute('data-fixed-overlay-block-style', '1');
        link.onerror = function () {
          link.remove();
          tryNext(i + 1);
        };
        document.head.appendChild(link);
      })(0);
    }

    _mergeOptions(options)
    {
      var cfg = Object.assign({}, this.DEFAULTS, this.config, options || {});
      cfg.position = cfg.position === 'left' ? 'left' : 'right';
      cfg.imageSize = typeof cfg.imageSize === 'string' && cfg.imageSize.trim().length > 0 ? cfg.imageSize.trim() : 'cover';
      cfg.imageOpacity = typeof cfg.imageOpacity === 'number' && isFinite(cfg.imageOpacity) ? cfg.imageOpacity : this.DEFAULTS.imageOpacity;
      return cfg;
    }
  }

  window.Services = window.Services || {};
  window.Services.FixedOverlayBlock = FixedOverlayBlockService;

})(window, document);
