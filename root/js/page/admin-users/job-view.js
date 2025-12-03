(function (w, $) {
  'use strict';

  const FALLBACK_ICON_HTML = Object.freeze({
    edit: [
      '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
      '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"',
      '  d="M4 20h3.5L19 8.5a2.12 2.12 0 0 0 0-3L18.5 5a2.12 2.12 0 0 0-3 0L6.5 14.5 4 20z"></path>',
      '<path fill="currentColor" d="m14.75 6.25 3 3 .88-.88a1 1 0 0 0 0-1.42L17.05 4.3a1 1 0 0 0-1.41 0z"></path>',
      '</svg>'
    ].join(''),
    delete: [
      '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
      '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"',
      '  d="M4.5 6.75h15M9.5 4.5h5a1 1 0 0 1 1 1v1.25H8.5V5.5a1 1 0 0 1 1-1zm9 2.25v12A1.5 1.5 0 0 1 17 20.5H7a1.5 1.5 0 0 1-1.5-1.5v-12m4 4v6m3-6v6"></path>',
      '</svg>'
    ].join(''),
    'mail-check': [
      '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
      '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"',
      '  d="M3.75 6.5A1.75 1.75 0 0 1 5.5 4.75h12.75A1.75 1.75 0 0 1 20 6.5v10.75A1.75 1.75 0 0 1 18.25 19H5.75A1.75 1.75 0 0 1 4 17.25V6.5Z"></path>',
      '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M4 7l8 5 8-5"></path>',
      '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="m14.25 14.75 1.75 1.75 3-3"></path>',
      '</svg>'
    ].join('')
  });

  /**
   * AdminUsers Job: View
   * - List fetching, filtering, rendering
   */
  class JobView {
    /** @param {AdminUsers} page */
    constructor(page) {
      this.page = page;
      this.avatarService = null;
      this._doc = document;
    }

    async loadUsers() {
      const text = this.page.textConfig;
      try {
        this._showBusy(text.loading || '読み込み中…');

        // Fetch users (single call; if backend paginates, adapt or loop here)
        const data = await this.page.apiPost('list', {
          page: 1,
          pageSize: this.page.api.pageSize,
          includeDeleted: '1'
        });

        // Normalize: accept array or { users: [] } or { list: [] }
        let users = [];
        if (Array.isArray(data)) {
          users = data;
        } else if (data && Array.isArray(data.users)) {
          users = data.users;
        } else if (data && Array.isArray(data.list)) {
          users = data.list;
        } else if (data && data.data && Array.isArray(data.data)) {
          users = data.data;
        }

        // Normalize fields per user
        this.page.users = (users || []).map((u) => this._normalizeUser(u));
        this.page.usersById = {};
        this.page.users.forEach(u => { this.page.usersById[String(u.id)] = u; });

        // Apply current filters & render
        this.applyFilters();

      } catch (err) {
        console.error('[AdminUsers.JobView.loadUsers]', err);
        this._setFeedback(this.page.textConfig.loadError || '読み込みに失敗しました。');
        this._toastError(this.page.textConfig.loadError || '読み込みに失敗しました。');
      } finally {
        this._hideBusy();
      }
    }

    refresh(opts) {
      // For now, simply re-load
      return this.loadUsers();
    }

    applyFilters() {
      const sel = this.page.selectorConfig;
      const $keyword = $(sel.keyword);
      const $role = $(sel.role);
      const $deleted = $(sel.deleted);

      const keyword = ($keyword.val() || '').toString().trim().toLowerCase();
      const deleted = ($deleted.val() || 'active').toString().trim(); // '', 'active', 'deleted', 'all'

      this._updateRoleOptions(deleted);

      const role = ($role.val() || '').toString().trim();

      const list = (this.page.users || []).filter((u) => {
        // keyword on displayName/userCode/mail/organization
        if (keyword) {
          const hay = [u.displayName, u.userCode, u.mail, u.organization]
            .map(x => (x || '').toString().toLowerCase())
            .join(' ');
          if (hay.indexOf(keyword) === -1) return false;
        }
        // role
        if (role && this._trim(u.role) !== role) {
          return false;
        }

        // deleted
        if (deleted === 'active' && u.isDeleted) return false;
        if (deleted === 'deleted' && !u.isDeleted) return false;

        return true;
      });

      this.page.filtered = list;
      this._renderTable();
      this._renderSummary();
      this._renderFeedback();
    }

    /* --------------------------- internal helpers -------------------------- */

    _normalizeUser(raw) {
      // Accept various keys and normalize to a common shape
      const id = raw.id || raw.userId || raw.uid || raw.code || raw.userCode;
      const displayName = raw.displayName || raw.name || raw.fullName || '';
      const userCode = raw.userCode || raw.code || String(id || '');
      const mail = raw.mail || '';
      const mailCheckDate = this._trim(raw.mailCheckDate || raw.mail_check_date || raw.mail_check || '');
      const role = this._trim(raw.role || raw.userRole || raw.user_role || '');
      const organization = this._trim(raw.organization || '');
      const isDeleted = !!(raw.isDeleted || raw.deleted || raw.isArchived || false);
      const autoPassword = this._trim(raw.initialPassword || raw.autoPassword || raw.auto_password || '');
      const isSupervisor = this._normalizeRoleFlag(raw && (raw.isSupervisor || raw.supervisor));
      const isOperator = this._normalizeRoleFlag(raw && (raw.isOperator || raw.operator || raw.isSupervisor));
      const rawContentsFlag = (typeof raw.useContentsManagement !== 'undefined')
        ? raw.useContentsManagement
        : raw.use_contents_management;
      let useContentsManagement = this._normalizeRoleFlag(rawContentsFlag);
      if (typeof rawContentsFlag === 'undefined') {
        useContentsManagement = true;
      }
      const rawDashboardFlag = (typeof raw.useDashboard !== 'undefined')
        ? raw.useDashboard
        : raw.use_dashboard;
      let useDashboard = this._normalizeRoleFlag(rawDashboardFlag);
      if (typeof rawDashboardFlag === 'undefined') {
        useDashboard = true;
      }

      const avatarUrl = this._resolveAvatarUrl(raw);
      const avatarInitial = this._resolveAvatarInitial(raw, displayName, userCode);
      const avatarTransform = this._resolveAvatarTransform(raw);

        return {
          id: String(id),
          displayName,
        userCode,
        mail,
        mailCheckDate,
        organization,
        role,
          isDeleted,
          isSupervisor,
          isOperator,
          useContentsManagement,
          useDashboard,
          avatarUrl,
          avatarInitial,
          avatarTransform,
        autoPassword,
        selectableUsers: this._normalizeSelectableUsers(raw && raw.selectableUsers)
      };
    }

    _normalizeRoleFlag(value)
    {
      return value === true || value === 1 || value === '1' || value === 'true';
    }

    _normalizeSelectableUsers(list) {
      if (!Array.isArray(list)) {
        return [];
      }
      const normalized = [];
      for (let i = 0; i < list.length; i += 1) {
        const entry = list[i] || {};
        const id = entry.id || entry.userId || entry.uid || entry.code || entry.userCode || '';
        const displayName = this._trim(entry.displayName || entry.name || '');
        const userCode = this._trim(entry.userCode || entry.code || String(id || ''));
        const role = this._trim(entry.role || '');
        const avatarUrl = this._resolveAvatarUrl(entry);
        const isDeleted = entry.isDeleted === true || entry.isDeleted === 1 || entry.isDeleted === '1';
        if (!displayName && !userCode) {
          continue;
        }
        normalized.push({
          id: id ? String(id) : userCode,
          displayName,
          userCode,
          role,
          avatarUrl,
          isActive: !isDeleted
        });
      }
      return normalized;
    }

    _updateRoleOptions(deletedFilter) {
      const sel = this.page.selectorConfig;
      const $select = $(sel.role);
      if (!$select.length) return;

      const deleted = this._trim(deletedFilter || 'active');

      // Collect unique roles from users
      const roles = new Map();
      const users = this.page.users || [];
      for (let i = 0; i < users.length; i += 1) {
        const user = users[i];
        const isDeleted = !!user.isDeleted;
        if (deleted === 'active' && isDeleted) { continue; }
        if (deleted === 'deleted' && !isDeleted) { continue; }
        if (deleted === '' && isDeleted) { continue; }
        const key = this._trim(user.role || '');
        if (key) roles.set(key, true);
      }
      // If there are no roles, leave existing options as-is
      if (roles.size === 0) return;

      const current = this._trim($select.val() || '');
      const base = [`<option value="">すべて</option>`];
      Array.from(roles.keys()).sort().forEach(r => {
        base.push(`<option value="${this._esc(r)}">${this._esc(r)}</option>`);
      });
      $select.html(base.join(''));
      if (current && roles.has(current)) {
        $select.val(current);
      } else {
        $select.val('');
      }
    }

    _renderTable() {
      const sel = this.page.selectorConfig;
      const $tbody = $(sel.tableBody);
      if (!$tbody.length) return;

      const rows = (this.page.filtered || []).map((u) => {
        const mailCell = this._renderMailCell(u);
        const deletedMark = u.isDeleted ? ' data-deleted="1"' : '';

        const roleText = this._resolveRoleText(u);
        const actionsHtml = this._renderRowActions(u);
        const selectableCell = this._renderSelectableUsersCell(u);
        const roleBadge = this._renderRoleBadge(u);
        const dashboardAccess = this._renderDashboardStatus(u);
        const contentsAccess = this._renderContentsStatus(u);
        const nameCell = [
          '<div class="user-table__name">',
            this._renderUserAvatar(u),
            '<div class="user-table__identity">',
              `<div class="user-name">${this._esc(u.displayName || '')}</div>`,
              `<div class="user-code">${this._esc(u.userCode || '')}</div>`,
              roleBadge ? `<div class="user-table__role-badges">${roleBadge}</div>` : '',
            '</div>',
          '</div>'
        ].join('');

        return [
          `<tr data-user-id="${this._esc(u.id)}"${deletedMark}>`,
            `<td class="col--name">${nameCell}</td>`,
            `<td class="col--mail">${mailCell}</td>`,
            `<td class="col--organization">${this._esc(u.organization || '—')}</td>`,
            `<td class="col--role">${this._esc(roleText)}</td>`,
            `<td class="col--dashboard">${dashboardAccess}</td>`,
            `<td class="col--contents">${contentsAccess}</td>`,
            `<td class="col--selectable">${selectableCell}</td>`,
            `<td class="col--actions user-table__actions">${actionsHtml}</td>`,
          `</tr>`
        ].join('');
      });

      $tbody.html(rows.join(''));
      this._mountUserAvatars();
      this._applyAvatarPopovers();
      this._mountSelectableUserlists();
    }

    _renderMailCell(user) {
      const mailText = this._esc(user && user.mail ? user.mail : '—');
      const indicator = this._renderMailStatusIndicator(user);
      const inlineAction = this._renderMailCheckInlineButton(user);
      if (!indicator && !inlineAction) {
        return `<span class="user-table__mail-text">${mailText}</span>`;
      }
      const segments = [];
      if (indicator) segments.push(indicator);
      segments.push(`<span class="user-table__mail-text">${mailText}</span>`);
      if (inlineAction) {
        segments.push(`<span class="user-table__mail-inline-action">${inlineAction}</span>`);
      }
      return `<span class="user-table__mail">${segments.join('')}</span>`;
    }

    _renderMailStatusIndicator(user) {
      const status = this._resolveMailStatus(user);
      if (!status) {
        return '';
      }
      const svc = this.page && this.page.buttonService;
      const tooltip = status.tooltip || status.text || '';
      const buttonOptions = {
        label: status.text,
        srLabel: '',
        srLabelClass: '',
        ariaLabel: tooltip,
        hoverLabel: tooltip,
        title: tooltip
      };
      if (svc && typeof svc.createActionButton === 'function' && status.buttonType) {
        try {
          const node = svc.createActionButton(status.buttonType, buttonOptions);
          if (node) {
            node.setAttribute('role', 'note');
            return this._nodeToHtml(node);
          }
        } catch (err) {
          console.warn('[AdminUsers.JobView] failed to render mail status button', err);
        }
      }
      return this._fallbackMailStatusIndicator(status);
    }

    _renderMailCheckInlineButton(user) {
      if (!user || user.isDeleted) {
        return '';
      }
      const mail = this._trim(user.mail);
      const hasMail = !!mail;
      const stateMap = (this.page && this.page.mailCheck) || {};
      const mailState = stateMap[user.id] || '';
      const isSending = mailState === 'sending';
      const name = this._trim(user.displayName);
      const defaultLabel = name ? `${name}にメール受信チェックを送信` : 'メール受信チェックを送信';
      const sendingText = this.page.textConfig.mailCheckSending || 'メール受信チェックメールを送信中…';
      const noMailText = this.page.textConfig.mailCheckNoMail || 'メールアドレスが登録されていません。';
      let tooltip = defaultLabel;
      if (!hasMail) {
        tooltip = noMailText;
      } else if (isSending) {
        tooltip = sendingText;
      }
      const config = {
        action: 'admin-users-mailcheck',
        label: '',
        srLabel: defaultLabel,
        srLabelClass: 'visually-hidden',
        hoverLabel: tooltip,
        ariaLabel: tooltip,
        title: tooltip,
        baseClass: 'table-action-button user-table__mail-check-button',
        dataset: { mailState: mailState || '' },
        attributes: {}
      };
      if (!hasMail || isSending) {
        config.disabled = true;
      }
      if (isSending) {
        config.attributes['aria-busy'] = 'true';
      }
      return this._renderActionButton('mail-check', user, config);
    }

    _fallbackMailStatusIndicator(status) {
      const tooltip = this._esc(status.tooltip || status.text || '');
      const text = this._esc(status.text || '');
      const type = this._esc(status.type || 'pending');
      return [
        `<span class="mock-avatar__upload-btn user-table__mail-indicator" data-mail-status="${type}" role="note" title="${tooltip}" aria-label="${tooltip}">`,
          text,
        '</span>'
      ].join('');
    }

    _resolveMailStatus(user) {
      if (!user) {
        return null;
      }
      const dateText = this._trim(user.mailCheckDate);
      if (dateText) {
        return {
          type: 'verified',
          buttonType: 'admin-users-mail-verified',
          text: '確認済み',
          tooltip: `メール受信チェック済み(${dateText})`
        };
      }
      const stateMap = this.page && this.page.mailCheck;
      const state = stateMap ? stateMap[user.id] : '';
      if (state === 'pending' || state === 'sending') {
        return {
          type: 'pending',
          buttonType: 'admin-users-mail-pending',
          text: '確認中',
          tooltip: 'ユーザーによるメール受信の確認待ち'
        };
      }
      return null;
    }

    _renderUserAvatar(user) {
      const baseClasses = ['user-table__avatar'];
      const url = this._trim(user && user.avatarUrl);
      const labelSource = this._trim(user && user.displayName) || this._trim(user && user.userCode) || 'ユーザー';
      const ariaLabel = `${labelSource}のアバター`;
      const dataAttrs = ['data-admin-userlist-avatar'];
      const roleText = this._resolveRoleText(user);
      const id = (user && user.id !== undefined && user.id !== null) ? String(user.id) : '';
      const name = this._trim(user && user.displayName);
      const code = this._trim(user && user.userCode);
      const mail = this._trim(user && user.mail);
      const avatarSize = this._resolveAvatarSize();
      if (id) dataAttrs.push(`data-user-id="${this._esc(id)}"`);
      if (name) dataAttrs.push(`data-user-name="${this._esc(name)}"`);
      if (code) dataAttrs.push(`data-user-code="${this._esc(code)}"`);
      if (mail) dataAttrs.push(`data-user-mail="${this._esc(mail)}"`);
      if (roleText) dataAttrs.push(`data-user-role="${this._esc(roleText)}"`);
      if (url) dataAttrs.push(`data-avatar-src="${this._esc(url)}"`);
      if (name) dataAttrs.push(`data-avatar-name="${this._esc(name)}"`);
      dataAttrs.push(`data-avatar-alt="${this._esc(ariaLabel)}"`);
      dataAttrs.push(`data-avatar-size="${this._esc(String(avatarSize))}"`);

      return `<span class="${baseClasses.join(' ')}" tabindex="0" role="button" aria-label="${this._esc(ariaLabel)}" ${dataAttrs.join(' ')}></span>`;
    }

    _resolveRoleText(user) {
      if (!user) return '—';
      const role = this._trim(user.role);
      if (role) return role;
      return '—';
    }

    _renderRoleBadge(user) {
      if (!user || (!user.isSupervisor && !user.isOperator)) {
        return '';
      }
      const label = user.isSupervisor ? 'Supervisor' : 'Operator';
      const buttonType = user.isSupervisor ? 'admin-users-role-supervisor' : 'admin-users-role-operator';
      const svc = this.page && this.page.buttonService;
      const fallback = `<span class="user-table__role-badge">${this._esc(label)}</span>`;
      if (svc && typeof svc.createActionButton === 'function' && buttonType) {
        try {
          const node = svc.createActionButton(buttonType, {
            label,
            srLabel: '',
            ariaLabel: label,
            title: label
          });
          if (node && node.classList && node.classList.add) {
            node.classList.add('user-table__role-badge');
          }
          return this._nodeToHtml(node) || fallback;
        } catch (err) {
          console.warn('[AdminUsers.JobView] failed to render role badge', err);
        }
      }
      return fallback;
    }

    _renderContentsStatus(user) {
      const enabled = this._isContentsManagementEnabled(user);
      const label = enabled ? '利用可' : '利用不可';
      const status = enabled ? 'enabled' : 'disabled';
      return `<span class="user-table__contents-status" data-contents-access="${this._esc(status)}">${this._esc(label)}</span>`;
    }

    _renderDashboardStatus(user) {
      const enabled = this._isDashboardEnabled(user);
      const label = enabled ? '利用可' : '利用不可';
      const status = enabled ? 'enabled' : 'disabled';
      return `<span class="user-table__contents-status user-table__dashboard-status" data-dashboard-access="${this._esc(status)}">${this._esc(label)}</span>`;
    }

    _isContentsManagementEnabled(user) {
      if (!user) {
        return true;
      }
      const value = (typeof user.useContentsManagement !== 'undefined')
        ? user.useContentsManagement
        : user.use_contents_management;
      if (typeof value === 'undefined') {
        return true;
      }
      return this._normalizeRoleFlag(value);
    }

    _isDashboardEnabled(user) {
      if (!user) {
        return true;
      }
      const value = (typeof user.useDashboard !== 'undefined')
        ? user.useDashboard
        : user.use_dashboard;
      if (typeof value === 'undefined') {
        return true;
      }
      return this._normalizeRoleFlag(value);
    }

    _renderSummary() {
      const sel = this.page.selectorConfig;
      const $summary = $(sel.summary);
      if (!$summary.length) return;
      const total = (this.page.users || []).length;
      const filtered = (this.page.filtered || []).length;
      const tpl = this.page.textConfig.summary || '全{total}件中 {filtered}件を表示';
      $summary.text(tpl.replace('{total}', String(total)).replace('{filtered}', String(filtered)));
    }

    _renderFeedback() {
      const sel = this.page.selectorConfig;
      const $fb = $(sel.feedback);
      const $empty = $(sel.emptyState);
      if (!$fb.length && !$empty.length) return;

      const total = (this.page.users || []).length;
      const filtered = (this.page.filtered || []).length;

      // Hide both first
      if ($fb.length) $fb.addClass('hidden').attr('hidden', 'hidden').text('');
      if ($empty.length) $empty.addClass('hidden').attr('hidden', 'hidden');

      if (total === 0) {
        if ($empty.length) $empty.removeClass('hidden').removeAttr('hidden');
        else if ($fb.length) $fb.text(this.page.textConfig.empty || 'データがありません。').removeClass('hidden').removeAttr('hidden');
      } else if (filtered === 0) {
        if ($fb.length) $fb.text(this.page.textConfig.notFound || '該当するデータがありません。').removeClass('hidden').removeAttr('hidden');
      }
    }

    _showBusy(msg) {
      try {
        if (this.page.loader && typeof this.page.loader.show === 'function') this.page.loader.show();
        const $fb = $(this.page.selectorConfig.feedback);
        if ($fb.length) $fb.text(msg || '').removeClass('hidden').removeAttr('hidden');
      } catch (_) {}
    }
    _hideBusy() {
      try {
        if (this.page.loader && typeof this.page.loader.hide === 'function') this.page.loader.hide();
      } catch (_) {}
    }

    _setFeedback(msg) {
      const $fb = $(this.page.selectorConfig.feedback);
      if ($fb.length) $fb.text(msg || '').removeClass('hidden').removeAttr('hidden');
    }

    _toastError(msg) {
      try { this.page._toastError(msg); } catch (_) {}
    }

    _renderRowActions(user) {
      const actions = [];
      const name = user && user.displayName ? user.displayName : '';
      const editLabel = name ? `${name}を編集` : 'ユーザーを編集';
      const deleteLabel = name ? `${name}を削除` : 'ユーザーを削除';
      actions.push(this._renderActionButton('edit', user, {
        action: 'admin-users-edit',
        label: '',
        srLabel: editLabel,
        srLabelClass: 'visually-hidden',
        hoverLabel: editLabel,
        ariaLabel: editLabel,
        title: editLabel
      }));
      actions.push(this._renderActionButton('delete', user, {
        action: 'admin-users-delete',
        label: '',
        srLabel: deleteLabel,
        srLabelClass: 'visually-hidden',
        hoverLabel: deleteLabel,
        ariaLabel: deleteLabel,
        title: deleteLabel
      }));
      if (user && user.isOperator) {
        const selectableLabel = name ? `${name}の選択可能ユーザーを編集` : '選択可能ユーザーを編集';
        actions.push(this._renderActionButton('round-popup/members', user, {
          action: 'admin-users-selectable',
          label: '',
          srLabel: selectableLabel,
          srLabelClass: 'visually-hidden',
          hoverLabel: selectableLabel,
          ariaLabel: selectableLabel,
          title: selectableLabel,
          baseClass: 'table-action-button table-action-button--round'
        }));
      }
      return actions.join('');
    }

    _renderSelectableUsersCell(user) {
      const list = this._getSelectableUsersForUser(user);
      const id = user && user.id ? String(user.id) : '';
      const attrs = ['data-admin-users-selectable-list'];
      if (id) {
        attrs.push(`data-user-id="${this._esc(id)}"`);
      }
      const placeholder = list.length ? '' : '<span class="user-table__selectable-empty">未設定</span>';
      return `<div class="user-table__selectable" ${attrs.join(' ')}>${placeholder}</div>`;
    }

    _getSelectableUsersForUser(user) {
      if (!user) {
        return [];
      }
      if (Array.isArray(user.selectableUsers)) {
        return user.selectableUsers;
      }
      return [];
    }

    _mountUserAvatars() {
      const svc = this._getAvatarService();
      if (!svc || !this.page || !this.page.root) return;
      const nodes = this.page.root.querySelectorAll('[data-admin-userlist-avatar]');
      if (!nodes || !nodes.length) return;
      const defaultSize = this._resolveAvatarSize();
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        const size = Number(node.getAttribute('data-avatar-size')) || defaultSize;
        const data = {
          name: node.getAttribute('data-avatar-name') || node.getAttribute('data-user-name') || node.getAttribute('data-user-code') || '',
          alt: node.getAttribute('data-avatar-alt') || node.getAttribute('aria-label') || ''
        };
        const src = node.getAttribute('data-avatar-src');
        if (src) data.src = src;
        try {
          svc.render(node, data, { size, shape: 'circle' });
        } catch (err) {
          if (w.console && typeof w.console.warn === 'function') {
            w.console.warn('[AdminUsers.JobView] failed to render avatar', err);
          }
        }
      }
    }

    _applyAvatarPopovers() {
      const svc = this._getAvatarService();
      if (!svc || !this.page || !this.page.root) return;
      const nodes = this.page.root.querySelectorAll('[data-admin-userlist-avatar]');
      if (!nodes || !nodes.length) return;
      const self = this;
      svc.eventUpdate(nodes, {
        popover: { placement: 'bottom-start', offset: 12 },
        beforeHide(anchor) {
          if (anchor && anchor.classList) anchor.classList.remove('is-popover-active');
        },
        beforeShow(anchor) {
          if (anchor && anchor.classList) anchor.classList.add('is-popover-active');
        }
      });
    }

    _mountSelectableUserlists() {
      const svc = this.page && this.page.userlistAvatarService;
      if (!svc || !this.page || !this.page.root) return;
      const nodes = this.page.root.querySelectorAll('[data-admin-users-selectable-list]');
      if (!nodes || !nodes.length) return;
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        const userId = node.getAttribute('data-user-id') || '';
        const user = this.page.usersById ? this.page.usersById[userId] : null;
        const list = this._getSelectableUsersForUser(user);
        if (!list || list.length === 0) {
          continue;
        }
        const normalized = list.map((entry) => ({
          name: entry.displayName || entry.userCode || 'ユーザー',
          role: entry.role || '',
          src: entry.avatarUrl || entry.avatar || '',
          isActive: entry.isActive !== false
        }));
        try {
          svc.render(node, normalized, { popoverPlacement: 'bottom-start', overlap: -10, size: 28, nameOverlay: false });
        } catch (err) {
          if (w.console && typeof w.console.warn === 'function') {
            w.console.warn('[AdminUsers.JobView] failed to render selectable user list', err);
          }
        }
      }
    }

    _createAvatarPopoverContent(anchor) {
      if (!anchor) return null;
      const doc = this._doc || document;
      const container = doc.createElement('div');
      container.className = 'admin-users__avatar-popover';

      const header = doc.createElement('div');
      header.className = 'admin-users__avatar-popover-header';

      const avatarWrapper = doc.createElement('div');
      avatarWrapper.className = 'admin-users__avatar-popover-avatar';
      this._renderPopoverAvatar(avatarWrapper, anchor);
      header.appendChild(avatarWrapper);

      const identity = doc.createElement('div');
      identity.className = 'admin-users__avatar-popover-identity';
      const name = doc.createElement('div');
      name.className = 'admin-users__avatar-popover-name';
      name.textContent = anchor.getAttribute('data-user-name') || anchor.getAttribute('data-user-code') || 'ユーザー';
      identity.appendChild(name);
      const code = anchor.getAttribute('data-user-code');
      if (code) {
        const codeEl = doc.createElement('div');
        codeEl.className = 'admin-users__avatar-popover-code';
        codeEl.textContent = code;
        identity.appendChild(codeEl);
      }
      header.appendChild(identity);
      container.appendChild(header);

      const meta = doc.createElement('dl');
      meta.className = 'admin-users__avatar-popover-meta';
      const metaRows = [
        { label: 'メール', value: anchor.getAttribute('data-user-mail'), type: 'mail' },
        { label: 'ロール', value: anchor.getAttribute('data-user-role') }
      ];
      metaRows.forEach((item) => {
        const row = doc.createElement('div');
        row.className = 'admin-users__avatar-popover-meta-row';
        const label = doc.createElement('dt');
        label.className = 'admin-users__avatar-popover-meta-label';
        label.textContent = item.label;
        const value = doc.createElement('dd');
        value.className = 'admin-users__avatar-popover-meta-value';
        const text = (item.value || '').trim();
        if (item.type === 'mail' && text) {
          const link = doc.createElement('a');
          link.href = `mailto:${text}`;
          link.textContent = text;
          value.appendChild(link);
        } else {
          value.textContent = text || '—';
        }
        row.appendChild(label);
        row.appendChild(value);
        meta.appendChild(row);
      });
      container.appendChild(meta);

      return container;
    }

    _renderPopoverAvatar(container, anchor) {
      if (!container || !anchor) return;
      const svc = this._getAvatarService();
      const name = anchor.getAttribute('data-user-name') || anchor.getAttribute('data-user-code') || '';
      const alt = anchor.getAttribute('data-avatar-alt') || anchor.getAttribute('aria-label') || name || '';
      const src = anchor.getAttribute('data-avatar-src');
      if (svc && typeof svc.render === 'function') {
        try {
          const opts = { size: 52, shape: 'circle' };
          const data = { name, alt };
          if (src) data.src = src;
          svc.render(container, data, opts);
          return;
        } catch (err) {
          if (w.console && typeof w.console.warn === 'function') {
            w.console.warn('[AdminUsers.JobView] failed to render popover avatar', err);
          }
        }
      }
      this._appendFallbackAvatarImage(container, src, alt);
    }

    _appendFallbackAvatarImage(container, src, alt) {
      if (!container) return;
      const doc = this._doc || document;
      const img = doc.createElement('img');
      img.src = src || this._getFallbackAvatarSrc();
      img.alt = alt || '';
      img.loading = 'lazy';
      container.appendChild(img);
    }

    _getAvatarService() {
      if (this.avatarService) return this.avatarService;
      if (this.page && this.page.avatarService) {
        this.avatarService = this.page.avatarService;
        return this.avatarService;
      }
      return null;
    }

    _resolveAvatarSize() {
      const svc = this._getAvatarService();
      if (svc && svc.config && Number(svc.config.size)) {
        const candidate = Number(svc.config.size);
        if (!Number.isNaN(candidate) && candidate > 0) {
          return candidate;
        }
      }
      return 44;
    }

    _getFallbackAvatarSrc() {
      const svc = this._getAvatarService();
      if (svc && svc.config && svc.config.fallbackAvatarSrc) {
        const candidate = this._trim(svc.config.fallbackAvatarSrc);
        if (candidate) return candidate;
      }
      return '/image/user-avatar.svg';
    }

    _renderActionButton(type, user, config) {
      const options = this._buildActionButtonOptions(user, config);
      const svc = this.page && this.page.buttonService;
      if (svc && typeof svc.createActionButton === 'function') {
        try {
          const node = svc.createActionButton(type, options);
          if (node) return this._nodeToHtml(node);
        } catch (err) {
          console.warn('[AdminUsers.JobView] failed to render action button', err);
        }
      }
      return this._fallbackActionButton(options, type);
    }

    _buildActionButtonOptions(user, config) {
      const cfg = config ? Object.assign({}, config) : {};
      const id = user && user.id ? String(user.id) : '';
      const dataset = Object.assign({}, cfg.dataset);
      if (cfg.action) dataset.action = cfg.action;
      if (id) dataset.userId = id;
      const attributes = Object.assign({}, cfg.attributes);
      if (cfg.action) attributes['data-action'] = cfg.action;
      if (id) attributes['data-user-id'] = id;
      const label = cfg.label || '';
      const hoverLabel = cfg.hoverLabel || label;
      const title = cfg.title || hoverLabel || label;
      const ariaLabel = cfg.ariaLabel || hoverLabel || label;
      const baseOptions = {
        label,
        srLabel: cfg.srLabel || label,
        srLabelClass: cfg.srLabelClass || '',
        ariaLabel,
        hoverLabel,
        title,
        baseClass: 'table-action-button',
        variantPrefix: ['table-action-button--'],
        dataset,
        attributes
      };
      return Object.assign({}, baseOptions, cfg, { dataset, attributes });
    }

    _fallbackActionButton(config, type) {
      const variantClass = type ? ` table-action-button--${this._esc(type)}` : '';
      const attrs = ['type="button"', `class="table-action-button${variantClass}"`];
      const dataset = config && config.dataset ? config.dataset : {};
      if (dataset.action) attrs.push(`data-action="${this._esc(dataset.action)}"`);
      if (dataset.userId) attrs.push(`data-user-id="${this._esc(dataset.userId)}"`);
      if (config && config.ariaLabel) attrs.push(`aria-label="${this._esc(config.ariaLabel)}"`);
      if (config && config.title) attrs.push(`title="${this._esc(config.title)}"`);
      if (config && config.hoverLabel) attrs.push(`data-hover-label="${this._esc(config.hoverLabel)}"`);
      const iconHtml = FALLBACK_ICON_HTML[type] || '';
      const parts = [];
      if (iconHtml) parts.push(iconHtml);
      const srText = (config && (config.srLabel || config.label)) ? this._esc(config.srLabel || config.label) : '';
      const srClass = config && config.srLabelClass ? config.srLabelClass : '';
      if (srText) {
        if (srClass) {
          parts.push(`<span class="${srClass}">${srText}</span>`);
        } else {
          parts.push(srText);
        }
      }
      return `<button ${attrs.join(' ')}>${parts.join('')}</button>`;
    }

    _nodeToHtml(node) {
      if (!node) return '';
      if (node.outerHTML) return node.outerHTML;
      const wrap = document.createElement('div');
      wrap.appendChild(node);
      return wrap.innerHTML;
    }

    _resolveAvatarUrl(raw) {
      const candidates = [
        raw && raw.avatar,
        raw && raw.avatarUrl,
        raw && raw.avatarURL,
        raw && raw.avatarUrlSmall,
        raw && raw.avatarUrlMedium,
        raw && raw.avatarUrlOriginal,
        raw && raw.photoUrl,
        raw && raw.photoURL,
        raw && raw.imageUrl,
        raw && raw.imageURL,
        raw && raw.profile && raw.profile.avatar,
        raw && raw.profile && raw.profile.avatarUrl,
        raw && raw.profile && raw.profile.avatarUrlSmall,
        raw && raw.profile && raw.profile.avatarUrlMedium,
        raw && raw.profile && raw.profile.avatarUrlOriginal,
        raw && raw.profile && raw.profile.photoUrl
      ];
      for (let i = 0; i < candidates.length; i += 1) {
        const resolved = this._resolveAvatarSource(candidates[i]);
        if (resolved) return resolved;
      }
      return '';
    }

    _resolveAvatarInitial(raw, displayName, userCode) {
      const avatar = this._extractAvatarObject(raw);
      const candidates = [
        raw && raw.avatarInitial,
        raw && raw.initial,
        raw && raw.initials,
        avatar && avatar.initial,
        avatar && avatar.text,
        avatar && avatar.alt
      ];
      for (let i = 0; i < candidates.length; i += 1) {
        const formatted = this._formatAvatarInitial(candidates[i]);
        if (formatted) return formatted;
      }
      return this._deriveAvatarInitial(displayName, userCode);
    }

    _resolveAvatarTransform(raw) {
      const avatar = this._extractAvatarObject(raw);
      const candidates = [
        raw && raw.avatarTransform,
        raw && raw.avatarStyle,
        avatar && avatar.transform,
        avatar && avatar.style
      ];
      for (let i = 0; i < candidates.length; i += 1) {
        const value = this._trim(candidates[i]);
        if (value) return value;
      }
      return '';
    }

    _extractAvatarObject(raw) {
      if (!raw) return null;
      if (raw.avatar && typeof raw.avatar === 'object') return raw.avatar;
      if (raw.profile && raw.profile.avatar && typeof raw.profile.avatar === 'object') {
        return raw.profile.avatar;
      }
      return null;
    }

    _resolveAvatarSource(candidate) {
      if (!candidate) return '';
      if (typeof candidate === 'string') {
        const text = candidate.trim();
        return text;
      }
      if (typeof candidate === 'object') {
        const payloadUrl = this._buildAvatarRequestUrl(candidate);
        if (payloadUrl) {
          return payloadUrl;
        }
        const keys = [
          'src', 'url', 'href', 'urlSmall', 'urlMedium', 'urlOriginal',
          'imageUrl', 'imageURL', 'avatarUrl', 'avatarURL', 'avatarUrlSmall',
          'avatarUrlMedium', 'avatarUrlOriginal', 'photoUrl', 'photoURL'
        ];
        for (let i = 0; i < keys.length; i += 1) {
          const key = keys[i];
          if (candidate[key]) {
            const text = this._trim(candidate[key]);
            if (text) return text;
          }
        }
      }
      return '';
    }

    _buildAvatarRequestUrl(payload) {
      if (!payload || typeof payload !== 'object') {
        return '';
      }
      const requestType = this._trim(payload.requestType || payload.request_type || '');
      const apiType = this._trim(payload.type || payload.avatarType || '');
      const normalizedType = apiType.toLowerCase();
      const id = payload.id || payload.userId || payload.uid;
      const token = this._trim(payload.token || '');
      if (!requestType || !apiType || normalizedType !== 'useravatar' || !token || (!id && id !== 0)) {
        return '';
      }
      const variant = this._trim(payload.variant || payload.size || '');
      const version = this._trim(payload.v || payload.version || '');
      const base = (this.page && this.page.api && this.page.api.endpoint) ? this.page.api.endpoint : window.Utils.getApiEndpoint();
      const params = [
        `requestType=${encodeURIComponent(requestType)}`,
        `type=${encodeURIComponent(apiType)}`,
        `id=${encodeURIComponent(String(id))}`,
        `token=${encodeURIComponent(token)}`
      ];
      if (variant) params.push(`variant=${encodeURIComponent(variant)}`);
      if (version) params.push(`v=${encodeURIComponent(version)}`);
      const separator = base.indexOf('?') === -1 ? '?' : '&';
      return `${base}${separator}${params.join('&')}`;
    }

    _formatAvatarInitial(value) {
      if (typeof value !== 'string') return '';
      const text = value.trim();
      if (!text) return '';
      return text.length > 2 ? text.slice(0, 2) : text;
    }

    _deriveAvatarInitial(displayName, userCode) {
      const base = (displayName || '').trim() || (userCode || '').trim();
      if (!base) return '?';
      const first = base.charAt(0);
      return /[a-z]/i.test(first) ? first.toUpperCase() : first;
    }

    _trim(value) {
      return typeof value === 'string' ? value.trim() : '';
    }

    _esc(s) {
      return (s || '').toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  }

  // export
  w.AdminUser = w.AdminUser || {};
  w.AdminUser.JobView = JobView;

})(window, window.jQuery);
