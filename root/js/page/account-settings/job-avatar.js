(function (window, document) {
  'use strict';

  class JobAvatar
  {
    constructor(pageInstance)
    {
      this.pageInstance = pageInstance;
      this.root = pageInstance.root;
      this.config = pageInstance.config || {};
      this.selectors = this.config.selectors || {};
      this.avatarSettingId = this.config.avatarSettingId || 'account-settings-avatar-setting';
      this.avatarService = (pageInstance.services && pageInstance.services.avatarSetting) || null;
      this._loadedAvatar = null;
    }

    run()
    {
      this._mountAvatarSetting();
      this._bindSaveButton();
    }

    applyProfile(profile)
    {
      var info = this._normalizeProfileAvatar(profile);
      this._loadedAvatar = info;
      if (this.avatarService && typeof this.avatarService.setAvatar === 'function') {
        this.avatarService.setAvatar(this.avatarSettingId, info);
      }
    }

    _mountAvatarSetting()
    {
      if (!this.avatarService || typeof this.avatarService.mount !== 'function') {
        return;
      }
      var self = this;
      this.avatarService.mount(this.avatarSettingId, {
        acceptImageTypes: this.config.acceptImageTypes,
        uploadMaxSizeMB: this.config.uploadMaxSizeMB,
        emptyFilenameText: this.config.emptyFilenameText || '選択されていません',
        onChange: function () {
          self._handleAvatarChange();
        },
        onError: function (message) {
          self._setAvatarFieldError(true);
          self.pageInstance.showToast(message || '画像の選択に失敗しました。', 'warning');
        }
      });
    }

    _bindSaveButton()
    {
      var selector = (this.selectors && this.selectors.avatarSaveButton) || '#account-settings-avatar-save';
      var button = this.root.querySelector(selector);
      if (!button) {
        return;
      }
      var self = this;
      var $ = window.jQuery || window.$;
      if ($ && typeof $ === 'function') {
        $(button).off('click.accountSettingsAvatar').on('click.accountSettingsAvatar', function (event) {
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
      var payload = this.avatarService && this.avatarService.getPayload(this.avatarSettingId);
      if (!payload || (!payload.file && !payload.removeAvatar)) {
        this._setAvatarFieldError(true);
        this.pageInstance.showToast('画像を選択するか、削除を選んでから保存してください。', 'warning');
        return;
      }
      this._setAvatarFieldError(false);
      try {
        this.pageInstance.toggleOverlay(true);
        var result = await this._submitAvatarChanges(payload);
        if (!result || !result.ok) {
          this.pageInstance.showToast((result && result.message) || '画像のアップロードに失敗しました。', 'error');
          return;
        }
        if (result.removed) {
          this.applyUploadedAvatar('');
          this.pageInstance.showToast('プロフィール画像を削除しました。', 'success');
        }
        else {
          if (result.url) {
            this.applyUploadedAvatar(result.url);
          }
          this.pageInstance.showToast('プロフィール画像を保存しました。', 'success');
        }
        var savedAvatar = result.removed ? null : (result.url ? { url: result.url, fileName: payload.filename || '' } : null);
        if (this.pageInstance && typeof this.pageInstance.handleAvatarSaved === 'function') {
          await this.pageInstance.handleAvatarSaved(savedAvatar);
        }
        this.pageInstance.setAvatarChanged(false);
        this.pageInstance.updateUnsavedChangesState(true);
        this._setAvatarFieldError(false);
        if (this.avatarService && typeof this.avatarService.markSaved === 'function') {
          this.avatarService.markSaved(this.avatarSettingId, result && result.url ? { url: result.url, fileName: payload.filename } : null);
        }
      }
      catch (err) {
        console.error(err);
        this.pageInstance.showToast('画像のアップロードに失敗しました。', 'error');
      }
      finally {
        this.pageInstance.toggleOverlay(false);
      }
    }

    _handleAvatarChange()
    {
      this._setAvatarFieldError(false);
      var hasChange = this.avatarService && this.avatarService.hasPendingChange(this.avatarSettingId);
      this.pageInstance.setAvatarChanged(!!hasChange);
      this.pageInstance.updateUnsavedChangesState();
    }

    hasPendingUpload()
    {
      var payload = this.avatarService && this.avatarService.getPayload(this.avatarSettingId);
      return !!(payload && (payload.file || payload.removeAvatar));
    }

    async _submitAvatarChanges(payload)
    {
      if (!payload) {
        return { ok: false, message: '変更内容がありません。' };
      }
      if (payload.removeAvatar) {
        return this._requestAvatarRemoval();
      }
      return this.uploadPendingAvatar(payload.file, payload.filename);
    }

    async uploadPendingAvatar(file, fileName)
    {
      if (!file) {
        return { ok: true, skipped: true };
      }
      if (!(window.Utils && typeof window.Utils.requestApi === 'function')) {
        return { ok: false, message: 'アップロード機能が利用できません。' };
      }

      var fd = new FormData();
      var uploadName = fileName || (file && file.name) || 'avatar.png';
      fd.append('imageFile', file, uploadName);

      var userId = await this.pageInstance.getUserId();
      if (!this._isValidUserId(userId)) {
        return { ok: false, message: 'ユーザー情報を取得できません。' };
      }
      fd.append('id', userId);

      var api = this.config.api || {};
      var requestType = api.requestType || 'User';
      var uploadType = api.uploadType || 'UserUpdate';
      var overrides = {};
      var endpoint = api.uploadAvatar || api.endpoint;
      if (endpoint) {
        overrides.url = endpoint;
      }

      var response;
      try {
        response = await window.Utils.requestApi(requestType, uploadType, fd, overrides);
      }
      catch (err) {
        return { ok: false, message: (err && err.message) || 'アップロードに失敗しました。' };
      }

      if (!response || (response.status && response.status !== 'OK' && response.status !== 'SUCCESS')) {
        var reason = response && (response.reason || (response.result && response.result.message));
        return { ok: false, message: reason || 'アップロードに失敗しました。' };
      }

      var result = response.result || response;
      var url = this._extractAvatarUrl(result);
      this._loadedAvatar = { url: url || null, fileName: uploadName };
      return { ok: true, url: url || null };
    }

    async _requestAvatarRemoval()
    {
      var userId = await this.pageInstance.getUserId();
      if (!this._isValidUserId(userId)) {
        return { ok: false, message: 'ユーザー情報を取得できません。' };
      }
      if (!(window.Utils && typeof window.Utils.requestApi === 'function')) {
        return { ok: false, message: '削除機能が利用できません。' };
      }
      var fd = new FormData();
      fd.append('id', userId);
      fd.append('removeAvatar', '1');
      var api = this.config.api || {};
      var requestType = api.requestType || 'User';
      var uploadType = api.uploadType || 'UserUpdate';
      var endpoint = api.uploadAvatar || api.endpoint;
      var overrides = endpoint ? { url: endpoint } : null;
      var response;
      try {
        response = await window.Utils.requestApi(requestType, uploadType, fd, overrides);
      }
      catch (err) {
        return { ok: false, message: (err && err.message) || '削除に失敗しました。' };
      }
      if (!response || (response.status && response.status !== 'OK' && response.status !== 'SUCCESS')) {
        var reason = response && (response.reason || (response.result && response.result.message));
        return { ok: false, message: reason || '削除に失敗しました。' };
      }
      this._loadedAvatar = null;
      return { ok: true, removed: true };
    }

    applyUploadedAvatar(url)
    {
      if (this.avatarService && typeof this.avatarService.setAvatar === 'function') {
        this.avatarService.setAvatar(this.avatarSettingId, url ? { url: url, fileName: this._loadedAvatar && this._loadedAvatar.fileName } : null);
      }
      else if (url) {
        this._loadedAvatar = { url: url, fileName: this._loadedAvatar && this._loadedAvatar.fileName };
      }
      else {
        this._loadedAvatar = null;
      }
    }

    _normalizeProfileAvatar(profile)
    {
      if (!profile) {
        return null;
      }
      var avatar = null;
      if (profile.avatar && typeof profile.avatar === 'object')
      {
        avatar = profile.avatar;
      }
      var url = '';
      if (avatar && typeof avatar.url === 'string' && avatar.url.trim())
      {
        url = avatar.url.trim();
      }
      else if (avatar && typeof avatar.src === 'string' && avatar.src.trim())
      {
        url = avatar.src.trim();
      }
      else if (typeof profile.avatarUrl === 'string' && profile.avatarUrl.trim())
      {
        url = profile.avatarUrl.trim();
      }
      else if (typeof profile.avatarUrlMedium === 'string' && profile.avatarUrlMedium.trim())
      {
        url = profile.avatarUrlMedium.trim();
      }
      else if (typeof profile.avatarUrlSmall === 'string' && profile.avatarUrlSmall.trim())
      {
        url = profile.avatarUrlSmall.trim();
      }
      var fileName = this._resolveAvatarFileName(profile) || '';
      if (!fileName && avatar && typeof avatar.fileName === 'string')
      {
        fileName = avatar.fileName;
      }
      return url ? { url: url, fileName: fileName || '' } : null;
    }

    _extractAvatarUrl(result)
    {
      if (!result || typeof result !== 'object') {
        return '';
      }
      if (result.url) {
        return result.url;
      }
      if (result.avatarUrl) {
        return result.avatarUrl;
      }
      if (result.avatar && typeof result.avatar === 'object') {
        if (result.avatar.url) {
          return result.avatar.url;
        }
        if (result.avatar.src) {
          return result.avatar.src;
        }
        if (result.avatar.imageUrl) {
          return result.avatar.imageUrl;
        }
      }
      var fileName = this._resolveAvatarFileName(result);
      if (!fileName && result.user && typeof result.user === 'object')
      {
        fileName = this._resolveAvatarFileName(result.user);
      }
      if (fileName)
      {
        return this._buildAvatarUrl(fileName, result);
      }
      return '';
    }

    _resolveAvatarFileName(source)
    {
      if (!source || typeof source !== 'object')
      {
        return '';
      }
      var avatar = source.avatar && typeof source.avatar === 'object' ? source.avatar : null;
      if (avatar && typeof avatar.fileName === 'string' && avatar.fileName.trim())
      {
        return avatar.fileName.trim();
      }
      var keys = ['avatarFileName', 'imageFileName', 'imageFilename', 'fileName'];
      for (var i = 0; i < keys.length; i += 1)
      {
        var value = source[keys[i]];
        if (typeof value === 'string' && value.trim())
        {
          return value.trim();
        }
      }
      return '';
    }

    _resolveAvatarVersion(source)
    {
      if (!source || typeof source !== 'object')
      {
        return '';
      }
      var avatar = source.avatar && typeof source.avatar === 'object' ? source.avatar : null;
      var keys = ['avatarUpdatedAt', 'imageUpdatedAt', 'avatarVersion', 'version'];
      for (var i = 0; i < keys.length; i += 1)
      {
        var value = source[keys[i]];
        if (value !== undefined && value !== null)
        {
          var normalized = String(value).trim();
          if (normalized)
          {
            return normalized;
          }
        }
      }
      if (avatar)
      {
        for (var j = 0; j < keys.length; j += 1)
        {
          var avatarValue = avatar[keys[j]];
          if (avatarValue !== undefined && avatarValue !== null)
          {
            var avatarNormalized = String(avatarValue).trim();
            if (avatarNormalized)
            {
              return avatarNormalized;
            }
          }
        }
      }
      return '';
    }

    _buildAvatarUrl(fileName, source)
    {
      var base = this.config.avatarBasePath || '/data/userdata/';
      var variant = this.config.avatarVariant || 'medium';
      var version = this._resolveAvatarVersion(source);
      var suffix = version ? ('?v=' + encodeURIComponent(version)) : '';
      return base + encodeURIComponent(variant + '/' + fileName) + suffix;
    }

    _isValidUserId(userId)
    {
      return userId !== undefined && userId !== null && userId !== '';
    }

    _setAvatarFieldError(isError)
    {
      var selector = this.selectors.avatarField || '.mock-control--avatar';
      var field = this.root.querySelector(selector);
      if (!field) {
        return;
      }
      if (isError) {
        field.classList.add('is-error');
        field.setAttribute('aria-invalid', 'true');
      }
      else {
        field.classList.remove('is-error');
        field.removeAttribute('aria-invalid');
      }
    }
  }

  window.AccountSettings = window.AccountSettings || {};
  window.AccountSettings.JobAvatar = JobAvatar;
  window.Services = window.Services || {};
  window.Services.PageAccountSettings = window.Services.PageAccountSettings || {};
  window.Services.PageAccountSettings.JobAvatar = JobAvatar;

})(window, document);
