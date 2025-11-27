(function () {
  'use strict';

  class FixedOverlayVerticalBlockService
  {
    constructor(options)
    {
      this.jobs = null;
      this.DEFAULTS = Object.freeze({
        title: '',
        details: [],
        position: 'left',
        offsetTop: 24,
        offsetLeft: 24,
        offsetRight: 24,
        borderWidth: 2,
        borderColor: '#b98b24',
        backgroundColor: '#262626',
        backgroundOpacity: 0.8,
        titleFont: '',
        detailFont: '',
        zIndex: 9000,
        container: null,
        stylesheetHref: '/css/fixed-overlay-vertical-block.css'
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
        '/js/service-app/fixed-overlay-vertical-block/job-view.js'
      ]);
      this.jobs = {
        view: new window.Services.FixedOverlayVerticalBlock.JobView(this)
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
      if (document.querySelector('link[data-fixed-overlay-vertical-block-style="1"]')) { return; }

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
      candidates.push('/css/fixed-overlay-vertical-block.css');

      var unique = [];
      for (var j = 0; j < candidates.length; j++) {
        if (unique.indexOf(candidates[j]) === -1) { unique.push(candidates[j]); }
      }

      (function tryNext(i) {
        if (i >= unique.length) { return; }
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = unique[i];
        link.setAttribute('data-fixed-overlay-vertical-block-style', '1');
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
      cfg.position = cfg.position === 'right' ? 'right' : 'left';
      cfg.details = Array.isArray(cfg.details) ? cfg.details.slice() : [];
      return cfg;
    }
  }

  window.Services = window.Services || {};
  window.Services.FixedOverlayVerticalBlock = FixedOverlayVerticalBlockService;

})(window, document);
