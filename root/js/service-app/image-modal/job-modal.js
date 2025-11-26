(function () {
  'use strict';

  function qsa(root, sel)
  {
    try { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
    catch (e) { return []; }
  }

  class JobModal
  {
    constructor(service)
    {
      this.service = service;
    }

    createModal(opts) {
      var id = (opts && opts.id) ? String(opts.id) : ('imgmodal-' + Date.now());
      var ariaLabel = (opts && opts.ariaLabel) || 'Image dialog';
      var zIndex = (opts && (opts.zIndex !== undefined && opts.zIndex !== null)) ? String(opts.zIndex) : null;
      var animClass = (opts && opts.animationClass) || 'is-anim-fade';
      var closeOnBackdrop = !!(opts && opts.closeOnBackdrop);
      var closeOnEsc = !!(opts && opts.closeOnEsc);
      var src = (opts && opts.src) ? String(opts.src) : '';
      var alt = (opts && typeof opts.alt !== 'undefined') ? String(opts.alt) : '';
      var caption = (opts && typeof opts.caption !== 'undefined') ? String(opts.caption) : '';

      var overlay = document.createElement('div');
      overlay.className = 'c-image-modal ' + animClass;
      overlay.id = id;
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', ariaLabel);
      overlay.setAttribute('tabindex', '-1');
      if (zIndex !== null) overlay.style.zIndex = zIndex;

      var backdrop = document.createElement('div');
      backdrop.className = 'c-image-modal__backdrop';
      backdrop.setAttribute('aria-hidden', 'true');

      var dialog = document.createElement('div');
      dialog.className = 'c-image-modal__dialog';
      dialog.setAttribute('tabindex', '-1');

      var img = document.createElement('img');
      img.className = 'c-image-modal__image';
      img.setAttribute('src', src);
      img.setAttribute('alt', alt);

      var captionEl = null;
      if (caption) {
        captionEl = document.createElement('div');
        captionEl.className = 'c-image-modal__caption';
        var capId = id + '-caption';
        captionEl.id = capId;
        captionEl.textContent = caption;
        overlay.setAttribute('aria-labelledby', capId);
      }

      var closeBtn = document.createElement('button');
      closeBtn.className = 'c-image-modal__close';
      closeBtn.setAttribute('type', 'button');
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.innerHTML = '&times;';

      dialog.appendChild(img);
      if (captionEl) dialog.appendChild(captionEl);
      dialog.appendChild(closeBtn);

      overlay.appendChild(backdrop);
      overlay.appendChild(dialog);

      // 保持（更新・削除・ハンドラで使用）
      overlay.__imodal = {
        nodes: { backdrop: backdrop, dialog: dialog, img: img, captionEl: captionEl, closeBtn: closeBtn },
        opts: { closeOnBackdrop: closeOnBackdrop, closeOnEsc: closeOnEsc }
      };

      return overlay;
    }

    open(overlay)
	{
      if (!overlay) return;
      // 初期表示のためのクラス付与（CSSアニメーション想定）
      window.requestAnimationFrame(function () {
        overlay.classList.add('is-open');
        // フォーカス初期化
        var store = overlay.__imodal || {};
        var nodes = store.nodes || {};
        if (nodes.closeBtn) {
          nodes.closeBtn.focus();
        } else if (nodes.dialog) {
          nodes.dialog.focus();
        } else {
          overlay.focus();
        }
      });
    }

    bindInteractions(overlay, handlers) {
      if (!overlay) return;
      var store = overlay.__imodal || (overlay.__imodal = {});
      var nodes = store.nodes || {};
      var opts = store.opts || {};
      var self = this;

      var onBackdropClick = function (ev) {
        if (!opts.closeOnBackdrop) return;
        if (ev && ev.target && ev.target === nodes.backdrop) {
          if (handlers && typeof handlers.onRequestClose === 'function') handlers.onRequestClose();
        }
      };

      var onCloseClick = function (ev) {
        ev && ev.preventDefault && ev.preventDefault();
        if (handlers && typeof handlers.onRequestClose === 'function') handlers.onRequestClose();
      };

      var onKeyDown = function (ev) {
        if (!ev) return;
        // ESC クローズ
        if (opts.closeOnEsc && (ev.key === 'Escape' || ev.key === 'Esc' || ev.keyCode === 27)) {
          ev.stopPropagation();
          if (handlers && typeof handlers.onRequestClose === 'function') handlers.onRequestClose();
          return;
        }
        // フォーカストラップ (Tab/Shift+Tab)
        if (ev.key === 'Tab' || ev.keyCode === 9) {
          var focusables = self._getFocusable(nodes.dialog || overlay);
          if (focusables.length === 0) return;
          var first = focusables[0];
          var last = focusables[focusables.length - 1];
          var active = document.activeElement;
          if (ev.shiftKey) {
            if (active === first || active === overlay) {
              last.focus();
              ev.preventDefault();
            }
          } else {
            if (active === last) {
              first.focus();
              ev.preventDefault();
            }
          }
        }
      };

      overlay.addEventListener('click', onBackdropClick, true);
      if (nodes.closeBtn) nodes.closeBtn.addEventListener('click', onCloseClick, true);
      document.addEventListener('keydown', onKeyDown, true);

      overlay.__imodal.handlers = { onBackdropClick: onBackdropClick, onCloseClick: onCloseClick, onKeyDown: onKeyDown };
    }

    _getFocusable(root) {
      if (!root) return [];
      var sel = [
        'a[href]','area[href]','button:not([disabled])',
        'input:not([disabled])','select:not([disabled])','textarea:not([disabled])',
        'iframe','[tabindex]:not([tabindex="-1"])','[contenteditable="true"]'
      ].join(',');
      var list = qsa(root, sel).filter(function (el) {
        return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      });
      return list;
    }

    updateModal(overlay, updates) {
      if (!overlay || !updates) return;
      var store = overlay.__imodal || (overlay.__imodal = {});
      var nodes = store.nodes || {};

      if (Object.prototype.hasOwnProperty.call(updates, 'src')) {
        if (nodes.img) nodes.img.setAttribute('src', String(updates.src));
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'alt')) {
        if (nodes.img) nodes.img.setAttribute('alt', String(updates.alt || ''));
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'caption')) {
        var caption = String(updates.caption || '');
        if (caption) {
          if (!nodes.captionEl) {
            var cap = document.createElement('div');
            cap.className = 'c-image-modal__caption';
            var capId = overlay.id + '-caption';
            cap.id = capId;
            cap.textContent = caption;
            nodes.dialog.appendChild(cap);
            overlay.setAttribute('aria-labelledby', capId);
            nodes.captionEl = cap;
          } else {
            nodes.captionEl.textContent = caption;
          }
        } else {
          // remove caption if empty
          if (nodes.captionEl && nodes.captionEl.parentNode) {
            nodes.captionEl.parentNode.removeChild(nodes.captionEl);
          }
          nodes.captionEl = null;
          overlay.removeAttribute('aria-labelledby');
        }
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'animationClass')) {
        // is-anim-* を付け替え
        var classes = Array.prototype.slice.call(overlay.classList);
        for (var i = 0; i < classes.length; i++) {
          if (classes[i].indexOf('is-anim-') === 0) overlay.classList.remove(classes[i]);
        }
        overlay.classList.add(String(updates.animationClass));
      }
    }

    removeModal(overlay) {
      if (!overlay) return;
      var handlers = overlay.__imodal && overlay.__imodal.handlers;
      var nodes = overlay.__imodal && overlay.__imodal.nodes;
      if (handlers) {
        overlay.removeEventListener('click', handlers.onBackdropClick, true);
        if (nodes && nodes.closeBtn) nodes.closeBtn.removeEventListener('click', handlers.onCloseClick, true);
        document.removeEventListener('keydown', handlers.onKeyDown, true);
      }
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.ImageModal || (Services.ImageModal = {});
  NS.JobModal = NS.JobModal || JobModal;    

})(window, document);
