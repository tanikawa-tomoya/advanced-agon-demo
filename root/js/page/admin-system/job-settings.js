(function (window, document) {
  'use strict';

  function createElement(tagName, className, text)
  {
    var el = document.createElement(tagName);
    if (className) {
      el.className = className;
    }
    if (typeof text === 'string') {
      el.textContent = text;
    }
    return el;
  }

  class JobSettings
  {
    constructor(pageInstance)
    {
      this.pageInstance = pageInstance;
      this.dom = {
        body: document.querySelector(pageInstance.selectorConfig.settingsTableBody),
        feedback: document.querySelector(pageInstance.selectorConfig.settingsFeedback),
        refresh: document.querySelector(pageInstance.selectorConfig.settingsRefresh)
      };
    }

    async run()
    {
      if (!this.dom.body) {
        return;
      }
      this._decorateRefreshButton();
      this._bindEvents();
      await this.refresh({ showToast: false });
    }

    _bindEvents() {
      var self = this;
      this.dom.body.addEventListener('input', function (event) {
        var target = event.target;
        if (!target || target.tagName !== 'INPUT') {
          return;
        }
        var row = target.closest('tr[data-setting-key]');
        if (!row) {
          return;
        }
        self._updateDirtyState(row, target);
      });

      this.dom.body.addEventListener('click', function (event) {
        var target = event.target;
        var actionButton = target.closest('[data-action="save-setting"]');
        if (!actionButton) {
          return;
        }
        var row = actionButton.closest('tr[data-setting-key]');
        if (!row) {
          return;
        }
        event.preventDefault();
        self._submitRow(row);
      });

      if (this.dom.refresh) {
        this.dom.refresh.addEventListener('click', function (event) {
          event.preventDefault();
          self.refresh({ showToast: true });
        });
      }
    }

    async refresh(options) {
      var showToast = options && options.showToast === true;
      this._setBusy(true);
      this._renderFeedback('info', 'サイト設定を読み込んでいます…');
      try {
        var response = await this.pageInstance.callApi('SiteGet', {});
        var settings = this._normalizeSettings(response);
        this._renderRows(settings);
        this._renderFeedback('success', 'サイト設定を取得しました。');
        if (showToast) {
          this.pageInstance.showToast('サイト設定を取得しました。', 'success');
        }
      } catch (error) {
        console.error('[admin-system] failed to load settings:', error);
        this._renderRows([]);
        this._renderFeedback('error', 'サイト設定の取得に失敗しました。');
        this.pageInstance.showToast('サイト設定の取得に失敗しました。', 'error');
      } finally {
        this._setBusy(false);
      }
    }

    _decorateRefreshButton()
    {
      if (!this.dom.refresh || !this.pageInstance || typeof this.pageInstance.decorateRefreshButton !== 'function') {
        return;
      }
      var button = this.pageInstance.decorateRefreshButton(this.dom.refresh, {
        ariaLabel: 'サイト設定を再読み込み',
        title: '再読み込み'
      });
      if (button) {
        this.dom.refresh = button;
      }
    }

    _normalizeSettings(response) {
      var payload = response && (response.result || response.payload || response.data || response);
      var list = Array.isArray(payload) ? payload : Array.isArray(payload && payload.items) ? payload.items : [];
      return list.map(function (entry) {
        var key = typeof entry.key === 'string' ? entry.key : '';
        var value = typeof entry.value === 'string' ? entry.value : entry.value == null ? '' : String(entry.value);
        return key ? { key: key, value: value } : null;
      }).filter(Boolean).sort(function (a, b) {
        return a.key.localeCompare(b.key);
      });
    }

    _renderRows(settings) {
      var body = this.dom.body;
      body.innerHTML = '';
      if (!settings.length) {
        var emptyRow = document.createElement('tr');
        var cell = document.createElement('td');
        cell.colSpan = 3;
        cell.textContent = '登録されているサイト設定がありません。';
        emptyRow.appendChild(cell);
        body.appendChild(emptyRow);
        return;
      }

      var fragment = document.createDocumentFragment();
      for (var i = 0; i < settings.length; i += 1) {
        fragment.appendChild(this._createRow(settings[i]));
      }
      body.appendChild(fragment);
    }

    _createRow(setting) {
      var row = document.createElement('tr');
      row.className = 'system-settings__row';
      row.setAttribute('data-setting-key', setting.key);
      row.dataset.originalValue = setting.value || '';

      var heading = createElement('th', 'system-settings__row-heading', setting.key);
      heading.scope = 'row';
      heading.setAttribute('title', setting.key);

      var valueCell = createElement('td', 'system-settings__row-value');
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'system-settings__value-input';
      input.value = setting.value || '';
      input.setAttribute('data-setting-input', 'true');
      input.setAttribute('aria-label', setting.key + ' の値');
      input.autocomplete = 'off';
      valueCell.appendChild(input);

      var actionCell = createElement('td', 'system-settings__row-actions');
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'system-settings__save-button';
      button.setAttribute('data-action', 'save-setting');
      button.textContent = '保存';
      button.disabled = true;
      actionCell.appendChild(button);

      row.appendChild(heading);
      row.appendChild(valueCell);
      row.appendChild(actionCell);
      return row;
    }

    _updateDirtyState(row, input) {
      var current = input.value;
      var original = row.dataset.originalValue || '';
      var isDirty = current !== original && row.dataset.busy !== 'true';
      var button = row.querySelector('[data-action="save-setting"]');
      if (button) {
        button.disabled = !isDirty;
      }
      row.classList.toggle('is-dirty', isDirty);
    }

    _setBusy(busy) {
      if (!this.dom.body) {
        return;
      }
      this.dom.body.setAttribute('aria-busy', busy ? 'true' : 'false');
    }

    async _submitRow(row) {
      if (!row) {
        return;
      }
      var key = row.getAttribute('data-setting-key');
      var input = row.querySelector('[data-setting-input]');
      var button = row.querySelector('[data-action="save-setting"]');
      if (!key || !input || !button) {
        return;
      }
      var value = input.value;
      row.dataset.busy = 'true';
      button.disabled = true;
      button.textContent = '保存中…';
      try {
        await this.pageInstance.callApi('SiteSettingSave', { key: key, value: value });
        row.dataset.originalValue = value;
        this._updateDirtyState(row, input);
        this.pageInstance.showToast('「' + key + '」を保存しました。', 'success');
      } catch (error) {
        console.error('[admin-system] failed to save setting:', error);
        this.pageInstance.showToast('設定の保存に失敗しました。', 'error');
        this._updateDirtyState(row, input);
      } finally {
        row.dataset.busy = 'false';
        button.textContent = '保存';
      }
    }

    _renderFeedback(type, message) {
      var box = this.dom.feedback;
      if (!box) {
        return;
      }
      box.classList.remove('is-error', 'is-info', 'is-success');
      var className = type === 'error' ? 'is-error' : type === 'success' ? 'is-success' : 'is-info';
      box.classList.add(className);
      box.textContent = message;
      box.removeAttribute('hidden');
    }
  }

  window.AdminSystem = window.AdminSystem || {};
  window.AdminSystem.JobSettings = JobSettings;
})(window, document);
