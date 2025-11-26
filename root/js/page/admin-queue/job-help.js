// js/page/admin-queue/job-help.js
(function (window, document) {
  'use strict';

  class JobHelp {
    constructor(page) {
      this.page = page;
    }

    open() {
      const content = this._resolveContent();
      this.page.helpModalService.show(content);
    }

    close() {
      this.page.helpModalService.dismiss();
    }

    _resolveContent() {
      const modal = document.getElementById('queue-help-modal');
      if (!modal) {
        return {
          title: 'キュー管理について',
          text: 'queue.sqlite に記録されているジョブの状態を確認し、滞留やエラーの早期検知につなげます。'
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
  }

  window.AdminQueue = window.AdminQueue || {};
  window.AdminQueue.JobHelp = JobHelp;
})(window, document);
