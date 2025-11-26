// js/page/admin-queue/job-error-detail.js
(function (window, document) {
  'use strict';

  class JobErrorDetail
  {
    constructor(page)
    {
      this.page = page;
    }

    open(button)
    {
      const $btn = jQuery(button);
      const jobId = Number($btn.data('jobId') || $btn.attr('data-job-id')) || null;
      const directReason = ($btn.data('errorReason') || $btn.attr('data-error-reason') || '').toString();
      const reason = this._resolveReason(jobId, directReason);
      const reasonText = reason || 'エラー理由が記録されていません。';
      const contentHtml = [
        '<div class="queue-error-modal">',
        '<p class="queue-error-modal__summary">ジョブの処理中にエラーが発生しました。原因の詳細を確認してください。</p>',
        '<pre class="queue-error-modal__reason" tabindex="0" role="textbox" aria-label="エラー内容">',
        reasonText,
        '</pre>',
        '</div>'
      ].join('');

      this.page.infoModalService.show({
        title: 'ジョブ #' + (jobId || '-') + ' のエラー詳細',
        html: contentHtml,
        sanitizeFn: function (html) { return html; },
        closeAriaLabel: '閉じる'
      });
    }

    _resolveReason(jobId, directReason)
    {
      const normalized = (directReason || '').trim();
      if (normalized)
      {
        return normalized;
      }

      const jobs = (this.page && this.page.state && Array.isArray(this.page.state.jobs)) ? this.page.state.jobs : [];
      const matched = jobs.find(function (item)
      {
        return Number(item && item.id) === Number(jobId);
      });

      if (matched && matched.errorMessage)
      {
        return matched.errorMessage.toString();
      }

      if (matched && matched.error_message)
      {
        return matched.error_message.toString();
      }

      return 'エラー理由が記録されていません。';
    }
  }

  window.AdminQueue = window.AdminQueue || {};
  window.AdminQueue.JobErrorDetail = JobErrorDetail;
})(window, document);
