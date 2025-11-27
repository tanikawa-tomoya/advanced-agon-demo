(function (window, document) {

  'use strict';

  class AdminContentsAccess
  {
    constructor(name)
    {
      this.name = name || 'admin-contents-access';
      this.selectorConfig = {};
      this.apiConfig = {};
      this.headerService = null;
      this.toastService = null;
      this.loadingService = null;
      this.helpModalService = null;
      this.breadcrumbService = null;
      this.buttonService = null;
    }

    async boot()
    {
      if (await window.Services.sessionInstance.getUser() == null) {
        window.location.href = "/login.html";
        return;
      }

      this.initConfig();
      await this._loadCoreServices();
      this._renderBreadcrumbs();
      await this._runJobsSequentially();
    }

    initConfig()
    {
      this.selectorConfig = {
        root: '[data-contents-access-root]',
        host: '[data-contents-access-host]',
        helpButton: '#contents-access-help-button',
        helpModal: '#contents-access-help-modal',
        actions: '[data-contents-access-actions]',
        summary: '[data-contents-access-summary]',
        filterForm: '[data-contents-access-filter-form]',
        keyword: '[data-contents-access-keyword]',
        state: '[data-contents-access-state]',
        tableBody: '[data-contents-access-tbody]',
        feedback: '[data-contents-access-feedback]',
        formHost: '[data-contents-access-form-host]'
      };

      this.apiConfig = {
        endpoint: window.Utils.getApiEndpoint(),
        requestType: 'ContentAccess',
        timeout: 20000
      };
    }

    async _loadCoreServices()
    {
      const scripts = [
        { src: '/js/service-app/header/main.js' },
        { src: '/js/service-app/toast/main.js' },
        { src: '/js/service-app/loading/main.js' },
        { src: '/js/service-app/help-modal/main.js' },
        { src: '/js/service-app/breadcrumb/main.js' },
        { src: '/js/service-app/button/main.js' }
      ];

      await window.Utils.loadScriptsSync(scripts);

      this.headerService = new window.Services.Header({ display: { forceLoginButton: false, hideLoginButton: false, showUserInfoWhenLoggedin: true } });
      this.toastService = new window.Services.Toast({ position: 'top-right', duration: 3000 });
      const host = document.querySelector(this.selectorConfig.host) || document.body;
      this.loadingService = new window.Services.Loading(host);
      this.helpModalService = new window.Services.HelpModal({ closeOnEsc: true, closeOnBackdrop: true });
      const breadcrumbContainer = document.querySelector('.screen-page') || document.body;
      this.breadcrumbService = new window.Services.Breadcrumb({ container: breadcrumbContainer });
      this.buttonService = new window.Services.button();

      await Promise.all([
        this.headerService.boot('.site-header'),
        this.toastService.boot(),
        this.loadingService.boot(),
        this.helpModalService.boot(),
        this.breadcrumbService.boot(breadcrumbContainer),
        this.buttonService.boot()
      ]);
    }

    _renderBreadcrumbs()
    {
      if (!this.breadcrumbService)
      {
        return;
      }
      this.breadcrumbService.render([
        { label: 'ダッシュボード', href: 'dashboard.html' },
        { label: 'コンテンツアクセス管理' }
      ]);
    }

    async _runJobsSequentially()
    {
      const queue = [
        { src: '/js/page/admin-contents-access/job-form.js', exportName: 'JobForm' },
        { src: '/js/page/admin-contents-access/job-rules.js', exportName: 'JobRules' },
        { src: '/js/page/admin-contents-access/job-help.js', exportName: 'JobHelp' }
      ];

      for (let i = 0; i < queue.length; i += 1) {
        const meta = queue[i];
        await window.Utils.loadScriptsSync([{ src: meta.src }]);
        const namespace = window.AdminContentsAccess || {};
        const ctor = namespace[meta.exportName];
        if (typeof ctor !== 'function') {
          continue;
        }
        const instance = new ctor(this);
        if (instance && typeof instance.run === 'function') {
          await instance.run();
        }
      }
    }

    callApi(type, payload, options)
    {
      const requestApi = window.Utils && window.Utils.requestApi;
      const data = payload || {};
      const ajaxOptions = options || {};
      if (typeof requestApi === 'function') {
        return Promise.resolve(
          requestApi(this.apiConfig.requestType, type, data, Object.assign({
            url: this.apiConfig.endpoint,
            dataType: 'json',
            timeout: this.apiConfig.timeout
          }, ajaxOptions))
        );
      }

      const $ = window.jQuery || window.$;
      if ($ && typeof $.ajax === 'function') {
        const fd = new FormData();
        fd.append('requestType', this.apiConfig.requestType);
        fd.append('type', type);
        Object.keys(data).forEach(function (key) {
          const value = data[key];
          if (value === undefined || value === null) { return; }
          fd.append(key, value);
        });
        return Promise.resolve($.ajax({
          url: this.apiConfig.endpoint,
          method: 'POST',
          data: fd,
          processData: false,
          contentType: false,
          dataType: 'json',
          timeout: this.apiConfig.timeout
        }));
      }

      return Promise.reject(new Error('API client is not available'));
    }

    showToast(message, type)
    {
      if (this.toastService && typeof this.toastService.show === 'function') {
        try { this.toastService.show(message, { type: type || 'info' }); return; } catch (err) { /* ignore */ }
      }
      const method = type === 'error' ? 'error' : 'log';
      console[method](message);
    }

    showLoading(message)
    {
      if (this.loadingService && typeof this.loadingService.show === 'function') {
        try { this.loadingService.show(message || '読み込み中…'); } catch (err) { /* ignore */ }
      }
    }

    hideLoading()
    {
      if (this.loadingService && typeof this.loadingService.hide === 'function') {
        try { this.loadingService.hide(); } catch (err) { /* ignore */ }
      }
    }

    decorateActionButton(placeholder, options)
    {
      if (!placeholder)
      {
        return null;
      }
      const opts = options || {};
      const buttonType = opts.buttonType || 'expandable-icon-button/check';
      const label = opts.label || placeholder.getAttribute('data-label') || placeholder.textContent || '保存';
      const ariaLabel = opts.ariaLabel || placeholder.getAttribute('aria-label') || label;
      const title = opts.title || placeholder.getAttribute('title') || label;
      const attributes = Object.assign({}, opts.attributes || {});
      const dataset = Object.assign({}, opts.dataset || {});
      if (placeholder.id && !attributes.id) {
        attributes.id = placeholder.id;
      }
      const placeholderDataset = placeholder.dataset || {};
      Object.keys(placeholderDataset).forEach(function (key) {
        if (key === 'buttonType') { return; }
        if (dataset[key] === undefined) { dataset[key] = placeholderDataset[key]; }
      });

      if (opts.hoverLabel === undefined) {
        opts.hoverLabel = label;
      }
      if (opts.baseClass === undefined) {
        opts.baseClass = 'btn';
      }
      let button = null;
      if (this.buttonService && typeof this.buttonService.createActionButton === 'function') {
        button = this.buttonService.createActionButton(buttonType, {
          label: label,
          ariaLabel: ariaLabel,
          hoverLabel: opts.hoverLabel,
          baseClass: opts.baseClass,
          attributes: attributes,
          dataset: dataset
        });
      }
      if (!button) {
        if (!placeholder.classList.contains('btn')) {
          placeholder.classList.add('btn', 'btn--ghost');
        }
        placeholder.textContent = label;
        if (ariaLabel && !placeholder.getAttribute('aria-label')) {
          placeholder.setAttribute('aria-label', ariaLabel);
        }
        if (title && !placeholder.getAttribute('title')) {
          placeholder.setAttribute('title', title);
        }
        return placeholder;
      }
      if (placeholder.parentNode) {
        placeholder.parentNode.replaceChild(button, placeholder);
      }
      if (ariaLabel) {
        button.setAttribute('aria-label', ariaLabel);
      }
      if (title) {
        button.setAttribute('title', title);
      }
      return button;
    }
  }

  window.AdminContentsAccess = window.AdminContentsAccess || AdminContentsAccess;
  window.AdminContentsAccess = AdminContentsAccess;
})(window, document);
