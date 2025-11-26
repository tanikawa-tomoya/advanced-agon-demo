(function () {

  'use strict';

  class JobToast
  {
    constructor(service)
    {
      this.service = service;
    }
    
    createToast(opts, handlers)
    {
      var id = (opts && opts.id) ? String(opts.id) : ('toast-' + Date.now());
      var role = (opts && opts.role) || 'status';
      var ariaLive = (opts && opts.ariaLive) || 'polite';
      var typeClass = (opts && opts.typeClass) || '';
      var dismissible = !!(opts && opts.dismissible);
      var duration = (opts && (opts.duration || opts.duration === 0)) ? Number(opts.duration) : 3000;
      var message = (opts && typeof opts.message !== 'undefined') ? String(opts.message) : '';

      var toast = document.createElement('div');
      toast.className = 'c-toast';
      if (typeClass) toast.classList.add(typeClass);
      toast.id = id;
      toast.setAttribute('role', role);
      toast.setAttribute('aria-live', ariaLive);
      toast.setAttribute('aria-atomic', 'true');
      toast.style.pointerEvents = 'auto';

      var body = document.createElement('div');
      body.className = 'c-toast__body';
      body.textContent = message;

      toast.appendChild(body);

      var closeBtn = null;
      var controls = null;
      if (dismissible) {
        controls = document.createElement('div');
        controls.className = 'c-toast__controls';
        closeBtn = document.createElement('button');
        closeBtn.className = 'c-toast__close';
        closeBtn.setAttribute('type', 'button');
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.innerHTML = '&times;';
        controls.appendChild(closeBtn);
      }
      if (controls) {
        toast.appendChild(controls);
      }

      var onCloseClick = function (ev) {
        ev && ev.preventDefault && ev.preventDefault();
        if (handlers && typeof handlers.onRequestClose === 'function') handlers.onRequestClose();
      };

      if (closeBtn) closeBtn.addEventListener('click', onCloseClick, true);

      // 自動消去
      var timer = null;
      if (duration > 0) {
        timer = window.setTimeout(function () {
          if (handlers && typeof handlers.onRequestClose === 'function') handlers.onRequestClose();
        }, duration);
      }

      toast.__toast = { timer: timer, onCloseClick: onCloseClick, closeBtn: closeBtn };
      return toast;
    }

    updateToast(toast, updates)
    {
      if (!toast || !updates) return;
      var store = toast.__toast || (toast.__toast = {});
      if (Object.prototype.hasOwnProperty.call(updates, 'message')) {
        var msg = toast.querySelector('.c-toast__body');
        if (msg) msg.textContent = String(updates.message || '');
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'typeClass')) {
        // 既存の c-toast--* を外し、新しいクラスを追加
        var classes = Array.prototype.slice.call(toast.classList);
        for (var i = 0; i < classes.length; i++) {
          if (classes[i].indexOf('c-toast--') === 0) toast.classList.remove(classes[i]);
        }
        if (updates.typeClass) toast.classList.add(String(updates.typeClass));
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'duration')) {
        if (store.timer) {
          window.clearTimeout(store.timer);
          store.timer = null;
        }
        var duration = Number(updates.duration);
        if (duration > 0) {
          store.timer = window.setTimeout(function () {
            if (toast && toast.parentNode) {
              // main 側 onRequestClose 経由で閉じるため、click相当は行わない
              var ev = document.createEvent('Event');
              ev.initEvent('toast:request-close', true, true);
              toast.dispatchEvent(ev);
            }
          }, duration);
        }
      }
    }

    removeToast(toast)
    {
      if (!toast) return;
      var store = toast.__toast;
      if (store) {
        if (store.timer) window.clearTimeout(store.timer);
        if (store.closeBtn && store.onCloseClick) {
          store.closeBtn.removeEventListener('click', store.onCloseClick, true);
        }
      }
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.Toast || (Services.Toast = {});
  NS.JobToast = NS.JobToast || JobToast;      

})(window, document);
