/* utils.js ? flattened APIs on window.Utils (Allman style, no ESM) */
(function ()
{
  'use strict';

  // Namespace (browser only)
  var Utils = window.Utils || (window.Utils = {});

  Utils.getApiToken = function getApiToken()
  {
    return '1234ABCDabcd';
  };

  Utils.getApiEndpoint = function getApiEndpoint()
  {
    return '/scripts/request.php';
  };

  // ---------------------------------------------------------------------------
  // Type checks / core helpers
  // ---------------------------------------------------------------------------

  Utils.isString = function isString(value)
  {
    return typeof value === 'string' || value instanceof String;
  };

  Utils.isNumber = function isNumber(value)
  {
    return typeof value === 'number' && !isNaN(value);
  };

  Utils.isArray = function isArray(value)
  {
    return Array.isArray(value);
  };

  Utils.isPlainObject = function isPlainObject(value)
  {
    return Object.prototype.toString.call(value) === '[object Object]';
  };

  Utils.clamp = function clamp(number, min, max)
  {
    number = Number(number);
    if (isNaN(number))
    {
      return NaN;
    }
    return Math.min(Math.max(number, min), max);
  };

  Utils.noop = function noop()
  {
  };

  // ---------------------------------------------------------------------------
  // Deep compare (arrays / plain objects / NaN)
  // ---------------------------------------------------------------------------

  Utils.deepEqual = function deepEqual(a, b)
  {
    if (a === b)
    {
      return true;
    }

    if (Utils.isArray(a) && Utils.isArray(b))
    {
      if (a.length !== b.length)
      {
        return false;
      }
      for (var i = 0; i < a.length; i++)
      {
        if (!deepEqual(a[i], b[i]))
        {
          return false;
        }
      }
      return true;
    }

    if (Utils.isPlainObject(a) && Utils.isPlainObject(b))
    {
      var ka = Object.keys(a);
      var kb = Object.keys(b);
      if (ka.length !== kb.length)
      {
        return false;
      }
      for (var j = 0; j < ka.length; j++)
      {
        var k = ka[j];
        if (!Object.prototype.hasOwnProperty.call(b, k))
        {
          return false;
        }
        if (!deepEqual(a[k], b[k]))
        {
          return false;
        }
      }
      return true;
    }

    // NaN equality
    if (typeof a === 'number' && typeof b === 'number' && isNaN(a) && isNaN(b))
    {
      return true;
    }

    return false;
  };

  // ---------------------------------------------------------------------------
  // Script loader (keeps execution order)
  // ---------------------------------------------------------------------------

  Utils.loadScriptAsync = function loadScriptAsync (src)
  {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.async = false; // 実行順序を守る
      s.onload = function () { resolve(true); };
      s.onerror = function () { reject(new Error('Failed to load: ' + src)); };
      document.head.appendChild(s);
    });
  }

  Utils.loadScriptsSync = function loadScriptsSync(list)
  {
    // 配列しか受け付けない
    if (!Array.isArray(list)) {
      throw new Error('Utils.loadScriptSync: argument must be an array');
    }

    for (var i = 0; i < list.length; i += 1)
    {
      var item = list[i] || {};
      
      // 二重ロード防止（data-sync-src をキーにする）
      if (document.querySelector('script[data-sync-src="' + src + '"]'))
      {
        continue;
      }

      var xhr = new XMLHttpRequest();
      xhr.open('GET', src, false); // 同期（ブロッキング）
      xhr.send(null);

      // HTTP では 200 以外は失敗扱い。0 は file:// 想定で許容
      if (xhr.status !== 200 && xhr.status !== 0) {
        throw new Error(
          'Failed to load: ' + src + ' (status ' + xhr.status + ')'
        );
      }

      var s = document.createElement('script');
      s.text = xhr.responseText;
      s.async = false;
      s.setAttribute('data-sync-src', src);
      document.head.appendChild(s);
    }
  };

  function loadOneScript(item)
  {
    return new Promise(function (resolve, reject)
    {
      var d = document;
      var src = (typeof item === 'string') ? item : (item && item.src);

      if (!src)
      {
        resolve();
        return;
      }

      var s = document.createElement('script');
      s.src = src;
      s.async = false; // keep relative execution order

      s.onload = function ()
      {
        resolve();
      };

      s.onerror = function ()
      {
        reject(new Error('[Utils] failed to load: ' + src));
      };

      document.head.appendChild(s);
    });
  }

  Utils.loadScriptsSync = function loadScriptsSync(list)
  {
    if (!list)
    {
      return Promise.resolve();
    }

    if (!Array.isArray(list))
    {
      list = [list];
    }

    var chain = Promise.resolve();

    for (var i = 0; i < list.length; i++)
    {
      (function (it)
      {
        chain = chain.then(function ()
        {
          return loadOneScript(it);
        });
      })(list[i]);
    }

    return chain;
  };

  // Legacy synchronous XHR loader (kept for backward compatibility)
  Utils.loadScriptsSyncLegacy = function loadScriptsSyncLegacy(list)
  {
    var deps = Array.isArray(list) ? list : [];

    for (var i = 0; i < deps.length; i += 1)
    {
      var item = deps[i] || {};
      var src = item.src || item;

      if (!src)
      {
        continue;
      }

      if (document.querySelector('script[id="' + src + '"]'))
      {
        continue;
      }

      var xhr = new XMLHttpRequest();
      xhr.open('GET', src, false);
      xhr.send(null);

      var sc = document.createElement('script');
      sc.id = src;
      sc.text = xhr.responseText;
      document.head.appendChild(sc);
    }
  };

  // ---------------------------------------------------------------------------
  // FormData / API request helpers
  // ---------------------------------------------------------------------------

  Utils.ensureFormData = function ensureFormData(input)
  {
    if (typeof FormData === 'function' && input instanceof FormData)
    {
      return input;
    }

    if (typeof FormData !== 'function')
    {
      throw new Error('FormData is not supported in this environment');
    }

    var fd = new FormData();

      if (input && typeof input === 'object')
      {
        Object.keys(input).forEach(function (key)
        {
          var value = input[key];

          if (typeof value === 'undefined' || value === null)
          {
            return;
          }

          if (value instanceof Blob)
          {
            fd.append(key, value);
            return;
          }

          if (typeof value === 'object')
          {
            try
            {
              fd.append(key, JSON.stringify(value));
              return;
            }
            catch (e)
            {
              // fall through to append as-is
            }
          }

          fd.append(key, value);
        });
      }

    return fd;
  };

  Utils.buildApiRequestOptions = function buildApiRequestOptions(requestType, type, formData, overrides)
  {
    // tokenは上位のフォームからの指定は禁止のため、例外を出す
    if (formData.token) {
      throw new Error('FormData is not supported in this environment');
    }
    
    var fd = Utils.ensureFormData(formData);
    fd.set('requestType', requestType);
    fd.set('type', type);
    fd.set('token', Utils.getApiToken());

    var options =
    {
      url: Utils.getApiEndpoint(),
      type: 'POST',
      data: fd,
      processData: false,
      contentType: false,
      cache: false,
      dataType: 'json'
    };

    if (overrides && typeof overrides === 'object')
    {
      if (typeof overrides.url === 'string' && overrides.url)
      {
        options.url = overrides.url;
      }
      if (typeof overrides.type === 'string' && overrides.type)
      {
        options.type = overrides.type;
      }
      if (typeof overrides.dataType === 'string' && overrides.dataType)
      {
        options.dataType = overrides.dataType;
      }
      if (overrides.xhrFields && typeof overrides.xhrFields === 'object')
      {
        options.xhrFields = overrides.xhrFields;
      }
      if (overrides.headers && typeof overrides.headers === 'object')
      {
        options.headers = overrides.headers;
      }
      if (overrides.signal)
      {
        options.signal = overrides.signal;
      }
      if (typeof overrides.beforeSend === 'function')
      {
        options.beforeSend = overrides.beforeSend;
      }
      if (typeof overrides.complete === 'function')
      {
        options.complete = overrides.complete;
      }
      if (typeof overrides.success === 'function')
      {
        options.success = overrides.success;
      }
      if (typeof overrides.error === 'function')
      {
        options.error = overrides.error;
      }
    }

    return options;
  };

  Utils.requestApi = function requestApi(requestType, type, formData, overrides)
  {
    var options = Utils.buildApiRequestOptions(requestType, type, formData, overrides);
    var $ = window.jQuery || window.$;

    if ($ && typeof $.ajax === 'function')
    {
      return $.ajax(options);
    }

    if (typeof window.fetch === 'function')
    {
      var fetchOptions =
      {
        method: options.type || 'POST',
        body: options.data,
        credentials: 'include',
        cache: 'no-store'
      };

      if (options.headers && typeof options.headers === 'object')
      {
        fetchOptions.headers = options.headers;
      }

      if (options.signal)
      {
        fetchOptions.signal = options.signal;
      }

      return window.fetch(options.url, fetchOptions).then(function (response)
      {
        if (!response.ok)
        {
          var error = new Error('Request failed with status ' + response.status);
          error.response = response;
          throw error;
        }

        if (options.dataType === 'json')
        {
          return response.json();
        }

        return response.text();
      });
    }

    throw new Error('No supported AJAX implementation found');
  };

  // ---------------------------------------------------------------------------
  // Data / querystring / URL
  // ---------------------------------------------------------------------------

  Utils.jsonSafeParse = function jsonSafeParse(s, fallback)
  {
    try
    {
      return JSON.parse(String(s));
    }
    catch (e)
    {
      return arguments.length > 1 ? fallback : null;
    }
  };

  Utils.qsParse = function qsParse(qs)
  {
    var out = {};

    if (!qs)
    {
      return out;
    }

    if (qs.charAt(0) === '?')
    {
      qs = qs.slice(1);
    }

    qs.split('&').forEach(function (pair)
    {
      if (!pair)
      {
        return;
      }

      var i = pair.indexOf('=');
      var k = i >= 0 ? pair.slice(0, i) : pair;
      var v = i >= 0 ? pair.slice(i + 1) : '';

      k = decodeURIComponent(k.replace(/\+/g, ' '));
      v = decodeURIComponent(v.replace(/\+/g, ' '));

      if (out[k] === undefined)
      {
        out[k] = v;
      }
      else if (Array.isArray(out[k]))
      {
        out[k].push(v);
      }
      else
      {
        out[k] = [out[k], v];
      }
    });

    return out;
  };

  Utils.qsStringify = function qsStringify(obj)
  {
    if (!obj || typeof obj !== 'object')
    {
      return '';
    }

    var parts = [];

    Object.keys(obj).forEach(function (k)
    {
      var v = obj[k];

      if (v == null)
      {
        return;
      }

      if (Array.isArray(v))
      {
        v.forEach(function (vv)
        {
          parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(vv)));
        });
      }
      else
      {
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
      }
    });

    return parts.join('&');
  };

  Utils.urlJoin = function urlJoin()
  {
    var parts = Array.prototype.slice.call(arguments).filter(Boolean);
    var out = parts.join('/');

    out = out.replace(/\/{2,}/g, '/');          // collapse multiple slashes
    out = out.replace(/^([a-z]+:)\//i, '$1//');  // keep protocol slashes

    return out;
  };

  Utils.urlAddQuery = function urlAddQuery(url, qobj)
  {
    var q = Utils.qsStringify(qobj);

    if (!q)
    {
      return url;
    }

    return url + (url.indexOf('?') === -1 ? '?' : '&') + q;
  };

  Utils.urlSameOrigin = function urlSameOrigin(a, b)
  {
    try
    {
      var A = new URL(a, location.origin);
      var B = new URL(b, location.origin);
      return A.protocol === B.protocol && A.host === B.host;
    }
    catch (e)
    {
      return false;
    }
  };

  // ---------------------------------------------------------------------------
  // Dev utils
  // ---------------------------------------------------------------------------

  Utils.assert = function assert(cond, msg)
  {
    if (!cond)
    {
      throw new Error(msg || 'Assertion failed');
    }
  };

  Utils.warn = function warn(msg)
  {
    if (typeof console !== 'undefined' && console.warn)
    {
      console.warn(msg);
    }
  };

  Utils.once = function once(fn)
  {
    var done = false;
    var val;

    return function ()
    {
      if (done)
      {
        return val;
      }
      done = true;
      val = fn.apply(this, arguments);
      return val;
    };
  };

  // ---------------------------------------------------------------------------
  // HTML helpers
  // ---------------------------------------------------------------------------

  var MAP_ENC =
  {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  var MAP_DEC =
  {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'"
  };

  Utils.escapeHtml = function escapeHtml(s)
  {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch)
    {
      return MAP_ENC[ch];
    });
  };

  Utils.unescapeHtml = function unescapeHtml(s)
  {
    return String(s == null ? '' : s).replace(/(&amp;|&lt;|&gt;|&quot;|&#39;)/g, function (ent)
    {
      return MAP_DEC[ent] || ent;
    });
  };

  Utils.stripTags = function stripTags(s)
  {
    return String(s == null ? '' : s).replace(/<\/?[^>]*>/g, '');
  };

  Utils.escapeAttr = function escapeAttr(s)
  {
    return Utils.escapeHtml(s).replace(/`/g, '&#96;');
  };

  Utils.pad = function pad(num)
  {
    return (num < 10 ? '0' : '') + num;
  };

  // ---------------------------------------------------------------------------
  // Safe normalization (deterministic)
  // ---------------------------------------------------------------------------

  Utils.str = function str(v)
  {
    return v == null ? '' : String(v);
  };

  Utils.num = function num(v)
  {
    var n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  Utils.bool = function bool(v)
  {
    return v === 'false' ? false : !!v;
  };

  // ---------------------------------------------------------------------------
  // Time / size formatting
  // ---------------------------------------------------------------------------

  Utils.toISO = function toISO(d)
  {
    return (d instanceof Date ? d : new Date(d)).toISOString();
  };

  Utils.addMs = function addMs(d, ms)
  {
    var t = (d instanceof Date ? d : new Date(d)).getTime();
    return new Date(t + (ms | 0));
  };

  // 互換維持用（必要なければ削除可）
  Utils.add = Utils.addMs;

  Utils.addDays = function addDays(d, n)
  {
    return Utils.addMs(d, (n | 0) * 86400000);
  };

  Utils.formatMmSs = function formatMmSs(totalSec)
  {
    totalSec = Math.max(0, Math.floor(Number(totalSec) || 0));
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  };

  Utils.formatBytes = function formatBytes(bytes)
  {
    bytes = Number(bytes) || 0;
    var units = ['B', 'KB', 'MB', 'GB', 'TB'];
    var p = 0;

    while (bytes >= 1024 && p < units.length - 1)
    {
      bytes /= 1024;
      p++;
    }

    return (Math.round(bytes * 10) / 10) + ' ' + units[p];
  };

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  // 正規表現は外から参照できるように公開
  Utils.EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  Utils.UUIDV4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  Utils.ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[tT ][0-9:.+\-Z]{1,20})?$/;
  Utils.SAFE_FILE_RE = /^[A-Za-z0-9 _.\-()]+$/;

  Utils.isEmail = function isEmail(s)
  {
    return Utils.EMAIL_RE.test(String(s || ''));
  };

  Utils.isUUIDv4 = function isUUIDv4(s)
  {
    return Utils.UUIDV4_RE.test(String(s || ''));
  };

  Utils.isISODate = function isISODate(s)
  {
    return Utils.ISO_DATE_RE.test(String(s || ''));
  };

  Utils.isSafeFileName = function isSafeFileName(s)
  {
    return Utils.SAFE_FILE_RE.test(String(s || ''));
  };

  // ---------------------------------------------------------------------------
  // Screen modal history (browser back closes modal)
  // ---------------------------------------------------------------------------

  function ScreenModalHistory()
  {
    this._stack = [];
    this._entryMap = typeof Map === 'function' ? new Map() : null;
    this._ignorePopstateCount = 0;
    this._closingFromHistory = false;
    this._historyHandler = null;
    this._observer = null;
  }

  ScreenModalHistory.prototype._ensureHistoryListener = function ()
  {
    if (this._historyHandler)
    {
      return;
    }
    var self = this;
    this._historyHandler = function ()
    {
      if (self._ignorePopstateCount > 0)
      {
        self._ignorePopstateCount -= 1;
        return;
      }
      var entry = self._stack.pop();
      if (!entry)
      {
        self._teardownHistoryIfIdle();
        return;
      }
      self._closingFromHistory = true;
      try
      {
        if (typeof entry.close === 'function')
        {
          entry.close();
        }
      }
      catch (_err)
      {
      }
      self._closingFromHistory = false;
      self._teardownHistoryIfIdle();
    };
    window.addEventListener('popstate', this._historyHandler);
  };

  ScreenModalHistory.prototype._teardownHistoryIfIdle = function ()
  {
    if (this._stack.length === 0 && this._ignorePopstateCount <= 0 && this._historyHandler)
    {
      window.removeEventListener('popstate', this._historyHandler);
      this._historyHandler = null;
      this._ignorePopstateCount = 0;
    }
  };

  ScreenModalHistory.prototype._registerOpen = function (modalEl)
  {
    if (!modalEl)
    {
      return;
    }
    if (this._entryMap && this._entryMap.has(modalEl))
    {
      return;
    }
    if (!this._entryMap)
    {
      for (var i = 0; i < this._stack.length; i += 1)
      {
        if (this._stack[i] && this._stack[i].modal === modalEl)
        {
          return;
        }
      }
    }
    var entry = {
      modal: modalEl,
      close: this._buildCloseHandler(modalEl)
    };
    this._stack.push(entry);
    if (this._entryMap)
    {
      this._entryMap.set(modalEl, entry);
    }
    this._ensureHistoryListener();
    history.pushState({ modal: 'page' }, document.title, window.location.href);
  };

  ScreenModalHistory.prototype._registerClose = function (modalEl)
  {
    var entry = this._entryMap ? this._entryMap.get(modalEl) : null;
    if (!entry)
    {
      for (var i = this._stack.length - 1; i >= 0; i -= 1)
      {
        if (this._stack[i] && this._stack[i].modal === modalEl)
        {
          entry = this._stack[i];
          break;
        }
      }
    }
    if (!entry)
    {
      return;
    }
    if (this._entryMap)
    {
      this._entryMap.delete(modalEl);
    }
    var idx = -1;
    for (var j = this._stack.length - 1; j >= 0; j -= 1)
    {
      if (this._stack[j] === entry)
      {
        idx = j;
        break;
      }
    }
    if (idx >= 0)
    {
      this._stack.splice(idx, 1);
    }
    if (!this._closingFromHistory)
    {
      this._ignorePopstateCount += 1;
      history.back();
    }
    else
    {
      this._teardownHistoryIfIdle();
    }
  };

  ScreenModalHistory.prototype._buildCloseHandler = function (modalEl)
  {
    var self = this;
    return function ()
    {
      if (self._entryMap)
      {
        self._entryMap.delete(modalEl);
      }
      self._invokeModalClose(modalEl);
    };
  };

  ScreenModalHistory.prototype._invokeModalClose = function (modalEl)
  {
    if (!modalEl)
    {
      return;
    }
    var closeTarget = modalEl.querySelector('[data-modal-close]')
      || modalEl.querySelector('.screen-modal__close')
      || modalEl.querySelector('.screen-modal__overlay');
    if (closeTarget && typeof closeTarget.dispatchEvent === 'function')
    {
      try
      {
        closeTarget.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }));
        return;
      }
      catch (_err)
      {
      }
    }
    modalEl.classList.remove('is-open');
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.setAttribute('hidden', 'hidden');
  };

  ScreenModalHistory.prototype._isModalElement = function (node)
  {
    if (!(node && node.classList))
    {
      return false;
    }
    if (node.classList.contains('screen-modal'))
    {
      return true;
    }
    if (node.classList.contains('target-detail__survey-modal')
      || node.classList.contains('target-detail__announcement-modal'))
    {
      return true;
    }
    if (node.hasAttribute && node.hasAttribute('data-modal-open'))
    {
      return true;
    }
    return false;
  };

  ScreenModalHistory.prototype._handleMutations = function (records)
  {
    var self = this;
    var handleNode = function (node)
    {
      var targetIsModal = self._isModalElement(node);
      if (targetIsModal)
      {
        self._syncModalState(node);
      }
      var descendants = node.querySelectorAll
        ? node.querySelectorAll('.screen-modal, .target-detail__survey-modal, .target-detail__announcement-modal, [data-modal-open]')
        : [];
      for (var i = 0; i < descendants.length; i += 1)
      {
        self._syncModalState(descendants[i]);
      }
    };

    for (var r = 0; r < records.length; r += 1)
    {
      var record = records[r];
      if (record.type === 'attributes' && record.target)
      {
        handleNode(record.target);
      }
      else if (record.type === 'childList')
      {
        for (var a = 0; a < record.addedNodes.length; a += 1)
        {
          handleNode(record.addedNodes[a]);
        }
      }
    }
  };

  ScreenModalHistory.prototype._syncModalState = function (modalEl)
  {
    if (!this._isModalElement(modalEl))
    {
      return;
    }
    var dataOpen = modalEl.getAttribute('data-open');
    var dataModalOpen = modalEl.getAttribute('data-modal-open');
    var isOpen = (modalEl.classList.contains('is-open')
      || dataOpen === 'true'
      || dataModalOpen === 'true')
      && modalEl.getAttribute('aria-hidden') !== 'true'
      && modalEl.getAttribute('hidden') !== 'hidden';
    if (isOpen)
    {
      this._registerOpen(modalEl);
    }
    else
    {
      this._registerClose(modalEl);
    }
  };

  ScreenModalHistory.prototype.observe = function ()
  {
    if (!document || !document.body)
    {
      return;
    }
    this._syncInitialModals();
    if (this._observer)
    {
      this._observer.disconnect();
    }
    var observer = new MutationObserver(this._handleMutations.bind(this));
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true, childList: true });
    this._observer = observer;
  };

  ScreenModalHistory.prototype._syncInitialModals = function ()
  {
    var opened = document.querySelectorAll(
      '.screen-modal.is-open, .target-detail__survey-modal.is-open, .target-detail__survey-modal[data-open="true"],'
      + ' .target-detail__announcement-modal.is-open, .target-detail__announcement-modal[data-open="true"],'
      + ' [data-modal-open="true"]'
    );
    for (var i = 0; i < opened.length; i += 1)
    {
      this._registerOpen(opened[i]);
    }
  };

  ScreenModalHistory.prototype.isClosingFromHistory = function ()
  {
    return this._closingFromHistory;
  };

  Utils.initScreenModalHistoryObserver = function initScreenModalHistoryObserver()
  {
    if (window.ScreenModalHistory && typeof window.ScreenModalHistory.observe === 'function')
    {
      return window.ScreenModalHistory;
    }
    var manager = new ScreenModalHistory();
    window.ScreenModalHistory = manager;
    return manager;
  };

  // misc
  Utils.freezeArray = function freezeArray(arr)
  {
    return Object.freeze(arr.slice());
  }

}());
