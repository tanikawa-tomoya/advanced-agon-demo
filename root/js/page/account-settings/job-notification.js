(function (window, document) {
  'use strict';

  class JobNotification
  {
    constructor(pageInstance)
    {
      this.pageInstance = pageInstance;
      this.root = pageInstance.root;
      this.config = pageInstance.config || {};
      this.selectors = this.config.selectors || {};
    }

    run()
    {
      this.panel = this.root.querySelector(this.selectors.notificationPanel || '[data-tab-panel="notifications"]');
      if (!this.panel) {
        return;
      }
      this._bindNotificationInputs();
      this._bindSaveButton();
    }

    _bindNotificationInputs()
    {
      var self = this;
      var inputs = this.panel.querySelectorAll('[data-setting]');
      Array.prototype.forEach.call(inputs, function (input) {
        // Ensure input has a name attribute for form submission
        if (!input.getAttribute('name')) {
          var setting = input.getAttribute('data-setting');
          if (setting) {
            input.setAttribute('name', setting);
          }
        }
        input.addEventListener('change', function () {
          self.pageInstance.setNotificationChanged(true);  // mark form data as changed
        });
      });
    }

    _bindSaveButton()
    {
      var selector = this.selectors.notificationSaveButton || '#account-settings-notifications-save';
      var button = this.root.querySelector(selector);
      if (!button) {
        return;
      }
      var self = this;
      var $ = window.jQuery || window.$;
      if ($ && typeof $ === 'function') {
        $(button).off('click.accountSettingsNotification').on('click.accountSettingsNotification', function (event) {
          event.preventDefault();
          self.handleSave();
        });
        return;
      }
      button.addEventListener('click', function (event) {
        event.preventDefault();
        self.handleSave();
      });
    }

    async handleSave()
    {
      if (!this.panel) {
        return;
      }
      try {
        this.pageInstance.toggleOverlay(true);
        var result = await this.save();
        if (!result || !result.ok) {
          this.pageInstance.showToast((result && result.message) || '通知設定の保存に失敗しました。', 'warning');
          return;
        }
        this.pageInstance.setNotificationChanged(false);
        this.pageInstance.updateUnsavedChangesState(true);
        this.pageInstance.showToast('通知設定を保存しました。', 'success');
      }
      catch (err) {
        console.error(err);
        this.pageInstance.showToast('通知設定の保存に失敗しました。', 'error');
      }
      finally {
        this.pageInstance.toggleOverlay(false);
      }
    }

    async save()
    {
      var formData = this._collectPanelData();
      if (!formData) {
        return { ok: false, message: '通知設定が見つかりません。' };
      }

      var userId = await this.pageInstance.getUserId();
      if (!this._isValidUserId(userId)) {
        return { ok: false, message: 'ユーザー情報を取得できませんでした。' };
      }
      formData.append('id', userId);

      if (!(window.Utils && typeof window.Utils.requestApi === 'function')) {
        return { ok: false, message: '保存機能が利用できません。' };
      }

      var api = this.config.api || {};
      var requestType = api.notificationRequestType || api.requestType || 'User';
      var saveType = api.notificationSaveType || api.saveType || 'UserUpdate';
      var endpoint = api.notificationEndpoint || api.endpoint;
      var overrides = endpoint ? { url: endpoint } : null;

      var response;
      try {
        response = await window.Utils.requestApi(requestType, saveType, formData, overrides);
      }
      catch (err) {
        console.error(err);
        return { ok: false, message: '通知設定の保存に失敗しました。' };
      }

      if (!response) {
        return { ok: false, message: '通知設定の保存に失敗しました。' };
      }
      if (response.errors) {
        return { ok: false, message: response.errors._global || '通知設定の保存に失敗しました。' };
      }
      var status = typeof response.status === 'string' ? response.status.toUpperCase() : '';
      if (status && status !== 'OK' && status !== 'SUCCESS') {
        return { ok: false, message: response.message || response.reason || '通知設定の保存に失敗しました。' };
      }
      return { ok: true };
    }

    _collectPanelData()
    {
      var controls = this.panel.querySelectorAll('input[name], select[name], textarea[name]');
      if (!controls.length) {
        return null;
      }
      var data = new FormData();
      Array.prototype.forEach.call(controls, function (control) {
        var name = control.getAttribute('name');
        if (!name) {
          return;
        }
        if (control.tagName === 'SELECT' && control.multiple) {
          Array.prototype.forEach.call(control.options, function (option) {
            if (option.selected) {
              data.append(name, option.value);
            }
          });
          return;
        }
        if (control.type === 'checkbox' || control.type === 'radio') {
          if (!control.checked) {
            return;
          }
          data.append(name, control.value);
          return;
        }
        data.append(name, control.value);
      });
      return data;
    }

    _isValidUserId(value)
    {
      if (value === undefined || value === null) {
        return false;
      }
      return String(value).trim() !== '';
    }
  }

  window.AccountSettings = window.AccountSettings || {};
  window.AccountSettings.JobNotification = JobNotification;
})(window, document);
