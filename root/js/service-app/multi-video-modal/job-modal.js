(function () {

  'use strict';

  class JobModal
  {
    constructor(service)
    {
      this.service = service;
      this._scrollLockCount = 0;
      this._prevOverflow = '';
    }

    ensureRegion(CSS, zIndex)
    {
      var region = document.querySelector('.' + CSS.region);
      if (!region) {
        region = document.createElement('div');
        region.className = CSS.region;
        region.style.position = 'fixed';
        region.style.top = '0';
        region.style.left = '0';
        region.style.width = '100%';
        region.style.height = '100%';
        if (typeof zIndex !== 'undefined' && zIndex !== null) {
          region.style.zIndex = String(zIndex);
        }
        document.body.appendChild(region);
      } else if (typeof zIndex !== 'undefined' && zIndex !== null) {
        region.style.zIndex = String(zIndex);
      }
      return region;
    }

    cleanupRegionIfEmpty(CSS) {
      var region = document.querySelector('.' + CSS.region);
      if (!region) return;
      if (!region.querySelector('.' + CSS.modal)) {
        if (region.parentNode) region.parentNode.removeChild(region);
      }
    }

    lockBodyScroll(CSS, lock) {
      if (lock) {
        if (this._scrollLockCount === 0) {
          this._prevOverflow = document.body.style.overflow;
          document.body.style.overflow = 'hidden';
          document.body.classList.add(CSS.bodyOpen);
        }
        this._scrollLockCount++;
      } else {
        if (this._scrollLockCount > 0) {
          this._scrollLockCount--;
          if (this._scrollLockCount === 0) {
            document.body.style.overflow = this._prevOverflow || '';
            document.body.classList.remove(CSS.bodyOpen);
          }
        }
      }
    }

    _bindEsc(modalEl, onClose) {
      var handler = function (ev) {
        if (ev && (ev.key === 'Escape' || ev.keyCode === 27)) {
          onClose(modalEl);
        }
      };
      modalEl.__vmEscHandler = handler;
      document.addEventListener('keydown', handler, true);
    }

    _unbindEsc(modalEl) {
      if (modalEl && modalEl.__vmEscHandler) {
        document.removeEventListener('keydown', modalEl.__vmEscHandler, true);
        delete modalEl.__vmEscHandler;
      }
    }

    createModal(opts, onClose) {
      var CSS = opts.CSS;

      var modal = document.createElement('div');
      modal.className = CSS.modal;
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');

      var backdrop = document.createElement('div');
      backdrop.className = CSS.backdrop;
      backdrop.setAttribute('aria-hidden', 'true');

      var dialog = document.createElement('div');
      dialog.className = CSS.dialog;
      dialog.setAttribute('role', 'document');

      var header = document.createElement('div');
      header.className = CSS.header;
      var titleId = 'vm-title-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
      var title = document.createElement('div');
      title.className = CSS.title;
      title.id = titleId;
      title.textContent = String(opts.title || '');

      var closeBtn = document.createElement('button');
      closeBtn.className = CSS.close;
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.innerHTML = '&times;';

      var titleWrap = document.createElement('div');
      titleWrap.className = CSS.titleWrap;
      titleWrap.appendChild(title);
      if (opts.actionsNode)
      {
        titleWrap.appendChild(opts.actionsNode);
      }

      header.appendChild(titleWrap);
      header.appendChild(closeBtn);

      var body = document.createElement('div');
      body.className = CSS.body;
      if (opts.contentNode) body.appendChild(opts.contentNode);

      dialog.setAttribute('aria-labelledby', titleId);
      dialog.appendChild(header);
      dialog.appendChild(body);

      modal.appendChild(backdrop);
      modal.appendChild(dialog);

      // クリックで閉じる（バックドロップ）
      if (opts.closeOnBackdrop) {
        backdrop.addEventListener('click', function (ev) {
          ev && ev.preventDefault && ev.preventDefault();
          onClose(modal);
        }, true);
      }

      // ボタンで閉じる
      closeBtn.addEventListener('click', function () { onClose(modal); }, true);

      // ESC で閉じる
      if (opts.closeOnEsc) {
        this._bindEsc(modal, onClose);
      }

      // 初期フォーカス（クローズボタン）
      try {
        setTimeout(function () { closeBtn.focus(); }, 0);
      } catch (e) { /* ignore */ }

      var disposeHandlers = Array.isArray(opts.disposeHandlers) ? opts.disposeHandlers.slice() : [];

      // 破棄関数を保持
      modal.__vmDispose = (function (self, m, btn, dlg, extra) {
        return function () {
          // イベント解除
          self._unbindEsc(m);
          m.removeEventListener('click', function () {}, true);
          btn.removeEventListener('click', function () {}, true);
          dlg.removeEventListener('click', function () {}, true);
          // HTML5 video を停止
          try {
            var vids = m.querySelectorAll('video');
            for (var i = 0; i < vids.length; i++) {
              try { vids[i].pause && vids[i].pause(); } catch (e) {}
            }
          } catch (e) {}
          for (var i = 0; i < extra.length; i++)
          {
            if (typeof extra[i] === 'function')
            {
              try { extra[i](); } catch (e) {}
            }
          }
        };
      })(this, modal, closeBtn, dialog, disposeHandlers);

      return modal;
    }

    disposeModal(modalEl) {
      if (!modalEl) return;
      if (typeof modalEl.__vmDispose === 'function') {
        try { modalEl.__vmDispose(); } catch (e) {}
      }
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.MultiVideoModal || (Services.MultiVideoModal = {});
  NS.JobModal = NS.JobModal || JobModal;

})(window, document);
