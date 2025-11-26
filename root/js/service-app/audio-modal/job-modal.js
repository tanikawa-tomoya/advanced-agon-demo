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

    lockBodyScroll(CSS, lock)
    {
      if (lock)
      {
        if (this._scrollLockCount === 0)
        {
          this._prevOverflow = document.body.style.overflow;
          document.body.style.overflow = 'hidden';
          document.body.classList.add(CSS.bodyOpen);
        }
        this._scrollLockCount++;
      }
      else
      {
        if (this._scrollLockCount > 0)
        {
          this._scrollLockCount--;
          if (this._scrollLockCount === 0)
          {
            document.body.style.overflow = this._prevOverflow || '';
            document.body.classList.remove(CSS.bodyOpen);
          }
        }
      }
    }

    _bindEsc(modalEl, onClose)
    {
      var handler = function (ev)
      {
        if (ev && (ev.key === 'Escape' || ev.keyCode === 27))
        {
          onClose(modalEl);
        }
      };
      modalEl.__audmEscHandler = handler;
      document.addEventListener('keydown', handler, true);
    }

    _unbindEsc(modalEl)
    {
      if (modalEl && modalEl.__audmEscHandler)
      {
        document.removeEventListener('keydown', modalEl.__audmEscHandler, true);
        delete modalEl.__audmEscHandler;
      }
    }

    createModal(opts, onClose)
    {
      var CSS = opts.CSS;
      var titleText = opts.title || '';
      var contentNode = opts.contentNode;

      var modal = document.createElement('div');
      modal.className = CSS.modal;
      if (opts.id) modal.id = opts.id;
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', opts.ariaLabel || 'Audio dialog');

      var backdrop = document.createElement('div');
      backdrop.className = CSS.backdrop;
      backdrop.setAttribute('aria-hidden', 'true');

      var dialog = document.createElement('div');
      dialog.className = CSS.dialog;
      dialog.setAttribute('role', 'document');

      var header = document.createElement('div');
      header.className = CSS.header;

      var title = document.createElement('div');
      title.className = CSS.title;
      title.textContent = String(titleText);

      var closeBtn = document.createElement('button');
      closeBtn.className = CSS.close;
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.innerHTML = '&times;';

      header.appendChild(title);
      header.appendChild(closeBtn);

      var body = document.createElement('div');
      body.className = CSS.body;
      if (contentNode) body.appendChild(contentNode);

      dialog.appendChild(header);
      dialog.appendChild(body);

      modal.appendChild(backdrop);
      modal.appendChild(dialog);

      if (opts.closeOnBackdrop)
      {
        backdrop.addEventListener('click', function (ev)
        {
          if (ev && ev.preventDefault) ev.preventDefault();
          onClose(modal);
        }, true);
      }

      closeBtn.addEventListener('click', function () { onClose(modal); }, true);

      if (opts.closeOnEsc)
      {
        this._bindEsc(modal, onClose);
      }

      modal.__audmClose = closeBtn;
      modal.__audmDispose = (function (self, m, btn)
      {
        return function ()
        {
          self._unbindEsc(m);
          try { btn.replaceWith(btn.cloneNode(true)); } catch (_err) {}
        };
      })(this, modal, closeBtn);

      return modal;
    }

    focusInitial(modalEl)
    {
      var btn = modalEl && modalEl.__audmClose;
      if (!btn) return;
      try
      {
        setTimeout(function () { btn.focus(); }, 0);
      }
      catch (_err) {}
    }

    disposeModal(modalEl)
    {
      if (!modalEl) return;
      if (typeof modalEl.__audmDispose === 'function')
      {
        try { modalEl.__audmDispose(); } catch (_err) {}
      }
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.AudioModal || (Services.AudioModal = {});
  NS.JobModal = NS.JobModal || JobModal;

})(window, document);
