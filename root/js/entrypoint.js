// /js/entrypoint.js  (classic, minimal responsibility)
// 責務: ページ名を決め、main.js だけ読み、クラスを new する。それ以外は main.js 側の責務。
(function () {
        'use strict';

        var SESSION_EXPIRED_REASONS = Object.freeze(['login_required', 'session_expired', 'unauthorized']);
        var THEME_STORAGE_KEY = 'site-theme-preset';
        var THEME_DEFAULT = 'classic';

        document.entrypoint = {};

        bootstrapThemeFromCache();
  
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}  

  async function boot()
  {
    var bootOverlay = showPageBootOverlay();
    loadUtilSync();
    await syncThemeWithServer();
    registerServiceWorker();

    var pageName = detectPageName();
    var className = kebabToPascal(pageName);
    var base = '/js/page/' + pageName;
    var loginGuard = createLoginGuard(pageName);

    var sessionReady = await prepareSessionContext()
        .then(function (user) {
          loginGuard.handleHydratedUser(user);
          return user;
        })
        .catch(function (err) {
          // console.error('[ENTRYPOINT] session init failed', err);
          loginGuard.handleHydrationError(err);
          return null;
        });
    
    Promise.all([
      sessionReady,
      window.Utils.loadScriptsSync([base + '/main.js'])
    ]) .then(function () {
      var Constructor = getConstructorByName(className);
      if (typeof Constructor !== 'function') {
        throw new Error('Page class not found: ' + className + ' for ' + pageName);
      }
      var instance = new Constructor(pageName);
      window.__PAGE__ = instance;
      window.pageInstance = window.pageInstance || {};
      window.pageInstance[className] = instance;
      runPageBoot(instance).then(function () {
        if (shouldBootFooter(pageName)) {
          return bootFooterService();
        }
        return null;
      }).then(function () {
        hidePageBootOverlay(bootOverlay);
        return instance;
      }).catch(function (err) {
        hidePageBootOverlay(bootOverlay);
        console.error('[ENTRYPOINT] page boot failed', err);
      });

      // ヘッダー装着後にサーバ最新へ同期（ヘッダー側は SessionService の状態を参照する）
      initSessionService().then(function (service) {
        if (service && typeof service.syncFromServer === 'function') {
          return service.syncFromServer();
        }
        return null;
      }).then(function (user) {
        loginGuard.handleRemoteUser(user);
        return user;
      }).catch(function (err) {
        loginGuard.handleRemoteError(err);
        // console.error('[ENTRYPOINT] session sync failed', err);
      });
			
    }).catch(function (e) {
      hidePageBootOverlay(bootOverlay);
      console.error('[ENTRYPOINT]', e);
    });
        }

  function runPageBoot(instance)
  {
    try {
      return Promise.resolve(instance.boot());
    } catch (e) {
      return Promise.reject(e);
    }
  }

        function detectPageName()
  {
    var body = document.body || null;
    var dataset = body && body.dataset ? body.dataset : {};
    if (dataset.pageName) {
      return String(dataset.pageName).trim();
    }

                var path = location.pathname.replace(/\/+$/, '');
                var tail = (path.split('/').pop() || '').replace(/\.html?$/i, '');
                return tail || 'index';
        }
  
	function kebabToPascal(s)
  {
		return String(s).split('-').filter(Boolean)
			.map(function (p){ return p.charAt(0).toUpperCase() + p.slice(1); })
			.join('');
	}
  
  // utils.jsに同様の処理があるが、core機能と外部提供機能を分ける
  // メソッド名が重複すると混乱するため、処理的には冗長だが以下のように実装する
  function loadUtilSync()
  {
    const src = '/js/utils/utils.js';
    
    // 二重ロード防止。挙動は変えずデバッグの見通しだけ良くする。
    if (document.querySelector('script[data-sync-src="' + src + '"]')) { return; }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', src, false);   // ★ 同期（ブロッキング）
    xhr.send(null);
    // HTTP では 200 以外は失敗。0 は file:// を想定して許容。
    if (xhr.status !== 200 && xhr.status !== 0) {
      throw new Error('Failed to load: ' + src + ' (status ' + xhr.status + ')');
    }
    var s = document.createElement('script');
    s.text = xhr.responseText;
    s.async = false;
    s.setAttribute('data-sync-src', src);
    document.head.appendChild(s);
  }

  function getConstructorByName(className)
  {
    var Constructor;
    try { Constructor = (0, eval)(className); } catch (e) { Constructor = undefined; }
    if (typeof Constructor !== 'function') Constructor = window[className];
    return Constructor;
  }

  function resolvePageConfig(className)
  {
    var key = className + 'Config';
    if (Object.prototype.hasOwnProperty.call(window, key)) {
      return window[key];
    }
    return undefined;
  }

  function resolveSessionConfig()
  {
    var body = document.body || null;
    var dataset = body && body.dataset ? body.dataset : {};
    var key = '';
    if (dataset.sessionStorageProfile) {
      key = dataset.sessionStorageProfile;
    } else if (dataset.sessionStorageName) {
      key = dataset.sessionStorageName;
    }
    if (key) {
      return { storageKey: key };
    }
    return {};
  }

  function resolveFooterConfig()
  {
    if (window.FooterConfig && typeof window.FooterConfig === 'object') {
      return window.FooterConfig;
    }
    return {};
  }

  function registerServiceWorker()
  {
    if (!navigator.serviceWorker)
    {
      return;
    }
    navigator.serviceWorker.register('/service-worker.js').catch(function () {});
  }

  function showPageBootOverlay()
  {
    var body = document.body || document.querySelector('body');
    if (!body) { return null; }

    var region = document.createElement('div');
    region.className = 'c-loading-overlay-region is-center';
    region.style.position = 'fixed';
    region.style.top = '0';
    region.style.left = '0';
    region.style.width = '100%';
    region.style.height = '100%';
    region.style.zIndex = '1400';

    var overlay = document.createElement('div');
    overlay.className = 'c-loading-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'ページを読み込み中');
    overlay.setAttribute('tabindex', '-1');

    var backdrop = document.createElement('div');
    backdrop.className = 'c-loading-overlay__backdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    var content = document.createElement('div');
    content.className = 'c-loading-overlay__content';

    var spinner = document.createElement('div');
    spinner.className = 'c-loading-overlay__spinner';
    spinner.setAttribute('aria-hidden', 'true');

    var message = document.createElement('div');
    message.className = 'c-loading-overlay__message';
    message.textContent = '読み込み中…';

    content.appendChild(spinner);
    content.appendChild(message);
    overlay.appendChild(backdrop);
    overlay.appendChild(content);
    region.appendChild(overlay);

    body.appendChild(region);
    return region;
  }

  function hidePageBootOverlay(region)
  {
    if (region && region.parentNode) {
      region.parentNode.removeChild(region);
    }
  }

  function shouldBootFooter(pageName)
  {
    return pageName !== 'agon-index';
  }

  var footerServiceReady = null;

  function bootFooterService()
  {
    if (footerServiceReady) {
      return footerServiceReady;
    }

    footerServiceReady = window.Utils.loadScriptsSync([
      '/js/service-app/footer/main.js'
    ]).then(function () {
      window.Services = window.Services || {};
      var FooterConstructor = window.Services && window.Services.Footer;
      if (typeof FooterConstructor !== 'function') {
        throw new Error('Footer service constructor is not available');
      }
      var instance = window.Services.footerInstance;
      if (!instance) {
        var config = resolveFooterConfig();
        instance = new FooterConstructor(config);
        window.Services.footerInstance = instance;
      }
      var bootResult = (instance && typeof instance.boot === 'function')
        ? instance.boot()
        : null;
      return Promise.resolve(bootResult).then(function () {
        return instance;
      });
    }).catch(function (err) {
      footerServiceReady = null;
      throw err;
    });

    return footerServiceReady;
  }

  var sessionServiceReady = null;

  async function initSessionService()
  {
    if (sessionServiceReady) {
      return sessionServiceReady;
    }

    sessionServiceReady = await window.Utils.loadScriptsSync([
      '/js/service-boot/session/job-general.js',
      '/js/service-boot/session/main.js'
    ]).then(function () {
      window.Services = window.Services || {};
      var SessionConstructor = window.Services && window.Services.Session;
      if (typeof SessionConstructor !== 'function') {
        throw new Error('Session service constructor is not available');
      }
      var instance = window.Services.sessionInstance;
      if (!instance) {
        var config = resolveSessionConfig();
        instance = new SessionConstructor(config);
        window.Services.sessionInstance = instance;
      }
      var bootResult = (instance && typeof instance.boot === 'function') ? instance.boot() : null;
      return Promise.resolve(bootResult).then(function () {
        return instance;
      });
    }).catch(function (err) {
      sessionServiceReady = null;
      throw err;
    });

    return sessionServiceReady;
  }

  function prepareSessionContext()
  {
    return initSessionService().then(function (service) {
      if (!service || typeof service !== 'object') {
        throw new Error('Session service instance is not available');
      }
      // 1) ストレージから即時ロード（存在しなければ null）
      var hydrate = null;
      if (typeof service.loadFromStorage === 'function') {
        hydrate = service.loadFromStorage;
      } else if (typeof service.hydrate === 'function') {
        hydrate = service.hydrate;
      } else if (typeof service.getUser === 'function') {
        hydrate = service.getUser;
      }
      if (!hydrate) { return null; }
      return Promise.resolve(hydrate.call(service));
    });
  }

  function createLoginGuard(pageName)
  {
    var requireSupervisor = isAdminPage(pageName);
    var requireLogin = isProtectedPage() || requireSupervisor;
    var onLoginPage = isLoginPage();
    var redirected = false;

    function shouldEnforce()
    {
      return requireLogin && !onLoginPage && !redirected;
    }

    function shouldBlock(user)
    {
      if (!requireSupervisor)
      {
        return false;
      }
      return !isSupervisorUser(user);
    }

    function redirect()
    {
      if (!shouldEnforce())
      {
        return;
      }
      redirected = true;
      redirectToLogin();
    }

    return {
      handleHydratedUser: function (user) {
        if (shouldBlock(user))
        {
          redirect();
        }
      },
      handleHydrationError: function () {},
      handleRemoteUser: function (user) {
        if (!user || shouldBlock(user))
        {
          redirect();
        }
      },
      handleRemoteError: function (err) {
        if (isUnauthorizedSessionError(err))
        {
          redirect();
        }
      }
    };
  }

  function isProtectedPage()
  {
    var body = document.body || null;
    if (!body)
    {
      return false;
    }
    var dataset = body.dataset || {};
    if (dataset && typeof dataset.requireLogin === 'string')
    {
      var normalized = dataset.requireLogin.trim().toLowerCase();
      if (!normalized || normalized === 'true')
      {
        return true;
      }
    }
    return false;
  }

  function isLoginPage()
  {
    var path = (window.location && window.location.pathname) || '';
    var normalized = path.replace(/\/+/g, '/').toLowerCase();
    return normalized === '/login.html' || normalized === '/login';
  }

  function isAdminPage(pageName)
  {
    var normalized = (pageName || '').replace(/^\/+|\/+$/g, '').toLowerCase();
    if (normalized)
    {
      return normalized.indexOf('admin-') === 0;
    }
    var path = (window.location && window.location.pathname) || '';
    var name = path.split('/').pop() || '';
    return name.toLowerCase().indexOf('admin-') === 0;
  }

  function redirectToLogin()
  {
    try
    {
      if (!isLoginPage())
      {
        window.location.href = '/login.html';
      }
    }
    catch (err)
    {
      try { console.error('[ENTRYPOINT] failed to redirect to login', err); } catch (_e) {}
    }
  }

  function normalizeReasonValue(value)
  {
    if (typeof value === 'string')
    {
      return value.trim().toLowerCase();
    }
    return '';
  }

  function resolveReasonFromError(err)
  {
    if (!err || typeof err !== 'object')
    {
      return '';
    }
    if (typeof err.reason === 'string' && err.reason)
    {
      return normalizeReasonValue(err.reason);
    }
    if (typeof err.code === 'string' && err.code)
    {
      return normalizeReasonValue(err.code);
    }
    if (err.payload && typeof err.payload === 'object')
    {
      if (typeof err.payload.reason === 'string' && err.payload.reason)
      {
        return normalizeReasonValue(err.payload.reason);
      }
      if (err.payload.result && typeof err.payload.result.reason === 'string' && err.payload.result.reason)
      {
        return normalizeReasonValue(err.payload.result.reason);
      }
    }
    return '';
  }

  function isUnauthorizedSessionError(err)
  {
    if (!err || typeof err !== 'object')
    {
      return false;
    }
    if (err.__sessionExpired === true)
    {
      return true;
    }
    var reason = resolveReasonFromError(err);
    if (reason && SESSION_EXPIRED_REASONS.indexOf(reason) !== -1)
    {
      return true;
    }
    var status = err.status;
    if (typeof status === 'undefined' && err.response)
    {
      status = err.response.status;
    }
    if (typeof status === 'number' && status === 401)
    {
      return true;
    }
    var message = (err.message || '').toLowerCase();
    if (!message)
    {
      return false;
    }
    if (message.indexOf('unauthorized') !== -1 || message.indexOf('login') !== -1)
    {
      return true;
    }
    if (message.indexOf('session') !== -1 && message.indexOf('expired') !== -1)
    {
      return true;
    }
    return false;
  }

  function isSupervisorUser(user)
  {
    if (!user || typeof user !== 'object')
    {
      return false;
    }
    if (user.isSupervisor === 1 || user.isSupervisor === true || user.isSupervisor === '1')
    {
      return true;
    }
    if (user.supervisor === 1 || user.supervisor === true || user.supervisor === '1')
    {
      return true;
    }

    var roles = [];
    var appendRole = function (value)
    {
      if (!value)
      {
        return;
      }
      if (Array.isArray(value))
      {
        roles = roles.concat(value);
        return;
      }
      if (typeof value === 'string')
      {
        roles = roles.concat(value.split(/[\s,|\/]+/));
      }
    };

    appendRole(user.role);
    appendRole(user.roleName);
    appendRole(user.roleLabel);
    appendRole(user.roles);

    for (var i = 0; i < roles.length; i++)
    {
      var role = roles[i];
      var normalized = String(role || '').trim().toLowerCase();
      if (!normalized)
      {
        continue;
      }
      if (normalized === 'supervisor' || normalized.indexOf('supervisor') !== -1)
      {
        return true;
      }
    }

    return false;
  }

  function bootstrapThemeFromCache()
  {
    var cached = readThemeFromStorage();
    applyThemePreset(cached, { persist: false, silent: true });
  }

  function syncThemeWithServer()
  {
    var requestApi = window.Utils && window.Utils.requestApi;
    var endpoint = window.Utils && typeof window.Utils.getApiEndpoint === 'function'
      ? window.Utils.getApiEndpoint()
      : '/scripts/request.php';

    if (typeof requestApi !== 'function')
    {
      applyThemePreset(THEME_DEFAULT, { persist: false, silent: true });
      return Promise.resolve(THEME_DEFAULT);
    }

    return Promise.resolve(requestApi('System', 'SiteThemeGet', {}, {
      url: endpoint,
      dataType: 'json',
      timeout: 8000
    })).then(function (response)
    {
      var theme = resolveThemeFromPayload(response);
      return applyThemePreset(theme, { persist: true, silent: true });
    }).catch(function ()
    {
      applyThemePreset(THEME_DEFAULT, { persist: false, silent: true });
      return THEME_DEFAULT;
    });
  }

  function resolveThemeFromPayload(response)
  {
    var payload = response && (response.result || response.payload || response.data || response);
    var theme = '';
    if (payload && typeof payload === 'object')
    {
      if (typeof payload.theme === 'string')
      {
        theme = payload.theme;
      }
      else if (payload.data && typeof payload.data.theme === 'string')
      {
        theme = payload.data.theme;
      }
    }
    return normalizeThemeValue(theme || THEME_DEFAULT);
  }

  function applyThemePreset(theme, options)
  {
    var normalized = normalizeThemeValue(theme);
    setThemeAttribute(normalized);
    if (!options || options.persist !== false)
    {
      writeThemeToStorage(normalized);
    }

    document.entrypoint.theme = document.entrypoint.theme || {};
    document.entrypoint.theme.applyThemePreset = applyThemePreset;
    document.entrypoint.theme.normalizeThemeValue = normalizeThemeValue;
    document.entrypoint.theme.readThemeFromStorage = readThemeFromStorage;
    document.entrypoint.theme.writeThemeToStorage = writeThemeToStorage;

    return normalized;
  }

  function setThemeAttribute(theme)
  {
    var root = document.documentElement || document.querySelector(':root');
    if (root)
    {
      root.setAttribute('data-theme', theme);
    }
  }

  function normalizeThemeValue(value)
  {
    var theme = '';
    if (typeof value === 'string')
    {
      theme = value.trim();
    }
    else if (value !== undefined && value !== null)
    {
      theme = String(value);
    }

    if (theme === 'light')
    {
      return 'light';
    }

    return THEME_DEFAULT;
  }

  function readThemeFromStorage()
  {
    try
    {
      return window.localStorage.getItem(THEME_STORAGE_KEY) || THEME_DEFAULT;
    }
    catch (err)
    {
      return THEME_DEFAULT;
    }
  }

  function writeThemeToStorage(theme)
  {
    try
    {
      window.localStorage.setItem(THEME_STORAGE_KEY, normalizeThemeValue(theme));
    }
    catch (err)
    {
    }
  }
}());
