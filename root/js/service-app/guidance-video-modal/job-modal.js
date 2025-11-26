(function () {
  'use strict';

  function removeNode(node)
  {
    if (node && node.parentNode) node.parentNode.removeChild(node);
  }

  function setAttrs(el, attrs)
  {
    if (!el || !attrs) return;
    for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      var v = attrs[k];
      if (v === null || typeof v === 'undefined') continue;
      el.setAttribute(k, String(v));
    }
  }

  function makeEmbed(spec)
  {
    if (!spec) return document.createDocumentFragment();
    if (spec.kind === 'video') {
      var v = document.createElement('video');
      v.className = 'c-gvm__video';
      v.src = spec.src || '';
      v.setAttribute('controls', 'true');
      if (spec.attrs) setAttrs(v, spec.attrs);
      return v;
    }
    if (spec.kind === 'iframe') {
      var f = document.createElement('iframe');
      f.className = 'c-gvm__iframe';
      f.src = spec.src || '';
      f.setAttribute('frameborder', '0');
      f.setAttribute('allow', (spec.attrs && spec.attrs.allow) || 'autoplay; fullscreen; picture-in-picture');
      if (spec.attrs && spec.attrs.allowfullscreen) f.setAttribute('allowfullscreen', 'true');
      return f;
    }
    // unknown
    var div = document.createElement('div');
    div.className = 'c-gvm__fallback';
    div.textContent = '';
    return div;
  }

  class JobModal
  {
    constructor(service)
    {
      this.service = service;
    }

    createModal(opts, handlers)
    {
      var id = (opts && opts.id) ? String(opts.id) : ('gvm-' + Date.now());
      var ariaLabel = (opts && opts.ariaLabel) || 'Video modal';
      var size = (opts && opts.size) || 'default';
      var dismissOnBackdrop = !!(opts && opts.dismissOnBackdrop);
      var dismissOnEsc = !!(opts && opts.dismissOnEsc);
      var closeButton = !!(opts && opts.closeButton);
      var embedSpec = opts && opts.embedSpec;

      var root = document.createElement('div');
      root.className = 'c-gvm is-size-' + size;
      root.id = id;
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-label', ariaLabel);
      root.setAttribute('tabindex', '-1');

      var backdrop = document.createElement('div');
      backdrop.className = 'c-gvm__backdrop';
      backdrop.setAttribute('aria-hidden', 'true');

      var dialog = document.createElement('div');
      dialog.className = 'c-gvm__dialog';

      var header = document.createElement('div');
      header.className = 'c-gvm__header';

      var title = document.createElement('div');
      title.className = 'c-gvm__title';
      header.appendChild(title);

      var btnClose = null;
      if (closeButton) {
        btnClose = document.createElement('button');
        btnClose.className = 'c-gvm__close';
        btnClose.setAttribute('type', 'button');
        btnClose.setAttribute('aria-label', 'Close');
        btnClose.innerHTML = '&times;';
        header.appendChild(btnClose);
      }

      var body = document.createElement('div');
      body.className = 'c-gvm__body';

      var frame = document.createElement('div');
      frame.className = 'c-gvm__frame';

      var embedNode = makeEmbed(embedSpec);
      frame.appendChild(embedNode);

      dialog.appendChild(header);
      dialog.appendChild(body);
      dialog.appendChild(frame);

      root.appendChild(backdrop);
      root.appendChild(dialog);

      var self = this;
      var onBackdropClick = function (ev) {
        if (!dismissOnBackdrop) return;
        if (ev && ev.target && ev.target.classList && ev.target.classList.contains('c-gvm__backdrop')) {
          if (handlers && typeof handlers.onRequestClose === 'function') handlers.onRequestClose();
        }
      };
      var onKeyDown = function (ev) {
        if (!dismissOnEsc) return;
        if (ev && (ev.key === 'Escape' || ev.key === 'Esc' || ev.keyCode === 27)) {
          if (handlers && typeof handlers.onRequestClose === 'function') handlers.onRequestClose();
        }
      };
      var onCloseClick = function (ev) {
        ev && ev.preventDefault && ev.preventDefault();
        if (handlers && typeof handlers.onRequestClose === 'function') handlers.onRequestClose();
      };

      root.__gvm = {
        handlers: { onBackdropClick: onBackdropClick, onKeyDown: onKeyDown, onCloseClick: onCloseClick },
        nodes: { backdrop: backdrop, dialog: dialog, header: header, title: title, btnClose: btnClose, body: body, frame: frame, embed: embedNode },
        prevFocus: (document.activeElement && document.activeElement !== document.body) ? document.activeElement : null
      };

      root.addEventListener('click', onBackdropClick, true);
      document.addEventListener('keydown', onKeyDown, true);
      if (btnClose) btnClose.addEventListener('click', onCloseClick, true);

      return root;
    }

    focusInitial(root) {
      if (!root) return;
      var store = root.__gvm || {};
      var focusTarget = (store.nodes && store.nodes.btnClose) || root;
      try { focusTarget.focus(); } catch (e) {}
    }

    updateModal(root, updates) {
      if (!root || !updates) return;
      var store = root.__gvm || {};
      var nodes = store.nodes || {};

      if (Object.prototype.hasOwnProperty.call(updates, 'size')) {
        // サイズクラス切替
        var classes = Array.prototype.slice.call(root.classList);
        for (var i = 0; i < classes.length; i++) {
          if (classes[i].indexOf('is-size-') === 0) root.classList.remove(classes[i]);
        }
        root.classList.add('is-size-' + String(updates.size || 'default'));
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'ariaLabel')) {
        root.setAttribute('aria-label', String(updates.ariaLabel || ''));
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'title')) {
        if (nodes.title) nodes.title.textContent = String(updates.title || '');
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'embedSpec')) {
        // 既存の埋め込みを入れ替え
        if (nodes.embed) {
          // video の場合は停止
          try {
            if (nodes.embed.tagName && nodes.embed.tagName.toLowerCase() === 'video') {
              nodes.embed.pause && nodes.embed.pause();
              nodes.embed.src = '';
            }
          } catch (e) {}
          removeNode(nodes.embed);
        }
        var next = (function(spec){ return makeEmbed(spec); })(updates.embedSpec);
        if (nodes.frame) nodes.frame.appendChild(next);
        nodes.embed = next;
      }
    }

    removeModal(root) {
      if (!root) return;
      var store = root.__gvm || {};
      var nodes = store.nodes || {};
      var handlers = store.handlers || {};

      root.removeEventListener('click', handlers.onBackdropClick, true);
      document.removeEventListener('keydown', handlers.onKeyDown, true);
      if (nodes.btnClose) nodes.btnClose.removeEventListener('click', handlers.onCloseClick, true);

      // 埋め込みを停止してから削除
      try {
        if (nodes.embed && nodes.embed.tagName && nodes.embed.tagName.toLowerCase() === 'video') {
          nodes.embed.pause && nodes.embed.pause();
          nodes.embed.src = '';
        }
      } catch (e) {}
      removeNode(root);

      // フォーカスを元に戻す
      if (store.prevFocus && store.prevFocus.focus) {
        try { store.prevFocus.focus(); } catch (e) {}
      }
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.GuidanceVideoModal || (Services.GuidanceVideoModal = {});
  NS.JobModal = NS.JobModal || JobModal;  

})(window, document);
