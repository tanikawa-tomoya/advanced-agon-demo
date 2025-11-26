(function (w, document) {
  'use strict';

  function sanitizeHelpHtml(html) {
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
        if ((name === 'href' || name === 'src') && /\s*javascript:/i.test(attr.value || '')) {
          el.removeAttribute(attr.name);
        }
      }
    }
    return container.innerHTML;
  }

  class JobHelp {
    constructor(page) {
      this.page = page || {};
      this.config = this.page.config || {};
      this.refs = this.page.refs || {};
      this.ui = this.page.ui || {};
      this.root = this.page.root || document;
    }

    open(topic) {
      topic = topic || 'overview';
      var modalService = this.ui.helpModal || this.page.helpModalService;
      var html = this._topicHtml(topic);
      modalService.show({
        title: this._topicTitle(topic),
        html: html,
        sanitizeFn: sanitizeHelpHtml
      });
    }

    _topicTitle(topic) {
      if (topic === 'form') return 'ターゲット管理 - フォーム';
      if (topic === 'list') return 'ターゲット管理 - 一覧';
      return 'ターゲット管理ヘルプ';
    }

    _topicHtml(topic) {
      if (topic === 'form') {
        return '' +
          '<h3>フォームの使い方</h3>' +
          '<ol>' +
            '<li>必須項目を入力して保存します。</li>' +
            '<li>編集は一覧の「編集」ボタンから行えます。</li>' +
            '<li>保存成功時はトーストが表示されます。</li>' +
          '</ol>';
      }
      if (topic === 'list') {
        return '' +
          '<h3>一覧の使い方</h3>' +
          '<ul>' +
            '<li>検索ボックスで絞り込みできます。</li>' +
            '<li>フィルタ変更で自動再検索します。</li>' +
            '<li>ページングで前後ページに移動できます。</li>' +
          '</ul>';
      }
      return '' +
        '<h3>ターゲット管理について</h3>' +
        '<p>この画面ではターゲットの作成・編集・検索・削除が行えます。</p>' +
        '<ul>' +
          '<li>ヘルプボタンからトピック別の説明を開けます。</li>' +
          '<li>保存・削除時はトーストに結果が表示されます。</li>' +
        '</ul>';
    }

  }

  w.Targets = w.Targets || {};
  w.Targets.JobHelp = JobHelp;
})(window, document);
