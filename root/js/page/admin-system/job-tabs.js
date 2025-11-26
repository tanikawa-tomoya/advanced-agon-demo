(function (window, document) {
  'use strict';

  class JobTabs
  {
    constructor(pageInstance)
    {
      this.pageInstance = pageInstance;
    }

    run()
    {
      var root = document.querySelector(this.pageInstance.selectorConfig.tabRoot);
      if (!root) {
        return;
      }
      var triggerSelector = this.pageInstance.selectorConfig.tabTriggers;
      var panelSelector = this.pageInstance.selectorConfig.tabPanels;
      var triggers = Array.prototype.slice.call(root.querySelectorAll(triggerSelector));
      var panels = Array.prototype.slice.call(root.querySelectorAll(panelSelector));
      if (!triggers.length || !panels.length) {
        return;
      }

      function activateTab(tabId) {
        var nextId = tabId;
        triggers.forEach(function (trigger) {
          var id = trigger.getAttribute('data-tab');
          var isActive = id === nextId;
          trigger.setAttribute('aria-selected', isActive ? 'true' : 'false');
          trigger.setAttribute('tabindex', isActive ? '0' : '-1');
          trigger.classList.toggle('is-active', isActive);
        });
        panels.forEach(function (panel) {
          var id = panel.getAttribute('data-tab-panel');
          var isActive = id === nextId;
          panel.classList.toggle('is-active', isActive);
          if (isActive) {
            panel.removeAttribute('hidden');
            panel.setAttribute('aria-hidden', 'false');
          } else {
            panel.setAttribute('hidden', 'hidden');
            panel.setAttribute('aria-hidden', 'true');
          }
        });
      }

      triggers.forEach(function (trigger) {
        trigger.addEventListener('click', function (event) {
          event.preventDefault();
          activateTab(trigger.getAttribute('data-tab'));
        });

        trigger.addEventListener('keydown', function (event) {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
            return;
          }
          event.preventDefault();
          var currentIndex = triggers.indexOf(trigger);
          var direction = event.key === 'ArrowRight' ? 1 : -1;
          var nextIndex = (currentIndex + direction + triggers.length) % triggers.length;
          var nextTrigger = triggers[nextIndex];
          nextTrigger.focus();
          activateTab(nextTrigger.getAttribute('data-tab'));
        });
      });

      var current = triggers.find(function (trigger) {
        return trigger.getAttribute('aria-selected') === 'true';
      });
      var target = current ? current.getAttribute('data-tab') : triggers[0].getAttribute('data-tab');
      activateTab(target);
    }
  }

  window.AdminSystem = window.AdminSystem || {};
  window.AdminSystem.JobTabs = JobTabs;
})(window, document);
