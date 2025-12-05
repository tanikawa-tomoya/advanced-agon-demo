(function (window)
{
  'use strict';

  class LoginGuardService
  {
    constructor(options)
    {
      this.options = options && typeof options === 'object' ? Object.assign({}, options) : {};
      this.DEFAULTS = Object.freeze({
        optionalPages: Object.freeze(['login', 'agon-index']),
        adminPrefix: 'admin-',
        redirectPath: '/login.html',
        sessionExpiredReasons: Object.freeze(['login_required', 'session_expired', 'unauthorized'])
      });
      this.config = null;
      this._optionalPages = [];
    }

    initConfig()
    {
      var globalConfig = (window.Services && window.Services.config && window.Services.config.loginGuard) || {};
      this.config = Object.assign({}, this.DEFAULTS, globalConfig, this.options);
      this._optionalPages = this._normalizePageList(this.config.optionalPages);
      return this.config;
    }

    createGuard(pageName)
    {
      this.initConfig();
      var requireSupervisor = this._isAdminPage(pageName);
      var requireLogin = this._shouldRequireLogin(pageName);
      var onLoginPage = this._isLoginPage();
      var redirected = false;

      var self = this;

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
        return !self._isSupervisorUser(user);
      }

      function redirect()
      {
        if (!shouldEnforce())
        {
          return;
        }
        redirected = true;
        self._redirectToLogin();
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
          if (self._isUnauthorizedSessionError(err))
          {
            redirect();
          }
        }
      };
    }

    _shouldRequireLogin(pageName)
    {
      return !this._isOptionalPage(pageName);
    }

    _isOptionalPage(pageName)
    {
      var normalized = this._normalizePageName(pageName);
      if (normalized && this._optionalPages.indexOf(normalized) !== -1)
      {
        return true;
      }
      var fromPath = this._normalizePageName(this._resolvePageNameFromPath());
      if (fromPath && this._optionalPages.indexOf(fromPath) !== -1)
      {
        return true;
      }
      return false;
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

    _resolvePageNameFromPath()
    {
      var path = (window.location && window.location.pathname) || '';
      var normalized = path.replace(/\/+/g, '/').replace(/\.html?$/i, '');
      var name = normalized.split('/').pop() || '';
      return name;
    }

    _isAdminPage(pageName)
    {
      var normalized = this._normalizePageName(pageName);
      if (normalized)
      {
        return normalized.indexOf(this.config.adminPrefix) === 0;
      }
      var fromPath = this._normalizePageName(this._resolvePageNameFromPath());
      return fromPath.indexOf(this.config.adminPrefix) === 0;
    }

    _isLoginPage()
    {
      var path = (window.location && window.location.pathname) || '';
      var normalized = path.replace(/\/+/g, '/').toLowerCase();
      var redirectPath = String(this.config.redirectPath || '').replace(/\/+/g, '/').toLowerCase();
      if (redirectPath && normalized === redirectPath)
      {
        return true;
      }
      return normalized === '/login' || normalized === '/login.html';
    }

    _redirectToLogin()
    {
      try
      {
        if (!this._isLoginPage())
        {
          window.location.href = this.config.redirectPath || '/login.html';
        }
      }
      catch (err)
      {
        try { console.error('[LOGIN-GUARD] failed to redirect to login', err); } catch (_e) {}
      }
    }

    _normalizeReasonValue(value)
    {
      if (typeof value === 'string')
      {
        return value.trim().toLowerCase();
      }
      return '';
    }

    _resolveReasonFromError(err)
    {
      if (!err || typeof err !== 'object')
      {
        return '';
      }
      if (typeof err.reason === 'string' && err.reason)
      {
        return this._normalizeReasonValue(err.reason);
      }
      if (typeof err.code === 'string' && err.code)
      {
        return this._normalizeReasonValue(err.code);
      }
      if (err.payload && typeof err.payload === 'object')
      {
        if (typeof err.payload.reason === 'string' && err.payload.reason)
        {
          return this._normalizeReasonValue(err.payload.reason);
        }
        if (err.payload.result && typeof err.payload.result.reason === 'string' && err.payload.result.reason)
        {
          return this._normalizeReasonValue(err.payload.result.reason);
        }
      }
      return '';
    }

    _isUnauthorizedSessionError(err)
    {
      if (!err || typeof err !== 'object')
      {
        return false;
      }
      if (err.__sessionExpired === true)
      {
        return true;
      }
      var reason = this._resolveReasonFromError(err);
      if (reason && this.config.sessionExpiredReasons.indexOf(reason) !== -1)
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

    _isSupervisorUser(user)
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
  }

  window.Services = window.Services || {};
  window.Services.LoginGuard = LoginGuardService;

})(window);
