(function () {
  'use strict';

  class JobBuildModal
  {
    constructor(service) {
      this.service = service;
    }

    buildModal(opts) {
      var id = String(opts.id || ('helpmodal-' + Date.now()));
      var overlay = document.createElement('div');
      overlay.className = String(opts.overlayClassName || 'c-help-modal');
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-hidden', 'false');
      overlay.id = id;

      var backdrop = document.createElement('div');
      backdrop.className = 'c-help-modal__overlay';

      var dialog = document.createElement('div');
      dialog.className = String(opts.contentClassName || 'c-help-modal__content');
      if (opts.showWatermark === false) {
        dialog.className += ' c-help-modal__content--no-watermark';
      }
      dialog.setAttribute('role', 'document');

      // Header
      var header = document.createElement('div');
      header.className = 'c-help-modal__header';

      var titleId = id + '-title';
      var title = document.createElement('h2');
      title.className = 'c-help-modal__title';
      title.id = titleId;
      title.textContent = String(opts.titleText || '');
      header.appendChild(title);

      // Close button
      var closeBtn = document.createElement('button');
      closeBtn.className = 'c-help-modal__close';
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', String(opts.closeAriaLabel || 'Close'));
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', () => {
        this.service.dismiss();
      }, true);

      header.appendChild(closeBtn);

      // Body
      var body = document.createElement('div');
      body.className = 'c-help-modal__body';
      if (typeof opts.text === 'string') {
        body.textContent = String(opts.text);
      } else if (typeof opts.html === 'string') {
        var contentHtml = (typeof opts.sanitizeFn === 'function') ? opts.sanitizeFn(opts.html) : opts.html;
        body.innerHTML = String(contentHtml);
      }

      // Actions
      var actionsWrap = document.createElement('div');
      actionsWrap.className = 'c-help-modal__actions';
      if (Array.isArray(opts.actions)) {
        opts.actions.forEach(function (a) {
          if (!a || typeof a.label !== 'string') return;
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'c-help-modal__action' + (a.className ? (' ' + a.className) : '');
          btn.textContent = a.label;
          if (typeof a.onClick === 'function') {
            btn.addEventListener('click', function (ev) {
              a.onClick(ev, { overlay: overlay, dialog: dialog });
            }, true);
          }
          actionsWrap.appendChild(btn);
        });
      }

      dialog.appendChild(header);
      dialog.appendChild(body);
      dialog.appendChild(actionsWrap);

      overlay.appendChild(backdrop);
      overlay.appendChild(dialog);

      // request-close イベントで閉じる要求を通知
      overlay.addEventListener('helpmodal:request-close', () => {
        // main 側 dismiss は overlay を監視する
        // ここでは何もしない（main が拾って閉じる）
      }, true);

      return { overlay: overlay, dialog: dialog, backdrop: backdrop };
    }

    requestFrame(cb) {
      var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
      return raf(cb);
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.HelpModal || (Services.HelpModal = {});
  NS.JobBuildModal = NS.JobBuildModal || JobBuildModal;  

})(window, document);
