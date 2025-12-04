(function (window, document) {
  'use strict';

  class AdminQueue
  {
    constructor(name)
    {
      this.name = name || 'admin-queue';
      this.config = {};
      this.state = {};  // can hold jobs, stats, etc.
      this.confirmDialogService = null;
      this.breadcrumbService = null;
      this.helpModalService = null;
      this.infoModalService = null;
    }

    async boot()
    {
      if (await window.Services.sessionInstance.getUser() == null) {
        window.location.href = "/login.html";
        return;
      }

      window.Utils.initScreenModalHistoryObserver().observe();

      const jsList = [
        { src: '/js/service-app/header/main.js' },
        { src: '/js/service-app/toast/main.js' },
        { src: '/js/service-app/loading/main.js' },
        { src: '/js/service-app/help-modal/main.js' },
        { src: '/js/service-app/info-modal/main.js' },
        { src: '/js/service-app/button/main.js' },
        { src: '/js/service-app/label/main.js' },    // for status labels
        { src: '/js/service-app/confirm-dialog/main.js' },
        { src: '/js/service-app/breadcrumb/main.js' }
      ];
      await window.Utils.loadScriptsSync(jsList);

      this.headerService = new window.Services.Header({display: { forceLoginButton: false, hideLoginButton: false, showUserInfoWhenLoggedin: true }});
      this.toastService = new window.Services.Toast({ position: 'top-right', duration: 3000 });
      this.loadingService = new window.Services.Loading({ container: document.body });
      this.helpModalService = new window.Services.HelpModal({ closeOnEsc: true, closeOnBackdrop: true });
      this.infoModalService = new window.Services.InfoModal({ closeOnEsc: true, closeOnBackdrop: true });
      this.buttonService = new window.Services.button();
      this.confirmDialogService = new window.Services.ConfirmDialog();
      const breadcrumbContainer = document.querySelector('.screen-page') || document.body;
      this.breadcrumbService = new window.Services.Breadcrumb({ container: breadcrumbContainer });

      await Promise.all([
        this.headerService.boot('.site-header'),
        this.toastService.boot(),
        this.loadingService.boot(),
        this.helpModalService.boot(),
        this.infoModalService.boot(),
        this.buttonService.boot(),
        this.confirmDialogService.boot(),
        this.breadcrumbService.boot(breadcrumbContainer)
      ]);

      this.initConfig();
      this._renderBreadcrumbs();
      this.updateEvent();
      this.init();
    }

    _renderBreadcrumbs()
    {
      if (!this.breadcrumbService)
      {
        return;
      }
      this.breadcrumbService.render([
        { label: 'ダッシュボード', href: 'dashboard.html' },
        { label: 'キュー管理' }
      ]);
    }

    initConfig()
    {
      // Define selectors and any constant text
      this.selectorConfig = {
        root: '#queue-root',
        table: '#queue-table',
        refreshBtn: '#queue-refresh',
        updated: '#queue-updated',
        feedback: '#queue-feedback',
        filter: '#queue-filter',
        helpButton: '#queue-help-button',
        helpModal: '#queue-help-modal',
        helpClose: '[data-modal-close], .c-help-modal__close'
      };
      this.textConfig = {
        loading: '読み込み中…',
        noJobs: '表示できるジョブがありません。'
      };
      // Merge into config for convenience
      this.config = {
        requestType: 'Queue',
        apiToken: (window.PageConfig && window.PageConfig['admin-queue'].DEFAULT_CONFIG.apiToken) || '',
        pageSize: (window.PageConfig && window.PageConfig['admin-queue'].DEFAULT_CONFIG.pageSize) || 200,
        filterAlias: (window.PageConfig && window.PageConfig['admin-queue'].DEFAULT_CONFIG.filterAlias) || {}
      };
      // Cache jQuery elements
      const sel = this.selectorConfig;
      this.$root = jQuery(sel.root);
      this.$table = jQuery(sel.table);
      this.$refreshBtn = jQuery(sel.refreshBtn);
      this.$updated = jQuery(sel.updated);
      this.$feedback = jQuery(sel.feedback);
      this.$filter = jQuery(sel.filter);
      this.$helpBtn = jQuery(sel.helpButton);
      this.$helpModal = jQuery(sel.helpModal);
    }

    updateEvent() {
      const sel = this.selectorConfig;

      // Refresh button click
      jQuery(document).off('click.queueRefresh').on('click.queueRefresh', sel.refreshBtn, async (ev) => {
        ev.preventDefault();
        await window.Utils.loadScriptsSync([{ src: '/js/page/admin-queue/job-view.js' }]);
        const ctor = window.AdminQueue && window.AdminQueue.JobView;
        new ctor(this).refresh({ resetPage: true });
      });

      // Filter change
      jQuery(document).off('change.queueFilter').on('change.queueFilter', sel.filter, async (ev) => {
        ev.preventDefault();
        await window.Utils.loadScriptsSync([{ src: '/js/page/admin-queue/job-view.js' }]);
        const ctor = window.AdminQueue && window.AdminQueue.JobView;
        new ctor(this).refresh({ resetPage: true });
      });

      // Run job button click
      jQuery(document).off('click.jobRun').on('click.jobRun', '.queue-table__action-button--manual-run', async (ev) => {
        ev.preventDefault();
        const $btn = jQuery(ev.currentTarget);
        const jobId = $btn.data('jobId') || $btn.attr('data-job-id');
        if (!jobId) { return; }
        const confirmed = await this.confirmDialogService.open('ジョブ #' + jobId + ' を手動実行しますか？', { type: 'warning' });
        if (!confirmed) { return; }
        await window.Utils.loadScriptsSync([{ src: '/js/page/admin-queue/job-run.js' }]);
        const ctor = window.AdminQueue && window.AdminQueue.JobRun;
        new ctor(this).run(jobId, $btn);
      });


      // Edit job button click
      jQuery(document).off('click.queueEdit').on('click.queueEdit', '.queue-table__action-button--edit', async (ev) => {
        ev.preventDefault();
        const $btn = jQuery(ev.currentTarget);
        const jobId = ($btn.data('jobId') || $btn.attr('data-job-id') || '').toString().trim();
        if (!jobId) { return; }
        await window.Utils.loadScriptsSync([{ src: '/js/page/admin-queue/job-edit.js' }]);
        const ctor = window.AdminQueue && window.AdminQueue.JobEdit;
        const jobs = (this.state && this.state.jobs) || [];
        const job = jobs.find(function (item)
        {
          return String(item.id).trim() === jobId;
        });
        if (!job)
        {
          this.toastService.error('対象のジョブが見つかりませんでした。最新の状態を取得してください。');
          return;
        }
        new ctor(this).open(job, $btn);
      });

      // Delete job button click
      jQuery(document).off('click.jobDelete').on('click.jobDelete', '.queue-table__action-button--delete', async (ev) => {
        ev.preventDefault();
        const $btn = jQuery(ev.currentTarget);
        const jobId = $btn.data('jobId') || $btn.attr('data-job-id');
        if (!jobId) { return; }
        const confirmed = await this.confirmDialogService.open('ジョブ #' + jobId + ' を削除しますか？', { type: 'warning' });
        if (!confirmed) { return; }
        await window.Utils.loadScriptsSync([{ src: '/js/page/admin-queue/job-delete.js' }]);
        const ctor = window.AdminQueue && window.AdminQueue.JobDelete;
        new ctor(this).delete(jobId, $btn);
      });

      // Help modal open
      jQuery(document).off('click.queueHelp').on('click.queueHelp', sel.helpButton, async (ev) => {
        ev.preventDefault();
        await window.Utils.loadScriptsSync([{ src: '/js/page/admin-queue/job-help.js' }]);
        const ctor = window.AdminQueue && window.AdminQueue.JobHelp;
        new ctor(this).open();
      });

      // Help modal close
      jQuery(document).off('click.queueHelpClose').on('click.queueHelpClose', sel.helpClose, async (ev) => {
        ev.preventDefault();
        await window.Utils.loadScriptsSync([{ src: '/js/page/admin-queue/job-help.js' }]);
        const ctor = window.AdminQueue && window.AdminQueue.JobHelp;
        new ctor(this).close();
      });

      // Error detail
      jQuery(document).off('click.queueErrorDetail').on('click.queueErrorDetail', '.queue-table__error-detail-button', async (ev) => {
        ev.preventDefault();
        const $btn = jQuery(ev.currentTarget);
        await window.Utils.loadScriptsSync([{ src: '/js/page/admin-queue/job-error-detail.js' }]);
        const ctor = window.AdminQueue && window.AdminQueue.JobErrorDetail;
        new ctor(this).open($btn);
      });
    }

    async init()
    {
      await window.Utils.loadScriptsSync([{ src: '/js/page/admin-queue/job-view.js' }]);
      const ctor = window.AdminQueue && window.AdminQueue.JobView;
      new ctor(this).refresh({ resetPage: true });
    }
  }

  // Export to global namespace
  window.AdminQueue = window.AdminQueue || AdminQueue;
})(window, document);
