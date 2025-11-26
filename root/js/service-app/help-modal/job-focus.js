(function () {
  'use strict';

  var FOCUSABLE = [
    'a[href]','area[href]','input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])','textarea:not([disabled])','button:not([disabled])',
    'iframe','audio[controls]','video[controls]','[tabindex]:not([tabindex="-1"])'
  ].join(',');

  class JobFocus
  {
    constructor(service)
    {
      this.service = service;
    }

    trap(dialog)
    {
      if (!dialog) return;
      var handler = function (e) {
        var ev = e || window.event;
        var key = ev.key || ev.keyCode;
        if (!(key === 'Tab' || key === 9)) return;
        var nodes = Array.prototype.slice.call(dialog.querySelectorAll(FOCUSABLE))
          .filter(function (el) {
            return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
          });
        if (nodes.length === 0) { ev.preventDefault(); return; }
        var first = nodes[0];
        var last  = nodes[nodes.length - 1];
        var active = document.activeElement;
        if (ev.shiftKey) {
          if (active === first || !dialog.contains(active)) {
            ev.preventDefault();
            last.focus();
          }
        } else {
          if (active === last) {
            ev.preventDefault();
            first.focus();
          }
        }
      };
      dialog.__helpFocusHandler = handler;
      dialog.addEventListener('keydown', handler, true);
    }

    release(dialog) {
      if (!dialog) return;
      var handler = dialog.__helpFocusHandler;
      if (handler) {
        dialog.removeEventListener('keydown', handler, true);
        delete dialog.__helpFocusHandler;
      }
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.HelpModal || (Services.HelpModal = {});
  NS.JobFocus = NS.JobFocus || JobFocus;  

})(window, document);
