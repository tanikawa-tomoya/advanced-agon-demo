(function (window, document) {
  'use strict';

  function formatDate(value)
  {
    if (!value) { return '―'; }
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) { return value; }
      return d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0') + ' ' +
        String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    } catch (err) {
      return value;
    }
  }

  class JobRules
  {
    constructor(pageInstance)
    {
      this.page = pageInstance;
      const sel = pageInstance.selectorConfig || {};
      this.tableBody = document.querySelector(sel.tableBody);
      this.feedback = document.querySelector(sel.feedback);
      this.updated = document.querySelector(sel.updatedAt);
      this.filterForm = document.querySelector(sel.filterForm);
      this.filterType = document.querySelector(sel.filterType);
      this.filterLevel = document.querySelector(sel.filterLevel);
      this.filterGroup = document.querySelector(sel.filterGroup);
      this.refreshButton = document.querySelector(sel.refreshButton);
      this.policyApplyButton = document.querySelector(sel.policyApply);
    }

    async run()
    {
      this._bindEvents();
      await this.refresh();
    }

    _bindEvents()
    {
      if (this.filterForm) {
        this.filterForm.addEventListener('submit', this._handleFilterSubmit.bind(this));
      }
      if (this.refreshButton) {
        this.refreshButton.addEventListener('click', this.refresh.bind(this));
      }
      if (this.tableBody) {
        this.tableBody.addEventListener('click', this._handleAction.bind(this));
      }
      if (this.policyApplyButton) {
        var policyButton = this.page.decorateActionButton(this.policyApplyButton, { label: 'ポリシーを適用' }) || this.policyApplyButton;
        policyButton.addEventListener('click', this._handlePolicyApply.bind(this));
        this.policyApplyButton = policyButton;
      }
    }

    async _handleFilterSubmit(event)
    {
      event.preventDefault();
      await this.refresh();
    }

    async refresh()
    {
      this._setFeedback('');
      this.page.showLoading('アクセスルールを取得しています…');
      try {
        const filters = this._collectFilters();
        const response = await this.page.callApi('ContentAccessList', filters);
        const items = (response && response.items) || [];
        this._renderTable(items);
        this._renderUpdatedAt(response && response.updatedAt);
        if (!items.length) {
          this._setFeedback('条件に一致するルールがありません。フィルターを調整してください。');
        }
      } catch (err) {
        console.error('[AdminContentsAccess:JobRules] failed to refresh rules:', err);
        this._renderTable([]);
        this._setFeedback('アクセスルールの取得に失敗しました。時間をおいて再度お試しください。');
      } finally {
        this.page.hideLoading();
      }
    }

    _renderTable(items)
    {
      if (!this.tableBody) {
        return;
      }
      this.tableBody.innerHTML = '';
      if (!items || !items.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 7;
        cell.textContent = '表示するルールがありません。';
        row.appendChild(cell);
        this.tableBody.appendChild(row);
        return;
      }

      for (let i = 0; i < items.length; i += 1) {
        const item = items[i] || {};
        const row = document.createElement('tr');
        row.setAttribute('data-rule-id', String(item.id || ''));

        row.appendChild(this._createCell(item.title || '名称未設定'));
        row.appendChild(this._createCell(item.category || ''));   
        row.appendChild(this._createAccessCell(item));
        row.appendChild(this._createAudienceCell(item));
        row.appendChild(this._createWindowCell(item));
        row.appendChild(this._createCell(item.updatedBy ? (item.updatedBy + ' / ' + formatDate(item.updatedAt)) : formatDate(item.updatedAt)));
        row.appendChild(this._createActionsCell(item));

        this.tableBody.appendChild(row);
      }
    }

    _createCell(text)
    {
      const cell = document.createElement('td');
      cell.textContent = text || '―';
      return cell;
    }

    _createAccessCell(item)
    {
      const cell = document.createElement('td');
      const select = document.createElement('select');
      select.className = 'contents-access__table-select';
      select.setAttribute('data-contents-access-select', 'access');
      select.innerHTML = [
        { value: 'public', label: '全員' },
        { value: 'restricted', label: '限定公開' },
        { value: 'private', label: '非公開' }
      ].map(function (opt) {
        const selected = opt.value === (item.accessLevel || 'restricted') ? ' selected' : '';
        return '<option value="' + opt.value + '"' + selected + '>' + opt.label + '</option>';
      }).join('');
      cell.appendChild(select);
      return cell;
    }

    _createAudienceCell(item)
    {
      const cell = document.createElement('td');
      const audiences = item.audiences || [];
      if (!audiences.length) {
        cell.textContent = '指定なし';
        return cell;
      }
      const list = document.createElement('ul');
      list.className = 'contents-access__audience-list';
      for (let i = 0; i < audiences.length; i += 1) {
        const a = audiences[i];
        const li = document.createElement('li');
        li.className = 'contents-access__audience-chip';
        li.textContent = a && a.label ? a.label : String(a || '');
        list.appendChild(li);
      }
      cell.appendChild(list);
      return cell;
    }

    _createWindowCell(item)
    {
      const cell = document.createElement('td');
      if (!item.window || (!item.window.start && !item.window.end)) {
        cell.textContent = '制限なし';
        return cell;
      }
      const start = formatDate(item.window.start || '');
      const end = formatDate(item.window.end || '');
      cell.textContent = start + ' 〜 ' + end;
      return cell;
    }

    _createActionsCell(item)
    {
      const cell = document.createElement('td');
      const saveButton = document.createElement('button');
      saveButton.type = 'button';
      saveButton.className = 'btn btn--ghost';
      saveButton.textContent = '変更を保存';
      saveButton.setAttribute('data-action', 'save-rule');
      saveButton.setAttribute('data-rule-id', String(item.id || ''));
      const decoratedSave = this.page.decorateActionButton(saveButton, { buttonType: 'expandable-icon-button/check', baseClass: 'btn btn--ghost', label: '変更を保存' }) || saveButton;

      const requestButton = document.createElement('button');
      requestButton.type = 'button';
      requestButton.className = 'btn btn--ghost';
      requestButton.textContent = '承認状況';
      requestButton.setAttribute('data-action', 'request-detail');
      requestButton.setAttribute('data-rule-id', String(item.id || ''));
      const decoratedRequest = this.page.decorateActionButton(requestButton, { buttonType: 'pill-button/outline', baseClass: 'btn btn--ghost', label: '承認状況' }) || requestButton;

      const wrapper = document.createElement('div');
      wrapper.className = 'contents-access__actions';
      wrapper.appendChild(decoratedSave);
      wrapper.appendChild(decoratedRequest);

      cell.appendChild(wrapper);
      return cell;
    }

    async _handleAction(event)
    {
      const target = event.target.closest('[data-action]');
      if (!target) {
        return;
      }
      const ruleId = target.getAttribute('data-rule-id');
      if (!ruleId) {
        return;
      }
      if (target.getAttribute('data-action') === 'save-rule') {
        await this._handleSave(ruleId, target);
      }
      if (target.getAttribute('data-action') === 'request-detail') {
        this.page.showToast('承認状況の確認は近日公開予定です。', 'info');
      }
    }

    async _handleSave(ruleId, button)
    {
      const row = button.closest('tr');
      if (!row) {
        return;
      }
      const select = row.querySelector('[data-contents-access-select="access"]');
      const accessLevel = select ? select.value : 'restricted';
      try {
        this.page.showLoading('アクセスルールを更新しています…');
        await this.page.callApi('ContentAccessUpdate', {
          ruleId: ruleId,
          accessLevel: accessLevel
        });
        this.page.showToast('アクセスルールを更新しました。', 'success');
        await this.refresh();
      } catch (err) {
        console.error('[AdminContentsAccess:JobRules] failed to save rule:', err);
        this.page.showToast('更新に失敗しました。もう一度お試しください。', 'error');
      } finally {
        this.page.hideLoading();
      }
    }

    async _handlePolicyApply(event)
    {
      if (event) { event.preventDefault(); }
      try {
        this.page.showLoading('ポリシーを適用しています…');
        await this.page.callApi('ContentAccessPolicyApply', { scope: 'default' });
        this.page.showToast('ポリシーを適用しました。', 'success');
        await this.refresh();
      } catch (err) {
        console.error('[AdminContentsAccess:JobRules] failed to apply policy:', err);
        this.page.showToast('ポリシーの適用に失敗しました。', 'error');
      } finally {
        this.page.hideLoading();
      }
    }

    _collectFilters()
    {
      return {
        type: this.filterType ? this.filterType.value : '',
        accessLevel: this.filterLevel ? this.filterLevel.value : '',
        group: this.filterGroup ? this.filterGroup.value : ''
      };
    }

    _setFeedback(message)
    {
      if (!this.feedback) {
        return;
      }
      this.feedback.textContent = message || '';
      if (message) {
        this.feedback.classList.remove('hidden');
      } else {
        this.feedback.classList.add('hidden');
      }
    }

    _renderUpdatedAt(value)
    {
      if (!this.updated) { return; }
      const text = value ? '最終更新: ' + formatDate(value) : '';
      this.updated.textContent = text;
    }
  }

  window.AdminContentsAccess = window.AdminContentsAccess || {};
  window.AdminContentsAccess.JobRules = JobRules;
})(window, document);
