(function () {

  'use strict';

  function firstFocusable(root)
  {
    var sel = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable]';
    var list = root.querySelectorAll(sel);
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement) return el;
    }
    return null;
  }

  class JobModal
  {
    constructor(service)
    {
      this.service = service;
    }

    createModal(opts)
    {
      var id = (opts && opts.id) ? String(opts.id) : ('pdfmodal-' + Date.now());
      var ariaLabel = (opts && opts.ariaLabel) || 'PDF Viewer';
      var title = (opts && typeof opts.title !== 'undefined') ? String(opts.title) : 'Document';
      var src = (opts && typeof opts.src !== 'undefined') ? String(opts.src) : '';
      var sizeClass = (opts && opts.sizeClass) || 'is-lg';

      var root = document.createElement('div');
      root.className = 'c-pdf-modal';
      root.id = id;
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-label', ariaLabel);
      root.setAttribute('tabindex', '-1');

      var backdrop = document.createElement('div');
      backdrop.className = 'c-pdf-modal__backdrop';
      backdrop.setAttribute('aria-hidden', 'true');

      var dialog = document.createElement('div');
      dialog.className = 'c-pdf-modal__dialog ' + sizeClass;

      var header = document.createElement('div');
      header.className = 'c-pdf-modal__header';

      var titleEl = document.createElement('h2');
      titleEl.className = 'c-pdf-modal__title';
      titleEl.textContent = title;

      var closeBtn = document.createElement('button');
      closeBtn.className = 'c-pdf-modal__close';
      closeBtn.setAttribute('type', 'button');
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.innerHTML = '&times;';

      header.appendChild(titleEl);
      header.appendChild(closeBtn);

      var body = document.createElement('div');
      body.className = 'c-pdf-modal__body';

      var spinner = document.createElement('div');
      spinner.className = 'c-pdf-modal__spinner';
      spinner.setAttribute('aria-hidden', 'true');

      var frameWrap = document.createElement('div');
      frameWrap.className = 'c-pdf-modal__frame';

      var viewer = document.createElement('div');
      viewer.className = 'c-pdf-modal__viewer';

      frameWrap.appendChild(viewer);
      body.appendChild(spinner);
      body.appendChild(frameWrap);

      var footer = document.createElement('div');
      footer.className = 'c-pdf-modal__footer';

      if (opts && opts.showOpenInNewTab) {
        var openA = document.createElement('a');
        openA.className = 'c-pdf-modal__action c-pdf-modal__action--open';
        openA.setAttribute('target', '_blank');
        openA.setAttribute('rel', 'noopener');
        openA.textContent = (opts.openInNewTabLabel || 'Open in new tab');
        openA.href = src || 'about:blank';
        footer.appendChild(openA);
      }

      if (opts && opts.showDownload) {
        var dlA = document.createElement('a');
        dlA.className = 'c-pdf-modal__action c-pdf-modal__action--download';
        dlA.setAttribute('download', '');
        dlA.textContent = (opts.downloadLabel || 'Download');
        dlA.href = src || 'about:blank';
        footer.appendChild(dlA);
      }

      dialog.appendChild(header);
      dialog.appendChild(body);
      dialog.appendChild(footer);

      root.appendChild(backdrop);
      root.appendChild(dialog);

      // ストア（更新や削除で再利用）
      root.__pm = {
        backdrop: backdrop,
        dialog: dialog,
        header: header,
        titleEl: titleEl,
        closeBtn: closeBtn,
        body: body,
        spinner: spinner,
        frameWrap: frameWrap,
        viewer: viewer,
        footer: footer,
        opts: {
          dismissOnBackdrop: !!(opts && opts.dismissOnBackdrop),
          dismissOnEsc: !!(opts && opts.dismissOnEsc)
        },
        loadingTask: null,
        pageRenderTasks: []
      };

      // 初期フォーカスの目安（close ボタン）
      root.__pm.initialFocus = closeBtn;

      return root;
    }

    bindInteractions(root, handlers) {
      if (!root) return;
      var pm = root.__pm || {};
      var opts = pm.opts || {};
      var self = this;

      var onBackdrop = function (ev) {
        if (!opts.dismissOnBackdrop) return;
        if (ev && ev.target === pm.backdrop) {
          if (handlers && typeof handlers.onRequestClose === 'function') handlers.onRequestClose();
        }
      };
      var onKeydown = function (ev) {
        if (!opts.dismissOnEsc) return;
        if (ev && (ev.key === 'Escape' || ev.key === 'Esc' || ev.keyCode === 27)) {
          if (handlers && typeof handlers.onRequestClose === 'function') handlers.onRequestClose();
        }
      };
      var onClose = function (ev) {
        ev && ev.preventDefault && ev.preventDefault();
        if (handlers && typeof handlers.onRequestClose === 'function') handlers.onRequestClose();
      };

      pm.handlers = { onBackdrop: onBackdrop, onKeydown: onKeydown, onClose: onClose };
      root.addEventListener('click', onBackdrop, true);
      document.addEventListener('keydown', onKeydown, true);
      if (pm.closeBtn) pm.closeBtn.addEventListener('click', onClose, true);

      window.requestAnimationFrame(function () {
        root.classList.add('is-open');
        var initial = firstFocusable(root) || root;
        if (initial && initial.focus) {
          try { initial.focus(); } catch (e) {}
        }
      });

      // 初期スピナー表示
      if (pm.spinner) pm.spinner.style.display = '';
    }

    updateModal(root, updates) {
      if (!root || !updates) return;
      var pm = root.__pm || {};

      if (Object.prototype.hasOwnProperty.call(updates, 'title')) {
        if (pm.titleEl) pm.titleEl.textContent = String(updates.title || '');
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'sizeClass')) {
        var classes = Array.prototype.slice.call(pm.dialog.classList);
        for (var i = 0; i < classes.length; i++) {
          if (classes[i].indexOf('is-') === 0) pm.dialog.classList.remove(classes[i]);
        }
        pm.dialog.classList.add(String(updates.sizeClass));
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'src')) {
        var url = String(updates.src || 'about:blank');
        if (pm.spinner) pm.spinner.style.display = '';
        this.renderPdf(root, url);
        // フッターのリンクも更新
        var openA = root.querySelector('.c-pdf-modal__action--open');
        if (openA) openA.href = url;
        var dlA = root.querySelector('.c-pdf-modal__action--download');
        if (dlA) dlA.href = url;
      }
    }

    _cancelRender(store)
    {
      if (!store) return;
      if (store.loadingTask && typeof store.loadingTask.destroy === 'function') {
        try { store.loadingTask.destroy(); } catch (e) {}
      }
      store.loadingTask = null;
      if (store.pageRenderTasks && store.pageRenderTasks.length) {
        for (var i = 0; i < store.pageRenderTasks.length; i++) {
          var task = store.pageRenderTasks[i];
          if (task && typeof task.cancel === 'function') {
            try { task.cancel(); } catch (e) {}
          }
        }
      }
      store.pageRenderTasks = [];
    }

    _showViewerMessage(viewer, message)
    {
      if (!viewer) return;
      viewer.innerHTML = '';
      var msg = document.createElement('div');
      msg.className = 'c-pdf-modal__message';
      msg.textContent = message;
      viewer.appendChild(msg);
    }

    renderPdf(root, src)
    {
      if (!root) return;
      var pm = root.__pm || {};
      var viewer = pm.viewer;
      this._cancelRender(pm);

      if (viewer) viewer.innerHTML = '';
      if (!src) {
        if (pm.spinner) pm.spinner.style.display = 'none';
        this._showViewerMessage(viewer, 'PDFを読み込めませんでした。');
        return;
      }

      if (!window.pdfjsLib || typeof window.pdfjsLib.getDocument !== 'function') {
        throw new Error('pdf.js is not available.');
      }

      if (pm.spinner) pm.spinner.style.display = '';

      var loadingTask = window.pdfjsLib.getDocument(src);
      pm.loadingTask = loadingTask;
      var renderTasks = [];
      pm.pageRenderTasks = renderTasks;
      var self = this;

      loadingTask.promise.then(function (pdfDoc) {
        var promises = [];
        for (var pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
          (function (pageIndex) {
            promises.push(
              pdfDoc.getPage(pageIndex).then(function (page) {
                var baseScale = 1.1;
                var viewport = page.getViewport({ scale: baseScale });
                var outputScale = window.devicePixelRatio || 1;
                var renderViewport = page.getViewport({ scale: baseScale * outputScale });
                var canvas = document.createElement('canvas');
                canvas.className = 'c-pdf-modal__page';
                canvas.width = renderViewport.width;
                canvas.height = renderViewport.height;
                canvas.style.width = viewport.width + 'px';
                canvas.style.height = viewport.height + 'px';
                var context = canvas.getContext('2d');
                var renderTask = page.render({ canvasContext: context, viewport: renderViewport });
                renderTasks.push(renderTask);
                return renderTask.promise.then(function () {
                  if (viewer) viewer.appendChild(canvas);
                });
              })
            );
          })(pageNumber);
        }
        return Promise.all(promises);
      }).catch(function () {
        self._showViewerMessage(viewer, 'PDFを読み込めませんでした。');
      }).finally(function () {
        if (pm.spinner) pm.spinner.style.display = 'none';
        pm.loadingTask = null;
        pm.pageRenderTasks = [];
      });
    }

    removeModal(root) {
      if (!root) return;
      var pm = root.__pm || {};
      if (pm.handlers) {
        root.removeEventListener('click', pm.handlers.onBackdrop, true);
        document.removeEventListener('keydown', pm.handlers.onKeydown, true);
        if (pm.closeBtn) pm.closeBtn.removeEventListener('click', pm.handlers.onClose, true);
      }
      this._cancelRender(pm);
      if (root.parentNode) root.parentNode.removeChild(root);
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.PdfModal || (Services.PdfModal = {});
  NS.JobModal = NS.JobModal || JobModal;  
  
})(window, document);
