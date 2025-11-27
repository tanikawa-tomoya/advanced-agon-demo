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
      this._formVisible = false;
      this._formInitialized = false;
    }

    async run()
    {
      this._bindEvents();
      this._renderActionButtons();
      await this.refresh();
    }

    _bindEvents()
    {
      const sel = this.selectorConfig;
      jQuery(document).off('submit.purchaseFilter').on('submit.purchaseFilter', sel.filterForm, async (ev) => {
        ev.preventDefault();
        await this._applyFilters();
      });

      jQuery(document).off('click.purchaseReload').on('click.purchaseReload', '[data-admin-purchase-reload]', async (ev) => {
        ev.preventDefault();
        await this.refresh();
      });

      jQuery(document).off('click.purchaseCreate').on('click.purchaseCreate', '[data-admin-purchase-create]', (ev) => {
        ev.preventDefault();
        this._toggleForm(true);
      });

      jQuery(document).off('click.purchaseFormCancel').on('click.purchaseFormCancel', '[data-admin-purchase-cancel]', (ev) => {
        ev.preventDefault();
        this._toggleForm(false);
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
        filters.keyword = (formData.get('keyword') || '').toString();
        filters.paymentStatus = (formData.get('paymentStatus') || '').toString();
        filters.shippingStatus = (formData.get('shippingStatus') || '').toString();
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
      const $feedback = jQuery(sel.feedback);

      $feedback.empty();
      $tbody.html('<tr><td colspan="6">読み込み中…</td></tr>');
      this.page.showLoading('購入情報を取得しています…');
      try {
        const response = await this.page.callApi('PurchaseList', filters);
        const list = this._normalizePurchases(response);
        this.state.purchases = Array.isArray(list) ? list : [];
        await this._applyFilters();
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

    async _applyFilters()
    {
      const filters = this._collectFilters();
      this.state.filters = filters;
      const list = Array.isArray(this.state.purchases) ? this.state.purchases : [];
      const filtered = list.filter((item) => this._matchFilters(item, filters));
      this.page.state.purchases = list;
      this.page.state.filtered = filtered;
      this._renderTable(filtered, jQuery(this.selectorConfig.tableBody));
      this._renderEmptyState(list, filtered);
      document.dispatchEvent(new CustomEvent('adminPurchase:updated', {
        detail: { total: list.length, filtered: filtered.length }
      }));
    }

    _renderTable(list, $tbody)
    {
      if (!$tbody || $tbody.length === 0)
      {
        return;
      }
      if (!Array.isArray(list) || list.length === 0)
      {
        $tbody.html('<tr><td colspan="6">対象のデータがありません。</td></tr>');
        return;
      }

      const rows = list.map((item) => {
        const orderCode = this._escapeHtml(item.orderCode || '');
        const productCode = this._escapeHtml(item.productCode || '');
        const userCode = this._escapeHtml(item.userCode || '');
        const paymentStatus = this._renderStatus(item.paymentStatus, 'payment');
        const shippingStatus = this._renderStatus(item.shippingStatus, 'shipping');
        const paymentMethod = this._escapeHtml(item.paymentMethod || '');
        const paymentDate = item.paymentDate ? this._formatDate(item.paymentDate) : '未決済';
        const shippingDate = item.shippingDate ? this._formatDate(item.shippingDate) : '—';
        const deliveryDate = item.deliveryDate ? this._formatDate(item.deliveryDate) : '—';
        const price = this._formatNumber(item.price);
        const quantity = this._formatNumber(item.quantity || 1);
        const currency = this._escapeHtml(item.currency || 'JPY');
        const memo = this._escapeHtml(item.memo || '');
        const updated = item.updatedAt ? this._formatDate(item.updatedAt) : '';
        const orderDate = item.orderDate ? this._formatDate(item.orderDate) : '';

        return [
          '<tr>',
          '<td>',
            '<div class="user-table__primary">' + orderCode + '</div>',
            '<div class="user-table__secondary">商品: ' + productCode + (orderDate ? ' / ' + orderDate : '') + '</div>',
          '</td>',
          '<td>',
            '<div class="user-table__primary">' + userCode + '</div>',
            '<div class="user-table__secondary">更新: ' + updated + '</div>',
          '</td>',
          '<td>',
            paymentStatus,
            '<div class="user-table__secondary">' + paymentMethod + (paymentMethod ? ' / ' : '') + paymentDate + '</div>',
          '</td>',
          '<td>',
            shippingStatus,
            '<div class="user-table__secondary">発送: ' + shippingDate + ' / 配達: ' + deliveryDate + '</div>',
          '</td>',
          '<td>',
            '<div class="user-table__primary">' + price + ' ' + currency + '</div>',
            '<div class="user-table__secondary">数量: ' + quantity + '</div>',
          '</td>',
          '<td>',
            memo ? memo : '—',
          '</td>',
          '</tr>'
        ].join('');
      });

      $tbody.html(rows.join(''));
    }

    _normalizePurchases(response)
    {
      const items = response && (response.items || response.list || response.data || response.purchases);
      if (!Array.isArray(items))
      {
        return [];
      }
      return items.map((item) => ({
        productCode: item.productCode || item.product_code || '',
        userCode: item.userCode || item.user_code || '',
        orderCode: item.orderCode || item.order_code || '',
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
        currency: item.currency || 'JPY',
        paymentMethod: item.paymentMethod || item.payment_method || '',
        paymentStatus: item.paymentStatus || item.payment_status || '',
        orderDate: item.orderDate || item.order_date || '',
        paymentDate: item.paymentDate || item.payment_date || '',
        shippingDate: item.shippingDate || item.shipping_date || '',
        deliveryDate: item.deliveryDate || item.delivery_date || '',
        shippingStatus: item.shippingStatus || item.shipping_status || '',
        memo: item.memo || '',
        createdAt: item.createdAt || item.created_at || '',
        updatedAt: item.updatedAt || item.updated_at || ''
      }));
    }

    _renderStatus(status, category)
    {
      const s = (status || '').toString();
      const map = {
        paid: { label: '決済済み', modifier: 'is-success' },
        pending: { label: '保留', modifier: 'is-info' },
        processing: { label: '処理中', modifier: 'is-info' },
        refunded: { label: '返金済み', modifier: 'is-muted' },
        failed: { label: '失敗', modifier: 'is-warning' },
        preparing: { label: '準備中', modifier: 'is-info' },
        shipped: { label: '発送済み', modifier: 'is-success' },
        delivered: { label: '配達完了', modifier: 'is-success' }
      };
      const fallback = category === 'shipping' ? '未発送' : '不明';
      const meta = map[s] || { label: fallback, modifier: 'is-muted' };
      return '<span class="badge ' + meta.modifier + '">' + this._escapeHtml(meta.label) + '</span>';
    }

    _matchFilters(item, filters)
    {
      const keyword = (filters.keyword || '').toLowerCase();
      const paymentStatus = (filters.paymentStatus || '').toLowerCase();
      const shippingStatus = (filters.shippingStatus || '').toLowerCase();

      if (keyword)
      {
        const haystack = [item.orderCode, item.productCode, item.userCode, item.memo]
          .map((v) => (v || '').toString().toLowerCase())
          .join(' ');
        if (haystack.indexOf(keyword) === -1)
        {
          return false;
        }
      }

      if (paymentStatus && paymentStatus !== (item.paymentStatus || '').toLowerCase())
      {
        return false;
      }

      if (shippingStatus && shippingStatus !== (item.shippingStatus || '').toLowerCase())
      {
        return false;
      }

      return true;
    }

    _renderActionButtons()
    {
      const sel = this.selectorConfig;
      const host = document.querySelector(sel.actions);
      if (!host || !this.page.buttonService || typeof this.page.buttonService.createActionButton !== 'function')
      {
        return;
      }

      host.innerHTML = '';

      const createLabel = '新規追加';
      const reloadLabel = '再読み込み';

      const createBtn = this.page.buttonService.createActionButton('expandable-icon-button/add', {
        baseClass: 'target-management__icon-button target-management__icon-button--primary user-management__add',
        label: createLabel,
        ariaLabel: createLabel,
        hoverLabel: createLabel,
        type: 'button',
        attributes: { 'data-admin-purchase-create': 'true' }
      });
      const reloadBtn = this.page.buttonService.createActionButton('expandable-icon-button/reload', {
        baseClass: 'target-management__icon-button target-management__icon-button--ghost user-management__reload',
        label: reloadLabel,
        ariaLabel: reloadLabel,
        hoverLabel: reloadLabel,
        type: 'button',
        attributes: { 'data-admin-purchase-reload': 'true' }
      });

      host.appendChild(createBtn);
      host.appendChild(reloadBtn);
    }

    _ensureForm()
    {
      if (this._formInitialized)
      {
        return;
      }
      const host = document.querySelector(this.selectorConfig.formHost);
      if (!host)
      {
        return;
      }
      host.innerHTML = [
        '<div class="admin-users__form">',
          '<div class="admin-users__form-header">',
            '<h3 class="admin-users__form-title">購入を追加</h3>',
            '<button type="button" class="btn btn--ghost" data-admin-purchase-cancel>閉じる</button>',
          '</div>',
          '<form data-admin-purchase-create-form class="admin-users__form-body">',
            '<div class="admin-users__form-grid">',
              '<label class="admin-users__form-field">',
                '<span class="admin-users__form-label">注文コード</span>',
                '<input type="text" name="orderCode" required class="user-management__input" />',
              '</label>',
              '<label class="admin-users__form-field">',
                '<span class="admin-users__form-label">商品コード</span>',
                '<input type="text" name="productCode" required class="user-management__input" />',
              '</label>',
              '<label class="admin-users__form-field">',
                '<span class="admin-users__form-label">ユーザーコード</span>',
                '<input type="text" name="userCode" required class="user-management__input" />',
              '</label>',
              '<label class="admin-users__form-field">',
                '<span class="admin-users__form-label">単価 (JPY)</span>',
                '<input type="number" name="price" min="0" step="1" class="user-management__input" />',
              '</label>',
              '<label class="admin-users__form-field">',
                '<span class="admin-users__form-label">数量</span>',
                '<input type="number" name="quantity" min="1" step="1" value="1" class="user-management__input" />',
              '</label>',
              '<label class="admin-users__form-field">',
                '<span class="admin-users__form-label">決済状態</span>',
                '<select name="paymentStatus" class="user-management__select">',
                  '<option value="paid">決済済み</option>',
                  '<option value="pending" selected>保留 / 審査中</option>',
                  '<option value="failed">失敗</option>',
                '</select>',
              '</label>',
              '<label class="admin-users__form-field">',
                '<span class="admin-users__form-label">配送状態</span>',
                '<select name="shippingStatus" class="user-management__select">',
                  '<option value="preparing" selected>準備中</option>',
                  '<option value="shipped">発送済み</option>',
                  '<option value="delivered">配達完了</option>',
                '</select>',
              '</label>',
              '<label class="admin-users__form-field admin-users__form-field--wide">',
                '<span class="admin-users__form-label">備考</span>',
                '<textarea name="memo" class="user-management__input" rows="2"></textarea>',
              '</label>',
            '</div>',
            '<div class="admin-users__form-actions">',
              '<button type="submit" class="btn btn--primary">追加する</button>',
              '<button type="button" class="btn btn--ghost" data-admin-purchase-cancel>キャンセル</button>',
            '</div>',
          '</form>',
        '</div>'
      ].join('');

      this._formInitialized = true;
      jQuery(document).off('submit.purchaseCreateForm').on('submit.purchaseCreateForm', '[data-admin-purchase-create-form]', async (ev) => {
        ev.preventDefault();
        await this._handleCreate(ev.currentTarget);
      });
    }

    async _handleCreate(form)
    {
      if (!form)
      {
        return;
      }
      const formData = new window.FormData(form);
      const now = new Date().toISOString();
      const newItem = {
        orderCode: formData.get('orderCode') || '',
        productCode: formData.get('productCode') || '',
        userCode: formData.get('userCode') || '',
        price: Number(formData.get('price') || 0),
        quantity: Number(formData.get('quantity') || 1),
        currency: 'JPY',
        paymentMethod: 'manual-entry',
        paymentStatus: formData.get('paymentStatus') || 'pending',
        orderDate: now,
        paymentDate: '',
        shippingDate: '',
        deliveryDate: '',
        shippingStatus: formData.get('shippingStatus') || 'preparing',
        memo: formData.get('memo') || '',
        createdAt: now,
        updatedAt: now
      };

      this.state.purchases.unshift(newItem);
      this.page.showToast('購入データを追加しました。', 'success');
      this._toggleForm(false);
      await this._applyFilters();
    }

    _toggleForm(shouldShow)
    {
      const host = document.querySelector(this.selectorConfig.formHost);
      if (!host)
      {
        return;
      }

      this._ensureForm();
      this._formVisible = shouldShow;
      if (shouldShow)
      {
        host.classList.remove('hidden');
        host.removeAttribute('hidden');
      }
      else
      {
        host.classList.add('hidden');
        host.setAttribute('hidden', 'hidden');
      }
    }

    _renderEmptyState(allItems, filtered)
    {
      const empty = document.querySelector(this.selectorConfig.empty);
      const feedback = document.querySelector(this.selectorConfig.feedback);
      if (empty)
      {
        if (Array.isArray(allItems) && allItems.length === 0)
        {
          empty.classList.remove('hidden');
          empty.removeAttribute('hidden');
        }
        else
        {
          empty.classList.add('hidden');
          empty.setAttribute('hidden', 'hidden');
        }
      }
      if (feedback)
      {
        if (Array.isArray(allItems) && allItems.length > 0 && Array.isArray(filtered) && filtered.length === 0)
        {
          feedback.textContent = '条件に合致する購入が見つかりません。';
          feedback.classList.remove('hidden');
          feedback.removeAttribute('hidden');
        }
        else
        {
          feedback.textContent = '';
          feedback.classList.add('hidden');
          feedback.setAttribute('hidden', 'hidden');
        }
      }
    }

    _formatDate(value)
    {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) { return value; }
      return d.toLocaleDateString('ja-JP');
    }

    _formatNumber(value)
    {
      const n = Number(value);
      if (Number.isNaN(n))
      {
        return '0';
      }
      return n.toLocaleString('ja-JP');
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
