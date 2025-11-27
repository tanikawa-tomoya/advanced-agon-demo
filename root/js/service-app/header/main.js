
(function () {

  'use strict';

  let accountMenuId = 0;

  /**
   * HeaderService はセッションサービスからユーザ情報を取得し、取得結果で描画を更新する。
   */
  class HeaderService
  {
    constructor(options)
    {
      this.options = options;
      this.config = {};
      this.ANONYMOUS_PROFILE = Object.freeze({
        loggedIn: false,
        name: '',
        role: '',
        avatar: null
      });
      this.contactService = null;
      this._contactReady = null;
    }

    async boot(selector)
    {
      this.initConfig();

      await window.Utils.loadScriptsSync([
         "/js/service-app/header/job-userarea.js",
         "/js/service-app/header/job-menu.js",
         "/js/service-app/header/job-logout.js",
         "/js/service-app/header/job-logo.js",
         "/js/service-app/header/job-view.js"
      ]);            
      
      this.jobUserArea = new window.Services.header.JobUserArea(this);      
      this.jobMenu = new window.Services.header.JobMenu(this);
      this.jobLogout = new window.Services.header.JobLogout(this);
      this.jobLogo = new window.Services.header.JobLogo(this);
      this.jobView = new window.Services.header.JobView(this);

      await this.ensureContactService();
      
      const hasCustomMenu = this.options && Array.isArray(this.options.menu);
      this._hasCustomMenu = Boolean(hasCustomMenu);
      this._userPromise = null;
      this._sessionService = null;
      this._currentUser = null;
      // ログアウト状態で使用するログインリンクのテンプレートHTML
      this._loginLinkTemplateHtml = null;
      const rawOptions = Object.assign({}, this.options || {});
      if (Object.prototype.hasOwnProperty.call(rawOptions, 'user')) {
        delete rawOptions.user;
      }
      this.config = Object.assign({}, this.DEFAULTS, rawOptions);
      this.config.accountEditHref = this._resolveAccountEditHref(this.config.accountEditHref);
      this.config.logout = this._mergeLogoutOptions(this.config.logout);
      if (this._hasCustomMenu) {
        this.config.menu = this.jobMenu.cloneMenu(this.config.menu);
      } else {
        this.config.menu = this.jobMenu.cloneMenu(this.DEFAULTS.menu || []);
      }
      this._$root = null;
      this._mounted = false;
      this.config.display = this._mergeDisplayOptions(this.config.display);
      this._display = Object.assign({}, this.config.display);
      if (this.config.forceLoginLink === true) {
        this.config.display.forceLoginButton = true;
        this._display.forceLoginButton = true;
      }
      this.applyOptions(rawOptions);
      this.mount(selector);

      try {
        await this.loadInitialUser();
      } catch (err) {
        // console.error('[header] failed to resolve initial user', err);
      }
    }

    async restart(selector)
    {
      this._$root = null;
      this._mounted = false;
      this._userPromise = null;
      this._currentUser = null;
      this._loginLinkTemplateHtml = null;
      return this.boot(selector || this.config.mountSelector);
    }

    ensureContactService()
    {
      if (this._contactReady) { return this._contactReady; }
      this._contactReady = window.Utils.loadScriptsSync([
        '/js/service-app/contact/main.js'
      ]).then(() => {
        const svc = new window.Services.Contact({});
        this.contactService = svc;
        return svc.boot();
      }).then(() => {
        return this.contactService;
      }).catch((err) => {
        this._contactReady = null;
        throw err;
      });
      return this._contactReady;
    }

    async openContactModal()
    {
      const svc = await this.ensureContactService();
      return svc.open({ user: this._currentUser });
    }

    bindContactAction($elements)
    {
      if (!$elements || $elements.length === 0)
      {
        return;
      }
      const ns = '.contactAction';
      const service = this;
      $elements.each(function () {
        const $el = $(this);
        $el.off(ns).on('click' + ns, async function (event) {
          event.preventDefault();
          try
          {
            await service.openContactModal();
          }
          catch (err)
          {
            // eslint-disable-next-line no-console
            console.error('[header] failed to open contact modal', err);
          }
        });
      });
    }

    _mergeLogoutOptions(options) {
      const defaults = this.DEFAULTS.logout || {};
      const src = options && typeof options === 'object' ? options : {};
      const merged = Object.assign({}, defaults, src);
      merged.endpoint = defaults.endpoint || window.Utils.getApiEndpoint();
      merged.method = defaults.method || 'POST';
      merged.requestType = defaults.requestType || 'Session';
      merged.type = defaults.type || 'Logout';
      merged.redirectUrl = defaults.redirectUrl || '/login.html';
      merged.label = defaults.label;
      
      return merged;
    }

    _hasRoleName(user, names) {
      if (!user) { return false; }
      const sources = [user.role, user.roleName, user.roleLabel].filter((value) => {
        return typeof value === 'string' && value;
      });
      if (sources.length === 0) { return false; }
      for (let i = 0; i < sources.length; i++) {
        const roleName = String(sources[i]).toLowerCase();
        for (let j = 0; j < names.length; j++) {
          const target = String(names[j]).toLowerCase();
          if (roleName === target || roleName.indexOf(target) >= 0) { return true; }
        }
      }
      return false;
    }

    _isContentsManagementEnabled(user) {
      if (!user) { return true; }
      const value = (typeof user.useContentsManagement !== 'undefined')
        ? user.useContentsManagement
        : user.use_contents_management;
      if (typeof value === 'undefined') { return true; }
      if (value === true || value === 1 || value === '1') { return true; }
      if (typeof value === 'string') {
        const normalized = value.toLowerCase();
        return normalized === 'true' || normalized === 'yes' || normalized === 'on';
      }
      return false;
    }

    _normalizeRoleFlag(value)
    {
      if (value === true || value === 1 || value === '1') { return true; }
      if (typeof value === 'string') {
        const normalized = value.toLowerCase();
        return normalized === 'true' || normalized === 'yes' || normalized === 'on';
      }
      return false;
    }

    _cloneMenu(items) {
      if (this.jobMenu && typeof this.jobMenu.cloneMenu === 'function') {
        return this.jobMenu.cloneMenu(items);
      }
      const src = Array.isArray(items) ? items : [];
      const cloned = [];
      for (let i = 0; i < src.length; i += 1) {
        const it = src[i] || {};
        cloned.push({
          key: it.key || '',
          label: it.label || '',
          href: it.href || '#'
        });
      }
      return cloned;
    }

    _filterContentsMenu(items, allowContents) {
      const cloned = this._cloneMenu(items);
      if (allowContents) {
        return cloned;
      }
      const filtered = [];
      for (let i = 0; i < cloned.length; i += 1) {
        const it = cloned[i] || {};
        const key = (it.key || '').toString().toLowerCase();
        const href = (it.href || '').toString();
        if (key === 'contents') { continue; }
        if (href.indexOf('/contents') === 0) { continue; }
        filtered.push(it);
      }
      return filtered;
    }

    _mergeDisplayOptions(options) {
      const defaults = this.DEFAULTS.display || {};
      const raw = options && typeof options === 'object' ? options : {};
      const result = {
        forceLoginButton: Boolean(
          Object.prototype.hasOwnProperty.call(raw, 'forceLoginButton')
            ? raw.forceLoginButton
            : defaults.forceLoginButton
        ),
        hideLoginButton: Boolean(
          Object.prototype.hasOwnProperty.call(raw, 'hideLoginButton')
            ? raw.hideLoginButton
            : defaults.hideLoginButton
        )
      };
      if (Object.prototype.hasOwnProperty.call(raw, 'showUserInfoWhenLoggedIn')) {
        result.showUserInfoWhenLoggedIn = raw.showUserInfoWhenLoggedIn !== false;
      } else {
        result.showUserInfoWhenLoggedIn = defaults.showUserInfoWhenLoggedIn !== false;
      }
      return result;
    }

    resolveDefaultAccountEditHref()
    {
      const defaults = this.DEFAULTS || {};
      if (typeof defaults.accountEditHref === 'string' && defaults.accountEditHref.trim().length > 0) {
        return defaults.accountEditHref.trim();
      }
      return 'account-settings.html';
    }

    resolveAccountEditHref(source)
    {
      if (typeof source === 'string' && source.trim().length > 0) {
        return source.trim();
      }
      if (source && typeof source === 'object') {
        if (typeof source.accountEditHref === 'string' && source.accountEditHref.trim().length > 0) {
          return source.accountEditHref.trim();
        }
        if (typeof source.href === 'string' && source.href.trim().length > 0) {
          return source.href.trim();
        }
      }
      return this.resolveDefaultAccountEditHref();
    }

    _resolveAccountEditHref(source)
    {
      return this.resolveAccountEditHref(source);
    }

    getSessionService()
    {
      if (this._sessionService) { return this._sessionService; }
      const instance = window.Services.sessionInstance;
      this._sessionService = instance;
      return this._sessionService;
    }

    fetchUserFromSessionService()
    {
      let service;
      try {
        service = this.getSessionService();
      } catch (err) {
        return Promise.reject(err);
      }
      let result;
      try {
        result = service.getUser();
      } catch (err2) {
        return Promise.reject(err2);
      }
      return Promise.resolve(result);
    }

    /**
     * 初回ユーザ情報の取得と描画。
     * フロー:
     * 1. セッションサービスから取得し、結果で描画を更新。
     */
    loadInitialUser()
    {
      if (this._userPromise) { return this._userPromise; }
      this._userPromise = this.fetchUserFromSessionService().then((user) => {
        this.setUser(user, { normalize: true });
        if (!user || typeof user !== 'object') {
          return null;
        }
        return user;
      }).catch((err) => {
        this._userPromise = null;
        throw err;
      });
      return this._userPromise;
    }

    resolveMenuByRole(user)
    {
      const presets = this.MENU_PRESETS || {};
      const isSupervisor = this._normalizeRoleFlag(user && user.isSupervisor)
        || this._hasRoleName(user, ['supervisor']);
      const isOperator = this._normalizeRoleFlag(user && user.isOperator)
        || this._hasRoleName(user, ['operator'])
        || isSupervisor;
      const allowContents = this._isContentsManagementEnabled(user);

      if (isSupervisor && presets.supervisor) {
        return this._filterContentsMenu(presets.supervisor, allowContents);
      }
      if (isOperator && presets.operator) {
        return this._filterContentsMenu(presets.operator, allowContents);
      }
      if (presets.general) {
        return this._filterContentsMenu(presets.general, allowContents);
      }
      return this._filterContentsMenu(this.DEFAULTS.menu || [], allowContents);
    }

    isLoggedInUser(user)
    {
      if (!user || typeof user !== 'object') {
        return false;
      }
      if (typeof user.loggedIn === 'boolean') {
        return user.loggedIn;
      }
      const keys = Object.keys(user);
      if (keys.length === 0) {
        return false;
      }
      return true;
    }

    /**
     * サイトヘッダーを指定要素へマウントし、初期状態を描画する。
     * 副作用: DOM 初期化、スタイルシート挿入、ユーザー情報の取得要求、p5.js によるロゴ描画。
     *
     * @param {string|HTMLElement|JQuery} [selector] マウント対象。省略時は config.mountSelector を利用。
     * @returns {HeaderService} 自身のインスタンス。
     */
    mount(selector) {
      const sel = selector || this.config.mountSelector;
      const $root = $(sel);
      if ($root.length === 0) {
        console.error('[header] .site-header not found:', sel);
        return this;
      }
      this._$root = $root;

      // CSSを注入
      this.jobView.ensureStylesheet(this.config.stylesheetHref);

      // 既存HTMLの器をそのまま利用
      const S = this.SELECTORS;
      // 初期HTMLにログインリンクが存在しない場合に使う既定アンカー
      const fallbackLoginLink = '<a class="site-header__cta" href="login.html">ログイン</a>';
      const initialLoginLink = $root.find(S.loginLink).first();
      this._loginLinkTemplateHtml = initialLoginLink.length > 0
        ? initialLoginLink.prop('outerHTML')
        : fallbackLoginLink;
      this._mounted = true;

      this.jobView.renderLoggedOutHeader(null);

      // メニューの開閉
      this.jobMenu.renderUserMenu($root, S);

      this.loadInitialUser().catch((err) => {
        // console.error('[header] failed to load user profile:', err);
      });

      // ロゴ（p5）
      const $logo = $root.find(S.logo);
      const label = $logo.attr('data-logo-label') || 'ADVANCED';
      this.jobLogo.drawLogoWithP5($logo, { src: this.config.p5.src, label: label, fontSize: this.config.p5.fontSize });

      return this;
    }

    /**
     * メニュー構成を外部入力で差し替えて再描画する。
     * 副作用: DOM 上のナビゲーションリンクを再生成する。
     *
     * @param {Array<Object>} items 表示するメニュー項目の配列。
     * @returns {HeaderService} 自身のインスタンス。
     */
    setMenu(items) {
      if (!this._mounted) { return this; }
      const allowContents = this._isContentsManagementEnabled(this._currentUser);
      const menuItems = this._filterContentsMenu(items, allowContents);
      this.config.menu = this._cloneMenu(menuItems);
      this.jobMenu.renderMenu(this.config.menu);
      return this;
    }

    /**
     * ユーザー情報を更新し、ログイン状態に応じたヘッダー表示へ切り替える。
     * フロー: 1) ログイン判定 2) メニュー再構築 3) ユーザー領域 DOM 更新。
     * 副作用: DOM のユーザー表示とメニューを再描画し、内部状態のユーザー情報を更新する。
     *
     * @param {Object|null} user ユーザー情報。null/undefined で未ログイン扱い。
     * @returns {HeaderService} 自身のインスタンス。
     */
    setUser(user, options) {
      const opts = options || {};
      const profile = opts.normalize === true ? this.normalizeUserProfile(user) : user;
      this._currentUser = typeof profile === 'undefined' ? null : profile;
      if (!this._mounted) { return this; }
      const display = this._display || this._mergeDisplayOptions(null);
      if (display.hideLoginButton) {
        if (display.showUserInfoWhenLoggedIn && this.isLoggedInUser(this._currentUser)) {
          this.jobView.renderLoggedInHeader(this._currentUser);
          this.jobView.removeLoginElements();
        } else {
          this.jobView.renderLoginHiddenState(this._currentUser);
        }
        return this;
      }
      if (display.forceLoginButton) {
        this.jobView.renderLoggedOutHeader(null);
        return this;
      }
      if (display.showUserInfoWhenLoggedIn && this.isLoggedInUser(this._currentUser)) {
        this.jobView.renderLoggedInHeader(this._currentUser);
      } else {
        this.jobView.renderLoggedOutHeader(this._currentUser);
      }
      return this;
    }

    applyOptions(options) {
      const opts = options && typeof options === 'object' ? options : null;
      if (!opts) { return this; }
      let nextDisplay = this._mergeDisplayOptions(Object.assign({}, this._display));
      let shouldUpdateUserArea = false;
      if (Object.prototype.hasOwnProperty.call(opts, 'display')) {
        const merged = Object.assign({}, nextDisplay, opts.display || {});
        nextDisplay = this._mergeDisplayOptions(merged);
      }
      if (Object.prototype.hasOwnProperty.call(opts, 'forceLoginLink')) {
        nextDisplay.forceLoginButton = Boolean(opts.forceLoginLink);
      }
      if (Object.prototype.hasOwnProperty.call(opts, 'hideLoginButton')) {
        nextDisplay.hideLoginButton = Boolean(opts.hideLoginButton);
      }
      if (Object.prototype.hasOwnProperty.call(opts, 'showLoginButtonAlways')) {
        nextDisplay.forceLoginButton = Boolean(opts.showLoginButtonAlways);
      }
      if (Object.prototype.hasOwnProperty.call(opts, 'showLoginButtonNever')) {
        nextDisplay.hideLoginButton = Boolean(opts.showLoginButtonNever);
      }
      if (Object.prototype.hasOwnProperty.call(opts, 'showUserInfoWhenLoggedIn')) {
        nextDisplay.showUserInfoWhenLoggedIn = opts.showUserInfoWhenLoggedIn !== false;
      }
      if (Object.prototype.hasOwnProperty.call(opts, 'accountEditHref')) {
        const nextHref = this.resolveAccountEditHref(opts.accountEditHref);
        if (this.config.accountEditHref !== nextHref) {
          this.config.accountEditHref = nextHref;
          shouldUpdateUserArea = true;
        }
      }
      if (Object.prototype.hasOwnProperty.call(opts, 'logout')) {
        const nextLogout = this._mergeLogoutOptions(opts.logout);
        const current = this.config.logout || {};
        const before = JSON.stringify(current);
        const after = JSON.stringify(nextLogout);
        if (before !== after) {
          this.config.logout = nextLogout;
          shouldUpdateUserArea = true;
        }
      }
      const changed = this._display.forceLoginButton !== nextDisplay.forceLoginButton
            || this._display.hideLoginButton !== nextDisplay.hideLoginButton
            || this._display.showUserInfoWhenLoggedIn !== nextDisplay.showUserInfoWhenLoggedIn;
      if (changed) {
        this._display = nextDisplay;
        this.config.display = Object.assign({}, nextDisplay);
        this.config.forceLoginLink = this._display.forceLoginButton;
      }
      if ((changed || shouldUpdateUserArea) && this._mounted) {
        this.setUser(this._currentUser);
      }
      return this;
    }

    attachAccountMenuEvents($account, options)
    {
      if (!$account || $account.length === 0)
      {
        return;
      }
      const $btn = $account.find('.site-header__account-btn');
      const $menu = $account.find('.site-header__account-menu');
      if ($btn.length === 0 || $menu.length === 0)
      {
        return;
      }
      const service = this;
      const doc = $(document);
      const logoutCfg = options && options.logout ? options.logout : {};
      const prevNs = $account.data('accountMenuNs');
      const prevHandler = $account.data('accountMenuDocHandler');
      if (prevNs && prevHandler)
      {
        doc.off('click' + prevNs, prevHandler);
      }
      const ns = prevNs || ('.accountMenu' + (++accountMenuId));

      let closeTimer = null;

      function clearCloseTimer()
      {
        if (closeTimer !== null)
        {
          window.clearTimeout(closeTimer);
          closeTimer = null;
        }
      }

      function closeMenu()
      {
        clearCloseTimer();
        if (!$account.hasClass('is-open'))
        {
          return;
        }
        $account.removeClass('is-open');
        $btn.attr('aria-expanded', 'false');
        doc.off('click' + ns, handleDocClick);
      }

      function scheduleClose()
      {
        clearCloseTimer();
        closeTimer = window.setTimeout(function () {
          closeMenu();
        }, 150);
      }

      function handleDocClick(event)
      {
        const el = $account.get(0);
        if (!el) {
          return;
        }
        if (el.contains(event.target)) {
          return;
        }
        closeMenu();
      }

      function openMenu()
      {
        clearCloseTimer();
        if ($account.hasClass('is-open'))
        {
          return;
        }
        $account.addClass('is-open');
        $btn.attr('aria-expanded', 'true');
        doc.on('click' + ns, handleDocClick);
      }

      $account.off(ns);
      $btn.off(ns);
      $menu.off(ns);
      const $logout = $account.find('[data-account-logout="1"]');
      $logout.off(ns);
      const $contact = $account.find('[data-account-contact="1"]');
      $contact.off(ns);

      $account.data('accountMenuNs', ns);
      $account.data('accountMenuDocHandler', handleDocClick);

      $account.on('mouseenter' + ns, openMenu);
      $account.on('mouseleave' + ns, scheduleClose);
      $btn.on('click' + ns, function (event) {
        event.preventDefault();
        if ($account.hasClass('is-open')) {
          closeMenu();
        } else {
          openMenu();
        }
      });
      $btn.on('focusin' + ns, openMenu);
      $account.on('focusout' + ns, function (event) {
        const el = $account.get(0);
        if (!el)
        {
          return;
        }
        const related = event.relatedTarget;
        if (!related || !el.contains(related))
        {
          closeMenu();
        }
      });
      $account.on('keyup' + ns, function (event) {
        if (event.key === 'Escape' || event.key === 'Esc')
        {
          closeMenu();
          $btn.trigger('focus');
        }
      });
      $contact.on('click' + ns, async function (event) {
        event.preventDefault();
        closeMenu();
        try
        {
          await service.openContactModal();
        }
        catch (err)
        {
          // eslint-disable-next-line no-console
          console.error('[header] failed to open contact modal', err);
        }
      });
      $logout.on('click' + ns, function (event) {
                   event.preventDefault();
        closeMenu();
        service.jobLogout.handleLogout({ logout: logoutCfg });
      });
    }
    
    normalizeUserProfile(user)
    {
      if (this.isLoggedInUser(user)) {
        const profile = Object.assign({}, user);
        if (typeof profile.loggedIn !== 'boolean') {
          profile.loggedIn = true;
        }
        profile.useContentsManagement = this._isContentsManagementEnabled(profile);
        return profile;
      }

      const profile = Object.assign({}, this.ANONYMOUS_PROFILE);
      profile.loggedIn = false;
      return profile;
    }

    initConfig()
    {
      this.SELECTORS = Object.freeze({
        root: '.site-header',
        logo: '.site-header__logo',
        menuToggle: '.site-header__menu-toggle',
        nav: '.site-header__nav',
        menuLinks: '.site-header__links[data-nav-menu]',
        // ログアウト時に表示されるログインリンク
        loginLink: '.site-header__cta',
        overlay: '.site-header__overlay'
      });
      
      this.MENU_ITEMS = Object.freeze({
        dashboard: Object.freeze({ key: 'dashboard', label: 'ダッシュボード', href: '/dashboard' }),
        announcements: Object.freeze({ key: 'announcements', label: 'お知らせ管理', href: '/admin-announcements' }),
        users: Object.freeze({ key: 'users', label: 'ユーザー管理', href: '/admin-users' }),
        queue: Object.freeze({ key: 'queue', label: 'キュー管理', href: '/admin-queue' }),
        purchase: Object.freeze({ key: 'purchase', label: '購入管理', href: '/admin-purchase' }),
        contactlog: Object.freeze({ key: 'contactlog', label: '問い合わせ管理', href: '/admin-contactlog' }),
        system: Object.freeze({ key: 'system', label: 'システム管理', href: '/admin-system' }),
        targets: Object.freeze({ key: 'targets', label: 'ターゲット管理', href: '/targets' }),
        contents: Object.freeze({ key: 'contents', label: 'コンテンツ管理', href: '/contents' }),
        contentAccess: Object.freeze({ key: 'contentAccess', label: 'アクセス管理', href: '/admin-contents-access' })
      });

      this.MENU_PRESETS = Object.freeze({
        supervisor: window.Utils.freezeArray([
          this.MENU_ITEMS.announcements,
          this.MENU_ITEMS.users,
          this.MENU_ITEMS.queue,
          this.MENU_ITEMS.purchase,
          this.MENU_ITEMS.contactlog,
          this.MENU_ITEMS.system,
          this.MENU_ITEMS.targets,
          this.MENU_ITEMS.contents,
          this.MENU_ITEMS.contentAccess
        ]),
        operator: window.Utils.freezeArray([
          this.MENU_ITEMS.dashboard,
          this.MENU_ITEMS.targets,
          this.MENU_ITEMS.contents
        ]),
        general: window.Utils.freezeArray([
          this.MENU_ITEMS.dashboard,
          this.MENU_ITEMS.targets,
          this.MENU_ITEMS.contents
        ])
      });

      this.DEFAULTS = Object.freeze({
        mountSelector: this.SELECTORS.root,
        // メニュー：役割に応じた既定値
        menu: this.MENU_PRESETS.general,
        // 強制的にログインリンクを表示するか
        forceLoginLink: false,
        display: Object.freeze({
          forceLoginButton: false,
          hideLoginButton: false,
          showUserInfoWhenLoggedIn: true
        }),
        accountEditHref: 'account-settings.html',
        logout: Object.freeze({
          method: 'POST',
          requestType: 'Session',
          type: 'Logout',
          redirectUrl: '/login.html',
          label: 'ログアウト'
        }),
        p5: {
          // ロゴラベルは <a.site-header__logo data-logo-label="..."> を優先
          fontSize: 18
        },
        stylesheetHref: '/css/service-header.css',
        // 現在の URL に基づき highlightActiveLinkByUrl で aria-current="page" を適用
        activeByPath: true
      });

      this.FALLBACKS = Object.freeze({
        avatar: '/image/user-avatar.svg'  // 指定の既定アバター
      });      
    }
  }

  window.Services = window.Services || {};
  window.Services.Header = HeaderService;
  
})(window);
