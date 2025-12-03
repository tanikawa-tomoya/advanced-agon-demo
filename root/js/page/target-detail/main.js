(function ()
{
  'use strict';

  var TAB_ORDER = [
    'basic',
    'announcements',
    'references',
    'schedules',
    'products',
    'chat',
    'bbs',
    'submissions',
    'reviews',
    'badges',
    'survey'
  ];
  var DISPLAY_FLAG_KEYS = [
    'displayGuidance',
    'displayGoals',
    'displayAgreements',
    'displayBasicConfirmation',
    'displayAnnouncements',
    'displayReferences',
    'displaySchedules',
    'displayProducts',
    'displayCreator',
    'displayAudience',
    'displayChat',
    'displayBbs',
    'displaySubmissions',
    'displayReviews',
    'displayBadges',
    'displaySurvey'
  ];
  var AUDIENCE_SCOPE = Object.freeze({
    ALL: 'all',
    USERS: 'users'
  });
  var ACTION_VISIBILITY_RULES = [
    { role: 'manage-targets', selectors: ['[data-action="new-target"]', '[data-action="edit-target"]', '[data-action="delete-target"]'] },
    {
      role: 'manage',
      selectors: [
        '[data-action="edit-overview"]',
        '[data-action="add-guidance"]',
        '[data-action="edit-guidance"]',
        '[data-action="delete-guidance"]',
        '[data-action="add-goal"]',
        '[data-action="edit-goal"]',
        '[data-action="delete-goal"]',
        '[data-action="add-agreement"]',
        '[data-action="edit-agreement"]',
        '[data-action="delete-agreement"]'
      ]
    },
    {
      role: 'all',
      selectors: [
        '[data-action="preview-guidance"]',
        '[data-action="view-goal"]',
        '[data-action="toggle-basic-confirmation"]'
      ]
    },
    {
      role: 'manage',
      selectors: [
        '.target-announcement__add'
      ]
    },
    {
      role: 'manage',
      selectors: [
        '.target-detail__announcement-action--edit',
        '.target-detail__announcement-action--delete'
      ]
    },
    {
      role: 'all',
      selectors: ['.target-announcement__refresh', '.target-detail__announcement-action--detail']
    },
    //
    // reference
    //
    {
      role: 'manage',
      selectors: ['.target-reference__open', '.target-reference__edit', '.target-reference__delete']
    },
    {
      role: 'all',
      selectors: ['.target-reference__refresh', '.target-reference__preview', '.target-reference__download']
    },
    // reference
    //
    
    // schedule
    //
    {
      role: 'manage',
      selectors: ['.target-schedule__open', '.target-schedule__edit', '.target-schedule__delete']
    },
    {
      role: 'all',
      selectors: ['.target-schedule__refresh', '.target-schedule__preview', '.target-schedule__download']
    },
    // schedule

    // product
    //
    {
      role: 'manage',
      selectors: ['.target-product__open', '.target-product__edit', '.target-product__delete']
    },
    {
      role: 'all',
      selectors: ['.target-product__refresh', '.target-product__preview', '.target-product__download']
    },
    // product        
    {
      role: 'all',
      selectors: [
        '.target-chat__thread-add',
        '.target-chat__thread-delete',
        '.target-chat__reload',
        '.target-chat__message-delete',
        '.target-chat__composer-send'
      ]
    },
    {
      role: 'all',
      selectors: [
        '.target-bbs__thread-add',
        '.target-bbs__thread-delete',
        '.target-bbs__reload',
        '.target-bbs__message-delete',
        '.target-bbs__composer-send'
      ]
    },    
    {
      role: 'manage',
      selectors: ['.target-detail__submission-add', '.target-detail__submission-action--edit', '.target-detail__submission-action--delete']
    },
    {
      role: 'all',
      selectors: [
        '.target-detail__submission-refresh',
        '.target-detail__submission-action--detail',
        '.target-detail__submission-action--download'
      ]
    },
    {
      role: 'all',
      selectors: ['.target-detail__review-refresh', '.target-detail__submission-action--preview']
    },
    {
      role: 'manage',
      selectors: ['.target-detail__review-open']
    },
    {
      role: 'manage',
      selectors: ['.target-detail__badge-add', '.target-detail__badge-revoke']
    },
    { role: 'all', selectors: ['.target-detail__badge-refresh'] },
    {
      role: 'manage',
      selectors: [
        '.target-survey__add',
        '.target-detail__survey-action--statistics',
        '.target-detail__survey-action--edit',
        '.target-detail__survey-action--delete'
      ]
    },
    {
      role: 'all',
      selectors: ['.target-survey__refresh', '.target-detail__survey-action--preview']
    }
  ];

  function normalizeAudienceScope(value)
  {
    if (value === undefined || value === null) return AUDIENCE_SCOPE.USERS;
    var normalized = String(value).trim().toLowerCase();
    if (normalized === AUDIENCE_SCOPE.ALL || normalized === 'everyone') return AUDIENCE_SCOPE.ALL;
    return AUDIENCE_SCOPE.USERS;
  }

  function deriveTargetCodeFromQuery()
  {
    var params = new window.URLSearchParams(window.location.search);
    return params.get('targetCode') || 'target-001';
  }

  function deriveInitialTabFromQuery(defaultId)
  {
    var params = new window.URLSearchParams(window.location.search);
    var tab = params.get('initialTab');
    if (!tab) return defaultId;
    tab = tab.toLowerCase();
    return TAB_ORDER.indexOf(tab) >= 0 ? tab : defaultId;
  }

  function normalizeText(value)
  {
    if (value == null) return '';
    return String(value).trim();
  }

  function splitDelimitedValues(value)
  {
    if (typeof value !== 'string')
    {
      return [];
    }
    return value.split(/[、,，]/).map(function (entry)
    {
      return entry.trim();
    }).filter(Boolean);
  }

  var Helpers = {
    formatDate: function (value)
    {
      if (!value) return '—';
      var date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      var y = date.getFullYear();
      var m = String(date.getMonth() + 1).padStart(2, '0');
      var d2 = String(date.getDate()).padStart(2, '0');
      return y + '/' + m + '/' + d2;
    },
    formatDateTime: function (value)
    {
      if (!value) return '—';
      var date = new Date(value.replace(/-/g, '/'));
      if (Number.isNaN(date.getTime())) return value;
      var y = date.getFullYear();
      var m = String(date.getMonth() + 1).padStart(2, '0');
      var d2 = String(date.getDate()).padStart(2, '0');
      var h = String(date.getHours()).padStart(2, '0');
      var mm = String(date.getMinutes()).padStart(2, '0');
      return y + '/' + m + '/' + d2 + ' ' + h + ':' + mm;
    },
    formatFileSize: function (bytes)
    {
      var size = Number(bytes);
      if (!Number.isFinite(size) || size <= 0) return '—';
      var units = ['B', 'KB', 'MB', 'GB'];
      var index = 0;
      while (size >= 1024 && index < units.length - 1)
      {
        size /= 1024;
        index += 1;
      }
      return (size >= 10 ? Math.round(size) : size.toFixed(1)) + ' ' + units[index];
    },
    escapeHTML: function (value)
    {
      return String(value == null ? '' : value).replace(/[&<>"']/g, function (match)
      {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[match] || match;
      });
    },
    buildChip: function (label)
    {
      var span = document.createElement('span');
      span.className = 'target-detail__chip';
      span.textContent = label;
      return span;
    }
  };

  function parseTimestampValue(value)
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
    var parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  function formatDisplayTimestamp(value)
  {
    if (!value) {
      return '';
    }
    if (Helpers) {
      return Helpers.formatDateTime(value);
    }
    return value;
  }

  function deriveParticipantInitial(text, fallback)
  {
    var normalized = normalizeText(text);
    if (!normalized)
    {
      return fallback || '?';
    }
    return normalized.charAt(0);
  }

  //
  // chat
  //  
  function normalizeChatParticipantData(entry)
  {
    if (!entry)
    {
      return null;
    }
    if (typeof entry === 'string')
    {
      var label = normalizeText(entry);
      if (!label)
      {
        return null;
      }
      return {
        userCode: label,
        displayName: label,
        role: 'student',
        avatarInitial: deriveParticipantInitial(label, '？'),
        avatarUrl: '',
        avatarTransform: ''
      };
    }
    if (typeof entry !== 'object')
    {
      return null;
    }
    var userCode = normalizeText(entry.userCode || entry.code || entry.id);
    var displayName = normalizeText(entry.displayName || entry.name || entry.userName || userCode);
    if (!userCode && !displayName)
    {
      return null;
    }
    var roleRaw = normalizeText(entry.role || entry.type || entry.position || '');
    var role = roleRaw === 'coach' || roleRaw === 'mentor' || roleRaw === 'operator' ? 'coach' : 'student';
    var avatarUrl = normalizeText(
      entry.avatarUrl || entry.photoUrl || entry.imageUrl || entry.iconUrl || entry.thumbnailUrl || ''
    );
    var avatarInitial = normalizeText(entry.avatarInitial || entry.initial || '');
    if (!avatarInitial)
    {
      avatarInitial = deriveParticipantInitial(displayName || userCode, '');
    }
    return {
      userCode: userCode || displayName,
      displayName: displayName || userCode || 'ユーザー',
      role: role || 'student',
      avatarUrl: avatarUrl,
      avatarInitial: avatarInitial,
      avatarTransform: normalizeText(entry.avatarTransform || '')
    };
  }

  function dedupeChatParticipants(list)
  {
    var map = Object.create(null);
    list.forEach(function (participant)
    {
      if (!participant)
      {
        return;
      }
      var key = normalizeText(participant.userCode || participant.displayName);
      if (!key)
      {
        return;
      }
      if (!map[key])
      {
        map[key] = participant;
        return;
      }
      map[key] = Object.assign({}, map[key], participant);
    });
    var values = [];
    Object.keys(map).forEach(function (key)
    {
      values.push(map[key]);
    });
    return values;
  }
  // chat

  //
  // bbs
  //  
  function normalizeBbsParticipantData(entry)
  {
    if (!entry)
    {
      return null;
    }
    if (typeof entry === 'string')
    {
      var label = normalizeText(entry);
      if (!label)
      {
        return null;
      }
      return {
        userCode: label,
        displayName: label,
        role: 'student',
        avatarInitial: deriveParticipantInitial(label, '？'),
        avatarUrl: '',
        avatarTransform: ''
      };
    }
    if (typeof entry !== 'object')
    {
      return null;
    }
    var userCode = normalizeText(entry.userCode || entry.code || entry.id);
    var displayName = normalizeText(entry.displayName || entry.name || entry.userName || userCode);
    if (!userCode && !displayName)
    {
      return null;
    }
    var roleRaw = normalizeText(entry.role || entry.type || entry.position || '');
    var role = roleRaw === 'coach' || roleRaw === 'mentor' || roleRaw === 'operator' ? 'coach' : 'student';
    var avatarUrl = normalizeText(
      entry.avatarUrl || entry.photoUrl || entry.imageUrl || entry.iconUrl || entry.thumbnailUrl || ''
    );
    var avatarInitial = normalizeText(entry.avatarInitial || entry.initial || '');
    if (!avatarInitial)
    {
      avatarInitial = deriveParticipantInitial(displayName || userCode, '');
    }
    return {
      userCode: userCode || displayName,
      displayName: displayName || userCode || 'ユーザー',
      role: role || 'student',
      avatarUrl: avatarUrl,
      avatarInitial: avatarInitial,
      avatarTransform: normalizeText(entry.avatarTransform || '')
    };
  }

  function dedupeBbsParticipants(list)
  {
    var map = Object.create(null);
    list.forEach(function (participant)
    {
      if (!participant)
      {
        return;
      }
      var key = normalizeText(participant.userCode || participant.displayName);
      if (!key)
      {
        return;
      }
      if (!map[key])
      {
        map[key] = participant;
        return;
      }
      map[key] = Object.assign({}, map[key], participant);
    });
    var values = [];
    Object.keys(map).forEach(function (key)
    {
      values.push(map[key]);
    });
    return values;
  }
  // bbs  

  function extractAvatarUrl(candidate)
  {
    if (!candidate)
    {
      return '';
    }
    if (typeof candidate === 'string')
    {
      return normalizeText(candidate);
    }
    if (typeof candidate !== 'object')
    {
      return '';
    }
    var keys = ['src', 'url', 'href', 'imageUrl', 'imageURL', 'avatarUrl', 'avatarURL', 'photoUrl', 'photoURL'];
    for (var i = 0; i < keys.length; i += 1)
    {
      var key = keys[i];
      if (!Object.prototype.hasOwnProperty.call(candidate, key))
      {
        continue;
      }
      var value = normalizeText(candidate[key]);
      if (value)
      {
        return value;
      }
    }
    return '';
  }

  function resolveCreatorAvatarData(raw, userCode)
  {
    var result = { url: '', transform: '' };
    if (!raw)
    {
      return result;
    }
    var directSources = [
      raw.createdByAvatarUrl,
      raw.createdByAvatarURL,
      raw.createdByUserAvatarUrl,
      raw.createdByUserAvatarURL,
      raw.createdByPhotoUrl,
      raw.createdByPhotoURL,
      raw.createdByImageUrl,
      raw.createdByImageURL
    ];
    for (var i = 0; i < directSources.length; i += 1)
    {
      var normalized = normalizeText(directSources[i]);
      if (normalized)
      {
        result.url = normalized;
        break;
      }
    }
    if (!result.url)
    {
      var objectSources = [
        raw.createdByAvatar,
        raw.createdByUserAvatar,
        raw.createdBy && raw.createdBy.avatar,
        raw.createdByUser && raw.createdByUser.avatar,
        raw.createdByProfile && raw.createdByProfile.avatar,
        raw.createdByUserProfile && raw.createdByUserProfile.avatar,
        raw.createdByInfo && raw.createdByInfo.avatar
      ];
      for (var j = 0; j < objectSources.length; j += 1)
      {
        var url = extractAvatarUrl(objectSources[j]);
        if (url)
        {
          result.url = url;
          break;
        }
      }
    }
    var transformSources = [
      raw.createdByAvatarTransform,
      raw.createdByAvatar && raw.createdByAvatar.transform,
      raw.createdByUserAvatar && raw.createdByUserAvatar.transform
    ];
    for (var k = 0; k < transformSources.length; k += 1)
    {
      var transform = normalizeText(transformSources[k]);
      if (transform)
      {
        result.transform = transform;
        break;
      }
    }
    if (!result.url && userCode)
    {
      var participants = Array.isArray(raw.chatParticipants) ? raw.chatParticipants : [];
      for (var m = 0; m < participants.length; m += 1)
      {
        var participant = participants[m];
        if (!participant)
        {
          continue;
        }
        var participantCode = normalizeText(participant.userCode || participant.code || '');
        if (!participantCode || participantCode !== userCode)
        {
          continue;
        }
        var participantUrl = normalizeText(participant.avatarUrl || participant.photoUrl || participant.imageUrl || '');
        if (participantUrl)
        {
          result.url = participantUrl;
        }
        var participantTransform = normalizeText(participant.avatarTransform || participant.transform || '');
        if (participantTransform)
        {
          result.transform = participantTransform;
        }
        break;
      }
    }
    return result;
  }

  function createThreadPreview(text)
  {
    if (!text)
    {
      return '';
    }
    return String(text).replace(/\s+/g, ' ').slice(0, 60);
  }

  //
  // chat
  //
  function normalizeChatAttachmentData(entry)
  {
    if (!entry || typeof entry !== 'object')
    {
      return null;
    }
    var contentCode = normalizeText(entry.contentCode || entry.code || '');
    var attachmentCode = normalizeText(entry.attachmentCode || contentCode || entry.id || entry.code);
    var typeRaw = normalizeText(entry.type || entry.category || entry.format || '');
    var type = typeRaw;
    if (!type) {
      type = 'file';
    }
    if (type === 'doc' || type === 'document') {
      type = 'file';
    }
    if (type === 'url') {
      type = 'link';
    }
    var sizeDisplay = normalizeText(entry.sizeDisplay || '');
    if (!sizeDisplay && Helpers) {
      sizeDisplay = Helpers.formatFileSize(entry.size);
    }
    return {
      attachmentCode: attachmentCode || 'attachment-' + Math.random().toString(16).slice(2),
      contentCode: contentCode,
      name: normalizeText(entry.name || entry.title || entry.fileName) || '添付ファイル',
      type: type,
      typeLabel: normalizeText(entry.typeLabel || entry.categoryLabel || ''),
      sizeDisplay: sizeDisplay,
      downloadUrl: normalizeText(entry.downloadUrl || entry.url || entry.href || entry.linkUrl || ''),
      url: normalizeText(entry.url || entry.href || entry.downloadUrl || entry.linkUrl || ''),
      previewUrl: normalizeText(entry.previewUrl || entry.posterUrl || ''),
      fileName: normalizeText(entry.fileName || ''),
      uploadedAtDisplay: normalizeText(entry.uploadedAtDisplay || entry.createdAtDisplay || '')
    };
  }

  function normalizeChatMessageData(entry, participants)
  {
    if (!entry || typeof entry !== 'object')
    {
      return null;
    }
    var messageCode = normalizeText(entry.messageCode || entry.messageId || entry.id || '');
    if (!messageCode)
    {
      messageCode = 'message-' + Math.random().toString(16).slice(2);
    }
    var senderUserCode = normalizeText(
      entry.senderUserCode || entry.senderCode || entry.userCode || entry.authorCode || ''
    );
    var senderCode = senderUserCode;
    var participantRecord = null;
    if (senderCode && Array.isArray(participants))
    {
      participantRecord = participants.find(function (participant)
      {
        return participant && participant.userCode === senderCode;
      }) || null;
    }
    var senderName = normalizeText(
      entry.senderName
      || entry.senderUserName
      || entry.senderUserDisplayName
      || entry.userDisplayName
      || (participantRecord && participantRecord.displayName)
      || ''
    );
    var content = normalizeText(entry.content || entry.body || entry.text);
    var sentAt = entry.sentAt || entry.createdAt || entry.timestamp || '';
    var sentAtValue = parseTimestampValue(sentAt);
    var sentAtDisplay = entry.sentAtDisplay || entry.createdAtDisplay || formatDisplayTimestamp(sentAt);
    var attachments = Array.isArray(entry.attachments)
      ? entry.attachments.map(normalizeChatAttachmentData).filter(Boolean)
      : [];
    return {
      messageCode: messageCode,
      senderCode: senderCode,
      senderName: senderName || senderCode || 'ユーザー',
      content: content || '—',
      sentAt: sentAt || '',
      sentAtDisplay: sentAtDisplay || '',
      sentAtValue: sentAtValue,
      attachments: attachments,
      senderUserCode: senderUserCode,
      isLocal: Boolean(entry.isLocal)
    };
  }

  function normalizeChatThreadData(entry, participantsDirectory)
  {
    if (!entry || typeof entry !== 'object') {
      return null;
    }
    var threadCode = normalizeText(entry.threadCode || entry.threadId || entry.id || '');
    if (!threadCode) {
      threadCode = 'thread-' + Math.random().toString(16).slice(2);
    }
    var rawParticipants = [];
    if (Array.isArray(entry.participants)) {
      rawParticipants = entry.participants.slice();
    }
    else if (Array.isArray(entry.members)) {
      rawParticipants = entry.members.slice();
    }
    else if (Array.isArray(entry.userCodes)) {
      rawParticipants = entry.userCodes.slice();
    }
    var normalizedParticipants = rawParticipants
      .map(function (participant)
      {
        if (typeof participant === 'string') {
          return { userCode: participant };
        }
        return participant;
      })
      .map(normalizeChatParticipantData)
      .filter(Boolean);
    if (Array.isArray(participantsDirectory) && participantsDirectory.length) {
      normalizedParticipants = normalizedParticipants.map(function (participant)
      {
        if (!participant || !participant.userCode)
        {
          return participant;
        }
        var fallback = participantsDirectory.find(function (entry)
        {
          return entry && entry.userCode === participant.userCode;
        });
        if (!fallback)
        {
          return participant;
        }
        return Object.assign({}, fallback, participant);
      });
    }
    normalizedParticipants = dedupeChatParticipants(normalizedParticipants);
    var messages = Array.isArray(entry.messages)
        ? entry.messages.map(function (message) {
          return normalizeChatMessageData(message, participantsDirectory);
        }).filter(Boolean)
        : [];
    messages.sort(function (a, b) {
      return (a ? a.sentAtValue || 0 : 0) - (b ? b.sentAtValue || 0 : 0);
    });
    var typeRaw = normalizeText(entry.type || entry.threadType || '');
    var type = typeRaw === 'direct' || typeRaw === 'dm' ? 'direct' : 'group';
    var lastMessage = messages.length ? messages[messages.length - 1] : null;
    var fallbackTimestamp = entry.lastActivityAt || entry.updatedAt || entry.createdAt || '';
    var lastActivityAt = lastMessage ? lastMessage.sentAt : fallbackTimestamp;
    var lastActivityDisplay = lastMessage
      ? lastMessage.sentAtDisplay
      : entry.lastActivityDisplay || entry.updatedAtDisplay || formatDisplayTimestamp(fallbackTimestamp);
    var lastActivityValue = lastMessage ? lastMessage.sentAtValue : parseTimestampValue(fallbackTimestamp);
    var title = normalizeText(entry.title || entry.threadTitle || '');
    if (!title) {
      if (type === 'direct' && normalizedParticipants.length) {
        var students = normalizedParticipants.filter(function (participant) {
          return participant && participant.role !== 'coach';
        });
        var source = students.length ? students : normalizedParticipants;
        title = source.map(function (participant) {
          return participant.displayName || participant.userCode;
        }).join('・');
      } else {
        title = 'チャット';
      }
    }
    return {
      threadCode: threadCode,
      type: type,
      typeLabel: '',
      title: title,
      description: normalizeText(entry.description || entry.summary || ''),
      participants: normalizedParticipants,
      messages: messages,
      unreadCount: Math.max(0, Number(entry.unreadCount || entry.unread || 0)),
      lastActivityAt: lastActivityAt || '',
      lastActivityDisplay: lastActivityDisplay || '',
      lastActivityValue: lastActivityValue,
      lastMessageSnippet: entry.lastMessageSnippet || createThreadPreview(lastMessage ? lastMessage.content : ''),
      createdByUserCode: normalizeText(entry.createdByUserCode || entry.creatorCode || ''),
      createdByDisplayName: normalizeText(entry.createdByDisplayName || entry.creatorDisplayName || '')
    };
  }
  // chat

  //
  // bbs
  //
  function deriveAttachmentExtension(entry)
  {
    var candidates = [
      entry && entry.fileName,
      entry && entry.name,
      entry && entry.url,
      entry && entry.downloadUrl,
      entry && entry.previewUrl,
      entry && entry.playbackUrl,
      entry && entry.streamUrl,
      entry && entry.posterUrl,
      entry && entry.thumbnailUrl
    ];

    for (var i = 0; i < candidates.length; i += 1)
    {
      var value = normalizeText(candidates[i]);
      if (!value)
      {
        continue;
      }
      var match = value.match(/\.([^.\/\?#]+)(?:$|[\?#])/);
      if (match && match[1])
      {
        return match[1];
      }
    }

    return '';
  }

  function normalizeBbsAttachmentData(entry)
  {
    if (!entry || typeof entry !== 'object')
    {
      return null;
    }
    var contentCode = normalizeText(entry.contentCode || entry.code || '');
    var attachmentCode = normalizeText(entry.attachmentCode || contentCode || entry.id || entry.code);
    var typeRaw = normalizeText(entry.type || entry.contentType || entry.mimeType || entry.category || entry.format || '');
    var type = typeRaw;
    if (!type) {
      type = 'file';
    }
    if (type === 'doc' || type === 'document') {
      type = 'file';
    }
    if (type === 'url') {
      type = 'link';
    }
    var sizeDisplay = normalizeText(entry.sizeDisplay || '');
    if (!sizeDisplay && Helpers) {
      sizeDisplay = Helpers.formatFileSize(entry.size);
    }
    var previewUrl = normalizeText(
      entry.previewUrl
      || entry.posterUrl
      || entry.thumbnailUrl
      || entry.previewImage
      || entry.previewImageUrl
      || entry.imageUrl
      || entry.playbackUrl
      || entry.streamUrl
      || entry.youtubeUrl
      || ''
    );
    var extension = normalizeText(entry.extension || entry.ext || entry.fileExtension || deriveAttachmentExtension(entry));
    return {
      attachmentCode: attachmentCode || 'attachment-' + Math.random().toString(16).slice(2),
      contentCode: contentCode,
      name: normalizeText(entry.name || entry.title || entry.fileName) || '添付ファイル',
      type: type,
      typeLabel: normalizeText(entry.typeLabel || entry.categoryLabel || ''),
      sizeDisplay: sizeDisplay,
      downloadUrl: normalizeText(entry.downloadUrl || entry.url || entry.href || entry.linkUrl || ''),
      url: normalizeText(entry.url || entry.href || entry.downloadUrl || entry.linkUrl || ''),
      previewUrl: previewUrl,
      fileName: normalizeText(entry.fileName || ''),
      contentType: normalizeText(entry.contentType || ''),
      mimeType: normalizeText(entry.mimeType || ''),
      fileSize: typeof entry.fileSize === 'number' ? entry.fileSize : null,
      playbackUrl: normalizeText(entry.playbackUrl || entry.streamUrl || ''),
      streamUrl: normalizeText(entry.streamUrl || ''),
      posterUrl: normalizeText(entry.posterUrl || ''),
      thumbnailUrl: normalizeText(entry.thumbnailUrl || ''),
      previewImage: normalizeText(entry.previewImage || ''),
      previewImageUrl: normalizeText(entry.previewImageUrl || ''),
      imageUrl: normalizeText(entry.imageUrl || ''),
      youtubeUrl: normalizeText(entry.youtubeUrl || ''),
      extension: extension,
      fileExtension: extension,
      uploadedAtDisplay: normalizeText(entry.uploadedAtDisplay || entry.createdAtDisplay || '')
    };
  }

  function normalizeBbsMessageData(entry, participants)
  {
    if (!entry || typeof entry !== 'object')
    {
      return null;
    }
    var messageCode = normalizeText(entry.messageCode || entry.messageId || entry.id || '');
    if (!messageCode)
    {
      messageCode = 'message-' + Math.random().toString(16).slice(2);
    }
    var senderUserCode = normalizeText(
      entry.senderUserCode || entry.senderCode || entry.userCode || entry.authorCode || ''
    );
    var senderCode = senderUserCode;
    var participantRecord = null;
    if (senderCode && Array.isArray(participants))
    {
      participantRecord = participants.find(function (participant)
      {
        return participant && participant.userCode === senderCode;
      }) || null;
    }
    var senderName = normalizeText(
      entry.senderName
      || entry.senderUserName
      || entry.senderUserDisplayName
      || entry.userDisplayName
      || (participantRecord && participantRecord.displayName)
      || ''
    );
    var content = normalizeText(entry.content || entry.body || entry.text);
    var sentAt = entry.sentAt || entry.createdAt || entry.timestamp || '';
    var sentAtValue = parseTimestampValue(sentAt);
    var sentAtDisplay = entry.sentAtDisplay || entry.createdAtDisplay || formatDisplayTimestamp(sentAt);
    var attachments = Array.isArray(entry.attachments)
      ? entry.attachments.map(normalizeBbsAttachmentData).filter(Boolean)
      : [];
    return {
      messageCode: messageCode,
      senderCode: senderCode,
      senderName: senderName || senderCode || 'ユーザー',
      content: content || '—',
      sentAt: sentAt || '',
      sentAtDisplay: sentAtDisplay || '',
      sentAtValue: sentAtValue,
      attachments: attachments,
      senderUserCode: senderUserCode,
      isLocal: Boolean(entry.isLocal)
    };
  }

  function normalizeBbsThreadData(entry, participantsDirectory)
  {
    if (!entry || typeof entry !== 'object') {
      return null;
    }
    var threadCode = normalizeText(entry.threadCode || entry.threadId || entry.id || '');
    if (!threadCode) {
      threadCode = 'thread-' + Math.random().toString(16).slice(2);
    }
    var rawParticipants = [];
    if (Array.isArray(entry.participants)) {
      rawParticipants = entry.participants.slice();
    }
    else if (Array.isArray(entry.members)) {
      rawParticipants = entry.members.slice();
    }
    else if (Array.isArray(entry.userCodes)) {
      rawParticipants = entry.userCodes.slice();
    }
    var normalizedParticipants = rawParticipants
      .map(function (participant)
      {
        if (typeof participant === 'string') {
          return { userCode: participant };
        }
        return participant;
      })
      .map(normalizeBbsParticipantData)
      .filter(Boolean);
    if (Array.isArray(participantsDirectory) && participantsDirectory.length) {
      normalizedParticipants = normalizedParticipants.map(function (participant)
      {
        if (!participant || !participant.userCode)
        {
          return participant;
        }
        var fallback = participantsDirectory.find(function (entry)
        {
          return entry && entry.userCode === participant.userCode;
        });
        if (!fallback)
        {
          return participant;
        }
        return Object.assign({}, fallback, participant);
      });
    }
    normalizedParticipants = dedupeBbsParticipants(normalizedParticipants);
    var messages = Array.isArray(entry.messages)
        ? entry.messages.map(function (message) {
          return normalizeBbsMessageData(message, participantsDirectory);
        }).filter(Boolean)
        : [];
    messages.sort(function (a, b) {
      return (a ? a.sentAtValue || 0 : 0) - (b ? b.sentAtValue || 0 : 0);
    });
    var typeRaw = normalizeText(entry.type || entry.threadType || '');
    var type = typeRaw === 'direct' || typeRaw === 'dm' ? 'direct' : 'group';
    var lastMessage = messages.length ? messages[messages.length - 1] : null;
    var fallbackTimestamp = entry.lastActivityAt || entry.updatedAt || entry.createdAt || '';
    var lastActivityAt = lastMessage ? lastMessage.sentAt : fallbackTimestamp;
    var lastActivityDisplay = lastMessage
      ? lastMessage.sentAtDisplay
      : entry.lastActivityDisplay || entry.updatedAtDisplay || formatDisplayTimestamp(fallbackTimestamp);
    var lastActivityValue = lastMessage ? lastMessage.sentAtValue : parseTimestampValue(fallbackTimestamp);
    var title = normalizeText(entry.title || entry.threadTitle || '');
    if (!title) {
      if (type === 'direct' && normalizedParticipants.length) {
        var students = normalizedParticipants.filter(function (participant) {
          return participant && participant.role !== 'coach';
        });
        var source = students.length ? students : normalizedParticipants;
        title = source.map(function (participant) {
          return participant.displayName || participant.userCode;
        }).join('・');
      } else {
        title = '掲示板';
      }
    }
    return {
      threadCode: threadCode,
      type: type,
      typeLabel: '',
      title: title,
      description: normalizeText(entry.description || entry.summary || ''),
      participants: normalizedParticipants,
      messages: messages,
      unreadCount: Math.max(0, Number(entry.unreadCount || entry.unread || 0)),
      lastActivityAt: lastActivityAt || '',
      lastActivityDisplay: lastActivityDisplay || '',
      lastActivityValue: lastActivityValue,
      lastMessageSnippet: entry.lastMessageSnippet || createThreadPreview(lastMessage ? lastMessage.content : ''),
      createdByUserCode: normalizeText(entry.createdByUserCode || entry.creatorCode || ''),
      createdByDisplayName: normalizeText(entry.createdByDisplayName || entry.creatorDisplayName || '')
    };
  }
  // bbs  

  class TargetDetail
  {
    constructor(name)
    {
      this.name = name || 'target-detail';
      this.config = {
        selectors: {
          container: '#target-detail',
          helpButton: '#target-detail-help-button',
          helpModal: '#target-detail-help-modal'
        },
        apiEndpoint: window.Utils.getApiEndpoint(),
        apiToken: window.Utils.getApiToken(),
        apiRequestType: 'TargetManagementTargets',
        tabs: TAB_ORDER.slice(),
        fallback: {
          target: {},
          submissions: [],
          references: [],
          schedules: [],
          products: [],
          reviews: [],
          chats: {},          
          bbss: {},
          badges: { awards: [], catalog: [], palettes: [] },
          announcements: []
        }
      };
      this.state = {
        targetCode: deriveTargetCodeFromQuery(),
        target: null,
        activeTab: deriveInitialTabFromQuery('basic'),
        availableTabs: TAB_ORDER.slice(),
        submissions: null,
        references: null,
        schedules: null,
        products: null,        
        reviews: null,
        chats: null,
        bbss: null,
        badges: null,
        announcements: null,
        survey: null,
        profile: null,
        isSupervisor: false,
        roleFlags: null
      };
      this.targetAlias = '';
      this.refs = {
        container: null,
        helpModal: null,
        tabPanels: Object.create(null),
        tabPanelNodes: Object.create(null),
        tabNav: null
      };
      this.jobs = {};
      this.tabJobMap = Object.create(null);
      this.renderedTabs = Object.create(null);
      this.renderingTabs = Object.create(null);
      this.helpers = Helpers;
      this.buttonService = null;
      this.avatarService = null;
      this.userlistAvatarService = null;
      this.confirmDialogService = null;
      this.videoModalService = null;
      this.imageModalService = null;
      this.pdfModalService = null;
      this.audioModalService = null;
      this.contentsSelectModalService = null;
      this.userSelectModalService = null;
      this.actionVisibilityObserver = null;
      this.lastHelpTrigger = null;
      this.breadcrumbService = null;
      this.root = document.querySelector('[data-page="target-detail"]') || document.body;
    }

    async boot()
    {
      if (await window.Services.sessionInstance.getUser() == null) {
        window.location.href = "/login.html";
        return;
      }

      this.initConfig();
      this.targetAlias = this.resolveTargetAlias();

      const jsList = [
        { src: '/js/service-app/header/main.js' },
        { src: '/js/service-app/toast/main.js' },
        { src: '/js/service-app/loading/main.js' },
        { src: '/js/service-app/help-modal/main.js' },
        { src: '/js/service-app/button/main.js' },
        { src: '/js/service-app/userlist-avatar/main.js' },
        { src: '/js/service-app/user-avatar/main.js' },
        { src: '/js/service-app/confirm-dialog/main.js' },
        { src: '/js/service-app/breadcrumb/main.js' },
        { src: '/js/service-app/video-modal/main.js' },
        { src: '/js/service-app/image-modal/main.js' },
        { src: '/js/service-app/audio-modal/main.js' },
        { src: '/js/service-app/pdf-modal/main.js' },
        { src: '/js/service-app/user-select-modal/main.js' },
        { src: '/js/service-app/contents-select-modal/main.js' }
      ];
      await window.Utils.loadScriptsSync(jsList);

      this.headerService = new window.Services.Header({
        display: { forceLoginButton: false, hideLoginButton: false, showUserInfoWhenLoggedin: true }
      });
      this.toastService = new window.Services.Toast({ position: 'top-right', duration: 3000 });
      const host = document.querySelector('[data-page="target-detail"]') || document.body;
      this.loadingService = new window.Services.Loading(host);
      this.helpModalService = new window.Services.HelpModal({ closeOnEsc: true, closeOnBackdrop: true });
      this.buttonService = new window.Services.button();
      this.userlistAvatarService = new window.Services.UserlistAvatar({
        size: 32,
        popoverAvatarSize: 40,
        overlap: 10,
        popoverPlacement: 'top-start',
        popoverOffset: 12,
        nameOverlay: true
      });
      this.avatarService = new window.Services.UserAvatar({ size: 44, shape: 'circle' });
      this.confirmDialogService = new window.Services.ConfirmDialog();
      this.videoModalService = new window.Services.VideoModal({
        api: {
          requestType: 'Contents',
          apiEndpoint: this.config.apiEndpoint || window.Utils.getApiEndpoint(),
          apiToken: this.config.apiToken || ''
        }
      });
      this.imageModalService = new window.Services.ImageModal();
      this.audioModalService = new window.Services.AudioModal();
      this.pdfModalService = new window.Services.PdfModal({ showDownload: true, showOpenInNewTab: true });
      this.contentsSelectModalService = new window.Services.ContentsSelectModal({
        endpoint: this.config.apiEndpoint,
        requestType: 'Contents',
        listType: 'ContentList',
        token: this.config.apiToken,
        multiple: true,
        zIndex: 110
      });
      const breadcrumbContainer = document.querySelector('.screen-page') || document.body;
        this.breadcrumbService = new window.Services.Breadcrumb({ container: breadcrumbContainer });
        this.userSelectModalService = new window.Services.UserSelectModal({
          endpoint: this.config.apiEndpoint,
          requestType: 'User',
          token: this.config.apiToken,
          userListType: 'UserGetAll',
          resultLimit: 200,
          zIndex: 100,
          text: {
            modalTitle: '対象ユーザーを検索',
            modalDescription: '追加するユーザーを選択してください。',
            applyLabel: '選択中を追加',
            actionLabel: '追加',
            multipleActionHeader: '追加'
          }
        });

      await Promise.all([
        this.headerService.boot('.site-header'),
        this.toastService.boot(),
        this.loadingService.boot(),
        this.helpModalService.boot(),
        this.buttonService.boot(),
        this.userlistAvatarService.boot(),
        this.avatarService.boot(),
        this.confirmDialogService.boot(),
        this.videoModalService.boot(),
        this.imageModalService.boot(),
        this.audioModalService.boot(),
        this.pdfModalService.boot(),
        this.contentsSelectModalService.boot(),
        this.breadcrumbService.boot(breadcrumbContainer),
        this.userSelectModalService.boot()
      ]);

      await this.loadSessionProfile();

      this.cacheElements();
      this.applyTargetAliasTexts();
      this.renderBreadcrumbs();
      this.updateEvent();
      await this.initialLoad();
      return this;
    }

    renderBreadcrumbs()
    {
      if (!this.breadcrumbService) {
        return;
      }
      var profile = this.state && this.state.profile ? this.state.profile : null;
      var managementLabel = this._resolveTargetManagementLabel();
      var items = [
        { label: managementLabel, href: 'targets.html' },
        { label: this.targetAlias + '詳細' }
      ];
      if (this._isDashboardEnabled(profile))
      {
        items.unshift({ label: 'ダッシュボード', href: 'dashboard.html' });
      }
      this.breadcrumbService.render(items);
    }

    _isDashboardEnabled(profile)
    {
      if (!profile)
      {
        return true;
      }
      var value = (typeof profile.useDashboard !== 'undefined')
        ? profile.useDashboard
        : profile.use_dashboard;
      if (typeof value === 'undefined')
      {
        return true;
      }
      if (value === true || value === 1 || value === '1')
      {
        return true;
      }
      if (typeof value === 'string')
      {
        var normalized = value.toLowerCase();
        return normalized === 'true' || normalized === 'yes' || normalized === 'on';
      }
      return false;
    }

    resolveTargetAlias()
    {
      var alias = '';
      var settings = (window.siteSettings || window.SiteSettings || {});
      if (settings && typeof settings.targetAlias === 'string')
      {
        alias = settings.targetAlias;
      }
      if (!alias)
      {
        var body = document.body || {};
        var ds = body.dataset || {};
        alias = ds.targetAlias || ds.targetalias || '';
      }
      alias = String(alias || '').trim();
      return alias || 'ターゲット';
    }

    applyTargetAliasTexts()
    {
      var alias = this.targetAlias || this.resolveTargetAlias();
      var managementLabel = this._resolveTargetManagementLabel();
      var detailLabel = alias + '詳細';
      var root = this.root || document;

      var introTitle = root.querySelector('.screen-intro__title');
      if (introTitle)
      {
        introTitle.textContent = detailLabel;
      }

      var introSummary = root.querySelector('.screen-intro__summary');
      if (introSummary)
      {
        introSummary.textContent = alias + 'の配信設定、提出状況、資料、レビュー履歴を一つの画面で管理できます。';
      }

      var breadcrumbItems = root.querySelectorAll('.screen-breadcrumbs__item');
      if (breadcrumbItems && breadcrumbItems.length >= 2)
      {
        var managementItem = breadcrumbItems[breadcrumbItems.length - 2];
        var detailItem = breadcrumbItems[breadcrumbItems.length - 1];
        var managementLink = managementItem.querySelector('a');
        if (managementLink)
        {
          managementLink.textContent = managementLabel;
        }
        else if (managementItem)
        {
          managementItem.textContent = managementLabel;
        }
        if (detailItem)
        {
          var detailLink = detailItem.querySelector('a');
          if (detailLink)
          {
            detailLink.textContent = detailLabel;
          }
          else
          {
            detailItem.textContent = detailLabel;
          }
        }
      }

      var helpModal = root.querySelector('#target-detail-help-modal');
      if (helpModal)
      {
        helpModal.setAttribute('aria-label', detailLabel + 'のヒント');
      }
      var helpTitle = root.querySelector('#target-detail-help-modal-title');
      if (helpTitle)
      {
        helpTitle.textContent = detailLabel + 'のヒント';
      }
    }

    _resolveTargetManagementLabel()
    {
      var alias = this.targetAlias || this.resolveTargetAlias();
      var flags = this.state && this.state.roleFlags;
      if (!flags)
      {
        flags = this._deriveRoleFlagsFromProfile(this.state && this.state.profile);
      }
      if (!flags)
      {
        flags = { isSupervisor: false, isOperator: false };
      }
      this.state.roleFlags = flags;

      var managementLabel = alias + '管理';
      var listLabel = alias + '一覧';
      return (flags.isSupervisor || flags.isOperator) ? managementLabel : listLabel;
    }

    initConfig()
    {
      var body = document.body || {};
      var dataset = body.dataset || {};
      if (dataset.apiEndpoint)
      {
        this.config.apiEndpoint = dataset.apiEndpoint;
      }
      if (dataset.apiToken)
      {
        this.config.apiToken = dataset.apiToken;
      }
      if (dataset.apiRequestType)
      {
        this.config.apiRequestType = dataset.apiRequestType;
      }
      if (dataset.targetCode) {
        this.state.targetCode = dataset.targetCode;
      }
      if (dataset.initialTab) {
        var normalized = dataset.initialTab.toLowerCase();
        if (TAB_ORDER.indexOf(normalized) >= 0)
        {
          this.state.activeTab = normalized;
        }
      }
    }

    async loadSessionProfile()
    {
      var service = window.Services && window.Services.sessionInstance;
      if (!service)
      {
        return null;
      }
      var profile = null;
      if (typeof service.getUser === 'function')
      {
        profile = await service.getUser();
      }
      if (!profile && typeof service.loadFromStorage === 'function')
      {
        profile = await service.loadFromStorage();
      }
      if (!profile && typeof service.syncFromServer === 'function')
      {
        profile = await service.syncFromServer();
      }
      this.state.profile = profile;
      this.state.isSupervisor = this.isSupervisorProfile(profile);
      this.state.roleFlags = this._deriveRoleFlagsFromProfile(profile);
      return profile;
    }

    async resolveSessionRoleFlags()
    {
      var service = window.Services && window.Services.sessionInstance;
      if (!service)
      {
        return { isSupervisor: false, isOperator: false, canManageTargets: false };
      }

      var profile = this.state && this.state.profile;
      if (!profile && typeof service.getUser === 'function')
      {
        profile = await service.getUser();
      }
      if (!profile && typeof service.loadFromStorage === 'function')
      {
        profile = await service.loadFromStorage();
      }
      if (!profile && typeof service.syncFromServer === 'function')
      {
        profile = await service.syncFromServer();
      }

      var flags = this._deriveRoleFlagsFromProfile(profile);
      this.state.roleFlags = flags;
      return flags;
    }

    async applyTargetActionVisibility()
    {
      var flags = await this.resolveSessionRoleFlags();
      this.initActionVisibilityObserver();
      this.applyActionVisibilityRules(flags);
    }

    initActionVisibilityObserver()
    {
      if (this.actionVisibilityObserver)
      {
        return;
      }
      var root = this.root || document;
      var observer = new MutationObserver(() =>
      {
        this.applyActionVisibilityRules(this.state && this.state.roleFlags);
      });
      observer.observe(root, { childList: true, subtree: true });
      this.actionVisibilityObserver = observer;
    }

    applyActionVisibilityRules(flags)
    {
      var canManage = !!(flags && (flags.isSupervisor || flags.isOperator));
      var canManageTargets = !!(flags && flags.canManageTargets);
      var root = this.root || document;
      for (var i = 0; i < ACTION_VISIBILITY_RULES.length; i += 1)
      {
        var rule = ACTION_VISIBILITY_RULES[i];
        var allow = rule.role === 'all'
          ? true
          : rule.role === 'manage-targets'
            ? canManageTargets
            : canManage;
        this.applyVisibilityToSelectors(root, rule.selectors, allow);
      }
    }

    applyVisibilityToSelectors(root, selectors, allow)
    {
      if (!root || !selectors || !selectors.length)
      {
        return;
      }
      for (var i = 0; i < selectors.length; i += 1)
      {
        var nodes = root.querySelectorAll(selectors[i]);
        if (!nodes || !nodes.length)
        {
          continue;
        }
        for (var j = 0; j < nodes.length; j += 1)
        {
          var node = nodes[j];
          if (!node || !node.nodeType || node.nodeType !== 1)
          {
            continue;
          }
          node.hidden = !allow;
          if (allow)
          {
            node.removeAttribute('aria-hidden');
          }
          else
          {
            node.setAttribute('aria-hidden', 'true');
          }
        }
      }
    }

    _normalizeRoleFlag(flag)
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

    _normalizeProfileRoles(profile)
    {
      var roles = [];
      var appendRole = function (value)
      {
        if (!value)
        {
          return;
        }
        if (Array.isArray(value))
        {
          roles = roles.concat(value);
          return;
        }
        if (typeof value === 'string')
        {
          roles = roles.concat(splitDelimitedValues(value));
        }
      };

      appendRole(profile && profile.roles);
      appendRole(profile && profile.role);
      appendRole(profile && profile.roleName);
      appendRole(profile && profile.roleLabel);

      return roles.map(function (role)
      {
        return normalizeText(role).toLowerCase();
      }).filter(function (role)
      {
        return !!role;
      });
    }

    _deriveRoleFlagsFromProfile(profile)
    {
      var normalizedRoles = this._normalizeProfileRoles(profile);
      var hasSupervisorRole = normalizedRoles.indexOf('supervisor') !== -1;
      var hasOperatorRole = normalizedRoles.indexOf('operator') !== -1;
      var isSupervisor = hasSupervisorRole
        || this._normalizeRoleFlag(profile && profile.isSupervisor);
      var isOperator = hasOperatorRole
        || this._normalizeRoleFlag(profile && profile.isOperator);
      var flags = {
        isSupervisor: isSupervisor,
        isOperator: isOperator
      };
      flags.canManageTargets = !!(flags.isSupervisor || flags.isOperator);
      return flags;
    }

    isSupervisorProfile(profile)
    {
      var flag = profile && (profile.isSupervisor === true || profile.isSupervisor === 1 || profile.isSupervisor === '1');
      return !!flag;
    }

    isSupervisorUser()
    {
      return this.state && this.state.isSupervisor === true;
    }

    canManageTargetContent()
    {
      var flags = this.state && this.state.roleFlags;
      if (!flags)
      {
        flags = this._deriveRoleFlagsFromProfile(this.state && this.state.profile);
        this.state.roleFlags = flags;
      }
      return !!(flags && (flags.isSupervisor || flags.isOperator));
    }

    normalizeTargetParticipantList(list)
    {
      var normalized = [];
      var values = Array.isArray(list) ? list : [];
      values.forEach(function (entry)
      {
        if (!entry)
        {
          return;
        }
        if (typeof entry === 'string')
        {
          var labels = splitDelimitedValues(entry);
          if (!labels.length)
          {
            var normalizedLabel = normalizeText(entry);
            if (normalizedLabel)
            {
              labels = [normalizedLabel];
            }
          }
          labels.forEach(function (label)
          {
            normalized.push({ displayName: label, userCode: label, isActive: true, endedAt: null });
          });
          return;
        }
        if (typeof entry === 'object')
        {
          normalized.push(Object.assign({ isActive: true, endedAt: null }, entry));
        }
      });
      return normalized;
    }

    mergeTargetParticipantDirectory()
    {
      var lists = Array.prototype.slice.call(arguments);
      var normalizedLists = [];
      var self = this;
      lists.forEach(function (list)
      {
        if (Array.isArray(list))
        {
          normalizedLists.push(self.normalizeTargetParticipantList(list));
        }
      });

      var map = Object.create(null);
      var merged = [];
      var register = function (entry)
      {
        if (!entry)
        {
          return;
        }
        var user = entry && entry.user && typeof entry.user === 'object' ? entry.user : null;
        var userCode = normalizeText(entry.userCode || entry.code || (user && (user.userCode || user.code || user.loginId)) || '');
        var displayName = normalizeText(
          entry.displayName
          || entry.userDisplayName
          || entry.name
          || entry.fullName
          || (user && (user.displayName || user.name || user.fullName))
          || ''
        );
        var key = (userCode || displayName).toLowerCase();
        if (!key)
        {
          return;
        }
        var current = map[key];
        if (!current)
        {
          current = Object.assign({ isActive: true, endedAt: null }, entry, {
            userCode: userCode || displayName || entry.userCode || entry.displayName || '',
            displayName: displayName || userCode || entry.displayName || entry.userCode || ''
          });
          map[key] = current;
          merged.push(current);
          return;
        }
        map[key] = Object.assign(current, entry);
        if (!current.userCode && userCode)
        {
          current.userCode = userCode;
        }
        if (!current.displayName && displayName)
        {
          current.displayName = displayName;
        }
      };
      normalizedLists.forEach(function (entries)
      {
        entries.forEach(register);
      });
      return merged;
    }

    rebuildTargetParticipants()
    {
      if (!this.state || !this.state.target)
      {
        return [];
      }
      var target = this.state.target;
      var participants = Array.isArray(target.participants) ? target.participants : [];
      target.participants = participants;
      return participants;
    }

    cacheElements()
    {
      var selectors = this.config.selectors;
      this.refs.container = document.querySelector(selectors.container);
      this.refs.helpButton = document.querySelector(selectors.helpButton);
      this.refs.helpModalElement = document.querySelector(selectors.helpModal);
      var pageRoot = document.querySelector('[data-page="target-detail"]')
        || document.querySelector('.screen-page')
        || document.body
        || document;
      this.root = pageRoot;
    }

    updateEvent()
    {
      var self = this;
      var ns = '.adminTargetDetail';
      window.jQuery(document).off(ns);
      window.jQuery(document).on('click' + ns, '[data-tab-target]', function (event)
                                 {
        event.preventDefault();
        var id = this.getAttribute('data-tab-target');
        self.activateTab(id).catch(function (error)
        {
          console.error('[target-detail] failed to activate tab', error);
        });
      });

      if (this.refs.helpButton) {
        this.refs.helpButton.addEventListener('click', function (event)
        {
          event.preventDefault();
          var trigger = event && event.currentTarget ? event.currentTarget : self.refs.helpButton;
          self.openPageHelp(trigger);
        });
      }

      if (this.refs.helpModalElement)
      {
        this.refs.helpModalElement.addEventListener('click', function (event)
        {
          var target = event.target;
          if (!target)
          {
            return;
          }
          if (target.hasAttribute('data-modal-close') || target.closest('[data-modal-close]'))
          {
            event.preventDefault();
            self.closePageHelp();
          }
        });
      }
    }

    async initialLoad()
    {
      if (!this.refs.container) {
        this.showToast('error', 'ターゲット詳細の表示領域を検出できません。');
        return;
      }
      await this.loadingService.show();
      try {
        await this.loadTargetDetail();
        this.state.availableTabs = this.deriveAvailableTabs(this.state.target);
        this.ensureActiveTabIsAvailable();
        await this.loadJobScripts();
        await this.renderJobs();
        await this.applyTargetActionVisibility();
      } catch (error) {
        console.error(error);
        this.renderError(error);
      } finally {
        await this.loadingService.hide();
      }
    }

    async loadJobScripts()
    {
      var base = '/js/page/target-detail/';
      var files = [
        base + 'job-basic.js',
        base + 'job-announcement.js',
        base + 'job-survey.js',
        base + 'job-reference.js',
        base + 'job-schedule.js',
        base + 'job-product.js',
        base + 'job-chat.js',
        base + 'job-bbs.js',
        base + 'job-submission.js',
        base + 'job-review.js',
        base + 'job-badge.js',
        base + 'job-survey.js'        
      ];
      await window.Utils.loadScriptsSync(files);
    }

    async renderJobs()
    {
      var NS = window.TargetDetail || {};
      var JobBasic = NS.JobBasic || window.TargetDetailJobBasic;
      var JobAnnouncement = NS.JobAnnouncement;
      var JobReference = NS.JobReference;
      var JobSchedule = NS.JobSchedule;
      var JobProduct = NS.JobProduct;      
      var JobChat = NS.JobChat;
      var JobBbs = NS.JobBbs;      
      var JobSubmission = NS.JobSubmission;
      var JobReview = NS.JobReview;
      var JobBadge = NS.JobBadge;
      var JobSurvey = NS.JobSurvey;

      this.tabJobMap = {
        announcements: { key: 'announcement', ctor: JobAnnouncement },
        references: { key: 'reference', ctor: JobReference },
        schedules: { key: 'schedule', ctor: JobSchedule },
        products: { key: 'product', ctor: JobProduct },        
        chat: { key: 'chat', ctor: JobChat },
        bbs: { key: 'bbs', ctor: JobBbs },
        submissions: { key: 'submission', ctor: JobSubmission },
        reviews: { key: 'review', ctor: JobReview },
        badges: { key: 'badge', ctor: JobBadge },
        survey: { key: 'survey', ctor: JobSurvey }
      };

      this.jobs.basic = new JobBasic(this);
      await this.jobs.basic.render();
      this.renderedTabs.basic = true;

      if (this.isTabEnabled('announcements'))
      {
        await this.renderTabOnDemand('announcements');
      }

      await this.activateTab(this.state.activeTab);
    }

    async loadTargetDetail()
    {
      try
      {
        var payload = await this.callApi(
          'TargetDetail',
          { targetCode: this.state.targetCode },
          { requestType: 'TargetManagementTargets' }
        );
        if (payload && payload.target)
        {
          this.state.target = this.normalizeTarget(payload.target);
          return;
        }
      }
      catch (error)
      {
        console.warn('[target-detail] TargetDetail fallback', error);
      }
      this.state.target = this.normalizeTarget(this.config.fallback.target);
    }

    async loadSubmissions(options)
    {
      var forceReload = options && options.force;

      if (!forceReload && Array.isArray(this.state.submissions)) {
        return this.state.submissions;
      }
      
      if (forceReload) {
        this.state.submissions = null;
      }
      
      try {
        var payload = await this.callApi(
          'TargetSubmissionList',
          { targetCode: this.state.targetCode },
          { requestType: 'TargetManagementSubmissions' }
        );
        this.state.submissions = this.normalizeSubmissions(
          Array.isArray(payload && payload.submissions) ? payload.submissions : []
        );
      } catch (error) {
        console.warn('[target-detail] TargetSubmissionList fallback', error);
        this.state.submissions = this.normalizeSubmissions(this.config.fallback.submissions);
      }
      return this.state.submissions;
    }

    //    
    // reference
    //
    async loadReferences(options)
    {
      var forceReload = options && options.force;
      
      if (!forceReload && Array.isArray(this.state.references)) {
        return this.state.references;
      }

      if (forceReload) {
        this.state.references = null;
      }
      
      try {
        var payload = await this.callApi('TargetReferenceList', { targetCode: this.state.targetCode }, { requestType: 'TargetManagementReferences' });
        this.state.references = Array.isArray(payload && payload.materials) ? payload.materials : [];
      } catch (error) {
        console.warn('[target-detail] TargetReferenceList fallback', error);
        this.state.references = this.config.fallback.references.slice();
      }
      return this.state.references;
    }
    // reference

    //
    // schedule
    // 
    async loadSchedules(options)
    {
      var forceReload = options && options.force;
      
      if (!forceReload && Array.isArray(this.state.schedules)) {
        return this.state.schedules;
      }

      if (forceReload) {
        this.state.schedules = null;
      }
      
      try {
        var payload = await this.callApi('TargetScheduleList', { targetCode: this.state.targetCode }, { requestType: 'TargetManagementSchedules' });
        this.state.schedules = Array.isArray(payload && payload.materials) ? payload.materials : [];
      } catch (error) {
        console.warn('[target-detail] TargetScheduleList fallback', error);
        this.state.schedules = this.config.fallback.schedules.slice();
      }
      return this.state.schedules;
    }
    // schedule
    
    //
    // product
    // 
    async loadProducts(options)
    {
      var forceReload = options && options.force;
      
      if (!forceReload && Array.isArray(this.state.products)) {
        return this.state.products;
      }

      if (forceReload) {
        this.state.products = null;
      }
      
      try {
        var payload = await this.callApi('TargetProductList', { targetCode: this.state.targetCode }, { requestType: 'TargetManagementProducts' });
        this.state.products = Array.isArray(payload && payload.materials) ? payload.materials : [];
      } catch (error) {
        console.warn('[target-detail] TargetProductList fallback', error);
        this.state.products = this.config.fallback.products.slice();
      }
      return this.state.products;
    }
    // product

    async loadAnnouncements(options)
    {
      var forceReload = options && options.force;

      if (!forceReload && Array.isArray(this.state.announcements))
      {
        return this.state.announcements;
      }

      if (forceReload)
      {
        this.state.announcements = null;
      }

      try
      {
        var payload = await this.callApi(
          'TargetAnnouncementList',
          { targetCode: this.state.targetCode },
          { requestType: 'TargetManagementAnnouncements' }
        );
        this.state.announcements = Array.isArray(payload && payload.announcements)
          ? payload.announcements
          : [];
      }
      catch (error)
      {
        console.warn('[target-detail] TargetAnnouncementList fallback', error);
        this.state.announcements = this.config.fallback.announcements.slice();
      }

      return this.state.announcements;
    }

    async loadReviews(options)
    {
      var forceReload = options && options.force;

      if (!forceReload && Array.isArray(this.state.reviews)) {
        return this.state.reviews;
      }
      
      if (forceReload) {
        this.state.reviews = null;
      }

      try {
        var payload = await this.callApi('TargetReviewList', { targetCode: this.state.targetCode }, { requestType: 'TargetManagementReviews' });
        this.state.reviews = Array.isArray(payload && payload.reviews) ? payload.reviews : [];
      } catch (error) {
        console.warn('[target-detail] TargetReviewList fallback', error);
        this.state.reviews = this.config.fallback.reviews.slice();
      }
      return this.state.reviews;
    }

    //
    // chat
    // 
    async loadChats(options)
    {
      var forceReload = options && options.force;
      if (!forceReload && this.state.chats) {
        return this.state.chats;
      }

      if (forceReload) {
        this.state.chats = null;
      }

      try {
        var payload = await this.callApi(
          'TargetChatThreadList',
          { targetCode: this.state.targetCode },
          { requestType: 'TargetManagementChat' }
        );
        var context = this.normalizeChatContext(payload);
        this.state.chats = context;
      } catch (error) {
        console.warn('[target-detail] TargetChatThreadList fallback', error);
        this.state.chats = this.normalizeChatContext(this.config.fallback.chats);
      }

      if (this.state.target && this.state.chats && Array.isArray(this.state.chats.participants) ){
        this.state.target.chatParticipants = this.state.chats.participants.slice();
        this.rebuildTargetParticipants();
      }
      return this.state.chats;
    }

    async createChatThread(payload)
    {
      var params = {
        targetCode: this.state.targetCode,
        content: payload && payload.content,
        recipientCodes: payload && Array.isArray(payload.recipientCodes)
          ? JSON.stringify(payload.recipientCodes)
          : JSON.stringify([]),
        threadType: payload && payload.threadType,
        threadTitle: payload && payload.threadTitle
      };
      var result = await this.callApi(
        'TargetChatThreadCreate',
        params,
        { requestType: 'TargetManagementChat' }
      );
      var context = this.normalizeChatContext(result);
      var threadCode = result && result.threadCode;
      if ((!context || !Array.isArray(context.threads) || context.threads.length === 0) && threadCode)
      {
        try
        {
          var fetched = await this.callApi(
            'TargetChatThreadList',
            {
              targetCode: this.state.targetCode,
              threadCodes: JSON.stringify([threadCode])
            },
            { requestType: 'TargetManagementChat' }
          );
          var normalized = this.normalizeChatContext(fetched);
          normalized.threadCode = threadCode;
          return normalized;
        }
        catch (error)
        {
          console.warn('[target-detail] TargetChatThreadList after create failed', error);
        }
      }
      if (context)
      {
        context.threadCode = threadCode || null;
      }
      return context;
    }

    async createChatMessage(threadCode, content, senderUserCode)
    {
      var params = {
        targetCode: this.state.targetCode,
        threadCode: threadCode,
        content: content
      };
      if (senderUserCode)
      {
        params.senderUserCode = String(senderUserCode).trim();
      }
      var result = await this.callApi(
        'TargetChatMessageCreate',
        params,
        { requestType: 'TargetManagementChat' }
      );
      return this.normalizeChatContext(result);
    }

    async deleteChatMessage(threadCode, messageCode)
    {
      var result = await this.callApi(
        'TargetChatMessageDelete',
        {
          targetCode: this.state.targetCode,
          threadCode: threadCode,
          messageCode: messageCode
        },
        { requestType: 'TargetManagementChat' }
      );
      return this.normalizeChatContext(result);
    }

    async deleteChatThread(threadCode)
    {
      var result = await this.callApi(
        'TargetChatThreadDelete',
        {
          targetCode: this.state.targetCode,
          threadCode: threadCode
        },
        { requestType: 'TargetManagementChat' }
      );
      return this.normalizeChatContext(result);
    }

    async loadBadges(options)
    {
      var forceReload = options && options.force;

      if (!forceReload && this.state.badges) {
        return this.state.badges;
      }

      if (forceReload) {
        this.state.badges = null;
      }

      var awards = [];
      var catalog = [];
      var palettes = [];
      try {
        var payload = await this.callApi(
          'TargetBadgeList',
          { targetCode: this.state.targetCode },
          { requestType: 'TargetManagementBadges' }
        );
        awards = Array.isArray(payload && payload.awards) ? payload.awards : [];
        catalog = Array.isArray(payload && payload.catalog) ? payload.catalog : [];
        palettes = Array.isArray(payload && payload.palettes) ? payload.palettes : [];
      } catch (error) {
        console.warn('[target-detail] TargetBadgeList fallback', error);
        awards = this.config.fallback.badges.awards.slice();
        catalog = this.config.fallback.badges.catalog.slice();
        palettes = (this.config.fallback.badges.palettes || []).slice();
      }

      if (!catalog.length) {
        try {
          var catalogPayload = await this.callApi(
            'BadgeCatalog',
            { mine: true },
        { requestType: 'TargetManagementBadges' }
      );
      catalog = Array.isArray(catalogPayload && catalogPayload.badges)
        ? catalogPayload.badges
        : Array.isArray(catalogPayload) ? catalogPayload : [];
        } catch (catalogError) {
          console.warn('[target-detail] BadgeCatalog fallback', catalogError);
          catalog = catalog && catalog.length ? catalog : this.config.fallback.badges.catalog.slice();
        }
      }

      this.state.badges = {
        awards: awards,
        catalog: catalog,
        palettes: palettes
      };
      return this.state.badges;
    }
    // chat

    //
    // bbs
    // 
    async loadBbss(options)
    {
      var forceReload = options && options.force;
      if (!forceReload && this.state.bbss) {
        return this.state.bbss;
      }

      if (forceReload) {
        this.state.bbss = null;
      }

      try {
        var payload = await this.callApi(
          'TargetBbsThreadList',
          { targetCode: this.state.targetCode },
          { requestType: 'TargetManagementBbs' }
        );
        var context = this.normalizeBbsContext(payload);
        this.state.bbss = context;
      } catch (error) {
        console.warn('[target-detail] TargetBbsThreadList fallback', error);
        this.state.bbss = this.normalizeBbsContext(this.config.fallback.bbss);
      }

      if (this.state.target && this.state.bbss && Array.isArray(this.state.bbss.participants) ){
        this.state.target.bbsParticipants = this.state.bbss.participants.slice();
        this.rebuildTargetParticipants();
      }
      return this.state.bbss;
    }

    async createBbsThread(payload)
    {
      var params = {
        targetCode: this.state.targetCode,
        content: payload && payload.content,
        recipientCodes: payload && Array.isArray(payload.recipientCodes)
          ? JSON.stringify(payload.recipientCodes)
          : JSON.stringify([]),
        threadType: payload && payload.threadType,
        threadTitle: payload && payload.threadTitle
      };
      var result = await this.callApi(
        'TargetBbsThreadCreate',
        params,
        { requestType: 'TargetManagementBbs' }
      );
      var context = this.normalizeBbsContext(result);
      var threadCode = result && result.threadCode;
      if ((!context || !Array.isArray(context.threads) || context.threads.length === 0) && threadCode)
      {
        try
        {
          var fetched = await this.callApi(
            'TargetBbsThreadList',
            {
              targetCode: this.state.targetCode,
              threadCodes: JSON.stringify([threadCode])
            },
            { requestType: 'TargetManagementBbs' }
          );
          var normalized = this.normalizeBbsContext(fetched);
          normalized.threadCode = threadCode;
          return normalized;
        }
        catch (error)
        {
          console.warn('[target-detail] TargetBbsThreadList after create failed', error);
        }
      }
      if (context)
      {
        context.threadCode = threadCode || null;
      }
      return context;
    }

    async createBbsMessage(threadCode, content, senderUserCode, attachments)
    {
      var params = {
        targetCode: this.state.targetCode,
        threadCode: threadCode,
        content: content
      };
      if (Array.isArray(attachments) && attachments.length)
      {
        params.attachments = window.JSON.stringify(attachments);
      }
      if (senderUserCode)
      {
        params.senderUserCode = String(senderUserCode).trim();
      }
      var result = await this.callApi(
        'TargetBbsMessageCreate',
        params,
        { requestType: 'TargetManagementBbs' }
      );
      return this.normalizeBbsContext(result);
    }

    async updateBbsThreadTitle(threadCode, threadTitle)
    {
      var result = await this.callApi(
        'TargetBbsThreadUpdate',
        {
          targetCode: this.state.targetCode,
          threadCode: threadCode,
          threadTitle: threadTitle
        },
        { requestType: 'TargetManagementBbs' }
      );
      return this.normalizeBbsContext(result);
    }

    async deleteBbsMessage(threadCode, messageCode)
    {
      var result = await this.callApi(
        'TargetBbsMessageDelete',
        {
          targetCode: this.state.targetCode,
          threadCode: threadCode,
          messageCode: messageCode
        },
        { requestType: 'TargetManagementBbs' }
      );
      return this.normalizeBbsContext(result);
    }

    async deleteBbsAttachment(threadCode, messageCode, attachmentCode)
    {
      var result = await this.callApi(
        'TargetBbsAttachmentDelete',
        {
          targetCode: this.state.targetCode,
          threadCode: threadCode,
          messageCode: messageCode,
          attachmentCode: attachmentCode
        },
        { requestType: 'TargetManagementBbs' }
      );
      return this.normalizeBbsContext(result);
    }

    async deleteBbsThread(threadCode)
    {
      var result = await this.callApi(
        'TargetBbsThreadDelete',
        {
          targetCode: this.state.targetCode,
          threadCode: threadCode
        },
        { requestType: 'TargetManagementBbs' }
      );
      return this.normalizeBbsContext(result);
    }

    async loadBadges(options)
    {
      var forceReload = options && options.force;

      if (!forceReload && this.state.badges) {
        return this.state.badges;
      }

      if (forceReload) {
        this.state.badges = null;
      }

      var awards = [];
      var catalog = [];
      var palettes = [];
      try {
        var payload = await this.callApi(
          'TargetBadgeList',
          { targetCode: this.state.targetCode },
          { requestType: 'TargetManagementBadges' }
        );
        awards = Array.isArray(payload && payload.awards) ? payload.awards : [];
        catalog = Array.isArray(payload && payload.catalog) ? payload.catalog : [];
        palettes = Array.isArray(payload && payload.palettes) ? payload.palettes : [];
      } catch (error) {
        console.warn('[target-detail] TargetBadgeList fallback', error);
        awards = this.config.fallback.badges.awards.slice();
        catalog = this.config.fallback.badges.catalog.slice();
        palettes = (this.config.fallback.badges.palettes || []).slice();
      }

      if (!catalog.length) {
        try {
          var catalogPayload = await this.callApi(
            'BadgeCatalog',
            { mine: true },
        { requestType: 'TargetManagementBadges' }
      );
      catalog = Array.isArray(catalogPayload && catalogPayload.badges)
        ? catalogPayload.badges
        : Array.isArray(catalogPayload) ? catalogPayload : [];
        } catch (catalogError) {
          console.warn('[target-detail] BadgeCatalog fallback', catalogError);
          catalog = catalog && catalog.length ? catalog : this.config.fallback.badges.catalog.slice();
        }
      }

      this.state.badges = {
        awards: awards,
        catalog: catalog,
        palettes: palettes
      };
      return this.state.badges;
    }
    // bbs    

    async loadSurvey(options)
    {
      var forceReload = options && options.force;

      if (!forceReload && Array.isArray(this.state.survey))
      {
        return this.state.survey;
      }

      if (forceReload)
      {
        this.state.survey = null;
      }

      var payload = await this.callApi(
        'TargetSurveyList',
        { targetCode: this.state.targetCode },
        { requestType: 'TargetManagementSurvey' }
      );
      this.state.survey = Array.isArray(payload && payload.survey)
        ? payload.survey
        : [];

      return this.state.survey;
    }

    openPageHelp(trigger)
    {
      trigger.setAttribute('aria-expanded', 'true');
 
      this.lastHelpTrigger = trigger || this.refs.helpButton || this.lastHelpTrigger;
      var alias = this.targetAlias || this.resolveTargetAlias();
      var detailLabel = alias + '詳細';
      this.helpModalService.show({
        title: detailLabel + 'のヒント',
        text: 'この画面では' + alias + 'の設定や提出、資料、バッジ管理をまとめて確認できます。'
      });
      this.refs.helpModalElement.removeAttribute('hidden');
      this.refs.helpModalElement.setAttribute('aria-hidden', 'false');
      var closeButton = this.refs.helpModalElement.querySelector('[data-modal-close]');
      closeButton.focus();
    }

    closePageHelp()
    {
      if (!this.refs.helpModalElement) {
        this.helpModalService.dismiss();
        this.lastHelpTrigger.setAttribute('aria-expanded', 'false');
        this.lastHelpTrigger = null;
        return;
      }
      this.refs.helpModalElement.setAttribute('hidden', 'hidden');
      this.refs.helpModalElement.setAttribute('aria-hidden', 'true');
      var focusTarget = this.lastHelpTrigger || this.refs.helpButton;
      if (focusTarget) {
        try {
          focusTarget.focus({ preventScroll: true });
        } catch (error) {
          focusTarget.focus();
        }
      }
      if (focusTarget) {
        focusTarget.setAttribute('aria-expanded', 'false');
      }
      this.lastHelpTrigger = null;
    }

    registerTabPanel(id, panel, content)
    {
      if (!id || !panel) return;
      this.refs.tabPanelNodes[id] = panel;
      this.refs.tabPanels[id] = content || panel;
    }

    registerTabNav(element)
    {
      this.refs.tabNav = element;
    }

    async renderTabOnDemand(tabId)
    {
      if (!tabId) {
        return;
      }
      if (!this.isTabEnabled(tabId))
      {
        return;
      }
      if (tabId === 'basic')
      {
        this.renderedTabs.basic = true;
        return;
      }
      var map = this.tabJobMap || {};
      var meta = map[tabId];
      if (!meta)
      {
        return;
      }
      if (this.renderedTabs[tabId])
      {
        return;
      }
      if (this.renderingTabs[tabId])
      {
        return this.renderingTabs[tabId];
      }
      var job = this.jobs[meta.key];
      if (!job && typeof meta.ctor === 'function')
      {
        job = new meta.ctor(this);
        this.jobs[meta.key] = job;
      }
      if (!job || typeof job.render !== 'function')
      {
        this.renderedTabs[tabId] = true;
        return;
      }
      this.renderingTabs[tabId] = Promise.resolve().then(function ()
      {
        return job.render();
      });
      try
      {
        await this.renderingTabs[tabId];
        this.renderedTabs[tabId] = true;
      }
      catch (error)
      {
        console.error('[target-detail] failed to render tab', tabId, error);
      }
      finally
      {
        this.renderingTabs[tabId] = null;
      }
      await this.applyTargetActionVisibility();
      return this.renderedTabs[tabId];
    }

    async activateTab(id)
    {
      var availableTabs = this.getAvailableTabs();
      var tabId = availableTabs.indexOf(id) >= 0 ? id : (availableTabs[0] || 'basic');
      this.state.activeTab = tabId;
      var nav = this.refs.tabNav;
      if (nav) {
        var buttons = nav.querySelectorAll('[data-tab-target]');
        for (var i = 0; i < buttons.length; i += 1)
        {
          var btn = buttons[i];
          var targetId = btn.getAttribute('data-tab-target');
          var isActive = targetId === tabId;
          btn.classList.toggle('is-active', isActive);
          btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
          btn.tabIndex = isActive ? 0 : -1;
        }
      }
      var panelNodes = this.refs.tabPanelNodes || {};
      Object.keys(panelNodes).forEach((key) =>
      {
        var panel = panelNodes[key];
        if (!panel) return;
        panel.hidden = key !== tabId;
        panel.classList.toggle('is-active', key === tabId);
      });

      await this.renderTabOnDemand(tabId);
    }

    normalizeTarget(raw)
    {
      if (!raw) {
        return null;
      }
      var statusLabel = normalizeText(raw.statusLabel);
      var statusKeyRaw = normalizeText(raw.status || raw.statusKey || raw.state || '');
      var statusKey = statusKeyRaw ? statusKeyRaw.toLowerCase() : '';
      if (!statusLabel && statusKeyRaw) {
        statusLabel = statusKeyRaw;
      }
      var priorityLabel = normalizeText(raw.priorityLabel);
      var priorityKeyRaw = normalizeText(raw.priority || raw.priorityKey || '');
        var priorityKey = priorityKeyRaw ? priorityKeyRaw.toLowerCase() : '';
        if (!priorityLabel && priorityKeyRaw) {
          priorityLabel = priorityKeyRaw;
        }
        var createdByDisplayName = normalizeText(raw.createdByDisplayName || raw.ownerDisplayName || '');
        var createdByUserCode = normalizeText(raw.createdByUserCode || raw.ownerUserCode || '');
        var creatorAvatar = resolveCreatorAvatarData(raw, createdByUserCode);
        var creatorInitialSource = createdByDisplayName || createdByUserCode || raw.ownerDisplayName || raw.ownerUserCode || '';
        var assignedUsersRaw = [];
      if (Array.isArray(raw.assignedUsers))
      {
        assignedUsersRaw = raw.assignedUsers.slice();
      }
      else if (typeof raw.assignedUsers === 'string')
      {
        assignedUsersRaw = splitDelimitedValues(raw.assignedUsers);
      }
      if (!assignedUsersRaw.length)
      {
        if (Array.isArray(raw.participants))
        {
          assignedUsersRaw = raw.participants.slice();
        }
        else if (typeof raw.participants === 'string')
        {
          assignedUsersRaw = splitDelimitedValues(raw.participants);
        }
      }
      var participantsRaw = [];
      if (Array.isArray(raw.participants))
      {
        participantsRaw = raw.participants.slice();
      }
        else if (typeof raw.participants === 'string')
        {
          participantsRaw = splitDelimitedValues(raw.participants);
        }
        var creatorEntry = null;
        if (createdByDisplayName || createdByUserCode)
        {
          creatorEntry = {
            displayName: createdByDisplayName || createdByUserCode,
            userCode: createdByUserCode || createdByDisplayName || '',
            isOperator: true,
            isActive: raw && raw.createdByIsActive !== false,
            role: { key: 'operator', name: 'creator' },
            source: 'creator'
          };
        }
        var participants = this.normalizeTargetParticipantList(participantsRaw);
        var assignedUsers = this.normalizeTargetParticipantList(assignedUsersRaw);
        var creatorList = creatorEntry ? [creatorEntry] : [];
        participants = this.mergeTargetParticipantDirectory(participants, creatorList);
        assignedUsers = this.mergeTargetParticipantDirectory(assignedUsers, creatorList);
        if (!assignedUsers.length && participants.length)
        {
          assignedUsers = participants.slice();
        }

      var imageUrl = normalizeText(
        raw.imageUrl
        || raw.imageURL
        || raw.image
        || raw.coverImage
        || raw.coverImageUrl
        || raw.coverImageURL
        || raw.thumbnailUrl
        || raw.thumbnailURL
        || raw.imageFile
        || ''
      );

      var displayFlags = this.normalizeDisplayFlags(raw);

        var target = {
          targetCode: raw.targetCode || raw.code || 'target-unknown',
          title: raw.title || raw.name || 'ターゲット詳細',
          description: raw.description || raw.summary || '',
        imageUrl: imageUrl,
        status: statusKey || 'unknown',
        statusLabel: statusLabel || '—',
        priority: priorityKey || '',
        priorityLabel: priorityLabel || '—',
        createdAtDisplay: raw.createdAtDisplay || raw.createdAt || '',
        updatedAtDisplay: raw.updatedAtDisplay || raw.updatedAt || '',
        dueDateDisplay: raw.dueDateDisplay || raw.dueDate || '',
        audienceScope: normalizeAudienceScope(raw.audienceScope || raw.assignmentScope || (raw.assignAll ? 'all' : '')),
        assignedUsers: assignedUsers,
        participants: participants,
        createdByDisplayName: createdByDisplayName,
        createdByUserCode: createdByUserCode,
        createdByAvatarUrl: creatorAvatar.url,
        createdByAvatarTransform: creatorAvatar.transform,
        createdByAvatarAlt: normalizeText(raw.createdByAvatarAlt || ''),
        createdByAvatarInitial: deriveParticipantInitial(creatorInitialSource, '？'),
        ownerDisplayName: normalizeText(raw.ownerDisplayName || ''),
        ownerUserCode: normalizeText(raw.ownerUserCode || ''),
        timeline: Array.isArray(raw.timeline) ? raw.timeline : (Array.isArray(raw.activity) ? raw.activity : []),
        guidanceContents: Array.isArray(raw.guidanceContents) ? raw.guidanceContents : [],
        goals: this.normalizeGoals(raw.goals),
        agreements: this.normalizeAgreements(raw.agreements),
        basicInfoConfirmation: this.normalizeBasicInfoConfirmation(raw.basicInfoConfirmation),
        basicInfoConfirmations: this.normalizeBasicInfoConfirmations(
          raw.basicInfoConfirmations,
          raw.basicInfoConfirmation,
          raw.basicInfoConfirmationStatus
        ),
        displayFlags: displayFlags
      };

        var chatParticipants = Array.isArray(raw.chatParticipants)
          ? dedupeChatParticipants(
            raw.chatParticipants.map(function (participant) { return normalizeChatParticipantData(participant); }).filter(Boolean)
          )
          : [];
        var bbsParticipants = Array.isArray(raw.bbsParticipants)
          ? dedupeBbsParticipants(
            raw.bbsParticipants.map(function (participant) { return normalizeBbsParticipantData(participant); }).filter(Boolean)
          )
          : [];

        target.chatParticipants = chatParticipants;
        target.bbsParticipants = bbsParticipants;
        target.participants = participants;
        return target;
      }

    normalizeBooleanFlag(value, defaultValue)
    {
      if (value === undefined || value === null)
      {
        return !!defaultValue;
      }
      if (typeof value === 'boolean')
      {
        return value;
      }
      if (typeof value === 'number')
      {
        return value !== 0;
      }
      if (typeof value === 'string')
      {
        var normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on')
        {
          return true;
        }
        if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off')
        {
          return false;
        }
      }
      return !!value;
    }

    normalizeDisplayFlags(raw)
    {
      var self = this;
      var flags = {};
      var sources = [
        raw && raw.displayFlags,
        raw
      ];
      DISPLAY_FLAG_KEYS.forEach(function (key)
      {
        var value;
        for (var i = 0; i < sources.length; i++)
        {
          var candidate = sources[i];
          if (candidate && typeof candidate[key] !== 'undefined')
          {
            value = candidate[key];
            break;
          }
        }
        flags[key] = self.normalizeBooleanFlag(value, true);
      });
      return flags;
    }

    deriveAvailableTabs(target)
    {
      var flags = this.normalizeDisplayFlags(target || {});
      var tabs = ['basic'];
      var mapping = {
        announcements: 'displayAnnouncements',
        references: 'displayReferences',
        schedules: 'displaySchedules',
        products: 'displayProducts',
        chat: 'displayChat',
        bbs: 'displayBbs',
        submissions: 'displaySubmissions',
        reviews: 'displayReviews',
        badges: 'displayBadges',
        survey: 'displaySurvey'
      };
      for (var tab in mapping)
      {
        if (!Object.prototype.hasOwnProperty.call(mapping, tab))
        {
          continue;
        }
        var flagKey = mapping[tab];
        if (flags[flagKey])
        {
          tabs.push(tab);
        }
      }
      return tabs;
    }

    getAvailableTabs()
    {
      var tabs = Array.isArray(this.state && this.state.availableTabs)
        ? this.state.availableTabs.slice()
        : TAB_ORDER.slice();
      if (!tabs.length)
      {
        tabs = ['basic'];
      }
      if (tabs.indexOf('basic') === -1)
      {
        tabs.unshift('basic');
      }
      return tabs;
    }

    ensureActiveTabIsAvailable()
    {
      var available = this.getAvailableTabs();
      if (available.indexOf(this.state.activeTab) === -1)
      {
        this.state.activeTab = available[0] || 'basic';
      }
      return this.state.activeTab;
    }

    isTabEnabled(tabId)
    {
      return this.getAvailableTabs().indexOf(tabId) !== -1;
    }

    getDisplayFlags()
    {
      var target = this.state && this.state.target;
      if (target && target.displayFlags)
      {
        return target.displayFlags;
      }
      return this.normalizeDisplayFlags(target || {});
    }

    shouldDisplaySection(sectionId)
    {
      var map = {
        guidance: 'displayGuidance',
        goals: 'displayGoals',
        agreements: 'displayAgreements',
        basicConfirmation: 'displayBasicConfirmation'
      };
      var flagKey = map[sectionId];
      if (!flagKey)
      {
        return true;
      }
      var flags = this.getDisplayFlags();
      if (!flags || typeof flags[flagKey] === 'undefined')
      {
        return true;
      }
      return !!flags[flagKey];
    }

    normalizeSubmissions(list)
    {
      var self = this;
      var normalized = Array.isArray(list) ? list : [];
      return normalized.map(function (entry)
      {
        return self.normalizeSubmission(entry);
      }).filter(Boolean);
    }

    normalizeSubmission(entry)
    {
      if (!entry)
      {
        return null;
      }
      var self = this;
      var normalized = Object.assign({}, entry);
      var contentAttachments = this.buildAttachmentsFromContents(entry.contents);
      var attachments = Array.isArray(entry.attachments) ? entry.attachments.map(function (attachment)
      {
        if (!attachment)
        {
          return null;
        }
        if (typeof attachment === 'object')
        {
          return Object.assign({}, attachment);
        }
        var text = String(attachment).trim();
        if (!text)
        {
          return null;
        }
        return { label: text, previewUrl: text, downloadUrl: text };
      }).filter(Boolean) : [];

      attachments = contentAttachments.concat(attachments);

      var synthesized = this.buildSubmissionAttachmentFromFields(entry);
      if (synthesized)
      {
        if (!attachments.length)
        {
          attachments.push(synthesized);
        }
        else
        {
          var primary = Object.assign({}, attachments[0]);
          if (!primary.contentCode && synthesized.contentCode)
          {
            primary.contentCode = synthesized.contentCode;
          }
          if (!primary.previewUrl && synthesized.previewUrl)
          {
            primary.previewUrl = synthesized.previewUrl;
          }
          if (!primary.downloadUrl && synthesized.downloadUrl)
          {
            primary.downloadUrl = synthesized.downloadUrl;
          }
          if (!primary.playbackUrl && synthesized.playbackUrl)
          {
            primary.playbackUrl = synthesized.playbackUrl;
          }
          if (!primary.streamUrl && synthesized.streamUrl)
          {
            primary.streamUrl = synthesized.streamUrl;
          }
          if (!primary.type && synthesized.type)
          {
            primary.type = synthesized.type;
          }
          if (!primary.sizeDisplay && synthesized.sizeDisplay)
          {
            primary.sizeDisplay = synthesized.sizeDisplay;
          }
          attachments[0] = primary;
        }
      }

      normalized.attachments = attachments.map(function (attachment)
      {
        var enriched = Object.assign({}, attachment);
        var derivedType = self.deriveAttachmentType(enriched, entry);
        if (derivedType && enriched.type !== derivedType)
        {
          enriched.type = derivedType;
        }
        return enriched;
      });
      var seenCodes = Object.create(null);
      normalized.attachments = normalized.attachments.filter(function (attachment)
      {
        if (!attachment)
        {
          return false;
        }
        var code = attachment.contentCode ? String(attachment.contentCode) : '';
        if (!code)
        {
          return true;
        }
        var key = code.toLowerCase();
        if (seenCodes[key])
        {
          return false;
        }
        seenCodes[key] = true;
        return true;
      });
      return normalized;
    }

    deriveAttachmentType(attachment, entry)
    {
      if (!attachment)
      {
        return 'file';
      }

      var content = attachment.content || (entry && entry.content) || null;
      var candidates = [
        attachment.type,
        attachment.contentType,
        attachment.mimeType,
        attachment.category,
        content && content.type,
        content && content.contentType,
        content && content.mimeType,
        content && content.category,
        attachment.label,
        attachment.name,
        attachment.fileName,
        attachment.previewUrl,
        attachment.downloadUrl,
        attachment.playbackUrl,
        attachment.streamUrl,
        content && content.previewImage,
        content && content.previewImageUrl,
        content && content.thumbnail,
        content && content.imageUrl,
        attachment.extension || attachment.ext || attachment.fileExtension,
        content && (content.extension || content.ext || content.fileExtension)
      ];

      for (var i = 0; i < candidates.length; i += 1)
      {
        var value = candidates[i];
        if (!value)
        {
          continue;
        }

        var lower = String(value).toLowerCase();
        if (lower.indexOf('video') !== -1 || lower.indexOf('movie') !== -1)
        {
          return 'video';
        }
        if (lower.indexOf('audio') !== -1 || lower.indexOf('sound') !== -1 || lower.indexOf('voice') !== -1)
        {
          return 'audio';
        }
        if (lower.indexOf('image') !== -1 || lower.indexOf('photo') !== -1 || lower.indexOf('picture') !== -1 || lower.indexOf('img') === 0)
        {
          return 'image';
        }
        if (lower.indexOf('pdf') !== -1)
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

    buildSubmissionAttachmentFromFields(entry)
    {
      if (!entry)
      {
        return null;
      }
      var content = entry.content && typeof entry.content === 'object' ? entry.content : null;
      var contentCode = entry.contentCode || (content && (content.contentCode || content.code)) || '';
      var previewUrl = (content && (content.previewUrl || content.previewImage || content.previewImageUrl || content.thumbnail || content.imageUrl))
        || entry.previewUrl
        || entry.previewImage
        || entry.previewImageUrl
        || entry.posterUrl
        || entry.thumbnailUrl
        || entry.imageUrl
        || entry.url
        || '';
      var playbackUrl = entry.playbackUrl || entry.streamUrl || (content && (content.playbackUrl || content.streamUrl)) || '';
      var streamUrl = entry.streamUrl || (content && (content.streamUrl || content.playbackUrl)) || '';
      var downloadUrl = entry.downloadUrl || entry.contentUrl || entry.url || (content && (content.downloadUrl || content.url)) || '';
      var type = entry.contentType || entry.type || (content && (content.contentType || content.type)) || 'file';
      var label = entry.contentLabel || entry.label || entry.fileName || entry.name || (content && (content.title || content.name)) || '提出ファイル';
      var sizeDisplay = entry.sizeDisplay
        || (content && content.sizeDisplay)
        || (typeof entry.size === 'number' ? window.Utils.formatBytes(entry.size) : '');

      if (!contentCode && !previewUrl && !downloadUrl && !playbackUrl && !streamUrl)
      {
        return null;
      }

      var attachment = {
        label: label,
        type: type,
        sizeDisplay: sizeDisplay,
        previewUrl: previewUrl,
        playbackUrl: playbackUrl,
        streamUrl: streamUrl,
        downloadUrl: downloadUrl,
        contentCode: contentCode
      };
      if (content)
      {
        attachment.content = content;
      }
      if (entry.previewImage)
      {
        attachment.previewImage = entry.previewImage;
      }
      if (entry.previewImageUrl)
      {
        attachment.previewImageUrl = entry.previewImageUrl;
      }
      if (entry.posterUrl)
      {
        attachment.posterUrl = entry.posterUrl;
      }

      return attachment;
    }

    buildAttachmentsFromContents(contents)
    {
      var list = Array.isArray(contents) ? contents : [];
      return list.map(function (content)
      {
        if (!content)
        {
          return null;
        }
        var contentCode = content.contentCode || content.code || '';
        var label = content.fileName || content.title || contentCode || '提出ファイル';
        var type = content.contentType || content.mimeType || '';
        var sizeDisplay = '';
        if (typeof content.fileSize === 'number' && window.Utils && typeof window.Utils.formatBytes === 'function')
        {
          sizeDisplay = window.Utils.formatBytes(content.fileSize);
        }
        return {
          label: label,
          type: type,
          contentType: content.contentType,
          mimeType: content.mimeType,
          sizeDisplay: sizeDisplay,
          contentCode: contentCode,
          content: content
        };
      }).filter(Boolean);
    }

    normalizeAgreement(entry)
    {
      if (!entry) {
        return null;
      }
      var code = entry.agreementCode || entry.code || '';
      if (!code) {
        return null;
      }
      var type = entry.type || entry.agreementType || '';
      var title = entry.title || '規約';
      var content = entry.content || '';
      var notes = entry.notes || '';
      var createdAt = entry.createdAtDisplay || entry.createdAt || '';
      var updatedAt = entry.updatedAtDisplay || entry.updatedAt || '';
      var createdByUserCode = entry.createdByUserCode || entry.createdBy || '';
      var updatedByUserCode = entry.updatedByUserCode || entry.updatedBy || '';
      var createdBy = entry.createdByDisplayName || createdByUserCode || '';
      var updatedBy = entry.updatedByDisplayName || updatedByUserCode || '';
      var createdByAvatar = entry.createdByAvatar || {};
      var updatedByAvatar = entry.updatedByAvatar || {};
      var displayOrder = 0;
      if (typeof entry.displayOrder === 'number') {
        displayOrder = entry.displayOrder;
      } else if (entry.displayOrder){
        var parsedOrder = Number(entry.displayOrder);
        displayOrder = Number.isNaN(parsedOrder) ? 0 : parsedOrder;
      }
      return {
        agreementCode: code,
        targetCode: entry.targetCode || '',
        type: type,
        title: title,
        content: content,
        notes: notes,
        createdAt: createdAt,
        createdAtDisplay: createdAt ? formatDisplayTimestamp(createdAt) : '',
        updatedAt: updatedAt,
        updatedAtDisplay: updatedAt ? formatDisplayTimestamp(updatedAt) : '',
        createdByUserCode: createdByUserCode,
        createdByDisplayName: createdBy,
        createdByAvatarUrl: entry.createdByAvatarUrl || createdByAvatar.url || '',
        createdByAvatarTransform: entry.createdByAvatarTransform || createdByAvatar.transform || '',
        createdByAvatarAlt: entry.createdByAvatarAlt || '',
        createdByAvatarInitial: deriveParticipantInitial(createdBy || createdByUserCode, '？'),
        updatedByUserCode: updatedByUserCode,
        updatedByDisplayName: updatedBy,
        updatedByAvatarUrl: entry.updatedByAvatarUrl || updatedByAvatar.url || '',
        updatedByAvatarTransform: entry.updatedByAvatarTransform || updatedByAvatar.transform || '',
        updatedByAvatarAlt: entry.updatedByAvatarAlt || '',
        updatedByAvatarInitial: deriveParticipantInitial(updatedBy || updatedByUserCode, ''),
        displayOrder: displayOrder
      };
    }

    normalizeAgreements(list)
    {
      var self = this;
      if (!Array.isArray(list))
      {
        return [];
      }
      var normalized = list.map(function (item)
      {
        return self.normalizeAgreement(item);
      }).filter(Boolean);
      normalized.sort(function (a, b)
      {
        var orderA = a ? a.displayOrder || 0 : 0;
        var orderB = b ? b.displayOrder || 0 : 0;
        if (orderA !== orderB)
        {
          return orderA - orderB;
        }
        var updatedA = a && a.updatedAt ? parseTimestampValue(a.updatedAt) : 0;
        var updatedB = b && b.updatedAt ? parseTimestampValue(b.updatedAt) : 0;
        return updatedB - updatedA;
      });
      return normalized;
    }

    normalizeGoal(entry)
    {
      if (!entry) {
        return null;
      }
      var code = entry.goalCode || entry.code || '';
      if (!code) {
        return null;
      }
      var title = entry.title || '目標';
      var targetValue = entry.targetValue || '';
      var evidence = entry.evidence || '';
      var memo = entry.memo || '';
      var createdAt = entry.createdAtDisplay || entry.createdAt || '';
      var updatedAt = entry.updatedAtDisplay || entry.updatedAt || '';
      var createdBy = entry.createdByDisplayName || entry.createdByUserCode || '';
      var updatedBy = entry.updatedByDisplayName || entry.updatedByUserCode || '';
      var displayOrder = 0;
      if (typeof entry.displayOrder === 'number') {
        displayOrder = entry.displayOrder;
      } else if (entry.displayOrder){
        var parsedOrder = Number(entry.displayOrder);
        displayOrder = Number.isNaN(parsedOrder) ? 0 : parsedOrder;
      }

      var targetUsersRaw = [];
      if (Array.isArray(entry.targetUsers))
      {
        targetUsersRaw = entry.targetUsers.reduce(function (carry, user)
        {
          if (!user)
          {
            return carry;
          }
          if (typeof user === 'string')
          {
            carry.push({ displayName: user });
            return carry;
          }
          carry.push(user);
          return carry;
        }, []);
      }
      if (!targetUsersRaw.length && entry.targetUsers && typeof entry.targetUsers === 'object' && entry.targetUsers.userCode)
      {
        targetUsersRaw = [entry.targetUsers];
      }
      if (!targetUsersRaw.length && typeof entry.targetUsers === 'string')
      {
        targetUsersRaw = [{ displayName: entry.targetUsers }];
      }
      if (!targetUsersRaw.length && (entry.targetUserCode || entry.targetUserDisplayName)) {
        targetUsersRaw = [{
          userCode: entry.targetUserCode || '',
          displayName: entry.targetUserDisplayName || entry.targetUserCode || ''
        }];
      }

      var targetUserScope = normalizeAudienceScope(entry.targetUserScope || entry.audienceScope || (entry.assignAll ? 'all' : ''));
      var targetUsers = targetUsersRaw.map(function (user) {
        if (!user) {
          return null;
        }
        if (typeof user === 'string')
        {
          user = { displayName: user };
        }
        var userCode = user.userCode || user.code || '';
        var displayName = user.displayName || user.name || '';
        if (!userCode && !displayName) {
          return null;
        }

        var normalizedUser = {
          userCode: userCode || '',
          displayName: displayName || userCode
        };

        var roleLabel = user.roleLabel || user.roleName || user.role || user.assignmentRole || '';
        if (roleLabel) {
          normalizedUser.roleLabel = roleLabel;
        }

        var avatarUrl = user.avatarUrl || user.avatarURL || user.photoUrl || user.photoURL || user.imageUrl || user.imageURL || '';
        if (!avatarUrl && user.avatar && typeof user.avatar === 'object') {
          avatarUrl = user.avatar.avatarUrl || user.avatar.avatarURL || user.avatar.url || user.avatar.src || user.avatar.imageUrl || user.avatar.imageURL || '';
        }
        if (!avatarUrl && typeof user.avatar === 'string') {
          avatarUrl = user.avatar;
        }
        if (avatarUrl) {
          normalizedUser.avatarUrl = avatarUrl;
        }
        if (user.avatarAlt) {
          normalizedUser.avatarAlt = user.avatarAlt;
        }
        if (user.avatarInitial) {
          normalizedUser.avatarInitial = user.avatarInitial;
        }
        if (user.avatarTransform) {
          normalizedUser.avatarTransform = user.avatarTransform;
        }

        return normalizedUser;
      }).filter(Boolean);

      if (targetUserScope === AUDIENCE_SCOPE.ALL) {
        targetUsers = [];
      }

      return {
        goalCode: code,
        targetCode: entry.targetCode || '',
        title: title,
        targetValue: targetValue,
        evidence: evidence,
        memo: memo,
        targetUserScope: targetUserScope,
        targetUsers: targetUsers,
        createdAt: createdAt,
        createdAtDisplay: createdAt ? formatDisplayTimestamp(createdAt) : '',
        updatedAt: updatedAt,
        updatedAtDisplay: updatedAt ? formatDisplayTimestamp(updatedAt) : '',
        createdByDisplayName: createdBy,
        updatedByDisplayName: updatedBy,
        displayOrder: displayOrder
      };
    }

    normalizeGoals(list)
    {
      var self = this;
      if (!Array.isArray(list))
      {
        return [];
      }
      var normalized = list.map(function (item)
      {
        return self.normalizeGoal(item);
      }).filter(Boolean);
      normalized.sort(function (a, b)
      {
        var orderA = a ? a.displayOrder || 0 : 0;
        var orderB = b ? b.displayOrder || 0 : 0;
        if (orderA !== orderB)
        {
          return orderA - orderB;
        }
        var updatedA = a && a.updatedAt ? parseTimestampValue(a.updatedAt) : 0;
        var updatedB = b && b.updatedAt ? parseTimestampValue(b.updatedAt) : 0;
        return updatedB - updatedA;
      });
      return normalized;
    }

    normalizeBasicInfoConfirmation(raw)
    {
      var confirmation = {
        confirmed: false,
        confirmedAt: '',
        confirmedAtDisplay: '',
        userCode: raw && raw.userCode ? raw.userCode : ''
      };
      if (!raw)
      {
        return confirmation;
      }
      var confirmed = Boolean(raw.confirmed);
      var timestamp = raw.confirmedAt || raw.updatedAt || '';
      confirmation.confirmed = confirmed;
      confirmation.confirmedAt = timestamp || '';
      confirmation.confirmedAtDisplay = confirmed && timestamp ? formatDisplayTimestamp(timestamp) : '';
      confirmation.userCode = raw.userCode || confirmation.userCode || '';
      return confirmation;
    }

    normalizeBasicInfoConfirmations(list)
    {
      if (!Array.isArray(list))
      {
        return [];
      }
      var normalized = [];
      list.forEach(function (entry)
      {
        if (!entry)
        {
          return;
        }
        var code = entry.userCode || entry.code || '';
        var normalizedCode = code ? String(code).trim() : '';
        if (!normalizedCode)
        {
          return;
        }
        normalized.push({
          userCode: normalizedCode,
          confirmed: entry.confirmed !== false,
          confirmedAt: entry.confirmedAt || entry.updatedAt || ''
        });
      });
      return normalized;
    }

    renderError(error)
    {
      var container = this.refs.container;
      if (!container)
      {
        return;
      }
      container.innerHTML = '';
      var box = document.createElement('div');
      box.className = 'target-detail__error';
      box.textContent = 'ターゲット詳細を読み込めませんでした。時間をおいて再度お試しください。';
      if (error && error.message)
      {
        var detail = document.createElement('p');
        detail.className = 'target-detail__error-detail';
        detail.textContent = error.message;
        box.appendChild(detail);
      }
      container.appendChild(box);
    }

    showToast(level, message)
    {
      if (!this.toastService) {
        return;
      }
      if (level === 'error') {
        this.toastService.error(message);
        return;
      }
      if (level === 'success') {
        this.toastService.success(message);
        return;
      }
      this.toastService.info(message);
    }

    // 
    // chat
    //
    normalizeChatContext(payload)
    {
      var viewerCandidate = null;
      if (this.state && this.state.profile)
      {
        viewerCandidate = normalizeChatParticipantData({
          userCode: this.state.profile.userCode || this.state.profile.user_code || this.state.profile.code || '',
          displayName: this.state.profile.displayName || this.state.profile.name || this.state.profile.fullName || '',
          role: this.state.profile.role,
          avatarUrl: this.state.profile.avatarUrl || this.state.profile.photoUrl || this.state.profile.imageUrl || ''
        });
      }

      var participantSource = Array.isArray(payload && payload.participants) ? payload.participants : [];
      var normalizedParticipants = dedupeChatParticipants(
        participantSource.map(function (participant)
        {
          return normalizeChatParticipantData(participant);
        }).filter(Boolean)
      );
      var viewer = payload && payload.viewer ? normalizeChatParticipantData(payload.viewer) : null;
      if (!viewer && viewerCandidate)
      {
        viewer = viewerCandidate;
      }
      if (!viewer && normalizedParticipants.length)
      {
        viewer = normalizedParticipants.find(function (participant)
        {
          return participant && participant.role === 'coach';
        }) || normalizedParticipants[0];
      }
      var threadsSource = Array.isArray(payload && payload.threads) ? payload.threads : [];
      var normalizedThreads = threadsSource
        .map(function (thread)
        {
          return normalizeChatThreadData(thread, normalizedParticipants);
        })
        .filter(Boolean);
      normalizedThreads.sort(function (a, b)
      {
        return (b ? b.lastActivityValue || 0 : 0) - (a ? a.lastActivityValue || 0 : 0);
      });
      return {
        threads: normalizedThreads,
        participants: normalizedParticipants,
        viewer: viewer || null
      };
    }
    // chat

    // 
    // bbs
    //
    normalizeBbsContext(payload)
    {
      var viewerCandidate = null;
      if (this.state && this.state.profile)
      {
        viewerCandidate = normalizeBbsParticipantData({
          userCode: this.state.profile.userCode || this.state.profile.user_code || this.state.profile.code || '',
          displayName: this.state.profile.displayName || this.state.profile.name || this.state.profile.fullName || '',
          role: this.state.profile.role,
          avatarUrl: this.state.profile.avatarUrl || this.state.profile.photoUrl || this.state.profile.imageUrl || ''
        });
      }

      var participantSource = Array.isArray(payload && payload.participants) ? payload.participants : [];
      var normalizedParticipants = dedupeBbsParticipants(
        participantSource.map(function (participant)
        {
          return normalizeBbsParticipantData(participant);
        }).filter(Boolean)
      );
      var viewer = payload && payload.viewer ? normalizeBbsParticipantData(payload.viewer) : null;
      if (!viewer && viewerCandidate)
      {
        viewer = viewerCandidate;
      }
      if (!viewer && normalizedParticipants.length)
      {
        viewer = normalizedParticipants.find(function (participant)
        {
          return participant && participant.role === 'coach';
        }) || normalizedParticipants[0];
      }
      var threadsSource = Array.isArray(payload && payload.threads) ? payload.threads : [];
      var normalizedThreads = threadsSource
        .map(function (thread)
        {
          return normalizeBbsThreadData(thread, normalizedParticipants);
        })
        .filter(Boolean);
      normalizedThreads.sort(function (a, b)
      {
        return (b ? b.lastActivityValue || 0 : 0) - (a ? a.lastActivityValue || 0 : 0);
      });
      return {
        threads: normalizedThreads,
        participants: normalizedParticipants,
        viewer: viewer || null
      };
    }
    // bbs    

    async callApi(type, params, options)
    {
      var endpoint = this.config.apiEndpoint;
      var requestType = this.config.apiRequestType;
      var callOptions = options || {};
      if (callOptions.requestType)
      {
        requestType = callOptions.requestType;
      }
      var formData = new window.FormData();
      var appendFormValue = function (data, prefix, value)
      {
        if (value == null)
        {
          return;
        }
        if (value instanceof window.Blob)
        {
          data.append(prefix, value);
          return;
        }
        if (Array.isArray(value))
        {
          value.forEach(function (entry, index)
          {
            appendFormValue(data, prefix + '[' + index + ']', entry);
          });
          return;
        }
        if (typeof value === 'object')
        {
          Object.keys(value).forEach(function (key)
          {
            appendFormValue(data, prefix + '[' + key + ']', value[key]);
          });
          return;
        }
        data.append(prefix, value);
      };
      formData.append('requestType', requestType);
      formData.append('token', this.config.apiToken);
      formData.append('type', type);
      Object.keys(params || {}).forEach(function (key)
      {
        appendFormValue(formData, key, params[key]);
      });

      var controller;
      if (callOptions.signal instanceof AbortController)
      {
        controller = callOptions.signal;
      }

      var response = await window.fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        signal: controller ? controller.signal : undefined
      });
      if (!response.ok)
      {
        throw new Error('API request failed: ' + response.status);
      }
      var json = await response.json();
      if (!json || json.status !== 'OK')
      {
        throw new Error('API request failed');
      }
      return json.result || {};
    }
  }

  TargetDetail.helpers = Helpers;
  window.TargetDetail = TargetDetail;
})(window, document);
