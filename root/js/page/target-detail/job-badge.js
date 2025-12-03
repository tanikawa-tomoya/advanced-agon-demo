(function ()
{
  'use strict';

  var BADGE_COLOR_PRESETS = [
    { label: 'Mental Anchor', color: '#8B5CF6', highlight: '#C4B5FD', icon: '◎' },
    { label: 'Aurora Green', color: '#22C55E', highlight: '#86EFAC', icon: '✺' },
    { label: 'Sunrise Ember', color: '#F97316', highlight: '#FECACA', icon: '☼' }
  ];

  var GRADIENT_PATTERNS = [
    { id: 'soft-diagonal', label: 'ソフト斜めグラデ', type: 'linear', angle: 135 },
    { id: 'radial-bloom', label: '中心放射', type: 'radial' },
    { id: 'split-tone', label: 'ツートン', type: 'linear', angle: 90 },
    { id: 'glass', label: 'ガラス風', type: 'glass' },
    { id: 'sunset', label: 'サンセット', type: 'linear', angle: 200 }
  ];

  var ICON_PATTERNS = [
    { id: 'orbit', label: 'オービット', stripe: { angle: 32, thickness: 3, spacing: 9, opacity: 0.25 }, dot: { size: 8, density: 7, opacity: 0.2 }, emboss: 0.2 },
    { id: 'static', label: '静止グリッド', stripe: { angle: 60, thickness: 5, spacing: 12, opacity: 0.28 }, dot: { size: 7, density: 9, opacity: 0.24 }, emboss: 0.35, isStatic: true },
    { id: 'fiber', label: 'ファイバー', stripe: { angle: 18, thickness: 2, spacing: 6, opacity: 0.35 }, dot: { size: 6, density: 10, opacity: 0.12 }, emboss: 0.12 },
    { id: 'halo', label: 'ハロー', stripe: { angle: 90, thickness: 8, spacing: 14, opacity: 0.2 }, dot: { size: 10, density: 5, opacity: 0.18 }, emboss: 0.32 }
  ];

  var BADGE_EFFECTS = [
    { id: 'none', label: '効果なし' },
    { id: 'glow', label: 'グロー', description: '周囲に淡い光彩を追加' },
    { id: 'scan', label: 'スキャンライン', description: '走査線で未来感を演出' },
    { id: 'spark', label: 'スパーク', description: 'きらめく粒子で強調' }
  ];

  var FONT_AWESOME_ICONS = [
    { value: 'fa-solid fa-star', label: 'Star' },
    { value: 'fa-solid fa-medal', label: 'Medal' },
    { value: 'fa-solid fa-fire', label: 'Fire' },
    { value: 'fa-solid fa-user-astronaut', label: 'Astronaut' },
    { value: 'fa-solid fa-crown', label: 'Crown' }
  ];

  var DEFAULT_BADGE_TEMPLATE = {
    title: 'Mental Anchor',
    description: 'ルーティンを崩さず取り組んだ生徒に授与。',
    icon: '◎',
    iconType: 'text',
    color: '#8B5CF6',
    highlight: '#C4B5FD',
    gradientPattern: 'soft-diagonal',
    iconPattern: 'orbit',
    effectPattern: 'glow'
  };

  function createIconElement(markup)
  {
    if (!markup)
    {
      return null;
    }
    var template = document.createElement('template');
    template.innerHTML = markup.trim();
    return template.content.firstElementChild;
  }

  function deriveBadgeCodeFromTitle(title)
  {
    var normalized = typeof title === 'string' ? title.trim() : '';
    if (!normalized)
    {
      return '';
    }
    var simplified = normalized.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_-]/g, '').replace(/-{2,}/g, '-');
    var trimmed = simplified.replace(/^-+|-+$/g, '');
    if (!trimmed)
    {
      return '';
    }
    if (trimmed.length > 64)
    {
      return trimmed.slice(0, 64);
    }
    return trimmed;
  }

  function normalizeIdentifier(value)
  {
    if (value == null)
    {
      return '';
    }
    if (typeof value === 'string')
    {
      return value.trim();
    }
    return String(value);
  }

  function isValidHexColor(value)
  {
    if (typeof value !== 'string')
    {
      return false;
    }
    return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
  }

    function applyFeedbackMessage(node, message, type)
    {
      if (!node)
      {
        return;
      }
      node.classList.remove('is-error', 'is-success');
      if (!message)
      {
        node.textContent = '';
        node.hidden = true;
        return;
      }
      node.hidden = false;
      node.textContent = message;
      if (type === 'error')
      {
        node.classList.add('is-error');
      }
      if (type === 'success')
      {
        node.classList.add('is-success');
      }
    }

    function deriveInitial(text, fallback)
    {
      var normalized = typeof text === 'string' ? text.trim() : '';
      if (!normalized)
      {
        return fallback || '？';
      }
      return normalized.charAt(0);
    }

    function generateBadgeCode(title)
    {
      var base = deriveBadgeCodeFromTitle(title) || 'badge';
      if (base.length > 40)
      {
        base = base.substring(0, 40);
      }
      var suffix = Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36);
      var code = (base + '-' + suffix).replace(/[^a-z0-9_-]/g, '');
      if (code.length > 64)
      {
        code = code.substring(0, 64);
      }
      if (!code)
      {
        code = 'badge-' + Date.now().toString(36);
      }
      return code;
    }

  function normalizeCatalogBadge(entry)
  {
    if (!entry || typeof entry !== 'object')
    {
      return null;
    }
    var badgeId = normalizeIdentifier(entry.badgeId != null ? entry.badgeId : (entry.id != null ? entry.id : entry.badge_id));
    var badgeCode = normalizeIdentifier(entry.badgeCode != null ? entry.badgeCode : entry.code);
    if (!badgeId && !badgeCode)
    {
      return null;
    }
    var iconValue = entry.icon || '★';
    var iconType = entry.iconType || (iconValue && iconValue.indexOf('fa-') >= 0 ? 'fa' : 'text');
    var color = entry.color || '#4F8BFF';
    var highlight = entry.highlight || entry.accent || color;
    return {
      badgeId: badgeId || null,
      badgeCode: badgeCode || '',
      title: entry.title || entry.name || badgeCode || badgeId || 'バッジ',
      description: entry.description || '',
      tier: entry.tier || entry.rank || '',
      icon: iconValue,
      iconType: iconType,
      color: color,
      highlight: highlight,
      gradientPattern: entry.gradientPattern || entry.gradient || 'soft-diagonal',
      iconPattern: entry.iconPattern || 'orbit',
      effectPattern: entry.effectPattern || entry.effect || 'glow',
      paletteName: entry.paletteName || entry.palette || '',
      points: entry.points == null ? null : entry.points
    };
  }

  function normalizeAward(entry)
  {
    if (!entry)
    {
      return null;
    }
    var awardId = entry.badgeAwardId || entry.awardId || entry.id;
    if (!awardId)
    {
      var base = entry.badgeCode || 'badge';
      var user = entry.userCode || 'user';
      awardId = base + '-' + user;
    }
    var displayName = entry.userDisplayName || entry.userName || entry.displayName || entry.userCode || '';
    var userCode = entry.userCode || '';
    var avatarInitial = entry.userAvatarInitial || deriveInitial(displayName || userCode, '？');
    return {
      awardId: awardId,
      badgeId: entry.badgeId || entry.badge_id || null,
      badgeCode: entry.badgeCode || '',
      badgeTitle: entry.badgeTitle || entry.badgeName || entry.badgeCode || 'バッジ',
      badgeDescription: entry.badgeDescription || '',
      badgeTier: entry.badgeTier || entry.badgeLevel || '',
      badgeIcon: entry.badgeIcon || '★',
      badgeIconType: entry.badgeIconType || (entry.badgeIcon && entry.badgeIcon.indexOf('fa-') >= 0 ? 'fa' : 'text'),
      badgeColor: entry.badgeColor || '#4F8BFF',
      badgeHighlight: entry.badgeHighlight || entry.badgeColor || '#4F8BFF',
      badgeGradient: entry.badgeGradient || entry.gradientPattern || 'soft-diagonal',
      badgeIconPattern: entry.badgeIconPattern || entry.iconPattern || 'orbit',
      badgeEffect: entry.badgeEffect || entry.effectPattern || 'glow',
      badgePalette: entry.badgePalette || entry.paletteName || '',
      badgePoints: entry.badgePoints == null ? null : entry.badgePoints,
      userCode: userCode,
      userDisplayName: displayName || userCode || '参加者',
      userAvatarUrl: entry.userAvatarUrl || entry.userAvatar || '',
      userAvatarInitial: avatarInitial,
      awardedAtDisplay: entry.awardedAtDisplay || entry.awardedAt || entry.createdAtDisplay || entry.createdAt || '—',
      note: entry.note || ''
    };
  }

  function normalizeEligibleUser(entry)
  {
    if (!entry)
    {
      return null;
    }
    if (entry.isActive === false || entry.endedAt)
    {
      return null;
    }
    if (typeof entry === 'string')
    {
      return {
        userCode: entry,
        displayName: entry,
        mail: '',
      };
    }
    var userCode = entry.userCode || entry.code || entry.id || '';
    var displayName = entry.displayName || entry.userDisplayName || entry.name || userCode;
    if (!userCode && !displayName)
    {
      return null;
    }
    return {
      userCode: userCode || '',
      displayName: displayName || userCode || 'ユーザー',
      mail: entry.mail || entry.mail || entry.userMail || '',
    };
  }

  function dedupeEligibleUsers(list)
  {
    var map = Object.create(null);
    (Array.isArray(list) ? list : []).forEach(function (entry)
    {
      var normalized = normalizeEligibleUser(entry);
      if (!normalized)
      {
        return;
      }
      var key = normalized.userCode ? normalized.userCode.trim().toLowerCase() : normalized.displayName.trim().toLowerCase();
      if (!key)
      {
        return;
      }
      map[key] = normalized;
    });
    return Object.keys(map).map(function (key)
    {
      return map[key];
    });
  }

  function normalizeFlag(value)
  {
    if (typeof value === 'string')
    {
      var normalized = value.trim().toLowerCase();
      return normalized === '1' || normalized === 'true';
    }
    return value === true || value === 1;
  }

  function resolveRole(entry, user)
  {
    if (!entry && !user)
    {
      return '';
    }
    var keys = ['role', 'roleName', 'roleKey', 'assignmentRole', 'position', 'type'];
    var resolveFrom = function (source)
    {
      if (!source || typeof source !== 'object')
      {
        return '';
      }
      for (var i = 0; i < keys.length; i += 1)
      {
        var value = source[keys[i]];
        if (typeof value === 'string' && value.trim())
        {
          return value.trim().toLowerCase();
        }
      }
      return '';
    };
    return resolveFrom(entry) || resolveFrom(user);
  }

  function filterOperatorAssignments(list)
  {
    var filtered = [];
    (Array.isArray(list) ? list : []).forEach(function (entry)
    {
      if (!entry)
      {
        return;
      }
      var user = entry.user || entry.participant || entry.member || null;
      var role = resolveRole(entry, user);
      var isOperator = normalizeFlag(entry.isOperator) || normalizeFlag(user && user.isOperator) || role === 'operator';
      if (!isOperator)
      {
        return;
      }
      filtered.push(entry);
    });
    return filtered;
  }

  function buildSessionUser(profile)
  {
    if (!profile)
    {
      return null;
    }
    var userCode = profile.userCode || profile.user_code || profile.code || '';
    var displayName = profile.displayName || profile.name || profile.fullName || userCode;
    if (!userCode && !displayName)
    {
      return null;
    }
    return {
      userCode: userCode || '',
      displayName: displayName || userCode || 'ユーザー',
      mail: profile.mail || profile.email || profile.mailAddress || ''
    };
  }

  function applyBadgeSurface(element, badge)
  {
    if (!element || !badge)
    {
      return;
    }
    element.style.setProperty('--badge-preview-color', badge.color || badge.badgeColor || '#4f8bff');
    element.style.setProperty('--badge-preview-highlight', badge.highlight || badge.badgeHighlight || badge.color || '#4f8bff');
    if (element.dataset)
    {
      element.dataset.gradient = badge.gradientPattern || badge.badgeGradient || 'soft-diagonal';
      element.dataset.effect = badge.effectPattern || badge.badgeEffect || 'glow';
      element.dataset.iconPattern = badge.iconPattern || badge.badgeIconPattern || 'orbit';
    }
  }

  function renderBadgeIcon(target, iconValue, iconType, textScale)
  {
    if (!target)
    {
      return;
    }
    var existingPattern = target.querySelector('.target-detail__badge-pattern');
    target.innerHTML = '';
    target.classList.remove('target-detail__badge-icon--fa', 'target-detail__badge-icon--text');
    target.style.setProperty('--badge-icon-text-scale', textScale || 1);
    var type = iconType === 'fa' ? 'fa' : 'text';
    if (type === 'fa')
    {
      var icon = document.createElement('i');
      icon.className = iconValue || 'fa-solid fa-star';
      icon.setAttribute('aria-hidden', 'true');
      target.appendChild(icon);
      target.classList.add('target-detail__badge-icon--fa');
    }
    else
    {
      var span = document.createElement('span');
      span.className = 'target-detail__badge-icon-text';
      span.textContent = iconValue || '★';
      target.appendChild(span);
      target.classList.add('target-detail__badge-icon--text');
    }
    if (existingPattern)
    {
      target.appendChild(existingPattern);
    }
  }

  function renderBadgeMetaParts(badge)
  {
    var metaParts = [];
    if (badge && badge.tier)
    {
      metaParts.push(badge.tier);
    }
    if (badge && typeof badge.points === 'number')
    {
      metaParts.push('+' + badge.points + 'pt');
    }
    if (badge && badge.paletteName)
    {
      metaParts.push('Palette: ' + badge.paletteName);
    }
    return metaParts;
  }

  function normalizePalette(entry)
  {
    if (!entry)
    {
      return null;
    }
    var color = entry.color || entry.color_hex || '#4F8BFF';
    var highlight = entry.highlight || entry.highlight_hex || color;
    return {
      id: entry.id || entry.paletteId || entry.palette_id || entry.name || null,
      name: entry.name || entry.label || 'お気に入り',
      color: color,
      highlight: highlight,
      gradientPattern: entry.gradientPattern || entry.gradient || 'soft-diagonal',
      iconPattern: entry.iconPattern || 'orbit',
      effectPattern: entry.effectPattern || 'glow'
    };
  }

  function randomHexColor()
  {
    var value = Math.floor(Math.random() * 0xffffff);
    return '#' + value.toString(16).padStart(6, '0').toUpperCase();
  }

  function buildUserSummary(user)
  {
    if (!user)
    {
      return '選択されていません';
    }
    var parts = [];
    if (user.displayName)
    {
      parts.push(user.displayName);
    }
    if (user.userCode)
    {
      parts.push('コード: ' + user.userCode);
    }
    if (user.mail)
    {
      parts.push('メール: ' + user.mail);
    }
    return parts.join(' / ');
  }

  class TargetDetailBadge
  {
    constructor(pageInstance)
    {
      this.page = pageInstance;
      this.canManage = false;
      this.state = {
        awards: [],
        catalog: [],
        awarderCandidates: [],
        eligibleUsers: [],
        savedPalettes: []
      };
      this.modals = {
        add: null,
        create: null
      };
      this.refs = {
        container: null,
        feedback: null,
        list: null,
        refresh: null
      };
      this.avatarService = pageInstance && pageInstance.avatarService ? pageInstance.avatarService : null;
    }

    getRoleFlags()
    {
      var flags = this.page && this.page.state ? this.page.state.roleFlags : null;
      return flags || { isSupervisor: false, isOperator: false };
    }

    getSessionUser()
    {
      var profile = this.page && this.page.state ? this.page.state.profile : null;
      return buildSessionUser(profile);
    }

    requiresAwarderSelection()
    {
      return Boolean(this.page && typeof this.page.isSupervisorUser === 'function' && this.page.isSupervisorUser());
    }

    setNodeVisibility(target, isVisible)
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

    canManageBadges()
    {
      var flags = this.getRoleFlags();
      return !!(flags && (flags.isOperator || flags.isSupervisor || flags.canManageTargets));
    }

    async render()
    {
      this.canManage = this.canManageBadges();
      this.refs.container = this.page.refs.tabPanels && this.page.refs.tabPanels.badges;
      if (!this.refs.container)
      {
        return;
      }
      this.refs.container.innerHTML = '';
      this.refs.container.classList.add('target-detail__panel');
      this.renderLayout();
      await this.reloadAwards();
    }

    renderLayout()
    {
      var section = document.createElement('section');
      section.className = 'target-detail__badges';
      var header = document.createElement('div');
      header.className = 'target-detail__section-header';
      var title = document.createElement('h2');
      title.textContent = 'バッジ';
      header.appendChild(title);
      var actions = document.createElement('div');
      actions.className = 'target-detail__section-actions target-detail__badge-actions';

      if (this.canManage)
      {
        var addButton = this.page.buttonService.createActionButton('expandable-icon-button/add', {
          baseClass: 'target-management__icon-button target-management__icon-button--primary target-detail__badge-add',
          label: 'バッジを追加',
          ariaLabel: 'バッジを追加',
          hoverLabel: 'バッジを追加',
          title: 'バッジを追加'
        });
        addButton.addEventListener('click', () =>
        {
          this.openAddModal();
        });
        actions.appendChild(addButton);
      }

      var refreshButton = this.page.buttonService.createActionButton('expandable-icon-button/reload', {
        baseClass: 'target-management__icon-button target-management__icon-button--ghost target-detail__badge-refresh',
        label: '再読み込み',
        ariaLabel: '再読み込み',
        hoverLabel: 'バッジを再読み込み',
        title: 'バッジを再読み込み'
      });
      refreshButton.addEventListener('click', () =>
      {
        this.reloadAwards(true);
      });
      actions.appendChild(refreshButton);
      this.refs.refresh = refreshButton;

      header.appendChild(actions);
      section.appendChild(header);
      section.appendChild(this.renderGrid());
      this.refs.container.appendChild(section);
    }

    renderGrid()
    {
      var grid = document.createElement('div');
      grid.className = 'target-detail__badge-grid';

      var card = document.createElement('div');
      card.className = 'target-detail__card target-detail__badge-card';

      var header = document.createElement('div');
      header.className = 'target-detail__submission-list-header target-detail__badge-list-header';
      var title = document.createElement('h3');
      title.textContent = '授与済みバッジ';
      var summary = document.createElement('p');
      summary.textContent = '授与済みのバッジや授与メモを確認できます。';
      header.appendChild(title);
      header.appendChild(summary);
      card.appendChild(header);

      var feedback = document.createElement('div');
      feedback.className = 'user-management__feedback target-detail__badge-feedback';
      feedback.setAttribute('role', 'status');
      feedback.setAttribute('aria-live', 'polite');
      feedback.hidden = true;
      card.appendChild(feedback);
      this.refs.feedback = feedback;

      var list = document.createElement('div');
      list.className = 'target-detail__badge-list';
      card.appendChild(list);
      this.refs.list = list;

      grid.appendChild(card);
      return grid;
    }

    setListFeedback(message, type)
    {
      applyFeedbackMessage(this.refs.feedback, message, type);
    }

    async reloadAwards(force)
    {
      if (!this.page || !this.page.state || !this.page.state.targetCode)
      {
        this.setListFeedback('ターゲット情報を取得できません。', 'error');
        return;
      }
      if (this.refs.refresh)
      {
        this.refs.refresh.disabled = true;
      }
      this.setListFeedback('授与済みバッジを読み込み中です…', 'info');
      try
      {
        var data = await this.page.loadBadges(force ? { force: true } : undefined);
        var awards = Array.isArray(data && data.awards) ? data.awards : [];
        var catalog = Array.isArray(data && data.catalog) ? data.catalog : [];
        var palettes = Array.isArray(data && data.palettes) ? data.palettes : [];
        this.state.awards = awards.map(normalizeAward).filter(Boolean);
        this.setCatalog(catalog);
        this.state.savedPalettes = palettes.map(normalizePalette).filter(Boolean);
        if (this.page && this.page.state)
        {
          this.page.state.badges = this.page.state.badges || {};
          this.page.state.badges.palettes = this.state.savedPalettes.slice();
        }
        this.renderAwardList();
        this.setListFeedback('');
      }
      catch (error)
      {
        console.error('[target-detail] failed to load badges', error);
        this.setListFeedback('バッジ情報の取得に失敗しました。', 'error');
      }
      finally
      {
        if (this.refs.refresh)
        {
          this.refs.refresh.disabled = false;
        }
      }
    }

    setCatalog(rawBadges)
    {
    var normalized = Array.isArray(rawBadges) ? rawBadges.map(normalizeCatalogBadge).filter(Boolean) : [];
    var map = Object.create(null);
    normalized.forEach(function (entry)
    {
      var key = entry.badgeId || entry.badgeCode;
        if (!key)
        {
          return;
        }
        map[key] = entry;
      });
      normalized = Object.keys(map).map(function (key)
      {
        return map[key];
      });
    normalized.sort(function (a, b)
    {
        var titleCompare = normalizeIdentifier(a.title).localeCompare(normalizeIdentifier(b.title), 'ja', { sensitivity: 'base', numeric: true });
        if (titleCompare !== 0)
        {
          return titleCompare;
        }
        var aIdentifier = normalizeIdentifier(a.badgeId || a.badgeCode);
        var bIdentifier = normalizeIdentifier(b.badgeId || b.badgeCode);
        return aIdentifier.localeCompare(bIdentifier, 'ja', { sensitivity: 'base', numeric: true });
    });
    this.state.catalog = normalized;
  }

    getCatalogBadge(identifier)
    {
      if (!identifier)
      {
        return null;
      }
      return this.state.catalog.find(function (entry)
      {
        return entry && (entry.badgeId === identifier || entry.badgeCode === identifier);
      }) || null;
    }

    getUserSelectModalService()
    {
      if (this.page && this.page.userSelectModalService)
      {
        return this.page.userSelectModalService;
      }
      return null;
    }

    renderAwardList()
    {
      if (!this.refs.list)
      {
        return;
      }
      this.refs.list.innerHTML = '';
      if (!this.state.awards.length)
      {
        var empty = document.createElement('p');
        empty.className = 'target-detail__badge-empty';
        empty.textContent = 'まだバッジが授与されていません。';
        this.refs.list.appendChild(empty);
        return;
      }
      var allowRevoke = true;

      var table = document.createElement('table');
      table.className = 'target-detail__badge-table target-detail__submission-table';
      var thead = document.createElement('thead');
      var headerRow = document.createElement('tr');
      ['バッジ', '対象者', '授与日時', 'メモ'].forEach(function (label)
      {
        var th = document.createElement('th');
        th.scope = 'col';
        th.textContent = label;
        headerRow.appendChild(th);
      });
      if (allowRevoke)
      {
        var thAction = document.createElement('th');
        thAction.scope = 'col';
        thAction.className = 'target-detail__badge-actions-header';
        thAction.textContent = '操作';
        headerRow.appendChild(thAction);
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      this.state.awards.forEach((award) =>
      {
        var row = document.createElement('tr');
        row.className = 'target-detail__badge-row';

        var badgeCell = document.createElement('td');
        badgeCell.className = 'target-detail__badge-cell target-detail__badge-cell--badge';
        badgeCell.appendChild(this.buildBadgeChip(award));

        var userCell = document.createElement('td');
        userCell.className = 'target-detail__badge-cell target-detail__badge-cell--user';
        userCell.appendChild(this.buildUserDisplay(award));

        var dateCell = document.createElement('td');
        dateCell.className = 'target-detail__badge-cell target-detail__badge-cell--date';
        dateCell.textContent = award.awardedAtDisplay || '—';

        var noteCell = document.createElement('td');
        noteCell.className = 'target-detail__badge-cell target-detail__badge-cell--note';
        noteCell.textContent = award.note ? award.note : '—';

        row.appendChild(badgeCell);
        row.appendChild(userCell);
        row.appendChild(dateCell);
        row.appendChild(noteCell);

        if (allowRevoke)
        {
          var actionCell = document.createElement('td');
          actionCell.className = 'target-detail__badge-cell target-detail__badge-cell--actions';
          var revokeButton = this.page.buttonService.createDeleteButton({
            baseClass: 'target-detail__badge-revoke table-action-button',
            ariaLabel: '授与を取り消す',
            hoverLabel: '授与を取り消す',
            title: '授与を取り消す'
          });
          revokeButton.addEventListener('click', () =>
          {
            this.handleRevoke(award, revokeButton);
          });
          actionCell.appendChild(revokeButton);
          row.appendChild(actionCell);
        }

        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      this.refs.list.appendChild(table);
      this.bindAwardUserPopovers(this.refs.list);
    }

    buildBadgeChip(award)
    {
      var chip = document.createElement('div');
      chip.className = 'target-detail__badge-chip';
      applyBadgeSurface(chip, {
        color: award.badgeColor,
        highlight: award.badgeHighlight,
        gradientPattern: award.badgeGradient,
        iconPattern: award.badgeIconPattern,
        effectPattern: award.badgeEffect
      });

      var glow = document.createElement('span');
      glow.className = 'target-detail__badge-chip-glow';
      var icon = document.createElement('span');
      icon.className = 'target-detail__badge-chip-icon';
      renderBadgeIcon(icon, award.badgeIcon || '★', award.badgeIconType || 'text', 1);
      var iconPattern = document.createElement('span');
      iconPattern.className = 'target-detail__badge-pattern';
      icon.appendChild(iconPattern);
      var info = document.createElement('div');
      info.className = 'target-detail__badge-chip-info';
      var title = document.createElement('strong');
      title.className = 'target-detail__badge-chip-title';
      title.textContent = award.badgeTitle || award.badgeCode || 'バッジ';
      var meta = document.createElement('span');
      meta.className = 'target-detail__badge-chip-meta';
      var metaParts = renderBadgeMetaParts({
        tier: award.badgeTier,
        points: award.badgePoints,
        paletteName: award.badgePalette
      });
      if (award.badgeDescription)
      {
        metaParts.unshift(award.badgeDescription);
      }
      meta.textContent = metaParts.join(' / ') || '—';
      info.appendChild(title);
      info.appendChild(meta);
      chip.append(glow, icon, info);
      return chip;
    }

    buildUserDisplay(award)
    {
      var display = document.createElement('div');
      display.className = 'target-detail__badge-user-display';
      var label = award.userDisplayName || award.userCode || '—';
      var avatar = document.createElement('span');
      avatar.className = 'target-detail__badge-user-avatar';
      avatar.setAttribute('data--creator-avatar', 'true');
      avatar.dataset.avatarName = label;
      avatar.dataset.avatarAlt = label;
      avatar.dataset.userDisplay = label;
      avatar.dataset.userName = label;
      avatar.dataset.userCode = award.userCode || '';
      avatar.dataset.userActive = award && award.isActive === false ? 'false' : 'true';
      if (award.note)
      {
        avatar.dataset.userDetail = award.note;
      }
      avatar.setAttribute('data-overview-user-anchor', 'true');
      avatar.setAttribute('aria-haspopup', 'true');
      avatar.setAttribute('role', 'button');
      avatar.tabIndex = 0;
      if (award.userCode)
      {
        avatar.setAttribute('aria-label', label + '（' + award.userCode + '）');
      }
      else
      {
        avatar.setAttribute('aria-label', label);
      }
      if (award.userAvatarUrl)
      {
        avatar.dataset.avatarSrc = award.userAvatarUrl;
      }

      var avatarService = this.avatarService;
      var avatarRendered = false;
      if (avatarService && typeof avatarService.render === 'function')
      {
        try
        {
          var node = avatarService.render(avatar, {
            name: label,
            alt: label,
            src: avatar.dataset.avatarSrc || '',
            isActive: award && award.isActive !== false
          }, {
            size: 44,
            shape: 'circle',
            nameOverlay: true,
            initialsFallback: true
          });
          avatarRendered = true;
          if (node && award.userAvatarTransform)
          {
            var img = node.querySelector('img');
            if (img)
            {
              img.style.transform = award.userAvatarTransform;
            }
          }
        }
        catch (error)
        {
          avatarRendered = false;
          if (window.console && typeof window.console.warn === 'function')
          {
            window.console.warn('[target-detail][badge] failed to render user avatar', error);
          }
        }
      }
      if (!avatarRendered)
      {
        var fallback = document.createElement('span');
        fallback.className = 'target-detail__badge-user-avatar-initial';
        fallback.textContent = award.userAvatarInitial || deriveInitial(award.userDisplayName || award.userCode, '？');
        avatar.appendChild(fallback);
      }
      display.append(avatar);
      return display;
    }

    bindAwardUserPopovers(container)
    {
      var avatarService = this.avatarService;
      if (!container || !avatarService || typeof avatarService.eventUpdate !== 'function')
      {
        return;
      }
      var anchors = container.querySelectorAll('[data-overview-user-anchor]');
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

    normalizeAwardTarget(selection)
    {
      if (!selection)
      {
        return null;
      }
      var userCode = selection.userCode || selection.code || '';
      var displayName = selection.displayName || selection.userDisplayName || selection.name || selection.userName || selection.fullName || '';
      if (!displayName && userCode)
      {
        displayName = userCode;
      }
      if (!displayName && !userCode)
      {
        return null;
      }
      return {
        displayName: displayName,
        userCode: userCode
      };
    }

    setAwardTarget(modal, selection)
    {
      if (!modal)
      {
        return;
      }
      var normalized = this.normalizeAwardTarget(selection);
      modal.selectedUser = normalized;
      var hasSelection = !!normalized;
      if (modal.userSummary)
      {
        modal.userSummary.hidden = !hasSelection;
      }
      if (modal.userEmpty)
      {
        modal.userEmpty.hidden = hasSelection;
      }
      if (modal.userName)
      {
        modal.userName.textContent = normalized ? normalized.displayName : '';
      }
      if (modal.userCode)
      {
        modal.userCode.textContent = normalized && normalized.userCode ? '(' + normalized.userCode + ')' : '';
      }
      if (modal.userClearButton)
      {
        if (hasSelection)
        {
          modal.userClearButton.removeAttribute('disabled');
        }
        else
        {
          modal.userClearButton.setAttribute('disabled', 'disabled');
        }
      }
      this.setFieldErrorState(modal.userField, false);
    }

    normalizeAwarder(selection)
    {
      if (!selection)
      {
        return null;
      }
      var userCode = selection.userCode || selection.code || '';
      var displayName = selection.displayName || selection.userDisplayName || selection.name || selection.userName || selection.fullName || '';
      if (!displayName && userCode)
      {
        displayName = userCode;
      }
      if (!displayName && !userCode)
      {
        return null;
      }
      return {
        displayName: displayName,
        userCode: userCode,
        mail: selection.mail || selection.userMail || ''
      };
    }

    setAwarder(modal, selection, options)
    {
      if (!modal)
      {
        return;
      }
      var normalized = this.normalizeAwarder(selection);
      modal.selectedAwarder = normalized;
      var hasSelection = !!normalized;
      var disableClear = options && options.disableClear === true;
      var hideActions = options && options.hideActions === true;
      if (modal.awarderSummary)
      {
        modal.awarderSummary.hidden = !hasSelection;
      }
      if (modal.awarderEmpty)
      {
        modal.awarderEmpty.hidden = hasSelection;
      }
      if (modal.awarderName)
      {
        modal.awarderName.textContent = normalized ? normalized.displayName : '';
      }
      if (modal.awarderCode)
      {
        modal.awarderCode.textContent = normalized && normalized.userCode ? '(' + normalized.userCode + ')' : '';
      }
      if (modal.awarderActions)
      {
        modal.awarderActions.hidden = !!hideActions;
      }
      if (modal.awarderSelectButton)
      {
        modal.awarderSelectButton.disabled = !!hideActions;
      }
      if (modal.awarderClearButton)
      {
        if (hasSelection && !disableClear && !hideActions)
        {
          modal.awarderClearButton.removeAttribute('disabled');
        }
        else
        {
          modal.awarderClearButton.setAttribute('disabled', 'disabled');
        }
      }
      this.setFieldErrorState(modal.awarderField, false);
    }

    applyAwarderPolicy(modal, selection)
    {
      if (!modal)
      {
        return;
      }
      var requiresAwarderSelection = this.requiresAwarderSelection();
      var resolvedSelection = requiresAwarderSelection ? (selection || modal.selectedAwarder) : null;
      if (!resolvedSelection)
      {
        resolvedSelection = this.getSessionUser();
      }
      this.setAwarder(modal, resolvedSelection, {
        disableClear: !requiresAwarderSelection,
        hideActions: !requiresAwarderSelection
      });
      this.setNodeVisibility(modal.awarderField, requiresAwarderSelection);
    }

    resolveNestedModalZIndex(modal)
    {
      if (!modal || !modal.root)
      {
        return null;
      }
      var base = modal.root.style && modal.root.style.zIndex ? Number(modal.root.style.zIndex) : null;
      if (base)
      {
        return base + 1;
      }
      var cs = window.getComputedStyle(modal.root);
      if (cs && cs.zIndex && cs.zIndex !== 'auto')
      {
        var parsed = Number(cs.zIndex);
        if (!isNaN(parsed))
        {
          return parsed + 1;
        }
      }
      return null;
    }

    async openAwarderSelectModal(modal)
    {
      if (!this.requiresAwarderSelection())
      {
        return;
      }
      var service = this.getUserSelectModalService();
      if (!service)
      {
        throw new Error('[target-detail] user select modal service is not available');
      }
      var selected = modal && modal.selectedAwarder ? modal.selectedAwarder : null;
      var candidates = await this.loadAwarderCandidates();
      var modalOptions = {
        title: '授与者を選択',
        availableUsers: candidates,
        selectedCodes: selected && selected.userCode ? [selected.userCode] : [],
        selectedUserCode: selected ? selected.userCode : '',
        onSelect: (user) =>
        {
          this.setAwarder(modal, user);
          if (modal && modal.awarderSelectButton && typeof modal.awarderSelectButton.focus === 'function')
          {
            modal.awarderSelectButton.focus();
          }
        }
      };
      var zIndex = this.resolveNestedModalZIndex(modal);
      if (zIndex)
      {
        modalOptions.zIndex = zIndex;
      }
      try
      {
        service.open(modalOptions);
      }
      catch (error)
      {
        window.console.error('[target-detail] failed to open awarder select modal', error);
      }
    }

    async openUserSelectModal(modal)
    {
      var service = this.getUserSelectModalService();
      if (!service)
      {
        throw new Error('[target-detail] user select modal service is not available');
      }
      var selected = modal && modal.selectedUser ? modal.selectedUser : null;
      var candidates = await this.loadEligibleUsers();
      var modalOptions = {
        title: '授与先を選択',
        availableUsers: candidates,
        selectedUserCode: selected ? selected.userCode : '',
        onSelect: (user) =>
        {
          this.setAwardTarget(modal, user);
          if (modal && modal.userSelectButton && typeof modal.userSelectButton.focus === 'function')
          {
            modal.userSelectButton.focus();
          }
        }
      };
      var zIndex = this.resolveNestedModalZIndex(modal);
      if (zIndex)
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
      }
    }

    getNowDateTimeLocalString()
    {
      var now = new Date();
      now.setMilliseconds(0);
      var offset = now.getTimezoneOffset();
      var local = new Date(now.getTime() - offset * 60000);
      return local.toISOString().slice(0, 16);
    }

    setBadgeOptions(modal)
    {
      if (!modal || !modal.badgeSelect)
      {
        return;
      }
      var select = modal.badgeSelect;
      select.innerHTML = '';
      var placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = '授与するバッジを選択してください';
      placeholder.disabled = true;
      placeholder.selected = true;
      select.appendChild(placeholder);
      var createOption = document.createElement('option');
      createOption.value = '__create__';
      createOption.textContent = '新しいバッジを作成…';
      select.appendChild(createOption);
      this.state.catalog.forEach(function (badge)
      {
        var option = document.createElement('option');
        option.value = badge.badgeId || badge.badgeCode;
        var parts = [badge.title || badge.badgeCode || badge.badgeId];
        var metaParts = renderBadgeMetaParts(badge);
        if (metaParts.length)
        {
          parts.push(metaParts.join(' / '));
        }
        option.textContent = parts.join(' / ');
        select.appendChild(option);
      });
    }

    updateBadgePreview(modal)
    {
      if (!modal || !modal.preview)
      {
        return;
      }
      var selectedCode = modal.badgeSelect ? modal.badgeSelect.value : '';
      if (selectedCode === '__create__')
      {
        modal.badgeSelect.value = '';
        this.openCreateModal();
        return;
      }
      var badge = this.getCatalogBadge(selectedCode);
      var preview = modal.preview;
      applyBadgeSurface(preview.card, badge || {});
      renderBadgeIcon(preview.icon, badge && badge.icon ? badge.icon : '★', badge ? badge.iconType : 'text', 2);
      preview.title.textContent = badge && badge.title ? badge.title : 'バッジ名未選択';
      var metaParts = renderBadgeMetaParts(badge || {});
      preview.meta.textContent = metaParts.join(' / ') || 'バッジ詳細';
      preview.description.textContent = badge && badge.description ? badge.description : 'バッジを選択すると詳細が表示されます。';
    }

    setModalFeedback(modal, message, type)
    {
      if (!modal)
      {
        return;
      }
      applyFeedbackMessage(modal.feedback, message, type);
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
      this.setFieldErrorState(modal.badgeField, false);
      this.setFieldErrorState(modal.badgeSelect, false);
      this.setFieldErrorState(modal.userField, false);
      this.setFieldErrorState(modal.awarderField, false);
    }

    setModalSubmitting(modal, isSubmitting)
    {
      if (!modal)
      {
        return;
      }
      modal.isSubmitting = !!isSubmitting;
      [modal.submitButton, modal.cancelButton, modal.closeButton, modal.userSelectButton, modal.userClearButton, modal.badgeSelect, modal.awarderSelectButton, modal.awarderClearButton].forEach(function (node)
      {
        if (!node)
        {
          return;
        }
        if (isSubmitting)
        {
          node.setAttribute('disabled', 'disabled');
        }
        else
        {
          node.removeAttribute('disabled');
        }
      });
    }

    collectModalValues(modal)
    {
      if (!modal)
      {
        return null;
      }
      return {
        badgeId: modal.badgeSelect.value || '',
        user: modal.selectedUser || null,
        awardedBy: modal.selectedAwarder || null,
        note: modal.noteInput.value.trim(),
        awardedAt: modal.datetimeInput.value || ''
      };
    }

    async submitBadgeForm(modal)
    {
      if (!modal || modal.isSubmitting)
      {
        return;
      }
      this.clearModalValidationState(modal);
      var values = this.collectModalValues(modal);
      if (!values.badgeId)
      {
        this.setModalFeedback(modal, '授与するバッジを選択してください。', 'error');
        this.setFieldErrorState(modal.badgeField, true);
        this.setFieldErrorState(modal.badgeSelect, true);
        if (modal.badgeSelect && typeof modal.badgeSelect.focus === 'function')
        {
          modal.badgeSelect.focus();
        }
        return;
      }
      if (!values.user)
      {
        this.setModalFeedback(modal, '授与先のユーザーを選択してください。', 'error');
        this.setFieldErrorState(modal.userField, true);
        if (modal.userSelectButton && typeof modal.userSelectButton.focus === 'function')
        {
          modal.userSelectButton.focus();
        }
        return;
      }
      var requiresAwarderSelection = this.requiresAwarderSelection();
      if (!values.awardedBy)
      {
        values.awardedBy = this.getSessionUser();
      }
      if (requiresAwarderSelection && !values.awardedBy)
      {
        this.setModalFeedback(modal, '授与者を選択してください。', 'error');
        this.setFieldErrorState(modal.awarderField, true);
        if (modal.awarderSelectButton && typeof modal.awarderSelectButton.focus === 'function')
        {
          modal.awarderSelectButton.focus();
        }
        return;
      }
      this.setModalSubmitting(modal, true);
      this.setModalFeedback(modal, 'バッジを授与しています…', 'info');
      try
      {
        await this.page.callApi('TargetBadgeAward', {
          targetCode: this.page.state.targetCode,
          badgeId: values.badgeId,
          badgeCode: values.badgeId,
          userCode: values.user.userCode,
          awardedByUserCode: values.awardedBy ? values.awardedBy.userCode : '',
          note: values.note,
          awardedAt: values.awardedAt
        }, {
          requestType: 'TargetManagementBadges'
        });
        await this.reloadAwards(true);
        this.setModalFeedback(modal, 'バッジを授与しました。', 'success');
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('success', 'バッジを授与しました。');
        }
        this.closeAddModal();
      }
      catch (error)
      {
        window.console.error('[target-detail] failed to award badge', error);
        this.setModalFeedback(modal, 'バッジの授与に失敗しました。', 'error');
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('error', 'バッジの授与に失敗しました。');
        }
      }
      finally
      {
        this.setModalSubmitting(modal, false);
      }
    }

    async openAddModal()
    {
      if (!this.modals.add)
      {
        this.modals.add = this.createAddModal();
      }
      var modal = this.modals.add;
      modal.restoreTarget = document.activeElement;
      modal.form.reset();
      this.setAwardTarget(modal, null);
      this.applyAwarderPolicy(modal, this.getSessionUser());
      this.setModalFeedback(modal, '', null);
      this.clearModalValidationState(modal);
      modal.datetimeInput.value = this.getNowDateTimeLocalString();
      if (!this.state.catalog.length)
      {
        try
        {
          await this.fetchCatalog();
        }
        catch (error)
        {
          window.console.error('[target-detail] failed to load badge catalog', error);
        }
      }
      this.setBadgeOptions(modal);
      this.updateBadgePreview(modal);
      modal.root.removeAttribute('hidden');
      modal.root.setAttribute('aria-hidden', 'false');
      modal.root.classList.add('is-open');
      if (modal.userSelectButton && typeof modal.userSelectButton.focus === 'function')
      {
        modal.userSelectButton.focus();
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
        '<section class="screen-modal__content target-detail__badge-modal" role="dialog" aria-modal="true" aria-labelledby="target-badge-modal-title">' +
        '<button type="button" class="screen-modal__close" aria-label="モーダルを閉じる">×</button>' +
        '<header class="screen-modal__header">' +
        '<h2 class="screen-modal__title" id="target-badge-modal-title">バッジを授与</h2>' +
        '<p class="screen-modal__summary">バッジと授与先を選択し、必要に応じてメモを残します。</p>' +
        '</header>' +
        '<form class="screen-modal__body target-detail__badge-form" novalidate>' +
        '<div class="target-detail__badge-field">' +
        '<label class="target-reference__form-label" for="target-badge-select">授与するバッジ</label>' +
        '<select id="target-badge-select" class="user-management__input target-detail__badge-select" required></select>' +
        '<button type="button" class="btn btn--text target-detail__badge-create-toggle" data-target-badge-create-open>新規作成</button>' +
        '</div>' +
        '<div class="target-detail__badge-field">' +
        '<span class="target-reference__form-label">授与先</span>' +
        '<div class="target-submission__submitter" data-target-badge-user-picker>' +
        '<p class="target-submission__submitter-empty" data-target-badge-user-empty>授与先が選択されていません。</p>' +
        '<div class="target-submission__submitter-summary" data-target-badge-user-summary hidden>' +
        '<span class="target-submission__submitter-name" data-target-badge-user-name></span>' +
        '<span class="target-submission__submitter-code" data-target-badge-user-code></span>' +
        '</div>' +
        '</div>' +
        '<div class="target-detail__badge-user-actions">' +
        '<button type="button" class="btn btn--ghost" data-target-badge-user-select>授与先を選択</button>' +
        '<button type="button" class="btn btn--text" data-target-badge-user-clear disabled>選択をクリア</button>' +
        '</div>' +
        '</div>' +
        '<div class="target-detail__badge-field" data-target-badge-awarder-field>' +
        '<span class="target-reference__form-label">授与者</span>' +
        '<div class="target-submission__submitter" data-target-badge-awarder-picker>' +
        '<p class="target-submission__submitter-empty" data-target-badge-awarder-empty>授与者が選択されていません。</p>' +
        '<div class="target-submission__submitter-summary" data-target-badge-awarder-summary hidden>' +
        '<span class="target-submission__submitter-name" data-target-badge-awarder-name></span>' +
        '<span class="target-submission__submitter-code" data-target-badge-awarder-code></span>' +
        '</div>' +
        '</div>' +
        '<div class="target-detail__badge-user-actions" data-target-badge-awarder-actions>' +
        '<button type="button" class="btn btn--ghost" data-target-badge-awarder-select>授与者を選択</button>' +
        '<button type="button" class="btn btn--text" data-target-badge-awarder-clear disabled>選択をクリア</button>' +
        '</div>' +
        '</div>' +
        '<div class="target-detail__badge-field">' +
        '<label class="target-reference__form-label" for="target-badge-datetime">授与日時</label>' +
        '<input id="target-badge-datetime" type="datetime-local" class="user-management__input target-detail__badge-datetime" />' +
        '</div>' +
        '<div class="target-detail__badge-field">' +
        '<label class="target-reference__form-label" for="target-badge-note">授与メモ (任意)</label>' +
        '<textarea id="target-badge-note" class="user-management__input target-detail__badge-note" rows="3" maxlength="1024" placeholder="授与理由や共有事項を入力"></textarea>' +
        '</div>' +
        '<div class="target-detail__badge-field target-detail__badge-preview" data-target-badge-preview>' +
        '<div class="target-detail__badge-preview-card">' +
        '<div class="target-detail__badge-preview-icon target-detail__badge-icon target-detail__badge-icon--text">' +
        '<span class="target-detail__badge-icon-text" data-target-badge-preview-icon>★</span>' +
        '<span class="target-detail__badge-pattern"></span>' +
        '</div>' +
        '<div class="target-detail__badge-preview-content">' +
        '<p class="target-detail__badge-preview-title" data-target-badge-preview-title>バッジ名未選択</p>' +
        '<p class="target-detail__badge-preview-meta" data-target-badge-preview-meta>バッジ詳細</p>' +
        '<p class="target-detail__badge-preview-description" data-target-badge-preview-description>バッジを選択すると詳細が表示されます。</p>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<p class="user-management__feedback target-detail__badge-form-feedback" aria-live="polite" hidden></p>' +
        '<div class="target-detail__badge-actions">' +
        '<button type="submit" class="btn btn--primary">授与する</button>' +
        '<button type="button" class="btn btn--ghost" data-modal-cancel>キャンセル</button>' +
        '</div>' +
        '</form>' +
        '</section>';

      document.body.appendChild(modalRoot);

      var form = modalRoot.querySelector('form');
      var overlay = modalRoot.querySelector('.screen-modal__overlay');
      var closeButton = modalRoot.querySelector('.screen-modal__close');
      var cancelButton = modalRoot.querySelector('[data-modal-cancel]');
      var badgeSelect = form.querySelector('#target-badge-select');
      var createButton = form.querySelector('[data-target-badge-create-open]');
      var datetimeInput = form.querySelector('#target-badge-datetime');
      var noteInput = form.querySelector('#target-badge-note');
      var userSummary = form.querySelector('[data-target-badge-user-summary]');
      var userEmpty = form.querySelector('[data-target-badge-user-empty]');
      var userName = form.querySelector('[data-target-badge-user-name]');
      var userCode = form.querySelector('[data-target-badge-user-code]');
      var userSelectButton = form.querySelector('[data-target-badge-user-select]');
      var userClearButton = form.querySelector('[data-target-badge-user-clear]');
      var awarderSummary = form.querySelector('[data-target-badge-awarder-summary]');
      var awarderEmpty = form.querySelector('[data-target-badge-awarder-empty]');
      var awarderName = form.querySelector('[data-target-badge-awarder-name]');
      var awarderCode = form.querySelector('[data-target-badge-awarder-code]');
      var awarderSelectButton = form.querySelector('[data-target-badge-awarder-select]');
      var awarderClearButton = form.querySelector('[data-target-badge-awarder-clear]');
      var awarderActions = form.querySelector('[data-target-badge-awarder-actions]');
      var previewCard = form.querySelector('.target-detail__badge-preview-card');
      var previewIcon = form.querySelector('[data-target-badge-preview-icon]');
      var previewTitle = form.querySelector('[data-target-badge-preview-title]');
      var previewMeta = form.querySelector('[data-target-badge-preview-meta]');
      var previewDescription = form.querySelector('[data-target-badge-preview-description]');
      var feedback = form.querySelector('.target-detail__badge-form-feedback');
      var submitButton = form.querySelector('button[type="submit"]');
      var badgeField = badgeSelect ? badgeSelect.closest('.target-detail__badge-field') : null;
      var userField = userSummary ? userSummary.closest('.target-detail__badge-field') : null;
      var awarderField = form.querySelector('[data-target-badge-awarder-field]');

      var self = this;
      var modal = {
        root: modalRoot,
        form: form,
        overlay: overlay,
        closeButton: closeButton,
        cancelButton: cancelButton,
        badgeSelect: badgeSelect,
        createButton: createButton,
        datetimeInput: datetimeInput,
        noteInput: noteInput,
        userSummary: userSummary,
        userEmpty: userEmpty,
        userName: userName,
        userCode: userCode,
        userSelectButton: userSelectButton,
        userClearButton: userClearButton,
        awarderSummary: awarderSummary,
        awarderEmpty: awarderEmpty,
        awarderName: awarderName,
        awarderCode: awarderCode,
        awarderSelectButton: awarderSelectButton,
        awarderClearButton: awarderClearButton,
        awarderActions: awarderActions,
        feedback: feedback,
        submitButton: submitButton,
        preview: {
          card: previewCard,
          icon: previewIcon,
          title: previewTitle,
          meta: previewMeta,
          description: previewDescription
        },
        badgeField: badgeField,
        userField: userField,
        awarderField: awarderField,
        selectedUser: null,
        selectedAwarder: null,
        restoreTarget: null,
        isSubmitting: false
      };

      var closeConfirmMessage = '入力内容が保存されていません。モーダルを閉じますか？';

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
          window.console.error('[target-detail] failed to confirm badge modal close', error);
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
      form.addEventListener('submit', (event) =>
      {
        event.preventDefault();
        this.submitBadgeForm(modal);
      });
      badgeSelect.addEventListener('change', () =>
      {
        this.updateBadgePreview(modal);
        this.setFieldErrorState(modal.badgeField, false);
        this.setFieldErrorState(modal.badgeSelect, false);
      });
      if (createButton)
      {
        createButton.addEventListener('click', () =>
        {
          this.openCreateModal();
        });
      }
      userSelectButton.addEventListener('click', () =>
      {
        this.openUserSelectModal(modal);
      });
      userClearButton.addEventListener('click', () =>
      {
        this.setAwardTarget(modal, null);
      });
      if (awarderSelectButton)
      {
        awarderSelectButton.addEventListener('click', () =>
        {
          this.openAwarderSelectModal(modal);
        });
      }
      if (awarderClearButton)
      {
        awarderClearButton.addEventListener('click', () =>
        {
          this.setAwarder(modal, null);
        });
      }

      return modal;
    }

    async handleRevoke(award, button)
    {
      if (!award || !award.awardId)
      {
        return;
      }

      var confirmed = await this.page.confirmDialogService.open('このバッジ授与を取り消しますか？', { type: 'warning' });
      if (!confirmed)
      {
        return;
      }
      if (button)
      {
        button.disabled = true;
      }
      this.setListFeedback('授与を取り消しています…', 'info');
      try
      {
        await this.page.callApi('TargetBadgeRevoke', {
          targetCode: this.page.state.targetCode,
          badgeAwardId: award.awardId
        }, {
          requestType: 'TargetManagementBadges'
        });
        await this.reloadAwards(true);
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('success', 'バッジ授与を取り消しました。');
        }
      }
      catch (error)
      {
        console.error('[target-detail] failed to revoke badge', error);
        this.setListFeedback('バッジの取り消しに失敗しました。', 'error');
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('error', 'バッジの取り消しに失敗しました。');
        }
      }
      finally
      {
        if (button)
        {
          button.disabled = false;
        }
      }
    }

    async fetchCatalog()
    {
      var data = await this.page.callApi('BadgeCatalog', { mine: true }, {
        requestType: 'TargetManagementBadges'
      });
      this.setCatalog(Array.isArray(data && data.badges) ? data.badges : data);
      return this.state.catalog;
    }

    async loadEligibleUsers()
    {
      if (this.state.eligibleUsers && this.state.eligibleUsers.length)
      {
        return this.state.eligibleUsers;
      }
      var target = this.page && this.page.state ? this.page.state.target : null;
      var participants = target && Array.isArray(target.participants) ? target.participants : [];
      var assignments = target && Array.isArray(target.assignedUsers) ? target.assignedUsers : [];
      var combinedAssignments = participants.concat(assignments);
      var normalizedAssignments = dedupeEligibleUsers(combinedAssignments);
      this.state.eligibleUsers = normalizedAssignments;
      return this.state.eligibleUsers;
    }

    async loadAwarderCandidates()
    {
      if (this.state.awarderCandidates && this.state.awarderCandidates.length)
      {
        return this.state.awarderCandidates;
      }
      var target = this.page && this.page.state ? this.page.state.target : null;
      var participants = target && Array.isArray(target.participants) ? target.participants : [];
      var assignments = target && Array.isArray(target.assignedUsers) ? target.assignedUsers : [];
      var combinedAssignments = participants.concat(assignments);
      var operators = filterOperatorAssignments(combinedAssignments);
      var normalizedOperators = dedupeEligibleUsers(operators);
      this.state.awarderCandidates = normalizedOperators;
      return this.state.awarderCandidates;
    }

    addBadgeToCatalog(badge)
    {
      var normalized = normalizeCatalogBadge(badge);
      if (!normalized)
      {
        return null;
      }
      var combined = this.state.catalog.filter(function (entry)
      {
        return entry && (entry.badgeId || entry.badgeCode) !== (normalized.badgeId || normalized.badgeCode);
      });
      combined.push(normalized);
      this.setCatalog(combined);
      if (this.page && this.page.state)
      {
        this.page.state.badges = this.page.state.badges || {};
        this.page.state.badges.catalog = this.state.catalog.slice();
      }
      this.setBadgeOptions(this.modals.add);
      this.updateBadgePreview(this.modals.add);
      return normalized;
    }

    applyBadgeTemplate(modal, template)
    {
      if (!modal || !template)
      {
        return;
      }
      if (modal.titleInput)
      {
        modal.titleInput.value = template.title || '';
      }
      if (modal.descriptionInput)
      {
        modal.descriptionInput.value = template.description || '';
      }
      if (modal.iconInput)
      {
        modal.iconInput.value = template.icon || '★';
      }
      if (modal.faIconSelect)
      {
        modal.faIconSelect.value = template.iconType === 'fa' ? (template.icon || '') : '';
      }
      modal.iconType = template.iconType || (template.icon && template.icon.indexOf('fa-') >= 0 ? 'fa' : 'text');
      if (modal.colorInput)
      {
        modal.colorInput.value = template.color || '#4F8BFF';
      }
      if (modal.highlightInput)
      {
        modal.highlightInput.value = template.highlight || template.color || '#4F8BFF';
      }
      if (modal.gradientSelect)
      {
        modal.gradientSelect.value = template.gradientPattern || 'soft-diagonal';
      }
      if (modal.iconPatternSelect)
      {
        modal.iconPatternSelect.value = template.iconPattern || 'orbit';
      }
      if (modal.effectSelect)
      {
        modal.effectSelect.value = template.effectPattern || 'glow';
      }
      this.updateCreatePreview(modal);
    }

    updateCreatePreview(modal)
    {
      if (!modal || !modal.preview)
      {
        return;
      }
      var color = modal.colorInput ? modal.colorInput.value : '#4F8BFF';
      var highlight = modal.highlightInput && modal.highlightInput.value ? modal.highlightInput.value : color;
      var icon = modal.iconType === 'fa' ? (modal.faIconSelect && modal.faIconSelect.value ? modal.faIconSelect.value : 'fa-solid fa-star') : (modal.iconInput && modal.iconInput.value ? modal.iconInput.value : '★');
      var title = modal.titleInput && modal.titleInput.value ? modal.titleInput.value : '新規バッジ';
      var description = modal.descriptionInput && modal.descriptionInput.value ? modal.descriptionInput.value : 'プレビューがここに表示されます。';
      var badgeShape = {
        color: color,
        highlight: highlight,
        gradientPattern: modal.gradientSelect ? modal.gradientSelect.value : 'soft-diagonal',
        iconPattern: modal.iconPatternSelect ? modal.iconPatternSelect.value : 'orbit',
        effectPattern: modal.effectSelect ? modal.effectSelect.value : 'glow'
      };
      applyBadgeSurface(modal.preview.card, badgeShape);
      renderBadgeIcon(modal.preview.icon, icon, modal.iconType || 'text', 2);
      modal.preview.title.textContent = title;
      modal.preview.description.textContent = description;
      if (modal.preview.meta)
      {
        modal.preview.meta.textContent = 'カラーとエフェクトの組み合わせを確認できます';
      }
    }

    setCreateFeedback(modal, message, type)
    {
      if (!modal)
      {
        return;
      }
      applyFeedbackMessage(modal.feedback, message, type);
    }

    setCreateSubmitting(modal, isSubmitting)
    {
      if (!modal)
      {
        return;
      }
      modal.isSubmitting = !!isSubmitting;
      [modal.submitButton, modal.closeButton, modal.cancelButton, modal.colorInput, modal.highlightInput, modal.iconInput, modal.titleInput, modal.descriptionInput, modal.presetSelect, modal.gradientSelect, modal.iconPatternSelect, modal.effectSelect, modal.faIconSelect, modal.paletteSaveButton, modal.paletteNameInput, modal.randomButton].forEach(function (node)
      {
        if (!node)
        {
          return;
        }
        if (isSubmitting)
        {
          node.setAttribute('disabled', 'disabled');
        }
        else
        {
          node.removeAttribute('disabled');
        }
      });
    }

    collectCreateValues(modal)
    {
      if (!modal)
      {
        return null;
      }
      var title = modal.titleInput.value.trim();
      var description = modal.descriptionInput.value.trim();
      var iconType = modal.iconType || 'text';
      var icon = iconType === 'fa' ? (modal.faIconSelect.value || 'fa-solid fa-star') : modal.iconInput.value.trim();
      var color = modal.colorInput.value.trim();
      var highlight = modal.highlightInput.value.trim();
      return {
        badgeCode: generateBadgeCode(title),
        title: title,
        description: description,
        icon: icon,
        iconType: iconType,
        color: color,
        highlight: highlight || color,
        gradientPattern: modal.gradientSelect ? modal.gradientSelect.value : 'soft-diagonal',
        iconPattern: modal.iconPatternSelect ? modal.iconPatternSelect.value : 'orbit',
        effectPattern: modal.effectSelect ? modal.effectSelect.value : 'glow'
      };
    }

    validateCreateValues(modal, values)
    {
      if (!values)
      {
        this.setCreateFeedback(modal, '入力内容を確認してください。', 'error');
        return false;
      }
      if (!values.title)
      {
        this.setCreateFeedback(modal, 'バッジ名を入力してください。', 'error');
        modal.titleInput.focus();
        return false;
      }
      if (values.iconType === 'fa' && !values.icon)
      {
        this.setCreateFeedback(modal, 'Font Awesome アイコンを選択してください。', 'error');
        modal.faIconSelect.focus();
        return false;
      }
      if (values.iconType === 'text' && values.icon && values.icon.length > 2)
      {
        this.setCreateFeedback(modal, 'アイコンは2文字以内で指定してください。', 'error');
        modal.iconInput.focus();
        return false;
      }
      if (!isValidHexColor(values.color))
      {
        this.setCreateFeedback(modal, '色は #RRGGBB 形式で指定してください。', 'error');
        modal.colorInput.focus();
        return false;
      }
      if (values.highlight && !isValidHexColor(values.highlight))
      {
        this.setCreateFeedback(modal, 'グラデーション色は #RRGGBB 形式で指定してください。', 'error');
        modal.highlightInput.focus();
        return false;
      }
      return true;
    }

    handlePresetSelection(modal)
    {
      if (!modal || !modal.presetSelect)
      {
        return;
      }
      var selected = modal.presetSelect.value;
      if (!selected)
      {
        return;
      }
      var preset = BADGE_COLOR_PRESETS.find(function (entry)
      {
        return entry.label === selected;
      });
      if (!preset)
      {
        return;
      }
      this.applyBadgeTemplate(modal, {
        title: preset.label,
        description: modal.descriptionInput.value.trim() || DEFAULT_BADGE_TEMPLATE.description,
        icon: preset.icon || DEFAULT_BADGE_TEMPLATE.icon,
        iconType: 'text',
        color: preset.color,
        highlight: preset.highlight,
        gradientPattern: modal.gradientSelect ? modal.gradientSelect.value : 'soft-diagonal',
        iconPattern: modal.iconPatternSelect ? modal.iconPatternSelect.value : 'orbit',
        effectPattern: modal.effectSelect ? modal.effectSelect.value : 'glow'
      });
    }

    shuffleBadgeSurface(modal)
    {
      if (!modal)
      {
        return;
      }
      var color = randomHexColor();
      var highlight = randomHexColor();
      var gradient = GRADIENT_PATTERNS[Math.floor(Math.random() * GRADIENT_PATTERNS.length)].id;
      var iconPattern = ICON_PATTERNS[Math.floor(Math.random() * ICON_PATTERNS.length)].id;
      var effect = BADGE_EFFECTS[Math.floor(Math.random() * BADGE_EFFECTS.length)].id;
      modal.colorInput.value = color;
      modal.highlightInput.value = highlight;
      modal.gradientSelect.value = gradient;
      modal.iconPatternSelect.value = iconPattern;
      modal.effectSelect.value = effect;
      this.updateCreatePreview(modal);
    }

    renderPaletteList(modal)
    {
      if (!modal || !modal.paletteList)
      {
        return;
      }
      var container = modal.paletteList;
      container.innerHTML = '';
      if (!this.state.savedPalettes.length)
      {
        var empty = document.createElement('p');
        empty.className = 'target-detail__badge-create-note';
        empty.textContent = 'お気に入りはまだありません。気に入った配色に名前を付けて保存できます。';
        container.appendChild(empty);
        return;
      }
      this.state.savedPalettes.forEach((palette) =>
      {
        var row = document.createElement('div');
        row.className = 'target-detail__badge-palette-item';
        row.dataset.paletteId = palette.id || palette.name;
        var info = document.createElement('div');
        info.className = 'target-detail__badge-palette-info';
        var swatch = document.createElement('span');
        swatch.className = 'target-detail__badge-palette-swatch';
        swatch.style.setProperty('--badge-preview-color', palette.color);
        swatch.style.setProperty('--badge-preview-highlight', palette.highlight);
        info.appendChild(swatch);
        var label = document.createElement('span');
        label.className = 'target-detail__badge-palette-label';
        label.textContent = palette.name || 'お気に入り';
        info.appendChild(label);
        var actions = document.createElement('div');
        actions.className = 'target-detail__badge-palette-actions-row';
        var applyButton = document.createElement('button');
        applyButton.type = 'button';
        applyButton.className = 'btn btn--text';
        applyButton.textContent = '適用';
        applyButton.dataset.action = 'apply';
        applyButton.dataset.paletteId = palette.id || palette.name;
        actions.appendChild(applyButton);
        if (this.canManage)
        {
          var deleteButton = document.createElement('button');
          deleteButton.type = 'button';
          deleteButton.className = 'btn btn--text target-detail__badge-palette-delete';
          deleteButton.textContent = '削除';
          deleteButton.dataset.action = 'delete';
          deleteButton.dataset.paletteId = palette.id || palette.name;
          actions.appendChild(deleteButton);
        }
        row.append(info, actions);
        container.appendChild(row);
      });
    }

    savePalette(modal)
    {
      if (!modal)
      {
        return;
      }
      var name = modal.paletteNameInput && modal.paletteNameInput.value ? modal.paletteNameInput.value.trim() : '';
      if (!name)
      {
        name = 'お気に入り ' + (this.state.savedPalettes.length + 1);
      }
      var palette = normalizePalette({
        id: name + '-' + Date.now(),
        name: name,
        color: modal.colorInput.value,
        highlight: modal.highlightInput.value || modal.colorInput.value,
        gradientPattern: modal.gradientSelect.value,
        iconPattern: modal.iconPatternSelect.value,
        effectPattern: modal.effectSelect.value
      });
      this.state.savedPalettes.push(palette);
      if (this.page && this.page.state)
      {
        this.page.state.badges = this.page.state.badges || {};
        this.page.state.badges.palettes = this.state.savedPalettes.slice();
      }
      if (modal.paletteNameInput)
      {
        modal.paletteNameInput.value = '';
      }
      this.renderPaletteList(modal);
    }

    applySavedPalette(modal, id)
    {
      if (!modal || !id)
      {
        return;
      }
      var palette = this.state.savedPalettes.find(function (entry)
      {
        return entry && (entry.id === id || entry.name === id);
      });
      if (!palette)
      {
        return;
      }
      modal.colorInput.value = palette.color;
      modal.highlightInput.value = palette.highlight;
      modal.gradientSelect.value = palette.gradientPattern || 'soft-diagonal';
      modal.iconPatternSelect.value = palette.iconPattern || 'orbit';
      modal.effectSelect.value = palette.effectPattern || 'glow';
      this.updateCreatePreview(modal);
    }

    deleteSavedPalette(modal, id)
    {
      if (!modal || !id)
      {
        return;
      }
      this.state.savedPalettes = this.state.savedPalettes.filter(function (entry)
      {
        return entry && entry.id !== id && entry.name !== id;
      });
      if (this.page && this.page.state && this.page.state.badges)
      {
        this.page.state.badges.palettes = this.state.savedPalettes.slice();
      }
      this.renderPaletteList(modal);
    }

    async submitCreateForm(modal)
    {
      if (!modal || modal.isSubmitting)
      {
        return;
      }
      var values = this.collectCreateValues(modal);
      if (!this.validateCreateValues(modal, values))
      {
        return;
      }
      this.setCreateSubmitting(modal, true);
      this.setCreateFeedback(modal, 'バッジを作成しています…', 'info');
      try
      {
        var response = await this.page.callApi('BadgeCreate', {
          badgeCode: values.badgeCode,
          title: values.title,
          description: values.description,
          icon: values.icon,
          iconType: values.iconType,
          color: values.color,
          highlight: values.highlight,
          gradientPattern: values.gradientPattern,
          iconPattern: values.iconPattern,
          effectPattern: values.effectPattern
        }, {
          requestType: 'TargetManagementBadges'
        });
        var created = response && response.badge ? response.badge : response;
        var normalized = this.addBadgeToCatalog(created || values);
        this.setCreateFeedback(modal, 'バッジを作成しました。', 'success');
        if (this.modals.add && normalized)
        {
          this.modals.add.badgeSelect.value = normalized.badgeId || normalized.badgeCode;
          this.updateBadgePreview(this.modals.add);
        }
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('success', '新しいバッジを作成しました。');
        }
        this.closeCreateModal();
      }
      catch (error)
      {
        window.console.error('[target-detail] failed to create badge', error);
        this.setCreateFeedback(modal, 'バッジの作成に失敗しました。', 'error');
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('error', 'バッジの作成に失敗しました。');
        }
      }
      finally
      {
        this.setCreateSubmitting(modal, false);
      }
    }

    openCreateModal()
    {
      if (!this.modals.create)
      {
        this.modals.create = this.createBadgeCreateModal();
      }
      var modal = this.modals.create;
      modal.restoreTarget = document.activeElement;
      modal.form.reset();
      this.applyBadgeTemplate(modal, DEFAULT_BADGE_TEMPLATE);
      this.setCreateFeedback(modal, '', null);
      modal.iconType = 'text';
      if (!this.state.savedPalettes.length && this.page && this.page.state && this.page.state.badges && Array.isArray(this.page.state.badges.palettes))
      {
        this.state.savedPalettes = this.page.state.badges.palettes.map(normalizePalette).filter(Boolean);
      }
      this.renderPaletteList(modal);
      var zIndex = this.resolveNestedModalZIndex(this.modals.add);
      if (zIndex)
      {
        modal.root.style.zIndex = String(zIndex);
      }
      modal.root.removeAttribute('hidden');
      modal.root.setAttribute('aria-hidden', 'false');
      modal.root.classList.add('is-open');
      if (modal.titleInput && typeof modal.titleInput.focus === 'function')
      {
        modal.titleInput.focus();
      }
      this.updateCreatePreview(modal);
    }

    closeCreateModal()
    {
      if (!this.modals.create)
      {
        return;
      }
      var modal = this.modals.create;
      modal.root.setAttribute('hidden', 'hidden');
      modal.root.setAttribute('aria-hidden', 'true');
      modal.root.classList.remove('is-open');
      this.setCreateSubmitting(modal, false);
      if (modal.restoreTarget && typeof modal.restoreTarget.focus === 'function')
      {
        modal.restoreTarget.focus();
      }
    }


    createBadgeCreateModal()
    {
      var modalRoot = document.createElement('div');
      modalRoot.className = 'screen-modal target-submission__modal-container';
      modalRoot.setAttribute('hidden', 'hidden');
      modalRoot.innerHTML =
        '<div class="screen-modal__overlay" data-modal-close></div>' +
        '<section class="screen-modal__content target-detail__badge-modal" role="dialog" aria-modal="true" aria-labelledby="target-badge-create-title">' +
        '<button type="button" class="screen-modal__close" aria-label="モーダルを閉じる">×</button>' +
        '<header class="screen-modal__header">' +
        '<h2 class="screen-modal__title" id="target-badge-create-title">バッジを新規作成</h2>' +
        '<p class="screen-modal__summary">色・アイコン・テキストを組み合わせて、授与用のバッジを作成します。</p>' +
        '</header>' +
        '<form class="target-detail__badge-form target-detail__badge-create-form" data-target-badge-create-form>' +
        '<div class="target-detail__badge-create-layout">' +
        '<div class="target-detail__badge-create-column">' +
        '<div class="target-detail__badge-field">' +
        '<label class="target-reference__form-label" for="target-badge-create-title">タイトル</label>' +
        '<input id="target-badge-create-title" type="text" class="user-management__input target-detail__badge-create-input" maxlength="100" required />' +
        '</div>' +
        '<div class="target-detail__badge-field">' +
        '<label class="target-reference__form-label" for="target-badge-create-description">説明</label>' +
        '<textarea id="target-badge-create-description" class="user-management__input target-detail__badge-create-textarea" maxlength="255" rows="3" placeholder="授与の意図や条件を記載"></textarea>' +
        '</div>' +
        '<div class="target-detail__badge-field target-detail__badge-icon-picker">' +
        '<span class="target-reference__form-label">アイコン</span>' +
        '<div class="target-detail__badge-icon-row">' +
        '<label for="target-badge-create-icon">テキスト</label>' +
        '<input id="target-badge-create-icon" type="text" class="user-management__input target-detail__badge-create-input" maxlength="2" placeholder="★" />' +
        '</div>' +
        '<div class="target-detail__badge-icon-row">' +
        '<label for="target-badge-create-fa">Font Awesome</label>' +
        '<select id="target-badge-create-fa" class="user-management__input target-detail__badge-create-input">' +
        '<option value="">選択してください</option>' +
        FONT_AWESOME_ICONS.map(function (option)
        {
          return '<option value="' + option.value + '">' + option.label + '</option>';
        }).join('') +
        '</select>' +
        '</div>' +
        '<p class="target-detail__badge-create-note">テキスト入力または Font Awesome から選択できます。</p>' +
        '</div>' +
        '<div class="target-detail__badge-create-grid target-detail__badge-create-grid--tight">' +
        '<div class="target-detail__badge-field target-detail__badge-create-field">' +
        '<label class="target-reference__form-label" for="target-badge-create-color">ベース色</label>' +
        '<input id="target-badge-create-color" type="color" class="target-detail__badge-create-color" />' +
        '</div>' +
        '<div class="target-detail__badge-field target-detail__badge-create-field">' +
        '<label class="target-reference__form-label" for="target-badge-create-highlight">グラデーション</label>' +
        '<input id="target-badge-create-highlight" type="color" class="target-detail__badge-create-color" />' +
        '</div>' +
        '<div class="target-detail__badge-field target-detail__badge-create-field">' +
        '<label class="target-reference__form-label" for="target-badge-create-gradient">グラデーションパターン</label>' +
        '<select id="target-badge-create-gradient" class="user-management__input target-detail__badge-create-input">' +
        GRADIENT_PATTERNS.map(function (pattern)
        {
          return '<option value="' + pattern.id + '">' + pattern.label + '</option>';
        }).join('') +
        '</select>' +
        '</div>' +
        '<div class="target-detail__badge-field target-detail__badge-create-field">' +
        '<label class="target-reference__form-label" for="target-badge-create-icon-pattern">アイコン背景</label>' +
        '<select id="target-badge-create-icon-pattern" class="user-management__input target-detail__badge-create-input">' +
        ICON_PATTERNS.map(function (pattern)
        {
          return '<option value="' + pattern.id + '">' + pattern.label + '</option>';
        }).join('') +
        '</select>' +
        '</div>' +
        '<div class="target-detail__badge-field target-detail__badge-create-field">' +
        '<label class="target-reference__form-label" for="target-badge-create-effect">バッジ全体のエフェクト</label>' +
        '<select id="target-badge-create-effect" class="user-management__input target-detail__badge-create-input">' +
        BADGE_EFFECTS.map(function (effect)
        {
          return '<option value="' + effect.id + '">' + effect.label + '</option>';
        }).join('') +
        '</select>' +
        '<p class="target-detail__badge-create-note">p5.js 風の質感を選択できます。</p>' +
        '</div>' +
        '</div>' +
        '<div class="target-detail__badge-create-actions">' +
        '<button type="button" class="target-detail__badge-random-button" data-target-badge-random>色とパターンをシャッフル</button>' +
        '<select id="target-badge-create-preset" class="user-management__input target-detail__badge-create-input">' +
        '<option value="">プリセットを選択（任意）</option>' +
        BADGE_COLOR_PRESETS.map(function (preset)
        {
          return '<option value="' + preset.label + '">' + preset.label + '</option>';
        }).join('') +
        '</select>' +
        '</div>' +
        '</div>' +
        '<div class="target-detail__badge-create-column target-detail__badge-create-column--preview">' +
        '<div class="target-detail__badge-preview target-detail__badge-preview-pane">' +
        '<div class="target-detail__badge-preview-card" data-gradient="soft-diagonal" data-icon-pattern="orbit" data-effect="glow">' +
        '<div class="target-detail__badge-preview-icon target-detail__badge-icon">' +
        '<span class="target-detail__badge-icon-text" data-target-badge-create-preview-icon>★</span>' +
        '<span class="target-detail__badge-pattern"></span>' +
        '</div>' +
        '<div class="target-detail__badge-preview-content">' +
        '<p class="target-detail__badge-preview-title" data-target-badge-create-preview-title>新規バッジ</p>' +
        '<p class="target-detail__badge-preview-meta">カラーとエフェクトの組み合わせを確認できます</p>' +
        '<p class="target-detail__badge-preview-description" data-target-badge-create-preview-description>プレビューがここに表示されます。</p>' +
        '</div>' +
        '</div>' +
        '<p class="target-detail__badge-pattern-preview-note">ベース色とグラデーション色、アイコン背景を組み合わせて質感を決められます。</p>' +
        '</div>' +
        '<div class="target-detail__badge-palette-actions">' +
        '<input id="target-badge-palette-name" type="text" class="user-management__input target-detail__badge-create-input" maxlength="64" placeholder="お気に入り名" />' +
        '<button type="button" class="btn btn--ghost" data-target-badge-palette-save>お気に入りに保存</button>' +
        '</div>' +
        '<div class="target-detail__badge-palette-list" data-target-badge-palette-list></div>' +
        '</div>' +
        '</div>' +
        '<p class="user-management__feedback target-detail__badge-form-feedback" aria-live="polite" hidden></p>' +
        '<div class="target-detail__badge-actions">' +
        '<button type="submit" class="btn btn--primary">保存して追加</button>' +
        '<button type="button" class="btn btn--ghost" data-modal-cancel>キャンセル</button>' +
        '</div>' +
        '</form>' +
        '</section>';

      document.body.appendChild(modalRoot);

      var form = modalRoot.querySelector('form');
      var overlay = modalRoot.querySelector('.screen-modal__overlay');
      var closeButton = modalRoot.querySelector('.screen-modal__close');
      var cancelButton = modalRoot.querySelector('[data-modal-cancel]');
      var titleInput = form.querySelector('#target-badge-create-title');
      var descriptionInput = form.querySelector('#target-badge-create-description');
      var iconInput = form.querySelector('#target-badge-create-icon');
      var faIconSelect = form.querySelector('#target-badge-create-fa');
      var colorInput = form.querySelector('#target-badge-create-color');
      var highlightInput = form.querySelector('#target-badge-create-highlight');
      var presetSelect = form.querySelector('#target-badge-create-preset');
      var gradientSelect = form.querySelector('#target-badge-create-gradient');
      var iconPatternSelect = form.querySelector('#target-badge-create-icon-pattern');
      var effectSelect = form.querySelector('#target-badge-create-effect');
      var randomButton = form.querySelector('[data-target-badge-random]');
      var paletteNameInput = form.querySelector('#target-badge-palette-name');
      var paletteSaveButton = form.querySelector('[data-target-badge-palette-save]');
      var paletteList = form.querySelector('[data-target-badge-palette-list]');
      var previewCard = form.querySelector('.target-detail__badge-preview-card');
      var previewIcon = form.querySelector('[data-target-badge-create-preview-icon]');
      var previewTitle = form.querySelector('[data-target-badge-create-preview-title]');
      var previewDescription = form.querySelector('[data-target-badge-create-preview-description]');
      var feedback = form.querySelector('.target-detail__badge-form-feedback');
      var submitButton = form.querySelector('button[type="submit"]');

      var modal = {
        root: modalRoot,
        form: form,
        overlay: overlay,
        closeButton: closeButton,
        cancelButton: cancelButton,
        titleInput: titleInput,
        descriptionInput: descriptionInput,
        iconInput: iconInput,
        faIconSelect: faIconSelect,
        colorInput: colorInput,
        highlightInput: highlightInput,
        presetSelect: presetSelect,
        gradientSelect: gradientSelect,
        iconPatternSelect: iconPatternSelect,
        effectSelect: effectSelect,
        paletteNameInput: paletteNameInput,
        paletteSaveButton: paletteSaveButton,
        paletteList: paletteList,
        randomButton: randomButton,
        feedback: feedback,
        submitButton: submitButton,
        preview: {
          card: previewCard,
          icon: previewIcon,
          title: previewTitle,
          description: previewDescription,
          meta: form.querySelector('.target-detail__badge-preview-meta') || document.createElement('p')
        },
        isSubmitting: false,
        restoreTarget: null,
        iconType: 'text'
      };

      overlay.addEventListener('click', () => this.closeCreateModal());
      closeButton.addEventListener('click', () => this.closeCreateModal());
      cancelButton.addEventListener('click', () => this.closeCreateModal());
      form.addEventListener('submit', (event) =>
      {
        event.preventDefault();
        this.submitCreateForm(modal);
      });
      [titleInput, descriptionInput, iconInput, colorInput, highlightInput, gradientSelect, iconPatternSelect, effectSelect].forEach((input) =>
      {
        if (!input)
        {
          return;
        }
        input.addEventListener('input', () =>
        {
          if (input === iconInput)
          {
            modal.iconType = 'text';
            if (faIconSelect)
            {
              faIconSelect.value = '';
            }
          }
          this.updateCreatePreview(modal);
        });
      });
      if (faIconSelect)
      {
        faIconSelect.addEventListener('change', () =>
        {
          if (faIconSelect.value)
          {
            modal.iconType = 'fa';
          }
          this.updateCreatePreview(modal);
        });
      }
      if (randomButton)
      {
        randomButton.addEventListener('click', () => this.shuffleBadgeSurface(modal));
      }
      if (paletteSaveButton)
      {
        paletteSaveButton.addEventListener('click', () => this.savePalette(modal));
      }
      if (paletteList)
      {
        paletteList.addEventListener('click', (event) =>
        {
          var target = event.target;
          var action = target.dataset ? target.dataset.action : '';
          var id = target.dataset ? target.dataset.paletteId : '';
          if (action === 'apply')
          {
            this.applySavedPalette(modal, id);
          }
          if (action === 'delete')
          {
            this.deleteSavedPalette(modal, id);
          }
        });
      }
      presetSelect.addEventListener('change', () =>
      {
        this.handlePresetSelection(modal);
      });

      return modal;
    }

  }

  var NS = window.TargetDetail || (window.TargetDetail = {});
  NS.JobBadge = NS.JobBadge || TargetDetailBadge;
})(window, document);
