// js/page/admin-queue/job-delete.js
(function (window, document) {
  'use strict';

  class JobDelete {
    constructor(page) {
      this.page = page;
      this.config = page.config;
    }

    async delete(jobId, $button) {
      const page = this.page;
      const id = Number(jobId);
      if (!id) {
        return;
      }

      // Disable button and show info toast
      if ($button) { $button.prop('disabled', true).attr('aria-busy', 'true'); }
      page.toastService.info('ジョブ #' + id + ' を削除しています…');

      try {
        // Call DeleteJob API
        await window.Utils.requestApi(this.config.requestType, 'DeleteJob', { jobId: id, token: this.config.apiToken });
        page.toastService.success('ジョブ #' + id + ' を削除しました。');

        // Refresh the job list
        await new AdminQueue.JobView(page).refresh({ silent: true });
      } catch (err) {
        console.error('[admin-queue] delete job failed:', err);
        page.toastService.error('ジョブ #' + id + ' の削除に失敗しました。' + (err.message || ''));
      } finally {
        if ($button) { $button.prop('disabled', false).removeAttr('aria-busy'); }
      }
    }
  }

  window.AdminQueue = window.AdminQueue || {};
  window.AdminQueue.JobDelete = JobDelete;
})(window, document);
