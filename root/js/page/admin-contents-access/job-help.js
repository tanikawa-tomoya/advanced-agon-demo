(function () {
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
    constructor(pageInstance) {
      this.pageInstance = pageInstance;
      this.button = document.querySelector(pageInstance.selectorConfig.helpButton);
      this.modal = document.querySelector(pageInstance.selectorConfig.helpModal);
    }

    run() {
      if (this.button) {
        this.button.addEventListener('click', this.open.bind(this));
      }
      if (this.modal) {
        var closers = this.modal.querySelectorAll('[data-modal-close]');
        for (var i = 0; i < closers.length; i += 1) {
          closers[i].addEventListener('click', this.close.bind(this));
        }
      }
    }

    async open(event) {
      if (event) {
        event.preventDefault();
      }
      var flags = null;
      if (this.pageInstance && this.pageInstance.helpModalService && typeof this.pageInstance.helpModalService.resolveSessionRoleFlags === 'function')
      {
        flags = await this.pageInstance.helpModalService.resolveSessionRoleFlags();
      }
      this.pageInstance.helpModalService.show({
        roleVariants: this._buildVariants(),
        sanitizeFn: sanitizeHelpHtml
      }, { roleFlags: flags });
    }

    close(event) {
      if (event) {
        event.preventDefault();
      }
      if (this.pageInstance && this.pageInstance.helpModalService && typeof this.pageInstance.helpModalService.dismiss === 'function') {
        this.pageInstance.helpModalService.dismiss();
      }
    }

    _serializeModalBody() {
      if (!this.modal) {
        return '';
      }
      var body = this.modal.querySelector('.c-help-modal__body');
      var summary = this.modal.querySelector('.c-help-modal__summary');
      var title = this.modal.querySelector('.c-help-modal__title');
      var html = '';
      if (title) { html += '<h2>' + title.textContent + '</h2>'; }
      if (summary) { html += '<p>' + summary.innerHTML + '</p>'; }
      if (body) { html += body.innerHTML; }
      return html;
    }

    _buildVariants()
    {
      var html = this._serializeModalBody();
      var title = 'コンテンツアクセス管理のポイント';
      return {
        admin: {
          title: title + '（管理者向け）',
          html: '' +
            '<p>オペレーター / スーパーバイザー向けの権限管理ガイドです。閲覧・編集権限の付与と棚卸しを定期的に実施してください。</p>' +
            '<ul>' +
              '<li>役割ごとのアクセス範囲を整理し、最小権限で設定します。</li>' +
              '<li>不要になった共有リンクやロールは早めに無効化し、ログを確認します。</li>' +
              '<li>監査用に変更履歴や担当者メモを残し、トレーサビリティを確保します。</li>' +
            '</ul>' +
            html
        },
        user: {
          title: title + '（利用者向け）',
          html: '' +
            '<p>コンテンツへのアクセス方法を確認したい方向けの説明です。必要な権限がない場合は管理者に依頼してください。</p>' +
            '<ul>' +
              '<li>自分が閲覧できるコンテンツの範囲を確認し、必要に応じて申請します。</li>' +
              '<li>共有リンクの取り扱いに注意し、不明なリンクは開かず管理者へ報告します。</li>' +
              '<li>閲覧だけで十分か、編集が必要かを明確にしてリクエストします。</li>' +
            '</ul>' +
            html
        }
      };
    }
  }

  window.AdminContentsAccess = window.AdminContentsAccess || {};
  window.AdminContentsAccess.JobHelp = JobHelp;
})(window, document);
