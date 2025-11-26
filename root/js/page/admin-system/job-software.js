(function (window, document) {
  'use strict';

  class JobSoftware
  {
    constructor(pageInstance)
    {
      this.pageInstance = pageInstance;
      this.dom = {
        body: document.querySelector(pageInstance.selectorConfig.softwareTableBody),
        feedback: document.querySelector(pageInstance.selectorConfig.softwareFeedback),
        refresh: document.querySelector(pageInstance.selectorConfig.softwareRefresh)
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
        this._renderFeedback('info', 'ソフトウェア情報を取得しています...');
      }
      try {
        var response = await this.pageInstance.callApi('SiteSoftwareVersionsGet', {});
        var payload = response && (response.result || response.payload || response.data || response);
        var entries = payload && Array.isArray(payload.entries) ? payload.entries : Array.isArray(payload) ? payload : [];
        this._renderRows(entries);
        this._clearFeedback();
        if (showProgress) {
          this.pageInstance.showToast('最新のソフトウェア情報を取得しました。', 'success');
        }
      } catch (error) {
        console.error('[admin-system] failed to load software versions:', error);
        this._renderRows([]);
        this._renderFeedback('error', 'ソフトウェア情報の取得に失敗しました。');
        this.pageInstance.showToast('ソフトウェア情報の取得に失敗しました。', 'error');
      }
    }

    _decorateRefreshButton()
    {
      if (!this.dom.refresh || !this.pageInstance || typeof this.pageInstance.decorateRefreshButton !== 'function') {
        return;
      }
      var button = this.pageInstance.decorateRefreshButton(this.dom.refresh, {
        ariaLabel: 'ソフトウェア情報を再読み込み',
        title: '再読み込み'
      });
      if (button) {
        this.dom.refresh = button;
      }
    }

    _renderRows(entries) {
      if (!this.dom.body) {
        return;
      }
      this.dom.body.innerHTML = '';
      var list = Array.isArray(entries) ? entries : [];
      if (!list.length) {
        var emptyRow = document.createElement('tr');
        var cell = document.createElement('td');
        cell.colSpan = 2;
        cell.textContent = 'ソフトウェア情報を取得できませんでした。';
        emptyRow.appendChild(cell);
        this.dom.body.appendChild(emptyRow);
        return;
      }
      var fragment = document.createDocumentFragment();
      list.forEach(function (entry) {
        var row = document.createElement('tr');
        row.className = 'system-settings__row';
        if (!entry || entry.success === false) {
          row.classList.add('is-error');
        }
        var nameCell = document.createElement('th');
        nameCell.scope = 'row';
        nameCell.className = 'system-settings__row-heading';
        nameCell.textContent = entry && entry.software ? entry.software : '—';
        var valueCell = document.createElement('td');
        valueCell.className = 'system-settings__row-value';
        var version = entry && entry.version ? entry.version : '';
        var details = entry && entry.details ? entry.details : '';
        var command = entry && entry.command ? entry.command : '';
        if (version) {
          var strong = document.createElement('strong');
          strong.textContent = version;
          valueCell.appendChild(strong);
        }
        if (details && details !== version) {
          var paragraph = document.createElement('p');
          paragraph.textContent = details;
          valueCell.appendChild(paragraph);
        }
        if (command) {
          var code = document.createElement('code');
          code.textContent = command;
          valueCell.appendChild(code);
        }
        row.appendChild(nameCell);
        row.appendChild(valueCell);
        fragment.appendChild(row);
      });
      this.dom.body.appendChild(fragment);
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
  window.AdminSystem.JobSoftware = JobSoftware;
})(window, document);
