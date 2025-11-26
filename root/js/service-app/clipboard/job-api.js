(function () {
  'use strict';

  class JobAPI
  {
    constructor(service)
    {
      this.service = service;
    }

    supportsNavigator()
    {
      return !!(w.navigator && w.navigator.clipboard);
    }

    writeText(text)
    {
      var self = this;
      var str = (text == null) ? '' : String(text);

      // Navigator API を優先
      if (this.service.config.preferNavigator && this.supportsNavigator() && w.isSecureContext !== false) {
        return w.navigator.clipboard.writeText(str);
      }

      // フォールバック（コピーのみ）
      if (this.service.config.fallbackCopy) {
        try {
          this._fallbackCopy(str);
          return Promise.resolve();
        } catch (e) {
          return Promise.reject(e);
        }
      }

      return Promise.reject(new Error('Clipboard write is not available'));
    }

    readText()
    {
      if (!this.service.config.readEnabled) {
        return Promise.reject(new Error('Clipboard read is disabled by config'));
      }
      if (!this.supportsNavigator()) {
        return Promise.reject(new Error('Clipboard read requires navigator.clipboard'));
      }
      return w.navigator.clipboard.readText();
    }

    _fallbackCopy(text)
    {
      var ta = document.createElement('textarea');
      ta.value = text;
      // オフスクリーンに配置
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.left = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try {
        ok = document.execCommand && document.execCommand('copy');
      } catch (e) {
        document.body.removeChild(ta);
        throw e;
      }
      document.body.removeChild(ta);
      if (!ok) {
        throw new Error('execCommand(copy) failed');
      }
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.Clipboard || (Services.Clipboard = {});
  NS.JobApi = NS.JobApi || JobApi;  

})(window, document);
