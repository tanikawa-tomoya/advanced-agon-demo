(function ()
{
  'use strict';

  var SURVEY_DETAIL_ICON_HTML = [
    '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M4.5 19.25h15"></path>',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M7.5 19.25V10.5m4.5 8.75v-6.5m4.5 6.5v-9.5"></path>',
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="m6.5 7.75 3.25-3 2.75 2.5 4-4"></path>',
    '<circle cx="17.75" cy="3.75" r="1.25" fill="currentColor"></circle>',
    '</svg>'
  ].join('');

  function normalizeText(value)
  {
    if (value == null)
    {
      return '';
    }
    return String(value).trim();
  }

  function isGuestUser(entry)
  {
    if (!entry || typeof entry !== 'object')
    {
      return false;
    }
    var type = normalizeText(entry.userType || entry.participantType || entry.type || entry.role || '');
    if (type && type.toLowerCase() === 'guest')
    {
      return true;
    }
    var guestFlags = [entry.isGuest, entry.guest, entry.isGuestUser, entry.guestUser];
    for (var i = 0; i < guestFlags.length; i += 1)
    {
      var value = guestFlags[i];
      if (value === true || value === 1 || value === '1' || value === 'true')
      {
        return true;
      }
    }
    return false;
  }

  function formatDateTime(helpers, value)
  {
    if (!helpers || typeof helpers.formatDateTime !== 'function')
    {
      return value || '';
    }
    return helpers.formatDateTime(value);
  }

  function pad(num)
  {
    return num < 10 ? '0' + num : String(num);
  }

  function parseDate(value)
  {
    if (value instanceof Date && isFinite(value.getTime()))
    {
      return value;
    }
    var str = String(value == null ? '' : value).trim();
    if (!str)
    {
      return null;
    }
    var normalized = str.replace(/T/, ' ');
    if (/^\d{4}-\d{2}-\d{2}/.test(normalized))
    {
      normalized = normalized.replace(/-/g, '/');
    }
    var date = new Date(normalized);
    if (!isFinite(date.getTime()))
    {
      date = new Date(str);
    }
    if (!isFinite(date.getTime()))
    {
      return null;
    }
    return date;
  }

  function formatServerTimestamp(value)
  {
    var date = parseDate(value) || new Date();
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' '
      + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
  }

  function formatInputDateTime(value)
  {
    var date = parseDate(value);
    if (!date)
    {
      return '';
    }
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T'
      + pad(date.getHours()) + ':' + pad(date.getMinutes());
  }

  function formatContent(text)
  {
    var normalized = normalizeText(text);
    if (!normalized)
    {
      return '';
    }
    return normalized.replace(/\n{2,}/g, '\n\n').trim();
  }

  function normalizeRecipient(entry)
  {
    if (!entry)
    {
      return null;
    }
    var user = entry.user && typeof entry.user === 'object' ? entry.user : null;
    var userCode = normalizeText(
      entry.userCode || entry.code || entry.loginId || (user && (user.userCode || user.code || user.loginId)) || ''
    );
    var displayName = normalizeText(
      entry.displayName
      || entry.userDisplayName
      || entry.name
      || (user && (user.displayName || user.userDisplayName || user.name || user.fullName))
      || userCode
    );
    if (!userCode && !displayName)
    {
      return null;
    }
    var isActive = entry.isActive;
    var status = typeof entry.status === 'string' ? entry.status.toLowerCase() : '';
    if (entry.active === false || entry.active === 0 || entry.active === '0' || entry.active === 'false')
    {
      isActive = false;
    }
    if (status === 'inactive')
    {
      isActive = false;
    }
    if (entry.endedAt)
    {
      isActive = false;
    }
    if (user)
    {
      if (user.isActive === false || user.isActive === 0 || user.isActive === '0' || user.isActive === 'false')
      {
        isActive = false;
      }
      if (user.active === false || user.active === 0 || user.active === '0' || user.active === 'false')
      {
        isActive = false;
      }
      var userStatus = typeof user.status === 'string' ? user.status.toLowerCase() : '';
      if (userStatus === 'inactive')
      {
        isActive = false;
      }
      if (user.endedAt)
      {
        isActive = false;
      }
    }
    if (isActive === false)
    {
      return null;
    }
    var acknowledgedAt = normalizeText(entry.acknowledgedAt || entry.readAt || '');
    var respondedAt = normalizeText(entry.respondedAt || entry.respondedAtDisplay || '');
    var answers = [];
    if (Array.isArray(entry.answers))
    {
      answers = entry.answers;
    }
    else if (Array.isArray(entry.responses))
    {
      answers = entry.responses;
    }
    else if (Array.isArray(entry.items))
    {
      answers = entry.items;
    }
    var hasAcknowledgement = entry.hasAcknowledgement;
    if (hasAcknowledgement == null)
    {
      var hasAcknowledgementData = acknowledgedAt || respondedAt
        || (Array.isArray(answers) && answers.length > 0);
      hasAcknowledgement = hasAcknowledgementData || true;
    }
    hasAcknowledgement = Boolean(hasAcknowledgement);
    var guestFlag = isGuestUser(entry) || isGuestUser(user);
    var selectionKey = normalizeText(entry.selectionKey || entry.recipientKey || entry.participantKey || (user && user.selectionKey) || '');
    var role = normalizeText(entry.role || (user && user.role));
    return {
      userCode: userCode,
      displayName: displayName || userCode || 'ユーザー',
      role: role,
      acknowledgedAt: acknowledgedAt,
      acknowledgedDisplay: acknowledgedAt || (entry.acknowledgedAtDisplay || ''),
      hasAcknowledgement: hasAcknowledgement,
      respondedAt: respondedAt,
      respondedAtDisplay: respondedAt || (entry.respondedAtDisplay || ''),
      answers: answers,
      avatarUrl: normalizeText(entry.avatarUrl || entry.photoUrl || (user && (user.avatarUrl || user.photoUrl)) || ''),
      avatarInitial: normalizeText(entry.avatarInitial || entry.initial || (user && (user.avatarInitial || user.initial)) || ''),
      avatarTransform: normalizeText(entry.avatarTransform || entry.transform || (user && (user.avatarTransform || user.transform)) || ''),
      isActive: true,
      isGuest: guestFlag,
      selectionKey: selectionKey
    };
  }

  function buildAudienceKey(entry)
  {
    if (!entry)
    {
      return '';
    }
    if (entry.selectionKey)
    {
      return String(entry.selectionKey).toLowerCase();
    }
    if (entry.userCode)
    {
      return String(entry.userCode).toLowerCase();
    }
    if (entry.displayName)
    {
      return String(entry.displayName).toLowerCase();
    }
    return '';
  }

  class TargetDetailSurvey
  {
    constructor(pageInstance)
    {
      this.page = pageInstance;
      this.helpers = pageInstance && pageInstance.helpers ? pageInstance.helpers : {};
      this.canManage = true;
      this.state = {
        items: [],
        hasPresentedPending: false,
        acknowledgingId: null,
        downloadingSurveyId: null,
        remindingSurveyId: null,
        filters: { showAcknowledged: true, showOutOfPeriod: true }
      };
      this.refs = {
        container: null,
        list: null,
        empty: null,
        feedback: null,
        refreshButton: null,
        addButton: null,
        filters: null,
        acknowledgedFilter: null,
        periodFilter: null
      };
      this.buttonService = null;
      this.modals = { form: null, detail: null, preview: null, response: null, responseEdit: null, reminder: null };
      this.localIdSeed = 0;
    }

    async render()
    {
      this.canManage = this.page && typeof this.page.canManageTargetContent === 'function'
        && this.page.canManageTargetContent();
      this.refs.container = this.page.refs.tabPanels && this.page.refs.tabPanels.survey;
      if (!this.refs.container)
      {
        return;
      }
      this.refs.container.innerHTML = '';
      this.refs.container.classList.add('target-detail__panel');

      var section = document.createElement('section');
      section.className = 'target-survey target-reference';

      section.appendChild(this.renderHeader());
      section.appendChild(this.renderFeedbackRegion());

      var filters = this.renderFilters();
      if (filters)
      {
        section.appendChild(filters);
      }

      var list = document.createElement('div');
      list.className = 'target-reference__list';
      this.refs.list = list;
      section.appendChild(list);

      var empty = document.createElement('div');
      empty.className = 'target-reference__empty';
      empty.textContent = 'アンケートはまだありません。';
      this.refs.empty = empty;
      section.appendChild(empty);

      this.refs.container.appendChild(section);

      var items = await this.page.loadSurvey();
      this.state.items = this.normalizeSurvey(Array.isArray(items) ? items : []);
      this.renderList();
      this.bindEvents();
      await this.showPendingSurveyForViewer();
    }

    renderHeader()
    {
      var header = document.createElement('div');
      header.className = 'target-detail__section-header';

      var title = document.createElement('h2');
      title.textContent = 'アンケート';
      header.appendChild(title);

      var actions = document.createElement('div');
      actions.className = 'target-detail__section-actions target-reference__actions target-survey__actions';

      if (this.canManage)
      {
        var addButton = this.createServiceActionButton(
          'expandable-icon-button/add',
          {
            label: 'アンケートを追加',
            ariaLabel: 'アンケートを追加',
            hoverLabel: 'アンケートを追加',
            className:
              'target-management__icon-button target-management__icon-button--primary target-survey__add'
          }
        );
        this.refs.addButton = addButton;
        actions.appendChild(addButton);
      }

      var refreshButton = this.createServiceActionButton(
        'expandable-icon-button/reload',
        {
          label: '再読み込み',
          ariaLabel: 'アンケートを再読み込み',
          hoverLabel: 'アンケートを再読み込み',
          title: 'アンケートを再読み込み',
          className: 'target-management__icon-button target-management__icon-button--ghost target-survey__refresh'
        }
      );
      this.refs.refreshButton = refreshButton;
      actions.appendChild(refreshButton);

      header.appendChild(actions);
      return header;
    }

    renderFeedbackRegion()
    {
      var feedback = document.createElement('div');
      feedback.className = 'target-detail__feedback';
      feedback.setAttribute('role', 'status');
      feedback.hidden = true;
      this.refs.feedback = feedback;
      return feedback;
    }

    bindEvents()
    {
      if (this.refs.refreshButton)
      {
        this.refs.refreshButton.addEventListener('click', (event) =>
        {
          event.preventDefault();
          this.reloadSurvey();
        });
      }
      if (this.refs.addButton)
      {
        this.refs.addButton.addEventListener('click', (event) =>
        {
          event.preventDefault();
          this.openAddModal();
        });
      }
    }

    async reloadSurvey()
    {
      this.setFeedback('アンケートを再読み込みしています…', 'info');
      try
      {
        await this.fetchAndRenderSurvey();
        this.setFeedback('最新のアンケートを読み込みました。', 'success');
      }
      catch (error)
      {
        this.setFeedback('アンケートの再読み込みに失敗しました。', 'error');
        if (window.console && typeof window.console.error === 'function')
        {
          window.console.error('[target-detail] failed to reload survey', error);
        }
      }
    }

    normalizeSurvey(list)
    {
      var helpers = this.helpers;
      return list.map(function (raw)
      {
        var surveyCode = normalizeText(raw && raw.surveyCode);
        var recipients = this.normalizeRecipients(raw && raw.recipients);
        var acknowledgedCount = recipients.filter(function (recipient)
        {
          return recipient && recipient.acknowledgedAt;
        }).length;
        var recipientCount = Number(raw && raw.recipientCount ? raw.recipientCount : recipients.length);
        if (!Number.isFinite(recipientCount) || recipientCount < 0)
        {
          recipientCount = recipients.length;
        }
        var rawId = raw && (raw.id || raw.surveyCode);
        var normalizedId = normalizeText(rawId);
        return {
          id: normalizedId,
          surveyCode: surveyCode || normalizedId,
          title: normalizeText(raw && raw.title) || '（無題）',
          content: formatContent(raw && (raw.content || raw.body || raw.message || '')),
          startAt: normalizeText(raw && raw.startAt),
          endAt: normalizeText(raw && raw.endAt),
          startAtDisplay: formatDateTime(helpers, raw && raw.startAt),
          endAtDisplay: formatDateTime(helpers, raw && raw.endAt),
          createdAt: raw && raw.createdAt ? raw.createdAt : '',
          createdAtDisplay: formatDateTime(helpers, raw && raw.createdAt),
          createdByDisplayName: normalizeText(raw && (raw.createdByDisplayName || raw.createdByUserDisplayName)),
          createdByUserCode: normalizeText(raw && raw.createdByUserCode),
          createdByAvatarUrl: normalizeText(raw && raw.createdByAvatarUrl),
          createdByAvatarTransform: normalizeText(raw && raw.createdByAvatarTransform),
          createdByAvatarInitial: normalizeText(raw && raw.createdByAvatarInitial),
          createdByIsActive: raw && raw.createdByIsActive !== false,
          acknowledgedCount: acknowledgedCount,
          recipientCount: recipientCount > 0 ? recipientCount : 0,
          acknowledgedRate: recipientCount > 0 ? Math.round((acknowledgedCount / recipientCount) * 100) : 0,
          recipients: recipients,
          items: this.normalizeSurveyItems(raw && raw.items ? raw.items : [])
        };
      }, this);
    }

    normalizeRecipients(list)
    {
      var seen = Object.create(null);
      var recipients = [];
      (Array.isArray(list) ? list : []).forEach(function (entry, index)
      {
        var normalized = normalizeRecipient(entry);
        if (!normalized)
        {
          return;
        }
        if (!normalized.selectionKey && entry && entry.selectionKey)
        {
          normalized.selectionKey = normalizeText(entry.selectionKey);
        }
        if (!normalized.selectionKey && (normalized.isGuest || isGuestUser(entry)))
        {
          normalized.selectionKey = (normalized.userCode || normalized.displayName || 'guest') + ':' + index;
        }
        var key = buildAudienceKey(normalized);
        var isGuest = normalized.isGuest || isGuestUser(entry);
        if (key && seen[key] && !isGuest)
        {
          return;
        }
        if (key)
        {
          seen[key] = true;
        }
        recipients.push(normalized);
      });
      return recipients;
    }

    renderFilters()
    {
      var filters = document.createElement('div');
      filters.className = 'target-reference__controls target-reference__filters target-survey__filters';

      var acknowledgedFilter = this.createToggleFilter(
        '回答済みの表示',
        'acknowledgedFilter',
        this.state.filters && this.state.filters.showAcknowledged !== false,
        (shouldShow) =>
        {
          this.state.filters.showAcknowledged = shouldShow;
          this.renderList();
        }
      );
      filters.appendChild(acknowledgedFilter);

      var periodFilter = this.createToggleFilter(
        '期間外の表示',
        'periodFilter',
        this.state.filters && this.state.filters.showOutOfPeriod !== false,
        (shouldShow) =>
        {
          this.state.filters.showOutOfPeriod = shouldShow;
          this.renderList();
        }
      );
      filters.appendChild(periodFilter);

      this.refs.filters = filters;
      return filters;
    }

    createToggleFilter(labelText, refKey, currentValue, onChange)
    {
      var wrapper = document.createElement('label');
      wrapper.className = 'target-reference__filter';
      wrapper.textContent = labelText;

      var select = document.createElement('select');
      select.className = 'target-reference__filter';
      select.setAttribute('aria-label', labelText);
      select.innerHTML = '<option value="show">する</option><option value="hide">しない</option>';
      select.value = currentValue ? 'show' : 'hide';
      select.addEventListener('change', () =>
      {
        if (typeof onChange === 'function')
        {
          onChange(select.value === 'show');
        }
      });

      wrapper.appendChild(document.createTextNode(' '));
      wrapper.appendChild(select);
      if (refKey)
      {
        this.refs[refKey] = select;
      }

      return wrapper;
    }

    syncFilterControls()
    {
      if (this.refs.acknowledgedFilter)
      {
        this.refs.acknowledgedFilter.value = this.state.filters && this.state.filters.showAcknowledged !== false
          ? 'show'
          : 'hide';
      }
      if (this.refs.periodFilter)
      {
        this.refs.periodFilter.value = this.state.filters && this.state.filters.showOutOfPeriod !== false
          ? 'show'
          : 'hide';
      }
    }

    applyListFilters(items)
    {
      var viewer = this.getViewerUserCode();
      var filters = this.state.filters || {};
      var showAcknowledged = filters.showAcknowledged !== false;
      var showOutOfPeriod = filters.showOutOfPeriod !== false;
      var now = Date.now();

      return (Array.isArray(items) ? items : []).filter((entry) =>
      {
        if (!entry)
        {
          return false;
        }
        if (!showOutOfPeriod && this.isSurveyActive(entry, now) === false)
        {
          return false;
        }
        if (!showAcknowledged && this.isSurveyAcknowledgedByUser(entry, viewer))
        {
          return false;
        }
        return true;
      });
    }

    isSurveyActive(item, nowValue)
    {
      return this.getSurveyPeriodState(item, nowValue) === 'active';
    }

    getSurveyPeriodState(item, nowValue)
    {
      var now = Number.isFinite(nowValue) ? nowValue : Date.now();
      var startAt = parseDate(item && item.startAt);
      if (startAt && startAt.getTime() > now)
      {
        return 'before';
      }
      var endAt = parseDate(item && item.endAt);
      if (endAt && endAt.getTime() < now)
      {
        return 'after';
      }
      return 'active';
    }

    isSurveyAcknowledgedByUser(item, userCode)
    {
      var recipient = this.findRecipientForUser(item, userCode);
      return Boolean(recipient && recipient.acknowledgedAt);
    }

    findRecipientForUser(item, userCode)
    {
      var normalizedUser = normalizeText(userCode).toLowerCase();
      if (!normalizedUser)
      {
        return null;
      }
      var recipients = Array.isArray(item && item.recipients) ? item.recipients : [];
      for (var i = 0; i < recipients.length; i += 1)
      {
        var recipient = recipients[i];
        if (!recipient)
        {
          continue;
        }
        var recipientCode = normalizeText(recipient.userCode || recipient.displayName).toLowerCase();
        if (recipientCode && recipientCode === normalizedUser)
        {
          return recipient;
        }
      }
      return null;
    }

    formatPeriodDisplay(item)
    {
      var startDisplay = item && item.startAtDisplay ? item.startAtDisplay : formatDateTime(this.helpers, item && item.startAt);
      var endDisplay = item && item.endAtDisplay ? item.endAtDisplay : formatDateTime(this.helpers, item && item.endAt);
      var startText = normalizeText(startDisplay);
      var endText = normalizeText(endDisplay);
      var segments = this.buildPeriodSegments(startText, endText);
      if (!segments)
      {
        return '';
      }
      if (!segments.start)
      {
        return segments.end;
      }
      if (!segments.end)
      {
        return segments.start;
      }
      return segments.start + ' ~ ' + segments.end;
    }

    buildPeriodSegments(startText, endText)
    {
      if (!startText && !endText)
      {
        return '';
      }
      return { start: startText, end: endText };
    }

    renderList()
    {
      if (!this.refs.list)
      {
        return;
      }
      this.syncFilterControls();
      var items = this.applyListFilters(this.state.items || []);
      this.refs.list.innerHTML = '';

      if (!items.length)
      {
        if (this.refs.empty)
        {
          this.refs.empty.hidden = false;
        }
        return;
      }
      if (this.refs.empty)
      {
        this.refs.empty.hidden = true;
      }

      var table = document.createElement('table');
      table.className = 'target-detail__survey-table';

      var thead = document.createElement('thead');
      thead.innerHTML = '' +
        '<tr>' +
        '<th scope="col">作成者</th>' +
        '<th scope="col">タイトル</th>' +
        '<th scope="col">期間</th>' +
        '<th scope="col">回答状況</th>' +
        '<th scope="col" class="target-reference__actions-header">' + (this.canManage ? '操作' : '回答') + '</th>' +
        '</tr>';
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      var self = this;
      items.forEach(function (item)
      {
        tbody.appendChild(self.createTableRow(item));
      });
      table.appendChild(tbody);
      this.refs.list.appendChild(table);
      this.bindAuthorPopovers(table);
    }

    createTableRow(item)
    {
      var row = document.createElement('tr');

      row.appendChild(this.renderAuthorCell(item));

      var titleCell = document.createElement('td');
      titleCell.className = 'target-detail__survey-content-cell';
      var title = document.createElement('p');
      title.className = 'target-detail__survey-content-title';
      title.textContent = item.title || '—';
      titleCell.appendChild(title);

      var preview = document.createElement('p');
      preview.className = 'target-detail__survey-content-preview';
      preview.textContent = item.content || '—';
      titleCell.appendChild(preview);
      row.appendChild(titleCell);

      row.appendChild(this.renderPeriodCell(item));

      if (this.canManage)
      {
        row.appendChild(this.renderProgressCell(item));
      }
      else
      {
        row.appendChild(this.renderViewerStatusCell(item));
      }
      if (this.canManage)
      {
        row.appendChild(this.renderActionsCell(item));
      }
      else
      {
        row.appendChild(this.renderResponseCell(item));
      }
      return row;
    }

    renderAuthorCell(item)
    {
      var cell = document.createElement('td');
      cell.className = 'target-detail__survey-author-cell';

      var author = document.createElement('div');
      author.className = 'target-detail__survey-author';
      var authorName = item.createdByDisplayName || item.createdByUserCode || '作成者';
      author.title = authorName;
      author.setAttribute('aria-label', authorName);

      var avatarHost = document.createElement('span');
      avatarHost.className = 'target-detail__survey-author-avatar c-user-avatar-host';
      avatarHost.setAttribute('role', 'button');
      avatarHost.tabIndex = 0;
      avatarHost.dataset.avatarName = authorName;
      avatarHost.dataset.avatarAlt = avatarHost.dataset.avatarName;
      if (item.createdByUserCode)
      {
        avatarHost.dataset.userCode = item.createdByUserCode;
      }
      avatarHost.dataset.userActive = item && item.createdByIsActive === false ? 'false' : 'true';
      avatarHost.dataset.userDisplay = authorName;
      avatarHost.dataset.userName = authorName;
      avatarHost.dataset.userTooltip = authorName;
      avatarHost.dataset.userRole = '作成者';
      if (item && item.createdByAvatarUrl)
      {
        avatarHost.dataset.avatarSrc = item.createdByAvatarUrl;
      }
      if (item && item.createdByAvatarTransform)
      {
        avatarHost.dataset.avatarTransform = item.createdByAvatarTransform;
      }
      avatarHost.setAttribute('data--creator-avatar', 'true');
      avatarHost.title = authorName;
      this.renderAvatar(avatarHost, {
        name: avatarHost.dataset.avatarName,
        userCode: item.createdByUserCode,
        src: item.createdByAvatarUrl,
        transform: item.createdByAvatarTransform,
        initial: item.createdByAvatarInitial,
        isActive: item && item.createdByIsActive !== false
      }, { size: 36, nameOverlay: true });
      author.appendChild(avatarHost);

      var srName = document.createElement('span');
      srName.className = 'target-table__sr-only';
      srName.textContent = authorName;
      author.appendChild(srName);

      cell.appendChild(author);
      return cell;
    }

    renderPeriodCell(item)
    {
      var cell = document.createElement('td');
      cell.className = 'target-detail__survey-period-cell';
      var segments = this.buildPeriodSegments(
        item && item.startAtDisplay ? item.startAtDisplay : formatDateTime(this.helpers, item && item.startAt),
        item && item.endAtDisplay ? item.endAtDisplay : formatDateTime(this.helpers, item && item.endAt)
      );
      if (!segments)
      {
        cell.textContent = '—';
        return cell;
      }

      var wrapper = document.createElement('div');
      wrapper.className = 'target-detail__survey-period target-detail__survey-period-lines';

      if (segments.start)
      {
        var startLine = document.createElement('span');
        startLine.className = 'target-detail__survey-period-line';
        startLine.textContent = segments.start;
        wrapper.appendChild(startLine);
      }

      if (segments.start && segments.end)
      {
        var tilde = document.createElement('span');
        tilde.className = 'target-detail__survey-period-tilde';
        tilde.textContent = '~';
        wrapper.appendChild(tilde);
      }

      if (segments.end)
      {
        var endLine = document.createElement('span');
        endLine.className = 'target-detail__survey-period-line';
        endLine.textContent = segments.end;
        wrapper.appendChild(endLine);
      }

      cell.appendChild(wrapper);
      return cell;
    }

    renderProgressCell(item)
    {
      var cell = document.createElement('td');
      cell.className = 'target-detail__survey-progress-chart-cell';
      var meter = document.createElement('div');
      meter.className = 'target-detail__survey-progress-meter';
      meter.setAttribute('role', 'progressbar');
      meter.setAttribute('aria-valuemin', '0');
      meter.setAttribute('aria-valuemax', '100');
      var rate = Number(item && item.acknowledgedRate ? item.acknowledgedRate : 0);
      if (!Number.isFinite(rate) || rate < 0)
      {
        rate = 0;
      }
      if (rate > 100)
      {
        rate = 100;
      }
      meter.setAttribute('aria-valuenow', String(rate));

      var bar = document.createElement('div');
      bar.className = 'target-detail__survey-progress-bar';
      bar.style.width = rate + '%';
      meter.appendChild(bar);

      var percentage = document.createElement('span');
      percentage.className = 'target-detail__survey-progress-percentage';
      percentage.textContent = rate + '%';
      meter.appendChild(percentage);

      var summary = document.createElement('p');
      summary.className = 'target-detail__survey-ack-badge';
      summary.textContent = this.formatAcknowledgementStatus(item);

      cell.appendChild(meter);
      cell.appendChild(summary);
      return cell;
    }

    renderViewerStatusCell(item)
    {
      var cell = document.createElement('td');
      cell.className = 'target-detail__survey-progress-chart-cell target-detail__survey-status-cell';
      cell.textContent = this.formatViewerStatusText(item);
      return cell;
    }

    formatViewerStatusText(item)
    {
      var recipient = this.findRecipientForUser(item, this.getViewerUserCode());
      if (!recipient)
      {
        return '未回答';
      }
      var respondedText = normalizeText(recipient.respondedAtDisplay
        || formatDateTime(this.helpers, recipient.respondedAt));
      if (respondedText)
      {
        return '回答済み（' + respondedText + '）';
      }
      var answers = this.extractRecipientAnswers(recipient);
      if (Array.isArray(answers) && answers.length)
      {
        return '回答済み';
      }
      return '未回答';
    }

    renderActionsCell(item)
    {
      var cell = document.createElement('td');
      cell.className = 'target-detail__survey-action-group';

      var previewButton = this.createActionButton('preview', 'プレビュー', 'target-detail__survey-action target-detail__survey-action--preview');
      previewButton.addEventListener('click', (event) =>
      {
        event.preventDefault();
        this.handlePreview(item, previewButton);
      });
      cell.appendChild(previewButton);

      var detailButton = this.createActionButton('statistics', '集計', 'target-detail__survey-action target-detail__survey-action--statistics');
      detailButton.addEventListener('click', (event) =>
      {
        event.preventDefault();
        this.handleDetail(item, detailButton);
      });
      cell.appendChild(detailButton);

      var editButton = this.createActionButton('edit', '編集', 'target-detail__survey-action target-detail__survey-action--edit');
      editButton.disabled = !this.canManage;
      editButton.addEventListener('click', (event) =>
      {
        event.preventDefault();
        this.handleEdit(item, editButton);
      });
      cell.appendChild(editButton);

      var deleteButton = this.createActionButton('delete', '削除', 'target-detail__survey-action target-detail__survey-action--delete');
      deleteButton.disabled = !this.canManage;
      deleteButton.addEventListener('click', (event) =>
      {
        event.preventDefault();
        this.handleDelete(item, deleteButton);
      });
      cell.appendChild(deleteButton);

      return cell;
    }

    renderResponseCell(item)
    {
      var cell = document.createElement('td');
      cell.className = 'target-detail__survey-action-group target-detail__survey-response-cell';

      var periodState = this.getSurveyPeriodState(item);
      var canRespond = periodState === 'active';
      var label = periodState === 'before'
        ? '開始待ち'
        : periodState === 'after'
          ? '締め切り済み'
          : '回答フォームを表示する';

      if (this.isGuestViewer() && this.hasRespondedAsViewer(item))
      {
        canRespond = false;
        label = '回答済み';
      }

      var respondButton = this.createServiceActionButton('target-survey-response', {
        label: label,
        hoverLabel: label,
        ariaLabel: label,
        title: label
      });

      respondButton.disabled = !canRespond;
      respondButton.addEventListener('click', (event) =>
      {
        if (!canRespond)
        {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        this.handleResponse(item, respondButton);
      });

      cell.appendChild(respondButton);
      return cell;
    }

    bindAuthorPopovers(container)
    {
      var avatarService = this.getAvatarService();
      if (!avatarService || typeof avatarService.eventUpdate !== 'function')
      {
        return;
      }
      var anchors = (container || this.refs.list || document).querySelectorAll('.target-detail__survey-author-avatar');
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
        popover: { placement: 'top-start', offset: 10 }
      });
    }

    formatAcknowledgementStatus(item)
    {
      var total = Number(item && item.recipientCount ? item.recipientCount : 0);
      var acknowledged = Number(item && item.acknowledgedCount ? item.acknowledgedCount : 0);
      if (!total)
      {
        return '—';
      }
      if (acknowledged >= total)
      {
        acknowledged = total;
      }
      var rate = Number(item && item.acknowledgedRate ? item.acknowledgedRate : 0);
      if (!Number.isFinite(rate) || rate < 0)
      {
        rate = total ? Math.round((acknowledged / total) * 100) : 0;
      }
      if (rate > 100)
      {
        rate = 100;
      }
      return '回答数 ' + acknowledged + ' / ' + total + ' (' + rate + '%)';
    }

    async handleDetail(item, trigger)
    {
      if (!item)
      {
        return;
      }
      var modal = this.ensureDetailModal();
      modal.trigger = trigger || null;
      modal.hideStatus = false;
      var record = await this.loadSurveyDetail(item);
      modal.currentItem = record;
      this.renderDetailModal(record, modal);
      this.toggleDetailModal(modal, true);
    }

    async handlePreview(item, trigger)
    {
      if (!item)
      {
        return;
      }
      var modal = this.ensurePreviewModal();
      modal.trigger = trigger || null;
      var record = await this.loadSurveyDetail(item);
      modal.currentItem = record;
      this.renderPreviewModal(record, modal);
      this.togglePreviewModal(modal, true);
    }

    async handleResponse(item, trigger)
    {
      if (!item)
      {
        return;
      }
      var modal = this.ensureResponseModal();
      modal.trigger = trigger || null;
      modal.responseUserCode = this.getViewerUserCode();
      var record = await this.loadSurveyDetail(item);
      modal.currentItem = record;
      this.renderResponseModal(record, modal);
      this.toggleResponseModal(modal, true);
    }

    async handleRecipientResponseEdit(item, recipient, trigger)
    {
      if (!this.canManage || !item || !recipient)
      {
        return;
      }
      var modal = this.ensureResponseEditModal();
      modal.trigger = trigger || null;
      modal.responseUserCode = recipient.userCode || recipient.displayName || '';
      var record = await this.loadSurveyDetail(item);
      modal.currentItem = record;
      this.renderResponseModal(record, modal);
      this.toggleResponseModal(modal, true);
    }

    async handleEdit(item, trigger)
    {
      if (!this.canManage)
      {
        return;
      }
      var modal = this.ensureFormModal();
      modal.trigger = trigger || null;
      var record = await this.loadSurveyDetail(item);
      this.openFormModal(modal, 'edit', record);
    }

    async handleDelete(item, button)
    {
      if (!this.canManage || !item || !item.id)
      {
        return;
      }
      var confirmed = await this.page.confirmDialogService.open('このアンケートを削除しますか？', { type: 'warning' });
      if (!confirmed)
      {
        return;
      }
      if (button)
      {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
      }
      this.setFeedback('アンケートを削除しています…', 'info');
      try
      {
        var numericId = Number(item.id);
        var deletePayload = { targetCode: this.page.state.targetCode };
        if (Number.isFinite(numericId) && numericId > 0)
        {
          deletePayload.id = numericId;
        }
        else if (item.surveyCode)
        {
          deletePayload.surveyCode = item.surveyCode;
        }
        else
        {
          deletePayload.surveyCode = item.id;
        }
        await this.page.callApi('TargetSurveyDelete', deletePayload, { requestType: 'TargetManagementSurvey' });
        this.state.items = this.state.items.filter(function (entry)
        {
          return entry && entry.id !== item.id;
        });
        if (Array.isArray(this.page.state.survey))
        {
          this.page.state.survey = this.page.state.survey.filter(function (entry)
          {
            return entry && (entry.id || entry.surveyCode) !== item.id;
          });
        }
        this.renderList();
        this.setFeedback('アンケートを削除しました。', 'success');
        this.page.showToast('success', 'アンケートを削除しました。');
      }
      catch (error)
      {
        this.setFeedback('アンケートの削除に失敗しました。', 'error');
        window.console.error('[target-detail] failed to delete survey', error);
        this.page.showToast('error', 'アンケートの削除に失敗しました。');
      }
      finally
      {
        if (button)
        {
          button.disabled = false;
          button.removeAttribute('aria-busy');
        }
      }
    }

    ensureDetailModal()
    {
      if (this.modals.detail)
      {
        return this.modals.detail;
      }
      var root = document.createElement('div');
      root.className = 'target-detail__survey-modal';
      root.setAttribute('hidden', 'hidden');
      root.innerHTML = '' +
        '<div class="target-detail__survey-overlay" data-modal-close></div>' +
        '<div class="target-detail__survey-dialog" role="dialog" aria-modal="true" aria-labelledby="target-announce-detail-title">' +
        '  <header class="target-detail__survey-dialog-header">' +
        '    <div>' +
        '      <h2 class="target-detail__survey-dialog-title" id="target-announce-detail-title"></h2>' +
        '      <p class="target-detail__survey-dialog-meta" data-survey-meta></p>' +
        '    </div>' +
        '    <button type="button" class="target-detail__survey-dialog-close" aria-label="閉じる">×</button>' +
        '  </header>' +
        '  <hr class="target-detail__survey-dialog-divider" />' +
        '  <div class="target-detail__survey-dialog-content" data-survey-content></div>' +
        '  <div class="target-detail__survey-status">' +
        '    <div class="target-detail__survey-status__header">' +
        '      <div class="target-detail__survey-status-header-main">' +
        '        <h3 class="target-detail__survey-status-title">回答状況</h3>' +
        '        <p class="target-detail__survey-status-summary" data-survey-status-summary></p>' +
        '      </div>' +
        '      <div class="target-detail__survey-status-header-actions" data-survey-status-actions></div>' +
        '    </div>' +
        '    <div class="target-detail__survey-status-filter" data-survey-filter hidden></div>' +
        '    <div class="target-detail__survey-status-table-wrapper">' +
        '      <table class="target-detail__survey-status-table">' +
        '        <thead data-survey-status-head></thead>' +
        '        <tbody data-survey-status-body></tbody>' +
        '      </table>' +
        '    </div>' +
        '  </div>' +
        '  <footer class="target-detail__survey-actions" data-survey-actions hidden>' +
        '    <p class="target-detail__survey-actions-text">内容を確認したら「確認しました」を押してください。</p>' +
        '    <div class="target-detail__survey-actions-buttons">' +
        '      <button type="button" class="btn btn--primary" data-survey-confirm>確認しました</button>' +
        '    </div>' +
        '  </footer>' +
        '</div>';
      document.body.appendChild(root);
      var overlay = root.querySelector('[data-modal-close]');
      var closeButton = root.querySelector('.target-detail__survey-dialog-close');
      var modal = {
        root: root,
        overlay: overlay,
        closeButton: closeButton,
        keyHandlerBound: false,
        title: root.querySelector('.target-detail__survey-dialog-title'),
        meta: root.querySelector('[data-survey-meta]'),
        content: root.querySelector('[data-survey-content]'),
        statusSummary: root.querySelector('[data-survey-status-summary]'),
        statusTable: root.querySelector('.target-detail__survey-status-table'),
        statusHead: root.querySelector('[data-survey-status-head]'),
        statusBody: root.querySelector('[data-survey-status-body]'),
        statusSection: root.querySelector('.target-detail__survey-status'),
        filterHost: root.querySelector('[data-survey-filter]'),
        statusActionsHost: root.querySelector('[data-survey-status-actions]'),
        actions: root.querySelector('[data-survey-actions]'),
        confirmButton: root.querySelector('[data-survey-confirm]'),
        remindButton: null,
        downloadButton: null,
        trigger: null,
        currentItem: null,
        hideStatus: false,
        surveyItems: [],
        visibleItemIds: null
      };

      var close = () => this.toggleDetailModal(modal, false);
      modal.handleKeydown = (event) =>
      {
        var key = event && (event.key || event.keyCode);
        var isEscape = key === 'Escape' || key === 'Esc' || key === 27;
        if (!isEscape)
        {
          return;
        }
        event.preventDefault();
        this.toggleDetailModal(modal, false);
      };
      if (overlay)
      {
        overlay.addEventListener('click', close);
      }
      if (closeButton)
      {
        closeButton.addEventListener('click', close);
      }
      if (modal.confirmButton)
      {
        modal.confirmButton.addEventListener('click', () =>
        {
          this.handleSurveyConfirm(modal);
        });
      }
      this.modals.detail = modal;
      return modal;
    }

    ensurePreviewModal()
    {
      if (this.modals.preview)
      {
        return this.modals.preview;
      }
      var root = document.createElement('div');
      root.className = 'target-detail__survey-modal';
      root.setAttribute('hidden', 'hidden');
      root.innerHTML = '' +
        '<div class="target-detail__survey-overlay" data-modal-close></div>' +
        '<div class="target-detail__survey-dialog" role="dialog" aria-modal="true" aria-labelledby="target-survey-preview-title">' +
        '  <header class="target-detail__survey-dialog-header">' +
        '    <div>' +
        '      <h2 class="target-detail__survey-dialog-title" id="target-survey-preview-title">アンケートプレビュー</h2>' +
        '      <p class="target-detail__survey-dialog-meta" data-survey-preview-meta></p>' +
        '    </div>' +
        '    <button type="button" class="target-detail__survey-dialog-close" aria-label="閉じる">×</button>' +
        '  </header>' +
        '  <hr class="target-detail__survey-dialog-divider" />' +
        '  <div class="target-detail__survey-dialog-content" data-survey-preview-content></div>' +
        '  <div class="target-detail__survey-preview-items" data-survey-preview-items></div>' +
        '</div>';
      document.body.appendChild(root);
      var overlay = root.querySelector('[data-modal-close]');
      var closeButton = root.querySelector('.target-detail__survey-dialog-close');
      var modal = {
        root: root,
        overlay: overlay,
        closeButton: closeButton,
        title: root.querySelector('#target-survey-preview-title'),
        meta: root.querySelector('[data-survey-preview-meta]'),
        content: root.querySelector('[data-survey-preview-content]'),
        items: root.querySelector('[data-survey-preview-items]'),
        trigger: null,
        currentItem: null
      };

      var close = () => this.togglePreviewModal(modal, false);
      if (overlay)
      {
        overlay.addEventListener('click', close);
      }
      if (closeButton)
      {
        closeButton.addEventListener('click', close);
      }
      this.modals.preview = modal;
      return modal;
    }

    createResponseModal(options)
    {
      var root = document.createElement('div');
      root.className = options && options.rootClass ? options.rootClass : 'target-detail__survey-modal target-detail__survey-response-modal';
      root.setAttribute('hidden', 'hidden');
      var titleId = options && options.titleId ? options.titleId : 'target-survey-response-title';
      root.innerHTML = '' +
        '<div class="target-detail__survey-overlay" data-modal-close></div>' +
        '<div class="target-detail__survey-response-dialog" role="dialog" aria-modal="true" aria-labelledby="' + titleId + '">' +
        '  <header class="target-detail__survey-dialog-header">' +
        '    <div>' +
        '      <h2 class="target-detail__survey-dialog-title" id="' + titleId + '">アンケート</h2>' +
        '      <p class="target-detail__survey-dialog-meta" data-survey-response-meta></p>' +
        '    </div>' +
        '    <button type="button" class="target-detail__survey-dialog-close" aria-label="閉じる">×</button>' +
        '  </header>' +
        '  <hr class="target-detail__survey-dialog-divider" />' +
        '  <div class="target-detail__survey-dialog-content" data-survey-response-content></div>' +
        '  <div class="target-detail__survey-response-extra" data-survey-response-extra></div>' +
        '  <div class="target-detail__survey-preview-items target-detail__survey-response-items" data-survey-response-items></div>' +
        '  <footer class="target-detail__survey-response-actions">' +
        '    <div class="target-detail__survey-response-submit" data-survey-response-submit></div>' +
        '  </footer>' +
        '</div>';
      document.body.appendChild(root);
      var overlay = root.querySelector('[data-modal-close]');
      var closeButton = root.querySelector('.target-detail__survey-dialog-close');
      var modal = {
        root: root,
        overlay: overlay,
        closeButton: closeButton,
        title: root.querySelector('#' + titleId),
        meta: root.querySelector('[data-survey-response-meta]'),
        content: root.querySelector('[data-survey-response-content]'),
        items: root.querySelector('[data-survey-response-items]'),
        extraHost: root.querySelector('[data-survey-response-extra]'),
        respondedAtInput: null,
        responseUserCode: null,
        submitHost: root.querySelector('[data-survey-response-submit]'),
        submitButton: null,
        trigger: null,
        currentItem: null,
        allowRespondedAtInput: Boolean(options && options.allowRespondedAtInput),
        submitLabel: options && options.submitLabel ? options.submitLabel : 'この内容で回答する'
      };

      var close = () => this.toggleResponseModal(modal, false);
      if (overlay)
      {
        overlay.addEventListener('click', close);
      }
      if (closeButton)
      {
        closeButton.addEventListener('click', close);
      }
      return modal;
    }

    ensureResponseModal()
    {
      if (this.modals.response)
      {
        return this.modals.response;
      }
      this.modals.response = this.createResponseModal({ allowRespondedAtInput: false, submitLabel: 'この内容で回答する' });
      return this.modals.response;
    }

    ensureResponseEditModal()
    {
      if (this.modals.responseEdit)
      {
        return this.modals.responseEdit;
      }
      this.modals.responseEdit = this.createResponseModal({
        allowRespondedAtInput: true,
        submitLabel: 'この内容で反映する',
        titleId: 'target-survey-response-edit-title',
        rootClass: 'target-detail__survey-modal target-detail__survey-response-modal target-detail__survey-response-edit-modal'
      });
      return this.modals.responseEdit;
    }

    ensureReminderModal()
    {
      if (this.modals.reminder)
      {
        return this.modals.reminder;
      }
      var root = document.createElement('div');
      root.className = 'target-detail__survey-modal target-detail__survey-reminder-modal';
      root.setAttribute('hidden', 'hidden');
      root.innerHTML = '' +
        '<div class="target-detail__survey-overlay" data-modal-close></div>' +
        '<div class="target-detail__survey-dialog" role="dialog" aria-modal="true" aria-labelledby="target-survey-reminder-title">' +
        '  <header class="target-detail__survey-dialog-header">' +
        '    <div>' +
        '      <h2 class="target-detail__survey-dialog-title" id="target-survey-reminder-title">アンケート</h2>' +
        '      <p class="target-detail__survey-dialog-meta" data-survey-reminder-meta></p>' +
        '    </div>' +
        '    <button type="button" class="target-detail__survey-dialog-close" aria-label="閉じる">×</button>' +
        '  </header>' +
        '  <hr class="target-detail__survey-dialog-divider" />' +
        '  <div class="target-detail__survey-dialog-content" data-survey-reminder-content></div>' +
        '  <footer class="target-detail__survey-actions target-detail__survey-reminder-actions">' +
        '    <div class="target-detail__survey-actions-buttons" data-survey-reminder-actions></div>' +
        '  </footer>' +
        '</div>';
      document.body.appendChild(root);
      var overlay = root.querySelector('[data-modal-close]');
      var closeButton = root.querySelector('.target-detail__survey-dialog-close');
      var modal = {
        root: root,
        overlay: overlay,
        closeButton: closeButton,
        title: root.querySelector('#target-survey-reminder-title'),
        meta: root.querySelector('[data-survey-reminder-meta]'),
        content: root.querySelector('[data-survey-reminder-content]'),
        actionsHost: root.querySelector('[data-survey-reminder-actions]'),
        confirmButton: null,
        trigger: null,
        currentItem: null
      };

      var close = () => this.toggleReminderModal(modal, false);
      if (overlay)
      {
        overlay.addEventListener('click', close);
      }
      if (closeButton)
      {
        closeButton.addEventListener('click', close);
      }
      this.modals.reminder = modal;
      return modal;
    }

    lockBodyScroll()
    {
      if (document && document.body)
      {
        document.body.classList.add('is-modal-open');
      }
    }

    unlockBodyScroll()
    {
      if (!document || !document.body)
      {
        return;
      }
      var stillOpen = document.querySelector('.screen-modal.is-open, .c-help-modal.is-open, [data-modal-open="true"], .target-detail__survey-modal[data-open="true"]');
      if (stillOpen)
      {
        return;
      }
      document.body.classList.remove('is-modal-open');
    }

    toggleDetailModal(modal, open)
    {
      if (!modal)
      {
        return;
      }
      if (open)
      {
        modal.root.removeAttribute('hidden');
        modal.root.dataset.open = 'true';
        modal.root.classList.add('is-open');
        this.lockBodyScroll();
        if (modal.handleKeydown && !modal.keyHandlerBound)
        {
          document.addEventListener('keydown', modal.handleKeydown);
          modal.keyHandlerBound = true;
        }
        if (modal.closeButton && typeof modal.closeButton.focus === 'function')
        {
          modal.closeButton.focus();
        }
      }
      else
      {
        modal.root.setAttribute('hidden', 'hidden');
        modal.root.classList.remove('is-open');
        modal.root.removeAttribute('data-open');
        if (modal.handleKeydown && modal.keyHandlerBound)
        {
          document.removeEventListener('keydown', modal.handleKeydown);
          modal.keyHandlerBound = false;
        }
        this.unlockBodyScroll();
        if (modal.trigger && typeof modal.trigger.focus === 'function')
        {
          modal.trigger.focus();
        }
      }
    }

    togglePreviewModal(modal, open)
    {
      if (!modal)
      {
        return;
      }
      if (open)
      {
        modal.root.removeAttribute('hidden');
        modal.root.dataset.open = 'true';
        modal.root.classList.add('is-open');
        this.lockBodyScroll();
        if (modal.closeButton && typeof modal.closeButton.focus === 'function')
        {
          modal.closeButton.focus();
        }
      }
      else
      {
        modal.root.setAttribute('hidden', 'hidden');
        modal.root.classList.remove('is-open');
        modal.root.removeAttribute('data-open');
        this.unlockBodyScroll();
        if (modal.trigger && typeof modal.trigger.focus === 'function')
        {
          modal.trigger.focus();
        }
      }
    }

    toggleResponseModal(modal, open)
    {
      if (!modal)
      {
        return;
      }
      if (open)
      {
        modal.root.removeAttribute('hidden');
        modal.root.dataset.open = 'true';
        modal.root.classList.add('is-open');
        this.lockBodyScroll();
        if (modal.closeButton && typeof modal.closeButton.focus === 'function')
        {
          modal.closeButton.focus();
        }
      }
      else
      {
        modal.root.setAttribute('hidden', 'hidden');
        modal.root.classList.remove('is-open');
        modal.root.removeAttribute('data-open');
        this.unlockBodyScroll();
        if (modal.trigger && typeof modal.trigger.focus === 'function')
        {
          modal.trigger.focus();
        }
      }
    }

    toggleReminderModal(modal, open)
    {
      if (!modal)
      {
        return;
      }
      if (open)
      {
        modal.root.removeAttribute('hidden');
        modal.root.dataset.open = 'true';
        modal.root.classList.add('is-open');
        this.lockBodyScroll();
        if (modal.closeButton && typeof modal.closeButton.focus === 'function')
        {
          modal.closeButton.focus();
        }
      }
      else
      {
        modal.root.setAttribute('hidden', 'hidden');
        modal.root.classList.remove('is-open');
        modal.root.removeAttribute('data-open');
        this.unlockBodyScroll();
        if (modal.trigger && typeof modal.trigger.focus === 'function')
        {
          modal.trigger.focus();
        }
      }
    }

    renderDetailModal(item, modal, options)
    {
      if (!modal)
      {
        return;
      }
      var opts = options || {};
      var hideStatus = Boolean(opts.hideStatus || modal.hideStatus);
      modal.hideStatus = hideStatus;
      modal.currentItem = item || null;
      var recipients = Array.isArray(item && item.recipients) ? item.recipients : [];
      if (modal.title)
      {
        modal.title.textContent = item && item.title ? item.title : 'アンケート詳細';
      }
      if (modal.meta)
      {
        modal.meta.innerHTML = '';
        var metaAuthor = document.createElement('span');
        metaAuthor.className = 'target-detail__survey-dialog-author';
        var avatarHost = document.createElement('span');
        avatarHost.className = 'target-detail__survey-author-avatar target-detail__survey-dialog-author-avatar c-user-avatar-host';
        var authorName = item && (item.createdByDisplayName || item.createdByUserCode) ? (item.createdByDisplayName || item.createdByUserCode) : '作成者';
        avatarHost.dataset.avatarName = authorName;
        avatarHost.dataset.avatarAlt = authorName;
        if (item && item.createdByUserCode)
        {
          avatarHost.dataset.userCode = item.createdByUserCode;
        }
        avatarHost.dataset.userActive = item && item.createdByIsActive === false ? 'false' : 'true';
        this.renderAvatar(avatarHost, {
          name: authorName,
          userCode: item && item.createdByUserCode,
          src: item && item.createdByAvatarUrl,
          transform: item && item.createdByAvatarTransform,
          initial: item && item.createdByAvatarInitial,
          isActive: item && item.createdByIsActive !== false
        }, { size: 32, nameOverlay: false });
        metaAuthor.appendChild(avatarHost);

        var authorId = document.createElement('span');
        authorId.className = 'target-detail__survey-dialog-author-id';
        authorId.textContent = item && item.createdByUserCode ? item.createdByUserCode : '—';
        metaAuthor.appendChild(authorId);
        modal.meta.appendChild(metaAuthor);

        var dateText = item && item.createdAtDisplay ? item.createdAtDisplay : '';
        if (dateText)
        {
          var date = document.createElement('span');
          date.className = 'target-detail__survey-dialog-date';
          date.textContent = dateText;
          modal.meta.appendChild(date);
        }
        var periodText = this.formatPeriodDisplay(item);
        if (periodText)
        {
          var period = document.createElement('span');
          period.className = 'target-detail__survey-dialog-period';
          period.textContent = periodText;
          modal.meta.appendChild(period);
        }
      }
      if (modal.content)
      {
        modal.content.innerHTML = '';
        var contentSection = document.createElement('div');
        contentSection.className = 'target-detail__survey-dialog-section';
        var contentBody = document.createElement('div');
        contentBody.className = 'target-detail__survey-dialog-body';
        var contentText = item && item.content ? item.content : '';
        if (contentText)
        {
          contentText.split(/\n/).forEach(function (line)
          {
            var paragraph = document.createElement('p');
            paragraph.textContent = line;
            contentBody.appendChild(paragraph);
          });
        }
        else
        {
          var empty = document.createElement('p');
          empty.className = 'target-detail__survey-detail-empty';
          empty.textContent = '内容がありません。';
          contentBody.appendChild(empty);
        }
        contentSection.appendChild(contentBody);
        modal.content.appendChild(contentSection);
      }
      if (modal.statusSection)
      {
        if (hideStatus)
        {
          modal.statusSection.setAttribute('hidden', 'hidden');
        }
        else
        {
          modal.statusSection.removeAttribute('hidden');
        }
      }
      modal.surveyItems = this.normalizeSurveyItems(item && item.items ? item.items : []);
      if (!modal.visibleItemIds)
      {
        modal.visibleItemIds = modal.surveyItems.map(function (entry)
        {
          return entry && entry.id;
        }).filter(Boolean);
      }
      else
      {
        var existing = this.getVisibleSurveyItems(modal).map(function (entry)
        {
          return entry && entry.id;
        }).filter(Boolean);
        if (existing.length)
        {
          modal.visibleItemIds = existing;
        }
        else
        {
          modal.visibleItemIds = modal.surveyItems.map(function (entry)
          {
            return entry && entry.id;
          }).filter(Boolean);
        }
      }
      if (!hideStatus && modal.statusSummary)
      {
        modal.statusSummary.textContent = this.formatAcknowledgementStatus(item);
      }
      this.renderStatusActions(modal, hideStatus);
      if (!hideStatus)
      {
        this.renderStatusFilter(modal);
        this.renderStatusTable(modal, recipients);
      }
      this.updateDetailModalActions(modal, item);
    }

    renderPreviewModal(item, modal)
    {
      if (!modal)
      {
        return;
      }
      modal.currentItem = item || null;
      if (modal.title)
      {
        modal.title.textContent = item && item.title ? item.title : 'アンケートプレビュー';
      }
      if (modal.meta)
      {
        modal.meta.innerHTML = '';
        var authorName = item && (item.createdByDisplayName || item.createdByUserCode)
          ? (item.createdByDisplayName || item.createdByUserCode)
          : '作成者';
        var metaAuthor = document.createElement('span');
        metaAuthor.className = 'target-detail__survey-dialog-author';
        var avatarHost = document.createElement('span');
        avatarHost.className = 'target-detail__survey-author-avatar target-detail__survey-dialog-author-avatar c-user-avatar-host';
        avatarHost.dataset.avatarName = authorName;
        avatarHost.dataset.avatarAlt = authorName;
        if (item && item.createdByUserCode)
        {
          avatarHost.dataset.userCode = item.createdByUserCode;
        }
        avatarHost.dataset.userActive = item && item.createdByIsActive === false ? 'false' : 'true';
        this.renderAvatar(avatarHost, {
          name: authorName,
          userCode: item && item.createdByUserCode,
          src: item && item.createdByAvatarUrl,
          transform: item && item.createdByAvatarTransform,
          initial: item && item.createdByAvatarInitial,
          isActive: item && item.createdByIsActive !== false
        }, { size: 32, nameOverlay: false });
        metaAuthor.appendChild(avatarHost);
        var authorId = document.createElement('span');
        authorId.className = 'target-detail__survey-dialog-author-id';
        authorId.textContent = item && item.createdByUserCode ? item.createdByUserCode : '—';
        metaAuthor.appendChild(authorId);
        modal.meta.appendChild(metaAuthor);

        var dateText = item && item.createdAtDisplay ? item.createdAtDisplay : '';
        if (dateText)
        {
          var date = document.createElement('span');
          date.className = 'target-detail__survey-dialog-date';
          date.textContent = dateText;
          modal.meta.appendChild(date);
        }
      }
      if (modal.content)
      {
        modal.content.innerHTML = '';
        var contentSection = document.createElement('div');
        contentSection.className = 'target-detail__survey-dialog-section';
        var contentBody = document.createElement('div');
        contentBody.className = 'target-detail__survey-dialog-body';
        var contentText = item && item.content ? item.content : '';
        if (contentText)
        {
          contentText.split(/\n/).forEach(function (line)
          {
            var paragraph = document.createElement('p');
            paragraph.textContent = line;
            contentBody.appendChild(paragraph);
          });
        }
        else
        {
          var empty = document.createElement('p');
          empty.className = 'target-detail__survey-detail-empty';
          empty.textContent = '内容がありません。';
          contentBody.appendChild(empty);
        }
        contentSection.appendChild(contentBody);
        modal.content.appendChild(contentSection);
      }
      if (modal.items)
      {
        modal.items.innerHTML = '';
        var items = Array.isArray(item && item.items) ? item.items : [];
        var normalizedItems = this.normalizeSurveyItems(items);
        if (modal)
        {
          modal.surveyItems = normalizedItems;
        }
        var answerUserCode = modal && modal.responseUserCode ? modal.responseUserCode : this.getViewerUserCode();
        var answerLookup = this.getAnswerLookupForUser(item, answerUserCode);
        if (!normalizedItems.length)
        {
          var emptyItems = document.createElement('p');
          emptyItems.className = 'target-detail__survey-detail-empty';
          emptyItems.textContent = '設問は設定されていません。';
          modal.items.appendChild(emptyItems);
        }
        else
        {
          modal.items.appendChild(this.renderSurveyItemPreviewList(normalizedItems, answerLookup));
        }
      }
    }

    renderResponseModal(item, modal)
    {
      if (modal)
      {
        modal.surveyItems = this.normalizeSurveyItems(item && item.items ? item.items : []);
        if (!modal.responseUserCode)
        {
          modal.responseUserCode = this.getViewerUserCode();
        }
      }
      this.renderPreviewModal(item, modal);
      this.renderResponseMetadata(modal);
      this.renderResponseActions(modal);
    }

    renderResponseMetadata(modal)
    {
      if (!modal || !modal.extraHost)
      {
        return;
      }
      modal.extraHost.innerHTML = '';
      modal.respondedAtInput = null;
      if (!modal.allowRespondedAtInput)
      {
        modal.extraHost.hidden = true;
        return;
      }
      modal.extraHost.hidden = false;
      var userCode = modal.responseUserCode || this.getViewerUserCode();
      var recipient = this.findRecipientForUser(modal.currentItem, userCode);

      var field = document.createElement('div');
      field.className = 'target-detail__survey-response-field';

      var label = document.createElement('label');
      label.className = 'target-detail__survey-response-label';
      label.textContent = '回答日時';
      label.htmlFor = 'target-survey-response-at';
      field.appendChild(label);

      var input = document.createElement('input');
      input.type = 'datetime-local';
      input.id = 'target-survey-response-at';
      input.className = 'user-management__input target-detail__survey-response-at';
      input.value = formatInputDateTime(recipient && recipient.respondedAt);
      field.appendChild(input);
      modal.respondedAtInput = input;

      modal.extraHost.appendChild(field);
    }

    renderReminderModal(item, modal)
    {
      if (!modal)
      {
        return;
      }
      modal.currentItem = item || null;
      if (modal.title)
      {
        modal.title.textContent = item && item.title ? item.title : 'アンケート';
      }
      if (modal.meta)
      {
        modal.meta.textContent = this.formatPeriodDisplay(item) || '';
      }
      if (modal.content)
      {
        modal.content.innerHTML = '';
        var contentSection = document.createElement('div');
        contentSection.className = 'target-detail__survey-dialog-section';
        var contentBody = document.createElement('div');
        contentBody.className = 'target-detail__survey-dialog-body';
        var message = item && item.content ? item.content : '';
        var lines = message ? message.split(/\n/) : [];
        if (!lines.length)
        {
          lines = ['アンケートへの回答をお願いします。'];
        }
        lines.forEach(function (line)
        {
          var paragraph = document.createElement('p');
          paragraph.textContent = line;
          contentBody.appendChild(paragraph);
        });
        contentSection.appendChild(contentBody);
        modal.content.appendChild(contentSection);
      }
      if (modal.actionsHost)
      {
        modal.actionsHost.innerHTML = '';
        var confirmButton = modal.confirmButton;
        if (!confirmButton)
        {
          confirmButton = this.createServiceActionButton('target-reference-refresh', {
            label: '確認済みにする',
            hoverLabel: '確認済みにする',
            ariaLabel: '確認済みにする',
            title: '確認済みにする'
          });
          confirmButton.classList.add('target-detail__survey-reminder-confirm');
          confirmButton.addEventListener('click', () =>
          {
            this.handleReminderConfirm(modal);
          });
          modal.confirmButton = confirmButton;
        }
        confirmButton.disabled = false;
        confirmButton.removeAttribute('aria-busy');
        modal.actionsHost.appendChild(confirmButton);
      }
    }

    renderResponseActions(modal)
    {
      if (!modal || !modal.submitHost)
      {
        return;
      }
      modal.submitHost.innerHTML = '';
      var submitLabel = modal.submitLabel || 'この内容で回答する';
      var submitButton = this.createServiceActionButton('target-survey-response', {
        label: submitLabel,
        hoverLabel: submitLabel,
        ariaLabel: submitLabel,
        title: submitLabel
      });
      modal.submitButton = submitButton;
      if (this.isGuestViewer() && this.hasRespondedAsViewer(modal.currentItem))
      {
        submitButton.disabled = true;
        submitButton.title = 'ゲストユーザーによる回答は再編集できません。';
        submitButton.setAttribute('aria-disabled', 'true');
      }
      submitButton.addEventListener('click', (event) =>
      {
        event.preventDefault();
        this.handleResponseSubmit(modal);
      });
      modal.submitHost.appendChild(submitButton);
    }

    renderSurveyItemPreviewList(items, answerLookup)
    {
      var list = document.createElement('ol');
      list.className = 'target-detail__survey-preview-list';
      var entries = Array.isArray(items) ? items : [];
      for (var i = 0; i < entries.length; i += 1)
      {
        var entry = entries[i];
        var item = document.createElement('li');
        item.className = 'target-detail__survey-preview-item';
        item.dataset.surveyItemId = entry && entry.id ? entry.id : '';
        item.dataset.surveyItemKind = entry && entry.type ? entry.type : '';

        var heading = document.createElement('div');
        heading.className = 'target-detail__survey-preview-heading';
        var title = document.createElement('span');
        title.className = 'target-detail__survey-preview-title';
        title.textContent = entry && entry.title ? entry.title : '設問 ' + (i + 1);
        heading.appendChild(title);

        var typeBadge = document.createElement('span');
        typeBadge.className = 'target-detail__survey-preview-type';
        typeBadge.textContent = this.getSurveyItemTypeLabel(entry && entry.type);
        heading.appendChild(typeBadge);

        item.appendChild(heading);

        var description = document.createElement('p');
        description.className = 'target-detail__survey-preview-description';
        description.textContent = entry && entry.description ? entry.description : '—';
        item.appendChild(description);

        var lookup = answerLookup && entry && entry.id ? answerLookup[entry.id] : null;
        var field = this.renderSurveyItemPreviewField(entry, i, lookup);
        if (field)
        {
          item.appendChild(field);
        }

        list.appendChild(item);
      }
      return list;
    }

    renderSurveyItemPreviewField(entry, index, answer)
    {
      var type = String(entry && entry.type || '').toLowerCase();
      if (type === 'choicesingle' || type === 'choicemultiple')
      {
        var choices = Array.isArray(entry && entry.choices) ? entry.choices : [];
        if (!choices.length)
        {
          return null;
        }
        var options = document.createElement('div');
        options.className = 'target-detail__survey-preview-field';
        var choiceList = document.createElement('div');
        choiceList.className = 'target-detail__survey-preview-choices';
        var name = 'survey-preview-' + (entry && entry.id ? entry.id : (index + 1));
        var normalizedAnswer = this.normalizeAnswerInput(answer);
        var selectedValues = Array.isArray(normalizedAnswer && normalizedAnswer.values) ? normalizedAnswer.values : [];
        var selectedValue = selectedValues.length ? selectedValues[0] : normalizeText(normalizedAnswer && normalizedAnswer.text);
        for (var i = 0; i < choices.length; i += 1)
        {
          var normalizedChoice = choices[i] || {};
          var option = document.createElement('label');
          option.className = 'target-detail__survey-preview-choice';
          var input = document.createElement('input');
          input.type = type === 'choicemultiple' ? 'checkbox' : 'radio';
          input.name = name;
          input.value = normalizedChoice.value || normalizedChoice.title || '';
          if (type === 'choicemultiple')
          {
            input.checked = selectedValues.indexOf(normalizeText(input.value)) >= 0;
          }
          else
          {
            input.checked = selectedValue && normalizeText(input.value) === normalizeText(selectedValue);
          }
          var label = document.createElement('span');
          label.className = 'target-detail__survey-preview-choice-label';
          label.textContent = normalizedChoice && normalizedChoice.title ? normalizedChoice.title : '選択肢';
          option.appendChild(input);
          option.appendChild(label);
          choiceList.appendChild(option);
        }
        options.appendChild(choiceList);
        return options;
      }

      var container = document.createElement('div');
      container.className = 'target-detail__survey-preview-field';
      var textarea = document.createElement('textarea');
      textarea.className = 'user-management__input target-detail__survey-preview-textarea';
      textarea.rows = entry && entry.rows ? entry.rows : 5;
      var normalizedText = this.normalizeAnswerInput(answer).text;
      textarea.placeholder = 'ここに回答を入力';
      textarea.value = normalizedText || '';
      container.appendChild(textarea);
      return container;
    }

    getSurveyItemTypeLabel(type)
    {
      var normalized = String(type || '').toLowerCase();
      if (normalized === 'choicesingle')
      {
        return '単一選択';
      }
      if (normalized === 'choicemultiple')
      {
        return '複数選択';
      }
      return '自由記述';
    }

    isSurveyPendingForUser(item, userCode)
    {
      if (!this.isSurveyActive(item))
      {
        return false;
      }
      var normalizedUser = normalizeText(userCode).toLowerCase();
      if (!item || !normalizedUser)
      {
        return false;
      }
      var recipients = Array.isArray(item.recipients) ? item.recipients : [];
      return recipients.some(function (recipient)
      {
        if (!recipient)
        {
          return false;
        }
        var recipientCode = normalizeText(recipient.userCode || recipient.displayName).toLowerCase();
        return recipientCode && recipientCode === normalizedUser
          && !recipient.acknowledgedAt
          && recipient.hasAcknowledgement;
      });
    }

    updateDetailModalActions(modal, item)
    {
      if (!modal)
      {
        return;
      }
      var viewer = this.getViewerUserCode();
      var pending = this.isSurveyPendingForUser(item, viewer);
      var isProcessing = item && this.state.acknowledgingId === item.id;
      if (modal.actions)
      {
        modal.actions.hidden = Boolean(modal.hideStatus) || !pending;
      }
      if (modal.confirmButton)
      {
        modal.confirmButton.disabled = !pending || isProcessing;
        if (isProcessing)
        {
          modal.confirmButton.setAttribute('aria-busy', 'true');
        }
        else
        {
          modal.confirmButton.removeAttribute('aria-busy');
        }
      }
    }

    renderStatusFilter(modal)
    {
      if (!modal || !modal.filterHost)
      {
        return;
      }
      var host = modal.filterHost;
      var items = Array.isArray(modal.surveyItems) ? modal.surveyItems : [];
      host.innerHTML = '';
      if (!items.length)
      {
        host.hidden = true;
        return;
      }
      host.hidden = false;
      var list = document.createElement('div');
      list.className = 'target-detail__survey-filter-list';

      var heading = document.createElement('p');
      heading.className = 'target-detail__survey-filter-title';
      heading.textContent = '表示項目';
      host.appendChild(heading);

      var self = this;
      items.forEach(function (item, index)
      {
        var option = document.createElement('label');
        option.className = 'target-detail__survey-filter-option';

        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'target-detail__survey-filter-checkbox';
        checkbox.checked = self.isSurveyItemVisible(modal, item.id);
        checkbox.id = 'survey-filter-' + (item.id || index);
        checkbox.addEventListener('change', function ()
        {
          self.toggleSurveyItemVisibility(modal, item.id, checkbox.checked);
          self.renderStatusTable(modal, modal.currentItem && modal.currentItem.recipients ? modal.currentItem.recipients : []);
        });
        option.appendChild(checkbox);

        var label = document.createElement('span');
        label.className = 'target-detail__survey-filter-label';
        label.textContent = item && item.title ? item.title : '項目 ' + (index + 1);
        option.appendChild(label);

        list.appendChild(option);
      });

      host.appendChild(list);
    }

    isSurveyItemVisible(modal, itemId)
    {
      if (!modal)
      {
        return false;
      }
      var visibleIds = Array.isArray(modal.visibleItemIds) ? modal.visibleItemIds : [];
      if (!visibleIds.length)
      {
        return true;
      }
      return visibleIds.indexOf(itemId) >= 0;
    }

    toggleSurveyItemVisibility(modal, itemId, visible)
    {
      if (!modal)
      {
        return;
      }
      var ids = Array.isArray(modal.visibleItemIds) ? modal.visibleItemIds.slice() : [];
      if (visible)
      {
        if (ids.indexOf(itemId) < 0)
        {
          ids.push(itemId);
        }
      }
      else
      {
        ids = ids.filter(function (id)
        {
          return id !== itemId;
        });
        if (!ids.length)
        {
          ids = Array.isArray(modal.surveyItems)
            ? modal.surveyItems.map(function (entry)
            {
              return entry && entry.id;
            }).filter(Boolean)
            : [];
        }
      }
      modal.visibleItemIds = ids;
    }

    getVisibleSurveyItems(modal)
    {
      var items = Array.isArray(modal && modal.surveyItems) ? modal.surveyItems : [];
      var visibleIds = Array.isArray(modal && modal.visibleItemIds) ? modal.visibleItemIds : [];
      if (!visibleIds.length)
      {
        return items;
      }
      var lookup = visibleIds.reduce(function (map, id)
      {
        map[id] = true;
        return map;
      }, {});
      return items.filter(function (item)
      {
        return item && lookup[item.id];
      });
    }

    renderStatusActions(modal, hideStatus)
    {
      if (!modal || !modal.statusActionsHost)
      {
        return;
      }
      modal.statusActionsHost.hidden = Boolean(hideStatus);
      if (hideStatus)
      {
        modal.remindButton = null;
        modal.downloadButton = null;
        return;
      }
      modal.statusActionsHost.innerHTML = '';

      modal.remindButton = null;
      if (this.canManage)
      {
        var remindButton = this.createServiceActionButton('target-reference-refresh', {
          label: 'リマインドを送る',
          hoverLabel: 'リマインドを送る',
          ariaLabel: 'リマインドを送る',
          title: 'リマインドを送る',
          className: 'target-detail__survey-status-remind'
        });
        modal.remindButton = remindButton;
        var isReminding = modal.currentItem && this.state.remindingSurveyId === modal.currentItem.id;
        this.updateRemindButtonState(modal, isReminding);
        remindButton.addEventListener('click', (event) =>
        {
          event.preventDefault();
          this.openReminderSelectModal(modal);
        });
        modal.statusActionsHost.appendChild(remindButton);
      }

      var downloadButton = this.createServiceActionButton('survey-status-download', {
        label: 'CSVダウンロード',
        hoverLabel: 'CSVダウンロード',
        ariaLabel: '回答状況をCSVでダウンロード',
        title: '回答状況をCSVでダウンロード'
      });
      modal.downloadButton = downloadButton;
      var isDownloading = modal.currentItem && this.state.downloadingSurveyId === modal.currentItem.id;
      this.updateDownloadButtonState(modal, isDownloading);
      downloadButton.addEventListener('click', (event) =>
      {
        event.preventDefault();
        this.handleSurveyCsvDownload(modal);
      });
      modal.statusActionsHost.appendChild(downloadButton);
    }

    updateDownloadButtonState(modal, busy)
    {
      if (!modal || !modal.downloadButton)
      {
        return;
      }
      modal.downloadButton.disabled = Boolean(busy);
      if (busy)
      {
        modal.downloadButton.setAttribute('aria-busy', 'true');
      }
      else
      {
        modal.downloadButton.removeAttribute('aria-busy');
      }
    }

    updateRemindButtonState(modal, busy)
    {
      if (!modal || !modal.remindButton)
      {
        return;
      }
      modal.remindButton.disabled = Boolean(busy);
      if (busy)
      {
        modal.remindButton.setAttribute('aria-busy', 'true');
      }
      else
      {
        modal.remindButton.removeAttribute('aria-busy');
      }
    }

    renderStatusTable(modal, recipients)
    {
      if (!modal || !modal.statusHead || !modal.statusBody)
      {
        return;
      }
      var visibleItems = this.getVisibleSurveyItems(modal);

      modal.statusHead.innerHTML = '';
      var headerRow = document.createElement('tr');
      var userHeader = document.createElement('th');
      userHeader.scope = 'col';
      userHeader.textContent = 'ユーザー';
      headerRow.appendChild(userHeader);

      visibleItems.forEach(function (item, index)
      {
        var itemHeader = document.createElement('th');
        itemHeader.scope = 'col';
        itemHeader.textContent = item && item.title ? item.title : '項目 ' + (index + 1);
        headerRow.appendChild(itemHeader);
      });

      var dateHeader = document.createElement('th');
      dateHeader.scope = 'col';
      dateHeader.textContent = '回答日時';
      headerRow.appendChild(dateHeader);

      var remindHeader = document.createElement('th');
      remindHeader.scope = 'col';
      remindHeader.textContent = 'リマインド';
      headerRow.appendChild(remindHeader);

      var actionHeader = document.createElement('th');
      actionHeader.scope = 'col';
      actionHeader.className = 'target-detail__survey-status-action-header';
      actionHeader.textContent = 'アンケート';
      headerRow.appendChild(actionHeader);

      modal.statusHead.appendChild(headerRow);

      modal.statusBody.innerHTML = '';
      var rows = Array.isArray(recipients) ? recipients : [];
      if (!rows.length)
      {
        var emptyRow = document.createElement('tr');
        var cell = document.createElement('td');
        cell.colSpan = visibleItems.length + 4;
        cell.className = 'target-detail__survey-status-empty';
        cell.textContent = '対象ユーザーが設定されていません。';
        emptyRow.appendChild(cell);
        modal.statusBody.appendChild(emptyRow);
        return;
      }

      for (var i = 0; i < rows.length; i += 1)
      {
        modal.statusBody.appendChild(this.renderRecipientRow(rows[i], modal.currentItem, visibleItems));
      }
    }

    buildTargetParticipantLookup()
    {
      var target = this.page && this.page.state ? this.page.state.target : null;
      var sources = target && Array.isArray(target.participants) ? target.participants.slice() : [];
      var lookup = Object.create(null);
      sources.forEach(function (entry)
      {
        if (!entry)
        {
          return;
        }
        var code = normalizeText(entry.userCode || entry.code || entry.loginId || '');
        if (!code)
        {
          return;
        }
        var normalized = code.toLowerCase();
        if (!normalized)
        {
          return;
        }
        var isActive = entry.isActive !== false;
        var status = typeof entry.status === 'string' ? entry.status.toLowerCase() : '';
        if (entry.active === false || entry.active === 0 || entry.active === '0' || entry.active === 'false')
        {
          isActive = false;
        }
        if (entry.endedAt)
        {
          isActive = false;
        }
        if (status === 'inactive')
        {
          isActive = false;
        }
        lookup[normalized] = {
          userCode: code,
          displayName: normalizeText(entry.displayName || entry.userDisplayName || entry.name || code),
          mail: normalizeText(entry.mail || entry.mailAddress || ''),
          isActive: isActive
        };
      });
      return lookup;
    }

    getReminderCandidates(item)
    {
      var recipients = Array.isArray(item && item.recipients) ? item.recipients : [];
      var participants = this.buildTargetParticipantLookup();
      var seen = Object.create(null);
      var candidates = [];
      recipients.forEach(function (entry)
      {
        var normalized = normalizeRecipient(entry);
        if (!normalized || !normalized.userCode)
        {
          return;
        }
        if (normalized.role && normalized.role !== 'participant')
        {
          return;
        }
        var code = normalized.userCode;
        var key = code.toLowerCase();
        if (seen[key])
        {
          return;
        }
        var participant = participants[key];
        var isActive = normalized.isActive !== false;
        if (participant && participant.isActive === false)
        {
          isActive = false;
        }
        if (!isActive)
        {
          return;
        }
        seen[key] = true;
        candidates.push({
          displayName: normalized.displayName || code,
          userCode: code,
          mail: participant && participant.mail ? participant.mail : '',
          isActive: true
        });
      });
      return candidates;
    }

    getDefaultReminderSelection(item, candidates)
    {
      var available = Object.create(null);
      (Array.isArray(candidates) ? candidates : []).forEach(function (candidate)
      {
        var code = normalizeText(candidate && candidate.userCode);
        if (code)
        {
          available[code.toLowerCase()] = true;
        }
      });
      var recipients = Array.isArray(item && item.recipients) ? item.recipients : [];
      var defaults = [];
      recipients.forEach(function (recipient)
      {
        var normalized = normalizeRecipient(recipient);
        if (!normalized || !normalized.userCode)
        {
          return;
        }
        if (normalized.acknowledgedAt)
        {
          return;
        }
        if (normalized.role && normalized.role !== 'participant')
        {
          return;
        }
        var key = normalized.userCode.toLowerCase();
        if (available[key])
        {
          defaults.push(normalized.userCode);
        }
      });
      return defaults;
    }

    openReminderSelectModal(modal)
    {
      if (!modal || !modal.currentItem || !this.canManage)
      {
        return;
      }
      var service = this.getUserSelectModalService();
      if (!service || typeof service.open !== 'function')
      {
        this.page.showToast('error', 'リマインド送信モーダルを利用できません。');
        return;
      }
      var candidates = this.getReminderCandidates(modal.currentItem);
      if (!candidates.length)
      {
        this.page.showToast('info', 'リマインド可能なユーザーがいません。');
        return;
      }
      var modalOptions = {
        multiple: true,
        availableUsers: candidates,
        selectedCodes: this.getDefaultReminderSelection(modal.currentItem, candidates),
        onApply: (users) =>
        {
          this.handleSurveyReminderSend(modal, Array.isArray(users) ? users : []);
        },
        onClose: () =>
        {
          if (modal && modal.remindButton && typeof modal.remindButton.focus === 'function')
          {
            modal.remindButton.focus();
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
        window.console.error('[target-detail] failed to open reminder select modal', error);
        this.page.showToast('error', 'リマインド送信モーダルを開けませんでした。');
      }
    }

    async handleSurveyReminderSend(modal, users)
    {
      if (!modal || !modal.currentItem)
      {
        return;
      }
      var codes = (Array.isArray(users) ? users : []).map(function (user)
      {
        return normalizeText(user && (user.userCode || user.code));
      }).filter(Boolean);
      if (!codes.length)
      {
        this.page.showToast('info', 'リマインド対象が選択されていません。');
        return;
      }
      this.state.remindingSurveyId = modal.currentItem.id;
      this.updateRemindButtonState(modal, true);
      try
      {
        var response = await this.page.callApi('TargetSurveyRemind', {
          targetCode: this.page.state.targetCode,
          surveyCode: modal.currentItem.surveyCode || modal.currentItem.id,
          userCodes: codes
        }, { requestType: 'TargetManagementSurvey' });
        var updated = response && response.survey ? this.normalizeSurvey([response.survey])[0] : null;
        if (!updated)
        {
          await this.fetchAndRenderSurvey();
          updated = this.findSurveyById(modal.currentItem.id) || null;
        }
        if (updated)
        {
          this.replaceSurvey(updated);
          modal.currentItem = this.findSurveyById(updated.id) || updated;
          this.renderList();
          this.renderDetailModal(modal.currentItem, modal);
        }
        if (this.page.toastService && typeof this.page.toastService.success === 'function')
        {
          this.page.toastService.success('リマインドを送信しました。');
        }
        else if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('success', 'リマインドを送信しました。');
        }
      }
      catch (error)
      {
        if (window.console && typeof window.console.error === 'function')
        {
          window.console.error('[target-detail] failed to send survey reminder', error);
        }
        if (this.page.toastService && typeof this.page.toastService.error === 'function')
        {
          this.page.toastService.error('リマインドの送信に失敗しました。');
        }
        else if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('error', 'リマインドの送信に失敗しました。');
        }
      }
      this.state.remindingSurveyId = null;
      this.updateRemindButtonState(modal, false);
    }

    async handleSurveyCsvDownload(modal)
    {
      if (!modal || !modal.currentItem)
      {
        return;
      }
      var surveyCode = modal.currentItem.surveyCode || modal.currentItem.id;
      if (!surveyCode)
      {
        return;
      }

      this.state.downloadingSurveyId = modal.currentItem.id;
      this.updateDownloadButtonState(modal, true);

      try
      {
        var response = await this.page.callApi('TargetSurveyDownloadCSV', {
          targetCode: this.page.state.targetCode,
          surveyCode: surveyCode
        }, { requestType: 'TargetManagementSurvey' });

        var csvRaw = response && (response.csv || response.content || response.data);
        var csvContent = csvRaw == null ? '' : String(csvRaw);
        if (!csvContent.trim())
        {
          throw new Error('CSV content is empty');
        }

        var fileName = normalizeText(response && (response.fileName || response.filename));
        if (!fileName)
        {
          fileName = this.buildSurveyCsvFileName(modal.currentItem);
        }
        this.downloadCsvContent(csvContent, fileName);
        if (this.page.toastService && typeof this.page.toastService.success === 'function')
        {
          this.page.toastService.success('CSVをダウンロードしました。');
        }
      }
      catch (error)
      {
        if (window.console && typeof window.console.error === 'function')
        {
          window.console.error('[target-detail] failed to download survey csv', error);
        }
        if (this.page.toastService && typeof this.page.toastService.error === 'function')
        {
          this.page.toastService.error('CSVのダウンロードに失敗しました。');
        }
      }
      this.state.downloadingSurveyId = null;
      this.updateDownloadButtonState(modal, false);
    }

    buildSurveyCsvFileName(item)
    {
      var suffix = normalizeText(item && (item.surveyCode || item.id));
      if (!suffix)
      {
        suffix = 'survey';
      }
      return 'target-survey-' + suffix + '.csv';
    }

    downloadCsvContent(content, fileName)
    {
      var name = normalizeText(fileName) || 'survey.csv';
      var blob = new window.Blob([content], { type: 'text/csv;charset=utf-8;' });
      var link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(link.href);
    }

    extractRecipientAnswers(recipient)
    {
      if (!recipient)
      {
        return [];
      }
      if (Array.isArray(recipient.answers))
      {
        return recipient.answers;
      }
      if (Array.isArray(recipient.responses))
      {
        return recipient.responses;
      }
      if (Array.isArray(recipient.items))
      {
        return recipient.items;
      }
      if (recipient.answerMap && typeof recipient.answerMap === 'object')
      {
        return Object.keys(recipient.answerMap).map(function (key)
        {
          return { itemId: key, value: recipient.answerMap[key] };
        });
      }
      return [];
    }

    getAnswerLookupForUser(item, userCode)
    {
      var normalizedUser = normalizeText(userCode).toLowerCase();
      if (!item || !normalizedUser || !Array.isArray(item.recipients))
      {
        return {};
      }
      var recipient = item.recipients.find(function (entry)
      {
        if (!entry)
        {
          return false;
        }
        var code = normalizeText(entry.userCode || entry.displayName).toLowerCase();
        return code && code === normalizedUser;
      });
      if (!recipient)
      {
        return {};
      }
      var answers = this.extractRecipientAnswers(recipient);
      return answers.reduce(function (map, answer)
      {
        if (!answer)
        {
          return map;
        }
        var ids = [answer.itemId, answer.surveyItemId, answer.targetSurveyItemId, answer.id].map(function (value)
        {
          return value && String(value);
        }).filter(Boolean);
        if (!ids.length)
        {
          return map;
        }
        var key = ids[0];
        map[key] = answer;
        return map;
      }, {});
    }

    normalizeAnswerInput(answer)
    {
      var values = [];
      if (answer && Array.isArray(answer.values))
      {
        values = answer.values;
      }
      else if (answer && Array.isArray(answer.value))
      {
        values = answer.value;
      }
      else if (answer && Array.isArray(answer.choices))
      {
        values = answer.choices;
      }
      else if (answer && Array.isArray(answer.json))
      {
        values = answer.json;
      }
      else if (answer && typeof answer.json === 'string')
      {
        try
        {
          var parsed = JSON.parse(answer.json);
          if (Array.isArray(parsed))
          {
            values = parsed;
          }
        }
        catch (error)
        {
          values = [];
        }
      }

      var text = '';
      if (answer && typeof answer.text === 'string')
      {
        text = answer.text;
      }
      else if (answer && typeof answer.value === 'string')
      {
        text = answer.value;
      }
      else if (answer && typeof answer.answer === 'string')
      {
        text = answer.answer;
      }
      else if (typeof answer === 'string')
      {
        text = answer;
      }

      return {
        values: values.map(function (entry)
        {
          return normalizeText(entry);
        }).filter(Boolean),
        text: normalizeText(text)
      };
    }

    findAnswerForItem(answers, item)
    {
      if (!Array.isArray(answers) || !answers.length)
      {
        return null;
      }
      var itemId = item && item.id ? String(item.id) : '';
      for (var i = 0; i < answers.length; i += 1)
      {
        var answer = answers[i];
        if (!answer)
        {
          continue;
        }
        var ids = [answer.itemId, answer.surveyItemId, answer.targetSurveyItemId, answer.id].map(function (value)
        {
          return value && String(value);
        }).filter(Boolean);
        if (itemId && ids.indexOf(itemId) >= 0)
        {
          return answer;
        }
      }
      return null;
    }

    normalizeAnswerValue(answer, item)
    {
      var value = answer && (answer.value !== undefined ? answer.value : (answer.answer !== undefined ? answer.answer
        : (answer.response !== undefined ? answer.response : (answer.text !== undefined ? answer.text : answer.content))));
      var listValue = value && (Array.isArray(value) ? value : (Array.isArray(value && value.choices) ? value.choices : null));
      if (Array.isArray(listValue))
      {
        return listValue.map(function (entry)
        {
          if (entry && typeof entry === 'object')
          {
            return normalizeText(entry.title || entry.label || entry.value);
          }
          return normalizeText(entry);
        }).filter(Boolean).join('、');
      }
      var choiceList = answer && (Array.isArray(answer.choices) ? answer.choices : (Array.isArray(answer.selectedChoices)
        ? answer.selectedChoices : (Array.isArray(answer.options) ? answer.options : null)));
      if (Array.isArray(choiceList) && choiceList.length)
      {
        return choiceList.map(function (entry)
        {
          if (entry && typeof entry === 'object')
          {
            return normalizeText(entry.title || entry.label || entry.value);
          }
          return normalizeText(entry);
        }).filter(Boolean).join('、');
      }
      var mapped = value !== undefined && value !== null ? normalizeText(value) : '';
      if (mapped)
      {
        return mapped;
      }
      if (item && item.type && item.type.indexOf('choice') === 0 && Array.isArray(answer && answer.labels))
      {
        return answer.labels.map(function (label)
        {
          return normalizeText(label);
        }).filter(Boolean).join('、');
      }
      if (answer && answer.title)
      {
        return normalizeText(answer.title);
      }
      if (answer && answer.label)
      {
        return normalizeText(answer.label);
      }
      return '';
    }

    formatRecipientAnswer(recipient, item)
    {
      var answers = this.extractRecipientAnswers(recipient);
      var answer = this.findAnswerForItem(answers, item);
      var value = this.normalizeAnswerValue(answer, item);
      return value || '—';
    }

    renderRecipientRow(recipient, item, visibleItems)
    {
      var row = document.createElement('tr');
      var userCell = document.createElement('td');
      userCell.className = 'target-detail__survey-status-user-cell';
      var identity = document.createElement('div');
      identity.className = 'target-detail__survey-status-identity c-user-avatar-host';
      var avatar = document.createElement('span');
      avatar.className = 'target-detail__survey-status-avatar';
      this.renderAvatar(avatar, {
        name: recipient && (recipient.displayName || recipient.userCode),
        userCode: recipient && recipient.userCode,
        src: recipient && recipient.avatarUrl,
        initial: recipient && recipient.avatarInitial,
        isActive: recipient && recipient.isActive !== false
      }, { size: 32, nameOverlay: false });
      identity.appendChild(avatar);
      var text = document.createElement('div');
      text.className = 'target-detail__survey-status-text';
      var name = document.createElement('div');
      name.className = 'target-detail__survey-status-name';
      name.textContent = recipient && (recipient.displayName || recipient.userCode) ? (recipient.displayName || recipient.userCode) : 'ユーザー';
      var code = document.createElement('div');
      code.className = 'target-detail__survey-status-code';
      code.textContent = recipient && recipient.userCode ? recipient.userCode : '';
      text.appendChild(name);
      text.appendChild(code);
      identity.appendChild(text);
      userCell.appendChild(identity);
      row.appendChild(userCell);

      var items = Array.isArray(visibleItems) ? visibleItems : [];
      for (var i = 0; i < items.length; i += 1)
      {
        var answerCell = document.createElement('td');
        answerCell.className = 'target-detail__survey-answer-cell';
        answerCell.textContent = this.formatRecipientAnswer(recipient, items[i]);
        row.appendChild(answerCell);
      }

      var acknowledged = recipient && recipient.acknowledgedAt;
      var dateCell = document.createElement('td');
      dateCell.textContent = acknowledged ? formatDateTime(this.helpers, recipient.acknowledgedAt) : '—';
      row.appendChild(dateCell);

      var reminderCell = document.createElement('td');
      reminderCell.className = 'target-detail__survey-reminder-cell';
      var hasAcknowledgement = recipient && recipient.hasAcknowledgement;
      var reminderContent = document.createElement('div');
      reminderContent.className = 'target-detail__survey-reminder-actions';
      if (!hasAcknowledgement)
      {
        reminderContent.textContent = '—';
      }
      else if (acknowledged)
      {
        var reminderText = document.createElement('span');
        reminderText.className = 'target-detail__survey-reminder-text';
        reminderText.textContent = formatDateTime(this.helpers, recipient.acknowledgedAt);
        reminderContent.appendChild(reminderText);

        var reminderDelete = this.createServiceActionButton('delete', {
          label: '',
          ariaLabel: 'リマインド日時を削除',
          hoverLabel: 'リマインド日時を削除',
          title: 'リマインド日時を削除',
          className: 'target-detail__survey-status-action target-detail__survey-status-action--undo',
          hideLabel: true,
          buttonType: 'delete'
        });
        reminderDelete.addEventListener('click', async (event) =>
        {
          event.preventDefault();
          var confirmed = await this.page.confirmDialogService.open('リマインド日時を削除しますか？', { type: 'warning' });
          if (!confirmed)
          {
            return;
          }
          this.toggleRecipientAcknowledgement(item, recipient, false, [reminderDelete]);
        });
        reminderContent.appendChild(reminderDelete);
      }
      else
      {
        var reminderPending = document.createElement('span');
        reminderPending.className = 'target-detail__survey-reminder-text';
        reminderPending.textContent = '未確認';
        reminderContent.appendChild(reminderPending);

        var reminderEdit = this.createServiceActionButton('edit', {
          label: '',
          ariaLabel: 'リマインド日時を保存',
          hoverLabel: 'リマインド日時を保存',
          title: 'リマインド日時を保存',
          className: 'target-detail__survey-status-action target-detail__survey-status-action--edit',
          hideLabel: true
        });
        reminderEdit.disabled = !this.canManage;
        reminderEdit.addEventListener('click', (event) =>
        {
          event.preventDefault();
          this.toggleRecipientAcknowledgement(item, recipient, true, [reminderEdit]);
        });
        reminderContent.appendChild(reminderEdit);
      }
      reminderCell.appendChild(reminderContent);
      row.appendChild(reminderCell);

      var actionsCell = document.createElement('td');
      actionsCell.className = 'target-detail__survey-status-action-cell';
      var actions = document.createElement('div');
      actions.className = 'target-detail__survey-status-actions';

      var editButton = this.createServiceActionButton('edit', {
        label: '',
        ariaLabel: '回答を編集',
        hoverLabel: '回答を編集',
        title: '回答を編集',
        className: 'target-detail__survey-status-action target-detail__survey-status-action--edit',
        hideLabel: true
      });
      editButton.disabled = !this.canManage;
      editButton.addEventListener('click', (event) =>
      {
        event.preventDefault();
        this.handleRecipientResponseEdit(item, recipient, editButton);
      });
      actions.appendChild(editButton);

      var deleteButton = this.createServiceActionButton('delete', {
        label: '',
        ariaLabel: 'アンケートを未回答にする',
        hoverLabel: 'アンケートを未回答にする',
        title: 'アンケートを未回答にする',
        className: 'target-detail__survey-status-action target-detail__survey-status-action--delete',
        hideLabel: true,
        buttonType: 'delete'
      });
      deleteButton.disabled = !this.canManage;
      deleteButton.addEventListener('click', (event) =>
      {
        event.preventDefault();
        this.handleRecipientResponseDelete(item, recipient, deleteButton);
      });
      actions.appendChild(deleteButton);
      actionsCell.appendChild(actions);
      row.appendChild(actionsCell);
      return row;
    }

    async handleRecipientResponseDelete(item, recipient, trigger)
    {
      if (!item || !recipient || !recipient.userCode)
      {
        return;
      }
      var confirmed = await this.page.confirmDialogService.open('アンケートを未回答状態に戻しますか？', { type: 'warning' });
      if (!confirmed)
      {
        return;
      }
      var targets = [];
      if (trigger)
      {
        targets.push(trigger);
        trigger.disabled = true;
        trigger.setAttribute('aria-busy', 'true');
      }
      var payload = { targetCode: this.page.state.targetCode, userCode: recipient.userCode };
      var numericId = null;
      var stringId = String(item.id || '').trim();
      if (/^\d+$/.test(stringId))
      {
        numericId = Number(stringId);
      }
      if (numericId !== null)
      {
        payload.id = numericId;
      }
      if (item.surveyCode)
      {
        payload.surveyCode = item.surveyCode;
      }
      else if (numericId === null && item.id)
      {
        payload.surveyCode = item.id;
      }
      try
      {
        await this.page.callApi('TargetSurveyResponseDelete', payload, { requestType: 'TargetManagementSurvey' });
        await this.fetchAndRenderSurvey();
        var latest = this.findSurveyById(item.id) || item;
        if (this.modals && this.modals.detail)
        {
          this.renderDetailModal(latest, this.modals.detail);
        }
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('success', 'アンケートを未回答状態に戻しました。');
        }
      }
      catch (error)
      {
        if (window.console && typeof window.console.error === 'function')
        {
          window.console.error('[target-detail] failed to reset survey response', error);
        }
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('error', 'アンケートを未回答に戻せませんでした。');
        }
      }
      for (var i = 0; i < targets.length; i += 1)
      {
        if (targets[i])
        {
          targets[i].disabled = false;
          targets[i].removeAttribute('aria-busy');
        }
      }
    }

    findSurveyById(id)
    {
      if (!id)
      {
        return null;
      }
      var list = this.state.items || [];
      for (var i = 0; i < list.length; i += 1)
      {
        if (list[i] && list[i].id === id)
        {
          return list[i];
        }
      }
      return null;
    }

    updateAcknowledgementState(id, userCode, ackAt)
    {
      var normalized = String(userCode || '').toLowerCase();
      if (!normalized)
      {
        return;
      }
      var updater = function (list)
      {
        if (!Array.isArray(list))
        {
          return list;
        }
        return list.map(function (entry)
        {
          if (!entry || entry.id !== id)
          {
            return entry;
          }
          var recipients = Array.isArray(entry.recipients) ? entry.recipients.map(function (recipient)
          {
            if (!recipient)
            {
              return recipient;
            }
            var code = String(recipient.userCode || '').toLowerCase();
            if (code === normalized)
            {
              var updatedRecipient = Object.assign({}, recipient);
              updatedRecipient.acknowledgedAt = ackAt === undefined ? recipient.acknowledgedAt : ackAt;
              updatedRecipient.acknowledgedDisplay = ackAt === undefined
                ? recipient.acknowledgedDisplay
                : (ackAt || '');
              updatedRecipient.hasAcknowledgement = true;
              return updatedRecipient;
            }
            return recipient;
          }) : entry.recipients;
          var recipientCount = Array.isArray(recipients) ? recipients.length : (entry.recipientCount || 0);
          var acknowledgedCount = Array.isArray(recipients)
            ? recipients.filter(function (recipient)
            {
              return recipient && recipient.acknowledgedAt;
            }).length
            : (entry.acknowledgedCount || 0);
          var acknowledgedRate = recipientCount
            ? Math.round((acknowledgedCount / recipientCount) * 100)
            : 0;
          return Object.assign({}, entry, {
            recipients: recipients,
            recipientCount: recipientCount,
            acknowledgedCount: acknowledgedCount,
            acknowledgedRate: acknowledgedRate
          });
        });
      };
      this.state.items = updater(this.state.items);
      if (Array.isArray(this.page.state.survey))
      {
        this.page.state.survey = updater(this.page.state.survey);
      }
    }

    async toggleRecipientAcknowledgement(item, recipient, acknowledged, buttons)
    {
      if (!item || !item.id || !recipient || !recipient.userCode)
      {
        return;
      }
      var targets = Array.isArray(buttons) ? buttons : [];
      for (var i = 0; i < targets.length; i += 1)
      {
        if (targets[i])
        {
          targets[i].disabled = true;
          targets[i].setAttribute('aria-busy', 'true');
        }
      }
      var numericId = null;
      var stringId = String(item.id || '').trim();
      if (/^\d+$/.test(stringId))
      {
        numericId = Number(stringId);
      }
      var payload = {
        targetCode: this.page.state.targetCode,
        userCode: recipient.userCode
      };
      if (numericId !== null)
      {
        payload.id = numericId;
      }
      if (item.surveyCode)
      {
        payload.surveyCode = item.surveyCode;
      }
      else if (numericId === null && item.id)
      {
        payload.surveyCode = item.id;
      }
      if (acknowledged)
      {
        payload.acknowledgedAt = formatServerTimestamp(new Date());
      }
      else
      {
        payload.acknowledgedAt = null;
      }
      try
      {
        var result = await this.page.callApi('TargetSurveyAcknowledge', payload, { requestType: 'TargetManagementSurvey' });
        var ackAt = result && Object.prototype.hasOwnProperty.call(result, 'acknowledgedAt')
          ? result.acknowledgedAt
          : payload.acknowledgedAt;
        this.updateAcknowledgementState(item.id, recipient.userCode, ackAt);
        var latest = this.findSurveyById(item.id) || item;
        if (this.modals && this.modals.detail)
        {
          this.renderDetailModal(latest, this.modals.detail);
        }
        this.renderList();
        if (this.page.toastService && typeof this.page.toastService.success === 'function')
        {
          this.page.toastService.success(acknowledged ? '確認済みにしました。' : '未確認に戻しました。');
        }
      }
      catch (error)
      {
        if (window.console && typeof window.console.error === 'function')
        {
          window.console.error('[target-detail] failed to update survey acknowledgement', error);
        }
        if (this.page.toastService && typeof this.page.toastService.error === 'function')
        {
          this.page.toastService.error('確認状態の更新に失敗しました。');
        }
      }
      for (var j = 0; j < targets.length; j += 1)
      {
        if (targets[j])
        {
          targets[j].disabled = false;
          targets[j].removeAttribute('aria-busy');
        }
      }
    }

    async loadSurveyDetail(item)
    {
      if (!item || !item.id)
      {
        return item;
      }
      var needsRecipients = !item.recipients || !item.recipients.length;
      var needsContent = !item.content;
      var needsItems = !item.items || !item.items.length;
      if (!needsRecipients && !needsContent && !needsItems)
      {
        return item;
      }
      try
      {
        var payload = await this.page.callApi('TargetSurveyDetail', {
          targetCode: this.page.state.targetCode,
          surveyCode: item.id
        }, { requestType: 'TargetManagementSurvey' });
        var recipients = this.normalizeRecipients(payload && payload.recipients);
        var items = this.normalizeSurveyItems(payload && payload.items ? payload.items : (item && item.items ? item.items : []));
        var startAt = payload && payload.startAt ? payload.startAt : (item && item.startAt);
        var endAt = payload && payload.endAt ? payload.endAt : (item && item.endAt);
        var updated = Object.assign({}, item, {
          content: formatContent(payload && (payload.content || payload.body || payload.message || item.content)),
          recipients: recipients,
          items: items,
          startAt: startAt,
          endAt: endAt,
          startAtDisplay: formatDateTime(this.helpers, startAt),
          endAtDisplay: formatDateTime(this.helpers, endAt),
          acknowledgedCount: recipients.filter(function (entry)
          {
            return entry && entry.acknowledgedAt;
          }).length,
          recipientCount: recipients.length || item.recipientCount || 0
        });
        updated.acknowledgedRate = updated.recipientCount
          ? Math.round((updated.acknowledgedCount / updated.recipientCount) * 100)
          : 0;
        this.replaceSurvey(updated);
        return updated;
      }
      catch (error)
      {
        window.console.warn('[target-detail] failed to load survey detail', error);
        return item;
      }
    }

    applyAcknowledgement(surveyId, userCode, acknowledgedAt)
    {
      var normalizedId = normalizeText(surveyId);
      var normalizedUser = normalizeText(userCode).toLowerCase();
      if (!normalizedId || !normalizedUser)
      {
        return null;
      }
      var source = (this.state.items || []).find(function (entry)
      {
        return entry && entry.id === normalizedId;
      });
      if (!source)
      {
        return null;
      }
      var recipients = Array.isArray(source.recipients) ? source.recipients.slice() : [];
      var found = false;
      var updatedRecipients = recipients.map(function (recipient)
      {
        if (!recipient)
        {
          return recipient;
        }
        var recipientCode = normalizeText(recipient.userCode || recipient.displayName).toLowerCase();
        if (recipientCode && recipientCode === normalizedUser)
        {
          found = true;
          var nextAck = acknowledgedAt === undefined ? recipient.acknowledgedAt : acknowledgedAt;
          var nextDisplay = recipient.acknowledgedDisplay || (nextAck || '');
          return Object.assign({}, recipient, {
            acknowledgedAt: nextAck,
            acknowledgedDisplay: nextDisplay || nextAck,
            hasAcknowledgement: true
          });
        }
        return recipient;
      });
      if (!found)
      {
        updatedRecipients.push({
          userCode: userCode,
          displayName: userCode,
          role: 'participant',
          acknowledgedAt: acknowledgedAt,
          acknowledgedDisplay: acknowledgedAt,
          hasAcknowledgement: true
        });
      }
      var acknowledgedCount = updatedRecipients.filter(function (entry)
      {
        return entry && entry.acknowledgedAt;
      }).length;
      var baseRecipientCount = Number(source.recipientCount || 0);
      if (!Number.isFinite(baseRecipientCount) || baseRecipientCount < updatedRecipients.length)
      {
        baseRecipientCount = updatedRecipients.length;
      }
      var updated = Object.assign({}, source, {
        recipients: updatedRecipients,
        acknowledgedCount: acknowledgedCount,
        recipientCount: baseRecipientCount
      });
      updated.acknowledgedRate = updated.recipientCount
        ? Math.round((acknowledgedCount / updated.recipientCount) * 100)
        : 0;
      this.replaceSurvey(updated);
      return updated;
    }

    collectSurveyResponses(modal)
    {
      var answers = [];
      if (!modal)
      {
        return answers;
      }
      var items = Array.isArray(modal.surveyItems) ? modal.surveyItems.slice() : [];
      items.sort(function (a, b)
      {
        var posA = Number(a && a.position ? a.position : 0);
        var posB = Number(b && b.position ? b.position : 0);
        if (posA === posB)
        {
          var idA = String(a && a.id ? a.id : '');
          var idB = String(b && b.id ? b.id : '');
          return idA.localeCompare(idB);
        }
        return posA < posB ? -1 : 1;
      });

      var container = modal.items;
      for (var i = 0; i < items.length; i += 1)
      {
        var item = items[i];
        var itemId = item && item.id ? String(item.id) : '';
        if (!itemId)
        {
          continue;
        }
        var kind = String(item.type || item.kind || '').toLowerCase();
        var host = container ? container.querySelector('[data-survey-item-id="' + itemId + '"]') : null;
        var answer = null;
        if (kind === 'choicesingle')
        {
          var selected = host ? host.querySelector('input[type="radio"]:checked') : null;
          if (selected && selected.value)
          {
            answer = { itemId: itemId, value: selected.value };
          }
        }
        else if (kind === 'choicemultiple')
        {
          var selections = host ? host.querySelectorAll('input[type="checkbox"]:checked') : [];
          var values = Array.prototype.slice.call(selections).map(function (input)
          {
            return input && input.value ? input.value.trim() : '';
          }).filter(function (value)
          {
            return value !== '';
          });
          if (values.length)
          {
            answer = { itemId: itemId, values: values };
          }
        }
        else
        {
          var textarea = host ? host.querySelector('textarea') : null;
          var textValue = textarea && textarea.value ? textarea.value.trim() : '';
          if (textValue)
          {
            answer = { itemId: itemId, text: textValue };
          }
        }

        if (answer)
        {
          answers.push(answer);
        }
      }

      return answers;
    }

    async handleSurveyConfirm(modal)
    {
      if (!modal || !modal.currentItem)
      {
        return;
      }
      var userCode = modal.responseUserCode || this.getViewerUserCode();
      if (!userCode)
      {
        return;
      }
      var target = modal.currentItem;
      this.state.acknowledgingId = target.id;
      this.updateDetailModalActions(modal, target);
      var answers = this.collectSurveyResponses(modal);
      try
      {
        await this.page.callApi(
          'TargetSurveySubmit',
          { targetCode: this.page.state.targetCode, surveyCode: target.id, userCode: userCode, answers: answers },
          { requestType: 'TargetManagementSurvey' }
        );
        await this.fetchAndRenderSurvey();
        var updated = this.findSurveyById(target.id) || target;
        if (updated)
        {
          modal.currentItem = updated;
          this.renderDetailModal(updated, modal);
        }
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('success', 'アンケートを送信しました。');
        }
        this.toggleDetailModal(modal, false);
      }
      catch (error)
      {
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('error', 'アンケートの送信に失敗しました。');
        }
        if (window.console && typeof window.console.error === 'function')
        {
          window.console.error('[target-detail] failed to submit survey response', error);
        }
      }
      this.state.acknowledgingId = null;
      this.updateDetailModalActions(modal, modal.currentItem || target);
    }

    async handleReminderConfirm(modal)
    {
      if (!modal || !modal.currentItem)
      {
        return;
      }
      var userCode = modal.responseUserCode || this.getViewerUserCode();
      if (!userCode)
      {
        return;
      }
      var button = modal.confirmButton;
      if (button)
      {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
      }
      this.state.acknowledgingId = modal.currentItem.id;
      var payload = { targetCode: this.page.state.targetCode, userCode: userCode };
      var numericId = null;
      var stringId = String(modal.currentItem.id || '').trim();
      if (/^\d+$/.test(stringId))
      {
        numericId = Number(stringId);
      }
      if (numericId !== null)
      {
        payload.id = numericId;
      }
      if (modal.currentItem.surveyCode)
      {
        payload.surveyCode = modal.currentItem.surveyCode;
      }
      else if (numericId === null && modal.currentItem.id)
      {
        payload.surveyCode = modal.currentItem.id;
      }
      payload.acknowledgedAt = formatServerTimestamp(new Date());

      try
      {
        var result = await this.page.callApi('TargetSurveyAcknowledge', payload, { requestType: 'TargetManagementSurvey' });
        var ackAt = result && result.acknowledgedAt ? result.acknowledgedAt : payload.acknowledgedAt;
        var updated = this.applyAcknowledgement(modal.currentItem.id, userCode, ackAt);
        if (updated)
        {
          modal.currentItem = updated;
          this.renderReminderModal(updated, modal);
        }
        this.toggleReminderModal(modal, false);
        if (this.page.toastService && typeof this.page.toastService.success === 'function')
        {
          this.page.toastService.success('確認済みにしました。');
        }
      }
      catch (error)
      {
        if (window.console && typeof window.console.error === 'function')
        {
          window.console.error('[target-detail] failed to acknowledge survey reminder', error);
        }
        if (this.page.toastService && typeof this.page.toastService.error === 'function')
        {
          this.page.toastService.error('確認状態の更新に失敗しました。');
        }
      }
      this.state.acknowledgingId = null;
      if (button)
      {
        button.disabled = false;
        button.removeAttribute('aria-busy');
      }
    }

    async handleResponseSubmit(modal)
    {
      if (!modal || !modal.currentItem)
      {
        return;
      }
      if (this.isGuestViewer() && this.hasRespondedAsViewer(modal.currentItem))
      {
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('info', 'ゲストユーザーの回答は送信後に編集できません。');
        }
        return;
      }
      var confirmed = await this.page.confirmDialogService.open('この内容で回答を送信しますか？', { type: 'primary' });
      if (!confirmed)
      {
        return;
      }
      var userCode = modal.responseUserCode || this.getViewerUserCode();
      if (!userCode)
      {
        return;
      }
      var button = modal.submitButton;
      if (button)
      {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
      }
      var answers = this.collectSurveyResponses(modal);
      var surveyCode = modal.currentItem.surveyCode || modal.currentItem.id;
      var respondedAt = null;
      if (modal.allowRespondedAtInput && modal.respondedAtInput)
      {
        var respondedInput = modal.respondedAtInput.value;
        if (respondedInput)
        {
          var parsedRespondedAt = parseDate(respondedInput);
          if (parsedRespondedAt)
          {
            respondedAt = formatServerTimestamp(parsedRespondedAt);
          }
        }
      }
      else
      {
        respondedAt = formatServerTimestamp(new Date());
      }
      try
      {
        var basePayload = { targetCode: this.page.state.targetCode, surveyCode: surveyCode, userCode: userCode, answers: answers };
        if (respondedAt)
        {
          basePayload.respondedAt = respondedAt;
        }
        await this.page.callApi('TargetSurveySubmit', basePayload, { requestType: 'TargetManagementSurvey' });
        await this.fetchAndRenderSurvey();
        var updated = this.findSurveyById(modal.currentItem.id) || modal.currentItem;
        this.renderResponseModal(updated, modal);
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('success', 'アンケートに回答しました。');
        }
        this.toggleResponseModal(modal, false);
      }
      catch (error)
      {
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('error', 'アンケートの回答送信に失敗しました。');
        }
        if (window.console && typeof window.console.error === 'function')
        {
          window.console.error('[target-detail] failed to submit survey response', error);
        }
      }
      if (button)
      {
        button.disabled = false;
        button.removeAttribute('aria-busy');
      }
    }

    replaceSurvey(next)
    {
      if (!next)
      {
        return;
      }
      this.state.items = (this.state.items || []).map(function (entry)
      {
        if (entry && entry.id === next.id)
        {
          return Object.assign({}, entry, next);
        }
        return entry;
      });
      if (Array.isArray(this.page.state.survey))
      {
        this.page.state.survey = this.page.state.survey.map(function (entry)
        {
          if (!entry)
          {
            return entry;
          }
          var entryId = entry.id || entry.surveyCode;
          if (entryId === next.id)
          {
            return Object.assign({}, entry, next);
          }
          return entry;
        });
      }
      this.renderList();
    }

    getViewerUserCode()
    {
      var profile = this.page && this.page.state ? this.page.state.profile : null;
      var code = profile && (profile.userCode || profile.user_code || profile.code || '');
      return normalizeText(code);
    }

    isGuestViewer()
    {
      var profile = this.page && this.page.state ? this.page.state.profile : null;
      return isGuestUser(profile);
    }

    hasRespondedAsViewer(item)
    {
      var viewerCode = this.getViewerUserCode();
      if (!viewerCode)
      {
        return false;
      }
      var recipient = this.findRecipientForUser(item, viewerCode);
      if (!recipient)
      {
        return false;
      }
      if (!recipient.isGuest && !isGuestUser(recipient))
      {
        return false;
      }
      return Boolean(recipient.respondedAt);
    }

    findPendingSurvey(userCode)
    {
      if (!userCode)
      {
        return null;
      }
      var normalizedUser = userCode.toLowerCase();
      var items = Array.isArray(this.state.items) ? this.state.items : [];
      var target = null;
      var latestTimestamp = 0;
      var self = this;
      items.forEach(function (item)
      {
        if (!item || !Array.isArray(item.recipients))
        {
          return;
        }
        if (self.isSurveyActive(item) === false)
        {
          return;
        }
        var match = item.recipients.find(function (recipient)
        {
          if (!recipient)
          {
            return false;
          }
          var recipientCode = normalizeText(recipient.userCode || recipient.displayName).toLowerCase();
          if (!recipientCode)
          {
            return false;
          }
          if (recipientCode !== normalizedUser)
          {
            return false;
          }
          return !recipient.acknowledgedAt && recipient.hasAcknowledgement;
        });
        if (!match)
        {
          return;
        }
        var createdAt = item.createdAt ? new Date(String(item.createdAt).replace(/-/g, '/')) : null;
        var createdValue = createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.getTime() : 0;
        if (createdValue >= latestTimestamp)
        {
          target = item;
          latestTimestamp = createdValue;
        }
      });
      return target;
    }

    async showPendingSurveyForViewer()
    {
      if (this.state.hasPresentedPending)
      {
        return;
      }
      var viewerCode = this.getViewerUserCode();
      if (!viewerCode)
      {
        return;
      }
      var pending = this.findPendingSurvey(viewerCode);
      if (!pending)
      {
        return;
      }
      if (!this.isSurveyActive(pending))
      {
        return;
      }
      this.state.hasPresentedPending = true;
      if (this.canManage)
      {
        var detailModal = this.ensureDetailModal();
        detailModal.trigger = null;
        detailModal.currentItem = pending;
        detailModal.hideStatus = true;
        this.renderDetailModal(pending, detailModal, { hideStatus: true });
        this.toggleDetailModal(detailModal, true);
        return;
      }
      var reminderModal = this.ensureReminderModal();
      reminderModal.trigger = null;
      reminderModal.currentItem = pending;
      this.renderReminderModal(pending, reminderModal);
      this.toggleReminderModal(reminderModal, true);
    }

    getUserSelectModalService()
    {
      if (this.page && this.page.userSelectModalService)
      {
        return this.page.userSelectModalService;
      }
      return null;
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

    getButtonService()
    {
      if (this.buttonService)
      {
        return this.buttonService;
      }
      if (this.page && this.page.buttonService)
      {
        this.buttonService = this.page.buttonService;
      }
      return this.buttonService;
    }

    createServiceActionButton(buttonType, options)
    {
      var svc = this.getButtonService();
      var opts = options || {};
      var element = svc.createActionButton(buttonType, opts);
      var textLabel = opts.label || opts.hoverLabel || opts.title || '';
      var ariaLabel = opts.ariaLabel || textLabel;
      var titleLabel = opts.title || textLabel;
      if (ariaLabel)
      {
        element.setAttribute('aria-label', ariaLabel);
      }
      if (titleLabel)
      {
        element.setAttribute('title', titleLabel);
      }
      return element;
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
      }
      return this.avatarService;
    }

    renderAvatar(host, data, options)
    {
      if (!host)
      {
        return;
      }
      var avatarService = this.getAvatarService();
      var renderData = { name: data && data.name ? data.name : 'ユーザー', alt: data && data.name ? data.name : '' };
      if (data && data.src)
      {
        renderData.src = data.src;
      }
      if (data && data.userCode)
      {
        renderData.userCode = data.userCode;
      }
      if (data && Object.prototype.hasOwnProperty.call(data, 'isActive'))
      {
        renderData.isActive = data.isActive;
      }
      var renderOptions = Object.assign({ size: 40, shape: 'circle', initialsFallback: true, nameOverlay: true }, options || {});
      avatarService.render(host, renderData, renderOptions);
    }

    createActionButton(buttonType, label, className)
    {
      var svc = this.getButtonService();
      var options = { className: className, buttonType: buttonType, size: 'small', shape: 'round' };
      if (label)
      {
        options.label = label;
        options.hoverLabel = label;
        options.ariaLabel = label;
        options.title = label;
      }
      if (buttonType === 'detail')
      {
        options.iconHtml = SURVEY_DETAIL_ICON_HTML;
      }
      var button = svc.createActionButton(buttonType, options);
      if (label)
      {
        button.title = label;
        button.setAttribute('aria-label', label);
      }
      return button;
    }

    renderRequiredIndicators(modal)
    {
      if (!modal || !modal.requiredHosts)
      {
        return;
      }
      var hosts = modal.requiredHosts;
      var self = this;
      Object.keys(hosts).forEach(function (key)
      {
        var host = hosts[key];
        if (!host)
        {
          return;
        }
        host.innerHTML = '';
        var badge = self.createRequiredBadge();
        if (badge)
        {
          host.appendChild(badge);
        }
      });
    }

    createRequiredBadge()
    {
      var svc = this.getButtonService();
      var options = {
        label: '必須',
        ariaLabel: '必須',
        hoverLabel: '必須',
        elementTag: 'span',
        className: 'survey-management__required-indicator mock-avatar__upload-btn',
        attributes: { role: 'note' }
      };
      return svc.createActionButton('survey-required', options);
    }

    createBannerButton(label, className, options)
    {
      return this.createServiceActionButton(
        options && options.buttonType ? options.buttonType : 'expandable-icon-button/add',
        Object.assign({
          label: label,
          ariaLabel: label,
          hoverLabel: label,
          title: label,
          className: className
        }, options || {})
      );
    }

    setFeedback(message, type)
    {
      if (!this.refs.feedback)
      {
        return;
      }
      this.refs.feedback.textContent = message || '';
      if (type)
      {
        this.refs.feedback.setAttribute('data-feedback-type', type);
      }
      else
      {
        this.refs.feedback.removeAttribute('data-feedback-type');
      }
      this.refs.feedback.hidden = !message;
    }

    async fetchAndRenderSurvey()
    {
      var items = await this.page.loadSurvey({ force: true });
      this.state.items = this.normalizeSurvey(Array.isArray(items) ? items : []);
      this.renderList();
    }

    ensureFormModal()
    {
      if (this.modals.form)
      {
        return this.modals.form;
      }
      this.modals.form = this.createFormModal();
      return this.modals.form;
    }

    openAddModal()
    {
      var modal = this.ensureFormModal();
      this.openFormModal(modal, 'create');
    }

    openFormModal(modal, mode, item)
    {
      if (!modal)
      {
        return;
      }
      modal.mode = mode === 'edit' ? 'edit' : 'create';
      modal.currentItem = item || null;
      modal.root.removeAttribute('hidden');
      modal.root.setAttribute('aria-hidden', 'false');
      modal.root.classList.add('is-open');
      modal.restoreTarget = document.activeElement;
      modal.form.reset();
      this.clearModalFeedback(modal);
      this.setModalSubmitting(modal, false);
      this.clearFieldError(modal.titleField);
      this.clearFieldError(modal.contentField);
      this.clearFieldError(modal.startField);
      this.clearFieldError(modal.endField);
      this.setAudienceSelection(modal, item && item.recipients ? item.recipients : []);
      if (modal.titleNode)
      {
        modal.titleNode.textContent = modal.mode === 'edit' ? 'アンケートを編集' : 'アンケートを追加';
      }
      if (modal.summaryNode)
      {
        modal.summaryNode.textContent = modal.mode === 'edit'
          ? '内容を更新して対象ユーザーに再通知できます。'
          : 'タイトルと内容、対象ユーザーを設定してアンケートを投稿します。';
      }
      modal.surveyItems = this.normalizeSurveyItems(item && item.items ? item.items : []);
      this.renderSurveyItemEditor(modal);
      if (modal.submitButton)
      {
        modal.submitButton.textContent = modal.mode === 'edit' ? '更新する' : '追加';
      }
      var defaultStart = new Date();
      var defaultEnd = new Date(defaultStart.getTime() + (7 * 24 * 60 * 60 * 1000));
      if (modal.startInput)
      {
        var startSource = item && item.startAt ? item.startAt : defaultStart;
        modal.startInput.value = formatInputDateTime(startSource);
      }
      if (modal.endInput)
      {
        var endSource = item && item.endAt ? item.endAt : defaultEnd;
        modal.endInput.value = formatInputDateTime(endSource);
      }
      if (modal.titleInput)
      {
        modal.titleInput.value = item && item.title ? item.title : '';
      }
      if (modal.contentInput)
      {
        modal.contentInput.value = item && item.content ? item.content : '';
      }
      if (modal.titleInput)
      {
        modal.titleInput.focus();
      }
    }

    closeFormModal()
    {
      var modal = this.modals.form;
      if (!modal)
      {
        return;
      }
      modal.root.setAttribute('hidden', 'hidden');
      modal.root.setAttribute('aria-hidden', 'true');
      modal.root.classList.remove('is-open');
      this.setModalSubmitting(modal, false);
      if (modal.restoreTarget && typeof modal.restoreTarget.focus === 'function')
      {
        modal.restoreTarget.focus();
      }
    }

    createFormModal()
    {
      var modalRoot = document.createElement('div');
      modalRoot.className = 'screen-modal target-survey__modal-container';
      modalRoot.setAttribute('hidden', 'hidden');
      modalRoot.innerHTML = '' +
        '<div class="screen-modal__overlay" data-modal-close></div>' +
        '<section class="screen-modal__content target-reference__modal" role="dialog" aria-modal="true" aria-labelledby="target-survey-modal-title">' +
        '<button type="button" class="screen-modal__close" aria-label="モーダルを閉じる">×</button>' +
        '<header class="screen-modal__header">' +
        '<h2 class="screen-modal__title" id="target-survey-modal-title">アンケートを追加</h2>' +
        '<p class="screen-modal__summary" data-survey-form-summary>タイトルと内容を入力してアンケートを投稿します。</p>' +
        '</header>' +
        '<form class="screen-modal__body survey-management__form" novalidate>' +
        '<div class="survey-management__form-field" data-field="title">' +
        '<div class="survey-management__form-label-row">' +
        '<label class="survey-management__form-label" for="target-survey-title">タイトル</label>' +
        '<span class="survey-management__required-host" data-required-indicator="title"></span>' +
        '</div>' +
        '<input class="user-management__input" type="text" id="target-survey-title" name="title" maxlength="256" required>' +
        '<p class="form-error" aria-live="polite"></p>' +
        '</div>' +
        '<div class="survey-management__form-field" data-field="content">' +
        '<div class="survey-management__form-label-row">' +
        '<label class="survey-management__form-label" for="target-survey-content">内容</label>' +
        '<span class="survey-management__required-host" data-required-indicator="content"></span>' +
        '</div>' +
        '<textarea class="user-management__input" id="target-survey-content" name="content" rows="6" maxlength="4000" required></textarea>' +
        '<p class="form-error" aria-live="polite"></p>' +
        '</div>' +
        '<div class="survey-management__form-field" data-field="startAt">' +
        '<div class="survey-management__form-label-row">' +
        '<label class="survey-management__form-label" for="target-survey-start">開始日時</label>' +
        '<span class="survey-management__required-host" data-required-indicator="startAt"></span>' +
        '</div>' +
        '<input class="user-management__input" type="datetime-local" id="target-survey-start" name="startAt" required>' +
        '<p class="form-error" aria-live="polite"></p>' +
        '</div>' +
        '<div class="survey-management__form-field" data-field="endAt">' +
        '<div class="survey-management__form-label-row">' +
        '<label class="survey-management__form-label" for="target-survey-end">終了日時</label>' +
        '<span class="survey-management__required-host" data-required-indicator="endAt"></span>' +
        '</div>' +
        '<input class="user-management__input" type="datetime-local" id="target-survey-end" name="endAt" required>' +
        '<p class="form-error" aria-live="polite"></p>' +
        '</div>' +
        '<div class="survey-management__form-field" data-field="items">' +
        '<div class="survey-management__items-header">' +
        '<div class="survey-management__form-label-row">' +
        '<label class="survey-management__form-label">アンケート項目</label>' +
        '<div class="survey-management__items-actions">' +
        '<button type="button" class="btn btn--ghost" data-survey-item-add>項目を追加</button>' +
        '</div>' +
        '</div>' +
        '<p class="survey-management__items-summary">回答項目を追加して、アンケートの設問を作成します。</p>' +
        '<div class="survey-management__items-table" data-survey-items-table></div>' +
        '</div>' +
        '<div class="survey-management__form-field survey-management__audience-selector" data-field="audience">' +
        '<div class="survey-management__audience-actions">' +
        '<button type="button" class="btn btn--ghost" data-survey-audience-add>対象ユーザーを追加</button>' +
        '</div>' +
        '<p class="survey-management__audience-count" data-survey-audience-count>対象ユーザーは選択されていません。</p>' +
        '<div class="survey-management__audience-list" data-survey-audience-list></div>' +
        '<p class="form-error" aria-live="polite"></p>' +
        '</div>' +
        '<p class="screen-modal__feedback" aria-live="polite"></p>' +
        '<footer class="screen-modal__footer">' +
        '<button type="button" class="btn btn--ghost" data-modal-cancel>キャンセル</button>' +
        '<button type="submit" class="btn btn--primary">追加</button>' +
        '</footer>' +
        '</form>' +
        '</section>';

      document.body.appendChild(modalRoot);

      var form = modalRoot.querySelector('form');
      var overlay = modalRoot.querySelector('.screen-modal__overlay');
      var closeButton = modalRoot.querySelector('.screen-modal__close');
      var cancelButton = modalRoot.querySelector('[data-modal-cancel]');
      var titleInput = modalRoot.querySelector('#target-survey-title');
      var contentInput = modalRoot.querySelector('#target-survey-content');
      var startInput = modalRoot.querySelector('#target-survey-start');
      var endInput = modalRoot.querySelector('#target-survey-end');
      var feedback = modalRoot.querySelector('.screen-modal__feedback');
      var submitButton = modalRoot.querySelector('button[type="submit"]');
      var titleNode = modalRoot.querySelector('.screen-modal__title');
      var summaryNode = modalRoot.querySelector('[data-survey-form-summary]');
      var audienceList = modalRoot.querySelector('[data-survey-audience-list]');
      var audienceCount = modalRoot.querySelector('[data-survey-audience-count]');
      var audienceAddButton = modalRoot.querySelector('[data-survey-audience-add]');
      var audienceField = modalRoot.querySelector('[data-field="audience"]');
      var titleRequiredHost = modalRoot.querySelector('[data-required-indicator="title"]');
      var contentRequiredHost = modalRoot.querySelector('[data-required-indicator="content"]');
      var startRequiredHost = modalRoot.querySelector('[data-required-indicator="startAt"]');
      var endRequiredHost = modalRoot.querySelector('[data-required-indicator="endAt"]');
      var itemAddButton = modalRoot.querySelector('[data-survey-item-add]');
      var itemTable = modalRoot.querySelector('[data-survey-items-table]');

      var modal = {
        root: modalRoot,
        form: form,
        overlay: overlay,
        closeButton: closeButton,
        cancelButton: cancelButton,
        titleInput: titleInput,
        contentInput: contentInput,
        startInput: startInput,
        endInput: endInput,
        titleField: titleInput ? titleInput.closest('[data-field="title"]') : null,
        contentField: contentInput ? contentInput.closest('[data-field="content"]') : null,
        startField: startInput ? startInput.closest('[data-field="startAt"]') : null,
        endField: endInput ? endInput.closest('[data-field="endAt"]') : null,
        audienceField: audienceField,
        audienceList: audienceList,
        audienceCount: audienceCount,
        audienceAddButton: audienceAddButton,
        itemAddButton: itemAddButton,
        itemsTable: itemTable,
        submitButton: submitButton,
        feedback: feedback,
        titleNode: titleNode,
        summaryNode: summaryNode,
        requiredHosts: {
          title: titleRequiredHost,
          content: contentRequiredHost,
          startAt: startRequiredHost,
          endAt: endRequiredHost
        },
        isSubmitting: false,
        restoreTarget: null,
        selectedRecipients: [],
        surveyItems: [],
        mode: 'create',
        currentItem: null
      };

      var self = this;
      function close(event)
      {
        if (modal.isSubmitting)
        {
          return;
        }
        self.closeFormModal();
        if (event && typeof event.preventDefault === 'function')
        {
          event.preventDefault();
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
      if (form)
      {
        form.addEventListener('submit', function (event)
        {
          event.preventDefault();
          self.submitForm(modal);
        });
      }
      if (overlay)
      {
        overlay.addEventListener('click', close);
      }
      if (closeButton)
      {
        closeButton.addEventListener('click', close);
      }
      if (cancelButton)
      {
        cancelButton.addEventListener('click', close);
      }
      if (audienceAddButton)
      {
        audienceAddButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.openAudienceSelector(modal);
        });
      }
      if (itemAddButton)
      {
        itemAddButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.openSurveyItemDetailModal(modal);
        });
      }

      this.renderRequiredIndicators(modal);

      return modal;
    }

    createLocalId(prefix)
    {
      this.localIdSeed += 1;
      return String(prefix || 'id') + '-' + Date.now() + '-' + this.localIdSeed;
    }

    normalizeSurveyItems(list)
    {
      var entries = Array.isArray(list) ? list : [];
      var self = this;
      return entries.map(function (entry, index)
      {
        var baseId = entry && entry.id ? String(entry.id) : self.createLocalId('survey-item');
        var normalizedChoices = [];
        if (Array.isArray(entry && (entry.choices || entry.kinds)))
        {
          normalizedChoices = (entry.choices || entry.kinds).map(function (choice, choiceIndex)
          {
            return {
              id: choice && choice.id ? String(choice.id) : self.createLocalId('choice-' + baseId + '-' + choiceIndex),
              title: normalizeText(choice && choice.title ? choice.title : '') || '選択肢',
              description: normalizeText(choice && (choice.description || choice.body || choice.summary || '')),
              position: Number.isFinite(choice && choice.position) ? Number(choice.position) : choiceIndex
            };
          });
        }
        return {
          id: baseId,
          title: normalizeText(entry && (entry.title || entry.name || '')) || '新しい項目',
          description: normalizeText(entry && (entry.description || entry.body || entry.summary || '')),
          type: normalizeText(entry && (entry.kind || entry.type || '')).toLowerCase() === 'choicemultiple'
            ? 'choiceMultiple'
            : normalizeText(entry && (entry.kind || entry.type || '')).toLowerCase() === 'choicesingle'
              ? 'choiceSingle'
              : (normalizeText(entry && (entry.kind || entry.type || '')) || 'text'),
          position: Number(entry && entry.position ? entry.position : index),
          choices: normalizedChoices
        };
      });
    }

    serializeSurveyItems(list)
    {
      var entries = Array.isArray(list) ? list : [];
      return entries.map(function (entry, index)
      {
        var type = normalizeText(entry && entry.type);
        var serialized = {
          id: entry && entry.id ? String(entry.id) : null,
          title: normalizeText(entry && entry.title),
          description: normalizeText(entry && entry.description),
          kind: type || 'text',
          position: Number(entry && entry.position ? entry.position : index)
        };

        if (Array.isArray(entry && entry.choices) && entry.choices.length)
        {
          serialized.choices = entry.choices.map(function (choice, choiceIndex)
          {
            return {
              id: choice && choice.id ? String(choice.id) : null,
              title: normalizeText(choice && choice.title) || '選択肢',
              description: normalizeText(choice && choice.description),
              position: choice && Number.isFinite(choice.position) ? Number(choice.position) : choiceIndex
            };
          });
        }

        return serialized;
      });
    }

    renderSurveyItemEditor(modal)
    {
      if (!modal || !modal.itemsTable)
      {
        return;
      }
      var container = modal.itemsTable;
      container.innerHTML = '';
      var items = Array.isArray(modal.surveyItems) ? modal.surveyItems.slice() : [];
      items.sort(function (a, b)
      {
        var posA = Number(a && a.position ? a.position : 0);
        var posB = Number(b && b.position ? b.position : 0);
        if (posA === posB)
        {
          return 0;
        }
        return posA < posB ? -1 : 1;
      });
      modal.surveyItems = items;

      if (!items.length)
      {
        var empty = document.createElement('p');
        empty.className = 'survey-management__items-empty';
        empty.textContent = 'アンケート項目はまだありません。項目を追加してください。';
        container.appendChild(empty);
        return;
      }

      var table = document.createElement('table');
      table.className = 'survey-management__items-table-inner';

      var thead = document.createElement('thead');
      thead.innerHTML = '' +
        '<tr>' +
        '<th scope="col">タイトル</th>' +
        '<th scope="col">説明</th>' +
        '<th scope="col">タイプ</th>' +
        '<th scope="col">選択肢</th>' +
        '<th scope="col" class="survey-management__items-action-col">操作</th>' +
        '</tr>';
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      var self = this;
      items.forEach(function (item, index)
      {
        var row = document.createElement('tr');

        var titleCell = document.createElement('td');
        titleCell.className = 'survey-management__item-title-cell';
        titleCell.textContent = item.title;
        row.appendChild(titleCell);

        var descriptionCell = document.createElement('td');
        descriptionCell.className = 'survey-management__item-description-cell';
        descriptionCell.textContent = item.description || '—';
        row.appendChild(descriptionCell);

        var typeCell = document.createElement('td');
        typeCell.className = 'survey-management__item-type-cell';
        var typeLabel = document.createElement('span');
        typeLabel.className = 'survey-management__item-type-label';
        typeLabel.textContent = self.getSurveyItemTypeLabel(item.type);
        typeCell.appendChild(typeLabel);
        row.appendChild(typeCell);

        var choiceCell = document.createElement('td');
        choiceCell.className = 'survey-management__item-choice-cell';
        var choiceList = document.createElement('div');
        choiceList.className = 'survey-management__item-choice-list';
        var isChoiceType = item.type === 'choiceSingle' || item.type === 'choiceMultiple';
        if (isChoiceType && item.choices && item.choices.length)
        {
          item.choices.forEach(function (choice)
          {
            var chip = document.createElement('span');
            chip.className = 'survey-management__item-choice survey-management__item-choice--static';
            chip.textContent = choice && choice.title ? choice.title : '選択肢';
            choiceList.appendChild(chip);
          });
        }
        if (!isChoiceType)
        {
          var note = document.createElement('span');
          note.className = 'survey-management__item-choice-note';
          note.textContent = '自由記述';
          choiceList.appendChild(note);
        }
        choiceCell.appendChild(choiceList);
        row.appendChild(choiceCell);

        var actionCell = document.createElement('td');
        actionCell.className = 'survey-management__items-action-cell';

        var editButton = self.createActionButton('edit', '編集', 'survey-management__item-action');
        editButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.openSurveyItemDetailModal(modal, item);
        });
        actionCell.appendChild(editButton);

        var upButton = self.createActionButton('up', '上に移動', 'survey-management__item-action');
        upButton.disabled = index === 0;
        upButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.moveSurveyItem(modal, index, -1);
        });
        actionCell.appendChild(upButton);

        var downButton = self.createActionButton('down', '下に移動', 'survey-management__item-action');
        downButton.disabled = index === items.length - 1;
        downButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.moveSurveyItem(modal, index, 1);
        });
        actionCell.appendChild(downButton);

        var deleteButton = self.createActionButton('delete', '削除', 'survey-management__item-action');
        deleteButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.removeSurveyItem(modal, item);
        });
        actionCell.appendChild(deleteButton);

        row.appendChild(actionCell);
        tbody.appendChild(row);
      });

      table.appendChild(tbody);
      container.appendChild(table);
    }

    updateSurveyItemType(modal, item, type)
    {
      if (!modal || !item)
      {
        return;
      }
      var targetIndex = modal.surveyItems.findIndex(function (entry)
      {
        return entry && entry.id === item.id;
      });
      if (targetIndex === -1)
      {
        return;
      }
      var next = Object.assign({}, modal.surveyItems[targetIndex], { type: type });
      if (type !== 'choiceSingle' && type !== 'choiceMultiple')
      {
        next.choices = [];
      }
      modal.surveyItems.splice(targetIndex, 1, next);
      this.renderSurveyItemEditor(modal);
    }

    moveSurveyItem(modal, index, delta)
    {
      if (!modal || !Array.isArray(modal.surveyItems))
      {
        return;
      }
      var targetIndex = index + delta;
      if (targetIndex < 0 || targetIndex >= modal.surveyItems.length)
      {
        return;
      }
      var items = modal.surveyItems.slice();
      var item = items.splice(index, 1)[0];
      items.splice(targetIndex, 0, item);
      items.forEach(function (entry, position)
      {
        entry.position = position;
      });
      modal.surveyItems = items;
      this.renderSurveyItemEditor(modal);
    }

    removeSurveyItem(modal, item)
    {
      if (!modal || !item)
      {
        return;
      }
      modal.surveyItems = (modal.surveyItems || []).filter(function (entry)
      {
        return entry && entry.id !== item.id;
      });
      this.renderSurveyItemEditor(modal);
    }

    removeSurveyItemChoice(modal, item, choice, detailModal)
    {
      if (!modal || !item)
      {
        return;
      }
      var items = Array.isArray(modal.surveyItems) ? modal.surveyItems.slice() : [];
      var targetIndex = items.findIndex(function (entry)
      {
        return entry && entry.id === item.id;
      });
      var target = targetIndex === -1
        ? (detailModal && detailModal.currentItem ? detailModal.currentItem : item)
        : items[targetIndex];
      var choices = Array.isArray(target && target.choices) ? target.choices.filter(function (entry)
      {
        return entry && entry.id !== (choice && choice.id);
      }) : [];
      choices.forEach(function (entry, position)
      {
        if (entry)
        {
          entry.position = position;
        }
      });
      var nextItem = Object.assign({}, target, { choices: choices });
      if (targetIndex === -1)
      {
        if (detailModal)
        {
          detailModal.currentItem = nextItem;
        }
      }
      else
      {
        items.splice(targetIndex, 1, nextItem);
        modal.surveyItems = items;
        if (detailModal)
        {
          detailModal.currentItem = nextItem;
        }
        this.renderSurveyItemEditor(modal);
      }
      if (detailModal)
      {
        this.renderSurveyItemChoiceList(modal, detailModal, nextItem);
      }
    }

    addSurveyItemChoice(detailModal)
    {
      if (!detailModal || !detailModal.targetModal || !detailModal.currentItem)
      {
        return;
      }
      var modal = detailModal.targetModal;
      var items = Array.isArray(modal.surveyItems) ? modal.surveyItems.slice() : [];
      var targetIndex = items.findIndex(function (entry)
      {
        return entry && entry.id === detailModal.currentItem.id;
      });
      var target = targetIndex === -1 ? detailModal.currentItem : items[targetIndex];
      var choices = Array.isArray(target && target.choices) ? target.choices.slice() : [];
      var nextChoice = {
        id: this.createLocalId('choice'),
        title: '',
        description: '',
        position: choices.length
      };
      choices.push(nextChoice);
      var nextItem = Object.assign({}, target, { choices: choices });
      if (targetIndex === -1)
      {
        detailModal.currentItem = nextItem;
      }
      else
      {
        items.splice(targetIndex, 1, nextItem);
        modal.surveyItems = items;
        detailModal.currentItem = nextItem;
        this.renderSurveyItemEditor(modal);
      }
      this.renderSurveyItemChoiceList(modal, detailModal, nextItem);

      if (detailModal.choiceList)
      {
        var inputs = detailModal.choiceList.querySelectorAll('input.survey-management__choice-input');
        if (inputs && inputs.length)
        {
          inputs[inputs.length - 1].focus();
        }
      }
    }

    moveSurveyItemChoice(modal, detailModal, item, choiceId, delta)
    {
      if (!modal || !detailModal || !item || !choiceId || !delta)
      {
        return;
      }
      var items = Array.isArray(modal.surveyItems) ? modal.surveyItems.slice() : [];
      var targetIndex = items.findIndex(function (entry)
      {
        return entry && entry.id === item.id;
      });
      var target = targetIndex === -1 ? detailModal.currentItem : items[targetIndex];
      var choices = Array.isArray(target && target.choices) ? target.choices.slice() : [];
      var index = choices.findIndex(function (entry)
      {
        return entry && entry.id === choiceId;
      });
      if (index === -1)
      {
        return;
      }
      var destination = index + delta;
      if (destination < 0 || destination >= choices.length)
      {
        return;
      }
      var moved = choices.splice(index, 1)[0];
      choices.splice(destination, 0, moved);
      choices.forEach(function (entry, position)
      {
        if (entry)
        {
          entry.position = position;
        }
      });
      var nextItem = Object.assign({}, target, { choices: choices });
      if (targetIndex === -1)
      {
        detailModal.currentItem = nextItem;
      }
      else
      {
        items.splice(targetIndex, 1, nextItem);
        modal.surveyItems = items;
        detailModal.currentItem = nextItem;
        this.renderSurveyItemEditor(modal);
      }
      this.renderSurveyItemChoiceList(modal, detailModal, nextItem);
    }

    updateSurveyItemChoice(detailModal, choiceId, updates)
    {
      if (!detailModal || !detailModal.targetModal || !detailModal.currentItem || !choiceId)
      {
        return;
      }
      var modal = detailModal.targetModal;
      var items = Array.isArray(modal.surveyItems) ? modal.surveyItems.slice() : [];
      var targetIndex = items.findIndex(function (entry)
      {
        return entry && entry.id === detailModal.currentItem.id;
      });
      var target = targetIndex === -1 ? detailModal.currentItem : items[targetIndex];
      var choices = Array.isArray(target && target.choices) ? target.choices.slice() : [];
      var index = choices.findIndex(function (entry)
      {
        return entry && entry.id === choiceId;
      });
      if (index === -1)
      {
        return;
      }
      var nextChoice = Object.assign({}, choices[index], updates);
      choices.splice(index, 1, nextChoice);
      var nextItem = Object.assign({}, target, { choices: choices });
      if (targetIndex === -1)
      {
        detailModal.currentItem = nextItem;
        return;
      }
      items.splice(targetIndex, 1, nextItem);
      modal.surveyItems = items;
      detailModal.currentItem = nextItem;
      this.renderSurveyItemEditor(modal);
    }

    ensureSurveyItemDetailModal(modal)
    {
      if (!modal)
      {
        return null;
      }
      if (modal.itemDetailModal)
      {
        return modal.itemDetailModal;
      }

      var root = document.createElement('div');
      root.className = 'screen-modal target-survey__modal-container target-survey__submodal';
      root.setAttribute('hidden', 'hidden');
      root.innerHTML = '' +
        '<div class="screen-modal__overlay" data-modal-close></div>' +
        '<section class="screen-modal__content target-reference__modal" role="dialog" aria-modal="true">' +
        '<button type="button" class="screen-modal__close" aria-label="モーダルを閉じる">×</button>' +
        '<header class="screen-modal__header">' +
        '<h2 class="screen-modal__title">項目の詳細</h2>' +
        '<p class="screen-modal__summary" data-survey-item-summary>タイトルや説明を設定します。</p>' +
        '</header>' +
        '<form class="screen-modal__body survey-management__form" novalidate>' +
        '<div class="survey-management__form-field" data-field="item-title">' +
        '<label class="survey-management__form-label" for="target-survey-item-title">項目タイトル</label>' +
        '<input class="user-management__input" type="text" id="target-survey-item-title" name="itemTitle" maxlength="256" required>' +
        '<p class="form-error" aria-live="polite"></p>' +
        '</div>' +
        '<div class="survey-management__form-field" data-field="item-description">' +
        '<label class="survey-management__form-label" for="target-survey-item-description">説明</label>' +
        '<textarea class="user-management__input" id="target-survey-item-description" name="itemDescription" rows="4" maxlength="1000"></textarea>' +
        '<p class="form-error" aria-live="polite"></p>' +
        '</div>' +
        '<div class="survey-management__form-field" data-field="item-type">' +
        '<label class="survey-management__form-label" for="target-survey-item-type">タイプ</label>' +
        '<select class="user-management__input" id="target-survey-item-type" name="itemType">' +
        '<option value="choiceSingle">choiceSingle</option>' +
        '<option value="choiceMultiple">choiceMultiple</option>' +
        '<option value="text">text</option>' +
        '</select>' +
        '<p class="form-error" aria-live="polite"></p>' +
        '</div>' +
        '<div class="survey-management__form-field" data-field="item-choices" hidden>' +
        '<div class="survey-management__items-header">' +
        '<div class="survey-management__form-label-row">' +
        '<label class="survey-management__form-label">選択肢</label>' +
        '<div class="survey-management__items-actions">' +
        '<button type="button" class="btn btn--ghost" data-survey-item-choice-add>選択肢を追加</button>' +
        '</div>' +
        '</div>' +
        '<p class="survey-management__items-summary">choiceSingle または choiceMultiple の設問に選択肢を設定します。</p>' +
        '<div class="survey-management__items-table" data-survey-item-choice-list></div>' +
        '</div>' +
        '</div>' +
        '<p class="screen-modal__feedback" aria-live="polite"></p>' +
        '<footer class="screen-modal__footer">' +
        '<button type="button" class="btn btn--ghost" data-modal-cancel>キャンセル</button>' +
        '<button type="submit" class="btn btn--primary">保存する</button>' +
        '</footer>' +
        '</form>' +
        '</section>';

      document.body.appendChild(root);

      var overlay = root.querySelector('.screen-modal__overlay');
      var closeButton = root.querySelector('.screen-modal__close');
      var cancelButton = root.querySelector('[data-modal-cancel]');
      var form = root.querySelector('form');
      var titleInput = root.querySelector('#target-survey-item-title');
      var descriptionInput = root.querySelector('#target-survey-item-description');
      var typeSelect = root.querySelector('#target-survey-item-type');
      var choiceSection = root.querySelector('[data-field="item-choices"]');
      var choiceList = root.querySelector('[data-survey-item-choice-list]');
      var addChoiceButton = root.querySelector('[data-survey-item-choice-add]');
      var summaryNode = root.querySelector('[data-survey-item-summary]');
      var feedback = root.querySelector('.screen-modal__feedback');

      var detailModal = {
        root: root,
        overlay: overlay,
        closeButton: closeButton,
        cancelButton: cancelButton,
        form: form,
        titleInput: titleInput,
        descriptionInput: descriptionInput,
        typeSelect: typeSelect,
        choiceSection: choiceSection,
        choiceList: choiceList,
        addChoiceButton: addChoiceButton,
        summaryNode: summaryNode,
        feedback: feedback,
        currentItem: null,
        targetModal: modal
      };

      var self = this;
      var closeHandler = function ()
      {
        self.toggleSurveyItemDetailModal(detailModal, false);
      };

      if (overlay)
      {
        overlay.addEventListener('click', closeHandler);
      }
      if (closeButton)
      {
        closeButton.addEventListener('click', closeHandler);
      }
      if (cancelButton)
      {
        cancelButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          closeHandler();
        });
      }
      if (addChoiceButton)
      {
        addChoiceButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          if (detailModal.currentItem)
          {
            self.addSurveyItemChoice(detailModal);
          }
        });
      }
      if (detailModal.typeSelect)
      {
        detailModal.typeSelect.addEventListener('change', function ()
        {
          var selectedType = detailModal.typeSelect.value || 'text';
          var baseItem = detailModal.currentItem || { choices: [] };
          var nextItem = Object.assign({}, baseItem, { type: selectedType });
          detailModal.currentItem = nextItem;
          self.updateSurveyItemDetailSummary(detailModal, nextItem);
          self.renderSurveyItemChoiceList(modal, detailModal, nextItem);
        });
      }
      if (form)
      {
        form.addEventListener('submit', function (event)
        {
          event.preventDefault();
          self.submitSurveyItemDetail(detailModal);
        });
      }

      modal.itemDetailModal = detailModal;
      return detailModal;
    }

    toggleSurveyItemDetailModal(detailModal, open)
    {
      if (!detailModal)
      {
        return;
      }
      if (open)
      {
        detailModal.root.removeAttribute('hidden');
        detailModal.root.classList.add('is-open');
        if (detailModal.titleInput)
        {
          detailModal.titleInput.focus();
        }
      }
      else
      {
        detailModal.root.setAttribute('hidden', 'hidden');
        detailModal.root.classList.remove('is-open');
      }
    }

    openSurveyItemDetailModal(modal, item)
    {
      var detailModal = this.ensureSurveyItemDetailModal(modal);
      if (!detailModal)
      {
        return;
      }
      var workingItem = item || {
        id: this.createLocalId('survey-item'),
        title: '',
        description: '',
        type: 'text',
        choices: [],
        position: Array.isArray(modal && modal.surveyItems) ? modal.surveyItems.length : 0
      };
      detailModal.currentItem = workingItem;
      this.clearFieldError(detailModal.titleInput ? detailModal.titleInput.closest('[data-field]') : null);
      this.clearFieldError(detailModal.typeSelect ? detailModal.typeSelect.closest('[data-field]') : null);
      if (detailModal.titleInput)
      {
        detailModal.titleInput.value = workingItem && workingItem.title ? workingItem.title : '';
      }
      if (detailModal.descriptionInput)
      {
        detailModal.descriptionInput.value = workingItem && workingItem.description ? workingItem.description : '';
      }
      if (detailModal.typeSelect)
      {
        detailModal.typeSelect.value = workingItem && workingItem.type ? workingItem.type : 'text';
      }
      this.updateSurveyItemDetailSummary(detailModal, workingItem);
      this.renderSurveyItemChoiceList(modal, detailModal, workingItem);
      this.setModalFeedback(detailModal, '');
      this.toggleSurveyItemDetailModal(detailModal, true);
    }

    submitSurveyItemDetail(detailModal)
    {
      if (!detailModal || !detailModal.targetModal)
      {
        return;
      }
      var modal = detailModal.targetModal;
      var title = detailModal.titleInput && detailModal.titleInput.value ? detailModal.titleInput.value.trim() : '';
      var description = detailModal.descriptionInput && detailModal.descriptionInput.value ? detailModal.descriptionInput.value.trim() : '';
      var type = detailModal.typeSelect ? detailModal.typeSelect.value : 'text';
      var hasError = false;
      if (!title)
      {
        this.setFieldError(detailModal.titleInput ? detailModal.titleInput.closest('[data-field]') : null, 'タイトルを入力してください。');
        hasError = true;
      }
      if (!type)
      {
        this.setFieldError(detailModal.typeSelect ? detailModal.typeSelect.closest('[data-field]') : null, 'タイプを選択してください。');
        hasError = true;
      }
      if (hasError)
      {
        if (detailModal.titleInput && !title)
        {
          detailModal.titleInput.focus();
        }
        return;
      }
      var items = Array.isArray(modal.surveyItems) ? modal.surveyItems.slice() : [];
      if (detailModal.currentItem)
      {
        var targetIndex = items.findIndex(function (entry)
        {
          return entry && entry.id === detailModal.currentItem.id;
        });
        if (targetIndex !== -1)
        {
          var preservedChoices = items[targetIndex].type === type ? items[targetIndex].choices : [];
          var updatedItem = Object.assign({}, items[targetIndex], {
            title: title,
            description: description,
            type: type,
            choices: preservedChoices
          });
          items.splice(targetIndex, 1, updatedItem);
        }
        else
        {
          var initialChoices = Array.isArray(detailModal.currentItem.choices) ? detailModal.currentItem.choices : [];
          items.push({
            id: detailModal.currentItem.id || this.createLocalId('survey-item'),
            title: title,
            description: description,
            type: type,
            choices: (type === 'choiceSingle' || type === 'choiceMultiple') ? initialChoices : [],
            position: items.length
          });
        }
        modal.surveyItems = items;
      }
      this.renderSurveyItemEditor(modal);
      this.renderSurveyItemChoiceList(modal, detailModal, detailModal.currentItem);
      this.toggleSurveyItemDetailModal(detailModal, false);
    }

    updateSurveyItemDetailSummary(detailModal, item)
    {
      if (!detailModal || !detailModal.summaryNode)
      {
        return;
      }
      var type = item && item.type ? item.type : 'text';
      if (type === 'choiceSingle')
      {
        detailModal.summaryNode.textContent = '単一選択の設問を作成します。選択肢は一覧から追加してください。';
        return;
      }
      if (type === 'choiceMultiple')
      {
        detailModal.summaryNode.textContent = '複数選択の設問を作成します。選択肢は一覧から追加してください。';
        return;
      }
      detailModal.summaryNode.textContent = '自由記述の設問を作成します。';
    }

    renderSurveyItemChoiceList(modal, detailModal, item)
    {
      if (!detailModal)
      {
        return;
      }
      var isChoiceType = item && (item.type === 'choiceSingle' || item.type === 'choiceMultiple');
      if (detailModal.choiceSection)
      {
        detailModal.choiceSection.hidden = !isChoiceType;
      }
      if (!isChoiceType || !detailModal.choiceList)
      {
        return;
      }
      var targetModal = detailModal.targetModal || modal;
      var items = Array.isArray(targetModal && targetModal.surveyItems) ? targetModal.surveyItems : [];
      var target = items.find(function (entry)
      {
        return entry && item && entry.id === item.id;
      }) || item || detailModal.currentItem;
      var choices = Array.isArray(target && target.choices) ? target.choices : [];
      detailModal.choiceList.innerHTML = '';

      if (!choices.length)
      {
        var empty = document.createElement('p');
        empty.className = 'survey-management__items-empty';
        empty.textContent = '選択肢はまだありません。追加してください。';
        detailModal.choiceList.appendChild(empty);
        return;
      }

      var orderedChoices = choices.slice().sort(function (a, b)
      {
        var posA = Number.isFinite(a && a.position) ? Number(a.position) : choices.indexOf(a);
        var posB = Number.isFinite(b && b.position) ? Number(b.position) : choices.indexOf(b);
        if (posA === posB)
        {
          return 0;
        }
        return posA < posB ? -1 : 1;
      });

      var normalizedChoices = orderedChoices.map(function (choice, index)
      {
        return Object.assign({}, choice, {
          position: Number.isFinite(choice && choice.position) ? Number(choice.position) : index
        });
      });
      var targetIndex = targetModal && Array.isArray(targetModal.surveyItems)
        ? targetModal.surveyItems.findIndex(function (entry)
        {
          return entry && target && entry.id === target.id;
        })
        : -1;
      var nextItem = target ? Object.assign({}, target, { choices: normalizedChoices }) : null;
      if (nextItem)
      {
        if (targetIndex !== -1)
        {
          items.splice(targetIndex, 1, nextItem);
          targetModal.surveyItems = items;
          detailModal.currentItem = nextItem;
        }
        else
        {
          detailModal.currentItem = nextItem;
        }
      }
      choices = normalizedChoices;
      target = nextItem || target;

      var table = document.createElement('table');
      table.className = 'survey-management__items-table-inner survey-management__choice-table';

      var thead = document.createElement('thead');
      thead.innerHTML = '' +
        '<tr>' +
        '<th scope="col">タイトル</th>' +
        '<th scope="col">説明</th>' +
        '<th scope="col" class="survey-management__items-action-col">操作</th>' +
        '</tr>';
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      var self = this;
      choices.forEach(function (choice, index)
      {
        var row = document.createElement('tr');

        var titleCell = document.createElement('td');
        var titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.className = 'user-management__input survey-management__choice-input';
        titleInput.maxLength = 256;
        titleInput.value = choice && choice.title ? choice.title : '';
        titleInput.addEventListener('input', function ()
        {
          self.updateSurveyItemChoice(detailModal, choice && choice.id, { title: titleInput.value });
        });
        titleCell.appendChild(titleInput);
        row.appendChild(titleCell);

        var descriptionCell = document.createElement('td');
        descriptionCell.className = 'survey-management__choice-description-cell';
        var descriptionInput = document.createElement('textarea');
        descriptionInput.className = 'user-management__input survey-management__choice-textarea';
        descriptionInput.rows = 2;
        descriptionInput.maxLength = 1000;
        descriptionInput.value = choice && choice.description ? choice.description : '';
        descriptionInput.addEventListener('input', function ()
        {
          self.updateSurveyItemChoice(detailModal, choice && choice.id, { description: descriptionInput.value });
        });
        descriptionCell.appendChild(descriptionInput);
        row.appendChild(descriptionCell);

        var actionCell = document.createElement('td');
        actionCell.className = 'survey-management__items-action-cell';

        var upButton = self.createActionButton('up', '上に移動', 'survey-management__item-action');
        upButton.disabled = index === 0;
        upButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.moveSurveyItemChoice(targetModal, detailModal, target, choice && choice.id, -1);
        });
        actionCell.appendChild(upButton);

        var downButton = self.createActionButton('down', '下に移動', 'survey-management__item-action');
        downButton.disabled = index === choices.length - 1;
        downButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.moveSurveyItemChoice(targetModal, detailModal, target, choice && choice.id, 1);
        });
        actionCell.appendChild(downButton);

        var deleteButton = self.createActionButton('remove', '削除', 'survey-management__item-action');
        deleteButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.removeSurveyItemChoice(targetModal, target, choice, detailModal);
        });
        actionCell.appendChild(deleteButton);

        row.appendChild(actionCell);
        tbody.appendChild(row);
      });

      table.appendChild(tbody);
      detailModal.choiceList.appendChild(table);
    }

    ensureSurveyItemChoiceModal(modal)
    {
      if (!modal)
      {
        return null;
      }
      if (modal.itemChoiceModal)
      {
        return modal.itemChoiceModal;
      }

      var root = document.createElement('div');
      root.className = 'screen-modal target-survey__modal-container target-survey__submodal';
      root.setAttribute('hidden', 'hidden');
      root.innerHTML = '' +
        '<div class="screen-modal__overlay" data-modal-close></div>' +
        '<section class="screen-modal__content target-reference__modal" role="dialog" aria-modal="true">' +
        '<button type="button" class="screen-modal__close" aria-label="モーダルを閉じる">×</button>' +
        '<header class="screen-modal__header">' +
        '<h2 class="screen-modal__title">選択肢を追加</h2>' +
        '<p class="screen-modal__summary">choiceSingle または choiceMultiple の選択肢を設定します。</p>' +
        '</header>' +
        '<form class="screen-modal__body survey-management__form" novalidate>' +
        '<div class="survey-management__form-field" data-field="choice-title">' +
        '<label class="survey-management__form-label" for="target-survey-choice-title">項目タイトル</label>' +
        '<input class="user-management__input" type="text" id="target-survey-choice-title" name="choiceTitle" maxlength="256" required>' +
        '<p class="form-error" aria-live="polite"></p>' +
        '</div>' +
        '<div class="survey-management__form-field" data-field="choice-description">' +
        '<label class="survey-management__form-label" for="target-survey-choice-description">説明</label>' +
        '<textarea class="user-management__input" id="target-survey-choice-description" name="choiceDescription" rows="3" maxlength="1000"></textarea>' +
        '<p class="form-error" aria-live="polite"></p>' +
        '</div>' +
        '<p class="screen-modal__feedback" aria-live="polite"></p>' +
        '<footer class="screen-modal__footer">' +
        '<button type="button" class="btn btn--ghost" data-modal-cancel>キャンセル</button>' +
        '<button type="submit" class="btn btn--primary">保存する</button>' +
        '</footer>' +
        '</form>' +
        '</section>';

      document.body.appendChild(root);

      var overlay = root.querySelector('.screen-modal__overlay');
      var closeButton = root.querySelector('.screen-modal__close');
      var cancelButton = root.querySelector('[data-modal-cancel]');
      var form = root.querySelector('form');
      var titleInput = root.querySelector('#target-survey-choice-title');
      var descriptionInput = root.querySelector('#target-survey-choice-description');
      var heading = root.querySelector('.screen-modal__title');
      var summary = root.querySelector('.screen-modal__summary');

      var choiceModal = {
        root: root,
        overlay: overlay,
        closeButton: closeButton,
        cancelButton: cancelButton,
        form: form,
        titleInput: titleInput,
        descriptionInput: descriptionInput,
        titleNode: heading,
        summaryNode: summary,
        currentItem: null,
        currentChoice: null,
        targetModal: modal
      };

      var self = this;
      var closeHandler = function ()
      {
        self.toggleSurveyItemChoiceModal(choiceModal, false);
      };

      if (overlay)
      {
        overlay.addEventListener('click', closeHandler);
      }
      if (closeButton)
      {
        closeButton.addEventListener('click', closeHandler);
      }
      if (cancelButton)
      {
        cancelButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          closeHandler();
        });
      }
      if (form)
      {
        form.addEventListener('submit', function (event)
        {
          event.preventDefault();
          self.submitSurveyItemChoice(choiceModal);
        });
      }

      modal.itemChoiceModal = choiceModal;
      return choiceModal;
    }

    toggleSurveyItemChoiceModal(choiceModal, open)
    {
      if (!choiceModal)
      {
        return;
      }
      if (open)
      {
        choiceModal.root.removeAttribute('hidden');
        choiceModal.root.classList.add('is-open');
        if (choiceModal.titleInput)
        {
          choiceModal.titleInput.focus();
        }
      }
      else
      {
        choiceModal.root.setAttribute('hidden', 'hidden');
        choiceModal.root.classList.remove('is-open');
      }
    }

    openSurveyItemChoiceModal(modal, item, choice)
    {
      if (!item)
      {
        return;
      }
      var choiceModal = this.ensureSurveyItemChoiceModal(modal);
      if (!choiceModal)
      {
        return;
      }
      choiceModal.currentItem = item;
      choiceModal.currentChoice = choice || null;
      if (choiceModal.titleInput)
      {
        choiceModal.titleInput.value = choice && choice.title ? choice.title : '';
      }
      if (choiceModal.descriptionInput)
      {
        choiceModal.descriptionInput.value = choice && choice.description ? choice.description : '';
      }
      if (choiceModal.titleNode)
      {
        choiceModal.titleNode.textContent = choice ? '選択肢を編集' : '選択肢を追加';
      }
      if (choiceModal.summaryNode)
      {
        choiceModal.summaryNode.textContent = choice
          ? '既存の選択肢を更新します。'
          : 'choiceSingle または choiceMultiple の選択肢を設定します。';
      }
      this.toggleSurveyItemChoiceModal(choiceModal, true);
    }

    submitSurveyItemChoice(choiceModal)
    {
      if (!choiceModal || !choiceModal.targetModal || !choiceModal.currentItem)
      {
        return;
      }
      var modal = choiceModal.targetModal;
      var title = choiceModal.titleInput && choiceModal.titleInput.value ? choiceModal.titleInput.value.trim() : '';
      var description = choiceModal.descriptionInput && choiceModal.descriptionInput.value
        ? choiceModal.descriptionInput.value.trim()
        : '';
      if (!title)
      {
        this.setFieldError(choiceModal.titleInput ? choiceModal.titleInput.closest('[data-field]') : null, '項目タイトルを入力してください。');
        if (choiceModal.titleInput)
        {
          choiceModal.titleInput.focus();
        }
        return;
      }
      var items = Array.isArray(modal.surveyItems) ? modal.surveyItems.slice() : [];
      var targetIndex = items.findIndex(function (entry)
      {
        return entry && entry.id === choiceModal.currentItem.id;
      });
      var target = targetIndex === -1 ? choiceModal.currentItem : items[targetIndex];
      var choices = Array.isArray(target.choices) ? target.choices.slice() : [];
      if (choiceModal.currentChoice)
      {
        var updatedChoices = choices.map(function (entry)
        {
          if (entry && entry.id === choiceModal.currentChoice.id)
          {
            return Object.assign({}, entry, { title: title, description: description });
          }
          return entry;
        });
        choices = updatedChoices;
      }
      else
      {
        choices.push({
          id: this.createLocalId('choice'),
          title: title,
          description: description,
          position: choices.length
        });
      }
      if (targetIndex === -1)
      {
        choiceModal.currentItem = Object.assign({}, target, { choices: choices });
        if (modal && modal.itemDetailModal)
        {
          modal.itemDetailModal.currentItem = choiceModal.currentItem;
          this.renderSurveyItemChoiceList(modal, modal.itemDetailModal, choiceModal.currentItem);
        }
      }
      else
      {
        items.splice(targetIndex, 1, Object.assign({}, target, { choices: choices }));
        modal.surveyItems = items;
        this.renderSurveyItemEditor(modal);
        this.renderSurveyItemChoiceList(modal, modal.itemDetailModal, choiceModal.currentItem);
      }
      this.toggleSurveyItemChoiceModal(choiceModal, false);
    }

    clearFieldError(field)
    {
      if (!field)
      {
        return;
      }
      field.classList.remove('has-error');
      var message = field.querySelector('.form-error');
      if (message)
      {
        message.textContent = '';
      }
    }

    setFieldError(field, message)
    {
      if (!field)
      {
        return;
      }
      field.classList.add('has-error');
      var error = field.querySelector('.form-error');
      if (error)
      {
        error.textContent = message || '';
      }
    }

    clearModalFeedback(modal)
    {
      if (modal && modal.feedback)
      {
        modal.feedback.textContent = '';
        modal.feedback.removeAttribute('data-feedback-type');
      }
    }

    setModalFeedback(modal, message, type)
    {
      if (!modal || !modal.feedback)
      {
        return;
      }
      modal.feedback.textContent = message || '';
      if (type)
      {
        modal.feedback.setAttribute('data-feedback-type', type);
      }
      else
      {
        modal.feedback.removeAttribute('data-feedback-type');
      }
    }

    setModalSubmitting(modal, isSubmitting)
    {
      if (!modal)
      {
        return;
      }
      modal.isSubmitting = !!isSubmitting;
      var controls = [modal.submitButton, modal.cancelButton, modal.closeButton, modal.audienceAddButton];
      controls.forEach(function (control)
      {
        if (!control)
        {
          return;
        }
        if (modal.isSubmitting)
        {
          control.setAttribute('disabled', 'disabled');
        }
        else
        {
          control.removeAttribute('disabled');
        }
      });
    }

    getAudienceCandidates()
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
        var user = entry.user && typeof entry.user === 'object' ? entry.user : null;
        var userCode = (entry.userCode || entry.code || entry.loginId || (user && (user.userCode || user.code || user.loginId)) || '').trim();
        var displayName = (
          entry.displayName
          || entry.userDisplayName
          || entry.name
          || entry.fullName
          || (user && (user.displayName || user.userDisplayName || user.name || user.fullName))
          || ''
        ).trim();
        if (!displayName && userCode)
        {
          displayName = userCode;
        }
        if (!displayName && !userCode)
        {
          return;
        }

        var isActive = entry.isActive;
        var status = typeof entry.status === 'string' ? entry.status.toLowerCase() : '';
        if (entry.active === false || entry.active === 0 || entry.active === '0' || entry.active === 'false')
        {
          isActive = false;
        }
        if (status === 'inactive')
        {
          isActive = false;
        }
        if (entry.endedAt)
        {
          isActive = false;
        }
        if (user)
        {
          if (user.isActive === false || user.isActive === 0 || user.isActive === '0' || user.isActive === 'false')
          {
            isActive = false;
          }
          if (user.active === false || user.active === 0 || user.active === '0' || user.active === 'false')
          {
            isActive = false;
          }
          var userStatus = typeof user.status === 'string' ? user.status.toLowerCase() : '';
          if (userStatus === 'inactive')
          {
            isActive = false;
          }
          if (user.endedAt)
          {
            isActive = false;
          }
        }
        if (isActive === false)
        {
          return;
        }

        var recipient = normalizeRecipient({
          userCode: userCode,
          displayName: displayName,
          mail: entry.mail || entry.mailAddress || entry.email || (user && (user.mail || user.mailAddress || user.email)) || '',
          isActive: true,
          isGuest: isGuestUser(entry) || isGuestUser(user),
          selectionKey: (entry && entry.selectionKey) || (user && user.selectionKey) || ''
        });
        if (!recipient.selectionKey && recipient.isGuest)
        {
          recipient.selectionKey = (recipient.userCode || recipient.displayName || 'guest') + ':' + normalized.length;
        }
        var key = buildAudienceKey(recipient);
        if (key && seen[key] && !recipient.isGuest)
        {
          return;
        }
        if (key)
        {
          seen[key] = true;
        }
        normalized.push(recipient);
      });
      return normalized;
    }

    setAudienceSelection(modal, list)
    {
      if (!modal)
      {
        return;
      }
      var seen = Object.create(null);
      var selection = [];
      (Array.isArray(list) ? list : []).forEach(function (entry, index)
      {
        var normalized = normalizeRecipient(entry);
        if (!normalized)
        {
          return;
        }
        if (!normalized.selectionKey && entry && entry.selectionKey)
        {
          normalized.selectionKey = normalizeText(entry.selectionKey);
        }
        if (!normalized.selectionKey && (normalized.isGuest || isGuestUser(entry)))
        {
          normalized.selectionKey = (normalized.userCode || normalized.displayName || 'guest') + ':' + index;
        }
        var key = buildAudienceKey(normalized);
        var isGuest = normalized.isGuest || isGuestUser(entry);
        if (key && seen[key] && !isGuest)
        {
          return;
        }
        if (key)
        {
          seen[key] = true;
        }
        selection.push(normalized);
      });
      modal.selectedRecipients = selection;
      this.renderAudienceSelection(modal);
      this.clearFieldError(modal.audienceField);
    }

    renderAudienceSelection(modal)
    {
      if (!modal)
      {
        return;
      }
      var list = modal.audienceList;
      if (list)
      {
        list.innerHTML = '';
      }
      var selection = Array.isArray(modal.selectedRecipients) ? modal.selectedRecipients : [];
      if (modal.audienceCount)
      {
        modal.audienceCount.textContent = selection.length
          ? selection.length + '名が選択されています。'
          : '';
      }
      if (!list)
      {
        return;
      }
      if (!selection.length)
      {
        var empty = document.createElement('p');
        empty.className = 'survey-management__audience-empty';
        empty.textContent = '対象ユーザーは選択されていません。';
        list.appendChild(empty);
        return;
      }

      var table = document.createElement('table');
      table.className = 'survey-management__audience-table';

      var thead = document.createElement('thead');
      thead.innerHTML = '' +
        '<tr>' +
        '<th scope="col">ユーザー</th>' +
        '<th scope="col" class="survey-management__audience-action-header">操作</th>' +
        '</tr>';
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      var self = this;
      selection.forEach(function (user)
      {
        var row = document.createElement('tr');

        var userCell = document.createElement('td');
        userCell.className = 'survey-management__audience-user-cell';

        var userBlock = document.createElement('div');
        userBlock.className = 'survey-management__audience-user';

        var avatar = document.createElement('span');
        avatar.className = 'survey-management__audience-avatar c-user-avatar-host';
        avatar.dataset.avatarName = user.displayName || user.userCode || 'ユーザー';
        avatar.dataset.avatarAlt = avatar.dataset.avatarName;
        if (user.userCode)
        {
          avatar.dataset.userCode = user.userCode;
        }
        self.renderAvatar(avatar, {
          name: user.displayName || user.userCode,
          userCode: user.userCode,
          src: user.avatarUrl,
          transform: user.avatarTransform,
          initial: user.avatarInitial,
          isActive: user.isActive !== false
        }, { size: 32, nameOverlay: false });
        userBlock.appendChild(avatar);

        var name = document.createElement('span');
        name.className = 'survey-management__audience-name';
        name.textContent = user.displayName || user.userCode || 'ユーザー';
        userBlock.appendChild(name);

        userCell.appendChild(userBlock);
        row.appendChild(userCell);

        var actionCell = document.createElement('td');
        actionCell.className = 'survey-management__audience-action-cell';
        var removeButton = self.createActionButton('remove', '削除', 'survey-management__audience-remove');
        removeButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.removeAudienceSelection(modal, user);
        });
        actionCell.appendChild(removeButton);
        row.appendChild(actionCell);

        tbody.appendChild(row);
      });

      table.appendChild(tbody);
      list.appendChild(table);
    }

    removeAudienceSelection(modal, user)
    {
      if (!modal)
      {
        return;
      }
      var targetKey = buildAudienceKey(normalizeRecipient(user));
      var next = (modal.selectedRecipients || []).filter(function (entry)
      {
        var currentKey = buildAudienceKey(entry);
        if (targetKey)
        {
          return currentKey !== targetKey;
        }
        return entry !== user;
      });
      this.setAudienceSelection(modal, next);
    }

    async openAudienceSelector(modal)
    {
      var service = this.page && this.page.userSelectModalService;
      if (!service || typeof service.open !== 'function')
      {
        this.setModalFeedback(modal, '対象ユーザー選択モーダルを利用できません。', 'error');
        return;
      }
      var selectedCodes = (modal.selectedRecipients || []).map(function (entry)
      {
        return entry && entry.userCode ? entry.userCode : null;
      }).filter(Boolean);
      var selectedKeys = (modal.selectedRecipients || []).map(function (entry)
      {
        return buildAudienceKey(entry);
      }).filter(Boolean);
      var candidates = this.getAudienceCandidates();
      var availableUsers = candidates.filter(function (entry)
      {
        if (isGuestUser(entry))
        {
          return true;
        }
        return selectedKeys.indexOf(buildAudienceKey(entry)) === -1;
      });
      service.open({
        multiple: true,
        availableUsers: availableUsers,
        selectedCodes: selectedCodes,
        onApply: (users) =>
        {
          this.setAudienceSelection(modal, users || []);
        },
        onSelect: (user) =>
        {
          var latest = Array.isArray(modal.selectedRecipients) ? modal.selectedRecipients.slice() : [];
          if (user)
          {
            latest.push(user);
          }
          this.setAudienceSelection(modal, latest);
        }
      });
    }

    async submitForm(modal)
    {
      if (!modal || modal.isSubmitting)
      {
        return;
      }
      this.clearModalFeedback(modal);
      this.clearFieldError(modal.titleField);
      this.clearFieldError(modal.contentField);
      this.clearFieldError(modal.startField);
      this.clearFieldError(modal.endField);
      this.clearFieldError(modal.audienceField);

      var title = modal.titleInput && modal.titleInput.value ? modal.titleInput.value.trim() : '';
      var content = modal.contentInput && modal.contentInput.value ? modal.contentInput.value.trim() : '';
      var startValue = modal.startInput && modal.startInput.value ? modal.startInput.value.trim() : '';
      var endValue = modal.endInput && modal.endInput.value ? modal.endInput.value.trim() : '';
      var startDate = startValue ? parseDate(startValue) : null;
      var endDate = endValue ? parseDate(endValue) : null;
      var audience = Array.isArray(modal.selectedRecipients) ? modal.selectedRecipients : [];
      var hasError = false;
      if (!title)
      {
        this.setFieldError(modal.titleField, 'タイトルを入力してください。');
        hasError = true;
      }
      if (!content)
      {
        this.setFieldError(modal.contentField, '内容を入力してください。');
        hasError = true;
      }
      if (!startDate)
      {
        this.setFieldError(modal.startField, '開始日時を入力してください。');
        hasError = true;
      }
      if (!endDate)
      {
        this.setFieldError(modal.endField, '終了日時を入力してください。');
        hasError = true;
      }
      if (!hasError && startDate && endDate && startDate.getTime() > endDate.getTime())
      {
        this.setFieldError(modal.startField, '開始日時は終了日時以前に設定してください。');
        this.setFieldError(modal.endField, '開始日時は終了日時以前に設定してください。');
        hasError = true;
      }
      if (!audience.length)
      {
        this.setFieldError(modal.audienceField, '対象ユーザーを選択してください。');
        hasError = true;
      }
      if (hasError)
      {
        if (modal.titleInput && !title)
        {
          modal.titleInput.focus();
        }
        else if (modal.contentInput)
        {
          modal.contentInput.focus();
        }
        else if (modal.startInput && !startDate)
        {
          modal.startInput.focus();
        }
        else if (modal.endInput && (!endDate || (startDate && endDate && startDate.getTime() > endDate.getTime())))
        {
          modal.endInput.focus();
        }
        else if (modal.audienceAddButton)
        {
          modal.audienceAddButton.focus();
        }
        return;
      }

      this.setModalSubmitting(modal, true);
      try
      {
        var payload = {
          targetCode: this.page.state.targetCode,
          title: title,
          content: content,
          startAt: formatServerTimestamp(startDate),
          endAt: formatServerTimestamp(endDate),
          recipients: audience
            .map(function (entry)
            {
              return entry && entry.userCode ? String(entry.userCode).trim() : '';
            })
            .filter(function (code)
            {
              return code !== '';
            }),
          items: this.serializeSurveyItems(modal.surveyItems)
        };
        var requestType = 'TargetSurveyCreate';
        if (modal.mode === 'edit' && modal.currentItem && modal.currentItem.id)
        {
          requestType = 'TargetSurveyUpdate';
          payload.id = modal.currentItem.id;
        }
        await this.page.callApi(
          requestType,
          payload,
          { requestType: 'TargetManagementSurvey' }
        );
        await this.fetchAndRenderSurvey();
        var successMessage = modal.mode === 'edit' ? 'アンケートを更新しました。' : 'アンケートを追加しました。';
        this.setFeedback('');
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('success', successMessage);
        }
        this.closeFormModal();
      }
      catch (error)
      {
        this.setModalFeedback(modal, 'アンケートの保存に失敗しました。もう一度お試しください。', 'error');
        if (window.console && typeof window.console.error === 'function')
        {
          window.console.error('[target-detail] failed to save survey', error);
        }
      }
      this.setModalSubmitting(modal, false);
    }
  }

  var NS = window.TargetDetail || (window.TargetDetail = {});
  NS.JobSurvey = NS.JobSurvey || TargetDetailSurvey;
})(window, document);
