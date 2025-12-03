(function () {
  'use strict';

  // Provides help modal content for the User Settings page
  class AccountSettingsJobHelp
  {
    constructor(deps)
    {
      deps = deps || {};
      this.root = deps.root || document;
      this.config = deps.config || {};
      this.helpModal = deps.helpModal;
      this.modalId = deps.modalId || 'account-settings-help-modal';
    }

    async open(topic)
    {
      // Open the Help modal with content for the given topic (if available)
      var content = this._resolveContent(topic);
      var flags = null;
      if (this.helpModal && typeof this.helpModal.resolveSessionRoleFlags === 'function')
      {
        flags = await this.helpModal.resolveSessionRoleFlags();
      }
      this.helpModal.show({
        roleVariants: this._buildVariants(content),
        sanitizeFn: content.sanitizeFn
      }, { roleFlags: flags });
    }

    close()
    {
      this.helpModal.dismiss();
    }

    destroy()
    {
      this.close();
    }

    _resolveContent()
    {
      var modal = document.getElementById(this.modalId);
      if (!modal) {
        return {
          title: '設定画面のヒント',
          html: '<p>プロフィールと通知設定の編集、アバター変更など、ユーザー設定に関するヘルプです。</p>'
        };
      }

      var titleNode = modal.querySelector('.c-help-modal__title');
      var summaryNode = modal.querySelector('.c-help-modal__summary');
      var bodyNode = modal.querySelector('.c-help-modal__body');

      var title = titleNode ? String(titleNode.textContent || '') : '設定画面のヒント';
      var summary = summaryNode ? String(summaryNode.textContent || '') : '';
      var bodyHtml = bodyNode ? bodyNode.innerHTML : '';

      var html = '';
      if (summary) {
        html += '<p class="c-help-modal__summary">' + summary + '</p>';
      }
      html += bodyHtml;

      return {
        title: title,
        html: html,
        sanitizeFn: function (rawHtml)
        {
          var container = document.createElement('div');
          container.innerHTML = rawHtml;
          var scripts = container.querySelectorAll('script');
          for (var i = 0; i < scripts.length; i += 1)
          {
            scripts[i].parentNode.removeChild(scripts[i]);
          }
          return container.innerHTML;
        }
      };
    }

    _buildVariants(content)
    {
      var title = content.title || '設定画面のヒント';
      var html = content.html || '';
      return {
        admin: {
          title: title + '（管理者向け）',
          html: '' +
            '<p>オペレーター / スーパーバイザーとしてメンバーの設定を整える際のポイントです。</p>' +
            '<ul>' +
              '<li>権限付与や二要素認証設定の確認を定期的に行い、セキュリティを維持します。</li>' +
              '<li>通知設定の既定値を周知し、重要なお知らせが届くよう案内します。</li>' +
              '<li>プロフィール情報は検索やメンションで利用されます。更新を促し最新状態を保ちます。</li>' +
            '</ul>' +
            html
        },
        user: {
          title: title + '（利用者向け）',
          html: '' +
            '<p>自分のアカウントを整えるための基本的なヒントです。</p>' +
            '<ul>' +
              '<li>プロフィールや表示名を更新すると、メンバーから識別されやすくなります。</li>' +
              '<li>通知設定を見直し、メールやアプリ通知の受け取り方を調整します。</li>' +
              '<li>アバター画像を設定して、コメントや一覧で自分を判別しやすくします。</li>' +
            '</ul>' +
            html
        }
      };
    }
  }

  window.AccountSettingsJobHelp = AccountSettingsJobHelp;
})(window, document);
