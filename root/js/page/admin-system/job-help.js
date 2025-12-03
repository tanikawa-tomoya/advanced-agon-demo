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
      this._prevActive = null;
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
      if (title) {
        html += '<h2>' + title.textContent + '</h2>';
      }
      if (summary) {
        html += '<p>' + summary.innerHTML + '</p>';
      }
      if (body) {
        html += body.innerHTML;
      }
      return html;
    }

    _buildVariants()
    {
      var html = this._serializeModalBody();
      var title = 'システム管理のポイント';
      return {
        admin: {
          title: title + '（管理者向け）',
          html: '' +
            '<p>オペレーター / スーパーバイザー向けの設定ガイドです。構成変更やメンテナンスは事前に影響範囲を確認してください。</p>' +
            '<ul>' +
              '<li>環境設定や認証設定を変更する際はバックアップと検証環境を用意します。</li>' +
              '<li>ジョブやサービスの再起動後はステータスを確認し、通知で共有します。</li>' +
              '<li>アクセス権やAPIキーは最小権限で管理し、定期的に棚卸しします。</li>' +
            '</ul>' +
            html
        },
        user: {
          title: title + '（利用者向け）',
          html: '' +
            '<p>システムの状態を確認する閲覧者向けのヘルプです。設定変更が必要な場合は管理担当へ連絡してください。</p>' +
            '<ul>' +
              '<li>必要な設定やステータスが見当たらない場合はスクリーンショットを添えて報告します。</li>' +
              '<li>メンテナンス情報は案内文やヘルプから確認できます。</li>' +
              '<li>不審な挙動を見つけたらログ取得の手順に従い、担当者に共有します。</li>' +
            '</ul>' +
            html
        }
      };
    }
  }

  window.AdminSystem = window.AdminSystem || {};
  window.AdminSystem.JobHelp = JobHelp;
})(window, document);
