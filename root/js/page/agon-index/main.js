(function () {

  'use strict';
  
  class AgonIndex
  {
    constructor(name)
    {
      this.name = name || 'agon-index';
    }

    // このページではSessionServiceでのログイン状態のチェックは不要         
    async boot()
    {
      await window.Utils.loadScriptsSync([{ src: '/js/service-app/toast/main.js' },
                                          { src: '/js/service-app/loading/main.js' },
                                          { src: '/js/service-app/button/main.js' },
                                          { src: '/js/service-app/video-modal/main.js' },
                                          { src: '/js/page/agon-index/job-view.js' },
                                          { src: '/js/page/agon-index/job-background.js' },
                                          { src: '/js/page/agon-index/job-ambient-symbols.js' },
                                          { src: '/js/page/agon-index/job-media-modal.js' },
                                          { src: '/js/page/agon-index/job-scroll-top.js' }]);

      this.initConfig();

      this.toastService = new window.Services.Toast({ position: 'top-right', duration: 3000 });
      this.loadingService = new window.Services.Loading(document.querySelector('.login-card') || document.body);
      this.buttonService = new window.Services.Button.ButtonService();

      await Promise.all([
        this.toastService.boot(),
        this.loadingService.boot(),
        this.buttonService.boot()
      ]);

      new window.AgonIndex.JobView (this).loadPage();
      new window.AgonIndex.JobBackground(this).setup();
      new window.AgonIndex.JobAmbientSymbols(this).setup();
      new window.AgonIndex.JobMediaModal(this).setup();
      new window.AgonIndex.JobScrollTop(this).setup();
    }

    updateAgonIndex()
    {
      document.addEventListener('click', function (ev) {
        var target = ev.target;
        var el = target && target.closest ? target.closest('[data-action]') : null;
        if (!el) {
          return;
        }

        var action = el.getAttribute('data-action');
        if (action === 'copy') {
          var text = el.getAttribute('data-text') || '';
          if (text) {
            try {
              navigator.clipboard.writeText(text).then(function () {
                if (ctx.page && ctx.page.showSuccess) {
                  ctx.page.showSuccess('コピーしました');
                }
              }).catch(function () {
                if (ctx.page && ctx.page.showError) {
                  ctx.page.showError('コピーに失敗しました');
                }
              });
            } catch (e) {
              if (ctx.page && ctx.page.showError) {
                ctx.page.showError('コピーに失敗しました');
              }
            }
          }
        }
      });    
    }
    
    initConfig()
    {
      var baseConfig = window.AgonIndexConfig || {};

      this.TEXT = Object.assign({
        featureInitError: '機能の初期化に失敗しました。',
        loading:          '読み込み中…',
        ready:            '準備完了',
        adUnavailable:    '広告コンテンツは現在利用できません。',
        inputLack:        '入力が不足しています。'
      }, (baseConfig && baseConfig.TEXT) || {});

      // セレクタの集中定義（HTML に未登場でも安全に無視される）
      this.SELECTOR = Object.assign({
        nav:             '.site-header',
        heroGlance:      '#hero-glance',
        backgroundPanels:'#background-panels',
        roleCards:       '#role-cards',
        screenGrid:      '#screen-grid',
        groupFilter:     '#group-filter',
        indexFilter:     '#agon-index-filter',
        trendChart:      '#trend-chart',
        trendLegend:     '#trend-legend',
        statusBars:      '#status-bars',
        indexDonut:      '#agon-index-donut',
        indexLegend:     '#agon-index-legend',
        heatmap:         '#heatmap',
        badgeShowcase:   '#badge-showcase',
        journey:         '#journey',
        dataTable:       '#data-table',
        apiGrid:         '#api-grid',
        roadmap:         '#roadmap',
        kpiGrid:         '#kpi-grid',
        contactForm:     '.contact-form'
      }, (baseConfig && baseConfig.SELECTOR) || {});

      window.AgonIndexConfig = Object.assign({}, baseConfig, {
        TEXT: this.TEXT,
        SELECTOR: this.SELECTOR
      });
    }
  }
  window.AgonIndex = window.AgonIndex || AgonIndex;
})(window);
