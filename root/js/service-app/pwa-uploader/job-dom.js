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
      root.className = 'c-pwa-uploader';
      root.setAttribute('data-pwa-upload', '');
      root.innerHTML = this.buildTemplate(config || {});
      var input = root.querySelector('[data-pwa-upload-input]');
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
      var title = text && text.title ? text.title : '';
      var subtitle = text && text.subtitle ? text.subtitle : '';
      var drop = text && text.dropMessage ? text.dropMessage : '';
      var select = text && text.selectButton ? text.selectButton : '';
      var start = text && text.startButton ? text.startButton : '';
      var empty = text && text.emptyQueue ? text.emptyQueue : '';
      var queueActions = showStartButton
        ? '' +
          '<div class="c-pwa-uploader__queue-actions" data-pwa-upload-actions>' +
            '<button type="button" class="c-pwa-uploader__start" data-pwa-upload-start>' + this.escapeHtml(start) + '</button>' +
          '</div>'
        : '';
      return '' +
        '<div class="c-pwa-uploader__panel">' +
          '<div class="c-pwa-uploader__header">' +
            '<div class="c-pwa-uploader__titles">' +
              '<p class="c-pwa-uploader__title">' + this.escapeHtml(title) + '</p>' +
              '<p class="c-pwa-uploader__subtitle">' + this.escapeHtml(subtitle) + '</p>' +
            '</div>' +
            '<div class="c-pwa-uploader__controls">' +
              '<button type="button" class="c-pwa-uploader__select" data-pwa-upload-select>' + this.escapeHtml(select) + '</button>' +
              '<input type="file" class="c-pwa-uploader__input" data-pwa-upload-input aria-hidden="true" tabindex="-1" />' +
            '</div>' +
          '</div>' +
          '<div class="c-pwa-uploader__drop" data-pwa-upload-drop tabindex="0" role="button" aria-label="ファイルをアップロード">' +
            '<p class="c-pwa-uploader__drop-label">' + this.escapeHtml(drop) + '</p>' +
          '</div>' +
          '<div class="c-pwa-uploader__queue" data-pwa-upload-queue>' +
            '<p class="c-pwa-uploader__queue-empty" data-pwa-upload-empty>' + this.escapeHtml(empty) + '</p>' +
            '<ul class="c-pwa-uploader__queue-list" data-pwa-upload-list aria-live="polite" aria-label="アップロード待機中のファイル"></ul>' +
            queueActions +
          '</div>' +
        '</div>';
    }

    bindUI(root, handlers)
    {
      var dropzone = root.querySelector('[data-pwa-upload-drop]');
      var selectButton = root.querySelector('[data-pwa-upload-select]');
      var fileInput = root.querySelector('[data-pwa-upload-input]');
      var startButton = root.querySelector('[data-pwa-upload-start]');
      var list = root.querySelector('[data-pwa-upload-list]');

      var self = this;
      var prevent = function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
      };

      if (dropzone) {
        dropzone.addEventListener('dragover', prevent, false);
        dropzone.addEventListener('dragenter', function (ev) {
          prevent(ev);
          dropzone.classList.add('is-hover');
        }, false);
        dropzone.addEventListener('dragleave', function (ev) {
          prevent(ev);
          dropzone.classList.remove('is-hover');
        }, false);
        dropzone.addEventListener('drop', function (ev) {
          prevent(ev);
          dropzone.classList.remove('is-hover');
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
          var target = ev.target.closest('[data-pwa-upload-remove]');
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
      var input = root ? root.querySelector('[data-pwa-upload-input]') : null;
      if (input) {
        input.click();
      }
    }

    renderQueue(queue, isUploading, config)
    {
      var root = this.service.root;
      var text = (config && config.text) || {};
      var list = root ? root.querySelector('[data-pwa-upload-list]') : null;
      var empty = root ? root.querySelector('[data-pwa-upload-empty]') : null;
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
        var itemClass = 'c-pwa-uploader__item' + (item.status === 'error' ? ' is-error' : '');
        var progressClass = 'c-pwa-uploader__progress' + (item.status === 'done' ? ' is-complete' : '');
        var html = '' +
          '<li class="' + itemClass + '" data-upload-id="' + this.escapeHtml(item.id) + '">' +
            '<div class="c-pwa-uploader__item-header">' +
              '<div class="c-pwa-uploader__item-info">' +
                '<p class="c-pwa-uploader__item-name">' + this.escapeHtml(item.name) + '</p>' +
                '<p class="c-pwa-uploader__item-meta">' + this.escapeHtml(sizeLabel) + '</p>' +
              '</div>' +
              '<button type="button" class="c-pwa-uploader__remove" data-pwa-upload-remove data-upload-id="' + this.escapeHtml(item.id) + '"' + (disableRemove ? ' disabled="disabled"' : '') + '>' +
                '<span aria-hidden="true">×</span>' +
                '<span class="visually-hidden">削除</span>' +
              '</button>' +
            '</div>' +
            '<div class="' + progressClass + '" data-upload-progress>' +
              '<div class="c-pwa-uploader__progress-bar" data-upload-progress-bar style="width:' + percent + '%;"></div>' +
            '</div>' +
            '<p class="c-pwa-uploader__status" data-upload-status>' + this.escapeHtml(statusText) + '</p>' +
          '</li>';
        list.insertAdjacentHTML('beforeend', html);
      }
    }

    updateQueueItem(item)
    {
      var root = this.service.root;
      var text = (this.service.config && this.service.config.text) || {};
      var list = root ? root.querySelector('[data-pwa-upload-list]') : null;
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
      var startButton = root ? root.querySelector('[data-pwa-upload-start]') : null;
      var actions = root ? root.querySelector('[data-pwa-upload-actions]') : null;
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
  window.Services.PwaUploader = window.Services.PwaUploader || {};
  window.Services.PwaUploader.JobDom = JobDom;

})();
