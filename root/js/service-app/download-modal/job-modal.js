(function () {

  'use strict';

  var w = window;
  var Utils = w.Utils;

  function clamp(value, min, max)
  {
    value = Number(value);
    if (isNaN(value)) value = 0;
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  class JobModal
  {
    constructor(service)
    {
      this.service = service;
    }

    createModal(opts)
    {
      var id = (opts && opts.id) ? String(opts.id) : ('downloadmodal-' + Date.now());
      var ariaLabel = (opts && opts.ariaLabel) || 'Download progress';
      var titleText = (opts && typeof opts.title !== 'undefined') ? String(opts.title) : 'ダウンロード';
      var subtitleText = (opts && typeof opts.subtitle !== 'undefined') ? String(opts.subtitle) : '';

      var root = document.createElement('div');
      root.className = 'c-download-modal';
      root.id = id;
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-label', ariaLabel);

      var backdrop = document.createElement('div');
      backdrop.className = 'c-download-modal__backdrop';

      var panel = document.createElement('div');
      panel.className = 'c-download-modal__panel';
      panel.setAttribute('tabindex', '-1');

      var header = document.createElement('div');
      header.className = 'c-download-modal__header';

      var title = document.createElement('h2');
      title.className = 'c-download-modal__title';
      title.textContent = titleText;

      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'c-download-modal__close';
      closeBtn.setAttribute('aria-label', '閉じる');
      closeBtn.innerHTML = '&times;';

      header.appendChild(title);
      header.appendChild(closeBtn);

      var body = document.createElement('div');
      body.className = 'c-download-modal__body';

      var subtitle = document.createElement('p');
      subtitle.className = 'c-download-modal__subtitle';
      subtitle.textContent = subtitleText;
      if (!subtitleText) subtitle.style.display = 'none';
      body.appendChild(subtitle);

      var list = document.createElement('ul');
      list.className = 'c-download-modal__list';
      body.appendChild(list);

      panel.appendChild(header);
      panel.appendChild(body);

      root.appendChild(backdrop);
      root.appendChild(panel);

      root.__downloadModal = {
        opts: {
          dismissOnBackdrop: !!(opts && opts.dismissOnBackdrop),
          dismissOnEsc: !!(opts && opts.dismissOnEsc)
        },
        nodes: {
          backdrop: backdrop,
          panel: panel,
          title: title,
          subtitle: subtitle,
          list: list,
          closeBtn: closeBtn
        },
        files: {}
      };

      this.replaceFiles(root, (opts && opts.files) || []);

      return root;
    }

    bindInteractions(root, handlers)
    {
      if (!root) return;
      var dm = root.__downloadModal || (root.__downloadModal = {});
      var nodes = dm.nodes || {};
      var opts = dm.opts || {};

      var onBackdrop = function (ev) {
        if (!opts.dismissOnBackdrop) return;
        if (ev && ev.target && ev.target === nodes.backdrop) {
          if (handlers && typeof handlers.onRequestClose === 'function') handlers.onRequestClose();
        }
      };

      var onClose = function (ev) {
        if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
        if (handlers && typeof handlers.onRequestClose === 'function') handlers.onRequestClose();
      };

      var onKeydown = function (ev) {
        if (!ev) return;
        if (opts.dismissOnEsc && (ev.key === 'Escape' || ev.key === 'Esc' || ev.keyCode === 27)) {
          ev.stopPropagation();
          if (handlers && typeof handlers.onRequestClose === 'function') handlers.onRequestClose();
        }
      };

      root.addEventListener('click', onBackdrop, true);
      if (nodes.closeBtn) nodes.closeBtn.addEventListener('click', onClose, true);
      document.addEventListener('keydown', onKeydown, true);

      dm.handlers = { onBackdrop: onBackdrop, onClose: onClose, onKeydown: onKeydown };

      if (nodes.panel) {
        w.requestAnimationFrame(function () {
          nodes.panel.focus();
        });
      }
    }

    replaceFiles(root, files)
    {
      if (!root) return;
      var dm = root.__downloadModal || (root.__downloadModal = {});
      var nodes = dm.nodes || {};
      var list = nodes.list;
      if (!list) return;

      list.innerHTML = '';
      dm.files = {};

      if (!files || !files.length) {
        var empty = document.createElement('li');
        empty.className = 'c-download-modal__empty';
        empty.textContent = 'ダウンロード対象がありません';
        list.appendChild(empty);
        return;
      }

      for (var i = 0; i < files.length; i++) {
        var item = this.createFileItem(files[i]);
        dm.files[item.__download.state.id] = item;
        list.appendChild(item);
      }
    }

    createFileItem(file)
    {
      var data = Object.assign({ id: '', name: '', downloadedBytes: 0, totalBytes: 0 }, file || {});
      var item = document.createElement('li');
      item.className = 'c-download-modal__item';
      item.setAttribute('data-download-id', data.id);

      var meta = document.createElement('div');
      meta.className = 'c-download-modal__file-row';

      var name = document.createElement('span');
      name.className = 'c-download-modal__name';
      name.textContent = data.name || 'File';

      var size = document.createElement('span');
      size.className = 'c-download-modal__size';
      size.textContent = this.buildSizeLabel(data);

      meta.appendChild(name);
      meta.appendChild(size);

      var progress = document.createElement('div');
      progress.className = 'c-download-modal__progress';

      var track = document.createElement('div');
      track.className = 'c-download-modal__progress-track';

      var bar = document.createElement('div');
      bar.className = 'c-download-modal__progress-bar';
      var pct = this.calcPercent(data);
      bar.style.width = pct + '%';

      track.appendChild(bar);
      progress.appendChild(track);

      var metaRow = document.createElement('div');
      metaRow.className = 'c-download-modal__meta';

      var percent = document.createElement('span');
      percent.className = 'c-download-modal__percent';
      percent.textContent = this.formatPercent(pct);

      var rate = document.createElement('span');
      rate.className = 'c-download-modal__rate';
      rate.textContent = this.formatRate(data);

      metaRow.appendChild(percent);
      metaRow.appendChild(rate);

      progress.appendChild(metaRow);

      item.appendChild(meta);
      item.appendChild(progress);

      item.__download = {
        nodes: { name: name, size: size, bar: bar, percent: percent, rate: rate },
        state: {
          id: data.id,
          name: data.name || 'File',
          downloadedBytes: Number(data.downloadedBytes) || 0,
          totalBytes: Number(data.totalBytes) || 0,
          rate: data.rate,
          rateBytesPerSec: data.rateBytesPerSec,
          status: typeof data.status === 'string' ? data.status : '',
          progressPercent: (typeof data.progressPercent === 'number') ? data.progressPercent : null
        }
      };

      return item;
    }

    updateModal(root, updates)
    {
      if (!root || !updates) return;
      var dm = root.__downloadModal || (root.__downloadModal = {});
      var nodes = dm.nodes || {};

      if (Object.prototype.hasOwnProperty.call(updates, 'title') && nodes.title) {
        nodes.title.textContent = String(updates.title || '');
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'subtitle') && nodes.subtitle) {
        var text = String(updates.subtitle || '');
        nodes.subtitle.textContent = text;
        nodes.subtitle.style.display = text ? '' : 'none';
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'files')) {
        this.replaceFiles(root, updates.files || []);
      }
    }

    updateFile(root, fileId, updates)
    {
      if (!root || !fileId) return false;
      var dm = root.__downloadModal || {};
      var files = dm.files || {};
      var node = files[String(fileId)];
      if (!node || !node.__download) return false;

      var state = node.__download.state;
      if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
        state.name = String(updates.name || '');
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'downloadedBytes')) {
        state.downloadedBytes = Number(updates.downloadedBytes) || 0;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'totalBytes')) {
        state.totalBytes = Number(updates.totalBytes) || 0;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'rate')) {
        state.rate = updates.rate;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'rateBytesPerSec')) {
        state.rateBytesPerSec = updates.rateBytesPerSec;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'progressPercent')) {
        state.progressPercent = Number(updates.progressPercent);
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
        state.status = typeof updates.status === 'string' ? updates.status : '';
      }

      this.refreshFileNode(node);
      return true;
    }

    refreshFileNode(node)
    {
      if (!node || !node.__download) return;
      var refs = node.__download.nodes || {};
      var state = node.__download.state || {};
      var pct = this.calcPercent(state);

      if (refs.name) refs.name.textContent = state.name || 'File';
      if (refs.size) refs.size.textContent = this.buildSizeLabel(state);
      if (refs.bar) refs.bar.style.width = pct + '%';
      if (refs.percent) refs.percent.textContent = this.formatPercent(pct);
      if (refs.rate) refs.rate.textContent = this.formatRate(state);
    }

    calcPercent(data)
    {
      var pct;
      if (data && typeof data.progressPercent === 'number' && !isNaN(data.progressPercent)) {
        pct = data.progressPercent;
      } else {
        var total = Number(data && data.totalBytes);
        var downloaded = Number(data && data.downloadedBytes);
        total = isNaN(total) ? 0 : total;
        downloaded = isNaN(downloaded) ? 0 : downloaded;
        if (total > 0) {
          pct = (downloaded / total) * 100;
        } else {
          pct = downloaded > 0 ? 100 : 0;
        }
      }
      return clamp(pct, 0, 100);
    }

    formatPercent(value)
    {
      var num = clamp(value, 0, 100);
      var rounded = Math.round(num * 10) / 10;
      if (Math.abs(rounded - Math.round(rounded)) < 0.05) {
        return Math.round(rounded) + '%';
      }
      return rounded.toFixed(1) + '%';
    }

    buildSizeLabel(data)
    {
      var downloaded = Utils.formatBytes(Number(data && data.downloadedBytes) || 0);
      var total = Number(data && data.totalBytes) || 0;
      if (total > 0) {
        return downloaded + ' / ' + Utils.formatBytes(total);
      }
      return downloaded;
    }

    formatRate(data)
    {
      if (!data) return '-';
      if (typeof data.rate === 'string' && data.rate.trim()) {
        return data.rate.trim();
      }
      if (data.rateBytesPerSec !== null && typeof data.rateBytesPerSec !== 'undefined') {
        return Utils.formatBytes(Number(data.rateBytesPerSec) || 0) + '/s';
      }
      return '-';
    }

    removeModal(root)
    {
      if (!root) return;
      var dm = root.__downloadModal || {};
      var nodes = dm.nodes || {};
      var handlers = dm.handlers || {};

      if (handlers.onBackdrop) root.removeEventListener('click', handlers.onBackdrop, true);
      if (nodes.closeBtn && handlers.onClose) nodes.closeBtn.removeEventListener('click', handlers.onClose, true);
      if (handlers.onKeydown) document.removeEventListener('keydown', handlers.onKeydown, true);

      if (root.parentNode) root.parentNode.removeChild(root);
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.DownloadModal || (Services.DownloadModal = {});
  NS.JobModal = NS.JobModal || JobModal;

})(window, document);
