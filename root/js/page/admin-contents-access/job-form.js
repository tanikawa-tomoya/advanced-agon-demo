(function (window, document) {
  'use strict';

  function formatDate(date)
  {
    if (!(date instanceof Date) || Number.isNaN(date.getTime()))
    {
      return '';
    }
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    return yyyy + '-' + mm + '-' + dd + ' ' + hh + ':' + mi;
  }

  class JobForm
  {
    constructor(pageInstance)
    {
      this.page = pageInstance;
      const sel = pageInstance.selectorConfig || {};
      this.host = document.querySelector(sel.formHost) || document.body;
      this.modal = null;
      this.form = null;
      this.feedback = null;
      this.submitButton = null;
      this.cancelButton = null;
      this.fields = {};
      this._lastFocus = null;
      this.contentsSelectButton = null;
      this.userSelectButton = null;
    }

    async run()
    {
      this._ensureModal();
      this._decorateButtons();
      this._bindEvents();
      this.page.formJob = this;
    }

    openCreateForm()
    {
      this._ensureModal();
      this._resetForm();
      this._openModal();
    }

    close()
    {
      this._closeModal();
    }

    _bindEvents()
    {
      if (this.form)
      {
        this.form.addEventListener('submit', this._handleSubmit.bind(this));
      }
      if (this.contentsSelectButton)
      {
        this.contentsSelectButton.addEventListener('click', this._openContentsSelectModal.bind(this));
      }
      if (this.userSelectButton)
      {
        this.userSelectButton.addEventListener('click', this._openUserSelectModal.bind(this));
      }
      if (this.modal)
      {
        this.modal.addEventListener('click', async (event) => {
          const closer = event.target && event.target.closest('[data-modal-close]');
          if (closer)
          {
            event.preventDefault();
            this._closeModal();
          }
        });
        this.modal.addEventListener('keydown', (event) => {
          if (event.key === 'Escape' && this.modal.classList.contains('is-open'))
          {
            event.preventDefault();
            this._closeModal();
          }
        });
      }
    }

    _handleSubmit(event)
    {
      if (event)
      {
        event.preventDefault();
      }
      const values = this._readValues();
      if (!values.contentsCode || !values.userCode)
      {
        this._setError('コンテンツコードとユーザーコードを入力してください。');
        return;
      }
      this._setError('');
      const now = formatDate(new Date());
      const record = {
        id: 'local-' + Date.now(),
        contentsCode: values.contentsCode,
        userCode: values.userCode,
        startDate: this._normalizeDateInput(values.startDate),
        endDate: this._normalizeDateInput(values.endDate),
        createdAt: now,
        updatedAt: now
      };
      if (typeof document !== 'undefined' && typeof document.dispatchEvent === 'function')
      {
        document.dispatchEvent(new CustomEvent('contentsAccess:created', { detail: record }));
      }
      if (this.page && typeof this.page.showToast === 'function')
      {
        this.page.showToast('新しいアクセス権限を保存しました（デモ）。', 'success');
      }
      this._closeModal();
    }

    _readValues()
    {
      const result = {};
      const fields = this.fields || {};
      Object.keys(fields).forEach((key) => {
        const node = fields[key];
        result[key] = node && typeof node.value === 'string' ? node.value.trim() : '';
      });
      return result;
    }

    _normalizeDateInput(value)
    {
      if (!value)
      {
        return '';
      }
      const parsed = new Date(value.replace(' ', 'T'));
      if (Number.isNaN(parsed.getTime()))
      {
        return value;
      }
      return formatDate(parsed);
    }

    _setError(message)
    {
      if (!this.feedback)
      {
        return;
      }
      this.feedback.textContent = message || '';
      if (message)
      {
        this.feedback.classList.remove('hidden');
        this.feedback.removeAttribute('hidden');
      }
      else
      {
        this.feedback.classList.add('hidden');
        this.feedback.setAttribute('hidden', 'hidden');
      }
    }

    _resetForm()
    {
      const fields = this.fields || {};
      Object.keys(fields).forEach((key) => {
        const node = fields[key];
        if (node && typeof node.value === 'string')
        {
          node.value = '';
        }
      });
      this._setError('');
    }

    _openModal()
    {
      if (!this.modal)
      {
        return;
      }
      if (this.host)
      {
        this.host.classList.remove('hidden');
        this.host.removeAttribute('hidden');
      }
      this._lastFocus = document.activeElement;
      this.modal.classList.add('is-open');
      this.modal.removeAttribute('aria-hidden');
      if (this.fields.contentsCode && typeof this.fields.contentsCode.focus === 'function')
      {
        this.fields.contentsCode.focus();
      }
    }

    _closeModal()
    {
      if (!this.modal)
      {
        return;
      }
      this.modal.classList.remove('is-open');
      this.modal.setAttribute('aria-hidden', 'true');
      if (this.host)
      {
        this.host.classList.add('hidden');
        this.host.setAttribute('hidden', 'hidden');
      }
      const last = this._lastFocus;
      this._lastFocus = null;
      if (last && typeof last.focus === 'function')
      {
        last.focus();
      }
    }

    _decorateButtons()
    {
      if (!this.modal || !this.page)
      {
        return;
      }
      const submit = this.modal.querySelector('[data-action="contents-access-form-submit"]');
      const cancel = this.modal.querySelector('[data-action="contents-access-form-cancel"]');
      const decoratedSubmit = this.page.decorateActionButton(submit, {
        buttonType: 'pill-button',
        baseClass: 'btn btn--primary',
        label: submit ? submit.textContent : '保存'
      }) || submit;
      const decoratedCancel = this.page.decorateActionButton(cancel, {
        buttonType: 'pill-button/outline',
        baseClass: 'btn btn--ghost',
        label: cancel ? cancel.textContent : 'キャンセル'
      }) || cancel;
      this.submitButton = decoratedSubmit;
      this.cancelButton = decoratedCancel;
      if (submit && decoratedSubmit !== submit && submit.parentNode)
      {
        submit.parentNode.replaceChild(decoratedSubmit, submit);
      }
      if (cancel && decoratedCancel !== cancel && cancel.parentNode)
      {
        cancel.parentNode.replaceChild(decoratedCancel, cancel);
      }
    }

    _ensureModal()
    {
      if (this.modal && this.modal.parentNode)
      {
        return;
      }
      const wrapper = document.createElement('div');
      wrapper.innerHTML = `
        <div class="screen-modal contents-access__modal" data-contents-access-modal aria-hidden="true">
          <div class="screen-modal__overlay" data-modal-close aria-label="モーダルを閉じる"></div>
          <section class="screen-modal__content" role="dialog" aria-modal="true" aria-labelledby="contents-access-form-title" aria-describedby="contents-access-form-summary">
            <button type="button" class="screen-modal__close" data-modal-close data-modal-initial-focus aria-label="モーダルを閉じる">×</button>
            <div class="screen-modal__body contents-access__modal-body">
              <section class="announcement-management__form admin-users__form" data-contents-access-form-wrapper aria-live="polite">
                <h2 class="announcement-management__form-title" id="contents-access-form-title">アクセス権限を追加</h2>
                <p class="screen-modal__summary" id="contents-access-form-summary">コンテンツコードとユーザーコードを指定して公開期間を設定します。</p>
                <form class="announcement-management__form-body user-form" data-contents-access-form novalidate>
                  <div class="user-form__fields contents-access__form-fields">
                    <label class="user-management__field user-form__field">
                      <span class="user-management__field-label">コンテンツコード <span class="user-management__field-badge user-management__field-badge--required">必須</span></span>
                      <div class="user-management__field-controls">
                        <input type="text" name="contentsCode" class="user-management__input" data-field="contentsCode" placeholder="例: contents-admin-001-01" required />
                        <button type="button" class="btn btn--ghost" data-action="contents-access-contents-select">コンテンツを選択</button>
                      </div>
                      <p class="user-management__field-help">全ユーザーのコンテンツを検索して選択できます。</p>
                    </label>
                    <label class="user-management__field user-form__field">
                      <span class="user-management__field-label">ユーザーコード <span class="user-management__field-badge user-management__field-badge--required">必須</span></span>
                      <div class="user-management__field-controls">
                        <input type="text" name="userCode" class="user-management__input" data-field="userCode" placeholder="例: admin-001" required />
                        <button type="button" class="btn btn--ghost" data-action="contents-access-user-select">ユーザーを選択</button>
                      </div>
                      <p class="user-management__field-help">全ユーザーから対象ユーザーを指定します。</p>
                    </label>
                    <label class="user-management__field user-form__field">
                      <span class="user-management__field-label">アクセス期間（開始日時）</span>
                      <input type="datetime-local" name="startDate" class="user-management__input" data-field="startDate" />
                    </label>
                    <label class="user-management__field user-form__field">
                      <span class="user-management__field-label">アクセス期間（終了日時）</span>
                      <input type="datetime-local" name="endDate" class="user-management__input" data-field="endDate" />
                    </label>
                  </div>
                  <div class="user-form__feedback c-feedback-region hidden" data-contents-access-form-feedback hidden></div>
                  <div class="announcement-management__form-actions user-form__actions">
                    <button type="submit" class="btn btn--primary user-form__submit" data-action="contents-access-form-submit">保存</button>
                    <button type="button" class="btn btn--ghost" data-action="contents-access-form-cancel" data-modal-close>キャンセル</button>
                  </div>
                </form>
              </section>
            </div>
          </section>
        </div>
      `;
      const modal = wrapper.firstElementChild;
      (this.host || document.body).appendChild(modal);
      this.modal = modal;
      this.form = modal.querySelector('[data-contents-access-form]');
      this.feedback = modal.querySelector('[data-contents-access-form-feedback]');
      this.fields = {
        contentsCode: modal.querySelector('[data-field="contentsCode"]'),
        userCode: modal.querySelector('[data-field="userCode"]'),
        startDate: modal.querySelector('[data-field="startDate"]'),
        endDate: modal.querySelector('[data-field="endDate"]')
      };
      this.contentsSelectButton = modal.querySelector('[data-action="contents-access-contents-select"]');
      this.userSelectButton = modal.querySelector('[data-action="contents-access-user-select"]');
    }

    _openContentsSelectModal(event)
    {
      if (event)
      {
        event.preventDefault();
      }
      var service = this.page && this.page.contentsSelectModalService;
      if (!service || typeof service.open !== 'function')
      {
        this.page.showToast('コンテンツ選択モーダルを起動できませんでした。', 'error');
        return;
      }
      var currentCode = this.fields.contentsCode && this.fields.contentsCode.value ? this.fields.contentsCode.value.trim() : '';
      service.open({
        multiple: false,
        selected: currentCode ? [{ id: currentCode }] : [],
        onSelect: (item) =>
        {
          var raw = item && (item.raw || item);
          var code = raw && (raw.contentCode || raw.content_code || raw.contentId || raw.contentID || raw.code || item.id);
          if (this.fields.contentsCode && code)
          {
            this.fields.contentsCode.value = code;
          }
        }
      });
    }

    _openUserSelectModal(event)
    {
      if (event)
      {
        event.preventDefault();
      }
      var service = this.page && this.page.userSelectModalService;
      if (!service || typeof service.open !== 'function')
      {
        this.page.showToast('ユーザー選択モーダルを起動できませんでした。', 'error');
        return;
      }
      var currentCode = this.fields.userCode && this.fields.userCode.value ? this.fields.userCode.value.trim() : '';
      service.open({
        multiple: false,
        selectedCodes: currentCode ? [currentCode] : [],
        onSelect: (user) =>
        {
          var code = user && (user.userCode || user.userId || user.id || '');
          if (this.fields.userCode && code)
          {
            this.fields.userCode.value = code;
          }
        }
      });
    }
  }

  window.AdminContentsAccess = window.AdminContentsAccess || {};
  window.AdminContentsAccess.JobForm = JobForm;
})(window, document);
