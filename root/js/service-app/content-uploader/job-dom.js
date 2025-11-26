(function () {

  'use strict';

  class JobDom
  {
    constructor(service)
    {
      this.service = service;
    }

    resolveContainer(target)
    {
      if (!target) return document.body;
      if (typeof target === 'string') {
        var el = document.getElementById(target) || document.querySelector(target);
        return el || document.body;
      }
      if (target && target.nodeType === 1) {
        return target;
      }
      return document.body;
    }

    render(target, config)
    {
      var container = this.resolveContainer(target);
      var root = document.createElement('div');
      root.className = 'content-uploader';
      root.setAttribute('data-cp-upload', '');
      root.innerHTML = this.buildTemplate(config || {});
      this.renderStartButton(root, config || {});
      var input = root.querySelector('[data-cp-upload-input]');
      if (input) {
        if (config && config.multiple) {
          input.setAttribute('multiple', 'multiple');
        } else {
          input.removeAttribute('multiple');
        }
        if (config && config.accept) {
          input.setAttribute('accept', String(config.accept));
        }
      }
      container.appendChild(root);
      return root;
    }

    buildTemplate(config)
    {
      var text = (config && config.text) || {};
      var startMode = config && config.startMode ? config.startMode : 'button';
      var showStartButton = startMode !== 'external';
      var drop = text && text.dropMessage ? text.dropMessage : '';
      var select = text && text.selectButton ? text.selectButton : '';
      var start = text && text.startButton ? text.startButton : '';
      var empty = text && text.emptyQueue ? text.emptyQueue : '';
      var queueActions = showStartButton
        ? '' +
          '<div class="content-uploader__queue-actions" data-cp-upload-actions>' +
            '<span data-cp-upload-start-placeholder></span>' +
          '</div>'
        : '';
      return '' +
        '<div class="content-uploader__dropzone" data-cp-upload-drop tabindex="0" role="button" aria-label="ファイルをアップロード">' +
          '<p class="content-uploader__message">' + this.escapeHtml(drop) + '</p>' +
          '<button type="button" class="content-uploader__button btn btn--primary" data-cp-upload-select>' + this.escapeHtml(select) + '</button>' +
          '<input type="file" class="content-uploader__input" data-cp-upload-input aria-hidden="true" tabindex="-1" />' +
        '</div>' +
        '<div class="content-uploader__queue" data-cp-upload-queue>' +
          '<p class="content-uploader__queue-empty" data-cp-upload-empty>' + this.escapeHtml(empty) + '</p>' +
          '<ul class="content-uploader__queue-list" data-cp-upload-list aria-live="polite" aria-label="アップロード待機中のファイル"></ul>' +
          queueActions +
        '</div>';
    }

    renderStartButton(root, config)
    {
      var actions = root ? root.querySelector('[data-cp-upload-actions]') : null;
      if (!actions) {
        return;
      }

      var placeholder = actions.querySelector('[data-cp-upload-start-placeholder]');
      if (!placeholder) {
        return;
      }

      var text = (config && config.text) || {};
      var defaultLabel = text.startButton || 'アップロードを開始';
      var button = null;
      var service = this.service && this.service.buttonService;

      if (service && typeof service.createActionButton === 'function') {
        button = service.createActionButton('content-uploader-primary', {
          label: defaultLabel,
          type: 'button',
          attributes: { 'data-cp-upload-start': '' }
        });
      }

      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn--primary';
        button.setAttribute('data-cp-upload-start', '');
        button.textContent = defaultLabel;
      }

      placeholder.parentNode.replaceChild(button, placeholder);
    }

    bindUI(root, handlers)
    {
      var dropzone = root.querySelector('[data-cp-upload-drop]');
      var selectButton = root.querySelector('[data-cp-upload-select]');
      var fileInput = root.querySelector('[data-cp-upload-input]');
      var startButton = root.querySelector('[data-cp-upload-start]');
      var list = root.querySelector('[data-cp-upload-list]');

      var self = this;
      var prevent = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
      };

      if (dropzone) {
        dropzone.addEventListener('dragover', prevent, false);
        dropzone.addEventListener('dragenter', prevent, false);
        dropzone.addEventListener('drop', function (ev) {
          prevent(ev);
          if (handlers && typeof handlers.onDrop === 'function' && ev.dataTransfer && ev.dataTransfer.files) {
            handlers.onDrop(ev.dataTransfer.files);
          }
        }, false);
        dropzone.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            if (handlers && typeof handlers.onOpenFileDialog === 'function') {
              handlers.onOpenFileDialog();
            }
          }
        }, false);
      }

      if (selectButton) {
        selectButton.addEventListener('click', function () {
          if (handlers && typeof handlers.onOpenFileDialog === 'function') {
            handlers.onOpenFileDialog();
          }
        }, false);
      }

      if (fileInput) {
        fileInput.addEventListener('change', function (ev) {
          var files = ev && ev.target ? ev.target.files : null;
          if (handlers && typeof handlers.onChoose === 'function') {
            handlers.onChoose(files);
          }
          ev.target.value = '';
        }, false);
      }

      if (startButton) {
        startButton.addEventListener('click', function () {
          if (handlers && typeof handlers.onStart === 'function') {
            handlers.onStart();
          }
        }, false);
      }

      if (list) {
        list.addEventListener('click', function (ev) {
          var target = ev.target.closest('[data-cp-upload-remove]');
          if (!target) return;
          var id = target.getAttribute('data-upload-id');
          if (handlers && typeof handlers.onRemove === 'function') {
            handlers.onRemove(id);
          }
        }, false);
      }

      this.toggleActions(root, false, false, this.service.config || {});
    }

    openInput(root)
    {
      var input = root ? root.querySelector('[data-cp-upload-input]') : null;
      if (input) {
        input.click();
      }
    }

    renderQueue(queue, isUploading, config)
    {
      var root = this.service.root;
      var text = (config && config.text) || {};
      var list = root ? root.querySelector('[data-cp-upload-list]') : null;
      var empty = root ? root.querySelector('[data-cp-upload-empty]') : null;
      var hasItems = queue && queue.length > 0;
      if (empty) {
        if (hasItems) {
          empty.setAttribute('hidden', 'hidden');
        } else {
          empty.removeAttribute('hidden');
        }
      }
      this.toggleActions(root, hasItems, isUploading, config || {});
      if (!list) return;
      list.innerHTML = '';
      for (var i = 0; i < queue.length; i++) {
        var item = queue[i];
        if (!item) continue;
        var percent = this.calcPercent(item);
        var statusText = this.getStatusText(item, text);
        var sizeLabel = this.formatBytes(item.size);
        var disableRemove = isUploading && item.status === 'uploading';
        var itemClass = 'content-uploader__item' + (item.status === 'error' ? ' is-error' : '');
        var progressClass = 'content-uploader__progress' + (item.status === 'done' ? ' is-complete' : '');
        var html = '' +
          '<li class="' + itemClass + '" data-upload-id="' + this.escapeHtml(item.id) + '">' +
            '<div class="content-uploader__item-header">' +
              '<div class="content-uploader__item-info">' +
                '<p class="content-uploader__item-name">' + this.escapeHtml(item.name) + '</p>' +
                '<p class="content-uploader__item-meta">' + this.escapeHtml(sizeLabel) + '</p>' +
              '</div>' +
              '<button type="button" class="content-uploader__remove" data-cp-upload-remove data-upload-id="' + this.escapeHtml(item.id) + '"' + (disableRemove ? ' disabled="disabled"' : '') + '>' +
                '<span aria-hidden="true">×</span>' +
                '<span class="visually-hidden">削除</span>' +
              '</button>' +
            '</div>' +
            '<div class="' + progressClass + '" data-upload-progress>' +
              '<div class="content-uploader__progress-bar" data-upload-progress-bar style="width:' + percent + '%;"></div>' +
            '</div>' +
            '<p class="content-uploader__status" data-upload-status>' + this.escapeHtml(statusText) + '</p>' +
          '</li>';
        list.insertAdjacentHTML('beforeend', html);
      }
    }

    updateQueueItem(item)
    {
      var root = this.service.root;
      var text = (this.service.config && this.service.config.text) || {};
      var list = root ? root.querySelector('[data-cp-upload-list]') : null;
      if (!list) return;
      var row = list.querySelector('[data-upload-id="' + this.escapeCss(item.id) + '"]');
      if (!row) return;
      var percent = this.calcPercent(item);
      var statusText = this.getStatusText(item, text);
      var progress = row.querySelector('[data-upload-progress]');
      if (progress) {
        progress.classList.toggle('is-complete', item.status === 'done');
      }
      var bar = row.querySelector('[data-upload-progress-bar]');
      if (bar) {
        bar.style.width = String(percent) + '%';
      }
      var status = row.querySelector('[data-upload-status]');
      if (status) {
        status.textContent = statusText;
      }
    }

    toggleActions(root, hasItems, isUploading, config)
    {
      var startButton = root ? root.querySelector('[data-cp-upload-start]') : null;
      var actions = root ? root.querySelector('[data-cp-upload-actions]') : null;
      if (actions) {
        if (hasItems) {
          actions.classList.add('is-visible');
        } else {
          actions.classList.remove('is-visible');
        }
      }
      if (startButton) {
        var text = (config && config.text) || {};
        var defaultLabel = text.startButton || 'アップロードを開始';
        var uploadingLabel = text.startButtonInProgress || 'アップロード中…';
        startButton.disabled = !hasItems || isUploading;
        startButton.textContent = isUploading ? uploadingLabel : defaultLabel;
        if (startButton.disabled) {
          startButton.setAttribute('disabled', 'disabled');
        } else {
          startButton.removeAttribute('disabled');
        }
      }
    }

    calcPercent(item)
    {
      var total = (item && typeof item.total === 'number' && item.total > 0) ? item.total : (item && typeof item.size === 'number' ? item.size : 0);
      var loaded = item && typeof item.uploaded === 'number' ? item.uploaded : 0;
      if (!total) {
        return item && item.status === 'done' ? 100 : 0;
      }
      var percent = Math.round((loaded / total) * 100);
      if (percent < 0) percent = 0;
      if (percent > 100) percent = 100;
      return percent;
    }

    getStatusText(item, text)
    {
      if (!item) return '';
      if (item.status === 'uploading') {
        var total = (item && typeof item.total === 'number' && item.total > 0) ? item.total : (item && typeof item.size === 'number' ? item.size : 0);
        var loaded = typeof item.uploaded === 'number' ? item.uploaded : 0;
        var percent = this.calcPercent(item);
        var detail = '';
        if (total || loaded) {
          var totalLabel = total ? this.formatBytes(total) : this.formatBytes(loaded);
          detail = this.formatBytes(loaded) + ' / ' + totalLabel + ' (' + percent + '%)';
        }
        var uploadingText = (text && text.uploading) ? text.uploading : '';
        return detail ? (uploadingText ? (uploadingText + ' ' + detail) : detail) : uploadingText;
      }
      if (item.status === 'done') {
        return (text && text.done) ? text.done : '';
      }
      if (item.status === 'error') {
        return item.errorMessage || (text && text.error) || '';
      }
      return (text && text.pending) ? text.pending : '';
    }

    formatBytes(bytes)
    {
      var size = typeof bytes === 'number' && bytes > 0 ? bytes : 0;
      var units = ['B', 'KB', 'MB', 'GB'];
      var unitIndex = 0;
      var value = size;
      while (value >= 1024 && unitIndex < units.length - 1) {
        value = value / 1024;
        unitIndex += 1;
      }
      var fixed = unitIndex === 0 ? value.toFixed(0) : (value >= 10 ? value.toFixed(0) : value.toFixed(1));
      return fixed + ' ' + units[unitIndex];
    }

    escapeHtml(text)
    {
      return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    escapeCss(text)
    {
      return String(text || '').replace(/"/g, '\\"');
    }
  }

  window.Services = window.Services || {};
  window.Services.ContentUploader = window.Services.ContentUploader || {};
  window.Services.ContentUploader.JobDom = JobDom;

})();
