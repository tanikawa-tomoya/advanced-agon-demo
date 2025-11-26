(function () {
  
  'use strict';

  /**
   * テンプレート／スタイルのロードと、コンテナ解決を担うジョブ
   */
  class JobTemplate
  {
    constructor(service)
    {
      this.service = service;
      this._styleId = 'gc-style-link';
    }

    resolveContainer(ref)
    {
      if (!ref) return document.body;
      if (typeof ref === 'string') {
        var el = document.querySelector(ref);
        return el || document.body;
      }
      if (ref && ref.nodeType === 1) return ref;
      return document.body;
    }

    ensureStyle(href, zIndex)
    {
      // 既にある場合は何もしない
      var el = document.getElementById(this._styleId);
      if (el && el.tagName === 'LINK') return el;

      // Utils があればそれを尊重（既存実装の踏襲）
      if (window.Utils && typeof window.Utils.loadCss === 'function') {
        try {
          window.Utils.loadCss(href);
          // loadCss が <link> を返さない実装もあるため、明示的に id を付与
          var links = document.querySelectorAll('link[rel="stylesheet"]');
          if (links && links.length) links[links.length - 1].id = this._styleId;
          return document.getElementById(this._styleId);
        } catch (e) { /* fallback below */ }
      }

      // 自前実装
      var link = document.createElement('link');
      link.id = this._styleId;
      link.rel = 'stylesheet';
      link.href = String(href || '');
      if (typeof zIndex !== 'undefined') {
        // z-index は link には適用されないが、重ね順を調整する場合に備えて data 属性等で保持しておく
        link.setAttribute('data-z-index', String(zIndex));
      }
      document.head.appendChild(link);
      return link;
    }

    /**
     * 同期で template.html を読み込む（Utils が無い場合のフォールバックを含む）
     */
    loadTemplateSync(path) {
      // 既存 Utils 優先
      if (window.Utils && typeof window.Utils.loadTextSync === 'function') {
        return String(window.Utils.loadTextSync(path) || '');
      }
      // fetch が同期を提供しないため、XHR の同期モードを利用
      var xhr = new XMLHttpRequest();
      xhr.open('GET', String(path), false);
      try { xhr.send(null); } catch (e) { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 0) {
        return xhr.responseText || '';
      }
      return '';
    }
  }

  var NS = Services.GuidanceCreator || (Services.GuidanceCreator = {});
  NS.JobTemplate = NS.JobTemplate || JobTemplate;  
  
})(window, document);
