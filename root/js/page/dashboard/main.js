(function () {
  'use strict';
  
  class Dashboard
  {
    constructor(name)
    {
      this.name = name || 'dashboard';
    }

    async boot()
    {
      if (await window.Services.sessionInstance.getUser() == null) {
        window.location.href = "/login.html";
        return;
      }
      
      const jsList = [      
        '/js/service-app/header/main.js',
        '/js/service-app/toast/main.js',
        '/js/service-app/loading/main.js',
        '/js/service-app/help-modal/main.js',
      ];
      await window.Utils.loadScriptsSync(jsList);

      this.initConfig();      
      
      this.headerService = new window.Services.Header({display: {forceLoginButton: false, hideLoginButton: false, showUserInfoWhenLoggedin: true }});
      this.toastService = new window.Services.Toast({ position: 'top-right', duration: 3000 });
      this.loadingService =  new window.Services.Loading(document.querySelector('#dashboard-root') || document.querySelector('#dashboard') || document.body);
      this.helpModalService = new window.Services.HelpModal({});

      await Promise.all([            
        this.headerService.boot('.site-header'),
        this.toastService.boot(),
        this.loadingService.boot(),
        this.helpModalService.boot(),
      ]);
      
      this.updateEvent();      
    }

    updateEvent()
    {
      $(document).off('click.help')
        .on('click.help', '#dashboard-help-button', async (ev) => {
          ev.preventDefault();
          await window.Utils.loadScriptsSync(["/js/page/dashboard/job-help.js"]);
           const constructor = (window.Login && window.Login.JobHelp);
           new constructor(this).open();
        });

      $(document).off('click.helpClose')
        .on('click.helpClose', '#dashboard-help-modal [data-modal-close]', async (ev) => {
          ev.preventDefault();
          await window.Utils.loadScriptsSync(["/js/page/dashboard/job-help.js"]);
          const constructor = (window.Login && window.Login.JobHelp);
          new constructor(this).close();
        });
      
      $(document).off('click')
        .on('click', this.selectorConfig.refreshBtn, async (ev) => {
          ev.preventDefault();
          await window.Utils.loadScriptsSync(["/js/page/dashboard/job-refresh.js"]);
          const constructor = (window.Login && window.Login.JobView);
          new constructor(this).refresh({ resetPage: true, debounce: 300 });
        });

      $(document).off('change')
        .on('change', [
          this.selectorConfig.filterForm + ' ' + this.selectorConfig.dateFrom,
          this.selectorConfig.filterForm + ' ' + this.selectorConfig.dateTo,
          this.selectorConfig.filterForm + ' ' + this.selectorConfig.keyword
        ].join(', '), async (ev) => {
          if (window.DashboardGeneral && typeof window.DashboardGeneral.refresh === 'function') {
            window.DashboardGeneral.refresh({ resetPage: true, debounce: 300 });
            await window.Utils.loadScriptsSync(["/js/page/dashboard/job-refresh.js"]);
            const constructor = (window.Login && window.Login.JobView);
            new constructor(this).refresh({ resetPage: true, debounce: 300 });
          }
        });

      $(document).off('submit')
        .on('submit', this.selectorConfig.filterForm, async (ev) => {
          ev.preventDefault();
          await window.Utils.loadScriptsSync(["/js/page/dashboard/job-refresh.js"]);
          const constructor = (window.Login && window.Login.JobView);
          new constructor(this).refresh({ resetPage: true, debounce: 300 });          
        });

      $(document).off('click.pager')
        .on('click.pager', this.selectorConfig.pagination + ' [data-page]', async (ev) => {
          ev.preventDefault();
          await window.Utils.loadScriptsSync(["/js/page/dashboard/job-refresh.js"]);
          var page = parseInt(this.getAttribute('data-page'), 10);          
          const constructor = (window.Login && window.Login.JobView);
          new constructor(this).refresh({ page: page, debounce: 300 });
        });
      
    }

    initConfig()
    {
      this.textConfig = Object.freeze({
        // TODO
       });

      this.selectorConfig = Object.freeze({
        refreshBtn:    '#dashboard-refresh, [data-action="refresh"], .js-refresh',
        filterForm:    '#dashboard-filter, .js-dashboard-filter',
        dateFrom:      'input[name="from"],  [data-field="from"]',
        dateTo:        'input[name="to"],    [data-field="to"]',
        keyword:       'input[name="q"],     [data-field="q"]',
        summaryCards:  '#metric-cards, [data-block="summary"], .js-summary-cards',
        table:         '#table-latest, [data-block="table"],   .js-table',
        tableBody:     '#table-latest tbody, [data-block="table"] tbody, .js-table tbody',
        emptyState:    '[data-block="empty"], .js-empty',
        errorBox:      '#dashboard-feedback, [data-block="error"], .js-error',
        pagination:    '#pager, [data-block="pager"], .js-pager'
       });      
    }    
  }

  window.Dashboard = window.Dashboard || Dashboard;
})(window, document);
