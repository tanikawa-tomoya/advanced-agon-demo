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

    async open(topic) {
      topic = topic || 'overview';
      var modalService = this.ui.helpModal || this.page.helpModalService;
      var flags = null;

      if (this.page && typeof this.page.resolveSessionRoleFlags === 'function')
      {
        flags = await this.page.resolveSessionRoleFlags();
      }

      var content = this._topicContent(topic);
      modalService.show(content, {
        roleFlags: flags,
        sanitizeFn: sanitizeHelpHtml
      });
    }

    _topicContent(topic) {
      var roleBased = this._buildRoleBasedContent(topic);
      if (roleBased) return roleBased;

      return {
        roleVariants: {
          default: {
            title: this._topicTitle(topic),
            html: this._topicHtml(topic)
          }
        }
      };
    }

    _buildRoleBasedContent(topic)
    {
      var adminHtml = this._adminTopicHtml(topic);
      var userHtml = this._userTopicHtml(topic);

      if (!adminHtml && !userHtml)
      {
        return null;
      }

      return {
        roleVariants: {
          admin: {
            title: this._targetAlias() + '管理（管理者向け）',
            html: adminHtml
          },
          user: {
            title: this._targetAlias() + '管理（利用者向け）',
            html: userHtml
          }
        }
      };
    }

    _adminTopicHtml(topic)
    {
      if (topic !== 'overview' && topic !== 'form' && topic !== 'list')
      {
        return '';
      }

      var alias = this._targetAlias();

      return '' +
        '<h3>管理者のチェックポイント</h3>' +
        '<ul>' +
          '<li>ドラフト作成後は期間・担当者・配布設定を整えてから公開します。</li>' +
          '<li>公開後はステータスを更新し、滞留が疑われる案件は担当者や開始日で並べ替えて確認します。</li>' +
          '<li>「表示列」やフィルタで必要な指標に絞り込み、優先度の高い' + alias + 'を把握します。</li>' +
        '</ul>' +
        '<h3>権限付き操作</h3>' +
        '<ul>' +
          '<li>「新規作成」からテンプレや配布中' + alias + 'を登録し、必要に応じて編集・削除できます。</li>' +
          '<li>担当者・参加者を設定して役割を明確化し、進行中のタスクを追跡します。</li>' +
          '<li>完了・キャンセルしたものはステータスを更新し、履歴管理を徹底してください。</li>' +
        '</ul>' +
        '<p>監視やエスカレーションを担うオペレーター / スーパーバイザー向けのヘルプです。</p>';
    }

    _userTopicHtml(topic)
    {
      if (topic !== 'overview' && topic !== 'form' && topic !== 'list')
      {
        return '';
      }

      var alias = this._targetAlias();

      return '' +
        '<h3>利用者の使いどころ</h3>' +
        '<ul>' +
          '<li>検索とフィルタで自分に関係する' + alias + 'を素早く見つけられます。</li>' +
          '<li>一覧の表示列を切り替えて、期限・ステータス・担当者など必要な情報を確認します。</li>' +
          '<li>自分に割り当てられた' + alias + 'は進行状況をステータスで共有し、コメントや更新内容を整えてください。</li>' +
        '</ul>' +
        '<p>権限に応じて表示・編集できる項目が変わります。操作できない項目は管理者に連絡してください。</p>';
    }

  _topicTitle(topic) {
      var alias = this._targetAlias();
      if (topic === 'form') return alias + '管理 - フォーム';
      if (topic === 'list') return alias + '管理 - 一覧';
      return alias + '管理ヘルプ';
    }

    _topicHtml(topic) {
      var alias = this._targetAlias();
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
        '<h3>' + alias + '管理について</h3>' +
        '<p>この画面では' + alias + 'の作成・編集・検索・削除が行えます。</p>' +
        '<ul>' +
          '<li>ヘルプボタンからトピック別の説明を開けます。</li>' +
          '<li>保存・削除時はトーストに結果が表示されます。</li>' +
        '</ul>';
    }

    _targetAlias()
    {
      var alias = '';
      if (this.page && typeof this.page.resolveTargetAlias === 'function')
      {
        alias = this.page.targetAlias || this.page.resolveTargetAlias();
      }
      alias = String(alias || '').trim();
      return alias || 'ターゲット';
    }

  }

  w.Targets = w.Targets || {};
  w.Targets.JobHelp = JobHelp;
})(window, document);
