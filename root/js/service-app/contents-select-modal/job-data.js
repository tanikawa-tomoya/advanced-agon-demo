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

  function resolveSource(record)
  {
    if (!record)
    {
      return null;
    }
    return record.raw || record;
  }

  function formatDateTime(date)
  {
    if (!(date instanceof Date) || isNaN(date.getTime()))
    {
      return '';
    }
    var y = date.getFullYear();
    var m = ('0' + (date.getMonth() + 1)).slice(-2);
    var d = ('0' + date.getDate()).slice(-2);
    var hh = ('0' + date.getHours()).slice(-2);
    var mm = ('0' + date.getMinutes()).slice(-2);
    return y + '/' + m + '/' + d + ' ' + hh + ':' + mm;
  }

  function extractExtension(record)
  {
    var source = resolveSource(record);
    var path = normalizeText(source && (source.fileName || source.filePath || source.contentPath || source.url));
    var matched = path.match(/\.([^.\/#?]+)(?:$|[?#])/);
    return matched && matched[1] ? matched[1].toLowerCase() : '';
  }

  class JobData
  {
    constructor(service)
    {
      this.service = service;
      this.cacheMap = Object.create(null);
      this.promiseMap = Object.create(null);
    }

    clearCache()
    {
      this.cacheMap = Object.create(null);
      this.promiseMap = Object.create(null);
    }

    buildCacheKey(options)
    {
      var userId = normalizeText(options && options.userId);
      var userCode = normalizeText(options && options.userCode);
      var parts = [];
      if (userId)
      {
        parts.push('id:' + userId);
      }
      if (userCode)
      {
        parts.push('code:' + userCode);
      }
      if (!parts.length)
      {
        parts.push('all');
      }
      return parts.join('|');
    }

    resolveRequestParams(options)
    {
      var params = {};
      var userId = normalizeText(options && options.userId);
      var userCode = normalizeText(options && options.userCode);
      if (userId)
      {
        params.userId = userId;
      }
      if (userCode)
      {
        params.userCode = userCode;
      }
      return params;
    }

    parseTimestamp(value)
    {
      if (!value)
      {
        return { value: 0, label: '' };
      }
      var date = new Date(value);
      if (isNaN(date.getTime()))
      {
        return { value: 0, label: '' };
      }
      return { value: date.getTime(), label: formatDateTime(date) };
    }

    normalizeVisibilityFlag(value)
    {
      if (value === undefined || value === null)
      {
        return true;
      }
      if (typeof value === 'string')
      {
        var lower = value.toLowerCase();
        if (lower === 'false' || lower === '0' || lower === 'hidden' || lower === 'inactive')
        {
          return false;
        }
        return true;
      }
      if (value === false || value === 0)
      {
        return false;
      }
      if (!Number.isNaN(Number(value)))
      {
        return Number(value) !== 0;
      }
      return true;
    }

  resolveKind(record)
  {
      var source = resolveSource(record) || {};
      var contentType = normalizeText(source.contentType).toLowerCase();
      var mimeType = normalizeText(source.mimeType || source.mime).toLowerCase();
      var declaredKind = normalizeText(source.kind || source.type || source.contentKind).toLowerCase();
      var preferredKind = declaredKind || contentType;
      if (preferredKind === 'video' || preferredKind === 'movie') return 'movie';
      if (preferredKind === 'image') return 'image';
      if (preferredKind === 'audio') return 'audio';
      if (preferredKind === 'pdf' || preferredKind === 'application/pdf') return 'pdf';
      if (contentType === 'video') return 'movie';
      if (contentType === 'image') return 'image';
      if (contentType === 'audio') return 'audio';
      if (contentType === 'pdf' || contentType === 'application/pdf' || mimeType.indexOf('application/pdf') === 0) return 'pdf';
      if (mimeType.indexOf('image/') === 0) return 'image';
      if (mimeType.indexOf('video/') === 0) return 'movie';
      if (mimeType.indexOf('audio/') === 0) return 'audio';
      var extension = extractExtension(record);
      var videoExt = ['mp4', 'mov', 'm4v', 'webm', 'mkv'];
      var imageExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      var audioExt = ['mp3', 'wav', 'aac', 'flac', 'm4a', 'ogg'];
      if (extension && videoExt.indexOf(extension) !== -1) return 'movie';
      if (extension && imageExt.indexOf(extension) !== -1) return 'image';
      if (extension && audioExt.indexOf(extension) !== -1) return 'audio';
      if (extension === 'pdf') return 'pdf';
      return 'file';
    }

  buildContentFileUrl(record)
  {
      var source = resolveSource(record);
      if (!source)
      {
        return '';
      }
      var path = normalizeText(
        (source && (source.filePath || source.contentPath || source.url || source.fileUrl))
        || (record && (record.filePath || record.contentPath || record.url || record.fileUrl))
        || ''
      );
      if (path)
      {
        var isAbsolute = /^https?:\/\//i.test(path) || path.indexOf('/') === 0;
        if (isAbsolute)
        {
          return path;
        }
      }
      var api = (this.service && typeof this.service.getApiConfig === 'function')
        ? this.service.getApiConfig('ContentFileGet')
        : (this.service && this.service.config ? this.service.config : {});
      var requestType = api.requestType || 'Contents';
      var endpoint = api.endpoint || '';
      var token = api.token || '';
      var contentCode = source.contentCode || source.content_code || source.contentId || source.contentID || source.code;
      if (!endpoint || !contentCode)
      {
        return '';
      }
      var queryParams = [
        ['requestType', requestType],
        ['type', 'ContentFileGet'],
        ['token', token],
        ['contentCode', contentCode]
      ];
      var query = queryParams
        .filter(function (entry)
        {
          return entry[1] !== undefined && entry[1] !== null;
        })
        .map(function (entry)
        {
          return encodeURIComponent(entry[0]) + '=' + encodeURIComponent(entry[1]);
        })
        .join('&');
      return endpoint + '?' + query;
    }

  buildContentImageUrl(record, options)
  {
      var source = resolveSource(record);
      if (!source)
      {
        return '';
      }

      var variant = options && options.variant ? String(options.variant).toLowerCase() : '';
      var thumb = normalizeText(
        source && (source.thumbnailUrl || source.thumbnailPath || source.thumbnail || source.thumbnail_url || source.thumbnail_path || source.posterUrl || source.poster_path || source.poster || source.previewImageUrl || source.preview_image_url)
      );
      if (!thumb && source && source.filePath)
      {
        thumb = String(source.filePath);
      }

      if (!thumb)
      {
        return '';
      }

      if (/^https?:\/\//i.test(thumb) || thumb.indexOf('/') === 0)
      {
        return thumb;
      }

      var contentCode = source.contentCode || source.content_code || source.contentId || source.contentID || source.code;
      if (!contentCode)
      {
        return '';
      }

      var cfg = (this.service && typeof this.service.getApiConfig === 'function')
        ? this.service.getApiConfig('ContentImageGet')
        : (this.service && this.service.config ? this.service.config : {});
      var requestType = cfg.requestType || 'Contents';
      var endpoint = cfg.endpoint || '';
      var token = cfg.token || '';

      if (window.Utils && typeof window.Utils.buildApiRequestOptions === 'function')
      {
        try
        {
          var defaults = window.Utils.buildApiRequestOptions(requestType, 'ContentImageGet', {});
          if (!endpoint && defaults && typeof defaults.url === 'string')
          {
            endpoint = defaults.url;
          }
          if (!token && defaults && defaults.data && typeof defaults.data.get === 'function')
          {
            token = defaults.data.get('token') || token;
          }
        }
        catch (_err)
        {
          // ignore
        }
      }

      if (!endpoint)
      {
        endpoint = window.Utils && typeof window.Utils.getApiEndpoint === 'function' ? window.Utils.getApiEndpoint() : '';
      }

      if (!endpoint)
      {
        return '';
      }

      var queryParams = [
        ['requestType', requestType],
        ['type', 'ContentImageGet'],
        ['token', token],
        ['contentCode', contentCode]
      ];

      if (variant === 'thumbnail')
      {
        queryParams.push(['variant', 'thumbnail']);
      }

      var query = queryParams
        .filter(function (entry)
        {
          return entry[1] !== undefined && entry[1] !== null;
        })
        .map(function (entry)
        {
          return encodeURIComponent(entry[0]) + '=' + encodeURIComponent(entry[1]);
        })
        .join('&');

      return endpoint + '?' + query;
    }

  resolveTitle(record, kind)
  {
      var source = resolveSource(record) || {};
      var baseTitle = normalizeText(source.title || source.name || source.fileName || source.contentName);
      if (baseTitle)
      {
        return baseTitle;
      }
      if (kind === 'movie') return '動画コンテンツ';
      if (kind === 'image') return '画像コンテンツ';
      if (kind === 'audio') return '音声コンテンツ';
      if (kind === 'pdf') return 'PDF';
      return 'ファイルコンテンツ';
    }

  normalizeItem(record)
  {
      if (!record)
      {
        return null;
      }
      var source = resolveSource(record) || {};
      var kind = this.resolveKind(source);
      var idBase = source.contentCode || source.id || source.uuid || source.code || normalizeText(source.fileName);
      var identifier = kind + '-' + (idBase || String(Date.now()));
      var timestamp = this.parseTimestamp(source.updatedAt || source.createdAt || source.registeredAt);
      var title = this.resolveTitle(source, kind);
      var description = normalizeText(source.description || source.memo || source.note || source.summary);
      var isVisible = this.normalizeVisibilityFlag(source.isVisible);
      var fileUrl = this.buildContentFileUrl(source);
      var thumbnailUrl = this.buildContentImageUrl(source, { variant: 'thumbnail' });
      if (!thumbnailUrl && kind === 'image')
      {
        thumbnailUrl = fileUrl;
      }
      var searchParts = [
        title,
        description,
        normalizeText(source.contentCode || source.id || ''),
        normalizeText(source.fileName || ''),
        kind
      ];
      var searchText = searchParts
        .map(function (part)
        {
          return (part || '').toString().toLowerCase();
        })
        .join(' ');
      return {
        id: identifier,
        kind: kind,
        title: title,
        description: description,
        isVisible: isVisible,
        visibilityLabel: isVisible ? '表示' : '非表示',
        updatedAt: timestamp.value,
        updatedAtLabel: timestamp.label,
        fileUrl: fileUrl,
        thumbnailUrl: thumbnailUrl,
        raw: source,
        _searchText: searchText
      };
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
        var entry = this.normalizeItem(list[i]);
        if (entry)
        {
          normalized.push(entry);
        }
      }
      return normalized;
    }

    filterList(list, filters)
    {
      var keyword = normalizeText(filters && filters.keyword).toLowerCase();
      var kind = normalizeText(filters && filters.kind).toLowerCase();
      var filtered = Array.isArray(list)
        ? list.filter(function (item)
        {
          return item && item.isVisible !== false;
        })
        : [];
      if (keyword)
      {
        filtered = filtered.filter(function (item)
        {
          return item._searchText && item._searchText.indexOf(keyword) >= 0;
        });
      }
      if (kind)
      {
        filtered = filtered.filter(function (item)
        {
          return (item.kind || '').toLowerCase() === kind;
        });
      }
      return filtered;
    }

    collectKinds(list)
    {
      var kinds = [];
      var seen = {};
      for (var i = 0; i < list.length; i += 1)
      {
        var kind = normalizeText(list[i].kind);
        if (kind && !seen[kind])
        {
          seen[kind] = true;
          kinds.push(kind);
        }
      }
      return kinds;
    }

    async fetchContents(options)
    {
      var cfg = this.service && this.service.config ? this.service.config : {};
      var response = await window.Utils.requestApi(
        cfg.requestType || 'Contents',
        cfg.listType || 'ContentList',
        this.resolveRequestParams(options)
      );
      if (!response)
      {
        throw new Error(cfg.text && cfg.text.errorMessage ? cfg.text.errorMessage : 'コンテンツの取得に失敗しました');
      }
      var statusRaw = typeof response.status === 'string' ? response.status : '';
      var status = statusRaw.toUpperCase();
      if (status && status !== 'OK')
      {
        var message = response.response || response.result || response.reason || (cfg.text && cfg.text.errorMessage);
        throw new Error(message || 'コンテンツの取得に失敗しました');
      }
      var result = response.result || response.list || response.items || response.contents || response;
      var list = [];
      if (Array.isArray(result))
      {
        list = result;
      }
      else if (result && Array.isArray(result.items))
      {
        list = result.items;
      }
      return this.normalizeList(list);
    }

    async getContents(options)
    {
      var opts = options || {};
      var cacheKey = this.buildCacheKey(opts);
      if (opts.forceRefresh)
      {
        delete this.cacheMap[cacheKey];
        delete this.promiseMap[cacheKey];
      }
      if (Array.isArray(this.cacheMap[cacheKey]) && this.cacheMap[cacheKey])
      {
        return this.cacheMap[cacheKey].slice();
      }
      if (!this.promiseMap[cacheKey])
      {
        this.promiseMap[cacheKey] = this.fetchContents(opts)
          .then((list) =>
          {
            this.cacheMap[cacheKey] = list.slice();
            return this.cacheMap[cacheKey].slice();
          })
          .catch((error) =>
          {
            this.cacheMap[cacheKey] = [];
            throw error;
          })
          .finally(() =>
          {
            this.promiseMap[cacheKey] = null;
          });
      }
      return this.promiseMap[cacheKey].then((list) => list.slice());
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.ContentsSelectModal || (Services.ContentsSelectModal = {});
  NS.JobData = NS.JobData || JobData;

})(window, document);
