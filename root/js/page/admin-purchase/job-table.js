(function (window, document) {
  'use strict';

  class JobTable
  {
    constructor(pageInstance)
    {
      this.page = pageInstance;
      this.selectorConfig = pageInstance.selectorConfig;
      this.state = {
        filters: {},
        purchases: []
      };
    }

    async run()
    {
      this._bindEvents();
      await this.refresh();
    }

    _bindEvents()
    {
      const sel = this.selectorConfig;
      jQuery(document).off('submit.purchaseFilter').on('submit.purchaseFilter', sel.filterForm, async (ev) => {
        ev.preventDefault();
        await this.refresh({ resetPage: true });
      });

      jQuery(document).off('click.purchaseRefresh').on('click.purchaseRefresh', sel.refreshButton, async (ev) => {
        ev.preventDefault();
        await this.refresh({ resetPage: true });
      });

      jQuery(document).off('click.purchaseResend').on('click.purchaseResend', '.purchase-table__action--resend', async (ev) => {
        ev.preventDefault();
        const $btn = jQuery(ev.currentTarget);
        const purchaseId = $btn.data('purchaseId') || $btn.attr('data-purchase-id');
        if (!purchaseId) { return; }
        const confirmed = await this.page.confirmDialogService.open('領収書を再送しますか？', { type: 'info' });
        if (!confirmed) { return; }
        await this._resendReceipt(purchaseId, $btn);
      });

      jQuery(document).off('click.purchaseCancel').on('click.purchaseCancel', '.purchase-table__action--cancel', async (ev) => {
        ev.preventDefault();
        const $btn = jQuery(ev.currentTarget);
        const purchaseId = $btn.data('purchaseId') || $btn.attr('data-purchase-id');
        if (!purchaseId) { return; }
        const confirmed = await this.page.confirmDialogService.open('自動更新を停止しますか？', { type: 'warning' });
        if (!confirmed) { return; }
        await this._cancelRenewal(purchaseId, $btn);
      });
    }

    _collectFilters()
    {
      const sel = this.selectorConfig;
      const form = document.querySelector(sel.filterForm);
      const filters = Object.assign({}, this.state.filters);
      if (form)
      {
        const formData = new window.FormData(form);
        filters.status = (formData.get('status') || '').toString();
        filters.plan = (formData.get('plan') || '').toString();
        filters.period = (formData.get('period') || '7d').toString();
      }
      return filters;
    }

    async refresh()
    {
      const filters = this._collectFilters();
      this.state.filters = filters;
      await this._fetchAndRender(filters);
    }

    async _fetchAndRender(filters)
    {
      const sel = this.selectorConfig;
      const $tbody = jQuery(sel.tableBody);
      const $updated = jQuery(sel.updatedAt);
      const $feedback = jQuery(sel.feedback);

      $feedback.empty();
      $tbody.html('<tr><td colspan="7">読み込み中…</td></tr>');
      this.page.showLoading('購入情報を取得しています…');
      try {
        const response = await this.page.callApi('PurchaseList', filters);
        const list = (response && response.items) || [];
        this.state.purchases = Array.isArray(list) ? list : [];
        this._renderTable(this.state.purchases, $tbody);
        const now = new Date();
        if ($updated && $updated.length > 0) {
          $updated.text(now.toLocaleString('ja-JP'));
        }
        if ((!list || list.length === 0) && $feedback && $feedback.length > 0) {
          $feedback.text('表示できる購入履歴がありません。');
        }
      } catch (err) {
        console.error('[AdminPurchase:JobTable] failed to load purchases:', err);
        if ($feedback && $feedback.length > 0) {
          $feedback.text('購入情報の取得に失敗しました。');
        }
        this.page.showToast('購入情報の取得に失敗しました。', 'error');
      } finally {
        this.page.hideLoading();
      }
    }

    _renderTable(list, $tbody)
    {
      if (!$tbody || $tbody.length === 0)
      {
        return;
      }
      if (!Array.isArray(list) || list.length === 0)
      {
        $tbody.html('<tr><td colspan="7">対象のデータがありません。</td></tr>');
        return;
      }

      const rows = list.map((item) => {
        const statusLabel = this._renderStatus(item.status);
        const nextBilling = item.nextBillingDate ? this._formatDate(item.nextBillingDate) : '—';
        const paidAt = item.paidAt ? this._formatDate(item.paidAt) : '未決済';
        const member = this._escapeHtml(item.memberName || '');
        const plan = this._escapeHtml(item.planName || '');
        const id = this._escapeHtml(item.id || '');
        const actions = [
          '<button type="button" class="btn btn--ghost purchase-table__action purchase-table__action--resend" data-purchase-id="' + id + '">領収書再送</button>',
          '<button type="button" class="btn btn--ghost purchase-table__action purchase-table__action--cancel" data-purchase-id="' + id + '">自動更新を停止</button>'
        ].join('');

        return [
          '<tr>',
          '<td>' + id + '</td>',
          '<td>' + member + '</td>',
          '<td>' + plan + '</td>',
          '<td>' + statusLabel + '</td>',
          '<td>' + paidAt + '</td>',
          '<td>' + nextBilling + '</td>',
          '<td class="purchase-table__actions">' + actions + '</td>',
          '</tr>'
        ].join('');
      });

      $tbody.html(rows.join(''));
    }

    async _resendReceipt(purchaseId, $btn)
    {
      if ($btn && $btn.length > 0) { $btn.prop('disabled', true); }
      try {
        await this.page.callApi('ResendReceipt', { purchaseId: purchaseId });
        this.page.showToast('領収書を再送しました。', 'success');
      } catch (err) {
        console.error('[AdminPurchase:JobTable] resend failed:', err);
        this.page.showToast('領収書の再送に失敗しました。', 'error');
      } finally {
        if ($btn && $btn.length > 0) { $btn.prop('disabled', false); }
      }
    }

    async _cancelRenewal(purchaseId, $btn)
    {
      if ($btn && $btn.length > 0) { $btn.prop('disabled', true); }
      try {
        await this.page.callApi('CancelRenewal', { purchaseId: purchaseId });
        this.page.showToast('自動更新を停止しました。', 'success');
        await this.refresh();
      } catch (err) {
        console.error('[AdminPurchase:JobTable] cancel failed:', err);
        this.page.showToast('自動更新の停止に失敗しました。', 'error');
      } finally {
        if ($btn && $btn.length > 0) { $btn.prop('disabled', false); }
      }
    }

    _renderStatus(status)
    {
      const s = (status || '').toString();
      const map = {
        paid: { label: '決済済み', modifier: 'is-success' },
        processing: { label: '処理中', modifier: 'is-info' },
        refunded: { label: '返金済み', modifier: 'is-muted' },
        failed: { label: '失敗', modifier: 'is-warning' }
      };
      const meta = map[s] || { label: '不明', modifier: 'is-muted' };
      return '<span class="badge ' + meta.modifier + '">' + this._escapeHtml(meta.label) + '</span>';
    }

    _formatDate(value)
    {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) { return value; }
      return d.toLocaleDateString('ja-JP');
    }

    _escapeHtml(str)
    {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  }

  window.AdminPurchase = window.AdminPurchase || {};
  window.AdminPurchase.JobTable = JobTable;
})(window, document);
