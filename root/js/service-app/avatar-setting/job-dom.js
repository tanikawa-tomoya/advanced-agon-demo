(function (window, document) {

  'use strict';

  class JobDom
  {
    constructor(service)
    {
      this.service = service;
    }

    ensureStructure(root, cfg)
    {
      if (!root) return null;
      var container = root.querySelector(cfg.selectors.container);
      if (!container) {
        container = this._buildStructure(root, cfg);
      }
      var refs = this._queryRefs(container, cfg);
      if (!refs.preview) {
        refs.preview = this._createPreviewElement(cfg);
        refs.previewWrapper.appendChild(refs.preview);
      }
      if (!refs.placeholder) {
        refs.placeholder = this._createPlaceholder(cfg.placeholderText);
        refs.previewWrapper.appendChild(refs.placeholder);
      }
      if (!refs.filename) {
        refs.filename = this._createFilename(cfg.emptyFilenameText);
        refs.content.appendChild(refs.filename);
      }
      if (!refs.input) {
        refs.input = this._createFileInput();
        refs.content.appendChild(refs.input);
      }
      this._ensureButtons(refs, cfg);
      return refs;
    }

    updatePreview(refs, payload, cfg)
    {
      if (!refs || !payload) return;
      if (refs.preview) {
        refs.preview.src = payload.url || '';
        refs.preview.removeAttribute('hidden');
      }
      if (refs.placeholder) {
        refs.placeholder.setAttribute('hidden', 'hidden');
      }
      this.setFilename(refs, payload.fileName || cfg.emptyFilenameText);
    }

    applyAvatar(refs, avatar, cfg)
    {
      if (!refs || !avatar || !avatar.url) {
        this.reset(refs, cfg);
        return;
      }
      if (refs.preview) {
        refs.preview.src = avatar.url;
        refs.preview.removeAttribute('hidden');
      }
      if (refs.placeholder) {
        refs.placeholder.setAttribute('hidden', 'hidden');
      }
      this.setFilename(refs, avatar.fileName || cfg.emptyFilenameText);
    }

    reset(refs, cfg)
    {
      if (!refs) return;
      if (refs.preview) {
        refs.preview.src = '';
        refs.preview.setAttribute('hidden', 'hidden');
      }
      this.showPlaceholder(refs, cfg);
      this.setFilename(refs, cfg.emptyFilenameText);
    }

    showPlaceholder(refs, cfg)
    {
      if (!refs) return;
      if (refs.placeholder) {
        refs.placeholder.textContent = cfg.placeholderText || 'YOU';
        refs.placeholder.removeAttribute('hidden');
      }
      if (refs.preview) {
        refs.preview.setAttribute('hidden', 'hidden');
      }
    }

    setFilename(refs, text)
    {
      if (!refs || !refs.filename) return;
      refs.filename.textContent = text || '';
    }

    clearFileInput(refs)
    {
      if (!refs || !refs.input) return;
      try { refs.input.value = ''; } catch (err) { /* noop */ }
    }

    setError(refs, active)
    {
      if (!refs || !refs.root) return;
      if (active) {
        refs.root.classList.add('is-error');
      } else {
        refs.root.classList.remove('is-error');
      }
    }

    _queryRefs(container, cfg)
    {
      var refs = {};
      refs.root = container.closest('.mock-control--avatar') || container;
      refs.container = container;
      refs.previewWrapper = container.querySelector('.mock-avatar__preview') || container;
      refs.preview = container.querySelector(cfg.selectors.preview);
      refs.placeholder = container.querySelector(cfg.selectors.placeholder);
      refs.content = container.querySelector('.mock-avatar__content') || container;
      refs.actions = container.querySelector('.mock-avatar__actions');
      refs.filename = container.querySelector(cfg.selectors.filename);
      refs.input = container.querySelector(cfg.selectors.input);
      refs.chooseButton = container.querySelector(cfg.selectors.choose);
      refs.deleteButton = container.querySelector(cfg.selectors.remove);
      return refs;
    }

    _buildStructure(root, cfg)
    {
      var wrapper = document.createElement('div');
      wrapper.className = 'mock-avatar';
      wrapper.innerHTML = [
        '<div class="mock-avatar__preview">',
        '  <img data-avatar-preview data-role="avatar-img" src="" alt="アバタープレビュー" hidden />',
        '  <span class="mock-avatar__placeholder" data-avatar-placeholder>' + (cfg.placeholderText || 'YOU') + '</span>',
        '</div>',
        '<div class="mock-avatar__content">',
        '  <p class="mock-avatar__filename" data-avatar-filename>' + (cfg.emptyFilenameText || '') + '</p>',
        '  <div class="mock-avatar__actions">',
        '    <button type="button" class="mock-avatar__upload-btn" data-action="choose-avatar" data-button-type="account-settings-avatar-choose">画像を選択</button>',
        '    <button type="button" class="mock-avatar__upload-btn mock-avatar__upload-btn--secondary" data-action="delete-avatar" data-button-type="delete" data-label="アバターを削除" aria-label="アバターを削除">削除</button>',
        '  </div>',
        '  <p class="mock-avatar__hint" data-avatar-hint>推奨サイズ: 512×512px 以上の正方形画像。</p>',
        '  <input type="file" accept="image/*" name="imageFile" data-role="avatar-input" hidden />',
        '</div>'
      ].join('');
      root.appendChild(wrapper);
      return wrapper;
    }

    _createPreviewElement(cfg)
    {
      var img = document.createElement('img');
      img.setAttribute('data-avatar-preview', '');
      img.setAttribute('data-role', 'avatar-img');
      img.setAttribute('alt', 'アバタープレビュー');
      img.setAttribute('hidden', 'hidden');
      return img;
    }

    _createPlaceholder(text)
    {
      var span = document.createElement('span');
      span.className = 'mock-avatar__placeholder';
      span.setAttribute('data-avatar-placeholder', '');
      span.textContent = text || 'YOU';
      return span;
    }

    _createFilename(text)
    {
      var p = document.createElement('p');
      p.className = 'mock-avatar__filename';
      p.setAttribute('data-avatar-filename', '');
      p.textContent = text || '';
      return p;
    }

    _createFileInput()
    {
      var input = document.createElement('input');
      input.type = 'file';
      input.name = 'imageFile';
      input.setAttribute('accept', 'image/*');
      input.setAttribute('data-role', 'avatar-input');
      input.setAttribute('hidden', 'hidden');
      return input;
    }

    _ensureButtons(refs, cfg)
    {
      if (!refs.actions && refs.content) {
        refs.actions = document.createElement('div');
        refs.actions.className = 'mock-avatar__actions';
        refs.content.insertBefore(refs.actions, refs.filename || refs.content.firstChild);
      }
      if (!refs.chooseButton) {
        refs.chooseButton = this._createActionButton('choose');
        if (refs.actions) refs.actions.appendChild(refs.chooseButton);
      }
      if (!refs.deleteButton) {
        refs.deleteButton = this._createActionButton('delete');
        if (refs.actions) refs.actions.appendChild(refs.deleteButton);
      }
      if (!refs.input) return;
      if (cfg.acceptImageTypes && cfg.acceptImageTypes.length) {
        refs.input.setAttribute('accept', cfg.acceptImageTypes.join(','));
      }
    }

    _createActionButton(type)
    {
      if (type === 'delete') {
        var buttonSvc = window.Services && window.Services.button ? new window.Services.button() : null;
        if (buttonSvc && typeof buttonSvc.createActionButton === 'function') {
          try {
            var created = buttonSvc.createActionButton('delete', {
              baseClass: 'table-action-button',
              variantPrefix: ['table-action-button--'],
              ariaLabel: 'アバターを削除',
              srLabel: 'アバターを削除',
              attributes: {
                'data-action': 'delete-avatar',
                'data-label': 'アバターを削除',
                'data-button-type': 'delete'
              }
            });
            if (created) {
              created.type = 'button';
              created.classList.add('mock-avatar__upload-btn', 'mock-avatar__upload-btn--secondary');
              return created;
            }
          } catch (err) { /* fall through to fallback */ }
        }
      }
      var btn = document.createElement('button');
      btn.type = 'button';
      if (type === 'delete') {
        btn.className = 'mock-avatar__upload-btn mock-avatar__upload-btn--secondary table-action-button table-action-button--delete';
        btn.setAttribute('data-action', 'delete-avatar');
        btn.setAttribute('data-button-type', 'delete');
        btn.setAttribute('data-label', 'アバターを削除');
        btn.setAttribute('aria-label', 'アバターを削除');
        btn.textContent = '削除';
      }
      else {
        btn.className = 'mock-avatar__upload-btn';
        btn.setAttribute('data-action', 'choose-avatar');
        btn.setAttribute('data-button-type', 'account-settings-avatar-choose');
        btn.textContent = '画像を選択';
      }
      return btn;
    }
  }

  window.Services = window.Services || {};
  window.Services.AvatarSetting = window.Services.AvatarSetting || {};
  window.Services.AvatarSetting.JobDom = JobDom;

})(window, document);
