(function (w, $)
 {
  'use strict';

  function exists(x) { return typeof x !== 'undefined' && x !== null; }
  function toBool(v) { return v === true || v === 'true' || v === 1 || v === '1'; }
  function safeLower(v) { return (v || '').toString().toLowerCase(); }

  const LOGIN_PATH = '/login.html';
  const SESSION_EXPIRED_REASONS = Object.freeze(['login_required', 'unauthorized', 'session_expired']);
  const PERMISSION_REASON = 'permission';

  class AdminUsers
  {
    constructor()
    {
      this.root = null;
      this.sessionUser = null;
      this.sessionFlags = { isSupervisor: false, isOperator: false };

      this.selectorConfig = {};
      this.textConfig = {};
      this.api = {
        endpoint: window.Utils.getApiEndpoint(),
        requestType: 'User',
        token: window.Utils.getApiToken(),
        types: {
          list: 'UserGetAll',
          create: 'UserAdd',
          update: 'UserUpdate',
          delete: 'UserDelete',
          mailCheck: 'UserMailCheckSend',
          selectableList: 'UserSelectableList',
          selectableSave: 'UserSelectableSave'
        },
        pageSize: 200
      };
      
      /** page state */
      this.users = [];        // full list
      this.filtered = [];     // after filters
      this.usersById = {};    // map
      this.mailCheck = {};    // { [userId]: 'sending' | 'pending' }

      this.labelService = null;
      this.buttonService = null;
      this.avatarService = null;
      this.avatarSettingService = null;
      this.userlistAvatarService = null;
      this.userSelectModalService = null;
      this.fieldBadgeLabelConfig = {
        elementTag: 'span',
        baseClass: 'user-management__field-badge',
        variantPrefix: 'user-management__field-badge--',
        attributeName: 'data-field-badge',
        fallbackText: '',
        labelMap: {
          required: '必須',
          optional: '任意'
        },
        variantMap: {
          required: 'required',
          optional: null
        },
        defaultVariant: ''
      };
      this.avatarSettingConfig = {
        acceptImageTypes: ['image/png', 'image/jpeg', 'image/webp'],
        uploadMaxSizeMB: 5,
        emptyFilenameText: '選択されていません'
      };
      this._helpJob = null;
      this._formJob = null;
      this.confirmDialogService = null;
      this.breadcrumbService = null;
    }

    /**
     * Boot sequence:
     *  - load service-app dependencies
     *  - init config
     *  - init services (toast/loader/header/help)
     *  - bind events
     *  - initial data load
     */
    async boot()
    {
      if (await window.Services.sessionInstance.getUser() == null) {
        window.location.href = "/login.html";
        return;
      }

      const sessionUser = await window.Services.sessionInstance.getUser();
      this.sessionUser = sessionUser;
      this.sessionFlags = this._resolveSessionFlags(sessionUser);
      
      try {
        this.root = document.querySelector('[data-admin-users-root]') || document.body;

        // Load common services used across pages (header, toast, loading overlay, help modal)
        await window.Utils.loadScriptsSync([
          { src: '/js/service-app/header/main.js' },
          { src: '/js/service-app/toast/main.js' },
          { src: '/js/service-app/loading/main.js' },
          { src: '/js/service-app/help-modal/main.js' },
          { src: '/js/service-app/button/main.js' },
          { src: '/js/service-app/label/main.js' },
          { src: '/js/service-app/user-avatar/main.js' },
          { src: '/js/service-app/avatar-setting/main.js' },
          { src: '/js/service-app/userlist-avatar/main.js' },
          { src: '/js/service-app/user-select-modal/main.js' },
          { src: '/js/service-app/confirm-dialog/main.js' },
          { src: '/js/service-app/breadcrumb/main.js' }
        ]);

        // 2) サービス初期化（login と同等の最小セット）
        this.headerService = new window.Services.Header({
          display: { forceLoginButton: false, hideLoginButton: false, showUserInfoWhenLoggedin: true }
        });
        this.toastService = new window.Services.Toast({ position: 'top-right', duration: 3000 });

        // ルート（ローダー設置先）はページ固有要素があればそれ、なければ body
        const host = document.querySelector('[data-page="admin-users"]') || document.body;
        this.loadingService = new window.Services.Loading(host);
        this.helpModalService = new window.Services.HelpModal({ closeOnEsc: true, closeOnBackdrop: true });
        this.labelService = new window.Services.Label(Object.assign({}, this.fieldBadgeLabelConfig));
        this.buttonService = new window.Services.button();
        this.avatarService = new window.Services.UserAvatar({ size: 44, shape: 'circle' });
        this.avatarSettingService = new window.Services.AvatarSetting(Object.assign({}, this.avatarSettingConfig));
        this.userlistAvatarService = new window.Services.UserlistAvatar({ size: 28, overlap: -10, popoverPlacement: 'bottom-start', nameOverlay: false });
        this.userSelectModalService = new window.Services.UserSelectModal({
          multiple: true,
          text: {
            applyLabel: '選択中のユーザーを指定する',
            modalDescription: 'ユーザーを選択してください'
          }
        });
        this.confirmDialogService = new window.Services.ConfirmDialog();
        const breadcrumbContainer = document.querySelector('.screen-page') || document.body;
        this.breadcrumbService = new window.Services.Breadcrumb({ container: breadcrumbContainer });

        // 3) サービス起動
        await Promise.all([
          this.headerService.boot('.site-header'),
          this.toastService.boot(),
          this.loadingService.boot(),
          this.helpModalService.boot(),
          this.labelService.boot(),
          this.buttonService.boot(),
          this.avatarService.boot(),
          this.avatarSettingService.boot(),
          this.userlistAvatarService.boot(),
          this.userSelectModalService.boot(),
          this.confirmDialogService.boot(),
          this.breadcrumbService.boot(breadcrumbContainer)
        ]);

      this._renderBreadcrumbs();
      this.initConfig();
        this._renderHeaderActions();
        this.loader = this.loadingService;
        this.updateEvent();

        // Initial data load
        await this._ensureJob('view');
        if (window.AdminUser && window.AdminUser.JobView) {
          await new window.AdminUser.JobView(this).loadUsers();
        }
      } catch (err) {
        console.error('[AdminUsers.boot] failed:', err);
        this._toastError(this.textConfig.loadError || '読み込みに失敗しました。');
      }
    }

    _renderBreadcrumbs()
    {
      if (!this.breadcrumbService)
      {
        return;
      }
      this.breadcrumbService.render([
        { label: 'ダッシュボード', href: 'dashboard.html' },
        { label: 'ユーザー管理' }
      ]);
    }

    _renderHeaderActions()
    {
      const sel = this.selectorConfig || {};
      const actionsHost = this.root ? this.root.querySelector(sel.actions || '[data-admin-users-actions]') : null;
      if (!actionsHost)
      {
        return;
      }

      const svc = this.buttonService;
      if (!svc || typeof svc.createActionButton !== 'function')
      {
        return;
      }

      const text = this.textConfig || {};
      const addLabel = text.addUser || 'ユーザーを追加';
      const reloadLabel = text.reload || '再読み込み';

      actionsHost.innerHTML = '';

      const addButton = svc.createActionButton('expandable-icon-button/add', {
        baseClass: 'target-management__icon-button target-management__icon-button--primary user-management__add',
        label: addLabel,
        ariaLabel: addLabel,
        hoverLabel: addLabel,
        type: 'button',
        dataset: { action: 'admin-users-add' }
      });

      const reloadButton = svc.createActionButton('expandable-icon-button/reload', {
        baseClass: 'target-management__icon-button target-management__icon-button--ghost user-management__reload',
        label: reloadLabel,
        ariaLabel: reloadLabel,
        hoverLabel: reloadLabel,
        type: 'button',
        dataset: { action: 'admin-users-reload' }
      });

      actionsHost.appendChild(addButton);
      actionsHost.appendChild(reloadButton);
    }

    /**
     * Migrate from old config.js
     *  - selectors, texts, api (can be overridden by data-* on root)
     */
    initConfig() {
      this.selectorConfig = Object.freeze({
        container: '[data-admin-users-root]',
        filterForm: '[data-admin-users-filter-form]',
        keyword: '[data-admin-users-keyword]',
        role: '[data-admin-users-role]',
        deleted: '[data-admin-users-deleted]',
        actions: '[data-admin-users-actions]',
        reloadBtn: '[data-action="admin-users-reload"]',
        addBtn: '[data-action="admin-users-add"]',
        table: '[data-admin-users-table]',
        tableBody: '[data-admin-users-tbody]',
        emptyState: '[data-admin-users-empty]',
        feedback: '[data-admin-users-feedback]',
        summary: '[data-admin-users-summary]',
        formHost: '[data-admin-users-form-host]',
        form: '[data-admin-users-form]',
        formError: '[data-admin-users-form-error]',
        formSubmit: '[data-action="admin-users-form-submit"]',
        formCancel: '[data-action="admin-users-form-cancel"]',
        // row action buttons (assumed to be rendered inside tbody rows)
        rowEdit: '[data-action="admin-users-edit"]',
        rowDelete: '[data-action="admin-users-delete"]',
        rowMailCheck: '[data-action="admin-users-mailcheck"]',
        rowSelectableEdit: '[data-action="admin-users-selectable"]',
        helpButton: '#user-management-help-button',
        helpModal: '#user-management-help-modal',
        helpClose: '#user-management-help-modal [data-modal-close]'
      });

      this.textConfig = Object.freeze({
        loading: 'ユーザー情報を読み込んでいます…',
        loadError: 'ユーザー情報の取得に失敗しました。',
        empty: 'ユーザーがまだ登録されていません。',
        notFound: '条件に一致するユーザーが見つかりません。',
        summary: '全{total}件中 {filtered}件を表示',
        keywordPlaceholder: '氏名・ユーザーコード・メールで検索',
        roleLabel: 'ロール',
        deletedLabel: '削除状態',
        deletedActive: '削除されていないユーザーのみ',
        deletedDeleted: '削除されたユーザーのみ',
        deletedAll: 'すべて',
        reload: '再読み込み',
        addUser: 'ユーザーを追加',
        mailCheckPending: '確認待ち',
        mailCheckSending: 'メール受信チェックメールを送信中…',
        mailCheckNoMail: 'メールアドレスが登録されていません。',
        formTitleCreate: 'ユーザーを追加',
        formTitleEdit: 'ユーザーを編集',
        formSubmitCreate: '追加する',
        formSubmitEdit: '更新する',
        formSummaryCreate: '氏名・ユーザーコード・メールアドレスは必須です。初期パスワードは任意で設定できます。',
        formSummaryEdit: 'ユーザーコード: {userCode}',
        formNoChanges: '変更された項目がありません。',
        formCancelConfirm: '入力内容が保存されていません。モーダルを閉じますか？',
        formCancel: 'キャンセル',
        formErrorRequired: '必須項目を入力してください。',
        formErrorUserCodeLength: 'ユーザーコードは4文字以上で入力してください。',
        formErrorEmail: 'メールアドレスの形式が正しくありません。',
        createSuccess: 'ユーザーを追加しました。',
        updateSuccess: 'ユーザー情報を更新しました。',
        deleteConfirm: 'このユーザーを削除しますか？',
        deleteLogicalConfirm: '関連データがあります。論理削除しますか？',
        deleteSuccess: 'ユーザーを削除しました。',
        deleteLogicalSuccess: 'ユーザーを論理削除しました。',
        deleteSelfError: 'ログイン中のユーザーは削除できません。',
        deleteError: 'ユーザーの削除に失敗しました。',
        mailCheckConfirm: 'メール受信チェック用のメールを送信しますか？',
        mailCheckSuccess: 'メール受信チェックメールを送信しました。',
        mailCheckError: 'メール受信チェックメールの送信に失敗しました。'
      });

      // Allow override from data-* on root
      this._applyDatasetOverrides();
    }

    _applyDatasetOverrides()
    {
      const sources = [];
      if (document.body && document.body.dataset) { sources.push(document.body.dataset); }
      if (this.root && this.root !== document.body && this.root.dataset) { sources.push(this.root.dataset); }
      for (let i = 0; i < sources.length; i += 1)
      {
        const ds = sources[i];
        if (!ds) { continue; }
        if (ds.apiEndpoint) { this.api.endpoint = ds.apiEndpoint; }
        if (ds.apiRequestType) { this.api.requestType = ds.apiRequestType; }
        if (ds.apiToken) { this.api.token = ds.apiToken; }
        if (ds.pageSize)
        {
          const size = parseInt(ds.pageSize, 10);
          if (!isNaN(size) && size > 0) { this.api.pageSize = size; }
        }
      }
    }

    /**
     * Event migration (from old event.js)
     * Bind all UI events and dispatch to JobView / JobForm.
     */
    updateEvent() {
      const sel = this.selectorConfig;

      // Filter submit
      $(document).off('submit.adminUsers.filter')
        .on('submit.adminUsers.filter', sel.filterForm, async (ev) => {
          ev.preventDefault();
          await this._ensureJob('view');
          if (w.AdminUser && w.AdminUser.JobView) {
            new window.AdminUser.JobView(this).applyFilters();
          }
        });

      // Keyword typing
      $(document).off('input.adminUsers.keyword')
        .on('input.adminUsers.keyword', sel.keyword, async (ev) => {
          await this._ensureJob('view');
          if (w.AdminUser && w.AdminUser.JobView) {
            new window.AdminUser.JobView(this).applyFilters();
          }
        });

      // Role / Deleted change
      $(document).off('change.adminUsers.role')
        .on('change.adminUsers.role', sel.role, async () => {
          await this._ensureJob('view');
          if (w.AdminUser && w.AdminUser.JobView) {
            new window.AdminUser.JobView(this).applyFilters();
          }
        });
      $(document).off('change.adminUsers.deleted')
        .on('change.adminUsers.deleted', sel.deleted, async () => {
          await this._ensureJob('view');
          if (w.AdminUser && w.AdminUser.JobView) {
            new window.AdminUser.JobView(this).applyFilters();
          }
        });

      // Reload
      $(document).off('click.adminUsers.reload')
        .on('click.adminUsers.reload', sel.reloadBtn, async (ev) => {
          ev.preventDefault();
          await this._ensureJob('view');
          if (w.AdminUser && w.AdminUser.JobView) {
            new window.AdminUser.JobView(this).refresh({ resetPage: true });
          }
        });

      // Add
      $(document).off('click.adminUsers.add')
        .on('click.adminUsers.add', sel.addBtn, async (ev) => {
          ev.preventDefault();
          const job = await this._ensureFormJob();
          if (job && typeof job.openCreateForm === 'function') {
            job.openCreateForm();
          }
        });

      // Row: Edit
      $(document).off('click.adminUsers.edit')
        .on('click.adminUsers.edit', sel.rowEdit, async (ev) => {
          ev.preventDefault();
          const id = $(ev.currentTarget).attr('data-user-id') || $(ev.currentTarget).closest('[data-user-id]').attr('data-user-id');
          if (!id) return;
          const job = await this._ensureFormJob();
          if (job && typeof job.openEditForm === 'function') {
            job.openEditForm(id);
          }
        });

      // Row: Delete
      $(document).off('click.adminUsers.delete')
        .on('click.adminUsers.delete', sel.rowDelete, async (ev) => {
          ev.preventDefault();
          const id = $(ev.currentTarget).attr('data-user-id') || $(ev.currentTarget).closest('[data-user-id]').attr('data-user-id');
          if (!id) return;
          const job = await this._ensureFormJob();
          if (job && typeof job.deleteUser === 'function') {
            job.deleteUser(id);
          }
        });

      // Row: Mail Check
      $(document).off('click.adminUsers.mailcheck')
        .on('click.adminUsers.mailcheck', sel.rowMailCheck, async (ev) => {
          ev.preventDefault();
          const id = $(ev.currentTarget).attr('data-user-id') || $(ev.currentTarget).closest('[data-user-id]').attr('data-user-id');
          if (!id) return;
          const job = await this._ensureFormJob();
          if (job && typeof job.sendMailCheck === 'function') {
            job.sendMailCheck(id);
          }
        });

      $(document).off('click.adminUsers.selectable')
        .on('click.adminUsers.selectable', sel.rowSelectableEdit, async (ev) => {
          ev.preventDefault();
          const id = $(ev.currentTarget).attr('data-user-id') || $(ev.currentTarget).closest('[data-user-id]').attr('data-user-id');
          if (!id) return;
          await this._ensureJob('selectable');
          if (w.AdminUser && w.AdminUser.JobSelectable) {
            new window.AdminUser.JobSelectable(this).openSelector(id, ev.currentTarget);
          }
        });

      // Form submit
      $(document).off('submit.adminUsers.form')
        .on('submit.adminUsers.form', sel.form, async (ev) => {
          ev.preventDefault();
          const job = await this._ensureFormJob();
          if (job && typeof job.submitForm === 'function') {
            job.submitForm();
          }
        });

      // Form cancel
      $(document).off('click.adminUsers.formCancel')
        .on('click.adminUsers.formCancel', sel.formCancel, async (ev) => {
          ev.preventDefault();
          const job = await this._ensureFormJob();
          if (job && typeof job.cancelForm === 'function') {
            await job.cancelForm();
          }
        });

      $(document).off('click.adminUsers.helpOpen')
        .on('click.adminUsers.helpOpen', sel.helpButton, async (ev) => {
          ev.preventDefault();
          const job = await this._ensureHelpJob();
          if (job && typeof job.open === 'function') {
            job.open();
          }
        });

      $(document).off('click.adminUsers.helpClose')
        .on('click.adminUsers.helpClose', sel.helpClose, async (ev) => {
          ev.preventDefault();
          const job = await this._ensureHelpJob();
          if (job && typeof job.close === 'function') {
            job.close();
          }
        });
    }

    /**
     * Lightweight API wrapper using FormData.
     * - action: one of api.types keys (list/create/update/delete/mailCheck)
     * - params: object to append to form data
     */
    async apiPost(action, params)
    {
      const type = this.api.types[action];
      if (!type) throw new Error('[AdminUsers.apiPost] Unknown action: ' + action);

      const fd = this._createApiFormData(type, action, params);
      const payload = await this._sendApiRequest(fd);
      this._ensureActiveSession(payload);
      return this._normalizeApiPayload(action, payload);
    }

    _createApiFormData(type, action, params)
    {
      if (typeof window.FormData !== 'function') {
        throw new Error('FormData is not supported in this environment');
      }
      const fd = new window.FormData();
      fd.append('requestType', this.api.requestType);
      fd.append('type', type);
      fd.append('token', this.api.token || window.Utils.getApiToken());
      this._appendApiParams(fd, action, params);
      return fd;
    }

    _appendApiParams(fd, action, params)
    {
      if (!params || typeof params !== 'object') {
        return;
      }
      const isUpdate = (action === 'update');
      const FileCtor = window.File;
      const BlobCtor = window.Blob;
      Object.keys(params).forEach((key) => {
        let value = params[key];
        if (typeof value === 'undefined') {
          return;
        }

        if (value === null) {
          if (key === 'mail' && isUpdate) {
            fd.append('mail', '');
          }
          return;
        }

        let paramKey = key;
        if (key === 'initialPassword') {
          paramKey = 'autoPassword';
        }

        if (paramKey === 'mail' && isUpdate) {
          const text = (value == null ? '' : String(value)).trim();
          if (!text) {
            fd.append('mail', '');
            return;
          }
        }

        if ((FileCtor && value instanceof FileCtor) || (BlobCtor && value instanceof BlobCtor)) {
          fd.append(paramKey, value);
          return;
        }

        if (typeof value === 'object') {
          fd.append(paramKey, JSON.stringify(value));
          return;
        }

        fd.append(paramKey, value);
      });
    }

    async _sendApiRequest(fd)
    {
      const response = await window.fetch(this.api.endpoint, {
        method: 'POST',
        body: fd,
        credentials: 'include',
        cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      const text = await response.text();
      if (!text) {
        return {};
      }
      try {
        return JSON.parse(text);
      } catch (err) {
        throw new Error('サーバーからの応答を解析できませんでした。');
      }
    }

    _normalizeApiPayload(action, payload) {
      const ok = (payload && (payload.ok === true || payload.success === true || payload.status === 'OK'));
      if (!ok) {
        const err = new Error(this._resolveApiErrorMessage(action, payload));
        if (payload) {
          err.code = payload.reason || payload.code || payload.status || '';
          err.payload = payload;
          if (payload.reason) err.reason = payload.reason;
        }
        throw err;
      }

      if (payload && payload.data && typeof payload.data === 'object') {
        return payload.data;
      }
      if (payload && payload.result) {
        return payload.result;
      }
      if (payload && Array.isArray(payload.users)) {
        return payload.users;
      }
      if (payload && Array.isArray(payload.list)) {
        return payload.list;
      }
      return payload;
    }

    _resolveApiErrorMessage(action, payload)
    {
      const defaults = {
        list: this.textConfig.loadError || 'ユーザー情報の取得に失敗しました。',
        create: 'ユーザーの追加に失敗しました。',
        update: 'ユーザー情報の更新に失敗しました。',
        delete: this.textConfig.deleteError || 'ユーザーの削除に失敗しました。',
        mailCheck: this.textConfig.mailCheckError || 'メール受信チェックメールの送信に失敗しました。',
        selectableSave: '選択可能ユーザーの保存に失敗しました。',
        selectableList: '選択可能ユーザーの取得に失敗しました。'
      };
      const base = defaults[action] || defaults.list;
      const detail = (payload && (payload.reason || (payload.result && payload.result.message) || payload.message)) || '';
      return detail ? base + ' (' + detail + ')' : base;
    }

    _ensureActiveSession(payload)
    {
      if (!payload || typeof payload !== 'object') {
        return;
      }
      if ((payload.status || '').toString().toUpperCase() !== 'ERROR') {
        return;
      }
      const reason = this._normalizeReason(payload.reason)
        || this._normalizeReason(payload.code)
        || this._normalizeReason(payload.result && (payload.result.reason || payload.result.status));
      if (!reason || reason === PERMISSION_REASON) {
        return;
      }
      if (SESSION_EXPIRED_REASONS.indexOf(reason) === -1) {
        return;
      }
      if (this._shouldRedirectToLogin()) {
        try { window.location.href = LOGIN_PATH; } catch (_) {}
      }
      throw new Error('ログインセッションが切れています。');
    }

    _normalizeReason(value)
    {
      if (typeof value === 'string') {
        return value.trim().toLowerCase();
      }
      return '';
    }

    _shouldRedirectToLogin()
    {
      if (!window || !window.location) {
        return false;
      }
      return window.location.pathname !== LOGIN_PATH;
    }

    _resolveSessionFlags(profile)
    {
      const flags = { isSupervisor: false, isOperator: false };
      if (!profile || typeof profile !== 'object') {
        return flags;
      }
      const isSupervisor = this._normalizeRoleFlag(profile.isSupervisor)
        || this._normalizeRoleFlag(profile.supervisor)
        || safeLower(profile.role) === 'supervisor';
      const isOperator = this._normalizeRoleFlag(profile.isOperator)
        || this._normalizeRoleFlag(profile.operator)
        || safeLower(profile.role) === 'operator'
        || isSupervisor;
      flags.isSupervisor = !!isSupervisor;
      flags.isOperator = !!isOperator;
      return flags;
    }

    _normalizeRoleFlag(value)
    {
      return value === true || value === 1 || value === '1' || value === 'true';
    }

    getSessionUserId()
    {
      const user = this.sessionUser || {};
      const candidates = [user.userId, user.id, user.uid, user.code, user.userCode];
      for (let i = 0; i < candidates.length; i += 1) {
        const v = candidates[i];
        if (typeof v === 'number') {
          return String(v);
        }
        if (typeof v === 'string' && v.trim()) {
          return v.trim();
        }
      }
      return '';
    }

    isSupervisorUser()
    {
      return !!(this.sessionFlags && this.sessionFlags.isSupervisor);
    }

    isOperatorUser()
    {
      return !!(this.sessionFlags && this.sessionFlags.isOperator);
    }

    /** Utility to load a job file on demand */
    async _ensureJob(kind) {
      const srcMap = {
        view: '/js/page/admin-users/job-view.js',
        form: '/js/page/admin-users/job-form.js',
        help: '/js/page/admin-users/job-help.js',
        selectable: '/js/page/admin-users/job-selectable.js'
      };
      const src = srcMap[kind];
      if (!src) return;
      await window.Utils.loadScriptsSync([{ src }]);
    }

    async _ensureHelpJob() {
      if (this._helpJob) {
        return this._helpJob;
      }
      await this._ensureJob('help');
      if (w.AdminUser && typeof w.AdminUser.JobHelp === 'function') {
        this._helpJob = new window.AdminUser.JobHelp(this);
      }
      return this._helpJob;
    }

    async _ensureFormJob()
    {
      if (this._formJob) {
        return this._formJob;
      }
      await this._ensureJob('form');
      if (w.AdminUser && typeof w.AdminUser.JobForm === 'function') {
        this._formJob = new window.AdminUser.JobForm(this);
      }
      return this._formJob;
    }

    /** Toast helpers (with fallbacks) */
    _toastSuccess(msg) { try { this.toastService && this.toastService.success ? this.toastService.success(msg) : console.log(msg); } catch (_) {} }
    _toastError(msg) { try { this.toastService && this.toastService.error ? this.toastService.error(msg) : console.error(msg); } catch (_) {} }
    _toastInfo(msg) { try { this.toastService && this.toastService.info ? this.toastService.info(msg) : console.log(msg); } catch (_) {} }
  }

  // グローバルへ公開（main クラス自体を constructor として露出しつつ、ジョブ格納の互換も維持）
  window.AdminUsers = window.AdminUsers || AdminUsers;
  window.AdminUsers.Main = AdminUsers;   

})(window, window.jQuery);
