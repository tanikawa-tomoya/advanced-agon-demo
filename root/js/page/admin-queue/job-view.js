(function () {

  'use strict';

  class JobView
  {
    constructor(pageInstance)
    {
      this.pageInstance = pageInstance;
    }
    
    async refresh(options = {})
    {
      const { silent } = options;
      const loader = this.pageInstance.loadingService;

      let overlayNode = null;
      if (!silent)
      {
        overlayNode = loader.show(
          this.pageInstance.textConfig.loading,
          {
            position: 'center',
            container: document.body
          }
        );
      }

      try
      {
        const pageConfig = this.pageInstance.config || {};
        const params = {};
        if (pageConfig.pageSize != null)
        {
          params.limit = pageConfig.pageSize;
        }

        const requestType = pageConfig.requestType || 'Queue';
        const token = pageConfig.apiToken || '';
        const response = await window.Utils.requestApi(
          requestType,
          'StatusGet',
          Object.assign({}, params, { token: token })
        );

        const payload = response || {};
        const result = (payload.result && typeof payload.result === 'object') ? payload.result : {};
        if (payload.status && payload.status !== 'OK')
        {
          const reason = payload.reason || result.message || '';
          throw new Error(reason || 'サーバーからエラーが返されました。');
        }

        const sourceJobs = Array.isArray(result.jobs)
          ? result.jobs
          : (Array.isArray(payload.jobs) ? payload.jobs : []);
        let jobs = sourceJobs.slice();

        const filterVal = (this.pageInstance.$filter.val() || 'all').toString();
        if (filterVal && filterVal !== 'all')
        {
          const filterAlias = pageConfig.filterAlias || {};
          const alias = (filterAlias[filterVal] || filterVal).toString().toLowerCase();
          jobs = jobs.filter(function (job)
          {
            return (job.status || '').toString().toLowerCase() === alias;
          });
        }

        jobs.sort(function (a, b)
        {
          return (a.id || 0) - (b.id || 0);
        });

        this.pageInstance.state.jobs = jobs;
        this.pageInstance.state.stats = result.stats || payload.stats || {};

        this.renderWarnings(result.warnings || payload.warnings);
        this.renderJobs(jobs);

        const updatedAt = result.generatedAt || payload.generatedAt || new Date().toISOString();
        this.updateTimestamp(updatedAt);
      }
      catch (err)
      {
        console.error('[admin-queue: JobView] failed to refresh:', err);
        this.pageInstance.toastService.error('ジョブ一覧の取得に失敗しました。' + (err.message || ''));
        this.renderJobs([]);
      }
      finally
      {
        if (!silent && overlayNode)
        {
          loader.hide(overlayNode);
        }
      }
    }

    renderWarnings(warnings)
    {
      const $feedback = this.pageInstance.$feedback;
      $feedback.empty().removeAttr('data-state');
      if (!warnings)
      {
        return;
      }

      const list = Array.isArray(warnings) ? warnings : [warnings];
      const filtered = list.filter(function (item)
      {
        return typeof item === 'string' && item;
      });
      if (!filtered.length)
      {
        return;
      }

      $feedback.attr('data-state', 'warning');
      const $list = jQuery('<ul></ul>');
      filtered.forEach(function (text)
      {
        $list.append(jQuery('<li></li>').text(text));
      });
      $feedback.append($list);
    }

    renderJobs(jobs)
    {
      const $container = this.pageInstance.$table;
      $container.empty();
      const total = Array.isArray(jobs) ? jobs.length : 0;

      if (!total)
      {
        const text = this.pageInstance.$filter.val() && this.pageInstance.$filter.val() !== 'all'
          ? '指定したステータスのジョブは存在しません。'
          : this.pageInstance.textConfig.noJobs;
        $container.append(jQuery('<p></p>').addClass('queue-table__empty').text(text));
        return;
      }

      const $wrapper = jQuery('<div></div>').addClass('queue-table__container');
      const $table = jQuery('<table></table>').addClass('queue-table__table');
      const $thead = jQuery('<thead></thead>');
      const $headRow = jQuery('<tr></tr>');
      ['ジョブ', '状態', '進捗', '作成日時', '開始日時', '終了日時', '操作'].forEach(function (label)
      {
        $headRow.append(jQuery('<th scope="col"></th>').text(label));
      });
      $thead.append($headRow);
      $table.append($thead);

      const $tbody = jQuery('<tbody></tbody>');
      const pageInstance = this.pageInstance;
      const formatDateTime = this.formatDateTime.bind(this);
      const getStatusPresentation = this.getStatusPresentation.bind(this);
      jobs.forEach(function (job)
      {
        const $row = jQuery('<tr></tr>');

        const $jobCell = jQuery('<td></td>').addClass('queue-table__cell queue-table__cell--job');
        $jobCell.append(jQuery('<div></div>').addClass('queue-table__id').text('#' + job.id));
        $jobCell.append(jQuery('<div></div>').addClass('queue-table__type').text(job.jobType || ''));
        $row.append($jobCell);

        const statusText = job.status || '';
        const statusInfo = getStatusPresentation(statusText);
        const $statusCell = jQuery('<td></td>').addClass('queue-table__cell queue-table__cell--status');
        const statusButton = pageInstance.buttonService.createActionButton('queue-status', {
          label: statusInfo.label,
          ariaLabel: 'ジョブ #' + job.id + ' の状態: ' + statusInfo.label,
          variant: statusInfo.variant,
          dataset: { statusKey: statusInfo.normalized || 'unknown' }
        });
        $statusCell.append(statusButton);

        const isError = statusInfo.variant === 'error';
        if (isError)
        {
          const errorReason = job.errorMessage || job.error_message || '';
          const detailButton = pageInstance.buttonService.createActionButton('queue-error-detail', {
            label: '詳細',
            ariaLabel: 'ジョブ #' + job.id + ' のエラー詳細を表示',
            baseClass: 'mock-avatar__upload-btn queue-table__error-detail-button',
            dataset: { jobId: job.id, errorReason: errorReason }
          });
          const $detailWrapper = jQuery('<div></div>').addClass('queue-table__error-detail');
          $detailWrapper.append(detailButton);
          $statusCell.append($detailWrapper);
        }
        $row.append($statusCell);

        const progress = Number(job.progress);
        const progText = isFinite(progress) ? (Math.round(progress) + '%') : '-';
        $row.append(jQuery('<td></td>').addClass('queue-table__cell').text(progText));
        const createdAt = formatDateTime(job.createdAt || job.created_at || '');
        const startedAt = formatDateTime(job.startedAt || job.started_at || '');
        const finishedAt = formatDateTime(job.finishedAt || job.finished_at || '');

        $row.append(jQuery('<td></td>').addClass('queue-table__cell queue-table__cell--datetime').text(createdAt));
        $row.append(jQuery('<td></td>').addClass('queue-table__cell queue-table__cell--datetime').text(startedAt));
        $row.append(jQuery('<td></td>').addClass('queue-table__cell queue-table__cell--datetime').text(finishedAt));

        const actionConfig = {
          baseClass: 'table-action-button queue-table__action-button',
          variantPrefix: ['table-action-button--', 'queue-table__action-button--'],
          dataset: { jobId: job.id }
        };
        const runButton = pageInstance.buttonService.createActionButton('manual-run', Object.assign({}, actionConfig, {
          label: '実行',
          ariaLabel: 'ジョブ #' + job.id + ' を実行',
          hoverLabel: 'ジョブを手動実行',
          variant: 'manual-run'
        }));
        const editButton = pageInstance.buttonService.createActionButton('edit', Object.assign({}, actionConfig, {
          label: '編集',
          ariaLabel: 'ジョブ #' + job.id + ' を編集',
          hoverLabel: 'ジョブ情報を編集',
          variant: 'edit'
        }));
        const deleteButton = pageInstance.buttonService.createDeleteButton(Object.assign({}, actionConfig, {
          label: '削除',
          ariaLabel: 'ジョブ #' + job.id + ' を削除',
          hoverLabel: 'ジョブを削除',
          variant: 'delete'
        }));
        const $actions = jQuery('<td></td>').addClass('queue-table__cell queue-table__cell--operations');
        $actions.append(runButton);
        $actions.append(editButton);
        $actions.append(deleteButton);
        $row.append($actions);

        $tbody.append($row);
      });

      $table.append($tbody);
      $wrapper.append($table);
      $container.append($wrapper);
    }

    getStatusPresentation(value)
    {
      const raw = (value == null) ? '' : value.toString();
      const normalized = raw.trim().toLowerCase();
      const map = {
        queued: { label: '待機中', variant: 'queued' },
        waiting: { label: '待機中', variant: 'queued' },
        pending: { label: '待機中', variant: 'queued' },
        running: { label: '実行中', variant: 'running' },
        processing: { label: '処理中', variant: 'running' },
        executing: { label: '実行中', variant: 'running' },
        success: { label: '完了', variant: 'success' },
        succeeded: { label: '完了', variant: 'success' },
        completed: { label: '完了', variant: 'success' },
        done: { label: '完了', variant: 'success' },
        error: { label: 'エラー', variant: 'error' },
        failed: { label: '失敗', variant: 'error' },
        failure: { label: '失敗', variant: 'error' },
        cancelled: { label: 'キャンセル', variant: 'unknown' },
        canceled: { label: 'キャンセル', variant: 'unknown' }
      };

      if (map[normalized])
      {
        const info = map[normalized];
        return {
          label: info.label,
          variant: info.variant,
          raw: raw,
          normalized: normalized
        };
      }

      const fallback = raw || '不明';
      return {
        label: fallback,
        variant: 'unknown',
        raw: raw,
        normalized: normalized
      };
    }

    formatDateTime(value)
    {
      if (value == null || value === '')
      {
        return '';
      }

      try
      {
        const date = new Date(value);
        if (!isNaN(date.getTime()))
        {
          const padZero = function (num)
          {
            return num < 10 ? '0' + num : String(num);
          };

          return (
            date.getFullYear() +
            '/' + padZero(date.getMonth() + 1) +
            '/' + padZero(date.getDate()) +
            ' ' + padZero(date.getHours()) +
            ':' + padZero(date.getMinutes()) +
            ':' + padZero(date.getSeconds())
          );
        }
      }
      catch (e)
      {
      }

      return value;
    }

    updateTimestamp(value)
    {
      if (!value)
      {
        return;
      }

      var display;
      try
      {
        const date = new Date(value);
        if (!isNaN(date.getTime()))
        {
          display = date.toLocaleString();
        }
      }
      catch (e)
      {
        display = null;
      }

      this.pageInstance.$updated.text('更新日時：' + (display || value));
    }
  }

  window.AdminQueue = window.AdminQueue || {};
  window.AdminQueue.JobView = JobView;
})(window, document);
