(function () {

  'use strict';
  
  class AgonContents1
  {
    constructor(name)
    {
      this.name = name || 'agon-contents1';
    }

    // このページではSessionServiceでのログイン状態のチェックは不要         
    async boot()
    {
      await window.Utils.loadScriptsSync([{ src: '/js/service-app/header/main.js' } ,
                                                      { src: '/js/service-app/toast/main.js' },
                                                      { src: '/js/service-app/loading/main.js' },
                                          { src: '/js/page/agon-contents1/job-view.js' }]);

      this.initConfig();
      
      this.headerService = new window.Services.Header({display: {forceLoginButton: true, hideLoginButton: false, showUserInfoWhenLoggedin: false}});
                  this.toastService = new window.Services.Toast({ position: 'top-right', duration: 3000 });
      this.loadingService = new window.Services.Loading(document.querySelector('.login-card') || document.body);

      await Promise.all([
        this.headerService.boot('.site-header'),
        this.toastService.boot(),
        this.loadingService.boot()
      ]);

      new window.AgonContents1.JobView (this).loadPage();
    }

    updateEvent()
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
      var baseConfig = window.AgonContents1Config || {};

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
        eventFilter:     '#event-filter',
        trendChart:      '#trend-chart',
        trendLegend:     '#trend-legend',
        statusBars:      '#status-bars',
        eventDonut:      '#event-donut',
        eventLegend:     '#event-legend',
        heatmap:         '#heatmap',
        badgeShowcase:   '#badge-showcase',
        journey:         '#journey',
        dataTable:       '#data-table',
        apiGrid:         '#api-grid',
        roadmap:         '#roadmap',
        kpiGrid:         '#kpi-grid',
        contactForm:     '.contact-form'
      }, (baseConfig && baseConfig.SELECTOR) || {});

      window.AgonContents1Config = Object.assign({}, baseConfig, {
        TEXT: this.TEXT,
        SELECTOR: this.SELECTOR
      });
    }
  }
  window.AgonContents1 = window.AgonContents1 || AgonContents1;
})(window);
