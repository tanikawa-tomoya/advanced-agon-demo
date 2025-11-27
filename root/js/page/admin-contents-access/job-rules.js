(function (window, document) {
  'use strict';

  const FALLBACK_ACCESS_LIST = [
    { id: 'access-001', contentsCode: 'contents-admin-001-01', userCode: 'admin-001', startDate: '2024-03-01 00:00', endDate: '', createdAt: '2024-02-28 09:00', updatedAt: '2024-03-05 12:00' },
    { id: 'access-002', contentsCode: 'contents-operator-001-01', userCode: 'operator-001', startDate: '2024-03-05 00:00', endDate: '2024-05-31 23:59', createdAt: '2024-03-01 12:00', updatedAt: '2024-03-06 08:30' },
    { id: 'access-003', contentsCode: 'contents-user-001-02', userCode: 'user-001', startDate: '2024-03-10 09:00', endDate: '', createdAt: '2024-03-09 18:00', updatedAt: '2024-03-12 10:15' },
    { id: 'access-004', contentsCode: 'contents-user-002-01', userCode: 'user-002', startDate: '', endDate: '2024-04-30 23:59', createdAt: '2024-03-11 11:00', updatedAt: '2024-03-13 16:45' },
    { id: 'access-005', contentsCode: 'contents-operator-002-03', userCode: 'operator-002', startDate: '2024-03-15 00:00', endDate: '2024-03-31 23:59', createdAt: '2024-03-12 09:10', updatedAt: '2024-03-15 09:10' }
  ];

  function formatDate(value)
  {
    if (!value) { return '―'; }
    try {
      const d = new Date(value.replace(/-/g, '/'));
      if (Number.isNaN(d.getTime())) { return value; }
      return d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0') + ' ' +
        String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    } catch (err) {
      return value;
    }
  }

  function toLower(value)
  {
    return (value || '').toString().toLowerCase();
  }

  function parseDate(value)
  {
    if (!value) { return null; }
    const parsed = new Date(value.replace(/-/g, '/'));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  class JobRules
  {
    constructor(pageInstance)
    {
      this.page = pageInstance;
      const sel = pageInstance.selectorConfig || {};
      this.tableBody = document.querySelector(sel.tableBody);
      this.feedback = document.querySelector(sel.feedback);
      this.summary = document.querySelector(sel.summary);
      this.filterForm = document.querySelector(sel.filterForm);
      this.keyword = document.querySelector(sel.keyword);
      this.state = document.querySelector(sel.state);
      this.actionsHost = document.querySelector(sel.actions);
      this.formHost = document.querySelector(sel.formHost);
      this.formJob = this.page && this.page.formJob ? this.page.formJob : null;
      this.records = [];
      this.filtered = [];
      this._handleFormCreated = this._handleFormCreated.bind(this);
    }

    async run()
    {
      this._renderActions();
      this._bindEvents();
      this._decorateFilterButton();
      this._bindFormEvents();
      await this.refresh();
    }

    _bindFormEvents()
    {
      document.addEventListener('contentsAccess:created', this._handleFormCreated);
    }

    _renderActions()
    {
      if (!this.actionsHost)
      {
        return;
      }

      const svc = this.page.buttonService;
      const createLabel = '新規追加';
      const reloadLabel = '再読み込み';

      this.actionsHost.innerHTML = '';

      if (svc && typeof svc.createActionButton === 'function')
      {
        const createButton = svc.createActionButton('expandable-icon-button/add', {
          baseClass: 'target-management__icon-button target-management__icon-button--primary user-management__add',
          label: createLabel,
          ariaLabel: createLabel,
          hoverLabel: createLabel,
          type: 'button',
          dataset: { action: 'create-access' }
        });

        const reloadButton = svc.createActionButton('expandable-icon-button/reload', {
          baseClass: 'target-management__icon-button target-management__icon-button--ghost user-management__reload',
          label: reloadLabel,
          ariaLabel: reloadLabel,
          hoverLabel: reloadLabel,
          type: 'button',
          dataset: { action: 'refresh-access' }
        });

        createButton.addEventListener('click', this._handleCreate.bind(this));
        reloadButton.addEventListener('click', this.refresh.bind(this));

        this.actionsHost.appendChild(createButton);
        this.actionsHost.appendChild(reloadButton);
        return;
      }

      const createBtn = document.createElement('button');
      createBtn.type = 'button';
      createBtn.className = 'btn';
      createBtn.textContent = createLabel;
      createBtn.setAttribute('data-action', 'create-access');

      const reloadBtn = document.createElement('button');
      reloadBtn.type = 'button';
      reloadBtn.className = 'btn btn--ghost';
      reloadBtn.textContent = reloadLabel;
      reloadBtn.setAttribute('data-action', 'refresh-access');

      const decoratedCreate = this.page.decorateActionButton(createBtn, { buttonType: 'pill-button', baseClass: 'btn', label: createLabel }) || createBtn;
      const decoratedReload = this.page.decorateActionButton(reloadBtn, { buttonType: 'expandable-icon-button/reload', baseClass: 'btn btn--ghost', label: reloadLabel }) || reloadBtn;

      decoratedCreate.addEventListener('click', this._handleCreate.bind(this));
      decoratedReload.addEventListener('click', this.refresh.bind(this));

      this.actionsHost.appendChild(decoratedCreate);
      this.actionsHost.appendChild(decoratedReload);
    }

    _bindEvents()
    {
      if (this.filterForm) {
        this.filterForm.addEventListener('submit', this._handleFilterSubmit.bind(this));
      }
      if (this.tableBody) {
        this.tableBody.addEventListener('click', this._handleAction.bind(this));
      }
    }

    async _handleFilterSubmit(event)
    {
      event.preventDefault();
      this.applyFilters();
    }

    async refresh()
    {
      this._setFeedback('');
      this.page.showLoading('contentsAccess を読み込んでいます…');
      try {
        const response = await this.page.callApi('ContentAccessList', {});
        const list = this._normalizeResponse(response);
        this.records = list;
        this.applyFilters();
      } catch (err) {
        console.warn('[AdminContentsAccess:JobRules] falling back to local contentsAccess data:', err);
        this.records = this._normalizeResponse(FALLBACK_ACCESS_LIST);
        this.applyFilters();
      } finally {
        this.page.hideLoading();
      }
    }

    _normalizeResponse(response)
    {
      const source = Array.isArray(response && response.items)
        ? response.items
        : Array.isArray(response && response.list)
          ? response.list
          : (Array.isArray(response) ? response : []);
      return source.map((item, idx) => this._normalizeRecord(item, idx));
    }

    _normalizeRecord(item, idx)
    {
      const id = item.id || item.accessId || ('fallback-' + idx);
      return {
        id: String(id),
        contentsCode: item.contentsCode || item.contentCode || '',
        userCode: item.userCode || item.user || '',
        startDate: item.startDate || item.start || '',
        endDate: item.endDate || item.end || '',
        createdAt: item.createdAt || item.created_at || '',
        updatedAt: item.updatedAt || item.updated_at || ''
      };
    }

    applyFilters()
    {
      const keyword = toLower(this.keyword ? this.keyword.value : '');
      const state = this.state ? this.state.value : 'active';
      const now = new Date();

      this.filtered = (this.records || []).filter((entry) => {
        const haystack = [entry.contentsCode, entry.userCode].map(toLower).join(' ');
        if (keyword && haystack.indexOf(keyword) === -1) {
          return false;
        }

        const start = parseDate(entry.startDate);
        const end = parseDate(entry.endDate);

        if (state === 'all') { return true; }
        const isUpcoming = start && start.getTime() > now.getTime();
        const isEnded = end && end.getTime() < now.getTime();
        const isActive = (!start || start.getTime() <= now.getTime()) && (!end || end.getTime() >= now.getTime());

        if (state === 'upcoming') { return isUpcoming; }
        if (state === 'ended') { return isEnded; }
        return isActive;
      });

      this._renderTable();
      this._renderSummary();
      this._renderFeedback();
    }

    _decorateFilterButton()
    {
      if (!this.filterForm)
      {
        return;
      }

      var submit = this.filterForm.querySelector('button[type="submit"]');
      if (!submit)
      {
        return;
      }

      var decorated = this.page.decorateActionButton(submit, {
        buttonType: 'pill-button/ghost',
        baseClass: 'btn btn--ghost',
        label: submit.textContent || '絞り込む'
      }) || submit;

      if (decorated !== submit && submit.parentNode)
      {
        submit.parentNode.replaceChild(decorated, submit);
      }
    }

    _renderTable()
    {
      if (!this.tableBody) {
        return;
      }
      this.tableBody.innerHTML = '';
      const list = this.filtered || [];
      if (!list.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 7;
        cell.textContent = '表示するデータがありません。';
        row.appendChild(cell);
        this.tableBody.appendChild(row);
        return;
      }

      for (let i = 0; i < list.length; i += 1) {
        const entry = list[i];
        const row = document.createElement('tr');
        row.setAttribute('data-access-id', entry.id);

        row.appendChild(this._createCell(entry.contentsCode));
        row.appendChild(this._createCell(entry.userCode));
        row.appendChild(this._createCell(formatDate(entry.startDate)));
        row.appendChild(this._createCell(formatDate(entry.endDate)));
        row.appendChild(this._createCell(formatDate(entry.createdAt)));
        row.appendChild(this._createCell(formatDate(entry.updatedAt)));
        row.appendChild(this._createActionsCell(entry));

        this.tableBody.appendChild(row);
      }
    }

    _createCell(text)
    {
      const cell = document.createElement('td');
      cell.textContent = text || '―';
      return cell;
    }

    _createActionsCell(entry)
    {
      const cell = document.createElement('td');
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'btn btn--ghost';
      editButton.textContent = '編集';
      editButton.setAttribute('data-action', 'edit-access');
      editButton.setAttribute('data-access-id', entry.id);

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'btn btn--ghost';
      deleteButton.textContent = '削除';
      deleteButton.setAttribute('data-action', 'delete-access');
      deleteButton.setAttribute('data-access-id', entry.id);

      const decoratedEdit = this.page.decorateActionButton(editButton, { buttonType: 'pill-button/outline', baseClass: 'btn btn--ghost', label: '編集' }) || editButton;
      const decoratedDelete = this.page.decorateActionButton(deleteButton, { buttonType: 'pill-button/outline', baseClass: 'btn btn--ghost', label: '削除' }) || deleteButton;

      const wrapper = document.createElement('div');
      wrapper.className = 'contents-access__actions';
      wrapper.appendChild(decoratedEdit);
      wrapper.appendChild(decoratedDelete);

      cell.appendChild(wrapper);
      return cell;
    }

    _renderSummary()
    {
      if (!this.summary) { return; }
      const total = this.records ? this.records.length : 0;
      const visible = this.filtered ? this.filtered.length : 0;
      this.summary.textContent = '全' + total + '件中 ' + visible + '件を表示';
    }

    _renderFeedback()
    {
      if (!this.feedback) { return; }
      const message = (!this.filtered || !this.filtered.length) ? '条件に一致するアクセス権限がありません。フィルターを調整してください。' : '';
      this.feedback.textContent = message;
      if (message) {
        this.feedback.classList.remove('hidden');
        this.feedback.removeAttribute('hidden');
      } else {
        this.feedback.classList.add('hidden');
        this.feedback.setAttribute('hidden', 'hidden');
      }
    }

    _handleAction(event)
    {
      const target = event.target.closest('[data-action]');
      if (!target) { return; }
      const action = target.getAttribute('data-action');
      if (action === 'edit-access') {
        const code = target.getAttribute('data-access-id') || '';
        this.page.showToast('アクセス権限「' + code + '」の編集は近日対応予定です。', 'info');
      }
      if (action === 'delete-access') {
        const code = target.getAttribute('data-access-id') || '';
        this.page.showToast('アクセス権限「' + code + '」を削除しました (デモ表示のみ)。', 'success');
      }
    }

    _handleFormCreated(event)
    {
      const detail = event && event.detail;
      if (!detail)
      {
        return;
      }
      const record = this._normalizeRecord(detail, this.records.length);
      record.createdAt = detail.createdAt || record.createdAt || '';
      record.updatedAt = detail.updatedAt || record.updatedAt || record.createdAt;
      if (!record.id)
      {
        record.id = 'local-' + Date.now();
      }
      this.records = [record].concat(this.records || []);
      this.applyFilters();
      if (this.page && typeof this.page.showToast === 'function')
      {
        this.page.showToast('アクセス権限を作成しました（デモ）。', 'success');
      }
    }

    _handleCreate()
    {
      if (this.formJob && typeof this.formJob.openCreateForm === 'function')
      {
        this.formJob.openCreateForm();
        return;
      }
      if (this.formHost) {
        this.formHost.classList.remove('hidden');
        this.formHost.removeAttribute('hidden');
        this.formHost.textContent = 'contentsAccess への新規追加フォームはバックエンド接続後に有効になります。';
      }
      this.page.showToast('新規追加フォームの準備を開始しました (デモ)', 'info');
    }

    _setFeedback(message)
    {
      if (!this.feedback) {
        return;
      }
      this.feedback.textContent = message || '';
      if (message) {
        this.feedback.classList.remove('hidden');
        this.feedback.removeAttribute('hidden');
      } else {
        this.feedback.classList.add('hidden');
        this.feedback.setAttribute('hidden', 'hidden');
      }
    }
  }

  window.AdminContentsAccess = window.AdminContentsAccess || {};
  window.AdminContentsAccess.JobRules = JobRules;
})(window, document);
