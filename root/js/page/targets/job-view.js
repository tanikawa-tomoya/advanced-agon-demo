(function (w) {
  'use strict';

  class JobView {
    constructor(page) {
      this.page = page || {};
      this.config = this.page.config || {};
      this.refs = this.page.refs || {};
      this.ui = this.page.ui || {};
      this.root = this.page.root || document;
      this._doc = (this.root && this.root.ownerDocument) || document;
      this.buttonService = (this.page && this.page.buttonService) || null;
      this.userlistAvatarService = (this.page && this.page.userlistAvatarService) || null;
      this.avatarService = (this.page && this.page.avatarService) || null;

      this.state = {
        page: 1,
        pageSize: this.config.pageSize || 20,
        query: '',
        filters: {},
        sort: { key: 'createdAt', dir: 'desc' },
        total: 0,
        items: [],
        roleFlags: null
      };

      this._listController = null;
      this._debounceTimer = null;
      this._creatorCache = {};
      this._creatorAvatarCache = {};
    }

    async loadPage(opts) {
      opts = opts || {};
      if (typeof opts.page === 'number') this.state.page = opts.page;
      if (typeof opts.query === 'string') this.state.query = opts.query;
      if (opts.filters && typeof opts.filters === 'object') this.state.filters = opts.filters;

      await this._ensureRoleFlags();
      this._beginList();
      try {
        var res = await this.fetchList();
        this.state.items = res.items || [];
        this.state.total = Number(res.total || this.state.items.length);
        this.renderList();
        this.renderPagination();
      } catch (err) {
        if (this.ui.toast && this.ui.toast.error) {
          this.ui.toast.error((this.config.texts && this.config.texts.loadError) || '読み込みに失敗しました');
        }
        throw err;
      } finally {
        this._endList();
      }
    }

    async reloadCurrent() {
      return this.loadPage();
    }

    handleSearchInput(value) {
      this.state.query = value || '';
      var self = this;
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(function(){
        self.loadPage({ page: 1 }).catch(function(e){ if (window.console) console.error(e); });
      }, 300);
    }

    applyFilter(filters) {
      this.state.filters = filters || {};
      this.loadPage({ page: 1 }).catch(function(e){ if (window.console) console.error(e); });
    }

    async fetchList() {
      var payload = {
        page: this.state.page,
        pageSize: this.state.pageSize
      };
      if (this.state.query) payload.keyword = this.state.query;
      var filters = this.state.filters || {};
      for (var k in filters) {
        if (!Object.prototype.hasOwnProperty.call(filters, k)) continue;
        var v = filters[k];
        if (v !== '' && v != null) {
          payload['filter.' + k] = v;
        }
      }

      if (this.page && typeof this.page.callApi === 'function') {
        var legacy = await this.page.callApi('list', payload);
        return this._normalizeResponse(legacy);
      }

      var qs = [];
      qs.push('page=' + encodeURIComponent(String(this.state.page)));
      qs.push('pageSize=' + encodeURIComponent(String(this.state.pageSize)));
      if (this.state.query) qs.push('q=' + encodeURIComponent(this.state.query));
      if (this.state.sort && this.state.sort.key) {
        qs.push('sort=' + encodeURIComponent(this.state.sort.key + ':' + this.state.sort.dir));
      }
      for (var key in filters) {
        if (!Object.prototype.hasOwnProperty.call(filters, key)) continue;
        var val = filters[key];
        if (val !== '' && val != null) qs.push('filter.' + encodeURIComponent(key) + '=' + encodeURIComponent(val));
      }
      var url = this.config.endpoints.list + (qs.length ? ('?' + qs.join('&')) : '');
      var res = await fetch(url, {
        method: 'GET',
        headers: this._headers(),
        signal: this._listController ? this._listController.signal : undefined
      });
      if (!res.ok) {
        var t = '';
        try { t = await res.text(); } catch(e){}
        throw new Error(t || ('List fetch failed (' + res.status + ')'));
      }
      var response = await res.json();
      return this._normalizeResponse(response);
    }

    _normalizeResponse(payload) {
      var list = [];
      if (Array.isArray(payload)) {
        list = payload;
      } else if (payload && Array.isArray(payload.items)) {
        list = payload.items;
      } else if (payload && Array.isArray(payload.list)) {
        list = payload.list;
      } else if (payload && Array.isArray(payload.targetList)) {
        list = payload.targetList;
      } else if (payload && Array.isArray(payload.targets)) {
        list = payload.targets;
      }
      var normalized = [];
      for (var i = 0; i < list.length; i++) {
        normalized.push(this._normalizeItem(list[i]));
      }
      return {
        items: normalized,
        total: (payload && (payload.total || payload.totalCount || payload.count)) || normalized.length
      };
    }

    renderList() {
      if (!this.refs.list) return;
      var items = this.state.items || [];
      if (!items.length) {
        this.refs.list.innerHTML = this._emptyTemplate();
        return;
      }
      this._creatorCache = {};
      this._creatorAvatarCache = {};
      var html = '';
      for (var i = 0; i < items.length; i++) {
        var creatorKey = this._buildCreatorKey(items[i], i);
        this._creatorCache[creatorKey] = Array.isArray(items[i].creators) ? items[i].creators : [];
        this._creatorAvatarCache[creatorKey] = items[i].creator || null;
        html += this._rowTemplate(items[i], creatorKey, this._creatorCache[creatorKey], this._creatorAvatarCache[creatorKey]);
      }
      this.refs.list.innerHTML = html;
      this._renderAudienceAvatars();
      this._renderCreatorAvatars();
    }

    renderPagination() {
      if (!this.refs.pagination) return;
      var total = this.state.total;
      var pageSize = this.state.pageSize;
      var totalPages = Math.max(1, Math.ceil(total / pageSize));
      var page = Math.min(this.state.page, totalPages);

      function btn(p, label, current) {
        var disabled = (p === current) ? ' disabled' : '';
        return '<button type="button" data-action="page" data-page="' + p + '"' + disabled + '>' + (label || p) + '</button>';
      }

      var parts = [];
      parts.push(btn(1, '≪', page));
      parts.push(btn(Math.max(1, page - 1), '‹', page));
      for (var p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) {
        parts.push(btn(p, String(p), page));
      }
      parts.push(btn(Math.min(totalPages, page + 1), '›', page));
      parts.push(btn(totalPages, '≫', page));

      this.refs.pagination.innerHTML = parts.join('');
    }

    _rowTemplate(it, creatorKey, creators, creator) {
      var attrs = [
        'data-id="' + this._esc(it.id) + '"',
        'data-row-id="' + this._esc(it.id) + '"',
        'data-colTitle="' + this._esc(it.title) + '"',
        'data-colStatus="' + this._esc(it.status) + '"',
        'data-colStatusKey="' + this._esc(it.statusKey || '') + '"',
        'data-colTag="' + this._esc(it.tag) + '"',
        'data-colDueDate="' + this._esc(it.dueDate) + '"',
        'data-colStartDate="' + this._esc(it.startDate || '') + '"',
        'data-colEndDate="' + this._esc(it.endDate || '') + '"',
        'data-colTargetCode="' + this._esc(it.targetCode || it.id || '') + '"',
        'data-colAssignedUserCode="' + this._esc(it.assignedUserCode) + '"',
        'data-colCreatorName="' + this._esc(it.creator && (it.creator.name || it.creator.display || '')) + '"',
        'data-colCreatorCode="' + this._esc(it.creator && it.creator.code) + '"',
        'data-colCreatorDisplay="' + this._esc(it.creator && (it.creator.display || '')) + '"',
        'data-colDescription="' + this._esc(it.description) + '"'
      ];
      var period = this._formatPeriod(it.startDate, it.endDate);
      return '' +
        '<tr ' + attrs.join(' ') + '>' +
          '<td class="target-table__image-cell">' + this._renderImageCell(it) + '</td>' +
          '<td class="target-table__status-cell">' + this._renderStatus(it) + '</td>' +
          '<td>' + this._esc(period || '—') + '</td>' +
          '<td class="row-actions">' +
            this._renderRowActions(it) +
          '</td>' +
        '</tr>';
    }

    _formatPeriod(startDate, endDate) {
      var start = this._normalizeText(startDate);
      var end = this._normalizeText(endDate);
      if (!start && !end) return '';
      if (!start) return '～' + end;
      if (!end) return start + '～';
      return start + '～' + end;
    }

    _renderCreatorCell(creator, creatorKey) {
      creator = creator || {};
      var avatarAttrs = [
        'class="target-table__creator-avatar"',
        'data-targets-creator-avatar'
      ];
      if (creatorKey) {
        avatarAttrs.push('data-creator-key="' + this._esc(creatorKey) + '"');
      }
      return '' +
        '<div class="target-table__creator">' +
          '<span ' + avatarAttrs.join(' ') + '></span>' +
        '</div>';
    }

    _renderImageCell(item) {
      var imageUrl = (item && item.imageUrl) ? this._normalizeText(item.imageUrl) : '';
      if (!imageUrl) {
        imageUrl = this._resolveImageUrl(item);
      }
      var hasImage = !!imageUrl;
      var cardClass = 'target-card' + (hasImage ? '' : ' target-card--placeholder');
      var ariaLabel = this._esc(this._buildImageAriaLabel(item));
      var imgHtml = hasImage
        ? '<img class="target-card__img" src="' + this._esc(imageUrl) + '" alt="" loading="lazy" />'
        : '';
      var badgeText = this._normalizeText(item && (item.statusLabel || item.status));
      var badge = badgeText ? '<span class="target-card__badge">' + this._esc(badgeText) + '</span>' : '';
      var tag = item && item.tag ? '<span class="target-card__tag">' + this._esc(item.tag) + '</span>' : '';
      var title = '<span class="target-card__title">' + this._esc(item && item.title) + '</span>';
      return '' +
        '<div class="' + cardClass + '" role="img" aria-label="' + ariaLabel + '">' +
          imgHtml +
          badge +
          '<div class="target-card__overlay">' +
            title +
            tag +
          '</div>' +
        '</div>';
    }

    _buildImageAriaLabel(item) {
      if (!item || typeof item !== 'object') {
        return 'ターゲット';
      }
      var parts = [];
      var title = this._normalizeText(item.title);
      var tag = this._normalizeText(item.tag);
      if (title) parts.push(title);
      if (tag) parts.push(tag);
      return parts.length ? parts.join(' | ') : 'ターゲット';
    }

    _renderAudienceCell(item, creators, creatorKey) {
      var isAllAudience = item && item.assignAll;
      if (isAllAudience) {
        var label = '全員';
        var buttonHtml = '';
        var svc = this.buttonService || (this.page && this.page.buttonService);
        if (svc && typeof svc.createActionButton === 'function') {
          try {
            var btn = svc.createActionButton('target-assignees-all', {
              label: label,
              ariaLabel: '対象者: ' + label,
              attributes: { 'data-targets-assignees': 'all' }
            });
            if (btn) {
              btn.className = btn.className ? (btn.className + ' target-table__assignees-all') : 'target-table__assignees-all';
              buttonHtml = this._nodeToHtml(btn);
            }
          } catch (err) {
            if (w.console && typeof w.console.warn === 'function') {
              w.console.warn('[targets] failed to render audience all button', err);
            }
          }
        }
        if (!buttonHtml) {
          buttonHtml = '<span class="target-table__assignees-all" data-targets-assignees="all">' + this._esc(label) + '</span>';
        }
        return '' +
          '<div class="target-table__assignees target-table__assignees--single">' +
            buttonHtml +
          '</div>';
      }

      var list = Array.isArray(creators) ? creators : [];
      var names = this._collectCreatorNames(list);
      var summary = names.join('、');
      var avatarAttrs = [
        'class="target-table__assignees target-table__assignees--multiple"',
        'role="list"',
        'data-targets-creator-list'
      ];
      if (creatorKey) {
        avatarAttrs.push('data-creator-key="' + this._esc(creatorKey) + '"');
      }
      var sr = summary ? '<span class="target-table__sr-only">' + this._esc(summary) + '</span>' : '';
      return '' +
        '<div class="target-table__creator">' +
          '<span ' + avatarAttrs.join(' ') + '></span>' +
        '</div>' + sr;
    }

    _buildCreatorKey(item, index) {
      if (item && item.id != null && item.id !== '') {
        return String(item.id);
      }
      return 'row-' + String(index || 0);
    }

    _collectCreatorNames(list) {
      var names = [];
      if (!Array.isArray(list)) return names;
      for (var i = 0; i < list.length; i++) {
        var entry = list[i] || {};
        var name = entry.display || entry.name || entry.code || entry.tooltip;
        if (name) {
          names.push(String(name));
        }
      }
      return names;
    }

    _normalizeUserlistEntries(creators) {
      var normalized = [];
      if (!Array.isArray(creators)) return normalized;
      for (var i = 0; i < creators.length; i++) {
        var creator = creators[i] || {};
        var name = creator.display || creator.name || creator.code || creator.tooltip || '';
        var role = creator.role || '';
        var src = creator.avatarUrl || '';
        if (!name && !src) {
          continue;
        }
        normalized.push({
          name: name || 'ユーザー',
          role: role,
          src: src
        });
      }
      return normalized;
    }

    _emptyTemplate() {
      return '<tr><td colspan="4">データがありません。</td></tr>';
    }

    _normalizeItem(raw) {
      raw = raw || {};
      var targetCode = raw.targetCode || raw.code || raw.id || raw.uuid || '';
      var id = targetCode;
      var title = raw.title || raw.targetTitle || raw.name || raw.tag || ('#' + id);
      var statusKey = this._resolveStatusKey(raw);
      var statusLabel = this._resolveStatusLabel(raw, statusKey);
      var status = statusLabel || statusKey || '';
      var dueDate = raw.dueDate || raw.deadline || raw.limit || '';
      var startDate = raw.startDate || raw.start_date || raw.beginDate || raw.beginAt || raw.startAt || '';
      var endDate = raw.endDate || raw.end_date || raw.finishDate || raw.finishAt || raw.endAt || '';
      var tag = raw.tag || raw.category || '';
      var description = raw.description || raw.summary || '';
      var assignedUserCode = raw.assignedUserCode || '';
      if (!assignedUserCode && Array.isArray(raw.assignedUsers) && raw.assignedUsers.length) {
        assignedUserCode = raw.assignedUsers[0].userCode || '';
      }
      var assignAll = this._resolveAssignAll(raw);
      var creators = this._normalizeCreators(raw);
      var creator = this._normalizeCreator(raw);
      var imageUrl = this._resolveImageUrl(raw);
      return {
        id: id,
        targetCode: targetCode,
        title: title,
        status: status,
        statusKey: statusKey,
        statusLabel: statusLabel,
        dueDate: dueDate,
        startDate: startDate,
        endDate: endDate,
        createdAt: raw.createdAt || raw.created_at || '',
        tag: tag,
        assignedUserCode: assignedUserCode,
        description: description,
        creator: creator,
        creators: creators,
        assignAll: assignAll,
        imageUrl: imageUrl
      };
    }

    _normalizeCreators(raw) {
      if (!raw || typeof raw !== 'object') return [];
      var list = [];
      var arrays = [];
      function pushSource(source) {
        if (Array.isArray(source)) {
          arrays.push(source);
          return;
        }
        if (source && typeof source === 'object') {
          arrays.push([source]);
          return;
        }
        if (typeof source === 'string' || typeof source === 'number') {
          arrays.push([source]);
        }
      }

      pushSource(raw.targetUsers);
      pushSource(raw.targetUser);
      pushSource(raw.audienceUsers);
      pushSource(raw.audience);
      pushSource(raw.assignedUsers);
      pushSource(raw.assignees);
      pushSource(raw.users);
      pushSource(raw.members);

      for (var i = 0; i < arrays.length; i++) {
        var current = arrays[i];
        if (!Array.isArray(current)) continue;
        for (var j = 0; j < current.length; j++) {
          var entry = current[j];
          if (this._isOperator(entry)) {
            continue;
          }
          if (!this._isActiveUser(entry)) {
            continue;
          }
          var normalized = this._normalizeCreatorEntry(entry);
          if (normalized) {
            list.push(normalized);
          }
        }
      }
      return list;
    }

    _normalizeCreatorEntry(user) {
      if (typeof user === 'string' || typeof user === 'number') {
        var scalar = String(user);
        user = { code: scalar, display: scalar, name: scalar };
      }
      if (!user || typeof user !== 'object') return null;
      var name = this._pickFirstString([
        user.displayName,
        user.name,
        user.userName,
        user.title,
        user.label
      ]);
      var code = this._pickFirstString([
        user.userCode,
        user.code,
        user.id
      ]);
      var avatarUrl = this._resolveCreatorAvatarUrl(user);
      var tooltip = this._pickFirstString([
        user.tooltip,
        user.description,
        user.note,
        user.memo
      ]);
      var role = this._pickFirstString([
        user.roleLabel,
        user.roleName,
        user.role,
        user.assignmentRole,
        user.position
      ]);
      var display = name || code || '';
      var labelSource = display || '';
      var initial = this._deriveInitial(labelSource);
      if (!labelSource && !avatarUrl) {
        return null;
      }
      return {
        type: 'user',
        name: name || labelSource,
        code: code,
        display: display,
        tooltip: tooltip || name || code || labelSource,
        avatarUrl: avatarUrl,
        avatarAlt: labelSource,
        initial: initial,
        role: role || ''
      };
    }

    _isActiveUser(user) {
      if (!user || typeof user !== 'object') return true;
      if (Object.prototype.hasOwnProperty.call(user, 'isActive')) {
        return user.isActive !== false && user.isActive !== 0 && user.isActive !== '0';
      }
      if (Object.prototype.hasOwnProperty.call(user, 'active')) {
        return user.active !== false && user.active !== 0 && user.active !== '0';
      }
      if (typeof user.status === 'string') {
        var status = user.status.toLowerCase();
        if (status === 'inactive' || status === 'disabled') {
          return false;
        }
      }
      if (typeof user.state === 'string') {
        var state = user.state.toLowerCase();
        if (state === 'inactive' || state === 'disabled') {
          return false;
        }
      }
      return true;
    }

    _isOperator(user) {
      if (!user || typeof user !== 'object') return false;
      var flag = null;
      if (Object.prototype.hasOwnProperty.call(user, 'isOperator')) {
        flag = user.isOperator;
      } else if (Object.prototype.hasOwnProperty.call(user, 'operator')) {
        flag = user.operator;
      }
      if (flag === null) {
        return false;
      }
      if (typeof flag === 'string') {
        return flag === '1' || flag.toLowerCase() === 'true';
      }
      return !!flag;
    }

    _normalizeAudienceScope(value) {
      if (value === undefined || value === null) return 'users';
      var normalized = String(value).trim().toLowerCase();
      if (normalized === 'all' || normalized === 'everyone') return 'all';
      return 'users';
    }

    _resolveAssignAll(raw) {
      if (raw && (raw.assignAll === true || raw.assignAll === 1 || raw.assignAll === '1')) {
        return true;
      }
      var scopeSource = raw && (raw.targetUserScope || raw.audienceScope || raw.targetAudienceScope || '');
      return this._normalizeAudienceScope(scopeSource) === 'all';
    }

    _renderAudienceAvatars() {
      var svc = this._getUserlistAvatarService();
      if (!svc || !this.refs.list) return;
      var hosts = this.refs.list.querySelectorAll('[data-targets-creator-list]');
      if (!hosts || !hosts.length) return;
      for (var i = 0; i < hosts.length; i++) {
        var host = hosts[i];
        var key = host.getAttribute('data-creator-key') || '';
        var creators = (this._creatorCache && this._creatorCache[key]) || [];
        if (!creators.length) { continue; }
        var users = this._normalizeUserlistEntries(creators);
        if (!users.length) { continue; }
        try {
          svc.render(host, users, {
            size: 32,
            overlap: -10,
            popoverAvatarSize: 40,
            popoverPlacement: 'top-start',
            popoverOffset: 12
          });
        } catch (err) {
          if (w.console && typeof w.console.warn === 'function') {
            w.console.warn('[targets] failed to render audience avatars', err);
          }
        }
      }
    }

    _renderCreatorAvatars() {
      var svc = this._getAvatarService();
      if (!svc || !this.refs.list) return;
      var hosts = this.refs.list.querySelectorAll('[data-targets-creator-avatar]');
      if (!hosts || !hosts.length) return;
      var anchors = [];
      for (var i = 0; i < hosts.length; i++) {
        var host = hosts[i];
        var key = host.getAttribute('data-creator-key') || '';
        var creator = (this._creatorAvatarCache && this._creatorAvatarCache[key]) || null;
        if (!creator) { continue; }
        var name = creator.display || creator.name || creator.code || '';
        var data = {
          name: name || '—',
          alt: creator.avatarAlt || name || creator.code || ''
        };
        if (creator.avatarUrl) {
          data.src = creator.avatarUrl;
        }
        if (creator.initial) {
          data.initial = creator.initial;
        }
        if (name) {
          host.setAttribute('data-user-name', name);
          host.setAttribute('data-user-display', name);
          host.setAttribute('aria-label', name);
        }
        if (creator.code) {
          host.setAttribute('data-user-code', creator.code);
        }
        if (creator.tooltip) {
          host.setAttribute('data-user-tooltip', creator.tooltip);
        }
        if (creator.role) {
          host.setAttribute('data-user-role', creator.role);
        }
        host.setAttribute('data-user-type', creator.type || 'user');
        if (creator.avatarUrl) {
          host.setAttribute('data-avatar-src', creator.avatarUrl);
        }
        if (creator.avatarAlt || name || creator.code) {
          host.setAttribute('data-avatar-alt', creator.avatarAlt || name || creator.code || '');
        }
        try {
          svc.render(host, data, { size: 32, shape: 'circle', nameOverlay: true, initialsFallback: true });
          anchors.push(host);
        } catch (err) {
          if (w.console && typeof w.console.warn === 'function') {
            w.console.warn('[targets] failed to render creator avatar', err);
          }
        }
      }
      if (anchors.length && typeof svc.eventUpdate === 'function') {
        svc.eventUpdate(anchors, { popover: { placement: 'top-start', offset: 12 } });
      }
    }

    _getUserlistAvatarService() {
      if (this.userlistAvatarService) {
        return this.userlistAvatarService;
      }
      if (this.page && this.page.userlistAvatarService) {
        this.userlistAvatarService = this.page.userlistAvatarService;
        return this.userlistAvatarService;
      }
      return null;
    }

    _getAvatarService() {
      if (this.avatarService) {
        return this.avatarService;
      }
      if (this.page && this.page.avatarService) {
        this.avatarService = this.page.avatarService;
        return this.avatarService;
      }
      return null;
    }

    _normalizeCreator(raw) {
      if (!raw || typeof raw !== 'object') return null;
      var name = this._pickFirstString([
        raw.createdByDisplayName,
        raw.createdByUserDisplayName,
        raw.createdBy && raw.createdBy.displayName,
        raw.ownerDisplayName,
        raw.ownerName,
        raw.owner
      ]);
      var code = this._pickFirstString([
        raw.createdByUserCode,
        raw.createdByCode,
        raw.createdBy && raw.createdBy.userCode,
        raw.ownerUserCode,
        raw.ownerCode
      ]);
      var avatarUrl = this._resolveCreatorAvatarUrl(raw);
      var alt = this._pickFirstString([
        raw.createdByAvatarAlt,
        raw.createdByUserAvatarAlt
      ]) || name || code || '';
      var role = this._pickFirstString([
        raw.createdByRoleLabel,
        raw.createdByRole,
        raw.createdBy && raw.createdBy.roleLabel,
        raw.createdBy && raw.createdBy.role,
        raw.ownerRoleLabel,
        raw.ownerRole,
        raw.owner && raw.owner.role
      ]);
      var tooltip = this._pickFirstString([
        raw.createdByTooltip,
        raw.createdByDescription,
        raw.createdByNote,
        raw.createdByMemo,
        raw.ownerTooltip,
        raw.ownerDescription,
        raw.ownerNote,
        raw.ownerMemo,
        raw.tooltip,
        raw.description,
        raw.note,
        raw.memo
      ]);
      var display = name || code || '';
      var labelSource = name || code || display || '';
      var initialSource = labelSource;
      var initial = this._deriveInitial(initialSource);
      if (!display && !avatarUrl && !initialSource) {
        return null;
      }
      return {
        type: 'user',
        name: labelSource,
        code: code,
        display: display,
        tooltip: tooltip || display || labelSource,
        avatarUrl: avatarUrl,
        avatarAlt: alt,
        initial: initial,
        role: role || ''
      };
    }

    _resolveImageUrl(raw) {
      if (!raw || typeof raw !== 'object') return '';
      var candidates = [
        raw.imageUrl,
        raw.imageURL,
        raw.image,
        raw.thumbnailUrl,
        raw.thumbnailURL,
        raw.coverImage,
        raw.coverImageUrl,
        raw.coverImageURL
      ];
      for (var i = 0; i < candidates.length; i++) {
        var val = this._normalizeText(candidates[i]);
        if (val) return val;
      }
      var objectCandidates = [raw.thumbnail, raw.imageObject, raw.imageData, raw.coverImageObject];
      for (var j = 0; j < objectCandidates.length; j++) {
        var found = this._extractAvatarUrlFromObject(objectCandidates[j]);
        if (found) return found;
      }
      return '';
    }

    _resolveCreatorAvatarUrl(raw) {
      if (!raw || typeof raw !== 'object') return '';
      var scalarCandidates = [
        raw.avatarUrl,
        raw.avatarURL,
        raw.photoUrl,
        raw.photoURL,
        raw.createdByAvatarUrl,
        raw.createdByAvatarURL,
        raw.createdByUserAvatarUrl,
        raw.createdByUserAvatarURL,
        raw.createdByPhotoUrl,
        raw.createdByPhotoURL,
        raw.createdByImageUrl,
        raw.createdByImageURL,
        raw.createdByUserPhotoUrl,
        raw.createdByUserPhotoURL,
        raw.createdByUserImageUrl,
        raw.createdByUserImageURL
      ];
      for (var i = 0; i < scalarCandidates.length; i++) {
        var scalar = this._normalizeText(scalarCandidates[i]);
        if (scalar) return scalar;
      }
      var objectCandidates = [
        raw.createdByAvatar,
        raw.createdByUserAvatar,
        raw.createdBy && raw.createdBy.avatar,
        raw.createdByUser && raw.createdByUser.avatar,
        raw.createdByProfile && raw.createdByProfile.avatar,
        raw.createdByUserProfile && raw.createdByUserProfile.avatar,
        raw.createdByInfo && raw.createdByInfo.avatar
      ];
      for (var j = 0; j < objectCandidates.length; j++) {
        var objUrl = this._extractAvatarUrlFromObject(objectCandidates[j]);
        if (objUrl) return objUrl;
      }
      return '';
    }

    _extractAvatarUrlFromObject(candidate) {
      if (!candidate || typeof candidate !== 'object') return '';
      var keys = ['src', 'url', 'href', 'image', 'imageUrl', 'imageURL', 'avatar', 'avatarUrl', 'avatarURL', 'photo', 'photoUrl', 'photoURL'];
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (!Object.prototype.hasOwnProperty.call(candidate, key)) continue;
        var value = this._normalizeText(candidate[key]);
        if (value) return value;
      }
      return '';
    }

    _normalizeText(value) {
      if (value == null) return '';
      if (typeof value === 'string') return value.trim();
      return String(value).trim();
    }

    _pickFirstString(list) {
      if (!Array.isArray(list)) return '';
      for (var i = 0; i < list.length; i++) {
        var value = this._normalizeText(list[i]);
        if (value) return value;
      }
      return '';
    }

    _deriveInitial(value) {
      var text = this._normalizeText(value);
      if (!text) return '';
      var parts = text.split(/\s+/).filter(Boolean);
      if (!parts.length) return text.charAt(0);
      if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
      }
      var first = parts[0].charAt(0);
      var last = parts[parts.length - 1].charAt(0);
      return (first + last).toUpperCase();
    }

    _beginList() {
      this._endList();
      try { this._listController = new AbortController(); } catch(e){ this._listController = null; }
      if (this.ui.overlay && this.ui.overlay.show) this.ui.overlay.show();
    }

    _endList() {
      try { if (this._listController) this._listController.abort(); } catch(e){}
      this._listController = null;
      if (this.ui.overlay && this.ui.overlay.hide) this.ui.overlay.hide();
    }

    _headers() {
      var h = { 'X-Requested-With': 'XMLHttpRequest' };
      if (this.config.csrfToken) h['X-CSRF-Token'] = this.config.csrfToken;
      return h;
    }

    _esc(v) {
      v = (v == null) ? '' : String(v);
      return v.replace(/[&<>"']/g, function(c){
        return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
      });
    }

    _renderStatus(item) {
      var statusKey = (item && (item.statusKey || item.status)) || '';
      var statusLabel = (item && (item.statusLabel || item.status)) || '';
      var svc = this._getButtonService();
      var badgeHtml = '';
      if (svc && typeof svc.resolveStatusPresentation === 'function' && typeof svc.createActionButton === 'function') {
        try {
          var presentation = svc.resolveStatusPresentation({
            status: statusKey,
            statusLabel: statusLabel
          });
          var badge = svc.createActionButton('target-detail-status', {
            label: presentation && presentation.text ? presentation.text : statusLabel,
            variant: presentation && presentation.variant
              ? presentation.variant
              : (presentation && presentation.statusKey) || statusKey || 'unknown',
            dataset: {
              statusKey: presentation && typeof presentation.statusKey === 'string'
                ? presentation.statusKey
                : statusKey
            },
            attributes: {
              'data-status-key': presentation && typeof presentation.statusKey === 'string'
                ? presentation.statusKey
                : statusKey
            }
          });
          if (badge) {
            badge.className = badge.className
              ? (badge.className + ' target-table__status-badge')
              : 'target-table__status-badge';
            badgeHtml = this._nodeToHtml(badge);
          }
        } catch (err) {
          if (w.console && typeof w.console.warn === 'function') {
            w.console.warn('[targets] failed to render status badge', err);
          }
        }
      }

      if (!badgeHtml) {
        var fallbackKey = this._normalizeStatusKey(statusKey) || 'unknown';
        var variantMap = (this.page && this.page.statusLabelConfig && this.page.statusLabelConfig.variantMap) || {};
        if (variantMap && Object.prototype.hasOwnProperty.call(variantMap, fallbackKey)) {
          fallbackKey = variantMap[fallbackKey] || fallbackKey;
        }
        var labelMap = this._getStatusLabelMap();
        var fallbackLabel = statusLabel || statusKey || '—';
        if (!statusLabel && labelMap && Object.prototype.hasOwnProperty.call(labelMap, fallbackKey)) {
          fallbackLabel = labelMap[fallbackKey];
        }
        badgeHtml = '<span class="mock-avatar__upload-btn target-detail__status-button target-detail__badge target-detail__badge--status-' +
          this._esc(fallbackKey) + ' target-table__status-badge" data-status-key="' + this._esc(fallbackKey) + '">' +
          this._esc(fallbackLabel) + '</span>';
      }
      return '<div class="target-table__status">' + badgeHtml + '</div>';
    }

    _nodeToHtml(node) {
      if (!node) return '';
      if (node.outerHTML) return node.outerHTML;
      var wrap = this._doc ? this._doc.createElement('div') : document.createElement('div');
      wrap.appendChild(node);
      return wrap.innerHTML;
    }

    _renderRowActions(item) {
      var buttons = [];
      var alias = this._targetAlias();
      buttons.push(this._renderActionButton('detail', {
        item: item,
        action: 'view-target',
        label: '詳細',
        hoverLabel: alias + 'の詳細を表示',
        ariaLabel: this._composeActionAriaLabel('詳細', item),
        variant: 'detail'
      }));
      if (this._canManageTargets()) {
        buttons.push(this._renderActionButton('edit', {
          item: item,
          action: 'edit-target',
          label: '編集',
          hoverLabel: alias + 'を編集',
          ariaLabel: this._composeActionAriaLabel('編集', item),
          variant: 'edit'
        }));
        buttons.push(this._renderActionButton('delete', {
          item: item,
          action: 'delete-target',
          label: '削除',
          hoverLabel: alias + 'を削除',
          ariaLabel: this._composeActionAriaLabel('削除', item),
          variant: 'delete'
        }));
      }
      return buttons.join('');
    }

    _renderActionButton(type, config) {
      var options = this._buildActionButtonOptions(config);
      var svc = this._getButtonService();
      if (!svc || typeof svc.createActionButton !== 'function') {
        throw new Error('[targets] button service is unavailable');
      }
      var node = svc.createActionButton(type, options);
      if (!node) {
        throw new Error('[targets] failed to render action button');
      }
      return this._nodeToHtml(node);
    }

    _getButtonService() {
      if (this.buttonService) {
        return this.buttonService;
      }
      if (this.page && this.page.buttonService) {
        this.buttonService = this.page.buttonService;
        return this.buttonService;
      }
      if (w && w.Services && typeof w.Services.button === 'function') {
        this.buttonService = new w.Services.button();
        return this.buttonService;
      }
      return null;
    }

    _buildActionButtonOptions(config) {
      var opts = config || {};
      var item = opts.item || {};
      var dataset = Object.assign({}, opts.dataset || {});
      var attributes = Object.assign({}, opts.attributes || {});
      if (opts.action) {
        dataset.action = opts.action;
        if (!attributes['data-action']) attributes['data-action'] = opts.action;
      }
      if (item.id != null && item.id !== '') {
        dataset.id = item.id;
        if (!attributes['data-id']) attributes['data-id'] = item.id;
      }
      var result = {
        label: opts.label,
        ariaLabel: opts.ariaLabel,
        hoverLabel: opts.hoverLabel,
        dataset: dataset,
        attributes: attributes
      };
      if (opts.variant != null) {
        result.variant = opts.variant;
      }
      if (opts.baseClass) {
        result.baseClass = opts.baseClass;
      }
      if (opts.variantPrefix) {
        result.variantPrefix = opts.variantPrefix;
      }
      return result;
    }


    _canManageTargets() {
      var flags = this.state.roleFlags
        || (this.page && this.page.state && this.page.state.roleFlags)
        || null;
      if (flags) {
        this.state.roleFlags = flags;
      }
      return !!(flags && (flags.isOperator || flags.isSupervisor));
    }

    async _ensureRoleFlags() {
      if (this.state.roleFlags) {
        return this.state.roleFlags;
      }
      var flagsFromPage = this.page && this.page.state && this.page.state.roleFlags;
      if (flagsFromPage) {
        this.state.roleFlags = flagsFromPage;
        return this.state.roleFlags;
      }
      if (this.page && typeof this.page.resolveSessionRoleFlags === 'function') {
        this.state.roleFlags = await this.page.resolveSessionRoleFlags();
        return this.state.roleFlags;
      }
      return null;
    }

    _composeActionAriaLabel(actionText, item) {
      var target = this._describeTarget(item);
      if (!target) return this._targetAlias() + 'を' + actionText;
      return target + 'を' + actionText;
    }

    _describeTarget(item) {
      var alias = this._targetAlias();
      if (!item) return '';
      if (item.title) {
        return alias + '「' + item.title + '」';
      }
      if (item.id != null && item.id !== '') {
        return alias + ' #' + item.id;
      }
      return '';
    }

    _targetAlias()
    {
      var alias = '';
      if (this.page && typeof this.page.resolveTargetAlias === 'function')
      {
        alias = this.page.targetAlias || this.page.resolveTargetAlias();
      }
      alias = String(alias || '').trim();
      return alias || 'ターゲット';
    }

    _resolveStatusKey(raw) {
      if (!raw || typeof raw !== 'object') return '';
      var cfgCandidates = (this.page && this.page.statusLabelConfig && this.page.statusLabelConfig.statusKeyCandidates) || [];
      var candidates = cfgCandidates.length
        ? cfgCandidates
        : ['statusKey', 'statusCode', 'status', 'stateKey', 'stateCode', 'state'];
      for (var i = 0; i < candidates.length; i++) {
        var key = candidates[i];
        if (raw[key] != null) {
          return this._normalizeStatusKey(raw[key]);
        }
      }
      return '';
    }

    _resolveStatusLabel(raw, statusKey) {
      var labelMap = this._getStatusLabelMap();
      if (statusKey && labelMap && Object.prototype.hasOwnProperty.call(labelMap, statusKey)) {
        var mapped = labelMap[statusKey];
        if (mapped != null) {
          return String(mapped);
        }
      }
      if (!raw || typeof raw !== 'object') return '';
      var candidates = ['statusLabel', 'statusText', 'statusDisplay', 'statusName', 'statusTitle'];
      for (var i = 0; i < candidates.length; i++) {
        var key = candidates[i];
        if (raw[key] != null) {
          return String(raw[key]);
        }
      }
      return '';
    }

    _getStatusLabelMap() {
      var page = this.page || {};
      var cfg = page.statusLabelConfig || {};
      return cfg.labelMap || {};
    }

    _normalizeStatusKey(value) {
      if (value == null) return '';
      var str = String(value).trim().toLowerCase();
      return str;
    }
  }

  w.Targets = w.Targets || {};
  w.Targets.JobView = JobView;
})(window);
