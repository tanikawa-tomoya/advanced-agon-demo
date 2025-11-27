(function (window, document) {
  'use strict';

  class JobSummary
  {
    constructor(pageInstance)
    {
      this.page = pageInstance;
      this.root = document.querySelector(pageInstance.selectorConfig.summaryRoot);
      this.total = document.querySelector(pageInstance.selectorConfig.summaryTotal);
      this.restricted = document.querySelector(pageInstance.selectorConfig.summaryRestricted);
      this.pending = document.querySelector(pageInstance.selectorConfig.summaryPending);
    }

    async run()
    {
      await this.refresh();
    }

    async refresh()
    {
      if (!this.root)
      {
        return;
      }
      this._setLoading(true);
      try {
        const response = await this.page.callApi('ContentAccessSummary', {});
        this._render(response || {});
      } catch (err) {
        console.error('[AdminContentsAccess:JobSummary] failed to fetch summary:', err);
        this.page.showToast('サマリーの取得に失敗しました。', 'error');
      } finally {
        this._setLoading(false);
      }
    }

    _render(summary)
    {
      if (this.total) { this.total.textContent = this._formatNumber(summary.total || 0); }
      if (this.restricted) { this.restricted.textContent = this._formatNumber(summary.restricted || 0); }
      if (this.pending) { this.pending.textContent = this._formatNumber(summary.pending || 0); }
    }

    _setLoading(isLoading)
    {
      if (!this.root) { return; }
      if (isLoading) { this.root.setAttribute('aria-busy', 'true'); }
      else { this.root.removeAttribute('aria-busy'); }
    }

    _formatNumber(value)
    {
      const n = Number(value);
      if (Number.isNaN(n)) { return '0'; }
      return n.toLocaleString('ja-JP');
    }
  }

  window.AdminContentsAccess = window.AdminContentsAccess || {};
  window.AdminContentsAccess.JobSummary = JobSummary;
})(window, document);
