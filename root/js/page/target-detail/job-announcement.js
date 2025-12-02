(function ()
{
  'use strict';

  function normalizeText(value)
  {
    if (value == null)
    {
      return '';
    }
    return String(value).trim();
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
    if (entry.isActive === false)
    {
      return null;
    }
    var userCode = normalizeText(entry.userCode || entry.code || '');
    var displayName = normalizeText(entry.displayName || entry.userDisplayName || entry.name || userCode);
    if (!userCode && !displayName)
    {
      return null;
    }
    var acknowledgedAt = normalizeText(entry.acknowledgedAt || entry.readAt || '');
    return {
      userCode: userCode,
      displayName: displayName || userCode || 'ユーザー',
      role: normalizeText(entry.role || ''),
      acknowledgedAt: acknowledgedAt,
      acknowledgedDisplay: acknowledgedAt || (entry.acknowledgedAtDisplay || ''),
      avatarUrl: normalizeText(entry.avatarUrl || entry.photoUrl || ''),
      avatarInitial: normalizeText(entry.avatarInitial || entry.initial || ''),
      avatarTransform: normalizeText(entry.avatarTransform || entry.transform || ''),
      isActive: entry.isActive !== false
    };
  }

  function normalizeRoleFlag(value)
  {
    if (typeof value === 'string')
    {
      var normalized = value.trim().toLowerCase();
      return normalized === '1' || normalized === 'true';
    }
    return value === true || value === 1;
  }

  function buildAudienceKey(entry)
  {
    if (!entry)
    {
      return '';
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

  class TargetDetailAnnouncement
  {
    constructor(pageInstance)
    {
      this.page = pageInstance;
      this.helpers = pageInstance && pageInstance.helpers ? pageInstance.helpers : {};
      this.canManage = false;
      this.state = { items: [], hasPresentedPending: false, acknowledgingId: null };
      this.refs = {
        container: null,
        list: null,
        empty: null,
        feedback: null,
        refreshButton: null,
        addButton: null
      };
      this.buttonService = null;
      this.modals = { form: null, detail: null };
    }

    getRoleFlags()
    {
      var flags = this.page && this.page.state ? this.page.state.roleFlags : null;
      return flags || { isSupervisor: false, isOperator: false };
    }

    getSessionUserSelection()
    {
      var profile = this.page && this.page.state ? this.page.state.profile : null;
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
      return { displayName: displayName || '', userCode: userCode || '' };
    }

    shouldShowAuthorField()
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

    getUserSelectModalService()
    {
      if (this.page && this.page.userSelectModalService)
      {
        return this.page.userSelectModalService;
      }
      return null;
    }

    getAuthorCandidates()
    {
      var target = this.page && this.page.state ? this.page.state.target : null;
      var candidates = target && Array.isArray(target.participants) ? target.participants.slice() : [];

      var seen = Object.create(null);
      var normalize = function (entry)
      {
        if (!entry)
        {
          return null;
        }
        var user = entry.user && typeof entry.user === 'object' ? entry.user : null;
        var userCode = (entry.userCode || entry.code || entry.loginId || (user && (user.userCode || user.code || user.loginId))
          || '').trim();
        var displayName = (
          entry.displayName ||
          entry.userDisplayName ||
          entry.name ||
          entry.fullName ||
          (user && (user.displayName || user.userDisplayName || user.name || user.fullName))
        ).trim();
        if (!displayName && userCode)
        {
          displayName = userCode;
        }
        if (!displayName && !userCode)
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

        var resolveRole = function (entryValue, userValue)
        {
          var sources = [];
          if (entryValue && typeof entryValue === 'object')
          {
            sources.push(entryValue);
          }
          if (userValue && typeof userValue === 'object')
          {
            sources.push(userValue);
          }
          for (var i = 0; i < sources.length; i += 1)
          {
            var source = sources[i];
            var role = source.role;
            if (role && typeof role === 'object')
            {
              if (typeof role.key === 'string' && role.key.trim())
              {
                return role.key.trim().toLowerCase();
              }
              if (typeof role.name === 'string' && role.name.trim())
              {
                return role.name.trim().toLowerCase();
              }
            }
            var keys = ['role', 'roleName', 'roleKey', 'assignmentRole', 'position', 'type'];
            for (var j = 0; j < keys.length; j += 1)
            {
              var key = keys[j];
              var value = source[key];
              if (typeof value === 'string' && value.trim())
              {
                return value.trim().toLowerCase();
              }
            }
          }
          return '';
        };

        var role = resolveRole(entry, user);
        var isOperator = normalizeRoleFlag(entry.isOperator) || normalizeRoleFlag(user && user.isOperator) || role === 'operator';
        var isSupervisor = normalizeRoleFlag(entry.isSupervisor)
          || normalizeRoleFlag(user && user.isSupervisor)
          || role === 'supervisor'
          || role === 'admin';
        if (!isOperator && !isSupervisor)
        {
          return null;
        }

        return {
          displayName: displayName,
          userCode: userCode,
          isActive: isActive
        };
      };

      var normalizedList = [];
      candidates.forEach(function (entry)
      {
        var normalized = normalize(entry);
        if (!normalized)
        {
          return;
        }
        var key = (normalized.userCode || normalized.displayName || '').toLowerCase();
        if (key && seen[key])
        {
          return;
        }
        if (key)
        {
          seen[key] = true;
        }
        normalizedList.push(normalized);
      });

      return normalizedList;
    }

    normalizeAuthor(selection)
    {
      if (!selection)
      {
        return null;
      }
      var userCode = selection.userCode || selection.code || '';
      var displayName = selection.displayName || selection.name || selection.fullName || '';
      if (!displayName && userCode)
      {
        displayName = userCode;
      }
      if (!displayName && !userCode)
      {
        return null;
      }
      return { displayName: displayName, userCode: userCode };
    }

    setAuthorSelection(modal, selection)
    {
      if (!modal)
      {
        return;
      }
      var normalized = this.normalizeAuthor(selection);
      modal.selectedAuthor = normalized;
      var hasSelection = !!(normalized && (normalized.displayName || normalized.userCode));
      if (modal.authorSummary)
      {
        modal.authorSummary.hidden = !hasSelection;
      }
      if (modal.authorEmpty)
      {
        modal.authorEmpty.hidden = hasSelection;
      }
      if (modal.authorName)
      {
        modal.authorName.textContent = normalized ? normalized.displayName : '';
      }
      if (modal.authorCode)
      {
        modal.authorCode.textContent = normalized && normalized.userCode ? '(' + normalized.userCode + ')' : '';
      }
      if (modal.authorClearButton)
      {
        if (hasSelection)
        {
          modal.authorClearButton.removeAttribute('disabled');
        }
        else
        {
          modal.authorClearButton.setAttribute('disabled', 'disabled');
        }
      }
      this.clearFieldError(modal.authorField);
    }

    getAuthorSelection(modal)
    {
      if (!modal)
      {
        return null;
      }
      return this.normalizeAuthor(modal.selectedAuthor);
    }

    applyAuthorSelectionPolicy(modal, selection)
    {
      if (!modal)
      {
        return;
      }
      var isSupervisor = this.shouldShowAuthorField();
      var resolved = isSupervisor ? selection : (this.getSessionUserSelection() || selection || null);
      this.setAuthorSelection(modal, resolved);
      this.setElementVisibility(modal.authorField, isSupervisor);
      this.setElementVisibility(modal.authorActions, isSupervisor);
      if (modal.authorSelectButton)
      {
        modal.authorSelectButton.hidden = !isSupervisor;
        if (isSupervisor)
        {
          modal.authorSelectButton.removeAttribute('aria-hidden');
        }
        else
        {
          modal.authorSelectButton.setAttribute('aria-hidden', 'true');
        }
      }
      if (modal.authorClearButton)
      {
        modal.authorClearButton.hidden = !isSupervisor;
      }
    }

    resolveAnnouncementAuthorSelection(entry)
    {
      if (!entry)
      {
        return null;
      }
      var userCode = entry.createdByUserCode || entry.ownerUserCode || '';
      var displayName = entry.createdByDisplayName || entry.createdByUserDisplayName || entry.ownerDisplayName || '';
      if (!displayName && userCode)
      {
        displayName = userCode;
      }
      if (!displayName && !userCode)
      {
        return null;
      }
      return { displayName: displayName, userCode: userCode };
    }

    openAuthorSelector(modal)
    {
      if (!this.shouldShowAuthorField())
      {
        return;
      }
      var service = this.getUserSelectModalService();
      if (!service || typeof service.open !== 'function')
      {
        this.setModalFeedback(modal, '作成者の選択モーダルを利用できません。', 'error');
        return;
      }
      var candidates = this.getAuthorCandidates();
      if (!candidates.length)
      {
        this.setModalFeedback(modal, '選択できる作成者が見つかりません。', 'error');
        return;
      }
      var selectedCodes = [];
      var selected = modal && modal.selectedAuthor ? modal.selectedAuthor : null;
      if (selected && selected.userCode)
      {
        selectedCodes.push(selected.userCode);
      }
      var options = {
        multiple: false,
        availableUsers: candidates,
        selectedCodes: selectedCodes,
        onApply: (users) =>
        {
          var first = Array.isArray(users) && users.length ? users[0] : null;
          this.setAuthorSelection(modal, first);
        },
        onSelect: (user) =>
        {
          this.setAuthorSelection(modal, user);
        },
        onDeselect: () =>
        {
          this.setAuthorSelection(modal, null);
        },
        onClose: () =>
        {
          if (modal && modal.authorSelectButton && typeof modal.authorSelectButton.focus === 'function')
          {
            modal.authorSelectButton.focus();
          }
        }
      };
      var zIndex = this.resolveNestedModalZIndex(modal);
      if (zIndex !== null)
      {
        options.zIndex = zIndex;
      }
      service.open(options);
    }

    async render()
    {
      this.canManage = this.page && typeof this.page.canManageTargetContent === 'function'
        && this.page.canManageTargetContent();
      this.refs.container = this.page.refs.tabPanels && this.page.refs.tabPanels.announcements;
      if (!this.refs.container)
      {
        return;
      }
      this.refs.container.innerHTML = '';
      this.refs.container.classList.add('target-detail__panel');

      var section = document.createElement('section');
      section.className = 'target-announcement target-reference';

      section.appendChild(this.renderHeader());
      section.appendChild(this.renderFeedbackRegion());

      var list = document.createElement('div');
      list.className = 'target-reference__list';
      this.refs.list = list;
      section.appendChild(list);

      var empty = document.createElement('div');
      empty.className = 'target-reference__empty';
      empty.textContent = 'このターゲットへのお知らせはまだありません。';
      this.refs.empty = empty;
      section.appendChild(empty);

      this.refs.container.appendChild(section);

      var items = await this.page.loadAnnouncements();
      this.state.items = this.normalizeAnnouncements(Array.isArray(items) ? items : []);
      this.renderList();
      this.bindEvents();
      await this.showPendingAnnouncementForViewer();
    }

    renderHeader()
    {
      var header = document.createElement('div');
      header.className = 'target-detail__section-header';

      var title = document.createElement('h2');
      title.textContent = 'お知らせ';
      header.appendChild(title);

      var actions = document.createElement('div');
      actions.className = 'target-detail__section-actions target-reference__actions target-announcement__actions';

      if (this.canManage)
      {
        var addButton = this.createServiceActionButton(
          'expandable-icon-button/add',
          {
            label: 'お知らせを追加',
            ariaLabel: 'お知らせを追加',
            hoverLabel: 'お知らせを追加',
            className:
              'target-management__icon-button target-management__icon-button--primary target-announcement__add'
          },
          'btn btn--primary'
        );
        this.refs.addButton = addButton;
        actions.appendChild(addButton);
      }

      var refreshButton = this.createServiceActionButton(
        'expandable-icon-button/reload',
        {
          label: '再読み込み',
          ariaLabel: 'お知らせを再読み込み',
          hoverLabel: 'お知らせを再読み込み',
          title: 'お知らせを再読み込み',
          className: 'target-management__icon-button target-management__icon-button--ghost target-announcement__refresh'
        },
        'btn btn--ghost'
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
          this.reloadAnnouncements();
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

    async reloadAnnouncements()
    {
      this.setFeedback('お知らせを再読み込みしています…', 'info');
      try
      {
        await this.fetchAndRenderAnnouncements();
        this.setFeedback('最新のお知らせを読み込みました。', 'success');
      }
      catch (error)
      {
        this.setFeedback('お知らせの再読み込みに失敗しました。', 'error');
        if (window.console && typeof window.console.error === 'function')
        {
          window.console.error('[target-detail] failed to reload announcements', error);
        }
      }
    }

    normalizeAnnouncements(list)
    {
      var helpers = this.helpers;
      return list.map(function (raw)
      {
        var announcementCode = normalizeText(raw && raw.announcementCode);
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
        var rawId = raw && (raw.id || raw.announcementCode);
        var normalizedId = normalizeText(rawId);
        return {
          id: normalizedId,
          announcementCode: announcementCode || normalizedId,
          title: normalizeText(raw && raw.title) || '（無題）',
          content: formatContent(raw && (raw.content || raw.body || raw.message || '')),
          createdAt: raw && raw.createdAt ? raw.createdAt : '',
          createdAtDisplay: formatDateTime(helpers, raw && raw.createdAt),
          createdByDisplayName: normalizeText(raw && (raw.createdByDisplayName || raw.createdByUserDisplayName)),
          createdByUserCode: normalizeText(raw && raw.createdByUserCode),
          createdByAvatarUrl: normalizeText(raw && raw.createdByAvatarUrl),
          createdByAvatarTransform: normalizeText(raw && raw.createdByAvatarTransform),
          createdByAvatarInitial: normalizeText(raw && raw.createdByAvatarInitial),
          acknowledgedCount: acknowledgedCount,
          recipientCount: recipientCount > 0 ? recipientCount : 0,
          acknowledgedRate: recipientCount > 0 ? Math.round((acknowledgedCount / recipientCount) * 100) : 0,
          recipients: recipients
        };
      }, this);
    }

    normalizeRecipients(list)
    {
      var seen = Object.create(null);
      var recipients = [];
      (Array.isArray(list) ? list : []).forEach(function (entry)
      {
        var normalized = normalizeRecipient(entry);
        if (!normalized)
        {
          return;
        }
        var key = buildAudienceKey(normalized);
        if (key && seen[key])
        {
          return;
        }
        seen[key] = true;
        recipients.push(normalized);
      });
      return recipients;
    }

    renderList()
    {
      if (!this.refs.list)
      {
        return;
      }
      var items = this.state.items || [];
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
      table.className = 'target-detail__announcement-table';

      var thead = document.createElement('thead');
      thead.innerHTML = '' +
        '<tr>' +
        '<th scope="col">作成者</th>' +
        '<th scope="col">タイトル</th>' +
        '<th scope="col">作成日</th>' +
        '<th scope="col">確認状況</th>' +
        '<th scope="col" class="target-reference__actions-header">操作</th>' +
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
    }

    createTableRow(item)
    {
      var row = document.createElement('tr');

      row.appendChild(this.renderAuthorCell(item));

      var titleCell = document.createElement('td');
      titleCell.className = 'target-detail__announcement-content-cell';
      var title = document.createElement('p');
      title.className = 'target-detail__announcement-content-title';
      title.textContent = item.title || '—';
      titleCell.appendChild(title);

      var preview = document.createElement('p');
      preview.className = 'target-detail__announcement-content-preview';
      preview.textContent = item.content || '—';
      titleCell.appendChild(preview);
      row.appendChild(titleCell);

      var createdCell = document.createElement('td');
      createdCell.textContent = item.createdAtDisplay || '—';
      row.appendChild(createdCell);

      row.appendChild(this.renderProgressCell(item));
      row.appendChild(this.renderActionsCell(item));
      return row;
    }

    renderAuthorCell(item)
    {
      var cell = document.createElement('td');
      cell.className = 'target-detail__announcement-author-cell';

      var author = document.createElement('div');
      author.className = 'target-detail__announcement-author';

      var avatarHost = document.createElement('span');
      avatarHost.className = 'target-detail__announcement-author-avatar c-user-avatar-host';
      avatarHost.dataset.avatarName = item.createdByDisplayName || item.createdByUserCode || '作成者';
      avatarHost.dataset.avatarAlt = avatarHost.dataset.avatarName;
      if (item.createdByUserCode)
      {
        avatarHost.dataset.userCode = item.createdByUserCode;
      }
      avatarHost.dataset.userActive = item && item.createdByIsActive === false ? 'false' : 'true';
      this.renderAvatar(avatarHost, {
        name: avatarHost.dataset.avatarName,
        userCode: item.createdByUserCode,
        src: item.createdByAvatarUrl,
        transform: item.createdByAvatarTransform,
        initial: item.createdByAvatarInitial,
        isActive: item && item.createdByIsActive !== false
      }, { size: 36, nameOverlay: true });
      author.appendChild(avatarHost);

      var name = document.createElement('div');
      name.className = 'target-detail__announcement-author-name';
      name.textContent = item.createdByDisplayName || item.createdByUserCode || '—';
      author.appendChild(name);

      cell.appendChild(author);
      return cell;
    }

    renderProgressCell(item)
    {
      var cell = document.createElement('td');
      cell.className = 'target-detail__announcement-progress-chart-cell';
      var meter = document.createElement('div');
      meter.className = 'target-detail__announcement-progress-meter';
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
      bar.className = 'target-detail__announcement-progress-bar';
      bar.style.width = rate + '%';
      meter.appendChild(bar);

      var percentage = document.createElement('span');
      percentage.className = 'target-detail__announcement-progress-percentage';
      percentage.textContent = rate + '%';
      meter.appendChild(percentage);

      var summary = document.createElement('p');
      summary.className = 'target-detail__announcement-ack-badge';
      summary.textContent = this.formatAcknowledgementStatus(item);

      cell.appendChild(meter);
      cell.appendChild(summary);
      return cell;
    }

    renderActionsCell(item)
    {
      var cell = document.createElement('td');
      cell.className = 'target-detail__announcement-action-group';

      var detailButton = this.createActionButton('detail', '詳細', 'target-detail__announcement-action target-detail__announcement-action--detail');
      detailButton.addEventListener('click', (event) =>
      {
        event.preventDefault();
        this.handleDetail(item, detailButton);
      });
      cell.appendChild(detailButton);

      var editButton = this.createActionButton('edit', '編集', 'target-detail__announcement-action target-detail__announcement-action--edit');
      editButton.disabled = !this.canManage;
      editButton.addEventListener('click', (event) =>
      {
        event.preventDefault();
        this.handleEdit(item, editButton);
      });
      cell.appendChild(editButton);

      var deleteButton = this.createActionButton('delete', '削除', 'target-detail__announcement-action target-detail__announcement-action--delete');
      deleteButton.disabled = !this.canManage;
      deleteButton.addEventListener('click', (event) =>
      {
        event.preventDefault();
        this.handleDelete(item, deleteButton);
      });
      cell.appendChild(deleteButton);

      return cell;
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
        return '全員確認済み（' + total + '/' + total + '）';
      }
      if (!acknowledged)
      {
        return '未確認（0/' + total + '）';
      }
      return '確認 ' + acknowledged + ' / ' + total;
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
      var record = await this.loadAnnouncementDetail(item);
      modal.currentItem = record;
      this.renderDetailModal(record, modal);
      this.toggleDetailModal(modal, true);
    }

    async handleEdit(item, trigger)
    {
      if (!this.canManage)
      {
        return;
      }
      var modal = this.ensureFormModal();
      modal.trigger = trigger || null;
      var record = await this.loadAnnouncementDetail(item);
      this.openFormModal(modal, 'edit', record);
    }

    async handleDelete(item, button)
    {
      if (!this.canManage || !item || !item.id)
      {
        return;
      }
      var confirmed = await this.page.confirmDialogService.open('このお知らせを削除しますか？', { type: 'warning' });
      if (!confirmed)
      {
        return;
      }
      if (button)
      {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
      }
      this.setFeedback('お知らせを削除しています…', 'info');
      try
      {
        await this.page.callApi('TargetAnnouncementDelete', {
          targetCode: this.page.state.targetCode,
          announcementCode: item.id
        }, { requestType: 'TargetManagementAnnouncements' });
        this.state.items = this.state.items.filter(function (entry)
        {
          return entry && entry.id !== item.id;
        });
        if (Array.isArray(this.page.state.announcements))
        {
          this.page.state.announcements = this.page.state.announcements.filter(function (entry)
          {
            return entry && (entry.id || entry.announcementCode) !== item.id;
          });
        }
        this.renderList();
        this.setFeedback('お知らせを削除しました。', 'success');
        this.page.showToast('success', 'お知らせを削除しました。');
      }
      catch (error)
      {
        this.setFeedback('お知らせの削除に失敗しました。', 'error');
        window.console.error('[target-detail] failed to delete announcement', error);
        this.page.showToast('error', 'お知らせの削除に失敗しました。');
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
      root.className = 'target-detail__announcement-modal';
      root.setAttribute('hidden', 'hidden');
      root.innerHTML = '' +
        '<div class="target-detail__announcement-overlay" data-modal-close></div>' +
        '<div class="target-detail__announcement-dialog" role="dialog" aria-modal="true" aria-labelledby="target-announce-detail-title">' +
        '  <header class="target-detail__announcement-dialog-header">' +
        '    <div>' +
        '      <h2 class="target-detail__announcement-dialog-title" id="target-announce-detail-title"></h2>' +
        '      <p class="target-detail__announcement-dialog-meta" data-announcement-meta></p>' +
        '    </div>' +
        '    <button type="button" class="target-detail__announcement-dialog-close" aria-label="閉じる">×</button>' +
        '  </header>' +
        '  <hr class="target-detail__announcement-dialog-divider" />' +
        '  <div class="target-detail__announcement-dialog-content" data-announcement-content></div>' +
        '  <div class="target-detail__announcement-status">' +
        '    <div class="target-detail__announcement-status__header">' +
        '      <h3 class="target-detail__announcement-status-title">確認状況</h3>' +
        '      <p class="target-detail__announcement-status-summary" data-announcement-status-summary></p>' +
        '    </div>' +
        '    <div class="target-detail__announcement-status-table-wrapper">' +
        '      <table class="target-detail__announcement-status-table">' +
        '        <thead><tr><th scope="col">ユーザー</th><th scope="col">状態</th><th scope="col">確認日時</th><th scope="col" class="target-detail__announcement-status-action-header">操作</th></tr></thead>' +
        '        <tbody data-announcement-status-body></tbody>' +
        '      </table>' +
        '    </div>' +
        '  </div>' +
        '  <footer class="target-detail__announcement-actions" data-announcement-actions hidden>' +
        '    <p class="target-detail__announcement-actions-text">内容を確認したら「確認しました」を押してください。</p>' +
        '    <div class="target-detail__announcement-actions-buttons">' +
        '      <button type="button" class="btn btn--primary" data-announcement-confirm>確認しました</button>' +
        '    </div>' +
        '  </footer>' +
        '</div>';
      document.body.appendChild(root);
      var overlay = root.querySelector('[data-modal-close]');
      var closeButton = root.querySelector('.target-detail__announcement-dialog-close');
      var modal = {
        root: root,
        overlay: overlay,
        closeButton: closeButton,
        title: root.querySelector('.target-detail__announcement-dialog-title'),
        meta: root.querySelector('[data-announcement-meta]'),
        content: root.querySelector('[data-announcement-content]'),
        statusSummary: root.querySelector('[data-announcement-status-summary]'),
        statusBody: root.querySelector('[data-announcement-status-body]'),
        statusSection: root.querySelector('.target-detail__announcement-status'),
        actions: root.querySelector('[data-announcement-actions]'),
        confirmButton: root.querySelector('[data-announcement-confirm]'),
        trigger: null,
        currentItem: null,
        hideStatus: false
      };

      var close = () => this.toggleDetailModal(modal, false);
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
          this.handleAnnouncementConfirm(modal);
        });
      }
      this.modals.detail = modal;
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
      var stillOpen = document.querySelector('.screen-modal.is-open, .c-help-modal.is-open, [data-modal-open="true"], .target-detail__announcement-modal[data-open="true"]');
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
        modal.title.textContent = item && item.title ? item.title : 'お知らせ詳細';
      }
      if (modal.meta)
      {
        modal.meta.innerHTML = '';
        var metaAuthor = document.createElement('span');
        metaAuthor.className = 'target-detail__announcement-dialog-author';
        var avatarHost = document.createElement('span');
        avatarHost.className = 'target-detail__announcement-author-avatar target-detail__announcement-dialog-author-avatar c-user-avatar-host';
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
        authorId.className = 'target-detail__announcement-dialog-author-id';
        authorId.textContent = item && item.createdByUserCode ? item.createdByUserCode : '—';
        metaAuthor.appendChild(authorId);
        modal.meta.appendChild(metaAuthor);

        var dateText = item && item.createdAtDisplay ? item.createdAtDisplay : '';
        if (dateText)
        {
          var date = document.createElement('span');
          date.className = 'target-detail__announcement-dialog-date';
          date.textContent = dateText;
          modal.meta.appendChild(date);
        }
      }
      if (modal.content)
      {
        modal.content.innerHTML = '';
        var contentSection = document.createElement('div');
        contentSection.className = 'target-detail__announcement-dialog-section';
        var contentBody = document.createElement('div');
        contentBody.className = 'target-detail__announcement-dialog-body';
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
          empty.className = 'target-detail__announcement-detail-empty';
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
      if (!hideStatus && modal.statusSummary)
      {
        modal.statusSummary.textContent = this.formatAcknowledgementStatus(item);
      }
      if (!hideStatus && modal.statusBody)
      {
        modal.statusBody.innerHTML = '';
        if (!recipients.length)
        {
          var emptyRow = document.createElement('tr');
          var cell = document.createElement('td');
          cell.colSpan = 4;
          cell.className = 'target-detail__announcement-status-empty';
          cell.textContent = '対象ユーザーが設定されていません。';
          emptyRow.appendChild(cell);
          modal.statusBody.appendChild(emptyRow);
        }
        else
        {
          for (var i = 0; i < recipients.length; i += 1)
          {
            modal.statusBody.appendChild(this.renderRecipientRow(recipients[i], item));
          }
        }
      }
      this.updateDetailModalActions(modal, item);
    }

    isAnnouncementPendingForUser(item, userCode)
    {
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
        return recipientCode && recipientCode === normalizedUser && !recipient.acknowledgedAt;
      });
    }

    updateDetailModalActions(modal, item)
    {
      if (!modal)
      {
        return;
      }
      var viewer = this.getViewerUserCode();
      var pending = this.isAnnouncementPendingForUser(item, viewer);
      var isProcessing = item && this.state.acknowledgingId === item.id;
      if (modal.actions)
      {
        modal.actions.hidden = !pending;
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

    renderRecipientRow(recipient, item)
    {
      var row = document.createElement('tr');
      var userCell = document.createElement('td');
      userCell.className = 'target-detail__announcement-status-user-cell';
      var identity = document.createElement('div');
      identity.className = 'target-detail__announcement-status-identity c-user-avatar-host';
      var avatar = document.createElement('span');
      avatar.className = 'target-detail__announcement-status-avatar';
      this.renderAvatar(avatar, {
        name: recipient && (recipient.displayName || recipient.userCode),
        userCode: recipient && recipient.userCode,
        src: recipient && recipient.avatarUrl,
        initial: recipient && recipient.avatarInitial,
        isActive: recipient && recipient.isActive !== false
      }, { size: 32, nameOverlay: false });
      identity.appendChild(avatar);
      var text = document.createElement('div');
      text.className = 'target-detail__announcement-status-text';
      var name = document.createElement('div');
      name.className = 'target-detail__announcement-status-name';
      name.textContent = recipient && (recipient.displayName || recipient.userCode) ? (recipient.displayName || recipient.userCode) : 'ユーザー';
      var code = document.createElement('div');
      code.className = 'target-detail__announcement-status-code';
      code.textContent = recipient && recipient.userCode ? recipient.userCode : '';
      text.appendChild(name);
      text.appendChild(code);
      identity.appendChild(text);
      userCell.appendChild(identity);
      row.appendChild(userCell);

      var statusCell = document.createElement('td');
      var acknowledged = recipient && recipient.acknowledgedAt;
      statusCell.textContent = acknowledged ? '確認済み' : '未確認';
      row.appendChild(statusCell);

      var dateCell = document.createElement('td');
      dateCell.textContent = acknowledged ? formatDateTime(this.helpers, recipient.acknowledgedAt) : '—';
      row.appendChild(dateCell);

      var actionsCell = document.createElement('td');
      actionsCell.className = 'target-detail__announcement-status-action-cell';
      var actions = document.createElement('div');
      actions.className = 'target-detail__announcement-status-actions';

      var acknowledgeButton = this.createServiceActionButton('mail-check', {
        label: '',
        ariaLabel: '確認済みにする',
        hoverLabel: '確認済みにする',
        title: '確認済みにする',
        className: 'target-detail__announcement-status-action target-detail__announcement-status-action--ack',
        hideLabel: true,
        buttonType: 'mail-check'
      }, 'btn btn--ghost');
      acknowledgeButton.disabled = acknowledged;

      var undoButton = this.createServiceActionButton('delete', {
        label: '',
        ariaLabel: '未確認に戻す',
        hoverLabel: '未確認に戻す',
        title: '未確認に戻す',
        className: 'target-detail__announcement-status-action target-detail__announcement-status-action--undo',
        hideLabel: true,
        buttonType: 'delete'
      }, 'btn btn--ghost');
      undoButton.disabled = !acknowledged;

      acknowledgeButton.addEventListener('click', (event) =>
      {
        event.preventDefault();
        this.toggleRecipientAcknowledgement(item, recipient, true, [acknowledgeButton, undoButton]);
      });
      undoButton.addEventListener('click', (event) =>
      {
        event.preventDefault();
        this.toggleRecipientAcknowledgement(item, recipient, false, [acknowledgeButton, undoButton]);
      });

      actions.appendChild(acknowledgeButton);
      actions.appendChild(undoButton);
      actionsCell.appendChild(actions);
      row.appendChild(actionsCell);
      return row;
    }

    findAnnouncementById(id)
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
              updatedRecipient.acknowledgedAt = ackAt || '';
              updatedRecipient.acknowledgedDisplay = ackAt ? ackAt : '';
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
      if (Array.isArray(this.page.state.announcements))
      {
        this.page.state.announcements = updater(this.page.state.announcements);
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
      if (item.announcementCode)
      {
        payload.announcementCode = item.announcementCode;
      }
      else if (numericId === null && item.id)
      {
        payload.announcementCode = item.id;
      }
      if (acknowledged)
      {
        payload.acknowledgedAt = formatServerTimestamp(new Date());
      }
      try
      {
        var result = await this.page.callApi('TargetAnnouncementAcknowledge', payload, { requestType: 'TargetManagementAnnouncements' });
        var ackAt = result && result.acknowledgedAt ? result.acknowledgedAt : (acknowledged ? payload.acknowledgedAt : '');
        this.updateAcknowledgementState(item.id, recipient.userCode, ackAt);
        var latest = this.findAnnouncementById(item.id) || item;
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
          window.console.error('[target-detail] failed to update announcement acknowledgement', error);
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

    async loadAnnouncementDetail(item)
    {
      if (!item || !item.id)
      {
        return item;
      }
      var needsRecipients = !item.recipients || !item.recipients.length;
      var needsContent = !item.content;
      if (!needsRecipients && !needsContent)
      {
        return item;
      }
      try
      {
        var payload = await this.page.callApi('TargetAnnouncementDetail', {
          targetCode: this.page.state.targetCode,
          announcementCode: item.id
        }, { requestType: 'TargetManagementAnnouncements' });
        var recipients = this.normalizeRecipients(payload && payload.recipients);
        var updated = Object.assign({}, item, {
          content: formatContent(payload && (payload.content || payload.body || payload.message || item.content)),
          recipients: recipients,
          acknowledgedCount: recipients.filter(function (entry)
          {
            return entry && entry.acknowledgedAt;
          }).length,
          recipientCount: recipients.length || item.recipientCount || 0
        });
        updated.acknowledgedRate = updated.recipientCount
          ? Math.round((updated.acknowledgedCount / updated.recipientCount) * 100)
          : 0;
        this.replaceAnnouncement(updated);
        return updated;
      }
      catch (error)
      {
        window.console.warn('[target-detail] failed to load announcement detail', error);
        return item;
      }
    }

    applyAcknowledgement(announcementId, userCode, acknowledgedAt)
    {
      var normalizedId = normalizeText(announcementId);
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
          var nextAck = acknowledgedAt || recipient.acknowledgedAt || '';
          var nextDisplay = recipient.acknowledgedDisplay || nextAck;
          return Object.assign({}, recipient, {
            acknowledgedAt: nextAck,
            acknowledgedDisplay: nextDisplay || nextAck
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
          acknowledgedDisplay: acknowledgedAt
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
      this.replaceAnnouncement(updated);
      return updated;
    }

    async handleAnnouncementConfirm(modal)
    {
      if (!modal || !modal.currentItem)
      {
        return;
      }
      var userCode = this.getViewerUserCode();
      if (!userCode)
      {
        return;
      }
      var target = modal.currentItem;
      this.state.acknowledgingId = target.id;
      this.updateDetailModalActions(modal, target);
      var acknowledgedAt = new Date().toISOString();
      try
      {
        var payload = await this.page.callApi(
          'TargetAnnouncementAcknowledge',
          { id: target.id, userCode: userCode, acknowledgedAt: acknowledgedAt },
          { requestType: 'TargetManagementAnnouncements' }
        );
        if (payload && payload.acknowledgedAt)
        {
          acknowledgedAt = payload.acknowledgedAt;
        }
        var updated = this.applyAcknowledgement(target.id, userCode, acknowledgedAt);
        if (updated)
        {
          modal.currentItem = updated;
          this.renderDetailModal(updated, modal);
        }
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('success', 'お知らせを確認済みにしました。');
        }
        this.toggleDetailModal(modal, false);
      }
      catch (error)
      {
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('error', 'お知らせの確認に失敗しました。');
        }
        if (window.console && typeof window.console.error === 'function')
        {
          window.console.error('[target-detail] failed to acknowledge announcement', error);
        }
      }
      this.state.acknowledgingId = null;
      this.updateDetailModalActions(modal, modal.currentItem || target);
    }

    replaceAnnouncement(next)
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
      if (Array.isArray(this.page.state.announcements))
      {
        this.page.state.announcements = this.page.state.announcements.map(function (entry)
        {
          if (!entry)
          {
            return entry;
          }
          var entryId = entry.id || entry.announcementCode;
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

    findPendingAnnouncement(userCode)
    {
      if (!userCode)
      {
        return null;
      }
      var normalizedUser = userCode.toLowerCase();
      var items = Array.isArray(this.state.items) ? this.state.items : [];
      var target = null;
      var latestTimestamp = 0;
      items.forEach(function (item)
      {
        if (!item || !Array.isArray(item.recipients))
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
          return !recipient.acknowledgedAt;
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

    async showPendingAnnouncementForViewer()
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
      var pending = this.findPendingAnnouncement(viewerCode);
      if (!pending)
      {
        return;
      }
      this.state.hasPresentedPending = true;
      var modal = this.ensureDetailModal();
      modal.trigger = null;
      modal.currentItem = pending;
      modal.hideStatus = true;
      this.renderDetailModal(pending, modal, { hideStatus: true });
      this.toggleDetailModal(modal, true);
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

    createServiceActionButton(buttonType, options, fallbackClass)
    {
      var svc = this.getButtonService();
      var opts = options || {};
      if (svc && typeof svc.createActionButton === 'function')
      {
        try
        {
          return svc.createActionButton(buttonType, opts);
        }
        catch (error)
        {
          if (window.console && typeof window.console.warn === 'function')
          {
            window.console.warn('[target-detail] failed to create action button', error);
          }
        }
      }

      var tagName = (opts.elementTag || 'button').toLowerCase();
      var element = document.createElement(tagName === 'a' ? 'a' : 'button');
      if (tagName === 'button')
      {
        element.type = opts.type || 'button';
      }
      element.className = opts.className || fallbackClass || '';
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
      if (textLabel && !opts.hideLabel)
      {
        element.textContent = textLabel;
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
      var fallback = () =>
      {
        host.innerHTML = '';
        var initial = document.createElement('span');
        initial.className = 'target-detail__announcement-author-avatar-initial';
        var label = data && (data.initial || data.name || data.userCode) ? (data.initial || data.name || data.userCode) : '？';
        initial.textContent = label.charAt(0);
        host.appendChild(initial);
      };
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
      if (avatarService && typeof avatarService.render === 'function')
      {
        try
        {
          avatarService.render(host, renderData, renderOptions);
          return;
        }
        catch (error)
        {
          window.console.warn('[target-detail] failed to render avatar', error);
        }
      }
      fallback();
    }

    appendExtraClasses(element, className)
    {
      if (!element || !className)
      {
        return;
      }
      var tokens = className.split(/\s+/).filter(Boolean);
      for (var i = 0; i < tokens.length; i += 1)
      {
        element.classList.add(tokens[i]);
      }
    }

    createActionButton(buttonType, label, className)
    {
      var buttonTypeClass = buttonType ? 'table-action-button--' + buttonType : '';
      var options = {
        label: label,
        ariaLabel: label,
        hoverLabel: label,
        title: label,
        srLabel: label,
        hideLabel: true,
        className: 'table-action-button',
        buttonType: buttonType,
        size: 'small',
        shape: 'round'
      };
      var button = this.createServiceActionButton(buttonType, options, 'table-action-button');
      this.appendExtraClasses(button, 'table-action-button');
      if (buttonTypeClass)
      {
        this.appendExtraClasses(button, buttonTypeClass);
      }
      this.appendExtraClasses(button, className);
      if (button)
      {
        return button;
      }

      var fallback = document.createElement('button');
      fallback.type = 'button';
      fallback.className = ['table-action-button', buttonTypeClass, className || ''].filter(Boolean).join(' ');
      fallback.title = label || '';
      if (label)
      {
        fallback.setAttribute('aria-label', label);
        var srSpan = document.createElement('span');
        srSpan.className = 'visually-hidden';
        srSpan.textContent = label;
        fallback.appendChild(srSpan);
      }
      return fallback;
    }

    renderRequiredIndicators(modal)
    {
      if (!modal || !modal.requiredHosts)
      {
        return;
      }
      var hosts = modal.requiredHosts;
      var self = this;
      ['title', 'content'].forEach(function (key)
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
        className: 'announcement-management__required-indicator mock-avatar__upload-btn',
        attributes: { role: 'note' }
      };
      if (svc && typeof svc.createActionButton === 'function')
      {
        try
        {
          return svc.createActionButton('announcement-required', options);
        }
        catch (error)
        {
          if (window.console && typeof window.console.warn === 'function')
          {
            window.console.warn('[target-detail] failed to create required badge', error);
          }
        }
      }
      var fallback = document.createElement('span');
      fallback.className = 'announcement-management__required-indicator mock-avatar__upload-btn';
      fallback.textContent = '必須';
      fallback.setAttribute('role', 'note');
      fallback.setAttribute('aria-label', '必須');
      return fallback;
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
        }, options || {}),
        options && options.fallbackClass ? options.fallbackClass : 'btn btn--primary'
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

    async fetchAndRenderAnnouncements()
    {
      var items = await this.page.loadAnnouncements({ force: true });
      this.state.items = this.normalizeAnnouncements(Array.isArray(items) ? items : []);
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
      this.clearFieldError(modal.authorField);
      this.setAudienceSelection(modal, item && item.recipients ? item.recipients : []);
      if (modal.titleNode)
      {
        modal.titleNode.textContent = modal.mode === 'edit' ? 'お知らせを編集' : 'お知らせを追加';
      }
      if (modal.summaryNode)
      {
        modal.summaryNode.textContent = modal.mode === 'edit'
          ? '内容を更新して対象ユーザーに再通知できます。'
          : 'タイトルと内容、対象ユーザーを設定してお知らせを投稿します。';
      }
      if (modal.submitButton)
      {
        modal.submitButton.textContent = modal.mode === 'edit' ? '更新する' : '追加';
      }
      if (modal.titleInput)
      {
        modal.titleInput.value = item && item.title ? item.title : '';
      }
      if (modal.contentInput)
      {
        modal.contentInput.value = item && item.content ? item.content : '';
      }
      this.applyAuthorSelectionPolicy(modal, this.resolveAnnouncementAuthorSelection(item));
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
      modalRoot.className = 'screen-modal target-announcement__modal-container';
      modalRoot.setAttribute('hidden', 'hidden');
      modalRoot.innerHTML = '' +
        '<div class="screen-modal__overlay" data-modal-close></div>' +
        '<section class="screen-modal__content target-reference__modal" role="dialog" aria-modal="true" aria-labelledby="target-announcement-modal-title">' +
        '<button type="button" class="screen-modal__close" aria-label="モーダルを閉じる">×</button>' +
        '<header class="screen-modal__header">' +
        '<h2 class="screen-modal__title" id="target-announcement-modal-title">お知らせを追加</h2>' +
        '<p class="screen-modal__summary" data-announcement-form-summary>タイトルと内容を入力してお知らせを投稿します。</p>' +
        '</header>' +
        '<form class="screen-modal__body announcement-management__form" novalidate>' +
        '<div class="announcement-management__form-field" data-field="title">' +
        '<div class="announcement-management__form-label-row">' +
        '<label class="announcement-management__form-label" for="target-announcement-title">タイトル</label>' +
        '<span class="announcement-management__required-host" data-required-indicator="title"></span>' +
        '</div>' +
        '<input class="user-management__input" type="text" id="target-announcement-title" name="title" maxlength="256" required>' +
        '<p class="form-error" aria-live="polite"></p>' +
        '</div>' +
        '<div class="announcement-management__form-field" data-field="content">' +
        '<div class="announcement-management__form-label-row">' +
        '<label class="announcement-management__form-label" for="target-announcement-content">内容</label>' +
        '<span class="announcement-management__required-host" data-required-indicator="content"></span>' +
        '</div>' +
        '<textarea class="user-management__input" id="target-announcement-content" name="content" rows="6" maxlength="4000" required></textarea>' +
        '<p class="form-error" aria-live="polite"></p>' +
        '</div>' +
        '<div class="announcement-management__form-field announcement-management__author-field" data-field="author">' +
        '<div class="announcement-management__form-label-row">' +
        '<label class="announcement-management__form-label" for="target-announcement-author">作成者</label>' +
        '<span class="announcement-management__required-host" data-required-indicator="author"></span>' +
        '</div>' +
        '<div class="announcement-management__author" data-target-announcement-author-picker>' +
        '<p class="announcement-management__author-empty" data-target-announcement-author-empty>作成者が選択されていません。</p>' +
        '<div class="announcement-management__author-summary" data-target-announcement-author-summary hidden>' +
        '<span class="announcement-management__author-name" data-target-announcement-author-name></span>' +
        '<span class="announcement-management__author-code" data-target-announcement-author-code></span>' +
        '</div>' +
        '</div>' +
        '<div class="announcement-management__form-actions announcement-management__author-actions" data-target-announcement-author-actions>' +
        '<button type="button" class="btn btn--ghost" data-target-announcement-author-select>作成者を選ぶ</button>' +
        '<button type="button" class="btn btn--ghost" data-target-announcement-author-clear>クリア</button>' +
        '</div>' +
        '<p class="form-error" aria-live="polite"></p>' +
        '</div>' +
        '<div class="announcement-management__form-field announcement-management__audience-selector" data-field="audience">' +
        '<div class="announcement-management__audience-actions">' +
        '<button type="button" class="btn btn--ghost" data-announcement-audience-add>対象ユーザーを追加</button>' +
        '</div>' +
        '<p class="announcement-management__audience-count" data-announcement-audience-count>対象ユーザーは選択されていません。</p>' +
        '<div class="announcement-management__audience-list" data-announcement-audience-list></div>' +
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
      var titleInput = modalRoot.querySelector('#target-announcement-title');
      var contentInput = modalRoot.querySelector('#target-announcement-content');
      var feedback = modalRoot.querySelector('.screen-modal__feedback');
      var submitButton = modalRoot.querySelector('button[type="submit"]');
      var titleNode = modalRoot.querySelector('.screen-modal__title');
      var summaryNode = modalRoot.querySelector('[data-announcement-form-summary]');
      var audienceList = modalRoot.querySelector('[data-announcement-audience-list]');
      var audienceCount = modalRoot.querySelector('[data-announcement-audience-count]');
      var audienceAddButton = modalRoot.querySelector('[data-announcement-audience-add]');
      var audienceField = modalRoot.querySelector('[data-field="audience"]');
      var titleRequiredHost = modalRoot.querySelector('[data-required-indicator="title"]');
      var contentRequiredHost = modalRoot.querySelector('[data-required-indicator="content"]');
      var authorField = modalRoot.querySelector('[data-field="author"]');
      var authorActions = modalRoot.querySelector('[data-target-announcement-author-actions]');
      var authorSummary = modalRoot.querySelector('[data-target-announcement-author-summary]');
      var authorEmpty = modalRoot.querySelector('[data-target-announcement-author-empty]');
      var authorName = modalRoot.querySelector('[data-target-announcement-author-name]');
      var authorCode = modalRoot.querySelector('[data-target-announcement-author-code]');
      var authorSelectButton = modalRoot.querySelector('[data-target-announcement-author-select]');
      var authorClearButton = modalRoot.querySelector('[data-target-announcement-author-clear]');
      var authorRequiredHost = modalRoot.querySelector('[data-required-indicator="author"]');

      var modal = {
        root: modalRoot,
        form: form,
        overlay: overlay,
        closeButton: closeButton,
        cancelButton: cancelButton,
        titleInput: titleInput,
        contentInput: contentInput,
        titleField: titleInput ? titleInput.closest('[data-field="title"]') : null,
        contentField: contentInput ? contentInput.closest('[data-field="content"]') : null,
        authorField: authorField,
        authorActions: authorActions,
        authorSummary: authorSummary,
        authorEmpty: authorEmpty,
        authorName: authorName,
        authorCode: authorCode,
        authorSelectButton: authorSelectButton,
        authorClearButton: authorClearButton,
        audienceField: audienceField,
        audienceList: audienceList,
        audienceCount: audienceCount,
        audienceAddButton: audienceAddButton,
        submitButton: submitButton,
        feedback: feedback,
        titleNode: titleNode,
        summaryNode: summaryNode,
        requiredHosts: {
          title: titleRequiredHost,
          content: contentRequiredHost,
          author: authorRequiredHost
        },
        isSubmitting: false,
        restoreTarget: null,
        selectedAuthor: null,
        selectedRecipients: [],
        mode: 'create',
        currentItem: null
      };

      var self = this;
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
        overlay.addEventListener('click', function ()
        {
          self.closeFormModal();
        });
      }
      if (closeButton)
      {
        closeButton.addEventListener('click', function ()
        {
          self.closeFormModal();
        });
      }
      if (cancelButton)
      {
        cancelButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.closeFormModal();
        });
      }
      if (authorSelectButton)
      {
        authorSelectButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.openAuthorSelector(modal);
        });
      }
      if (authorClearButton)
      {
        authorClearButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.setAuthorSelection(modal, null);
        });
      }
      if (audienceAddButton)
      {
        audienceAddButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.openAudienceSelector(modal);
        });
      }

      this.renderRequiredIndicators(modal);

      this.applyAuthorSelectionPolicy(modal, this.getSessionUserSelection());

      return modal;
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
      var controls = [
        modal.submitButton,
        modal.cancelButton,
        modal.closeButton,
        modal.audienceAddButton,
        modal.authorSelectButton,
        modal.authorClearButton
      ];
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
      var candidates = target && Array.isArray(target.participants) ? target.participants.slice() : [];
      var seen = Object.create(null);
      var normalized = [];
      candidates.forEach(function (entry)
      {
        var recipient = normalizeRecipient(entry);
        if (!recipient)
        {
          return;
        }
        var key = buildAudienceKey(recipient);
        if (key && seen[key])
        {
          return;
        }
        seen[key] = true;
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
      (Array.isArray(list) ? list : []).forEach(function (entry)
      {
        var normalized = normalizeRecipient(entry);
        if (!normalized)
        {
          return;
        }
        var key = buildAudienceKey(normalized);
        if (key && seen[key])
        {
          return;
        }
        seen[key] = true;
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
        empty.className = 'announcement-management__audience-empty';
        empty.textContent = '対象ユーザーは選択されていません。';
        list.appendChild(empty);
        return;
      }

      var table = document.createElement('table');
      table.className = 'announcement-management__audience-table';

      var thead = document.createElement('thead');
      thead.innerHTML = '' +
        '<tr>' +
        '<th scope="col">ユーザー</th>' +
        '<th scope="col" class="announcement-management__audience-action-header">操作</th>' +
        '</tr>';
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      var self = this;
      selection.forEach(function (user)
      {
        var row = document.createElement('tr');

        var userCell = document.createElement('td');
        userCell.className = 'announcement-management__audience-user-cell';

        var userBlock = document.createElement('div');
        userBlock.className = 'announcement-management__audience-user';

        var avatar = document.createElement('span');
        avatar.className = 'announcement-management__audience-avatar c-user-avatar-host';
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
        name.className = 'announcement-management__audience-name';
        name.textContent = user.displayName || user.userCode || 'ユーザー';
        userBlock.appendChild(name);

        userCell.appendChild(userBlock);
        row.appendChild(userCell);

        var actionCell = document.createElement('td');
        actionCell.className = 'announcement-management__audience-action-cell';
        var removeButton = self.createActionButton('remove', '削除', 'announcement-management__audience-remove');
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
        return selectedKeys.indexOf(buildAudienceKey(entry)) === -1;
      });
      var options = {
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
      };
      var zIndex = this.resolveNestedModalZIndex(modal);
      if (zIndex !== null)
      {
        options.zIndex = zIndex;
      }
      service.open(options);
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
      this.clearFieldError(modal.authorField);
      this.clearFieldError(modal.audienceField);

      var title = modal.titleInput && modal.titleInput.value ? modal.titleInput.value.trim() : '';
      var content = modal.contentInput && modal.contentInput.value ? modal.contentInput.value.trim() : '';
      var authorSelection = this.getAuthorSelection(modal);
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
      if (this.shouldShowAuthorField() && !(authorSelection && authorSelection.userCode))
      {
        this.setFieldError(modal.authorField, '作成者を選択してください。');
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
        else if (modal.authorSelectButton)
        {
          modal.authorSelectButton.focus();
        }
        return;
      }

      if (!authorSelection || !authorSelection.userCode)
      {
        authorSelection = this.getSessionUserSelection();
        this.setAuthorSelection(modal, authorSelection);
      }

      var audienceCodes = audience.map(function (entry)
      {
        return entry && entry.userCode ? entry.userCode : null;
      }).filter(Boolean);
      var serializedAudience = '[]';
      try
      {
        serializedAudience = JSON.stringify(audience);
      }
      catch (error)
      {
        serializedAudience = '[]';
      }

      this.setModalSubmitting(modal, true);
      try
      {
        var payload = {
          targetCode: this.page.state.targetCode,
          title: title,
          content: content,
          createdByUserCode: authorSelection && authorSelection.userCode ? authorSelection.userCode : '',
          audienceUsers: serializedAudience,
          audienceUserCodes: audienceCodes
        };
        var requestType = 'TargetAnnouncementCreate';
        if (modal.mode === 'edit' && modal.currentItem && modal.currentItem.id)
        {
          requestType = 'TargetAnnouncementUpdate';
          payload.announcementCode = modal.currentItem.id;
        }
        await this.page.callApi(
          requestType,
          payload,
          { requestType: 'TargetManagementAnnouncements' }
        );
        await this.fetchAndRenderAnnouncements();
        this.setFeedback(modal.mode === 'edit' ? 'お知らせを更新しました。' : 'お知らせを追加しました。', 'success');
        this.closeFormModal();
      }
      catch (error)
      {
        this.setModalFeedback(modal, 'お知らせの保存に失敗しました。もう一度お試しください。', 'error');
        if (window.console && typeof window.console.error === 'function')
        {
          window.console.error('[target-detail] failed to save announcement', error);
        }
      }
      this.setModalSubmitting(modal, false);
    }
  }

  var NS = window.TargetDetail || (window.TargetDetail = {});
  NS.JobAnnouncement = NS.JobAnnouncement || TargetDetailAnnouncement;
})(window, document);
