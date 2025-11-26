(function () {

  'use strict';

  function getFocusable(root)
  {
    var sel = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable]';
    var list = root.querySelectorAll(sel);
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (el.offsetWidth > 0 || el.offsetHeight > 0) out.push(el);
    }
    return out;
  }

  class JobFocus
  {
    constructor(service)
    {
      this.service = service;
      this._prevFocus = null;
      this._bound = null;
    }

    trap(root)
    {
      if (!root) return;
      this._prevFocus = document.activeElement;

      var focusables = getFocusable(root);
      if (focusables.length) {
        // 初期フォーカス
        (focusables[0] || root).focus();
      } else {
        root.setAttribute('tabindex', '-1');
        root.focus();
      }

      var self = this;
      var onKeydown = function (ev) {
        if (ev && ev.key === 'Tab') {
          var fs = getFocusable(root);
          if (!fs.length) {
            ev.preventDefault();
            return;
          }
          var first = fs[0], last = fs[fs.length - 1];
          if (ev.shiftKey) {
            if (document.activeElement === first || document.activeElement === root) {
              last.focus();
              ev.preventDefault();
            }
          } else {
            if (d.activeElement === last) {
              first.focus();
              ev.preventDefault();
            }
          }
        }
      };
      this._bound = onKeydown;
      document.addEventListener('keydown', onKeydown, true);
    }

    release(root) {
      if (this._bound) {
        document.removeEventListener('keydown', this._bound, true);
        this._bound = null;
      }
      if (this._prevFocus && this._prevFocus.focus) {
        try { this._prevFocus.focus(); } catch (e) {}
      }
      this._prevFocus = null;
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.PdfModal || (Services.PdfModal = {});
  NS.JobFocus = NS.JobFocus || JobFocus;  

})(window, document);
