(function (window, document) {
  'use strict';

  class JobProfile
  {
    constructor(pageInstance)
    {
      this.pageInstance = pageInstance;
      this.root = pageInstance.root;
      this.config = pageInstance.config || {};
      this.selectors = this.config.selectors || {};
      this.buttonService = pageInstance.services && pageInstance.services.button;
      this._buttonsDecorated = false;
    }

    async run()
    {
      this.form = this.root.querySelector(this.selectors.form);
      if (!this.form) {
        return;
      }

      this._decorateButtons();
      this._captureMailElements();
      this._bindFormEvents();
      this._bindSaveButton();
      // (Initial unsaved-changes state will be handled by main.js)
    }

    applyProfileData(profile)
    {
      if (!this.form || !profile)
      {
        return;
      }
      var displayName = this._resolveDisplayName(profile);
      var mail = this._resolveMail(profile);
      var role = this._resolveRole(profile);
      this._setInputValue('displayName', displayName);
      this._setInputValue('role', role);
      this._setInputValue('mail', mail);
      this._updateMailStatus(profile, mail);
    }

    _bindFormEvents()
    {
      var self = this;
      // Listen for input events in profile fields to mark form as changed
      this.form.addEventListener('input', function (event) {
        // Only handle changes in the Profile tab fields
        if (!self._isInProfilePanel(event.target)) {
          return;
        }
        self.pageInstance.setProfileChanged(true);  // mark form as having unsaved changes
      });

      this.form.addEventListener('change', function (event) {
        if (!self._isInProfilePanel(event.target)) {
          return;
        }
        self.pageInstance.setProfileChanged(true);  // mark form as having unsaved changes
      });
    }

    _bindSaveButton()
    {
      var selector = (this.selectors && this.selectors.profileSaveButton) || '#account-settings-profile-save';
      var button = this.root.querySelector(selector);
      if (!button) {
        return;
      }
      var self = this;
      var $ = window.jQuery || window.$;
      if ($ && typeof $ === 'function') {
        $(button).off('click.accountSettingsProfile').on('click.accountSettingsProfile', function (event) {
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
      if (!this.form) {
        return;
      }
      var validation = this._validateCurrentForm();
      if (!validation.ok)
      {
        this.showErrors(validation.errors);
        this.pageInstance.showToast('入力内容を確認してください。', 'warning');
        return;
      }
      try {
        this.pageInstance.toggleOverlay(true);
        var result = await this.save({ skipValidation: true, data: validation.data });
        if (!result || !result.ok) {
          this.showErrors(result && result.errors ? result.errors : {});
          this.pageInstance.showToast('入力内容を確認してください。', 'warning');
          return;
        }
        this.showErrors({});
        this.pageInstance.setProfileChanged(false);
        this.pageInstance.updateUnsavedChangesState(true);
        this.pageInstance.showToast('プロフィールを保存しました。', 'success');
      }
      catch (err) {
        console.error(err);
        this.pageInstance.showToast('プロフィールの保存に失敗しました。', 'error');
      }
      finally {
        this.pageInstance.toggleOverlay(false);
      }
    }

    _isInProfilePanel(target)
    {
      if (!target) {
        return false;
      }
      var panel = target.closest(this.selectors.profilePanel || '[data-tab-panel="profile"]');
      return !!panel;
    }

    async save(options)
    {
      // Save profile form data via API
      if (!this.form) {
        return { ok: false, errors: { _global: 'フォームが見つかりません。' } };
      }
      var opts = options || {};
      var data = opts.data || this._serialize();
      if (!opts.skipValidation)
      {
        var validation = this._validate(data);
        if (!validation.ok) {
          return validation;
        }
      }

      if (!(window.Utils && typeof window.Utils.requestApi === 'function')) {
        return { ok: false, errors: { _global: '保存機能が利用できません。' } };
      }

      var formData = this._buildFormData();
      var userId = await this.pageInstance.getUserId();
      if (!this._hasValidUserId(userId)) {
        return { ok: false, errors: { _global: 'ユーザー情報を取得できませんでした。' } };
      }
      formData.append('id', userId);

      var api = this.config.api || {};
      var requestType = api.requestType || 'User';
      var saveType = api.saveType || api.uploadType || 'UserUpdate';
      var endpoint = api.endpoint || api.saveSettings;
      var overrides = endpoint ? { url: endpoint } : null;

      var response;
      try {
        response = await window.Utils.requestApi(requestType, saveType, formData, overrides);
      }
      catch (err) {
        console.error(err);
        return { ok: false, errors: { _global: '保存に失敗しました。' } };
      }

      if (!response) {
        return { ok: false, errors: { _global: '保存に失敗しました。' } };
      }

      if (response.errors) {
        return { ok: false, errors: response.errors };
      }

      var status = typeof response.status === 'string' ? response.status.toUpperCase() : '';
      if (status && status !== 'OK' && status !== 'SUCCESS') {
        var message = response.message || response.reason || response.response || '保存に失敗しました。';
        return { ok: false, errors: { _global: message } };
      }

      return { ok: true };
    }

    showErrors(errors)
    {
      this._clearErrorMessages();
      this._clearFieldErrors();

      if (!errors) {
        return;
      }

      for (var key in errors) {
        if (!Object.prototype.hasOwnProperty.call(errors, key)) {
          continue;
        }
        if (key === '_global') {
          continue;
        }
        this._markFieldError(key);
        var target = this.root.querySelector('[data-error-for="' + key + '"]');
        if (target) {
          target.textContent = String(errors[key] || '');
        }
      }

      if (errors._global) {
        var global = this.root.querySelector('[data-error-global]');
        if (global) {
          global.textContent = String(errors._global);
        }
      }
    }

    _clearErrorMessages()
    {
      var nodes = this.root.querySelectorAll('[data-error-for]');
      Array.prototype.forEach.call(nodes, function (node) {
        node.textContent = '';
      });
      var global = this.root.querySelector('[data-error-global]');
      if (global) {
        global.textContent = '';
      }
    }

    _clearFieldErrors()
    {
      if (!this.form) {
        return;
      }
      var selector = '[name].is-error, [name][aria-invalid="true"]';
      var nodes = this.form.querySelectorAll(selector);
      var self = this;
      Array.prototype.forEach.call(nodes, function (node) {
        self._setNodeErrorState(node, false);
      });
      var extra = this.form.querySelectorAll('.mock-control.is-error, [data-field].is-error');
      Array.prototype.forEach.call(extra, function (node) {
        node.classList.remove('is-error');
      });
    }

    _markFieldError(name)
    {
      if (!this.form) {
        return;
      }
      var nodes = this._findFieldNodes(name);
      if (!nodes || !nodes.length) {
        return;
      }
      var self = this;
      Array.prototype.forEach.call(nodes, function (node) {
        self._setNodeErrorState(node, true);
      });
    }

    _setNodeErrorState(node, hasError)
    {
      if (!node || !node.classList) {
        return;
      }
      var method = hasError ? 'add' : 'remove';
      node.classList[method]('is-error');
      if (hasError) {
        node.setAttribute('aria-invalid', 'true');
      }
      else {
        node.removeAttribute('aria-invalid');
      }
      var control = node.closest('.mock-control');
      if (control && control.classList) {
        control.classList[method]('is-error');
      }
      var field = node.closest('[data-field]') || node.closest('.mock-form__field');
      if (field && field.classList) {
        field.classList[method]('is-error');
      }
    }

    _findFieldNodes(name)
    {
      var escaped = this._escapeAttributeValue(name);
      var selector = '[name="' + escaped + '"]';
      return this.form.querySelectorAll(selector);
    }

    _escapeAttributeValue(value)
    {
      if (window.CSS && typeof window.CSS.escape === 'function') {
        return window.CSS.escape(value);
      }
      return value;
    }

    _serialize()
    {
      // Serialize form fields into an object
      var fd = new FormData(this.form);
      var data = {};
      fd.forEach(function (value, key) {
        data[key] = value;
      });
      return data;
    }

    _validateCurrentForm()
    {
      if (!this.form)
      {
        return { ok: false, errors: { _global: 'フォームが見つかりません。' }, data: {} };
      }
      var data = this._serialize();
      var validation = this._validate(data);
      validation.data = data;
      return validation;
    }

    _buildFormData()
    {
      var fd = new FormData(this.form);
      fd.delete('imageFile');
      return fd;
    }

    _validate(data)
    {
      // Simple validation for required fields and password confirmation
      var errors = {};
      var required = ['displayName'];
      for (var i = 0; i < required.length; i += 1) {
        var key = required[i];
        if (!data[key] || String(data[key]).trim() === '') {
          errors[key] = '必須項目です。';
        }
      }

      if (data.mail) {
        var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.mail));
        if (!ok) {
          errors.mail = 'メールアドレスの形式が不正です。';
        }
      }

      if (data.newPassword || data.newPasswordConfirm) {
        if (!data.newPassword || String(data.newPassword).length < 8) {
          errors.newPassword = '8文字以上で入力してください。';
        }
        if (data.newPassword !== data.newPasswordConfirm) {
          errors.newPasswordConfirm = '確認用パスワードが一致しません。';
        }
      }

      return { ok: Object.keys(errors).length === 0, errors: errors };
    }

    _hasValidUserId(value)
    {
      if (value === undefined || value === null) {
        return false;
      }
      return String(value).trim() !== '';
    }

    _decorateButtons()
    {
      // Replace placeholder elements (with data-button-type) with actual styled buttons
      if (this._buttonsDecorated) {
        return;
      }
      var service = this.buttonService;
      if (!service || typeof service.createActionButton !== 'function') {
        return;
      }
      var placeholders = this.root.querySelectorAll('[data-button-type]');
      var self = this;
      Array.prototype.forEach.call(placeholders, function (placeholder) {
        if (!placeholder.parentNode) {
          return;
        }
        var button = self._createServiceButton(service, placeholder);
        if (!button) {
          return;
        }
        placeholder.parentNode.replaceChild(button, placeholder);
      });
      this._buttonsDecorated = true;
    }

    _captureMailElements()
    {
      if (this._mailElements)
      {
        return;
      }
      this._mailElements = {
        status: this.root.querySelector('[data-mail-status]'),
        helper: this.root.querySelector('[data-mail-helper]'),
        actions: this.root.querySelector('[data-mail-actions]'),
        buttons: this.root.querySelectorAll('[data-action="send-mail-check"], [data-action="mark-mail-verified"]')
      };
    }

    _resolveDisplayName(profile)
    {
      var candidates = ['displayName', 'name', 'userDisplayName'];
      for (var i = 0; i < candidates.length; i += 1)
      {
        var value = profile[candidates[i]];
        if (typeof value === 'string' && value.trim())
        {
          return value.trim();
        }
      }
      return '';
    }

    _resolveMail(profile)
    {
      var candidates = ['mail', 'userMail'];
      for (var i = 0; i < candidates.length; i += 1)
      {
        var value = profile[candidates[i]];
        if (typeof value === 'string' && value.trim())
        {
          return value.trim();
        }
      }
      return '';
    }

    _resolveRole(profile)
    {
      var candidates = ['role', 'userRole', 'position'];
      for (var i = 0; i < candidates.length; i += 1)
      {
        var value = profile[candidates[i]];
        if (typeof value === 'string' && value.trim())
        {
          return value.trim();
        }
      }
      return '';
    }

    _setInputValue(name, value)
    {
      if (!this.form)
      {
        return;
      }
      var selector = '[name="' + this._escapeAttributeValue(name) + '"]';
      var input = this.form.querySelector(selector);
      if (!input)
      {
        return;
      }
      input.value = value || '';
    }

    _updateMailStatus(profile, mail)
    {
      if (!this._mailElements)
      {
        return;
      }
      var statusText = 'メールアドレスは未確認です。';
      var helperText = mail ? '確認メールを送信して受信を完了できます。' : 'メールアドレスを入力すると確認プロセスを開始できます。';
      if (!mail)
      {
        statusText = 'メールアドレスが未設定です。';
      }
      var verifiedDate = this._resolveMailCheckDate(profile);
      if (verifiedDate)
      {
        statusText = verifiedDate + ' に確認済みです。';
      }
      if (this._mailElements.status)
      {
        this._mailElements.status.textContent = statusText;
      }
      if (this._mailElements.helper)
      {
        this._mailElements.helper.textContent = helperText;
      }
      if (this._mailElements.actions)
      {
        if (mail)
        {
          this._mailElements.actions.removeAttribute('hidden');
        }
        else
        {
          this._mailElements.actions.setAttribute('hidden', 'hidden');
        }
      }
      if (this._mailElements.buttons && this._mailElements.buttons.length)
      {
        Array.prototype.forEach.call(this._mailElements.buttons, function (button) {
          button.disabled = !mail;
          if (button.disabled)
          {
            button.setAttribute('aria-disabled', 'true');
          }
          else
          {
            button.removeAttribute('aria-disabled');
          }
        });
      }
    }

    _resolveMailCheckDate(profile)
    {
      var raw = profile && typeof profile.mailCheckDate === 'string' ? profile.mailCheckDate.trim() : '';
      if (!raw)
      {
        return '';
      }
      var dateParts = raw.split(/\s+/);
      if (!dateParts.length)
      {
        return raw;
      }
      var normalized = raw;
      try
      {
        var date = new Date(raw.replace(/-/g, '/'));
        if (!isNaN(date.getTime()))
        {
          var year = date.getFullYear();
          var month = (date.getMonth() + 1).toString().padStart(2, '0');
          var day = date.getDate().toString().padStart(2, '0');
          var hour = date.getHours().toString().padStart(2, '0');
          var minute = date.getMinutes().toString().padStart(2, '0');
          normalized = year + '年' + month + '月' + day + '日 ' + hour + ':' + minute;
        }
      }
      catch (err)
      {
        normalized = raw;
      }
      return normalized;
    }

    _createServiceButton(service, placeholder)
    {
      var type = placeholder.getAttribute('data-button-type');
      if (!type) {
        return null;
      }
      var label = placeholder.getAttribute('data-label') || '';
      if (!label) {
        label = (placeholder.textContent || '').trim();
      }
      if (!label) {
        label = placeholder.getAttribute('aria-label') || '';
      }
      var options = { label: label };
      var typeAttr = placeholder.getAttribute('type');
      if (typeAttr) {
        options.type = typeAttr;
      }
      if (placeholder.disabled) {
        options.disabled = true;
      }
      var ariaLabel = placeholder.getAttribute('aria-label');
      if (ariaLabel) {
        options.ariaLabel = ariaLabel;
      }
      var dataset = this._collectDataset(placeholder);
      if (dataset) {
        options.dataset = dataset;
      }
      var attributes = this._collectAttributes(placeholder);
      if (attributes) {
        options.attributes = attributes;
      }
      return service.createActionButton(type, options);
    }

    _collectDataset(node)
    {
      var data = node.dataset || null;
      if (!data) {
        return null;
      }
      var result = {};
      var hasAny = false;
      for (var key in data) {
        if (!Object.prototype.hasOwnProperty.call(data, key)) {
          continue;
        }
        if (key === 'buttonType') {
          continue;
        }
        result[key] = data[key];
        hasAny = true;
      }
      return hasAny ? result : null;
    }

    _collectAttributes(node)
    {
      if (!node || !node.attributes) {
        return null;
      }
      var attrs = node.attributes;
      var result = {};
      var hasAny = false;
      for (var i = 0; i < attrs.length; i += 1) {
        var attr = attrs[i];
        if (!attr || !attr.name) {
          continue;
        }
        var name = attr.name.toLowerCase();
        if (name === 'class' || name === 'type' || name === 'disabled' || name === 'data-button-type') {
          continue;
        }
        if (name.indexOf('data-') === 0) {
          continue;
        }
        result[attr.name] = attr.value;
        hasAny = true;
      }
      return hasAny ? result : null;
    }
  }

  window.AccountSettings = window.AccountSettings || {};
  window.AccountSettings.JobProfile = JobProfile;
})(window, document);
