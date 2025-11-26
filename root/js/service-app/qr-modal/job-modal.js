(function () {

  'use strict';

  class JobModal
  {
    constructor(service)
    {
      this.service = service;
    }

    createModal(opts)
    {
      var id = (opts && opts.id) ? String(opts.id) : ('qrmodal-' + Date.now());
      var ariaLabel = (opts && opts.ariaLabel) || 'QR code';
      var closeLabel = (opts && opts.closeLabel) || 'Close';
      var title = (opts && typeof opts.title !== 'undefined') ? String(opts.title) : '';
      var src = (opts && opts.src) ? String(opts.src) : '';
      var alt = (opts && typeof opts.alt !== 'undefined' && String(opts.alt).length) ? String(opts.alt) : ariaLabel;
      var size = (opts && typeof opts.size !== 'undefined') ? Number(opts.size) : 256;
      var dismissible = !!(opts && opts.dismissible);

      var root = document.createElement('div');
      root.className = 'c-qr-modal';
      root.id = id;
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-label', ariaLabel);
      root.setAttribute('tabindex', '-1');

      var backdrop = document.createElement('div');
      backdrop.className = 'c-qr-modal__backdrop';
      backdrop.setAttribute('aria-hidden', 'true');

      var dialog = document.createElement('div');
      dialog.className = 'c-qr-modal__dialog';

      // header
      var header = document.createElement('div');
      header.className = 'c-qr-modal__header';

      if (title && String(title).length) {
        var titleEl = document.createElement('div');
        titleEl.className = 'c-qr-modal__title';
        titleEl.textContent = String(title);
        header.appendChild(titleEl);
      }

      var closeBtn = null;
      if (dismissible) {
        closeBtn = document.createElement('button');
        closeBtn.className = 'c-qr-modal__close';
        closeBtn.setAttribute('type', 'button');
        closeBtn.setAttribute('aria-label', closeLabel);
        closeBtn.innerHTML = '&times;';
        header.appendChild(closeBtn);
      }

      // body
      var body = document.createElement('div');
      body.className = 'c-qr-modal__body';

      var img = document.createElement('img');
      img.className = 'c-qr-modal__image';
      img.setAttribute('alt', alt);
      if (src) img.setAttribute('src', src);
      if (size > 0) {
        img.style.width = size + 'px';
        img.style.height = size + 'px';
      }

      body.appendChild(img);
      dialog.appendChild(header);
      dialog.appendChild(body);

      root.appendChild(backdrop);
      root.appendChild(dialog);

      root.__qr = {
        nodes: { backdrop: backdrop, dialog: dialog, header: header, body: body, img: img, closeBtn: closeBtn },
        handlers: null,
        opts: { dismissible: dismissible }
      };

      return root;
    }

    bindInteractions(root, handlers, options) {
      if (!root) return;
      var nodes = (root.__qr && root.__qr.nodes) || {};
      var onOverlayClick = function (ev) {
        if (!(options && options.overlayClosable)) return;
        if (!ev || !ev.target) return;
        // backdrop領域をクリックしたときのみ
        if (ev.target === nodes.backdrop) {
          if (handlers && typeof handlers.onRequestClose === 'function') handlers.onRequestClose();
        }
      };
      var onKeyDown = function (ev) {
        if (!(options && options.escClosable)) return;
        if (!ev) return;
        if (ev.key === 'Escape' || ev.key === 'Esc' || ev.keyCode === 27) {
          if (handlers && typeof handlers.onRequestClose === 'function') handlers.onRequestClose();
        }
      };

      root.__qr.handlers = { onOverlayClick: onOverlayClick, onKeyDown: onKeyDown };
      root.addEventListener('click', onOverlayClick, true);
      document.addEventListener('keydown', onKeyDown, true);

      // フォーカス初期化（閉じるボタンがあればそこに、なければダイアログ本体）
      try {
        if (nodes && nodes.closeBtn) nodes.closeBtn.focus();
        else root.focus();
      } catch (e) {}
    }

    updateModal(root, updates) {
      if (!root || !updates) return;
      var nodes = (root.__qr && root.__qr.nodes) || {};

      if (Object.prototype.hasOwnProperty.call(updates, 'title')) {
        var header = nodes.header;
        if (header) {
          // 既存タイトルを探す
          var t = header.querySelector('.c-qr-modal__title');
          if (updates.title && String(updates.title).length) {
            if (!t) {
              t = document.createElement('div');
              t.className = 'c-qr-modal__title';
              header.insertBefore(t, nodes.closeBtn || null);
            }
            t.textContent = String(updates.title);
          } else {
            if (t && t.parentNode) t.parentNode.removeChild(t);
          }
        }
      }

      if (Object.prototype.hasOwnProperty.call(updates, 'src')) {
        if (nodes.img) nodes.img.setAttribute('src', String(updates.src || ''));
      }

      if (Object.prototype.hasOwnProperty.call(updates, 'alt')) {
        if (nodes.img) nodes.img.setAttribute('alt', String(updates.alt || ''));
      }

      if (Object.prototype.hasOwnProperty.call(updates, 'size')) {
        var size = Number(updates.size);
        if (nodes.img && size > 0) {
          nodes.img.style.width = size + 'px';
          nodes.img.style.height = size + 'px';
        }
      }

      if (Object.prototype.hasOwnProperty.call(updates, 'ariaLabel')) {
        root.setAttribute('aria-label', String(updates.ariaLabel || ''));
      }
    }

    removeModal(root) {
      if (!root) return;
      var handlers = root.__qr && root.__qr.handlers;
      var nodes = root.__qr && root.__qr.nodes;
      if (handlers) {
        root.removeEventListener('click', handlers.onOverlayClick, true);
        document.removeEventListener('keydown', handlers.onKeyDown, true);
      }
      // imgのロードイベント等を追加していないが、将来的な拡張のための解放箇所
      if (root.parentNode) root.parentNode.removeChild(root);
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.QRModal || (Services.QRModal = {});
  NS.JobModal = NS.JobModal || JobModal;    

})(window, document);
