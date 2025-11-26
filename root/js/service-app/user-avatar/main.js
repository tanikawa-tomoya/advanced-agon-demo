(function () {

  'use strict';

  class UserAvatarService
  {
    constructor(options)
    {
      this.jobs = null;
      this.popovers = [];
      this._eventTargets = new Map();
      this.initConfig(options);
    }

    initConfig(options)
    {
      // 旧 config.js の内容をここに集約
      this.DEFAULTS = Object.freeze({
        size: 40,                  // px
        shape: 'circle',           // circle | rounded | square
        classRoot: 'c-user-avatar',
        idPrefix: 'avatar-',
        altFromName: true,         // alt未指定時に name から生成
        nameOverlay: false,        // アバター下部に名前オーバーレイ
        initialsFallback: false,   // 画像読み込み失敗時の頭文字SVGフォールバック（デフォルト無効）
        zIndex: null,
        fallbackAvatarSrc: '/image/user-avatar.svg'
      });
      this.POPOVER_DEFAULTS = Object.freeze({
        placement: 'top-start',   // 'top'|'bottom'|'left'|'right' + ('-start'|'-end')
        offset: 12,                // アンカーからの余白(px) ※ number または {x,y}
        closeOnEsc: true,
        closeOnOutside: true,
        trapFocus: true,
        role: 'menu',
        ariaLabel: 'User menu',
        idPrefix: 'userpopover-',
        zIndex: 10000,
        dismissOnMouseLeave: false
      });
      this.ALLOWED_SHAPES = Object.freeze({ circle:1, rounded:1, square:1 });
      var opts = Object.assign({}, options || {});
      var popoverOpts = this._extractPopoverOptions(opts);
      this.config = Object.assign({}, this.DEFAULTS, opts);
      if (!this.ALLOWED_SHAPES[this.config.shape]) {
        this.config.shape = 'circle';
      }
      this.popoverConfig = Object.assign({}, this.POPOVER_DEFAULTS, popoverOpts);
    }

    async boot()
    {
      await window.Utils.loadScriptsSync([
        'js/service-app/user-avatar/job-build-avatar.js',
        'js/service-app/user-avatar/job-mount-avatar.js',
        'js/service-app/user-avatar/job-popover.js',
        'js/service-app/user-avatar/job-position.js',
        'js/service-app/user-avatar/job-trigger.js'
      ]);

      this.jobs = {
        build: new window.Services.UserAvatar.JobBuildAvatar(this),
        mount: new window.Services.UserAvatar.JobMountAvatar(this),
        popover: new window.Services.UserAvatar.JobPopover(this),
        position: new window.Services.UserAvatar.JobPosition(this),
        trigger: new window.Services.UserAvatar.JobTrigger(this)
      };
      return this;
    }

    // target: Element or selector, userOrOpts: {src?, name?, alt?, id?} or string src
    render(target, userOrOpts, opts) {
      var cfg = Object.assign({}, this.config, opts || {});
      var id = (cfg.id || (cfg.idPrefix + Date.now() + '-' + Math.floor(Math.random() * 10000)));
      var data = this._normalizeUser(userOrOpts || {});
      var node = this.jobs.build.createAvatar({
        id: id,
        size: cfg.size,
        shape: cfg.shape,
        classRoot: cfg.classRoot,
        altFromName: !!cfg.altFromName,
        nameOverlay: !!cfg.nameOverlay,
        initialsFallback: !!cfg.initialsFallback
      }, data);
      if (cfg.zIndex != null) node.style.zIndex = String(cfg.zIndex);
      this.jobs.mount.applyShape(node, cfg.shape);
      this.jobs.mount.mount(target, node, cfg.classRoot);
      return node;
    }

    update(target, updates) {
      var node = this._resolveNode(target);
      if (!node) return false;
      var cfg = Object.assign({}, this.config); // current base
      // shape は mount 側で適用
      if (updates && Object.prototype.hasOwnProperty.call(updates, 'shape')) {
        var shp = String(updates.shape);
        if (this.ALLOWED_SHAPES[shp]) this.jobs.mount.applyShape(node, shp);
      }
      if (updates && Object.prototype.hasOwnProperty.call(updates, 'size')) {
        cfg.size = Number(updates.size);
      }
      // build 側に委譲
      this.jobs.build.updateAvatar(node, updates || {});
      return true;
    }

    remove(target) {
      var node = this._resolveNode(target);
      if (!node) return false;
      this.jobs.mount.remove(node);
      return true;
    }
    
    showPopover(anchorRef, content, opts)
    {
      var anchor = this._resolveNode(anchorRef);
      if (!anchor) return null;

      var cfg = this._mergePopoverConfig(opts || {});

      // 同一アンカーは一旦閉じる
      var existing = this.popovers.find(function (e) { return e.anchor === anchor; });
      if (existing) this.hidePopover(existing.node);

      var id = cfg.id || (cfg.idPrefix + Date.now() + '-' + Math.floor(Math.random() * 10000));
      var self = this;
      var pop = this.jobs.popover.createPopover({
        id: id,
        role: cfg.role,
        ariaLabel: cfg.ariaLabel,
        content: content,
        trapFocus: cfg.trapFocus,
        onClose: function () { self.hidePopover(pop); }
      });

      document.body.appendChild(pop);
      pop.style.position = 'absolute';
      if (cfg.zIndex != null) pop.style.zIndex = String(cfg.zIndex);

      this.jobs.position.place(pop, anchor, {
        placement: cfg.placement,
        offset: cfg.offset
      });

      this.jobs.trigger.bind(pop, anchor, cfg, function () {
        self.hidePopover(pop);
      }, function () {
        self.jobs.position.place(pop, anchor, {
          placement: cfg.placement,
          offset: cfg.offset
        });
      });

      try {
        anchor.setAttribute('aria-haspopup', cfg.role || 'menu');
        anchor.setAttribute('aria-controls', id);
        anchor.setAttribute('aria-expanded', 'true');
      } catch (e) {}

      var entry = { id: id, node: pop, anchor: anchor, cfg: cfg };
      if (cfg.dismissOnMouseLeave) {
        entry.onMouseLeave = function (ev) {
          var next = ev && ev.relatedTarget;
          if (next && (pop.contains(next) || anchor.contains(next))) {
            return;
          }
          self.hidePopover(pop);
        };
        pop.addEventListener('mouseleave', entry.onMouseLeave, true);
      }
      this.popovers.push(entry);

      if (cfg.trapFocus) {
        this.jobs.popover.focusFirst(pop);
      }

      return pop;
    }

    updatePopover(target, updates) {
      var entry = this._findPopoverEntry(target);
      if (!entry) return false;
      var cfg = Object.assign({}, entry.cfg, updates || {});
      this.jobs.popover.updatePopover(entry.node, updates || {});
      this.jobs.position.place(entry.node, entry.anchor, {
        placement: cfg.placement,
        offset: cfg.offset
      });
      entry.cfg = cfg;
      return true;
    }

    hidePopover(target) {
      var idx = this._findPopoverIndex(target);
      if (idx < 0) return false;

      var entry = this.popovers[idx];
      if (entry && entry.onMouseLeave) {
        entry.node.removeEventListener('mouseleave', entry.onMouseLeave, true);
      }
      this.jobs.trigger.unbind(entry.node);
      this.jobs.popover.removePopover(entry.node);
      try { entry.anchor.setAttribute('aria-expanded', 'false'); } catch (e) {}
      this.popovers.splice(idx, 1);
      return true;
    }

    hideAllPopovers() {
      while (this.popovers.length) {
        var entry = this.popovers.pop();
        if (entry && entry.onMouseLeave) {
          entry.node.removeEventListener('mouseleave', entry.onMouseLeave, true);
        }
        this.jobs.trigger.unbind(entry.node);
        this.jobs.popover.removePopover(entry.node);
        try { entry.anchor.setAttribute('aria-expanded', 'false'); } catch (err) {}
      }
      return true;
    }

    eventUpdate(targets, options) {
      if (!targets) {
        var self = this;
        this._eventTargets.forEach(function (state, el) {
          self.eventUpdate(el, state.originalOptions);
        });
        return false;
      }

      if (typeof targets === 'string') {
        var list = document.querySelectorAll(targets);
        var bound = false;
        for (var i = 0; i < list.length; i++) {
          bound = this.eventUpdate(list[i], options) || bound;
        }
        return bound;
      }

      if (Array.isArray(targets) || (targets && typeof targets.length === 'number' && !targets.nodeType)) {
        var anyBound = false;
        for (var j = 0; j < targets.length; j++) {
          anyBound = this.eventUpdate(targets[j], options) || anyBound;
        }
        return anyBound;
      }

      var el = this._resolveNode(targets);
      if (!el) return null;

      var normalized = this._normalizeEventOptions(options);
      var cfg = this._mergePopoverConfig(normalized);
      var hoverDismissPref = null;
      if (normalized && Object.prototype.hasOwnProperty.call(normalized, 'dismissOnMouseLeave')) {
        hoverDismissPref = normalized.dismissOnMouseLeave;
      }
      if (normalized && normalized.popover && Object.prototype.hasOwnProperty.call(normalized.popover, 'dismissOnMouseLeave')) {
        hoverDismissPref = normalized.popover.dismissOnMouseLeave;
      }
      if (typeof hoverDismissPref === 'boolean') {
        cfg.dismissOnMouseLeave = hoverDismissPref;
      } else {
        cfg.dismissOnMouseLeave = true;
      }
      var state = this._eventTargets.get(el) || { handlers: {} };
      this._unbindEventState(el, state);

      var self = this;
      var showHandler = function () {
        var content = self._createCreatorPopoverContent(el);
        if (typeof normalized.beforeShow === 'function') normalized.beforeShow(el);
        self.showPopover(el, content, cfg);
      };
      var hideHandler = function (ev) {
        var entry = self._findPopoverEntry(el);
        if (ev && ev.relatedTarget && entry && entry.node && entry.node.contains(ev.relatedTarget)) {
          return;
        }
        if (typeof normalized.beforeHide === 'function') normalized.beforeHide(el);
        self.hidePopover(el);
      };

      el.addEventListener('mouseenter', showHandler, true);
      el.addEventListener('focusin', showHandler, true);
      el.addEventListener('mouseleave', hideHandler, true);
      el.addEventListener('focusout', hideHandler, true);

      state.handlers = {
        mouseenter: showHandler,
        focusin: showHandler,
        mouseleave: hideHandler,
        focusout: hideHandler
      };
      state.originalOptions = normalized;
      this._eventTargets.set(el, state);
      return el;
    }

    _resolveAvatarSource(candidate)
    {
      if (!candidate)
      {
        return '';
      }
      if (typeof candidate === 'string')
      {
        return candidate.trim();
      }
      if (typeof candidate !== 'object')
      {
        return '';
      }
      var keys = ['src', 'url', 'href', 'imageUrl', 'imageURL', 'avatarUrl', 'avatarURL', 'photoUrl', 'photoURL'];
      for (var i = 0; i < keys.length; i += 1)
      {
        var key = keys[i];
        if (!Object.prototype.hasOwnProperty.call(candidate, key))
        {
          continue;
        }
        var value = candidate[key];
        if (typeof value === 'string' && value.trim())
        {
          return value.trim();
        }
      }
      return '';
    }

    _normalizeUser(userOrOpts) {
      if (userOrOpts == null) return { src: '', name: '', alt: '' };
      if (typeof userOrOpts === 'string') return { src: userOrOpts, name: '', alt: '' };
      var u = userOrOpts || {};
      var resolvedSrc = this._resolveAvatarSource(u.src)
        || this._resolveAvatarSource(u.avatar)
        || this._resolveAvatarSource(u.avatarUrl)
        || this._resolveAvatarSource(u.avatarURL);
      var fallback = this._resolveAvatarSource(this.config && this.config.fallbackAvatarSrc)
        || '/image/user-avatar.svg';
      if (!resolvedSrc)
      {
        resolvedSrc = fallback;
      }
      return {
        src: resolvedSrc,
        name: (u.name || u.displayName || ''),
        alt: (u.alt || ''),
        isActive: this._isActiveUser(u)
      };
    }

    _isActiveUser(userOrOpts)
    {
      if (!userOrOpts) return true;
      var value = userOrOpts.isActive;
      if (value === false || value === 0 || value === '0' || value === 'false')
      {
        return false;
      }
      return true;
    }

    _resolveNode(target) {
      if (!target) return null;
      if (target && target.nodeType === 1) return target;
      if (typeof target === 'string') return document.querySelector(target);
      if (target && target.id) return document.getElementById(target.id);
      return null;
    }

    _extractPopoverOptions(opts) {
      var popover = {};
      var src = opts && opts.popover;
      if (src && typeof src === 'object') {
        for (var key in src) {
          if (Object.prototype.hasOwnProperty.call(src, key)) {
            popover[key] = src[key];
          }
        }
      }
      var keys = Object.keys(this.POPOVER_DEFAULTS);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (Object.prototype.hasOwnProperty.call(opts, k)) {
          popover[k] = opts[k];
          delete opts[k];
        }
      }
      delete opts.popover;
      return popover;
    }

    _mergePopoverConfig(overrides) {
      var cfg = Object.assign({}, this.popoverConfig);
      if (!overrides) return cfg;
      if (typeof overrides === 'object') {
        var src = overrides.popover && typeof overrides.popover === 'object' ? overrides.popover : null;
        if (src) {
          for (var key in src) {
            if (Object.prototype.hasOwnProperty.call(src, key)) {
              cfg[key] = src[key];
            }
          }
        }
        var keys = Object.keys(this.POPOVER_DEFAULTS);
        for (var i = 0; i < keys.length; i++) {
          var k = keys[i];
          if (Object.prototype.hasOwnProperty.call(overrides, k)) {
            cfg[k] = overrides[k];
          }
        }
      }
      return cfg;
    }

    _findPopoverEntry(target) {
      if (!this.popovers.length) return null;
      if (!target) return this.popovers[this.popovers.length - 1];
      if (typeof target === 'string') {
        return this.popovers.find(function (e) { return e.id === target; });
      }
      var node = null;
      if (target && target.nodeType === 1) node = target;
      else if (target && target.node && target.node.nodeType === 1) node = target.node;
      if (!node) return null;
      return this.popovers.find(function (e) { return e.node === node || e.anchor === node; });
    }

    _findPopoverIndex(target) {
      if (!this.popovers.length) return -1;
      if (!target) return this.popovers.length - 1;
      if (typeof target === 'string') {
        return this.popovers.findIndex(function (e) { return e.id === target; });
      }
      var node = null;
      if (target && target.nodeType === 1) node = target;
      else if (target && target.node && target.node.nodeType === 1) node = target.node;
      if (!node) return -1;
      return this.popovers.findIndex(function (e) { return e.node === node || e.anchor === node; });
    }

    _normalizeEventOptions(options)
    {
      if (options == null) return {};
      if (Array.isArray(options)) return { content: options };
      if (typeof options === 'object') return Object.assign({}, options);
      return { content: options };
    }

    _createCreatorPopoverContent(anchor)
    {
      if (!anchor) return null;
      var doc = this._doc || document;
      var container = doc.createElement('div');
      container.className = '__user-popover';

      var name = anchor.getAttribute('data-user-display')
        || anchor.getAttribute('data-user-name')
        || anchor.getAttribute('data-user-code')
        || '不明なユーザー';
      var code = anchor.getAttribute('data-user-code') || '';
      var tooltip = anchor.getAttribute('data-user-tooltip') || '';
      var type = anchor.getAttribute('data-user-type') || '';
      var role = (anchor.getAttribute('data-user-role') || '').trim();
      var isActiveAttr = anchor.getAttribute('data-user-active');
      var isActive = !(isActiveAttr === 'false' || isActiveAttr === '0' || isActiveAttr === 'no');
      var identity = doc.createElement('div');
      identity.className = '__user-popover-identity';

      var avatarWrapper = doc.createElement('span');
      avatarWrapper.className = '__user-popover-avatar';
      var avatarSource = '';
      var avatarAlt = '';
      var fallbackAvatarSrc = (this.config && this.config.fallbackAvatarSrc) || '/image/user-avatar.svg';
      var anchorAvatarSrc = (anchor.getAttribute('data-avatar-src') || anchor.getAttribute('data-avatar-url') || '').trim();
      var anchorAvatarAlt = (anchor.getAttribute('data-avatar-alt') || anchor.getAttribute('aria-label') || '').trim();
      if (anchorAvatarSrc) avatarSource = anchorAvatarSrc;
      if (anchorAvatarAlt) avatarAlt = anchorAvatarAlt;
      var avatarNode = anchor.querySelector('[data--creator-avatar]');
      if (avatarNode) {
        if (!avatarSource) {
          avatarSource = (avatarNode.getAttribute('data-avatar-src') || '').trim();
        }
        if (!avatarAlt) {
          avatarAlt = (avatarNode.getAttribute('data-avatar-alt') || '').trim();
        }
      }
      if (!avatarAlt) avatarAlt = name || code || '';
      var img = doc.createElement('img');
      var resolvedAvatarSrc = avatarSource || fallbackAvatarSrc;
      img.src = resolvedAvatarSrc;
      img.alt = avatarAlt;
      img.loading = 'lazy';
      if (avatarSource) {
        img.onerror = function () {
          if (img.__uaFallbackApplied) return;
          img.__uaFallbackApplied = true;
          img.src = fallbackAvatarSrc;
        };
      }
      avatarWrapper.appendChild(img);
      identity.appendChild(avatarWrapper);

      var info = doc.createElement('div');
      info.className = '__user-popover-info';
      var heading = doc.createElement('div');
      heading.className = '__user-popover-name';
      heading.textContent = name;
      info.appendChild(heading);

      if (isActive === false) {
        var status = doc.createElement('div');
        status.className = '__user-popover-status is-inactive';
        status.textContent = '非アクティブ';
        info.appendChild(status);
      }

      if (code) {
        var codeEl = doc.createElement('div');
        codeEl.className = '__user-popover-code';
        codeEl.textContent = code;
        info.appendChild(codeEl);
      }

      var metaText = '';
      if (role) {
        metaText = 'ロール: ' + role;
      } else if (type === 'group') {
        metaText = '種別: グループ';
      }
      if (metaText) {
        var metaEl = doc.createElement('div');
        metaEl.className = '__user-popover-meta';
        metaEl.textContent = metaText;
        info.appendChild(metaEl);
      }

      identity.appendChild(info);
      container.appendChild(identity);

      if (tooltip && tooltip !== name) {
        var desc = doc.createElement('div');
        desc.className = '__user-popover-desc';
        desc.textContent = tooltip;
        container.appendChild(desc);
      }

      return container;
    }    

    _unbindEventState(el, state) {
      if (!state || !state.handlers) return;
      if (state.handlers.mouseenter) el.removeEventListener('mouseenter', state.handlers.mouseenter, true);
      if (state.handlers.focusin) el.removeEventListener('focusin', state.handlers.focusin, true);
      if (state.handlers.mouseleave) el.removeEventListener('mouseleave', state.handlers.mouseleave, true);
      if (state.handlers.focusout) el.removeEventListener('focusout', state.handlers.focusout, true);
      state.handlers = {};
    }
  }

  var preserved = null;
  if (window.Services && window.Services.UserAvatar && typeof window.Services.UserAvatar === 'object')
  {
    preserved = {
      JobBuildAvatar: window.Services.UserAvatar.JobBuildAvatar,
      JobMountAvatar: window.Services.UserAvatar.JobMountAvatar,
      JobPopover: window.Services.UserAvatar.JobPopover,
      JobPosition: window.Services.UserAvatar.JobPosition,
      JobTrigger: window.Services.UserAvatar.JobTrigger
    };
  }

  window.Services = window.Services || {};
  window.Services.UserAvatar = UserAvatarService;

  if (preserved)
  {
    if (preserved.JobBuildAvatar) UserAvatarService.JobBuildAvatar = preserved.JobBuildAvatar;
    if (preserved.JobMountAvatar) UserAvatarService.JobMountAvatar = preserved.JobMountAvatar;
    if (preserved.JobPopover) UserAvatarService.JobPopover = preserved.JobPopover;
    if (preserved.JobPosition) UserAvatarService.JobPosition = preserved.JobPosition;
    if (preserved.JobTrigger) UserAvatarService.JobTrigger = preserved.JobTrigger;
  }

})(window, document);
