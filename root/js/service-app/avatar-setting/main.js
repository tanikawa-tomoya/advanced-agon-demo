(function (window, document) {

  'use strict';

  class AvatarSettingService
  {
    constructor(options)
    {
      this.jobs = null;
      this.instances = new Map();
      this.initConfig(options);
    }

    initConfig(options)
    {
      this.DEFAULTS = Object.freeze({
        idPrefix: 'avatar-setting-',
        placeholderText: 'YOU',
        emptyFilenameText: '選択されていません',
        acceptImageTypes: ['image/png', 'image/jpeg', 'image/webp'],
        uploadMaxSizeMB: 5,
        selectors: {
          container: '.mock-avatar',
          preview: '[data-avatar-preview]',
          placeholder: '[data-avatar-placeholder]',
          filename: '[data-avatar-filename]',
          input: '[data-role="avatar-input"]',
          choose: '[data-action="choose-avatar"]',
          remove: '[data-action="delete-avatar"]'
        }
      });
      this.config = Object.assign({}, this.DEFAULTS, options || {});
    }

    async boot()
    {
      await window.Utils.loadScriptsSync([
        'js/service-app/avatar-setting/job-dom.js',
        'js/service-app/avatar-setting/job-events.js'
      ]);

      this.jobs = {
        dom: new window.Services.AvatarSetting.JobDom(this),
        events: new window.Services.AvatarSetting.JobEvents(this)
      };
      return this;
    }

    mount(targetId, options)
    {
      if (this.instances.has(targetId)) {
        return this.instances.get(targetId);
      }
      var root = document.getElementById(targetId);
      if (!root) {
        return null;
      }
      var cfg = this._mergeConfig(options);
      var refs = this.jobs.dom.ensureStructure(root, cfg);
      if (!refs) {
        return null;
      }
      var instance = {
        id: targetId,
        root: root,
        config: cfg,
        refs: refs,
        state: {
          pendingFile: null,
          previewUrl: null,
          filename: cfg.emptyFilenameText,
          removeRequested: false,
          currentAvatar: null
        },
        handlers: {
          onChange: [],
          onError: []
        }
      };
      this._registerHandlers(instance, cfg);
      this.jobs.events.bind(instance, {
        onChoose: () => { this._openFileChooser(instance); },
        onDelete: () => { this.requestRemove(targetId); },
        onFileSelected: (file) => { this._handleFileSelection(instance, file); }
      });
      this.instances.set(targetId, instance);
      return instance;
    }

    setAvatar(targetId, avatar)
    {
      var inst = this.instances.get(targetId);
      if (!inst) return null;
      var normalized = this._normalizeAvatar(avatar);
      inst.state.currentAvatar = normalized;
      inst.state.pendingFile = null;
      inst.state.removeRequested = false;
      inst.state.filename = normalized && normalized.fileName ? normalized.fileName : inst.config.emptyFilenameText;
      this._revokePreview(inst);
      if (normalized && normalized.url) {
        this.jobs.dom.applyAvatar(inst.refs, normalized, inst.config);
      } else {
        this.jobs.dom.reset(inst.refs, inst.config);
      }
      return normalized;
    }

    requestRemove(targetId)
    {
      var inst = this.instances.get(targetId);
      if (!inst) return;
      inst.state.pendingFile = null;
      inst.state.removeRequested = true;
      inst.state.filename = inst.config.emptyFilenameText;
      this._revokePreview(inst);
      this.jobs.dom.showPlaceholder(inst.refs, inst.config);
      this.jobs.dom.setFilename(inst.refs, inst.config.emptyFilenameText);
      this._notifyChange(inst);
    }

    getState(targetId)
    {
      var inst = this.instances.get(targetId);
      if (!inst) return null;
      return {
        pendingFile: inst.state.pendingFile,
        previewUrl: inst.state.previewUrl,
        filename: inst.state.filename,
        removeRequested: !!inst.state.removeRequested,
        currentAvatar: inst.state.currentAvatar
      };
    }

    getPayload(targetId)
    {
      var state = this.getState(targetId);
      if (!state) return null;
      return {
        file: state.pendingFile,
        removeAvatar: state.removeRequested,
        filename: state.filename,
        currentAvatar: state.currentAvatar
      };
    }

    hasPendingChange(targetId)
    {
      var state = this.getState(targetId);
      if (!state) return false;
      return !!state.pendingFile || !!state.removeRequested;
    }

    markSaved(targetId, avatar)
    {
      var inst = this.instances.get(targetId);
      if (!inst) return;
      if (avatar && avatar.url) {
        this.setAvatar(targetId, avatar);
      } else {
        this.setAvatar(targetId, null);
      }
      inst.state.pendingFile = null;
      inst.state.removeRequested = false;
      this._notifyChange(inst);
    }

    setError(targetId, active)
    {
      var inst = this.instances.get(targetId);
      if (!inst) return;
      this.jobs.dom.setError(inst.refs, !!active);
    }

    dispose(targetId)
    {
      var inst = this.instances.get(targetId);
      if (!inst) return;
      this.jobs.events.unbind(inst);
      this._revokePreview(inst);
      this.instances.delete(targetId);
    }

    _handleFileSelection(instance, file)
    {
      var validation = this._validateFile(file, instance.config);
      if (!validation.ok) {
        this._notifyError(instance, validation.errors.join('\n'));
        this.jobs.dom.setError(instance.refs, true);
        return;
      }
      this.jobs.dom.setError(instance.refs, false);
      this._revokePreview(instance);
      var url = URL.createObjectURL(file);
      instance.state.previewUrl = url;
      instance.state.pendingFile = file;
      instance.state.removeRequested = false;
      instance.state.filename = file && file.name ? file.name : instance.config.emptyFilenameText;
      this.jobs.dom.updatePreview(instance.refs, {
        url: url,
        fileName: instance.state.filename,
        placeholderText: instance.config.placeholderText
      }, instance.config);
      this.jobs.dom.clearFileInput(instance.refs);
      this._notifyChange(instance);
    }

    _openFileChooser(instance)
    {
      var input = instance.refs && instance.refs.input;
      if (!input) return;
      try { input.value = ''; } catch (err) { /* noop */ }
      if (typeof input.click === 'function') {
        input.click();
      }
    }

    _mergeConfig(options)
    {
      var cfg = Object.assign({}, this.config, options || {});
      cfg.selectors = Object.assign({}, this.config.selectors, (options && options.selectors) || {});
      return cfg;
    }

    _registerHandlers(instance, cfg)
    {
      if (cfg && typeof cfg.onChange === 'function') {
        instance.handlers.onChange.push(cfg.onChange);
      }
      if (cfg && typeof cfg.onError === 'function') {
        instance.handlers.onError.push(cfg.onError);
      }
    }

    _validateFile(file, cfg)
    {
      var errors = [];
      if (!file) {
        errors.push('画像ファイルを選択してください。');
      }
      if (cfg.acceptImageTypes && cfg.acceptImageTypes.length && file && cfg.acceptImageTypes.indexOf(file.type) === -1) {
        errors.push('対応していない画像形式です。PNG/JPEG/WEBP を選択してください。');
      }
      if (file && cfg.uploadMaxSizeMB) {
        var sizeMB = file.size / (1024 * 1024);
        if (sizeMB > cfg.uploadMaxSizeMB) {
          errors.push('ファイルサイズが大きすぎます（' + cfg.uploadMaxSizeMB + 'MB 以下）。');
        }
      }
      return { ok: errors.length === 0, errors: errors };
    }

    _normalizeAvatar(avatar)
    {
      if (!avatar) return null;
      if (typeof avatar === 'string') {
        return { url: avatar, fileName: '' };
      }
      var url = '';
      if (avatar.url) url = avatar.url;
      else if (avatar.src) url = avatar.src;
      else if (avatar.imageUrl) url = avatar.imageUrl;
      var fileName = '';
      if (avatar.fileName) fileName = avatar.fileName;
      else if (avatar.name) fileName = avatar.name;
      return { url: url, fileName: fileName };
    }

    _notifyChange(instance)
    {
      for (var i = 0; i < instance.handlers.onChange.length; i += 1) {
        try { instance.handlers.onChange[i](this.getState(instance.id)); } catch (err) { /* noop */ }
      }
    }

    _notifyError(instance, message)
    {
      for (var i = 0; i < instance.handlers.onError.length; i += 1) {
        try { instance.handlers.onError[i](message); } catch (err) { /* noop */ }
      }
    }

    _revokePreview(instance)
    {
      if (instance.state && instance.state.previewUrl) {
        try { URL.revokeObjectURL(instance.state.previewUrl); } catch (err) { /* noop */ }
        instance.state.previewUrl = null;
      }
    }
  }

  window.Services = window.Services || {};
  window.Services.AvatarSetting = AvatarSettingService;

})(window, document);
