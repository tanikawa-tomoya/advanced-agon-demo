(function () {

  'use strict';

  function removeClassesByPrefix(el, prefix)
  {
    var list = Array.prototype.slice.call(el.classList || []);
    for (var i = 0; i < list.length; i++) {
      if (list[i].indexOf(prefix) === 0) el.classList.remove(list[i]);
    }
  }

  class JobView
  {
    constructor(service)
    {
      this.service = service;
    }

    createLayout(opts, handlers)
    {
      var id = (opts && opts.id) ? String(opts.id) : ('printlayout-' + Date.now());
      var showToolbar = !!(opts && opts.showToolbar);

      var root = document.createElement('div');
      root.className = 'c-print-layout';
      root.id = id;
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('tabindex', '-1');

      var toolbar = document.createElement('div');
      toolbar.className = 'c-print-layout__toolbar';
      if (!showToolbar) toolbar.style.display = 'none';

      var btnPrint = document.createElement('button');
      btnPrint.className = 'c-print-layout__btn c-print-layout__btn--print';
      btnPrint.setAttribute('type', 'button');
      btnPrint.textContent = 'Print';

      var btnClose = document.createElement('button');
      btnClose.className = 'c-print-layout__btn c-print-layout__btn--close';
      btnClose.setAttribute('type', 'button');
      btnClose.textContent = 'Close';

      toolbar.appendChild(btnPrint);
      toolbar.appendChild(btnClose);

      var page = document.createElement('div');
      page.className = 'c-print-layout__page';

      root.appendChild(toolbar);
      root.appendChild(page);

      var onPrint = function (ev) {
        ev && ev.preventDefault && ev.preventDefault();
        if (handlers && typeof handlers.onPrint === 'function') handlers.onPrint();
      };
      var onClose = function (ev) {
        ev && ev.preventDefault && ev.preventDefault();
        if (handlers && typeof handlers.onClose === 'function') handlers.onClose();
      };

      btnPrint.addEventListener('click', onPrint, true);
      btnClose.addEventListener('click', onClose, true);

      root.__pl = {
        toolbar: toolbar,
        page: page,
        btnPrint: btnPrint,
        btnClose: btnClose,
        handlers: { onPrint: onPrint, onClose: onClose }
      };

      return root;
    }

    applyVariantClasses(root, variants, CLASSMAP)
    {
      if (!root) return;
      // 既存の variant クラスを一旦除去してから付与
      removeClassesByPrefix(root, 'c-print-layout--');
      var orient = variants && variants.orientation || 'portrait';
      var size = variants && variants.pageSize || 'A4';
      var margin = variants && variants.margin || 'normal';

      var oc = CLASSMAP && CLASSMAP.ORIENT_TO_CLASS && CLASSMAP.ORIENT_TO_CLASS[orient];
      var sc = CLASSMAP && CLASSMAP.SIZE_TO_CLASS && CLASSMAP.SIZE_TO_CLASS[size];
      var mc = CLASSMAP && CLASSMAP.MARGIN_TO_CLASS && CLASSMAP.MARGIN_TO_CLASS[margin];

      if (oc) root.classList.add(oc);
      if (sc) root.classList.add(sc);
      if (mc) root.classList.add(mc);
    }

    toggleToolbar(root, show)
    {
      if (!root || !root.__pl || !root.__pl.toolbar) return;
      root.__pl.toolbar.style.display = show ? '' : 'none';
    }

    setContent(root, content)
    {
      if (!root || !root.__pl || !root.__pl.page) return;
      var page = root.__pl.page;
      // 既存をクリア
      while (page.firstChild) page.removeChild(page.firstChild);
      if (content == null) return;
      if (typeof content === 'string') {
        page.innerHTML = content;
      } else if (content && content.nodeType === 1) {
        page.appendChild(content);
      } else if (Array.isArray(content)) {
        for (var i = 0; i < content.length; i++) {
          var el = content[i];
          if (typeof el === 'string') {
            var div = document.createElement('div');
            div.innerHTML = el;
            while (div.firstChild) page.appendChild(div.firstChild);
          } else if (el && el.nodeType === 1) {
            page.appendChild(el);
          }
        }
      }
    }

    destroy(root)
    {
      if (!root) return;
      var pl = root.__pl || {};
      if (pl.btnPrint && pl.handlers && pl.handlers.onPrint) {
        pl.btnPrint.removeEventListener('click', pl.handlers.onPrint, true);
      }
      if (pl.btnClose && pl.handlers && pl.handlers.onClose) {
        pl.btnClose.removeEventListener('click', pl.handlers.onClose, true);
      }
      if (root.parentNode) root.parentNode.removeChild(root);
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.PrintLayout || (Services.PrintLayout = {});
  NS.JobView = NS.JobView || JobView;      

})(window, document);
