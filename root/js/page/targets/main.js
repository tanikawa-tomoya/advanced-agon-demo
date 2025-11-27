(function (window, document, $)
{
  'use strict';

  // 非ESM：export/importなし、クラス定義 + window公開のみ
  class Targets
  {
    constructor()
    {
      this.root = document.querySelector('[data-page="targets"]') || document.body;
      this.config = {};
      this.state = {
        page: 1,
        pageSize: 20,
        query: '',
        filters: {},
        sort: { key: 'createdAt', dir: 'desc' },
        roleFlags: null,
        sessionUser: null
      };
      this.refs = {};
      this.jobs = {};
      this.ui = { toast: null, overlay: null, helpModal: null };
      this.labelService = null;
      this.buttonService = null;
      this.userlistAvatarService = null;
      this.avatarService = null;
      this.confirmDialogService = null;
      this.breadcrumbService = null;
      this.detailPagePath = 'target-detail.html';
      this.userSelectModalService = null;
      this._formModalTrigger = null;
      this.statusLabelConfig = {
        elementTag: 'span',
        baseClass: ['target-status', 'target-detail__badge'],
        variantPrefix: ['target-status--', 'target-detail__badge--status-'],
        attributeName: 'data-status-key',
        statusKeyCandidates: ['status', 'statusKey', 'statusCode', 'status_key', 'status_code', 'state', 'stateKey', 'stateCode', 'state_key', 'state_code'],
        textKeyCandidates: ['label', 'text', 'name', 'title', 'statusLabel', 'statusText', 'statusDisplay'],
        labelMap: {
          draft: '非公開',
          active: '公開',
          pending: '公開待ち',
          published: '公開済み',
          archived: 'アーカイブ',
          inactive: '無効',
          completed: '完了',
          cancelled: 'キャンセル',
          canceled: 'キャンセル',
          review: 'レビュー中'
        },
        variantMap: {
          draft: 'draft',
          active: 'active',
          pending: 'pending',
          published: 'active',
          archived: 'archived',
          inactive: 'inactive',
          completed: 'completed',
          cancelled: 'cancelled',
          canceled: 'cancelled',
          review: 'review'
        }
      };
      this.apiConfig = {
        endpoint: window.Utils.getApiEndpoint(),
        requestType: 'TargetManagementTargets',
        token: window.Utils.getApiToken(),
        types: {
          list: 'TargetList',
          create: 'TargetCreate',
          update: 'TargetUpdate',
          delete: 'TargetDelete'
        }
      };
    }

    async boot()
    {
      var sessionUser = await window.Services.sessionInstance.getUser();
      if (sessionUser == null) {
        window.location.href = "/login.html";
        return;
      }
      this.state.sessionUser = sessionUser;

      this.initConfig();

      // 1) service-app（正）だけを同期ロード
      const jsList = [
        { src: '/js/service-app/header/main.js' },
        { src: '/js/service-app/toast/main.js' },
        { src: '/js/service-app/loading/main.js' },
        { src: '/js/service-app/help-modal/main.js' },
        { src: '/js/service-app/button/main.js' },
        { src: '/js/service-app/label/main.js' },
        { src: '/js/service-app/userlist-avatar/main.js' },
        { src: '/js/service-app/user-avatar/main.js' },
        { src: '/js/service-app/confirm-dialog/main.js' },
        { src: '/js/service-app/breadcrumb/main.js' },
        { src: '/js/service-app/user-select-modal/main.js' }
      ];
      await window.Utils.loadScriptsSync(jsList);  // login と同じロード手順 :contentReference[oaicite:5]{index=5}

      // 2) サービス初期化（login と同等の最小セット）
      this.headerService = new window.Services.Header({
        display: { forceLoginButton: false, hideLoginButton: false, showUserInfoWhenLoggedin: true }
      });
      this.toastService = new window.Services.Toast({ position: 'top-right', duration: 3000 });

      // ルート（ローダー設置先）はページ固有要素があればそれ、なければ body
      const host = document.querySelector('[data-page="targets"]') || document.body;
      this.loadingService = new window.Services.Loading(host);
      this.helpModalService = new window.Services.HelpModal({ closeOnEsc: true, closeOnBackdrop: true });
      this.labelService = new window.Services.Label(Object.assign({}, this.statusLabelConfig));
      this.buttonService = new window.Services.button();
      this.userlistAvatarService = new window.Services.UserlistAvatar({
        size: 32,
        popoverAvatarSize: 40,
        overlap: -10,
        popoverPlacement: 'top-start',
        popoverOffset: 12
      });
      this.avatarService = new window.Services.UserAvatar({ size: 32, shape: 'circle', nameOverlay: true });
      this.confirmDialogService = new window.Services.ConfirmDialog();
      const breadcrumbContainer = document.querySelector('.screen-page') || document.body;
      this.breadcrumbService = new window.Services.Breadcrumb({ container: breadcrumbContainer });
      this.userSelectModalService = new window.Services.UserSelectModal({
        endpoint: this.apiConfig.endpoint,
        requestType: 'User',
        token: this.apiConfig.token,
        multiple: false,
        resultLimit: 200,
        text: {
          modalTitle: '作成者を選択',
          modalDescription: 'ターゲットの作成者を選択してください。',
          applyLabel: '作成者に設定'
        }
      });

      // 3) サービス起動
      await Promise.all([
        this.headerService.boot('.site-header'),
        this.toastService.boot(),
        this.loadingService.boot(),
        this.helpModalService.boot(),
        this.labelService.boot(),
        this.buttonService.boot(),
        this.userlistAvatarService.boot(),
        this.avatarService.boot(),
        this.confirmDialogService.boot(),
        this.breadcrumbService.boot(breadcrumbContainer),
        this.userSelectModalService.boot()
      ]);

      // 4) 設定・参照取得・イベント定義
      this._renderBreadcrumbs();
      this.cacheElements();
      this.renderNewButton();
      await this.applyTargetActionVisibility();
      this.ui = {
        toast: this.toastService,
        overlay: this.loadingService,
        helpModal: this.helpModalService
      };
      this.updateEvent();  // ← ここに「すべてのイベント定義」を集約（login と同型） :contentReference[oaicite:6]{index=6}

      // 5) 初回ロード（必要ジョブを遅延ロードして実行）
      await this.initialLoad();
      return this;
    }

    _renderBreadcrumbs()
    {
      if (!this.breadcrumbService)
      {
        return;
      }
      this.breadcrumbService.render([
        { label: 'ダッシュボード', href: 'dashboard.html' },
        { label: 'ターゲット管理' }
      ]);
    }

    // 旧 config.js → ここに統合（login の textConfig/selectorConfig 風にもアクセス可）
    initConfig()
    {
      var host = document.querySelector('[data-page="targets"]') || document;
      var ds = host.dataset || {};
      var apiBase = ds.apiBaseUrl || '/api/admin/targets';
      var pageSize = Number(ds.pageSize || 20);

      this.config = {
        apiBase: apiBase,
        csrfToken: ds.csrf || (function(){
          var m = document.querySelector('meta[name="csrf-token"]');
          return m ? m.getAttribute('content') : '';
        })(),
        timeoutMs: Number(ds.timeoutMs || 20000),
        pageSize: pageSize,
        endpoints: {
          list: apiBase,
          create: apiBase,
          update: function(id){ return apiBase + '/' + encodeURIComponent(id); },
          destroy: function(id){ return apiBase + '/' + encodeURIComponent(id); }
        },
        selectors: {
          container: '[data-page="targets"]',
          form:      '[data-targets-form], #target-form',
          formModal: '[data-targets-form-modal]',
          list:      '[data-targets-list], #targets-table tbody',
          search:    '[data-targets-search], #search-keyword',
          pagination:'[data-targets-pagination]',
          filterWrap:'[data-targets-filters]',
          helpTrigger:'[data-targets-help]',
          newButton: '[data-targets-new]'
        },
        texts: {
          saved: ds.textSaved || '保存しました',
          deleted: ds.textDeleted || '削除しました',
          loadError: ds.textLoadError || '読み込みに失敗しました',
          saveError: ds.textSaveError || '保存に失敗しました',
          deleteConfirm: ds.textDeleteConfirm || '削除してよろしいですか？',
          formCloseConfirm: ds.textFormCloseConfirm || '入力内容が保存されていません。モーダルを閉じますか？'
        }
      };

      // login のスタイルに合わせてアクセサを用意（任意）
      this.textConfig = this.config.texts;
      this.state.pageSize = pageSize;
      this.apiConfig.endpoint = ds.apiEndpoint || this.apiConfig.endpoint;
      this.apiConfig.requestType = ds.apiRequestType || this.apiConfig.requestType;

      var metaToken = document.querySelector('meta[name="mh-token"]');
      var resolvedMetaToken = metaToken ? (metaToken.getAttribute('content') || '') : '';
      this.apiConfig.token = ds.apiToken || resolvedMetaToken || this.apiConfig.token;
    }

    cacheElements()
    {
      var q = (sel) => document.querySelector(sel);
      var s = this.config.selectors;
      this.refs = {
        container: q(s.container) || document,
        form: q(s.form),
        list: q(s.list),
        search: q(s.search),
        pagination: q(s.pagination),
        filterWrap: q(s.filterWrap),
        helpTrigger: q(s.helpTrigger),
        newButton: q(s.newButton),
        formModal: q(s.formModal)
      };
      this.root = this.refs.container || this.root;
    }

    renderNewButton()
    {
      var svc = this.buttonService;
      var placeholder = this.refs && this.refs.newButton;
      if (!svc || typeof svc.createActionButton !== 'function') { return; }
      if (!placeholder || !placeholder.parentNode) { return; }
      var label = (placeholder.textContent || '').trim() || '新規作成';
      var options = {
        label: label,
        dataset: { action: 'new-target' },
        attributes: {
          'data-action': 'new-target',
          'data-targets-new': ''
        }
      };
      var ariaLabel = placeholder.getAttribute('aria-label');
      if (ariaLabel) {
        options.ariaLabel = ariaLabel;
      }
      try {
        var node = svc.createActionButton('target-create', options);
        if (!node) { return; }
        if (placeholder.id) { node.id = placeholder.id; }
        if (placeholder.name) { node.name = placeholder.name; }
        if (placeholder.disabled) {
          node.disabled = true;
          node.setAttribute('disabled', 'disabled');
        }
        placeholder.parentNode.replaceChild(node, placeholder);
        this.refs.newButton = node;
      } catch (err) {
        if (window.console && typeof window.console.warn === 'function') {
          window.console.warn('[targets] failed to render new button', err);
        }
      }
    }

    async resolveSessionRoleFlags()
    {
      if (this.state && this.state.roleFlags)
      {
        return this.state.roleFlags;
      }

      var service = window.Services && window.Services.sessionInstance;
      if (!service)
      {
        return null;
      }

      var profile = null;
      if (typeof service.getUser === 'function')
      {
        profile = await service.getUser();
      }
      if (!profile && typeof service.loadFromStorage === 'function')
      {
        profile = await service.loadFromStorage();
      }
      if (!profile && typeof service.syncFromServer === 'function')
      {
        profile = await service.syncFromServer();
      }

      var normalizedRoles = this._normalizeProfileRoles(profile);
      var hasSupervisorRole = normalizedRoles.some(function (role)
      {
        return role === 'supervisor' || role.indexOf('supervisor') !== -1;
      });
      var hasOperatorRole = normalizedRoles.some(function (role)
      {
        return role === 'operator' || role.indexOf('operator') !== -1;
      });
      var flags = {
        isSupervisor: hasSupervisorRole || this._normalizeRoleFlag(profile && profile.isSupervisor),
        isOperator: hasOperatorRole || this._normalizeRoleFlag(profile && profile.isOperator)
      };
      flags.canManageTargets = !!(flags.isSupervisor || flags.isOperator);
      this.state.sessionUser = profile || this.state.sessionUser;
      this.state.roleFlags = flags;
      return flags;
    }

    async applyTargetActionVisibility()
    {
      var flags = await this.resolveSessionRoleFlags();
      var allowActions = !!(flags && flags.canManageTargets);
      var selectors = [
        '[data-action="new-target"]',
        '[data-action="edit-target"]',
        '[data-action="delete-target"]'
      ];
      var root = this.root || document;
      for (var i = 0; i < selectors.length; i++)
      {
        var nodes = root.querySelectorAll(selectors[i]);
        if (!nodes || !nodes.length)
        {
          continue;
        }
        for (var j = 0; j < nodes.length; j++)
        {
          var node = nodes[j];
          if (allowActions)
          {
            node.hidden = false;
            node.removeAttribute('hidden');
            node.setAttribute('aria-hidden', 'false');
          }
          else
          {
            node.hidden = true;
            node.setAttribute('aria-hidden', 'true');
          }
        }
      }
    }

    _normalizeRoleFlag(flag)
    {
      if (flag === undefined || flag === null)
      {
        return false;
      }
      if (typeof flag === 'string')
      {
        var normalized = flag.trim().toLowerCase();
        return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'y';
      }
      return flag === true || flag === 1;
    }

    _normalizeProfileRoles(profile)
    {
      var roles = [];
      var appendRole = function (value)
      {
        if (!value)
        {
          return;
        }
        if (Array.isArray(value))
        {
          roles = roles.concat(value);
          return;
        }
        if (typeof value === 'string')
        {
          roles = roles.concat(value.split(/[\s、,，|\/]+/));
        }
      };

      appendRole(profile && profile.roles);
      appendRole(profile && profile.role);
      appendRole(profile && profile.roleName);
      appendRole(profile && profile.roleLabel);

      return roles.map(function (role)
      {
        return String(role || '').trim().toLowerCase();
      }).filter(function (role)
      {
        return !!role;
      });
    }

    /**
     * 旧 event.js → ここへ集約（login/main.js の updateEvent と同じ設計）
     * - jQuery の名前空間付き委譲（.targets）
     * - 必要な job-*.js はイベント内で loadScriptsSync → new Job* で実行
     */
    updateEvent()
    {
      var self = this;
      var s = this.config.selectors;

      // 既存ハンドラをクリア（名前空間）
      $(document).off('.targets');

      // フォーム送信（作成・更新）
      $(document).on('submit.targets', s.form, async function (ev) {
        ev.preventDefault();
        var job = await self.useJob('form');
        if (!job) return;
        try {
          var saved = await job.submit(ev.currentTarget, self.textConfig);
          if (!saved) return;
          await self.reloadList({ page: 1 });
          self.closeFormModal();
        } catch (err) {
          if (window.console && window.console.error) window.console.error(err);
        }
      });

      // クリックアクション（view/new/edit/delete/page/help）
      $(document)
        .on('click.targets', '[data-action="new-target"]', async function (ev) {
          ev.preventDefault();
          var job = await self.useJob('form');
          if (!job) return;
          job.reset();
          if (self.refs.formModal && self.refs.formModal.contains(ev.currentTarget)) {
            return;
          }
          self.openFormModal(ev.currentTarget);
        })
        .on('click.targets', '[data-action="select-target-creator"]', async function (ev) {
          ev.preventDefault();
          var job = await self.useJob('form');
          if (!job) return;
          job.openCreatorSelector(ev.currentTarget);
        })
        .on('click.targets', '[data-action="clear-target-creator"]', async function (ev) {
          ev.preventDefault();
          var job = await self.useJob('form');
          if (!job) return;
          job.clearCreatorSelection();
        })
        .on('click.targets', '[data-action="select-target-participants"]', async function (ev) {
          ev.preventDefault();
          var job = await self.useJob('form');
          if (!job) return;
          await job.openParticipantSelector(ev.currentTarget);
        })
        .on('click.targets', '[data-action="clear-target-participants"]', async function (ev) {
          ev.preventDefault();
          var job = await self.useJob('form');
          if (!job) return;
          job.clearParticipantSelection();
        })
        .on('change.targets', '[data-target-image-input]', async function (ev) {
          var job = await self.useJob('form');
          if (!job) return;
          job.updateImageSelectionFromInput(ev.currentTarget);
        })
        .on('click.targets', '[data-action="clear-target-image"]', async function (ev) {
          ev.preventDefault();
          var job = await self.useJob('form');
          if (!job) return;
          job.clearImageSelection();
        })
        .on('click.targets', '.targets__calendar-button', function (ev) {
          ev.preventDefault();
          var button = ev.currentTarget || this;
          var control = button && button.closest ? button.closest('.targets__date-control') : null;
          var input = control ? control.querySelector('input[type="date"]') : null;
          if (input && typeof input.showPicker === 'function') {
            input.showPicker();
            return;
          }
          if (input) {
            input.focus();
            input.click();
          }
        })
        .on('click.targets', '[data-action="view-target"]', function (ev) {
          ev.preventDefault();
          var id = this.getAttribute('data-id');
          var url = self.buildTargetDetailUrl(id);
          if (url) {
            window.location.href = url;
          }
        })
        .on('click.targets', '[data-action="edit-target"]', async function (ev) {
          ev.preventDefault();
          var id = this.getAttribute('data-id');
          var job = await self.useJob('form');
          if (!job) return;
          await job.beginEdit(id);
          self.openFormModal(ev.currentTarget);
        })
        .on('click.targets', '[data-action="delete-target"]', async function (ev) {
          ev.preventDefault();
          var id = this.getAttribute('data-id');
          var confirmed = await self.confirmDialogService.open(
            self.textConfig.deleteConfirm || '削除してよろしいですか？',
            { type: 'warning' }
          );
          if (!confirmed) return;
          var job = await self.useJob('form');
          if (!job) return;
          await job.remove(id);
          await self.reloadList();
        })
        .on('click.targets', '[data-action="page"]', async function (ev) {
          ev.preventDefault();
          var page = Number(this.getAttribute('data-page') || 1);
          await self.reloadList({ page: page });
        })
        .on('click.targets', '[data-action="open-help"]', async function (ev) {
          ev.preventDefault();
          var topic = this.getAttribute('data-topic') || 'overview';
          var job = await self.useJob('help');
          if (!job) return;
          job.open(topic);
        })
        .on('click.targets', '[data-action="close-target-modal"]', async function (ev) {
          ev.preventDefault();
          await self.requestCloseFormModal();
        });

      // 検索（Enter で実行）
      $(document).on('keydown.targets', s.search, async function (ev) {
        if ((ev.key && ev.key.toLowerCase() === 'enter') || ev.keyCode === 13) {
          ev.preventDefault();
          var q = this.value || '';
          await self.reloadList({ page: 1, query: q });
        }
      });

      $(document).on('keydown.targets', async function (ev) {
        var key = ev.key || ev.keyCode;
        var isEscape = typeof key === 'string' ? key.toLowerCase() === 'escape' : key === 27;
        if (isEscape && self.isFormModalOpen()) {
          ev.preventDefault();
          await self.requestCloseFormModal();
        }
      });

      // フィルタ変更（即時再検索）
      $(document).on('change.targets', (s.filterWrap ? (s.filterWrap + ' ') : '') + '[name^="filter."]', async function () {
        var filters = self._collectFilters();
        await self.reloadList({ page: 1, filters: filters });
      });
    }

    buildTargetDetailUrl(targetCode)
    {
      var base = this.detailPagePath || 'target-detail.html';
      var code = targetCode != null ? String(targetCode) : '';
      if (!code) {
        return base;
      }
      var params = new window.URLSearchParams();
      params.set('targetCode', code);
      return base + '?' + params.toString();
    }

    teardownEvents()
    {
      // login と同様：名前空間でまとめて解除
      $(document).off('.targets');
    }

    async initialLoad()
    {
      try {
        if (this.loadingService && this.loadingService.show) this.loadingService.show();
        // 遅延ロード → 一覧初回描画
        await this.reloadList({
          page: this.state.page,
          query: this.state.query,
          filters: this.state.filters
        });
      } catch (err) {
        if (this.toastService && this.toastService.error) this.toastService.error(this.config.texts.loadError);
        if (window.console) console.error(err);
      } finally {
        if (this.loadingService && this.loadingService.hide) this.loadingService.hide();
      }
    }

    async reloadList(params)
    {
      var job = await this.useJob('view');
      if (!job) return;
      if (params && typeof params.query !== 'undefined') this.state.query = params.query;
      if (params && params.filters) this.state.filters = params.filters;
      await job.loadPage(params || {});
      await this.applyTargetActionVisibility();
    }

    async useJob(kind)
    {
      var srcMap = {
        view: '/js/page/targets/job-view.js',
        form: '/js/page/targets/job-form.js',
        help: '/js/page/targets/job-help.js'
      };
      var src = srcMap[kind];
      if (!src) return null;
      if (!this.jobs[kind]) {
        await window.Utils.loadScriptsSync([{ src: src }]);
        var classMap = { view: 'JobView', form: 'JobForm', help: 'JobHelp' };
        var ctorName = classMap[kind];
        var namespace = window.Targets;
        var Ctor = namespace && namespace[ctorName];
        if (typeof Ctor !== 'function') {
          console.error('[targets] missing job constructor:', kind);
          return null;
        }
        this.jobs[kind] = new Ctor(this);
      }
      return this.jobs[kind];
    }

    openFormModal(triggerEl)
    {
      var modal = this.refs.formModal;
      if (!modal) return;
      if (triggerEl && (!modal.contains(triggerEl))) {
        this._formModalTrigger = triggerEl;
      } else if (!this._formModalTrigger && triggerEl) {
        this._formModalTrigger = triggerEl;
      }
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('is-visible', 'is-open');
      this._lockBodyScroll();
      var focusTarget = modal.querySelector('[data-initial-focus], input, select, textarea, button');
      if (focusTarget && focusTarget.focus) {
        try { focusTarget.focus({ preventScroll: true }); }
        catch (_) { focusTarget.focus(); }
        return;
      }
      var dialog = modal.querySelector('[role="dialog"]');
      if (dialog && dialog.focus) {
        try { dialog.focus({ preventScroll: true }); }
        catch (_) { dialog.focus(); }
      }
    }

    async requestCloseFormModal()
    {
      if (!this.isFormModalOpen())
      {
        return false;
      }
      var shouldClose = true;
      var job = await this.useJob('form');
      if (job && typeof job.isDirty === 'function' && job.isDirty())
      {
        var message = (this.textConfig && this.textConfig.formCloseConfirm)
          ? this.textConfig.formCloseConfirm
          : '入力内容が保存されていません。モーダルを閉じますか？';
        if (this.confirmDialogService && typeof this.confirmDialogService.open === 'function')
        {
          shouldClose = await this.confirmDialogService.open(message, { type: 'warning' });
        }
      }
      if (shouldClose)
      {
        this.closeFormModal();
      }
      return shouldClose;
    }

    closeFormModal()
    {
      var modal = this.refs.formModal;
      if (!modal) return;
      modal.setAttribute('aria-hidden', 'true');
      modal.classList.remove('is-visible', 'is-open');
      modal.hidden = true;
      this._unlockBodyScroll();
      if (this._formModalTrigger && this._formModalTrigger.focus) {
        try { this._formModalTrigger.focus({ preventScroll: true }); }
        catch (_) { this._formModalTrigger.focus(); }
      }
      this._formModalTrigger = null;
    }

    isFormModalOpen()
    {
      var modal = this.refs.formModal;
      return !!(modal && !modal.hidden && (modal.classList.contains('is-visible') || modal.classList.contains('is-open')));
    }

    _collectFilters()
    {
      var wrap = this.refs && this.refs.filterWrap
          ? this.refs.filterWrap
          : document.querySelector(this.config.selectors.filterWrap);
      var filters = {};
      if (!wrap) return filters;
      var nodes = wrap.querySelectorAll('[name^="filter."]');
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        var name = el.getAttribute('name') || '';
        var key = name.split('.').slice(1).join('.') || name;
        if (el.tagName === 'SELECT' || el.tagName === 'INPUT') {
          filters[key] = el.value;
        }
      }
      this.state.filters = filters;
      return filters;
    }

    _lockBodyScroll()
    {
      if (document && document.body)
      {
        document.body.classList.add('is-modal-open');
      }
    }

    _unlockBodyScroll()
    {
      if (!document || !document.body)
      {
        return;
      }
      var stillOpen = document.querySelector('.screen-modal.is-open, .c-help-modal.is-open, [data-modal-open="true"]');
      if (stillOpen)
      {
        return;
      }
      document.body.classList.remove('is-modal-open');
    }

    async callApi(action, payload, options)
    {
      options = options || {};
      var api = this.apiConfig || {};
      var typeKey = (api.types && api.types[action]) || action;
      if (!typeKey) {
        throw new Error('Unknown action: ' + action);
      }
      var normalizedPayload = this._normalizeDisplayFlagsForRequest(typeKey, payload, options);
      var formData = new FormData();
      if (api.requestType) formData.append('requestType', api.requestType);
      if (api.token) formData.append('token', api.token);
      formData.append('type', typeKey);
      this._appendFormData(formData, normalizedPayload);

      var res = await fetch(api.endpoint || window.Utils.getApiEndpoint(), {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!res.ok) {
        var txt = '';
        try { txt = await res.text(); } catch (e) {}
        throw new Error(txt || ('HTTP ' + res.status));
      }
      var text = await res.text();
      var json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch (err) {
        throw new Error('Failed to parse response');
      }
      if (json && json.status && json.status !== 'OK') {
        var reason = json.reason ? (' (' + json.reason + ')') : '';
        throw new Error('API Error' + reason);
      }
      return json.result || json.data || json.items || json;
    }

    _appendFormData(formData, payload)
    {
      if (!payload || typeof payload !== 'object') return;
      Object.keys(payload).forEach(function (key) {
        var value = payload[key];
        if (value === undefined || value === null) return;
        if (Array.isArray(value)) {
          if (!value.length) {
            formData.append(key + '[]', '');
            return;
          }
          value.forEach(function (item) {
            if (item === undefined || item === null) return;
            formData.append(key + '[]', item);
          });
          return;
        }
        if (typeof value === 'object' && !(value instanceof File)) {
          formData.append(key, JSON.stringify(value));
          return;
        }
        formData.append(key, value);
      });
    }

    _normalizeDisplayFlagsForRequest(typeKey, payload, options)
    {
      var api = this.apiConfig || {};
      var displayFlagKeys = [
        'displayGuidance',
        'displayGoals',
        'displayAgreements',
        'displayAnnouncements',
        'displayReferences',
        'displaySchedules',
        'displayChat',
        'displaySubmissions',
        'displayReviews',
        'displayBadges',
        'displaySurvey'
      ];
      if (options && options.skipDisplayNormalization) {
        return payload;
      }
      var requiresDisplayFlags = typeKey === (api.types && api.types.create)
        || typeKey === (api.types && api.types.update);
      if (!requiresDisplayFlags || !payload || typeof payload !== 'object') {
        return payload;
      }
      var normalized = Object.assign({}, payload);
      var self = this;
      displayFlagKeys.forEach(function (key)
      {
        var value = Object.prototype.hasOwnProperty.call(normalized, key)
          ? normalized[key]
          : undefined;
        normalized[key] = self._normalizeDisplayFlagValue(value) ? '1' : '0';
      });
      return normalized;
    }

    _normalizeDisplayFlagValue(value)
    {
      if (Array.isArray(value))
      {
        if (!value.length)
        {
          return false;
        }
        return this._normalizeDisplayFlagValue(value[value.length - 1]);
      }
      if (typeof value === 'boolean')
      {
        return value;
      }
      if (typeof value === 'number')
      {
        return value !== 0;
      }
      if (value === null || typeof value === 'undefined')
      {
        return false;
      }
      var str = String(value).trim().toLowerCase();
      if (!str)
      {
        return false;
      }
      if (str === '1' || str === 'true' || str === 'yes' || str === 'on')
      {
        return true;
      }
      if (str === '0' || str === 'false' || str === 'no' || str === 'off')
      {
        return false;
      }
      if (!Number.isNaN(Number(str)))
      {
        return Number(str) !== 0;
      }
      return true;
    }
  }
  window.Targets = window.Targets || Targets;
})(window, document, window.jQuery);
