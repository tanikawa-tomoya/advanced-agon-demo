(function ()
{
  'use strict';

  var TAB_DEFINITIONS = [
    { id: 'basic', label: '基本情報' },
    { id: 'announcements', label: 'お知らせ' },
    { id: 'references', label: '参考資料' },
    { id: 'schedules', label: 'スケジュール' },
    { id: 'products', label: '商品' },
    { id: 'chat', label: 'チャット' },
    { id: 'bbs', label: '掲示板' },
    { id: 'submissions', label: '提出' },
    { id: 'reviews', label: 'レビュー' },
    { id: 'badges', label: 'バッジ' },
    { id: 'survey', label: 'アンケート' }
  ];

  var COMPACT_BANNER_CLASS = 'btn btn--primary target-detail__action-button target-detail__action-button--compact';
  var EXPANDABLE_ADD_ICON_HTML = [
    '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">',
    '<circle cx="12" cy="12" r="8.25" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></circle>',
    '<path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M12 8.25v7.5m-3.75-3.75h7.5"></path>',
    '</svg>'
  ].join('');
  var CONTENT_TYPE_LABELS = {
    video: '動画',
    audio: '音声',
    image: '画像',
    pdf: 'PDF',
    file: 'ファイル',
    document: 'ファイル',
    other: 'ファイル'
  };
  var VIDEO_FILE_EXTENSIONS = ['mp4', 'm4v', 'mov', 'webm', 'wmv', 'avi', 'mkv'];
  var IMAGE_FILE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'heic', 'heif'];
  var AUDIO_FILE_EXTENSIONS = ['mp3', 'aac', 'm4a', 'wav', 'flac', 'ogg', 'oga', 'opus', 'weba', 'aif', 'aiff', 'wma'];
  var AUDIENCE_SCOPE = Object.freeze({
    ALL: 'all',
    USERS: 'users'
  });

  function normalizeText(value)
  {
    if (value == null)
    {
      return '';
    }
    return String(value).trim();
  }

  function normalizeGuidanceTypeFromValue(value)
  {
    if (value === undefined || value === null)
    {
      return '';
    }
    var normalized = String(value).trim().toLowerCase();
    if (!normalized)
    {
      return '';
    }
    if (normalized === 'youtube')
    {
      return 'video';
    }
    if (normalized.indexOf('pdf') !== -1)
    {
      return 'pdf';
    }
    if (normalized.indexOf('video') !== -1 || normalized.indexOf('movie') !== -1 || normalized.indexOf('動画') !== -1)
    {
      return 'video';
    }
    if (
      normalized.indexOf('audio') !== -1 ||
      normalized.indexOf('music') !== -1 ||
      normalized.indexOf('sound') !== -1 ||
      normalized.indexOf('音声') !== -1
    )
    {
      return 'audio';
    }
    if (
      normalized.indexOf('image') !== -1 ||
      normalized.indexOf('photo') !== -1 ||
      normalized.indexOf('picture') !== -1 ||
      normalized.indexOf('画像') !== -1 ||
      normalized.indexOf('写真') !== -1
    )
    {
      return 'image';
    }
    if (
      normalized.indexOf('doc') !== -1 ||
      normalized.indexOf('file') !== -1 ||
      normalized.indexOf('資料') !== -1
    )
    {
      return 'file';
    }
    return '';
  }

  function detectGuidanceTypeFromExtension(fileName)
  {
    if (!fileName)
    {
      return '';
    }
    var match = String(fileName).trim().toLowerCase().match(/\.([a-z0-9]+)$/);
    if (!match)
    {
      return '';
    }
    var ext = match[1];
    if (VIDEO_FILE_EXTENSIONS.indexOf(ext) !== -1)
    {
      return 'video';
    }
    if (IMAGE_FILE_EXTENSIONS.indexOf(ext) !== -1)
    {
      return 'image';
    }
    if (AUDIO_FILE_EXTENSIONS.indexOf(ext) !== -1)
    {
      return 'audio';
    }
    if (ext === 'pdf')
    {
      return 'pdf';
    }
    if (ext === 'txt' || ext === 'csv' || ext === 'doc' || ext === 'docx' || ext === 'ppt' || ext === 'pptx' || ext === 'xls' || ext === 'xlsx')
    {
      return 'file';
    }
    return '';
  }

  function detectGuidanceTypeFromUrl(url)
  {
    if (!url)
    {
      return '';
    }
    var normalized = String(url).trim().toLowerCase();
    if (!normalized)
    {
      return '';
    }
    if (normalized.indexOf('youtube.com') !== -1 || normalized.indexOf('youtu.be') !== -1)
    {
      return 'video';
    }
    var urlWithoutQuery = normalized.split('?')[0].split('#')[0];
    var extMatch = urlWithoutQuery.match(/\.([a-z0-9]+)$/);
    if (extMatch)
    {
      return detectGuidanceTypeFromExtension(extMatch[0]);
    }
    return '';
  }

  function isImageUrl(url)
  {
    if (!url)
    {
      return false;
    }
    var normalized = String(url).trim().toLowerCase();
    if (!normalized)
    {
      return false;
    }
    var sanitized = normalized.split('?')[0];
    var match = sanitized.match(/\.([a-z0-9]+)$/);
    if (!match)
    {
      return false;
    }
    var ext = match[1];
    return IMAGE_FILE_EXTENSIONS.indexOf(ext) !== -1;
  }

  function createDefinitionList(items)
  {
    var dl = document.createElement('dl');
    dl.className = 'target-detail__definition';
    items.forEach(function (item)
    {
      var dt = document.createElement('dt');
      dt.textContent = item.term;
      var dd = document.createElement('dd');
      var description = item.description;
      if (description && window.Node && description instanceof window.Node)
      {
        dd.appendChild(description);
      }
      else if (Array.isArray(description))
      {
        if (!description.length)
        {
          dd.textContent = '—';
        }
        else
        {
          description.forEach(function (entry)
          {
            if (entry && window.Node && entry instanceof window.Node)
            {
              dd.appendChild(entry);
              return;
            }
            var span = document.createElement('span');
            span.textContent = entry;
            dd.appendChild(span);
          });
        }
      }
      else
      {
        dd.textContent = description || '—';
      }
      dl.appendChild(dt);
      dl.appendChild(dd);
    });
    return dl;
  }

  function formatAssignment(displayName, code)
  {
    var name = displayName ? String(displayName).trim() : '';
    var userCode = code ? String(code).trim() : '';
    if (name && userCode)
    {
      return name + '（' + userCode + '）';
    }
    if (name)
    {
      return name;
    }
    if (userCode)
    {
      return userCode;
    }
    return '—';
  }

  function formatNumber(value)
  {
    if (!formatNumber.formatter)
    {
      formatNumber.formatter = new window.Intl.NumberFormat('ja-JP');
    }
    return formatNumber.formatter.format(value);
  }

  function normalizeAudienceScope(value)
  {
    if (value === undefined || value === null)
    {
      return AUDIENCE_SCOPE.USERS;
    }
    var normalized = String(value).trim().toLowerCase();
    if (normalized === AUDIENCE_SCOPE.ALL || normalized === 'everyone')
    {
      return AUDIENCE_SCOPE.ALL;
    }
    return AUDIENCE_SCOPE.USERS;
  }

  function deriveInitial(text)
  {
    var normalized = text ? String(text).trim() : '';
    return normalized ? normalized.charAt(0) : '—';
  }

  function escapeForSvg(text)
  {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function createInitialAvatarDataUrl(initialText, size)
  {
    var normalizedInitial = deriveInitial(initialText || '') || '?';
    var letter = normalizedInitial === '—' ? '?' : normalizedInitial;
    var dimension = Math.max(24, Math.min(96, Number(size) || 44));
    var fontSize = Math.round(dimension * 0.52);
    var svg = '' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + dimension + '" height="' + dimension + '" viewBox="0 0 ' + dimension + ' ' + dimension + '" role="img" aria-hidden="true">' +
      '<rect width="' + dimension + '" height="' + dimension + '" rx="' + Math.round(dimension / 2) + '" fill="#142034" />' +
      '<text x="50%" y="54%" text-anchor="middle" font-size="' + fontSize + '" fill="#ffffff" font-family="Hanken Grotesk, Noto Sans JP, sans-serif">' + escapeForSvg(letter) + '</text>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function createUserAvatarElement(options, avatarService)
  {
    var avatar = document.createElement('span');
    var className = options && options.className ? String(options.className).trim() : '';
    avatar.className = className || 'target-detail__overview-user-avatar';
    var userCode = options && options.userCode ? String(options.userCode).trim() : '';
    var displayName = options && options.displayName ? String(options.displayName).trim() : '';
    var fallbackLabel = options && options.fallbackLabel ? String(options.fallbackLabel).trim() : '';
    var label = displayName || fallbackLabel || userCode || '';
    var avatarUrl = options && options.avatarUrl ? String(options.avatarUrl).trim() : '';
    var altText = options && options.alt ? String(options.alt).trim() : '';
    var transform = options && options.transform ? String(options.transform) : '';
    var size = options && options.size ? Number(options.size) : 44;
    var normalizedSize = Math.max(24, Math.min(96, size || 44));
    var shape = options && options.shape ? String(options.shape).trim() : 'circle';
    var initial = options && options.initial ? String(options.initial).trim() : '';
    var fallbackClass = options && options.fallbackClass ? String(options.fallbackClass).trim() : '';
    var nameOverlay = Boolean(options && options.nameOverlay);
    var isActive = !(options && options.isActive === false);
    avatar.dataset.userCode = userCode || '';
    avatar.setAttribute('data-overview-avatar', 'true');
    avatar.dataset.avatarSize = String(normalizedSize);
    avatar.dataset.avatarShape = shape;
    avatar.dataset.avatarName = label || userCode || '';
    avatar.dataset.avatarAlt = altText || label || userCode || '';
    avatar.dataset.userActive = isActive ? 'true' : 'false';
    if (avatarUrl) {
      avatar.dataset.avatarSrc = avatarUrl;
    }
    if (transform) {
      avatar.dataset.avatarTransform = transform;
    }
    if (avatarService) {
      var data = {
        name: avatar.dataset.avatarName,
        alt: avatar.dataset.avatarAlt,
        isActive: isActive
      };
      if (avatar.dataset.avatarSrc) {
        data.src = avatar.dataset.avatarSrc;
      }
      try {
        var node = avatarService.render(avatar, data, {
          size: normalizedSize,
          shape: shape,
          nameOverlay: nameOverlay,
          initialsFallback: true
        });
        avatar.classList.toggle('has-avatar', Boolean(avatar.dataset.avatarSrc));
        if (node && transform) {
          var img = node.querySelector('img');
          if (img) {
            img.style.transform = transform;
          }
        }
        if (node && userCode) {
          node.setAttribute('data-user-code', userCode);
        }
        return avatar;
      } catch (error) {
        if (options && typeof options.onError === 'function') {
          options.onError(error);
        } else if (window.console && typeof window.console.warn === 'function') {
          window.console.warn('[target-detail] failed to render avatar', error);
        }
      }
    }
    var fallback = document.createElement('span');
    fallback.className = fallbackClass || 'target-detail__overview-user-initial';
    var initialText = initial || deriveInitial(label || userCode || '');
    fallback.textContent = initialText || '—';
    avatar.appendChild(fallback);
    return avatar;
  }

  function resolveAvatarField(user, field)
  {
    if (!user || !field)
    {
      return '';
    }
    if (user[field])
    {
      return user[field];
    }
    var avatar = user.avatar || {};
    if (!avatar)
    {
      return '';
    }
    if (avatar[field])
    {
      return avatar[field];
    }
    if (typeof field === 'string' && field.indexOf('avatar') === 0)
    {
      var shorthand = field.replace(/^avatar/, '');
      if (shorthand)
      {
        var normalized = shorthand.charAt(0).toLowerCase() + shorthand.slice(1);
        if (avatar[normalized])
        {
          return avatar[normalized];
        }
      }
    }
    return '';
  }

    function extractAvatarUrlFromObject(candidate)
    {
      if (!candidate || typeof candidate !== 'object')
      {
        return '';
      }
      var keys = ['src', 'url', 'href', 'image', 'imageUrl', 'imageURL', 'avatar', 'avatarUrl', 'avatarURL', 'photo', 'photoUrl', 'photoURL'];
      for (var i = 0; i < keys.length; i += 1)
      {
        var key = keys[i];
        if (!Object.prototype.hasOwnProperty.call(candidate, key))
        {
          continue;
        }
        var value = candidate[key];
        if (typeof value === 'string' && value.trim())
        {
          return value;
        }
      }
      return '';
    }

    function resolveGoalTargetAvatarUrl(user)
    {
      if (!user || typeof user !== 'object')
      {
        return '';
      }
      var scalarCandidates = [
        user.src,
        user.url,
        user.href,
        user.avatarUrl,
        user.avatarURL,
        user.photoUrl,
        user.photoURL,
        user.imageUrl,
        user.imageURL
      ];
      for (var i = 0; i < scalarCandidates.length; i += 1)
      {
        var scalar = scalarCandidates[i];
        if (typeof scalar === 'string' && scalar.trim())
        {
          return scalar;
        }
      }

      var avatarCandidates = [
        user.avatar,
        user.profileAvatar,
        user.userAvatar,
        user.userPhoto,
        user.userImage
      ];
      for (var j = 0; j < avatarCandidates.length; j += 1)
      {
        var extracted = extractAvatarUrlFromObject(avatarCandidates[j]);
        if (extracted)
        {
          return extracted;
        }
      }

      return resolveAvatarField(user, 'avatarUrl');
    }

    function normalizeGoalTargetUsers(users)
    {
      if (!Array.isArray(users))
      {
        return [];
      }
      return users.map(function (user)
      {
        if (!user)
        {
          return null;
        }
        var displayName = user.displayName || user.name || user.userCode || user.code || '';
        var userCode = user.userCode || user.code || '';
        var role = user.roleLabel || user.roleName || user.role || user.assignmentRole || '';
        var normalized = { name: displayName || '' };
        if (userCode)
        {
          normalized.code = userCode;
        }
        if (role)
        {
          normalized.role = role;
        }
        var avatarUrl = resolveGoalTargetAvatarUrl(user);
        if (avatarUrl)
        {
          normalized.avatarUrl = avatarUrl;
          normalized.src = avatarUrl;
        }
        if (user.avatarAlt)
        {
          normalized.avatarAlt = user.avatarAlt;
        }
        if (user.avatarInitial)
        {
          normalized.avatarInitial = user.avatarInitial;
        }
        return normalized;
      }).filter(Boolean);
    }

  function createCreatorAvatar(target, fallbackLabel, avatarService)
  {
    var creatorCode = target && (target.createdByUserCode || target.ownerUserCode)
      ? String(target.createdByUserCode || target.ownerUserCode).trim()
      : '';
    var displayLabel = fallbackLabel ? String(fallbackLabel).trim() : '';
    var avatarUrl = target && target.createdByAvatarUrl ? String(target.createdByAvatarUrl).trim() : '';
    var altText = target && target.createdByAvatarAlt ? String(target.createdByAvatarAlt).trim() : '';
    var transform = target && target.createdByAvatarTransform ? String(target.createdByAvatarTransform) : '';
    var initial = target && target.createdByAvatarInitial ? String(target.createdByAvatarInitial).trim() : '';
    return createUserAvatarElement({
      className: 'target-detail__owner-avatar',
      fallbackClass: 'target-detail__owner-avatar-initial',
      userCode: creatorCode,
      displayName: displayLabel || creatorCode,
      fallbackLabel: displayLabel || creatorCode,
      avatarUrl: avatarUrl,
      alt: altText,
      transform: transform,
      size: 44,
      shape: 'circle',
      initial: initial,
      nameOverlay: true,
      onError: function (error) {
        window.console.warn('[target-detail] failed to render creator avatar via service', error);
      }
    }, avatarService);
  }

  function applyOverviewUserMetadata(element, metadata)
  {
    if (!element)
    {
      return null;
    }
    var meta = metadata || {};
    var name = meta.name || meta.displayName || '';
    var code = meta.code || meta.userCode || '';
    var role = meta.role || meta.userRole || '';
    var title = meta.title || meta.position || '';
    var contact = meta.contact || meta.email || '';
    var detail = meta.detail || meta.description || '';
    if (name)
    {
      element.dataset.userName = name;
    }
    else if (code && !element.dataset.userName)
    {
      element.dataset.userName = code;
    }
    if (code)
    {
      element.dataset.userCode = code;
    }
    if (role)
    {
      element.dataset.userRole = role;
    }
    if (title)
    {
      element.dataset.userTitle = title;
    }
    if (contact)
    {
      element.dataset.userContact = contact;
    }
    if (detail)
    {
      element.dataset.userDetail = detail;
    }
    element.classList.add('target-detail__overview-user-anchor');
    element.setAttribute('data-overview-user-anchor', 'true');
    element.setAttribute('aria-haspopup', 'true');
    element.setAttribute('role', 'button');
    element.tabIndex = 0;
    var labelParts = [];
    if (meta.prefix)
    {
      labelParts.push(meta.prefix);
    }
    var labelValue = name || code || '';
    if (labelValue)
    {
      labelParts.push(labelValue);
    }
    element.setAttribute('aria-label', labelParts.join('：') || 'ユーザー情報');
    return element;
  }

  var agreementFieldId = 0;
  var goalFieldId = 0;

  function createAgreementField(labelText, element, options)
  {
    agreementFieldId += 1;
    var fieldId = 'target-agreement-field-' + agreementFieldId;
    element.id = fieldId;
    element.name = element.name || fieldId;
    var wrapper = document.createElement('div');
    wrapper.className = 'target-agreements__form-field' + (options && options.half ? ' target-agreements__form-field--half' : '');
    var label = document.createElement('label');
    label.className = 'target-agreements__label';
    label.setAttribute('for', fieldId);
    label.textContent = labelText;
    wrapper.appendChild(label);
    wrapper.appendChild(element);
    return wrapper;
  }

  function createGoalField(labelText, element, options)
  {
    goalFieldId += 1;
    var fieldId = 'target-goal-field-' + goalFieldId;
    element.id = fieldId;
    element.name = element.name || fieldId;
    var wrapper = document.createElement('div');
    wrapper.className = 'target-goals__form-field' + (options && options.half ? ' target-goals__form-field--half' : '');
    var label = document.createElement('label');
    label.className = 'target-goals__label';
    label.setAttribute('for', fieldId);
    label.textContent = labelText;
    wrapper.appendChild(label);
    wrapper.appendChild(element);
    return wrapper;
  }

  function createAgreementTypeLabel(type)
  {
    var span = document.createElement('span');
    span.className = 'target-agreements__type-label';
    span.textContent = type || '—';
    return span;
  }

  function createScreenModalShell(options)
  {
    var modal = document.createElement('div');
    modal.className = 'screen-modal' + (options && options.containerClass ? ' ' + options.containerClass : '');
    modal.setAttribute('hidden', 'hidden');
    modal.setAttribute('aria-hidden', 'true');

    var overlay = document.createElement('div');
    overlay.className = 'screen-modal__overlay';
    modal.appendChild(overlay);

    var dialog = document.createElement('section');
    dialog.className = 'screen-modal__content' + (options && options.contentClass ? ' ' + options.contentClass : '');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    if (options && options.titleId)
    {
      dialog.setAttribute('aria-labelledby', options.titleId);
    }
    if (options && options.summaryId)
    {
      dialog.setAttribute('aria-describedby', options.summaryId);
    }
    modal.appendChild(dialog);

    var closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'screen-modal__close';
    closeButton.setAttribute('aria-label', (options && options.closeLabel) || 'モーダルを閉じる');
    closeButton.textContent = '×';
    dialog.appendChild(closeButton);

    var header = document.createElement('header');
    header.className = 'screen-modal__header';
    var title = document.createElement('h2');
    title.className = 'screen-modal__title';
    if (options && options.titleId)
    {
      title.id = options.titleId;
    }
    title.textContent = (options && options.title) || '';
    header.appendChild(title);
    var summary = null;
    if (options && options.summary)
    {
      summary = document.createElement('p');
      summary.className = 'screen-modal__summary';
      if (options.summaryId)
      {
        summary.id = options.summaryId;
        dialog.setAttribute('aria-describedby', options.summaryId);
      }
      summary.textContent = options.summary;
      header.appendChild(summary);
    }
    dialog.appendChild(header);

    var body = document.createElement('div');
    body.className = 'screen-modal__body';
    dialog.appendChild(body);

    document.body.appendChild(modal);
    return {
      root: modal,
      overlay: overlay,
      dialog: dialog,
      closeButton: closeButton,
      header: header,
      title: title,
      summary: summary,
      body: body
    };
  }

  function bindModalCloseHandlers(shell, closeHandler)
  {
    if (!shell || typeof closeHandler !== 'function')
    {
      return;
    }
    var onEsc = function (event)
    {
      var key = event.key || event.keyCode;
      if (key === 'Escape' || key === 'Esc' || key === 27)
      {
        event.preventDefault();
        closeHandler();
      }
    };
    shell.overlay.addEventListener('click', function (event)
    {
      event.preventDefault();
      closeHandler();
    });
    shell.closeButton.addEventListener('click', function (event)
    {
      event.preventDefault();
      closeHandler();
    });
    shell.root.addEventListener('keydown', function (event)
    {
      onEsc(event);
    });
    shell.documentEscHandler = function (event)
    {
      if (event && event.defaultPrevented)
      {
        return;
      }
      onEsc(event);
    };
  }

  function resolveContentTypeLabel(type)
  {
    var normalized = type ? String(type).trim().toLowerCase() : '';
    if (normalized.indexOf('pdf') !== -1)
    {
      return CONTENT_TYPE_LABELS.pdf;
    }
    if (normalized && CONTENT_TYPE_LABELS[normalized])
    {
      return CONTENT_TYPE_LABELS[normalized];
    }
    return CONTENT_TYPE_LABELS.file;
  }

  function deriveAudienceUserKey(user)
  {
    if (!user)
    {
      return '';
    }
    var code = user.userCode || '';
    var name = user.displayName || '';
    return (code || name).toLowerCase();
  }

  class TargetDetailBasicInfo
  {
    constructor(pageInstance)
    {
      this.page = pageInstance;
      this.helpers = pageInstance.helpers || {};
      this.basicConfirmationView = null;
      this.agreementsView = null;
      this.agreementsData = [];
      this.goalsView = null;
      this.goalsData = [];
      this.basicPanel = null;
      this.modals = Object.create(null);
      this.buttonService = null;
      this.avatarService = pageInstance && pageInstance.avatarService ? pageInstance.avatarService : null;
      this.userlistAvatarService = pageInstance && pageInstance.userlistAvatarService ? pageInstance.userlistAvatarService : null;
      this.guidanceUploaderService = null;
      this.pendingGuidanceUploadResults = [];
      this.guidanceP5Promise = null;
      this.guidanceUploadOwnerUserCode = '';
    }

    canManageContent()
    {
      return this.page && typeof this.page.canManageTargetContent === 'function'
        && this.page.canManageTargetContent();
    }

    async render()
    {
      var target = this.page.state.target;
      if (!target)
      {
        return;
      }
      this.renderLayout(target);
    }

    renderLayout(target)
    {
      var container = this.page.refs.container;
      if (!container)
      {
        return;
      }
      container.innerHTML = '';

      var article = document.createElement('article');
      article.className = 'target-detail__article';

      article.appendChild(this.renderHeader(target));
      var tabs = this.renderTabs(target);
      article.appendChild(tabs.container);

      container.appendChild(article);
      this.page.registerTabNav(tabs.nav);
    }

    renderHeader(target)
    {
      var helpers = this.helpers;
      var header = document.createElement('header');
      header.className = 'target-detail__header';

      var titleRow = document.createElement('div');
      titleRow.className = 'target-detail__title-row';
      var title = document.createElement('h1');
      title.className = 'target-detail__title';
      title.textContent = target.title || 'ターゲット詳細';
      titleRow.appendChild(title);
      header.appendChild(titleRow);
      return header;
    }

    renderTabs()
    {
      var self = this;
      var tabsContainer = document.createElement('div');
      tabsContainer.className = 'target-detail__tabs';

      var tabList = document.createElement('div');
      tabList.className = 'target-detail__tab-list';
      tabList.setAttribute('role', 'tablist');

      var panels = document.createElement('div');
      panels.className = 'target-detail__tab-panels';

      var availableTabs = this.page.getAvailableTabs ? this.page.getAvailableTabs() : TAB_DEFINITIONS.map(function (tab)
      {
        return tab.id;
      });
      var definitions = TAB_DEFINITIONS.filter(function (tab)
      {
        return availableTabs.indexOf(tab.id) !== -1;
      });
      var tabIds = definitions.map(function (tab)
      {
        return tab.id;
      });
      if (!definitions.length)
      {
        definitions = TAB_DEFINITIONS.slice();
        tabIds = definitions.map(function (tab)
        {
          return tab.id;
        });
      }
      var initialTab = this.page.state.activeTab;
      var activeId = tabIds.indexOf(initialTab) >= 0 ? initialTab : 'basic';

      definitions.forEach((tab) =>
      {
        var buttonId = 'target-detail-tab-' + tab.id;
        var panelId = buttonId + '-panel';
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'target-detail__tab';
        button.id = buttonId;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-controls', panelId);
        button.setAttribute('data-tab-target', tab.id);
        button.textContent = tab.label;
        var isActive = tab.id === activeId;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
        button.tabIndex = isActive ? 0 : -1;
        tabList.appendChild(button);

        var panel = document.createElement('section');
        panel.className = 'target-detail__tab-panel';
        panel.id = panelId;
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', buttonId);
        panel.hidden = !isActive;

        var panelWrapper = document.createElement('div');
        panelWrapper.className = 'target-detail__tab-panel-wrapper';
        panel.appendChild(panelWrapper);
        panels.appendChild(panel);

        this.page.registerTabPanel(tab.id, panel, panelWrapper);
        if (tab.id === 'basic')
        {
          this.renderBasicPanel(panelWrapper);
        }
      });

      var tabHelp = document.createElement('div');
      tabHelp.className = 'target-detail__tab-help';
      tabHelp.setAttribute('role', 'presentation');
      var helpButton = document.createElement('button');
      helpButton.type = 'button';
      helpButton.className = 'target-detail__help-button target-detail__section-help';
      helpButton.setAttribute('aria-label', '現在のタブの説明を表示');
      helpButton.setAttribute('aria-haspopup', 'dialog');
      helpButton.setAttribute('aria-controls', 'target-detail-help-modal');
      helpButton.setAttribute('aria-expanded', 'false');
      helpButton.textContent = '?';
      helpButton.addEventListener('click', function (event)
      {
        event.preventDefault();
        if (typeof self.page.openPageHelp === 'function')
        {
          var trigger = event && event.currentTarget ? event.currentTarget : helpButton;
          self.page.openPageHelp(trigger);
        }
      });
      tabHelp.appendChild(helpButton);
      tabList.appendChild(tabHelp);

      tabList.addEventListener('keydown', function (event)
      {
        if (!event || event.key !== 'Tab')
        {
          return;
        }
        var activeElement = document.activeElement;
        if (!activeElement || !activeElement.hasAttribute('data-tab-target'))
        {
          return;
        }

        var buttons = tabList.querySelectorAll('[data-tab-target]');
        var currentIndex = -1;
        for (var i = 0; i < buttons.length; i += 1)
        {
          if (buttons[i] === activeElement)
          {
            currentIndex = i;
            break;
          }
        }
        if (currentIndex === -1)
        {
          return;
        }

        event.preventDefault();
        var direction = event.shiftKey ? -1 : 1;
        var nextIndex = (currentIndex + direction + buttons.length) % buttons.length;
        var nextButton = buttons[nextIndex];
        var targetId = nextButton.getAttribute('data-tab-target');
        self.page.activateTab(targetId);
        try
        {
          nextButton.focus({ preventScroll: true });
        }
        catch (error)
        {
          nextButton.focus();
        }
      });

      tabsContainer.appendChild(tabList);
      tabsContainer.appendChild(panels);

      return { container: tabsContainer, nav: tabList };
    }

    renderBasicPanel(panel)
    {
      if (!panel)
      {
        return;
      }
      this.basicPanel = panel;
      var target = this.page.state.target || {};
      panel.innerHTML = '';

      var body = document.createElement('div');
      body.className = 'target-detail__body';

      var overviewCard = this.renderOverviewCard(target);
      if (overviewCard)
      {
        body.appendChild(overviewCard);
      }

      var agreementsSection = this.renderAgreementsSection(target);
      if (agreementsSection && this.page.shouldDisplaySection('agreements'))
      {
        body.appendChild(agreementsSection);
      }

      var confirmationCard = this.renderBasicConfirmationCard(target);
      if (confirmationCard)
      {
        body.appendChild(confirmationCard);
      }

      panel.appendChild(body);
    }

    renderOverviewCard(target)
    {
      var card = document.createElement('section');
      card.className = 'target-detail__card target-detail__card--overview';
      var header = document.createElement('div');
      header.className = 'target-detail__section-header';
      var title = document.createElement('h2');
      title.textContent = '概要';
      header.appendChild(title);
      if (this.canManageContent())
      {
        var actions = document.createElement('div');
        actions.className = 'target-detail__section-help';
        var editButton = this.createIconActionButton('edit', '概要を編集', 'edit-overview', !(target && target.targetCode));
        var self = this;
        editButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.openOverviewModal();
        });
        actions.appendChild(editButton);
        header.appendChild(actions);
      }
      card.appendChild(header);

      var content = document.createElement('div');
      content.className = 'target-detail__overview-columns';
      this.applyOverviewBackground(content, target);

      var primaryColumn = document.createElement('div');
      primaryColumn.className = 'target-detail__overview-column target-detail__overview-column--primary';
      var description = document.createElement('p');
      description.className = 'target-detail__description';
      description.textContent = target.description || '詳細説明は登録されていません。';
      primaryColumn.appendChild(description);

      var statusBadge = this.createStatusBadgeElement(target);
      var creatorOverview = this.buildOverviewCreatorIdentity(target);
      primaryColumn.appendChild(createDefinitionList([
        { term: '作成者', description: creatorOverview },
        { term: 'ステータス', description: statusBadge }
      ]));

      primaryColumn.appendChild(createDefinitionList([
        { term: '期限', description: target.dueDateDisplay || '—' },
        { term: '最終更新', description: target.updatedAtDisplay || '—' },
        { term: '作成日時', description: target.createdAtDisplay || '—' }
      ]));

      content.appendChild(primaryColumn);

      var secondaryColumn = document.createElement('div');
      secondaryColumn.className = 'target-detail__overview-column target-detail__overview-column--audience';
      var audienceSection = this.renderOverviewAudienceSection(target);
      if (audienceSection)
      {
        secondaryColumn.appendChild(audienceSection);
      }
      content.appendChild(secondaryColumn);

      card.appendChild(content);

      var guidanceSection = this.renderGuidanceContents(target);
      if (guidanceSection && this.page.shouldDisplaySection('guidance'))
      {
        card.appendChild(guidanceSection);
      }
      var goalsSection = this.renderGoalsSection(target);
      if (goalsSection && this.page.shouldDisplaySection('goals'))
      {
        card.appendChild(goalsSection);
      }
      this.bindOverviewUserPopovers(card);
      return card;
    }

    applyOverviewBackground(container, target)
    {
      if (!container)
      {
        return;
      }
      var imageUrl = this.buildOverviewBackgroundUrl(target);
      if (!imageUrl)
      {
        container.classList.remove('target-detail__overview-columns--with-image');
        container.style.removeProperty('--target-detail-overview-image');
        return;
      }
      container.classList.add('target-detail__overview-columns--with-image');
      container.style.setProperty('--target-detail-overview-image', 'url("' + imageUrl.replace(/"/g, '\\"') + '")');
    }

    buildOverviewBackgroundUrl(target)
    {
      if (!target)
      {
        return '';
      }
      return normalizeText(
        target.imageUrl
        || target.imageURL
        || target.image
        || target.coverImage
        || target.coverImageUrl
        || target.coverImageURL
        || target.thumbnailUrl
        || target.thumbnailURL
        || target.imageFile
        || ''
      );
    }

    renderGuidanceContents(target)
    {
      var items = Array.isArray(target && target.guidanceContents)
        ? target.guidanceContents.filter(Boolean)
        : [];
      var normalizedItems = [];
      var self = this;
      items.forEach(function (entry, index)
      {
        var normalized = self.normalizeGuidanceItem(entry, index);
        if (!normalized)
        {
          return;
        }
        normalizedItems.push(normalized);
      });
      var canManage = this.canManageContent() && Boolean(target && target.targetCode);

      var section = document.createElement('section');
      section.className = 'target-detail__guidance target-detail__section-block';

      var headingRow = document.createElement('div');
      headingRow.className = 'target-detail__guidance-actions';

      var heading = document.createElement('h3');
      heading.className = 'target-detail__guidance-title';
      heading.textContent = 'ガイダンスコンテンツ';
      headingRow.appendChild(heading);

      if (canManage)
      {
        var actions = document.createElement('div');
        actions.className = 'target-detail__guidance-action-buttons';

        var addButton = this.createBannerButton('ガイダンスコンテンツの追加', 'add-guidance', {
          baseClass: 'target-management__icon-button target-management__icon-button--primary target-detail__guidance-add-button',
          buttonType: 'expandable-icon-button/add'
        }, COMPACT_BANNER_CLASS);
        addButton.classList.add('target-detail__guidance-add-button');
        addButton.disabled = !(target && target.targetCode);
        addButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.openGuidanceModal();
        });

        actions.appendChild(addButton);
        headingRow.appendChild(actions);
      }

      section.appendChild(headingRow);

      var emptyMessage = document.createElement('p');
      emptyMessage.className = 'target-detail__guidance-empty';
      emptyMessage.textContent = 'ガイダンスコンテンツは登録されていません。';
      emptyMessage.hidden = normalizedItems.length > 0;
      section.appendChild(emptyMessage);

      var list = document.createElement('ul');
      list.className = 'target-detail__guidance-list';
      list.hidden = !normalizedItems.length;
      normalizedItems.forEach(function (entry)
      {
        list.appendChild(self.buildGuidanceListItem(entry, canManage));
      });
      section.appendChild(list);
      return section;
    }

    buildGuidanceListItem(item, canManage)
    {
      var entry = item || {};
      var listItem = document.createElement('li');
      listItem.className = 'target-detail__guidance-item';
      var self = this;
      var sourceEntry = entry.source || null;

      var card = document.createElement('article');
      card.className = 'target-detail__guidance-card';

      var preview = this.buildGuidanceThumbnail(entry);
      if (preview)
      {
        card.appendChild(preview);
      }

      var meta = document.createElement('div');
      meta.className = 'content-item__meta target-detail__guidance-meta';

      var metaBody = document.createElement('div');
      metaBody.className = 'target-detail__guidance-meta-body';

      var descriptionText = entry && entry.description ? entry.description : '';
      var title = null;
      if (descriptionText)
      {
        title = document.createElement('h4');
        title.className = 'content-item__title target-detail__guidance-name';
        title.textContent = descriptionText;
        metaBody.appendChild(title);
      }

      var ownerRow = document.createElement('div');
      ownerRow.className = 'target-detail__guidance-owner-row';

      var ownerLabel = entry.ownerDisplayName || entry.ownerUserCode || '';
      if (ownerLabel)
      {
        var owner = document.createElement('p');
        owner.className = 'content-item__description target-detail__guidance-owner-inline';

        var ownerAvatar = createUserAvatarElement(
          {
            className: 'target-detail__guidance-avatar',
            displayName: ownerLabel,
            userCode: entry && entry.ownerUserCode ? String(entry.ownerUserCode).trim() : '',
            avatarUrl: entry && entry.ownerAvatarUrl ? entry.ownerAvatarUrl : '',
            transform: entry && entry.ownerAvatarTransform ? entry.ownerAvatarTransform : '',
            fallbackLabel: ownerLabel,
            size: 32
          },
          this.getAvatarService()
        );
        owner.appendChild(ownerAvatar);

        var ownerName = document.createElement('span');
        ownerName.className = 'target-detail__guidance-owner-name';
        ownerName.textContent = ownerLabel;
        owner.appendChild(ownerName);

        ownerRow.appendChild(owner);
      }

      var actionContainer = this.buildGuidanceActions(null, entry, sourceEntry, canManage);
      if (actionContainer)
      {
        ownerRow.appendChild(actionContainer);
      }

      if (ownerRow.childNodes.length)
      {
        metaBody.appendChild(ownerRow);
      }

      meta.appendChild(metaBody);

      card.appendChild(meta);
      listItem.appendChild(card);

      return listItem;
    }

    buildGuidanceActions(container, entry, sourceEntry, canManage)
    {
      var actions = container || document.createElement('div');
      if (!container)
      {
        actions.className = 'content-item__actions target-detail__guidance-item-actions';
      }

      var self = this;
      var previewType = this.resolveGuidancePreviewType(entry);
      var previewableTypes = { video: true, image: true, pdf: true, audio: true };
      if (previewableTypes[previewType])
      {
        var previewButton = this.createIconActionButton('detail', 'プレビュー', 'preview-guidance');
        previewButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.handleGuidancePreview(entry, previewType);
        });
        actions.appendChild(previewButton);
      }
      else
      {
        var downloadTarget = this.buildGuidancePreviewTarget(entry);
        var downloadButton = this.createIconActionButton('download', 'ダウンロード', 'download-guidance', !downloadTarget);
        if (downloadTarget)
        {
          downloadButton.addEventListener('click', function (event)
          {
            event.preventDefault();
            self.handleGuidanceDownload(entry);
          });
        }
        actions.appendChild(downloadButton);
      }

      if (canManage)
      {
        var editButton = this.createIconActionButton('edit', 'ガイダンスを編集', 'edit-guidance');
        editButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.openGuidanceModal(sourceEntry);
        });
        actions.appendChild(editButton);

        var deleteButton = this.createIconActionButton('delete', 'ガイダンスを削除', 'delete-guidance');
        deleteButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.handleGuidanceDelete(sourceEntry);
        });
        actions.appendChild(deleteButton);
      }

      return actions;
    }

    buildGuidanceThumbnail(entry)
    {
      var previewType = this.resolveGuidancePreviewType(entry) || 'file';
      var allowThumbnailFetch = previewType !== 'file' && previewType !== 'pdf';
      var thumbnailUrl = allowThumbnailFetch ? this.resolveGuidanceThumbnailUrl(entry) : '';
      // thumbnailUrl should point to a static thumbnail (e.g., previewImage Base64) and is preferred over previewable targets.
      var previewTarget = allowThumbnailFetch ? (thumbnailUrl || (entry && entry.previewUrl) || this.buildGuidancePreviewTarget(entry)) : '';
      var wrapper = document.createElement('div');
      wrapper.className = 'target-detail__guidance-thumb';

      var media = document.createElement('div');
      media.className = 'target-detail__guidance-thumb-media';

      var useImagePreview = allowThumbnailFetch && Boolean(previewTarget)
        && (thumbnailUrl || previewType === 'image' || isImageUrl(previewTarget));
      if (useImagePreview)
      {
        var img = document.createElement('img');
        img.src = previewTarget;
        img.loading = 'lazy';
        img.alt = entry && entry.title ? entry.title : 'ガイダンスコンテンツ';
        media.appendChild(img);
      }
      else
      {
        var placeholder = document.createElement('div');
        placeholder.className = 'target-detail__guidance-thumb-placeholder';
        var canvasHost = document.createElement('div');
        canvasHost.className = 'target-detail__guidance-thumb-canvas';
        placeholder.appendChild(canvasHost);

        this.renderGuidanceFilePlaceholder(canvasHost, entry);
        media.appendChild(placeholder);
      }
      wrapper.appendChild(media);

      var badgeLabel = this.resolveGuidanceLabel(entry);
      if (badgeLabel)
      {
        var badgeType = previewType || 'file';
        var badge = document.createElement('span');
        badge.className = 'target-detail__guidance-type-badge target-detail__guidance-type-badge--' + badgeType;
        badge.textContent = badgeLabel;
        wrapper.appendChild(badge);
      }

      var titleOverlay = this.buildGuidanceTitleOverlay(entry);
      if (titleOverlay)
      {
        wrapper.appendChild(titleOverlay);
      }

      return wrapper;
    }

    loadGuidanceP5()
    {
      if (this.guidanceP5Promise)
      {
        return this.guidanceP5Promise;
      }

      var self = this;
      this.guidanceP5Promise = new Promise(function (resolve, reject)
      {
        if (window.p5)
        {
          resolve(window.p5);
          return;
        }

        var candidates = [
          'https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js',
          'https://unpkg.com/p5@1.9.0/lib/p5.min.js'
        ];

        (function tryNext(index)
        {
          if (index >= candidates.length)
          {
            self.guidanceP5Promise = null;
            reject(new Error('[target-detail] failed to load p5.js for guidance thumbnail'));
            return;
          }

          var script = document.createElement('script');
          script.src = candidates[index];
          script.async = false;
          script.onload = function ()
          {
            if (window.p5)
            {
              resolve(window.p5);
              return;
            }
            tryNext(index + 1);
          };
          script.onerror = function ()
          {
            tryNext(index + 1);
          };
          document.head.appendChild(script);
        })(0);
      });

      return this.guidanceP5Promise;
    }

    resolveGuidancePlaceholderPalette(entry)
    {
      var previewType = this.resolveGuidancePreviewType(entry) || 'file';
      var paletteMap = {
        video: {
          backgroundStart: 'rgba(12, 28, 56, 0.95)',
          backgroundEnd: 'rgba(5, 12, 26, 0.9)',
          card: 'rgba(9, 19, 36, 0.92)',
          accentLayer: 'rgba(59, 130, 246, 0.25)',
          fold: 'rgba(96, 165, 250, 0.95)',
          lines: 'rgba(226, 232, 240, 0.9)'
        },
        image: {
          backgroundStart: 'rgba(8, 36, 32, 0.95)',
          backgroundEnd: 'rgba(6, 20, 30, 0.9)',
          card: 'rgba(8, 26, 26, 0.9)',
          accentLayer: 'rgba(45, 212, 191, 0.22)',
          fold: 'rgba(34, 197, 94, 0.92)',
          lines: 'rgba(209, 250, 229, 0.92)'
        },
        pdf: {
          backgroundStart: 'rgba(46, 20, 28, 0.92)',
          backgroundEnd: 'rgba(24, 10, 18, 0.9)',
          card: 'rgba(34, 12, 20, 0.88)',
          accentLayer: 'rgba(248, 113, 113, 0.22)',
          fold: 'rgba(248, 113, 113, 0.95)',
          lines: 'rgba(254, 226, 226, 0.92)'
        },
        audio: {
          backgroundStart: 'rgba(20, 24, 54, 0.92)',
          backgroundEnd: 'rgba(18, 12, 38, 0.9)',
          card: 'rgba(20, 16, 42, 0.9)',
          accentLayer: 'rgba(129, 140, 248, 0.2)',
          fold: 'rgba(129, 140, 248, 0.95)',
          lines: 'rgba(224, 231, 255, 0.9)'
        },
        file: {
          backgroundStart: 'rgba(18, 38, 64, 0.95)',
          backgroundEnd: 'rgba(12, 22, 40, 0.9)',
          card: 'rgba(10, 24, 40, 0.92)',
          accentLayer: 'rgba(14, 165, 233, 0.22)',
          fold: 'rgba(56, 189, 248, 0.95)',
          lines: 'rgba(226, 232, 240, 0.9)'
        }
      };

      return paletteMap[previewType] || paletteMap.file;
    }

    renderGuidanceFilePlaceholder(host, entry)
    {
      if (!host)
      {
        return;
      }

      while (host.firstChild)
      {
        host.removeChild(host.firstChild);
      }

      var label = this.resolveGuidanceLabel(entry) || 'ファイル';
      var title = entry && entry.title ? entry.title : '';
      var previewType = this.resolveGuidancePreviewType(entry) || 'file';

      if (previewType === 'file' || previewType === 'pdf')
      {
        host.className = host.className + ' target-detail__guidance-thumb-emboss-host';

        var emboss = document.createElement('div');
        emboss.className = 'target-detail__guidance-thumb-emboss target-detail__guidance-thumb-emboss--' + previewType;

        var fold = document.createElement('span');
        fold.className = 'target-detail__guidance-thumb-emboss-corner';
        emboss.appendChild(fold);

        host.appendChild(emboss);
        return;
      }

      var palette = this.resolveGuidancePlaceholderPalette(entry);
      var self = this;
      window.requestAnimationFrame(function ()
      {
        self.loadGuidanceP5().then(function ()
        {
          var width = Math.max(host.clientWidth || 0, 320);
          var height = Math.max(host.clientHeight || 0, Math.round(width * 0.56));
          var foldSize = Math.min(width, height) * 0.12;
          var bodyWidth = width * 0.52;
          var bodyHeight = height * 0.62;
          var baseX = (width - bodyWidth) / 2;
          var baseY = (height - bodyHeight) / 2;

          var sketch = function (p)
          {
            p.setup = function ()
            {
              var canvas = p.createCanvas(width, height);
              canvas.parent(host);
              p.noLoop();
              p.pixelDensity(2);
            };

            p.draw = function ()
            {
              var ctx = p.drawingContext;
              var gradient = ctx.createLinearGradient(0, 0, width, height);
              gradient.addColorStop(0, palette.backgroundStart);
              gradient.addColorStop(1, palette.backgroundEnd);
              ctx.save();
              ctx.fillStyle = gradient;
              ctx.fillRect(0, 0, width, height);
              ctx.restore();

              p.noStroke();
              p.fill(palette.card);
              p.rect(baseX, baseY, bodyWidth, bodyHeight, 14);

              p.fill(palette.accentLayer);
              p.rect(baseX + 8, baseY + 10, bodyWidth - 16, bodyHeight - 20, 12);

              p.noStroke();
              p.fill('rgba(255, 255, 255, 0.12)');
              var iconWidth = bodyWidth * 0.38;
              var iconHeight = bodyHeight * 0.5;
              var iconX = baseX + (bodyWidth - iconWidth) / 2;
              var iconY = baseY + (bodyHeight - iconHeight) / 2 - 6;
              p.rect(iconX, iconY, iconWidth, iconHeight, 14);
              p.fill('rgba(255, 255, 255, 0.18)');
              p.beginShape();
              p.vertex(iconX + iconWidth - foldSize * 0.9, iconY);
              p.vertex(iconX + iconWidth, iconY);
              p.vertex(iconX + iconWidth, iconY + foldSize * 0.9);
              p.endShape(p.CLOSE);

              p.fill(palette.fold);
              p.beginShape();
              p.vertex(baseX + bodyWidth - foldSize, baseY);
              p.vertex(baseX + bodyWidth, baseY);
              p.vertex(baseX + bodyWidth, baseY + foldSize);
              p.endShape(p.CLOSE);

              p.stroke(palette.lines);
              p.strokeWeight(2.2);
              var lineY = baseY + foldSize + 16;
              for (var i = 0; i < 3; i += 1)
              {
                p.line(baseX + 16, lineY + i * 14, baseX + bodyWidth - 16, lineY + i * 14);
              }

              p.stroke(palette.fold);
              p.strokeWeight(3);
              p.noFill();
              p.rect(baseX + 12, baseY + bodyHeight - 52, bodyWidth - 24, 32, 10);

              p.noStroke();
              p.fill(palette.lines);
              p.textAlign(p.CENTER, p.CENTER);
              p.textStyle(p.BOLD);
              p.textSize(Math.min(18, bodyWidth * 0.18));
              p.text(label, baseX + bodyWidth / 2, baseY + bodyHeight - 34);

              if (title)
              {
                p.textSize(Math.min(14, bodyWidth * 0.14));
                p.text(title.slice(0, 18), baseX + bodyWidth / 2, baseY + bodyHeight - 14);
              }
            };
          };

          new window.p5(sketch); // eslint-disable-line no-new
        }).catch(function (error)
        {
          window.console.warn('[target-detail] failed to render guidance placeholder', error);
        });
      });
    }

    buildGuidanceTitleOverlay(entry)
    {
      var overlay = document.createElement('div');
      overlay.className = 'target-detail__guidance-title-overlay';

      var titleText = entry && entry.title ? entry.title : 'ガイダンスコンテンツ';
      var title = document.createElement('span');
      title.className = 'target-detail__guidance-title-text';
      title.textContent = titleText;
      overlay.appendChild(title);

      return overlay;
    }

    resolveGuidanceLabel(entry)
    {
      var previewType = this.resolveGuidancePreviewType(entry);
      if (previewType && CONTENT_TYPE_LABELS[previewType])
      {
        return CONTENT_TYPE_LABELS[previewType];
      }
      if (entry && entry.categoryLabel)
      {
        return entry.categoryLabel;
      }
      if (entry && entry.category)
      {
        return entry.category;
      }
      return 'コンテンツ';
    }

    handleGuidancePreview(entry, forcedType)
    {
      if (!entry)
      {
        this.showGuidancePreviewError();
        return;
      }
      var previewType = forcedType || this.resolveGuidancePreviewType(entry);
      if (previewType === 'video')
      {
        this.openGuidanceVideoPreview(entry);
        return;
      }
      if (previewType === 'image')
      {
        this.openGuidanceImagePreview(entry);
        return;
      }
      if (previewType === 'pdf')
      {
        this.openGuidancePdfPreview(entry);
        return;
      }
      if (previewType === 'audio')
      {
        this.openGuidanceAudioPreview(entry);
        return;
      }
      if (previewType === 'file')
      {
        var target = this.buildGuidancePreviewTarget(entry);
        if (target)
        {
          window.open(target, '_blank');
          return;
        }
      }
      this.showGuidancePreviewError();
    }

    async handleGuidanceDownload(entry)
    {
      var target = this.buildGuidancePreviewTarget(entry);
      if (!target)
      {
        this.showGuidanceDownloadError();
        return;
      }

      var contentCode = this.resolveGuidanceContentCode(entry);
      var isAvailable = await this.verifyGuidanceDownloadAvailability(contentCode);
      if (isAvailable)
      {
        window.open(target, '_blank');
        return;
      }

      this.showGuidanceDownloadError();
    }

    verifyGuidanceDownloadAvailability(contentCode)
    {
      var code = contentCode ? String(contentCode).trim() : '';
      if (!code)
      {
        return Promise.resolve(false);
      }

      var requestOptions = window.Utils.buildApiRequestOptions('Contents', 'ContentFileCheck', { contentCode: code }, { dataType: 'json' });

      return new Promise(function (resolve)
      {
        var xhr = new XMLHttpRequest();
        xhr.open(requestOptions.type || 'POST', requestOptions.url, true);
        if (requestOptions.headers)
        {
          Object.keys(requestOptions.headers).forEach(function (key)
          {
            xhr.setRequestHeader(key, requestOptions.headers[key]);
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
            try
            {
              var json = JSON.parse(xhr.responseText || '{}');
              if (json && json.status === 'OK' && json.result && json.result.available)
              {
                resolve(true);
                return;
              }
            }
            catch (_err)
            {
              // noop
            }
          }
          resolve(false);
        };
        xhr.send(requestOptions.data);
      });
    }

    resolveGuidancePreviewType(entry)
    {
      if (!entry)
      {
        return '';
      }
      var source = entry.source || null;
      var candidates = [entry.category, source && source.category, entry.categoryLabel, source && source.categoryLabel];
      for (var i = 0; i < candidates.length; i += 1)
      {
        var candidate = normalizeGuidanceTypeFromValue(candidates[i]);
        if (candidate)
        {
          return candidate;
        }
      }
      var contentTypes = [entry.contentType, source && source.contentType];
      for (var j = 0; j < contentTypes.length; j += 1)
      {
        var typeCandidate = normalizeGuidanceTypeFromValue(contentTypes[j]);
        if (typeCandidate)
        {
          return typeCandidate;
        }
      }
      var fileNames = [entry.fileName, source && source.fileName, entry.title, source && source.title];
      for (var k = 0; k < fileNames.length; k += 1)
      {
        var extensionType = detectGuidanceTypeFromExtension(fileNames[k]);
        if (extensionType)
        {
          return extensionType;
        }
      }
      var previewTarget = this.buildGuidancePreviewTarget(entry);
      var urlType = detectGuidanceTypeFromUrl(previewTarget);
      return urlType || 'file';
    }

    buildGuidancePreviewTarget(entry)
    {
      if (!entry)
      {
        return '';
      }

      var apiUrl = this.buildGuidanceFileUrl(entry);
      if (apiUrl)
      {
        return apiUrl;
      }

      var source = entry.source || null;
      var candidates = [
        entry.previewUrl,
        entry.linkUrl,
        entry.embedUrl,
        entry.downloadUrl,
        entry.youtubeUrl,
        entry.url,
        source && source.previewUrl,
        source && source.linkUrl,
        source && source.embedUrl,
        source && source.downloadUrl,
        source && source.youtubeUrl,
        source && source.url
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

    buildGuidanceFileUrl(entry)
    {
      var contentCode = this.resolveGuidanceContentCode(entry);
      if (!contentCode)
      {
        return '';
      }
      var record = (entry && entry.source) || entry || {};
      var contentRecord = Object.assign({}, record, { contentCode: contentCode });
      return this.buildContentFileUrl(contentRecord);
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

    resolveGuidanceContentCode(entry)
    {
      if (!entry)
      {
        return '';
      }
      var source = entry.source || null;
      var candidates = [entry.contentCode, source && source.contentCode, entry.assetCode, source && source.assetCode];
      for (var i = 0; i < candidates.length; i += 1)
      {
        var candidate = candidates[i];
        if (typeof candidate === 'string')
        {
          var trimmed = candidate.trim();
          if (trimmed)
          {
            return trimmed;
          }
        }
      }
      return '';
    }

    resolveGuidanceThumbnailUrl(entry)
    {
      var record = (entry && entry.source) || entry || {};
      var contentCode = this.resolveGuidanceContentCode(entry);
      if (contentCode)
      {
        var contentRecord = Object.assign({}, record, { contentCode: contentCode });
        var apiThumbnail = this.buildContentImageUrl(contentRecord, { variant: 'thumbnail' });
        if (apiThumbnail)
        {
          return apiThumbnail;
        }
      }
      if (entry && entry.thumbnailUrl)
      {
        return String(entry.thumbnailUrl).trim();
      }
      if (entry && entry.previewImage)
      {
        return String(entry.previewImage).trim();
      }
      if (entry && entry.previewImageUrl)
      {
        return String(entry.previewImageUrl).trim();
      }
      return '';
    }

    async openGuidanceVideoPreview(entry)
    {
      var service = this.page && this.page.videoModalService;
      if (!service)
      {
        throw new Error('[target-detail] video modal service is not available');
      }
      var title = entry && entry.title ? entry.title : '';
      var source = entry && entry.source ? entry.source : entry;
      var youtubeUrl = (entry && entry.youtubeUrl) || (source && source.youtubeUrl) || '';
      if (youtubeUrl)
      {
        service.openYouTube(youtubeUrl, { autoplay: false, title: title });
        return;
      }
      var contentCode = this.resolveGuidanceContentCode(entry);
      var fallbackUrl = this.buildGuidancePreviewTarget(entry);
      if (contentCode)
      {
        try
        {
          await service.openContentVideo({ contentCode: contentCode, title: title }, { autoplay: false });
          return;
        }
        catch (_error)
        {
          if (!fallbackUrl && !(source && source.embedUrl))
          {
            this.showGuidancePreviewError();
            return;
          }
        }
      }
      var embedUrl = (entry && entry.embedUrl) || (source && source.embedUrl) || '';
      var src = embedUrl || fallbackUrl;
      if (src)
      {
        service.openHtml5(src, { autoplay: false, title: title });
        return;
      }
      this.showGuidancePreviewError();
    }

    openGuidanceImagePreview(entry)
    {
      var service = this.page && this.page.imageModalService;
      if (!service)
      {
        throw new Error('[target-detail] image modal service is not available');
      }
      var src = this.buildGuidancePreviewTarget(entry);
      if (!src)
      {
        this.showGuidancePreviewError();
        return;
      }
      var title = entry && entry.title ? entry.title : '';
      service.show(src, { alt: title, caption: title });
    }

    async openGuidancePdfPreview(entry)
    {
      var service = this.page && this.page.pdfModalService;
      if (!service)
      {
        this.showGuidancePreviewError();
        return;
      }
      var src = this.buildGuidancePreviewTarget(entry);
      if (!src)
      {
        this.showGuidancePreviewError();
        return;
      }
      var title = (entry && entry.title) ? entry.title : (this.resolveGuidanceLabel(entry) || 'PDF');
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
      catch (_err)
      {
        this.showGuidancePreviewError();
      }
    }

    async openGuidanceAudioPreview(entry)
    {
      var service = this.page && this.page.audioModalService;
      if (!service)
      {
        this.showGuidancePreviewError();
        return;
      }
      var src = this.buildGuidancePreviewTarget(entry);
      if (!src)
      {
        this.showGuidancePreviewError();
        return;
      }
      try
      {
        service.show(src, { ariaLabel: entry && entry.title ? entry.title : this.resolveGuidanceLabel(entry) });
      }
      catch (_err)
      {
        this.showGuidancePreviewError();
      }
    }

    showGuidancePreviewError()
    {
      if (this.page && typeof this.page.showToast === 'function')
      {
        this.page.showToast('error', 'プレビューできない資料です。ダウンロードして確認してください。');
      }
    }

    showGuidanceDownloadError()
    {
      if (this.page && typeof this.page.showToast === 'function')
      {
        this.page.showToast('error', 'ダウンロードできるファイルが見つかりません。');
      }
    }

    buildOverviewCreatorIdentity(target)
    {
      var creatorName = target.createdByDisplayName || target.ownerDisplayName || target.createdByUserDisplayName || '';
      var creatorCode = target.createdByUserCode || target.ownerUserCode || '';
      if (!creatorName && !creatorCode)
      {
        return null;
      }
      var container = document.createElement('div');
      container.className = 'target-detail__overview-identity';
      var avatar = createCreatorAvatar(target, creatorName || creatorCode, this.avatarService);
      if (avatar)
      {
        avatar.classList.add('target-detail__overview-identity-avatar');
        container.appendChild(avatar);
      }
      var creatorRole = target && (target.createdByRoleLabel || target.createdByRole || target.ownerRole)
        ? target.createdByRoleLabel || target.createdByRole || target.ownerRole
        : '';
      var creatorTitle = target && (target.createdByTitle || target.ownerTitle || target.createdByPosition)
        ? target.createdByTitle || target.ownerTitle || target.createdByPosition
        : '';
      var creatorContact = target && (target.createdByContact || target.createdByEmail || target.ownerEmail)
        ? target.createdByContact || target.createdByEmail || target.ownerEmail
        : '';
      var creatorDetail = target && (target.createdByDepartment || target.ownerDepartment)
        ? target.createdByDepartment || target.ownerDepartment
        : '';
      applyOverviewUserMetadata(container, {
        prefix: '作成者',
        name: creatorName || creatorCode || '',
        code: creatorCode || '',
        role: creatorRole || '作成者',
        title: creatorTitle || '',
        contact: creatorContact || '',
        detail: creatorDetail || ''
      });
      return container;
    }

    renderOverviewAudienceSection(target)
    {
      var section = document.createElement('section');
      section.className = 'target-detail__overview-audience';
      var heading = document.createElement('h3');
      heading.className = 'target-detail__overview-audience-title';
      heading.textContent = '対象者';
      section.appendChild(heading);

      var audienceScope = normalizeAudienceScope(target && target.audienceScope);
      if (audienceScope === AUDIENCE_SCOPE.ALL)
      {
        var allAudience = document.createElement('p');
        allAudience.className = 'target-detail__overview-audience-empty';
        allAudience.textContent = '全員を対象にしています。';
        section.appendChild(allAudience);
        return section;
      }

      var assigned = Array.isArray(target && target.assignedUsers)
        ? target.assignedUsers.filter(function (entry)
        {
          return Boolean(entry) && entry.isActive !== false;
        })
        : [];
      if (!assigned.length)
      {
        var empty = document.createElement('p');
        empty.className = 'target-detail__overview-audience-empty';
        empty.textContent = '対象者はまだ割り当てられていません。';
        section.appendChild(empty);
        return section;
      }

      var avatars = this.createAudienceAvatarList(assigned);
      if (avatars)
      {
        section.appendChild(avatars);
      }
      return section;
    }

    createAudienceAvatarList(users)
    {
      var service = this.userlistAvatarService;
      if (!service || typeof service.render !== 'function')
      {
        return null;
      }
    var normalized = Array.isArray(users)
      ? users.map(function (user)
      {
          if (!user || user.isActive === false)
          {
            return null;
          }
          var displayName = user.displayName || user.name || user.userCode || user.code || '';
          var userCode = user.userCode || user.code || '';
          var label = formatAssignment(displayName, userCode);
          var avatarUrl = resolveAvatarField(user, 'avatarUrl');
          return {
            name: label || displayName || userCode || '',
            displayName: displayName,
            userCode: userCode,
            label: label,
            avatarUrl: avatarUrl || '',
            src: avatarUrl || ''
          };
        }).filter(Boolean)
        : [];
      if (!normalized.length)
      {
        return null;
      }
      var list = document.createElement('ul');
      list.className = 'target-detail__assignment-list target-detail__overview-audience-avatars';
      var summary = normalized.map(function (entry)
      {
        return entry.label || entry.name || '';
      }).filter(Boolean).join('、');
      if (summary)
      {
        list.setAttribute('aria-label', summary);
      }
      var item = document.createElement('li');
      item.className = 'target-detail__assignment-item';

      var avatarHost = document.createElement('div');
      avatarHost.className = 'target-detail__assignment-avatar-list';
      service.render(avatarHost, normalized);
      item.appendChild(avatarHost);

      list.appendChild(item);
      return list;
    }

    bindOverviewUserPopovers(container)
    {
      if (!container || !this.avatarService || typeof this.avatarService.eventUpdate !== 'function')
      {
        return;
      }
      var anchors = container.querySelectorAll('[data-overview-user-anchor]');
      if (!anchors.length)
      {
        return;
      }
      var self = this;
      this.avatarService.eventUpdate(anchors, {
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

    createOverviewUserPopoverContent(anchor)
    {
      if (!anchor)
      {
        return null;
      }
      var name = anchor.getAttribute('data-user-name') || anchor.dataset.userName || '';
      var code = anchor.getAttribute('data-user-code') || anchor.dataset.userCode || '';
      var role = anchor.getAttribute('data-user-role') || anchor.dataset.userRole || '';
      var title = anchor.getAttribute('data-user-title') || anchor.dataset.userTitle || '';
      var contact = anchor.getAttribute('data-user-contact') || anchor.dataset.userContact || '';
      var detail = anchor.getAttribute('data-user-detail') || anchor.dataset.userDetail || '';
      var container = document.createElement('div');
      container.className = 'target-detail__user-popover';
      var heading = document.createElement('p');
      heading.className = 'target-detail__user-popover-name';
      heading.textContent = name || '—';
      container.appendChild(heading);
      var metaItems = [];
      if (code)
      {
        metaItems.push({ term: 'ID', description: code });
      }
      if (role)
      {
        metaItems.push({ term: 'ロール', description: role });
      }
      if (title)
      {
        metaItems.push({ term: '肩書', description: title });
      }
      if (detail)
      {
        metaItems.push({ term: 'メモ', description: detail });
      }
      if (contact)
      {
        metaItems.push({ term: '連絡先', description: contact });
      }
      if (metaItems.length)
      {
        var list = createDefinitionList(metaItems);
        list.classList.add('target-detail__user-popover-definition');
        container.appendChild(list);
      }
      else
      {
        var placeholder = document.createElement('p');
        placeholder.className = 'target-detail__user-popover-empty';
        placeholder.textContent = '追加情報は登録されていません。';
        container.appendChild(placeholder);
      }
      return container;
    }

    normalizeAudienceUsers(users)
    {
      var list = Array.isArray(users) ? users : [];
      var normalized = [];
      var seen = Object.create(null);
      var self = this;
      list.forEach(function (entry)
      {
        if (!entry)
        {
          return;
        }
        var displayName = entry.displayName || entry.name || '';
        var userCode = entry.userCode || entry.code || '';
        var mail = entry.mail || entry.email || '';
        var avatarUrl = resolveAvatarField(entry, 'avatarUrl');
        var avatarAlt = resolveAvatarField(entry, 'avatarAlt');
        var avatarTransform = resolveAvatarField(entry, 'avatarTransform');
        var avatarInitial = resolveAvatarField(entry, 'avatarInitial');
        var isActive = entry.isActive !== false;
        var endedAt = entry.endedAt || '';
        var markedForDeletion = entry.markedForDeletion || entry.deleted || false;
        var basicInfoConfirmed = entry.basicInfoConfirmed || false;
        var isTargetCreator = self.isTargetCreatorUser(entry);
        var key = deriveAudienceUserKey({ userCode: userCode, displayName: displayName });
        if (key && seen[key])
        {
          var existing = seen[key];
          if (existing.isActive === false && isActive)
          {
            existing.isActive = true;
            existing.endedAt = '';
          }
          return;
        }
        var normalizedUser = {
          displayName: displayName,
          userCode: userCode,
          mail: mail,
          avatarUrl: avatarUrl,
          avatarAlt: avatarAlt,
          avatarTransform: avatarTransform,
          avatarInitial: avatarInitial,
          isActive: isActive,
          endedAt: endedAt,
          markedForDeletion: Boolean(markedForDeletion),
          basicInfoConfirmed: Boolean(basicInfoConfirmed),
          isTargetCreator: Boolean(isTargetCreator)
        };
        normalized.push(normalizedUser);
        if (key)
        {
          seen[key] = normalizedUser;
        }
      });
      return normalized;
    }

    mergeAudienceUsers(originalUsers, activeUsers, options)
    {
      var preserveActiveState = Boolean(options && options.preserveActiveState);
      var baseline = this.normalizeAudienceUsers(originalUsers);
      var activeList = this.normalizeAudienceUsers(activeUsers).map(function (user)
      {
        return Object.assign({}, user, { isActive: true, endedAt: '', markedForDeletion: false });
      });
      var merged = [];
      var map = Object.create(null);
      var activeKeys = Object.create(null);

      function append(user)
      {
        var key = deriveAudienceUserKey(user);
        if (!key || map[key])
        {
          return;
        }
        map[key] = user;
        merged.push(user);
      }

      baseline.forEach(function (user)
      {
        append(Object.assign({}, user));
      });

      activeList.forEach(function (user)
      {
        var key = deriveAudienceUserKey(user);
        if (!key)
        {
          return;
        }
        activeKeys[key] = true;
        if (map[key])
        {
          map[key].isActive = true;
          map[key].endedAt = '';
          return;
        }
        append(user);
      });

      merged.forEach(function (user)
      {
        var key = deriveAudienceUserKey(user);
        if (!preserveActiveState && !activeKeys[key])
        {
          user.isActive = false;
          if (!user.endedAt)
          {
            user.endedAt = '';
          }
        }
      });

      return merged;
    }

    buildBasicInfoConfirmationMap(list)
    {
      var map = Object.create(null);
      (Array.isArray(list) ? list : []).forEach(function (entry)
      {
        if (!entry)
        {
          return;
        }
        var code = entry.userCode || entry.code || '';
        var normalizedCode = code ? String(code).trim().toLowerCase() : '';
        if (!normalizedCode)
        {
          return;
        }
        map[normalizedCode] = entry.confirmed !== false;
      });
      return map;
    }

    updateBasicInfoConfirmationList(list, confirmation)
    {
      var entries = Array.isArray(list) ? list.slice() : [];
      if (!confirmation)
      {
        return entries;
      }
      var confirmationCode = confirmation.userCode || confirmation.code || '';
      var normalizedCode = confirmationCode ? String(confirmationCode).trim().toLowerCase() : '';
      if (!normalizedCode)
      {
        return entries;
      }
      var filtered = entries.filter(function (entry)
      {
        var code = entry && (entry.userCode || entry.code || '');
        var normalized = code ? String(code).trim().toLowerCase() : '';
        return normalized !== normalizedCode;
      });
      if (confirmation.confirmed)
      {
        filtered.push({
          userCode: confirmation.userCode || confirmation.code || '',
          confirmed: true,
          confirmedAt: confirmation.confirmedAt || confirmation.updatedAt || ''
        });
      }
      return filtered;
    }

    getTargetCreatorUserCode()
    {
      if (!this.page || !this.page.state || !this.page.state.target)
      {
        return '';
      }
      var code = this.page.state.target.createdByUserCode || this.page.state.target.ownerUserCode || '';
      return code ? String(code).trim() : '';
    }

    isTargetCreatorUser(user)
    {
      var creatorCode = this.getTargetCreatorUserCode();
      if (!creatorCode || !user)
      {
        return false;
      }
      var userCode = user.userCode || user.code || '';
      if (!userCode)
      {
        return false;
      }
      return creatorCode.toLowerCase() === String(userCode).trim().toLowerCase();
    }

    getTargetParticipants()
    {
      if (!this.page || !this.page.state || !this.page.state.target)
      {
        return [];
      }
      return this.normalizeAudienceUsers(this.page.state.target.assignedUsers);
    }

    shouldFilterAudienceUser(modal, user)
    {
      if (!modal || !modal.excludeCreatorFromAudience || !user)
      {
        return false;
      }
      var creatorCode = this.getTargetCreatorUserCode();
      if (!creatorCode)
      {
        return false;
      }
      var userCode = user.userCode || user.code || '';
      if (!userCode)
      {
        return false;
      }
      return creatorCode.toLowerCase() === String(userCode).trim().toLowerCase();
    }

    applyBasicInfoConfirmation(users, confirmationMap)
    {
      var map = confirmationMap || {};
      var list = Array.isArray(users) ? users : [];
      list.forEach(function (user)
      {
        var key = deriveAudienceUserKey(user);
        user.basicInfoConfirmed = Boolean(map[key]);
      });
      return list;
    }

    applyAudienceSelection(modal, users, options)
    {
      if (!modal)
      {
        return;
      }
      var scope = normalizeAudienceScope(options && options.scope);
      modal.audienceScope = scope;
      var selectionMode = options && options.selectionMode
        ? options.selectionMode
        : (modal && modal.audienceSelectionMode ? modal.audienceSelectionMode : 'replace');
      var confirmationMap = modal && modal.basicInfoConfirmationMap
        ? modal.basicInfoConfirmationMap
        : this.buildBasicInfoConfirmationMap(modal && modal.basicInfoConfirmations);
      var baseline = selectionMode === 'append'
        ? (Array.isArray(modal.selectedUsers) ? modal.selectedUsers : [])
        : (Array.isArray(modal.originalUsers)
          ? modal.originalUsers
          : (Array.isArray(modal.selectedUsers) ? modal.selectedUsers : []));
      var merged = scope === AUDIENCE_SCOPE.ALL
        ? this.mergeAudienceUsers(baseline, [], { preserveActiveState: selectionMode === 'append' })
        : this.mergeAudienceUsers(baseline, users, { preserveActiveState: selectionMode === 'append' });
      modal.basicInfoConfirmationMap = confirmationMap;
      modal.selectedUsers = this.applyBasicInfoConfirmation(merged, confirmationMap);
      this.updateAudienceSelectionSummary(modal);
    }

    setAudienceSelection(modal, users, options)
    {
      if (!modal)
      {
        return;
      }
      var scope = normalizeAudienceScope(options && options.scope);
      modal.audienceScope = scope;
      var confirmationMap = modal && modal.basicInfoConfirmationMap
        ? modal.basicInfoConfirmationMap
        : this.buildBasicInfoConfirmationMap(modal && modal.basicInfoConfirmations);
      var normalized = scope === AUDIENCE_SCOPE.ALL ? [] : this.applyBasicInfoConfirmation(
        this.normalizeAudienceUsers(users),
        confirmationMap
      );
      if (options && options.recordOriginal)
      {
        modal.originalUsers = normalized.slice();
      }
      modal.basicInfoConfirmationMap = confirmationMap;
      modal.selectedUsers = normalized;
      this.updateAudienceSelectionSummary(modal);
    }

    updateAudienceSelectionSummary(modal)
    {
      if (!modal)
      {
        return;
      }
      var self = this;
      var scope = normalizeAudienceScope(modal && modal.audienceScope);
      var users = Array.isArray(modal.selectedUsers) ? modal.selectedUsers : [];
      var visibleUsers = users.filter(function (user)
      {
        return !self.shouldFilterAudienceUser(modal, user);
      });
      if (modal.audienceRenderMode === 'goal-table')
      {
        this.renderGoalAudienceSelection(modal, visibleUsers, { scope: scope });
        return;
      }
      var empty = modal.audienceEmpty;
      var table = modal.audienceTable;
      var tableWrapper = modal.audienceTableWrapper;
      var tableBody = modal.audienceTableBody;
      var avatarService = this.avatarService;
      if (tableBody)
      {
        tableBody.innerHTML = '';
      }
      if (empty)
      {
        empty.hidden = visibleUsers.length > 0 || scope === AUDIENCE_SCOPE.ALL;
      }
      if (scope === AUDIENCE_SCOPE.ALL)
      {
        if (tableWrapper)
        {
          tableWrapper.hidden = true;
        }
        else if (table)
        {
          table.hidden = true;
        }
        return;
      }
      if (tableBody && visibleUsers.length)
      {
        if (tableWrapper)
        {
          tableWrapper.hidden = false;
        }
        else if (table)
        {
          table.hidden = false;
        }
        var renderToggleCell = function (user, toggleCell, options)
        {
          var checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'target-detail__audience-checkbox';
          checkbox.checked = user.isActive !== false;
          if (options && options.disabled)
          {
            checkbox.disabled = true;
            checkbox.checked = true;
            user.isActive = true;
          }
          checkbox.addEventListener('change', function ()
          {
            user.isActive = checkbox.checked;
          });
          toggleCell.appendChild(checkbox);
          return checkbox;
        };

        var renderDeleteCell = function (user, cell, options)
        {
          var checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'target-detail__audience-checkbox';
          var isDisabled = (options && options.disabled) || user.basicInfoConfirmed === true;
          if (options && options.disabled)
          {
            user.markedForDeletion = false;
          }
          checkbox.checked = Boolean(user.markedForDeletion);
          checkbox.disabled = isDisabled;
          if (user.basicInfoConfirmed)
          {
            checkbox.title = '基本情報が確認済みのため削除できません。';
          }
          else if (options && options.disabled)
          {
            checkbox.title = 'ターゲット作成者は削除できません。';
          }
          checkbox.addEventListener('change', function ()
          {
            user.markedForDeletion = checkbox.checked;
          });
          cell.appendChild(checkbox);
          return checkbox;
        };

        visibleUsers.forEach(function (user)
        {
          if (!user)
          {
            return;
          }
          var isCreator = self.isTargetCreatorUser(user);
          if (isCreator)
          {
            user.isActive = true;
            user.markedForDeletion = false;
          }
          var row = document.createElement('tr');
          row.className = 'target-detail__audience-row';
          var userCell = document.createElement('td');
          userCell.className = 'target-detail__audience-cell target-detail__audience-cell--user';
          var activeCell = document.createElement('td');
          activeCell.className = 'target-detail__audience-cell target-detail__audience-cell--active';
          var deleteCell = document.createElement('td');
          deleteCell.className = 'target-detail__audience-cell target-detail__audience-cell--delete';
          var userContent = document.createElement('div');
          userContent.className = 'target-detail__audience-user';
          var avatar = createUserAvatarElement({
            className: 'target-detail__assignment-avatar',
            userCode: user.userCode || '',
            displayName: user.displayName || '',
            alt: user.avatarAlt || user.displayName || user.userCode || '',
            avatarUrl: user.avatarUrl || '',
            transform: user.avatarTransform || '',
            size: 40,
            initial: user.avatarInitial || '',
            isActive: user && user.isActive !== false
          }, avatarService);
          if (avatar && (user.avatarUrl || avatar.dataset.avatarSrc))
          {
            avatar.classList.add('target-detail__assignment-avatar--has-image');
          }
          avatar.classList.add('target-detail__audience-avatar');
          userContent.appendChild(avatar);
          var name = document.createElement('span');
          name.className = 'target-detail__assignment-name target-detail__audience-name';
          name.textContent = user.displayName || user.userCode || '—';
          userContent.appendChild(name);
          if (isCreator)
          {
            var creatorBadge = self.createServiceActionButton('target-detail-status', {
              label: 'ターゲット作成者',
              variant: 'creator',
              dataset: { statusKey: 'creator' },
              attributes: { 'data-status-key': 'creator' },
              disabled: true
            }, 'mock-avatar__upload-btn target-detail__status-button target-detail__badge target-detail__badge--status-creator');
            if (creatorBadge && creatorBadge.classList)
            {
              creatorBadge.classList.add('target-detail__creator-badge');
            }
            if (creatorBadge)
            {
              userContent.appendChild(creatorBadge);
            }
          }
          userCell.appendChild(userContent);

          var toggleInput = renderToggleCell(user, activeCell, { disabled: isCreator });
          var deleteInput = renderDeleteCell(user, deleteCell, { disabled: isCreator });
          var syncToggleState = function ()
          {
            if (!toggleInput)
            {
              return;
            }
            if (deleteInput && deleteInput.checked)
            {
              toggleInput.checked = false;
              toggleInput.disabled = true;
              user.isActive = false;
            }
            else
            {
              toggleInput.disabled = isCreator ? true : false;
            }
          };
          if (deleteInput)
          {
            deleteInput.addEventListener('change', syncToggleState);
            syncToggleState();
          }
          row.appendChild(userCell);
          row.appendChild(activeCell);
          row.appendChild(deleteCell);
          tableBody.appendChild(row);
        });
        return;
      }
      if (tableWrapper)
      {
        tableWrapper.hidden = true;
      }
      else if (table)
      {
        table.hidden = true;
      }
      if (modal.audienceList && modal.audienceEmpty && modal.audienceCount)
      {
        var activeUsers = visibleUsers.filter(function (user)
        {
          return user && user.isActive !== false;
        });
        var list = modal.audienceList;
        var count = modal.audienceCount;
        list.innerHTML = '';
        if (!visibleUsers.length)
        {
          modal.audienceEmpty.hidden = false;
          list.hidden = true;
          count.textContent = '';
          return;
        }
        modal.audienceEmpty.hidden = true;
        list.hidden = false;
        count.textContent = '選択中: ' + formatNumber(activeUsers.length) + '名';
        visibleUsers.forEach(function (user)
        {
          if (!user)
          {
            return;
          }
          var item = document.createElement('li');
          item.className = 'target-detail__assignment-item';
          var avatar = createUserAvatarElement({
            className: 'target-detail__assignment-avatar',
            fallbackClass: 'target-detail__assignment-avatar-initial',
            userCode: user.userCode || '',
            displayName: user.displayName || '',
            fallbackLabel: formatAssignment(user.displayName || '', user.userCode || ''),
            avatarUrl: user.avatarUrl || '',
            alt: user.avatarAlt || user.displayName || user.userCode || '',
            transform: user.avatarTransform || '',
            size: 36,
            shape: 'circle',
            initial: user.avatarInitial || '',
            isActive: user && user.isActive !== false
          }, avatarService);
          if (avatar && (user.avatarUrl || avatar.dataset.avatarSrc))
          {
            avatar.classList.add('target-detail__assignment-avatar--has-image');
          }
          item.appendChild(avatar);

          var text = document.createElement('div');
          text.className = 'target-detail__assignment-text';
          var name = document.createElement('span');
          name.className = 'target-detail__assignment-name';
          name.textContent = user.displayName || user.userCode || '—';
          text.appendChild(name);
          if (user.userCode)
          {
            var code = document.createElement('span');
            code.className = 'target-detail__assignment-code';
            code.textContent = user.userCode;
            text.appendChild(code);
          }
          if (user.isActive === false)
          {
            var inactive = document.createElement('span');
            inactive.className = 'target-detail__assignment-inactive';
            inactive.textContent = '履歴 (削除不可)';
            text.appendChild(inactive);
          }
          item.appendChild(text);
          list.appendChild(item);
        });
      }
    }

    renderGoalAudienceSelection(modal, users, options)
    {
      if (!modal)
      {
        return;
      }
      var scope = normalizeAudienceScope(options && options.scope ? options.scope : modal.audienceScope);
      var audienceCount = modal.audienceCount;
      var tableWrapper = modal.audienceTableWrapper;
      var tableBody = modal.audienceTableBody;
      var audienceEmpty = modal.audienceEmpty;
      if (tableBody)
      {
        tableBody.innerHTML = '';
      }
      var selection = Array.isArray(users) ? users : [];
      var countText = '';
      if (scope === AUDIENCE_SCOPE.ALL)
      {
        countText = '全員を対象にしています。';
      }
      else if (selection.length)
      {
        countText = selection.length + '名が選択されています。';
      }
      if (audienceCount)
      {
        audienceCount.textContent = countText;
      }
      if (scope === AUDIENCE_SCOPE.ALL)
      {
        if (tableWrapper)
        {
          tableWrapper.hidden = true;
        }
        if (audienceEmpty)
        {
          audienceEmpty.hidden = true;
        }
        return;
      }
      if (!tableWrapper || !tableBody || !audienceEmpty)
      {
        return;
      }
      if (!selection.length)
      {
        tableWrapper.hidden = true;
        audienceEmpty.hidden = false;
        return;
      }
      tableWrapper.hidden = false;
      audienceEmpty.hidden = true;
      var self = this;
      var avatarService = this.avatarService;
      selection.forEach(function (user)
      {
        if (!user)
        {
          return;
        }
        var row = document.createElement('tr');
        var userCell = document.createElement('td');
        userCell.className = 'announcement-management__audience-user-cell';

        var userBlock = document.createElement('div');
        userBlock.className = 'announcement-management__audience-user';
        var avatar = createUserAvatarElement({
          className: 'announcement-management__audience-avatar target-goals__audience-avatar',
          userCode: user.userCode || '',
          displayName: user.displayName || '',
          alt: user.avatarAlt || user.displayName || user.userCode || 'ユーザー',
          avatarUrl: user.avatarUrl || '',
          transform: user.avatarTransform || '',
          size: 32,
          initial: user.avatarInitial || '',
          isActive: user && user.isActive !== false
        }, avatarService);
        if (avatar)
        {
          userBlock.appendChild(avatar);
        }
        var name = document.createElement('span');
        name.className = 'announcement-management__audience-name';
        name.textContent = user.displayName || user.userCode || 'ユーザー';
        userBlock.appendChild(name);
        userCell.appendChild(userBlock);

        var actionCell = document.createElement('td');
        actionCell.className = 'announcement-management__audience-action-cell';
        var removeButton = self.createServiceActionButton('remove', {
          label: '削除',
          ariaLabel: '削除',
          hoverLabel: '削除',
          title: '削除',
          type: 'button'
        }, 'announcement-management__audience-remove btn btn--ghost');
        if (removeButton && removeButton.classList)
        {
          removeButton.classList.add('announcement-management__audience-remove');
        }
        removeButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.removeGoalAudienceUser(modal, user);
        });
        actionCell.appendChild(removeButton);

        row.appendChild(userCell);
        row.appendChild(actionCell);
        tableBody.appendChild(row);
      });
    }

    removeGoalAudienceUser(modal, user)
    {
      if (!modal || !user)
      {
        return;
      }
      var targetKey = deriveAudienceUserKey(user);
      var next = (modal.selectedUsers || []).filter(function (entry)
      {
        return deriveAudienceUserKey(entry) !== targetKey;
      });
      this.setAudienceSelection(modal, next);
    }

    serializeAudienceUsers(selection)
    {
      var normalized = this.normalizeAudienceUsers(selection);
      return normalized.map(function (user)
      {
        return {
          displayName: user.displayName || user.userCode || '',
          userCode: user.userCode || '',
          isActive: user.isActive !== false,
          endedAt: user.endedAt || '',
          deleted: Boolean(user.markedForDeletion)
        };
      });
    }

    serializeAudienceSelection(modal)
    {
      var scope = normalizeAudienceScope(modal && modal.audienceScope);
      var users = this.serializeAudienceUsers(modal && modal.selectedUsers ? modal.selectedUsers : []);
      return {
        scope: scope,
        users: users
      };
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

    openAudienceSelectionModal(modal)
    {
      var service = this.getUserSelectModalService();
      if (!service || typeof service.open !== 'function')
      {
        this.page.showToast('error', '対象ユーザー選択モーダルを利用できません。');
        return;
      }
      var selectedUsers = Array.isArray(modal.selectedUsers) ? modal.selectedUsers : [];
      var selectionMode = modal && modal.audienceSelectionMode ? modal.audienceSelectionMode : 'replace';
      var selectedCodes = selectionMode === 'append'
        ? []
        : selectedUsers.map(function (user)
        {
          if (!user || user.isActive === false)
          {
            return '';
          }
          return user && user.userCode ? user.userCode : '';
        }).filter(Boolean);
      var excludeCodes = selectionMode === 'append'
        ? selectedUsers.map(function (user)
        {
          return user && user.userCode ? user.userCode : '';
        }).filter(Boolean)
        : [];
      var creatorCode = modal && modal.excludeCreatorFromAudience ? this.getTargetCreatorUserCode() : '';
      if (creatorCode)
      {
        var normalizedCreator = String(creatorCode).trim();
        var hasCreator = excludeCodes.some(function (code)
        {
          return String(code).trim().toLowerCase() === normalizedCreator.toLowerCase();
        });
        if (!hasCreator)
        {
          excludeCodes.push(normalizedCreator);
        }
      }
      var modalOptions = {
        multiple: true,
        selectedCodes: selectedCodes,
        excludeCodes: excludeCodes,
        availableUsers: Array.isArray(modal && modal.availableAudienceUsers)
          ? modal.availableAudienceUsers
          : null,
        onApply: (users) =>
        {
          this.applyAudienceSelection(modal, Array.isArray(users) ? users : [], {
            scope: AUDIENCE_SCOPE.USERS,
            selectionMode: selectionMode
          });
        },
        onClose: () =>
        {
          if (modal.selectAudienceButton && typeof modal.selectAudienceButton.focus === 'function')
          {
            modal.selectAudienceButton.focus();
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
        console.error('[target-detail] failed to open user select modal', error);
        this.page.showToast('error', '対象ユーザーの選択モーダルを開けませんでした。');
      }
    }

    createStatusBadgeElement(target)
    {
      var svc = this.getButtonService();
      var item = target || {};
      if (svc && typeof svc.resolveStatusPresentation === 'function' && typeof svc.createActionButton === 'function')
      {
        try
        {
          var presentation = svc.resolveStatusPresentation({
            status: item.status || item.state || '',
            statusLabel: item.statusLabel || item.statusText || ''
          });
          var statusKey = presentation && typeof presentation.statusKey === 'string'
            ? presentation.statusKey
            : (item.status || item.state || '');
          var variant = presentation && presentation.variant
            ? presentation.variant
            : (statusKey || 'unknown');
          var attributeValue = (statusKey !== undefined && statusKey !== null) ? String(statusKey) : '';
          var badge = svc.createActionButton('target-detail-status', {
            label: presentation && presentation.text ? presentation.text : '',
            variant: variant || 'unknown',
            dataset: { statusKey: attributeValue },
            attributes: { 'data-status-key': attributeValue }
          });
          if (badge)
          {
            return badge;
          }
        }
        catch (error)
        {
          if (window.console && typeof window.console.warn === 'function')
          {
            window.console.warn('[target-detail] failed to create status badge', error);
          }
        }
      }
      var badge = document.createElement('span');
      var fallbackKey = item.status || item.state || 'unknown';
      var normalizedKey = fallbackKey ? String(fallbackKey).trim() : 'unknown';
      badge.className = 'mock-avatar__upload-btn target-detail__status-button target-detail__badge target-detail__badge--status-' + normalizedKey;
      badge.textContent = item.statusLabel || item.statusText || '—';
      badge.setAttribute('data-status-key', normalizedKey);
      return badge;
    }

    renderBasicConfirmationCard(target)
    {
      if (!target)
      {
        return null;
      }
      var card = document.createElement('section');
      card.className = 'target-detail__card target-detail__basic-confirmation';

      var title = document.createElement('h2');
      title.textContent = '基本情報の確認';
      card.appendChild(title);

      var button = this.createBannerButton('基本情報を確認済みにする', 'toggle-basic-confirmation', {
        baseClass: COMPACT_BANNER_CLASS
      }, COMPACT_BANNER_CLASS);
      button.classList.add('target-detail__basic-confirmation-button');
      button.disabled = !target.targetCode;
      var self = this;
      button.addEventListener('click', function (event)
      {
        event.preventDefault();
        self.handleBasicConfirmationToggle();
      });

      var label = document.createElement('span');
      label.className = 'target-detail__basic-confirmation-button-label';

      var labelCheck = document.createElement('span');
      labelCheck.className = 'target-detail__basic-confirmation-check';
      labelCheck.setAttribute('aria-hidden', 'true');
      label.appendChild(labelCheck);

      var labelText = document.createElement('span');
      labelText.className = 'target-detail__basic-confirmation-text';
      label.appendChild(labelText);

      button.textContent = '';
      button.appendChild(label);
      card.appendChild(button);

      var undoButton = document.createElement('button');
      undoButton.type = 'button';
      undoButton.className = 'btn btn--ghost target-detail__basic-confirmation-undo';
      undoButton.textContent = '確認済みを解除する';
      undoButton.style.display = 'none';
      undoButton.disabled = !target.targetCode;
      undoButton.addEventListener('click', function (event)
      {
        event.preventDefault();
        self.handleBasicConfirmationToggle();
      });
      card.appendChild(undoButton);

      var meta = document.createElement('p');
      meta.className = 'target-detail__basic-confirmation-meta';
      card.appendChild(meta);

      var notice = document.createElement('p');
      notice.className = 'target-detail__basic-confirmation-notice';
      var noticeIcon = document.createElement('span');
      noticeIcon.className = 'target-detail__basic-confirmation-notice-icon';
      noticeIcon.setAttribute('aria-hidden', 'true');
      noticeIcon.textContent = 'i';
      notice.appendChild(noticeIcon);
      var noticeText = document.createElement('span');
      noticeText.className = 'target-detail__basic-confirmation-notice-text';
      notice.appendChild(noticeText);
      card.appendChild(notice);

      this.basicConfirmationView = {
        container: card,
        button: button,
        undoButton: undoButton,
        label: label,
        labelText: labelText,
        labelCheck: labelCheck,
        meta: meta,
        notice: noticeText
      };
      this.updateBasicConfirmationView(target.basicInfoConfirmation || {});
      return card;
    }

    updateBasicConfirmationView(confirmation)
    {
      if (!this.basicConfirmationView)
      {
        return;
      }
      var confirmed = confirmation && confirmation.confirmed;
      var target = this.page && this.page.state ? this.page.state.target : null;
      var targetCode = target && target.targetCode;
      var button = this.basicConfirmationView.button;
      button.classList.toggle('target-detail__basic-confirmation-button--confirmed', Boolean(confirmed));
      button.setAttribute('aria-pressed', confirmed ? 'true' : 'false');
      button.disabled = Boolean(confirmed) || !targetCode;
      var timestamp = confirmation && (confirmation.confirmedAtDisplay || confirmation.confirmedAt);
      if (this.basicConfirmationView.labelCheck && this.basicConfirmationView.labelText)
      {
        this.basicConfirmationView.labelCheck.textContent = confirmed ? '✓' : '';
        this.basicConfirmationView.labelText.textContent = confirmed
          ? (timestamp || '確認済み')
          : '基本情報を確認済みにする';
      }
      else
      {
        this.basicConfirmationView.label.textContent = confirmed
          ? '✓ ' + (timestamp || '確認済み')
          : '基本情報を確認済みにする';
      }
      var undoButton = this.basicConfirmationView.undoButton;
      if (undoButton)
      {
        undoButton.style.display = confirmed ? 'inline-flex' : 'none';
        undoButton.disabled = !targetCode;
      }
      this.basicConfirmationView.meta.textContent = confirmed
        ? '最終確認: ' + (timestamp || '—')
        : 'あなたによる基本情報の確認履歴はありません。';
      this.basicConfirmationView.notice.textContent = confirmed
        ? '内容が更新された場合は再確認の上で状態を更新してください。'
        : '提出やレビューに進む前にステータスや期限を再確認しましょう。';
    }

    async selectBasicConfirmationUser()
    {
      var participants = this.getTargetParticipants();
      var availableUsers = [];
      var seen = Object.create(null);
      participants.forEach(function (participant)
      {
        if (!participant)
        {
          return;
        }
        var code = normalizeText(participant.userCode || participant.code || participant.id || '');
        if (!code || seen[code])
        {
          return;
        }
        seen[code] = true;
        var displayName = normalizeText(participant.displayName || participant.userCode || code);
        availableUsers.push(Object.assign({}, participant, { userCode: code, displayName: displayName }));
      });

      if (!availableUsers.length)
      {
        this.page.showToast('error', '対象ユーザーが見つかりません。');
        return null;
      }

      var service = this.getUserSelectModalService();
      if (!service || typeof service.open !== 'function')
      {
        this.page.showToast('error', '対象ユーザーの選択モーダルを開けません。');
        return null;
      }

      var resolveUser = function (user)
      {
        if (!user)
        {
          return null;
        }
        var code = normalizeText(user.userCode || user.code || user.id || '');
        if (!code)
        {
          return null;
        }
        var displayName = normalizeText(user.displayName || user.name || user.userCode || code);
        return {
          userCode: code,
          displayName: displayName
        };
      };

      return new Promise((resolve) =>
      {
        var resolved = false;
        var finish = (value) =>
        {
          if (resolved)
          {
            return;
          }
          resolved = true;
          resolve(value);
        };

        try
        {
          service.open({
            multiple: false,
            availableUsers: availableUsers,
            text: {
              modalTitle: '確認するユーザーを選択',
              modalDescription: '基本情報の確認履歴を更新するユーザーを選択してください。',
              actionLabel: '選択',
              applyLabel: '選択する',
              singleActionHeader: '選択',
              multipleActionHeader: '選択'
            },
            emptyMessage: '対象ユーザーが見つかりません。',
            onSelect: (user) =>
            {
              finish(resolveUser(user));
            },
            onApply: (users) =>
            {
              var selected = Array.isArray(users) && users.length ? users[0] : null;
              finish(resolveUser(selected));
            },
            onClose: (reason) =>
            {
              if (reason === 'session-expired' && window.location && typeof window.location.reload === 'function')
              {
                window.location.reload();
              }
              finish(null);
            }
          });
        }
        catch (error)
        {
          window.console.error('[target-detail] failed to open basic confirmation selector', error);
          finish(null);
        }
      });
    }

    async handleBasicConfirmationToggle()
    {
      if (!this.basicConfirmationView || !this.page || !this.page.state)
      {
        return;
      }
      var target = this.page.state.target;
      if (!target || !target.targetCode)
      {
        return;
      }
      var confirmationUser = null;
      var confirmationUserCode = '';
      var confirmationMap = this.buildBasicInfoConfirmationMap(target.basicInfoConfirmations);
      var requiresUserSelection = Boolean(this.page && typeof this.page.isSupervisorUser === 'function'
        && this.page.isSupervisorUser());
      if (requiresUserSelection)
      {
        confirmationUser = await this.selectBasicConfirmationUser();
        confirmationUserCode = confirmationUser && confirmationUser.userCode ? confirmationUser.userCode : '';
        if (!confirmationUserCode)
        {
          return;
        }
      }
      var normalizedUserCode = confirmationUserCode ? String(confirmationUserCode).trim().toLowerCase() : '';
      var buttons = [this.basicConfirmationView.button];
      if (this.basicConfirmationView.undoButton)
      {
        buttons.push(this.basicConfirmationView.undoButton);
      }
      if (buttons.some(function (btn)
      {
        return btn && btn.classList.contains('target-detail__basic-confirmation-button--loading');
      }))
      {
        return;
      }
      var currentState = null;
      if (normalizedUserCode && confirmationMap && Object.prototype.hasOwnProperty.call(confirmationMap, normalizedUserCode))
      {
        currentState = confirmationMap[normalizedUserCode] !== false;
      }
      if (currentState === null)
      {
        currentState = Boolean(target.basicInfoConfirmation && target.basicInfoConfirmation.confirmed);
        if (!requiresUserSelection && target.basicInfoConfirmation && target.basicInfoConfirmation.userCode)
        {
          confirmationUserCode = '';
          normalizedUserCode = '';
        }
        else if (!confirmationUserCode && target.basicInfoConfirmation && target.basicInfoConfirmation.userCode)
        {
          confirmationUserCode = target.basicInfoConfirmation.userCode;
          normalizedUserCode = String(confirmationUserCode).trim().toLowerCase();
        }
      }
      var nextState = !currentState;
      if (!nextState && this.page.confirmDialogService)
      {
        var confirmed = await this.page.confirmDialogService.open(
          '基本情報の確認済み状態を解除します。よろしいですか？',
          {
            titleText: '確認',
            confirmText: '解除する',
            cancelText: 'キャンセル',
            type: 'warning'
          }
        );
        if (!confirmed)
        {
          return;
        }
      }
      buttons.forEach(function (btn)
      {
        if (!btn)
        {
          return;
        }
        btn.classList.add('target-detail__basic-confirmation-button--loading');
        btn.disabled = true;
      });
      try
      {
        var params = {
          targetCode: target.targetCode,
          confirmed: nextState ? 1 : 0
        };
        if (requiresUserSelection && confirmationUserCode)
        {
          params.userCode = confirmationUserCode;
        }
        var payload = await this.page.callApi('TargetBasicInfoConfirm', params);
        var normalized = this.page.normalizeBasicInfoConfirmation(payload && payload.basicInfoConfirmation
          ? payload.basicInfoConfirmation
          : { confirmed: nextState, userCode: requiresUserSelection ? confirmationUserCode : (target.basicInfoConfirmation && target.basicInfoConfirmation.userCode ? target.basicInfoConfirmation.userCode : '') });
        target.basicInfoConfirmation = normalized;
        target.basicInfoConfirmations = this.updateBasicInfoConfirmationList(target.basicInfoConfirmations, normalized);
        if (!requiresUserSelection)
        {
          this.updateBasicConfirmationView(normalized);
          this.page.showToast('success', nextState ? '基本情報を確認済みにしました。' : '確認状態を解除しました。');
        }
        else
        {
          var displayName = confirmationUser && confirmationUser.displayName
            ? confirmationUser.displayName
            : confirmationUserCode;
          var timestamp = normalized && (normalized.confirmedAtDisplay || normalized.confirmedAt);
          var message = '';
          if (nextState && displayName && timestamp)
          {
            message = displayName + 'の基本情報確認済みを' + timestamp + 'に設定しました';
          }
          else
          {
            message = nextState ? '確認状態を更新しました。' : '確認状態を解除しました。';
          }
          this.page.showToast('success', message);
        }
      }
      catch (error)
      {
        console.error('[target-detail] failed to update basic confirmation', error);
        this.page.showToast('error', '基本情報の確認状態を更新できませんでした。');
      }
      finally
      {
        buttons.forEach(function (btn)
        {
          if (!btn)
          {
            return;
          }
          btn.disabled = false;
          btn.classList.remove('target-detail__basic-confirmation-button--loading');
        });
        if (!requiresUserSelection)
        {
          this.updateBasicConfirmationView(target.basicInfoConfirmation || {});
        }
      }
    }

    renderAgreementsSection(target)
    {
      if (!target)
      {
        return null;
      }
      var section = document.createElement('section');
      section.className = 'target-detail__card target-agreements target-detail__section-block';

      var header = document.createElement('div');
      header.className = 'target-agreements__header target-detail__section-header';
      var title = document.createElement('h2');
      title.className = 'target-agreements__title';
      title.textContent = '規約';
      header.appendChild(title);
      var actions = document.createElement('div');
      actions.className = 'target-detail__section-help target-detail__section-help--align-end';
      var canManage = this.canManageContent();
      if (canManage)
      {
        var addButton = this.createBannerButton('規約を追加', 'add-agreement', {
          baseClass: 'target-management__icon-button target-management__icon-button--primary target-agreements__add-button',
          buttonType: 'expandable-icon-button/add'
        }, COMPACT_BANNER_CLASS);
        addButton.classList.add('target-agreements__add-button');
        addButton.disabled = !(target && target.targetCode);
        var self = this;
        addButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.openAgreementModal();
        });
        actions.appendChild(addButton);
      }
      header.appendChild(actions);
      section.appendChild(header);

      var table = document.createElement('table');
      table.className = 'target-agreements__table';
      var tableWrapper = document.createElement('div');
      tableWrapper.className = 'target-agreements__table-wrapper';
      var thead = document.createElement('thead');
      var headRow = document.createElement('tr');
      var headers = [
        { label: '規約', className: 'target-agreements__header-cell target-agreements__header-cell--title' },
        { label: '備考', className: 'target-agreements__header-cell target-agreements__header-cell--notes' },
        { label: '更新日', className: 'target-agreements__header-cell target-agreements__header-cell--updated' },
        { label: '操作', className: 'target-agreements__header-cell target-agreements__header-cell--actions' }
      ];
      headers.forEach(function (entry)
      {
        var th = document.createElement('th');
        th.scope = 'col';
        th.className = entry.className;
        th.textContent = entry.label;
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      table.appendChild(tbody);
      tableWrapper.appendChild(table);
      section.appendChild(tableWrapper);

      this.agreementsView = {
        section: section,
        addButton: canManage ? addButton : null,
        tableBody: tbody,
        table: table
      };
      this.setAgreementsData(Array.isArray(target.agreements) ? target.agreements.slice() : []);
      return section;
    }

    async handleAgreementSubmit()
    {
      if (!this.page || !this.page.state || !this.page.state.target)
      {
        return;
      }
      var target = this.page.state.target;
      if (!target.targetCode)
      {
        return;
      }
      var modal = this.ensureAgreementModal();
      this.clearAgreementValidationState(modal);
      var titleValue = modal.titleInput.value.trim();
      if (!titleValue)
      {
        if (modal.feedback)
        {
          modal.feedback.textContent = '規約タイトルを入力してください。';
          modal.feedback.hidden = false;
        }
        this.setAgreementFieldErrorState(modal.titleInput, true);
        this.setAgreementFieldErrorState(modal.titleField, true);
        modal.titleInput.focus();
        this.page.showToast('error', '規約タイトルを入力してください。');
        return;
      }
      var contentValue = modal.contentInput.value.trim();
      if (!contentValue)
      {
        if (modal.feedback)
        {
          modal.feedback.textContent = '規約本文を入力してください。';
          modal.feedback.hidden = false;
        }
        this.setAgreementFieldErrorState(modal.contentInput, true);
        this.setAgreementFieldErrorState(modal.contentField, true);
        modal.contentInput.focus();
        this.page.showToast('error', '規約本文を入力してください。');
        return;
      }
      if (modal.feedback)
      {
        modal.feedback.textContent = '';
        modal.feedback.hidden = true;
      }
      var typeValue = modal.typeInput.value.trim();
      var notesValue = modal.notesInput.value.trim();
      var payload = {
        targetCode: target.targetCode,
        title: titleValue
      };
      var isEditing = Boolean(modal.editingItem && modal.editingItem.agreementCode);
      if (isEditing)
      {
        payload.agreementCode = modal.editingItem.agreementCode;
      }
      if (typeValue)
      {
        payload.agreementType = typeValue;
      }
      if (contentValue)
      {
        payload.content = contentValue;
      }
      if (notesValue)
      {
        payload.notes = notesValue;
      }
      var creatorSelection = this.getAgreementCreatorSelection(modal);
      if (creatorSelection && creatorSelection.userCode)
      {
        payload.createdByUserCode = creatorSelection.userCode;
      }
      var submitButton = modal.submitButton;
      var originalText = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.textContent = isEditing ? '更新中…' : '登録中…';
      try
      {
        await this.page.callApi(isEditing ? 'TargetAgreementUpdate' : 'TargetAgreementCreate', payload, {
          requestType: 'TargetManagementAgreements'
        });
        this.page.showToast('success', isEditing ? '規約を更新しました。' : '規約を登録しました。');
        await this.reloadAgreements();
        this.closeAgreementModal();
      }
      catch (error)
      {
        console.error('[target-detail] failed to submit agreement', error);
        this.page.showToast('error', isEditing ? '規約の更新に失敗しました。' : '規約の登録に失敗しました。');
      }
      finally
      {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }

    setAgreementFieldErrorState(target, hasError)
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

    clearAgreementValidationState(modal)
    {
      if (!modal)
      {
        return;
      }
      this.setAgreementFieldErrorState(modal.titleInput, false);
      this.setAgreementFieldErrorState(modal.titleField, false);
      this.setAgreementFieldErrorState(modal.contentInput, false);
      this.setAgreementFieldErrorState(modal.contentField, false);
    }

    resolveAgreementCreatorSelection(entry)
    {
      if (!entry || typeof entry !== 'object')
      {
        return null;
      }
      var resolveFirstValue = function (list)
      {
        if (!Array.isArray(list))
        {
          return '';
        }
        for (var i = 0; i < list.length; i += 1)
        {
          var value = list[i];
          if (!value)
          {
            continue;
          }
          var text = String(value).trim();
          if (text)
          {
            return text;
          }
        }
        return '';
      };
      var code = resolveFirstValue([
        entry.createdByUserCode,
        entry.creatorUserCode,
        entry.creatorCode,
        entry.userCode,
        entry.code
      ]);
      if (!code)
      {
        return null;
      }
      var name = resolveFirstValue([
        entry.createdByDisplayName,
        entry.creatorDisplayName,
        entry.displayName,
        entry.name
      ]);
      return {
        userCode: code,
        displayName: name || ''
      };
    }

    getAgreementCreatorSelection(modal)
    {
      var targetModal = modal || (this.modals && this.modals.agreement);
      if (!targetModal)
      {
        return null;
      }
      if (targetModal.creatorSelection && targetModal.creatorSelection.userCode)
      {
        return targetModal.creatorSelection;
      }
      if (targetModal.creatorInput && targetModal.creatorInput.value)
      {
        return {
          userCode: targetModal.creatorInput.value,
          displayName: targetModal.creatorName ? targetModal.creatorName.textContent : ''
        };
      }
      return null;
    }

    setAgreementCreatorSelection(modal, selection)
    {
      var targetModal = modal || (this.modals && this.modals.agreement);
      if (!targetModal)
      {
        return;
      }
      var normalized = selection && selection.userCode
        ? { userCode: String(selection.userCode).trim(), displayName: selection.displayName || selection.name || '' }
        : null;
      if (normalized && !normalized.userCode)
      {
        normalized = null;
      }
      targetModal.creatorSelection = normalized;
      if (targetModal.creatorInput)
      {
        targetModal.creatorInput.value = normalized ? normalized.userCode : '';
      }
      if (targetModal.creatorName)
      {
        targetModal.creatorName.textContent = normalized ? (normalized.displayName || normalized.userCode) : '';
      }
      if (targetModal.creatorCode)
      {
        targetModal.creatorCode.textContent = normalized ? normalized.userCode : '';
      }
      if (targetModal.creatorSummary)
      {
        targetModal.creatorSummary.hidden = !normalized;
      }
      if (targetModal.creatorEmpty)
      {
        targetModal.creatorEmpty.hidden = !!normalized;
      }
      if (targetModal.creatorClearButton)
      {
        targetModal.creatorClearButton.disabled = !normalized;
      }
      this.setAgreementFieldErrorState(targetModal.creatorField, false);
    }

    openAgreementCreatorSelector(modal)
    {
      var service = this.getUserSelectModalService();
      if (!service || typeof service.open !== 'function')
      {
        this.page.showToast('error', '作成者選択モーダルを利用できません。');
        return;
      }
      var selection = this.getAgreementCreatorSelection(modal);
      var selectedCodes = selection && selection.userCode ? [selection.userCode] : [];
      var initialKeyword = selection && (selection.userCode || selection.displayName)
        ? (selection.userCode || selection.displayName)
        : '';
      var options = {
        multiple: false,
        selectedCodes: selectedCodes,
        initialKeyword: initialKeyword,
        onApply: (users) =>
        {
          var first = Array.isArray(users) && users.length ? users[0] : (users || null);
          if (!first)
          {
            return;
          }
          this.setAgreementCreatorSelection(modal, {
            userCode: first.userCode || first.code || '',
            displayName: first.displayName || first.name || ''
          });
        },
        onClose: () =>
        {
          if (modal && modal.creatorSelectButton && typeof modal.creatorSelectButton.focus === 'function')
          {
            modal.creatorSelectButton.focus();
          }
        }
      };
      var zIndex = this.resolveNestedModalZIndex(modal);
      if (zIndex !== null)
      {
        options.zIndex = zIndex;
      }
      try
      {
        service.open(options);
      }
      catch (error)
      {
        console.error('[target-detail] failed to open agreement creator selector', error);
        this.page.showToast('error', '作成者を選択できませんでした。');
      }
    }

    setAgreementsData(data)
    {
      this.agreementsData = Array.isArray(data) ? data.slice() : [];
      this.updateAgreementsTable();
    }

    updateAgreementsTable()
    {
      if (!this.agreementsView || !this.agreementsView.tableBody)
      {
        return;
      }
      var tbody = this.agreementsView.tableBody;
      tbody.innerHTML = '';
      if (!this.agreementsData.length)
      {
        var emptyRow = document.createElement('tr');
        var emptyCell = document.createElement('td');
        emptyCell.colSpan = 4;
        emptyCell.className = 'target-agreements__cell target-agreements__cell--empty';
        emptyCell.textContent = '登録された規約はありません。';
        emptyRow.appendChild(emptyCell);
        tbody.appendChild(emptyRow);
        return;
      }
      var self = this;
      this.agreementsData.forEach(function (item)
      {
        var row = self.buildAgreementRow(item);
        tbody.appendChild(row);
      });
      this.bindOverviewUserPopovers(this.agreementsView.table || tbody);
    }

    buildAgreementRow(item)
    {
      var row = document.createElement('tr');
      row.className = 'target-agreements__row';
      var self = this;

      var titleCell = document.createElement('td');
      titleCell.className = 'target-agreements__cell target-agreements__cell--title';
      var heading = document.createElement('p');
      heading.className = 'target-agreements__item-title';
      var typeLabel = createAgreementTypeLabel(item && item.type ? item.type : '—');
      heading.appendChild(typeLabel);
      var name = document.createElement('span');
      name.className = 'target-agreements__item-title-text';
      name.textContent = item && item.title ? item.title : '（タイトル未設定）';
      heading.appendChild(name);
      titleCell.appendChild(heading);

      var body = document.createElement('p');
      body.className = 'target-agreements__content';
      body.textContent = item && item.content ? item.content : '—';
      titleCell.appendChild(body);
      row.appendChild(titleCell);

      var notesCell = document.createElement('td');
      notesCell.className = 'target-agreements__cell target-agreements__cell--notes';
      var notesText = item && item.notes ? item.notes : '';
      if (notesText)
      {
        var notes = document.createElement('p');
        notes.className = 'target-agreements__notes';
        notes.textContent = notesText;
        notesCell.appendChild(notes);
      }
      else
      {
        var emptyNotes = document.createElement('p');
        emptyNotes.className = 'target-agreements__notes target-agreements__notes--empty';
        emptyNotes.textContent = '—';
        notesCell.appendChild(emptyNotes);
      }
      row.appendChild(notesCell);

      var updatedCell = document.createElement('td');
      updatedCell.className = 'target-agreements__cell target-agreements__cell--updated';
      updatedCell.textContent = this.formatAgreementUpdatedAt(item);
      row.appendChild(updatedCell);

      var actionCell = document.createElement('td');
      actionCell.className = 'target-agreements__cell target-agreements__cell--actions';
      var actions = document.createElement('div');
      actions.className = 'target-agreements__actions';
      var canDelete = this.canManageContent()
        && this.page && this.page.state && this.page.state.target && this.page.state.target.targetCode;
      if (canDelete)
      {
        var editButton = this.createIconActionButton('edit', '規約を編集', 'edit-agreement');
        editButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.openAgreementModal(item);
        });
        actions.appendChild(editButton);
        var deleteButton = this.createIconActionButton('delete', '規約を削除', 'delete-agreement');
        deleteButton.dataset.agreementCode = item && item.agreementCode ? item.agreementCode : '';
        deleteButton.setAttribute('data-agreement-code', item && item.agreementCode ? item.agreementCode : '');
        deleteButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.handleAgreementDelete(item, deleteButton);
        });
        actions.appendChild(deleteButton);
      }
      else
      {
        var placeholder = document.createElement('span');
        placeholder.textContent = '—';
        actions.appendChild(placeholder);
      }
      actionCell.appendChild(actions);
      row.appendChild(actionCell);
      return row;
    }

    formatAgreementUpdatedAt(item)
    {
      if (!item)
      {
        return '—';
      }
      var updated = item.updatedAtDisplay || item.updatedAt || item.createdAtDisplay || item.createdAt || '';
      if (!updated)
      {
        return '—';
      }
      return this.formatDateOnly(updated);
    }

    formatDateOnly(value)
    {
      if (!value)
      {
        return '—';
      }
      var date = new Date(value);
      if (!Number.isNaN(date.getTime()))
      {
        var year = String(date.getFullYear());
        var month = String(date.getMonth() + 1).padStart(2, '0');
        var day = String(date.getDate()).padStart(2, '0');
        return year + '/' + month + '/' + day;
      }
      var datePart = String(value).trim();
      var spaceIndex = datePart.indexOf(' ');
      if (spaceIndex !== -1)
      {
        datePart = datePart.slice(0, spaceIndex);
      }
      var timeIndex = datePart.indexOf('T');
      if (timeIndex !== -1)
      {
        datePart = datePart.slice(0, timeIndex);
      }
      if (!datePart)
      {
        return '—';
      }
      return datePart.replace(/-/g, '/');
    }

    createAgreementAuthorDisplay(item)
    {
      var displayName = item && item.createdByDisplayName ? item.createdByDisplayName : '';
      var displayCode = item && item.createdByUserCode ? item.createdByUserCode : '';
      var fallbackName = displayName || displayCode || (item && item.updatedByDisplayName ? item.updatedByDisplayName : '');
      var fallbackCode = displayCode || (item && item.updatedByUserCode ? item.updatedByUserCode : '');
      var label = fallbackName || fallbackCode || '作成者未登録';
      var anchor = document.createElement('span');
      anchor.className = 'target-detail__submission-user-display target-agreements__author';
      applyOverviewUserMetadata(anchor, {
        prefix: '作成者',
        name: fallbackName || label,
        code: fallbackCode,
        role: '作成者'
      });

      var avatar = createUserAvatarElement({
        className: 'target-detail__submission-user-avatar',
        fallbackClass: 'target-detail__submission-user-avatar-initial',
        userCode: fallbackCode,
        displayName: fallbackName,
        fallbackLabel: label,
        avatarUrl: item && item.createdByAvatarUrl ? item.createdByAvatarUrl : '',
        alt: item && item.createdByAvatarAlt ? item.createdByAvatarAlt : label,
        transform: item && item.createdByAvatarTransform ? item.createdByAvatarTransform : '',
        size: 40,
        shape: 'circle',
        initial: item && item.createdByAvatarInitial ? item.createdByAvatarInitial : '',
        nameOverlay: true
      }, this.avatarService);
      anchor.appendChild(avatar);
      return anchor;
    }

    async handleAgreementDelete(item, button)
    {
      if (!item || !item.agreementCode || !this.page || !this.page.state || !this.page.state.target)
      {
        return;
      }
      var confirmed = await this.page.confirmDialogService.open('この規約を削除しますか？', { type: 'warning' });
      if (!confirmed)
      {
        return;
      }
      var target = this.page.state.target;
      var previousLabel = button.getAttribute('aria-label');
      var usesIconButton = button.classList.contains('table-action-button');
      var previousText = usesIconButton ? null : button.textContent;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.setAttribute('aria-label', '削除中…');
      if (!usesIconButton && previousText !== null)
      {
        button.textContent = '削除中…';
      }
      try
      {
        await this.page.callApi('TargetAgreementDelete', {
          targetCode: target.targetCode,
          agreementCode: item.agreementCode
        }, {
          requestType: 'TargetManagementAgreements'
        });
        this.page.showToast('success', '規約を削除しました。');
        await this.reloadAgreements();
      }
      catch (error)
      {
        console.error('[target-detail] failed to delete agreement', error);
        this.page.showToast('error', '規約の削除に失敗しました。');
      }
      finally
      {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        if (previousLabel)
        {
          button.setAttribute('aria-label', previousLabel);
        }
        else
        {
          button.removeAttribute('aria-label');
        }
        if (!usesIconButton && previousText !== null)
        {
          button.textContent = previousText;
        }
      }
    }

    async reloadAgreements()
    {
      if (!this.page || !this.page.state || !this.page.state.target || !this.page.state.target.targetCode)
      {
        return;
      }
      try
      {
      var result = await this.page.callApi('TargetAgreementList', { targetCode: this.page.state.target.targetCode }, {
        requestType: 'TargetManagementAgreements'
      });
        var agreements = this.page.normalizeAgreements(result && result.agreements ? result.agreements : []);
        this.page.state.target.agreements = agreements;
        this.setAgreementsData(agreements);
      }
      catch (error)
      {
        console.error('[target-detail] failed to load agreements', error);
        this.page.showToast('error', '規約の取得に失敗しました。');
      }
    }

    openAgreementModal(entry)
    {
      if (!this.page || !this.page.state || !this.page.state.target || !this.page.state.target.targetCode)
      {
        this.page.showToast('error', 'ターゲット情報が読み込まれていません。');
        return;
      }
      var modal = this.ensureAgreementModal();
      if (modal.form)
      {
        modal.form.reset();
      }
      if (modal.feedback)
      {
        modal.feedback.textContent = '';
        modal.feedback.hidden = true;
      }
      this.clearAgreementValidationState(modal);
      modal.editingItem = entry && entry.agreementCode ? entry : null;
      var isEditing = Boolean(modal.editingItem);
      if (modal.titleElement)
      {
        modal.titleElement.textContent = isEditing ? '規約を編集' : '規約を追加';
      }
      if (modal.summaryElement)
      {
        modal.summaryElement.textContent = isEditing
          ? '登録済みの規約の内容を更新します。'
          : 'ターゲットに紐づく規約を登録します。';
      }
      modal.typeInput.value = entry && entry.type ? entry.type : '';
      modal.titleInput.value = entry && entry.title ? entry.title : '';
      modal.contentInput.value = entry && entry.content ? entry.content : '';
      modal.notesInput.value = entry && entry.notes ? entry.notes : '';
      var creatorSelection = this.resolveAgreementCreatorSelection(entry)
        || this.resolveAgreementCreatorSelection(this.page && this.page.state ? this.page.state.profile : null);
      this.applyAgreementCreatorPolicy(modal, creatorSelection);
      modal.submitButton.textContent = isEditing ? '更新する' : '登録する';
      this.openScreenModal(modal);
    }

    closeAgreementModal()
    {
      var modal = this.modals && this.modals.agreement;
      if (!modal)
      {
        return;
      }
      modal.editingItem = null;
      this.closeScreenModal(modal);
    }

    ensureAgreementModal()
    {
      if (this.modals && this.modals.agreement)
      {
        return this.modals.agreement;
      }
      var shell = createScreenModalShell({
        containerClass: 'target-agreements__modal-container',
        contentClass: 'target-agreements__modal',
        titleId: 'target-agreement-modal-title',
        summaryId: 'target-agreement-modal-summary',
        title: '規約を追加',
        summary: 'ターゲットに紐づく規約を登録します。'
      });
      var form = document.createElement('form');
      form.className = 'target-agreements__form';
      form.noValidate = true;
      shell.body.appendChild(form);

      var row = document.createElement('div');
      row.className = 'target-agreements__form-row';
      var typeInput = document.createElement('input');
      typeInput.type = 'text';
      typeInput.className = 'user-management__input';
      typeInput.maxLength = 128;
      typeInput.placeholder = '例: 利用規約';
      typeInput.name = 'agreementType';
      var typeField = createAgreementField('規約タイプ', typeInput, { half: true });
      row.appendChild(typeField);

      var titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'user-management__input';
      titleInput.required = true;
      titleInput.maxLength = 256;
      titleInput.placeholder = 'タイトルを入力';
      titleInput.name = 'title';
      var titleField = createAgreementField('タイトル', titleInput);
      row.appendChild(titleField);
      form.appendChild(row);

      var creatorRow = document.createElement('div');
      creatorRow.className = 'target-agreements__form-row';
      var creatorField = document.createElement('div');
      creatorField.className = 'target-agreements__form-field target-agreements__creator-field';
      var creatorLabel = document.createElement('p');
      creatorLabel.className = 'target-agreements__label';
      creatorLabel.textContent = '作成者';
      creatorField.appendChild(creatorLabel);

      var creatorDisplay = document.createElement('div');
      creatorDisplay.className = 'target-agreements__creator-display';
      var creatorEmpty = document.createElement('p');
      creatorEmpty.className = 'target-agreements__creator-empty';
      creatorEmpty.textContent = '作成者が選択されていません。';
      creatorDisplay.appendChild(creatorEmpty);

      var creatorSummary = document.createElement('div');
      creatorSummary.className = 'target-agreements__creator-summary';
      creatorSummary.hidden = true;
      var creatorName = document.createElement('span');
      creatorName.className = 'target-agreements__creator-name';
      creatorSummary.appendChild(creatorName);
      var creatorCode = document.createElement('span');
      creatorCode.className = 'target-agreements__creator-code';
      creatorSummary.appendChild(creatorCode);
      creatorDisplay.appendChild(creatorSummary);

      var creatorInput = document.createElement('input');
      creatorInput.type = 'hidden';
      creatorInput.name = 'createdByUserCode';
      creatorInput.setAttribute('data-agreement-creator-input', 'true');
      creatorField.appendChild(creatorDisplay);
      creatorField.appendChild(creatorInput);

      var creatorActions = document.createElement('div');
      creatorActions.className = 'target-agreements__creator-actions';
      var creatorSelectButton = document.createElement('button');
      creatorSelectButton.type = 'button';
      creatorSelectButton.className = 'btn btn--ghost';
      creatorSelectButton.textContent = '作成者を選ぶ';
      creatorActions.appendChild(creatorSelectButton);
      var creatorClearButton = document.createElement('button');
      creatorClearButton.type = 'button';
      creatorClearButton.className = 'btn btn--ghost';
      creatorClearButton.textContent = 'クリア';
      creatorClearButton.disabled = true;
      creatorActions.appendChild(creatorClearButton);
      creatorField.appendChild(creatorActions);

      creatorRow.appendChild(creatorField);
      form.appendChild(creatorRow);

      var contentField = document.createElement('div');
      contentField.className = 'target-agreements__form-row';
      var contentInput = document.createElement('textarea');
      contentInput.className = 'user-management__input target-agreements__textarea';
      contentInput.required = true;
      contentInput.rows = 4;
      contentInput.maxLength = 4000;
      contentInput.placeholder = '規約本文を入力';
      contentInput.name = 'content';
      contentField.appendChild(createAgreementField('本文', contentInput));
      form.appendChild(contentField);

      var notesField = document.createElement('div');
      notesField.className = 'target-agreements__form-row';
      var notesInput = document.createElement('textarea');
      notesInput.className = 'user-management__input target-agreements__textarea';
      notesInput.rows = 3;
      notesInput.maxLength = 2000;
      notesInput.placeholder = '関係者向けのメモ (任意)';
      notesInput.name = 'notes';
      notesField.appendChild(createAgreementField('備考', notesInput));
      form.appendChild(notesField);

      var feedback = document.createElement('p');
      feedback.className = 'user-management__feedback target-agreements__form-feedback';
      feedback.setAttribute('aria-live', 'polite');
      feedback.hidden = true;
      form.appendChild(feedback);

      var actions = document.createElement('div');
      actions.className = 'target-agreements__form-actions';
      var submitButton = document.createElement('button');
      submitButton.type = 'submit';
      submitButton.className = 'btn btn--primary';
      submitButton.textContent = '登録する';
      actions.appendChild(submitButton);
      var cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'btn btn--ghost';
      cancelButton.textContent = 'キャンセル';
      actions.appendChild(cancelButton);
      form.appendChild(actions);

      var self = this;

      titleInput.addEventListener('input', function ()
      {
        self.setAgreementFieldErrorState(titleInput, false);
        self.setAgreementFieldErrorState(titleField, false);
      });
      contentInput.addEventListener('input', function ()
      {
        self.setAgreementFieldErrorState(contentInput, false);
        self.setAgreementFieldErrorState(contentField, false);
      });
      creatorSelectButton.addEventListener('click', function (event)
      {
        event.preventDefault();
        self.openAgreementCreatorSelector(modal);
      });
      creatorClearButton.addEventListener('click', function (event)
      {
        event.preventDefault();
        self.setAgreementCreatorSelection(modal, null);
      });
      form.addEventListener('submit', function (event)
      {
        event.preventDefault();
        self.handleAgreementSubmit();
      });
      cancelButton.addEventListener('click', function (event)
      {
        event.preventDefault();
        self.closeAgreementModal();
      });
      bindModalCloseHandlers(shell, function ()
      {
        self.closeAgreementModal();
      });

      var modal = Object.assign(shell, {
        form: form,
        typeInput: typeInput,
        titleInput: titleInput,
        contentInput: contentInput,
        notesInput: notesInput,
        creatorInput: creatorInput,
        submitButton: submitButton,
        cancelButton: cancelButton,
        feedback: feedback,
        titleField: titleField,
        contentField: contentField,
        titleElement: shell.title,
        summaryElement: shell.summary,
        creatorField: creatorField,
        creatorEmpty: creatorEmpty,
        creatorSummary: creatorSummary,
        creatorName: creatorName,
        creatorCode: creatorCode,
        creatorSelectButton: creatorSelectButton,
        creatorClearButton: creatorClearButton,
        creatorSelection: null,
        editingItem: null
      });
      modal.initialFocus = titleInput;
      this.modals.agreement = modal;
      return modal;
    }

    getGuidanceOwnerCandidates()
    {
      var target = this.page && this.page.state ? this.page.state.target : null;
      var candidates = [];
      var normalizeFlag = function (value)
      {
        if (typeof value === 'string')
        {
          var normalized = value.trim().toLowerCase();
          return normalized === '1' || normalized === 'true';
        }
        return value === true || value === 1;
      };
      var resolveRole = function (entry)
      {
        if (!entry || typeof entry !== 'object')
        {
          return '';
        }
        var keys = ['role', 'roleName', 'roleKey', 'assignmentRole', 'position', 'type'];
        for (var i = 0; i < keys.length; i += 1)
        {
          var key = keys[i];
          var value = entry[key];
          if (typeof value === 'string' && value.trim())
          {
            return value.trim().toLowerCase();
          }
        }
        return '';
      };
      if (target && Array.isArray(target.assignedUsers))
      {
        candidates = candidates.concat(target.assignedUsers);
      }
      var seen = Object.create(null);
      var filtered = [];
      candidates.forEach(function (entry)
      {
        if (!entry || entry.isActive === false)
        {
          return;
        }
        var role = resolveRole(entry);
        var isOperator = normalizeFlag(entry.isOperator) || role === 'operator';
        var isSupervisor = normalizeFlag(entry.isSupervisor) || role === 'supervisor' || role === 'admin';
        if (!isOperator && !isSupervisor)
        {
          return;
        }
        var displayName = entry.displayName || entry.name || entry.userCode || entry.code || '';
        var userCode = entry.userCode || entry.code || '';
        if (!displayName && !userCode)
        {
          return;
        }
        var key = (userCode || displayName).toLowerCase();
        if (key && seen[key])
        {
          return;
        }
        seen[key] = true;
        var avatarUrl = resolveAvatarField(entry, 'avatarUrl');
        var avatarTransform = resolveAvatarField(entry, 'avatarTransform');
        filtered.push({
          displayName: displayName || userCode,
          userCode: userCode,
          avatar: avatarUrl ? { src: avatarUrl } : null,
          avatarUrl: avatarUrl || '',
          avatarTransform: avatarTransform || '',
          isActive: entry.isActive !== false
        });
      });
      return filtered;
    }

    getGuidanceRoleFlags()
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

    shouldShowGuidanceOwnerField()
    {
      var flags = this.getGuidanceRoleFlags();
      return !!(flags && flags.isSupervisor);
    }

    shouldShowAgreementCreatorField()
    {
      var flags = this.getGuidanceRoleFlags();
      return !!(flags && flags.isSupervisor);
    }

    applyGuidanceOwnerPolicy(modal, selection)
    {
      if (!modal)
      {
        return;
      }
      var isSupervisor = this.shouldShowGuidanceOwnerField();
      var resolvedSelection = isSupervisor ? selection : (this.getSessionUserSelection() || selection || null);
      this.setGuidanceOwnerSelection(modal, resolvedSelection);
      if (modal.ownerField)
      {
        modal.ownerField.style.display = isSupervisor ? '' : 'none';
        if (isSupervisor)
        {
          modal.ownerField.removeAttribute('aria-hidden');
        }
        else
        {
          modal.ownerField.setAttribute('aria-hidden', 'true');
        }
      }
      if (modal.ownerActions)
      {
        modal.ownerActions.hidden = !isSupervisor;
      }
      if (modal.ownerInput)
      {
        modal.ownerInput.required = isSupervisor;
      }
      if (modal.ownerSelectButton)
      {
        modal.ownerSelectButton.hidden = !isSupervisor;
        if (isSupervisor)
        {
          modal.ownerSelectButton.removeAttribute('aria-hidden');
        }
        else
        {
          modal.ownerSelectButton.setAttribute('aria-hidden', 'true');
        }
      }
      if (modal.clearOwnerButton)
      {
        modal.clearOwnerButton.hidden = !isSupervisor;
      }
    }

    applyAgreementCreatorPolicy(modal, selection)
    {
      if (!modal)
      {
        return;
      }
      var isSupervisor = this.shouldShowAgreementCreatorField();
      var resolvedSelection = isSupervisor ? selection : (this.getSessionUserSelection() || selection || null);
      this.setAgreementCreatorSelection(modal, resolvedSelection);
      if (modal.creatorField)
      {
        modal.creatorField.style.display = isSupervisor ? '' : 'none';
        if (isSupervisor)
        {
          modal.creatorField.removeAttribute('aria-hidden');
        }
        else
        {
          modal.creatorField.setAttribute('aria-hidden', 'true');
        }
      }
      if (modal.creatorActions)
      {
        modal.creatorActions.hidden = !isSupervisor;
      }
      if (modal.creatorSelectButton)
      {
        modal.creatorSelectButton.hidden = !isSupervisor;
        if (isSupervisor)
        {
          modal.creatorSelectButton.removeAttribute('aria-hidden');
        }
        else
        {
          modal.creatorSelectButton.setAttribute('aria-hidden', 'true');
        }
      }
      if (modal.creatorClearButton)
      {
        modal.creatorClearButton.hidden = !isSupervisor;
      }
    }

    shouldShowGoalCreatorField()
    {
      var flags = this.getGuidanceRoleFlags();
      return !!(flags && flags.isSupervisor);
    }

    setGoalCreatorSelection(modal, user)
    {
      if (!modal)
      {
        return;
      }
      var displayName = user && (user.displayName || user.name || user.fullName || user.userCode)
        ? (user.displayName || user.name || user.fullName || user.userCode)
        : '';
      var userCode = user && user.userCode ? user.userCode : '';
      var selection = displayName || userCode ? { displayName: displayName || userCode, userCode: userCode } : null;
      modal.creatorSelection = selection;
      var hasSelection = !!(selection && (selection.displayName || selection.userCode));
      if (modal.creatorInput)
      {
        modal.creatorInput.value = selection && selection.userCode ? selection.userCode : '';
      }
      if (modal.creatorName)
      {
        modal.creatorName.textContent = selection ? selection.displayName : '';
      }
      if (modal.creatorCode)
      {
        modal.creatorCode.textContent = selection && selection.userCode ? '(' + selection.userCode + ')' : '';
      }
      if (modal.creatorSummary)
      {
        modal.creatorSummary.hidden = !hasSelection;
      }
      if (modal.creatorEmpty)
      {
        modal.creatorEmpty.hidden = hasSelection;
      }
      if (modal.creatorClearButton)
      {
        modal.creatorClearButton.disabled = !hasSelection;
      }
      this.setGoalFieldErrorState(modal.creatorField, false);
    }

    getGoalCreatorSelection(modal)
    {
      if (!modal)
      {
        return null;
      }
      return modal.creatorSelection || null;
    }

    applyGoalCreatorPolicy(modal, selection)
    {
      if (!modal)
      {
        return;
      }
      var isSupervisor = this.shouldShowGoalCreatorField();
      var resolvedSelection = isSupervisor ? selection : (this.getSessionUserSelection() || selection || null);
      this.setGoalCreatorSelection(modal, resolvedSelection);
      if (modal.creatorField)
      {
        modal.creatorField.style.display = isSupervisor ? '' : 'none';
        if (isSupervisor)
        {
          modal.creatorField.removeAttribute('aria-hidden');
        }
        else
        {
          modal.creatorField.setAttribute('aria-hidden', 'true');
        }
      }
      if (modal.creatorActions)
      {
        modal.creatorActions.hidden = !isSupervisor;
      }
      if (modal.creatorInput)
      {
        modal.creatorInput.required = isSupervisor;
      }
      if (modal.creatorSelectButton)
      {
        modal.creatorSelectButton.hidden = !isSupervisor;
        if (isSupervisor)
        {
          modal.creatorSelectButton.removeAttribute('aria-hidden');
        }
        else
        {
          modal.creatorSelectButton.setAttribute('aria-hidden', 'true');
        }
      }
      if (modal.creatorClearButton)
      {
        modal.creatorClearButton.hidden = !isSupervisor;
      }
    }

    resolveGoalCreatorSelection(entry)
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

    openGoalCreatorSelector(modal)
    {
      if (!this.shouldShowGoalCreatorField())
      {
        return;
      }
      var service = this.getUserSelectModalService();
      if (!service || typeof service.open !== 'function')
      {
        this.page.showToast('error', '作成者の選択モーダルを利用できません。');
        return;
      }
      var candidates = this.getGuidanceOwnerCandidates();
      if (!candidates.length)
      {
        this.page.showToast('error', '選択できる作成者が見つかりません。');
        return;
      }
      var selectedCodes = [];
      if (modal && modal.creatorSelection && modal.creatorSelection.userCode)
      {
        selectedCodes.push(modal.creatorSelection.userCode);
      }
      var options = {
        multiple: false,
        availableUsers: candidates,
        selectedCodes: selectedCodes,
        onApply: (users) =>
        {
          var first = Array.isArray(users) && users.length ? users[0] : null;
          this.setGoalCreatorSelection(modal, first);
        },
        onSelect: (user) =>
        {
          this.setGoalCreatorSelection(modal, user);
        },
        onDeselect: () =>
        {
          this.setGoalCreatorSelection(modal, null);
        },
        onClose: () =>
        {
          if (modal && modal.creatorSelectButton && typeof modal.creatorSelectButton.focus === 'function')
          {
            modal.creatorSelectButton.focus();
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

    resolveGuidanceOwnerSelection(entry)
    {
      var candidates = this.getGuidanceOwnerCandidates();
      var ownerCode = entry && entry.ownerUserCode ? String(entry.ownerUserCode).trim().toLowerCase() : '';
      var ownerName = entry && entry.ownerDisplayName ? String(entry.ownerDisplayName).trim() : '';
      if (ownerCode)
      {
        for (var i = 0; i < candidates.length; i += 1)
        {
          var candidate = candidates[i];
          if (!candidate)
          {
            continue;
          }
          if (String(candidate.userCode || '').trim().toLowerCase() === ownerCode)
          {
            return candidate;
          }
        }
      }
      if (ownerName)
      {
        return { displayName: ownerName, userCode: entry && entry.ownerUserCode ? entry.ownerUserCode : '' };
      }
      return null;
    }

    setGuidanceOwnerSelection(modal, user)
    {
      if (!modal)
      {
        return;
      }
      var previousUserCode = modal.ownerSelection && modal.ownerSelection.userCode
        ? String(modal.ownerSelection.userCode)
        : '';
      modal.ownerSelection = user || null;
      if (modal.ownerInput)
      {
        modal.ownerInput.value = user ? (user.displayName || user.userCode || '') : '';
      }
      if (modal.clearOwnerButton)
      {
        modal.clearOwnerButton.disabled = !user;
      }
      if (previousUserCode !== (user && user.userCode ? String(user.userCode) : ''))
      {
        this.resetGuidanceContentSelection(modal);
      }
      this.setGuidanceFieldErrorState(modal.ownerInput, false);
      this.setGuidanceFieldErrorState(modal.ownerField, false);
    }

    openGuidanceOwnerSelector(modal)
    {
      if (!this.shouldShowGuidanceOwnerField())
      {
        return;
      }
      var service = this.getUserSelectModalService();
      if (!service || typeof service.open !== 'function')
      {
        this.page.showToast('error', '登録者の選択モーダルを利用できません。');
        return;
      }
      var candidates = this.getGuidanceOwnerCandidates();
      if (!candidates.length)
      {
        this.page.showToast('error', '選択できる登録者が見つかりません。');
        return;
      }
      var selectedCodes = [];
      if (modal && modal.ownerSelection && modal.ownerSelection.userCode)
      {
        selectedCodes.push(modal.ownerSelection.userCode);
      }
      var options = {
        multiple: false,
        availableUsers: candidates,
        selectedCodes: selectedCodes,
        onApply: (users) =>
        {
          var first = Array.isArray(users) && users.length ? users[0] : null;
          this.setGuidanceOwnerSelection(modal, first);
        },
        onSelect: (user) =>
        {
          this.setGuidanceOwnerSelection(modal, user);
        },
        onDeselect: () =>
        {
          this.setGuidanceOwnerSelection(modal, null);
        },
        onClose: () =>
        {
          if (modal && modal.ownerSelectButton && typeof modal.ownerSelectButton.focus === 'function')
          {
            modal.ownerSelectButton.focus();
          }
        }
      };
      var zIndex = this.resolveNestedModalZIndex(modal);
      if (zIndex !== null)
      {
        options.zIndex = zIndex;
      }
      try
      {
        service.open(options);
      }
      catch (error)
      {
        console.error('[target-detail] failed to open owner selector', error);
        this.page.showToast('error', '登録者の選択に失敗しました。');
      }
    }

    getGuidanceContentOwnerSelection(modal)
    {
      if (modal && modal.ownerSelection)
      {
        return modal.ownerSelection;
      }
      return this.getSessionUserSelection();
    }

    resolveGuidanceContentOwnerParams(modal)
    {
      var selection = this.shouldShowGuidanceOwnerField()
        ? (modal && modal.ownerSelection ? modal.ownerSelection : null)
        : this.getGuidanceContentOwnerSelection(modal);
      return {
        userId: selection && selection.userId ? String(selection.userId).trim() : '',
        userCode: selection && selection.userCode ? String(selection.userCode).trim() : ''
      };
    }

    normalizeGuidanceContentSelection(entry)
    {
      if (!entry)
      {
        return null;
      }
      var code = entry.contentCode || entry.code;
      if (!code)
      {
        return null;
      }
      return {
        contentCode: String(code),
        title: entry.title || entry.fileName || entry.originalName || entry.name || String(code),
        fileName: entry.fileName || entry.originalName || '',
        contentType: entry.contentType || entry.mimeType || entry.type || '',
        ownerDisplayName: entry.ownerDisplayName || entry.ownerUserCode || '',
        updatedAtDisplay: entry.updatedAtDisplay || entry.updated_at_display || '',
        raw: entry
      };
    }

    setGuidanceContentSelection(modal, entry)
    {
      if (!modal)
      {
        return;
      }
      modal.selectedContent = this.normalizeGuidanceContentSelection(entry) || null;
      this.renderGuidanceSelectedContent(modal);
      this.setGuidanceFieldErrorState(modal.contentField, false);
    }

    resetGuidanceContentSelection(modal)
    {
      if (!modal)
      {
        return;
      }
      modal.selectedContent = null;
      this.renderGuidanceSelectedContent(modal);
    }

    renderGuidanceSelectedContent(modal)
    {
      if (!modal || !modal.contentSummary || !modal.contentList)
      {
        return;
      }
      var content = modal.selectedContent;
      modal.contentSummary.hidden = false;
      modal.contentList.innerHTML = '';
      modal.contentList.hidden = true;
      if (modal.contentClearButton)
      {
        modal.contentClearButton.disabled = !content;
      }
      if (!content)
      {
        modal.contentSummary.textContent = 'コンテンツを選択していません。';
        return;
      }
      modal.contentSummary.hidden = true;
      var item = document.createElement('li');
      item.className = 'target-submission__content-item';
      var body = document.createElement('div');
      body.className = 'target-submission__content-item-body';
      var name = document.createElement('span');
      name.className = 'target-submission__content-name';
      name.textContent = content.title || content.contentCode;
      body.appendChild(name);
      var meta = document.createElement('span');
      meta.className = 'target-submission__content-code';
      var metaParts = [content.contentCode];
      if (content.ownerDisplayName)
      {
        metaParts.push(content.ownerDisplayName);
      }
      if (content.updatedAtDisplay)
      {
        metaParts.push(content.updatedAtDisplay);
      }
      meta.textContent = metaParts.filter(Boolean).join(' / ');
      body.appendChild(meta);
      item.appendChild(body);
      var removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'target-submission__content-remove';
      removeButton.setAttribute('aria-label', '選択をクリア');
      removeButton.innerHTML = '&times;';
      removeButton.addEventListener('click', () =>
      {
        this.resetGuidanceContentSelection(modal);
      });
      item.appendChild(removeButton);
      modal.contentList.appendChild(item);
      modal.contentList.hidden = false;
    }

    openGuidanceContentSelectModal(modal)
    {
      var service = this.getContentsSelectModalService();
      if (!service || typeof service.open !== 'function')
      {
        this.page.showToast('error', 'コンテンツ選択モーダルを利用できません。');
        return;
      }
      var ownerParams = this.resolveGuidanceContentOwnerParams(modal);
      if (!ownerParams.userCode && !ownerParams.userId)
      {
        this.page.showToast('error', '登録者を選択してください。');
        this.setGuidanceFieldErrorState(modal.ownerInput, true);
        this.setGuidanceFieldErrorState(modal.ownerField, true);
        return;
      }
      var selectedItems = [];
      if (modal.selectedContent && service.jobs && service.jobs.data && typeof service.jobs.data.normalizeItem === 'function')
      {
        var normalizedExisting = service.jobs.data.normalizeItem(modal.selectedContent.raw || modal.selectedContent);
        if (normalizedExisting)
        {
          normalizedExisting.raw = normalizedExisting.raw || (modal.selectedContent.raw || modal.selectedContent);
          selectedItems.push(normalizedExisting);
        }
      }

      var applySelection = (items) =>
      {
        var chosen = Array.isArray(items) ? items[0] : items;
        if (!chosen)
        {
          return;
        }
        this.setGuidanceContentSelection(modal, chosen.raw || chosen);
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

    async openGuidanceModal(entry)
    {
      if (!this.page || !this.page.state || !this.page.state.target || !this.page.state.target.targetCode)
      {
        this.page.showToast('error', 'ターゲット情報が読み込まれていません。');
        return;
      }
      var modal = this.ensureGuidanceModal();
      try
      {
        await this.setupGuidanceUploader(modal);
      }
      catch (error)
      {
        if (window.console && typeof window.console.error === 'function')
        {
          window.console.error('[target-detail] failed to init guidance uploader', error);
        }
        this.page.showToast('error', 'アップローダーの初期化に失敗しました。');
        return;
      }
      var normalized = entry ? this.normalizeGuidanceItem(entry) : null;
      if (modal.form)
      {
        modal.form.reset();
      }
      if (modal.feedback)
      {
        modal.feedback.hidden = true;
        modal.feedback.textContent = '';
      }
      this.resetGuidanceUploadState(modal);
      this.resetGuidanceContentSelection(modal);
      this.clearGuidanceValidationState(modal);
      modal.editingItem = entry || null;
      var isEditing = Boolean(normalized && normalized.guidanceCode);
      if (modal.titleElement)
      {
        modal.titleElement.textContent = isEditing ? 'ガイダンスを編集' : 'ガイダンスコンテンツの追加';
      }
      if (modal.summaryElement)
      {
        modal.summaryElement.textContent = isEditing
          ? '登録済みのガイダンスコンテンツの情報を更新します。'
          : '共有したいガイダンスコンテンツを登録します。';
      }
      modal.submitButton.textContent = isEditing ? '更新する' : '追加する';
      modal.titleInput.value = normalized ? normalized.title : '';
      modal.descriptionInput.value = normalized ? normalized.description : '';
      var ownerSelection = normalized ? this.resolveGuidanceOwnerSelection(normalized) : null;
      this.applyGuidanceOwnerPolicy(modal, ownerSelection);
      this.setGuidanceContentSelection(modal, normalized && normalized.contentCode ? normalized : null);
      this.openScreenModal(modal);
    }

    closeGuidanceModal()
    {
      var modal = this.modals && this.modals.guidance;
      if (!modal)
      {
        return;
      }
      this.resetGuidanceUploadState(modal);
      this.resetGuidanceContentSelection(modal);
      this.closeScreenModal(modal);
    }

    ensureGuidanceModal()
    {
      if (this.modals && this.modals.guidance)
      {
        return this.modals.guidance;
      }
      var shell = createScreenModalShell({
        containerClass: 'target-detail__guidance-modal-container',
        contentClass: 'target-detail__guidance-modal',
        titleId: 'target-guidance-modal-title',
        summaryId: 'target-guidance-modal-summary',
        title: 'ガイダンスコンテンツの追加',
        summary: '共有したいガイダンスコンテンツを登録します。'
      });
      var form = document.createElement('form');
      form.className = 'target-agreements__form';
      form.noValidate = true;
      shell.body.appendChild(form);

      var titleRow = document.createElement('div');
      titleRow.className = 'target-agreements__form-row';
      var titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.required = true;
      titleInput.maxLength = 256;
      titleInput.className = 'user-management__input';
      titleInput.placeholder = 'タイトルを入力';
      var titleField = createAgreementField('タイトル', titleInput);
      titleRow.appendChild(titleField);
      form.appendChild(titleRow);
      var descriptionRow = document.createElement('div');
      descriptionRow.className = 'target-agreements__form-row';
      var descriptionInput = document.createElement('textarea');
      descriptionInput.className = 'user-management__input target-agreements__textarea';
      descriptionInput.rows = 3;
      descriptionInput.maxLength = 2000;
      descriptionInput.placeholder = '概要や説明を入力 (任意)';
      descriptionRow.appendChild(createAgreementField('概要 (任意)', descriptionInput));
      form.appendChild(descriptionRow);


      var metaRow = document.createElement('div');
      metaRow.className = 'target-agreements__form-row';
      var ownerControl = document.createElement('div');
      ownerControl.className = 'target-detail__guidance-owner-control';
      var ownerInput = document.createElement('input');
      ownerInput.type = 'text';
      ownerInput.className = 'user-management__input target-detail__guidance-owner-input';
      ownerInput.required = true;
      ownerInput.placeholder = '登録者を選択';
      ownerInput.readOnly = true;
      ownerInput.maxLength = 256;
      ownerControl.appendChild(ownerInput);
      var ownerActions = document.createElement('div');
      ownerActions.className = 'target-detail__guidance-owner-actions';
      var ownerSelectButton = document.createElement('button');
      ownerSelectButton.type = 'button';
      ownerSelectButton.className = 'btn btn--ghost target-detail__guidance-owner-button';
      ownerSelectButton.textContent = '選択';
      ownerActions.appendChild(ownerSelectButton);
      var clearOwnerButton = document.createElement('button');
      clearOwnerButton.type = 'button';
      clearOwnerButton.className = 'btn btn--ghost target-detail__guidance-owner-button';
      clearOwnerButton.textContent = 'クリア';
      ownerActions.appendChild(clearOwnerButton);
      ownerControl.appendChild(ownerActions);
      var ownerField = createAgreementField('登録者', ownerControl, { half: true });
      var ownerFieldLabel = ownerField.querySelector('label');
      var ownerControlId = ownerControl.id;
      ownerInput.id = ownerControlId ? ownerControlId + '-input' : ownerInput.id;
      if (ownerFieldLabel)
      {
        ownerFieldLabel.setAttribute('for', ownerInput.id);
      }
      metaRow.appendChild(ownerField);
      form.appendChild(metaRow);

      var contentGrid = document.createElement('div');
      contentGrid.className = 'target-submission__panel-grid target-detail__guidance-panel-grid';

      var libraryPanel = document.createElement('section');
      libraryPanel.className = 'target-submission__panel';
      libraryPanel.setAttribute('aria-labelledby', 'target-guidance-panel-library');
      var contentField = document.createElement('div');
      contentField.className = 'target-reference__form-field target-reference__form-row--full';
      var contentHeader = document.createElement('div');
      contentHeader.className = 'target-submission__content-select-header';
      var contentLabel = document.createElement('p');
      contentLabel.className = 'target-reference__form-label';
      contentLabel.id = 'target-guidance-panel-library';
      contentLabel.textContent = '登録済みコンテンツから追加';
      contentHeader.appendChild(contentLabel);
      contentField.appendChild(contentHeader);
      var contentBox = document.createElement('div');
      contentBox.className = 'target-submission__content-select-box';
      var contentSummary = document.createElement('p');
      contentSummary.className = 'target-reference__upload-note';
      contentSummary.textContent = 'コンテンツを選択していません。';
      contentBox.appendChild(contentSummary);
      var contentActions = document.createElement('div');
      contentActions.className = 'target-reference__form-actions target-submission__content-select-actions';
      var contentOpenButton = document.createElement('button');
      contentOpenButton.type = 'button';
      contentOpenButton.className = 'btn btn--primary';
      contentOpenButton.textContent = 'コンテンツを選択';
      contentActions.appendChild(contentOpenButton);
      var contentClearButton = document.createElement('button');
      contentClearButton.type = 'button';
      contentClearButton.className = 'btn btn--text';
      contentClearButton.textContent = '選択をクリア';
      contentClearButton.disabled = true;
      contentActions.appendChild(contentClearButton);
      contentBox.appendChild(contentActions);
      contentField.appendChild(contentBox);
      var contentList = document.createElement('ul');
      contentList.className = 'target-submission__content-list';
      contentList.hidden = true;
      contentField.appendChild(contentList);
      libraryPanel.appendChild(contentField);
      contentGrid.appendChild(libraryPanel);

      var uploadPanel = document.createElement('section');
      uploadPanel.className = 'target-submission__panel';
      uploadPanel.setAttribute('aria-labelledby', 'target-guidance-panel-upload');
      var uploadField = document.createElement('div');
      uploadField.className = 'target-agreements__form-field target-detail__guidance-upload-field target-reference__form-row--full target-reference__form-upload';
      var uploadLabel = document.createElement('span');
      uploadLabel.className = 'target-agreements__label';
      uploadLabel.id = 'target-guidance-panel-upload';
      uploadLabel.textContent = 'コンテンツをアップロード';
      uploadField.appendChild(uploadLabel);
      var uploaderHost = document.createElement('div');
      uploaderHost.className = 'target-reference__uploader target-detail__guidance-uploader';
      uploaderHost.setAttribute('data-guidance-uploader', 'true');
      uploadField.appendChild(uploaderHost);
      var uploadCounter = document.createElement('p');
      uploadCounter.className = 'target-reference__upload-note target-detail__guidance-upload-note';
      uploadCounter.textContent = 'アップロードは任意です。ファイルを選択するとここに表示されます。';
      uploadField.appendChild(uploadCounter);
      uploadPanel.appendChild(uploadField);
      contentGrid.appendChild(uploadPanel);
      form.appendChild(contentGrid);

      var feedback = document.createElement('p');
      feedback.className = 'user-management__feedback target-agreements__form-feedback';
      feedback.setAttribute('aria-live', 'polite');
      feedback.hidden = true;
      form.appendChild(feedback);

      var actions = document.createElement('div');
      actions.className = 'target-agreements__form-actions';
      var submitButton = document.createElement('button');
      submitButton.type = 'submit';
      submitButton.className = 'btn btn--primary';
      submitButton.textContent = '追加する';
      actions.appendChild(submitButton);
      var cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'btn btn--ghost';
      cancelButton.textContent = 'キャンセル';
      actions.appendChild(cancelButton);
      form.appendChild(actions);

      var self = this;
      form.addEventListener('submit', function (event)
      {
        event.preventDefault();
        self.handleGuidanceSubmit();
      });
      cancelButton.addEventListener('click', function (event)
      {
        event.preventDefault();
        self.closeGuidanceModal();
      });
      bindModalCloseHandlers(shell, function ()
      {
        self.closeGuidanceModal();
      });

      ownerSelectButton.addEventListener('click', function (event)
      {
        event.preventDefault();
        self.openGuidanceOwnerSelector(modal);
      });

      clearOwnerButton.addEventListener('click', function (event)
      {
        event.preventDefault();
        self.setGuidanceOwnerSelection(modal, null);
      });

      if (contentOpenButton)
      {
        contentOpenButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.openGuidanceContentSelectModal(modal);
        });
      }

      if (contentClearButton)
      {
        contentClearButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.resetGuidanceContentSelection(modal);
          if (contentOpenButton && typeof contentOpenButton.focus === 'function')
          {
            contentOpenButton.focus();
          }
        });
      }

      var modal = Object.assign(shell, {
        form: form,
        titleInput: titleInput,
        ownerInput: ownerInput,
        descriptionInput: descriptionInput,
        submitButton: submitButton,
        cancelButton: cancelButton,
        feedback: feedback,
        titleElement: shell.title,
        summaryElement: shell.summary,
        uploaderHost: uploaderHost,
        uploadCounter: uploadCounter,
        contentOpenButton: contentOpenButton,
        contentClearButton: contentClearButton,
        contentList: contentList,
        contentSummary: contentSummary,
        contentField: contentField,
        titleField: titleField,
        uploadField: uploadField,
        ownerField: ownerField,
        ownerActions: ownerActions,
        ownerSelectButton: ownerSelectButton,
        clearOwnerButton: clearOwnerButton,
        ownerSelection: null,
        selectedContent: null,
        editingItem: null
      });
      modal.initialFocus = titleInput;
      this.modals.guidance = modal;
      return modal;
    }

    setGuidanceFieldErrorState(target, hasError)
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

    clearGuidanceValidationState(modal)
    {
      var targetModal = modal || (this.modals && this.modals.guidance);
      if (!targetModal)
      {
        return;
      }
      this.setGuidanceFieldErrorState(targetModal.titleInput, false);
      this.setGuidanceFieldErrorState(targetModal.titleField, false);
      this.setGuidanceFieldErrorState(targetModal.ownerInput, false);
      this.setGuidanceFieldErrorState(targetModal.ownerField, false);
      this.setGuidanceFieldErrorState(targetModal.contentField, false);
      this.setGuidanceFieldErrorState(targetModal.uploaderHost, false);
      this.setGuidanceFieldErrorState(targetModal.uploadField, false);
    }

    async handleGuidanceSubmit()
    {
      if (!this.page || !this.page.state || !this.page.state.target)
      {
        return;
      }
      var modal = this.ensureGuidanceModal();
      this.clearGuidanceValidationState(modal);
      var titleValue = modal.titleInput.value.trim();
      if (!titleValue)
      {
        if (modal.feedback)
        {
          modal.feedback.hidden = false;
          modal.feedback.textContent = 'タイトルを入力してください。';
        }
        this.setGuidanceFieldErrorState(modal.titleInput, true);
        this.setGuidanceFieldErrorState(modal.titleField, true);
        modal.titleInput.focus();
        return;
      }
      var ownerSelection = modal.ownerSelection && modal.ownerSelection.userCode ? modal.ownerSelection : null;
      if (!ownerSelection)
      {
        if (modal.feedback)
        {
          modal.feedback.hidden = false;
          modal.feedback.textContent = '登録者を選択してください。';
        }
        this.setGuidanceFieldErrorState(modal.ownerInput, true);
        this.setGuidanceFieldErrorState(modal.ownerField, true);
        if (modal.ownerSelectButton && typeof modal.ownerSelectButton.focus === 'function')
        {
          modal.ownerSelectButton.focus();
        }
        return;
      }
      var isEditing = Boolean(modal.editingItem);
      var hasUploadQueue = this.hasGuidanceUploadQueueItems();
      var hasPendingUploadResults = Array.isArray(this.pendingGuidanceUploadResults)
        && this.pendingGuidanceUploadResults.length > 0;
      var selectedContent = modal.selectedContent && modal.selectedContent.contentCode ? modal.selectedContent : null;
      var needsUpload = !isEditing && hasUploadQueue;
      var hasContentCandidate = !isEditing && (hasUploadQueue || hasPendingUploadResults || selectedContent);
      if (!hasContentCandidate)
      {
        if (modal.feedback)
        {
          modal.feedback.hidden = false;
          modal.feedback.textContent = '登録済みコンテンツを選択するか、ファイルをアップロードしてください。';
        }
        this.setGuidanceFieldErrorState(modal.contentField, true);
        this.setGuidanceFieldErrorState(modal.uploaderHost, true);
        this.setGuidanceFieldErrorState(modal.uploadField, true);
        var focusTarget = modal.contentOpenButton && typeof modal.contentOpenButton.focus === 'function'
          ? modal.contentOpenButton
          : (modal.uploaderHost && typeof modal.uploaderHost.focus === 'function' ? modal.uploaderHost : null);
        if (focusTarget)
        {
          focusTarget.focus();
        }
        return;
      }
      if (modal.feedback)
      {
        modal.feedback.hidden = true;
        modal.feedback.textContent = '';
      }
      var payload = {
        title: titleValue,
        description: modal.descriptionInput.value.trim()
      };
      payload.ownerUserCode = ownerSelection.userCode;
      payload.ownerDisplayName = ownerSelection.displayName || ownerSelection.userCode;
      var submitButton = modal.submitButton;
      var originalLabel = submitButton ? submitButton.textContent : '';
      if (submitButton)
      {
        submitButton.disabled = true;
        submitButton.textContent = isEditing ? '更新中…' : '追加中…';
      }
      try
      {
        if (needsUpload)
        {
          if (!this.guidanceUploaderService)
          {
            throw new Error('アップローダーが利用できません。');
          }
          this.guidanceUploadOwnerUserCode = ownerSelection.userCode || '';
          var uploadPayload = await this.guidanceUploaderService.startUpload();
          if (!uploadPayload)
          {
            throw new Error('ファイルのアップロードに失敗しました。');
          }
          var uploadedContent = this.getUploadedGuidanceContentFromPayload(uploadPayload);
          if (!uploadedContent || !uploadedContent.contentCode)
          {
            throw new Error('アップロードしたコンテンツ情報を取得できませんでした。');
          }
          payload.contentCode = uploadedContent.contentCode;
          payload.fileName = uploadedContent.fileName || '';
          payload.categoryLabel = resolveContentTypeLabel(uploadedContent.contentType);
          var formattedSize = '';
          if (this.helpers && typeof this.helpers.formatFileSize === 'function')
          {
            formattedSize = this.helpers.formatFileSize(uploadedContent.fileSize);
          }
          else if (window.Utils && typeof window.Utils.formatBytes === 'function')
          {
            formattedSize = window.Utils.formatBytes(uploadedContent.fileSize);
          }
          if (formattedSize)
          {
            payload.sizeDisplay = formattedSize;
          }
          var timestamp = new Date().toISOString();
          if (this.helpers && typeof this.helpers.formatDateTime === 'function')
          {
            payload.updatedAtDisplay = this.helpers.formatDateTime(timestamp);
          }
          else
          {
            payload.updatedAtDisplay = timestamp;
          }
        }
        else if (!isEditing && hasPendingUploadResults)
        {
          var uploadedResult = this.getUploadedGuidanceContentFromPayload();
          if (!uploadedResult || !uploadedResult.contentCode)
          {
            throw new Error('アップロードしたコンテンツ情報を取得できませんでした。');
          }
          payload.contentCode = uploadedResult.contentCode;
          payload.fileName = uploadedResult.fileName || '';
          payload.categoryLabel = resolveContentTypeLabel(uploadedResult.contentType);
        }
        else if (!isEditing && selectedContent)
        {
          payload.contentCode = selectedContent.contentCode;
          if (selectedContent.fileName)
          {
            payload.fileName = selectedContent.fileName;
          }
          if (selectedContent.contentType)
          {
            payload.categoryLabel = resolveContentTypeLabel(selectedContent.contentType);
          }
        }
        var normalizedCategory = normalizeGuidanceTypeFromValue(payload.categoryLabel || payload.category);
        if (normalizedCategory)
        {
          payload.category = normalizedCategory;
        }
        var response = null;
        if (isEditing)
        {
          var code = this.getGuidanceCode(modal.editingItem);
          if (!code)
          {
            throw new Error('ガイダンスコードを取得できませんでした。');
          }
          payload.guidanceCode = code;
          response = await this.updateGuidanceContent(payload);
          this.page.showToast('success', 'ガイダンスコンテンツを更新しました。');
        }
        else
        {
          if (!payload.contentCode)
          {
            throw new Error('アップロードしたファイル情報が見つかりません。');
          }
          response = await this.createGuidanceContent(payload);
          this.page.showToast('success', 'ガイダンスコンテンツを追加しました。');
        }
        var guidance = response && response.guidance ? response.guidance : null;
        if (guidance)
        {
          this.upsertGuidanceContent(guidance);
        }
        this.resetGuidanceUploadState();
        this.refreshBasicPanel();
        this.closeGuidanceModal();
      }
      catch (error)
      {
        console.error('[target-detail] failed to save guidance contents', error);
        var message = error && error.message ? error.message : 'ガイダンスコンテンツの保存に失敗しました。';
        if (modal.feedback)
        {
          modal.feedback.hidden = false;
          modal.feedback.textContent = message;
        }
        this.page.showToast('error', 'ガイダンスコンテンツの保存に失敗しました。');
      }
      finally
      {
        if (submitButton)
        {
          submitButton.disabled = false;
          submitButton.textContent = originalLabel;
        }
        this.guidanceUploadOwnerUserCode = '';
      }
    }

    async setupGuidanceUploader(modal)
    {
      if (this.guidanceUploaderService || !modal || !modal.uploaderHost)
      {
        return;
      }
      await window.Utils.loadScriptsSync(['/js/service-app/content-uploader/main.js']);
      var self = this;
      this.guidanceUploaderService = new window.Services.ContentUploader({
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
          return self.uploadGuidanceContent(file, options || {});
        },
        onQueueChange: function (queue)
        {
          self.handleGuidanceUploaderQueueChange(queue);
        },
        onStart: function (queue)
        {
          return self.handleGuidanceUploaderStart(queue);
        },
        onComplete: function (payload)
        {
          return self.handleGuidanceUploaderComplete(payload);
        }
      });
      await this.guidanceUploaderService.boot();
      this.guidanceUploaderService.mount(modal.uploaderHost);
      this.updateGuidanceUploadCounterText(0, modal);
    }

    handleGuidanceUploaderQueueChange(queue)
    {
      var count = Array.isArray(queue) ? queue.length : 0;
      this.updateGuidanceUploadCounterText(count);
      if (!count)
      {
        this.pendingGuidanceUploadResults = [];
      }
    }

    handleGuidanceUploaderStart(queue)
    {
      this.pendingGuidanceUploadResults = [];
      this.updateGuidanceUploadCounterText(Array.isArray(queue) ? queue.length : 0);
      var modal = this.modals && this.modals.guidance;
      if (modal && modal.feedback)
      {
        modal.feedback.hidden = false;
        modal.feedback.textContent = 'ファイルのアップロードを開始しました。完了までお待ちください。';
      }
    }

    handleGuidanceUploaderComplete(payload)
    {
      var uploadedCount = payload && typeof payload.uploadedCount === 'number' ? payload.uploadedCount : 0;
      this.pendingGuidanceUploadResults = Array.isArray(payload && payload.results) ? payload.results : [];
      this.updateGuidanceUploadCounterText(0);
      if (uploadedCount > 0)
      {
        var modal = this.modals && this.modals.guidance;
        if (modal && modal.feedback)
        {
          modal.feedback.hidden = false;
          modal.feedback.textContent = 'ファイルのアップロードが完了しました。';
        }
      }
    }

    resetGuidanceUploadState(modal)
    {
      var targetModal = modal || (this.modals && this.modals.guidance);
      this.pendingGuidanceUploadResults = [];
      this.guidanceUploadOwnerUserCode = '';
      this.updateGuidanceUploadCounterText(0, targetModal);
      if (this.guidanceUploaderService && this.guidanceUploaderService.state && this.guidanceUploaderService.jobs)
      {
        this.guidanceUploaderService.state.queue = [];
        this.guidanceUploaderService.jobs.dom.renderQueue(
          this.guidanceUploaderService.state.queue,
          false,
          this.guidanceUploaderService.config
        );
      }
    }

    updateGuidanceUploadCounterText(count, modal)
    {
      var targetModal = modal || (this.modals && this.modals.guidance);
      if (!targetModal || !targetModal.uploadCounter)
      {
        return;
      }
      var message = count > 0
        ? '選択中: ' + count + '件のファイル'
        : 'アップロードするファイルを選択してください。';
      targetModal.uploadCounter.textContent = message;
    }

    hasGuidanceUploadQueueItems()
    {
      if (!this.guidanceUploaderService || !this.guidanceUploaderService.state)
      {
        return false;
      }
      var queue = this.guidanceUploaderService.state.queue || [];
      return queue.length > 0;
    }

    getUploadedGuidanceContentFromPayload(payload)
    {
      var results = Array.isArray(payload && payload.results) ? payload.results : this.pendingGuidanceUploadResults;
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

    uploadGuidanceContent(file, options)
    {
      if (!file)
      {
        return Promise.reject(new Error('ファイルを選択してください。'));
      }
      var formData = new window.FormData();
      var fileName = file.name || 'guidance-upload';
      formData.append('fileName', fileName);
      formData.append('file', file, fileName);
      var ownerUserCode = this.resolveGuidanceUploadOwnerUserCode();
      if (ownerUserCode)
      {
        formData.append('ownerUserCode', ownerUserCode);
      }
      var requestOptions = window.Utils.buildApiRequestOptions('Contents', 'ContentUpload', formData);
      return this.sendGuidanceUploadRequest(requestOptions, options || {});
    }

    resolveGuidanceUploadOwnerUserCode()
    {
      if (this.guidanceUploadOwnerUserCode)
      {
        return this.guidanceUploadOwnerUserCode;
      }
      var modal = this.modals && this.modals.guidance ? this.modals.guidance : null;
      if (modal && modal.ownerSelection && modal.ownerSelection.userCode)
      {
        return String(modal.ownerSelection.userCode).trim();
      }
      return '';
    }

    sendGuidanceUploadRequest(requestOptions, options)
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
            try
            {
              var json = JSON.parse(xhr.responseText || '{}');
              if (json && json.status === 'OK')
              {
                resolve(json.result || {});
                return;
              }
            }
            catch (error)
            {
              reject(error);
              return;
            }
          }
          reject(new Error('ファイルのアップロードに失敗しました。'));
        };
        if (requestOptions.headers)
        {
          Object.keys(requestOptions.headers).forEach(function (key)
          {
            xhr.setRequestHeader(key, requestOptions.headers[key]);
          });
        }
        var requestBody = requestOptions.data || requestOptions.body;
        xhr.send(requestBody);
      });
    }

    async handleGuidanceDelete(entry)
    {
      if (!this.page || !this.page.state || !this.page.state.target)
      {
        return;
      }
      var target = this.page.state.target;
      var code = this.getGuidanceCode(entry);
      if (!code)
      {
        return;
      }
      var confirmed = await this.page.confirmDialogService.open('このガイダンスコンテンツを削除しますか？', { type: 'warning' });
      if (!confirmed)
      {
        return;
      }
      try
      {
        await this.deleteGuidanceContent(target.targetCode, code);
        this.removeGuidanceContentByCode(code);
        this.page.showToast('success', 'ガイダンスコンテンツを削除しました。');
      }
      catch (error)
      {
        console.error('[target-detail] failed to delete guidance content', error);
        this.refreshBasicPanel();
        this.page.showToast('error', 'ガイダンスコンテンツの削除に失敗しました。');
        return;
      }
      this.refreshBasicPanel();
    }

    async createGuidanceContent(payload)
    {
      var params = {
        targetCode: this.page.state.target.targetCode,
        title: payload.title,
        contentCode: payload.contentCode
      };
      if (payload.category)
      {
        params.category = payload.category;
      }
      if (payload.ownerUserCode)
      {
        params.ownerUserCode = payload.ownerUserCode;
      }
      return this.page.callApi('TargetGuidanceCreate', params, { requestType: 'TargetManagementTargets' });
    }

    async updateGuidanceContent(payload)
    {
      var params = {
        targetCode: this.page.state.target.targetCode,
        guidanceCode: payload.guidanceCode,
        title: payload.title
      };
      if (payload.category)
      {
        params.category = payload.category;
      }
      if (payload.ownerUserCode)
      {
        params.ownerUserCode = payload.ownerUserCode;
      }
      return this.page.callApi('TargetGuidanceUpdate', params, { requestType: 'TargetManagementTargets' });
    }

    async deleteGuidanceContent(targetCode, guidanceCode)
    {
      return this.page.callApi('TargetGuidanceDelete', {
        targetCode: targetCode,
        guidanceCode: guidanceCode
      }, { requestType: 'TargetManagementTargets' });
    }

    upsertGuidanceContent(entry)
    {
      if (!entry || !this.page || !this.page.state || !this.page.state.target)
      {
        return;
      }
      var target = this.page.state.target;
      if (!Array.isArray(target.guidanceContents))
      {
        target.guidanceContents = [];
      }
      var code = this.getGuidanceCode(entry);
      var index = -1;
      if (code)
      {
        for (var i = 0; i < target.guidanceContents.length; i += 1)
        {
          if (this.getGuidanceCode(target.guidanceContents[i]) === code)
          {
            index = i;
            break;
          }
        }
      }
      if (index === -1)
      {
        target.guidanceContents.push(entry);
      }
      else
      {
        target.guidanceContents[index] = entry;
      }
    }

    removeGuidanceContentByCode(code)
    {
      if (!code || !this.page || !this.page.state || !this.page.state.target)
      {
        return;
      }
      var target = this.page.state.target;
      if (!Array.isArray(target.guidanceContents) || !target.guidanceContents.length)
      {
        return;
      }
      var self = this;
      var next = target.guidanceContents.filter(function (item)
      {
        return self.getGuidanceCode(item) !== code;
      });
      target.guidanceContents = next;
    }

    normalizeGuidanceItem(entry)
    {
      if (!entry)
      {
        return null;
      }
      var code = this.getGuidanceCode(entry);
      var title = entry.title || entry.fileName || entry.name || 'ガイダンスコンテンツ';
      var description = entry.description || entry.summary || '';
      var linkUrl = entry.linkUrl || entry.previewUrl || entry.downloadUrl || entry.url || '';
      var categoryValue = '';
      var categoryCandidates = [
        normalizeGuidanceTypeFromValue(entry.category),
        normalizeGuidanceTypeFromValue(entry.categoryLabel),
        normalizeGuidanceTypeFromValue(entry.contentType),
        detectGuidanceTypeFromExtension(entry.fileName),
        detectGuidanceTypeFromUrl(linkUrl)
      ];
      for (var i = 0; i < categoryCandidates.length; i += 1)
      {
        var candidate = categoryCandidates[i];
        if (!candidate)
        {
          continue;
        }
        if (candidate === 'pdf')
        {
          categoryValue = 'pdf';
          break;
        }
        if (!categoryValue)
        {
          categoryValue = candidate;
        }
      }
      var previewUrl = entry.previewUrl || entry.embedUrl || entry.linkUrl || entry.downloadUrl || '';
      return {
        guidanceCode: code,
        title: title,
        categoryLabel: entry.categoryLabel || entry.category || '',
        category: categoryValue,
        sizeDisplay: entry.sizeDisplay || entry.size || '',
        updatedAtDisplay: entry.updatedAtDisplay || entry.updatedAt || '',
        createdAtDisplay: entry.createdAtDisplay || entry.createdAt || '',
        ownerUserCode: entry.ownerUserCode || entry.ownerCode || '',
        ownerDisplayName: entry.ownerDisplayName || entry.owner || '',
        ownerAvatarUrl: entry.ownerAvatarUrl || entry.ownerAvatar || '',
        ownerAvatarTransform: entry.ownerAvatarTransform || '',
        description: description,
        linkUrl: linkUrl,
        fileName: entry.fileName || '',
        contentType: entry.contentType || '',
        downloadUrl: entry.downloadUrl || '',
        previewUrl: previewUrl,
        thumbnailUrl: entry.previewImage || entry.thumbnailUrl || entry.thumbnail || entry.previewImageUrl || '',
        embedUrl: entry.embedUrl || '',
        youtubeUrl: entry.youtubeUrl || '',
        contentCode: entry.contentCode || entry.assetCode || '',
        source: entry
      };
    }

    getGuidanceCode(entry)
    {
      if (!entry)
      {
        return '';
      }
      var candidates = [entry.guidanceCode, entry.contentCode, entry.code];
      for (var i = 0; i < candidates.length; i += 1)
      {
        var value = candidates[i];
        if (typeof value === 'string')
        {
          var trimmed = value.trim();
          if (trimmed)
          {
            return trimmed;
          }
        }
      }
      return '';
    }

    renderGoalsSection(target)
    {
      var canManage = this.canManageContent() && Boolean(target && target.targetCode);
      var section = document.createElement('section');
      section.className = 'target-detail__goals target-detail__section-block';

      var headingRow = document.createElement('div');
      headingRow.className = 'target-goals__actions';
      var heading = document.createElement('h3');
      heading.className = 'target-goals__title';
      heading.textContent = '目標';
      headingRow.appendChild(heading);

      var addButton = null;
      var self = this;
      if (canManage)
      {
        addButton = this.createBannerButton('目標を追加', 'add-goal', {
          baseClass: 'target-management__icon-button target-management__icon-button--primary target-goals__add-button',
          buttonType: 'expandable-icon-button/add'
        }, COMPACT_BANNER_CLASS);
        addButton.classList.add('target-goals__add-button');
        addButton.disabled = !(target && target.targetCode);
        addButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.openGoalModal();
        });
        headingRow.appendChild(addButton);
      }

      section.appendChild(headingRow);

      var empty = document.createElement('p');
      empty.className = 'target-goals__empty';
      empty.textContent = '目標は登録されていません。';
      section.appendChild(empty);

      var table = document.createElement('table');
      table.className = 'target-goals__table';
      table.hidden = true;
      var tableWrapper = document.createElement('div');
      tableWrapper.className = 'target-goals__table-wrapper';
      tableWrapper.appendChild(table);
      section.appendChild(tableWrapper);

      this.goalsView = {
        section: section,
        table: table,
        tableWrapper: tableWrapper,
        empty: empty,
        addButton: addButton
      };
      this.setGoalsData(Array.isArray(target && target.goals) ? target.goals.slice() : []);
      return section;
    }

    setGoalsData(data)
    {
      if (this.page && typeof this.page.normalizeGoals === 'function')
      {
        this.goalsData = this.page.normalizeGoals(data);
      }
      else
      {
        this.goalsData = Array.isArray(data) ? data.slice() : [];
      }
      this.updateGoalsList();
    }

    updateGoalsList()
    {
      if (!this.goalsView || !this.goalsView.table)
      {
        return;
      }
      var table = this.goalsView.table;
      table.innerHTML = '';
      var items = Array.isArray(this.goalsData) ? this.goalsData : [];
      if (!items.length)
      {
        table.hidden = true;
        if (this.goalsView.tableWrapper)
        {
          this.goalsView.tableWrapper.hidden = true;
        }
        if (this.goalsView.empty)
        {
          this.goalsView.empty.hidden = false;
        }
        return;
      }
      table.hidden = false;
      if (this.goalsView.tableWrapper)
      {
        this.goalsView.tableWrapper.hidden = false;
      }
      if (this.goalsView.empty)
      {
        this.goalsView.empty.hidden = true;
      }
      var self = this;
      var canManage = this.canManageContent()
        && Boolean(this.page && this.page.state && this.page.state.target && this.page.state.target.targetCode);
      var thead = document.createElement('thead');
      var headerRow = document.createElement('tr');
      var headers = ['目標', '対象者', '操作'];
      headers.forEach(function (label)
      {
        var th = document.createElement('th');
        th.textContent = label;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      items.forEach(function (item)
      {
        var row = self.buildGoalTableRow(item, canManage);
        if (row)
        {
          tbody.appendChild(row);
        }
      });
      table.appendChild(tbody);
    }

    buildGoalTableRow(item, canManage)
    {
      if (!item)
      {
        return null;
      }
      var row = document.createElement('tr');
      var self = this;

      var titleCell = document.createElement('td');
      titleCell.className = 'target-goals__cell--title';
      titleCell.textContent = item.title || '目標';
      row.appendChild(titleCell);

      var targetCell = document.createElement('td');
      targetCell.className = 'target-goals__cell--target';
      targetCell.appendChild(this.createGoalTargetUsers(item));
      row.appendChild(targetCell);

      var actionsCell = document.createElement('td');
      actionsCell.className = 'target-goals__cell--actions';
      var actions = document.createElement('div');
      actions.className = 'target-goals__actions-cell';
      var detailButton = this.createIconActionButton('detail', '詳細', 'view-goal');
      detailButton.addEventListener('click', function (event)
      {
        event.preventDefault();
        self.openGoalDetailModal(item);
      });
      actions.appendChild(detailButton);

      if (canManage)
      {
        var editButton = this.createIconActionButton('edit', '目標を編集', 'edit-goal');
        editButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.openGoalModal(item);
        });
        actions.appendChild(editButton);

        var deleteButton = this.createIconActionButton('delete', '目標を削除', 'delete-goal');
        deleteButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          self.handleGoalDelete(item);
        });
        actions.appendChild(deleteButton);
      }
      actionsCell.appendChild(actions);
      row.appendChild(actionsCell);

      return row;
    }

    createGoalTargetUsers(item)
    {
      var container = document.createElement('div');
      container.className = 'target-goals__target-users';
      var scope = normalizeAudienceScope(item && (item.targetUserScope || item.audienceScope));
      var targetUsers = Array.isArray(item && item.targetUsers) ? item.targetUsers : [];
      if (scope === AUDIENCE_SCOPE.ALL)
      {
        var allAudience = document.createElement('li');
        allAudience.className = 'target-goals__target-user';
        allAudience.textContent = '全員';
        container.appendChild(allAudience);
        return container;
      }
      if (!targetUsers.length)
      {
        var empty = document.createElement('p');
        empty.className = 'target-goals__target-user';
        empty.textContent = '未設定';
        container.appendChild(empty);
        return container;
      }
      var normalizedUsers = normalizeGoalTargetUsers(targetUsers);
      if (!normalizedUsers.length)
      {
        var fallback = document.createElement('p');
        fallback.className = 'target-goals__target-user';
        fallback.textContent = '未設定';
        container.appendChild(fallback);
        return container;
      }

      var avatarsHost = document.createElement('div');
      avatarsHost.className = 'target-goals__target-users-avatars';
      var names = normalizedUsers.map(function (user)
      {
        return user.name || user.code || '';
      }).filter(Boolean);
      if (names.length)
      {
        avatarsHost.setAttribute('aria-label', names.join('、'));
      }

      var service = this.userlistAvatarService;
      if (service && typeof service.render === 'function')
      {
        var entries = normalizedUsers.map(function (user)
        {
          return {
            name: user.name || user.code || '',
            role: user.role || '',
            src: user.avatarUrl || user.src || ''
          };
        }).filter(function (entry)
        {
          return entry && entry.name;
        });

        try
        {
          service.render(avatarsHost, entries, {
            size: 32,
            overlap: 10,
            popoverAvatarSize: 40,
            popoverPlacement: 'top-start',
            popoverOffset: 12,
            nameOverlay: true
          });
        }
        catch (error)
        {
          window.console.warn('[target-detail] failed to render goal target avatars', error);
        }
      }

      container.appendChild(avatarsHost);
      return container;
    }

    formatGoalMeta(item)
    {
      if (!item)
      {
        return '更新履歴なし';
      }
      var parts = [];
      if (item.updatedAtDisplay || item.updatedAt)
      {
        parts.push('更新: ' + (item.updatedAtDisplay || item.updatedAt));
      }
      else if (item.createdAtDisplay || item.createdAt)
      {
        parts.push('作成: ' + (item.createdAtDisplay || item.createdAt));
      }
      if (item.updatedByDisplayName)
      {
        parts.push('担当: ' + item.updatedByDisplayName);
      }
      else if (item.createdByDisplayName)
      {
        parts.push('担当: ' + item.createdByDisplayName);
      }
      return parts.length ? parts.join(' / ') : '更新履歴なし';
    }

    openGoalDetailModal(entry)
    {
      if (!entry)
      {
        return;
      }
      var modal = this.ensureGoalDetailModal();
      var title = entry.title || '目標の詳細';
      if (modal.title)
      {
        modal.title.textContent = title;
      }
      if (modal.summary)
      {
        modal.summary.textContent = '目標の内容を確認できます。';
      }
      if (modal.titleValue)
      {
        modal.titleValue.textContent = title;
      }
      if (modal.targetUsersValue)
      {
        modal.targetUsersValue.innerHTML = '';
        var targetUsersList = this.createGoalTargetUsers(entry);
        modal.targetUsersValue.appendChild(targetUsersList);
      }
      if (modal.targetValue)
      {
        modal.targetValue.textContent = entry && entry.targetValue ? entry.targetValue : '—';
      }
      if (modal.evidence)
      {
        modal.evidence.textContent = entry && entry.evidence ? entry.evidence : '—';
      }
      if (modal.memo)
      {
        modal.memo.textContent = entry && entry.memo ? entry.memo : '—';
      }
      if (modal.updated)
      {
        modal.updated.textContent = this.formatGoalMeta(entry);
      }
      this.openScreenModal(modal);
    }

    closeGoalDetailModal()
    {
      if (this.modals && this.modals.goalDetail)
      {
        this.closeScreenModal(this.modals.goalDetail);
      }
    }

    ensureGoalDetailModal()
    {
      if (this.modals && this.modals.goalDetail)
      {
        return this.modals.goalDetail;
      }
      var shell = createScreenModalShell({
        containerClass: 'target-goals__modal-container',
        contentClass: 'target-goals__modal target-goals__detail-modal',
        titleId: 'target-goal-detail-title',
        summaryId: 'target-goal-detail-summary',
        title: '目標の詳細',
        summary: '目標の内容を確認できます。'
      });

      var list = document.createElement('dl');
      list.className = 'target-goals__detail-list';

      function createDetailRow(label, valueClass)
      {
        var dt = document.createElement('dt');
        dt.className = 'target-goals__detail-label';
        dt.textContent = label;
        var dd = document.createElement('dd');
        dd.className = 'target-goals__detail-value' + (valueClass ? ' ' + valueClass : '');
        list.appendChild(dt);
        list.appendChild(dd);
        return dd;
      }

      var titleValue = createDetailRow('タイトル');
      var targetUsersValue = createDetailRow('対象者', 'target-goals__detail-users');
      var targetValue = createDetailRow('目標値');
      var evidence = createDetailRow('根拠');
      var memo = createDetailRow('補足');
      var updated = createDetailRow('更新');

      shell.body.appendChild(list);

      var self = this;
      bindModalCloseHandlers(shell, function ()
      {
        self.closeGoalDetailModal();
      });

      var modal = Object.assign(shell, {
        detailList: list,
        titleValue: titleValue,
        targetUsersValue: targetUsersValue,
        targetValue: targetValue,
        evidence: evidence,
        memo: memo,
        updated: updated
      });
      this.modals.goalDetail = modal;
      return modal;
    }

    openGoalModal(entry)
    {
      if (!this.page || !this.page.state || !this.page.state.target || !this.page.state.target.targetCode)
      {
        this.page.showToast('error', 'ターゲット情報が読み込まれていません。');
        return;
      }
      var modal = this.ensureGoalModal();
      if (modal.form)
      {
        modal.form.reset();
      }
      if (modal.feedback)
      {
        modal.feedback.textContent = '';
        modal.feedback.hidden = true;
      }
      this.clearGoalValidationState(modal);
      modal.editingItem = entry && entry.goalCode ? entry : null;
      var isEditing = Boolean(modal.editingItem);
      if (modal.titleElement)
      {
        modal.titleElement.textContent = isEditing ? '目標を編集' : '目標を追加';
      }
      if (modal.summaryElement)
      {
        modal.summaryElement.textContent = isEditing
          ? '登録済みの目標を更新します。'
          : 'ターゲットに紐づく目標を登録します。';
      }
      modal.titleInput.value = entry && entry.title ? entry.title : '';
      modal.targetValueInput.value = entry && entry.targetValue ? entry.targetValue : '';
      modal.evidenceInput.value = entry && entry.evidence ? entry.evidence : '';
      modal.memoInput.value = entry && entry.memo ? entry.memo : '';
      this.applyGoalCreatorPolicy(modal, this.resolveGoalCreatorSelection(entry));
      var initialScope = entry && entry.targetUserScope
        ? normalizeAudienceScope(entry.targetUserScope)
        : normalizeAudienceScope(this.page && this.page.state && this.page.state.target
          ? this.page.state.target.audienceScope
          : AUDIENCE_SCOPE.USERS);
      modal.availableAudienceUsers = this.getTargetParticipants();
      this.setAudienceSelection(modal, entry && Array.isArray(entry.targetUsers) ? entry.targetUsers : [], { scope: initialScope });
      modal.submitButton.textContent = isEditing ? '更新する' : '登録する';
      this.openScreenModal(modal);
    }

    closeGoalModal()
    {
      var modal = this.modals && this.modals.goal;
      if (!modal)
      {
        return;
      }
      modal.editingItem = null;
      this.closeScreenModal(modal);
    }

    ensureGoalModal()
    {
      if (this.modals && this.modals.goal)
      {
        return this.modals.goal;
      }
      var shell = createScreenModalShell({
        containerClass: 'target-goals__modal-container',
        contentClass: 'target-goals__modal',
        titleId: 'target-goal-modal-title',
        summaryId: 'target-goal-modal-summary',
        title: '目標を追加',
        summary: 'ターゲットに紐づく目標を登録します。'
      });

      var form = document.createElement('form');
      form.className = 'target-goals__form';
      form.noValidate = true;
      shell.body.appendChild(form);

      var row = document.createElement('div');
      row.className = 'target-goals__form-row';
      var titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'user-management__input';
      titleInput.required = true;
      titleInput.maxLength = 256;
      titleInput.placeholder = 'タイトルを入力';
      var titleField = createGoalField('タイトル', titleInput);
      row.appendChild(titleField);

      var targetValueInput = document.createElement('input');
      targetValueInput.type = 'text';
      targetValueInput.className = 'user-management__input';
      targetValueInput.maxLength = 256;
      targetValueInput.placeholder = '例: レビュー指摘を3件解消';
      var targetValueField = createGoalField('目標値 (任意)', targetValueInput, { half: true });
      row.appendChild(targetValueField);
      form.appendChild(row);

      var creatorRow = document.createElement('div');
      creatorRow.className = 'target-goals__form-row';
      var creatorField = document.createElement('div');
      creatorField.className = 'target-goals__form-field target-goals__creator-field';
      var creatorLabel = document.createElement('p');
      creatorLabel.className = 'target-goals__label';
      creatorLabel.textContent = '作成者';
      creatorField.appendChild(creatorLabel);
      var creatorDisplay = document.createElement('div');
      creatorDisplay.className = 'target-goals__creator-display';
      var creatorEmpty = document.createElement('p');
      creatorEmpty.className = 'target-goals__creator-empty';
      creatorEmpty.textContent = '作成者が選択されていません。';
      creatorDisplay.appendChild(creatorEmpty);
      var creatorSummary = document.createElement('div');
      creatorSummary.className = 'target-goals__creator-summary';
      creatorSummary.hidden = true;
      var creatorName = document.createElement('span');
      creatorName.className = 'target-goals__creator-name';
      creatorSummary.appendChild(creatorName);
      var creatorCode = document.createElement('span');
      creatorCode.className = 'target-goals__creator-code';
      creatorSummary.appendChild(creatorCode);
      creatorDisplay.appendChild(creatorSummary);
      var creatorInput = document.createElement('input');
      creatorInput.type = 'hidden';
      creatorInput.name = 'createdByUserCode';
      creatorField.appendChild(creatorDisplay);
      creatorField.appendChild(creatorInput);
      var creatorActions = document.createElement('div');
      creatorActions.className = 'target-goals__creator-actions';
      var creatorSelectButton = document.createElement('button');
      creatorSelectButton.type = 'button';
      creatorSelectButton.className = 'btn btn--ghost';
      creatorSelectButton.textContent = '作成者を選ぶ';
      creatorActions.appendChild(creatorSelectButton);
      var creatorClearButton = document.createElement('button');
      creatorClearButton.type = 'button';
      creatorClearButton.className = 'btn btn--ghost';
      creatorClearButton.textContent = 'クリア';
      creatorClearButton.disabled = true;
      creatorActions.appendChild(creatorClearButton);
      creatorField.appendChild(creatorActions);
      creatorRow.appendChild(creatorField);
      form.appendChild(creatorRow);

      var audienceRow = document.createElement('div');
      audienceRow.className = 'target-goals__form-row';
      var audienceField = document.createElement('div');
      audienceField.className = 'target-goals__form-field target-goals__audience-field';
      var audienceLabel = document.createElement('p');
      audienceLabel.className = 'target-goals__label';
      audienceLabel.textContent = '対象ユーザー';
      audienceField.appendChild(audienceLabel);
      var audienceSummary = document.createElement('p');
      audienceSummary.className = 'target-goals__audience-count announcement-management__audience-count';
      audienceSummary.textContent = '';
      audienceField.appendChild(audienceSummary);
      var audienceTableWrapper = document.createElement('div');
      audienceTableWrapper.className = 'target-goals__audience-table-wrapper';
      var audienceTable = document.createElement('table');
      audienceTable.className = 'announcement-management__audience-table target-goals__audience-table';
      var audienceTableHead = document.createElement('thead');
      audienceTableHead.innerHTML = '' +
        '<tr>' +
        '<th scope="col">ユーザー</th>' +
        '<th scope="col" class="announcement-management__audience-action-header">操作</th>' +
        '</tr>';
      var audienceTableBody = document.createElement('tbody');
      audienceTable.appendChild(audienceTableHead);
      audienceTable.appendChild(audienceTableBody);
      audienceTableWrapper.appendChild(audienceTable);
      audienceTableWrapper.hidden = true;
      audienceField.appendChild(audienceTableWrapper);
      var audienceEmpty = document.createElement('p');
      audienceEmpty.className = 'target-goals__audience-empty announcement-management__audience-empty';
      audienceEmpty.textContent = '対象ユーザーはまだ選択されていません。';
      audienceField.appendChild(audienceEmpty);
      var audienceActions = document.createElement('div');
      audienceActions.className = 'target-goals__audience-actions';
      var selectAudienceButton = this.createBannerButton('対象を追加', 'select-goal-audience', {
        buttonType: 'content-uploader-primary',
        fallbackClass: 'btn btn--primary'
      });
      selectAudienceButton.classList.add('target-goals__audience-select');
      var self = this;
      selectAudienceButton.addEventListener('click', function (event)
      {
        event.preventDefault();
        self.openAudienceSelectionModal(goalModal);
      });
      audienceActions.appendChild(selectAudienceButton);
      audienceField.appendChild(audienceActions);
      audienceRow.appendChild(audienceField);
      form.appendChild(audienceRow);

      var evidenceField = document.createElement('div');
      evidenceField.className = 'target-goals__form-row';
      var evidenceInput = document.createElement('textarea');
      evidenceInput.className = 'user-management__input target-goals__textarea';
      evidenceInput.rows = 3;
      evidenceInput.maxLength = 2000;
      evidenceInput.placeholder = '進捗の判定方法や根拠を入力 (任意)';
      var evidenceWrapper = createGoalField('根拠 (任意)', evidenceInput);
      evidenceField.appendChild(evidenceWrapper);
      form.appendChild(evidenceField);

      var memoField = document.createElement('div');
      memoField.className = 'target-goals__form-row';
      var memoInput = document.createElement('textarea');
      memoInput.className = 'user-management__input target-goals__textarea';
      memoInput.rows = 3;
      memoInput.maxLength = 2000;
      memoInput.placeholder = '補足や背景情報を入力 (任意)';
      var memoWrapper = createGoalField('補足 (任意)', memoInput);
      memoField.appendChild(memoWrapper);
      form.appendChild(memoField);

      var feedback = document.createElement('p');
      feedback.className = 'user-management__feedback target-goals__form-feedback';
      feedback.setAttribute('aria-live', 'polite');
      feedback.hidden = true;
      form.appendChild(feedback);

      var actions = document.createElement('div');
      actions.className = 'target-goals__form-actions';
      var submitButton = document.createElement('button');
      submitButton.type = 'submit';
      submitButton.className = 'btn btn--primary';
      submitButton.textContent = '登録する';
      actions.appendChild(submitButton);
      var cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'btn btn--ghost';
      cancelButton.textContent = 'キャンセル';
      actions.appendChild(cancelButton);
      form.appendChild(actions);

      titleInput.addEventListener('input', function ()
      {
        self.setGoalFieldErrorState(titleInput, false);
        self.setGoalFieldErrorState(titleField, false);
      });

      creatorSelectButton.addEventListener('click', function (event)
      {
        event.preventDefault();
        self.openGoalCreatorSelector(goalModal);
      });

      creatorClearButton.addEventListener('click', function (event)
      {
        event.preventDefault();
        self.setGoalCreatorSelection(goalModal, null);
      });

      form.addEventListener('submit', function (event)
      {
        event.preventDefault();
        self.handleGoalSubmit();
      });
      cancelButton.addEventListener('click', function (event)
      {
        event.preventDefault();
        self.closeGoalModal();
      });
      bindModalCloseHandlers(shell, function ()
      {
        self.closeGoalModal();
      });

      var goalModal = Object.assign(shell, {
        form: form,
        titleInput: titleInput,
        targetValueInput: targetValueInput,
        evidenceInput: evidenceInput,
        memoInput: memoInput,
        feedback: feedback,
        submitButton: submitButton,
        cancelButton: cancelButton,
        titleField: titleField,
        creatorField: creatorField,
        creatorDisplay: creatorDisplay,
        creatorEmpty: creatorEmpty,
        creatorSummary: creatorSummary,
        creatorName: creatorName,
        creatorCode: creatorCode,
        creatorActions: creatorActions,
        creatorInput: creatorInput,
        creatorSelectButton: creatorSelectButton,
        creatorClearButton: creatorClearButton,
        titleElement: shell.title,
        summaryElement: shell.summary,
        audienceEmpty: audienceEmpty,
        audienceCount: audienceSummary,
        audienceTable: audienceTable,
        audienceTableBody: audienceTableBody,
        audienceTableWrapper: audienceTableWrapper,
        selectAudienceButton: selectAudienceButton,
        audienceScope: AUDIENCE_SCOPE.USERS,
        selectedUsers: [],
        audienceSelectionMode: 'append',
        audienceRenderMode: 'goal-table',
        creatorSelection: null,
        editingItem: null
      });
      this.modals.goal = goalModal;
      return goalModal;
    }

    setGoalFieldErrorState(target, hasError)
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

    clearGoalValidationState(modal)
    {
      if (!modal)
      {
        return;
      }
      this.setGoalFieldErrorState(modal.titleInput, false);
      this.setGoalFieldErrorState(modal.titleField, false);
      this.setGoalFieldErrorState(modal.creatorField, false);
    }

    async handleGoalSubmit()
    {
      if (!this.page || !this.page.state || !this.page.state.target)
      {
        return;
      }
      var target = this.page.state.target;
      if (!target.targetCode)
      {
        return;
      }
      var modal = this.ensureGoalModal();
      this.clearGoalValidationState(modal);
      var titleValue = modal.titleInput.value.trim();
      if (!titleValue)
      {
        if (modal.feedback)
        {
          modal.feedback.textContent = '目標タイトルを入力してください。';
          modal.feedback.hidden = false;
        }
        this.setGoalFieldErrorState(modal.titleInput, true);
        this.setGoalFieldErrorState(modal.titleField, true);
        modal.titleInput.focus();
        this.page.showToast('error', '目標タイトルを入力してください。');
        return;
      }
      if (modal.feedback)
      {
        modal.feedback.textContent = '';
        modal.feedback.hidden = true;
      }
      var creatorSelection = this.getGoalCreatorSelection(modal);
      if (this.shouldShowGoalCreatorField() && !(creatorSelection && creatorSelection.userCode))
      {
        if (modal.feedback)
        {
          modal.feedback.textContent = '作成者を選択してください。';
          modal.feedback.hidden = false;
        }
        this.setGoalFieldErrorState(modal.creatorField, true);
        if (modal.creatorSelectButton)
        {
          modal.creatorSelectButton.focus();
        }
        this.page.showToast('error', '作成者を選択してください。');
        return;
      }
      var payload = {
        targetCode: target.targetCode,
        title: titleValue
      };
      var isEditing = Boolean(modal.editingItem && modal.editingItem.goalCode);
      if (isEditing)
      {
        payload.goalCode = modal.editingItem.goalCode;
      }
      var targetValue = modal.targetValueInput.value.trim();
      var evidence = modal.evidenceInput.value.trim();
      var memo = modal.memoInput.value.trim();
      var audienceScope = normalizeAudienceScope(modal.audienceScope);
      var selectedUsers = Array.isArray(modal.selectedUsers) ? modal.selectedUsers : [];
      var userCodes = selectedUsers.map(function (user)
      {
        return user && user.userCode ? user.userCode : '';
      }).filter(Boolean);
      if (audienceScope === AUDIENCE_SCOPE.ALL)
      {
        payload.targetUserScope = AUDIENCE_SCOPE.ALL;
      }
      else if (userCodes.length)
      {
        payload.targetUserCodes = userCodes;
      }
      if (targetValue)
      {
        payload.targetValue = targetValue;
      }
      if (evidence)
      {
        payload.evidence = evidence;
      }
      if (memo)
      {
        payload.memo = memo;
      }
      if (!creatorSelection || !creatorSelection.userCode)
      {
        creatorSelection = this.getSessionUserSelection();
        this.setGoalCreatorSelection(modal, creatorSelection);
      }
      if (creatorSelection && creatorSelection.userCode)
      {
        payload.createdByUserCode = creatorSelection.userCode;
      }

      var submitButton = modal.submitButton;
      var originalText = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.textContent = isEditing ? '更新中…' : '登録中…';
      try
      {
        await this.page.callApi(isEditing ? 'TargetGoalUpdate' : 'TargetGoalCreate', payload, { requestType: 'TargetManagementGoals' });
        this.page.showToast('success', isEditing ? '目標を更新しました。' : '目標を登録しました。');
        await this.reloadGoals();
        this.closeGoalModal();
      }
      catch (error)
      {
        console.error('[target-detail] failed to submit goal', error);
        this.page.showToast('error', isEditing ? '目標の更新に失敗しました。' : '目標の登録に失敗しました。');
      }
      finally
      {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }

    async handleGoalDelete(entry)
    {
      if (!entry || !entry.goalCode || !this.page || !this.page.state || !this.page.state.target)
      {
        return;
      }
      if (!this.page.confirmDialogService)
      {
        return;
      }
      var confirmed = await this.page.confirmDialogService.open('この目標を削除しますか？', { type: 'warning' });
      if (!confirmed)
      {
        return;
      }
      try
      {
        await this.page.callApi('TargetGoalDelete', { targetCode: this.page.state.target.targetCode, goalCode: entry.goalCode }, { requestType: 'TargetManagementGoals' });
        this.page.showToast('success', '目標を削除しました。');
        await this.reloadGoals();
      }
      catch (error)
      {
        console.error('[target-detail] failed to delete goal', error);
        this.page.showToast('error', '目標の削除に失敗しました。');
      }
    }

    async reloadGoals()
    {
      if (!this.page || !this.page.state || !this.page.state.target || !this.page.state.target.targetCode)
      {
        return;
      }
      try
      {
        var payload = await this.page.callApi('TargetGoalList', { targetCode: this.page.state.target.targetCode }, { requestType: 'TargetManagementGoals' });
        var goals = this.page.normalizeGoals(payload && payload.goals ? payload.goals : []);
        this.page.state.target.goals = goals;
        this.setGoalsData(goals);
      }
      catch (error)
      {
        console.error('[target-detail] failed to load goals', error);
        var fallbackGoals = this.page.config && this.page.config.fallback && this.page.config.fallback.target
          ? this.page.config.fallback.target.goals
          : [];
        this.setGoalsData(fallbackGoals || []);
        this.page.showToast('error', '目標の取得に失敗しました。');
      }
    }

    openOverviewModal()
    {
      if (!this.page || !this.page.state || !this.page.state.target || !this.page.state.target.targetCode)
      {
        this.page.showToast('error', 'ターゲット情報が読み込まれていません。');
        return;
      }
      var modal = this.ensureOverviewModal();
      var target = this.page.state.target;
      modal.descriptionInput.value = target.description || '';
      modal.dueInput.value = target.dueDateDisplay || '';
      modal.basicInfoConfirmations = Array.isArray(target.basicInfoConfirmations)
        ? target.basicInfoConfirmations
        : [];
      modal.audienceSelectionMode = 'append';
      this.setAudienceSelection(
        modal,
        Array.isArray(target.assignedUsers) ? target.assignedUsers : [],
        { scope: normalizeAudienceScope(target.audienceScope), recordOriginal: true }
      );
      this.openScreenModal(modal);
    }

    closeOverviewModal()
    {
      var modal = this.modals && this.modals.overview;
      if (!modal)
      {
        return;
      }
      this.closeScreenModal(modal);
    }

    ensureOverviewModal()
    {
      if (this.modals && this.modals.overview)
      {
        return this.modals.overview;
      }
      var shell = createScreenModalShell({
        containerClass: 'target-detail__overview-modal-container',
        contentClass: 'target-detail__overview-modal',
        titleId: 'target-overview-modal-title',
        summaryId: 'target-overview-modal-summary',
        title: '概要を編集',
        summary: '概要文と期限を更新します。'
      });
      var form = document.createElement('form');
      form.className = 'target-detail__overview-form';
      form.noValidate = true;
      shell.body.appendChild(form);

      var descriptionField = document.createElement('div');
      descriptionField.className = 'target-agreements__form-row';
      var descriptionInput = document.createElement('textarea');
      descriptionInput.id = 'target-overview-description';
      descriptionInput.className = 'user-management__input target-agreements__textarea';
      descriptionInput.rows = 4;
      descriptionInput.maxLength = 4000;
      descriptionInput.placeholder = '概要を入力';
      descriptionField.appendChild(createAgreementField('概要', descriptionInput));
      form.appendChild(descriptionField);

      var dueField = document.createElement('div');
      dueField.className = 'target-agreements__form-row';
      var dueInput = document.createElement('input');
      dueInput.type = 'text';
      dueInput.id = 'target-overview-due';
      dueInput.className = 'user-management__input';
      dueInput.placeholder = '例: 2024/12/31';
      dueField.appendChild(createAgreementField('期限 (任意)', dueInput));
      form.appendChild(dueField);

      var audienceField = document.createElement('div');
      audienceField.className = 'target-agreements__form-row';
      var audienceContainer = document.createElement('div');
      audienceContainer.className = 'target-detail__audience-selector';
      var audienceSummary = document.createElement('div');
      audienceSummary.className = 'target-detail__audience-summary';
      var audienceTableWrapper = document.createElement('div');
      audienceTableWrapper.className = 'target-detail__audience-table-wrapper';
      var audienceTable = document.createElement('table');
      audienceTable.className = 'target-detail__audience-table';
      var audienceTableHead = document.createElement('thead');
      var headerRow = document.createElement('tr');
      ['ユーザー', 'アクティブ', '削除'].forEach(function (label, index)
      {
        var th = document.createElement('th');
        th.textContent = label;
        th.scope = 'col';
        if (index === 1)
        {
          th.className = 'target-detail__audience-header target-detail__audience-header--active';
        }
        else if (index === 2)
        {
          th.className = 'target-detail__audience-header target-detail__audience-header--delete';
        }
        headerRow.appendChild(th);
      });
      audienceTableHead.appendChild(headerRow);
      var audienceTableBody = document.createElement('tbody');
      audienceTable.appendChild(audienceTableHead);
      audienceTable.appendChild(audienceTableBody);
      var audienceEmpty = document.createElement('p');
      audienceEmpty.className = 'target-detail__audience-empty';
      audienceEmpty.textContent = '対象ユーザーはまだ追加されていません。';
      audienceTableWrapper.appendChild(audienceTable);
      audienceSummary.appendChild(audienceTableWrapper);
      audienceSummary.appendChild(audienceEmpty);
      var audienceActions = document.createElement('div');
      audienceActions.className = 'target-detail__audience-actions';
      var selectAudienceButton = document.createElement('button');
      selectAudienceButton.type = 'button';
      selectAudienceButton.className = 'btn btn--ghost';
      selectAudienceButton.textContent = '対象ユーザーを追加';
      audienceActions.appendChild(selectAudienceButton);
      audienceContainer.appendChild(audienceSummary);
      audienceContainer.appendChild(audienceActions);
      audienceField.appendChild(createAgreementField('対象ユーザー', audienceContainer));
      form.appendChild(audienceField);

      var actions = document.createElement('div');
      actions.className = 'target-agreements__form-actions';
      var submitButton = document.createElement('button');
      submitButton.type = 'submit';
      submitButton.className = 'btn btn--primary';
      submitButton.textContent = '保存する';
      actions.appendChild(submitButton);
      var cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'btn btn--ghost';
      cancelButton.textContent = 'キャンセル';
      actions.appendChild(cancelButton);
      form.appendChild(actions);

      var self = this;
      form.addEventListener('submit', function (event)
      {
        event.preventDefault();
        self.handleOverviewSubmit();
      });
      cancelButton.addEventListener('click', function (event)
      {
        event.preventDefault();
        self.closeOverviewModal();
      });
      bindModalCloseHandlers(shell, function ()
      {
        self.closeOverviewModal();
      });

      var modal = Object.assign(shell, {
        form: form,
        descriptionInput: descriptionInput,
        dueInput: dueInput,
        submitButton: submitButton,
        cancelButton: cancelButton,
        audienceEmpty: audienceEmpty,
        audienceTable: audienceTable,
        audienceTableWrapper: audienceTableWrapper,
        audienceTableBody: audienceTableBody,
        selectAudienceButton: selectAudienceButton,
        audienceScope: AUDIENCE_SCOPE.USERS,
        selectedUsers: [],
        basicInfoConfirmations: [],
        audienceSelectionMode: 'append',
        excludeCreatorFromAudience: false
      });
      modal.initialFocus = descriptionInput;
      selectAudienceButton.addEventListener('click', function (event)
      {
        event.preventDefault();
        self.openAudienceSelectionModal(modal);
      });
      this.setAudienceSelection(modal, [], { recordOriginal: true });
      this.modals.overview = modal;
      return modal;
    }

    async handleOverviewSubmit()
    {
      if (!this.page || !this.page.state || !this.page.state.target || !this.page.state.target.targetCode)
      {
        return;
      }
      var modal = this.ensureOverviewModal();
      var descriptionValue = modal.descriptionInput.value.trim();
      var dueValue = modal.dueInput.value.trim();
      var audienceSelection = this.serializeAudienceSelection(modal);
      var target = this.page.state.target;
      var submitButton = modal.submitButton;
      var originalText = submitButton.textContent;
      var confirmationMap = modal && modal.basicInfoConfirmationMap
        ? modal.basicInfoConfirmationMap
        : this.buildBasicInfoConfirmationMap(target.basicInfoConfirmations);
      modal.basicInfoConfirmationMap = confirmationMap;
      var blockedDeletion = audienceSelection.users.some(function (user)
      {
        var code = user && user.userCode ? String(user.userCode).trim().toLowerCase() : '';
        return Boolean(user && user.deleted && code && confirmationMap[code]);
      });
      if (blockedDeletion)
      {
        this.page.showToast('error', '基本情報が確認済みのユーザーは削除できません');
        return;
      }
      submitButton.disabled = true;
      submitButton.textContent = '保存中…';
      try
      {
        await this.page.callApi('TargetOverviewUpdate', {
          targetCode: target.targetCode,
          description: descriptionValue,
          dueDate: dueValue
        });
        await this.page.callApi('TargetAudienceUpdate', {
          targetCode: target.targetCode,
          scope: audienceSelection.scope,
          users: window.JSON.stringify(audienceSelection.users),
        });
        target.description = descriptionValue;
        target.dueDateDisplay = dueValue || '';
        target.audienceScope = audienceSelection.scope;
        target.assignAll = audienceSelection.scope === AUDIENCE_SCOPE.ALL;
        target.assignedUsers = audienceSelection.users.filter(function (user)
        {
          return user && !user.deleted;
        });
        this.page.showToast('success', '概要と対象ユーザーを更新しました。');
        this.refreshBasicPanel();
        this.closeOverviewModal();
      }
      catch (error)
      {
        console.error('[target-detail] failed to update overview or audience', error);
        this.page.showToast('error', '概要または対象ユーザーの更新に失敗しました。');
      }
      finally
      {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }

    refreshBasicPanel()
    {
      if (this.basicPanel)
      {
        this.renderBasicPanel(this.basicPanel);
      }
    }

    openScreenModal(modal)
    {
      if (!modal || !modal.root)
      {
        return;
      }
      if (modal.documentEscHandler && !modal._documentEscAttached)
      {
        document.addEventListener('keydown', modal.documentEscHandler);
        modal._documentEscAttached = true;
      }
      modal.root.removeAttribute('hidden');
      modal.root.setAttribute('aria-hidden', 'false');
      modal.root.classList.add('is-open');
      modal.restoreTarget = document.activeElement;
      var focusTarget = modal.initialFocus || modal.root.querySelector('[data-initial-focus], input, select, textarea, button');
      if (focusTarget && typeof focusTarget.focus === 'function')
      {
        try
        {
          focusTarget.focus({ preventScroll: true });
        }
        catch (error)
        {
          focusTarget.focus();
        }
      }
    }

    closeScreenModal(modal)
    {
      if (!modal || !modal.root)
      {
        return;
      }
      if (modal.documentEscHandler && modal._documentEscAttached)
      {
        document.removeEventListener('keydown', modal.documentEscHandler);
        modal._documentEscAttached = false;
      }
      modal.root.setAttribute('aria-hidden', 'true');
      modal.root.classList.remove('is-open');
      modal.root.setAttribute('hidden', 'hidden');
      var restoreTarget = modal.restoreTarget;
      modal.restoreTarget = null;
      if (restoreTarget && typeof restoreTarget.focus === 'function')
      {
        try
        {
          restoreTarget.focus({ preventScroll: true });
        }
        catch (error)
        {
          restoreTarget.focus();
        }
      }
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
      if (svc && typeof svc.createActionButton === 'function')
      {
        try
        {
          return svc.createActionButton(buttonType, options || {});
        }
        catch (error)
        {
          if (window.console && typeof window.console.warn === 'function')
          {
            window.console.warn('[target-detail] failed to create action button', error);
          }
        }
      }
      var button = document.createElement('button');
      button.type = options && options.type ? options.type : 'button';
      button.className = fallbackClass || 'btn btn--ghost';
      if (options && options.label)
      {
        button.textContent = options.label;
      }
      if (options && options.disabled)
      {
        button.disabled = true;
      }
      if (options && options.attributes)
      {
        Object.keys(options.attributes).forEach(function (key)
        {
          button.setAttribute(key, options.attributes[key]);
        });
      }
      if (options && options.dataset)
      {
        Object.keys(options.dataset).forEach(function (key)
        {
          button.dataset[key] = options.dataset[key];
        });
      }
      if (options && options.ariaLabel)
      {
        button.setAttribute('aria-label', options.ariaLabel);
      }
      return button;
    }

    createIconActionButton(buttonType, label, actionName, disabled)
    {
      var dataset = actionName ? { action: actionName } : {};
      var attributes = actionName ? { 'data-action': actionName } : {};
      return this.createServiceActionButton(buttonType, {
        label: label,
        ariaLabel: label,
        title: label,
        hoverLabel: label,
        dataset: dataset,
        attributes: attributes,
        disabled: Boolean(disabled)
      }, 'btn btn--ghost');
    }

    createBannerButton(label, actionName, overrides, fallbackClass)
    {
      var dataset = actionName ? { action: actionName } : {};
      var attributes = actionName ? { 'data-action': actionName } : {};
      var baseOptions = {
        label: label,
        ariaLabel: label,
        hoverLabel: label,
        title: label,
        dataset: dataset,
        attributes: attributes,
        type: 'button'
      };
      var options = overrides && typeof overrides === 'object'
        ? Object.assign({}, baseOptions, overrides)
        : baseOptions;
      var serviceButtonType = options.buttonType || 'content-uploader-primary';
      if (options.buttonType)
      {
        delete options.buttonType;
      }
      var fallbackClassName = options.fallbackClass || fallbackClass;
      if (options.fallbackClass)
      {
        delete options.fallbackClass;
      }
      var fallback = typeof fallbackClassName === 'string' && fallbackClassName.trim()
        ? fallbackClassName
        : 'btn btn--primary';
      var button = this.createServiceActionButton(serviceButtonType, options, fallback);
      if (serviceButtonType === 'expandable-icon-button/add')
      {
        this.applyExpandableAddIconFallback(button, options);
      }
      return button;
    }

    applyExpandableAddIconFallback(button, options)
    {
      if (!button)
      {
        return;
      }
      var iconContainer = button.querySelector('.target-management__icon');
      var svg = button.querySelector('svg');

      if (!iconContainer)
      {
        iconContainer = document.createElement('span');
        iconContainer.className = 'target-management__icon';
        if (svg)
        {
          iconContainer.appendChild(svg);
        }
        button.insertBefore(iconContainer, button.firstChild);
      }

      if (!iconContainer.querySelector('svg'))
      {
        iconContainer.insertAdjacentHTML('beforeend', EXPANDABLE_ADD_ICON_HTML);
      }

      var srLabel = options && options.label ? options.label : '';
      if (!srLabel && options && options.hoverLabel)
      {
        srLabel = options.hoverLabel;
      }
      var sr = button.querySelector('.target-management__icon-label');
      if (!sr)
      {
        sr = document.createElement('span');
        sr.className = options && options.srLabelClass ? options.srLabelClass : 'target-management__icon-label';
        button.appendChild(sr);
      }
      sr.textContent = srLabel || '追加';
    }

    formatAgreementMeta(item)
    {
      if (!item)
      {
        return '更新履歴なし';
      }
      var parts = [];
      if (item.updatedAtDisplay || item.updatedAt)
      {
        parts.push('更新: ' + (item.updatedAtDisplay || item.updatedAt));
      }
      if (item.updatedByDisplayName)
      {
        parts.push('担当: ' + item.updatedByDisplayName);
      }
      else if (item.createdByDisplayName)
      {
        parts.push('担当: ' + item.createdByDisplayName);
      }
      if (!parts.length && (item.createdAtDisplay || item.createdAt))
      {
        parts.push('作成: ' + (item.createdAtDisplay || item.createdAt));
      }
      return parts.length ? parts.join(' / ') : '更新履歴なし';
    }
  }

  var NS = window.TargetDetail || (window.TargetDetail = {});
  NS.JobBasic = NS.JobBasic || TargetDetailBasicInfo;
})(window, document);
