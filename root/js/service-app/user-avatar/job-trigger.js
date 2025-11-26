
(function () {

  'use strict';

  var w = window;

  function contains(root, el)
  {
    if (!root || !el) return false;
    return root === el || root.contains(el);
  }

  class JobTrigger
  {
    constructor(service)
    {
      this.service = service;
    }

    bind(pop, anchor, cfg, onRequestClose, onReposition)
    {
      var self = this;

      var onDocMouseDown = function (ev) {
        if (!cfg.closeOnOutside) return;
        var t = ev.target;
        if (contains(pop, t) || contains(anchor, t)) return;
        onRequestClose && onRequestClose();
      };

      var onKeyDown = function (ev) {
        if (cfg.closeOnEsc && (ev.key === 'Escape' || ev.key === 'Esc' || ev.keyCode === 27)) {
          onRequestClose && onRequestClose();
          return;
        }
        if (cfg.trapFocus && (ev.key === 'Tab' || ev.keyCode === 9)) {
          // フォーカストラップ（単純な先頭/末尾循環）
          var focusables = self._focusables(pop);
          if (!focusables.length) return;
          var first = focusables[0];
          var last = focusables[focusables.length - 1];
          var active = document.activeElement;
          if (ev.shiftKey) {
            if (active === first || !contains(pop, active)) {
              try { last.focus(); } catch (e) {}
              ev.preventDefault();
            }
          } else {
            if (active === last || !contains(pop, active)) {
              try { first.focus(); } catch (e) {}
              ev.preventDefault();
            }
          }
        }
      };

      var onResize = function () { onReposition && onReposition(); };
      var onScroll = function () { onReposition && onReposition(); };

      // 登録（capture で早めに拾う）
      document.addEventListener('mousedown', onDocMouseDown, true);
      document.addEventListener('keydown', onKeyDown, true);
      w.addEventListener('resize', onResize, true);
      w.addEventListener('scroll', onScroll, true);

      pop.__upHandlers = { onDocMouseDown: onDocMouseDown, onKeyDown: onKeyDown, onResize: onResize, onScroll: onScroll };
    }

    unbind(pop) {
      if (!pop || !pop.__upHandlers) return;
      var h = pop.__upHandlers;
      document.removeEventListener('mousedown', h.onDocMouseDown, true);
      document.removeEventListener('keydown', h.onKeyDown, true);
      w.removeEventListener('resize', h.onResize, true);
      w.removeEventListener('scroll', h.onScroll, true);
      pop.__upHandlers = null;
    }

    _focusables(root) {
      if (!root) return [];
      var selectors = [
        'a[href]','area[href]','button:not([disabled])','input:not([disabled])',
        'select:not([disabled])','textarea:not([disabled])','iframe','[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]'
      ];
      var list = root.querySelectorAll(selectors.join(','));
      var out = [];
      for (var i=0;i<list.length;i++) {
        var el = list[i];
        if (el.offsetParent !== null || el === root) out.push(el);
      }
      return out;
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.UserAvatar || (Services.UserAvatar = {});
  NS.JobTrigger = NS.JobTrigger || JobTrigger;

})(window, document);
