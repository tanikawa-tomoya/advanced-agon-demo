(function () {
  'use strict';

  class HelpModalService
  {
    constructor(options) {
      this.options = options || {};
      this.config = null;
      this.jobs = null;
      this._region = null;
      this._current = null; // { overlay, dialog, backdrop, escHandler, prevActive }
      this._roleFlags = null;
      this._historyHandler = null;
      this._historyDepth = 0;
      this._ignorePopstateCount = 0;
      this._closingFromHistory = false;
      this.initConfig();
    }

    initConfig()
    {
      const DEFAULTS = {
        position: 'center',       // 表示位置（領域クラスに反映）
        closeOnBackdrop: true,    // バックドロップクリックで閉じる
        closeOnEsc: true,         // ESCキーで閉じる
        focusTrap: true,          // フォーカストラップ
        zIndex: 10000,            // ベースの z-index
        idPrefix: 'helpmodal-',
        ariaLabelClose: 'Close',
        container: null,          // 未指定は body
        overlayClassName: 'c-help-modal',
        contentClassName: 'c-help-modal__content',
        showWatermark: true,      // HELP 透かしの表示有無
        defaultSanitizeFn: null
      };
      this.config = Object.assign({}, DEFAULTS, this.options || {});
    }

    _hasOpenModal()
    {
      return this.isOpen();
    }

    _ensureHistoryListener()
    {
      if (this._historyHandler) return;
      var self = this;
      this._historyHandler = function () {
        if (self._ignorePopstateCount > 0)
        {
          self._ignorePopstateCount--;
          return;
        }
        if (self._historyDepth > 0 && self._hasOpenModal())
        {
          self._historyDepth--;
          self._closingFromHistory = true;
          self.dismiss();
          self._closingFromHistory = false;
          self._teardownHistoryIfIdle();
        }
      };
      window.addEventListener('popstate', this._historyHandler);
    }

    _teardownHistoryIfIdle()
    {
      if (!this._hasOpenModal() && this._historyDepth <= 0 && this._historyHandler)
      {
        window.removeEventListener('popstate', this._historyHandler);
        this._historyHandler = null;
        this._ignorePopstateCount = 0;
        this._historyDepth = 0;
      }
    }

    _pushHistoryState()
    {
      this._ensureHistoryListener();
      history.pushState({ modal: 'help' }, document.title, window.location.href);
      this._historyDepth++;
    }

    _popHistorySilently(count)
    {
      var steps = (typeof count === 'number' && count > 0) ? count : 1;
      for (var i = 0; i < steps && this._historyDepth > 0; i++)
      {
        this._historyDepth--;
        this._ignorePopstateCount++;
        history.back();
      }
      this._teardownHistoryIfIdle();
    }
    
    async boot()
    {
      await window.Utils.loadScriptsSync([
        'js/service-app/help-modal/job-build-modal.js',
        'js/service-app/help-modal/job-region.js',
        'js/service-app/help-modal/job-focus.js',
        'js/service-app/help-modal/job-scroll.js'
      ]);
      
      var helpModalNS = window.Services && window.Services.HelpModal;
      this.jobs = {
        build: new helpModalNS.JobBuildModal(this),
        region: new helpModalNS.JobRegion(this),
        focus: new helpModalNS.JobFocus(this),
        scroll: new helpModalNS.JobScroll(this)
      };
      return this;
    }

    // content: string | { title, text, html, sanitizeFn, actions[], closeAriaLabel, roleVariants }
    show(content, opts) {
      opts = opts || {};
      var cfg = Object.assign({}, this.config, opts);

      var container = this.jobs.region.resolveContainer(cfg.container || document.body);
      var region = this.jobs.region.ensureRegion(container, cfg.position, cfg.zIndex);

      // 単一表示: 既存があれば閉じる
      if (this._current && this._current.overlay) {
        this.dismiss();
      }

      var id = (cfg.idPrefix || 'helpmodal-') + Date.now() + '-' + Math.floor(Math.random() * 100000);
      var normalized = this._normalizeContent(content, cfg);

      var built = this.jobs.build.buildModal({
        id: id,
        titleText: normalized.title || '',
        text: normalized.text,
        html: normalized.html,
        sanitizeFn: normalized.sanitizeFn,
        actions: normalized.actions,
        closeAriaLabel: normalized.closeAriaLabel || cfg.ariaLabelClose || 'Close',
        overlayClassName: cfg.overlayClassName,
        contentClassName: cfg.contentClassName,
        showWatermark: cfg.showWatermark
      });

      var overlay = built.overlay;
      var dialog  = built.dialog;
      var backdrop = built.backdrop;

      // バックドロップクリック
      if (cfg.closeOnBackdrop && backdrop) {
        backdrop.addEventListener('mousedown', (ev) => {
          if (ev.target === backdrop) this.dismiss();
        }, true);
      }

      // ESC クローズ
      var escHandler = null;
      if (cfg.closeOnEsc) {
        escHandler = (ev) => {
          ev = ev || window.event;
          var key = ev.key || ev.keyCode;
          if (key === 'Escape' || key === 'Esc' || key === 27) {
            ev.preventDefault && ev.preventDefault();
            this.dismiss();
          }
        };
        document.addEventListener('keydown', escHandler, true);
      }

      // マウント & フォーカス管理 & スクロールロック
      this.jobs.region.mount(region, overlay, cfg.zIndex);
      this.jobs.scroll.lock();
      var prevActive = document.activeElement;
      if (cfg.focusTrap) this.jobs.focus.trap(dialog);

      // 初期フォーカス
      this.jobs.build.requestFrame(function () {
        try { dialog.setAttribute('tabindex', '-1'); dialog.focus(); } catch (e) {}
      });

      // 状態保持
      this._current = { overlay: overlay, dialog: dialog, backdrop: backdrop, escHandler: escHandler, prevActive: prevActive, container: container };
      this._pushHistoryState();
      return dialog;
    }

    dismiss() {
      var cur = this._current;
      if (!cur || !cur.overlay) return false;

      // イベント解除
      if (cur.escHandler) document.removeEventListener('keydown', cur.escHandler, true);

      // フォーカス解除
      this.jobs.focus.release(cur.dialog);

      // アンマウント
      this.jobs.region.unmount(cur.overlay);

      // スクロール解除（カウントがずれていても確実に解除する）
      this.jobs.scroll.unlockAll();

      // フォーカス戻し
      try { if (cur.prevActive && typeof cur.prevActive.focus === 'function') cur.prevActive.focus(); } catch (e) {}

      this._current = null;

      // 空リージョンを片付け
      var region = this.jobs.region.getRegion(cur.container);
      if (region && this.jobs.region.isRegionEmpty(region)) {
        this.jobs.region.removeRegion(region);
      }
      if (!this._closingFromHistory)
      {
        this._popHistorySilently(1);
      }
      else
      {
        this._teardownHistoryIfIdle();
      }
      return true;
    }

    isOpen() {
      return !!(this._current && this._current.overlay);
    }

    _normalizeContent(content, cfg) {
      if (content == null) return { title: '', text: '' };

      // roleVariants がある場合はユーザー属性に応じて振り分け
      var selected = this._selectRoleVariant(content, cfg);

      if (typeof selected === 'string') return { title: '', text: String(selected) };
      var o = (typeof selected === 'object') ? selected : { text: String(selected) };
      var out = {
        title: (typeof o.title === 'string') ? o.title : '',
        closeAriaLabel: (typeof o.closeAriaLabel === 'string') ? o.closeAriaLabel : undefined
      };
      if (typeof o.html === 'string') {
        out.html = o.html;
        if (typeof o.sanitizeFn === 'function') out.sanitizeFn = o.sanitizeFn;
        else if (typeof cfg.sanitizeFn === 'function') out.sanitizeFn = cfg.sanitizeFn;
        else if (typeof cfg.defaultSanitizeFn === 'function') out.sanitizeFn = cfg.defaultSanitizeFn;
      } else if (typeof o.text === 'string') {
        out.text = o.text;
      }
      if (Array.isArray(o.actions)) out.actions = o.actions;
      return out;
    }

    _selectRoleVariant(content, cfg)
    {
      if (!content || typeof content !== 'object' || !content.roleVariants)
      {
        return content;
      }

      var variants = content.roleVariants || {};
      var flags = (cfg && cfg.roleFlags) || content.roleFlags || {};
      var isPrivileged = !!(flags && (flags.isOperator || flags.isSupervisor));

      if (isPrivileged && variants.admin)
      {
        return variants.admin;
      }
      if (!isPrivileged && variants.user)
      {
        return variants.user;
      }
      return variants.default || variants.admin || variants.user || content;
    }

    async resolveSessionRoleFlags()
    {
      if (this._roleFlags)
      {
        return this._roleFlags;
      }

      var service = window.Services && window.Services.sessionInstance;
      var profile = null;

      if (service && typeof service.getUser === 'function')
      {
        profile = await service.getUser();
      }
      if (!profile && service && typeof service.loadFromStorage === 'function')
      {
        profile = await service.loadFromStorage();
      }
      if (!profile && service && typeof service.syncFromServer === 'function')
      {
        profile = await service.syncFromServer();
      }

      var normalizedRoles = this._normalizeProfileRoles(profile);
      var hasSupervisorRole = normalizedRoles.some(function (role)
      {
        return role === 'supervisor' || role.indexOf('supervisor') !== -1;
      });
      var hasOperatorRole = normalizedRoles.some(function (role)
      {
        return role === 'operator' || role.indexOf('operator') !== -1;
      });

      this._roleFlags = {
        isSupervisor: hasSupervisorRole || this._normalizeRoleFlag(profile && profile.isSupervisor),
        isOperator: hasOperatorRole || this._normalizeRoleFlag(profile && profile.isOperator)
      };

      return this._roleFlags;
    }

    _normalizeProfileRoles(profile)
    {
      var roles = [];
      if (profile && Array.isArray(profile.roles))
      {
        roles = profile.roles.slice();
      }
      if (profile && typeof profile.role === 'string')
      {
        roles.push(profile.role);
      }
      if (profile && typeof profile.primaryRole === 'string')
      {
        roles.push(profile.primaryRole);
      }
      return roles.map(function (role)
      {
        return String(role || '').trim().toLowerCase();
      }).filter(function (role)
      {
        return !!role;
      });
    }

    _normalizeRoleFlag(flag)
    {
      if (flag === undefined || flag === null)
      {
        return false;
      }
      if (typeof flag === 'string')
      {
        var normalized = flag.trim().toLowerCase();
        return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
      }
      return !!flag;
    }
  }

  window.Services = window.Services || {};
  window.Services.HelpModal = HelpModalService;

})(window, document);
