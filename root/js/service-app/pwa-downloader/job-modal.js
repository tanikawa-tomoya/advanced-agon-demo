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
      var id = (opts && opts.id) ? String(opts.id) : ('pwa-downloader-' + Date.now());
      var ariaLabel = (opts && opts.ariaLabel) || 'Download progress';
      var titleText = (opts && typeof opts.title !== 'undefined') ? String(opts.title) : 'ダウンロード';
      var subtitleText = (opts && typeof opts.subtitle !== 'undefined') ? String(opts.subtitle) : '';
      var selectLabel = (opts && typeof opts.selectButtonLabel !== 'undefined') ? String(opts.selectButtonLabel) : 'コンテンツを選択';
      var plannedLabel = (opts && typeof opts.plannedLabel !== 'undefined') ? String(opts.plannedLabel) : 'ダウンロード予定';

      var root = document.createElement('div');
      root.className = 'c-pwa-downloader';
      root.id = id;
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-label', ariaLabel);

      var backdrop = document.createElement('div');
      backdrop.className = 'c-pwa-downloader__backdrop';

      var panel = document.createElement('div');
      panel.className = 'c-pwa-downloader__panel';
      panel.setAttribute('tabindex', '-1');

      var header = document.createElement('div');
      header.className = 'c-pwa-downloader__header';

      var headerMeta = document.createElement('div');
      headerMeta.className = 'c-pwa-downloader__header-meta';

      var title = document.createElement('h2');
      title.className = 'c-pwa-downloader__title';
      title.textContent = titleText;

      var subtitle = document.createElement('p');
      subtitle.className = 'c-pwa-downloader__subtitle';
      subtitle.textContent = subtitleText;
      if (!subtitleText) subtitle.style.display = 'none';

      headerMeta.appendChild(title);
      headerMeta.appendChild(subtitle);

      var selectButton = document.createElement('button');
      selectButton.type = 'button';
      selectButton.className = 'c-pwa-downloader__select';
      selectButton.textContent = selectLabel;
      selectButton.setAttribute('data-pwa-download-action', 'select');

      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'c-pwa-downloader__close';
      closeBtn.setAttribute('aria-label', '閉じる');
      closeBtn.innerHTML = '&times;';

      header.appendChild(headerMeta);
      header.appendChild(selectButton);
      header.appendChild(closeBtn);

      var body = document.createElement('div');
      body.className = 'c-pwa-downloader__body';

      var sectionHeader = document.createElement('div');
      sectionHeader.className = 'c-pwa-downloader__section-header';

      var planned = document.createElement('span');
      planned.className = 'c-pwa-downloader__section-title';
      planned.textContent = plannedLabel;

      sectionHeader.appendChild(planned);

      var table = document.createElement('table');
      table.className = 'c-pwa-downloader__table';

      var thead = document.createElement('thead');
      var headRow = document.createElement('tr');
      headRow.className = 'c-pwa-downloader__head-row';

      var thName = document.createElement('th');
      thName.textContent = 'タイトル';
      thName.className = 'c-pwa-downloader__head c-pwa-downloader__head--title';

      var thProgress = document.createElement('th');
      thProgress.textContent = '進捗率';
      thProgress.className = 'c-pwa-downloader__head c-pwa-downloader__head--progress';

      var thActions = document.createElement('th');
      thActions.textContent = '操作';
      thActions.className = 'c-pwa-downloader__head c-pwa-downloader__head--actions';

      headRow.appendChild(thName);
      headRow.appendChild(thProgress);
      headRow.appendChild(thActions);
      thead.appendChild(headRow);

      var tbody = document.createElement('tbody');
      tbody.className = 'c-pwa-downloader__body-rows';

      table.appendChild(thead);
      table.appendChild(tbody);

      body.appendChild(sectionHeader);
      body.appendChild(table);

      panel.appendChild(header);
      panel.appendChild(body);

      root.appendChild(backdrop);
      root.appendChild(panel);

      root.__pwaDownloader = {
        opts: {
          dismissOnBackdrop: !!(opts && opts.dismissOnBackdrop),
          dismissOnEsc: !!(opts && opts.dismissOnEsc)
        },
        nodes: {
          backdrop: backdrop,
          panel: panel,
          title: title,
          subtitle: subtitle,
          selectButton: selectButton,
          tableBody: tbody,
          closeBtn: closeBtn
        },
        files: {},
        fileOrder: []
      };

      this.replaceFiles(root, (opts && opts.files) || []);

      return root;
    }

    bindInteractions(root, handlers)
    {
      if (!root) return;
      var dm = root.__pwaDownloader || (root.__pwaDownloader = {});
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

      var onSelect = function (ev) {
        if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
        if (handlers && typeof handlers.onSelectContents === 'function') handlers.onSelectContents();
      };

      var onActionClick = function (ev) {
        var target = ev && ev.target ? ev.target.closest('[data-pwa-download-action]') : null;
        if (!target) return;
        var action = target.getAttribute('data-pwa-download-action');
        var fileId = target.getAttribute('data-pwa-download-id');
        if (!action || !fileId) return;
        if (action === 'play' && handlers && typeof handlers.onPlay === 'function') {
          handlers.onPlay(fileId);
          return;
        }
        if (action === 'pause' && handlers && typeof handlers.onPause === 'function') {
          handlers.onPause(fileId);
          return;
        }
        if (action === 'remove' && handlers && typeof handlers.onRemove === 'function') {
          handlers.onRemove(fileId);
          return;
        }
      };

      root.addEventListener('click', onBackdrop, true);
      if (nodes.closeBtn) nodes.closeBtn.addEventListener('click', onClose, true);
      document.addEventListener('keydown', onKeydown, true);
      if (nodes.selectButton) nodes.selectButton.addEventListener('click', onSelect, true);
      if (nodes.tableBody) nodes.tableBody.addEventListener('click', onActionClick, true);

      dm.handlers = { onBackdrop: onBackdrop, onClose: onClose, onKeydown: onKeydown, onSelect: onSelect, onActionClick: onActionClick };

      if (nodes.panel) {
        w.requestAnimationFrame(function () {
          nodes.panel.focus();
        });
      }
    }

    replaceFiles(root, files)
    {
      if (!root) return;
      var dm = root.__pwaDownloader || (root.__pwaDownloader = {});
      var nodes = dm.nodes || {};
      var tableBody = nodes.tableBody;
      if (!tableBody) return;

      tableBody.innerHTML = '';
      dm.files = {};
      dm.fileOrder = [];

      if (!files || !files.length) {
        var empty = document.createElement('tr');
        empty.className = 'c-pwa-downloader__empty-row';
        var td = document.createElement('td');
        td.colSpan = 3;
        td.className = 'c-pwa-downloader__empty-cell';
        td.textContent = 'ダウンロード対象がありません';
        empty.appendChild(td);
        tableBody.appendChild(empty);
        return;
      }

      for (var i = 0; i < files.length; i++) {
        var item = this.createFileItem(files[i]);
        dm.files[item.__pwaDownload.state.id] = item;
        dm.fileOrder.push(item.__pwaDownload.state.id);
        tableBody.appendChild(item);
      }
    }

    createFileItem(file)
    {
      var data = Object.assign({ id: '', name: '', downloadedBytes: 0, totalBytes: 0 }, file || {});
      var item = document.createElement('tr');
      item.className = 'c-pwa-downloader__row';
      item.setAttribute('data-pwa-download-id', data.id);

      var nameCell = document.createElement('td');
      nameCell.className = 'c-pwa-downloader__cell c-pwa-downloader__cell--title';

      var name = document.createElement('div');
      name.className = 'c-pwa-downloader__name';
      name.textContent = data.name || 'File';

      var statusRow = document.createElement('div');
      statusRow.className = 'c-pwa-downloader__status-row';

      var status = document.createElement('span');
      status.className = 'c-pwa-downloader__status';
      status.textContent = this.buildStatusLabel(data);

      var resume = document.createElement('span');
      resume.className = 'c-pwa-downloader__badge';
      resume.textContent = 'レジューム';
      resume.style.display = this.shouldShowResume(data) ? '' : 'none';

      var size = document.createElement('span');
      size.className = 'c-pwa-downloader__size';
      size.textContent = this.buildSizeLabel(data);

      statusRow.appendChild(status);
      statusRow.appendChild(resume);
      statusRow.appendChild(size);

      nameCell.appendChild(name);
      nameCell.appendChild(statusRow);

      var progressCell = document.createElement('td');
      progressCell.className = 'c-pwa-downloader__cell c-pwa-downloader__cell--progress';

      var progress = document.createElement('div');
      progress.className = 'c-pwa-downloader__progress';

      var track = document.createElement('div');
      track.className = 'c-pwa-downloader__progress-track';

      var bar = document.createElement('div');
      bar.className = 'c-pwa-downloader__progress-bar';
      var pct = this.calcPercent(data);
      bar.style.width = pct + '%';

      track.appendChild(bar);
      progress.appendChild(track);

      var metaRow = document.createElement('div');
      metaRow.className = 'c-pwa-downloader__meta';

      var percent = document.createElement('span');
      percent.className = 'c-pwa-downloader__percent';
      percent.textContent = this.formatPercent(pct);

      var rate = document.createElement('span');
      rate.className = 'c-pwa-downloader__rate';
      rate.textContent = this.formatRate(data);

      metaRow.appendChild(percent);
      metaRow.appendChild(rate);

      progress.appendChild(metaRow);
      progressCell.appendChild(progress);

      var actions = document.createElement('td');
      actions.className = 'c-pwa-downloader__cell c-pwa-downloader__cell--actions';

      var play = document.createElement('button');
      play.type = 'button';
      play.className = 'c-pwa-downloader__action-button c-pwa-downloader__action-button--play';
      play.setAttribute('data-pwa-download-action', 'play');
      play.setAttribute('data-pwa-download-id', data.id);
      play.textContent = '開始';

      var pause = document.createElement('button');
      pause.type = 'button';
      pause.className = 'c-pwa-downloader__action-button c-pwa-downloader__action-button--pause';
      pause.setAttribute('data-pwa-download-action', 'pause');
      pause.setAttribute('data-pwa-download-id', data.id);
      pause.textContent = '一時停止';

      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'c-pwa-downloader__action-button c-pwa-downloader__action-button--remove';
      remove.setAttribute('data-pwa-download-action', 'remove');
      remove.setAttribute('data-pwa-download-id', data.id);
      remove.textContent = '削除';

      actions.appendChild(play);
      actions.appendChild(pause);
      actions.appendChild(remove);

      item.appendChild(nameCell);
      item.appendChild(progressCell);
      item.appendChild(actions);

      item.__pwaDownload = {
        nodes: { name: name, size: size, bar: bar, percent: percent, rate: rate, status: status, resume: resume },
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
      var dm = root.__pwaDownloader || (root.__pwaDownloader = {});
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
      var dm = root.__pwaDownloader || {};
      var files = dm.files || {};
      var node = files[String(fileId)];
      if (!node || !node.__pwaDownload) return false;

      var state = node.__pwaDownload.state;
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
      if (!node || !node.__pwaDownload) return;
      var refs = node.__pwaDownload.nodes || {};
      var state = node.__pwaDownload.state || {};
      var pct = this.calcPercent(state);

      if (refs.name) refs.name.textContent = state.name || 'File';
      if (refs.status) refs.status.textContent = this.buildStatusLabel(state);
      if (refs.resume) refs.resume.style.display = this.shouldShowResume(state) ? '' : 'none';
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

    buildStatusLabel(data)
    {
      var status = (data && typeof data.status === 'string') ? data.status.trim() : '';
      if (status) return status;
      if (this.shouldShowResume(data)) {
        return 'レジューム中';
      }
      return '待機中';
    }

    shouldShowResume(data)
    {
      if (!data) return false;
      var downloaded = Number(data.downloadedBytes) || 0;
      var total = Number(data.totalBytes) || 0;
      return downloaded > 0 && (total === 0 || downloaded < total);
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
      var dm = root.__pwaDownloader || {};
      var nodes = dm.nodes || {};
      var handlers = dm.handlers || {};

      if (handlers.onBackdrop) root.removeEventListener('click', handlers.onBackdrop, true);
      if (nodes.closeBtn && handlers.onClose) nodes.closeBtn.removeEventListener('click', handlers.onClose, true);
      if (handlers.onKeydown) document.removeEventListener('keydown', handlers.onKeydown, true);
      if (nodes.selectButton && handlers.onSelect) nodes.selectButton.removeEventListener('click', handlers.onSelect, true);
      if (nodes.tableBody && handlers.onActionClick) nodes.tableBody.removeEventListener('click', handlers.onActionClick, true);

      if (root.parentNode) root.parentNode.removeChild(root);
    }

    exportFiles(root)
    {
      if (!root) return [];
      var dm = root.__pwaDownloader || {};
      var map = dm.files || {};
      var order = (dm.fileOrder && dm.fileOrder.length) ? dm.fileOrder.slice() : Object.keys(map);
      var list = [];
      for (var i = 0; i < order.length; i++) {
        var node = map[order[i]];
        if (node && node.__pwaDownload && node.__pwaDownload.state) {
          list.push(Object.assign({}, node.__pwaDownload.state));
        }
      }
      return list;
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.PwaDownloader || (Services.PwaDownloader = {});
  NS.JobModal = NS.JobModal || JobModal;

})(window, document);
