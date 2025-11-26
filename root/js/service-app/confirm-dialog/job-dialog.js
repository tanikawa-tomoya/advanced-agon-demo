(function () {
  'use strict';

  function findFocusable(root)
  {
    var selectors = [
      'a[href]','area[href]','input:not([disabled])','select:not([disabled])','textarea:not([disabled])',
      'button:not([disabled])','iframe','object','embed','[tabindex]:not([tabindex="-1"])','[contenteditable="true"]'
    ].join(',');
    var nodes = root.querySelectorAll(selectors);
    var list = [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.offsetParent !== null || el === document.activeElement) {
        list.push(el);
      }
    }
    return list;
  }

  class JobDialog
  {
    constructor(service)
    {
      this.service = service;
    }

    createDialog(opts, handlers)
    {
      var id = (opts && opts.id) ? String(opts.id) : ('confirmdlg-' + Date.now());
      var titleText = (opts && opts.titleText) || '';
      var ariaLabel = (opts && opts.ariaLabel) || 'Confirmation';
      var typeClass = (opts && opts.typeClass) || 'is-info';
      var confirmText = (opts && opts.confirmText) || 'OK';
      var cancelText = (opts && opts.cancelText) || 'キャンセル';
      var escToCancel = !!(opts && opts.escToCancel);
      var overlayToCancel = !!(opts && opts.overlayToCancel);
      var autoFocus = (opts && opts.autoFocus) || 'confirm';
      var message = (opts && typeof opts.message !== 'undefined') ? opts.message : '';

      var node = document.createElement('div');
      node.className = 'c-confirm-dialog ' + typeClass;
      node.id = id;

      // Backdrop
      var backdrop = document.createElement('div');
      backdrop.className = 'c-confirm-dialog__backdrop';
      backdrop.setAttribute('aria-hidden', 'true');

      // Panel
      var panel = document.createElement('div');
      panel.className = 'c-confirm-dialog__panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('tabindex', '-1');

      // Header + Title or aria-label
      if (titleText && String(titleText).length > 0) {
        var titleId = id + '-title';
        var header = document.createElement('div');
        header.className = 'c-confirm-dialog__header';
        var title = document.createElement('h2');
        title.className = 'c-confirm-dialog__title';
        title.id = titleId;
        title.textContent = String(titleText);
        header.appendChild(title);
        panel.appendChild(header);
        panel.setAttribute('aria-labelledby', titleId);
      } else {
        panel.setAttribute('aria-label', String(ariaLabel));
      }

      // Body
      var bodyId = id + '-body';
      var body = document.createElement('div');
      body.className = 'c-confirm-dialog__body';
      body.id = bodyId;
      if (typeof message === 'string') {
        body.textContent = message;
      } else if (message && message.nodeType === 1) {
        body.appendChild(message.cloneNode(true));
      }
      panel.appendChild(body);
      panel.setAttribute('aria-describedby', bodyId);

      // Controls
      var controls = document.createElement('div');
      controls.className = 'c-confirm-dialog__controls';
      var btnCancel = document.createElement('button');
      btnCancel.type = 'button';
      btnCancel.className = 'c-confirm-dialog__btn c-confirm-dialog__btn--cancel';
      btnCancel.textContent = String(cancelText);
      var btnConfirm = document.createElement('button');
      btnConfirm.type = 'button';
      btnConfirm.className = 'c-confirm-dialog__btn c-confirm-dialog__btn--confirm';
      btnConfirm.textContent = String(confirmText);

      controls.appendChild(btnCancel);
      controls.appendChild(btnConfirm);
      panel.appendChild(controls);

      node.appendChild(backdrop);
      node.appendChild(panel);

      // Handlers
      var onBackdrop = function (ev) {
        if (!overlayToCancel) return;
        if (ev && ev.target && ev.target.classList && ev.target.classList.contains('c-confirm-dialog__backdrop')) {
          if (handlers && typeof handlers.onCancel === 'function') handlers.onCancel();
        }
      };
      var onKeyDown = function (ev) {
        if (ev && (ev.key === 'Escape' || ev.key === 'Esc' || ev.keyCode === 27)) {
          if (escToCancel && handlers && typeof handlers.onCancel === 'function') {
            ev.preventDefault();
            handlers.onCancel();
          }
        }
        if (ev && (ev.key === 'Tab' || ev.keyCode === 9)) {
          // Focus trap
          var focusables = findFocusable(panel);
          if (!focusables.length) return;
          var first = focusables[0], last = focusables[focusables.length - 1];
          if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
          else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
        }
      };
      var onCancelClick = function (ev) {
        if (handlers && typeof handlers.onCancel === 'function') handlers.onCancel();
      };
      var onConfirmClick = function (ev) {
        if (handlers && typeof handlers.onConfirm === 'function') handlers.onConfirm();
      };

      node.__cdHandlers = { onBackdrop: onBackdrop, onKeyDown: onKeyDown, onCancelClick: onCancelClick, onConfirmClick: onConfirmClick, btnCancel: btnCancel, btnConfirm: btnConfirm };
      node.addEventListener('click', onBackdrop, true);
      panel.addEventListener('keydown', onKeyDown, true);
      btnCancel.addEventListener('click', onCancelClick, true);
      btnConfirm.addEventListener('click', onConfirmClick, true);

      // Initial focus
      setTimeout(function () {
        try {
          if (autoFocus === 'cancel') { btnCancel.focus(); }
          else if (autoFocus === 'none') { panel.focus(); }
          else { btnConfirm.focus(); }
        } catch (e) {}
      }, 0);

      return node;
    }

    updateDialog(node, updates) {
      if (!node || !updates) return;
      var panel = node.querySelector('.c-confirm-dialog__panel');
      if (Object.prototype.hasOwnProperty.call(updates, 'titleText')) {
        var header = panel.querySelector('.c-confirm-dialog__header');
        var title = panel.querySelector('.c-confirm-dialog__title');
        if (updates.titleText) {
          if (!header) {
            header = document.createElement('div');
            header.className = 'c-confirm-dialog__header';
            panel.insertBefore(header, panel.firstChild);
          }
          if (!title) {
            title = document.createElement('h2');
            title.className = 'c-confirm-dialog__title';
            header.appendChild(title);
          }
          title.textContent = String(updates.titleText);
          var titleId = node.id + '-title';
          title.id = titleId;
          panel.setAttribute('aria-labelledby', titleId);
          panel.removeAttribute('aria-label');
        } else {
          // タイトルを消す場合
          if (header) { panel.removeChild(header); }
          if (updates.ariaLabel) {
            panel.setAttribute('aria-label', String(updates.ariaLabel));
            panel.removeAttribute('aria-labelledby');
          }
        }
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'message')) {
        var body = panel.querySelector('.c-confirm-dialog__body');
        while (body.firstChild) body.removeChild(body.firstChild);
        if (typeof updates.message === 'string') {
          body.textContent = String(updates.message);
        } else if (updates.message && updates.message.nodeType === 1) {
          body.appendChild(updates.message.cloneNode(true));
        }
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'confirmText')) {
        var c = panel.querySelector('.c-confirm-dialog__btn--confirm'); if (c) c.textContent = String(updates.confirmText);
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'cancelText')) {
        var x = panel.querySelector('.c-confirm-dialog__btn--cancel'); if (x) x.textContent = String(updates.cancelText);
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'typeClass')) {
        // is-* を差し替え
        var classes = Array.prototype.slice.call(node.classList);
        for (var i = 0; i < classes.length; i++) { if (classes[i].indexOf('is-') === 0) node.classList.remove(classes[i]); }
        node.classList.add(String(updates.typeClass));
      }
    }

    removeDialog(node) {
      if (!node) return;
      var h = node.__cdHandlers || {};
      node.removeEventListener('click', h.onBackdrop, true);
      var panel = node.querySelector('.c-confirm-dialog__panel');
      if (panel) panel.removeEventListener('keydown', h.onKeyDown, true);
      if (h.btnCancel && h.onCancelClick) h.btnCancel.removeEventListener('click', h.onCancelClick, true);
      if (h.btnConfirm && h.onConfirmClick) h.btnConfirm.removeEventListener('click', h.onConfirmClick, true);
      if (node.parentNode) node.parentNode.removeChild(node);
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.ConfirmDialog || (Services.ConfirmDialog = {});
  NS.JobDialog = NS.JobDialog || JobDialog;
  
})(window, document);
