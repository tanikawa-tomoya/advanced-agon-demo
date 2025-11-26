(function (window, document) {
  'use strict';

  function escapeHtml(value) {
    var str = String(value == null ? '' : value);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  class AdminAnnouncements {
    constructor(name) {
      this.name = name || 'admin-announcements';
      this.state = {
        announcements: [],
        pagination: { page: 1, perPage: 25, totalCount: 0, totalPages: 0 },
        selectedId: '',
        recipients: [],
        recipientsStatus: 'all',
        ackLookup: {},
        listRequest: null,
        recipientsRequest: null,
        scaffolded: false,
        formMode: 'create',
        formEditingId: '',
        formAudienceSelection: []
      };
      this.elements = {};
      this.textConfig = {};
      this.selectorConfig = {};
      this.perPageOptions = [10, 25, 50, 100];
      this.buttonService = null;
      this.confirmDialogService = null;
      this.breadcrumbService = null;
      this.userSelectModalService = null;
      this.avatarService = null;
    }

    async boot()
    {
      if (await window.Services.sessionInstance.getUser() == null) {
        window.location.href = "/login.html";
        return;
      }

      const jsList = [
        { src: '/js/service-app/header/main.js' },
        { src: '/js/service-app/toast/main.js' },
        { src: '/js/service-app/loading/main.js' },
        { src: '/js/service-app/help-modal/main.js' },
        { src: '/js/service-app/button/main.js' },
        { src: '/js/service-app/confirm-dialog/main.js' },
        { src: '/js/service-app/breadcrumb/main.js' },
        { src: '/js/service-app/user-select-modal/main.js' },
        { src: '/js/service-app/user-avatar/main.js' }
      ];
      await window.Utils.loadScriptsSync(jsList);

      this.headerService = new window.Services.Header({
        display: { forceLoginButton: false, hideLoginButton: false, showUserInfoWhenLoggedin: true }
      });
      var host = document.querySelector('#announcement-management') || document.querySelector('[data-app="admin-announcements"]');
      this.toastService = new window.Services.Toast({ position: 'top-right', duration: 3000 });
      this.loadingService = new window.Services.Loading(host || document.body);
      this.helpModalService = new window.Services.HelpModal({ closeOnBackdrop: true, closeOnEsc: true });
      this.buttonService = new window.Services.button();
      this.confirmDialogService = new window.Services.ConfirmDialog();
      const breadcrumbContainer = document.querySelector('.screen-page') || document.body;
      this.breadcrumbService = new window.Services.Breadcrumb({ container: breadcrumbContainer });
      this.userSelectModalService = new window.Services.UserSelectModal({ multiple: true });
      this.avatarService = new window.Services.UserAvatar({ size: 32, shape: 'circle' });

      await Promise.all([
        this.headerService.boot('.site-header'),
        this.toastService.boot(),
        this.loadingService.boot(),
        this.helpModalService.boot(),
        this.buttonService.boot(),
        this.confirmDialogService.boot(),
        this.breadcrumbService.boot(breadcrumbContainer),
        this.userSelectModalService.boot(),
        this.avatarService.boot()
      ]);

      this._renderBreadcrumbs();
      this._initConfig();
      this._updateEvent();
      await this._init();
    }

    _renderBreadcrumbs()
    {
      if (!this.breadcrumbService)
      {
        return;
      }
      this.breadcrumbService.render([
        { label: 'ダッシュボード', href: 'dashboard.html' },
        { label: 'お知らせ管理' }
      ]);
    }

    _initConfig() {
      this.textConfig = {
        summary: 'システム全体のお知らせを作成し、確認状況を管理します。',
        addButton: 'お知らせを追加',
        refreshButton: '再読み込み',
        loading: '読み込み中…',
        listEmpty: '登録済みのお知らせはありません。',
        listError: 'お知らせの取得に失敗しました。時間をおいて再度お試しください。',
        formTitleCreate: 'お知らせを追加',
        formTitleEdit: 'お知らせを編集',
        formSubmitCreate: '追加する',
        formSubmitEdit: '保存する',
        formCancel: 'キャンセル',
        formValidationError: 'タイトルと内容を入力してください。',
        formError: 'お知らせの保存に失敗しました。',
        formSuccessCreate: 'お知らせを追加しました。',
        formSuccessEdit: 'お知らせを更新しました。',
        formAudienceLabel: '表示対象',
        formAudienceHelp: 'お知らせを表示させる対象ユーザーを選択してください。',
        formAudienceAll: '全ユーザー',
        formAudienceSupervisors: '管理者のみ',
        formAudienceOperators: 'オペレーターのみ',
        formAudienceMembers: 'メンバーのみ',
        formAudienceEmpty: '対象ユーザーはまだ選択されていません。',
        formAudienceSelectButton: '対象ユーザーを選択',
        formAudienceClearButton: '選択をクリア',
        formAudienceSelectionCount: '選択中: {count}名',
        formAudienceSelectionRequired: '対象ユーザーを選択してください。',
        deleteConfirm: 'このお知らせを削除しますか？',
        deleteSuccess: 'お知らせを削除しました。',
        deleteError: 'お知らせの削除に失敗しました。',
        detailAudienceLabel: '対象',
        createdAtLabel: '作成日時',
        updatedAtLabel: '最終更新',
        createdByLabel: '作成者',
        recipientsTitle: '確認状況',
        recipientsEmpty: '対象ユーザーが見つかりません。',
        recipientsError: '確認状況を取得できませんでした。',
        recipientsLoading: '確認状況を読み込み中…',
        recipientsFilterAll: 'すべて',
        recipientsFilterAck: '確認済み',
        recipientsFilterUnack: '未確認',
        recipientsRefresh: '再読み込み',
        recipientsAck: '既読にする',
        recipientsUnack: '未読に戻す',
        recipientsAckSuccess: '確認状況を更新しました。',
        recipientsAckError: '確認状況の更新に失敗しました。',
        recipientsAckLabel: '確認日時',
        paginationStatus: '{page}/{total}ページ（全{count}件）',
        paginationStatusSingle: '全{count}件',
        perPageLabel: '表示件数',
        perPageUnit: '件',
        statusSummary: 'お知らせ一覧',
        helpCloseLabel: 'ヘルプモーダルを閉じる',
        detailModalClose: 'モーダルを閉じる'
      };

      this.selectorConfig = {
        root: '#announcement-management',
        refreshBtn: '[data-action="refresh"]',
        createBtn: '[data-action="create"]',
        tableBody: '[data-block="table"] tbody',
        tableRows: '[data-announcement-id]',
        selectBtn: '[data-action="select"]',
        viewBtn: '[data-action="view-detail"]',
        editBtn: '[data-action="edit"]',
        deleteBtn: '[data-action="delete"]',
        perPage: '[data-role="per-page"]',
        pager: '[data-block="pager"]',
        formWrapper: '[data-block="form"]',
        form: '[data-block="form"] form',
        formSubmit: '[data-block="form"] [data-action="submit-form"]',
        formCancel: '[data-action="cancel-form"]',
        recipientFilter: '[data-role="recipient-filter"]',
        recipientRefresh: '[data-action="recipients-refresh"]',
        recipientToggleAck: '[data-action="toggle-ack"]',
        recipientsTableBody: '[data-block="recipients-table"] tbody',
        detailModal: '[data-block="detail-modal"]',
        detailModalClose: '[data-action="close-detail-modal"]'
      };
    }

    _updateEvent() {
      var sel = this.selectorConfig;
      var namespace = '.admin-announcements';
      var self = this;
      $(document).off(namespace);

      $(document).on('click' + namespace, sel.refreshBtn, async function (ev) {
        ev.preventDefault();
        await window.Utils.loadScriptsSync([{ src: '/js/page/admin-announcements/job-list.js' }]);
        var ctor = window.AdminAnnouncement && window.AdminAnnouncement.JobList;
        if (!ctor) { return; }
        new ctor(self).refresh({ resetPage: true });
      });

      $(document).on('click' + namespace, sel.createBtn, async function (ev) {
        ev.preventDefault();
        await window.Utils.loadScriptsSync([{ src: '/js/page/admin-announcements/job-add-modal.js' }]);
        var ctor = window.AdminAnnouncement && window.AdminAnnouncement.JobAddModal;
        if (!ctor) { return; }
        new ctor(self).open();
      });

      $(document).on('click' + namespace, '[data-action="form-select-audience"]', function (ev) {
        ev.preventDefault();
        self.openFormAudienceModal();
      });

      $(document).on('click' + namespace, '[data-action="form-clear-audience"]', function (ev) {
        ev.preventDefault();
        self.setFormAudienceSelection([]);
      });

      $(document).on('click' + namespace, sel.tableBody + ' ' + sel.selectBtn, async function (ev) {
        ev.preventDefault();
        var id = this.closest('tr') ? this.closest('tr').getAttribute('data-announcement-id') : '';
        if (!id) { return; }
        await window.Utils.loadScriptsSync([{ src: '/js/page/admin-announcements/job-list.js' }]);
        var ctor = window.AdminAnnouncement && window.AdminAnnouncement.JobList;
        if (!ctor) { return; }
        new ctor(self).selectAnnouncement(id);
      });

      $(document).on('keydown' + namespace, sel.tableBody + ' ' + sel.selectBtn, async function (ev) {
        var key = ev.key || ev.keyCode;
        var isEnter = key === 'Enter' || key === 13;
        var isSpace = key === ' ' || key === 'Spacebar' || key === 32;
        if (!isEnter && !isSpace) { return; }
        ev.preventDefault();
        var id = this.closest('tr') ? this.closest('tr').getAttribute('data-announcement-id') : '';
        if (!id) { return; }
        await window.Utils.loadScriptsSync([{ src: '/js/page/admin-announcements/job-list.js' }]);
        var ctor = window.AdminAnnouncement && window.AdminAnnouncement.JobList;
        if (!ctor) { return; }
        new ctor(self).selectAnnouncement(id);
      });

      $(document).on('click' + namespace, sel.tableBody + ' ' + sel.viewBtn, async function (ev) {
        ev.preventDefault();
        var id = this.closest('tr') ? this.closest('tr').getAttribute('data-announcement-id') : '';
        if (!id) { return; }
        await window.Utils.loadScriptsSync([{ src: '/js/page/admin-announcements/job-detail-modal.js' }]);
        var ctor = window.AdminAnnouncement && window.AdminAnnouncement.JobDetailModal;
        if (!ctor) { return; }
        new ctor(self).open(id);
      });

      $(document).on('click' + namespace, sel.tableBody + ' ' + sel.editBtn, async function (ev) {
        ev.preventDefault();
        var id = this.closest('tr') ? this.closest('tr').getAttribute('data-announcement-id') : '';
        if (!id) { return; }
        await window.Utils.loadScriptsSync([{ src: '/js/page/admin-announcements/job-edit-modal.js' }]);
        var ctor = window.AdminAnnouncement && window.AdminAnnouncement.JobEditModal;
        if (!ctor) { return; }
        new ctor(self).open(id);
      });

      $(document).on('click' + namespace, sel.tableBody + ' ' + sel.deleteBtn, async function (ev) {
        ev.preventDefault();
        var id = this.closest('tr') ? this.closest('tr').getAttribute('data-announcement-id') : '';
        if (!id) { return; }
        await window.Utils.loadScriptsSync([{ src: '/js/page/admin-announcements/job-list.js' }]);
        var ctor = window.AdminAnnouncement && window.AdminAnnouncement.JobList;
        if (!ctor) { return; }
        await new ctor(self).deleteAnnouncement(id);
      });

      $(document).on('click' + namespace, sel.detailModalClose, async function (ev) {
        ev.preventDefault();
        await window.Utils.loadScriptsSync([{ src: '/js/page/admin-announcements/job-detail-modal.js' }]);
        var ctor = window.AdminAnnouncement && window.AdminAnnouncement.JobDetailModal;
        if (!ctor) { return; }
        new ctor(self).close();
      });

      $(document).on('submit' + namespace, sel.form, function (ev) {
        ev.preventDefault();
        self.submitForm($(this));
      });

      $(document).on('click' + namespace, sel.formCancel, function (ev) {
        ev.preventDefault();
        self.cancelForm();
      });

      $(document).on('change' + namespace, sel.perPage, async function () {
        var value = this.value;
        await window.Utils.loadScriptsSync([{ src: '/js/page/admin-announcements/job-list.js' }]);
        var ctor = window.AdminAnnouncement && window.AdminAnnouncement.JobList;
        if (!ctor) { return; }
        new ctor(self).changePerPage(value);
      });

      $(document).on('change' + namespace, sel.recipientFilter, async function () {
        var value = this.value;
        await window.Utils.loadScriptsSync([{ src: '/js/page/admin-announcements/job-list.js' }]);
        var ctor = window.AdminAnnouncement && window.AdminAnnouncement.JobList;
        if (!ctor) { return; }
        new ctor(self).changeRecipientFilter(value);
      });

      $(document).on('click' + namespace, sel.recipientRefresh, async function (ev) {
        ev.preventDefault();
        await window.Utils.loadScriptsSync([{ src: '/js/page/admin-announcements/job-list.js' }]);
        var ctor = window.AdminAnnouncement && window.AdminAnnouncement.JobList;
        if (!ctor) { return; }
        new ctor(self).reloadRecipients();
      });

      $(document).on('click' + namespace, '#announcement-management-help-button', async function (ev) {
        ev.preventDefault();
        await window.Utils.loadScriptsSync([{ src: '/js/page/admin-announcements/job-help.js' }]);
        var ctor = window.AdminAnnouncement && window.AdminAnnouncement.JobHelp;
        if (!ctor) { return; }
        new ctor(self).open();
      });

      $(document).on('click' + namespace, sel.pager + ' [data-page]', async function (ev) {
        ev.preventDefault();
        var page = parseInt(this.getAttribute('data-page'), 10);
        if (!isFinite(page)) { return; }
        await window.Utils.loadScriptsSync([{ src: '/js/page/admin-announcements/job-list.js' }]);
        var ctor = window.AdminAnnouncement && window.AdminAnnouncement.JobList;
        if (!ctor) { return; }
        new ctor(self).refresh({ page: page });
      });

      $(document).on('click' + namespace, sel.recipientToggleAck, async function (ev) {
        ev.preventDefault();
        var userCode = this.getAttribute('data-user-code');
        var normalized = this.getAttribute('data-normalized-user-code');
        var acknowledged = this.getAttribute('data-acknowledged') === '1';
        await window.Utils.loadScriptsSync([{ src: '/js/page/admin-announcements/job-list.js' }]);
        var ctor = window.AdminAnnouncement && window.AdminAnnouncement.JobList;
        if (!ctor) { return; }
        new ctor(self).toggleAcknowledgement(userCode, normalized, acknowledged);
      });
    }

    async _init() {
      var $root = this._pickRoot();
      this._ensureScaffold($root);
      await window.Utils.loadScriptsSync([{ src: '/js/page/admin-announcements/job-list.js' }]);
      var ctor = window.AdminAnnouncement && window.AdminAnnouncement.JobList;
      if (!ctor) { return; }
      new ctor(this).refresh({ resetPage: true });
    }

    _pickRoot() {
      if (this.state.$root && this.state.$root.length) { return this.state.$root; }
      var selector = this.selectorConfig.root || '#announcement-management';
      var $root = $(selector).first();
      if (!$root.length) {
        $root = $('<section id="announcement-management" data-app="admin-announcements"></section>').appendTo('body');
      }
      this.state.$root = $root;
      return $root;
    }

    _buildScaffoldHtml() {
      var TEXT = this.textConfig;
      var summaryText = escapeHtml(TEXT.summary || '');
      var addLabel = escapeHtml(TEXT.addButton || '追加');
      var refreshLabel = escapeHtml(TEXT.refreshButton || '再読み込み');
      var perPageLabel = escapeHtml(TEXT.perPageLabel || '表示件数');
      var formTitle = escapeHtml(TEXT.formTitleCreate || 'お知らせを追加');
      var formSubmit = escapeHtml(TEXT.formSubmitCreate || '追加する');
      var formCancel = escapeHtml(TEXT.formCancel || 'キャンセル');
      var audienceLabel = escapeHtml(TEXT.formAudienceLabel || '表示対象');
      var audienceHelp = TEXT.formAudienceHelp ? escapeHtml(TEXT.formAudienceHelp) : '';
      var audienceEmpty = escapeHtml(TEXT.formAudienceEmpty || '対象ユーザーはまだ選択されていません。');
      var audienceSelectLabel = escapeHtml(TEXT.formAudienceSelectButton || '対象ユーザーを選択');
      var audienceClearLabel = escapeHtml(TEXT.formAudienceClearButton || '選択をクリア');
      var audienceCountText = escapeHtml(this._formatAudienceSelectionCount(0));
      var formModalTitleId = 'announcement-management-form-modal-title';
      var formModalFeedbackId = 'announcement-management-form-modal-feedback';
      var detailModalTitleId = 'announcement-management-detail-modal-title';
      var detailModalBodyId = 'announcement-management-detail-modal-body';
      var detailModalClose = escapeHtml(TEXT.detailModalClose || '閉じる');

      return '' +
        '<div class="announcement-management" data-app="admin-announcements">' +
        '  <header class="announcement-management__header">' +
        '    <p class="announcement-management__summary" data-block="summary">' + summaryText + '</p>' +
        '    <div class="announcement-management__header-actions">' +
        '      <label class="announcement-management__per-page">' +
        '        <span class="announcement-management__per-page-label">' + perPageLabel + '</span>' +
        '        <select data-role="per-page" class="announcement-management__per-page-select"></select>' +
        '      </label>' +
        '      <button type="button" class="btn btn--ghost" data-action="refresh">' + refreshLabel + '</button>' +
        '      <button type="button" class="btn btn--primary" data-action="create">' + addLabel + '</button>' +
        '    </div>' +
        '  </header>' +
        '  <div class="announcement-management__status" data-block="status" role="status" aria-live="polite"></div>' +
        '  <div class="announcement-management__table-wrapper" data-block="table-wrapper">' +
        '    <table class="announcement-management__table targets__table" data-block="table">' +
        '      <thead>' +
        '        <tr>' +
        '          <th scope="col">タイトル</th>' +
        '          <th scope="col">' + escapeHtml(TEXT.updatedAtLabel || '最終更新') + '</th>' +
        '          <th scope="col">既読数</th>' +
        '          <th scope="col">操作</th>' +
        '        </tr>' +
        '      </thead>' +
        '      <tbody></tbody>' +
        '    </table>' +
        '  </div>' +
        '  <div class="announcement-management__empty hidden" data-block="empty"></div>' +
        '  <div class="announcement-management__pager" data-block="pager" hidden></div>' +
        '  <div class="screen-modal announcement-management__form-modal hidden" data-block="form-modal" aria-hidden="true" hidden>' +
        '    <div class="screen-modal__overlay" data-modal-close data-action="cancel-form" aria-label="モーダルを閉じる"></div>' +
        '    <section class="screen-modal__content announcement-management__form-modal-content" role="dialog" aria-modal="true" aria-labelledby="' + formModalTitleId + '" aria-describedby="' + formModalFeedbackId + '">' +
        '      <button type="button" class="screen-modal__close" data-modal-close data-action="cancel-form" data-modal-initial-focus aria-label="モーダルを閉じる">×</button>' +
        '      <div class="screen-modal__body announcement-management__form-modal-body">' +
        '        <section class="announcement-management__form hidden" data-block="form" aria-live="polite">' +
        '          <h2 class="announcement-management__form-title" id="' + formModalTitleId + '" data-form="title">' + formTitle + '</h2>' +
        '          <form class="announcement-management__form-body" novalidate>' +
        '            <input type="hidden" name="id" data-field="id" value="" />' +
        '            <div class="announcement-management__form-field">' +
        '              <label class="announcement-management__form-label">タイトル' +
        '                <input type="text" name="title" data-field="title" required />' +
        '              </label>' +
        '            </div>' +
        '            <div class="announcement-management__form-field">' +
        '              <label class="announcement-management__form-label">内容' +
        '                <textarea name="content" rows="6" data-field="content" required></textarea>' +
        '              </label>' +
        '            </div>' +
        '            <div class="announcement-management__form-field">' +
        '              <div class="announcement-management__form-label">' + audienceLabel + '</div>' +
        '              <div class="announcement-management__audience-selector" data-form="audience-selector">' +
        '                <p class="announcement-management__audience-count" data-form="audience-count">' + audienceCountText + '</p>' +
        '                <ul class="announcement-management__audience-list hidden" data-form="audience-list" hidden></ul>' +
        '                <p class="announcement-management__audience-empty" data-form="audience-empty">' + audienceEmpty + '</p>' +
        '                <div class="announcement-management__audience-actions">' +
        '                  <button type="button" class="btn btn--ghost" data-action="form-select-audience">' + audienceSelectLabel + '</button>' +
        '                  <button type="button" class="btn btn--ghost" data-action="form-clear-audience">' + audienceClearLabel + '</button>' +
        '                </div>' +
        '              </div>' +
        (audienceHelp ? '              <p class="announcement-management__form-hint">' + audienceHelp + '</p>' : '') +
        '            </div>' +
        '            <p class="announcement-management__form-feedback hidden" id="' + formModalFeedbackId + '" data-form="feedback" role="alert"></p>' +
        '            <div class="announcement-management__form-actions">' +
        '              <button type="submit" class="btn btn--primary" data-action="submit-form">' + formSubmit + '</button>' +
        '              <button type="button" class="btn btn--ghost" data-action="cancel-form">' + formCancel + '</button>' +
        '            </div>' +
        '          </form>' +
        '        </section>' +
        '      </div>' +
        '    </section>' +
        '  </div>' +
        '  <div class="screen-modal announcement-management__detail-modal hidden" data-block="detail-modal" aria-hidden="true" hidden>' +
        '    <div class="screen-modal__overlay" data-action="close-detail-modal" aria-label="' + detailModalClose + '"></div>' +
        '    <section class="screen-modal__content announcement-management__detail-modal-content" role="dialog" aria-modal="true" aria-labelledby="' + detailModalTitleId + '" aria-describedby="' + detailModalBodyId + '">' +
        '      <button type="button" class="screen-modal__close" data-action="close-detail-modal" data-modal-initial-focus aria-label="' + detailModalClose + '">×</button>' +
        '      <div class="screen-modal__body announcement-management__detail-modal-body" id="' + detailModalBodyId + '">' +
        '        <h2 class="announcement-management__detail-modal-title" id="' + detailModalTitleId + '" data-detail-modal="title"></h2>' +
        '        <p class="announcement-management__detail-modal-meta" data-detail-modal="meta"></p>' +
        '        <div class="announcement-management__detail-modal-content" data-detail-modal="content"></div>' +
        '        <div class="announcement-management__detail-modal-audience" data-detail-modal="audience"></div>' +
        '      </div>' +
        '    </section>' +
        '  </div>' +
        '</div>';
    }

    _cacheElements($root) {
      var CONFIG = this.selectorConfig;
      this.elements.summary = $root.find('[data-block="summary"]').first();
      this.elements.status = $root.find('[data-block="status"]').first();
      this.elements.empty = $root.find('[data-block="empty"]').first();
      this.elements.tableWrapper = $root.find('[data-block="table-wrapper"]').first();
      this.elements.tableBody = $root.find('[data-block="table"] tbody').first();
      this.elements.pager = $root.find('[data-block="pager"]').first();
      this.elements.perPage = $root.find(CONFIG.perPage).first();
      this.elements.refreshBtn = $root.find(CONFIG.refreshBtn).first();
      this.elements.createBtn = $root.find(CONFIG.createBtn).first();
      this.elements.formModal = $root.find('[data-block="form-modal"]').first();
      this.elements.formWrapper = $root.find(CONFIG.formWrapper).first();
      this.elements.form = $root.find(CONFIG.form).first();
      this.elements.formTitle = $root.find('[data-form="title"]').first();
      this.elements.formFeedback = $root.find('[data-form="feedback"]').first();
      this.elements.formSubmit = $root.find('[data-action="submit-form"]').first();
      this.elements.formTitleInput = $root.find('[data-field="title"]').first();
      this.elements.formContentInput = $root.find('[data-field="content"]').first();
      this.elements.formAudienceList = $root.find('[data-form="audience-list"]').first();
      this.elements.formAudienceEmpty = $root.find('[data-form="audience-empty"]').first();
      this.elements.formAudienceCount = $root.find('[data-form="audience-count"]').first();
      this.elements.formAudienceSelectButton = $root.find('[data-action="form-select-audience"]').first();
      this.elements.formAudienceClearButton = $root.find('[data-action="form-clear-audience"]').first();
      this.elements.formIdInput = $root.find('[data-field="id"]').first();
      this.elements.detailSection = $root.find('[data-block="detail"]').first();
      this.elements.detailTitle = $root.find('[data-detail="title"]').first();
      this.elements.detailMeta = $root.find('[data-detail="meta"]').first();
      this.elements.detailContent = $root.find('[data-detail="content"]').first();
      this.elements.detailModal = $root.find('[data-block="detail-modal"]').first();
      this.elements.detailModalTitle = $root.find('[data-detail-modal="title"]').first();
      this.elements.detailModalMeta = $root.find('[data-detail-modal="meta"]').first();
      this.elements.detailModalContent = $root.find('[data-detail-modal="content"]').first();
      this.elements.detailModalAudience = $root.find('[data-detail-modal="audience"]').first();
      this.elements.recipientsSection = $root.find('[data-block="recipients"]').first();
      this.elements.recipientsTitle = $root.find('[data-block="recipients"] .announcement-management__recipients-title').first();
      this.elements.recipientsFeedback = $root.find('[data-block="recipients-feedback"]').first();
      this.elements.recipientsEmpty = $root.find('[data-block="recipients-empty"]').first();
      this.elements.recipientsTableBody = $root.find(CONFIG.recipientsTableBody).first();
      this.elements.recipientFilter = $root.find(CONFIG.recipientFilter).first();
      this.elements.recipientRefresh = $root.find(CONFIG.recipientRefresh).first();
    }

    _ensureScaffold($root) {
      if (!$root || !$root.length) { return; }
      if (!this.state.scaffolded) {
        $root.empty().append(this._buildScaffoldHtml());
        this.state.scaffolded = true;
      }
      this._cacheElements($root);
      this._applySummaryText();
      this._updatePerPageSelect();
      this._renderCreateButton();
      this._renderFormAudienceSelection();
    }

    _applySummaryText() {
      if (this.elements.summary && this.elements.summary.length) {
        this.elements.summary.text(this.textConfig.summary || '');
      }
    }

    _updatePerPageSelect() {
      var el = this.elements.perPage;
      if (!el || !el.length) { return; }
      var options = this.perPageOptions.slice();
      options.push(this.state.pagination.perPage);
      var unique = {};
      var list = [];
      for (var i = 0; i < options.length; i += 1) {
        var val = parseInt(options[i], 10);
        if (!isFinite(val) || val <= 0) { continue; }
        if (unique[val]) { continue; }
        unique[val] = true;
        list.push(val);
      }
      list.sort(function (a, b) { return a - b; });
      var current = String(this.state.pagination.perPage || list[0] || 10);
      var html = '';
      for (var j = 0; j < list.length; j += 1) {
        var value = String(list[j]);
        html += '<option value="' + escapeAttr(value) + '"' + (value === current ? ' selected' : '') + '>' + escapeHtml(value) + '</option>';
      }
      el.html(html);
    }

    _renderCreateButton() {
      var svc = this.buttonService;
      var el = this.elements.createBtn;
      if (!svc || typeof svc.createActionButton !== 'function') { return; }
      if (!el || !el.length) { return; }
      var placeholder = el.get(0);
      var label = this.textConfig.addButton || '';
      if (!label && placeholder) {
        label = (placeholder.textContent || '').trim();
      }
      var options = {
        label: label || 'お知らせを追加',
        attributes: { 'data-action': 'create' },
        dataset: { action: 'create' }
      };
      try {
        var node = svc.createActionButton('announcement-create', options);
        if (!node) { return; }
        if (placeholder && placeholder.id) { node.id = placeholder.id; }
        if (placeholder && placeholder.name) { node.name = placeholder.name; }
        if (placeholder && placeholder.disabled) {
          node.disabled = true;
          node.setAttribute('disabled', 'disabled');
        }
        var $button = $(node);
        el.replaceWith($button);
        this.elements.createBtn = $button;
      } catch (error) {
        if (typeof console !== 'undefined' && console && typeof console.warn === 'function') {
          console.warn('[AdminAnnouncements] failed to render create button', error);
        }
      }
    }

    getFormAudienceSelection()
    {
      var list = this.state.formAudienceSelection || [];
      return list.slice();
    }

    setFormAudienceSelection(users) {
      var list = Array.isArray(users) ? users : [];
      var normalized = [];
      var seen = Object.create(null);
      for (var i = 0; i < list.length; i += 1) {
        var entry = list[i];
        if (!entry || typeof entry !== 'object') { continue; }
        var userCode = entry.userCode || entry.code || '';
        var trimmedCode = userCode ? String(userCode).trim() : '';
        var normalizedCode = trimmedCode ? trimmedCode.toLowerCase() : '';
        var displayName = entry.displayName || entry.name || trimmedCode;
        var key = normalizedCode || (displayName ? displayName.toLowerCase() : '');
        if (!key || seen[key]) { continue; }
        seen[key] = true;
        normalized.push({
          userCode: trimmedCode,
          displayName: displayName || trimmedCode,
          mail: entry.mail || '',
          role: entry.role || ''
        });
      }
      this.state.formAudienceSelection = normalized;
      this._renderFormAudienceSelection();
    }

    setFormAudienceSelectionFromRecord(record) {
      if (record && Array.isArray(record.audienceUsers)) {
        this.setFormAudienceSelection(record.audienceUsers);
        return;
      }
      if (record && Array.isArray(record.recipients)) {
        this.setFormAudienceSelection(record.recipients);
        return;
      }
      this.setFormAudienceSelection([]);
    }

    serializeFormAudienceSelection() {
      var selection = this.getFormAudienceSelection();
      var list = [];
      for (var i = 0; i < selection.length; i += 1) {
        var entry = selection[i];
        if (!entry) { continue; }
        var userCode = entry.userCode ? String(entry.userCode).trim() : '';
        var displayName = entry.displayName || entry.name || userCode;
        if (!userCode && !displayName) { continue; }
        list.push({
          userCode: userCode,
          displayName: displayName || userCode
        });
      }
      return list;
    }

    _renderFormAudienceSelection()
    {
      var listEl = this.elements.formAudienceList;
      var emptyEl = this.elements.formAudienceEmpty;
      var countEl = this.elements.formAudienceCount;
      var clearBtn = this.elements.formAudienceClearButton;
      var selection = this.state.formAudienceSelection || [];
      var hasSelection = selection.length > 0;
      if (listEl && listEl.length) {
        if (hasSelection) {
          var items = [];
          for (var i = 0; i < selection.length; i += 1) {
            var entry = selection[i];
            var label = entry.displayName || entry.userCode || '';
            items.push('<li>' + escapeHtml(label) + '</li>');
          }
          listEl.html(items.join(''));
          listEl.removeClass('hidden').removeAttr('hidden');
        } else {
          listEl.empty();
          listEl.addClass('hidden').attr('hidden', 'hidden');
        }
      }
      if (emptyEl && emptyEl.length) {
        if (hasSelection) {
          emptyEl.addClass('hidden').attr('hidden', 'hidden');
        } else {
          emptyEl.text(this.textConfig.formAudienceEmpty || '対象ユーザーはまだ選択されていません。');
          emptyEl.removeClass('hidden').removeAttr('hidden');
        }
      }
      if (countEl && countEl.length) {
        countEl.text(this._formatAudienceSelectionCount(selection.length));
      }
      if (clearBtn && clearBtn.length) {
        clearBtn.prop('disabled', !hasSelection);
      }
    }

    _formatAudienceSelectionCount(count)
    {
      var template = this.textConfig.formAudienceSelectionCount || '選択中: {count}名';
      return template.replace('{count}', String(count));
    }

    openFormAudienceModal()
    {
      var service = this.userSelectModalService;
      if (!service || typeof service.open !== 'function') {
        if (this.toastService) {
          this.toastService.error('対象ユーザー選択モーダルを利用できません。');
        }
        return;
      }
      var selection = this.getFormAudienceSelection();
      var selectedCodes = selection.map(function (entry) {
        return entry && entry.userCode ? entry.userCode : '';
      }).filter(function (code) { return !!code; });
      var button = this.elements.formAudienceSelectButton && this.elements.formAudienceSelectButton.get(0);
      try {
        service.open({
          multiple: true,
          selectedCodes: selectedCodes,
          initialKeyword: selectedCodes[0] || '',
          onApply: (users) => {
            this.setFormAudienceSelection(Array.isArray(users) ? users : []);
          },
          onClose: () => {
            if (button && typeof button.focus === 'function') {
              button.focus();
            }
          }
        });
      } catch (error) {
        if (typeof console !== 'undefined' && console && typeof console.error === 'function') {
          console.error('[AdminAnnouncements] failed to open audience modal', error);
        }
        if (this.toastService) {
          this.toastService.error('対象ユーザーの選択に失敗しました。');
        }
      }
    }

    setBusy(on)
    {
      var loader = this.loadingService;
      var text = this.textConfig.loading || '読み込み中…';
      if (loader && typeof loader[on ? 'show' : 'hide'] === 'function') {
        if (on) { loader.show(text); } else { loader.hide(); }
      }
      var root = this.state.$root;
      if (root && root.length) {
        root.toggleClass('is-busy', !!on);
      }
      if (this.elements.refreshBtn && this.elements.refreshBtn.length) {
        this.elements.refreshBtn.prop('disabled', !!on);
      }
      if (this.elements.createBtn && this.elements.createBtn.length) {
        this.elements.createBtn.prop('disabled', !!on);
      }
      if (this.elements.perPage && this.elements.perPage.length) {
        this.elements.perPage.prop('disabled', !!on);
      }
      if (this.elements.pager && this.elements.pager.length) {
        this.elements.pager.find('button').prop('disabled', !!on);
      }
    }

    callApi(type, params, options) {
      var data = {};
      if (params && typeof params === 'object') {
        for (var key in params) {
          if (Object.prototype.hasOwnProperty.call(params, key)) {
            data[key] = params[key];
          }
        }
      }
      var core = window.Utils || {};
      var formData;
      if (typeof core.ensureFormData === 'function') {
        formData = core.ensureFormData(data);
      } else {
        formData = new FormData();
        Object.keys(data).forEach(function (key) {
          if (typeof data[key] !== 'undefined' && data[key] !== null) {
            formData.append(key, data[key]);
          }
        });
      }

      var request = core.requestApi('AnnouncementManagement', type, formData, options && options.overrides);
      var deferred = $.Deferred();
      var self = this;

      function handleSuccess(payload) {
        if (!payload || payload.status !== 'OK') {
          var message = self._resolveErrorMessage(payload, options && options.errorMessage);
          var error = new Error(message || 'リクエストに失敗しました。');
          error.payload = payload;
          deferred.reject(error);
          return;
        }
        deferred.resolve(payload.result || {});
      }

      function handleFailure(reason) {
        if (reason && (reason.isAbort || reason === 'abort' || reason.message === 'abort')) {
          var abortError = new Error('abort');
          abortError.isAbort = true;
          deferred.reject(abortError);
          return;
        }
        var errorMessage = (options && options.errorMessage) || 'リクエストに失敗しました。';
        var err = new Error(errorMessage);
        if (reason && typeof reason === 'object') {
          if (typeof reason.statusText === 'string') {
            err.textStatus = reason.statusText;
          } else if (typeof reason.message === 'string' && reason.message && reason.message !== errorMessage) {
            err.textStatus = reason.message;
          }
        }
        deferred.reject(err);
      }

      if (request && typeof request.done === 'function' && typeof request.fail === 'function') {
        request.done(handleSuccess).fail(function (_jqXHR, textStatus) {
          if (textStatus === 'abort') {
            handleFailure({ message: 'abort' });
            return;
          }
          handleFailure({ statusText: textStatus });
        });
      } else if (request && typeof request.then === 'function') {
        request.then(handleSuccess).catch(handleFailure);
      } else {
        handleFailure();
      }

      var promise = deferred.promise();
      promise.abort = function () {
        if (request && typeof request.abort === 'function') {
          try {
            request.abort();
          } catch (_) {
          }
          return;
        }
        var abortError = new Error('abort');
        abortError.isAbort = true;
        deferred.reject(abortError);
      };
      promise.always = deferred.always.bind(deferred);
      return promise;
    }

    _resolveErrorMessage(payload, fallback) {
      if (!payload || typeof payload !== 'object') { return fallback; }
      var result = payload.result;
      if (result && typeof result === 'object') {
        if (typeof result.message === 'string' && result.message) { return result.message; }
        if (typeof result.error === 'string' && result.error) { return result.error; }
      }
      if (typeof payload.message === 'string' && payload.message) { return payload.message; }
      if (typeof payload.reason === 'string' && payload.reason) { return payload.reason; }
      return fallback;
    }

    clearFormFeedback() {
      var el = this.elements.formFeedback;
      if (el && el.length) {
        el.addClass('hidden').text('');
      }
    }

    showFormFeedback(message) {
      var el = this.elements.formFeedback;
      if (el && el.length) {
        if (!message) {
          el.addClass('hidden').text('');
          return;
        }
        el.removeClass('hidden').text(message);
      }
    }

    setFormVisible(visible) {
      var wrapper = this.elements.formWrapper;
      var modal = this.elements.formModal;
      if (modal && modal.length) {
        if (visible) {
          modal.removeClass('hidden').addClass('is-open');
          modal.removeAttr('hidden');
          modal.attr('aria-hidden', 'false');
          modal.attr('data-modal-open', 'true');
          if (wrapper && wrapper.length) {
            wrapper.removeClass('hidden').removeAttr('hidden');
          }
          document.body.classList.add('is-modal-open');
          this._bindFormModalKeyClose();
        } else {
          modal.removeClass('is-open').attr('aria-hidden', 'true');
          modal.attr('hidden', 'hidden');
          modal.removeAttr('data-modal-open');
          modal.addClass('hidden');
          if (wrapper && wrapper.length) {
            wrapper.addClass('hidden').attr('hidden', 'hidden');
          }
          this._unbindFormModalKeyClose();
          if (!document.querySelector('.screen-modal.is-open, .c-help-modal.is-open, [data-modal-open="true"]')) {
            document.body.classList.remove('is-modal-open');
          }
        }
        return;
      }
      if (!wrapper || !wrapper.length) { return; }
      if (visible) {
        wrapper.removeClass('hidden').removeAttr('hidden');
      } else {
        wrapper.addClass('hidden').attr('hidden', 'hidden');
      }
    }

    cancelForm() {
      this.setFormVisible(false);
      this.clearFormFeedback();
      this.state.formMode = 'create';
      this.state.formEditingId = '';
      this.setFormAudienceSelection([]);
    }

    submitForm($form) {
      var el = this.elements;
      if (!$form || !$form.length) {
        $form = el.form;
        if (!$form || !$form.length) { return null; }
      }
      var title = String($form.find('[data-field="title"]').val() || '').trim();
      var content = String($form.find('[data-field="content"]').val() || '').trim();
      if (!title || !content) {
        this.showFormFeedback(this.textConfig.formValidationError);
        if (!title && el.formTitleInput && el.formTitleInput.length) {
          el.formTitleInput.focus();
        } else if (el.formContentInput && el.formContentInput.length) {
          el.formContentInput.focus();
        }
        return null;
      }

      var selectedUsers = this.serializeFormAudienceSelection();
      if (!selectedUsers.length) {
        var audienceMessage = this.textConfig.formAudienceSelectionRequired || '対象ユーザーを選択してください。';
        this.showFormFeedback(audienceMessage);
        if (this.toastService) {
          this.toastService.error(audienceMessage);
        }
        return null;
      }

      var audienceUserCodes = [];
      for (var i = 0; i < selectedUsers.length; i += 1) {
        var entry = selectedUsers[i];
        if (entry && entry.userCode) {
          audienceUserCodes.push(entry.userCode);
        }
      }
      if (!audienceUserCodes.length) {
        var fallbackMessage = this.textConfig.formAudienceSelectionRequired || '対象ユーザーを選択してください。';
        this.showFormFeedback(fallbackMessage);
        return null;
      }

      var serializedAudienceUsers;
      try {
        serializedAudienceUsers = JSON.stringify(selectedUsers);
      } catch (serializationError) {
        var errorText = '対象ユーザーの情報を送信できませんでした。';
        this.showFormFeedback(errorText);
        if (this.toastService) {
          this.toastService.error(errorText);
        }
        if (typeof console !== 'undefined' && console && typeof console.error === 'function') {
          console.error('[AdminAnnouncements] failed to serialize audience users', serializationError);
        }
        return null;
      }

      var payload = {
        title: title,
        content: content,
        audienceScope: 'custom',
        audienceUsers: serializedAudienceUsers,
        audienceUserCodes: audienceUserCodes
      };
      var mode = this.state.formMode === 'edit' ? 'edit' : 'create';
      var type = mode === 'edit' ? 'AnnouncementUpdate' : 'AnnouncementCreate';
      var successMessage = mode === 'edit' ? this.textConfig.formSuccessEdit : this.textConfig.formSuccessCreate;
      if (mode === 'edit') {
        payload.id = this.state.formEditingId || $form.find('[data-field="id"]').val();
      }
      if (mode === 'edit' && !payload.id) {
        this.showFormFeedback('有効なお知らせIDが見つかりません。');
        return null;
      }

      this.setFormBusy(true);
      this.clearFormFeedback();
      var self = this;
      var request = this.callApi(type, payload, { errorMessage: this.textConfig.formError });
      request.then(function () {
        if (self.toastService) {
          self.toastService.success(successMessage);
        }
        self.cancelForm();
        var refreshOptions = mode === 'create' ? { resetPage: true } : {};
        return self._refreshListAfterSubmit(refreshOptions);
      }).then(function () {
        if (mode === 'edit' && payload.id) {
          self._selectAnnouncement(payload.id);
        }
      }).catch(function (error) {
        if (error && error.isAbort) { return; }
        var message = (error && error.message) ? error.message : self.textConfig.formError;
        self.showFormFeedback(message);
        if (self.toastService) {
          self.toastService.error(message);
        }
      }).always(function () {
        self.setFormBusy(false);
      });

      return request;
    }

    _refreshListAfterSubmit(options) {
      var ctor = window.AdminAnnouncement && window.AdminAnnouncement.JobList;
      if (!ctor) { return null; }
      return new ctor(this).refresh(options || {});
    }

    _selectAnnouncement(id) {
      if (!id) { return; }
      var ctor = window.AdminAnnouncement && window.AdminAnnouncement.JobList;
      if (!ctor) { return; }
      new ctor(this).selectAnnouncement(id);
    }

    _bindFormModalKeyClose() {
      if (this._formModalKeyBound) { return; }
      var self = this;
      this._formModalKeyBound = true;
      this._formModalKeyHandler = function (ev) {
        if (ev.key !== 'Escape' && ev.key !== 'Esc') { return; }
        var modal = self.elements.formModal;
        if (!modal || !modal.length || !modal.hasClass('is-open')) { return; }
        ev.preventDefault();
        self.cancelForm();
      };
      $(document).on('keydown.adminAnnouncementsFormModal', this._formModalKeyHandler);
    }

    _unbindFormModalKeyClose() {
      if (!this._formModalKeyBound) { return; }
      this._formModalKeyBound = false;
      $(document).off('keydown.adminAnnouncementsFormModal', this._formModalKeyHandler);
      this._formModalKeyHandler = null;
    }

    setFormBusy(on) {
      var form = this.elements.form;
      if (!form || !form.length) { return; }
      form.find('input, textarea, button, select').prop('disabled', !!on);
      if (this.elements.formSubmit && this.elements.formSubmit.length) {
        var text = on ? (this.textConfig.loading || '処理中…') : (this.state.formMode === 'edit'
          ? (this.textConfig.formSubmitEdit || '保存する')
          : (this.textConfig.formSubmitCreate || '追加する'));
        this.elements.formSubmit.text(text);
      }
    }

    findAnnouncement(id) {
      if (!id) { return null; }
      var list = Array.isArray(this.state.announcements) ? this.state.announcements : [];
      for (var i = 0; i < list.length; i += 1) {
        var entry = list[i];
        if (entry && entry.id === id) { return entry; }
      }
      return null;
    }

    renderRecipients() {
      var el = this.elements;
      var TEXT = this.textConfig;
      if (!el.recipientsTableBody || !el.recipientsTableBody.length) { return; }
      var list = this.state.recipients || [];
      var rows = [];
      for (var i = 0; i < list.length; i += 1) {
        var item = list[i];
        var ackLabel = item.acknowledged ? (TEXT.recipientsUnack || '未読に戻す') : (TEXT.recipientsAck || '既読にする');
        var rowClass = item.acknowledged ? 'is-acknowledged' : 'is-pending';
        rows.push(
          '<tr class="' + rowClass + '" data-user-code="' + escapeAttr(item.userCode) + '">' +
            '  <th scope="row">' + escapeHtml(item.displayName || item.userCode || '') + '</th>' +
            '  <td>' + escapeHtml(item.role || '―') + '</td>' +
            '  <td>' + (item.acknowledgedAtDisplay ? escapeHtml(item.acknowledgedAtDisplay) : '―') + '</td>' +
            '  <td>' +
            '    <button type="button" class="btn btn--ghost" data-action="toggle-ack" data-user-code="' + escapeAttr(item.userCode) + '" data-normalized-user-code="' + escapeAttr(item.normalizedUserCode) + '" data-acknowledged="' + (item.acknowledged ? '1' : '0') + '">' + escapeHtml(ackLabel) + '</button>' +
            '  </td>' +
            '</tr>'
        );
      }
      el.recipientsTableBody.html(rows.join(''));
      if (!rows.length) {
        if (el.recipientsEmpty && el.recipientsEmpty.length) {
          el.recipientsEmpty.text(TEXT.recipientsEmpty || '対象ユーザーが見つかりません。').removeClass('hidden');
        }
      } else if (el.recipientsEmpty && el.recipientsEmpty.length) {
        el.recipientsEmpty.addClass('hidden').text('');
      }
      if (el.recipientsTitle && el.recipientsTitle.length) {
        var ackCount = this.countAcknowledgedFromLookup(this.state.ackLookup[this.state.selectedId] || {});
        el.recipientsTitle.text((TEXT.recipientsTitle || '確認状況') + '（既読' + ackCount + '件）');
      }
    }

    countAcknowledgedFromLookup(map) {
      if (!map || typeof map !== 'object') { return 0; }
      var count = 0;
      for (var key in map) {
        if (!Object.prototype.hasOwnProperty.call(map, key)) { continue; }
        if (key === '__unknown') {
          var list = map[key];
          if (Array.isArray(list)) { count += list.length; }
          continue;
        }
        if (map[key]) { count += 1; }
      }
      return count;
    }

  }

  window.AdminAnnouncements = window.AdminAnnouncements || AdminAnnouncements;
  window.AdminAnnouncement = window.AdminAnnouncement || {};
})(window, document);
