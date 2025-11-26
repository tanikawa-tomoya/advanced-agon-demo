// js/page/admin-queue/job-run.js
(function (window, document) {
  'use strict';

  class JobRun {
    constructor(page) {
      this.page = page;
      this.config = page.config;
    }

    async run(jobId, $button) {
      const page = this.page;
      const id = Number(jobId);
      if (!id) {
        return;
      }

      // Disable button and show info toast
      if ($button) { $button.prop('disabled', true).attr('aria-busy', 'true'); }
      page.toastService.info('ジョブ #' + id + ' を手動実行しています…');

      try {
        // Call RunJob API
        await window.Utils.requestApi(this.config.requestType, 'RunJob', { jobId: id, token: this.config.apiToken });
        page.toastService.success('ジョブ #' + id + ' の手動実行を開始しました。');

        // Refresh the job list (silent so we don't repeat "loading")
        await new AdminQueue.JobView(page).refresh({ silent: true });
      } catch (err) {
        console.error('[admin-queue] run job failed:', err);
        page.toastService.error('ジョブ #' + id + ' の手動実行に失敗しました。' + (err.message || ''));
      } finally {
        if ($button) { $button.prop('disabled', false).removeAttr('aria-busy'); }
      }
    }
  }

  window.AdminQueue = window.AdminQueue || {};
  window.AdminQueue.JobRun = JobRun;
})(window, document);
