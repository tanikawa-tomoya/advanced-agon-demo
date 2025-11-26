(function () {

  'use strict';

  class BreadcrumbService
  {
    constructor(options)
    {
      this.DEFAULTS = {
        container: '.screen-page',
        ariaLabel: 'パンくずリスト',
        maxLabelLength: 28
      };
      this.config = Object.assign({}, this.DEFAULTS, options || {});
      this.jobs = { region: null, view: null };
      this.elements = { wrapper: null, list: null };
      this.items = [];
    }

    async boot(target)
    {
      if (target)
      {
        this.config.container = target;
      }
      await window.Utils.loadScriptsSync([
        '/js/service-app/breadcrumb/job-region.js',
        '/js/service-app/breadcrumb/job-view.js'
      ]);
      this.jobs.region = new window.Services.Breadcrumb.JobRegion(this);
      this.jobs.view = new window.Services.Breadcrumb.JobView(this);
      this.mount(this.config.container);
      return this;
    }

    mount(target)
    {
      if (!this.jobs.region)
      {
        return null;
      }
      const region = this.jobs.region.ensureWrapper(target || this.config.container, this.config.ariaLabel);
      this.elements = region;
      return region;
    }

    render(items, options)
    {
      if (options && Object.prototype.hasOwnProperty.call(options, 'maxLabelLength'))
      {
        this.config.maxLabelLength = options.maxLabelLength;
      }
      if (options && Object.prototype.hasOwnProperty.call(options, 'ariaLabel'))
      {
        this.config.ariaLabel = options.ariaLabel;
        if (this.elements && this.elements.wrapper)
        {
          this.elements.wrapper.setAttribute('aria-label', this.config.ariaLabel);
        }
      }
      if (options && Object.prototype.hasOwnProperty.call(options, 'container'))
      {
        this.mount(options.container);
      }
      if (!this.elements || !this.elements.list)
      {
        this.mount(this.config.container);
      }
      this.items = this.jobs.view.normalizeItems(items || []);
      this.jobs.view.renderList(this.elements.list, this.items, this.config);
      return this.items;
    }

    updateItem(index, overrides)
    {
      if (!Array.isArray(this.items) || index < 0 || index >= this.items.length)
      {
        return null;
      }
      const next = Object.assign({}, this.items[index], overrides || {});
      this.items.splice(index, 1, next);
      if (this.elements && this.elements.list)
      {
        this.jobs.view.renderList(this.elements.list, this.items, this.config);
      }
      return next;
    }

    updateCurrent(overrides)
    {
      if (!Array.isArray(this.items) || this.items.length === 0)
      {
        return null;
      }
      return this.updateItem(this.items.length - 1, overrides);
    }
  }

  window.Services = window.Services || {};
  window.Services.Breadcrumb = BreadcrumbService;

}());
