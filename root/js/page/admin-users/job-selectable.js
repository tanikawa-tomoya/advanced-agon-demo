(function (w, $) {
  'use strict';

  class JobSelectable {
    constructor(page) {
      this.page = page;
    }

    async openSelector(operatorId, triggerEl) {
      const id = operatorId ? String(operatorId) : '';
      const user = this.page && this.page.usersById ? this.page.usersById[id] : null;
      if (!user) {
        this._toastError('対象のユーザーが見つかりませんでした。');
        return;
      }

      const svc = this.page && this.page.userSelectModalService;
      if (!svc || typeof svc.open !== 'function') {
        this._toastError('ユーザー選択モーダルを起動できません。');
        return;
      }

      const selectedCodes = this._extractSelectedCodes(user);
      const initialKeyword = selectedCodes[0] || user.userCode || '';
      const trigger = triggerEl || null;
      let availableUsers = null;

      if (this._shouldLimitSelectable()) {
        availableUsers = await this._loadAvailableUsers(operatorId);
      }

      try {
        svc.open({
          multiple: true,
          selectedCodes,
          initialKeyword,
          availableUsers,
          onApply: async (users) => {
            await this._saveSelection(id, users);
          },
          onClose: () => {
            if (trigger && typeof trigger.focus === 'function') {
              trigger.focus();
            }
          }
        });
      } catch (err) {
        if (w.console && typeof w.console.error === 'function') {
          w.console.error('[AdminUsers.JobSelectable] failed to open modal', err);
        }
        this._toastError('ユーザー選択モーダルの起動に失敗しました。');
      }
    }

    _extractSelectedCodes(user) {
      if (!user || !Array.isArray(user.selectableUsers)) {
        return [];
      }
      const codes = [];
      for (let i = 0; i < user.selectableUsers.length; i += 1) {
        const entry = user.selectableUsers[i];
        const code = this._trim(entry && (entry.userCode || entry.code));
        if (code) {
          codes.push(code);
        }
      }
      return Array.from(new Set(codes));
    }

    _normalizeCodes(users) {
      if (!Array.isArray(users)) {
        return [];
      }
      const codes = [];
      for (let i = 0; i < users.length; i += 1) {
        const entry = users[i] || {};
        const code = this._trim(entry.userCode || entry.code || entry.id);
        if (code) {
          codes.push(code);
        }
      }
      return Array.from(new Set(codes));
    }

    _shouldLimitSelectable() {
      if (!this.page) {
        return false;
      }
      const isOperator = typeof this.page.isOperatorUser === 'function' && this.page.isOperatorUser();
      const isSupervisor = typeof this.page.isSupervisorUser === 'function' && this.page.isSupervisorUser();
      return isOperator && !isSupervisor;
    }

    async _loadAvailableUsers(operatorId) {
      const id = operatorId || (this.page && typeof this.page.getSessionUserId === 'function' ? this.page.getSessionUserId() : '');
      if (!id || !this.page || typeof this.page.apiPost !== 'function') {
        return null;
      }
      try {
        const payload = await this.page.apiPost('selectableList', { operatorUserId: id });
        if (payload && Array.isArray(payload.selectableUsers)) {
          return payload.selectableUsers;
        }
        if (payload && Array.isArray(payload.users)) {
          return payload.users;
        }
        if (payload && Array.isArray(payload.list)) {
          return payload.list;
        }
        if (Array.isArray(payload)) {
          return payload;
        }
      } catch (err) {
        if (w.console && typeof w.console.error === 'function') {
          w.console.error('[AdminUsers.JobSelectable] failed to load selectable users', err);
        }
        this._toastError('選択可能ユーザーの取得に失敗しました。');
      }
      return null;
    }

    async _saveSelection(operatorId, users) {
      const codes = this._normalizeCodes(users);
      try {
        if (this.page && this.page.loader && typeof this.page.loader.show === 'function') {
          this.page.loader.show();
        }
      } catch (_) {}

      try {
        const payload = await this.page.apiPost('selectableSave', {
          operatorUserId: operatorId,
          userCodes: codes
        });
        this._applySelectablePayload(operatorId, payload);
        await this._refreshView();
        this._toastSuccess('選択可能ユーザーを保存しました。');
      } catch (err) {
        const msg = err && err.message ? err.message : '選択可能ユーザーの保存に失敗しました。';
        this._toastError(msg);
      } finally {
        try {
          if (this.page && this.page.loader && typeof this.page.loader.hide === 'function') {
            this.page.loader.hide();
          }
        } catch (_) {}
      }
    }

    _applySelectablePayload(operatorId, payload) {
      if (!payload || typeof payload !== 'object') {
        return;
      }
      const list = Array.isArray(payload.selectableUsers) ? payload.selectableUsers : [];
      const id = operatorId ? String(operatorId) : '';
      if (id && this.page && this.page.usersById && this.page.usersById[id]) {
        this.page.usersById[id].selectableUsers = list;
      }
      if (Array.isArray(this.page.users)) {
        for (let i = 0; i < this.page.users.length; i += 1) {
          if (String(this.page.users[i].id) === id) {
            this.page.users[i].selectableUsers = list;
            break;
          }
        }
      }
    }

    async _refreshView() {
      await this.page._ensureJob('view');
      if (w.AdminUser && w.AdminUser.JobView) {
        await new window.AdminUser.JobView(this.page).loadUsers();
      }
    }

    _trim(value) {
      if (value === null || value === undefined) {
        return '';
      }
      return String(value).trim();
    }

    _toastError(msg) {
      try {
        if (this.page && typeof this.page._toastError === 'function') {
          this.page._toastError(msg);
        }
      } catch (_) {}
    }

    _toastSuccess(msg) {
      try {
        if (this.page && typeof this.page._toastSuccess === 'function') {
          this.page._toastSuccess(msg);
        }
      } catch (_) {}
    }
  }

  w.AdminUser = w.AdminUser || {};
  w.AdminUser.JobSelectable = JobSelectable;
})(window, window.jQuery);
