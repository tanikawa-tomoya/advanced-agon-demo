(function ()
{
  'use strict';

  class SessionService
  {
    constructor(options)
    {
      this.options = options && typeof options === 'object' ? Object.assign({}, options) : {};
      this.DEFAULTS = Object.freeze({
        storageKey: 'advanced-session-user'
      });
      this.config = null;
      this.jobs = {};
      this._general = null;
      this._storageKey = '';
      this._user = null;
      this._pendingRefresh = null;
      this._bootReady = false;
    }

    initConfig()
    {
      var globalConfig = (window.Services && window.Services.config && window.Services.config.session) || {};
      this.config = Object.assign({}, this.DEFAULTS, globalConfig, this.options);
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

      var source = this._general.normalizeReason(payload.source);
      if (source !== 'cookie')
      {
        return false;
      }

      var reason = '';
      var pickReason = function (value)
      {
        if (reason)
        {
          return;
        }
        reason = this._general.normalizeReason(value);
      }.bind(this);

      pickReason(payload.reason);
      pickReason(payload.error);
      pickReason(payload.response);
      pickReason(payload.code);

      if (!reason && payload.result && typeof payload.result === 'object')
      {
        pickReason(payload.result.reason);
        pickReason(payload.result.error);
        pickReason(payload.result.response);
        pickReason(payload.result.code);
      }

      return reason === 'signature_mismatch';
    }

    _storeLogoutNoticeFlag()
    {
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
