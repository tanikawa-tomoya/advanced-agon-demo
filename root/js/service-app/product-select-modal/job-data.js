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
    var keys = ['title', 'materialCode', 'description', 'category', 'ownerDisplayName', 'fileName'];
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

  class JobData
  {
    constructor(service)
    {
      this.service = service;
      this.cache = [];
      this.promise = null;
      this.cacheTargetCode = '';
    }

    normalizeMaterial(entry)
    {
      if (!entry || typeof entry !== 'object')
      {
        return null;
      }
      var title = normalizeText(entry.title || entry.fileName || entry.name || entry.label || '');
      var code = normalizeText(entry.materialCode || entry.contentCode || entry.code || entry.id || entry.uuid || '');
      var description = normalizeText(entry.description || entry.summary || '');
      var category = normalizeText(entry.category || entry.tag || entry.type || '');
      var owner = normalizeText(entry.ownerDisplayName || entry.ownerUserCode || entry.owner || '');
      var targetCode = normalizeText(entry.targetCode || '');
      var fileName = normalizeText(entry.fileName || '');
      var updatedAt = normalizeText(entry.updatedAt || entry.updatedAtDisplay || entry.updatedOn || '');
      var createdAt = normalizeText(entry.createdAt || entry.createdOn || '');
      var normalized = {
        title: title,
        materialCode: code,
        description: description,
        category: category,
        ownerDisplayName: owner,
        targetCode: targetCode,
        fileName: fileName,
        updatedAt: updatedAt,
        createdAt: createdAt,
        displayName: title || code,
        code: code,
        linkUrl: entry.linkUrl || '',
        downloadUrl: entry.downloadUrl || '',
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
        var entry = this.normalizeMaterial(list[i]);
        if (entry)
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
      this.cacheTargetCode = '';
    }

    async requestAllMaterials(options)
    {
      var cfg = this.service && this.service.config ? this.service.config : {};
      var opts = options || {};
      var targetCode = normalizeText(opts.targetCode || cfg.targetCode || '');
      if (!targetCode)
      {
        throw new Error('ターゲットが指定されていません。');
      }
      var json;
      try
      {
        json = await window.Utils.requestApi(cfg.requestType || 'TargetManagementProducts', cfg.requestName || 'TargetProductList', { targetCode: targetCode });
      }
      catch (error)
      {
        if (error && error.name === 'SyntaxError')
        {
          throw new Error('サーバー応答を解析できませんでした。');
        }
        throw new Error('商品資料の取得に失敗しました。');
      }
      if (!json || json.status !== 'OK')
      {
        var error = new Error(json && json.reason ? json.reason : '商品資料の取得に失敗しました。');
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
        if (Array.isArray(payload.materials))
        {
          result = payload.materials;
        }
        else if (Array.isArray(payload.items))
        {
          result = payload.items;
        }
      }

      return this.normalizeList(result);
    }

    async getAllMaterials(options)
    {
      var cfg = this.service && this.service.config ? this.service.config : {};
      var opts = options || {};
      var requestedTargetCode = normalizeText(opts.targetCode || cfg.targetCode || '');
      if (requestedTargetCode !== this.cacheTargetCode)
      {
        this.clearCache();
      }
      opts.targetCode = requestedTargetCode;
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
        this.promise = this.requestAllMaterials(opts)
          .then((list) =>
          {
            this.cache = list.slice();
            this.cacheTargetCode = requestedTargetCode;
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
  var NS = w.Services.ProductSelectModal || (w.Services.ProductSelectModal = {});
  NS.JobData = NS.JobData || JobData;

})(window, document);
