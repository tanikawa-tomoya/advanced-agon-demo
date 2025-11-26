(function (w) {

  'use strict';
  
  class JobTab
  {
    constructor(pageInstance)
    {
      this.pageInstance = pageInstance;
    }

    async run(params)
    {
      var targetTab = params && params.tab;
      if (!targetTab) return;
      var selectors = (this.pageInstance && this.pageInstance.selectorConfig) || {};
      var root = document.querySelector(selectors.tabsRoot || '[data-cp-tabs]');
      if (!root) return;
      var buttons = root.querySelectorAll(selectors.tabButton || '[data-cp-tab]');
      var panels = root.querySelectorAll(selectors.tabPanel || '[data-cp-panel]');

      for (var i = 0; i < buttons.length; i++) {
        var btn = buttons[i];
        var tabName = btn.getAttribute('data-cp-tab');
        var isActive = tabName === targetTab;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        if (isActive) {
          btn.removeAttribute('tabindex');
        } else {
          btn.setAttribute('tabindex', '-1');
        }
      }

      for (var j = 0; j < panels.length; j++) {
        var panel = panels[j];
        var panelName = panel.getAttribute('data-cp-panel');
        var panelActive = panelName === targetTab;
        panel.classList.toggle('is-active', panelActive);
        if (panelActive) {
          panel.removeAttribute('hidden');
        } else {
          panel.setAttribute('hidden', 'hidden');
        }
      }
    }
  }
  
  window.Contents = window.Contents || {};
  window.Contents.JobTab = JobTab;    

})(window, document);
