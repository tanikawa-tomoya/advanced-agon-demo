(function ()
{
  'use strict';

  function normalizeText(value)
  {
    if (value === null || value === undefined)
    {
      return '';
    }
    return String(value).trim();
  }

  function buildSearchText(entry)
  {
    var parts = [];
    var keys = ['displayName', 'userCode', 'mail', 'userNumber', 'userGroup'];
    for (var i = 0; i < keys.length; i += 1)
    {
      var value = entry[keys[i]];
      if (value)
      {
        parts.push(String(value).toLowerCase());
      }
    }
    return parts.join(' ');
  }

  function isActiveUser(entry)
  {
    if (!entry || typeof entry !== 'object')
    {
      return true;
    }
    if (entry.isActive === false || entry.isActive === 0 || entry.isActive === '0' || entry.isActive === 'false')
    {
      return false;
    }
    if (entry.active === false || entry.active === 0 || entry.active === '0' || entry.active === 'false')
    {
      return false;
    }
    if (typeof entry.status === 'string' && entry.status.toLowerCase() === 'inactive')
    {
      return false;
    }
    return true;
  }

  function isSupervisorUser(entry)
  {
    if (!entry || typeof entry !== 'object')
    {
      return false;
    }
    var flags = [entry.isSupervisor, entry.supervisor];
    for (var i = 0; i < flags.length; i += 1)
    {
      var value = flags[i];
      if (value === true || value === 1 || value === '1' || value === 'true')
      {
        return true;
      }
    }
    if (typeof entry.role === 'string' && entry.role.toLowerCase() === 'supervisor')
    {
      return true;
    }
    return false;
  }

  function isOperatorUser(entry)
  {
    if (!entry || typeof entry !== 'object')
    {
      return false;
    }
    var flags = [entry.isOperator, entry.operator];
    for (var i = 0; i < flags.length; i += 1)
    {
      var value = flags[i];
      if (value === true || value === 1 || value === '1' || value === 'true')
      {
        return true;
      }
    }
    if (typeof entry.role === 'string' && entry.role.toLowerCase() === 'operator')
    {
      return true;
    }
    return false;
  }

  class JobData
  {
    constructor(service)
    {
      this.service = service;
      this.cache = [];
      this.promise = null;
    }

    normalizeUser(entry)
    {
      if (!entry || typeof entry !== 'object')
      {
        return null;
      }
      var userId = null;
      if (Object.prototype.hasOwnProperty.call(entry, 'userId'))
      {
        userId = entry.userId;
      }
      else if (Object.prototype.hasOwnProperty.call(entry, 'id'))
      {
        userId = entry.id;
      }
      var displayName = normalizeText(entry.displayName || entry.name || entry.fullName || '');
      var userCode = normalizeText(entry.userCode || entry.code || entry.loginId || entry.userId || '');
      var mail = normalizeText(entry.mail || entry.mail || entry.mailAddress || '');
      var userGroup = normalizeText(entry.userGroup || entry.group || entry.groupName || '');
      var isActive = isActiveUser(entry);
      var isSupervisor = isSupervisorUser(entry);
      var isOperator = isOperatorUser(entry);
      var normalized = {
        id: userId,
        userId: userId,
        displayName: displayName,
        userCode: userCode,
        mail: mail,
        userGroup: userGroup,
        avatar: entry.avatar || entry.avatarUrl || entry.photoUrl || '',
        isActive: isActive,
        isSupervisor: isSupervisor,
        isOperator: isOperator,
        _searchText: ''
      };
      normalized._searchText = buildSearchText(normalized);
      return normalized;
    }

    normalizeList(list)
    {
      if (!Array.isArray(list))
      {
        return [];
      }
      var normalized = [];
      for (var i = 0; i < list.length; i += 1)
      {
        var entry = this.normalizeUser(list[i]);
        if (entry && entry.isActive !== false && entry.isSupervisor !== true)
        {
          normalized.push(entry);
        }
      }
      return normalized;
    }

    clearCache()
    {
      this.cache = [];
      this.promise = null;
    }

    async requestAllUsers()
    {
      var cfg = this.service && this.service.config ? this.service.config : {};
      var formData = new window.FormData();
      formData.append('requestType', cfg.requestType || 'User');
      formData.append('token', cfg.token || window.Utils.getApiToken());
      formData.append('type', cfg.userListType || 'UserGetAll');
      var response = await window.fetch(window.Utils.getApiEndpoint(), {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!response.ok)
      {
        throw new Error('ユーザー情報の取得に失敗しました。');
      }
      var json;
      try
      {
        json = await response.json();
      }
      catch (error)
      {
        throw new Error('サーバー応答を解析できませんでした。');
      }
      if (!json || json.status !== 'OK')
      {
        var error = new Error(json && json.reason ? json.reason : 'ユーザー情報の取得に失敗しました。');
        if (json && json.reason)
        {
          error.code = json.reason;
        }
        throw error;
      }

      var result = [];
      var payload = json.result;
      if (Array.isArray(payload))
      {
        result = payload;
      }
      else if (payload && typeof payload === 'object')
      {
        if (Array.isArray(payload.userList))
        {
          result = payload.userList;
        }
        else if (Array.isArray(payload.users))
        {
          result = payload.users;
        }
        else if (Array.isArray(payload.items))
        {
          result = payload.items;
        }
      }

      return this.normalizeList(result);
    }

    async getAllUsers(options)
    {
      var opts = options || {};
      if (opts.forceRefresh)
      {
        this.clearCache();
      }
      if (this.cache.length && !opts.forceRefresh)
      {
        return this.cache.slice();
      }
      if (!this.promise)
      {
        this.promise = this.requestAllUsers()
          .then((list) =>
          {
            this.cache = list.slice();
            return this.cache.slice();
          })
          .catch((error) =>
          {
            this.cache = [];
            throw error;
          })
          .finally(() =>
          {
            this.promise = null;
          });
      }
      return this.promise.then((list) => list.slice());
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.UserSelectModal || (Services.UserSelectModal = {});
  NS.JobData = NS.JobData || JobData;

})(window, document);
