(function (window) {
  'use strict';

  function escapeHtml(value)
  {
    var str = String(value == null ? '' : value);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value)
  {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  function pad(num)
  {
    return num < 10 ? '0' + num : String(num);
  }

  function parseDate(value)
  {
    if (value instanceof Date && isFinite(value.getTime())) { return value; }
    var str = String(value == null ? '' : value).trim();
    if (!str) { return null; }
    var normalized = str.replace(/T/, ' ');
    if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
      normalized = normalized.replace(/-/g, '/');
    }
    var date = new Date(normalized);
    if (!isFinite(date.getTime())) { date = new Date(str); }
    if (!isFinite(date.getTime())) { return null; }
    return date;
  }

  function formatDateTime(value)
  {
    var date = parseDate(value);
    if (!date) { return ''; }
    return date.getFullYear() + '/' + pad(date.getMonth() + 1) + '/' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  }

  function formatServerTimestamp(value)
  {
    var date = parseDate(value) || new Date();
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
  }

  class AdminAnnouncementJobList
  {
    constructor(pageInstance)
    {
      this.page = pageInstance;
    }

    refresh(options)
    {
      options = options || {};
      var state = this.page.state;
      var params = {};
      var page = options.resetPage ? 1 : (options.page || state.pagination.page || 1);
      var perPage = options.perPage || state.pagination.perPage || 25;
      params.page = String(page);
      params.perPage = String(perPage);

      if (state.listRequest && typeof state.listRequest.abort === 'function') {
        state.listRequest.abort();
      }

      this.page.clearFormFeedback();
      this.page.setBusy(true);

      var request = this.page.callApi('AnnouncementList', params, { errorMessage: this.page.textConfig.listError });
      state.listRequest = request;
      var self = this;

      request.then(function (result) {
        if (state.listRequest !== request) { return; }
        var normalized = self._normalizeAnnouncementsPayload(result);
        state.announcements = normalized.announcements;
        state.ackLookup = normalized.ackLookup;
        self._updatePaginationMeta(result && result.pagination);
        if (!state.selectedId || !state.announcements.some(function (item) { return item.id === state.selectedId; })) {
          state.selectedId = '';
        }
        self._renderAnnouncements();
        if (state.selectedId) {
          var selected = self.page.findAnnouncement(state.selectedId);
          self._renderDetail(selected);
        } else {
          self._renderDetail(null);
        }
      }).catch(function (error) {
        if (error && error.isAbort) { return; }
        var message = (error && error.message) ? error.message : self.page.textConfig.listError;
        if (self.page.toastService) {
          self.page.toastService.error(message);
        }
      }).always(function () {
        if (state.listRequest === request) {
          state.listRequest = null;
        }
        self.page.setBusy(false);
      });

      return request;
    }

    selectAnnouncement(id)
    {
      var state = this.page.state;
      state.selectedId = id || '';
      this._renderAnnouncements();
      if (state.selectedId) {
        this._renderDetail(this.page.findAnnouncement(state.selectedId));
      } else {
        this._renderDetail(null);
      }
      state.recipients = [];
      this.page.renderRecipients();
      if (this.page.elements.recipientFilter && this.page.elements.recipientFilter.length) {
        this.page.elements.recipientFilter.val(state.recipientsStatus);
      }
      if (state.selectedId) {
        this.loadRecipients();
      }
    }

    loadRecipients(options)
    {
      var state = this.page.state;
      var TEXT = this.page.textConfig;
      if (!state.selectedId) { return null; }
      options = options || {};
      var params = { id: state.selectedId };
      var status = options.status || state.recipientsStatus || 'all';
      if (status === 'acknowledged' || status === 'unacknowledged') {
        params.status = status;
      } else {
        status = 'all';
      }
      state.recipientsStatus = status;
      if (this.page.elements.recipientFilter && this.page.elements.recipientFilter.length) {
        this.page.elements.recipientFilter.val(status);
      }

      if (state.recipientsRequest && typeof state.recipientsRequest.abort === 'function') {
        state.recipientsRequest.abort();
      }

      this._showRecipientsFeedback('', '');
      this._setRecipientsBusy(true);

      var request = this.page.callApi('AnnouncementRecipients', params, { errorMessage: TEXT.recipientsError });
      state.recipientsRequest = request;
      var self = this;

      request.then(function (result) {
        if (state.recipientsRequest !== request) { return; }
        var list = Array.isArray(result && result.recipients) ? result.recipients : [];
        var normalized = self._normalizeRecipients(list);
        state.recipients = normalized.recipients;
        self._syncAnnouncementAudienceFromRecipients(state.selectedId, normalized.audienceUsers);
        self.page.renderRecipients();
      }).catch(function (error) {
        if (error && error.isAbort) { return; }
        var message = (error && error.message) ? error.message : TEXT.recipientsError;
        self._showRecipientsFeedback(message, 'error');
        if (self.page.toastService) {
          self.page.toastService.error(message);
        }
      }).always(function () {
        if (state.recipientsRequest === request) {
          state.recipientsRequest = null;
        }
        self._setRecipientsBusy(false);
      });

      return request;
    }

    changePerPage(value)
    {
      var perPage = parseInt(value, 10);
      if (!isFinite(perPage) || perPage <= 0) {
        perPage = this.page.state.pagination.perPage;
      }
      return this.refresh({ perPage: perPage, resetPage: true });
    }

    changeRecipientFilter(value)
    {
      var normalized = String(value || '').toLowerCase();
      if (normalized !== 'acknowledged' && normalized !== 'unacknowledged') {
        normalized = 'all';
      }
      this.page.state.recipientsStatus = normalized;
      if (this.page.elements.recipientFilter && this.page.elements.recipientFilter.length) {
        this.page.elements.recipientFilter.val(normalized);
      }
      return this.loadRecipients({ status: normalized });
    }

    reloadRecipients()
    {
      return this.loadRecipients({ status: this.page.state.recipientsStatus });
    }

    toggleAcknowledgement(userCode, normalizedUserCode, currentlyAcked)
    {
      var state = this.page.state;
      var TEXT = this.page.textConfig;
      if (!state.selectedId || !userCode) { return null; }
      var payload = { id: state.selectedId, userCode: userCode };
      if (!currentlyAcked) {
        payload.acknowledgedAt = formatServerTimestamp(new Date());
      }
      this._setRecipientsBusy(true);
      this._showRecipientsFeedback('', '');
      var self = this;

      var request = this.page.callApi('AnnouncementAcknowledge', payload, { errorMessage: TEXT.recipientsAckError });
      request.then(function (result) {
        var ackAt = result && result.acknowledgedAt ? result.acknowledgedAt : '';
        self.updateAckLookup(state.selectedId, userCode, ackAt);
        self.updateRecipientAck(normalizedUserCode, ackAt, userCode);
        self._renderAnnouncements();
        self.page.renderRecipients();
        if (self.page.toastService) {
          self.page.toastService.success(TEXT.recipientsAckSuccess);
        }
      }).catch(function (error) {
        if (error && error.isAbort) { return; }
        var message = (error && error.message) ? error.message : TEXT.recipientsAckError;
        self._showRecipientsFeedback(message, 'error');
        if (self.page.toastService) {
          self.page.toastService.error(message);
        }
      }).always(function () {
        self._setRecipientsBusy(false);
      });
      return request;
    }

    updateAckLookup(announcementId, userCode, ackAt)
    {
      var state = this.page.state;
      var id = String(announcementId || '').trim();
      if (!id) { return; }
      if (!state.ackLookup[id]) { state.ackLookup[id] = {}; }
      var normalized = this._normalizeUserCode(userCode);
      if (normalized) {
        if (ackAt) {
          state.ackLookup[id][normalized] = { userCode: userCode, acknowledgedAt: ackAt };
        } else {
          delete state.ackLookup[id][normalized];
        }
      }
      this.updateAnnouncementAckCount(id);
    }

    updateAnnouncementAckCount(id)
    {
      var map = this.page.state.ackLookup[id] || {};
      var list = this.page.state.announcements;
      for (var i = 0; i < list.length; i += 1) {
        if (list[i].id === id) {
          list[i].acknowledgedCount = this.page.countAcknowledgedFromLookup(map);
          break;
        }
      }
    }

    updateRecipientAck(normalizedUserCode, ackAt, originalUserCode)
    {
      var state = this.page.state;
      var updated = false;
      for (var i = 0; i < state.recipients.length; i += 1) {
        var item = state.recipients[i];
        if (item.normalizedUserCode === normalizedUserCode) {
          item.acknowledgedAt = ackAt || '';
          item.acknowledgedAtDisplay = ackAt ? formatDateTime(ackAt) : '';
          item.acknowledged = !!ackAt;
          if (originalUserCode) {
            item.userCode = originalUserCode;
          }
          updated = true;
          break;
        }
      }
      return updated;
    }

    deleteAnnouncement(id)
    {
      if (!id) { return null; }
      var self = this;
      return this.page.confirmDialogService.open(this.page.textConfig.deleteConfirm, { type: 'warning' }).then(function (confirmed) {
        if (!confirmed) { return null; }
        self.page.setBusy(true);
        var request = self.page.callApi('AnnouncementDelete', { id: id }, { errorMessage: self.page.textConfig.deleteError });
        request.then(function () {
          if (self.page.toastService) {
            self.page.toastService.success(self.page.textConfig.deleteSuccess);
          }
          if (self.page.state.selectedId === id) {
            self.page.state.selectedId = '';
            self.page.state.recipients = [];
            self._renderDetail(null);
            self.page.renderRecipients();
          }
          return self.refresh({ resetPage: false });
        }).catch(function (error) {
          if (error && error.isAbort) { return; }
          var errMsg = (error && error.message) ? error.message : self.page.textConfig.deleteError;
          if (self.page.toastService) {
            self.page.toastService.error(errMsg);
          }
        }).always(function () {
          self.page.setBusy(false);
        });
        return request;
      });
    }

    _showRecipientsFeedback(message, type)
    {
      var el = this.page.elements.recipientsFeedback;
      if (!el || !el.length) { return; }
      if (!message) {
        el.addClass('hidden').text('');
        el.removeAttr('data-feedback-type');
        return;
      }
      el.text(message).removeClass('hidden');
      el.attr('data-feedback-type', type === 'error' ? 'error' : 'info');
    }

    _updatePaginationMeta(meta)
    {
      var source = meta || {};
      var state = this.page.state;
      var page = parseInt(source.page, 10);
      if (!isFinite(page) || page < 1) { page = state.pagination.page || 1; }
      var perPage = parseInt(source.perPage, 10);
      if (!isFinite(perPage) || perPage < 1) { perPage = state.pagination.perPage || 25; }
      var totalCount = parseInt(source.totalCount, 10);
      if (!isFinite(totalCount) || totalCount < 0) { totalCount = 0; }
      var totalPages = parseInt(source.totalPages, 10);
      if (!isFinite(totalPages) || totalPages < 0) {
        totalPages = perPage > 0 ? Math.ceil(totalCount / perPage) : 0;
      }
      var hasNext = !!source.hasNextPage;
      var hasPrev = !!source.hasPreviousPage;
      var nextPage = parseInt(source.nextPage, 10);
      if (!isFinite(nextPage) || nextPage < 1) { nextPage = hasNext ? page + 1 : null; }
      var prevPage = parseInt(source.previousPage, 10);
      if (!isFinite(prevPage) || prevPage < 1) { prevPage = hasPrev ? page - 1 : null; }

      state.pagination = {
        page: page,
        perPage: perPage,
        totalCount: totalCount,
        totalPages: totalPages,
        hasNextPage: hasNext,
        hasPreviousPage: hasPrev,
        nextPage: hasNext ? nextPage : null,
        previousPage: hasPrev ? prevPage : null
      };
      this.page._updatePerPageSelect();
    }

    _renderAnnouncements()
    {
      var el = this.page.elements;
      var state = this.page.state;
      if (!el.tableBody || !el.tableBody.length) { return; }
      var list = state.announcements || [];
      var rows = [];
      for (var i = 0; i < list.length; i += 1) {
        var item = list[i];
        var isActive = state.selectedId && state.selectedId === item.id;
        var rowClass = 'announcement-management__row' + (isActive ? ' is-active' : '');
        var updated = formatDateTime(item.updatedAt) || '―';
        var title = item.title ? escapeHtml(item.title) : '<span class="announcement-management__untitled">(無題)</span>';
        var ackCount = typeof item.acknowledgedCount === 'number' ? item.acknowledgedCount : this.page.countAcknowledgedFromLookup(state.ackLookup[item.id]);
        var actionsHtml = this._renderAnnouncementActions(item);
        var totalRecipients = this._countAudienceUsers(item);
        var ackDisplay = this._formatAcknowledgementSummary(ackCount, totalRecipients);
        rows.push(
          '<tr class="' + rowClass + '" data-announcement-id="' + escapeAttr(item.id) + '">' +
            '  <th scope="row"><span class="announcement-management__link" data-action="select" role="button" tabindex="0">' + title + '</span></th>' +
            '  <td>' + escapeHtml(updated) + '</td>' +
            '  <td class="announcement-management__ack-count">' + ackDisplay + '</td>' +
            '  <td class="announcement-management__actions">' + actionsHtml + '</td>' +
            '</tr>'
        );
      }
      el.tableBody.html(rows.join(''));
      if (!rows.length) {
        if (el.tableWrapper && el.tableWrapper.length) {
          el.tableWrapper.attr('hidden', 'hidden');
        }
        if (el.empty && el.empty.length) {
          el.empty.text(this.page.textConfig.listEmpty || 'お知らせは登録されていません。').removeClass('hidden');
        }
      } else {
        if (el.tableWrapper && el.tableWrapper.length) {
          el.tableWrapper.removeAttr('hidden');
        }
        if (el.empty && el.empty.length) {
          el.empty.addClass('hidden').text('');
        }
      }
      this._renderStatus();
      this._renderPagination();
    }

    _renderAnnouncementActions(item)
    {
      var title = item && item.title ? item.title : '';
      var actions = [];
      actions.push(this._renderActionButton('detail', item, {
        action: 'view-detail',
        label: '',
        srLabel: title ? title + 'の詳細を表示' : 'お知らせの詳細を表示',
        srLabelClass: 'visually-hidden',
        ariaLabel: title ? title + 'の詳細を表示' : 'お知らせの詳細を表示',
        hoverLabel: title ? title + 'の詳細を表示' : 'お知らせの詳細を表示',
        title: title ? title + 'の詳細を表示' : 'お知らせの詳細を表示'
      }));
      actions.push(this._renderActionButton('edit', item, {
        action: 'edit',
        label: '',
        srLabel: title ? title + 'を編集' : 'お知らせを編集',
        srLabelClass: 'visually-hidden',
        ariaLabel: title ? title + 'を編集' : 'お知らせを編集',
        hoverLabel: title ? title + 'を編集' : 'お知らせを編集',
        title: title ? title + 'を編集' : 'お知らせを編集'
      }));
      actions.push(this._renderActionButton('delete', item, {
        action: 'delete',
        label: '',
        srLabel: title ? title + 'を削除' : 'お知らせを削除',
        srLabelClass: 'visually-hidden',
        ariaLabel: title ? title + 'を削除' : 'お知らせを削除',
        hoverLabel: title ? title + 'を削除' : 'お知らせを削除',
        title: title ? title + 'を削除' : 'お知らせを削除'
      }));
      return actions.join('');
    }

    _renderActionButton(buttonType, item, config)
    {
      var options = this._buildActionButtonOptions(item, config);
      var svc = this.page && this.page.buttonService;
      if (svc && typeof svc.createActionButton === 'function') {
        try {
          var node = svc.createActionButton(buttonType, options);
          if (node) {
            return this._nodeToHtml(node);
          }
        } catch (error) {
          if (typeof console !== 'undefined' && console && typeof console.warn === 'function') {
            console.warn('[AdminAnnouncements] failed to render action button', error);
          }
        }
      }
      return this._fallbackActionButton(buttonType, options);
    }

    _buildActionButtonOptions(item, config)
    {
      var cfg = config || {};
      var id = item && item.id ? String(item.id) : '';
      var dataset = Object.assign({}, cfg.dataset);
      var attributes = Object.assign({}, cfg.attributes);
      var action = cfg.action ? String(cfg.action) : '';
      if (action) {
        dataset.action = action;
        attributes['data-action'] = action;
      }
      if (id) {
        dataset.announcementId = id;
        attributes['data-announcement-id'] = id;
      }
      var label = cfg.label || '';
      var hoverLabel = cfg.hoverLabel || label;
      var title = cfg.title || hoverLabel || label;
      var ariaLabel = cfg.ariaLabel || hoverLabel || label;
      return Object.assign({
        label: label,
        srLabel: cfg.srLabel || label,
        srLabelClass: cfg.srLabelClass || '',
        ariaLabel: ariaLabel,
        hoverLabel: hoverLabel,
        title: title,
        dataset: dataset,
        attributes: attributes
      }, cfg);
    }

    _fallbackActionButton(buttonType, options)
    {
      var variant = buttonType ? ' table-action-button--' + escapeAttr(buttonType) : '';
      var attrs = ['type="button"', 'class="table-action-button' + variant + '"'];
      var dataset = options && options.dataset ? options.dataset : {};
      if (dataset.action) {
        attrs.push('data-action="' + escapeAttr(dataset.action) + '"');
      }
      if (dataset.announcementId) {
        attrs.push('data-announcement-id="' + escapeAttr(dataset.announcementId) + '"');
      }
      if (options && options.ariaLabel) {
        attrs.push('aria-label="' + escapeAttr(options.ariaLabel) + '"');
      }
      if (options && options.title) {
        attrs.push('title="' + escapeAttr(options.title) + '"');
      }
      if (options && options.hoverLabel) {
        attrs.push('data-hover-label="' + escapeAttr(options.hoverLabel) + '"');
      }
      var label = options && options.label ? escapeHtml(options.label) : '';
      var srLabel = options && options.srLabel ? escapeHtml(options.srLabel) : '';
      if (srLabel) {
        label += '<span class="' + escapeAttr(options.srLabelClass || 'visually-hidden') + '">' + srLabel + '</span>';
      }
      return '<button ' + attrs.join(' ') + '>' + label + '</button>';
    }

    _nodeToHtml(node)
    {
      if (!node) { return ''; }
      if (typeof node.outerHTML === 'string') { return node.outerHTML; }
      var wrapper = document.createElement('div');
      wrapper.appendChild(node);
      return wrapper.innerHTML;
    }

    _renderStatus()
    {
      var el = this.page.elements.status;
      if (!el || !el.length) { return; }
      var TEXT = this.page.textConfig;
      var pagination = this.page.state.pagination || {};
      var totalCount = parseInt(pagination.totalCount, 10);
      if (!isFinite(totalCount)) { totalCount = 0; }
      if (!totalCount) {
        el.text(TEXT.paginationStatusSingle.replace('{count}', '0'));
        return;
      }
      var totalPages = parseInt(pagination.totalPages, 10);
      if (!isFinite(totalPages) || totalPages < 1) { totalPages = 1; }
      var page = parseInt(pagination.page, 10);
      if (!isFinite(page) || page < 1) { page = 1; }
      var template = TEXT.paginationStatus || '{page}/{total}ページ（全{count}件）';
      var text = template
        .replace('{page}', page)
        .replace('{total}', totalPages)
        .replace('{count}', totalCount);
      el.text(text);
    }

    _renderPagination()
    {
      var el = this.page.elements.pager;
      if (!el || !el.length) { return; }
      var pagination = this.page.state.pagination || {};
      var totalPages = parseInt(pagination.totalPages, 10);
      if (!isFinite(totalPages) || totalPages < 2) {
        el.empty().attr('hidden', 'hidden');
        return;
      }
      var page = parseInt(pagination.page, 10);
      if (!isFinite(page) || page < 1) { page = 1; }
      var parts = [];
      parts.push(this._renderPagerButton('prev', pagination.previousPage, pagination.hasPreviousPage));
      for (var i = 1; i <= totalPages; i += 1) {
        parts.push(this._renderPagerButton('page', i, true, i === page));
      }
      parts.push(this._renderPagerButton('next', pagination.nextPage, pagination.hasNextPage));
      el.html(parts.join(''));
      el.removeAttr('hidden');
    }

    _renderPagerButton(type, page, enabled, active)
    {
      var label = type === 'prev' ? '前へ' : type === 'next' ? '次へ' : String(page);
      var classes = ['btn', 'btn--ghost'];
      if (!enabled) { classes.push('is-disabled'); }
      if (active) { classes.push('is-active'); }
      var attrs = ['type="button"', 'class="' + classes.join(' ') + '"'];
      if (enabled && page) {
        attrs.push('data-page="' + escapeAttr(page) + '"');
      }
      return '<button ' + attrs.join(' ') + '>' + escapeHtml(label) + '</button>';
    }

    _renderDetail(announcement)
    {
      var el = this.page.elements;
      var detailSection = el.detailSection;
      if (!announcement) {
        if (detailSection && detailSection.length) {
          detailSection.attr('hidden', 'hidden');
        }
        if (el.detailTitle && el.detailTitle.length) {
          el.detailTitle.text('');
        }
        if (el.detailMeta && el.detailMeta.length) {
          el.detailMeta.text('');
        }
        if (el.detailContent && el.detailContent.length) {
          el.detailContent.html('');
        }
        if (el.recipientsSection && el.recipientsSection.length) {
          el.recipientsSection.attr('hidden', 'hidden');
        }
        return;
      }
      if (detailSection && detailSection.length) {
        detailSection.removeAttr('hidden');
      }
      if (el.detailTitle && el.detailTitle.length) {
        el.detailTitle.text(announcement.title || '(無題)');
      }
      if (el.detailMeta && el.detailMeta.length) {
        el.detailMeta.text(this._buildDetailMeta(announcement));
      }
      if (el.detailContent && el.detailContent.length) {
        el.detailContent.html(this._formatContent(announcement.content));
      }
      if (el.recipientsSection && el.recipientsSection.length) {
        el.recipientsSection.removeAttr('hidden');
      }
    }

    _buildDetailMeta(announcement)
    {
      if (!announcement) { return ''; }
      var parts = [];
      if (announcement.createdAt) {
        parts.push((this.page.textConfig.createdAtLabel || '作成日時') + '：' + formatDateTime(announcement.createdAt));
      }
      if (announcement.updatedAt) {
        parts.push((this.page.textConfig.updatedAtLabel || '最終更新') + '：' + formatDateTime(announcement.updatedAt));
      }
      if (announcement.createdBy) {
        parts.push((this.page.textConfig.createdByLabel || '作成者') + '：' + announcement.createdBy);
      }
      return parts.join(' / ');
    }

    _formatContent(content)
    {
      if (!content) { return '<p class="announcement-management__detail-paragraph">(内容がありません)</p>'; }
      var escaped = escapeHtml(content).replace(/\r\n|\r|\n/g, '<br />');
      return '<p class="announcement-management__detail-paragraph">' + escaped + '</p>';
    }

    _countAudienceUsers(announcement)
    {
      var list = Array.isArray(announcement && announcement.audienceUsers) ? announcement.audienceUsers : [];
      return list.length;
    }

    _formatAcknowledgementSummary(count, total)
    {
      var acknowledged = typeof count === 'number' && isFinite(count) ? count : 0;
      var totalCount = typeof total === 'number' && isFinite(total) ? total : 0;
      return acknowledged + ' / ' + totalCount;
    }

    _normalizeAnnouncementsPayload(result)
    {
      var list = Array.isArray(result && result.announcements) ? result.announcements : [];
      var announcements = [];
      var ackLookup = {};
      for (var i = 0; i < list.length; i += 1) {
        var item = list[i] || {};
        var id = item.id ? String(item.id) : '';
        if (!id) { continue; }
        var normalized = {
          id: id,
          title: item.title || '',
          content: item.content || '',
          createdAt: item.createdAt || '',
          updatedAt: item.updatedAt || '',
          createdBy: item.createdBy || '',
          acknowledgedCount: typeof item.acknowledgedCount === 'number' ? item.acknowledgedCount : null,
          audienceUsers: Array.isArray(item.audienceUsers) ? item.audienceUsers : []
        };
        announcements.push(normalized);
        ackLookup[id] = this._buildAckLookup(item.acknowledgedUsers);
      }
      return { announcements: announcements, ackLookup: ackLookup };
    }

    _buildAckLookup(users)
    {
      var lookup = {};
      var list = Array.isArray(users) ? users : [];
      for (var i = 0; i < list.length; i += 1) {
        var entry = list[i] || {};
        var code = entry.userCode ? String(entry.userCode).trim() : '';
        var normalized = this._normalizeUserCode(code);
        if (!normalized) { continue; }
        lookup[normalized] = {
          userCode: code,
          acknowledgedAt: entry.acknowledgedAt || ''
        };
      }
      return lookup;
    }

    _normalizeRecipients(list)
    {
      var recipients = [];
      var audienceUsers = [];
      var source = Array.isArray(list) ? list : [];
      for (var i = 0; i < source.length; i += 1) {
        var entry = source[i] || {};
        var userCode = entry.userCode ? String(entry.userCode).trim() : '';
        var normalizedCode = this._normalizeUserCode(userCode);
        var displayName = entry.displayName || entry.name || userCode;
        if (!userCode && !displayName) { continue; }
        var acknowledgedAt = entry.acknowledgedAt || '';
        recipients.push({
          userCode: userCode,
          normalizedUserCode: normalizedCode,
          displayName: displayName,
          role: entry.role || '',
          acknowledgedAt: acknowledgedAt,
          acknowledgedAtDisplay: acknowledgedAt ? formatDateTime(acknowledgedAt) : '',
          acknowledged: !!acknowledgedAt
        });
        audienceUsers.push({
          userCode: userCode,
          displayName: displayName,
          role: entry.role || ''
        });
      }
      return { recipients: recipients, audienceUsers: audienceUsers };
    }

    _normalizeUserCode(userCode)
    {
      if (!userCode) { return ''; }
      return String(userCode).trim().toLowerCase();
    }

    _syncAnnouncementAudienceFromRecipients(id, list)
    {
      var announcement = this.page.findAnnouncement(id);
      if (!announcement) { return; }
      announcement.recipients = list.slice();
      if (!Array.isArray(announcement.audienceUsers) || !announcement.audienceUsers.length) {
        announcement.audienceUsers = list.slice();
      }
    }

    _setRecipientsBusy(on)
    {
      var el = this.page.elements.recipients;
      if (!el || !el.length) { return; }
      el.toggleClass('is-busy', !!on);
    }
  }

  var NS = window.AdminAnnouncement || (window.AdminAnnouncement = {});
  NS.JobList = AdminAnnouncementJobList;
})(window);
