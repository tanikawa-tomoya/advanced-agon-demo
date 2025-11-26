(function () {

  'use strict';

  var HELP_MODAL_ID = 'contents-help-modal';
  var FALLBACK_CONTENT = {
    title: 'コンテンツ管理の使い方',
    html:
      '<p>コンテンツ管理では自分専用のライブラリを構築できます。タグやメモで整理し、必要な教材をすぐに呼び出せる状態に保ちましょう。</p>' +
      '<ul>' +
        '<li>フィルターでジャンルやタグを絞り込み、目的に合った教材に素早くアクセスします。</li>' +
        '<li>カードのプレビューから詳細や添付ファイルを確認し、配布や共有にそのまま利用できます。</li>' +
      '</ul>' +
      '<p>チームと共有したい教材はタグやコメントを整えると、配布時の説明がスムーズになります。</p>'
  };

  function sanitizeHelpHtml(html)
  {
    if (typeof html !== 'string') { return ''; }
    var container = document.createElement('div');
    container.innerHTML = html;
    var forbidden = container.querySelectorAll('script, style, iframe, object, embed');
    for (var i = 0; i < forbidden.length; i += 1) {
      var node = forbidden[i];
      if (node && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
    var elements = container.querySelectorAll('*');
    for (var j = 0; j < elements.length; j += 1) {
      var el = elements[j];
      var attrs = el.attributes;
      for (var k = attrs.length - 1; k >= 0; k -= 1) {
        var attr = attrs[k];
        var name = attr.name.toLowerCase();
        if (name.indexOf('on') === 0) {
          el.removeAttribute(attr.name);
          continue;
        }
        if ((name === 'href' || name === 'src') && (/\s*javascript:/i.test(attr.value || ''))) {
          el.removeAttribute(attr.name);
        }
      }
      return container.innerHTML;
    }
  }
  
  class JobHelp
  {
    constructor(pageInstance)
    {
      this.pageInstance = pageInstance;
      this.template = document.getElementById(HELP_MODAL_ID);
    }
    
    async run()
    {
      var service = this._resolveService();
      if (!service || typeof service.show !== 'function') {
        return;
      }
      var content = this._serializeTemplate();
      service.show({
        title: content.title,
        html: content.html,
        sanitizeFn: sanitizeHelpHtml
      });
    }

    _resolveService() {
      if (this.pageInstance && this.pageInstance.helpModalService) {
        return this.pageInstance.helpModalService;
      }
      if (this.pageInstance && this.pageInstance.services && this.pageInstance.services.help) {
        return this.pageInstance.services.help;
      }
      return null;
    }

    _serializeTemplate() {
      var template = this.template;
      if (!template) {
        return FALLBACK_CONTENT;
      }
      var titleNode = template.querySelector('.c-help-modal__title');
      var summaryNode = template.querySelector('.c-help-modal__summary');
      var bodyNode = template.querySelector('.c-help-modal__body');
      var html = '';
      if (summaryNode) {
        html += '<p>' + summaryNode.innerHTML + '</p>';
      }
      if (bodyNode) {
        html += bodyNode.innerHTML;
      }
      var title = '';
      if (titleNode) {
        title = (titleNode.textContent || '').trim();
      }
      if (!html) {
        return FALLBACK_CONTENT;
      }
      return {
        title: title || FALLBACK_CONTENT.title,
        html: html
      };
    }
  }

  window.Contents = window.Contents || {};
  window.Contents.JobHelp = JobHelp;

})(window, document);
