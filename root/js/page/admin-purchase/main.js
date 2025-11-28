(function (window, document) {

  'use strict';

  class AdminPurchase
  {
    constructor(name)
    {
      this.name = name || 'admin-purchase';
      this.selectorConfig = {};
      this.apiConfig = {};
      this.state = { purchases: [], filtered: [] };
      this.headerService = null;
      this.toastService = null;
      this.loadingService = null;
      this.helpModalService = null;
      this.breadcrumbService = null;
      this.buttonService = null;
      this.confirmDialogService = null;
      this.productSelectModalService = null;
      this.userSelectModalService = null;
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
        root: '[data-admin-purchase-root]',
        helpButton: '#purchase-help-button',
        helpModal: '#purchase-help-modal',
        summaryText: '[data-admin-purchase-summary]',
        actions: '[data-admin-purchase-actions]',
        filterForm: '[data-admin-purchase-filter-form]',
        filterKeyword: '[data-admin-purchase-keyword]',
        filterPayment: '[data-admin-purchase-payment]',
        filterShipping: '[data-admin-purchase-shipping]',
        tableBody: '[data-admin-purchase-tbody]',
        feedback: '[data-admin-purchase-feedback]',
        empty: '[data-admin-purchase-empty]',
        formHost: '[data-admin-purchase-form-host]'
      };

      this.apiConfig = {
        endpoint: window.Utils.getApiEndpoint(),
        requestType: 'Purchase',
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
        { src: '/js/service-app/button/main.js' },
        { src: '/js/service-app/confirm-dialog/main.js' },
        { src: '/js/service-app/product-select-modal/main.js' },
        { src: '/js/service-app/user-select-modal/main.js' }
      ];

      await window.Utils.loadScriptsSync(scripts);

      this.headerService = new window.Services.Header({display: { forceLoginButton: false, hideLoginButton: false, showUserInfoWhenLoggedin: true }});
      this.toastService = new window.Services.Toast({ position: 'top-right', duration: 3000 });
      this.loadingService = new window.Services.Loading({ container: document.querySelector(this.selectorConfig.root) || document.body });
      this.helpModalService = new window.Services.HelpModal({ closeOnEsc: true, closeOnBackdrop: true });
      const breadcrumbContainer = document.querySelector('.screen-page') || document.body;
      this.breadcrumbService = new window.Services.Breadcrumb({ container: breadcrumbContainer });
      this.buttonService = new window.Services.button();
      this.confirmDialogService = new window.Services.ConfirmDialog();
      this.productSelectModalService = new window.Services.ProductSelectModal({ multiple: false, targetCode: 'target-001' });
      this.userSelectModalService = new window.Services.UserSelectModal({
        multiple: false,
        userListType: 'UserGetAll',
        resultLimit: 200,
        text: {
          modalTitle: 'ユーザーを選択',
          modalDescription: '全ユーザーを検索して選択します。',
          applyLabel: 'このユーザーを指定'
        }
      });

      await Promise.all([
        this.headerService.boot('.site-header'),
        this.toastService.boot(),
        this.loadingService.boot(),
        this.helpModalService.boot(),
        this.breadcrumbService.boot(breadcrumbContainer),
        this.buttonService.boot(),
        this.confirmDialogService.boot(),
        this.productSelectModalService.boot(),
        this.userSelectModalService.boot()
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
        { label: '購入管理' }
      ]);
    }

    async _runJobsSequentially()
    {
      const queue = [
        { src: '/js/page/admin-purchase/job-summary.js', exportName: 'JobSummary' },
        { src: '/js/page/admin-purchase/job-table.js', exportName: 'JobTable' },
        { src: '/js/page/admin-purchase/job-help.js', exportName: 'JobHelp' }
      ];

      for (let i = 0; i < queue.length; i += 1) {
        const meta = queue[i];
        await window.Utils.loadScriptsSync([{ src: meta.src }]);
        const namespace = window.AdminPurchase || {};
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
  }

  window.AdminPurchase = window.AdminPurchase || AdminPurchase;
  window.AdminPurchase = AdminPurchase;
})(window, document);
