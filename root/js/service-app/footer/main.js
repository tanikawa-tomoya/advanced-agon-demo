(function () {

  'use strict';

  class FooterService
  {
    constructor(options)
    {
      const currentYear = new Date().getFullYear();
      this.DEFAULTS = {
        mountSelector: '.site-footer',
        ariaLabel: 'フッター',
        company: 'MEDIAPLUS',
        year: currentYear,
        legal: 'All rights reserved.',
        links: [],
        text: ''
      };
      this.config = this._mergeOptions(options);
      this.jobView = null;
      this._$root = null;
    }

    async boot(selector)
    {
      await window.Utils.loadScriptsSync([
        '/js/service-app/footer/job-view.js'
      ]);

      this.jobView = new window.Services.footer.JobView(this);

      if (selector) {
        this.config.mountSelector = selector;
      }

      this._$root = this.jobView.ensureRoot(this.config.mountSelector);
      if (this.config.ariaLabel && this._$root && this._$root.length > 0) {
        this._$root.attr('aria-label', this.config.ariaLabel);
      }

      this.render();
      return this;
    }

    restart(selector)
    {
      this._$root = null;
      return this.boot(selector || this.config.mountSelector);
    }

    render()
    {
      if (!this.jobView) { return this; }
      const $root = this._$root || this.jobView.ensureRoot(this.config.mountSelector);
      this._$root = $root;
      this.jobView.render($root, this.config);
      return this;
    }

    setText(text)
    {
      this.config.text = this._resolveText(text, this.config);
      return this.render();
    }

    setLinks(links)
    {
      this.config.links = this._normalizeLinks(links);
      return this.render();
    }

    _mergeOptions(options)
    {
      const opts = options && typeof options === 'object' ? options : {};
      const merged = Object.assign({}, this.DEFAULTS, opts);
      merged.year = this._resolveYear(opts.year, this.DEFAULTS.year);
      merged.links = this._normalizeLinks(opts.links || merged.links);
      merged.text = this._resolveText(opts.text || merged.text, merged);
      return merged;
    }

    _resolveYear(value, fallback)
    {
      if (value === null || value === undefined) { return fallback; }
      if (typeof value === 'number' && Number.isFinite(value)) { return Math.floor(value); }
      const parsed = parseInt(String(value), 10);
      if (!Number.isNaN(parsed)) { return parsed; }
      return fallback;
    }

    _resolveText(textOption, config)
    {
      const text = typeof textOption === 'string' ? textOption.trim() : '';
      if (text) { return text; }
      const parts = [];
      const year = config && config.year ? String(config.year).trim() : '';
      const company = config && config.company ? String(config.company).trim() : '';
      const legal = config && config.legal ? String(config.legal).trim() : '';
      if (year || company) {
        const prefix = year && company ? year + ' ' + company : (year || company);
        parts.push('© ' + prefix);
      }
      if (legal) {
        parts.push(legal);
      }
      return parts.join('. ').trim();
    }

    _normalizeLinks(list)
    {
      if (!Array.isArray(list)) { return []; }
      const normalized = [];
      for (let i = 0; i < list.length; i += 1) {
        const item = list[i];
        if (!item || typeof item !== 'object') { continue; }
        const href = typeof item.href === 'string' ? item.href.trim() : '';
        const label = typeof item.label === 'string' ? item.label.trim() : '';
        if (!href || !label) { continue; }
        const target = typeof item.target === 'string' ? item.target.trim() : '';
        const rel = typeof item.rel === 'string' ? item.rel.trim() : '';
        normalized.push({
          href,
          label,
          target,
          rel
        });
      }
      return normalized;
    }
  }

  window.Services = window.Services || {};
  window.Services.Footer = FooterService;

}());
