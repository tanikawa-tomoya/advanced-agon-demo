// js/page/admin-queue/job-edit.js
(function (window, document) {
  'use strict';

  class JobEdit
  {
    constructor(page)
    {
      this.page = page;
      this.config = page.config;
    }

    open(job, $trigger)
    {
      if (!job)
      {
        this.page.toastService.error('編集対象のジョブ情報が見つかりませんでした。');
        return;
      }

      try
      {
        if ($trigger && typeof $trigger.prop === 'function')
        {
          $trigger.prop('disabled', true).attr('aria-busy', 'true');
        }

        const modalService = this.page.infoModalService || this.page.helpModalService;
        const dialog = modalService.show({
          title: 'ジョブ #' + job.id + ' を編集',
          html: this._buildForm(job),
          actions: [
            {
              label: 'キャンセル',
              onClick: () => modalService.dismiss()
            },
            {
              label: '保存',
              className: 'c-help-modal__action--primary',
              onClick: (ev, ctx) => this.submit(job.id, ctx && ctx.overlay ? ctx.overlay : dialog)
            }
          ]
        });

        const overlay = dialog && dialog.parentNode;
        const form = dialog && dialog.querySelector('.queue-edit-form');
        if (form)
        {
          form.addEventListener('submit', (ev) =>
          {
            ev.preventDefault();
            this.submit(job.id, overlay);
          }, true);
          const firstInput = form.querySelector('[data-initial-focus]') || form.querySelector('input, textarea, select');
          if (firstInput && typeof firstInput.focus === 'function')
          {
            firstInput.focus();
          }
        }
      }
      finally
      {
        if ($trigger && typeof $trigger.prop === 'function')
        {
          $trigger.prop('disabled', false).removeAttr('aria-busy');
        }
      }
    }

    async submit(jobId, overlay)
    {
      const form = overlay && overlay.querySelector ? overlay.querySelector('.queue-edit-form') : null;
      if (!form)
      {
        this.page.toastService.error('フォームを初期化できませんでした。');
        return;
      }

      const payload = this._serializeForm(form, jobId);
      const loader = this.page.loadingService;
      const indicator = loader.show('ジョブを更新しています…', { position: 'center', container: overlay || document.body });

      try
      {
        await window.Utils.requestApi(this.config.requestType, 'UpdateJob', payload);
        this.page.toastService.success('ジョブ #' + jobId + ' を更新しました。');
        this.page.infoModalService.dismiss();
        await new window.AdminQueue.JobView(this.page).refresh({ silent: true });
      }
      catch (err)
      {
        console.error('[admin-queue] update job failed:', err);
        this.page.toastService.error('ジョブの更新に失敗しました。' + (err && err.message ? ' ' + err.message : ''));
      }
      finally
      {
        loader.hide(indicator);
      }
    }

    _serializeForm(form, jobId)
    {
      const getValue = function (name)
      {
        const field = form.elements[name];
        if (!field)
        {
          return '';
        }
        const value = field.value;
        return typeof value === 'string' ? value : String(value || '');
      };

      const normalizeNumber = function (value)
      {
        const trimmed = String(value || '').trim();
        if (trimmed === '')
        {
          return '';
        }
        const num = Number(trimmed);
        if (Number.isNaN(num))
        {
          return '';
        }
        return num;
      };

      const trimText = function (value)
      {
        if (value === null || value === undefined)
        {
          return '';
        }
        return String(value).trim();
      };

      const contextValue = form.elements.context ? form.elements.context.value : '';

      return {
        jobId: jobId,
        jobType: trimText(getValue('jobType')),
        status: trimText(getValue('status')),
        sourcePath: trimText(getValue('sourcePath')),
        targetPath: trimText(getValue('targetPath')),
        targetBitrate: normalizeNumber(getValue('targetBitrate')),
        originalBitrate: normalizeNumber(getValue('originalBitrate')),
        progress: normalizeNumber(getValue('progress')),
        createdAt: trimText(getValue('createdAt')),
        updatedAt: trimText(getValue('updatedAt')),
        startedAt: trimText(getValue('startedAt')),
        finishedAt: trimText(getValue('finishedAt')),
        errorMessage: trimText(getValue('errorMessage')),
        context: typeof contextValue === 'string' ? contextValue : ''
      };
    }

    _buildForm(job)
    {
      const statusOptions = ['queued', 'running', 'success', 'error', 'other'];
      const statusHtml = statusOptions.map((option) =>
      {
        const label = option === 'other' ? 'その他' : option;
        const selected = (job.status || '').toString().toLowerCase() === option ? ' selected' : '';
        return '<option value="' + this._escapeHtml(option) + '"' + selected + '>' + this._escapeHtml(label) + '</option>';
      }).join('');

      const contextValue = this._formatContext(job);
      const progressValue = (job.progress === null || job.progress === undefined) ? '' : job.progress;

      return [
        '<form class="queue-edit-form" aria-label="ジョブを編集" autocomplete="off">',
        '  <div class="queue-edit-form__grid">',
        '    <label class="queue-edit-form__field">',
        '      <span>ジョブID</span>',
        '      <input type="text" name="jobIdDisplay" value="' + this._escapeHtml(job.id) + '" readonly aria-readonly="true" />',
        '    </label>',
        '    <label class="queue-edit-form__field">',
        '      <span>ジョブタイプ</span>',
        '      <input type="text" name="jobType" value="' + this._escapeHtml(job.jobType || '') + '" data-initial-focus />',
        '    </label>',
        '    <label class="queue-edit-form__field">',
        '      <span>状態</span>',
        '      <select name="status">' + statusHtml + '</select>',
        '    </label>',
        '    <label class="queue-edit-form__field">',
        '      <span>進捗 (0-100)</span>',
        '      <input type="number" name="progress" step="0.01" min="0" max="100" value="' + this._escapeHtml(progressValue) + '" />',
        '    </label>',
        '    <label class="queue-edit-form__field">',
        '      <span>作成日時</span>',
        '      <input type="text" name="createdAt" value="' + this._escapeHtml(job.createdAt || '') + '" />',
        '    </label>',
        '    <label class="queue-edit-form__field">',
        '      <span>更新日時</span>',
        '      <input type="text" name="updatedAt" value="' + this._escapeHtml(job.updatedAt || '') + '" />',
        '    </label>',
        '    <label class="queue-edit-form__field">',
        '      <span>開始日時</span>',
        '      <input type="text" name="startedAt" value="' + this._escapeHtml(job.startedAt || '') + '" />',
        '    </label>',
        '    <label class="queue-edit-form__field">',
        '      <span>終了日時</span>',
        '      <input type="text" name="finishedAt" value="' + this._escapeHtml(job.finishedAt || '') + '" />',
        '    </label>',
        '    <label class="queue-edit-form__field">',
        '      <span>入力ファイル</span>',
        '      <input type="text" name="sourcePath" value="' + this._escapeHtml(job.sourcePath || '') + '" />',
        '    </label>',
        '    <label class="queue-edit-form__field">',
        '      <span>出力ファイル</span>',
        '      <input type="text" name="targetPath" value="' + this._escapeHtml(job.targetPath || '') + '" />',
        '    </label>',
        '    <label class="queue-edit-form__field">',
        '      <span>ターゲットビットレート</span>',
        '      <input type="number" name="targetBitrate" value="' + this._escapeHtml(job.targetBitrate === null || job.targetBitrate === undefined ? '' : job.targetBitrate) + '" />',
        '    </label>',
        '    <label class="queue-edit-form__field">',
        '      <span>元ビットレート</span>',
        '      <input type="number" name="originalBitrate" value="' + this._escapeHtml(job.originalBitrate === null || job.originalBitrate === undefined ? '' : job.originalBitrate) + '" />',
        '    </label>',
        '  </div>',
        '  <label class="queue-edit-form__field queue-edit-form__field--wide">',
        '    <span>コンテキスト (JSON など)</span>',
        '    <textarea name="context" rows="6" spellcheck="false">' + this._escapeHtml(contextValue) + '</textarea>',
        '  </label>',
        '  <label class="queue-edit-form__field queue-edit-form__field--wide">',
        '    <span>エラーメッセージ</span>',
        '    <textarea name="errorMessage" rows="3">' + this._escapeHtml(job.errorMessage || '') + '</textarea>',
        '  </label>',
        '</form>'
      ].join('');
    }

    _formatContext(job)
    {
      if (job && job.contextData)
      {
        try
        {
          return JSON.stringify(job.contextData, null, 2);
        }
        catch (e)
        {
          return job.context || '';
        }
      }
      return job && job.context ? job.context : '';
    }

    _escapeHtml(value)
    {
      const str = value === undefined || value === null ? '' : String(value);
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  }

  window.AdminQueue = window.AdminQueue || {};
  window.AdminQueue.JobEdit = JobEdit;
})(window, document);
