(function ()
 {
   'use strict';

   class HeaderJobView
   {
     constructor(serviceInstance)
     {
       this.serviceInstance = serviceInstance;
     }

    async renderLoggedInHeader(profile)
    {
      const service = this.serviceInstance;
      if (!service) { return; }
      const $root = service._$root;
      if (!$root || $root.length === 0) { return; }
      this.applyMenuForProfile(profile);
      const selectors = service.SELECTORS;
      const fallbacks = service.FALLBACKS || {};
      service.jobUserArea.renderUserArea($root, selectors, profile, fallbacks.avatar, {
        loginLinkTemplate: service._loginLinkTemplateHtml,
        accountEditHref: service.config && service.config.accountEditHref,
        logout: service.config && service.config.logout
      });
    }

    renderLoggedOutHeader(profile)
    {
      const service = this.serviceInstance;
      if (!service) { return; }
      const $root = service._$root;
      if (!$root || $root.length === 0) { return; }
      const normalized = service.normalizeUserProfile(profile || null);
      this.applyMenuForProfile(normalized);
      const selectors = service.SELECTORS;
      const fallbacks = service.FALLBACKS || {};
      service.jobUserArea.renderUserArea($root, selectors, normalized, fallbacks.avatar, {
        loginLinkTemplate: service._loginLinkTemplateHtml,
        accountEditHref: service.config && service.config.accountEditHref,
        logout: service.config && service.config.logout
      });
    }

    removeLoginElements()
    {
      const service = this.serviceInstance;
      if (!service) { return; }
      const $root = service._$root;
      if (!$root || $root.length === 0) { return; }
      const $cta = $root.find(service.SELECTORS.loginLink);
      const $loginArea = $root.find('[data-login-area="1"]');
      if ($cta.length > 0) {
        $cta.remove();
      }
      if ($loginArea.length > 0) {
        $loginArea.remove();
      }
    }

     /**
      * ヘッダー用スタイルシートを単回注入する。
      * 副作用: DOM の <head> に <link> 要素を追加し、読み込み失敗時は候補を順番に試行する。
      *
      * @param {string} primaryHref 最優先で読み込むスタイルシートの URL。
      */
     ensureStylesheet(primaryHref)
     {
       // 既に注入済みならスキップ
       if (document.querySelector('link[data-header-style="1"]')) { return; }

       // 候補: 1) /js/service-app/header/main.css 2) /css/components/header.css
       var candidates = [
         String(primaryHref || '/css/service-header.css'),
       ];

       (function tryNext(i) {
         if (i >= candidates.length) { return; }
         var href = candidates[i];
         var link = document.createElement('link');
         link.rel = 'stylesheet';
         link.href = href;
         link.setAttribute('data-header-style', '1');
         link.onload = function () { /* OK */ };
         link.onerror = function () {
           // 失敗したら次候補へ
           link.remove();
           tryNext(i + 1);
         };
         document.head.appendChild(link);
       })(0);
     }

    applyMenuForProfile(profile)
    {
      const service = this.serviceInstance;
      if (!service) { return; }
      const menuJob = service.jobMenu;
      if (!menuJob) { return; }
      const $root = service._$root;
      const isSupervisor = service.isSupervisorRole(profile);
      this.toggleSupervisorLayout($root, isSupervisor);
      const allowContents = service._isContentsManagementEnabled(profile);
      const allowDashboard = service._isDashboardEnabled(profile);
      let menuItems = service.config && service.config.menu ? menuJob.cloneMenu(service.config.menu) : [];
      if (!service._hasCustomMenu) {
        menuItems = service.resolveMenuByRole(profile);
        service.config.menu = menuJob.cloneMenu(menuItems);
      } else {
        menuItems = service._filterContentsMenu(menuItems, allowContents, allowDashboard);
      }
      menuItems = service._filterContentsMenu(menuItems, allowContents, allowDashboard);
      menuJob.renderMenu(menuItems);
    }

    renderLoginHiddenState(profile) {
      const service = this.serviceInstance;
      if (!service) { return; }
      const $root = service._$root;
      if (!$root || $root.length === 0) { return; }
      const targetProfile = service.isLoggedInUser(profile)
            ? profile
            : service.normalizeUserProfile(null);
      this.applyMenuForProfile(targetProfile);
      service.jobUserArea.renderLoginArea($root, service.SELECTORS, service._loginLinkTemplateHtml);
    }

    toggleSupervisorLayout($root, isSupervisor)
    {
      if (!$root || $root.length === 0) { return; }
      if (isSupervisor) {
        $root.addClass('site-header--supervisor');
        return;
      }
      $root.removeClass('site-header--supervisor');
    }
    }
   
  // Services.header 名前空間の直下に公開（再定義ガード付き）
  var Services = window.Services = window.Services || {};
  var NS = Services.header || (Services.header = {});
  NS.JobView = NS.JobView || HeaderJobView;

})(window);
