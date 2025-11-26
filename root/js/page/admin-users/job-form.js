(function (w, $) {
  'use strict';

  /**
   * AdminUsers Job: Form & User Actions
   * - Open/close form, submit (create/update), delete, mail-check
   */
  class JobForm {
    /** @param {AdminUsers} page */
    constructor(page) {
      this.page = page;
      this.modal = null;
      this.modalForm = null;
      this.modalFields = null;
      this.modalError = null;
      this.modalTitle = null;
      this.modalSummary = null;
      this.modalSubmit = null;
      this.modalHost = null;
      this._lastFocus = null;
      this._initialValues = null;
      this._boundChangeHandler = null;
      this._avatarSettingId = 'admin-users-avatar-setting';
      this._initialAvatarState = null;
      this._currentMode = null;
      this._requiredErrorActive = false;
      this._showRoleFlags = false;
    }

    /* ------------------------------ open / close --------------------------- */

    openCreateForm() {
      this._renderForm({ mode: 'create' });
    }

    openEditForm(userId) {
      const user = this._getUser(userId);
      if (!user) {
        this.page._toastError('ユーザー情報が見つかりません。');
        return;
      }
      this._renderForm({ mode: 'edit', user });
    }

    async cancelForm() {
      try {
        const requiresConfirm = this._isFormDirty();
        if (requiresConfirm) {
          const message = this.page.textConfig.formCancelConfirm
            || '入力内容が保存されていません。モーダルを閉じますか？';
          const confirmed = await this.page.confirmDialogService.open(message, { type: 'warning' });
          if (!confirmed) {
            return;
          }
        }
        this._closeModal();
      } catch (err) {
        console.error('[AdminUsers.JobForm.cancelForm]', err);
      }
    }

    /* -------------------------------- submit ------------------------------ */

    async submitForm() {
      const sel = this.page.selectorConfig;
      const $form = $(sel.form);
      if (!$form.length) return;

      this._showRoleFlags = this._canEditRoleFlags() || this._hasRoleFlagFields($form);

      // read values
      const values = this._readForm($form);

      // determine mode
      const mode = (this._currentMode || $form.attr('data-mode') || 'create').toString();
      const hasId = !!values.id;
      const isEdit = (mode === 'edit') || hasId;

      // validate
      const validation = this._validate(values);
      if (!validation.ok) {
        this._applyRequiredHighlight(validation.missingRequired || []);
        if (validation.type === 'required') {
          this._setFormError('');
          this.page._toastError(validation.message || '必須項目を入力してください。');
        } else if (validation.message) {
          this._setFormError(validation.message);
        }
        return;
      }

      this._applyRequiredHighlight([]);

      try {
        this._setFormError('');
        // Show loader
        if (this.page.loader && this.page.loader.show) this.page.loader.show();
        this._clearDirtyIndicators();

        if (isEdit) {
          const payload = this._buildUpdatePayload(values);
          if (!payload) {
            const noChangesMsg = this.page.textConfig.formNoChanges || '変更された項目がありません。';
            this.page._toastInfo(noChangesMsg);
            return;
          }
          await this.page.apiPost('update', payload);
          this.page._toastSuccess(this.page.textConfig.updateSuccess || '更新しました。');
        } else {
          // create (send all fields; backend may ignore unsupported ones)
          const payload = {
            userCode: values.userCode,
            displayName: values.displayName,
            mail: values.mail,
            organization: values.organization,
            role: values.role,
            initialPassword: values.initialPassword || '',
          };
          if (this._showRoleFlags) {
            payload.isSupervisor = values.isSupervisor ? '1' : '0';
            payload.isOperator = values.isOperator ? '1' : '0';
          }
          this._appendAvatarPayload(payload);
          await this.page.apiPost('create', payload);
          this.page._toastSuccess(this.page.textConfig.createSuccess || '作成しました。');
        }

        // Close & refresh
        this._closeAfterSubmit();
        await this._ensureView();
        await new window.AdminUser.JobView(this.page).loadUsers();

      } catch (err) {
        console.error('[AdminUsers.JobForm.submitForm]', err);
        const msg = (err && (err.message || err.reason)) || '送信に失敗しました。';
        this._setFormError(msg);
        this.page._toastError(msg);
      } finally {
        if (this.page.loader && this.page.loader.hide) this.page.loader.hide();
      }
    }

    /* -------------------------------- delete ------------------------------ */

    async deleteUser(userId) {
      const u = this._getUser(userId);
      if (!u) {
        this.page._toastError('ユーザー情報が見つかりません。');
        return;
      }
      const sessionId = (this.page && typeof this.page.getSessionUserId === 'function')
        ? this.page.getSessionUserId()
        : '';
      if (sessionId && String(u.id) === String(sessionId)) {
        this.page._toastError(this.page.textConfig.deleteSelfError || 'ログイン中のユーザーは削除できません。');
        return;
      }
      const confirmed = await this.page.confirmDialogService.open(
        this.page.textConfig.deleteConfirm || '削除しますか？',
        { type: 'warning' }
      );
      if (!confirmed) return;

      try {
        if (this.page.loader && this.page.loader.show) this.page.loader.show();
        // try physical delete first
        await this.page.apiPost('delete', { id: u.id, physicalDelete: '1' });
        this.page._toastSuccess(this.page.textConfig.deleteSuccess || '削除しました。');
        await this._ensureView();
        await new window.AdminUser.JobView(this.page).loadUsers();
      } catch (err) {
        // if related data, ask logical delete
        const reason = (err && (err.code || err.reason || err.message || '')).toString().toLowerCase();
        const maybeRelated = /related|constraint|関/i.test(reason);
        if (maybeRelated) {
          const ok = await this.page.confirmDialogService.open(
            this.page.textConfig.deleteLogicalConfirm || '関連データがあります。論理削除しますか？',
            { type: 'warning' }
          );
          if (!ok) return;
          try {
            await this.page.apiPost('delete', { id: u.id, physicalDelete: '0' });
            this.page._toastSuccess(this.page.textConfig.deleteLogicalSuccess || '論理削除しました。');
            await this._ensureView();
            await new window.AdminUser.JobView(this.page).loadUsers();
            return;
          } catch (e2) {
            console.error('[AdminUsers.JobForm.deleteUser:logical]', e2);
            this.page._toastError(this.page.textConfig.deleteError || '削除に失敗しました。');
          } finally {
            if (this.page.loader && this.page.loader.hide) this.page.loader.hide();
          }
        } else {
          console.error('[AdminUsers.JobForm.deleteUser]', err);
          this.page._toastError(this.page.textConfig.deleteError || '削除に失敗しました。');
          if (this.page.loader && this.page.loader.hide) this.page.loader.hide();
        }
      }
    }

    /* ------------------------------ mail check ---------------------------- */

    async sendMailCheck(userId) {
      const u = this._getUser(userId);
      if (!u) {
        this.page._toastError('ユーザー情報が見つかりません。');
        return;
      }
      if (!u.mail) {
        this.page._toastError('メールアドレスが登録されていません。');
        return;
      }
      const confirmed = await this.page.confirmDialogService.open(
        this.page.textConfig.mailCheckConfirm || 'メール確認を送信しますか？',
        { type: 'info' }
      );
      if (!confirmed) return;

      try {
        // mark sending/pending state
        this.page.mailCheck = this.page.mailCheck || {};
        this.page.mailCheck[u.id] = 'sending';
        await this._ensureView();
        new window.AdminUser.JobView(this.page).applyFilters();

        await this.page.apiPost('mailCheck', { id: u.id });
        this.page.mailCheck[u.id] = 'pending';
        await this._ensureView();
        new window.AdminUser.JobView(this.page).applyFilters();

        this.page._toastSuccess(this.page.textConfig.mailCheckSuccess || '送信しました。');
      } catch (err) {
        console.error('[AdminUsers.JobForm.sendMailCheck]', err);
        // clear flags
        if (this.page.mailCheck) delete this.page.mailCheck[u.id];
        this.page._toastError(this.page.textConfig.mailCheckError || '送信に失敗しました。');
      }
    }

    /* ------------------------------ internals ----------------------------- */

    _renderForm({ mode, user }) {
      const txt = this.page.textConfig;
      const isEdit = (mode === 'edit');
      const modal = this._ensureModal();
      if (!modal || !this.modalForm || !this.modalFields) {
        return;
      }

      this._lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const values = this._buildInitialValues(mode, user);
      const resolvedMode = isEdit ? 'edit' : 'create';
      this._showRoleFlags = this._canEditRoleFlags();

      this._currentMode = resolvedMode;
      this.modalForm.setAttribute('data-mode', resolvedMode);
      this.modalForm.setAttribute('data-user-id', values.id || '');
      if (this.modalFields) {
        this.modalFields.innerHTML = this._buildFieldsHtml(values, isEdit, this._showRoleFlags);
      }

      if (this.modalTitle) {
        this.modalTitle.textContent = isEdit
          ? (txt.formTitleEdit || 'ユーザー編集')
          : (txt.formTitleCreate || 'ユーザー追加');
      }
      if (this.modalSubmit) {
        this.modalSubmit.textContent = isEdit
          ? (txt.formSubmitEdit || '更新する')
          : (txt.formSubmitCreate || '追加する');
      }
      if (this.modalSummary) {
        if (isEdit) {
          this.modalSummary.textContent = '';
          this.modalSummary.classList.add('is-hidden');
        } else {
          const summaryText = (txt.formSummaryCreate || '氏名・ユーザーコード・メールアドレスは必須です。初期パスワードは任意です。');
          this.modalSummary.textContent = summaryText;
          this.modalSummary.classList.remove('is-hidden');
        }
      }

      this._mountAvatarSetting(values);
      this._setFormError('');
      this._resetValidationState();
      this._setupChangeTracking(values);

      this._openModal();
      this._focusFirstField();
    }

    _canEditRoleFlags() {
      return !!(this.page && typeof this.page.isSupervisorUser === 'function' && this.page.isSupervisorUser());
    }

    _hasRoleFlagFields($form) {
      if (!$form || typeof $form.find !== 'function') {
        return false;
      }
      return $form.find('[name="isSupervisor"], [name="isOperator"]').length > 0;
    }

    _readForm($form) {
      const get = (n) => ($form.find(`[name="${n}"]`).val() || '').toString().trim();
      const getBool = (n) => $form.find(`[name="${n}"]`).is(':checked');
      const displayName = get('displayName');
      const userCode = get('userCode');
      const showRoleFlags = this._showRoleFlags === true;
      const isSupervisor = showRoleFlags ? getBool('isSupervisor') : this._getInitialRoleFlag('isSupervisor');
      const isOperator = showRoleFlags ? getBool('isOperator') : this._getInitialRoleFlag('isOperator');
      return {
        mode: ($form.attr('data-mode') || 'create').toString(),
        id: ($form.find('[name="id"]').val() || '').toString(),
        displayName,
        userCode,
        mail: get('mail'),
        organization: get('organization'),
        role: get('role'),
        initialPassword: get('initialPassword'),
        isSupervisor,
        isOperator
      };
    }

    _validate(v) {
      const missingRequired = this._collectMissingRequired(v);
      if (missingRequired.length) {
        return {
          ok: false,
          type: 'required',
          missingRequired,
          message: this.page.textConfig.formErrorRequired || '必須項目を入力してください。'
        };
      }
      if ((v.userCode || '').length < 4) {
        return { ok: false, message: this.page.textConfig.formErrorUserCodeLength || 'ユーザーコードは4文字以上で入力してください。' };
      }
      const mail = (v.mail || '').trim();
      if (mail) {
        const rx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!rx.test(mail)) {
          return { ok: false, message: this.page.textConfig.formErrorEmail || 'メールアドレスの形式が正しくありません。' };
        }
      }
      return { ok: true };
    }

    _setFormError(msg) {
      const $err = $(this.page.selectorConfig.formError);
      if ($err.length) {
        if (msg) {
          $err.text(msg).removeClass('hidden').removeAttr('hidden');
        } else {
          $err.text('').addClass('hidden').attr('hidden', 'hidden');
        }
      } else if (msg) {
        this.page._toastError(msg || 'エラーが発生しました。');
      }
    }

    _collectMissingRequired(values) {
      const missing = [];
      if (!this._trim(values && values.displayName)) {
        missing.push('displayName');
      }
      if (!this._trim(values && values.userCode)) {
        missing.push('userCode');
      }
      return missing;
    }

    _applyRequiredHighlight(fields) {
      if (!this.modalForm) {
        return;
      }
      const names = Array.isArray(fields) ? fields : [];
      const targets = new Set(names.map(String));
      const rows = this.modalForm.querySelectorAll('[data-field-name]');
      rows.forEach((row) => {
        const fieldName = row.getAttribute('data-field-name');
        const hasError = targets.has(fieldName);
        row.classList.toggle('user-form__field--error', hasError);
        const input = row.querySelector('.user-management__input');
        if (input) {
          input.classList.toggle('is-error', hasError);
          if (hasError) {
            input.setAttribute('aria-invalid', 'true');
          } else {
            input.removeAttribute('aria-invalid');
          }
        }
      });
      this._requiredErrorActive = targets.size > 0;
    }

    _resetValidationState() {
      this._requiredErrorActive = false;
      this._applyRequiredHighlight([]);
    }

    _updateRequiredHighlight() {
      if (!this._requiredErrorActive || !this.modalForm) {
        return;
      }
      const $form = $(this.modalForm);
      if (!$form.length) {
        return;
      }
      const currentValues = this._readForm($form);
      const missing = this._collectMissingRequired(currentValues);
      this._applyRequiredHighlight(missing);
    }

    _getUser(userId) {
      const id = String(userId);
      return (this.page.usersById && this.page.usersById[id])
        || (this.page.users || []).find(u => String(u.id) === id);
    }

    _esc(s) {
      return (s || '').toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    _trim(value) {
      return typeof value === 'string' ? value.trim() : '';
    }

    _buildInitialValues(mode, user) {
      const isEdit = (mode === 'edit');
      const u = user || {};
      const displayName = (u.displayName || '').toString().trim();
      const userCode = (u.userCode || u.code || '').toString().trim();
      const mail = (u.mail || '').toString().trim();
      const role = (u.role || u.roleName || u.roleLabel || u.roleText || u.roleCode || '').toString().trim();
      const initialPassword = this._trim(u.initialPassword || u.autoPassword || '');
      return {
        id: (u.id || u.userId || '').toString(),
        displayName,
        userCode,
        mail,
        organization: (u.organization || '').toString().trim(),
        role,
        initialPassword,
        avatar: this._normalizeAvatarInitial(u),
        isSupervisor: this._normalizeRoleFlag(u.isSupervisor || u.supervisor),
        isOperator: this._normalizeRoleFlag(u.isOperator || u.operator || u.isSupervisor)
      };
    }

    _normalizeAvatarInitial(user) {
      const avatar = (user && typeof user.avatar === 'object') ? user.avatar : null;
      const urlCandidates = [
        user && user.avatarUrl,
        user && user.avatarURL,
        user && user.photoUrl,
        user && user.photoURL,
        avatar && (avatar.url || avatar.src || avatar.href),
        user && user.profile && user.profile.avatar && user.profile.avatar.url
      ];
      let url = '';
      for (let i = 0; i < urlCandidates.length; i += 1) {
        const candidate = this._trim(urlCandidates[i]);
        if (candidate) {
          url = candidate;
          break;
        }
      }
      if (!url) {
        const payloadUrl = this._buildAvatarRequestUrl(avatar) || this._buildAvatarRequestUrl(user);
        if (payloadUrl) {
          url = payloadUrl;
        }
      }
      let fileName = '';
      if (avatar && avatar.fileName) {
        fileName = avatar.fileName.toString();
      } else if (user && user.avatarFileName) {
        fileName = user.avatarFileName.toString();
      } else if (user && user.imageFileName) {
        fileName = user.imageFileName.toString();
      }
      if (!url) {
        return null;
      }
      return { url, fileName };
    }

    _resolveAvatarPlaceholder(values) {
      const name = this._trim(values && values.displayName);
      const code = this._trim(values && values.userCode);
      const source = name || code;
      if (!source) {
        return 'USER';
      }
      const first = source.charAt(0);
      if (/^[a-z]/i.test(first)) {
        return first.toUpperCase();
      }
      return first;
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

    _buildFieldsHtml(values, isEdit, showRoleFlags) {
      const requiredBadge = this._getBadgeHtml('required');
      const optionalBadge = this._getBadgeHtml('optional');
      const rows = [];

      rows.push(this._renderAvatarField(values));

      rows.push(this._renderFieldRow({
        name: 'displayName',
        label: '氏名',
        badgeHtml: requiredBadge,
        controlHtml: `<input type="text" name="displayName" class="user-management__input" value="${this._esc(values.displayName)}" required maxlength="64" autocomplete="name">`
      }));

      rows.push(this._renderFieldRow({
        name: 'userCode',
        label: 'ユーザーコード',
        badgeHtml: requiredBadge,
        controlHtml: `<input type="text" name="userCode" class="user-management__input" value="${this._esc(values.userCode)}" required minlength="4" maxlength="64" autocomplete="username">`
      }));

      rows.push(this._renderFieldRow({
        name: 'mail',
        label: 'メールアドレス',
        badgeHtml: optionalBadge,
        controlHtml: `<input type="email" name="mail" class="user-management__input" value="${this._esc(values.mail)}" maxlength="128" autocomplete="email" placeholder="user@example.com">`
      }));

      rows.push(this._renderFieldRow({
        name: 'organization',
        label: '所属',
        badgeHtml: optionalBadge,
        controlHtml: `<input type="text" name="organization" class="user-management__input" value="${this._esc(values.organization || '')}" maxlength="128" autocomplete="organization">`
      }));

      rows.push(this._renderFieldRow({
        name: 'role',
        label: 'ロール',
        badgeHtml: optionalBadge,
        controlHtml: `<input type="text" name="role" class="user-management__input" value="${this._esc(values.role)}" maxlength="64" placeholder="例: マネージャー">`
      }));

      if (showRoleFlags) {
        rows.push(this._renderRoleToggleField({
          name: 'isSupervisor',
          label: 'Supervisor',
          description: 'ユーザーにスーパーバイザー権限を付与します。',
          checked: values.isSupervisor === true
        }));
        rows.push(this._renderRoleToggleField({
          name: 'isOperator',
          label: 'Operator',
          description: 'ユーザーにオペレーター権限を付与します。',
          checked: values.isOperator === true
        }));
      }

      rows.push(this._renderFieldRow({
        name: 'initialPassword',
        label: '初期パスワード',
        badgeHtml: optionalBadge,
        controlHtml: `<input type="text" name="initialPassword" class="user-management__input" value="${this._esc(values.initialPassword)}" maxlength="128" autocomplete="new-password" placeholder="未入力の場合は自動生成されます">`
      }));

      const sections = [
        '<div class="user-form__fields admin-users__form-fields">',
        rows.join(''),
        '</div>'
      ];

      if (isEdit && values.id) {
        sections.push(`<input type="hidden" name="id" value="${this._esc(values.id)}">`);
      }
      return sections.join('');
    }

    _renderRoleToggleField(options) {
      const name = options && options.name ? options.name : '';
      const label = options && options.label ? options.label : '';
      const description = options && options.description ? options.description : '';
      const checked = options && options.checked ? ' checked' : '';
      const controlHtml = [
        '<div class="mock-control mock-control--toggle user-form__toggle-control">',
        '  <div class="user-form__toggle-text">',
        `    <div class="user-form__toggle-title">${this._esc(label)}</div>`,
        description ? `    <p class="user-form__toggle-desc">${this._esc(description)}</p>` : '',
        '  </div>',
        '  <label class="toggle-switch">',
        `    <input type="checkbox" class="toggle-switch__input" name="${this._esc(name)}" value="1"${checked}>`,
        '    <span class="toggle-switch__slider" aria-hidden="true"></span>',
        `    <span class="visually-hidden">${this._esc(label || '権限')}を切り替える</span>`,
        '  </label>',
        '</div>'
      ].join('');
      return this._renderFieldRow({
        name,
        label,
        badgeHtml: '',
        controlHtml
      });
    }

    _renderAvatarField(values) {
      const optionalBadge = this._getBadgeHtml('optional');
      const placeholder = this._resolveAvatarPlaceholder(values);
      const id = this._avatarSettingId;
      const filenameText = (this.page && this.page.avatarSettingConfig && this.page.avatarSettingConfig.emptyFilenameText)
        || '選択されていません';
      const deleteButtonHtml = this._renderAvatarDeleteButton();
      const controlHtml = [
        `<div class="mock-control mock-control--avatar admin-users__avatar-control" id="${this._esc(id)}">`,
        '  <div class="mock-avatar">',
        '    <div class="mock-avatar__preview">',
        '      <img data-avatar-preview data-role="avatar-img" src="" alt="アバタープレビュー" hidden />',
        `      <span class="mock-avatar__placeholder" data-avatar-placeholder>${this._esc(placeholder || 'USER')}</span>`,
        '    </div>',
        '    <div class="mock-avatar__content">',
        `      <p class="mock-avatar__filename" data-avatar-filename>${this._esc(filenameText)}</p>`,
        '      <div class="mock-avatar__actions">',
        '        <button type="button" class="mock-avatar__upload-btn" data-action="choose-avatar" data-button-type="account-settings-avatar-choose">画像を選択</button>',
        `        ${deleteButtonHtml}`,
        '      </div>',
        '      <p class="mock-avatar__hint" data-avatar-hint>推奨サイズ: 512×512px 以上の正方形画像。</p>',
        '      <input type="file" accept="image/*" name="imageFile" data-role="avatar-input" hidden />',
        '    </div>',
        '  </div>',
        '</div>'
      ].join('');
      return this._renderFieldRow({
        name: 'avatar',
        label: 'アバター',
        badgeHtml: optionalBadge,
        controlHtml
      });
    }

    _getBadgeHtml(kind) {
      const fallback = this._badgeFallback(kind);
      const svc = this.page && this.page.labelService;
      if (!svc || typeof svc.create !== 'function') {
        return fallback;
      }
      try {
        const node = svc.create(kind);
        return this._nodeToHtml(node) || fallback;
      } catch (err) {
        if (w.console && typeof w.console.warn === 'function') {
          w.console.warn('[AdminUsers.JobForm] failed to render field badge', err);
        }
        return fallback;
      }
    }

    _badgeFallback(kind) {
      const fallbacks = {
        required: '<span class="user-management__field-badge user-management__field-badge--required">必須</span>',
        optional: '<span class="user-management__field-badge">任意</span>'
      };
      return fallbacks[kind] || '';
    }

    _renderAvatarDeleteButton() {
      const label = 'アバターを削除';
      const fallback = '<button type="button" class="mock-avatar__upload-btn mock-avatar__upload-btn--secondary" data-action="delete-avatar" data-button-type="delete" data-label="アバターを削除" aria-label="アバターを削除">削除</button>';
      const svc = this.page && this.page.buttonService;
      if (!svc || typeof svc.createActionButton !== 'function') {
        return fallback;
      }
      try {
        const btn = svc.createActionButton('delete', {
          baseClass: 'table-action-button',
          variantPrefix: ['table-action-button--'],
          ariaLabel: label,
          srLabel: label,
          attributes: {
            'data-action': 'delete-avatar',
            'data-label': label,
            'data-button-type': 'delete'
          }
        });
        if (!btn) {
          return fallback;
        }
        btn.type = 'button';
        if (!btn.classList.contains('table-action-button')) {
          btn.classList.add('table-action-button');
        }
        btn.classList.add('mock-avatar__upload-btn', 'mock-avatar__upload-btn--secondary');
        return this._nodeToHtml(btn) || fallback;
      } catch (err) {
        return fallback;
      }
    }

    _nodeToHtml(node) {
      if (!node) {
        return '';
      }
      if (node.outerHTML) {
        return node.outerHTML;
      }
      const wrap = document.createElement('div');
      wrap.appendChild(node);
      return wrap.innerHTML;
    }

    _renderFieldRow({ name, label, badgeHtml, controlHtml, helpHtml, attributes }) {
      const attrParts = [`class="announcement-management__form-field user-form__field"`, `data-field-name="${this._esc(name || '')}"`];
      const attrs = attributes || {};
      Object.keys(attrs).forEach((key) => {
        const value = attrs[key];
        if (value === null || typeof value === 'undefined' || value === false) {
          return;
        }
        if (value === true || value === '') {
          attrParts.push(key);
        } else {
          attrParts.push(`${key}="${this._esc(String(value))}"`);
        }
      });
      const help = helpHtml || '';
      return [
        `<div ${attrParts.join(' ')}>`,
        '  <div class="user-form__field-header">',
        `    <span class="user-management__field-label">${this._esc(label || '')}</span>`,
        `    ${badgeHtml || ''}`,
        '    <span class="user-form__change-indicator" aria-hidden="true">変更あり</span>',
        '  </div>',
        `  ${controlHtml}`,
        `  ${help}`,
        '</div>'
      ].join('');
    }

    _mountAvatarSetting(values) {
      const svc = this._getAvatarSettingService();
      if (!svc || !this.modalFields || typeof svc.mount !== 'function') {
        return;
      }
      const root = this.modalFields.querySelector(`#${this._avatarSettingId}`);
      if (!root) {
        return;
      }
      if (typeof svc.dispose === 'function') {
        svc.dispose(this._avatarSettingId);
      }
      const config = Object.assign({}, this.page && this.page.avatarSettingConfig ? this.page.avatarSettingConfig : {}, {
        placeholderText: this._resolveAvatarPlaceholder(values),
        emptyFilenameText: (this.page && this.page.avatarSettingConfig && this.page.avatarSettingConfig.emptyFilenameText) || '選択されていません',
        onChange: () => { this._handleAvatarChange(); },
        onError: (message) => { this._handleAvatarError(message); }
      });
      svc.mount(this._avatarSettingId, config);
      if (typeof svc.setAvatar === 'function') {
        svc.setAvatar(this._avatarSettingId, values && values.avatar ? values.avatar : null);
      }
      this._initialAvatarState = this._snapshotAvatarState();
    }

    _handleAvatarChange() {
      const svc = this._getAvatarSettingService();
      if (svc && typeof svc.setError === 'function') {
        svc.setError(this._avatarSettingId, false);
      }
      this._setFormError('');
      this._refreshDirtyStates();
    }

    _handleAvatarError(message) {
      const svc = this._getAvatarSettingService();
      if (svc && typeof svc.setError === 'function') {
        svc.setError(this._avatarSettingId, true);
      }
      const msg = message || '画像の選択に失敗しました。';
      this._setFormError(msg);
      if (this.page && typeof this.page._toastError === 'function') {
        this.page._toastError(msg);
      }
    }

    _getAvatarSettingService() {
      return this.page ? this.page.avatarSettingService : null;
    }

    _getAvatarPayload() {
      const svc = this._getAvatarSettingService();
      if (!svc || typeof svc.getPayload !== 'function') {
        return null;
      }
      return svc.getPayload(this._avatarSettingId);
    }

    _appendAvatarPayload(payload) {
      const avatarPayload = this._getAvatarPayload();
      if (!avatarPayload) {
        return;
      }
      if (avatarPayload.file) {
        payload.imageFile = avatarPayload.file;
      }
      if (avatarPayload.removeAvatar) {
        payload.removeAvatar = '1';
      }
    }

    _hasAvatarChange() {
      const avatarPayload = this._getAvatarPayload();
      return !!(avatarPayload && (avatarPayload.file || avatarPayload.removeAvatar));
    }

    _snapshotAvatarState() {
      const svc = this._getAvatarSettingService();
      if (!svc || typeof svc.getState !== 'function') {
        return null;
      }
      const state = svc.getState(this._avatarSettingId);
      if (!state) {
        return null;
      }
      return {
        pendingFile: !!state.pendingFile,
        removeRequested: !!state.removeRequested,
        currentUrl: state.currentAvatar && state.currentAvatar.url ? state.currentAvatar.url : ''
      };
    }

    _isAvatarDirty() {
      const state = this._snapshotAvatarState();
      if (!state) {
        return false;
      }
      if (state.pendingFile || state.removeRequested) {
        return true;
      }
      return false;
    }

    _disposeAvatarSetting() {
      const svc = this._getAvatarSettingService();
      if (svc && typeof svc.dispose === 'function') {
        svc.dispose(this._avatarSettingId);
      }
      this._initialAvatarState = null;
    }

    _setupChangeTracking(values) {
      if (!this.modalForm) {
        return;
      }
      this._teardownChangeTracking();
      this._initialValues = Object.assign({}, values || {});
      this._initialAvatarState = this._snapshotAvatarState();
      this._boundChangeHandler = () => {
        this._refreshDirtyStates();
        this._updateRequiredHighlight();
      };
      this.modalForm.addEventListener('input', this._boundChangeHandler);
      this.modalForm.addEventListener('change', this._boundChangeHandler);
      this._refreshDirtyStates();
    }

    _teardownChangeTracking() {
      if (this.modalForm && this._boundChangeHandler) {
        this.modalForm.removeEventListener('input', this._boundChangeHandler);
        this.modalForm.removeEventListener('change', this._boundChangeHandler);
      }
      this._initialValues = null;
      this._initialAvatarState = null;
      this._boundChangeHandler = null;
    }

    _clearDirtyIndicators() {
      if (!this.modalForm) {
        return;
      }
      const rows = this.modalForm.querySelectorAll('[data-field-name]');
      rows.forEach((row) => {
        row.classList.remove('user-form__field--dirty');
      });
    }

    _refreshDirtyStates() {
      if (!this.modalForm || !this._initialValues) {
        return;
      }
      const $form = $(this.modalForm);
      if (!$form.length) {
        return;
      }
      const currentValues = this._readForm($form);
      const rows = this.modalForm.querySelectorAll('[data-field-name]');
      rows.forEach((row) => {
        const fieldName = row.getAttribute('data-field-name');
        if (!fieldName) {
          return;
        }
        const dirty = this._isFieldDirty(fieldName, currentValues);
        row.classList.toggle('user-form__field--dirty', dirty);
      });
    }

    _isFieldDirty(fieldName, currentValues) {
      if (fieldName === 'initialPassword') {
        return this._hasInitialPasswordChanged(currentValues.initialPassword);
      }
      if (fieldName === 'avatar') {
        return this._isAvatarDirty();
      }
      const initial = this._normalizeFieldValue(this._initialValues[fieldName]);
      const current = this._normalizeFieldValue(currentValues[fieldName]);
      return initial !== current;
    }

    _normalizeFieldValue(value) {
      if (typeof value === 'boolean') {
        return value ? '1' : '0';
      }
      if (value === undefined || value === null) {
        return '';
      }
      if (typeof value === 'number') {
        return value.toString();
      }
      return value.toString();
    }

    _normalizeRoleFlag(value) {
      return value === true || value === 1 || value === '1' || value === 'true';
    }

    _getInitialRoleFlag(name) {
      const initial = this._initialValues || {};
      if (typeof initial[name] !== 'undefined') {
        return this._normalizeRoleFlag(initial[name]);
      }
      return false;
    }

    _hasInitialPasswordChanged(currentValue) {
      const initial = this._normalizeFieldValue(this._initialValues && this._initialValues.initialPassword);
      const current = this._normalizeFieldValue(currentValue);
      return initial !== current;
    }

    _buildUpdatePayload(values) {
      if (!values || !values.id) {
        return null;
      }
      const changedFields = this._getChangedFields(values);
      if (!changedFields.length) {
        return null;
      }
      const payload = { id: values.id };
      changedFields.forEach((field) => {
        if (field === 'initialPassword') {
          payload.initialPassword = values.initialPassword;
        } else if (field === 'isSupervisor' || field === 'isOperator') {
          payload[field] = values[field] ? '1' : '0';
        } else if (field !== 'avatar') {
          payload[field] = values[field];
        }
      });
      if (this._hasAvatarChange()) {
        this._appendAvatarPayload(payload);
      }
      return payload;
    }

    _getChangedFields(values) {
      const tracked = ['displayName', 'userCode', 'mail', 'organization', 'role', 'initialPassword'];
      if (this._showRoleFlags) {
        tracked.push('isSupervisor', 'isOperator');
      }
      const changed = [];
      const initial = this._initialValues || {};
      tracked.forEach((field) => {
        if (field === 'initialPassword') {
          if (this._hasInitialPasswordChanged(values.initialPassword)) {
            changed.push(field);
          }
          return;
        }
        const initialValue = this._normalizeFieldValue(initial[field]);
        const currentValue = this._normalizeFieldValue(values[field]);
        if (initialValue !== currentValue) {
          changed.push(field);
        }
      });
      if (this._hasAvatarChange()) {
        changed.push('avatar');
      }
      return changed;
    }

    _ensureModal() {
      if (this.modal && document.body.contains(this.modal)) {
        return this.modal;
      }
      const sel = this.page.selectorConfig;
      let host = document.querySelector(sel.formHost);
      if (!host) {
        host = document.body;
      }
      this.modalHost = host;

      const wrapper = document.createElement('div');
      wrapper.innerHTML = `
        <div class="screen-modal" data-admin-users-modal aria-hidden="true">
          <div class="screen-modal__overlay" data-modal-close aria-label="モーダルを閉じる"></div>
          <section class="screen-modal__content" role="dialog" aria-modal="true" aria-labelledby="admin-users-form-title" aria-describedby="admin-users-form-summary">
            <button type="button" class="screen-modal__close" data-modal-close data-modal-initial-focus aria-label="モーダルを閉じる">×</button>
            <div class="screen-modal__body admin-users__modal-body">
              <section class="announcement-management__form admin-users__form" data-admin-users-form-wrapper aria-live="polite">
                <h2 class="announcement-management__form-title" id="admin-users-form-title" data-admin-users-form-title></h2>
                <p class="screen-modal__summary is-hidden" id="admin-users-form-summary" data-admin-users-form-summary></p>
                <form class="announcement-management__form-body user-form" data-admin-users-form novalidate>
                  <div class="user-form__fields" data-admin-users-form-fields></div>
                  <div class="user-form__feedback c-feedback-region hidden" data-admin-users-form-error hidden></div>
                  <div class="announcement-management__form-actions user-form__actions">
                    <button type="submit" class="btn btn--primary user-form__submit" data-action="admin-users-form-submit"></button>
                    <button type="button" class="btn btn--ghost" data-action="admin-users-form-cancel" data-modal-close>${this.page.textConfig.formCancel || 'キャンセル'}</button>
                  </div>
                </form>
              </section>
            </div>
          </section>
        </div>
      `;
      const modal = wrapper.firstElementChild;
      host.appendChild(modal);

      this.modal = modal;
      this.modalForm = modal.querySelector('[data-admin-users-form]');
      this.modalFields = modal.querySelector('[data-admin-users-form-fields]');
      this.modalError = modal.querySelector('[data-admin-users-form-error]');
      this.modalTitle = modal.querySelector('[data-admin-users-form-title]');
      this.modalSummary = modal.querySelector('[data-admin-users-form-summary]');
      this.modalSubmit = modal.querySelector('[data-action="admin-users-form-submit"]');

      modal.addEventListener('click', async (ev) => {
        const target = ev.target instanceof Element ? ev.target.closest('[data-modal-close]') : null;
        if (target) {
          ev.preventDefault();
          await this.cancelForm();
        }
      });
      modal.addEventListener('keydown', async (ev) => {
        if (ev.key === 'Escape' && modal.classList.contains('is-open')) {
          ev.preventDefault();
          await this.cancelForm();
        }
      });

      return modal;
    }

    _openModal() {
      if (!this.modal) {
        return;
      }
      if (this.modalHost && this.modalHost !== document.body) {
        this.modalHost.classList.remove('hidden');
        this.modalHost.removeAttribute('hidden');
      }
      this.modal.classList.add('is-open');
      this.modal.setAttribute('aria-hidden', 'false');
      this.modal.setAttribute('data-modal-open', 'true');
      if (document.body) {
        document.body.classList.add('is-modal-open');
      }
    }

    _closeModal() {
      if (!this.modal) {
        return;
      }
      this._disposeAvatarSetting();
      this.modal.classList.remove('is-open');
      this.modal.setAttribute('aria-hidden', 'true');
      this.modal.removeAttribute('data-modal-open');
      if (this.modalHost && this.modalHost !== document.body) {
        this.modalHost.classList.add('hidden');
        this.modalHost.setAttribute('hidden', 'hidden');
      }
      if (this.modalFields) {
        this.modalFields.innerHTML = '';
      }
      if (this.modalForm) {
        this.modalForm.removeAttribute('data-mode');
        this.modalForm.removeAttribute('data-user-id');
      }
      this._currentMode = null;
      if (this.modalSummary) {
        this.modalSummary.textContent = '';
        this.modalSummary.classList.add('is-hidden');
      }
      this._teardownChangeTracking();
      this._setFormError('');
      this._resetValidationState();
      if (document.body) {
        document.body.classList.remove('is-modal-open');
      }
      const focusTarget = this._lastFocus;
      this._lastFocus = null;
      if (focusTarget && typeof focusTarget.focus === 'function') {
        try { focusTarget.focus(); } catch (_) {}
      }
    }

    _focusFirstField() {
      if (!this.modalForm) {
        return;
      }
      const firstField = this.modalForm.querySelector('input:not([type="hidden"]) , textarea, select');
      const focusFn = () => {
        if (firstField && typeof firstField.focus === 'function') {
          firstField.focus();
          if (typeof firstField.select === 'function') {
            firstField.select();
          }
        }
      };
      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(focusFn);
      } else {
        setTimeout(focusFn, 0);
      }
    }

    async _ensureView()
    {
      await window.Utils.loadScriptsSync([{ src: '/js/page/admin-users/job-view.js' }]);
    }

    _closeAfterSubmit() {
      this._resetValidationState();
      this._closeModal();
    }

    _isFormDirty() {
      if (!this.modalForm || !this._initialValues) {
        return false;
      }
      const $form = $(this.modalForm);
      if (!$form.length) {
        return false;
      }
      const currentValues = this._readForm($form);
      const changedFields = this._getChangedFields(currentValues);
      return changedFields.length > 0;
    }
  }

  // export
  w.AdminUser = w.AdminUser || {};
  w.AdminUser.JobForm = JobForm;

})(window, window.jQuery);
