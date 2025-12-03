(function ()
{
  'use strict';

  var DELETE_ICON_SVG = '\
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">\
      <path fill="currentColor" d="M9 3.5 8 4.5H6v2h12v-2h-2l-1-1h-6zm7 5.5v10.25A1.75 1.75 0 0 1 14.25 21H9.75A1.75 1.75 0 0 1 8 19.25V9h8zm-5.5 2.5v6h-1.5v-6H10.5zm4 0v6H13v-6h1.5z"></path>\
    </svg>\
  ';

  var EYE_ICON_SVG = '\
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">\
      <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M2.25 12S5.75 5.25 12 5.25 21.75 12 21.75 12 18.25 18.75 12 18.75 2.25 12 2.25 12z"></path>\
      <circle cx="12" cy="12" r="3.25" fill="none" stroke="currentColor" stroke-width="1.5"></circle>\
      <circle cx="12" cy="12" r="1.5" fill="currentColor"></circle>\
    </svg>\
  ';

  var SUBMISSION_ACTION_ICONS = {
    preview: {
      label: 'レビューをプレビュー',
      icon: EYE_ICON_SVG
    },
    detail: {
      label: '詳細を見る',
      icon: EYE_ICON_SVG
    },
    edit: {
      label: '編集する',
      icon: '\
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">\
          <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="m4.75 15.5 9.5-9.5a1.5 1.5 0 0 1 2.12 0l2.63 2.63a1.5 1.5 0 0 1 0 2.12l-9.5 9.5-4.5 1.25z"></path>\
          <path fill="currentColor" d="m14.5 6.5 3 3 1.25-1.25a0.5 0.5 0 0 0 0-0.7l-2.3-2.3a0.5 0.5 0 0 0-0.7 0z"></path>\
          <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M3.5 20.5h17"></path>\
        </svg>\
      '
    },
    delete: {
      label: '削除する',
      icon: DELETE_ICON_SVG
    }
  };

  var ATTACHMENT_ICON_INFO = {
    video: {
      type: 'video',
      label: '動画',
      icon: '\
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">\
          <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.5A1.75 1.75 0 0 1 5.5 4.75h8.5A1.75 1.75 0 0 1 15.75 6.5v11a1.75 1.75 0 0 1-1.75 1.75H5.5A1.75 1.75 0 0 1 3.75 17.5z"></path>\
          <path fill="currentColor" d="M17.25 9.2 20.5 7v10l-3.25-2.2z"></path>\
          <path fill="currentColor" d="m10 9.75 4.25 2.5L10 14.75z"></path>\
        </svg>\
      '
    },
    audio: {
      type: 'audio',
      label: '音声',
      icon: '\
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">\
          <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M13 4v10.1a3.4 3.4 0 1 1-1.5-2.86V4z"></path>\
          <rect x="13" y="4" width="6" height="4.2" rx="0.9" fill="currentColor"></rect>\
        </svg>\
      '
    },
    image: {
      type: 'image',
      label: '画像',
      icon: '\
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">\
          <rect x="3.75" y="4.75" width="16.5" height="14.5" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="1.5"></rect>\
          <circle cx="9" cy="10" r="1.8" fill="currentColor"></circle>\
          <path fill="currentColor" d="M6.5 17.25 10.75 13l3.2 3 2.55-2.15 3 3.4z"></path>\
        </svg>\
      '
    },
    file: {
      type: 'file',
      label: 'ファイル',
      icon: '\
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">\
          <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M7 3.5h7.5l4.5 4.5V20a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5z"></path>\
          <path fill="currentColor" d="M14.5 3.5V8h4.5z"></path>\
        </svg>\
      '
    }
  };

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

  function createSrText(text)
  {
    var sr = document.createElement('span');
    sr.className = 'site-header__sr-only';
    sr.textContent = text;
    return sr;
  }

  function normalizeAttachmentType(attachment)
  {
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

    var content = attachment && attachment.content ? attachment.content : null;

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
      content && content.mimeType ? String(content.mimeType).toLowerCase() : '',
      content && content.fileName ? String(content.fileName).toLowerCase() : '',
      content && content.contentType ? String(content.contentType).toLowerCase() : '',
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

  function resolveAttachmentInfo(type)
  {
    var resolvedType = normalizeAttachmentType(type);
    return ATTACHMENT_ICON_INFO[resolvedType] || ATTACHMENT_ICON_INFO.file;
  }

  function pickPrimaryAttachment(review)
  {
    if (!review || !Array.isArray(review.attachments))
    {
      return null;
    }
    for (var i = 0; i < review.attachments.length; i += 1)
    {
      if (review.attachments[i])
      {
        return review.attachments[i];
      }
    }
    return null;
  }

  function createSubmissionAction(action, options)
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
    var icon = createIconElement(info.icon);
    if (icon)
    {
      node.appendChild(icon);
    }
    node.appendChild(createSrText(label));
    return node;
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

  function formatReviewerSummary(review)
  {
    if (!review)
    {
      return 'レビュワー';
    }
    var parts = [];
    if (review.reviewerDisplayName)
    {
      parts.push(review.reviewerDisplayName);
    }
    if (review.reviewerCode && parts.indexOf(review.reviewerCode) === -1)
    {
      parts.push(review.reviewerCode);
    }
    return parts.length ? parts.join(' / ') : 'レビュワー';
  }

  class TargetDetailReview
  {
    constructor(pageInstance)
    {
      this.page = pageInstance;
      this.helpers = pageInstance && pageInstance.helpers ? pageInstance.helpers : {};
      this.state = {
        reviews: [],
        isLoading: false
      };
      this.refs = {
        container: null,
        list: null,
        feedback: null,
        refresh: null
      };
      this.modals = { add: null };
      this.avatarService = null;
      this.contentUploaderService = null;
      this.pendingUploadResults = [];
      this.uploadOwnerUserCode = '';
      this.contentLibrary = [];
      this.contentLibraryCache = {};
      this.contentLibraryOwner = '';
      this.loadingContentOwner = '';
      this.isLoadingContentLibrary = false;
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

    canManageReviews()
    {
      return this.page && typeof this.page.canManageTargetContent === 'function'
        && this.page.canManageTargetContent();
    }

    normalizeReviewer(selection)
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

    setReviewerSelection(modal, selection)
    {
      if (!modal)
      {
        return;
      }
      var normalized = this.normalizeReviewer(selection);
      modal.selectedUser = normalized;
      var hasSelection = !!normalized;
      if (modal.reviewerSummary)
      {
        modal.reviewerSummary.hidden = !hasSelection;
      }
      if (modal.reviewerEmpty)
      {
        modal.reviewerEmpty.hidden = hasSelection;
      }
      if (modal.reviewerName)
      {
        modal.reviewerName.textContent = normalized ? normalized.displayName : '';
      }
      if (modal.reviewerCode)
      {
        modal.reviewerCode.textContent = normalized && normalized.userCode ? '(' + normalized.userCode + ')' : '';
      }
      if (modal.reviewerClearButton)
      {
        if (hasSelection)
        {
          modal.reviewerClearButton.removeAttribute('disabled');
        }
        else
        {
          modal.reviewerClearButton.setAttribute('disabled', 'disabled');
        }
      }
      this.setFieldErrorState(modal.reviewerField, false);
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

    shouldShowReviewerField()
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

    applyReviewerSelectionPolicy(modal)
    {
      if (!modal)
      {
        return;
      }
      var isSupervisor = this.shouldShowReviewerField();
      var selection = modal.selectedUser || null;
      if (!isSupervisor)
      {
        selection = this.getSessionUserSelection() || selection;
      }
      this.setReviewerSelection(modal, selection);
      this.setElementVisibility(modal.reviewerField, isSupervisor);
      this.setElementVisibility(modal.reviewerActions, isSupervisor);
      if (modal.reviewerSelectButton)
      {
        modal.reviewerSelectButton.hidden = !isSupervisor;
        if (isSupervisor)
        {
          modal.reviewerSelectButton.removeAttribute('aria-hidden');
        }
        else
        {
          modal.reviewerSelectButton.setAttribute('aria-hidden', 'true');
        }
      }
      if (modal.reviewerClearButton)
      {
        modal.reviewerClearButton.hidden = !isSupervisor;
      }
    }

    getContentOwnerSelection(modal)
    {
      if (this.shouldShowReviewerField())
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

    notifyReviewerSelectionRequired(modal, forceToast)
    {
      var shouldForce = !!forceToast;
      if (!modal)
      {
        return;
      }
      if (modal.reviewerToastShown && !shouldForce)
      {
        return;
      }
      if (this.page && typeof this.page.showToast === 'function')
      {
        this.page.showToast('info', 'レビュー担当者を選択するとコンテンツを表示できます。');
      }
      modal.reviewerToastShown = true;
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
      if (this.shouldShowReviewerField() && !ownerKey)
      {
        this.notifyReviewerSelectionRequired(modal, true);
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

    async ensureContentLibrary(modal)
    {
      var ownerKey = this.resolveContentLibraryOwner(modal);
      var ownerParams = this.resolveContentLibraryOwnerParams(modal);
      var requiresSelection = this.shouldShowReviewerField();
      if (requiresSelection && !ownerKey)
      {
        this.contentLibrary = [];
        this.contentLibraryOwner = '';
        this.setContentPickerFeedback(modal, '', null);
        this.notifyReviewerSelectionRequired(modal);
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
      if (this.shouldShowReviewerField() && !owner)
      {
        modal.contentResults.innerHTML = '';
        this.setContentPickerFeedback(modal, '', null);
        this.notifyReviewerSelectionRequired(modal);
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
      if (modal.noteInput && userContents.description !== undefined && userContents.description !== null)
      {
        modal.noteInput.value = String(userContents.description);
      }
    }

    buildAttachmentsFromModalContents(contents)
    {
      if (!Array.isArray(contents))
      {
        return [];
      }
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
        return { label: label, displayName: label, type: type, contentCode: code, content: content };
      }).filter(Boolean);
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
          displayName: entry && (entry.title || entry.fileName || entry.name || entry.originalName || entry.contentCode || entry.code || 'コンテンツ'),
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
        var label = item && (item.label || item.displayName) ? (item.label || item.displayName) : (code || 'コンテンツ');
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

    resetContentSelection(modal)
    {
      if (!modal)
      {
        return;
      }
      modal.selectedContents = [];
      this.renderSelectedContents(modal);
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

    getReviewerCandidates()
    {
      var target = this.page && this.page.state ? this.page.state.target : null;
      var participants = target && Array.isArray(target.participants) ? target.participants.slice() : [];
      var assignedUsers = target && Array.isArray(target.assignedUsers) ? target.assignedUsers.slice() : [];
      var candidates = participants.concat(assignedUsers);

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

      window.console.log('[target-review] normalized reviewer candidates', {
        participants: participants.length,
        assignedUsers: assignedUsers.length,
        normalized: normalizedList.length,
        details: stats
      });

      return normalizedList;
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

    openReviewerSelectModal(modal)
    {
      if (!this.shouldShowReviewerField())
      {
        return;
      }
      var service = this.getUserSelectModalService();
      if (!service || typeof service.open !== 'function')
      {
        this.setModalFeedback('レビュワー選択モーダルを利用できません。', 'error');
        return;
      }
      var selected = modal && modal.selectedUser ? modal.selectedUser : null;
      var selectedCodes = selected && selected.userCode ? [selected.userCode] : [];
      var initialKeyword = selected && (selected.userCode || selected.displayName) ? (selected.userCode || selected.displayName) : '';
      var modalOptions = {
        multiple: false,
        selectedCodes: selectedCodes,
        initialKeyword: initialKeyword,
        availableUsers: this.getReviewerCandidates(),
        onSelect: (user) =>
        {
          this.setReviewerSelection(modal, user);
        },
        onClose: () =>
        {
          if (modal && modal.reviewerSelectButton && typeof modal.reviewerSelectButton.focus === 'function')
          {
            modal.reviewerSelectButton.focus();
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
        this.setModalFeedback('レビュワー選択モーダルを開けませんでした。', 'error');
      }
    }

    async render()
    {
      this.refs.container = this.page.refs.tabPanels && this.page.refs.tabPanels.reviews;
      if (!this.refs.container)
      {
        return;
      }
      this.refs.container.innerHTML = '';
      this.refs.container.classList.add('target-detail__panel');

      var section = document.createElement('section');
      section.className = 'target-detail__reviews';
      var header = document.createElement('div');
      header.className = 'target-detail__section-header';
      var title = document.createElement('h2');
      title.textContent = 'レビュー';
      header.appendChild(title);
      var actions = document.createElement('div');
      actions.className = 'target-detail__section-actions target-detail__review-actions';

      if (this.canManageReviews())
      {
        var openButton = this.page.buttonService.createActionButton('expandable-icon-button/add', {
          baseClass: 'target-management__icon-button target-management__icon-button--primary target-detail__review-open'
        });
        openButton.addEventListener('click', (event) =>
        {
          event.preventDefault();
          this.openAddModal();
        });
        actions.appendChild(openButton);
      }

      var refreshButton = this.page.buttonService.createActionButton('expandable-icon-button/reload', {
        baseClass: 'target-management__icon-button target-management__icon-button--ghost target-detail__review-refresh'
      });
      refreshButton.addEventListener('click', (event) =>
      {
        event.preventDefault();
        this.reloadReviews(true);
      });
      actions.appendChild(refreshButton);
      this.refs.refresh = refreshButton;

      header.appendChild(actions);
      section.appendChild(header);
      section.appendChild(this.renderListCard());
      this.refs.container.appendChild(section);

      await this.reloadReviews();
    }

    renderListCard()
    {
      var grid = document.createElement('div');
      grid.className = 'target-detail__review-grid target-detail__submission-grid';

      var card = document.createElement('div');
      card.className = 'target-detail__card target-detail__review-card';

      var feedback = document.createElement('div');
      feedback.className = 'user-management__feedback target-detail__review-feedback';
      feedback.setAttribute('role', 'status');
      feedback.setAttribute('aria-live', 'polite');
      feedback.hidden = true;
      card.appendChild(feedback);
      this.refs.feedback = feedback;

      var list = document.createElement('div');
      list.className = 'target-detail__review-list';
      card.appendChild(list);
      this.refs.list = list;

      grid.appendChild(card);
      return grid;
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

    setLoadingState(isLoading)
    {
      if (this.refs.refresh)
      {
        this.refs.refresh.disabled = Boolean(isLoading);
      }
    }

    async reloadReviews(forceReload)
    {
      if (this.state.isLoading)
      {
        return;
      }
      this.state.isLoading = true;
      this.setLoadingState(true);
      this.setFeedback('レビューを読み込み中です…', 'info');
      try
      {
        var data = await this.page.loadReviews(forceReload ? { force: true } : undefined);
        var list = Array.isArray(data) ? data : [];
        this.state.reviews = list.map((entry) => this.normalizeReview(entry)).filter(Boolean);
        this.renderList();
        if (!this.state.reviews.length)
        {
          this.setFeedback('登録されたレビューはありません。', 'info');
        }
        else
        {
          this.clearFeedback();
        }
      }
      catch (error)
      {
        window.console.error('[target-detail] failed to load reviews', error);
        this.setFeedback('レビュー情報の取得に失敗しました。', 'error');
      }
      finally
      {
        this.state.isLoading = false;
        this.setLoadingState(false);
      }
    }

    normalizeReview(review)
    {
      if (!review)
      {
        return null;
      }
      var normalized = Object.assign({}, review);
      normalized.reviewerDisplayName = review.reviewerDisplayName || review.reviewerName || review.reviewer || '';
      normalized.reviewerCode = review.reviewerCode || review.reviewerId || '';
      if (!normalized.reviewedAtDisplay)
      {
        if (review.reviewedAt && this.helpers && typeof this.helpers.formatDateTime === 'function')
        {
          normalized.reviewedAtDisplay = this.helpers.formatDateTime(review.reviewedAt);
        }
        else
        {
          normalized.reviewedAtDisplay = review.reviewedAt || '';
        }
      }
      var attachments = Array.isArray(review.attachments)
        ? review.attachments.map(function (item)
        {
          if (!item)
          {
            return null;
          }
          var displayName = item.displayName || item.fileName || item.storageFileName || item.label || item.name || '';
          return Object.assign({}, item, { displayName: displayName });
        }).filter(Boolean)
        : [];
      var contentAttachment = this.buildAttachmentFromContent(review);
      if (contentAttachment)
      {
        attachments.unshift(contentAttachment);
      }
      normalized.attachments = attachments;
      normalized.privateNote = review.privateNote || review.note || '';
      return normalized;
    }

    buildAttachmentFromContent(review)
    {
      if (!review)
      {
        return null;
      }

      var content = review.contents || review.content || null;
      var contentCode = review.contentCode
        || review.contentsCode
        || (content && (content.contentCode || content.code));
      if (!content && !contentCode)
      {
        return null;
      }

      var displayName = review.title
        || (content && (content.title || content.displayName || content.fileName))
        || '';
      var attachmentType = (content && (content.contentType || content.mimeType || content.type))
        || review.contentType
        || review.contentMimeType
        || '';

      var attachment = {
        displayName: displayName || 'レビューコンテンツ',
        label: displayName || 'レビューコンテンツ',
        name: displayName || 'レビューコンテンツ',
        type: attachmentType || 'file',
        contentType: attachmentType,
        contentCode: contentCode || '',
        content: content ? Object.assign({}, content, { contentCode: contentCode || content.contentCode }) : null
      };

      if (content)
      {
        attachment.previewUrl = content.previewUrl || content.url || '';
        attachment.downloadUrl = content.downloadUrl || content.url || content.filePath || '';
      }

      return attachment;
    }

    renderList()
    {
      if (!this.refs.list)
      {
        return;
      }
      this.refs.list.innerHTML = '';
      if (!this.state.reviews.length)
      {
        var empty = document.createElement('p');
        empty.className = 'target-detail__review-empty';
        empty.textContent = '登録されたレビューはありません。';
        this.refs.list.appendChild(empty);
        return;
      }

      var table = document.createElement('table');
      table.className = 'target-detail__review-table target-detail__submission-table';

      var thead = document.createElement('thead');
      thead.innerHTML = '' +
        '<tr>' +
        '<th scope="col">サムネイル</th>' +
        '<th scope="col">レビュー担当者</th>' +
        '<th scope="col">レビュー日時</th>' +
        '<th scope="col">レビュー内容</th>' +
        '<th scope="col">内部メモ</th>' +
        '<th scope="col" class="target-detail__submission-actions-header">操作</th>' +
        '</tr>';
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      this.state.reviews.forEach((review) =>
      {
        var row = document.createElement('tr');
        row.className = 'target-detail__review-row';
        row.appendChild(this.createThumbnailCell(review));
        row.appendChild(this.createReviewerCell(review));

        var dateCell = document.createElement('td');
        dateCell.className = 'target-detail__review-cell target-detail__review-cell--date';
        dateCell.textContent = review.reviewedAtDisplay || '—';
        row.appendChild(dateCell);

        var contentCell = document.createElement('td');
        contentCell.className = 'target-detail__review-cell target-detail__review-cell--content';
        contentCell.textContent = review.content || '—';
        row.appendChild(contentCell);

        var noteCell = document.createElement('td');
        noteCell.className = 'target-detail__review-cell target-detail__review-cell--note';
        noteCell.textContent = review.privateNote || '—';
        row.appendChild(noteCell);

        row.appendChild(this.createActionCell(review));

        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      this.refs.list.appendChild(table);

      this.bindReviewerPopovers(table);
    }

    createThumbnailCell(review)
    {
      var cell = document.createElement('td');
      cell.className = 'target-detail__review-cell target-detail__review-cell--thumbnail target-detail__submission-thumbnail-cell';

      var wrapper = document.createElement('div');
      wrapper.className = 'target-detail__submission-thumbnail';

      var attachment = pickPrimaryAttachment(review);
      var attachmentType = normalizeAttachmentType(attachment);
      var typeLabel = attachment ? formatAttachmentTypeLabel(attachmentType) : '';
      var badge = createAttachmentTypeBadge(attachmentType, typeLabel);
      var isPdfThumbnail = attachment && attachmentType === 'pdf';
      var thumbnailUrl = isPdfThumbnail ? '' : this.resolveAttachmentThumbnail(attachment);

      if (thumbnailUrl)
      {
        var image = document.createElement('img');
        image.className = 'target-detail__submission-thumbnail-image';
        image.src = thumbnailUrl;
        image.loading = 'lazy';
        image.alt = attachment && attachment.displayName ? attachment.displayName : 'レビューサムネイル';
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
        placeholder.textContent = typeLabel || 'なし';
        wrapper.appendChild(placeholder);
      }

      if (badge)
      {
        wrapper.appendChild(badge);
      }

      cell.appendChild(wrapper);
      return cell;
    }

    createReviewerCell(review)
    {
      var cell = document.createElement('td');
      cell.className = 'target-detail__review-cell target-detail__review-cell--reviewer';
      cell.title = formatReviewerSummary(review);
      cell.appendChild(this.createReviewerDisplay(review));
      return cell;
    }

    resolveAttachmentThumbnail(attachment)
    {
      if (!attachment)
      {
        return '';
      }

      var attachmentType = normalizeAttachmentType(attachment);
      if (attachmentType === 'pdf')
      {
        return '';
      }

      var contentCode = attachment.contentCode || (attachment.content && attachment.content.contentCode);
      if (contentCode)
      {
        var contentRecord = Object.assign({}, attachment.content || {}, { contentCode: contentCode });
        var apiThumbnail = this.buildContentImageUrl(contentRecord, { variant: 'thumbnail' });
        if (apiThumbnail)
        {
          return apiThumbnail;
        }
      }

      var previewCandidates = [];
      if (attachment.previewImage)
      {
        previewCandidates.push(attachment.previewImage);
      }
      if (attachment.previewImageUrl)
      {
        previewCandidates.push(attachment.previewImageUrl);
      }
      if (attachment.content)
      {
        previewCandidates.push(attachment.content.previewImage);
        previewCandidates.push(attachment.content.previewImageUrl);
        previewCandidates.push(attachment.content.thumbnail);
        previewCandidates.push(attachment.content.imageUrl);
      }

      var previewSource = this.resolveAttachmentPreviewUrl(attachment) || attachment.downloadUrl || '';
      if (attachmentType === 'image')
      {
        previewCandidates.push(previewSource);
      }
      previewCandidates.push(previewSource);

      for (var i = 0; i < previewCandidates.length; i += 1)
      {
        var candidate = previewCandidates[i];
        if (!candidate)
        {
          continue;
        }
        var resolved = String(candidate).trim();
        if (resolved)
        {
          return resolved;
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

      var record = attachment.content ? attachment.content : {};
      var contentCode = attachment.contentCode || (record && record.contentCode);
      var type = normalizeAttachmentType(attachment);
      if (attachment.youtubeUrl)
      {
        var youtubeUrl = attachment.youtubeUrl || attachment.previewUrl || '';
        if (youtubeUrl)
        {
          return youtubeUrl;
        }
      }

      if (contentCode)
      {
        var contentRecord = Object.assign({}, record, { contentCode: contentCode });
        if (type === 'image')
        {
          var imageUrl = this.buildContentImageUrl(contentRecord);
          if (imageUrl)
          {
            return imageUrl;
          }
        }

        var fileUrl = this.buildContentFileUrl(contentRecord);
        if (fileUrl)
        {
          return fileUrl;
        }
      }

      var url = attachment.previewUrl
        || attachment.embedUrl
        || attachment.playbackUrl
        || attachment.streamUrl
        || attachment.url
        || attachment.downloadUrl
        || attachment.contentUrl
        || '';

      if (url)
      {
        return url;
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

    createReviewerDisplay(review)
    {
      var anchor = document.createElement('span');
      anchor.className = 'target-detail__submission-user-display';
      anchor.setAttribute('role', 'button');
      anchor.tabIndex = 0;
      anchor.setAttribute('data-reviewer-avatar-anchor', 'true');

      var displayName = review.reviewerDisplayName || '';
      var reviewerCode = review.reviewerCode || '';
      var reviewerLabel = displayName || reviewerCode || 'レビュワー';

      anchor.dataset.userDisplay = reviewerLabel;
      anchor.dataset.userName = displayName;
      anchor.dataset.userCode = reviewerCode;
      anchor.dataset.userTooltip = formatReviewerSummary(review);
      anchor.dataset.userRole = 'レビュー担当者';
      anchor.setAttribute('aria-label', reviewerLabel);

      var avatar = document.createElement('span');
      avatar.className = 'target-detail__submission-user-avatar';
      avatar.setAttribute('data--creator-avatar', 'true');
      avatar.dataset.avatarName = reviewerLabel;
      avatar.dataset.avatarAlt = reviewerLabel;
      avatar.dataset.userDisplay = reviewerLabel;
      avatar.dataset.userName = reviewerLabel;
      avatar.dataset.userCode = review && review.reviewerUserCode ? review.reviewerUserCode : '';
      avatar.dataset.userActive = review && review.isActive === false ? 'false' : 'true';
      if (review.reviewerAvatarUrl)
      {
        avatar.dataset.avatarSrc = review.reviewerAvatarUrl;
      }
      if (review.reviewerAvatarTransform)
      {
        avatar.dataset.avatarTransform = review.reviewerAvatarTransform;
      }

      var avatarService = this.getAvatarService();
      if (avatarService && typeof avatarService.render === 'function')
      {
        try
        {
          var data = { name: reviewerLabel, alt: reviewerLabel, isActive: review && review.isActive !== false };
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
          if (node && review.reviewerAvatarTransform)
          {
            var img = node.querySelector('img');
            if (img)
            {
              img.style.transform = review.reviewerAvatarTransform;
            }
          }
        }
        catch (error)
        {
          if (window.console && typeof window.console.warn === 'function')
          {
            window.console.warn('[target-detail][review] failed to render reviewer avatar', error);
          }
        }
      }
      else
      {
        avatar.textContent = buildInitial(reviewerLabel);
      }

      anchor.appendChild(avatar);
      return anchor;
    }

    createActionCell(review)
    {
      var cell = document.createElement('td');
      cell.className = 'target-detail__review-cell target-detail__review-cell--actions';

      var primaryAttachment = pickPrimaryAttachment(review);
      var previewUrl = this.resolveAttachmentPreviewUrl(primaryAttachment);
      var hasPreviewSource = !!(previewUrl || (primaryAttachment && primaryAttachment.contentCode));
      var previewButton = createSubmissionAction('preview', {
        element: 'button',
        ariaLabel: 'レビューをプレビュー',
        disabled: !hasPreviewSource
      });
      if (hasPreviewSource)
      {
        previewButton.addEventListener('click', (event) =>
        {
          event.preventDefault();
          this.handlePreview(primaryAttachment);
        });
      }
      else
      {
        previewButton.setAttribute('aria-disabled', 'true');
        previewButton.addEventListener('click', function (event)
        {
          event.preventDefault();
        });
      }
      cell.appendChild(previewButton);

      if (this.canManageReviews())
      {
        var editButton = createSubmissionAction('edit', {
          element: 'button',
          ariaLabel: 'レビューを編集'
        });
        editButton.addEventListener('click', (event) =>
        {
          event.preventDefault();
          this.openAddModal(review);
        });
        cell.appendChild(editButton);

        var deleteButton = createSubmissionAction('delete', {
          element: 'button',
          ariaLabel: 'レビューを削除'
        });
        deleteButton.addEventListener('click', (event) =>
        {
          event.preventDefault();
          this.deleteReview(review, deleteButton);
        });
        cell.appendChild(deleteButton);
      }

      return cell;
    }

    bindReviewerPopovers(container)
    {
      var avatarService = this.getAvatarService();
      if (!avatarService || typeof avatarService.eventUpdate !== 'function')
      {
        return;
      }
      var anchors = container.querySelectorAll('[data-reviewer-avatar-anchor]');
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

    handlePreview(attachment)
    {
      if (!attachment)
      {
        this.showPreviewError();
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
      this.showFilePreviewError();
    }

    async openVideoAttachment(attachment)
    {
      var service = this.page && this.page.videoModalService;
      if (!service)
      {
        throw new Error('[target-detail] video modal service is not available');
      }
      if (attachment && attachment.youtubeUrl)
      {
        var youtubeUrl = this.resolveAttachmentPreviewUrl(attachment);
        if (!youtubeUrl)
        {
          this.showPreviewError();
          return;
        }
        service.openYouTube(youtubeUrl, { autoplay: false, title: attachment.displayName || attachment.name || '' });
        return;
      }

      var contentCode = attachment && attachment.contentCode;
      if (contentCode)
      {
        try
        {
          var spec = { contentCode: contentCode, title: attachment.displayName || attachment.name || '' };
          if (attachment.content)
          {
            spec.contentRecord = attachment.content;
          }
          await service.openContentVideo(spec, { autoplay: false });
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
        this.showPreviewError();
        return;
      }
      service.openHtml5(url, { autoplay: false, title: attachment.displayName || attachment.name || '' });
    }

    openImageAttachment(attachment)
    {
      var service = this.page && this.page.imageModalService;
      if (!service)
      {
        throw new Error('[target-detail] image modal service is not available');
      }
      var record = attachment && (attachment.content || {});
      var contentCode = attachment && (attachment.contentCode || (record && record.contentCode));
      var url = '';
      if (contentCode)
      {
        var contentRecord = Object.assign({}, record, { contentCode: contentCode });
        url = this.buildContentImageUrl(contentRecord) || this.buildContentFileUrl(contentRecord);
      }
      if (!url)
      {
        url = this.resolveAttachmentPreviewUrl(attachment);
      }
      if (!url && contentCode)
      {
        url = this.buildContentFileUrl({ contentCode: contentCode });
      }
      if (!url)
      {
        this.showPreviewError();
        return;
      }
      service.show(url, { alt: attachment.displayName || attachment.name || '', caption: attachment.displayName || attachment.name || '' });
    }

    async openPdfAttachment(attachment)
    {
      var service = this.page && this.page.pdfModalService;
      if (!service)
      {
        throw new Error('[target-detail] pdf modal service is not available');
      }

      var record = attachment && (attachment.content || {});
      var contentCode = attachment && (attachment.contentCode || (record && record.contentCode));
      var url = '';
      if (contentCode)
      {
        url = this.buildContentFileUrl(Object.assign({}, record, { contentCode: contentCode }));
      }

      if (!url)
      {
        url = this.resolveAttachmentPreviewUrl(attachment);
      }
      if (!url && contentCode)
      {
        url = this.buildContentFileUrl({ contentCode: contentCode });
      }

      if (!url)
      {
        this.showPreviewError();
        return;
      }

      var title = attachment && (attachment.displayName || attachment.label || attachment.name || attachment.fileName)
        ? (attachment.displayName || attachment.label || attachment.name || attachment.fileName)
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
        this.showPreviewError();
      }
    }

    showPreviewError()
    {
      if (this.page && typeof this.page.showToast === 'function')
      {
        this.page.showToast('error', 'プレビューできるレビューコンテンツが見つかりませんでした。');
      }
    }

    showFilePreviewError()
    {
      if (this.page && typeof this.page.showToast === 'function')
      {
        this.page.showToast('error', 'このレビューはプレビューできません。ダウンロードして確認してください。');
      }
    }

    async openAddModal(review)
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
        window.console.error('[target-detail] failed to init review uploader', error);
      }
      modal.root.removeAttribute('hidden');
      modal.root.setAttribute('aria-hidden', 'false');
      modal.root.classList.add('is-open');
      modal.restoreTarget = document.activeElement;
      modal.form.reset();
      modal.mode = review ? 'edit' : 'create';
      modal.currentReview = review || null;
      modal.titleNode.textContent = review ? 'レビューを編集' : 'レビューを追加';
      modal.submitButton.textContent = review ? '更新する' : '追加する';
      this.setModalSubmitting(modal, false);
      this.resetUploadState(modal);
      this.setModalFeedback('', null);
      this.clearModalValidationState(modal);
      modal.reviewerToastShown = false;
      this.fillFormWithReview(modal, review);
      this.applyReviewerSelectionPolicy(modal);
      var focusReviewer = this.shouldShowReviewerField();
      this.toggleContentPicker(modal, false);
      this.renderSelectedContents(modal);
      if (focusReviewer && modal.reviewerSelectButton && typeof modal.reviewerSelectButton.focus === 'function')
      {
        modal.reviewerSelectButton.focus();
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
        '<section class="screen-modal__content target-reference__modal" role="dialog" aria-modal="true" aria-labelledby="target-review-modal-title">' +
        '<button type="button" class="screen-modal__close" aria-label="モーダルを閉じる">×</button>' +
        '<header class="screen-modal__header">' +
        '<h2 class="screen-modal__title" id="target-review-modal-title">レビューを追加</h2>' +
        '<p class="screen-modal__summary">レビュー内容と添付コンテンツを登録します。</p>' +
        '</header>' +
        '<form class="screen-modal__body target-reference__form" novalidate>' +
        '<div class="target-reference__form-field">' +
        '<span class="target-reference__form-label">レビュー担当者</span>' +
        '<div class="target-submission__submitter" data-target-review-user-picker>' +
        '<p class="target-submission__submitter-empty" data-target-review-user-empty>レビュー担当者が選択されていません。</p>' +
        '<div class="target-submission__submitter-summary" data-target-review-user-summary hidden>' +
        '<span class="target-submission__submitter-name" data-target-review-user-name></span>' +
        '<span class="target-submission__submitter-code" data-target-review-user-code></span>' +
        '</div>' +
        '<div class="target-reference__form-actions">' +
        '<button type="button" class="btn btn--ghost" data-target-review-user-select>レビュー担当者を選択</button>' +
        '<button type="button" class="btn btn--text" data-target-review-user-clear disabled>選択をクリア</button>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="target-submission__panel-grid">' +
        '<section class="target-submission__panel" aria-labelledby="target-review-panel-library">' +
        '<div class="target-reference__form-field target-reference__form-row--full">' +
        '<div class="target-submission__content-select-header">' +
        '<p class="target-reference__form-label" id="target-review-panel-library">登録済みコンテンツから追加</p>' +
        '</div>' +
        '<div class="target-submission__content-select-box">' +
        '<p class="target-reference__upload-note" data-target-review-content-summary>コンテンツを選択していません。</p>' +
        '<div class="target-reference__form-actions target-submission__content-select-actions">' +
        '<button type="button" class="btn btn--primary" data-target-review-content-open>コンテンツを選択</button>' +
        '<button type="button" class="btn btn--text" data-target-review-content-clear disabled>選択をクリア</button>' +
        '</div>' +
        '</div>' +
        '<ul class="target-submission__content-list" data-target-review-content-list hidden></ul>' +
        '<div class="target-submission__content-picker" data-target-review-content-picker hidden>' +
        '<label class="target-reference__form-label" for="target-review-content-search">コンテンツを検索</label>' +
        '<input id="target-review-content-search" class="user-management__input target-reference__input" type="search" placeholder="タイトルやコンテンツコードで検索" data-target-review-content-search />' +
        '<p class="target-reference__upload-note" data-target-review-content-feedback hidden></p>' +
        '<div class="target-submission__content-picker-results" data-target-review-content-results></div>' +
        '<div class="target-reference__form-actions target-submission__content-picker-actions">' +
        '<button type="button" class="btn btn--ghost" data-target-review-content-close>閉じる</button>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</section>' +
        '<section class="target-submission__panel" aria-labelledby="target-review-panel-upload">' +
        '<div class="target-reference__form-field target-reference__form-row--full target-reference__form-upload">' +
        '<p class="target-reference__form-label" id="target-review-panel-upload">コンテンツをアップロード</p>' +
        '<div class="target-reference__uploader" data-target-review-uploader></div>' +
        '<p class="target-reference__upload-note" data-target-review-upload-counter>アップロードは任意です。ファイルを選択するとここに表示されます。</p>' +
        '</div>' +
        '</section>' +
        '</div>' +
        '<div class="target-reference__form-field target-reference__form-row--full">' +
        '<label class="target-reference__form-label" for="target-review-content">レビュー内容</label>' +
        '<textarea id="target-review-content" class="user-management__input target-reference__textarea" name="content" rows="3" maxlength="1024" placeholder="フィードバックを入力" required></textarea>' +
        '</div>' +
        '<div class="target-reference__form-field target-reference__form-row--full">' +
        '<label class="target-reference__form-label" for="target-review-note">内部メモ (任意)</label>' +
        '<textarea id="target-review-note" class="user-management__input target-reference__textarea" name="privateNote" rows="3" maxlength="1024" placeholder="内部共有用のメモを入力"></textarea>' +
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
      var reviewerSummary = form.querySelector('[data-target-review-user-summary]');
      var reviewerEmpty = form.querySelector('[data-target-review-user-empty]');
      var reviewerName = form.querySelector('[data-target-review-user-name]');
      var reviewerCode = form.querySelector('[data-target-review-user-code]');
      var reviewerSelectButton = form.querySelector('[data-target-review-user-select]');
      var reviewerClearButton = form.querySelector('[data-target-review-user-clear]');
      var contentInput = form.querySelector('#target-review-content');
      var noteInput = form.querySelector('#target-review-note');
      var feedback = form.querySelector('.target-reference__form-feedback');
      var uploaderHost = form.querySelector('[data-target-review-uploader]');
      var uploadCounter = form.querySelector('[data-target-review-upload-counter]');
      var contentOpenButton = form.querySelector('[data-target-review-content-open]');
      var contentClearButton = form.querySelector('[data-target-review-content-clear]');
      var contentList = form.querySelector('[data-target-review-content-list]');
      var contentSummary = form.querySelector('[data-target-review-content-summary]');
      var contentPicker = form.querySelector('[data-target-review-content-picker]');
      var contentSearch = form.querySelector('[data-target-review-content-search]');
      var contentResults = form.querySelector('[data-target-review-content-results]');
      var contentFeedback = form.querySelector('[data-target-review-content-feedback]');
      var contentCloseButton = form.querySelector('[data-target-review-content-close]');
      var submitButton = form.querySelector('button[type="submit"]');
      var reviewerField = reviewerSummary ? reviewerSummary.closest('.target-reference__form-field') : null;
      var reviewerActions = reviewerField ? reviewerField.querySelector('.target-reference__form-actions') : null;
      var contentField = contentInput ? contentInput.closest('.target-reference__form-field') : null;

      var self = this;

      var modal = {
        root: modalRoot,
        form: form,
        titleNode: titleNode,
        reviewerSummary: reviewerSummary,
        reviewerEmpty: reviewerEmpty,
        reviewerName: reviewerName,
        reviewerCode: reviewerCode,
        reviewerSelectButton: reviewerSelectButton,
        reviewerClearButton: reviewerClearButton,
        contentInput: contentInput,
        noteInput: noteInput,
        feedback: feedback,
        uploaderHost: uploaderHost,
        uploadCounter: uploadCounter,
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
        reviewerField: reviewerField,
        reviewerActions: reviewerActions,
        contentField: contentField,
        restoreTarget: null,
        isSubmitting: false,
        mode: 'create',
        currentReview: null,
        selectedUser: null,
        selectedContents: [],
        reviewerToastShown: false
      };

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
          window.console.error('[target-detail] failed to confirm review modal close', error);
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

      if (reviewerSelectButton)
      {
        reviewerSelectButton.addEventListener('click', () =>
        {
          this.openReviewerSelectModal(modal);
        });
      }
      if (reviewerClearButton)
      {
        reviewerClearButton.addEventListener('click', () =>
        {
          this.setReviewerSelection(modal, null);
          if (reviewerSelectButton && typeof reviewerSelectButton.focus === 'function')
          {
            reviewerSelectButton.focus();
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
        self.submitReviewForm(modal);
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
          return self.uploadReviewContent(file, options || {});
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
      this.updateUploadCounterText(modal && modal.currentReview && Array.isArray(modal.currentReview.attachments) ? modal.currentReview.attachments.length : 0, modal);
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
    }

    hasUploadQueueItems()
    {
      return this.contentUploaderService
        && this.contentUploaderService.state
        && Array.isArray(this.contentUploaderService.state.queue)
        && this.contentUploaderService.state.queue.length > 0;
    }

    collectModalFormValues(modal)
    {
      if (!modal)
      {
        return {
          reviewerDisplayName: '',
          reviewerCode: '',
          content: '',
          privateNote: ''
        };
      }
      var selectedUser = modal.selectedUser || null;
      return {
        reviewerDisplayName: selectedUser && selectedUser.displayName ? String(selectedUser.displayName).trim() : '',
        reviewerCode: selectedUser && selectedUser.userCode ? String(selectedUser.userCode).trim() : '',
        content: modal.contentInput.value.trim(),
        privateNote: modal.noteInput.value.trim()
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
      this.setFieldErrorState(modal.reviewerField, false);
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
        modal.reviewerSelectButton,
        modal.reviewerClearButton,
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
          if (target === modal.reviewerClearButton && !modal.selectedUser)
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

    fillFormWithReview(modal, review)
    {
      if (!modal)
      {
        return;
      }
      if (!review)
      {
        this.setReviewerSelection(modal, null);
        modal.contentInput.value = '';
        modal.noteInput.value = '';
        this.updateUploadCounterText(0, modal);
        this.resetContentSelection(modal);
        return;
      }
      this.setReviewerSelection(modal, {
        displayName: review.reviewerDisplayName || review.reviewerName || '',
        userCode: review.reviewerCode || review.reviewerId || ''
      });
      modal.contentInput.value = review.content || '';
      modal.noteInput.value = review.privateNote || '';
      var count = Array.isArray(review.attachments) ? review.attachments.length : 0;
      this.updateUploadCounterText(count, modal);
      modal.selectedContents = Array.isArray(review.attachments) ? review.attachments.slice() : [];
      this.renderSelectedContents(modal);
    }

    async submitReviewForm(modal)
    {
      if (!modal || modal.isSubmitting)
      {
        return;
      }
      this.clearModalValidationState(modal);
      var values = this.collectModalFormValues(modal);
      if (!values.reviewerDisplayName)
      {
        this.setModalFeedback('レビュー担当者を入力してください。', 'error');
        this.setFieldErrorState(modal.reviewerField, true);
        modal.reviewerSelectButton.focus();
        return;
      }
      if (!values.content)
      {
        this.setModalFeedback('レビュー内容を入力してください。', 'error');
        this.setFieldErrorState(modal.contentInput, true);
        this.setFieldErrorState(modal.contentField, true);
        modal.contentInput.focus();
        return;
      }
      var needsUpload = this.hasUploadQueueItems();
      var hasPendingUploadResults = Array.isArray(this.pendingUploadResults) && this.pendingUploadResults.length > 0;
      var hasExistingAttachment = modal.currentReview && Array.isArray(modal.currentReview.attachments) && modal.currentReview.attachments.length;
      var hasSelectedContents = Array.isArray(modal.selectedContents);
      this.setModalSubmitting(modal, true);
      try
      {
        var attachments = [];
        if (needsUpload)
        {
          this.uploadOwnerUserCode = values.reviewerCode || '';
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
          attachments = modal.currentReview.attachments.slice();
        }
        this.setModalFeedback(modal.mode === 'edit' ? 'レビューを更新しています…' : 'レビューを登録しています…', 'info');
        var review = modal.currentReview ? Object.assign({}, modal.currentReview) : {};
        review.reviewerDisplayName = values.reviewerDisplayName;
        review.reviewerCode = values.reviewerCode || '';
        review.content = values.content;
        review.privateNote = values.privateNote;
        review.attachments = attachments;
        if (!review.reviewCode)
        {
          review.reviewCode = 'rev-' + Date.now();
        }
        var now = new Date();
        review.reviewedAt = review.reviewedAt || now.toISOString();
        if (!review.reviewedAtDisplay && this.helpers && typeof this.helpers.formatDateTime === 'function')
        {
          review.reviewedAtDisplay = this.helpers.formatDateTime(review.reviewedAt);
        }
        var params = Object.assign({
          targetCode: this.page.state.targetCode,
          reviewCode: review.reviewCode,
          reviewerDisplayName: review.reviewerDisplayName,
          reviewerCode: review.reviewerCode,
          content: review.content,
          privateNote: review.privateNote
        }, attachments && attachments[0] && attachments[0].contentCode ? { contentCode: attachments[0].contentCode } : {});
        try
        {
          await this.page.callApi('TargetReviewCreate', params, { requestType: 'TargetManagementReviews' });
        }
        catch (apiError)
        {
          window.console.warn('[target-detail] review create fallback', apiError);
        }
        if (modal.mode === 'edit')
        {
          this.state.reviews = this.state.reviews.map(function (entry)
          {
            if (entry && entry.reviewCode === review.reviewCode)
            {
              return review;
            }
            return entry;
          });
        }
        else
        {
          this.state.reviews.unshift(review);
        }
        this.renderList();
        this.setFeedback(modal.mode === 'edit' ? 'レビューを更新しました。' : 'レビューを追加しました。', 'success');
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('success', modal.mode === 'edit' ? 'レビューを更新しました。' : 'レビューを追加しました。');
        }
        this.setModalFeedback(modal.mode === 'edit' ? 'レビューを更新しました。' : 'レビューを追加しました。', 'success');
        this.closeAddModal();
      }
      catch (error)
      {
        var message = error && error.message ? error.message : 'レビューの登録に失敗しました。';
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
          || result.contentUrl
          || '';
        attachments.push({
          displayName: result.originalName || result.fileName || result.name || 'レビュー添付ファイル',
          type: result.contentType || result.type || 'file',
          sizeDisplay: result.sizeDisplay || (typeof result.size === 'number' ? window.Utils.formatBytes(result.size) : ''),
          previewUrl: previewUrl,
          playbackUrl: result.playbackUrl || result.streamUrl || '',
          streamUrl: result.streamUrl || result.playbackUrl || '',
          downloadUrl: result.downloadUrl || result.url || result.previewUrl || '',
          contentUrl: result.contentUrl || '',
          contentCode: result.contentCode || result.code || ''
        });
      }
      return attachments;
    }

    uploadReviewContent(file, options)
    {
      if (!file)
      {
        return Promise.reject(new Error('ファイルを選択してください。'));
      }
      var formData = new window.FormData();
      var fileName = file.name || 'review-upload';
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

    async deleteReview(review, button)
    {
      if (!review || !review.reviewCode || !this.page.state || !this.page.state.targetCode)
      {
        return;
      }
      var confirmed = await this.page.confirmDialogService.open('このレビューを削除しますか？登録したコンテンツも削除されます。', { type: 'warning' });
      if (!confirmed)
      {
        return;
      }
      if (button)
      {
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
      }
      this.setFeedback('レビューを削除しています…', 'info');
      try
      {
        await this.page.callApi('TargetReviewDelete', {
          targetCode: this.page.state.targetCode,
          reviewCode: review.reviewCode
        }, {
          requestType: 'TargetManagementReviews'
        });
        this.page.state.reviews = null;
        await this.reloadReviews(true);
        this.setFeedback('レビューを削除しました。', 'success');
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('success', 'レビューを削除しました。');
        }
      }
      catch (error)
      {
        window.console.error('[target-detail] failed to delete review', error);
        this.setFeedback('レビューの削除に失敗しました。', 'error');
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('error', 'レビューの削除に失敗しました。');
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
  }

  var NS = window.TargetDetail || (window.TargetDetail = {});
  NS.JobReview = NS.JobReview || TargetDetailReview;
})(window, document);
