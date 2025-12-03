(function (window, document)
{
  'use strict';

  var CATEGORY_LABELS = {
    video: '動画',
    youtube: 'YouTube埋め込み',
    image: '画像',
    audio: '音声',
    document: 'ファイル',
    other: 'ファイル',
    content: 'コンテンツ管理'
  };

  var CATEGORY_ORDER = ['all', 'video', 'image', 'audio', 'document', 'youtube', 'content'];

  var EXTENSION_CATEGORY_MAP = {
    video: ['mp4', 'm4v', 'mov', 'wmv', 'avi', 'mkv', 'webm', 'flv'],
    image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'heic', 'heif', 'avif', 'jfif', 'tif', 'tiff'],
    audio: ['mp3', 'aac', 'm4a', 'wav', 'flac', 'ogg', 'oga', 'opus', 'weba', 'aif', 'aiff', 'wma'],
    document: [
      'pdf',
      'doc',
      'docx',
      'ppt',
      'pptx',
      'xls',
      'xlsx',
      'txt',
      'csv',
      'rtf',
      'odt',
      'odp',
      'ods',
      'key',
      'pages',
      'numbers'
    ]
  };

  var ICON_INFO = {
    video: {
      type: 'video',
      label: CATEGORY_LABELS.video,
      icon:
        '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">' +
        '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.5A1.75 1.75 0 0 1 5.5 4.75h8.5A1.75 1.75 0 0 1 15.75 6.5v11a1.75 1.75 0 0 1-1.75 1.75H5.5A1.75 1.75 0 0 1 3.75 17.5z"></path>' +
        '<path fill="currentColor" d="M17.25 9.2 20.5 7v10l-3.25-2.2z"></path>' +
        '<path fill="currentColor" d="m10 9.75 4.25 2.5L10 14.75z"></path>' +
        '</svg>'
    },
    audio: {
      type: 'audio',
      label: CATEGORY_LABELS.audio,
      icon:
        '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">' +
        '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M13 4v10.1a3.4 3.4 0 1 1-1.5-2.86V4z"></path>' +
        '<rect x="13" y="4" width="6" height="4.2" rx="0.9" fill="currentColor"></rect>' +
        '</svg>'
    },
    image: {
      type: 'image',
      label: CATEGORY_LABELS.image,
      icon:
        '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">' +
        '<rect x="3.75" y="4.75" width="16.5" height="14.5" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="1.5"></rect>' +
        '<circle cx="9" cy="10" r="1.8" fill="currentColor"></circle>' +
        '<path fill="currentColor" d="M6.5 17.25 10.75 13l3.2 3 2.55-2.15 3 3.4z"></path>' +
        '</svg>'
    },
    document: {
      type: 'file',
      label: CATEGORY_LABELS.document,
      icon:
        '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">' +
        '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M7 3.5h7.5l4.5 4.5V20a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5z"></path>' +
        '<path fill="currentColor" d="M14.5 3.5V8h4.5z"></path>' +
        '</svg>'
    },
    youtube: null,
    other: null,
    content: null
  };

  ICON_INFO.youtube = ICON_INFO.video;
  ICON_INFO.other = ICON_INFO.document;
  ICON_INFO.content = ICON_INFO.document;

  function deriveYouTubeId(url)
  {
    if (!url)
    {
      return '';
    }
    var normalized = String(url).trim();
    var match = normalized.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
    if (match && match[1])
    {
      return match[1];
    }
    var short = normalized.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
    return short && short[1] ? short[1] : '';
  }

  function buildYouTubeThumbnailUrl(videoId)
  {
    if (!videoId)
    {
      return '';
    }
    return 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg';
  }

  function buildInitial(text)
  {
    var source = text == null ? '' : String(text).trim();
    if (!source)
    {
      return '—';
    }
    return source.charAt(0);
  }

  var DOWNLOAD_ICON_HTML =
    '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">' +
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M6 17.25h12m-6-10.5v9m0 0 3.25-3.25M12 15.75 8.75 12.5"></path>' +
    '</svg>';

  function normalizeCategoryValue(value)
  {
    if (value == null)
    {
      return '';
    }
    var normalized = String(value).trim().toLowerCase();
    if (!normalized)
    {
      return '';
    }
    if (normalized === 'doc' || normalized === 'docs' || normalized === 'file' || normalized === 'files')
    {
      return 'document';
    }
    if (normalized === 'others')
    {
      return 'other';
    }
    if (normalized === 'contents')
    {
      return 'content';
    }
    return normalized;
  }

  function deriveCategoryFromMime(mime)
  {
    if (!mime)
    {
      return '';
    }
    var normalized = String(mime).toLowerCase();
    if (!normalized)
    {
      return '';
    }
    if (normalized === 'video' || normalized.indexOf('video/') === 0)
    {
      return 'video';
    }
    if (normalized === 'audio' || normalized.indexOf('audio/') === 0)
    {
      return 'audio';
    }
    if (
      normalized === 'image' ||
      normalized.indexOf('image/') === 0 ||
      normalized.indexOf('jpeg') !== -1 ||
      normalized.indexOf('jpg') !== -1 ||
      normalized.indexOf('png') !== -1 ||
      normalized.indexOf('gif') !== -1 ||
      normalized.indexOf('webp') !== -1 ||
      normalized.indexOf('svg') !== -1 ||
      normalized.indexOf('tif') !== -1 ||
      normalized.indexOf('heic') !== -1 ||
      normalized.indexOf('heif') !== -1 ||
      normalized.indexOf('avif') !== -1
    )
    {
      return 'image';
    }
    if (
      normalized.indexOf('text/') === 0 ||
      normalized.indexOf('application/pdf') === 0 ||
      normalized.indexOf('application/vnd') === 0
    )
    {
      return 'document';
    }
    return '';
  }

  function deriveCategoryFromFileName(name)
  {
    if (!name)
    {
      return '';
    }
    var lower = String(name).toLowerCase();
    var match = lower.match(/\.([a-z0-9]+)$/);
    if (!match)
    {
      return '';
    }
    var ext = match[1];
    var categories = Object.keys(EXTENSION_CATEGORY_MAP);
    for (var i = 0; i < categories.length; i += 1)
    {
      var key = categories[i];
      if (EXTENSION_CATEGORY_MAP[key].indexOf(ext) !== -1)
      {
        return key;
      }
    }
    return '';
  }

  function getCategoryLabel(category)
  {
    return CATEGORY_LABELS[category] || CATEGORY_LABELS.document;
  }

  function formatOwnerSummary(item)
  {
    if (!item)
    {
      return '登録者';
    }
    var parts = [];
    if (item.ownerDisplayName)
    {
      parts.push(item.ownerDisplayName);
    }
    if (item.ownerUserCode && parts.indexOf(item.ownerUserCode) === -1)
    {
      parts.push(item.ownerUserCode);
    }
    return parts.length ? parts.join(' / ') : '登録者';
  }

  function parseTimestamp(value)
  {
    if (!value)
    {
      return 0;
    }
    if (value instanceof Date)
    {
      return value.getTime();
    }
    var normalized = String(value).replace(/-/g, '/');
    var date = new Date(normalized);
    return date.getTime() || 0;
  }

  function buildPreviewTarget(item)
  {
    if (!item)
    {
      return '';
    }
    return (
      item.youtubeUrl ||
      item.linkUrl ||
      item.embedUrl ||
      item.downloadUrl ||
      item.objectUrl ||
      ''
    );
  }

  function resolveContentCode(item)
  {
    if (!item)
    {
      return '';
    }
    if (item.contentCode)
    {
      return item.contentCode;
    }
    if (item.content)
    {
      return item.content.contentCode || item.content.code || '';
    }
    return '';
  }

  class TargetDetailReference
  {
    constructor(pageInstance)
    {
      this.page = pageInstance;
      this.helpers = pageInstance.helpers || {};
      this.canManage = false;
      this.state = { items: [], query: '', category: 'all' };
      this.refs = { container: null, list: null, empty: null, search: null, filter: null, feedback: null, refreshButton: null, openButton: null };
      this.modals = { add: null };
      this.buttonService = null;
      this.avatarService = null;
      this.contentUploaderService = null;
      this.pendingUploadResults = [];
      this.uploadOwnerUserCode = '';
      this.contentLibrary = [];
      this.contentLibraryCache = Object.create(null);
      this.contentLibraryOwner = '';
      this.isLoadingContentLibrary = false;
      this.loadingContentOwner = '';
    }

    async render()
    {
      this.canManage = this.page && typeof this.page.canManageTargetContent === 'function'
        && this.page.canManageTargetContent();
      this.refs.container = this.page.refs.tabPanels && this.page.refs.tabPanels.references;
      if (!this.refs.container)
      {
        return;
      }
      this.refs.container.innerHTML = '';
      this.refs.container.classList.add('target-detail__panel');

      var section = document.createElement('section');
      section.className = 'target-reference';
      section.appendChild(this.renderHeader());
      section.appendChild(this.renderFeedbackRegion());
      section.appendChild(this.renderFilters());

      var list = document.createElement('div');
      list.className = 'target-reference__list';
      this.refs.list = list;
      section.appendChild(list);

      var empty = document.createElement('div');
      empty.className = 'target-reference__empty';
      empty.textContent = '共有された資料はまだありません。';
      this.refs.empty = empty;
      section.appendChild(empty);

      this.refs.container.appendChild(section);

      var data = await this.page.loadReferences();
      this.disposeObjectUrls(this.state.items);
      this.state.items = this.normalizeMaterials(Array.isArray(data) ? data : []);
      this.updateFilterOptions();
      this.renderList();
      this.bindEvents();
    }

    renderHeader()
    {
      var header = document.createElement('div');
      header.className = 'target-detail__section-header';

      var title = document.createElement('h2');
      title.textContent = '資料';
      header.appendChild(title);

      var actions = document.createElement('div');
      actions.className = 'target-detail__section-actions target-reference__actions target-reference__header-actions';

      if (this.canManage)
      {
        var openButton = this.createBannerButton('資料を追加', 'target-reference__open', {
          baseClass: 'target-management__icon-button target-management__icon-button--primary target-reference__open',
          buttonType: 'expandable-icon-button/add'
        });
        actions.appendChild(openButton);
        this.refs.openButton = openButton;
      }

      var refreshButton = this.createBannerButton('再読み込み', 'target-reference__refresh', {
        baseClass: 'target-management__icon-button target-management__icon-button--ghost target-reference__refresh',
        buttonType: 'expandable-icon-button/reload',
        fallbackClass: 'btn btn--ghost',
        title: '資料を再読み込み',
        hoverLabel: '資料を再読み込み',
        ariaLabel: '資料を再読み込み'
      });
      actions.appendChild(refreshButton);
      this.refs.refreshButton = refreshButton;

      header.appendChild(actions);
      return header;
    }

    renderFilters()
    {
      var filters = document.createElement('div');
      filters.className = 'target-reference__controls target-reference__filters';

      var search = document.createElement('input');
      search.type = 'search';
      search.placeholder = 'タイトルで絞り込み';
      search.className = 'target-reference__search';
      search.setAttribute('aria-label', '資料を検索');
      filters.appendChild(search);
      this.refs.search = search;

      var filter = document.createElement('select');
      filter.className = 'target-reference__filter';
      filter.setAttribute('aria-label', '資料カテゴリを絞り込み');
      filter.innerHTML = (
        '<option value="all">すべて</option>' +
        '<option value="link">リンク</option>' +
        '<option value="file">ファイル</option>' +
        '<option value="note">メモ</option>' +
        '<option value="user">共有者</option>'
      );
      filter.value = this.state.category;
      filters.appendChild(filter);
      this.refs.filter = filter;

      return filters;
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
        return this.buttonService;
      }
      return null;
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
      if (typeof fallbackClass === 'string' && fallbackClass)
      {
        element.className = fallbackClass;
      }
      var textLabel = opts.label || opts.hoverLabel || opts.title || '';
      var ariaLabel = opts.ariaLabel || textLabel;
      var titleLabel = opts.title || textLabel;
      var hoverLabel = opts.hoverLabel || textLabel;
      if (ariaLabel)
      {
        element.setAttribute('aria-label', ariaLabel);
      }
      if (titleLabel)
      {
        element.setAttribute('title', titleLabel);
      }
      if (hoverLabel)
      {
        element.setAttribute('data-hover-label', hoverLabel);
      }
      if (opts.attributes)
      {
        Object.keys(opts.attributes).forEach(function (key)
        {
          if (opts.attributes[key] !== undefined && opts.attributes[key] !== null)
          {
            element.setAttribute(key, opts.attributes[key]);
          }
        });
      }
      if (opts.dataset)
      {
        Object.keys(opts.dataset).forEach(function (key)
        {
          var value = opts.dataset[key];
          if (value === undefined || value === null)
          {
            return;
          }
          element.setAttribute('data-' + key.replace(/([A-Z])/g, function (match)
          {
            return '-' + match.toLowerCase();
          }), value);
        });
      }
      if (opts.disabled)
      {
        element.disabled = true;
        element.setAttribute('aria-disabled', 'true');
      }
      var iconHtml = opts.iconHtml || '';
      var iconChar = opts.iconChar || '';
      var iconClass = opts.iconClass || '';
      var iconAriaHidden = opts.iconAriaHidden;
      if (iconAriaHidden === undefined || iconAriaHidden === null)
      {
        iconAriaHidden = true;
      }
      var srLabel = opts.srLabel || textLabel;
      var srLabelClass = opts.srLabelClass || '';
      if (!srLabelClass && (iconHtml || iconChar))
      {
        srLabelClass = 'visually-hidden';
      }
      element.textContent = '';
      if (iconHtml)
      {
        element.insertAdjacentHTML('beforeend', iconHtml);
      }
      else if (iconChar)
      {
        var iconSpan = document.createElement('span');
        if (iconClass)
        {
          iconSpan.className = iconClass;
        }
        if (iconAriaHidden !== false)
        {
          iconSpan.setAttribute('aria-hidden', 'true');
        }
        iconSpan.textContent = iconChar;
        element.appendChild(iconSpan);
      }
      if (srLabel)
      {
        if (srLabelClass)
        {
          var srSpan = document.createElement('span');
          srSpan.className = srLabelClass;
          srSpan.textContent = srLabel;
          element.appendChild(srSpan);
        }
        else
        {
          element.appendChild(document.createTextNode(srLabel));
        }
      }
      else if (!iconHtml && !iconChar && textLabel)
      {
        element.textContent = textLabel;
      }
      return element;
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

    getAuthorCandidates()
    {
      var target = this.page && this.page.state ? this.page.state.target : null;
      var participants = target && Array.isArray(target.participants) ? target.participants.slice() : [];
      var assignedUsers = target && Array.isArray(target.assignedUsers) ? target.assignedUsers.slice() : [];
      var candidates = participants.concat(assignedUsers);
      var creatorCount = 0;

      var appendCreatorCandidate = function (label, displayName, userCode)
      {
        var name = displayName == null ? '' : String(displayName).trim();
        var code = userCode == null ? '' : String(userCode).trim();
        if (!name && !code)
        {
          return;
        }
        var identity = name || code;
        candidates.push({
          displayName: identity,
          userCode: code || identity,
          isOperator: true,
          isActive: true,
          role: { key: 'operator', name: label || 'operator' },
          source: label || 'operator'
        });
        creatorCount += 1;
      };

      appendCreatorCandidate('creator', target && target.createdByDisplayName, target && target.createdByUserCode);
      appendCreatorCandidate('owner', target && target.ownerDisplayName, target && target.ownerUserCode);

      var stats = {
        raw: candidates.length,
        skipped: { noIdentity: 0, inactive: 0, nonOperator: 0, duplicate: 0 }
      };

      var seen = Object.create(null);
      var normalizeFlag = function (value)
      {
        if (typeof value === 'string')
        {
          var normalized = value.trim().toLowerCase();
          return normalized === '1' || normalized === 'true';
        }
        return value === true || value === 1;
      };
      var resolveRole = function (entry, user)
      {
        var sources = [];
        if (entry && typeof entry === 'object')
        {
          sources.push(entry);
        }
        if (user && typeof user === 'object')
        {
          sources.push(user);
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
      var resolveRoleFlags = function (entry, user)
      {
        var flags = { isOperator: false, isSupervisor: false };
        var sources = [];
        if (entry && entry.roleFlags && typeof entry.roleFlags === 'object')
        {
          sources.push(entry.roleFlags);
        }
        if (user && user.roleFlags && typeof user.roleFlags === 'object')
        {
          sources.push(user.roleFlags);
        }
        for (var i = 0; i < sources.length; i += 1)
        {
          var source = sources[i];
          if (!source)
          {
            continue;
          }
          if (!flags.isOperator && normalizeFlag(source.isOperator))
          {
            flags.isOperator = true;
          }
          if (!flags.isSupervisor && normalizeFlag(source.isSupervisor))
          {
            flags.isSupervisor = true;
          }
        }
        return flags;
      };
      var normalize = function (entry)
      {
        if (!entry)
        {
          return null;
        }
        var user = entry.user && typeof entry.user === 'object' ? entry.user : null;
        var userCode =
          (entry.userCode || entry.code || entry.loginId || (user && (user.userCode || user.code || user.loginId)) || '').trim();
        var displayName =
          (
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
          stats.skipped.noIdentity += 1;
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
          stats.skipped.inactive += 1;
          return null;
        }

        var role = resolveRole(entry, user);
        var roleFlags = resolveRoleFlags(entry, user);
        var isOperator = normalizeFlag(entry.isOperator)
          || normalizeFlag(user && user.isOperator)
          || normalizeFlag(roleFlags.isOperator)
          || role === 'operator';
        if (!isOperator)
        {
          stats.skipped.nonOperator += 1;
          return null;
        }

        return {
          displayName: displayName,
          userCode: userCode,
          mail: entry.mail || entry.mailAddress || entry.email || (user && (user.mail || user.mailAddress || user.email)) || '',
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
          stats.skipped.duplicate += 1;
          return;
        }
        if (key)
        {
          seen[key] = true;
        }
        normalizedList.push(normalized);
      });

      window.console.log('[target-reference] normalized author candidates', {
        participants: participants.length,
        assignedUsers: assignedUsers.length,
        creators: creatorCount,
        normalized: normalizedList.length,
        details: stats
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
      var displayName = selection.displayName || selection.userDisplayName || selection.name || selection.userName || selection.fullName || '';
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
      var previous = modal.selectedUser ? modal.selectedUser.userCode : '';
      var normalized = this.normalizeAuthor(selection);
      modal.selectedUser = normalized;
      var hasSelection = !!normalized;
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
      var current = normalized ? normalized.userCode : '';
      if (this.shouldShowAuthorField() && previous !== current)
      {
        this.resetContentLibraryForSelection(modal);
      }
      this.setFieldErrorState(modal.authorField, false);
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

    applyAuthorSelectionPolicy(modal)
    {
      if (!modal)
      {
        return;
      }
      var isSupervisor = this.shouldShowAuthorField();
      var selection = modal.selectedUser || null;
      if (!isSupervisor)
      {
        selection = this.getSessionUserSelection() || selection;
      }
      this.setAuthorSelection(modal, selection);
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
      if (this.shouldShowAuthorField() && !modal.selectedUser)
      {
        this.notifyAuthorSelectionRequired(modal);
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

    openAuthorSelectModal(modal)
    {
      if (!this.shouldShowAuthorField())
      {
        return;
      }
      var service = this.getUserSelectModalService();
      if (!service || typeof service.open !== 'function')
      {
        this.setModalFeedback('作成者選択モーダルを利用できません。', 'error');
        return;
      }
      var selected = modal && modal.selectedUser ? modal.selectedUser : null;
      var selectedCodes = selected && selected.userCode ? [selected.userCode] : [];
      var initialKeyword = selected && (selected.userCode || selected.displayName) ? (selected.userCode || selected.displayName) : '';
      var modalOptions = {
        multiple: false,
        selectedCodes: selectedCodes,
        initialKeyword: initialKeyword,
        availableUsers: this.getAuthorCandidates(),
        onSelect: (user) =>
        {
          window.console.log('[target-reference] author selected from user-select-modal', user);
          this.setAuthorSelection(modal, user);
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
        modalOptions.zIndex = zIndex;
      }
      window.console.log('[target-reference] opening user-select-modal', {
        selectedCodes: selectedCodes,
        initialKeyword: initialKeyword,
        availableUsersCount: modalOptions.availableUsers ? modalOptions.availableUsers.length : 0,
        zIndex: modalOptions.zIndex
      });
      try
      {
        service.open(modalOptions);
      }
      catch (error)
      {
        window.console.error('[target-detail] failed to open user select modal', error);
        this.setModalFeedback('作成者選択モーダルを開けませんでした。', 'error');
      }
    }

    createBannerButton(label, extraClass, config)
    {
      var extraOptions = Object.assign({}, config);
      var buttonType = extraOptions && extraOptions.buttonType ? extraOptions.buttonType : 'content-uploader-primary';
      var fallbackClass = extraOptions && extraOptions.fallbackClass ? extraOptions.fallbackClass : 'btn btn--primary';
      if (extraOptions)
      {
        delete extraOptions.buttonType;
        delete extraOptions.fallbackClass;
      }
      var button = this.createServiceActionButton(buttonType, Object.assign({
        label: label,
        ariaLabel: label,
        hoverLabel: label,
        title: label
      }, extraOptions || {}), fallbackClass);
      this.appendExtraClasses(button, extraClass);
      return button;
    }

    createRoundButton(buttonType, label, extraClass, config)
    {
      var options = Object.assign({
        label: label,
        ariaLabel: label,
        hoverLabel: label,
        title: label,
        srLabel: label
      }, config || {});
      var button = this.createServiceActionButton(buttonType, options, 'table-action-button');
      if (button && button.classList)
      {
        button.classList.add('table-action-button');
        if (buttonType)
        {
          button.classList.add('table-action-button--' + buttonType);
        }
      }
      this.appendExtraClasses(button, extraClass);
      return button;
    }

    renderFeedbackRegion()
    {
      var region = document.createElement('div');
      region.className = 'c-feedback-region target-reference__feedback';
      region.setAttribute('aria-live', 'polite');
      region.hidden = true;
      this.refs.feedback = region;
      return region;
    }

    bindEvents()
    {
      var self = this;
      if (this.refs.search)
      {
        this.refs.search.addEventListener('input', function ()
        {
          self.state.query = this.value || '';
          self.renderList();
        });
      }
      if (this.refs.filter)
      {
        this.refs.filter.addEventListener('change', function ()
        {
          self.state.category = this.value || 'all';
          self.renderList();
        });
      }
      if (this.refs.refreshButton)
      {
        this.refs.refreshButton.addEventListener('click', function ()
        {
          self.handleRefresh();
        });
      }
      if (this.refs.openButton)
      {
        this.refs.openButton.addEventListener('click', function ()
        {
          self.openAddModal();
        });
      }
    }

    async reloadReferencesFromServer()
    {
      var data = await this.page.loadReferences({ force: true });
      this.disposeObjectUrls(this.state.items);
      this.state.items = this.normalizeMaterials(Array.isArray(data) ? data : []);
      this.updateFilterOptions();
      this.renderList();
    }

    async handleRefresh()
    {
      if (this.refs.refreshButton)
      {
        this.refs.refreshButton.disabled = true;
      }
      this.setFeedback('資料を再読み込みしています…', 'info');
      try
      {
        await this.reloadReferencesFromServer();
        this.setFeedback('最新の資料を読み込みました。', 'success');
      }
      catch (error)
      {
        console.error('[target-detail] reference refresh failed', error);
        this.setFeedback('資料の再読み込みに失敗しました。', 'error');
      }
      finally
      {
        if (this.refs.refreshButton)
        {
          this.refs.refreshButton.disabled = false;
        }
      }
    }

    updateFilterOptions()
    {
      if (!this.refs.filter)
      {
        return;
      }
      var categories = ['all'];
      this.state.items.forEach(function (item)
      {
        if (!item || !item.category)
        {
          return;
        }
        if (categories.indexOf(item.category) === -1)
        {
          categories.push(item.category);
        }
      });

      var current = this.state.category;
      if (categories.indexOf(current) === -1)
      {
        current = 'all';
        this.state.category = 'all';
      }

      this.refs.filter.innerHTML = '';
      categories.forEach((value) =>
      {
        var option = document.createElement('option');
        option.value = value;
        option.textContent = value === 'all' ? 'すべて' : getCategoryLabel(value);
        if (value === current)
        {
          option.selected = true;
        }
        this.refs.filter.appendChild(option);
      });
    }

    normalizeMaterials(list)
    {
      var map = Object.create(null);
      for (var i = 0; i < list.length; i += 1)
      {
        var normalized = this.normalizeMaterial(list[i]);
        if (!normalized)
        {
          continue;
        }
        map[normalized.materialCode] = normalized;
      }
      var items = Object.keys(map).map(function (key)
      {
        return map[key];
      });
      items.sort(function (a, b)
      {
        return (b.updatedAtValue || 0) - (a.updatedAtValue || 0);
      });
      return items;
    }

    normalizeMaterial(raw)
    {
      if (!raw)
      {
        return null;
      }
      var code = raw.materialCode || raw.contentCode || raw.referenceCode || raw.id;
      if (!code)
      {
        code = 'material-' + Date.now().toString(16) + '-' + Math.random().toString(16).slice(2, 8);
      }
      var title = raw.title || raw.fileName || raw.name || raw.displayName || code;
      var fileName = raw.fileName || raw.name || '';
      var category = normalizeCategoryValue(raw.category || raw.categoryKey || raw.type);
      var previewSourceUrl =
        raw.previewUrl ||
        raw.viewUrl ||
        raw.linkUrl ||
        raw.downloadUrl ||
        (raw.content &&
          (raw.content.previewUrl || raw.content.viewUrl || raw.content.linkUrl || raw.content.downloadUrl)) ||
        raw.objectUrl ||
        '';
      var contentTypeSource =
        raw.contentType ||
        raw.mimeType ||
        (raw.content && (raw.content.contentType || raw.content.mimeType)) ||
        '';
      var derivedCategoryFromMime = deriveCategoryFromMime(contentTypeSource);
      var derivedCategoryFromFile = deriveCategoryFromFileName(fileName || title);
      var derivedCategoryFromPreview = deriveCategoryFromFileName(previewSourceUrl);
      var preferredCategory = derivedCategoryFromMime || derivedCategoryFromFile || derivedCategoryFromPreview;
      if (!category)
      {
        category = preferredCategory;
      }
      else if (
        category === 'document' ||
        category === 'other' ||
        category === 'file' ||
        category === 'link'
      )
      {
        if (preferredCategory)
        {
          category = preferredCategory;
        }
      }
      if (raw.youtubeUrl)
      {
        category = 'youtube';
      }
      if (!category)
      {
        category = 'document';
      }
      var updatedSource =
        raw.updatedAtDisplay ||
        raw.updatedAt ||
        raw.uploadedAtDisplay ||
        raw.uploadedAt ||
        raw.createdAt ||
        '';
      var updatedDisplay = raw.updatedAtDisplay || raw.uploadedAtDisplay || '';
      if (!updatedDisplay && updatedSource && this.helpers && typeof this.helpers.formatDateTime === 'function')
      {
        updatedDisplay = this.helpers.formatDateTime(updatedSource);
      }
      var sizeValue = Number(raw.size || raw.fileSize || 0);
      var sizeDisplay = raw.sizeDisplay || '';
      if (!sizeDisplay && Number.isFinite(sizeValue) && sizeValue > 0)
      {
        sizeDisplay = typeof this.helpers.formatFileSize === 'function'
          ? this.helpers.formatFileSize(sizeValue)
          : sizeValue + ' B';
      }
      var previewImage =
        raw.previewImage ||
        raw.previewImageUrl ||
        (raw.content && (raw.content.previewImage || raw.content.previewImageUrl)) ||
        '';
      if (!previewImage && raw.youtubeUrl)
      {
        previewImage = buildYouTubeThumbnailUrl(deriveYouTubeId(raw.youtubeUrl));
      }
      if (!previewImage && category === 'image')
      {
        previewImage = previewSourceUrl;
      }
      if (!previewImage && previewSourceUrl)
      {
        previewImage = previewSourceUrl;
      }

      var bitrateValue = Number(raw.bitrate);
      if (!Number.isFinite(bitrateValue))
      {
        bitrateValue = Number(raw.content && raw.content.bitrate);
      }
      if (!Number.isFinite(bitrateValue))
      {
        bitrateValue = null;
      }

      return {
        materialCode: code,
        title: title,
        description: raw.description || raw.summary || '',
        category: category,
        categoryLabel: getCategoryLabel(category),
        previewImage: previewImage,
        previewImageUrl: raw.previewImageUrl || (raw.content && raw.content.previewImageUrl) || '',
        previewSourceUrl: previewSourceUrl,
        contentType: contentTypeSource,
        mimeType: contentTypeSource,
        ownerDisplayName: raw.ownerDisplayName || raw.ownerName || raw.uploadedByName || raw.registeredBy || raw.ownerUserCode || '',
        ownerUserCode:
          raw.ownerUserCode || raw.ownerCode || raw.owner || raw.ownerId || raw.ownerUserId || raw.uploadedBy || raw.uploadedByCode || '',
        ownerAvatarUrl:
          raw.ownerAvatarUrl ||
          raw.avatarUrl ||
          (raw.owner && (raw.owner.avatarUrl || raw.owner.avatarURL)) ||
          '',
        ownerAvatarTransform: raw.ownerAvatarTransform || '',
        ownerAvatarAlt: raw.ownerAvatarAlt || '',
        sizeDisplay: sizeDisplay,
        updatedAtDisplay: updatedDisplay || updatedSource || '更新日不明',
        updatedAtValue: parseTimestamp(updatedSource),
        downloadUrl: raw.downloadUrl || raw.url || '',
        linkUrl: raw.linkUrl || raw.previewUrl || raw.viewUrl || '',
        embedUrl: raw.embedUrl || '',
        youtubeUrl: raw.youtubeUrl || '',
        fileName: fileName,
        objectUrl: raw.objectUrl || '',
        contentCode: raw.contentCode || (raw.content && (raw.content.contentCode || raw.content.code)) || '',
        content: raw.content || null,
        bitrate: bitrateValue,
        proxyList: raw.proxyList || (raw.content && raw.content.proxyList) || null
      };
    }

    getFilteredItems()
    {
      var query = this.state.query.trim().toLowerCase();
      var category = this.state.category;
      return this.state.items.filter(function (item)
      {
        if (!item)
        {
          return false;
        }
        if (category !== 'all' && item.category !== category)
        {
          return false;
        }
        if (!query)
        {
          return true;
        }
        var haystack = [item.title, item.description, item.ownerDisplayName, item.ownerUserCode, item.categoryLabel]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.indexOf(query) !== -1;
      });
    }

    renderList()
    {
      if (!this.refs.list)
      {
        return;
      }
      var items = this.getFilteredItems();
      this.refs.list.innerHTML = '';
      if (!items.length)
      {
        if (this.refs.empty)
        {
          var message = this.state.items.length
            ? '条件に一致する資料はありません。'
            : '共有された資料はまだありません。';
          this.refs.empty.textContent = message;
          this.refs.empty.hidden = false;
        }
        return;
      }
      if (this.refs.empty)
      {
        this.refs.empty.hidden = true;
      }
      var table = document.createElement('table');
      table.className = 'target-reference__table target-detail__submission-table';

      var thead = document.createElement('thead');
      thead.innerHTML = '' +
        '<tr>' +
        '<th scope="col">サムネイル</th>' +
        '<th scope="col">登録者</th>' +
        '<th scope="col">資料</th>' +
        '<th scope="col">更新日</th>' +
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
      this.bindOwnerPopovers(table);
    }

    createTableRow(item)
    {
      var row = document.createElement('tr');

      row.appendChild(this.createThumbnailCell(item));
      row.appendChild(this.createOwnerCell(item));

      var infoCell = document.createElement('td');
      infoCell.className = 'target-reference__info-cell';
      var titleRow = document.createElement('div');
      titleRow.className = 'target-reference__title-row';

      var titleWrapper = document.createElement('div');
      titleWrapper.className = 'target-reference__title-wrapper';

      var title = document.createElement('p');
      title.className = 'target-reference__item-title';
      title.textContent = item.title;
      titleWrapper.appendChild(title);

      if (item.description)
      {
        var description = document.createElement('p');
        description.className = 'target-reference__description';
        description.textContent = item.description;
        titleWrapper.appendChild(description);
      }

      titleRow.appendChild(titleWrapper);
      infoCell.appendChild(titleRow);
      row.appendChild(infoCell);

      var updatedCell = document.createElement('td');
      updatedCell.className = 'target-reference__update-cell';
      updatedCell.textContent = item.updatedAtDisplay || '—';
      row.appendChild(updatedCell);

      var actions = document.createElement('td');
      actions.className = 'target-reference__actions target-detail__submission-actions-cell';

      var previewTarget = buildPreviewTarget(item);
      var contentCode = resolveContentCode(item);
      var previewSource = item.previewSourceUrl || '';
      var previewContext = { contentCode: contentCode, fallbackUrl: previewTarget, previewSourceUrl: previewSource };
      var previewButton = this.createRoundButton('detail', 'プレビュー', 'target-reference__action target-reference__preview', {
        hoverLabel: 'プレビューを表示',
        title: 'プレビューを表示'
      });
      if (!contentCode && !previewTarget && !previewSource)
      {
        previewButton.disabled = true;
      }
      else
      {
        previewButton.addEventListener('click', (event) =>
        {
          event.preventDefault();
          this.handlePreview(item, previewContext);
        });
      }
      actions.appendChild(previewButton);

      var hasDownloadUrl = Boolean(item.downloadUrl);
      var downloadAttributes = null;
      if (hasDownloadUrl)
      {
        downloadAttributes = { href: item.downloadUrl, target: '_blank', rel: 'noopener' };
        if (item.fileName)
        {
          downloadAttributes.download = item.fileName;
        }
      }
      var downloadButton = this.createRoundButton('download', 'ダウンロード', 'target-reference__action target-reference__download', {
        elementTag: hasDownloadUrl ? 'a' : 'button',
        attributes: downloadAttributes,
        disabled: !hasDownloadUrl,
        iconHtml: DOWNLOAD_ICON_HTML,
        hoverLabel: '資料をダウンロード',
        title: '資料をダウンロード'
      });
      actions.appendChild(downloadButton);

      if (this.canManage)
      {
        var editButton = this.createRoundButton('edit', '編集', 'target-reference__action target-reference__edit', {
          hoverLabel: '資料を編集',
          title: '資料を編集'
        });
        editButton.addEventListener('click', (event) =>
        {
          event.preventDefault();
          this.openEditModal(item);
        });
        actions.appendChild(editButton);

        var deleteButton = this.createRoundButton('delete', '削除', 'target-reference__action target-reference__delete', {
          hoverLabel: '資料を削除',
          title: '資料を削除'
        });
        deleteButton.addEventListener('click', (event) =>
        {
          event.preventDefault();
          this.handleDelete(item, deleteButton);
        });
        actions.appendChild(deleteButton);
      }

      row.appendChild(actions);
      return row;
    }

    createThumbnailCell(item)
    {
      var cell = document.createElement('td');
      cell.className = 'target-reference__thumbnail-cell';

      var wrapper = document.createElement('div');
      wrapper.className = 'target-reference__thumbnail';

      var badge = this.createTypeBadge(item);
      if (badge)
      {
        wrapper.appendChild(badge);
      }

      var isPdfThumbnail = this.isPdfMaterial(item);
      var thumbnailUrl = this.resolveMaterialThumbnail(item);
      if (thumbnailUrl && !isPdfThumbnail)
      {
        var image = document.createElement('img');
        image.className = 'target-reference__thumbnail-image';
        image.src = thumbnailUrl;
        image.loading = 'lazy';
        image.alt = item && item.title ? item.title : '資料のサムネイル';
        wrapper.appendChild(image);
      }
      else if (isPdfThumbnail)
      {
        var pdfPlaceholder = this.createPdfThumbnailPlaceholder(item);
        if (pdfPlaceholder)
        {
          wrapper.appendChild(pdfPlaceholder);
        }
      }
      else
      {
        var placeholder = document.createElement('span');
        placeholder.className = 'target-reference__thumbnail-placeholder';
        placeholder.textContent = item && item.categoryLabel ? item.categoryLabel : '資料';
        wrapper.appendChild(placeholder);
      }

      cell.appendChild(wrapper);
      return cell;
    }

    createPdfThumbnailPlaceholder(item)
    {
      var label = 'ファイル';
      if (item && item.categoryLabel)
      {
        label = item.categoryLabel;
      }
      else if (item && item.category)
      {
        label = item.category;
      }

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

    isPdfMaterial(item)
    {
      if (!item)
      {
        return false;
      }

      var candidates = [item.mimeType, item.contentType, item.fileName, item.previewSourceUrl, item.previewImage];
      for (var i = 0; i < candidates.length; i += 1)
      {
        var value = candidates[i];
        if (!value)
        {
          continue;
        }

        var normalized = String(value).toLowerCase();
        if (normalized.indexOf('application/pdf') !== -1 || normalized.indexOf('.pdf') !== -1)
        {
          return true;
        }
      }

      var source = item.previewSourceUrl || item.fileName || '';
      if (source)
      {
        var lower = String(source).toLowerCase();
        if (lower.indexOf('.pdf') !== -1)
        {
          return true;
        }
      }

      return false;
    }

    resolveMaterialThumbnail(item)
    {
      if (!item)
      {
        return '';
      }

      var contentCode = resolveContentCode(item);
      if (contentCode)
      {
        var contentRecord = Object.assign({}, item.content || {}, { contentCode: contentCode });
        var apiThumbnail = this.buildContentImageUrl(contentRecord, { variant: 'thumbnail' });
        if (apiThumbnail)
        {
          return apiThumbnail;
        }
      }

      var previewCandidates = [];
      if (item.previewImage)
      {
        previewCandidates.push(item.previewImage);
      }
      if (item.previewImageUrl)
      {
        previewCandidates.push(item.previewImageUrl);
      }
      if (item.content)
      {
        previewCandidates.push(item.content.previewImage);
        previewCandidates.push(item.content.previewImageUrl);
        previewCandidates.push(item.content.thumbnail);
        previewCandidates.push(item.content.imageUrl);
      }

      var previewSource = item.previewSourceUrl || buildPreviewTarget(item) || '';
      if (item.category === 'image')
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

    createTypeBadge(item)
    {
      if (!item)
      {
        return null;
      }
      var category = item.category || '';
      var iconInfo = ICON_INFO[category] || ICON_INFO.document;
      var badgeLabel = this.isPdfMaterial(item) ? 'PDF' : item.categoryLabel || (iconInfo && iconInfo.label) || 'ファイル';
      var badgeType = this.isPdfMaterial(item)
        ? 'pdf'
        : iconInfo && iconInfo.type
          ? iconInfo.type
          : 'file';
      var badge = document.createElement('span');
      badge.className = 'target-detail__guidance-type-badge target-detail__guidance-type-badge--' + badgeType;
      badge.textContent = badgeLabel;
      return badge;
    }

    createOwnerCell(item)
    {
      var cell = document.createElement('td');
      cell.className = 'target-reference__owner-cell target-detail__submission-user-cell';
      cell.title = formatOwnerSummary(item);
      cell.appendChild(this.createOwnerDisplay(item));
      return cell;
    }

    createOwnerDisplay(item)
    {
      var anchor = document.createElement('span');
      anchor.className = 'target-detail__submission-user-display';
      anchor.setAttribute('role', 'button');
      anchor.tabIndex = 0;
      anchor.setAttribute('data-reference-avatar-anchor', 'true');

      var displayName = item && item.ownerDisplayName ? String(item.ownerDisplayName).trim() : '';
      var ownerCode = item && item.ownerUserCode ? String(item.ownerUserCode).trim() : '';
      var label = displayName || ownerCode || '登録者';

      anchor.dataset.userDisplay = label;
      anchor.dataset.userName = displayName;
      anchor.dataset.userCode = ownerCode;
      anchor.dataset.userTooltip = formatOwnerSummary(item);
      anchor.dataset.userRole = '登録者';
      anchor.dataset.userActive = item && item.isActive === false ? 'false' : 'true';
      anchor.setAttribute('aria-label', label);

      var avatar = document.createElement('span');
      avatar.className = 'target-detail__submission-user-avatar';
      avatar.setAttribute('data--creator-avatar', 'true');
      avatar.dataset.avatarName = label;
      avatar.dataset.avatarAlt = item && item.ownerAvatarAlt ? item.ownerAvatarAlt : label;
      if (item && item.ownerAvatarUrl)
      {
        avatar.dataset.avatarSrc = item.ownerAvatarUrl;
      }
      if (item && item.ownerAvatarTransform)
      {
        avatar.dataset.avatarTransform = item.ownerAvatarTransform;
      }

      var avatarRendered = false;
      var avatarService = this.getAvatarService();
      if (avatarService && typeof avatarService.render === 'function')
      {
        try
        {
          var data = { name: label, alt: avatar.dataset.avatarAlt, isActive: item && item.isActive !== false };
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
            window.console.warn('[target-detail][reference] failed to render owner avatar', error);
          }
        }
      }
      if (!avatarRendered)
      {
        avatar.textContent = buildInitial(label);
      }
      anchor.appendChild(avatar);
      return anchor;
    }

    bindOwnerPopovers(container)
    {
      var avatarService = this.getAvatarService();
      if (!avatarService || typeof avatarService.eventUpdate !== 'function')
      {
        return;
      }
      var anchors = container.querySelectorAll('[data-reference-avatar-anchor]');
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

    handlePreview(item, previewContext)
    {
      if (!item)
      {
        this.showPreviewError();
        return;
      }
      var fallbackUrl = previewContext && previewContext.fallbackUrl ? previewContext.fallbackUrl : '';
      var category = item.category || '';
      if (category === 'video' || category === 'youtube')
      {
        this.openVideoPreview(item, previewContext);
        return;
      }
      if (category === 'image')
      {
        this.openImagePreview(item, previewContext);
        return;
      }
      if (this.isPdfMaterial(item))
      {
        this.openPdfPreview(item, fallbackUrl);
        return;
      }
      this.showPreviewError();
    }

    isPdfMaterial(item)
    {
      if (!item)
      {
        return false;
      }

      if (item.category === 'pdf')
      {
        return true;
      }

      var candidates = [
        item.contentType,
        item.mimeType,
        item.fileName,
        item.title,
        item.previewSourceUrl,
        item.downloadUrl,
        item.linkUrl,
        item.embedUrl,
        item.objectUrl,
        buildPreviewTarget(item)
      ];

      var content = item.content || {};
      candidates.push(
        content.contentType,
        content.mimeType,
        content.fileName,
        content.name,
        content.downloadUrl,
        content.url
      );

      for (var i = 0; i < candidates.length; i += 1)
      {
        var candidate = candidates[i];
        if (!candidate)
        {
          continue;
        }
        var normalized = String(candidate).trim().toLowerCase();
        if (!normalized)
        {
          continue;
        }
        if (normalized.indexOf('application/pdf') === 0)
        {
          return true;
        }
        if (/\.pdf($|\?)/.test(normalized))
        {
          return true;
        }
      }

      return false;
    }

    resolvePdfPreviewTarget(item, previewTarget)
    {
      if (!item)
      {
        return '';
      }

      var contentCode = resolveContentCode(item);
      if (contentCode)
      {
        var record = item.content ? item.content : {};
        var contentRecord = Object.assign({}, record, { contentCode: contentCode });
        var apiUrl = this.buildContentFileUrl(contentRecord);
        if (apiUrl)
        {
          return apiUrl;
        }
      }

      var candidates = [
        previewTarget,
        item.downloadUrl,
        item.linkUrl,
        item.embedUrl,
        item.objectUrl,
        item.previewSourceUrl,
        buildPreviewTarget(item)
      ];

      for (var i = 0; i < candidates.length; i += 1)
      {
        var candidate = candidates[i];
        if (candidate && String(candidate).trim())
        {
          return String(candidate).trim();
        }
      }

      return '';
    }

    async openPdfPreview(item, previewTarget)
    {
      var service = this.page && this.page.pdfModalService;
      if (!service)
      {
        throw new Error('[target-detail] pdf modal service is not available');
      }

      var src = this.resolvePdfPreviewTarget(item, previewTarget);
      if (!src)
      {
        this.showPreviewError();
        return;
      }

      var title = item && item.title ? item.title : (item.fileName || 'PDF');

      try
      {
        await service.show({
          title: title,
          src: src,
          ariaLabel: title,
          showDownload: true,
          showOpenInNewTab: true
        });
      }
      catch (_error)
      {
        this.showPreviewError();
      }
    }

    async openVideoPreview(item, previewContext)
    {
      var service = this.page && this.page.videoModalService;
      if (!service)
      {
        throw new Error('[target-detail] video modal service is not available');
      }
      if (item.category === 'youtube' && item.youtubeUrl)
      {
        service.openYouTube(item.youtubeUrl, { autoplay: false, title: item.title || '' });
        return;
      }
      var contentCode = previewContext && previewContext.contentCode
        ? previewContext.contentCode
        : resolveContentCode(item);
      var fallbackUrl = previewContext && previewContext.fallbackUrl ? previewContext.fallbackUrl : '';
      if (contentCode)
      {
        var contentRecord = this.buildContentRecordForVideo(item, contentCode);
        var videoSpec = { contentCode: contentCode, title: item.title || '' };
        if (this.hasContentRecordData(contentRecord))
        {
          videoSpec.contentRecord = contentRecord;
        }
        try
        {
          await service.openContentVideo(videoSpec, { autoplay: false });
          return;
        }
        catch (_error)
        {
          if (!item.embedUrl && !fallbackUrl)
          {
            this.showPreviewError();
            return;
          }
        }
      }
      var src = item.embedUrl || fallbackUrl || '';
      if (src)
      {
        service.openHtml5(src, { autoplay: false, title: item.title || '' });
        return;
      }
      this.showPreviewError();
    }

    buildContentRecordForVideo(item, contentCode)
    {
      var record = item && item.content ? Object.assign({}, item.content) : {};
      if (contentCode)
      {
        record.contentCode = contentCode;
      }
      if (!record.contentType && item && item.contentType)
      {
        record.contentType = item.contentType;
      }
      if (!record.fileName && item && item.fileName)
      {
        record.fileName = item.fileName;
      }
      if (!record.filePath && item && item.filePath)
      {
        record.filePath = item.filePath;
      }
      if (!record.mimeType && item && item.mimeType)
      {
        record.mimeType = item.mimeType;
      }
      if (record.bitrate === undefined && item && item.bitrate !== undefined)
      {
        record.bitrate = item.bitrate;
      }
      if (!record.proxyList && item && Array.isArray(item.proxyList))
      {
        record.proxyList = item.proxyList.slice();
      }
      return record;
    }

    hasContentRecordData(record)
    {
      if (!record)
      {
        return false;
      }
      var hasBitrate = record.bitrate !== undefined && record.bitrate !== null;
      var hasProxyList = Array.isArray(record.proxyList) && record.proxyList.length > 0;
      return hasBitrate || hasProxyList;
    }

    openImagePreview(item, previewContext)
    {
      var service = this.page && this.page.imageModalService;
      if (!service)
      {
        throw new Error('[target-detail] image modal service is not available');
      }

      var contentCode =
        (previewContext && previewContext.contentCode) ? previewContext.contentCode : resolveContentCode(item);
      var fallbackUrl = (previewContext && previewContext.fallbackUrl) ? previewContext.fallbackUrl : '';
      var previewSource =
        (previewContext && previewContext.previewSourceUrl)
          ? previewContext.previewSourceUrl
          : (item.previewSourceUrl || '');
      var src = '';

      if (contentCode)
      {
        var record = item.content ? item.content : {};
        var contentRecord = Object.assign({}, record, { contentCode: contentCode });
        src = this.buildContentFileUrl(contentRecord) || '';
      }

      if (!src && previewSource)
      {
        src = previewSource;
      }

      if (!src && fallbackUrl)
      {
        src = fallbackUrl;
      }

      if (!src && item.downloadUrl)
      {
        src = item.downloadUrl;
      }

      if (!src && item.objectUrl)
      {
        src = item.objectUrl;
      }

      if (!src)
      {
        this.showPreviewError();
        return;
      }

      service.show(src, { alt: item.title || '', caption: item.title || '' });
    }

    showPreviewError()
    {
      if (this.page && typeof this.page.showToast === 'function')
      {
        this.page.showToast('error', 'プレビューできない資料です。ダウンロードして確認してください。');
      }
    }

    async handleDelete(item, button)
    {
      if (!item || !item.materialCode || !this.page || !this.page.state)
      {
        return;
      }
      var targetCode = '';
      if (this.page.state.target && this.page.state.target.targetCode)
      {
        targetCode = this.page.state.target.targetCode;
      }
      else if (this.page.state.targetCode)
      {
        targetCode = this.page.state.targetCode;
      }
      if (!targetCode)
      {
        return;
      }

      var confirmed = await this.page.confirmDialogService.open('この資料を削除しますか？', { type: 'warning' });
      if (!confirmed)
      {
        return;
      }

      if (button)
      {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
      }
      this.setFeedback('資料を削除しています…', 'info');

      try
      {
        await this.page.callApi('TargetReferenceDelete', {
          targetCode: targetCode,
          materialCode: item.materialCode
        }, {
          requestType: 'TargetManagementReferences'
        });
        this.disposeObjectUrl(item);
        this.state.items = this.state.items.filter(function (entry)
        {
          return entry && entry.materialCode !== item.materialCode;
        });
        if (Array.isArray(this.page.state.references))
        {
          this.page.state.references = this.page.state.references.filter(function (entry)
          {
            return entry && entry.materialCode !== item.materialCode;
          });
        }
        this.renderList();
        this.updateFilterOptions();
        this.setFeedback('資料を削除しました。', 'success');
        if (typeof this.page.showToast === 'function')
        {
          this.page.showToast('success', '資料を削除しました。');
        }
      }
      catch (error)
      {
        window.console.error('[target-detail] failed to delete reference', error);
        this.setFeedback('資料の削除に失敗しました。', 'error');
        if (typeof this.page.showToast === 'function')
        {
          this.page.showToast('error', '資料の削除に失敗しました。');
        }
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

    async openAddModal()
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
        window.console.error('[target-detail] failed to init content uploader', error);
      }
      modal.root.removeAttribute('hidden');
      modal.root.setAttribute('aria-hidden', 'false');
      modal.root.classList.add('is-open');
      modal.restoreTarget = document.activeElement;
      modal.form.reset();
      this.setModalMode(modal, 'create');
      this.fillFormWithMaterial(modal, null);
      this.setModalSubmitting(modal, false);
      modal.authorToastShown = false;
      this.resetUploadState(modal);
      this.resetContentSelection(modal);
      this.toggleContentPicker(modal, false);
      this.renderSelectedContents(modal);
      this.setModalFeedback('', null);
      this.clearModalValidationState(modal);
      this.applyAuthorSelectionPolicy(modal);
      var focusAuthor = this.shouldShowAuthorField();
      if (focusAuthor && modal.authorSelectButton && typeof modal.authorSelectButton.focus === 'function')
      {
        modal.authorSelectButton.focus();
      }
      else
      {
        modal.titleInput.focus();
      }
    }

    async openEditModal(material)
    {
      if (!material)
      {
        return;
      }
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
        window.console.error('[target-detail] failed to init content uploader', error);
      }
      modal.root.removeAttribute('hidden');
      modal.root.setAttribute('aria-hidden', 'false');
      modal.root.classList.add('is-open');
      modal.restoreTarget = document.activeElement;
      modal.form.reset();
      this.setModalMode(modal, 'edit');
      this.fillFormWithMaterial(modal, material);
      this.setModalSubmitting(modal, false);
      modal.authorToastShown = false;
      this.toggleContentPicker(modal, false);
      this.renderSelectedContents(modal);
      this.setModalFeedback('', null);
      this.clearModalValidationState(modal);
      this.applyAuthorSelectionPolicy(modal);
      var focusAuthor = this.shouldShowAuthorField();
      if (focusAuthor && modal.authorSelectButton && typeof modal.authorSelectButton.focus === 'function')
      {
        modal.authorSelectButton.focus();
      }
      else
      {
        modal.titleInput.focus();
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
      this.toggleContentPicker(modal, false);
      if (modal.restoreTarget && typeof modal.restoreTarget.focus === 'function')
      {
        modal.restoreTarget.focus();
      }
    }

    createAddModal()
    {
      var modalRoot = document.createElement('div');
      modalRoot.className = 'screen-modal target-reference__modal-container';
      modalRoot.setAttribute('hidden', 'hidden');
      modalRoot.innerHTML =
        '<div class="screen-modal__overlay" data-modal-close></div>' +
        '<section class="screen-modal__content target-reference__modal" role="dialog" aria-modal="true" aria-labelledby="target-reference-modal-title">' +
        '<button type="button" class="screen-modal__close" aria-label="モーダルを閉じる">×</button>' +
        '<header class="screen-modal__header">' +
        '<h2 class="screen-modal__title" id="target-reference-modal-title">資料を追加</h2>' +
        '<p class="screen-modal__summary">リンクやファイル情報を入力して資料を登録します。</p>' +
        '</header>' +
        '<form class="screen-modal__body target-reference__form" novalidate>' +
        '<div class="target-reference__form-field">' +
        '<span class="target-reference__form-label">作成者</span>' +
        '<div class="target-reference__author" data-target-reference-author-picker>' +
        '<p class="target-reference__author-empty" data-target-reference-author-empty>作成者が選択されていません。</p>' +
        '<div class="target-reference__author-summary" data-target-reference-author-summary hidden>' +
        '<span class="target-reference__author-name" data-target-reference-author-name></span>' +
        '<span class="target-reference__author-code" data-target-reference-author-code></span>' +
        '</div>' +
        '</div>' +
        '<div class="target-reference__form-actions target-reference__author-actions" data-target-reference-author-actions></div>' +
        '</div>' +
        '<div class="target-submission__panel-grid">' +
        '<section class="target-submission__panel" aria-labelledby="target-reference-panel-library">' +
        '<div class="target-reference__form-field target-reference__form-row--full">' +
        '<div class="target-submission__content-select-header">' +
        '<p class="target-reference__form-label" id="target-reference-panel-library">登録済みコンテンツから追加</p>' +
        '</div>' +
        '<div class="target-submission__content-select-box">' +
        '<p class="target-reference__upload-note" data-target-reference-content-summary>コンテンツを選択していません。</p>' +
        '<div class="target-reference__form-actions target-submission__content-select-actions">' +
        '<button type="button" class="btn btn--primary" data-target-reference-content-open>コンテンツを選択</button>' +
        '<button type="button" class="btn btn--text" data-target-reference-content-clear disabled>選択をクリア</button>' +
        '</div>' +
        '</div>' +
        '<ul class="target-submission__content-list" data-target-reference-content-list hidden></ul>' +
        '<div class="target-submission__content-picker" data-target-reference-content-picker hidden>' +
        '<label class="target-reference__form-label" for="target-reference-content-search">コンテンツを検索</label>' +
        '<input id="target-reference-content-search" class="user-management__input target-reference__input" type="search" placeholder="タイトルやコンテンツコードで検索" data-target-reference-content-search />' +
        '<p class="target-reference__upload-note" data-target-reference-content-feedback hidden></p>' +
        '<div class="target-submission__content-picker-results" data-target-reference-content-results></div>' +
        '<div class="target-reference__form-actions target-submission__content-picker-actions">' +
        '<button type="button" class="btn btn--ghost" data-target-reference-content-close>閉じる</button>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</section>' +
        '<section class="target-submission__panel" aria-labelledby="target-reference-panel-upload">' +
        '<div class="target-reference__form-field target-reference__form-row--full target-reference__form-upload">' +
        '<p class="target-reference__form-label" id="target-reference-panel-upload">コンテンツをアップロード</p>' +
        '<div class="target-reference__uploader" data-target-reference-uploader></div>' +
        '<p class="target-reference__upload-note" data-target-reference-upload-counter>アップロードは任意です。ファイルを選択するとここに表示されます。</p>' +
        '</div>' +
        '</section>' +
        '</div>' +
        '<div class="target-reference__form-field target-reference__form-row--full">' +
        '<label class="target-reference__form-label" for="target-reference-title">タイトル</label>' +
        '<input id="target-reference-title" class="user-management__input target-reference__input" name="title" required maxlength="256" />' +
        '</div>' +
        '<div class="target-reference__form-field target-reference__form-row--full">' +
        '<label class="target-reference__form-label" for="target-reference-description">説明 (任意)</label>' +
        '<textarea id="target-reference-description" class="user-management__input target-reference__textarea" name="description" rows="3" maxlength="2048"></textarea>' +
        '</div>' +
        '<p class="user-management__feedback target-reference__form-feedback" aria-live="polite" hidden></p>' +
        '<div class="target-reference__form-actions target-reference__form-row--full">' +
        '<button type="submit" class="btn btn--primary">登録</button>' +
        '<button type="button" class="btn btn--ghost" data-modal-cancel>キャンセル</button>' +
        '</div>' +
        '</form>' +
        '</section>';

      document.body.appendChild(modalRoot);

      var form = modalRoot.querySelector('form');
      var overlay = modalRoot.querySelector('.screen-modal__overlay');
      var closeButton = modalRoot.querySelector('.screen-modal__close');
      var cancelButton = modalRoot.querySelector('[data-modal-cancel]');
      var titleNode = modalRoot.querySelector('.screen-modal__title');
      var summaryNode = modalRoot.querySelector('.screen-modal__summary');
      var titleInput = form.querySelector('#target-reference-title');
      var titleField = titleInput ? titleInput.closest('.target-reference__form-field') : null;
      var descriptionInput = form.querySelector('#target-reference-description');
      var descriptionField = descriptionInput ? descriptionInput.closest('.target-reference__form-field') : null;
      var authorField = form.querySelector('.target-reference__author');
      if (authorField && authorField.closest('.target-reference__form-field'))
      {
        authorField = authorField.closest('.target-reference__form-field');
      }
      var authorActions = form.querySelector('[data-target-reference-author-actions]');
      var authorSummary = form.querySelector('[data-target-reference-author-summary]');
      var authorEmpty = form.querySelector('[data-target-reference-author-empty]');
      var authorName = form.querySelector('[data-target-reference-author-name]');
      var authorCode = form.querySelector('[data-target-reference-author-code]');
      var authorSelectButton = null;
      var feedback = form.querySelector('.target-reference__form-feedback');
      var uploaderHost = form.querySelector('[data-target-reference-uploader]');
      var uploadCounter = form.querySelector('[data-target-reference-upload-counter]');
      var uploadField = form.querySelector('.target-reference__form-upload');
      var contentOpenButton = form.querySelector('[data-target-reference-content-open]');
      var contentClearButton = form.querySelector('[data-target-reference-content-clear]');
      var contentList = form.querySelector('[data-target-reference-content-list]');
      var contentSummary = form.querySelector('[data-target-reference-content-summary]');
      var contentPicker = form.querySelector('[data-target-reference-content-picker]');
      var contentSearch = form.querySelector('[data-target-reference-content-search]');
      var contentResults = form.querySelector('[data-target-reference-content-results]');
      var contentFeedback = form.querySelector('[data-target-reference-content-feedback]');
      var contentCloseButton = form.querySelector('[data-target-reference-content-close]');
      var submitButton = form.querySelector('button[type="submit"]');

      if (authorActions)
      {
        authorSelectButton = this.createBannerButton('作成者を選択', 'target-reference__author-select', {
          buttonType: 'content-uploader-primary',
          fallbackClass: 'btn btn--primary'
        });
        authorSelectButton.setAttribute('data-target-reference-author-select', '');
        authorActions.appendChild(authorSelectButton);
      }

      var self = this;

      var modal = {
        root: modalRoot,
        form: form,
        titleInput: titleInput,
        titleField: titleField,
        descriptionInput: descriptionInput,
        descriptionField: descriptionField,
        authorField: authorField,
        authorActions: authorActions,
        authorSummary: authorSummary,
        authorEmpty: authorEmpty,
        authorName: authorName,
        authorCode: authorCode,
        authorSelectButton: authorSelectButton,
        feedback: feedback,
        uploaderHost: uploaderHost,
        uploadCounter: uploadCounter,
        uploadField: uploadField,
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
        titleNode: titleNode,
        summaryNode: summaryNode,
        restoreTarget: null,
        isSubmitting: false,
        mode: 'create',
        currentMaterial: null,
        selectedUser: null,
        selectedContents: [],
        allowMultipleContents: true
      };

      var closeConfirmMessage = '入力内容が保存されていません。モーダルを閉じますか？';

      async function close(event)
      {
        if (event)
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
          window.console.error('[target-detail] failed to confirm reference modal close', error);
        }
      }

      overlay.addEventListener('click', close);
      closeButton.addEventListener('click', close);
      cancelButton.addEventListener('click', close);
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

      if (titleInput)
      {
        titleInput.addEventListener('input', function ()
        {
          self.setFieldErrorState(modal.titleInput, false);
          self.setFieldErrorState(modal.titleField, false);
        });
      }

      if (authorSelectButton)
      {
        authorSelectButton.addEventListener('click', () =>
        {
          window.console.log('[target-reference] author select button clicked');
          this.openAuthorSelectModal(modal);
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
        self.submitReferenceForm(modal);
      });

      return modal;
    }

    setModalMode(modal, mode)
    {
      if (!modal)
      {
        return;
      }
      modal.mode = mode === 'edit' ? 'edit' : 'create';
      var isEditMode = modal.mode === 'edit';
      modal.allowMultipleContents = !isEditMode;
      if (modal.titleNode)
      {
        modal.titleNode.textContent = isEditMode ? '資料を編集' : '資料を追加';
      }
      if (modal.summaryNode)
      {
        modal.summaryNode.textContent = isEditMode
          ? '登録済みの情報を編集して資料を更新します。'
          : 'リンクやファイル情報を入力して資料を登録します。';
      }
      if (modal.submitButton)
      {
        modal.submitButton.textContent = isEditMode ? '更新' : '登録';
      }
    }

    notifyAuthorSelectionRequired(modal, forceToast, toastType)
    {
      var shouldForce = !!forceToast;
      if (!modal)
      {
        return;
      }
      if (modal.authorToastShown && !shouldForce)
      {
        return;
      }
      if (this.page && typeof this.page.showToast === 'function')
      {
        var type = toastType === 'error' ? 'error' : 'info';
        var message = toastType === 'error'
          ? '作成者を選択してください。'
          : '作成者を選択するとコンテンツを表示できます。';
        this.page.showToast(type, message);
      }
      modal.authorToastShown = true;
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

    getContentOwnerSelection(modal)
    {
      var selection = modal && modal.selectedUser ? modal.selectedUser : null;
      if (!selection && !this.shouldShowAuthorField())
      {
        selection = this.getSessionUserSelection();
      }
      return selection;
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

    toggleContentPicker(modal, isOpen)
    {
      if (!modal || !modal.contentPicker)
      {
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
      var service = this.getContentsSelectModalService();
      if (!service || typeof service.open !== 'function')
      {
        this.setModalFeedback('コンテンツ選択モーダルを利用できません。', 'error');
        return;
      }
      var ownerKey = this.resolveContentLibraryOwner(modal);
      var ownerParams = this.resolveContentLibraryOwnerParams(modal);
      if (this.shouldShowAuthorField() && !ownerKey)
      {
        this.notifyAuthorSelectionRequired(modal, true, 'error');
        return;
      }
      var allowMultiple = modal && modal.allowMultipleContents !== false;
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
      var handleSelection = (items) =>
      {
        if (!items)
        {
          return;
        }
        var list = Array.isArray(items) ? items : [items];
        if (!list.length)
        {
          this.resetContentSelection(modal);
          return;
        }
        var replaceSelection = !allowMultiple;
        if (replaceSelection)
        {
          this.resetContentSelection(modal);
        }
        list.forEach((entry) =>
        {
          if (entry)
          {
            this.addContentSelection(modal, entry.raw || entry, { replace: replaceSelection });
          }
        });
      };

      try
      {
        service.open({
        title: 'コンテンツを選択',
        owner: ownerKey,
        ownerParams: ownerParams,
        multiple: allowMultiple,
        selectedItems: selectedItems,
        onSelect: handleSelection,
        onApply: handleSelection,
          onClose: (reason, payload) =>
          {
            if (Array.isArray(payload) && !payload.length)
            {
              this.resetContentSelection(modal);
            }
          }
        });
      }
      catch (error)
      {
        window.console.error('[target-detail] failed to open content select modal', error);
      }
    }

    async ensureContentLibrary(modal)
    {
      var ownerKey = this.resolveContentLibraryOwner(modal);
      var ownerParams = this.resolveContentLibraryOwnerParams(modal);
      var requiresSelection = this.shouldShowAuthorField();
      if (requiresSelection && !ownerKey)
      {
        this.contentLibrary = [];
        this.contentLibraryOwner = '';
        this.setContentPickerFeedback(modal, '', null);
        this.notifyAuthorSelectionRequired(modal);
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
        this.contentLibrary = this.filterContentLibraryByOwner(
          this.normalizeContentLibrary(payload),
          ownerParams
        );
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
        var ownerCode =
          entry.ownerUserCode ||
          entry.ownerCode ||
          entry.userCode ||
          entry.ownerUserId ||
          entry.ownerId ||
          entry.userId ||
          '';
        var ownerId = entry.ownerUserId || entry.ownerId || entry.userId || '';
        var updatedAtValue = Date.parse(entry.updatedAt || '') || Date.parse(entry.updated_at || '') || 0;
        normalized.push({
          code: String(code),
          label: label,
          type: type,
          owner: entry.ownerDisplayName || entry.ownerUserCode || '',
          ownerCode: ownerCode || '',
          ownerId: ownerId || '',
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

    filterContentLibraryByOwner(entries, ownerParams)
    {
      if (!Array.isArray(entries) || !ownerParams)
      {
        return entries || [];
      }
      var ownerCode = ownerParams.userCode || '';
      var ownerId = ownerParams.userId || '';
      if (!ownerCode && !ownerId)
      {
        return entries;
      }
      return entries.filter(function (entry)
      {
        var raw = entry && entry.raw ? entry.raw : null;
        var entryOwnerCode =
          (entry && (entry.ownerCode || entry.ownerId)) ||
          (raw && (raw.ownerUserCode || raw.ownerCode || raw.userCode || raw.ownerUserId || raw.ownerId || raw.userId)) ||
          '';
        var entryOwnerId = (entry && entry.ownerId) || (raw && (raw.ownerUserId || raw.ownerId || raw.userId)) || '';
        return (ownerCode && entryOwnerCode && ownerCode === String(entryOwnerCode))
          || (ownerId && entryOwnerId && ownerId === String(entryOwnerId));
      });
    }

    renderContentPickerResults(modal)
    {
      if (!modal || !modal.contentResults)
      {
        return;
      }
      var owner = this.resolveContentLibraryOwner(modal);
      if (this.shouldShowAuthorField() && !owner)
      {
        modal.contentResults.innerHTML = '';
        this.setContentPickerFeedback(modal, '', null);
        this.notifyAuthorSelectionRequired(modal);
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

    toggleBaseContentFields(modal, shouldShow)
    {
      if (!modal)
      {
        return;
      }
      var targets = [modal.titleField, modal.descriptionField];
      for (var i = 0; i < targets.length; i += 1)
      {
        var target = targets[i];
        if (!target)
        {
          continue;
        }
        if (shouldShow)
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
    }

    addContentSelection(modal, entry, options)
    {
      if (!modal)
      {
        return;
      }
      if (this.shouldShowAuthorField() && !modal.selectedUser)
      {
        this.notifyAuthorSelectionRequired(modal, true, 'error');
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
          contentCode: entry && (entry.contentCode || entry.code || ''),
          raw: entry
        };
      }
      if (!Array.isArray(modal.selectedContents))
      {
        modal.selectedContents = [];
      }
      var rawContent = attachment && attachment.raw ? attachment.raw : entry;
      var defaultTitle = '';
      if (rawContent && typeof rawContent.title !== 'undefined')
      {
        defaultTitle = rawContent.title || '';
      }
      else if (attachment && attachment.label)
      {
        defaultTitle = attachment.label;
      }
      var defaultDescription = '';
      if (rawContent && typeof rawContent.description !== 'undefined')
      {
        defaultDescription = rawContent.description || '';
      }
      else if (rawContent && (rawContent.memo || rawContent.note || rawContent.summary))
      {
        defaultDescription = rawContent.memo || rawContent.note || rawContent.summary || '';
      }
      attachment.title = typeof attachment.title !== 'undefined' ? attachment.title : defaultTitle;
      attachment.description = typeof attachment.description !== 'undefined' ? attachment.description : defaultDescription;
      var allowMultiple = modal.allowMultipleContents !== false;
      var replaceSelection = options && options.replace;
      var existingIndex = modal.selectedContents.findIndex(function (item)
      {
        return item && attachment && item.contentCode === attachment.contentCode;
      });
      if (existingIndex >= 0)
      {
        modal.selectedContents[existingIndex] = attachment;
      }
      else if (!allowMultiple || replaceSelection)
      {
        modal.selectedContents = attachment && attachment.contentCode ? [attachment] : [];
      }
      else if (attachment && attachment.contentCode)
      {
        modal.selectedContents.push(attachment);
      }
      var shouldSyncBaseFields = !modal.allowMultipleContents || modal.selectedContents.length === 1;
      if (shouldSyncBaseFields)
      {
        if (modal.titleInput)
        {
          modal.titleInput.value = attachment.title || '';
        }
        if (modal.descriptionInput)
        {
          modal.descriptionInput.value = attachment.description || '';
        }
      }
      this.renderSelectedContents(modal);
      this.setFieldErrorState(modal.uploadField, false);
      this.setModalFeedback('', null);
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
      var usePerContentForm = modal.allowMultipleContents !== false
        && selections.length > 0
        && !this.hasUploadQueueItems();
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
      this.toggleBaseContentFields(modal, !usePerContentForm || !selections.length);
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
        var header = document.createElement('div');
        header.className = 'target-submission__content-item-header';
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
        header.appendChild(text);
        var remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'target-submission__content-remove';
        remove.textContent = '×';
        remove.setAttribute('aria-label', 'このコンテンツを一覧から削除');
        remove.addEventListener('click', function ()
        {
          self.removeSelectedContent(modal, code);
        });
        header.appendChild(remove);
        row.appendChild(header);
        if (usePerContentForm)
        {
          var fieldWrap = document.createElement('div');
          fieldWrap.className = 'target-submission__content-item-fields';
          var titleId = 'target-reference-selected-title-' + (code || 'index-' + Math.random().toString(36).slice(2));
          var descId = 'target-reference-selected-description-' + (code || 'index-' + Math.random().toString(36).slice(2));
          var titleField = document.createElement('label');
          titleField.className = 'target-reference__form-label';
          titleField.setAttribute('for', titleId);
          titleField.textContent = 'タイトル';
          var titleInput = document.createElement('input');
          titleInput.id = titleId;
          titleInput.className = 'user-management__input target-reference__input';
          titleInput.value = item.title || label || '';
          titleInput.addEventListener('input', function ()
          {
            item.title = titleInput.value;
          });
          var titleGroup = document.createElement('div');
          titleGroup.className = 'target-submission__content-field';
          titleGroup.appendChild(titleField);
          titleGroup.appendChild(titleInput);
          var descField = document.createElement('label');
          descField.className = 'target-reference__form-label';
          descField.setAttribute('for', descId);
          descField.textContent = '説明 (任意)';
          var descInput = document.createElement('textarea');
          descInput.id = descId;
          descInput.className = 'user-management__input target-reference__textarea';
          descInput.rows = 3;
          descInput.value = item.description || '';
          descInput.addEventListener('input', function ()
          {
            item.description = descInput.value;
          });
          var descGroup = document.createElement('div');
          descGroup.className = 'target-submission__content-field';
          descGroup.appendChild(descField);
          descGroup.appendChild(descInput);
          fieldWrap.appendChild(titleGroup);
          fieldWrap.appendChild(descGroup);
          row.appendChild(fieldWrap);
        }
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

    collectSelectedContentEntries(modal)
    {
      var targetModal = modal || this.modals.add;
      var selections = Array.isArray(targetModal && targetModal.selectedContents)
        ? targetModal.selectedContents
        : [];
      var list = [];
      for (var i = 0; i < selections.length; i += 1)
      {
        var selection = selections[i];
        if (!selection || !selection.contentCode)
        {
          continue;
        }
        var rawContent = selection.raw || selection.content || null;
        var title = selection.title;
        if (!title && rawContent)
        {
          title = rawContent.title || rawContent.fileName || rawContent.name || selection.label || '';
        }
        else if (!title)
        {
          title = selection.label || '';
        }
        var description = typeof selection.description !== 'undefined'
          ? selection.description
          : '';
        if (!description && rawContent)
        {
          description = rawContent.description || rawContent.memo || rawContent.note || rawContent.summary || '';
        }
        list.push({
          contentCode: selection.contentCode,
          label: selection.label || title || selection.contentCode,
          type: selection.type || (rawContent && (rawContent.contentType || rawContent.mimeType || rawContent.type)),
          title: title || '',
          description: description || '',
          raw: rawContent,
          content: selection.content || rawContent || null
        });
      }
      return list;
    }

    resolveDerivedCategoryFromSelection(selection, fallbackTitle)
    {
      var rawContent = selection && (selection.content || selection.raw || null);
      var type = selection && selection.type ? selection.type : (rawContent && (rawContent.contentType || rawContent.mimeType));
      var name = (selection && (selection.label || selection.title))
        || (rawContent && (rawContent.fileName || rawContent.title))
        || fallbackTitle
        || '';
      var derivedCategory = normalizeCategoryValue(
        deriveCategoryFromMime(type) || deriveCategoryFromFileName(name)
      );
      return derivedCategory || 'document';
    }

    fillFormWithMaterial(modal, material)
    {
      if (!modal)
      {
        return;
      }
      modal.currentMaterial = material || null;
      this.clearModalValidationState(modal);
      this.toggleContentPicker(modal, false);
      if (!material)
      {
        this.setAuthorSelection(modal, null);
        if (modal.titleInput)
        {
          modal.titleInput.value = '';
        }
        if (modal.descriptionInput)
        {
          modal.descriptionInput.value = '';
        }
        this.updateUploadCounterText(0, modal);
        this.resetContentSelection(modal);
        return;
      }
      if (modal.titleInput)
      {
        modal.titleInput.value = material.title || '';
      }
      if (modal.descriptionInput)
      {
        modal.descriptionInput.value = material.description || '';
      }
      this.setAuthorSelection(modal, {
        displayName: material.ownerDisplayName,
        userCode: material.ownerUserCode
      });
      var selected = this.buildSelectedContentFromMaterial(material);
      modal.selectedContents = selected ? [selected] : [];
      this.renderSelectedContents(modal);
      this.resetUploadState(modal);
      if (modal.uploadCounter)
      {
        var fileLabel = selected ? (selected.label || selected.contentCode) : (material.fileName || material.title || '登録済みコンテンツ');
        modal.uploadCounter.textContent = fileLabel + ' を登録済みです。新しいファイルを選択すると置き換わります。';
        this.setFieldErrorState(modal.uploadField, false);
      }
    }

    buildSelectedContentFromMaterial(material)
    {
      if (!material)
      {
        return null;
      }
      var contentCode = resolveContentCode(material);
      if (!contentCode)
      {
        return null;
      }
      var label = material.title || material.fileName || material.name || '登録済みコンテンツ';
      var type = material.contentType || material.mimeType;
      if (!type && material.content)
      {
        type = material.content.contentType || material.content.mimeType;
      }
      return {
        label: label,
        type: type || material.category || '',
        contentCode: contentCode,
        content: material.content || null,
        raw: material
      };
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
          return self.uploadReferenceContent(file, options || {});
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
      if (!count)
      {
        this.pendingUploadResults = [];
      }
      if (this.modals && this.modals.add)
      {
        this.renderSelectedContents(this.modals.add);
      }
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
      if (modal)
      {
        this.setFieldErrorState(modal.uploadField, false);
      }
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

    updateUploadCounterText(count, modal)
    {
      var targetModal = modal || this.modals.add;
      if (!targetModal || !targetModal.uploadCounter)
      {
        return;
      }
      var message = count > 0
        ? '選択中: ' + count + '件のファイル'
        : 'アップロードは任意です。ファイルを選択するとここに表示されます。';
      targetModal.uploadCounter.textContent = message;
      if (count > 0)
      {
        this.setFieldErrorState(targetModal.uploadField, false);
      }
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

    collectAuthorValues(modal)
    {
      var targetModal = modal || this.modals.add;
      var selectedUser = targetModal ? (targetModal.selectedUser || null) : null;
      return {
        authorDisplayName: selectedUser && selectedUser.displayName ? String(selectedUser.displayName).trim() : '',
        authorCode: selectedUser && selectedUser.userCode ? String(selectedUser.userCode).trim() : ''
      };
    }

    collectModalFormValues(modal)
    {
      if (!modal)
      {
        return {
          title: '',
          description: '',
          authorDisplayName: '',
          authorCode: ''
        };
      }
      var author = this.collectAuthorValues(modal);
      return {
        title: modal.titleInput.value.trim(),
        description: modal.descriptionInput.value.trim(),
        authorDisplayName: author.authorDisplayName,
        authorCode: author.authorCode
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
      this.setFieldErrorState(modal.titleInput, false);
      this.setFieldErrorState(modal.titleField, false);
      this.setFieldErrorState(modal.authorField, false);
      this.setFieldErrorState(modal.uploadField, false);
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
        modal.authorSelectButton,
        modal.contentOpenButton,
        modal.contentClearButton,
        modal.contentCloseButton
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
          if (target === modal.contentClearButton && (!modal.selectedContents || !modal.selectedContents.length))
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

    async submitReferenceForm(modal)
    {
      if (!modal || modal.isSubmitting)
      {
        return;
      }
      this.clearModalValidationState(modal);
      this.setModalFeedback('', null);
      var isEditMode = modal.mode === 'edit';
      var currentMaterial = isEditMode ? modal.currentMaterial : null;
      var values = this.collectModalFormValues(modal);
      var selectedEntries = this.collectSelectedContentEntries(modal);
      var needsUpload = this.hasUploadQueueItems();
      var hasExistingContent = !!(currentMaterial && (
        currentMaterial.contentCode ||
        currentMaterial.objectUrl ||
        currentMaterial.downloadUrl ||
        currentMaterial.linkUrl ||
        currentMaterial.embedUrl ||
        currentMaterial.youtubeUrl
      ));
      var hasSelectedContents = selectedEntries.length > 0;
      var usesSelectionForms = hasSelectedContents && modal.allowMultipleContents !== false && !isEditMode && !needsUpload;
      if (!usesSelectionForms && !values.title)
      {
        this.setModalFeedback('タイトルを入力してください。', 'error');
        this.setFieldErrorState(modal.titleInput, true);
        this.setFieldErrorState(modal.titleField, true);
        modal.titleInput.focus();
        return;
      }
      if (!values.authorDisplayName)
      {
        this.setModalFeedback('作成者を選択してください。', 'error');
        this.setFieldErrorState(modal.authorField, true);
        if (modal.authorSelectButton && typeof modal.authorSelectButton.focus === 'function')
        {
          modal.authorSelectButton.focus();
        }
        return;
      }
      var selectedAttachment = hasSelectedContents ? selectedEntries[0] : null;
      if (!needsUpload && !hasExistingContent && !hasSelectedContents)
      {
        this.setModalFeedback('コンテンツファイルを選択してください。', 'error');
        this.setFieldErrorState(modal.uploadField, true);
        return;
      }
      if (usesSelectionForms)
      {
        var hasMissingTitle = selectedEntries.some(function (entry)
        {
          return !entry || !entry.title;
        });
        if (hasMissingTitle)
        {
          this.setModalFeedback('各コンテンツのタイトルを入力してください。', 'error');
          return;
        }
      }
      this.setModalSubmitting(modal, true);
      try
      {
        var uploadedContent = null;
        if (needsUpload)
        {
          this.uploadOwnerUserCode = values.authorCode || '';
          var uploadPayload = await this.contentUploaderService.startUpload();
          if (!uploadPayload)
          {
            throw new Error('ファイルのアップロードに失敗しました。');
          }
          uploadedContent = this.getUploadedContentFromPayload(uploadPayload);
          if (!uploadedContent || !uploadedContent.contentCode)
          {
            throw new Error('アップロードしたコンテンツ情報を取得できませんでした。');
          }
        }
        if (usesSelectionForms)
        {
          this.setModalFeedback('資料を登録しています…', 'info');
          var createdMaterials = [];
          for (var i = 0; i < selectedEntries.length; i += 1)
          {
            var entry = selectedEntries[i];
            if (!entry || !entry.contentCode)
            {
              continue;
            }
            var entryCategory = this.resolveDerivedCategoryFromSelection(entry, entry.title || values.title);
            var createParams = {
              targetCode: this.page.state.targetCode,
              title: entry.title,
              category: entryCategory || 'document'
            };
            if (entry.description)
            {
              createParams.description = entry.description;
            }
            if (values.authorDisplayName)
            {
              createParams.ownerDisplayName = values.authorDisplayName;
            }
            if (values.authorCode)
            {
              createParams.ownerUserCode = values.authorCode;
            }
            createParams.contentCode = entry.contentCode;
            var createResponse = await this.page.callApi('TargetReferenceCreate', createParams, { requestType: 'TargetManagementReferences' });
            var createdMaterial = createResponse && createResponse.material ? createResponse.material : null;
            if (!createdMaterial)
            {
              throw new Error('資料の登録結果を取得できませんでした。');
            }
            var normalizedCreated = this.normalizeMaterial(createdMaterial);
            if (normalizedCreated)
            {
              if (!normalizedCreated.ownerDisplayName && values.authorDisplayName)
              {
                normalizedCreated.ownerDisplayName = values.authorDisplayName;
              }
              if (!normalizedCreated.ownerUserCode && values.authorCode)
              {
                normalizedCreated.ownerUserCode = values.authorCode;
              }
              createdMaterials.push(normalizedCreated);
            }
          }
          if (!createdMaterials.length)
          {
            throw new Error('資料の登録結果を取得できませんでした。');
          }
          this.state.items = this.normalizeMaterials(createdMaterials.concat(this.state.items || []));
          if (Array.isArray(this.page.state.references))
          {
            this.page.state.references = this.normalizeMaterials(createdMaterials.concat(this.page.state.references));
          }
          this.renderList();
          this.updateFilterOptions();
          try
          {
            await this.reloadReferencesFromServer();
          }
          catch (refreshError)
          {
            window.console.warn('[target-detail] reference reload failed after submit', refreshError);
          }
          var successMessage = createdMaterials.length > 1
            ? createdMaterials.length + '件の資料を追加しました。'
            : '資料を追加しました。';
          this.setFeedback(successMessage, 'success');
          if (this.page && typeof this.page.showToast === 'function')
          {
            this.page.showToast('success', successMessage);
          }
          this.setModalFeedback(successMessage, 'success');
          this.closeAddModal();
          return;
        }
        this.setModalFeedback('資料を登録しています…', 'info');
        var derivedCategory = 'document';
        if (uploadedContent)
        {
          var categoryFromMime = deriveCategoryFromMime(uploadedContent.contentType || uploadedContent.mimeType);
          var categoryFromFile = deriveCategoryFromFileName(uploadedContent.fileName || uploadedContent.name || values.title);
          var normalizedCategory = normalizeCategoryValue(categoryFromMime || categoryFromFile);
          if (normalizedCategory)
          {
            derivedCategory = normalizedCategory;
          }
        }
        else if (selectedAttachment)
        {
          var selectedContent = selectedAttachment.content || selectedAttachment.raw || null;
          var selectedType = selectedAttachment.type
            || (selectedContent && (selectedContent.contentType || selectedContent.mimeType));
          var selectedName = selectedAttachment.label
            || (selectedContent && (selectedContent.fileName || selectedContent.title));
          var selectedCategory = normalizeCategoryValue(
            deriveCategoryFromMime(selectedType) || deriveCategoryFromFileName(selectedName || values.title)
          );
          if (selectedCategory)
          {
            derivedCategory = selectedCategory;
          }
        }
        else if (currentMaterial && currentMaterial.category)
        {
          derivedCategory = currentMaterial.category;
        }
        var params = {
          targetCode: this.page.state.targetCode,
          title: values.title,
          category: derivedCategory || 'document'
        };
        if (isEditMode && currentMaterial && currentMaterial.materialCode)
        {
          params.materialCode = currentMaterial.materialCode;
        }
        if (values.description)
        {
          params.description = values.description;
        }
        if (values.authorDisplayName)
        {
          params.ownerDisplayName = values.authorDisplayName;
        }
        if (values.authorCode)
        {
          params.ownerUserCode = values.authorCode;
        }
        if (uploadedContent && uploadedContent.contentCode)
        {
          params.contentCode = uploadedContent.contentCode;
        }
        else if (selectedAttachment && selectedAttachment.contentCode)
        {
          params.contentCode = selectedAttachment.contentCode;
        }
        else if (isEditMode && currentMaterial && currentMaterial.contentCode)
        {
          params.contentCode = currentMaterial.contentCode;
        }
        var apiMethod = isEditMode ? 'TargetReferenceUpdate' : 'TargetReferenceCreate';
        var response = await this.page.callApi(apiMethod, params, { requestType: 'TargetManagementReferences' });
        var material = response && response.material ? response.material : null;
        if (!material && isEditMode && currentMaterial)
        {
          material = Object.assign({}, currentMaterial, {
            title: values.title,
            description: values.description,
            ownerDisplayName: values.authorDisplayName || currentMaterial.ownerDisplayName,
            ownerUserCode: values.authorCode || currentMaterial.ownerUserCode,
            category: derivedCategory || currentMaterial.category
          });
          if (params.contentCode && !material.contentCode)
          {
            material.contentCode = params.contentCode;
          }
        }
        if (!material)
        {
          throw new Error('資料の登録結果を取得できませんでした。');
        }
        var normalized = this.normalizeMaterial(material);
        if (normalized)
        {
          if (!normalized.ownerDisplayName && values.authorDisplayName)
          {
            normalized.ownerDisplayName = values.authorDisplayName;
          }
          if (!normalized.ownerUserCode && values.authorCode)
          {
            normalized.ownerUserCode = values.authorCode;
          }
          if (isEditMode)
          {
            this.state.items = this.state.items.map(function (entry)
            {
              if (entry && entry.materialCode === normalized.materialCode)
              {
                return normalized;
              }
              return entry;
            });
            if (Array.isArray(this.page.state.references))
            {
              this.page.state.references = this.page.state.references.map(function (entry)
              {
                if (entry && entry.materialCode === normalized.materialCode)
                {
                  return normalized;
                }
                return entry;
              });
            }
          }
          else
          {
            this.state.items.unshift(normalized);
            this.state.items = this.normalizeMaterials(this.state.items);
          }
        }
        this.renderList();
        this.updateFilterOptions();
        try
        {
          await this.reloadReferencesFromServer();
        }
        catch (refreshError)
        {
          window.console.warn('[target-detail] reference reload failed after submit', refreshError);
        }
        this.setFeedback(isEditMode ? '資料を更新しました。' : '資料を追加しました。', 'success');
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('success', isEditMode ? '資料を更新しました。' : '資料を追加しました。');
        }
        this.setModalFeedback(isEditMode ? '資料を更新しました。' : '資料を追加しました。', 'success');
        this.closeAddModal();
      }
      catch (error)
      {
        var message = error && error.message ? error.message : '資料の登録に失敗しました。';
        this.setModalFeedback(message, 'error');
      }
      finally
      {
        this.uploadOwnerUserCode = '';
        this.setModalSubmitting(modal, false);
      }
    }

    getUploadedContentFromPayload(payload)
    {
      var results = Array.isArray(payload && payload.results) ? payload.results : this.pendingUploadResults;
      if (!Array.isArray(results) || !results.length)
      {
        return null;
      }
      for (var i = 0; i < results.length; i += 1)
      {
        var entry = results[i];
        if (!entry)
        {
          continue;
        }
        var result = entry.result || entry;
        if (result && result.contentCode)
        {
          return result;
        }
      }
      return null;
    }

    uploadReferenceContent(file, options)
    {
      if (!file)
      {
        return Promise.reject(new Error('ファイルを選択してください。'));
      }
      var formData = new window.FormData();
      var fileName = file.name || 'reference-upload';
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

    disposeObjectUrl(item)
    {
      if (!item || !item.objectUrl)
      {
        return;
      }
      var urlApi = window.URL || window.webkitURL;
      if (urlApi && typeof urlApi.revokeObjectURL === 'function')
      {
        urlApi.revokeObjectURL(item.objectUrl);
      }
    }

    disposeObjectUrls(items)
    {
      if (!Array.isArray(items))
      {
        return;
      }
      for (var i = 0; i < items.length; i += 1)
      {
        this.disposeObjectUrl(items[i]);
      }
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
  }

  var NS = window.TargetDetail || (window.TargetDetail = {});
  NS.JobReference = NS.JobReference || TargetDetailReference;
})(window, document);
