(function (window, document) {
  'use strict';

  class JobSummary
  {
    constructor(pageInstance)
    {
      this.page = pageInstance;
      this.summary = document.querySelector(pageInstance.selectorConfig.summaryText);
      this._handler = this._handleUpdate.bind(this);
    }

    async run()
    {
      this._render(0, 0);
      document.addEventListener('adminPurchase:updated', this._handler);
    }

    _handleUpdate(event)
    {
      const detail = event && event.detail ? event.detail : {};
      const total = typeof detail.total === 'number' ? detail.total : 0;
      const filtered = typeof detail.filtered === 'number' ? detail.filtered : 0;
      this._render(total, filtered);
    }

    _render(total, filtered)
    {
      if (!this.summary)
      {
        return;
      }
      const totalText = this._formatNumber(total || 0);
      const filteredText = this._formatNumber(filtered || 0);
      this.summary.textContent = '全' + totalText + '件中 ' + filteredText + '件を表示';
    }

    _formatNumber(value)
    {
      const n = Number(value);
      if (Number.isNaN(n)) { return '0'; }
      return n.toLocaleString('ja-JP');
    }
  }

  window.AdminPurchase = window.AdminPurchase || {};
  window.AdminPurchase.JobSummary = JobSummary;
})(window, document);
