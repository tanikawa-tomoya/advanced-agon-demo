(function () {
  'use strict';

  class JobOverlay
  {
    constructor(service)
    {
      this.service = service;
    }

    createOverlay(opts)
    {
      var id = opts && opts.id ? String(opts.id) : ('loadingoverlay-' + Date.now());
      var ariaLabel = (opts && opts.ariaLabel) || 'Loading';
      var message = (opts && typeof opts.message !== 'undefined') ? String(opts.message) : '';

      var overlay = document.createElement('div');
      overlay.className = 'c-loading-overlay';
      overlay.id = id;
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', ariaLabel);
      overlay.setAttribute('tabindex', '-1');

      var backdrop = document.createElement('div');
      backdrop.className = 'c-loading-overlay__backdrop';
      backdrop.setAttribute('aria-hidden', 'true');

      var content = document.createElement('div');
      content.className = 'c-loading-overlay__content';

      var spinner = document.createElement('div');
      spinner.className = 'c-loading-overlay__spinner';
      spinner.setAttribute('aria-hidden', 'true');

      var msg = document.createElement('div');
      msg.className = 'c-loading-overlay__message';
      msg.textContent = message;

      content.appendChild(spinner);
      content.appendChild(msg);
      overlay.appendChild(backdrop);
      overlay.appendChild(content);

      // 保持（更新/削除で再利用）
      overlay.__olNodes = { backdrop: backdrop, content: content, spinner: spinner, message: msg };
      overlay.__olOptions = {
        dismissOnBackdrop: !!(opts && opts.dismissOnBackdrop),
        dismissOnEsc: !!(opts && opts.dismissOnEsc)
      };

      return overlay;
    }

    bindInteractions(overlay, handlers) {
      if (!overlay) return;
      var opts = overlay.__olOptions || {};
      var self = this;
      var onBackdropClick = function (ev) {
        if (!opts.dismissOnBackdrop) return;
        if (ev && ev.target && ev.target.classList && ev.target.classList.contains('c-loading-overlay__backdrop')) {
          if (handlers && typeof handlers.onRequestClose === 'function') handlers.onRequestClose();
        }
      };
      var onKeyDown = function (ev) {
        if (!opts.dismissOnEsc) return;
        if (ev && (ev.key === 'Escape' || ev.key === 'Esc' || ev.keyCode === 27)) {
          if (handlers && typeof handlers.onRequestClose === 'function') handlers.onRequestClose();
        }
      };

      overlay.__olHandlers = { onBackdropClick: onBackdropClick, onKeyDown: onKeyDown };
      overlay.addEventListener('click', onBackdropClick, true);
      document.addEventListener('keydown', onKeyDown, true);
    }

    updateOverlay(overlay, updates) {
      if (!overlay || !updates) return;
      var nodes = overlay.__olNodes || {};
      if (Object.prototype.hasOwnProperty.call(updates, 'message')) {
        if (nodes.message) nodes.message.textContent = String(updates.message || '');
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'ariaLabel')) {
        overlay.setAttribute('aria-label', String(updates.ariaLabel || ''));
      }
    }

    removeOverlay(overlay) {
      if (!overlay) return;
      // イベント解除
      var handlers = overlay.__olHandlers;
      if (handlers) {
        overlay.removeEventListener('click', handlers.onBackdropClick, true);
        document.removeEventListener('keydown', handlers.onKeyDown, true);
      }
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.Loading || (Services.Loading = {});
  NS.JobOverlay = NS.JobOverlay || JobOverlay;  

})(window, document);
