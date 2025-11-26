(function (w) {
  'use strict';

  class JobForm {
    constructor(page) {
      this.page = page || {};
      this.config = this.page.config || {};
      this.refs = this.page.refs || {};
      this.ui = this.page.ui || {};
      this.root = this.page.root || document;
      this.texts = (this.config && this.config.texts) || {};

      this._editId = null;
      this._actionController = null;
      this._creatorSelection = null;
      this._creatorRefs = null;
      this._participantSelections = [];
      this._participantRefs = null;
      this._selectableCache = {};
      this._imageRefs = null;
      this._imagePreviewUrl = '';
      this._existingImageUrl = '';
      this._initialSnapshot = null;
      this._displaySettingKeys = [
        'displayGuidance',
        'displayGoals',
        'displayAgreements',
        'displayAnnouncements',
        'displayResources',
        'displayChat',
        'displaySubmissions',
        'displayReviews',
        'displayBadges',
        'displaySurvey'
      ];
    }

    async submit(formEl) {
      if (formEl) {
        if (this.refs.form !== formEl) {
          this._creatorRefs = null;
        }
        this.refs.form = formEl;
      }
      return this.handleSubmit();
    }

    async handleSubmit() {
      if (!this.refs.form) return false;
      var payload = this.serialize(this.refs.form);
      this._applyRoleDefaults(payload);
      this._injectParticipantCodes(payload);
      var v = this.validate(payload);
      if (!v.valid) {
        this.showInlineErrors(v.errors);
        if (this.ui.toast && this.ui.toast.error) {
          this.ui.toast.error(v.message || '入力に不備があります');
        }
        return false;
      }

      try {
        this._beginAction();
        await this.save(payload);
        this.reset();
        if (this.ui.toast && this.ui.toast.success) {
          this.ui.toast.success(this.texts.saved || '保存しました');
        }
        return true;
      } catch (err) {
        if (this.ui.toast && this.ui.toast.error) {
          this.ui.toast.error(this.texts.saveError || '保存に失敗しました');
        }
        throw err;
      } finally {
        this._endAction();
      }
      return false;
    }

    async beginEdit(id) {
      this._editId = id;
      if (!this.refs.form) return;

      var row = this.refs.list && this.refs.list.querySelector
        ? this.refs.list.querySelector('[data-row-id="' + CSS.escape(id) + '"]')
        : null;
      var data = row ? this._datasetToObject(row) : null;
      var needsDetailFetch = this._shouldFetchDetail(data);

      if (needsDetailFetch) {
        var fetched = await this._fetchTargetDetail(id);
        if (fetched && fetched.target) fetched = fetched.target;
        data = Object.assign({}, data || {}, fetched || {});
      }

      this._fillForm(data || { id: id });
    }

    _shouldFetchDetail(data) {
      if (!data) {
        return true;
      }
      var hasCreator = this._pickFirstValue([
        data.createdByUserCode,
        data.createdByCode,
        data.creatorCode,
        data.creator && data.creator.code
      ]) !== '';
      var hasParticipants = false;
      if (Array.isArray(data.assignedUsers) && data.assignedUsers.length) {
        hasParticipants = true;
      }
      if (Array.isArray(data.assignedUserList) && data.assignedUserList.length) {
        hasParticipants = true;
      }
      if (data.assignedUserCode) {
        hasParticipants = true;
      }
      var displayKeys = this._getDisplaySettingKeys();
      var hasDisplaySettings = displayKeys.every(function (key) {
        return typeof data[key] !== 'undefined';
      });
      return (!hasCreator || !hasParticipants || !hasDisplaySettings);
    }

    async _fetchTargetDetail(id) {
      var data = null;
      if (this.page && typeof this.page.callApi === 'function') {
        try {
          data = await this.page.callApi('update', { targetCode: id }, { skipDisplayNormalization: true });
        } catch (_) {}
      } else {
        try {
          var url = this.config.endpoints.update(id);
          var res = await fetch(url, { method: 'GET', headers: this._headers() });
          if (res.ok) data = await res.json();
        } catch (e) {}
      }
      return data;
    }

    async remove(id) {
      if (!id) return;
      this._beginAction();
      try {
        if (this.page && typeof this.page.callApi === 'function') {
          await this.page.callApi('delete', { targetCode: id });
        } else {
          var res = await fetch(this.config.endpoints.destroy(id), {
            method: 'DELETE',
            headers: this._headers()
          });
          if (!res.ok) {
            var t = '';
            try { t = await res.text(); } catch(e){}
            throw new Error(t || ('DELETE failed (' + res.status + ')'));
          }
        }
        if (this.ui.toast && this.ui.toast.success) {
          this.ui.toast.success(this.texts.deleted || '削除しました');
        }
      } finally {
        this._endAction();
      }
    }

    serialize(formEl) {
      var form = formEl || this.refs.form;
      var fd = new FormData(form);
      var obj = {};
      fd.forEach(function(v, k){
        if (v instanceof File && !v.name) {
          return;
        }
        if (obj[k] !== undefined) {
          obj[k] = Array.isArray(obj[k]) ? obj[k].concat(v) : [obj[k], v];
        } else {
          obj[k] = v;
        }
      });
      if (this._editId && !obj.id) obj.id = this._editId;
      this._normalizeDisplaySettingsPayload(obj);
      return obj;
    }

    validate(payload) {
      var errors = {};
      if (!payload.title || String(payload.title).trim() === '') {
        errors.title = 'タイトルは必須です';
      }
      var roleFlags = this._getRoleFlags();
      if (roleFlags && roleFlags.isSupervisor && !this._getCreatorSelection()) {
        errors.createdByUserCode = '作成者を選択してください';
      }
      return {
        valid: Object.keys(errors).length === 0,
        errors: errors,
        message: Object.keys(errors).length ? '入力エラーがあります' : ''
      };
    }

    async save(payload) {
      var isUpdate = !!payload.id;
      var params = Object.assign({}, payload);
      var targetCode = params.targetCode || params.id || this._editId || null;
      if (targetCode) {
        params.targetCode = targetCode;
      }
      if (this.page && typeof this.page.callApi === 'function') {
        return await this.page.callApi(isUpdate ? 'update' : 'create', params);
      }
      var url = isUpdate ? this.config.endpoints.update(payload.id) : this.config.endpoints.create;
      var res = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: this._headers({ json: true }),
        body: JSON.stringify(payload),
        signal: this._actionController ? this._actionController.signal : undefined
      });
      if (!res.ok) {
        var t = '';
        try { t = await res.text(); } catch(e){}
        throw new Error(t || ('Save failed (' + res.status + ')'));
      }
      try { return await res.json(); } catch(_) { return {}; }
    }

    reset() {
      if (this.refs.form && this.refs.form.reset) this.refs.form.reset();
      this._editId = null;
      this._creatorSelection = null;
      this._setCreatorSelection(null);
      this._resetParticipantSelection();
      this._existingImageUrl = '';
      this._resetImageSelection();
      this._applyOperatorCreatorDefault();
      this._captureInitialSnapshot();
      if (this.refs.form) {
        var nodes = this.refs.form.querySelectorAll('[data-error-for]');
        for (var i=0; i<nodes.length; i++){
          nodes[i].textContent = '';
          nodes[i].hidden = true;
        }
      }
    }

    showInlineErrors(errors) {
      if (!this.refs.form) return;
      for (var name in errors) {
        if (!Object.prototype.hasOwnProperty.call(errors, name)) continue;
        var holder = this.refs.form.querySelector('[data-error-for="' + CSS.escape(name) + '"]');
        if (holder) {
          holder.textContent = errors[name];
          holder.hidden = false;
        }
      }
    }

    _fillForm(data) {
      if (!this.refs.form || !data) return;
      var normalizedData = this._injectDisplayFlags(data);
      var form = this.refs.form;
      for (var i=0; i<form.elements.length; i++) {
        var el = form.elements[i];
        if (!el || !el.getAttribute) continue;
        var name = el.getAttribute('name');
        if (!name) continue;
        var v = normalizedData[name];
        if (typeof v === 'undefined') continue;

        var tag = el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') {
          var type = el.type;
          if (type === 'checkbox') {
            if (Array.isArray(v)) {
              el.checked = v.indexOf(el.value) !== -1;
              if (!el.checked) {
                el.checked = this._normalizeCheckboxValue(v, el.defaultChecked);
              }
            } else {
              el.checked = this._normalizeCheckboxValue(v, el.defaultChecked);
            }
          } else if (type === 'radio') {
            el.checked = (el.value == v);
          } else if (type === 'file') {
            el.value = '';
          } else {
            el.value = v;
          }
        } else if (tag === 'SELECT') {
          el.value = v;
        }
      }
      if (normalizedData.targetCode || normalizedData.id) this._editId = normalizedData.targetCode || normalizedData.id;
      this._applyCreatorFromData(normalizedData);
      this._applyParticipantsFromData(normalizedData);
      this._applyImageFromData(normalizedData);
      this._applyOperatorCreatorDefault();
      this._captureInitialSnapshot();
    }

    _datasetToObject(rowEl) {
      var o = {};
      for (var k in rowEl.dataset) {
        if (!Object.prototype.hasOwnProperty.call(rowEl.dataset, k)) continue;
        var v = rowEl.dataset[k];
        if (k.indexOf('col') === 0) {
          var key = k.replace(/^col/, '');
          var decap = key.charAt(0).toLowerCase() + key.slice(1);
          o[decap] = v;
        }
      }
      if (rowEl.dataset.id) o.id = rowEl.dataset.id;
      if (!o.id && rowEl.getAttribute('data-row-id')) o.id = rowEl.getAttribute('data-row-id');
      return o;
    }

    _headers(opts) {
      var h = { 'X-Requested-With': 'XMLHttpRequest' };
      if (this.config.csrfToken) h['X-CSRF-Token'] = this.config.csrfToken;
      if (opts && opts.json) h['Content-Type'] = 'application/json';
      return h;
    }

    _beginAction() {
      this._endAction();
      try { this._actionController = new AbortController(); } catch(e){ this._actionController = null; }
      if (this.ui.overlay && this.ui.overlay.show) this.ui.overlay.show();
    }

    _endAction() {
      try { if (this._actionController) this._actionController.abort(); } catch(e){}
      this._actionController = null;
      if (this.ui.overlay && this.ui.overlay.hide) this.ui.overlay.hide();
    }

    async openCreatorSelector(triggerEl) {
      var flags = this._getRoleFlags();
      if (!flags || !flags.isSupervisor) {
        return;
      }
      var svc = this._getUserSelectService();
      if (!svc || typeof svc.open !== 'function') {
        this._notifyToast('error', '作成者選択モーダルを利用できません。');
        return;
      }
      var selectableCreators = await this._loadSelectableCreators();
      if (!Array.isArray(selectableCreators) || selectableCreators.length === 0) {
        this._notifyToast('error', '選択できる作成者が見つかりません。');
        return;
      }
      var current = this._getCreatorSelection();
      var selectedCodes = current && current.code ? [current.code] : [];
      var initialKeyword = current && (current.code || current.name) ? (current.code || current.name) : '';
      var nestedZIndex = this._getNestedModalZIndex();
      var self = this;
      try {
        var modalOptions = {
          multiple: false,
          selectedCodes: selectedCodes,
          availableUsers: selectableCreators,
          initialKeyword: initialKeyword,
          onSelect: function (user) {
            self._setCreatorSelection(self._normalizeSelectedUser(user));
          },
          onApply: function (users) {
            self._setCreatorSelection(self._normalizeSelectedUser(users));
          },
          onClose: function () {
            if (triggerEl && triggerEl.focus) {
              try { triggerEl.focus({ preventScroll: true }); }
              catch (_) { triggerEl.focus(); }
            }
          }
        };
        if (nestedZIndex !== null) {
          modalOptions.zIndex = nestedZIndex;
        }
        svc.open(modalOptions);
      } catch (err) {
        if (window.console && window.console.error) {
          window.console.error('[targets] failed to open creator selector', err);
        }
        this._notifyToast('error', '作成者を選択できませんでした');
      }
    }

    clearCreatorSelection() {
      this._setCreatorSelection(null);
    }

    _getUserSelectService() {
      if (this.page && this.page.userSelectModalService) {
        return this.page.userSelectModalService;
      }
      return null;
    }

    _notifyToast(type, message) {
      if (!this.ui || !this.ui.toast || typeof this.ui.toast[type] !== 'function') {
        return;
      }
      try {
        this.ui.toast[type](message);
      } catch (_) {}
    }

    _normalizeSelectedUser(users) {
      if (!users) return null;
      var entry = null;
      if (Array.isArray(users) && users.length) {
        entry = users[0];
      } else if (typeof users === 'object' && users) {
        entry = users;
      }
      if (!entry) return null;
      var code = entry.userCode || entry.code || '';
      if (!code) return null;
      return {
        code: code,
        name: entry.displayName || entry.name || '',
        userId: entry.userId || entry.id || null
      };
    }

    _applyCreatorFromData(data) {
      var selection = this._deriveCreatorSelection(data);
      this._setCreatorSelection(selection);
    }

    _deriveCreatorSelection(data) {
      if (!data || typeof data !== 'object') {
        return null;
      }
      var codeCandidates = [
        data.createdByUserCode,
        data.createdByCode,
        data.creatorCode,
        data.creator && data.creator.code
      ];
      var code = this._pickFirstValue(codeCandidates);
      if (!code) {
        return null;
      }
      var nameCandidates = [
        data.creatorDisplay,
        data.creatorName,
        data.createdByUserDisplayName,
        data.createdByDisplayName,
        data.createdByDisplay,
        data.creator && (data.creator.display || data.creator.name)
      ];
      var name = this._pickFirstValue(nameCandidates) || '';
      return { code: code, name: name };
    }

    _pickFirstValue(list) {
      if (!Array.isArray(list)) {
        return '';
      }
      for (var i = 0; i < list.length; i++) {
        var value = list[i];
        if (!value) continue;
        var text = String(value);
        if (text.trim() === '') continue;
        return text;
      }
      return '';
    }

    _getCreatorSelection() {
      if (this._creatorSelection) {
        return this._creatorSelection;
      }
      var refs = this._ensureCreatorRefs();
      if (!refs || !refs.input || !refs.input.value) {
        return null;
      }
      this._creatorSelection = {
        code: refs.input.value,
        name: refs.name ? refs.name.textContent : ''
      };
      return this._creatorSelection;
    }

    _setCreatorSelection(selection) {
      var refs = this._ensureCreatorRefs();
      var previousCode = this._creatorSelection ? this._creatorSelection.code : null;
      if (!refs) {
        this._creatorSelection = selection && selection.code
          ? { code: selection.code, name: selection.name || '', userId: selection.userId || null }
          : null;
        return;
      }
      var normalized = selection && selection.code
        ? { code: String(selection.code), name: selection.name || '', userId: selection.userId || null }
        : null;
      this._creatorSelection = normalized;
      if (refs.input) {
        refs.input.value = normalized ? normalized.code : '';
      }
      if (refs.name) {
        refs.name.textContent = normalized ? (normalized.name || normalized.code || '') : '';
      }
      if (refs.code) {
        refs.code.textContent = normalized ? normalized.code : '';
      }
      if (refs.summary) {
        refs.summary.hidden = !normalized;
      }
      if (refs.empty) {
        refs.empty.hidden = !!normalized;
      }
      if (refs.clear) {
        refs.clear.disabled = !normalized;
      }
      if (refs.select) {
        refs.select.disabled = refs.select.disabled || false;
      }
      if (previousCode !== (normalized ? normalized.code : null)) {
        this._resetParticipantSelection();
      }
    }

    _ensureCreatorRefs() {
      if (!this.refs || !this.refs.form) {
        return null;
      }
      if (!this._creatorRefs || this._creatorRefs.form !== this.refs.form) {
        this._creatorRefs = {
          form: this.refs.form,
          field: this.refs.form.querySelector('[data-target-creator-field]'),
          input: this.refs.form.querySelector('[data-target-creator-input]'),
          empty: this.refs.form.querySelector('[data-target-creator-empty]'),
          summary: this.refs.form.querySelector('[data-target-creator-summary]'),
          name: this.refs.form.querySelector('[data-target-creator-name]'),
          code: this.refs.form.querySelector('[data-target-creator-code]'),
          clear: this.refs.form.querySelector('[data-action="clear-target-creator"]'),
          select: this.refs.form.querySelector('[data-action="select-target-creator"]')
        };
      }
      return this._creatorRefs;
    }

    _applyRoleDefaults(payload) {
      this._applyOperatorCreatorDefault();
      if (payload && this._creatorSelection && this._creatorSelection.code) {
        payload.createdByUserCode = this._creatorSelection.code;
      }
    }

    _injectParticipantCodes(payload) {
      if (!payload || typeof payload !== 'object') {
        return;
      }
      payload.assignedUserCodes = this._getParticipantSelectionCodes();
    }

    _applyOperatorCreatorDefault() {
      var flags = this._getRoleFlags();
      var isOperatorOnly = !!(flags && flags.isOperator && !flags.isSupervisor);
      var sessionUser = this._getSessionUser();
      if (isOperatorOnly && sessionUser) {
        var selection = this._normalizeSelectedUser(sessionUser);
        if (selection) {
          this._setCreatorSelection(selection);
        }
      }
      this._setCreatorControlsDisabled(isOperatorOnly);
      this._updateCreatorFieldVisibility();
    }

    _setCreatorControlsDisabled(disabled) {
      var refs = this._ensureCreatorRefs();
      if (!refs) {
        return;
      }
      if (refs.select) {
        refs.select.disabled = !!disabled;
      }
      if (refs.clear) {
        refs.clear.disabled = !!disabled || !this._creatorSelection;
      }
    }

    _updateCreatorFieldVisibility(showField) {
      var refs = this._ensureCreatorRefs();
      if (!refs || !refs.field) {
        return;
      }
      var flags = this._getRoleFlags();
      var shouldShow = typeof showField === 'boolean' ? showField : !!(flags && flags.isSupervisor);
      refs.field.hidden = !shouldShow;
      refs.field.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
    }

    _getRoleFlags() {
      if (this.page && this.page.state && this.page.state.roleFlags) {
        return this.page.state.roleFlags;
      }
      return null;
    }

    _getSessionUser() {
      if (this.page && this.page.state && this.page.state.sessionUser) {
        return this.page.state.sessionUser;
      }
      return null;
    }

    _getCreatorSelection() {
      return this._creatorSelection;
    }

    async openParticipantSelector(triggerEl) {
      var flags = this._getRoleFlags();
      if (flags && flags.isSupervisor && !this._getCreatorSelection()) {
        this._notifyToast('error', '作成者を先に選択してください。');
        return;
      }
      var svc = this._getUserSelectService();
      if (!svc || typeof svc.open !== 'function') {
        this._notifyToast('error', '参加者選択モーダルを利用できません。');
        return;
      }
      var operatorUserId = await this._resolveOperatorUserIdForSelection();
      if (!operatorUserId) {
        this._notifyToast('error', '作成者を判別できないため参加者を選択できません。');
        return;
      }
      var selectableUsers = await this._loadSelectableUsers(operatorUserId);
      if (!Array.isArray(selectableUsers) || selectableUsers.length === 0) {
        this._notifyToast('error', '選択できる参加者が見つかりません。');
        return;
      }
      var selectedCodes = this._getParticipantSelectionCodes();
      var initialKeyword = selectedCodes.length ? selectedCodes[0] : '';
      var nestedZIndex = this._getNestedModalZIndex();
      var self = this;
      try {
        var options = {
          multiple: true,
          selectedCodes: selectedCodes,
          availableUsers: selectableUsers,
          initialKeyword: initialKeyword,
          text: {
            modalTitle: '参加者を選択',
            modalDescription: 'ターゲットの参加者を選択してください。',
            applyLabel: '参加者に設定'
          },
          onApply: function (users) {
            self._setParticipantSelection(self._normalizeSelectedUsers(users));
          },
          onClose: function () {
            if (triggerEl && triggerEl.focus) {
              try { triggerEl.focus({ preventScroll: true }); }
              catch (_) { triggerEl.focus(); }
            }
          }
        };
        if (nestedZIndex !== null) {
          options.zIndex = nestedZIndex;
        }
        svc.open(options);
      } catch (err) {
        if (window.console && window.console.error) {
          window.console.error('[targets] failed to open participant selector', err);
        }
        this._notifyToast('error', '参加者を選択できませんでした');
      }
    }

    clearParticipantSelection() {
      this._resetParticipantSelection();
    }

    _normalizeSelectedUsers(users) {
      if (!users) return [];
      var list = Array.isArray(users) ? users : [users];
      var normalized = [];
      for (var i = 0; i < list.length; i++) {
        var entry = list[i] || {};
        var code = entry.userCode || entry.code || '';
        if (!code) continue;
        var name = entry.displayName || entry.name || '';
        var userId = entry.userId || entry.id || null;
        if (normalized.some(function (it) { return it.code === code; })) {
          continue;
        }
        normalized.push({ code: code, name: name, userId: userId });
      }
      return normalized;
    }

    _getParticipantSelectionCodes() {
      var codes = [];
      var list = this._participantSelections || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].code) {
          codes.push(list[i].code);
        }
      }
      return codes;
    }

    _setParticipantSelection(list) {
      var refs = this._ensureParticipantRefs();
      this._participantSelections = Array.isArray(list) ? list : [];
      if (refs && refs.input) {
        refs.input.value = this._getParticipantSelectionCodes().join(',');
      }
      this._renderParticipantList();
    }

    _resetParticipantSelection() {
      this._participantSelections = [];
      var refs = this._ensureParticipantRefs();
      if (refs && refs.input) {
        refs.input.value = '';
      }
      this._renderParticipantList();
    }

    _renderParticipantList() {
      var refs = this._ensureParticipantRefs();
      if (!refs) {
        return;
      }
      var list = this._participantSelections || [];
      if (refs.list) {
        refs.list.innerHTML = '';
        for (var i = 0; i < list.length; i++) {
          var item = list[i];
          var li = document.createElement('li');
          li.className = 'targets__participants-chip';
          var nameSpan = document.createElement('span');
          nameSpan.textContent = item.name || item.code || 'ユーザー';
          var codeSpan = document.createElement('span');
          codeSpan.className = 'targets__participants-chip-code';
          codeSpan.textContent = item.code || '';
          li.appendChild(nameSpan);
          li.appendChild(codeSpan);
          refs.list.appendChild(li);
        }
      }
      if (refs.empty) {
        refs.empty.hidden = list.length > 0;
      }
      if (refs.actions) {
        refs.actions.classList[list.length > 0 ? 'add' : 'remove']('has-selection');
      }
      if (refs.clear) {
        refs.clear.disabled = list.length === 0;
      }
    }

    _ensureParticipantRefs() {
      if (!this.refs || !this.refs.form) {
        return null;
      }
      if (!this._participantRefs || this._participantRefs.form !== this.refs.form) {
        this._participantRefs = {
          form: this.refs.form,
          input: this.refs.form.querySelector('[data-target-participants-input]'),
          empty: this.refs.form.querySelector('[data-target-participants-empty]'),
          list: this.refs.form.querySelector('[data-target-participants-list]'),
          actions: this.refs.form.querySelector('[data-target-participants-actions]')
            || this.refs.form.querySelector('[data-target-participants-field] .targets__participants-actions'),
          clear: this.refs.form.querySelector('[data-action="clear-target-participants"]')
        };
      }
      return this._participantRefs;
    }

    _applyParticipantsFromData(data) {
      var entries = [];
      if (data && Array.isArray(data.assignedUsers)) {
        entries = data.assignedUsers;
      } else if (data && Array.isArray(data.assignedUserList)) {
        entries = data.assignedUserList;
      } else if (data && data.assignedUserCode) {
        entries = [{ userCode: data.assignedUserCode, displayName: data.assignedUserDisplayName || '' }];
      }
      var normalized = [];
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i] || {};
        var code = entry.userCode || entry.code || '';
        if (!code) continue;
        normalized.push({
          code: code,
          name: entry.displayName || entry.name || '',
          userId: entry.userId || entry.id || null
        });
      }
      this._setParticipantSelection(normalized);
    }

    async _resolveOperatorUserIdForSelection() {
      var flags = this._getRoleFlags();
      if (flags && flags.isOperator && !flags.isSupervisor) {
        return this._extractUserId(this._getSessionUser());
      }
      var creator = this._getCreatorSelection();
      if (creator && creator.userId != null) {
        return creator.userId;
      }
      if (creator && creator.code) {
        var resolvedId = await this._resolveUserIdByCode(creator.code);
        if (resolvedId) {
          creator.userId = resolvedId;
          this._creatorSelection = creator;
          return resolvedId;
        }
      }
      return null;
    }

    async _loadSelectableCreators() {
      var svc = this._getUserSelectService();
      if (!svc || !svc.jobs || !svc.jobs.data || typeof svc.jobs.data.getAllUsers !== 'function') {
        return [];
      }
      try {
        var users = await svc.jobs.data.getAllUsers();
        return users.filter(function (user) {
          return user && user.isOperator === true;
        });
      } catch (err) {
        if (window.console && window.console.error) {
          window.console.error('[targets] failed to load selectable creators', err);
        }
        this._notifyToast('error', '作成者リストの取得に失敗しました');
      }
      return [];
    }

    async _resolveUserIdByCode(code) {
      if (!code) {
        return null;
      }
      var svc = this._getUserSelectService();
      if (!svc || !svc.jobs || !svc.jobs.data || typeof svc.jobs.data.getAllUsers !== 'function') {
        return null;
      }
      try {
        var users = await svc.jobs.data.getAllUsers();
        for (var i = 0; i < users.length; i++) {
          if (users[i] && users[i].userCode === code) {
            return users[i].userId || users[i].id || null;
          }
        }
      } catch (_) {}
      return null;
    }

    async _loadSelectableUsers(operatorUserId) {
      if (!operatorUserId) {
        return [];
      }
      if (this._selectableCache && this._selectableCache[operatorUserId]) {
        return this._selectableCache[operatorUserId].slice();
      }
      try {
        var response = await window.Utils.requestApi('User', 'UserSelectableList', { operatorUserId: operatorUserId });
        var payload = response && response.result ? response.result : response;
        var list = payload && Array.isArray(payload.selectableUsers) ? payload.selectableUsers : [];
        this._selectableCache[operatorUserId] = list.slice();
        return list.slice();
      } catch (err) {
        if (window.console && window.console.error) {
          window.console.error('[targets] failed to load selectable users', err);
        }
        this._notifyToast('error', '参加者リストの取得に失敗しました');
      }
      return [];
    }

    _extractUserId(user) {
      if (!user || typeof user !== 'object') {
        return null;
      }
      if (user.userId != null) {
        return user.userId;
      }
      if (user.id != null) {
        return user.id;
      }
      return null;
    }

    updateImageSelectionFromInput(inputEl) {
      var refs = this._ensureImageRefs();
      if (!refs) {
        return;
      }
      var file = inputEl && inputEl.files ? inputEl.files[0] : null;
      if (!file && refs.input && refs.input.files) {
        file = refs.input.files[0];
      }
      if (!file || !file.name) {
        this._revokeImagePreviewUrl();
        this._renderImageSelection(this._existingImageUrl, this._formatImageLabel(this._existingImageUrl));
        return;
      }
      this._revokeImagePreviewUrl();
      var objectUrl = this._createObjectUrl(file);
      if (objectUrl) {
        this._imagePreviewUrl = objectUrl;
        this._renderImageSelection(this._imagePreviewUrl, file.name || '選択された画像');
        return;
      }
      this._renderImageSelection('', file.name || '選択された画像');
      this._loadPreviewWithFileReader(file, file.name || '選択された画像');
    }

    _createObjectUrl(file) {
      try {
        if (window.URL && typeof window.URL.createObjectURL === 'function') {
          return window.URL.createObjectURL(file);
        }
      } catch (_) {}
      return '';
    }

    _loadPreviewWithFileReader(file, label) {
      if (!file || typeof FileReader === 'undefined') {
        return;
      }
      try {
        var self = this;
        var reader = new FileReader();
        reader.onload = function () {
          self._imagePreviewUrl = reader.result || '';
          if (self._imagePreviewUrl) {
            self._renderImageSelection(self._imagePreviewUrl, label || '選択された画像');
          }
        };
        reader.onerror = function () {
          self._renderImageSelection(self._existingImageUrl, self._formatImageLabel(self._existingImageUrl));
        };
        reader.readAsDataURL(file);
      } catch (_) {}
    }

    clearImageSelection() {
      var refs = this._ensureImageRefs();
      if (refs && refs.input) {
        refs.input.value = '';
      }
      this._revokeImagePreviewUrl();
      this._renderImageSelection(this._existingImageUrl, this._formatImageLabel(this._existingImageUrl));
    }

    _resetImageSelection() {
      this._revokeImagePreviewUrl();
      this._renderImageSelection('', '画像が選択されていません。');
    }

    _captureInitialSnapshot() {
      this._initialSnapshot = this._getFormSnapshot();
    }

    _getFormSnapshot() {
      if (!this.refs || !this.refs.form) {
        return null;
      }
      var payload = this.serialize(this.refs.form);
      var snapshot = {};
      for (var key in payload) {
        if (!Object.prototype.hasOwnProperty.call(payload, key)) continue;
        snapshot[key] = this._normalizeSnapshotValue(payload[key]);
      }
      snapshot._creator = this._creatorSelection && this._creatorSelection.code
        ? String(this._creatorSelection.code)
        : '';
      snapshot._participants = (this._participantSelections || [])
        .map(function (item) { return item && item.code ? String(item.code) : ''; })
        .filter(function (code) { return code !== ''; })
        .sort();
      snapshot._imageExisting = this._existingImageUrl || '';
      snapshot._imagePreview = this._imagePreviewUrl || '';
      return snapshot;
    }

    _normalizeSnapshotValue(value) {
      if (value == null) {
        return '';
      }
      if (value instanceof File) {
        return value.name || '';
      }
      if (Array.isArray(value)) {
        return value.map(this._normalizeSnapshotValue.bind(this));
      }
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return String(value);
    }

    _areSnapshotsEqual(prev, next) {
      if (!prev || !next) {
        return true;
      }
      var checked = {};
      for (var key in prev) {
        if (!Object.prototype.hasOwnProperty.call(prev, key)) continue;
        checked[key] = true;
        if (!this._isSnapshotValueEqual(prev[key], next[key])) {
          return false;
        }
      }
      for (var key2 in next) {
        if (!Object.prototype.hasOwnProperty.call(next, key2)) continue;
        if (checked[key2]) continue;
        if (!this._isSnapshotValueEqual(prev[key2], next[key2])) {
          return false;
        }
      }
      return true;
    }

    _isSnapshotValueEqual(a, b) {
      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (var i = 0; i < a.length; i++) {
          if (!this._isSnapshotValueEqual(a[i], b[i])) return false;
        }
        return true;
      }
      return String(a || '') === String(b || '');
    }

    isDirty() {
      if (!this.refs || !this.refs.form) {
        return false;
      }
      if (!this._initialSnapshot) {
        return false;
      }
      var current = this._getFormSnapshot();
      return !this._areSnapshotsEqual(this._initialSnapshot, current);
    }

    _ensureImageRefs() {
      if (!this.refs || !this.refs.form) {
        return null;
      }
      if (!this._imageRefs || this._imageRefs.form !== this.refs.form) {
        this._imageRefs = {
          form: this.refs.form,
          input: this.refs.form.querySelector('[data-target-image-input]'),
          filename: this.refs.form.querySelector('[data-target-image-filename]'),
          preview: this.refs.form.querySelector('[data-target-image-preview]'),
          previewWrap: this.refs.form.querySelector('[data-target-image-preview-wrap]'),
          clear: this.refs.form.querySelector('[data-action="clear-target-image"]')
        };
      }
      return this._imageRefs;
    }

    _getDisplaySettingKeys() {
      if (!Array.isArray(this._displaySettingKeys)) {
        this._displaySettingKeys = [];
      }
      return this._displaySettingKeys;
    }

    _injectDisplayFlags(data) {
      var normalized = data || {};
      var source = (data && data.displayFlags) ? data.displayFlags : data;
      var keys = this._getDisplaySettingKeys();
      var self = this;
      keys.forEach(function (key) {
        if (source && Object.prototype.hasOwnProperty.call(source, key)) {
          normalized[key] = self._normalizeCheckboxValue(source[key], normalized[key]);
        }
      });
      return normalized;
    }

    _normalizeDisplaySettingsPayload(payload) {
      var keys = this._getDisplaySettingKeys();
      var self = this;
      keys.forEach(function (key) {
        var value = Object.prototype.hasOwnProperty.call(payload, key) ? payload[key] : undefined;
        var normalized = self._normalizeCheckboxValue(value, false);
        payload[key] = normalized ? '1' : '0';
      });
    }

    _normalizeCheckboxValue(value, defaultValue) {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return !!defaultValue;
        }
        return this._normalizeCheckboxValue(value[value.length - 1], defaultValue);
      }
      if (typeof value === 'boolean') {
        return value;
      }
      if (typeof value === 'number') {
        return value !== 0;
      }
      if (value === null || typeof value === 'undefined') {
        return !!defaultValue;
      }
      var str = String(value).trim().toLowerCase();
      if (str === '') {
        return !!defaultValue;
      }
      if (str === '1' || str === 'true' || str === 'yes' || str === 'on') {
        return true;
      }
      if (str === '0' || str === 'false' || str === 'no' || str === 'off') {
        return false;
      }
      if (!Number.isNaN(Number(str))) {
        return Number(str) !== 0;
      }
      return !!value;
    }

    _applyImageFromData(data) {
      var url = this._resolveImageUrl(data);
      this._existingImageUrl = url;
      this._revokeImagePreviewUrl();
      var label = this._formatImageLabel(url) || '登録済みの画像を利用中';
      this._renderImageSelection(url, url ? label : '画像が選択されていません。');
    }

    _resolveImageUrl(data) {
      if (!data || typeof data !== 'object') {
        return '';
      }
      var candidates = [
        data.imageUrl,
        data.imageURL,
        data.image,
        data.thumbnailUrl,
        data.thumbnailURL,
        data.coverImage,
        data.coverImageUrl,
        data.coverImageURL
      ];
      for (var i = 0; i < candidates.length; i++) {
        var val = candidates[i];
        if (!val) continue;
        var text = String(val).trim();
        if (text) return text;
      }
      return '';
    }

    _formatImageLabel(src) {
      if (!src) {
        return '';
      }
      try {
        var parts = src.split('/');
        var last = parts[parts.length - 1];
        if (last) {
          var clean = last.split('?')[0].split('#')[0];
          if (clean) return clean;
        }
      } catch (_) {}
      return '画像が選択されています';
    }

    _renderImageSelection(previewUrl, label) {
      var refs = this._ensureImageRefs();
      if (!refs) {
        return;
      }
      var hasPreview = !!(previewUrl && String(previewUrl).trim());
      if (refs.preview) {
        refs.preview.src = hasPreview ? previewUrl : '';
        refs.preview.hidden = !hasPreview;
      }
      if (refs.previewWrap) {
        refs.previewWrap.hidden = !hasPreview;
      }
      if (refs.filename) {
        refs.filename.textContent = label || (hasPreview ? '画像が選択されています' : '画像が選択されていません。');
      }
      if (refs.clear) {
        refs.clear.disabled = !hasPreview && !this._existingImageUrl;
      }
    }

    _revokeImagePreviewUrl() {
      if (this._imagePreviewUrl && window.URL && typeof window.URL.revokeObjectURL === 'function') {
        try { window.URL.revokeObjectURL(this._imagePreviewUrl); } catch (_) {}
      }
      this._imagePreviewUrl = '';
    }

    _getNestedModalZIndex() {
      var modal = (this.page && this.page.refs) ? this.page.refs.formModal : null;
      if (!modal) {
        return null;
      }
      var styleZ = modal.style && modal.style.zIndex ? Number(modal.style.zIndex) : null;
      if ((typeof styleZ !== 'number' || styleZ !== styleZ) && window.getComputedStyle) {
        try {
          var cs = window.getComputedStyle(modal);
          if (cs && cs.zIndex) {
            styleZ = Number(cs.zIndex);
          }
        } catch (_) {
          styleZ = null;
        }
      }
      if (typeof styleZ !== 'number' || styleZ !== styleZ) {
        return null;
      }
      return styleZ + 10;
    }
  }

  w.Targets = w.Targets || {};
  w.Targets.JobForm = JobForm;
})(window);
