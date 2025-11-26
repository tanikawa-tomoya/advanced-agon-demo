(function () {

  'use strict';

  class JobDialog
  {
    constructor(service)
    {
      this.service = service;
    }

    build(opts)
    {
      var C = this.service.CLASSNAMES;
      var id = opts.id || 'mapviewer-' + Date.now();
      var ariaLabel = opts.ariaLabel || 'Map Viewer';
      var zIndex = (typeof opts.zIndex !== 'undefined') ? String(opts.zIndex) : null;
      var size = opts.size || { width: '80vw', height: '70vh' };

      // root
      var root = document.createElement('div');
      root.className = C.root;
      if (zIndex) root.style.zIndex = zIndex;
      root.style.position = 'fixed';
      root.style.top = '0'; root.style.left = '0';
      root.style.width = '100%'; root.style.height = '100%';
      root.style.display = 'flex';
      root.style.alignItems = 'center';
      root.style.justifyContent = 'center';
      root.style.inset = '0';

      // backdrop
      var backdrop = document.createElement('div');
      backdrop.className = C.backdrop;
      backdrop.style.position = 'absolute';
      backdrop.style.top = '0'; backdrop.style.left = '0';
      backdrop.style.width = '100%'; backdrop.style.height = '100%';
      backdrop.style.background = 'rgba(0,0,0,0.5)';
      backdrop.setAttribute('aria-hidden', 'true');

      // dialog
      var dialog = document.createElement('div');
      dialog.className = C.dialog;
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-label', ariaLabel);
      dialog.setAttribute('tabindex', '-1');
      dialog.style.background = '#fff';
      dialog.style.position = 'relative';
      dialog.style.width = size.width || '80vw';
      dialog.style.height = size.height || '70vh';
      dialog.style.maxWidth = '96vw';
      dialog.style.maxHeight = '90vh';
      dialog.style.display = 'flex';
      dialog.style.flexDirection = 'column';
      dialog.style.borderRadius = '8px';
      dialog.style.overflow = 'hidden';

      // header
      var header = document.createElement('div');
      header.className = C.header;
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.justifyContent = 'space-between';
      header.style.padding = '10px 12px';
      header.style.borderBottom = '1px solid #eee';

      var title = document.createElement('div');
      title.className = C.title;
      title.textContent = '';

      var close = document.createElement('button');
      close.className = C.close;
      close.setAttribute('type', 'button');
      close.setAttribute('aria-label', 'Close');
      close.innerHTML = '&times;';
      close.style.fontSize = '18px';
      close.style.lineHeight = '1';
      close.style.background = 'transparent';
      close.style.border = 'none';
      close.style.cursor = 'pointer';

      header.appendChild(title);
      header.appendChild(close);

      // sub header info
      var subtitle = document.createElement('div');
      subtitle.className = C.subtitle;
      subtitle.style.padding = '6px 12px';
      subtitle.style.fontSize = '12px';
      subtitle.style.color = '#666';

      var address = document.createElement('div');
      address.className = C.address;
      address.style.padding = '0 12px 8px 12px';
      address.style.fontSize = '12px';
      address.style.color = '#666';

      // body
      var body = document.createElement('div');
      body.className = C.body;
      body.style.flex = '1';
      body.style.position = 'relative';

      var iframe = document.createElement('iframe');
      iframe.className = C.iframe;
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.display = 'block';

      body.appendChild(iframe);

      // link line
      var link = document.createElement('a');
      link.className = C.link;
      link.textContent = '';
      link.href = '#';
      link.target = '_blank';
      link.style.display = 'inline-block';
      link.style.padding = '8px 12px';
      link.style.fontSize = '12px';
      link.style.borderTop = '1px solid #eee';
      link.style.textDecoration = 'none';

      // assemble
      dialog.appendChild(header);
      dialog.appendChild(subtitle);
      dialog.appendChild(address);
      dialog.appendChild(body);
      dialog.appendChild(link);

      root.appendChild(backdrop);
      root.appendChild(dialog);

      // store refs
      var parts = { root: root, backdrop: backdrop, dialog: dialog, header: header, title: title,
        close: close, subtitle: subtitle, address: address, body: body, iframe: iframe, link: link };
      // options
      parts.__opts = {
        dismissOnBackdrop: !!opts.dismissOnBackdrop,
        dismissOnEsc: !!opts.dismissOnEsc
      };
      return parts;
    }

    mount(parts) {
      document.body.appendChild(parts.root);
      // focus
      try { parts.dialog.focus(); } catch (e) {}
    }

    unmount(parts) {
      if (!parts) return;
      if (parts.root && parts.root.parentNode) parts.root.parentNode.removeChild(parts.root);
    }

    bindInteractions(parts, handlers) {
      var self = this;
      var onBackdrop = function (ev) {
        if (!parts.__opts || !parts.__opts.dismissOnBackdrop) return;
        if (!ev) return;
        if (ev.target === parts.backdrop) {
          if (handlers && typeof handlers.onRequestClose === 'function') handlers.onRequestClose();
        }
      };
      var onKeyDown = function (ev) {
        if (!parts.__opts || !parts.__opts.dismissOnEsc) return;
        if (!ev) return;
        if (ev.key === 'Escape' || ev.key === 'Esc' || ev.keyCode === 27) {
          if (handlers && typeof handlers.onRequestClose === 'function') handlers.onRequestClose();
        }
      };
      var onCloseClick = function (ev) {
        ev && ev.preventDefault && ev.preventDefault();
        if (handlers && typeof handlers.onRequestClose === 'function') handlers.onRequestClose();
      };

      parts.__handlers = { onBackdrop: onBackdrop, onKeyDown: onKeyDown, onCloseClick: onCloseClick };
      parts.root.addEventListener('click', onBackdrop, true);
      document.addEventListener('keydown', onKeyDown, true);
      parts.close.addEventListener('click', onCloseClick, true);
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.MapViewer || (Services.MapViewer = {});
  NS.JobDialog = NS.JobDialog || JobDialog;      

})(window, document);
