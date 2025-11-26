(function (window, document) {
  'use strict';

  class JobTabs
  {
    constructor(pageInstance)
    {
      this.pageInstance = pageInstance;
      this.root = pageInstance.root;
      this.config = pageInstance.config || {};
      this.selectorConfig = (this.config && this.config.selectors) || {};
    }

    run()
    {
      // Initialize tab triggers and panels, and set default active tab
      this.tabRoot = this._resolveTabRoot();
      if (!this.tabRoot) {
        return;
      }

      this.triggers = this._filterVisible(Array.prototype.slice.call(this.tabRoot.querySelectorAll(this.selectorConfig.tabTrigger)));
      this.panels = this._filterVisible(Array.prototype.slice.call(this.tabRoot.querySelectorAll(this.selectorConfig.tabPanel)));
      if (!this.triggers.length || !this.panels.length) {
        return;
      }

      this._bindTriggers();
      // Activate the initial tab (default to first tab if none active yet)
      var initialTab = this.pageInstance.state.activeTab || this._resolveDefaultTab();
      this._activateTab(initialTab);
    }

    _resolveTabRoot()
    {
      if (this.selectorConfig.tabRoot) {
        var node = this.root.querySelector(this.selectorConfig.tabRoot);
        if (node) {
          return node;
        }
      }
      return this.root;
    }

    _resolveDefaultTab()
    {
      var first = this.triggers[0];
      return first ? first.getAttribute('data-tab') : null;
    }

    _filterVisible(list)
    {
      if (!list || !list.length) {
        return [];
      }
      var visible = [];
      list.forEach(function (node) {
        if (node.hasAttribute('hidden')) {
          return;
        }
        visible.push(node);
      });
      return visible;
    }

    _bindTriggers()
    {
      var self = this;
      this.triggers.forEach(function (trigger) {
        trigger.addEventListener('click', function (event) {
          event.preventDefault();
          var next = trigger.getAttribute('data-tab');
          if (next) {
            self._activateTab(next);
          }
        });

        trigger.addEventListener('keydown', function (event) {
          var key = event.key || event.keyCode;
          if (key === 'ArrowLeft' || key === 'ArrowRight') {
            event.preventDefault();
            var direction = key === 'ArrowRight' ? 1 : -1;
            var adjacent = self._findAdjacentTrigger(trigger, direction);
            if (adjacent) {
              adjacent.focus();
              self._activateTab(adjacent.getAttribute('data-tab'));
            }
            return;
          }

          if (key === 'Tab' || key === 9) {
            if (String(trigger.getAttribute('aria-selected')) !== 'true') {
              return;
            }
            event.preventDefault();
            var shift = event.shiftKey ? -1 : 1;
            var tab = self._findAdjacentTrigger(trigger, shift);
            if (tab) {
              tab.focus();
              self._activateTab(tab.getAttribute('data-tab'));
            }
          }
        });
      });
    }

    _activateTab(tabId)
    {
      if (!tabId) {
        return;
      }
      var nextId = tabId;
      this.triggers.forEach(function (trigger) {
        var id = trigger.getAttribute('data-tab');
        var isActive = id === nextId;
        trigger.setAttribute('aria-selected', isActive ? 'true' : 'false');
        trigger.setAttribute('tabindex', isActive ? '0' : '-1');
        trigger.classList.toggle('is-active', isActive);
      });

      this.panels.forEach(function (panel) {
        var id = panel.getAttribute('data-tab-panel');
        var isActive = id === nextId;
        panel.classList.toggle('is-active', isActive);
        if (isActive) {
          panel.removeAttribute('hidden');
          panel.setAttribute('aria-hidden', 'false');
        }
        else {
          panel.setAttribute('hidden', 'hidden');
          panel.setAttribute('aria-hidden', 'true');
        }
      });

      this.pageInstance.state.activeTab = nextId;
    }

    _findAdjacentTrigger(current, direction)
    {
      if (!this.triggers || !this.triggers.length) {
        return null;
      }
      var list = this.triggers;
      var index = list.indexOf(current);
      if (index === -1) {
        index = 0;
      }
      var step = direction < 0 ? -1 : 1;
      var nextIndex = index + step;
      if (nextIndex < 0) {
        nextIndex = list.length - 1;
      }
      else if (nextIndex >= list.length) {
        nextIndex = 0;
      }
      return list[nextIndex];
    }
  }

  window.AccountSettings = window.AccountSettings || {};
  window.AccountSettings.JobTabs = JobTabs;
})(window, document);
