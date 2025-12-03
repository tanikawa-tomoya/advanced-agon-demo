// js/page/admin-queue/job-help.js
(function (window, document) {
  'use strict';

  class JobHelp {
    constructor(page) {
      this.page = page;
    }

    async open() {
      const base = this._resolveContent();
      var flags = null;
      if (this.page && this.page.helpModalService && typeof this.page.helpModalService.resolveSessionRoleFlags === 'function')
      {
        flags = await this.page.helpModalService.resolveSessionRoleFlags();
      }

      this.page.helpModalService.show({
        roleVariants: this._buildVariants(base),
        sanitizeFn: sanitizeHelpHtml
      }, { roleFlags: flags });
    }

    close() {
      this.page.helpModalService.dismiss();
    }

    _resolveContent() {
      const modal = document.getElementById('queue-help-modal');
      if (!modal) {
        return {
          title: 'キュー管理について',
          html: '<p>queue.sqlite に記録されているジョブの状態を確認し、滞留やエラーの早期検知につなげます。</p>'
        };
      }

      const titleNode = modal.querySelector('#queue-help-modal-title');
      const summaryNode = modal.querySelector('#queue-help-modal-summary');
      const bodyNode = modal.querySelector('#queue-help-modal-body');

      var title = titleNode ? String(titleNode.textContent || '') : 'キュー管理について';
      var summary = summaryNode ? String(summaryNode.innerHTML || '') : '';
      var bodyHtml = bodyNode ? bodyNode.innerHTML : '';

      var html = '';
      if (summary) {
        html += '<p class="queue-help-modal__summary">' + summary + '</p>';
      }
      html += bodyHtml;

      return {
        title: title,
        html: html
      };
    }

    _buildVariants(base)
    {
      var html = base.html || '';
      return {
        admin: {
          title: (base.title || 'キュー管理') + '（管理者向け）',
          html: '' +
            '<p>オペレーター / スーパーバイザー向けの運用ガイドです。滞留や失敗を早期に検知し、再実行や無効化で安定稼働を維持してください。</p>' +
            '<ul>' +
              '<li>優先度や更新日時で並べ替え、遅延しているジョブを特定します。</li>' +
              '<li>手動実行や削除は影響範囲を確認してから行い、結果をチームに共有します。</li>' +
              '<li>エラー内容は詳細から確認し、原因ごとに再実行や設定変更を判断します。</li>' +
            '</ul>' +
            html
        },
        user: {
          title: (base.title || 'キュー管理') + '（利用者向け）',
          html: '' +
            '<p>ジョブの状態を一覧で確認できます。失敗や遅延が見つかった場合は管理者へ共有してください。</p>' +
            '<ul>' +
              '<li>フィルターで対象ジョブを絞り込み、最新の状態を確認します。</li>' +
              '<li>詳細表示で失敗理由を把握し、必要に応じて担当者に連絡します。</li>' +
              '<li>更新時間が古いものはページ上部の更新ボタンで最新情報にします。</li>' +
            '</ul>' +
            html
        }
      };
    }
  }

  window.AdminQueue = window.AdminQueue || {};
  window.AdminQueue.JobHelp = JobHelp;
})(window, document);
