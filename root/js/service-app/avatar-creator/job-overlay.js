(function () {
  'use strict';

  class JobOverlay
  {
    constructor(service)
    {
      this.service = service;
    }
    
    resolveContainer(ref)
    {
      if (!ref) return document.body;
      if (typeof ref === 'string') {
        var el = document.querySelector(ref);
        return el || document.body;
      }
      if (ref && ref.nodeType === 1) return ref;
      return document.body;
    }

    createOverlay(opts)
    {
      var id = opts && opts.id ? String(opts.id) : ('avatarcreator-' + Date.now());
      var ariaLabel = (opts && opts.ariaLabel) || 'Avatar creator';
      var overlay = document.createElement('div');
      overlay.className = 'c-avatar-creator';
      overlay.id = id;
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', ariaLabel);
      overlay.setAttribute('tabindex', '-1');
      if (typeof opts.zIndex !== 'undefined' && opts.zIndex !== null) {
        overlay.style.zIndex = String(opts.zIndex);
      }

      var backdrop = document.createElement('div');
      backdrop.className = 'c-avatar-creator__backdrop';
      backdrop.setAttribute('aria-hidden', 'true');

      var dialog = document.createElement('div');
      dialog.className = 'c-avatar-creator__dialog';

      // Preview area
      var preview = document.createElement('div');
      preview.className = 'c-avatar-creator__preview';

      var canvas = document.createElement('canvas');
      canvas.className = 'c-avatar-creator__canvas';
      preview.appendChild(canvas);

      // Controls
      var controls = document.createElement('div');
      controls.className = 'c-avatar-creator__controls';

      var fileInput = document.createElement('input');
      fileInput.className = 'c-avatar-creator__file';
      fileInput.type = 'file';
      fileInput.accept = 'image/*';

      var zoomWrap = document.createElement('label');
      zoomWrap.className = 'c-avatar-creator__zoom';
      var zoomText = document.createElement('span');
      zoomText.textContent = 'Zoom';
      var zoomInput = document.createElement('input');
      zoomInput.type = 'range';
      zoomInput.min = '0.5';
      zoomInput.max = '4.0';
      zoomInput.step = '0.01';
      zoomInput.value = '1.0';
      zoomWrap.appendChild(zoomText);
      zoomWrap.appendChild(zoomInput);

      var btns = document.createElement('div');
      btns.className = 'c-avatar-creator__buttons';

      var btnCancel = document.createElement('button');
      btnCancel.type = 'button';
      btnCancel.className = 'c-avatar-creator__btn c-avatar-creator__btn--cancel';
      btnCancel.textContent = 'Cancel';

      var btnSave = document.createElement('button');
      btnSave.type = 'button';
      btnSave.className = 'c-avatar-creator__btn c-avatar-creator__btn--save';
      btnSave.textContent = 'Save';

      btns.appendChild(btnCancel);
      btns.appendChild(btnSave);

      controls.appendChild(fileInput);
      controls.appendChild(zoomWrap);
      controls.appendChild(btns);

      dialog.appendChild(preview);
      dialog.appendChild(controls);

      overlay.appendChild(backdrop);
      overlay.appendChild(dialog);

      overlay.__acNodes = {
        backdrop: backdrop,
        dialog: dialog,
        preview: preview,
        canvas: canvas,
        controls: controls,
        fileInput: fileInput,
        zoomInput: zoomInput,
        btnSave: btnSave,
        btnCancel: btnCancel
      };

      return overlay;
    }

    bindInteractions(overlay, opts)
    {
      var self = this;
      opts = opts || {};
      var onBackdropClick = function (ev) {
        if (!opts.dismissOnBackdrop) return;
        if (ev && ev.target && ev.target === overlay.__acNodes.backdrop) {
          if (typeof opts.onRequestClose === 'function') opts.onRequestClose();
        }
      };
      var onKeyDown = function (ev) {
        if (!opts.dismissOnEsc) return;
        if (ev && (ev.key === 'Escape' || ev.key === 'Esc' || ev.keyCode === 27)) {
          if (typeof opts.onRequestClose === 'function') opts.onRequestClose();
        }
      };
      overlay.__acHandlers = { onBackdropClick: onBackdropClick, onKeyDown: onKeyDown };
      overlay.addEventListener('click', onBackdropClick, true);
      document.addEventListener('keydown', onKeyDown, true);
    }

    removeOverlay(overlay)
    {
      if (!overlay) return;
      var handlers = overlay.__acHandlers;
      if (handlers) {
        overlay.removeEventListener('click', handlers.onBackdropClick, true);
        document.removeEventListener('keydown', handlers.onKeyDown, true);
      }
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.AvatarCreator || (Services.AvatarCreator = {});
  NS.JobOverlay = NS.JobOverlay || JobOverlay;       

})(window, document);
