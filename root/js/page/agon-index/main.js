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
      await window.Utils.loadScriptsSync([{ src: '/js/service-app/header/main.js' } ,
                                                      { src: '/js/service-app/toast/main.js' },
                                                      { src: '/js/service-app/loading/main.js' },
                                                      { src: '/js/service-app/button/main.js' },
                                          { src: '/js/page/agon-index/job-view.js' }]);

      this.initConfig();
      
      this.headerService = new window.Services.Header({display: {forceLoginButton: true, hideLoginButton: false, showUserInfoWhenLoggedin: false}});
                  this.toastService = new window.Services.Toast({ position: 'top-right', duration: 3000 });
      this.loadingService = new window.Services.Loading(document.querySelector('.login-card') || document.body);
      this.buttonService = new window.Services.Button.ButtonService();

      await Promise.all([
        this.headerService.boot('.site-header'),
        this.toastService.boot(),
        this.loadingService.boot(),
        this.buttonService.boot()
      ]);

      new window.AgonIndex.JobView (this).loadPage();
    }

    updateAgonIndex()
    {
      document.addAgonIndexListener('click', function (ev) {
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
        agon-indexFilter:     '#agon-index-filter',
        trendChart:      '#trend-chart',
        trendLegend:     '#trend-legend',
        statusBars:      '#status-bars',
        agon-indexDonut:      '#agon-index-donut',
        agon-indexLegend:     '#agon-index-legend',
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
