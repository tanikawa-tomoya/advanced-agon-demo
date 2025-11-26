(function () {

  'use strict';

  /**
   * JobDom: DOM生成・イベントバインド・表示更新
   */
  class JobDom
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

    ensureRoot(container, cfg)
    {
      container = this.resolveContainer(container);
      var root = container.querySelector('.c-uploader');
      if (!root) {
        root = document.createElement('div');
        root.className = 'c-uploader';
        root.setAttribute('role', 'group');
        root.setAttribute('aria-label', String(cfg.ariaLabel || 'Uploader'));

        var drop = document.createElement('div');
        drop.className = 'c-uploader__dropzone';
        drop.setAttribute('tabindex', '0');
        drop.innerHTML = '<span class="c-uploader__dropzone-text">Drop files here or </span>';

        var chooseBtn = document.createElement('button');
        chooseBtn.type = 'button';
        chooseBtn.className = 'c-uploader__choose';
        chooseBtn.textContent = 'Choose files';

        drop.appendChild(chooseBtn);

        var input = document.createElement('input');
        input.type = 'file';
        input.className = 'c-uploader__input';
        input.style.display = 'none';
        if (cfg && cfg.multiple) input.multiple = true;
        if (cfg && cfg.accept) input.setAttribute('accept', String(cfg.accept));

        var actions = document.createElement('div');
        actions.className = 'c-uploader__actions';

        var uploadAll = document.createElement('button');
        uploadAll.type = 'button';
        uploadAll.className = 'c-uploader__upload-all';
        uploadAll.textContent = 'Upload';
        if (cfg && cfg.autoUpload) uploadAll.style.display = 'none';

        var cancelAll = document.createElement('button');
        cancelAll.type = 'button';
        cancelAll.className = 'c-uploader__cancel-all';
        cancelAll.textContent = 'Cancel All';

        actions.appendChild(uploadAll);
        actions.appendChild(cancelAll);

        var list = document.createElement('ul');
        list.className = 'c-uploader__list';

        root.appendChild(drop);
        root.appendChild(input);
        root.appendChild(actions);
        root.appendChild(list);

        if (container === document.body) {
          // 初期配置だけ設定（スタイルはCSS側に委ねる）
          root.style.position = 'relative';
        }

        container.appendChild(root);
      }
      return root;
    }

    getInput(root) {
      if (!root) return null;
      return root.querySelector('.c-uploader__input');
    }

    bindUI(root, handlers) {
      var drop = root.querySelector('.c-uploader__dropzone');
      var input = root.querySelector('.c-uploader__input');
      var chooseBtn = root.querySelector('.c-uploader__choose');
      var uploadAll = root.querySelector('.c-uploader__upload-all');
      var cancelAll = root.querySelector('.c-uploader__cancel-all');

      var prevent = function (ev) { ev.preventDefault(); ev.stopPropagation(); };

      // ドロップゾーン
      drop.addEventListener('dragover', prevent, false);
      drop.addEventListener('dragenter', prevent, false);
      drop.addEventListener('drop', function (ev) {
        prevent(ev);
        var dt = ev.dataTransfer;
        if (dt && dt.files) {
          if (handlers && typeof handlers.onDropFiles === 'function') handlers.onDropFiles(dt.files);
        }
      }, false);

      // ファイル選択
      if (chooseBtn) chooseBtn.addEventListener('click', function () {
        if (handlers && typeof handlers.onChooseFiles === 'function') handlers.onChooseFiles();
      }, false);

      if (input) input.addEventListener('change', function (ev) {
        var files = ev && ev.target && ev.target.files;
        if (files && handlers && typeof handlers.onInputChange === 'function') handlers.onInputChange(files);
        // 値をクリアして同じファイルでも change が発火するように
        ev.target.value = '';
      }, false);

      // Upload All / Cancel All
      if (uploadAll) uploadAll.addEventListener('click', function () {
        if (handlers && typeof handlers.onUploadAll === 'function') handlers.onUploadAll();
      }, false);
      if (cancelAll) cancelAll.addEventListener('click', function () {
        if (handlers && typeof handlers.onCancelAll === 'function') handlers.onCancelAll();
      }, false);
    }

    createItem(entry) {
      var li = document.createElement('li');
      li.className = 'c-uploader__item is-queued';
      li.id = entry.id;

      var meta = document.createElement('div');
      meta.className = 'c-uploader__meta';

      var name = document.createElement('span');
      name.className = 'c-uploader__name';
      name.textContent = (entry.file && entry.file.name) ? entry.file.name : '(unknown)';

      var size = document.createElement('span');
      size.className = 'c-uploader__size';
      size.textContent = this._formatBytes(entry.file && entry.file.size ? entry.file.size : 0);

      meta.appendChild(name);
      meta.appendChild(size);

      var progress = document.createElement('div');
      progress.className = 'c-uploader__progress';
      var bar = document.createElement('div');
      bar.className = 'c-uploader__bar';
      bar.style.width = '0%';
      progress.appendChild(bar);

      var actions = document.createElement('div');
      actions.className = 'c-uploader__item-actions';

      var cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'c-uploader__cancel';
      cancelBtn.textContent = 'Cancel';

      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'c-uploader__remove';
      removeBtn.textContent = 'Remove';

      actions.appendChild(cancelBtn);
      actions.appendChild(removeBtn);

      li.appendChild(meta);
      li.appendChild(progress);
      li.appendChild(actions);

      li.__uploader = { bar: bar, cancelBtn: cancelBtn, removeBtn: removeBtn };
      return li;
    }

    appendItem(root, itemNode) {
      var list = root.querySelector('.c-uploader__list');
      list.appendChild(itemNode);
    }

    bindItem(itemNode, handlers) {
      var st = itemNode.__uploader || {};
      if (st.cancelBtn) st.cancelBtn.addEventListener('click', function () {
        if (handlers && typeof handlers.onCancel === 'function') handlers.onCancel();
      }, false);
      if (st.removeBtn) st.removeBtn.addEventListener('click', function () {
        if (handlers && typeof handlers.onRemove === 'function') handlers.onRemove();
      }, false);
    }

    updateProgress(itemNode, pct) {
      var st = itemNode.__uploader || {};
      if (st.bar) st.bar.style.width = (Math.max(0, Math.min(100, pct)) + '%');
    }

    setStatus(itemNode, status, message) {
      var classes = ['is-queued', 'is-uploading', 'is-done', 'is-error', 'is-canceled'];
      for (var i = 0; i < classes.length; i++) itemNode.classList.remove(classes[i]);
      var map = { queued: 'is-queued', uploading: 'is-uploading', done: 'is-done', error: 'is-error', canceled: 'is-canceled' };
      itemNode.classList.add(map[status] || 'is-queued');
      if (message) {
        itemNode.setAttribute('data-status-message', String(message));
      } else {
        itemNode.removeAttribute('data-status-message');
      }
    }

    removeItem(itemNode) {
      if (itemNode && itemNode.parentNode) itemNode.parentNode.removeChild(itemNode);
    }

    _formatBytes(bytes) {
      var b = Number(bytes) || 0;
      var units = ['B', 'KB', 'MB', 'GB', 'TB'];
      var i = 0;
      while (b >= 1024 && i < units.length - 1) { b /= 1024; i++; }
      var v = (i === 0) ? b : b.toFixed(1);
      return v + ' ' + units[i];
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.Uploader || (Services.Uploader = {});
  NS.JobDom = NS.JobDom || JobDom;  
  
})(window, document);
