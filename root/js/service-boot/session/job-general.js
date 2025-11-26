(function ()
{
  'use strict';

  class SessionJobGeneral
  {
    constructor()
    {
      this.DEFAULT_STORAGE_KEY = 'advanced-session-user';
      this.SESSION_EXPIRED_REASONS = Object.freeze([
        'login_required',
        'unauthorized',
        'session_expired'
      ]);
      this.SESSION_EXPIRED_REASON_ALIASES = Object.freeze([
        'expired',
        'token_expired',
        'jwt_expired'
      ]);
      this.UNAUTHORIZED_REASON_ALIASES = Object.freeze([
        'no_token',
        'token',
        'token_missing',
        'token_invalid',
        'invalid_token',
        'empty_bearer_token',
        'unsupported_auth_scheme',
        'malformed',
        'malformed_signature',
        'malformed_header',
        'malformed_payload',
        'signature_mismatch',
        'claims_missing',
        'nbf_in_future',
        'iat_in_future',
        'invalid_window',
        'iss_mismatch',
        'aud_mismatch',
        'permission',
        'permission_denied',
        'access_denied',
        'forbidden'
      ]);
    }

    static getInstance()
    {
      if (!SessionJobGeneral.__instance)
      {
        SessionJobGeneral.__instance = new SessionJobGeneral();
      }
      return SessionJobGeneral.__instance;
    }

    resolveStorageKey(configOrKey)
    {
      if (typeof configOrKey === 'string' && configOrKey.trim() !== '')
      {
        return configOrKey;
      }
      if (configOrKey && typeof configOrKey === 'object' && configOrKey.storageKey)
      {
        return String(configOrKey.storageKey);
      }
      return this.DEFAULT_STORAGE_KEY;
    }

    normalizeReason(value)
    {
      if (typeof value === 'string')
      {
        return value.trim().toLowerCase();
      }
      return '';
    }

    normalizeReasonWithAliases(value)
    {
      var normalized = this.normalizeReason(value);
      if (!normalized)
      {
        return '';
      }
      if (this.SESSION_EXPIRED_REASON_ALIASES.indexOf(normalized) !== -1)
      {
        return 'session_expired';
      }
      if (this.UNAUTHORIZED_REASON_ALIASES.indexOf(normalized) !== -1)
      {
        return 'unauthorized';
      }
      return normalized;
    }

    isSessionExpiredReason(reason)
    {
      var normalized = this.normalizeReason(reason);
      return normalized ? this.SESSION_EXPIRED_REASONS.indexOf(normalized) !== -1 : false;
    }

    resolvePayloadReason(payload)
    {
      var reason = '';
      if (!payload || typeof payload !== 'object')
      {
        return '';
      }
      reason = this.normalizeReasonWithAliases(payload.reason);
      if (reason)
      {
        return reason;
      }
      if (typeof payload.response === 'string')
      {
        reason = this.normalizeReasonWithAliases(payload.response);
        if (reason)
        {
          return reason;
        }
      }
      reason = this.normalizeReasonWithAliases(payload.error);
      if (reason)
      {
        return reason;
      }
      reason = this.normalizeReasonWithAliases(payload.code);
      if (reason)
      {
        return reason;
      }
      if (typeof payload.result === 'string')
      {
        reason = this.normalizeReasonWithAliases(payload.result);
        if (reason)
        {
          return reason;
        }
      }
      if (payload.result && typeof payload.result === 'object')
      {
        reason = this.normalizeReasonWithAliases(payload.result.reason);
        if (reason)
        {
          return reason;
        }
        if (typeof payload.result.response === 'string')
        {
          reason = this.normalizeReasonWithAliases(payload.result.response);
          if (reason)
          {
            return reason;
          }
        }
        reason = this.normalizeReasonWithAliases(payload.result.error);
        if (reason)
        {
          return reason;
        }
        reason = this.normalizeReasonWithAliases(payload.result.status);
        if (reason)
        {
          return reason;
        }
        reason = this.normalizeReasonWithAliases(payload.result.code);
        if (reason)
        {
          return reason;
        }
      }
      return '';
    }

    createSessionError(message, payload, reason, status)
    {
      var error = new Error(message || '[session] user profile request failed');
      if (reason)
      {
        error.reason = reason;
      }
      if (status)
      {
        error.status = status;
      }
      if (payload)
      {
        error.payload = payload;
      }
      if (this.isSessionExpiredReason(reason))
      {
        error.__sessionExpired = true;
      }
      return error;
    }

    cloneUser(user)
    {
      if (!user || typeof user !== 'object')
      {
        return null;
      }
      var serialized;
      try
      {
        serialized = JSON.stringify(user);
      }
      catch (_e)
      {
        return null;
      }
      try
      {
        return JSON.parse(serialized);
      }
      catch (_err)
      {
        return null;
      }
    }

    readFromStorage(configOrKey)
    {
      var key = this.resolveStorageKey(configOrKey);
      var raw = this.safeGet(key);
      if (!raw)
      {
        return null;
      }
      var parsed = this.safeParse(raw);
      if (!parsed || typeof parsed !== 'object')
      {
        return null;
      }
      return this.cloneUser(parsed);
    }

    writeToStorage(configOrKey, user)
    {
      var key = this.resolveStorageKey(configOrKey);
      if (!user || typeof user !== 'object')
      {
        this.safeRemove(key);
        return null;
      }
      var cloned = this.cloneUser(user);
      var serialized = this.safeStringify(cloned);
      if (serialized == null)
      {
        return null;
      }
      if (!this.safeSet(key, serialized))
      {
        return null;
      }
      return cloned;
    }

    clearStorage(configOrKey)
    {
      var key = this.resolveStorageKey(configOrKey);
      this.safeRemove(key);
      return true;
    }

    fetchUserProfile()
    {
      var self = this;
      return new Promise(function (resolve, reject)
      {
        var apiRequest;
        try
        {
          apiRequest = window.Utils.requestApi('User', 'UserGet', {});
        }
        catch (invokeError)
        {
          reject(invokeError);
          return;
        }

        if (!apiRequest || typeof apiRequest.then !== 'function')
        {
          reject(new Error('[session] user profile request did not return a promise-like object'));
          return;
        }

        var handleSuccess = function (payload)
        {
          var statusRaw = (payload && typeof payload.status === 'string') ? payload.status : '';
          var status = statusRaw ? statusRaw.toUpperCase() : '';
          if (status !== 'OK')
          {
            var reason = self.resolvePayloadReason(payload);
            reject(self.createSessionError('[session] user profile request failed (' + (reason || status || 'UNKNOWN') + ')', payload, reason, status));
            return;
          }

          var result = (payload && typeof payload.result === 'object') ? payload.result : null;
          if (!result)
          {
            reject(self.createSessionError('[session] user profile payload is missing result', payload, self.resolvePayloadReason(payload), status));
            return;
          }

          resolve(result);
        };

        var handleFailure = function ()
        {
          if (arguments.length === 1 && arguments[0] instanceof Error)
          {
            var error = arguments[0];
            if (error && typeof error === 'object' && typeof error.reason !== 'string')
            {
              var fallbackReason = '';
              if (error.payload)
              {
                fallbackReason = self.resolvePayloadReason(error.payload);
              }
              if (!fallbackReason && typeof error.code === 'string')
              {
                fallbackReason = self.normalizeReason(error.code);
              }
              if (fallbackReason)
              {
                error.reason = fallbackReason;
              }
            }
            if (error && self.isSessionExpiredReason(error.reason))
            {
              error.__sessionExpired = true;
            }
            reject(error);
            return;
          }

          var xhr = (arguments.length > 0) ? arguments[0] : null;
          var textStatus = (arguments.length > 1 && typeof arguments[1] === 'string') ? arguments[1] : '';
          var errorThrown = (arguments.length > 2) ? arguments[2] : null;
          var payload = null;
          var statusCode = 0;
          var reason = '';

          if (xhr)
          {
            if (typeof xhr.status === 'number' && xhr.status > 0)
            {
              statusCode = xhr.status;
              if ((statusCode === 401 || statusCode === 403) && !reason)
              {
                reason = 'unauthorized';
              }
            }
            if (xhr.responseJSON && typeof xhr.responseJSON === 'object')
            {
              payload = xhr.responseJSON;
            }
            else if (typeof xhr.responseText === 'string' && xhr.responseText)
            {
              try
              {
                payload = JSON.parse(xhr.responseText);
              }
              catch (_parseErr)
              {
                payload = null;
              }
            }
          }

          if (!payload && errorThrown && typeof errorThrown === 'object')
          {
            payload = errorThrown;
          }

          if (!reason && payload)
          {
            reason = self.resolvePayloadReason(payload);
          }

          if (!reason && typeof errorThrown === 'string' && errorThrown)
          {
            reason = self.normalizeReason(errorThrown);
          }

          if (!reason && textStatus)
          {
            reason = self.normalizeReason(textStatus);
          }

          if (!reason && (statusCode === 401 || statusCode === 403))
          {
            reason = 'unauthorized';
          }

          var message = '[session] user profile request failed';
          if (statusCode)
          {
            message += ' (HTTP ' + statusCode + ')';
          }

          var err = self.createSessionError(message, payload, reason, statusCode);
          if (!err.reason && (statusCode === 401 || statusCode === 403))
          {
            err.reason = 'unauthorized';
            err.__sessionExpired = true;
          }
          reject(err);
        };

        apiRequest.then(function (payload)
        {
          try
          {
            handleSuccess(payload);
          }
          catch (processingError)
          {
            reject(processingError);
          }
        }, handleFailure);

        if (typeof apiRequest.catch === 'function')
        {
          apiRequest.catch(function (error)
          {
            if (error && typeof error === 'object')
            {
              error.__sessionAllowSilent = true;
            }
            handleFailure(error);
          });
        }
      });
    }

    safeParse(json)
    {
      try
      {
        return JSON.parse(json);
      }
      catch (_e)
      {
        return null;
      }
    }

    safeStringify(obj)
    {
      try
      {
        return JSON.stringify(obj);
      }
      catch (_e)
      {
        return null;
      }
    }

    safeGet(key)
    {
      try
      {
        return window.localStorage.getItem(key);
      }
      catch (_e)
      {
        return null;
      }
    }

    safeSet(key, val)
    {
      try
      {
        window.localStorage.setItem(key, val);
        return true;
      }
      catch (_e)
      {
        return false;
      }
    }

    safeRemove(key)
    {
      try
      {
        window.localStorage.removeItem(key);
        return true;
      }
      catch (_e)
      {
        return false;
      }
    }
  }

  var Services = window.Services = window.Services || {};
  var namespace = Services.sessionJobs || (Services.sessionJobs = {});
  namespace.JobGeneral = namespace.JobGeneral || SessionJobGeneral;

  var generalInstance = SessionJobGeneral.getInstance();
  var ServicesGeneral = window.ServicesGeneral = window.ServicesGeneral || {};
  ServicesGeneral.session = {
    resolveStorageKey: generalInstance.resolveStorageKey.bind(generalInstance),
    readFromStorage: generalInstance.readFromStorage.bind(generalInstance),
    writeToStorage: generalInstance.writeToStorage.bind(generalInstance),
    clearStorage: generalInstance.clearStorage.bind(generalInstance),
    fetchUserProfile: generalInstance.fetchUserProfile.bind(generalInstance),
    cloneUser: generalInstance.cloneUser.bind(generalInstance),
    normalizeReason: generalInstance.normalizeReason.bind(generalInstance),
    isSessionExpiredReason: generalInstance.isSessionExpiredReason.bind(generalInstance),
    resolvePayloadReason: generalInstance.resolvePayloadReason.bind(generalInstance)
  };

})(window);
