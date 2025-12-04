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
    var keys = ['title', 'targetCode', 'description', 'category', 'status'];
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

  function isActiveTarget(entry)
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
    if (entry.status === 'inactive')
    {
      return false;
    }
    return true;
  }

  class JobData
  {
    constructor(service)
    {
      this.service = service;
      this.cache = [];
      this.promise = null;
    }

    normalizeTarget(entry)
    {
      if (!entry || typeof entry !== 'object')
      {
        return null;
      }
      var title = normalizeText(entry.title || entry.targetTitle || entry.name || entry.label || '');
      var code = normalizeText(entry.targetCode || entry.code || entry.id || entry.uuid || '');
      var status = normalizeText(entry.statusLabel || entry.status || entry.state || entry.stateLabel || '');
      var description = normalizeText(entry.description || entry.summary || '');
      var category = normalizeText(entry.category || entry.tag || entry.type || '');
      var isActive = isActiveTarget(entry);
      var normalized = {
        title: title,
        targetCode: code,
        status: status,
        description: description,
        category: category,
        isActive: isActive,
        displayName: title || code,
        userCode: code,
        mail: description,
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
        var entry = this.normalizeTarget(list[i]);
        if (entry && entry.isActive !== false)
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

    async requestAllTargets()
    {
      var cfg = this.service && this.service.config ? this.service.config : {};
      var json;
      try
      {
        json = await window.Utils.requestApi(cfg.requestType || 'TargetManagementTargets', cfg.targetListType || 'TargetListParticipating', {});
      }
      catch (error)
      {
        if (error && error.name === 'SyntaxError')
        {
          throw new Error('サーバー応答を解析できませんでした。');
        }
        throw new Error('ターゲット情報の取得に失敗しました。');
      }
      if (!json || json.status !== 'OK')
      {
        var error = new Error(json && json.reason ? json.reason : 'ターゲット情報の取得に失敗しました。');
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
        if (Array.isArray(payload.targetList))
        {
          result = payload.targetList;
        }
        else if (Array.isArray(payload.targets))
        {
          result = payload.targets;
        }
        else if (Array.isArray(payload.items))
        {
          result = payload.items;
        }
      }

      return this.normalizeList(result);
    }

    async getAllTargets(options)
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
        this.promise = this.requestAllTargets()
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

  var w = window;
  w.Services = w.Services || {};
  var NS = w.Services.TargetSelectModal || (w.Services.TargetSelectModal = {});
  NS.JobData = NS.JobData || JobData;

})(window, document);
