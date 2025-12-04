(function (window, document) {
  'use strict';

  function escapeHtml(value)
  {
    var str = String(value == null ? '' : value);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toNumber(value, fallback)
  {
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  class AdminContactlog
  {
    constructor(name)
    {
      this.name = name || 'admin-contactlog';
      this.selectorConfig = {};
      this.textConfig = {};
      this.filters = { keyword: '', source: 'all', period: '30d', sort: 'date', order: 'desc' };
      this.state = { entries: [], filtered: [], lastUpdated: '', pagination: { page: 1, perPage: 50, totalCount: 0, totalPages: 0 } };
      this.headerService = null;
      this.toastService = null;
      this.loadingService = null;
      this.helpModalService = null;
      this.buttonService = null;
      this.breadcrumbService = null;
      this._loaderToken = null;
    }

    async boot()
    {
      if (await window.Services.sessionInstance.getUser() == null) {
        window.location.href = '/login.html';
        return;
      }

      window.Utils.initScreenModalHistoryObserver().observe();

      const jsList = [
        { src: '/js/service-app/header/main.js' },
        { src: '/js/service-app/toast/main.js' },
        { src: '/js/service-app/loading/main.js' },
        { src: '/js/service-app/help-modal/main.js' },
        { src: '/js/service-app/button/main.js' },
        { src: '/js/service-app/breadcrumb/main.js' }
      ];
      await window.Utils.loadScriptsSync(jsList);

      this.headerService = new window.Services.Header({
        display: { forceLoginButton: false, hideLoginButton: false, showUserInfoWhenLoggedin: true }
      });
      const host = document.querySelector('[data-contactlog-root]') || document.body;
      this.toastService = new window.Services.Toast({ position: 'top-right', duration: 3000 });
      this.loadingService = new window.Services.Loading({ container: host });
      this.helpModalService = new window.Services.HelpModal({ closeOnBackdrop: true, closeOnEsc: true });
      this.buttonService = new window.Services.button();
      const breadcrumbContainer = document.querySelector('.screen-page') || document.body;
      this.breadcrumbService = new window.Services.Breadcrumb({ container: breadcrumbContainer });

      await Promise.all([
        this.headerService.boot('.site-header'),
        this.toastService.boot(),
        this.loadingService.boot(),
        this.helpModalService.boot(),
        this.buttonService.boot(),
        this.breadcrumbService.boot(breadcrumbContainer)
      ]);

      this._initConfig();
      this._renderBreadcrumbs();
      this._bindEvents();
      await this._fetchAndRender();
    }

    _initConfig()
    {
      this.selectorConfig = {
        root: '[data-contactlog-root]',
        summary: '[data-contactlog-summary]',
        updated: '[data-contactlog-updated]',
        feedback: '[data-contactlog-feedback]',
        empty: '[data-contactlog-empty]',
        tableBody: '[data-contactlog-tbody]',
        filterForm: '[data-contactlog-filter-form]',
        keyword: '[data-contactlog-keyword]',
        source: '[data-contactlog-source]',
        period: '[data-contactlog-period]',
        sort: '[data-contactlog-sort]',
        order: '[data-contactlog-order]',
        refresh: '[data-contactlog-refresh]',
        helpButton: '#contact-log-help-button',
        helpModal: '#contact-log-help-modal'
      };

      this.textConfig = {
        summary: '全{total}件中 {visible}件を表示',
        loading: '読み込み中…',
        loadError: '問い合わせの取得に失敗しました。時間をおいて再度お試しください。',
        empty: '表示できる問い合わせはありません。',
        updated: '最終更新: {time}',
        tableHeaders: {
          date: '受信日時',
          name: '名前',
          mail: 'メール',
          legend: '内容',
          user: '区分'
        }
      };

      const form = document.querySelector(this.selectorConfig.filterForm);
      if (form) {
        this._restoreFiltersFromForm(form);
      }
    }

    _renderBreadcrumbs()
    {
      if (!this.breadcrumbService) {
        return;
      }
      this.breadcrumbService.render([
        { label: 'ダッシュボード', href: 'dashboard.html' },
        { label: '問い合わせ管理' }
      ]);
    }

    _bindEvents()
    {
      const sel = this.selectorConfig;
      const form = document.querySelector(sel.filterForm);
      if (form) {
        form.addEventListener('submit', (ev) => {
          ev.preventDefault();
          this._updateFiltersFromForm(form);
          this._fetchAndRender();
        });
      }

      const refreshButton = document.querySelector(sel.refresh);
      if (refreshButton) {
        refreshButton.addEventListener('click', (ev) => {
          ev.preventDefault();
          this._fetchAndRender();
        });
      }

      const helpButton = document.querySelector(sel.helpButton);
      if (helpButton) {
        helpButton.addEventListener('click', (ev) => {
          ev.preventDefault();
          this._showHelpModal();
        });
      }
    }

    _restoreFiltersFromForm(form)
    {
      if (!form) { return; }
      const sel = this.selectorConfig;
      const keyword = form.querySelector(sel.keyword);
      const source = form.querySelector(sel.source);
      const period = form.querySelector(sel.period);
      const sort = form.querySelector(sel.sort);
      const order = form.querySelector(sel.order);

      if (keyword) { this.filters.keyword = (keyword.value || '').trim(); }
      if (source) { this.filters.source = (source.value || 'all'); }
      if (period) { this.filters.period = (period.value || '30d'); }
      if (sort) { this.filters.sort = (sort.value || 'date'); }
      if (order) { this.filters.order = (order.value || 'desc'); }
    }

    _updateFiltersFromForm(form)
    {
      if (!form) { return; }
      const sel = this.selectorConfig;
      this.filters = {
        keyword: ((form.querySelector(sel.keyword) || {}).value || '').trim(),
        source: (form.querySelector(sel.source) || {}).value || 'all',
        period: (form.querySelector(sel.period) || {}).value || '30d',
        sort: (form.querySelector(sel.sort) || {}).value || 'date',
        order: (form.querySelector(sel.order) || {}).value || 'desc'
      };
    }

    async _fetchAndRender()
    {
      const text = this.textConfig;
      try {
        this._setLoading(true, text.loading);
        const payload = this._createRequestPayload();
        const result = await window.Utils.requestApi('System', 'ContactLogList', payload);
        if (!this._isSuccessfulResult(result)) {
          const reason = this._resolveRequestFailureReason(result);
          throw new Error('[AdminContactlog] request failed: ' + reason);
        }
        const response = this._extractResponseBody(result);
        const entries = response && Array.isArray(response.entries) ? response.entries : [];
        const pagination = response && response.pagination ? response.pagination : { page: 1, perPage: 50, totalCount: entries.length, totalPages: 1 };
        this.state.entries = entries.map((entry) => this._normalizeEntry(entry));
        this.state.pagination = pagination;
        this.state.lastUpdated = this._formatTimestamp(new Date());
        this._applyFilters();
      } catch (err) {
        console.error('[AdminContactlog] fetch failed', err);
        this._toast(text.loadError);
        this._renderFeedback(text.loadError, true);
      } finally {
        this._setLoading(false);
      }
    }

    _createRequestPayload()
    {
      const filters = this.filters || {};
      const payload = {
        keyword: filters.keyword || '',
        source: filters.source || 'all',
        period: filters.period || '30d',
        sort: filters.sort || 'date',
        order: filters.order || 'desc',
        page: this.state.pagination.page || 1,
        perPage: this.state.pagination.perPage || 50
      };
      return payload;
    }

    _isSuccessfulResult(result)
    {
      if (!result) { return false; }
      const status = (result.status || '').toString().toLowerCase();
      if (status === 'success' || status === 'ok') { return true; }
      if (result.ok === true || result.success === true) { return true; }
      return false;
    }

    _extractResponseBody(result)
    {
      if (result && result.response && typeof result.response === 'object') { return result.response; }
      if (result && result.result && typeof result.result === 'object') { return result.result; }
      if (result && result.data && typeof result.data === 'object') { return result.data; }
      return null;
    }

    _resolveRequestFailureReason(result)
    {
      if (!result) { return 'request_failed'; }
      if (result.reason) { return result.reason; }
      if (result.status) { return result.status; }
      if (result.response) { return result.response; }
      return 'request_failed';
    }

    _applyFilters()
    {
      const filters = this.filters || {};
      const keyword = (filters.keyword || '').toString().toLowerCase();
      const source = filters.source || 'all';
      const period = filters.period || '30d';
      const sortKey = filters.sort || 'date';
      const sortOrder = (filters.order || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

      const now = new Date();
      let since = null;
      if (period === '7d') { since = this._shiftDate(now, -7); }
      if (period === '30d') { since = this._shiftDate(now, -30); }
      if (period === '90d') { since = this._shiftDate(now, -90); }

      let list = (this.state.entries || []).slice();
      if (since) {
        const sinceTime = since.getTime();
        list = list.filter((item) => {
          const ts = this._parseTimestamp(item.dateText);
          return ts && ts >= sinceTime;
        });
      }

      if (source === 'member') {
        list = list.filter((item) => item.userId !== null && item.userId !== '' && item.userId !== undefined);
      } else if (source === 'guest') {
        list = list.filter((item) => item.userId === null || item.userId === '' || typeof item.userId === 'undefined');
      }

      if (keyword) {
        list = list.filter((item) => {
          const haystack = [item.userName, item.userMail, item.legend, item.userId].map((v) => (v || '').toString().toLowerCase()).join(' ');
          return haystack.indexOf(keyword) !== -1;
        });
      }

      list.sort((a, b) => this._compareEntries(a, b, sortKey, sortOrder));

      this.state.filtered = list;
      this._renderSummary();
      this._renderUpdated();
      this._renderTable();
      this._renderFeedback();
    }

    _compareEntries(a, b, key, order)
    {
      const factor = order === 'asc' ? 1 : -1;
      if (key === 'name') {
        return factor * this._localeCompare(a.userName, b.userName);
      }
      if (key === 'mail') {
        return factor * this._localeCompare(a.userMail, b.userMail);
      }
      if (key === 'legend') {
        return factor * this._localeCompare(a.legend, b.legend);
      }
      if (key === 'userId') {
        return factor * this._localeCompare(String(a.userId || ''), String(b.userId || ''));
      }
      const aTs = this._parseTimestamp(a.dateText) || 0;
      const bTs = this._parseTimestamp(b.dateText) || 0;
      if (aTs === bTs) { return 0; }
      return aTs > bTs ? factor * 1 : factor * -1;
    }

    _localeCompare(a, b)
    {
      const x = (a || '').toString();
      const y = (b || '').toString();
      return x.localeCompare(y, 'ja');
    }

    _renderSummary()
    {
      const el = document.querySelector(this.selectorConfig.summary);
      if (!el) { return; }
      const pagination = this.state.pagination || {};
      const total = toNumber(pagination.totalCount, this.state.entries.length);
      const visible = this.state.filtered.length;
      const tpl = this.textConfig.summary || '';
      el.textContent = tpl.replace('{total}', total).replace('{visible}', visible);
    }

    _renderUpdated()
    {
      const el = document.querySelector(this.selectorConfig.updated);
      if (!el) { return; }
      const tpl = this.textConfig.updated || '';
      const text = this.state.lastUpdated ? tpl.replace('{time}', this.state.lastUpdated) : '';
      el.textContent = text;
    }

    _renderFeedback(message, isError)
    {
      const el = document.querySelector(this.selectorConfig.feedback);
      const empty = document.querySelector(this.selectorConfig.empty);
      if (el) {
        if (message) {
          el.textContent = message;
          el.classList.remove('hidden');
          el.hidden = false;
        } else {
          el.textContent = '';
          el.classList.add('hidden');
          el.hidden = true;
        }
        if (isError) {
          el.setAttribute('role', 'alert');
        } else {
          el.removeAttribute('role');
        }
      }
      if (empty) {
        if (!message && this.state.filtered.length === 0) {
          empty.classList.remove('hidden');
          empty.hidden = false;
        } else {
          empty.classList.add('hidden');
          empty.hidden = true;
        }
      }
    }

    _renderTable()
    {
      const tbody = document.querySelector(this.selectorConfig.tableBody);
      if (!tbody) { return; }
      const list = this.state.filtered || [];
      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">' + escapeHtml(this.textConfig.empty || '') + '</td></tr>';
        return;
      }

      const rows = list.map((item) => this._renderRow(item));
      tbody.innerHTML = rows.join('');
    }

    _renderRow(item)
    {
      const headers = this.textConfig.tableHeaders || {};
      const dateText = escapeHtml(item.dateText || '');
      const user = escapeHtml(item.userName || '');
      const mail = escapeHtml(item.userMail || '');
      const legend = escapeHtml(item.legend || '');
      const label = item.userId ? '登録ユーザー #' + escapeHtml(String(item.userId)) : 'ゲスト';

      return [
        '<tr>',
          '<td data-header="' + escapeHtml(headers.date || '') + '">', dateText, '</td>',
          '<td data-header="' + escapeHtml(headers.name || '') + '">', user || '<span class="muted">(未入力)</span>', '</td>',
          '<td data-header="' + escapeHtml(headers.mail || '') + '">', mail || '<span class="muted">(未入力)</span>', '</td>',
          '<td data-header="' + escapeHtml(headers.legend || '') + '">', legend || '<span class="muted">(未入力)</span>', '</td>',
          '<td data-header="' + escapeHtml(headers.user || '') + '">', escapeHtml(label), '</td>',
        '</tr>'
      ].join('');
    }

    _normalizeEntry(entry)
    {
      const safe = entry || {};
      const dateText = typeof safe.date === 'string' ? safe.date : (safe.dateText || '');
      const normalized = {
        id: toNumber(safe.id, null),
        userName: safe.userName || '',
        userMail: safe.userMail || '',
        legend: safe.legend || '',
        userId: safe.userId === null || typeof safe.userId === 'undefined' || safe.userId === '' ? null : safe.userId,
        dateText: dateText
      };
      return normalized;
    }

    _parseTimestamp(value)
    {
      if (!value) { return null; }
      const ms = Date.parse(value.replace(/-/g, '/'));
      return Number.isNaN(ms) ? null : ms;
    }

    _formatTimestamp(date)
    {
      if (!(date instanceof Date)) { return ''; }
      const pad = (n) => (n < 10 ? '0' + n : String(n));
      return [
        date.getFullYear(), '-', pad(date.getMonth() + 1), '-', pad(date.getDate()), ' ',
        pad(date.getHours()), ':', pad(date.getMinutes()), ':', pad(date.getSeconds())
      ].join('');
    }

    _shiftDate(base, diffDays)
    {
      const result = new Date(base.getTime());
      result.setDate(result.getDate() + diffDays);
      return result;
    }

    _showHelpModal()
    {
      if (!this.helpModalService || typeof this.helpModalService.show !== 'function') {
        return;
      }
      const modal = document.querySelector(this.selectorConfig.helpModal);
      if (!modal) {
        this.helpModalService.show({
          title: '問い合わせ管理',
          text: '問い合わせ一覧を期間や送信元で絞り込み、最新順で確認できます。'
        });
        return;
      }

      const titleNode = modal.querySelector('#contact-log-help-modal-title');
      const summaryNode = modal.querySelector('#contact-log-help-modal-summary');
      const bodyNode = modal.querySelector('#contact-log-help-modal-body');

      const htmlParts = [];
      if (summaryNode && summaryNode.innerHTML) {
        htmlParts.push('<p class="queue-help-modal__summary">' + summaryNode.innerHTML + '</p>');
      }
      if (bodyNode && bodyNode.innerHTML) {
        htmlParts.push(bodyNode.innerHTML);
      }

      this.helpModalService.show({
        title: titleNode ? titleNode.textContent : '問い合わせ管理',
        html: htmlParts.join('')
      });
    }

    _setLoading(enabled, message)
    {
      if (!this.loadingService) { return; }
      if (enabled) {
        this._loaderToken = this.loadingService.show(message || this.textConfig.loading || '');
      } else if (this._loaderToken) {
        this.loadingService.hide(this._loaderToken);
        this._loaderToken = null;
      } else {
        this.loadingService.dismissAll();
      }
    }

    _toast(message)
    {
      if (this.toastService && typeof this.toastService.show === 'function' && message) {
        this.toastService.show(message, { variant: 'error' });
      }
    }
  }

  window.AdminContactlog = window.AdminContactlog || AdminContactlog;
})(window, document);
