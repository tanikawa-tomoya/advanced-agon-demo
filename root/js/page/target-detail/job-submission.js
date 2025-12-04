(function ()
{
  'use strict';

  var DELETE_ICON_SVG = '\
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">\
      <path fill="currentColor" d="M9 3.5 8 4.5H6v2h12v-2h-2l-1-1h-6zm7 5.5v10.25A1.75 1.75 0 0 1 14.25 21H9.75A1.75 1.75 0 0 1 8 19.25V9h8zm-5.5 2.5v6h-1.5v-6H10.5zm4 0v6H13v-6h1.5z"></path>\
    </svg>\
  ';

  var CALENDAR_ICON_SVG = '\
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">\
      <rect x="4" y="5" width="16" height="15" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="1.6"></rect>\
      <line x1="16" y1="3" x2="16" y2="7" stroke="currentColor" stroke-width="1.6"></line>\
      <line x1="8" y1="3" x2="8" y2="7" stroke="currentColor" stroke-width="1.6"></line>\
      <line x1="4" y1="11" x2="20" y2="11" stroke="currentColor" stroke-width="1.6"></line>\
      <circle cx="8.5" cy="15.5" r="1.25" fill="currentColor"></circle>\
      <circle cx="12" cy="15.5" r="1.25" fill="currentColor"></circle>\
      <circle cx="15.5" cy="15.5" r="1.25" fill="currentColor"></circle>\
    </svg>\
  ';

  var SUBMISSION_ACTION_ICONS = {
    edit: {
      label: '提出を編集',
      icon: '\
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">\
          <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="m4.75 15.5 9.5-9.5a1.5 1.5 0 0 1 2.12 0l2.63 2.63a1.5 1.5 0 0 1 0 2.12l-9.5 9.5-4.5 1.25z"></path>\
          <path fill="currentColor" d="m14.5 6.5 3 3 1.25-1.25a0.5 0.5 0 0 0 0-0.7l-2.3-2.3a0.5 0.5 0 0 0-0.7 0z"></path>\
          <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M3.5 20.5h17"></path>\
        </svg>\
      '
    },
    play: {
      label: '提出を再生',
      icon: '\
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">\
          <circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" stroke-width="1.6"></circle>\
          <path fill="currentColor" d="m10 8.75 6 3.25-6 3.25z"></path>\
        </svg>\
      '
    },
    detail: {
      label: '提出をプレビュー',
      icon: '\
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">\
          <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"\
            d="M2.25 12S5.75 5.25 12 5.25 21.75 12 21.75 12 18.25 18.75 12 18.75 2.25 12 2.25 12z"></path>\
          <circle cx="12" cy="12" r="3.25" fill="none" stroke="currentColor" stroke-width="1.5"></circle>\
          <circle cx="12" cy="12" r="1.5" fill="currentColor"></circle>\
        </svg>\
      '
    },
    download: {
      label: '提出をダウンロード',
      icon: '\
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">\
          <path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M6 13.75 12 19.25l6-5.5"></path>\
          <path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M12 4.75v13.5"></path>\
          <path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M4.75 19.25h14.5"></path>\
        </svg>\
      '
    },
    delete: {
      label: '提出を削除',
      icon: DELETE_ICON_SVG
    }
  };

  function buildInitial(text)
  {
    var source = text == null ? '' : String(text).trim();
    if (!source)
    {
      return '—';
    }
    return source.charAt(0);
  }

  function createActionButton(action, options)
  {
    var settings = options || {};
    var info = SUBMISSION_ACTION_ICONS[action];
    if (!info)
    {
      return document.createElement('span');
    }
    var tagName = settings.element === 'a' ? 'a' : 'button';
    var node = document.createElement(tagName);
    node.className = 'target-detail__submission-action target-detail__submission-action--' + action
      + ' table-action-button table-action-button--' + action;
    var label = settings.ariaLabel || settings.label || info.label;
    node.setAttribute('aria-label', label);
    node.setAttribute('title', label);
    node.setAttribute('data-hover-label', label);
    if (tagName === 'button')
    {
      node.type = 'button';
      if (settings.disabled)
      {
        node.disabled = true;
      }
    }
    if (tagName === 'a' && settings.href)
    {
      node.href = settings.href;
      if (settings.target)
      {
        node.target = settings.target;
      }
      if (settings.rel)
      {
        node.rel = settings.rel;
      }
    }
    var template = document.createElement('template');
    template.innerHTML = info.icon.trim();
    var icon = template.content.firstElementChild;
    if (icon)
    {
      node.appendChild(icon);
    }
    var sr = document.createElement('span');
    sr.className = 'site-header__sr-only';
    sr.textContent = label;
    node.appendChild(sr);
    return node;
  }

  function createCalendarButton(label)
  {
    var button = document.createElement('button');
    var buttonLabel = label || 'カレンダーを開く';
    button.type = 'button';
    button.className = 'target-detail__submission-calendar-button';
    button.setAttribute('aria-label', buttonLabel);
    var template = document.createElement('template');
    template.innerHTML = CALENDAR_ICON_SVG.trim();
    var icon = template.content.firstElementChild;
    if (icon)
    {
      icon.setAttribute('aria-hidden', 'true');
      button.appendChild(icon);
    }
    var sr = document.createElement('span');
    sr.className = 'site-header__sr-only';
    sr.textContent = buttonLabel;
    button.appendChild(sr);
    return button;
  }

  function normalizeAttachmentType(attachment)
  {
    if (!attachment)
    {
      return 'file';
    }

    var raw = '';
    if (attachment && attachment.type)
    {
      raw = String(attachment.type).toLowerCase();
    }
    else if (attachment && attachment.contentType)
    {
      raw = String(attachment.contentType).toLowerCase();
    }
    else if (attachment && attachment.mimeType)
    {
      raw = String(attachment.mimeType).toLowerCase();
    }

    var extension = '';
    if (attachment && (attachment.extension || attachment.ext || attachment.fileExtension))
    {
      extension = String(attachment.extension || attachment.ext || attachment.fileExtension).toLowerCase();
      extension = extension.charAt(0) === '.' ? extension : '.' + extension;
    }

    var candidates = [
      raw,
      attachment && attachment.name ? String(attachment.name).toLowerCase() : '',
      attachment && attachment.fileName ? String(attachment.fileName).toLowerCase() : '',
      attachment && attachment.mimeType ? String(attachment.mimeType).toLowerCase() : '',
      attachment && attachment.label ? String(attachment.label).toLowerCase() : '',
      attachment && attachment.title ? String(attachment.title).toLowerCase() : '',
      attachment && attachment.url ? String(attachment.url).toLowerCase() : '',
      attachment && attachment.downloadUrl ? String(attachment.downloadUrl).toLowerCase() : '',
      attachment && attachment.previewUrl ? String(attachment.previewUrl).toLowerCase() : '',
      extension
    ];

    for (var i = 0; i < candidates.length; i += 1)
    {
      var value = candidates[i];
      if (!value)
      {
        continue;
      }
      if (value.indexOf('video') !== -1 || value.indexOf('movie') !== -1)
      {
        return 'video';
      }
      if (value.indexOf('audio') !== -1 || value.indexOf('sound') !== -1 || value.indexOf('voice') !== -1)
      {
        return 'audio';
      }
      if (value.indexOf('image') !== -1 || value.indexOf('photo') !== -1 || value.indexOf('picture') !== -1 || value.indexOf('img') === 0)
      {
        return 'image';
      }
      if (value.indexOf('pdf') !== -1)
      {
        return 'pdf';
      }
      if (/\.(mp4|mov|m4v|webm)$/i.test(value))
      {
        return 'video';
      }
      if (/\.(mp3|m4a|aac|wav|flac|ogg)$/i.test(value))
      {
        return 'audio';
      }
      if (/\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(value))
      {
        return 'image';
      }
      if (/\.pdf$/i.test(value))
      {
        return 'pdf';
      }
    }

    return 'file';
  }

  function isPdfAttachment(attachment)
  {
    if (!attachment)
    {
      return false;
    }

    return normalizeAttachmentType(attachment) === 'pdf';
  }

  function pickPrimaryAttachment(item)
  {
    if (!item || !Array.isArray(item.attachments))
    {
      return null;
    }
    for (var i = 0; i < item.attachments.length; i += 1)
    {
      if (item.attachments[i])
      {
        return item.attachments[i];
      }
    }
    return null;
  }

  function createPdfThumbnailPlaceholder()
  {
    var host = document.createElement('div');
    host.className = 'target-reference__thumbnail-emboss target-detail__guidance-thumb-emboss-host';

    var emboss = document.createElement('div');
    emboss.className = 'target-detail__guidance-thumb-emboss target-detail__guidance-thumb-emboss--pdf';

    var fold = document.createElement('span');
    fold.className = 'target-detail__guidance-thumb-emboss-corner';
    emboss.appendChild(fold);

    host.appendChild(emboss);
    return host;
  }

  function createAttachmentTypeBadge(type, label)
  {
    if (!label)
    {
      return null;
    }

    var badgeType = type === 'pdf'
      ? 'pdf'
      : type === 'video'
        ? 'video'
        : type === 'audio'
          ? 'audio'
        : type === 'image'
          ? 'image'
          : 'file';

    var badge = document.createElement('span');
    badge.className = 'target-detail__guidance-type-badge target-detail__guidance-type-badge--' + badgeType;
    badge.textContent = label;
    return badge;
  }

  function formatAttachmentTypeLabel(type)
  {
    if (type === 'video')
    {
      return '動画';
    }
    if (type === 'image')
    {
      return '画像';
    }
    if (type === 'audio')
    {
      return '音声';
    }
    if (type === 'pdf')
    {
      return 'PDF';
    }
    return 'ファイル';
  }

  function formatSummaryUser(entry)
  {
    if (!entry)
    {
      return '参加者';
    }
    var parts = [];
    if (entry.userDisplayName)
    {
      parts.push(entry.userDisplayName);
    }
    if (entry.userCode && parts.indexOf(entry.userCode) === -1)
    {
      parts.push(entry.userCode);
    }
    return parts.length ? parts.join(' / ') : '参加者';
  }

  function formatSubmittedAt(entry, helpers)
  {
    if (!entry)
    {
      return '—';
    }
    if (entry.submittedAtDisplay)
    {
      return entry.submittedAtDisplay;
    }
    if (entry.submittedAt && helpers && typeof helpers.formatDateTime === 'function')
    {
      return helpers.formatDateTime(entry.submittedAt);
    }
    return '—';
  }

  class TargetDetailSubmission
  {
    constructor(pageInstance)
    {
      this.page = pageInstance;
      this.helpers = pageInstance.helpers || {};
      this.canManage = false;
      this.canSubmit = false;
      this.state = {
        items: [],
        isLoading: false,
        filters: { user: '', status: 'all', dateFrom: '', dateTo: '' }
      };
      this.refs = {
        container: null,
        list: null,
        feedback: null,
        counter: null,
        refresh: null,
        addButton: null,
        filterUser: null,
        filterDateFrom: null,
        filterDateFromButton: null,
        filterDateTo: null,
        filterDateToButton: null,
        filterStatus: null
      };
      this.defaultStatuses = ['レビュー待ち', '差し戻し対応中', '承認済み', '下書き'];
      this.modals = { add: null };
      this.contentUploaderService = null;
      this.pendingUploadResults = [];
      this.avatarService = null;
      this.uploadOwnerUserCode = '';
      this.contentLibrary = [];
      this.isLoadingContentLibrary = false;
      this.loadingContentOwner = '';
      this.contentLibraryCache = Object.create(null);
      this.contentLibraryOwner = '';
    }

    async render()
    {
      this.canManage = this.page && typeof this.page.canManageTargetContent === 'function'
        && this.page.canManageTargetContent();
      this.canSubmit = this.canManage;
      if (!this.canSubmit && this.page && typeof this.page.canSubmitTargetContent === 'function')
      {
        this.canSubmit = this.page.canSubmitTargetContent();
      }
      this.refs.container = this.page.refs.tabPanels && this.page.refs.tabPanels.submissions;
      if (!this.refs.container)
      {
        return;
      }
      this.refs.container.innerHTML = '';
      this.refs.container.classList.add('target-detail__panel');

      var section = document.createElement('section');
      section.className = 'target-detail__submissions';

      var header = document.createElement('div');
      header.className = 'target-detail__section-header';
      var title = document.createElement('h2');
      title.textContent = '提出';
      header.appendChild(title);

      var actions = document.createElement('div');
      actions.className = 'target-detail__section-actions target-detail__submission-actions';

      if (this.canSubmit)
      {
        var addLink = this.page.buttonService.createActionButton('expandable-icon-button/add', {
          baseClass: 'target-management__icon-button target-management__icon-button--primary target-detail__submission-add',
          label: '提出を追加',
          ariaLabel: '提出を追加',
          hoverLabel: '提出を追加',
          title: '提出を追加'
        });
        addLink.addEventListener('click', (event) =>
        {
          event.preventDefault();
          this.openAddModal();
        });
        actions.appendChild(addLink);
        this.refs.addButton = addLink;
      }

      var refresh = this.page.buttonService.createActionButton('expandable-icon-button/reload', {
        baseClass: 'target-management__icon-button target-management__icon-button--ghost target-detail__submission-refresh',
        label: '再読み込み',
        ariaLabel: '再読み込み',
        hoverLabel: '提出一覧を再読み込み',
        title: '提出一覧を再読み込み'
      });
      refresh.addEventListener('click', () =>
      {
        this.reloadList(true);
      });
      actions.appendChild(refresh);
      this.refs.refresh = refresh;

      header.appendChild(actions);
      section.appendChild(header);

      section.appendChild(this.renderControls());
      section.appendChild(this.renderGrid());
      this.refs.container.appendChild(section);

      await this.reloadList();
    }

    renderControls()
    {
      var controls = document.createElement('div');
      controls.className = 'target-detail__submission-controls';

      var toolbar = document.createElement('div');
      toolbar.className = 'target-detail__submission-toolbar';

      var counter = document.createElement('p');
      counter.className = 'target-detail__submission-summary';
      counter.textContent = '提出件数: 0件';
      toolbar.appendChild(counter);
      this.refs.counter = counter;
      controls.appendChild(toolbar);

      controls.appendChild(this.renderFilterControls());
      this.bindFilterEvents();
      this.updateStatusFilterOptions();

      return controls;
    }

    renderFilterControls()
    {
      var filters = document.createElement('div');
      filters.className = 'target-detail__submission-filters';

      var userField = document.createElement('div');
      userField.className = 'target-detail__submission-filter';
      var userLabel = document.createElement('span');
      userLabel.className = 'target-detail__submission-filter-label';
      userLabel.textContent = '提出ユーザー';
      userField.appendChild(userLabel);
      var userInput = document.createElement('input');
      userInput.type = 'search';
      userInput.placeholder = '氏名やIDで絞り込み';
      userInput.className = 'user-management__input target-detail__submission-filter-input';
      userInput.setAttribute('aria-label', '提出ユーザーを検索');
      userInput.value = this.state.filters.user;
      userField.appendChild(userInput);
      filters.appendChild(userField);
      this.refs.filterUser = userInput;

      var dateFromField = document.createElement('div');
      dateFromField.className = 'target-detail__submission-filter';
      var dateFromLabel = document.createElement('span');
      dateFromLabel.className = 'target-detail__submission-filter-label';
      dateFromLabel.textContent = '提出日 (開始)';
      dateFromField.appendChild(dateFromLabel);
      var dateFromInput = document.createElement('input');
      dateFromInput.type = 'date';
      dateFromInput.className = 'user-management__input target-detail__submission-filter-input';
      dateFromInput.setAttribute('aria-label', '提出日開始');
      dateFromInput.value = this.state.filters.dateFrom;
      var dateFromControl = document.createElement('div');
      dateFromControl.className = 'target-detail__submission-date-control';
      dateFromControl.appendChild(dateFromInput);
      var dateFromButton = createCalendarButton('提出日 (開始) のカレンダーを開く');
      dateFromControl.appendChild(dateFromButton);
      dateFromField.appendChild(dateFromControl);
      filters.appendChild(dateFromField);
      this.refs.filterDateFrom = dateFromInput;
      this.refs.filterDateFromButton = dateFromButton;

      var dateToField = document.createElement('div');
      dateToField.className = 'target-detail__submission-filter';
      var dateToLabel = document.createElement('span');
      dateToLabel.className = 'target-detail__submission-filter-label';
      dateToLabel.textContent = '提出日 (終了)';
      dateToField.appendChild(dateToLabel);
      var dateToInput = document.createElement('input');
      dateToInput.type = 'date';
      dateToInput.className = 'user-management__input target-detail__submission-filter-input';
      dateToInput.setAttribute('aria-label', '提出日終了');
      dateToInput.value = this.state.filters.dateTo;
      var dateToControl = document.createElement('div');
      dateToControl.className = 'target-detail__submission-date-control';
      dateToControl.appendChild(dateToInput);
      var dateToButton = createCalendarButton('提出日 (終了) のカレンダーを開く');
      dateToControl.appendChild(dateToButton);
      dateToField.appendChild(dateToControl);
      filters.appendChild(dateToField);
      this.refs.filterDateTo = dateToInput;
      this.refs.filterDateToButton = dateToButton;

      var statusField = document.createElement('div');
      statusField.className = 'target-detail__submission-filter';
      var statusLabel = document.createElement('span');
      statusLabel.className = 'target-detail__submission-filter-label';
      statusLabel.textContent = 'ステータス';
      statusField.appendChild(statusLabel);
      var statusSelect = document.createElement('select');
      statusSelect.className = 'user-management__input target-detail__submission-filter-input';
      statusSelect.setAttribute('aria-label', 'ステータスで絞り込み');
      statusField.appendChild(statusSelect);
      filters.appendChild(statusField);
      this.refs.filterStatus = statusSelect;

      return filters;
    }

    bindFilterEvents()
    {
      var self = this;
      if (this.refs.filterUser)
      {
        this.refs.filterUser.addEventListener('input', function ()
        {
          self.state.filters.user = this.value || '';
          self.renderList();
        });
      }
      if (this.refs.filterDateFrom)
      {
        this.refs.filterDateFrom.addEventListener('change', function ()
        {
          self.state.filters.dateFrom = this.value || '';
          self.renderList();
        });
      }
      if (this.refs.filterDateFromButton && this.refs.filterDateFrom)
      {
        this.refs.filterDateFromButton.addEventListener('click', function ()
        {
          var input = self.refs.filterDateFrom;
          if (input && typeof input.showPicker === 'function')
          {
            input.showPicker();
            return;
          }
          if (input)
          {
            input.focus();
            input.click();
          }
        });
      }
      if (this.refs.filterDateTo)
      {
        this.refs.filterDateTo.addEventListener('change', function ()
        {
          self.state.filters.dateTo = this.value || '';
          self.renderList();
        });
      }
      if (this.refs.filterDateToButton && this.refs.filterDateTo)
      {
        this.refs.filterDateToButton.addEventListener('click', function ()
        {
          var input = self.refs.filterDateTo;
          if (input && typeof input.showPicker === 'function')
          {
            input.showPicker();
            return;
          }
          if (input)
          {
            input.focus();
            input.click();
          }
        });
      }
      if (this.refs.filterStatus)
      {
        this.refs.filterStatus.addEventListener('change', function ()
        {
          self.state.filters.status = this.value || 'all';
          self.renderList();
        });
      }
    }

    updateStatusFilterOptions()
    {
      if (!this.refs.filterStatus)
      {
        return;
      }
      var options = ['all'];
      var statuses = this.defaultStatuses.slice();
      this.state.items.forEach(function (item)
      {
        var label = item && (item.statusLabel || item.status);
        if (!label)
        {
          return;
        }
        if (statuses.indexOf(label) === -1)
        {
          statuses.push(label);
        }
      });
      options = options.concat(statuses);

      var current = this.state.filters.status;
      if (options.indexOf(current) === -1)
      {
        current = 'all';
        this.state.filters.status = 'all';
      }

      this.refs.filterStatus.innerHTML = '';
      options.forEach((value) =>
      {
        var option = document.createElement('option');
        option.value = value;
        option.textContent = value === 'all' ? 'すべて' : value;
        if (value === current)
        {
          option.selected = true;
        }
        this.refs.filterStatus.appendChild(option);
      });
    }

    renderGrid()
    {
      var grid = document.createElement('div');
      grid.className = 'target-detail__submission-grid';

      var listCard = document.createElement('div');
      listCard.className = 'target-detail__card target-detail__submission-card';

      var listHeader = document.createElement('div');
      listHeader.className = 'target-detail__submission-list-header';

      var title = document.createElement('h3');
      title.textContent = '提出一覧';
      listHeader.appendChild(title);

      listCard.appendChild(listHeader);

      var feedback = document.createElement('div');
      feedback.className = 'user-management__feedback target-detail__submission-feedback';
      feedback.setAttribute('role', 'status');
      feedback.setAttribute('aria-live', 'polite');
      feedback.hidden = true;
      listCard.appendChild(feedback);
      this.refs.feedback = feedback;

      var list = document.createElement('div');
      list.className = 'target-detail__submission-list';
      listCard.appendChild(list);
      this.refs.list = list;

      grid.appendChild(listCard);
      return grid;
    }

    async reloadList(forceReload)
    {
      if (this.state.isLoading)
      {
        return;
      }
      this.state.isLoading = true;
      this.setFeedback('提出状況を読み込み中です…', 'info');
      try
      {
        var data = await this.page.loadSubmissions(forceReload ? { force: true } : undefined);
        this.state.items = Array.isArray(data) ? data.slice() : [];
        this.updateStatusFilterOptions();
        this.renderList();
        if (!this.state.items.length)
        {
          this.setFeedback('提出はまだ登録されていません。', 'info');
        }
        else
        {
          this.clearFeedback();
        }
      }
      catch (error)
      {
        console.error('[target-detail] failed to load submissions', error);
        this.setFeedback('提出情報の取得に失敗しました。時間をおいて再度お試しください。', 'error');
      }
      finally
      {
        this.state.isLoading = false;
      }
    }

    setFeedback(message, level)
    {
      var feedback = this.refs.feedback;
      if (!feedback)
      {
        return;
      }
      feedback.classList.remove('is-error', 'is-success');
      if (!message)
      {
        feedback.textContent = '';
        feedback.hidden = true;
        return;
      }
      feedback.hidden = false;
      feedback.textContent = message;
      if (level === 'error')
      {
        feedback.classList.add('is-error');
      }
      if (level === 'success')
      {
        feedback.classList.add('is-success');
      }
    }

    clearFeedback()
    {
      this.setFeedback('', 'info');
    }

    parseDateInput(value, toEndOfDay)
    {
      if (!value)
      {
        return NaN;
      }
      var parsed = Date.parse(value);
      if (isNaN(parsed))
      {
        return NaN;
      }
      if (toEndOfDay)
      {
        var date = new Date(parsed);
        date.setHours(23, 59, 59, 999);
        return date.getTime();
      }
      return parsed;
    }

    getSubmittedAtValue(item)
    {
      if (!item)
      {
        return NaN;
      }
      if (typeof item.submittedAtValue === 'number')
      {
        return item.submittedAtValue;
      }
      var raw = item.submittedAt || item.submittedAtDisplay || '';
      var value = raw ? Date.parse(raw) : NaN;
      if (!isNaN(value))
      {
        item.submittedAtValue = value;
      }
      return value;
    }

    getFilteredItems()
    {
      var filters = this.state.filters;
      var userQuery = (filters.user || '').trim().toLowerCase();
      var status = filters.status || 'all';
      var dateFromValue = this.parseDateInput(filters.dateFrom, false);
      var dateToValue = this.parseDateInput(filters.dateTo, true);

      return this.state.items.filter((item) =>
      {
        if (!item)
        {
          return false;
        }
        if (status !== 'all' && (item.statusLabel || item.status) !== status)
        {
          return false;
        }

        var submittedAtValue = this.getSubmittedAtValue(item);
        if (!isNaN(dateFromValue) && (isNaN(submittedAtValue) || submittedAtValue < dateFromValue))
        {
          return false;
        }
        if (!isNaN(dateToValue) && (isNaN(submittedAtValue) || submittedAtValue > dateToValue))
        {
          return false;
        }

        if (!userQuery)
        {
          return true;
        }

        var haystack = [item.userDisplayName, item.userCode]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.indexOf(userQuery) !== -1;
      });
    }

    updateCounter()
    {
      if (!this.refs.counter)
      {
        return;
      }
      var total = this.state.items.length;
      var visible = this.getFilteredItems().length;
      var label = '提出件数: ' + visible + '件';
      if (visible !== total)
      {
        label += '（全' + total + '件中）';
      }
      this.refs.counter.textContent = label;
    }

    renderList()
    {
      if (!this.refs.list)
      {
        return;
      }
      var items = this.getFilteredItems();
      this.refs.list.innerHTML = '';
      this.updateCounter();
      if (!items.length)
      {
        var empty = document.createElement('p');
        empty.className = 'target-detail__submission-empty';
        empty.textContent = this.state.items.length
          ? '条件に一致する提出はありません。'
          : '提出はまだ登録されていません。';
        this.refs.list.appendChild(empty);
        return;
      }
      var table = document.createElement('table');
      table.className = 'target-detail__submission-table';

      var thead = document.createElement('thead');
      thead.innerHTML = '' +
        '<tr>' +
        '<th scope="col">サムネイル</th>' +
        '<th scope="col">提出者</th>' +
        '<th scope="col">提出日時</th>' +
        '<th scope="col">内容</th>' +
        '<th scope="col">コメント</th>' +
        '<th scope="col" class="target-detail__submission-actions-header">操作</th>' +
        '</tr>';
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      items.forEach((item) =>
      {
        var row = document.createElement('tr');

        row.appendChild(this.createThumbnailCell(item));

        var userCell = document.createElement('td');
        userCell.className = 'target-detail__submission-user-cell';
        userCell.title = formatSummaryUser(item);
        userCell.appendChild(this.createUserDisplay(item));
        row.appendChild(userCell);

        var dateCell = document.createElement('td');
        dateCell.textContent = formatSubmittedAt(item, this.helpers);
        row.appendChild(dateCell);

        var contentCell = document.createElement('td');
        contentCell.className = 'target-detail__submission-content';
        contentCell.textContent = item && item.content ? item.content : '—';
        row.appendChild(contentCell);

        var commentCell = document.createElement('td');
        commentCell.className = 'target-detail__submission-comment';
        commentCell.textContent = item && item.comment ? item.comment : '—';
        row.appendChild(commentCell);

        row.appendChild(this.createActionCell(item));
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      this.refs.list.appendChild(table);
      this.bindSubmitterPopovers(table);
    }

    createThumbnailCell(item)
    {
      var cell = document.createElement('td');
      cell.className = 'target-detail__submission-thumbnail-cell';

      var wrapper = document.createElement('div');
      wrapper.className = 'target-detail__submission-thumbnail';

      var attachment = pickPrimaryAttachment(item);
      var type = normalizeAttachmentType(attachment);
      var typeLabel = attachment ? formatAttachmentTypeLabel(type) : '';
      var badge = createAttachmentTypeBadge(type, typeLabel);
      var isPdfThumbnail = isPdfAttachment(attachment);
      var thumbnailUrl = isPdfThumbnail ? '' : this.resolveSubmissionThumbnail(item, attachment);

      if (thumbnailUrl)
      {
        var image = document.createElement('img');
        image.className = 'target-detail__submission-thumbnail-image';
        image.src = thumbnailUrl;
        image.loading = 'lazy';
        image.alt = item && item.content ? item.content : '提出サムネイル';
        wrapper.appendChild(image);
      }
      else if (isPdfThumbnail)
      {
        var pdfPlaceholder = createPdfThumbnailPlaceholder();
        if (pdfPlaceholder)
        {
          wrapper.appendChild(pdfPlaceholder);
        }
      }
      else
      {
        var placeholder = document.createElement('span');
        placeholder.className = 'target-detail__submission-thumbnail-placeholder';
        placeholder.textContent = attachment ? typeLabel : 'なし';
        wrapper.appendChild(placeholder);
      }

      if (badge)
      {
        wrapper.appendChild(badge);
      }

      cell.appendChild(wrapper);
      return cell;
    }

    resolveSubmissionThumbnail(item, attachment)
    {
      var primaryAttachment = attachment || pickPrimaryAttachment(item);
      if (!primaryAttachment)
      {
        return '';
      }

      if (primaryAttachment.contentCode)
      {
        var apiThumbnail = this.buildContentImageUrl({ contentCode: primaryAttachment.contentCode }, { variant: 'thumbnail' });
        if (apiThumbnail)
        {
          return apiThumbnail;
        }
      }

      var previewCandidates = [];
      if (primaryAttachment.previewImage)
      {
        previewCandidates.push(primaryAttachment.previewImage);
      }
      if (primaryAttachment.previewImageUrl)
      {
        previewCandidates.push(primaryAttachment.previewImageUrl);
      }
      if (primaryAttachment.posterUrl)
      {
        previewCandidates.push(primaryAttachment.posterUrl);
      }
      if (primaryAttachment.content)
      {
        previewCandidates.push(primaryAttachment.content.previewImage);
        previewCandidates.push(primaryAttachment.content.previewImageUrl);
        previewCandidates.push(primaryAttachment.content.thumbnail);
        previewCandidates.push(primaryAttachment.content.imageUrl);
      }

      var previewSource = this.resolveAttachmentPreviewUrl(primaryAttachment);
      var type = normalizeAttachmentType(primaryAttachment);
      if (type === 'image')
      {
        previewCandidates.push(previewSource);
      }
      previewCandidates.push(previewSource);

      for (var i = 0; i < previewCandidates.length; i += 1)
      {
        var candidate = previewCandidates[i];
        if (candidate)
        {
          var resolved = String(candidate).trim();
          if (resolved)
          {
            return resolved;
          }
        }
      }

      return '';
    }

    resolveAttachmentPreviewUrl(attachment)
    {
      if (!attachment)
      {
        return '';
      }

      var url = attachment.previewUrl || attachment.youtubeUrl || attachment.embedUrl || attachment.url || attachment.downloadUrl || '';
      if (url)
      {
        return url;
      }

      var record = attachment.content ? attachment.content : {};
      var contentCode = attachment.contentCode || (record && record.contentCode);
      if (!contentCode)
      {
        return '';
      }

      var contentRecord = Object.assign({}, record, { contentCode: contentCode });
      var type = normalizeAttachmentType(attachment);
      if (type === 'image')
      {
        var imageUrl = this.buildContentImageUrl(contentRecord);
        if (imageUrl)
        {
          return imageUrl;
        }
      }

      return this.buildContentFileUrl(contentRecord);
    }

    resolveAttachmentDownloadUrl(attachment)
    {
      if (!attachment)
      {
        return '';
      }

      var url = attachment.downloadUrl || attachment.url || attachment.previewUrl || '';
      if (url)
      {
        return url;
      }

      var record = attachment.content ? attachment.content : {};
      var contentCode = attachment.contentCode || (record && record.contentCode);
      if (!contentCode)
      {
        return '';
      }

      var contentRecord = Object.assign({}, record, { contentCode: contentCode });
      return this.buildContentFileUrl(contentRecord);
    }

    buildContentImageUrl(record, options)
    {
      if (!record || !record.contentCode)
      {
        return '';
      }

      var variant = options && options.variant;
      var apiConfig = this.page && this.page.config ? this.page.config : {};
      var requestType = 'Contents';
      var endpoint = apiConfig.apiEndpoint || '';
      var token = apiConfig.apiToken || '';

      if (window.Utils && typeof window.Utils.buildApiRequestOptions === 'function')
      {
        try
        {
          var defaults = window.Utils.buildApiRequestOptions(requestType, 'ContentImageGet', {});
          if (!endpoint && defaults && typeof defaults.url === 'string')
          {
            endpoint = defaults.url;
          }
          if (!token && defaults && defaults.data && typeof defaults.data.get === 'function')
          {
            token = defaults.data.get('token') || token;
          }
        }
        catch (_err)
        {
          // ignore fallback errors
        }
      }

      if (!endpoint)
      {
        endpoint = window.Utils && typeof window.Utils.getApiEndpoint === 'function' ? window.Utils.getApiEndpoint() : '';
      }

      if (!endpoint)
      {
        return '';
      }

      var queryParams = [
        ['requestType', requestType],
        ['type', 'ContentImageGet'],
        ['token', token],
        ['contentCode', record.contentCode]
      ];

      if (variant === 'thumbnail')
      {
        queryParams.push(['variant', 'thumbnail']);
      }

      var query = queryParams
        .filter(function (entry)
        {
          return entry[1] !== undefined && entry[1] !== null;
        })
        .map(function (entry)
        {
          return encodeURIComponent(entry[0]) + '=' + encodeURIComponent(entry[1]);
        })
        .join('&');

      return endpoint + '?' + query;
    }

    buildContentFileUrl(record)
    {
      if (!record || !record.contentCode)
      {
        return '';
      }

      var apiConfig = this.page && this.page.config ? this.page.config : {};
      var requestType = 'Contents';
      var endpoint = apiConfig.apiEndpoint || '';
      var token = apiConfig.apiToken || '';

      if (window.Utils && typeof window.Utils.buildApiRequestOptions === 'function')
      {
        try
        {
          var defaults = window.Utils.buildApiRequestOptions(requestType, 'ContentFileGet', {});
          if (!endpoint && defaults && typeof defaults.url === 'string')
          {
            endpoint = defaults.url;
          }
          if (!token && defaults && defaults.data && typeof defaults.data.get === 'function')
          {
            token = defaults.data.get('token') || token;
          }
        }
        catch (_err)
        {
          // ignore fallback errors
        }
      }

      if (!endpoint)
      {
        endpoint = window.Utils && typeof window.Utils.getApiEndpoint === 'function' ? window.Utils.getApiEndpoint() : '';
      }

      if (!endpoint)
      {
        return '';
      }

      var queryParams = [
        ['requestType', requestType],
        ['type', 'ContentFileGet'],
        ['token', token],
        ['contentCode', record.contentCode]
      ];

      var query = queryParams
        .filter(function (entry)
        {
          return entry[1] !== undefined && entry[1] !== null;
        })
        .map(function (entry)
        {
          return encodeURIComponent(entry[0]) + '=' + encodeURIComponent(entry[1]);
        })
        .join('&');

      return endpoint + '?' + query;
    }

    createUserDisplay(item)
    {
      var anchor = document.createElement('span');
      anchor.className = 'target-detail__submission-user-display';
      anchor.setAttribute('role', 'button');
      anchor.tabIndex = 0;
      anchor.setAttribute('data-submission-avatar-anchor', 'true');

      var displayName = item && item.userDisplayName ? String(item.userDisplayName).trim() : '';
      var userCode = item && item.userCode ? String(item.userCode).trim() : '';
      var label = displayName || userCode || '参加者';

      anchor.dataset.userDisplay = label;
      anchor.dataset.userName = displayName;
      anchor.dataset.userCode = userCode;
      anchor.dataset.userTooltip = formatSummaryUser(item);
      anchor.dataset.userRole = '提出者';
      anchor.dataset.userActive = item && item.isActive === false ? 'false' : 'true';

      var avatar = document.createElement('span');
      avatar.className = 'target-detail__submission-user-avatar';
      avatar.setAttribute('data--creator-avatar', 'true');
      avatar.dataset.avatarName = label;
      avatar.dataset.avatarAlt = label;
      if (item && item.userAvatarUrl)
      {
        avatar.dataset.avatarSrc = item.userAvatarUrl;
      }
      if (item && item.userAvatarTransform)
      {
        avatar.dataset.avatarTransform = item.userAvatarTransform;
      }

      var avatarRendered = false;
      var avatarService = this.getAvatarService();
      if (avatarService && typeof avatarService.render === 'function')
      {
        try
        {
          var data = { name: label, alt: label, isActive: item && item.isActive !== false };
          if (avatar.dataset.avatarSrc)
          {
            data.src = avatar.dataset.avatarSrc;
          }
          var node = avatarService.render(avatar, data, {
            size: 40,
            shape: 'circle',
            nameOverlay: true,
            initialsFallback: true
          });
          avatarRendered = true;
          if (node && avatar.dataset.avatarTransform)
          {
            var img = node.querySelector('img');
            if (img)
            {
              img.style.transform = avatar.dataset.avatarTransform;
            }
          }
        }
        catch (error)
        {
          avatarRendered = false;
          if (window.console && typeof window.console.warn === 'function')
          {
            window.console.warn('[target-detail][submission] failed to render submitter avatar', error);
          }
        }
      }
      if (!avatarRendered)
      {
        avatar.textContent = buildInitial(label);
      }
      anchor.appendChild(avatar);

      if (item && item.statusLabel)
      {
        var info = document.createElement('div');
        info.className = 'target-detail__submission-user-info';

        var badge = document.createElement('span');
        badge.className = 'target-detail__badge is-status';
        badge.textContent = item.statusLabel;
        info.appendChild(badge);

        anchor.appendChild(info);
      }
      return anchor;
    }

    createAttachmentBadges(list)
    {
      var container = document.createElement('div');
      container.className = 'target-detail__submission-attachments';
      if (!list.length)
      {
        var empty = document.createElement('span');
        empty.className = 'target-detail__submission-attachment is-empty';
        empty.textContent = '—';
        container.appendChild(empty);
        return container;
      }
      list.forEach((attachment) =>
      {
        var badge = document.createElement('span');
        var type = normalizeAttachmentType(attachment);
        badge.className = 'target-detail__submission-attachment target-detail__submission-attachment--' + type;
        var label = attachment && (attachment.label || attachment.name || attachment.fileName || '添付ファイル');
        var size = attachment && attachment.sizeDisplay ? '（' + attachment.sizeDisplay + '）' : '';
        badge.textContent = label + size;
        container.appendChild(badge);
      });
      return container;
    }

    createActionCell(item)
    {
      var cell = document.createElement('td');
      cell.className = 'target-detail__submission-actions-cell';
      var actionsContainer = document.createElement('div');
      actionsContainer.className = 'target-detail__submission-actions';

      var attachment = pickPrimaryAttachment(item);
      var hasAttachment = !!attachment;
      var previewButton = createActionButton('detail', { element: 'button', ariaLabel: '提出をプレビュー', disabled: !hasAttachment });
      previewButton.addEventListener('click', (event) =>
      {
        event.preventDefault();
        this.handlePlayback(item, attachment);
      });
      actionsContainer.appendChild(previewButton);

      var downloadUrl = this.resolveAttachmentDownloadUrl(attachment);
      var downloadButton = createActionButton('download', {
        element: 'a',
        href: downloadUrl || '#',
        target: downloadUrl ? '_blank' : undefined,
        rel: downloadUrl ? 'noopener' : undefined,
        ariaLabel: '提出をダウンロード',
        disabled: !downloadUrl
      });
      if (!downloadUrl)
      {
        downloadButton.setAttribute('aria-disabled', 'true');
        downloadButton.addEventListener('click', function (event)
        {
          event.preventDefault();
        });
      }
      actionsContainer.appendChild(downloadButton);

      if (this.canManage)
      {
        var editButton = createActionButton('edit', { element: 'button', ariaLabel: '提出を編集' });
        editButton.addEventListener('click', (event) =>
        {
          event.preventDefault();
          this.openAddModal(item);
        });
        actionsContainer.appendChild(editButton);

        var deleteButton = createActionButton('delete', { element: 'button', ariaLabel: '提出を削除' });
        deleteButton.addEventListener('click', (event) =>
        {
          event.preventDefault();
          this.deleteSubmission(item, deleteButton);
        });
        actionsContainer.appendChild(deleteButton);
      }

      cell.appendChild(actionsContainer);
      return cell;
    }

    bindSubmitterPopovers(container)
    {
      var avatarService = this.getAvatarService();
      if (!avatarService || typeof avatarService.eventUpdate !== 'function')
      {
        return;
      }
      var anchors = container.querySelectorAll('[data-submission-avatar-anchor]');
      if (!anchors.length)
      {
        return;
      }
      avatarService.eventUpdate(anchors, {
        beforeShow: function (anchor)
        {
          if (anchor && anchor.classList)
          {
            anchor.classList.add('is-popover-open');
          }
        },
        beforeHide: function (anchor)
        {
          if (anchor && anchor.classList)
          {
            anchor.classList.remove('is-popover-open');
          }
        },
        popover: { placement: 'top-start', offset: 12 }
      });
    }

    getAvatarService()
    {
      if (this.avatarService)
      {
        return this.avatarService;
      }
      if (this.page && this.page.avatarService)
      {
        this.avatarService = this.page.avatarService;
        return this.avatarService;
      }
      return null;
    }

    handlePlayback(item, attachment)
    {
      if (!attachment)
      {
        this.showPlaybackError();
        return;
      }
      var type = normalizeAttachmentType(attachment);
      if (type === 'video')
      {
        this.openVideoAttachment(attachment);
        return;
      }
      if (type === 'image')
      {
        this.openImageAttachment(attachment);
        return;
      }
      if (type === 'pdf')
      {
        this.openPdfAttachment(attachment);
        return;
      }
      this.showFilePlaybackError();
    }

    openVideoAttachment(attachment)
    {
      var service = this.page && this.page.videoModalService;
      if (!service)
      {
        throw new Error('[target-detail] video modal service is not available');
      }
      if (attachment.youtubeUrl)
      {
        var youtubeUrl = this.resolveAttachmentPreviewUrl(attachment);
        if (!youtubeUrl)
        {
          this.showPlaybackError();
          return;
        }
        service.openYouTube(youtubeUrl, { autoplay: false, title: attachment.label || attachment.name || '' });
        return;
      }
      if (attachment.contentCode)
      {
        try
        {
          var spec = { contentCode: attachment.contentCode, title: attachment.label || attachment.name || '' };
          if (attachment.content)
          {
            spec.contentRecord = attachment.content;
          }
          service.openContentVideo(spec, { autoplay: false });
          return;
        }
        catch (_error)
        {
          // fallback to url resolution below
        }
      }
      var url = this.resolveAttachmentPreviewUrl(attachment);
      if (!url)
      {
        this.showPlaybackError();
        return;
      }
      service.openHtml5(url, { autoplay: false, title: attachment.label || attachment.name || '' });
    }

    openImageAttachment(attachment)
    {
      var service = this.page && this.page.imageModalService;
      if (!service)
      {
        throw new Error('[target-detail] image modal service is not available');
      }
      var url = this.resolveAttachmentPreviewUrl(attachment);
      if (!url && attachment && attachment.contentCode)
      {
        url = this.buildContentImageUrl({ contentCode: attachment.contentCode });
      }
      if (!url)
      {
        this.showPlaybackError();
        return;
      }
      service.show(url, { alt: attachment.label || attachment.name || '', caption: attachment.label || attachment.name || '' });
    }

    async openPdfAttachment(attachment)
    {
      var service = this.page && this.page.pdfModalService;
      if (!service)
      {
        throw new Error('[target-detail] pdf modal service is not available');
      }

      var url = this.resolveAttachmentPreviewUrl(attachment) || this.resolveAttachmentDownloadUrl(attachment);
      if (!url && attachment && attachment.contentCode)
      {
        url = this.buildContentFileUrl({ contentCode: attachment.contentCode });
      }

      if (!url)
      {
        this.showPlaybackError();
        return;
      }

      var title = attachment && (attachment.label || attachment.name || attachment.fileName)
        ? (attachment.label || attachment.name || attachment.fileName)
        : 'PDF';

      try
      {
        await service.show({
          title: title,
          src: url,
          ariaLabel: title,
          showDownload: true,
          showOpenInNewTab: true
        });
      }
      catch (_error)
      {
        this.showPlaybackError();
      }
    }

    showPlaybackError()
    {
      if (this.page && typeof this.page.showToast === 'function')
      {
        this.page.showToast('error', '再生できる提出コンテンツが見つかりませんでした。');
      }
    }

    showFilePlaybackError()
    {
      if (this.page && typeof this.page.showToast === 'function')
      {
        this.page.showToast('error', 'この提出は再生できません。ダウンロードして確認してください。');
      }
    }

    async deleteSubmission(item, button)
    {
      if (!item || !item.submissionCode || !this.page.state || !this.page.state.targetCode)
      {
        return;
      }
      var confirmed = await this.page.confirmDialogService.open('この提出を削除しますか？登録したコンテンツも削除されます。', { type: 'warning' });
      if (!confirmed)
      {
        return;
      }
      if (button)
      {
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
      }
      this.setFeedback('提出を削除しています…', 'info');
      try
      {
        await this.page.callApi('TargetSubmissionDelete', {
          targetCode: this.page.state.targetCode,
          submissionCode: item.submissionCode
        }, {
          requestType: 'TargetManagementSubmissions'
        });
        this.page.state.submissions = null;
        await this.reloadList(true);
        this.setFeedback('提出を削除しました。', 'success');
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('success', '提出を削除しました。');
        }
      }
      catch (error)
      {
        window.console.error('[target-detail] failed to delete submission', error);
        this.setFeedback('提出の削除に失敗しました。', 'error');
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('error', '提出の削除に失敗しました。');
        }
      }
      finally
      {
        if (button)
        {
          button.disabled = false;
          button.removeAttribute('aria-disabled');
        }
      }
    }

    getUserSelectModalService()
    {
      if (this.page && this.page.userSelectModalService)
      {
        return this.page.userSelectModalService;
      }
      return null;
    }

    getContentsSelectModalService()
    {
      if (this.page && this.page.contentsSelectModalService)
      {
        return this.page.contentsSelectModalService;
      }
      return null;
    }

    getSubmitterCandidates()
    {
      var target = this.page && this.page.state ? this.page.state.target : null;
      var participants = target && Array.isArray(target.participants) ? target.participants.slice() : [];
      var assignedUsers = target && Array.isArray(target.assignedUsers) ? target.assignedUsers.slice() : [];
      var candidates = participants.concat(assignedUsers);
      var seen = Object.create(null);
      var normalized = [];
      candidates.forEach(function (entry)
      {
        if (!entry)
        {
          return;
        }
        var userCode = (entry.userCode || entry.code || '').trim();
        if (!userCode)
        {
          return;
        }
        var status = typeof entry.status === 'string' ? entry.status.toLowerCase() : '';
        var isActive = entry.isActive !== false && entry.active !== false && status !== 'inactive';
        if (!isActive)
        {
          return;
        }
        var key = userCode.toLowerCase();
        if (seen[key])
        {
          return;
        }
        seen[key] = true;
        normalized.push({
          userCode: userCode,
          displayName: (entry.displayName || entry.userDisplayName || entry.name || entry.fullName || userCode).trim(),
          avatarUrl: entry.avatarUrl || entry.avatar || entry.photoUrl || '',
          avatarTransform: entry.avatarTransform || entry.transform || '',
          avatarInitial: entry.avatarInitial || entry.initial || '',
          isActive: true
        });
      });
      return normalized;
    }

    normalizeSubmitter(selection)
    {
      if (!selection)
      {
        return null;
      }
      var userCode = selection.userCode || selection.code || '';
      var userId = selection.userId || selection.id || selection.userID || selection.user_id || '';
      var displayName = selection.displayName || selection.userDisplayName || selection.name || selection.userName || selection.fullName || '';
      if (!displayName && userCode)
      {
        displayName = userCode;
      }
      if (!displayName && !userCode)
      {
        return null;
      }
      return { displayName: displayName, userCode: userCode, userId: userId };
    }

    setSubmitterSelection(modal, selection)
    {
      if (!modal)
      {
        return;
      }
      var previous = modal.selectedUser ? modal.selectedUser.userCode : '';
      var normalized = this.normalizeSubmitter(selection);
      modal.selectedUser = normalized;
      var hasSelection = !!normalized;
      if (modal.submitterSummary)
      {
        modal.submitterSummary.hidden = !hasSelection;
      }
      if (modal.submitterEmpty)
      {
        modal.submitterEmpty.hidden = hasSelection;
      }
      if (modal.submitterName)
      {
        modal.submitterName.textContent = normalized ? normalized.displayName : '';
      }
      if (modal.submitterCode)
      {
        modal.submitterCode.textContent = normalized && normalized.userCode ? '(' + normalized.userCode + ')' : '';
      }
      if (modal.submitterClearButton)
      {
        if (hasSelection)
        {
          modal.submitterClearButton.removeAttribute('disabled');
        }
        else
        {
          modal.submitterClearButton.setAttribute('disabled', 'disabled');
        }
      }
      var current = normalized ? normalized.userCode : '';
      if (this.shouldShowSubmitterField() && previous !== current)
      {
        this.resetContentLibraryForSelection(modal);
      }
      this.setFieldErrorState(modal.submitterField, false);
    }

    getRoleFlags()
    {
      var flags = this.page && this.page.state ? this.page.state.roleFlags : null;
      return flags || { isSupervisor: false, isOperator: false };
    }

    isContentManagementEnabled()
    {
      if (this.page && typeof this.page.isContentsManagementEnabled === 'function')
      {
        return this.page.isContentsManagementEnabled();
      }
      return true;
    }

    getDefaultStatusLabel()
    {
      if (Array.isArray(this.defaultStatuses) && this.defaultStatuses.length)
      {
        return this.defaultStatuses[0];
      }
      return 'レビュー待ち';
    }

    normalizeRoleFlag(flag)
    {
      if (flag === undefined || flag === null)
      {
        return false;
      }
      if (typeof flag === 'string')
      {
        var normalized = flag.toLowerCase();
        return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y';
      }
      if (typeof flag === 'number')
      {
        return flag === 1;
      }
      if (typeof flag === 'boolean')
      {
        return flag;
      }
      return false;
    }

    canEditSubmissionStatus()
    {
      var flags = this.getRoleFlags();
      var isSupervisor = this.normalizeRoleFlag(flags && flags.isSupervisor);
      var isOperator = this.normalizeRoleFlag(flags && flags.isOperator);
      return !!(isSupervisor || isOperator);
    }

    getReadOnlyStatusLabel(modal)
    {
      var statusFromItem = modal && modal.currentItem ? (modal.currentItem.statusLabel || modal.currentItem.status) : '';
      if (statusFromItem)
      {
        return statusFromItem;
      }
      return this.getDefaultStatusLabel();
    }

    getSessionUserSelection()
    {
      var profile = this.page && this.page.state ? this.page.state.profile : null;
      var userId = profile && (profile.userId || profile.user_id || profile.id || '');
      var userCode = profile && (profile.userCode || profile.user_code || profile.code || '');
      var displayName = profile && (profile.displayName || profile.name || profile.fullName || '');
      if (!displayName && userCode)
      {
        displayName = userCode;
      }
      if (!displayName && !userCode)
      {
        return null;
      }
      return { displayName: displayName || '', userCode: userCode || '', userId: userId || '' };
    }

    shouldShowSubmitterField()
    {
      var flags = this.getRoleFlags();
      return !!(flags && flags.isSupervisor);
    }

    setElementVisibility(target, isVisible)
    {
      if (!target)
      {
        return;
      }
      if (isVisible)
      {
        target.removeAttribute('hidden');
        target.style.display = '';
      }
      else
      {
        target.setAttribute('hidden', 'hidden');
        target.style.display = 'none';
      }
    }

    applySubmitterSelectionPolicy(modal)
    {
      if (!modal)
      {
        return;
      }
      var isSupervisor = this.shouldShowSubmitterField();
      var selection = modal.selectedUser || null;
      if (!isSupervisor)
      {
        selection = this.getSessionUserSelection() || selection;
      }
      this.setSubmitterSelection(modal, selection);
      this.setElementVisibility(modal.submitterField, isSupervisor);
      this.setElementVisibility(modal.submitterActions, isSupervisor);
      if (modal.submitterSelectButton)
      {
        modal.submitterSelectButton.hidden = !isSupervisor;
        if (isSupervisor)
        {
          modal.submitterSelectButton.removeAttribute('aria-hidden');
        }
        else
        {
          modal.submitterSelectButton.setAttribute('aria-hidden', 'true');
        }
      }
      if (modal.submitterClearButton)
      {
        modal.submitterClearButton.hidden = !isSupervisor;
      }
    }

    applyContentSelectionPolicy(modal)
    {
      if (!modal)
      {
        return;
      }
      var enabled = this.isContentManagementEnabled();
      if (modal.contentLibraryPanel)
      {
        this.setElementVisibility(modal.contentLibraryPanel, enabled);
      }
      if (modal.contentOpenButton)
      {
        if (enabled)
        {
          modal.contentOpenButton.removeAttribute('disabled');
        }
        else
        {
          modal.contentOpenButton.setAttribute('disabled', 'disabled');
        }
      }
      if (modal.contentClearButton)
      {
        modal.contentClearButton.hidden = !enabled;
        if (enabled)
        {
          modal.contentClearButton.removeAttribute('aria-hidden');
        }
        else
        {
          modal.contentClearButton.setAttribute('aria-hidden', 'true');
        }
      }
      if (!enabled)
      {
        this.toggleContentPicker(modal, false);
      }
    }

    applyStatusSelectionPolicy(modal)
    {
      if (!modal || !modal.statusSelect)
      {
        return;
      }
      var canEdit = this.canEditSubmissionStatus();
      var status = canEdit ? (modal.statusSelect.value || this.getDefaultStatusLabel()) : this.getReadOnlyStatusLabel(modal);
      modal.statusSelect.value = status;
      if (!modal.statusField && typeof modal.statusSelect.closest === 'function')
      {
        modal.statusField = modal.statusSelect.closest('.target-reference__form-field');
      }
      this.setElementVisibility(modal.statusField, canEdit);
      if (canEdit)
      {
        modal.statusSelect.removeAttribute('disabled');
      }
      else
      {
        modal.statusSelect.setAttribute('disabled', 'disabled');
        modal.statusSelect.value = this.getDefaultStatusLabel();
      }
      if (canEdit)
      {
        modal.statusSelect.removeAttribute('aria-hidden');
      }
      else
      {
        modal.statusSelect.setAttribute('aria-hidden', 'true');
      }
    }

    resetContentLibraryForSelection(modal)
    {
      this.contentLibrary = [];
      this.contentLibraryOwner = '';
      if (!modal)
      {
        return;
      }
      if (Array.isArray(modal.selectedContents) && modal.selectedContents.length)
      {
        modal.selectedContents = [];
        this.renderSelectedContents(modal);
      }
      if (modal.contentResults)
      {
        modal.contentResults.innerHTML = '';
      }
      this.setContentPickerFeedback(modal, '', null);
      if (this.shouldShowSubmitterField() && !modal.selectedUser)
      {
        this.notifySubmitterSelectionRequired(modal);
      }
    }

    resolveNestedModalZIndex(modal)
    {
      if (!modal || !modal.root)
      {
        return null;
      }
      var base = modal.root.style && modal.root.style.zIndex ? Number(modal.root.style.zIndex) : null;
      if ((typeof base !== 'number' || base !== base) && window.getComputedStyle)
      {
        try
        {
          var cs = window.getComputedStyle(modal.root);
          if (cs && cs.zIndex)
          {
            base = Number(cs.zIndex);
          }
        }
        catch (error)
        {
          base = null;
        }
      }
      if (typeof base !== 'number' || base !== base)
      {
        return null;
      }
      return base + 10;
    }

    openSubmitterSelectModal(modal)
    {
      if (!this.shouldShowSubmitterField())
      {
        return;
      }
      var service = this.getUserSelectModalService();
      if (!service || typeof service.open !== 'function')
      {
        this.setModalFeedback('提出者選択モーダルを利用できません。', 'error');
        return;
      }
      var selected = modal && modal.selectedUser ? modal.selectedUser : null;
      var selectedCodes = selected && selected.userCode ? [selected.userCode] : [];
      var initialKeyword = selected && (selected.userCode || selected.displayName) ? (selected.userCode || selected.displayName) : '';
      var availableUsers = this.getSubmitterCandidates();
      var modalOptions = {
        multiple: false,
        selectedCodes: selectedCodes,
        initialKeyword: initialKeyword,
        availableUsers: availableUsers,
        onSelect: (user) =>
        {
          this.setSubmitterSelection(modal, user);
        },
        onClose: () =>
        {
          if (modal && modal.submitterSelectButton && typeof modal.submitterSelectButton.focus === 'function')
          {
            modal.submitterSelectButton.focus();
          }
        }
      };
      var zIndex = this.resolveNestedModalZIndex(modal);
      if (zIndex !== null)
      {
        modalOptions.zIndex = zIndex;
      }
      try
      {
        service.open(modalOptions);
      }
      catch (error)
      {
        window.console.error('[target-detail] failed to open user select modal', error);
        this.setModalFeedback('提出者選択モーダルを開けませんでした。', 'error');
      }
    }

    async openAddModal(item)
    {
      if (!this.modals.add)
      {
        this.modals.add = this.createAddModal();
      }
      var modal = this.modals.add;
      try
      {
        await this.setupContentUploader(modal);
      }
      catch (error)
      {
        window.console.error('[target-detail] failed to init submission uploader', error);
      }
      modal.root.removeAttribute('hidden');
      modal.root.setAttribute('aria-hidden', 'false');
      modal.root.classList.add('is-open');
      modal.restoreTarget = document.activeElement;
      modal.form.reset();
      modal.mode = item ? 'edit' : 'create';
      modal.currentItem = item || null;
      modal.titleNode.textContent = item ? '提出を編集' : '提出を追加';
      modal.submitButton.textContent = item ? '更新する' : '追加する';
      this.setModalSubmitting(modal, false);
      this.resetUploadState(modal);
      modal.submitterToastShown = false;
      this.setModalFeedback('', null);
      this.clearModalValidationState(modal);
      this.fillFormWithItem(modal, item);
      this.applyStatusSelectionPolicy(modal);
      this.applySubmitterSelectionPolicy(modal);
      this.applyContentSelectionPolicy(modal);
      var focusSubmitter = this.shouldShowSubmitterField();
      if (focusSubmitter && modal.submitterSelectButton && typeof modal.submitterSelectButton.focus === 'function')
      {
        modal.submitterSelectButton.focus();
      }
      this.toggleContentPicker(modal, false);
      this.renderSelectedContents(modal);
      if (this.shouldShowSubmitterField() && !modal.selectedUser)
      {
        this.notifySubmitterSelectionRequired(modal);
      }
    }

    closeAddModal()
    {
      if (!this.modals.add)
      {
        return;
      }
      var modal = this.modals.add;
      modal.root.setAttribute('hidden', 'hidden');
      modal.root.setAttribute('aria-hidden', 'true');
      modal.root.classList.remove('is-open');
      this.setModalSubmitting(modal, false);
      this.resetUploadState(modal);
      this.resetContentSelection(modal);
      if (modal.restoreTarget && typeof modal.restoreTarget.focus === 'function')
      {
        modal.restoreTarget.focus();
      }
    }

    createAddModal()
    {
      var modalRoot = document.createElement('div');
      modalRoot.className = 'screen-modal target-submission__modal-container';
      modalRoot.setAttribute('hidden', 'hidden');
      modalRoot.innerHTML =
        '<div class="screen-modal__overlay" data-modal-close></div>' +
        '<section class="screen-modal__content target-reference__modal" role="dialog" aria-modal="true" aria-labelledby="target-submission-modal-title">' +
        '<button type="button" class="screen-modal__close" aria-label="モーダルを閉じる">×</button>' +
        '<header class="screen-modal__header">' +
        '<h2 class="screen-modal__title" id="target-submission-modal-title">提出を追加</h2>' +
        '<p class="screen-modal__summary">提出内容を登録し、必要に応じてコンテンツをアップロードします。</p>' +
        '</header>' +
        '<form class="screen-modal__body target-reference__form" novalidate>' +
        '<div class="target-reference__form-field">' +
        '<label class="target-reference__form-label" for="target-submission-status">ステータス</label>' +
        '<select id="target-submission-status" class="user-management__input target-reference__select" name="statusLabel">' +
        '<option value="レビュー待ち">レビュー待ち</option>' +
        '<option value="差し戻し対応中">差し戻し対応中</option>' +
        '<option value="承認済み">承認済み</option>' +
        '<option value="下書き">下書き</option>' +
        '</select>' +
        '</div>' +
        '<div class="target-reference__form-field target-reference__form-row--full">' +
        '<span class="target-reference__form-label">提出者</span>' +
        '<div class="target-submission__submitter" data-target-submission-user-picker>' +
        '<p class="target-submission__submitter-empty" data-target-submission-user-empty>提出者が選択されていません。</p>' +
        '<div class="target-submission__submitter-summary" data-target-submission-user-summary hidden>' +
        '<span class="target-submission__submitter-name" data-target-submission-user-name></span>' +
        '<span class="target-submission__submitter-code" data-target-submission-user-code></span>' +
        '</div>' +
        '<div class="target-reference__form-actions">' +
        '<button type="button" class="btn btn--ghost" data-target-submission-user-select>提出者を選択</button>' +
        '<button type="button" class="btn btn--text" data-target-submission-user-clear disabled>選択をクリア</button>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="target-submission__panel-grid">' +
        '<section class="target-submission__panel" aria-labelledby="target-submission-panel-library">' +
        '<div class="target-reference__form-field target-reference__form-row--full">' +
        '<div class="target-submission__content-select-header">' +
        '<p class="target-reference__form-label" id="target-submission-panel-library">登録済みコンテンツから追加</p>' +
        '</div>' +
        '<div class="target-submission__content-select-box">' +
        '<p class="target-reference__upload-note" data-target-submission-content-summary>コンテンツを選択していません。</p>' +
        '<div class="target-reference__form-actions target-submission__content-select-actions">' +
        '<button type="button" class="btn btn--primary" data-target-submission-content-open>コンテンツを選択</button>' +
        '<button type="button" class="btn btn--text" data-target-submission-content-clear disabled>選択をクリア</button>' +
        '</div>' +
        '</div>' +
        '<ul class="target-submission__content-list" data-target-submission-content-list hidden></ul>' +
        '<div class="target-submission__content-picker" data-target-submission-content-picker hidden>' +
        '<label class="target-reference__form-label" for="target-submission-content-search">コンテンツを検索</label>' +
        '<input id="target-submission-content-search" class="user-management__input target-reference__input" type="search" placeholder="タイトルやコンテンツコードで検索" data-target-submission-content-search />' +
        '<p class="target-reference__upload-note" data-target-submission-content-feedback hidden></p>' +
        '<div class="target-submission__content-picker-results" data-target-submission-content-results></div>' +
        '<div class="target-reference__form-actions target-submission__content-picker-actions">' +
        '<button type="button" class="btn btn--ghost" data-target-submission-content-close>閉じる</button>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</section>' +
        '<section class="target-submission__panel" aria-labelledby="target-submission-panel-upload">' +
        '<div class="target-reference__form-field target-reference__form-row--full target-reference__form-upload">' +
        '<p class="target-reference__form-label" id="target-submission-panel-upload">コンテンツをアップロード</p>' +
        '<div class="target-reference__uploader" data-target-submission-uploader></div>' +
        '<p class="target-reference__upload-note" data-target-submission-upload-counter>アップロードは任意です。ファイルを選択するとここに表示されます。</p>' +
        '</div>' +
        '</section>' +
        '</div>' +
        '<div class="target-reference__form-field target-reference__form-row--full">' +
        '<label class="target-reference__form-label" for="target-submission-content">提出内容</label>' +
        '<input id="target-submission-content" class="user-management__input target-reference__input" name="content" required maxlength="512" placeholder="例: オンボーディング動画 初稿" />' +
        '</div>' +
        '<div class="target-reference__form-field target-reference__form-row--full">' +
        '<label class="target-reference__form-label" for="target-submission-comment">コメント (任意)</label>' +
        '<textarea id="target-submission-comment" class="user-management__input target-reference__textarea" name="comment" rows="3" maxlength="1024" placeholder="補足事項やレビュー依頼内容を入力"></textarea>' +
        '</div>' +
        '<p class="target-reference__form-feedback" aria-live="polite" hidden></p>' +
        '<div class="target-reference__form-actions">' +
        '<button type="submit" class="btn btn--primary">追加する</button>' +
        '<button type="button" class="btn btn--ghost" data-modal-cancel>キャンセル</button>' +
        '</div>' +
        '</form>' +
        '</section>';

      document.body.appendChild(modalRoot);

      var form = modalRoot.querySelector('form');
      var overlay = modalRoot.querySelector('.screen-modal__overlay');
      var closeButton = modalRoot.querySelector('.screen-modal__close');
      var cancelButton = form.querySelector('[data-modal-cancel]');
      var titleNode = modalRoot.querySelector('.screen-modal__title');
      var submitterSummary = form.querySelector('[data-target-submission-user-summary]');
      var submitterEmpty = form.querySelector('[data-target-submission-user-empty]');
      var submitterName = form.querySelector('[data-target-submission-user-name]');
      var submitterCode = form.querySelector('[data-target-submission-user-code]');
      var submitterSelectButton = form.querySelector('[data-target-submission-user-select]');
      var submitterClearButton = form.querySelector('[data-target-submission-user-clear]');
      var statusSelect = form.querySelector('#target-submission-status');
      var statusField = statusSelect && typeof statusSelect.closest === 'function'
        ? statusSelect.closest('.target-reference__form-field')
        : null;
      var contentInput = form.querySelector('#target-submission-content');
      var commentInput = form.querySelector('#target-submission-comment');
      var feedback = form.querySelector('.target-reference__form-feedback');
      var uploaderHost = form.querySelector('[data-target-submission-uploader]');
      var uploadCounter = form.querySelector('[data-target-submission-upload-counter]');
      var contentLibraryPanel = form.querySelector('[aria-labelledby="target-submission-panel-library"]');
      var contentOpenButton = form.querySelector('[data-target-submission-content-open]');
      var contentClearButton = form.querySelector('[data-target-submission-content-clear]');
      var contentList = form.querySelector('[data-target-submission-content-list]');
      var contentSummary = form.querySelector('[data-target-submission-content-summary]');
      var contentPicker = form.querySelector('[data-target-submission-content-picker]');
      var contentSearch = form.querySelector('[data-target-submission-content-search]');
      var contentResults = form.querySelector('[data-target-submission-content-results]');
      var contentFeedback = form.querySelector('[data-target-submission-content-feedback]');
      var contentCloseButton = form.querySelector('[data-target-submission-content-close]');
      var submitButton = form.querySelector('button[type="submit"]');
      var submitterField = submitterSummary ? submitterSummary.closest('.target-reference__form-field') : null;
      var submitterActions = submitterField ? submitterField.querySelector('.target-reference__form-actions') : null;
      var contentField = contentInput ? contentInput.closest('.target-reference__form-field') : null;

      var self = this;

      var modal = {
        root: modalRoot,
        form: form,
        titleNode: titleNode,
        submitterSummary: submitterSummary,
        submitterEmpty: submitterEmpty,
        submitterName: submitterName,
        submitterCode: submitterCode,
        submitterSelectButton: submitterSelectButton,
        submitterClearButton: submitterClearButton,
        statusSelect: statusSelect,
        statusField: statusField,
        contentInput: contentInput,
        commentInput: commentInput,
        feedback: feedback,
        uploaderHost: uploaderHost,
        uploadCounter: uploadCounter,
        contentLibraryPanel: contentLibraryPanel,
        contentOpenButton: contentOpenButton,
        contentClearButton: contentClearButton,
        contentList: contentList,
        contentSummary: contentSummary,
        contentPicker: contentPicker,
        contentSearch: contentSearch,
        contentResults: contentResults,
        contentFeedback: contentFeedback,
        contentCloseButton: contentCloseButton,
        submitButton: submitButton,
        cancelButton: cancelButton,
        closeButton: closeButton,
        submitterField: submitterField,
        submitterActions: submitterActions,
        contentField: contentField,
        restoreTarget: null,
        isSubmitting: false,
        mode: 'create',
        currentItem: null,
        submitterToastShown: false,
        selectedUser: null,
        selectedContents: []
      };

      this.applyContentSelectionPolicy(modal);

      if (contentInput)
      {
        contentInput.addEventListener('input', function ()
        {
          self.setFieldErrorState(contentInput, false);
          self.setFieldErrorState(contentField, false);
        });
      }

      var closeConfirmMessage = '入力内容が保存されていません。編集画面を閉じますか？';

      async function close(event)
      {
        if (event && typeof event.preventDefault === 'function')
        {
          event.preventDefault();
        }
        if (modal.isSubmitting)
        {
          return;
        }
        try
        {
          var confirmed = await self.page.confirmDialogService.open(closeConfirmMessage, { type: 'warning' });
          if (!confirmed)
          {
            return;
          }
          self.closeAddModal();
        }
        catch (error)
        {
          window.console.error('[target-detail] failed to confirm submission modal close', error);
        }
      }

      modalRoot.addEventListener('keydown', function (event)
      {
        var key = event && typeof event.key !== 'undefined' ? event.key : event && event.keyCode;
        var isEscape = key === 'Escape' || key === 'Esc' || key === 27;
        if (!isEscape || !modalRoot.classList.contains('is-open'))
        {
          return;
        }
        close(event);
      });

      overlay.addEventListener('click', close);
      closeButton.addEventListener('click', close);
      cancelButton.addEventListener('click', close);

      if (submitterSelectButton)
      {
        submitterSelectButton.addEventListener('click', () =>
        {
          this.openSubmitterSelectModal(modal);
        });
      }
      if (submitterClearButton)
      {
        submitterClearButton.addEventListener('click', () =>
        {
          this.setSubmitterSelection(modal, null);
          if (submitterSelectButton && typeof submitterSelectButton.focus === 'function')
          {
            submitterSelectButton.focus();
          }
        });
      }

      if (modal.contentOpenButton)
      {
        modal.contentOpenButton.addEventListener('click', () =>
        {
          this.openContentSelectModal(modal);
        });
      }

      if (modal.contentCloseButton)
      {
        modal.contentCloseButton.addEventListener('click', () =>
        {
          this.toggleContentPicker(modal, false);
        });
      }

      if (modal.contentSearch)
      {
        modal.contentSearch.addEventListener('input', () =>
        {
          this.renderContentPickerResults(modal);
        });
      }

      if (modal.contentClearButton)
      {
        modal.contentClearButton.addEventListener('click', () =>
        {
          this.resetContentSelection(modal);
        });
      }

      form.addEventListener('submit', function (event)
      {
        event.preventDefault();
        self.submitSubmissionForm(modal);
      });

      return modal;
    }

    async setupContentUploader(modal)
    {
      if (this.contentUploaderService || !modal || !modal.uploaderHost)
      {
        return;
      }
      await window.Utils.loadScriptsSync(['/js/service-app/content-uploader/main.js']);
      var self = this;
      this.contentUploaderService = new window.Services.ContentUploader({
        container: modal.uploaderHost,
        multiple: false,
        autoCleanup: true,
        startMode: 'external',
        buttonService: this.page.buttonService,
        text: {
          dropMessage: 'コンテンツファイルをドラッグ＆ドロップ\nまたは「ファイルを選択」で追加',
          selectButton: 'ファイルを選択',
          emptyQueue: 'ファイルを選択するとここに表示されます。',
          pending: 'アップロード待機中',
          uploading: 'アップロード中…',
          done: 'アップロードが完了しました',
          error: 'エラーが発生しました'
        },
        uploadFile: function (file, options)
        {
          return self.uploadSubmissionContent(file, options || {});
        },
        onQueueChange: function (queue)
        {
          self.handleUploaderQueueChange(queue);
        },
        onStart: function (queue)
        {
          return self.handleUploaderStart(queue);
        },
        onComplete: function (payload)
        {
          return self.handleUploaderComplete(payload);
        }
      });
      await this.contentUploaderService.boot();
      this.contentUploaderService.mount(modal.uploaderHost);
      this.updateUploadCounterText(0, modal);
    }

    handleUploaderQueueChange(queue)
    {
      var count = Array.isArray(queue) ? queue.length : 0;
      this.updateUploadCounterText(count);
    }

    handleUploaderStart(queue)
    {
      this.pendingUploadResults = [];
      this.updateUploadCounterText(Array.isArray(queue) ? queue.length : 0);
      this.setModalFeedback('ファイルのアップロードを開始しました。完了までお待ちください。', 'info');
    }

    handleUploaderComplete(payload)
    {
      var uploadedCount = payload && typeof payload.uploadedCount === 'number' ? payload.uploadedCount : 0;
      this.pendingUploadResults = Array.isArray(payload && payload.results) ? payload.results : [];
      this.updateUploadCounterText(0);
      if (uploadedCount > 0)
      {
        this.setModalFeedback('ファイルのアップロードが完了しました。', 'success');
      }
    }

    resetUploadState(modal)
    {
      this.pendingUploadResults = [];
      this.updateUploadCounterText(0, modal);
      if (this.contentUploaderService && this.contentUploaderService.state && this.contentUploaderService.jobs)
      {
        this.contentUploaderService.state.queue = [];
        this.contentUploaderService.jobs.dom.renderQueue(
          this.contentUploaderService.state.queue,
          false,
          this.contentUploaderService.config
        );
      }
    }

    updateUploadCounterText(count, modal, customMessage)
    {
      var targetModal = modal || this.modals.add;
      if (!targetModal || !targetModal.uploadCounter)
      {
        return;
      }
      var message = customMessage || (count > 0
        ? '選択中: ' + count + '件のファイル'
        : 'アップロードは任意です。ファイルを選択するとここに表示されます。');
      targetModal.uploadCounter.textContent = message;
    }

    showExistingAttachments(modal, attachments)
    {
      var list = Array.isArray(attachments) ? attachments.filter(function (item)
      {
        return !!item;
      }) : [];
      if (!list.length)
      {
        this.updateUploadCounterText(0, modal);
        return;
      }
      var labels = list.map(function (attachment)
      {
        return attachment.label || attachment.name || attachment.fileName || '添付ファイル';
      }).filter(function (text)
      {
        return !!text;
      });
      if (!labels.length)
      {
        this.updateUploadCounterText(0, modal);
        return;
      }
      var preview = labels.slice(0, 3).join(' / ');
      var remaining = labels.length - 3;
      var suffix = remaining > 0 ? ' ほか' + remaining + '件' : '';
      this.updateUploadCounterText(0, modal, '登録済み: ' + preview + suffix);
    }

    hasUploadQueueItems()
    {
      if (!this.contentUploaderService || !this.contentUploaderService.state)
      {
        return false;
      }
      var queue = this.contentUploaderService.state.queue || [];
      return queue.length > 0;
    }

    resetContentSelection(modal)
    {
      var targetModal = modal || this.modals.add;
      if (!targetModal)
      {
        return;
      }
      targetModal.selectedContents = [];
      this.renderSelectedContents(targetModal);
    }

    buildAttachmentsFromModalContents(items)
    {
      var contents = Array.isArray(items) ? items.map(function (entry)
      {
        if (!entry)
        {
          return null;
        }
        if (entry.raw)
        {
          return entry.raw;
        }
        if (entry.content)
        {
          return entry.content;
        }
        return entry;
      }).filter(Boolean) : [];
      if (this.page && typeof this.page.buildAttachmentsFromContents === 'function')
      {
        return this.page.buildAttachmentsFromContents(contents);
      }
      return contents.map(function (content)
      {
        if (!content)
        {
          return null;
        }
        var code = content.contentCode || content.code || '';
        var label = content.title || content.fileName || content.name || code || 'コンテンツ';
        var type = content.contentType || content.mimeType || content.type || 'file';
        return { label: label, type: type, contentCode: code, content: content };
      }).filter(Boolean);
    }

    setContentPickerFeedback(modal, message, type)
    {
      if (!modal || !modal.contentFeedback)
      {
        return;
      }
      var feedback = modal.contentFeedback;
      feedback.textContent = message || '';
      if (message)
      {
        feedback.hidden = false;
        if (type)
        {
          feedback.setAttribute('data-feedback-type', type);
        }
        else
        {
          feedback.removeAttribute('data-feedback-type');
        }
      }
      else
      {
        feedback.hidden = true;
        feedback.removeAttribute('data-feedback-type');
      }
    }

    notifySubmitterSelectionRequired(modal, forceToast)
    {
      var shouldForce = !!forceToast;
      if (!modal)
      {
        return;
      }
      if (modal.submitterToastShown && !shouldForce)
      {
        return;
      }
      if (this.page && typeof this.page.showToast === 'function')
      {
        this.page.showToast('info', '提出者を選択するとコンテンツを表示できます。');
      }
      modal.submitterToastShown = true;
    }

    toggleContentPicker(modal, isOpen)
    {
      if (!modal || !modal.contentPicker)
      {
        return;
      }
      if (!this.isContentManagementEnabled())
      {
        modal.contentPicker.hidden = true;
        return;
      }
      var shouldOpen = !!isOpen;
      modal.contentPicker.hidden = !shouldOpen;
      if (!shouldOpen)
      {
        return;
      }
      this.ensureContentLibrary(modal);
      if (modal.contentSearch && typeof modal.contentSearch.focus === 'function')
      {
        modal.contentSearch.focus();
      }
    }

    openContentSelectModal(modal)
    {
      if (!this.isContentManagementEnabled())
      {
        return;
      }
      var service = this.getContentsSelectModalService();
      if (!service || typeof service.open !== 'function')
      {
        this.setModalFeedback('コンテンツ選択モーダルを利用できません。', 'error');
        return;
      }
      var ownerKey = this.resolveContentLibraryOwner(modal);
      var ownerParams = this.resolveContentLibraryOwnerParams(modal);
      if (this.shouldShowSubmitterField() && !ownerKey)
      {
        this.notifySubmitterSelectionRequired(modal, true);
        return;
      }
      var selectedItems = [];
      if (service.jobs && service.jobs.data && typeof service.jobs.data.normalizeItem === 'function')
      {
        var attachments = Array.isArray(modal && modal.selectedContents) ? modal.selectedContents : [];
        selectedItems = attachments.map(function (attachment)
        {
          var raw = attachment && (attachment.content || attachment.raw || attachment);
          if (!raw)
          {
            return null;
          }
          var normalized = service.jobs.data.normalizeItem(raw);
          if (!normalized)
          {
            return null;
          }
          normalized.raw = normalized.raw || raw;
          return normalized;
        }).filter(Boolean);
      }
      if (selectedItems.length > 1)
      {
        selectedItems = selectedItems.slice(0, 1);
      }

      var applySelection = (items) =>
      {
        var chosen = Array.isArray(items) ? items[0] : items;
        if (!chosen)
        {
          return;
        }
        modal.selectedContents = this.buildAttachmentsFromModalContents([chosen]);
        this.applySelectedContentFormValues(modal, chosen);
        this.renderSelectedContents(modal);
      };
      var zIndex = this.resolveNestedModalZIndex(modal);
      if (typeof zIndex !== 'number' || !isFinite(zIndex))
      {
        zIndex = 120;
      }
      else if (zIndex < 60)
      {
        zIndex = 60;
      }
      service.open({
        multiple: false,
        selected: selectedItems,
        onSelect: applySelection,
        onApply: applySelection,
        onClose: () =>
        {
          if (modal && modal.contentOpenButton && typeof modal.contentOpenButton.focus === 'function')
          {
            modal.contentOpenButton.focus();
          }
        },
        zIndex: zIndex,
        forceRefresh: true,
        userId: ownerParams.userId,
        userCode: ownerParams.userCode
      });
    }

    getContentOwnerSelection(modal)
    {
      if (this.shouldShowSubmitterField())
      {
        return modal && modal.selectedUser ? modal.selectedUser : null;
      }
      return this.getSessionUserSelection();
    }

    resolveContentLibraryOwner(modal)
    {
      var selection = this.getContentOwnerSelection(modal);
      var userCode = selection && selection.userCode ? String(selection.userCode).trim() : '';
      var userId = selection && selection.userId ? String(selection.userId).trim() : '';
      return userCode || userId || '';
    }

    resolveContentLibraryOwnerParams(modal)
    {
      var selection = this.getContentOwnerSelection(modal);
      return {
        userId: selection && selection.userId ? String(selection.userId).trim() : '',
        userCode: selection && selection.userCode ? String(selection.userCode).trim() : ''
      };
    }

    async ensureContentLibrary(modal)
    {
      if (!this.isContentManagementEnabled())
      {
        return;
      }
      var ownerKey = this.resolveContentLibraryOwner(modal);
      var ownerParams = this.resolveContentLibraryOwnerParams(modal);
      var requiresSelection = this.shouldShowSubmitterField();
      if (requiresSelection && !ownerKey)
      {
        this.contentLibrary = [];
        this.contentLibraryOwner = '';
        this.setContentPickerFeedback(modal, '', null);
        this.notifySubmitterSelectionRequired(modal);
        if (modal && modal.contentResults)
        {
          modal.contentResults.innerHTML = '';
        }
        return;
      }
      var cacheKey = ownerKey || '__all';
      if (this.contentLibraryOwner !== cacheKey)
      {
        this.contentLibrary = [];
        this.contentLibraryOwner = cacheKey;
      }
      var cached = this.contentLibraryCache && this.contentLibraryCache[cacheKey];
      if (cached && cached.length)
      {
        this.contentLibrary = cached.slice();
        this.renderContentPickerResults(modal);
        return;
      }
      if (this.isLoadingContentLibrary && this.loadingContentOwner === cacheKey)
      {
        this.renderContentPickerResults(modal);
        return;
      }
      this.isLoadingContentLibrary = true;
      this.loadingContentOwner = cacheKey;
      this.setContentPickerFeedback(modal, '登録済みコンテンツを読み込み中です…', 'info');
      try
      {
        var requestPayload = {};
        if (ownerParams.userCode)
        {
          requestPayload.userCode = ownerParams.userCode;
        }
        if (ownerParams.userId)
        {
          requestPayload.userId = ownerParams.userId;
        }
        var payload = await this.page.callApi('ContentList', requestPayload, { requestType: 'Contents' });
        this.contentLibrary = this.normalizeContentLibrary(payload);
        this.contentLibraryCache[cacheKey] = this.contentLibrary.slice();
        this.setContentPickerFeedback(modal, this.contentLibrary.length ? '' : '登録済みコンテンツが見つかりませんでした。', this.contentLibrary.length ? null : 'info');
      }
      catch (error)
      {
        window.console.error('[target-detail] failed to load content library', error);
        this.setContentPickerFeedback(modal, '登録済みコンテンツを取得できませんでした。', 'error');
      }
      finally
      {
        this.isLoadingContentLibrary = false;
        this.loadingContentOwner = '';
        this.renderContentPickerResults(modal);
      }
    }

    normalizeContentLibrary(payload)
    {
      var list = [];
      if (Array.isArray(payload && payload.usersContents))
      {
        list = list.concat(payload.usersContents.filter(Boolean));
      }
      if (Array.isArray(payload && payload.usersContentsProxy))
      {
        list = list.concat(payload.usersContentsProxy.filter(Boolean));
      }
      if (!list.length && Array.isArray(payload))
      {
        list = payload.slice();
      }
      if (!list.length && payload && Array.isArray(payload.items))
      {
        list = payload.items.slice();
      }
      var normalized = [];
      for (var i = 0; i < list.length; i += 1)
      {
        var entry = list[i];
        var code = entry && (entry.contentCode || entry.code);
        if (!code)
        {
          continue;
        }
        var label = entry.title || entry.fileName || entry.originalName || entry.name || code;
        var type = entry.contentType || entry.mimeType || entry.type || '';
        var updatedAtValue = Date.parse(entry.updatedAt || '') || Date.parse(entry.updated_at || '') || 0;
        normalized.push({
          code: String(code),
          label: label,
          type: type,
          owner: entry.ownerDisplayName || entry.ownerUserCode || '',
          updatedAtDisplay: entry.updatedAtDisplay || entry.updated_at_display || '',
          updatedAtValue: updatedAtValue,
          raw: entry
        });
      }
      normalized.sort(function (a, b)
      {
        return (b.updatedAtValue || 0) - (a.updatedAtValue || 0);
      });
      return normalized;
    }

    renderContentPickerResults(modal)
    {
      if (!modal || !modal.contentResults)
      {
        return;
      }
      var owner = this.resolveContentLibraryOwner(modal);
      if (this.shouldShowSubmitterField() && !owner)
      {
        modal.contentResults.innerHTML = '';
        this.setContentPickerFeedback(modal, '', null);
        this.notifySubmitterSelectionRequired(modal);
        return;
      }
      var query = modal.contentSearch ? String(modal.contentSearch.value || '').toLowerCase() : '';
      var filtered = this.contentLibrary.filter(function (entry)
      {
        if (!query)
        {
          return true;
        }
        var haystack = [entry.label, entry.code, entry.type, entry.owner, entry.updatedAtDisplay]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.indexOf(query) !== -1;
      });
      modal.contentResults.innerHTML = '';
      if (!filtered.length)
      {
        this.setContentPickerFeedback(modal, query ? '該当するコンテンツが見つかりませんでした。' : '登録済みコンテンツが見つかりませんでした。', 'info');
        return;
      }
      this.setContentPickerFeedback(modal, '', null);
      var self = this;
      filtered.slice(0, 50).forEach(function (entry)
      {
        var item = document.createElement('button');
        item.type = 'button';
        item.className = 'target-submission__content-picker-item';
        item.innerHTML = '<span class="target-submission__content-picker-title">' + window.Utils.escapeHtml(entry.label)
          + '</span>'
          + '<span class="target-submission__content-picker-meta">' + window.Utils.escapeHtml(entry.code)
          + (entry.type ? ' / ' + window.Utils.escapeHtml(entry.type) : '')
          + (entry.owner ? ' / ' + window.Utils.escapeHtml(entry.owner) : '')
          + (entry.updatedAtDisplay ? ' / ' + window.Utils.escapeHtml(entry.updatedAtDisplay) : '')
          + '</span>';
        item.addEventListener('click', function ()
        {
          self.addContentSelection(modal, entry.raw);
        });
        modal.contentResults.appendChild(item);
      });
    }

    applySelectedContentFormValues(modal, entry)
    {
      if (!modal || !entry)
      {
        return;
      }
      var source = entry.raw || entry;
      var userContents = source && source.userContents ? source.userContents : null;
      if (!userContents)
      {
        return;
      }
      if (modal.contentInput && userContents.title !== undefined && userContents.title !== null)
      {
        modal.contentInput.value = String(userContents.title);
      }
      if (modal.commentInput && userContents.description !== undefined && userContents.description !== null)
      {
        modal.commentInput.value = String(userContents.description);
      }
    }

    addContentSelection(modal, entry)
    {
      if (!modal)
      {
        return;
      }
      var attachment = null;
      if (this.page && typeof this.page.buildAttachmentsFromContents === 'function')
      {
        var built = this.page.buildAttachmentsFromContents([entry]);
        attachment = Array.isArray(built) && built.length ? built[0] : null;
      }
      if (!attachment)
      {
        attachment = {
          label: entry && (entry.title || entry.fileName || entry.name || entry.originalName || entry.contentCode || entry.code || 'コンテンツ'),
          type: entry && (entry.contentType || entry.mimeType || entry.type || 'file'),
          contentCode: entry && (entry.contentCode || entry.code || '')
        };
      }
      if (!Array.isArray(modal.selectedContents))
      {
        modal.selectedContents = [];
      }
      this.applySelectedContentFormValues(modal, entry);
      var exists = modal.selectedContents.some(function (item)
      {
        return item && item.contentCode === attachment.contentCode;
      });
      if (!exists)
      {
        modal.selectedContents.push(attachment);
        this.renderSelectedContents(modal);
      }
    }

    renderSelectedContents(modal)
    {
      if (!modal)
      {
        return;
      }
      var listNode = modal.contentList;
      var summary = modal.contentSummary;
      var clearButton = modal.contentClearButton;
      var selections = Array.isArray(modal.selectedContents) ? modal.selectedContents.filter(Boolean) : [];
      if (clearButton)
      {
        if (selections.length)
        {
          clearButton.removeAttribute('disabled');
        }
        else
        {
          clearButton.setAttribute('disabled', 'disabled');
        }
      }
      if (!listNode || !summary)
      {
        return;
      }
      listNode.innerHTML = '';
      if (!selections.length)
      {
        listNode.hidden = true;
        summary.textContent = 'コンテンツを選択していません。';
        return;
      }
      summary.textContent = '選択中: ' + selections.length + '件のコンテンツ';
      var self = this;
      selections.forEach(function (item)
      {
        var code = item && item.contentCode ? String(item.contentCode) : '';
        var label = item && item.label ? item.label : (code || 'コンテンツ');
        var row = document.createElement('li');
        row.className = 'target-submission__content-item';
        var text = document.createElement('div');
        text.className = 'target-submission__content-item-body';
        var title = document.createElement('span');
        title.className = 'target-submission__content-name';
        title.textContent = label;
        text.appendChild(title);
        if (code)
        {
          var codeNode = document.createElement('span');
          codeNode.className = 'target-submission__content-code';
          codeNode.textContent = code;
          text.appendChild(codeNode);
        }
        row.appendChild(text);
        var remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'target-submission__content-remove';
        remove.textContent = '×';
        remove.addEventListener('click', function ()
        {
          self.removeSelectedContent(modal, code);
        });
        row.appendChild(remove);
        listNode.appendChild(row);
      });
      listNode.hidden = false;
    }

    removeSelectedContent(modal, contentCode)
    {
      if (!modal || !Array.isArray(modal.selectedContents))
      {
        return;
      }
      modal.selectedContents = modal.selectedContents.filter(function (item)
      {
        return item && item.contentCode !== contentCode;
      });
      this.renderSelectedContents(modal);
    }

    collectModalFormValues(modal)
    {
      if (!modal)
      {
        return {
          userDisplayName: '',
          userCode: '',
          statusLabel: this.getDefaultStatusLabel(),
          content: '',
          comment: ''
        };
      }
      var selectedUser = modal.selectedUser || null;
      var statusLabel = this.canEditSubmissionStatus() && modal.statusSelect
        ? (modal.statusSelect.value || this.getDefaultStatusLabel())
        : this.getReadOnlyStatusLabel(modal);
      return {
        userDisplayName: selectedUser && selectedUser.displayName ? String(selectedUser.displayName).trim() : '',
        userCode: selectedUser && selectedUser.userCode ? String(selectedUser.userCode).trim() : '',
        statusLabel: statusLabel,
        content: modal.contentInput.value.trim(),
        comment: modal.commentInput.value.trim()
      };
    }

    setFieldErrorState(target, hasError)
    {
      if (!target || !target.classList)
      {
        return;
      }
      if (hasError)
      {
        target.classList.add('is-error');
      }
      else
      {
        target.classList.remove('is-error');
      }
    }

    clearModalValidationState(modal)
    {
      if (!modal)
      {
        return;
      }
      this.setFieldErrorState(modal.submitterField, false);
      this.setFieldErrorState(modal.contentField, false);
      this.setFieldErrorState(modal.contentInput, false);
    }

    setModalSubmitting(modal, isSubmitting)
    {
      if (!modal)
      {
        return;
      }
      modal.isSubmitting = !!isSubmitting;
      var targets = [
        modal.submitButton,
        modal.cancelButton,
        modal.closeButton,
        modal.submitterSelectButton,
        modal.submitterClearButton
      ];
      for (var i = 0; i < targets.length; i += 1)
      {
        var target = targets[i];
        if (!target)
        {
          continue;
        }
        if (isSubmitting)
        {
          target.setAttribute('disabled', 'disabled');
        }
        else
        {
          if (target === modal.submitterClearButton && !modal.selectedUser)
          {
            target.setAttribute('disabled', 'disabled');
          }
          else
          {
            target.removeAttribute('disabled');
          }
        }
      }
    }

    fillFormWithItem(modal, item)
    {
      if (!modal)
      {
        return;
      }
      if (!item)
      {
        this.setSubmitterSelection(modal, null);
        modal.statusSelect.value = this.getDefaultStatusLabel();
        modal.contentInput.value = '';
        modal.commentInput.value = '';
        this.updateUploadCounterText(0, modal);
        this.resetContentSelection(modal);
        return;
      }
      this.setSubmitterSelection(modal, {
        displayName: item.userDisplayName || '',
        userCode: item.userCode || '',
        userId: item.userId || item.user_id || ''
      });
      var statusValue = item.statusLabel || item.status || this.getDefaultStatusLabel();
      modal.statusSelect.value = statusValue;
      modal.contentInput.value = item.content || '';
      modal.commentInput.value = item.comment || '';
      this.showExistingAttachments(modal, item.attachments);
      modal.selectedContents = Array.isArray(item.attachments) ? item.attachments.slice() : [];
      this.renderSelectedContents(modal);
    }

    async submitSubmissionForm(modal)
    {
      if (!modal || modal.isSubmitting)
      {
        return;
      }
      this.clearModalValidationState(modal);
      var values = this.collectModalFormValues(modal);
      if (!values.userDisplayName)
      {
        this.setModalFeedback('提出者を選択してください。', 'error');
        this.setFieldErrorState(modal.submitterField, true);
        if (modal.submitterSelectButton && typeof modal.submitterSelectButton.focus === 'function')
        {
          modal.submitterSelectButton.focus();
        }
        return;
      }
      if (!values.content)
      {
        this.setModalFeedback('提出内容を入力してください。', 'error');
        this.setFieldErrorState(modal.contentInput, true);
        this.setFieldErrorState(modal.contentField, true);
        modal.contentInput.focus();
        return;
      }
      var needsUpload = this.hasUploadQueueItems();
      var hasPendingUploadResults = Array.isArray(this.pendingUploadResults) && this.pendingUploadResults.length > 0;
      var hasExistingAttachment = modal.currentItem && Array.isArray(modal.currentItem.attachments) && modal.currentItem.attachments.length;
      var hasSelectedContents = Array.isArray(modal.selectedContents);
      this.setModalSubmitting(modal, true);
      try
      {
        var attachments = [];
        if (needsUpload)
        {
          this.uploadOwnerUserCode = values.userCode || '';
          var uploadPayload = await this.contentUploaderService.startUpload();
          if (!uploadPayload)
          {
            throw new Error('ファイルのアップロードに失敗しました。');
          }
          attachments = this.buildAttachmentsFromUpload(uploadPayload);
          if (!attachments || !attachments.length)
          {
            throw new Error('アップロードしたコンテンツ情報を取得できませんでした。');
          }
          if (Array.isArray(modal.selectedContents) && modal.selectedContents.length)
          {
            attachments = attachments.concat(modal.selectedContents);
          }
        }
        else if (hasPendingUploadResults)
        {
          attachments = this.buildAttachmentsFromUpload();
          if (Array.isArray(modal.selectedContents) && modal.selectedContents.length)
          {
            attachments = attachments.concat(modal.selectedContents);
          }
        }
        else if (hasSelectedContents)
        {
          attachments = modal.selectedContents.slice();
        }
        else if (hasExistingAttachment)
        {
          attachments = modal.currentItem.attachments.slice();
        }
        this.setModalFeedback(modal.mode === 'edit' ? '提出を更新しています…' : '提出を登録しています…', 'info');
        var submission = modal.currentItem ? Object.assign({}, modal.currentItem) : {};
        submission.userDisplayName = values.userDisplayName;
        submission.userCode = values.userCode || '';
        submission.statusLabel = values.statusLabel || this.getDefaultStatusLabel();
        submission.content = values.content;
        submission.comment = values.comment;
        submission.attachments = attachments;
        if (!submission.submissionCode)
        {
          submission.submissionCode = 'sub-' + Date.now();
        }
        var now = new Date();
        submission.submittedAt = submission.submittedAt || now.toISOString();
        if (!submission.submittedAtDisplay && this.helpers && typeof this.helpers.formatDateTime === 'function')
        {
          submission.submittedAtDisplay = this.helpers.formatDateTime(submission.submittedAt);
        }
        var contentCodes = Array.isArray(attachments) ? attachments.map(function (item)
        {
          return item && item.contentCode ? String(item.contentCode) : '';
        }).filter(function (code)
        {
          return code !== '';
        }) : [];

        var params = Object.assign({
          targetCode: this.page.state.targetCode,
          submissionCode: submission.submissionCode,
          userDisplayName: submission.userDisplayName,
          userCode: submission.userCode,
          statusLabel: submission.statusLabel,
          content: submission.content,
          comment: submission.comment
        }, contentCodes.length ? { contentCodes: contentCodes } : {});
        try
        {
          var endpoint = modal.mode === 'edit'
            ? 'TargetSubmissionUpdate'
            : 'TargetSubmissionCreate';
          await this.page.callApi(endpoint, params, { requestType: 'TargetManagementSubmissions' });
        }
        catch (apiError)
        {
          var fallbackLabel = modal.mode === 'edit'
            ? '[target-detail] submission update fallback'
            : '[target-detail] submission create fallback';
          console.warn(fallbackLabel, apiError);
        }
        if (modal.mode === 'edit')
        {
          this.state.items = this.state.items.map(function (entry)
          {
            if (entry && entry.submissionCode === submission.submissionCode)
            {
              return submission;
            }
            return entry;
          });
        }
        else
        {
          this.state.items.unshift(submission);
        }
        this.updateStatusFilterOptions();
        this.renderList();
        this.setFeedback(modal.mode === 'edit' ? '提出を更新しました。' : '提出を追加しました。', 'success');
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('success', modal.mode === 'edit' ? '提出を更新しました。' : '提出を追加しました。');
        }
        this.setModalFeedback(modal.mode === 'edit' ? '提出を更新しました。' : '提出を追加しました。', 'success');
        this.closeAddModal();
      }
      catch (error)
      {
        var message = error && error.message ? error.message : '提出の登録に失敗しました。';
        this.setModalFeedback(message, 'error');
      }
      finally
      {
        this.uploadOwnerUserCode = '';
        this.setModalSubmitting(modal, false);
      }
    }

    buildAttachmentsFromUpload(payload)
    {
      var results = Array.isArray(payload && payload.results) ? payload.results : this.pendingUploadResults;
      if (!Array.isArray(results) || !results.length)
      {
        return [];
      }
      var attachments = [];
      for (var i = 0; i < results.length; i += 1)
      {
        var entry = results[i];
        if (!entry)
        {
          continue;
        }
        var result = entry.result || entry;
        if (!result)
        {
          continue;
        }
        var previewUrl = result.previewUrl
          || result.youtubeUrl
          || result.embedUrl
          || result.playbackUrl
          || result.streamUrl
          || result.url
          || result.downloadUrl
          || '';
        attachments.push({
          label: result.originalName || result.fileName || result.name || '提出ファイル',
          type: result.contentType || result.type || 'file',
          sizeDisplay: result.sizeDisplay || (typeof result.size === 'number' ? window.Utils.formatBytes(result.size) : ''),
          previewUrl: previewUrl,
          playbackUrl: result.playbackUrl || result.streamUrl || '',
          streamUrl: result.streamUrl || result.playbackUrl || '',
          downloadUrl: result.downloadUrl || result.url || result.previewUrl || '',
          contentCode: result.contentCode || result.code || ''
        });
      }
      return attachments;
    }

    uploadSubmissionContent(file, options)
    {
      if (!file)
      {
        return Promise.reject(new Error('ファイルを選択してください。'));
      }
      var formData = new window.FormData();
      var fileName = file.name || 'submission-upload';
      formData.append('fileName', fileName);
      formData.append('file', file, fileName);
      var ownerUserCode = this.resolveUploadOwnerUserCode();
      if (ownerUserCode)
      {
        formData.append('ownerUserCode', ownerUserCode);
      }
      var requestOptions = window.Utils.buildApiRequestOptions('Contents', 'ContentUpload', formData);
      return this.sendUploadRequestWithProgress(requestOptions, options || {});
    }

    resolveUploadOwnerUserCode()
    {
      if (this.uploadOwnerUserCode)
      {
        return this.uploadOwnerUserCode;
      }
      var modal = this.modals && this.modals.add ? this.modals.add : null;
      if (modal && modal.selectedUser && modal.selectedUser.userCode)
      {
        return String(modal.selectedUser.userCode).trim();
      }
      return '';
    }

    sendUploadRequestWithProgress(requestOptions, options)
    {
      var onProgress = options && typeof options.onProgress === 'function' ? options.onProgress : null;
      return new Promise(function (resolve, reject)
      {
        var xhr = new XMLHttpRequest();
        xhr.open(requestOptions.type || 'POST', requestOptions.url, true);
        if (xhr.upload && onProgress)
        {
          xhr.upload.addEventListener('progress', function (event)
          {
            if (!event)
            {
              return;
            }
            var total = event.total || 0;
            var loaded = event.loaded || 0;
            onProgress({ loaded: loaded, total: total });
          });
        }
        xhr.onreadystatechange = function ()
        {
          if (xhr.readyState !== 4)
          {
            return;
          }
          if (xhr.status >= 200 && xhr.status < 300)
          {
            var payload = null;
            try
            {
              payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
            }
            catch (_error)
            {
              payload = null;
            }
            if (payload && typeof payload.status === 'string')
            {
              var status = payload.status.toUpperCase();
              if (status && status !== 'OK')
              {
                var message = payload.response || payload.result || payload.reason || 'アップロードに失敗しました。';
                reject(new Error(message));
                return;
              }
            }
            resolve((payload && payload.result) || payload || { ok: true });
            return;
          }
          reject(new Error('アップロードに失敗しました (status ' + xhr.status + ')'));
        };
        xhr.onerror = function ()
        {
          reject(new Error('ネットワークエラーが発生しました'));
        };
        xhr.send(requestOptions.data);
      });
    }

    setModalFeedback(message, type)
    {
      if (!this.modals.add || !this.modals.add.feedback)
      {
        return;
      }
      var feedback = this.modals.add.feedback;
      feedback.textContent = message || '';
      if (message)
      {
        feedback.hidden = false;
        if (type)
        {
          feedback.setAttribute('data-feedback-type', type);
        }
        else
        {
          feedback.removeAttribute('data-feedback-type');
        }
      }
      else
      {
        feedback.hidden = true;
        feedback.removeAttribute('data-feedback-type');
      }
    }
  }

  var NS = window.TargetDetail || (window.TargetDetail = {});
  NS.JobSubmission = NS.JobSubmission || TargetDetailSubmission;
})(window, document);
