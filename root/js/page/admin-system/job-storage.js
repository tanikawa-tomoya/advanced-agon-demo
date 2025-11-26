(function (window, document) {
  'use strict';

  function formatBytes(bytes)
  {
    if (!Number.isFinite(bytes)) {
      return '—';
    }
    var units = ['B', 'KB', 'MB', 'GB', 'TB'];
    var index = 0;
    var value = bytes;
    while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index += 1;
    }
    return value.toFixed(index === 0 ? 0 : 1) + ' ' + units[index];
  }

  class JobStorage
  {
    constructor(pageInstance)
    {
      this.pageInstance = pageInstance;
      this.dom = {
        total: document.querySelector(pageInstance.selectorConfig.storageTotal),
        userDatas: document.querySelector(pageInstance.selectorConfig.storageUserDatas),
        feedback: document.querySelector(pageInstance.selectorConfig.storageFeedback),
        refresh: document.querySelector(pageInstance.selectorConfig.storageRefresh)
      };
    }

    async run() {
      this._decorateRefreshButton();
      this._bindEvents();
      await this.refresh({ showProgress: false });
    }

    _bindEvents() {
      var self = this;
      if (this.dom.refresh) {
        this.dom.refresh.addEventListener('click', function (event) {
          event.preventDefault();
          self.refresh({ showProgress: true });
        });
      }
    }

    async refresh(options) {
      var showProgress = !options || options.showProgress !== false;
      if (showProgress) {
        this._renderFeedback('info', 'ストレージ使用量を計測しています...');
      }
      try {
        var response = await this.pageInstance.callApi('SiteStorageUsageGet', {});
        var data = response && (response.result || response.payload || response.data || response) || {};
        this._renderTotal(data);
        this._renderUserDatas(data.userDatas);
        this._clearFeedback();
        if (showProgress) {
          this.pageInstance.showToast('最新のストレージ使用量を取得しました。', 'success');
        }
      } catch (error) {
        console.error('[admin-system] failed to load storage usage:', error);
        this._renderFeedback('error', 'ストレージ使用量の取得に失敗しました。');
        this.pageInstance.showToast('ストレージ使用量の取得に失敗しました。', 'error');
        this._renderTotal(null);
        this._renderUserDatas([]);
      }
    }

    _decorateRefreshButton()
    {
      if (!this.dom.refresh || !this.pageInstance || typeof this.pageInstance.decorateRefreshButton !== 'function') {
        return;
      }
      var button = this.pageInstance.decorateRefreshButton(this.dom.refresh, {
        ariaLabel: 'ストレージ使用量を再読み込み',
        title: '再読み込み'
      });
      if (button) {
        this.dom.refresh = button;
      }
    }

    _renderTotal(data) {
      if (!this.dom.total) {
        return;
      }
      var label = '—';
      if (data && Number.isFinite(data.totalBytes)) {
        label = formatBytes(Number(data.totalBytes));
      } else if (data && typeof data.totalFormatted === 'string') {
        label = data.totalFormatted;
      }
      this.dom.total.textContent = label;
    }

    _renderUserDatas(userDatas) {
      if (!this.dom.userDatas) {
        return;
      }
      this.dom.userDatas.innerHTML = '';
      var list = Array.isArray(userDatas) ? userDatas : [];
      if (!list.length) {
        var emptyRow = document.createElement('tr');
        var emptyCell = document.createElement('td');
        emptyCell.colSpan = 2;
        emptyCell.textContent = 'UserData の使用量が取得できませんでした。';
        emptyRow.appendChild(emptyCell);
        this.dom.userDatas.appendChild(emptyRow);
        return;
      }
      var fragment = document.createDocumentFragment();
      list.forEach(function (userData) {
        var row = document.createElement('tr');
        var nameCell = document.createElement('th');
        nameCell.scope = 'row';
        nameCell.textContent = userData && userData.userId ? userData.userId : '—';
        var usageCell = document.createElement('td');
        var formatted = userData && typeof userData.formatted === 'string' ? userData.formatted : '';
        var bytes = Number.isFinite(userData && userData.bytes) ? Number(userData.bytes) : Number(userData && userData.size);
        var lines = [];
        if (formatted) {
          lines.push(formatted);
        }
        if (Number.isFinite(bytes)) {
          lines.push(formatBytes(bytes) + ' / ' + bytes.toLocaleString('ja-JP') + ' バイト');
        }
        usageCell.textContent = lines.length ? lines.join(' / ') : '—';
        row.appendChild(nameCell);
        row.appendChild(usageCell);
        fragment.appendChild(row);
      });
      this.dom.userDatas.appendChild(fragment);
    }

    _renderFeedback(type, message) {
      var box = this.dom.feedback;
      if (!box) {
        return;
      }
      box.textContent = message;
      box.classList.remove('is-error', 'is-info', 'is-success');
      var className = type === 'error' ? 'is-error' : type === 'success' ? 'is-success' : 'is-info';
      box.classList.add(className);
      box.removeAttribute('hidden');
    }

    _clearFeedback() {
      var box = this.dom.feedback;
      if (!box) {
        return;
      }
      box.textContent = '';
      box.classList.remove('is-error', 'is-info', 'is-success');
      box.setAttribute('hidden', 'hidden');
    }
  }

  window.AdminSystem = window.AdminSystem || {};
  window.AdminSystem.JobStorage = JobStorage;
})(window, document);
