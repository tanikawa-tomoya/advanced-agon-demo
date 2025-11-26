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

    open(topic)
    {
      // Open the Help modal with content for the given topic (if available)
      var content = this._resolveContent(topic);
      this.helpModal.show(content);
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
        // Default help content if modal markup is not found
        return {
          title: '設定画面のヒント',
          text: 'プロフィールと通知設定の編集、アバター変更など、ユーザー設定に関するヘルプです。'
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
        html: html
      };
    }
  }

  window.AccountSettingsJobHelp = AccountSettingsJobHelp;
})(window, document);
