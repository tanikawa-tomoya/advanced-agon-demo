(function () {

  'use strict';

  function isElement(x)
  {
    return x && x.nodeType === 1;
  }

  class JobPopover
  {
    constructor(service)
    {
      this.service = service;
    }

    _buildFromItems(ul, items, onClose)
    {
      for (var i = 0; i < items.length; i++) {
        var it = items[i] || {};
        var li = document.createElement('li');
        li.className = 'c-user-popover__item';

        var node;
        if (it.href) {
          node = document.createElement('a');
          node.setAttribute('href', String(it.href));
        } else {
          node = document.createElement('button');
          node.setAttribute('type', 'button');
        }
        node.className = 'c-user-popover__link';
        node.textContent = String(it.label || '');
        if (it.target) node.setAttribute('target', String(it.target));
        if (it.rel) node.setAttribute('rel', String(it.rel));

        // クリックハンドラ
        if (typeof it.onClick === 'function') {
          node.__up_onClick = function (fn) {
            return function (ev) {
              try { fn(ev); } finally { if (onClose) onClose(); }
            };
          }(it.onClick);
          node.addEventListener('click', node.__up_onClick, true);
        }

        li.appendChild(node);
        ul.appendChild(li);
      }
    }

    createPopover(opts)
    {
      var id = (opts && opts.id) ? String(opts.id) : ('userpopover-' + Date.now());
      var role = (opts && opts.role) || 'menu';
      var ariaLabel = (opts && opts.ariaLabel) || 'User menu';
      var content = opts && opts.content;
      var trapFocus = !!(opts && opts.trapFocus);

      var wrap = document.createElement('div');
      wrap.className = 'c-user-popover';
      wrap.id = id;
      wrap.setAttribute('role', role);
      wrap.setAttribute('aria-label', ariaLabel);
      wrap.setAttribute('tabindex', '-1'); // フォーカス可能（トラップ時の退避にも使用）

      var inner = document.createElement('div');
      inner.className = 'c-user-popover__content';

      // content: array(items) / string(html or text) / Element
      if (Array.isArray(content)) {
        var ul = document.createElement('ul');
        ul.className = 'c-user-popover__list';
        this._buildFromItems(ul, content, (opts && opts.onClose) || null); // onClose は main 側の外部でハンドル
        inner.appendChild(ul);
      } else if (typeof content === 'string') {
        // HTMLとして挿入（信頼できる内容前提）
        inner.innerHTML = content;
      } else if (isElement(content)) {
        inner.appendChild(content);
      } else {
        // 空のプレースホルダ
        inner.appendChild(document.createTextNode(''));
      }

      wrap.appendChild(inner);

      wrap.__up = {
        trapFocus: trapFocus,
        onClose: (opts && opts.onClose) || null
      };

      return wrap;
    }

    updatePopover(pop, updates)
    {
      if (!pop || !updates) return;
      var inner = pop.querySelector('.c-user-popover__content');
      if (Object.prototype.hasOwnProperty.call(updates, 'content')) {
        // 初期化して差し替え
        while (inner.firstChild) inner.removeChild(inner.firstChild);
        var content = updates.content;
        if (Array.isArray(content)) {
          var ul = document.createElement('ul');
          ul.className = 'c-user-popover__list';
          var onClose = pop.__up && pop.__up.onClose;
          this._buildFromItems(ul, content, onClose || null);
          inner.appendChild(ul);
        } else if (typeof content === 'string') {
          inner.innerHTML = content;
        } else if (isElement(content)) {
          inner.appendChild(content);
        }
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'onClose')) {
        pop.__up = pop.__up || {};
        pop.__up.onClose = updates.onClose;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'ariaLabel')) {
        pop.setAttribute('aria-label', String(updates.ariaLabel || ''));
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'role')) {
        pop.setAttribute('role', String(updates.role || ''));
      }
    }

    removePopover(pop) {
      if (!pop) return;
      // アイテムの onClick を解除
      var links = pop.querySelectorAll('.c-user-popover__link');
      for (var i = 0; i < links.length; i++) {
        var l = links[i];
        if (l.__up_onClick) {
          l.removeEventListener('click', l.__up_onClick, true);
          l.__up_onClick = null;
        }
      }
      if (pop.parentNode) pop.parentNode.removeChild(pop);
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

    focusFirst(pop) {
      var list = this._focusables(pop);
      if (list.length) {
        try { list[0].focus(); } catch (e) {}
      } else {
        try { pop.focus(); } catch (e) {}
      }
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.UserAvatar || (Services.UserAvatar = {});
  NS.JobPopover = NS.JobPopover || JobPopover;

})(window, document);
