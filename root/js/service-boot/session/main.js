(function ()
{
  'use strict';

  class SessionService
  {
    constructor(options)
    {
      this.options = options && typeof options === 'object' ? Object.assign({}, options) : {};
      this.DEFAULTS = Object.freeze({
        storageKey: 'advanced-session-user',
        optionalPages: Object.freeze(['login', 'agon-index'])
      });
      this.config = null;
      this.jobs = {};
      this._general = null;
      this._storageKey = '';
      this._user = null;
      this._pendingRefresh = null;
      this._bootReady = false;
      this._optionalPages = [];
    }

    initConfig()
    {
      var globalConfig = (window.Services && window.Services.config && window.Services.config.session) || {};
      this.config = Object.assign({}, this.DEFAULTS, globalConfig, this.options);
      this._optionalPages = this._normalizePageList(this.config.optionalPages);
      return this.config;
    }

    async boot()
    {
      if (this._bootReady)
      {
        return null;
      }
      this.initConfig();
      this.jobs.general = this._resolveGeneralJob();
      this._general = this.jobs.general;
      this._storageKey = this._general.resolveStorageKey(this.config);
      this._bootReady = true;
      return null;
    }

    _assertBootReady()
    {
      if (!this._bootReady)
      {
        throw new Error('[session] SessionService.boot() must be completed before use');
      }
    }

    _resolveGeneralJob()
    {
      var services = window.Services || {};
      var namespace = services.sessionJobs;
      return namespace.JobGeneral.getInstance();
    }

    async loadFromStorage()
    {
      this._assertBootReady();
      var stored = this._general.readFromStorage(this._storageKey);
      this._user = stored ? this._general.cloneUser(stored) : null;
      return this._user;
    }

    async getUser()
    {
      return this._user;
    }

    async setUser(user)
    {
      this._assertBootReady();
      if (!user || typeof user !== 'object')
      {
        this._general.clearStorage(this._storageKey);
        this._user = null;
        return null;
      }
      var written = this._general.writeToStorage(this._storageKey, user);
      this._user = written ? this._general.cloneUser(written) : null;
      return this._user;
    }

    async syncFromServer()
    {
      this._assertBootReady();
      if (this._pendingRefresh)
      {
        return this._pendingRefresh;
      }
      var run = this._general.fetchUserProfile().then((user) =>
      {
        return this.setUser(user);
      }).catch((err) =>
      {
        if (this._shouldTreatAsLoggedOut(err))
        {
          this._handleForcedLogout(err);
          return this.setUser(null);
        }
        throw err;
      });
      this._pendingRefresh = run.finally(() =>
      {
        this._pendingRefresh = null;
      });
      return this._pendingRefresh;
    }

    _isSessionExpiredError(err)
    {
      this._assertBootReady();
      if (!err || typeof err !== 'object')
      {
        return false;
      }
      if (err.__sessionExpired === true)
      {
        return true;
      }
      if (typeof err.reason === 'string' && err.reason)
      {
        return this._general.isSessionExpiredReason(err.reason);
      }
      var payloadReason = '';
      if (err.payload)
      {
        payloadReason = this._general.resolvePayloadReason(err.payload);
      }
      if (payloadReason)
      {
        return this._general.isSessionExpiredReason(payloadReason);
      }
      return false;
    }

    _shouldTreatAsLoggedOut(err)
    {
      this._assertBootReady();
      if (this._isSessionExpiredError(err))
      {
        return true;
      }
      if (!err || typeof err !== 'object')
      {
        return false;
      }
      var normalizedReason = this._general.normalizeReason(err.reason);
      if (!normalizedReason && err.payload)
      {
        normalizedReason = this._general.resolvePayloadReason(err.payload);
      }
      if (normalizedReason === 'server key missing' || normalizedReason === 'server_key_missing')
      {
        return true;
      }
      if (err.__sessionAllowSilent === true)
      {
        return true;
      }
      if (this._isLoggedOutPayload(err.payload))
      {
        return true;
      }
      var statusCode = this._resolveStatusCode(err);
      if (statusCode === 401)
      {
        return true;
      }
      if (typeof err.status === 'string')
      {
        var normalizedStatus = err.status.trim().toLowerCase();
        if (normalizedStatus === 'unauthorized' || normalizedStatus === 'login_required')
        {
          return true;
        }
      }
      var message = (err.message || '').toLowerCase();
      if (message)
      {
        if (message.indexOf('unauthorized') !== -1 || message.indexOf('login') !== -1)
        {
          return true;
        }
        if (message.indexOf('session') !== -1 && message.indexOf('expired') !== -1)
        {
          return true;
        }
      }
      return false;
    }

    _handleForcedLogout(err)
    {
      this._assertBootReady();
      if (this._isOptionalPage())
      {
        return;
      }
      if (this._shouldForceLogoutRedirect(err))
      {
        this._storeLogoutNoticeFlag();
        this._redirectToLogin();
      }
    }

    _shouldForceLogoutRedirect(err)
    {
      this._assertBootReady();
      if (!err || typeof err !== 'object')
      {
        return false;
      }

      var payload = err.payload;
      if (!payload || typeof payload !== 'object')
      {
        return false;
      }

      var reason = this._general.normalizeReason(payload.reason);
      if (!reason)
      {
        reason = this._general.normalizeReason(payload.error);
      }
      if (!reason && payload.result && typeof payload.result === 'object')
      {
        reason = this._general.normalizeReason(payload.result.reason);
        if (!reason)
        {
          reason = this._general.normalizeReason(payload.result.error);
        }
      }

      if (reason === 'server key missing' || reason === 'server_key_missing')
      {
        return true;
      }

      var source = this._general.normalizeReason(payload.source);
      if (source !== 'cookie')
      {
        return false;
      }

      return reason === 'signature_mismatch';
    }

    _storeLogoutNoticeFlag()
    {
      if (!this._user || typeof this._user !== 'object')
      {
        return;
      }

      var storage = window.sessionStorage;
      if (!storage || typeof storage.setItem !== 'function')
      {
        return;
      }
      try
      {
        storage.setItem('advanced:logout-notice', '1');
      }
      catch (_err) {}
    }

    _redirectToLogin()
    {
      if (this._isLoginPage())
      {
        return;
      }
      try
      {
        if (window.location && typeof window.location.replace === 'function')
        {
          window.location.replace('/login.html');
        }
        else if (window.location)
        {
          window.location.href = '/login.html';
        }
      }
      catch (_err)
      {
        try
        {
          window.location.href = '/login.html';
        }
        catch (_e) {}
      }
    }

    _isOptionalPage()
    {
      var resolved = this._resolvePageName();
      return resolved && this._optionalPages.indexOf(resolved) !== -1;
    }

    _resolvePageName()
    {
      var body = document.body || null;
      var dataset = body && body.dataset ? body.dataset : {};
      var fromData = dataset.page || dataset.pageName || '';
      var normalized = this._normalizePageName(fromData);
      if (normalized)
      {
        return normalized;
      }
      return this._normalizePageName(this._resolvePageNameFromPath());
    }

    _resolvePageNameFromPath()
    {
      var path = (window.location && window.location.pathname) || '';
      var normalized = path.replace(/\/+$/g, '').replace(/\.html?$/i, '');
      var name = normalized.split('/').pop() || '';
      return name;
    }

    _normalizePageList(value)
    {
      if (!Array.isArray(value))
      {
        return [];
      }
      return value.map(this._normalizePageName).filter(function (name) {
        return !!name;
      });
    }

    _normalizePageName(pageName)
    {
      if (typeof pageName !== 'string')
      {
        return '';
      }
      return pageName.replace(/^\/+|\/+$/g, '').replace(/\.html?$/i, '').trim().toLowerCase();
    }

    _isLoginPage()
    {
      try
      {
        var path = (window.location && window.location.pathname) || '';
        var normalized = path.replace(/\/+/g, '/').toLowerCase();
        return normalized === '/login.html' || normalized === '/login';
      }
      catch (_err)
      {
        return false;
      }
    }

    _isLoggedOutPayload(payload)
    {
      if (!payload || typeof payload !== 'object')
      {
        return false;
      }
      if (payload.loggedIn === false)
      {
        return true;
      }
      var result = payload.result;
      if (result && typeof result === 'object')
      {
        if (result.loggedIn === false)
        {
          return true;
        }
        if (result.loginRequired === true)
        {
          return true;
        }
      }
      return false;
    }

    _resolveStatusCode(err)
    {
      if (!err || typeof err !== 'object')
      {
        return 0;
      }
      if (typeof err.status === 'number')
      {
        return err.status;
      }
      if (typeof err.code === 'number')
      {
        return err.code;
      }
      if (typeof err.status === 'string')
      {
        var parsed = parseInt(err.status, 10);
        if (!isNaN(parsed))
        {
          return parsed;
        }
      }
      if (err.response && typeof err.response.status === 'number')
      {
        return err.response.status;
      }
      return 0;
    }
  }

  window.Services = window.Services || {};
  window.Services.Session = SessionService;

})(window);
