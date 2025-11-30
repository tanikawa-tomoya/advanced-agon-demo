(function ()
{
  'use strict';

  var BBS_EMPTY_TEXT = 'メッセージがありません。最初のメッセージを送信してください。';
  var THREAD_EMPTY_TEXT = '掲示板スレッドがまだありません。右上の「スレッドを追加」から作成してください。';
  var THREAD_SELECT_TEXT = '左のスレッド一覧から会話を選択してください。';

  function createElement(tagName, className)
  {
    var el = document.createElement(tagName);
    if (className)
    {
      el.className = className;
    }
    return el;
  }

  function normalizeText(value)
  {
    if (value == null)
    {
      return '';
    }
    return String(value).trim();
  }

  function uniqueCodes(list)
  {
    var map = Object.create(null);
    var result = [];
    (list || []).forEach(function (code)
    {
      var normalized = normalizeText(code);
      if (!normalized)
      {
        return;
      }
      if (map[normalized])
      {
        return;
      }
      map[normalized] = true;
      result.push(normalized);
    });
    return result;
  }

  function extractRecipientCodes(selection)
  {
    if (!Array.isArray(selection))
    {
      return [];
    }
    return uniqueCodes(selection.map(function (entry)
    {
      if (!entry)
      {
        return '';
      }
      return entry.userCode || entry.code || entry.id || '';
    }));
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
      attachment && attachment.playbackUrl ? String(attachment.playbackUrl).toLowerCase() : '',
      attachment && attachment.streamUrl ? String(attachment.streamUrl).toLowerCase() : '',
      attachment && attachment.posterUrl ? String(attachment.posterUrl).toLowerCase() : '',
      attachment && attachment.thumbnailUrl ? String(attachment.thumbnailUrl).toLowerCase() : '',
      attachment && attachment.previewImage ? String(attachment.previewImage).toLowerCase() : '',
      attachment && attachment.previewImageUrl ? String(attachment.previewImageUrl).toLowerCase() : '',
      attachment && attachment.imageUrl ? String(attachment.imageUrl).toLowerCase() : '',
      attachment && attachment.youtubeUrl ? String(attachment.youtubeUrl).toLowerCase() : '',
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

  function resolveAttachmentTitle(attachment)
  {
    if (!attachment)
    {
      return 'ファイル';
    }
    var title = attachment.fileName || attachment.label || attachment.contentCode || attachment.name || attachment.title;
    if (title)
    {
      return normalizeText(title) || 'ファイル';
    }
    return 'ファイル';
  }

  function resolvePreviewType(attachment, resolvedUrl)
  {
    var type = normalizeAttachmentType(attachment);
    if (type === 'file' && resolvedUrl)
    {
      type = normalizeAttachmentType({ url: resolvedUrl, previewUrl: resolvedUrl, downloadUrl: resolvedUrl });
    }
    return type;
  }

  function resolveAttachmentTypeLabel(attachment)
  {
    if (attachment && attachment.typeLabel)
    {
      var label = normalizeText(attachment.typeLabel);
      if (label)
      {
        return label;
      }
    }

    var type = normalizeAttachmentType(attachment);
    var labels = {
      video: '動画',
      audio: '音声',
      image: '画像',
      pdf: 'PDF',
      link: 'リンク',
      file: 'ファイル'
    };

    if (labels[type])
    {
      return labels[type];
    }

    return labels.file;
  }

  function createAvatarFromParticipant(participant, baseClass, avatarService, bootPromise)
  {
    var className = baseClass || 'target-bbs__thread-avatar';
    var wrapper = createElement('span', className);
    wrapper.classList.add('c-user-avatar-host');
    var avatarUrl = participant && participant.avatarUrl ? normalizeText(participant.avatarUrl) : '';
    var displayName = normalizeText(participant && (participant.displayName || participant.userCode));
    var initial = normalizeText(participant && (participant.avatarInitial || participant.displayName || participant.userCode));
    var userCode = normalizeText(participant && participant.userCode);
    var label = displayName || userCode || initial || 'ユーザー';
    var isActive = isActiveParticipant(participant);
    wrapper.dataset.userDisplay = label;
    wrapper.dataset.userName = label;
    wrapper.setAttribute('aria-label', label);
    wrapper.title = label;
    if (userCode)
    {
      wrapper.dataset.userCode = userCode;
    }
    wrapper.dataset.userActive = isActive ? 'true' : 'false';
    if (avatarUrl)
    {
      wrapper.dataset.avatarSrc = avatarUrl;
    }
    wrapper.dataset.avatarAlt = label || initial || '';

    var fallback = function ()
    {
      wrapper.innerHTML = '';
      var fallbackInitial = createElement('span', className + '-initial');
      fallbackInitial.textContent = initial ? initial.charAt(0) : '？';
      wrapper.appendChild(fallbackInitial);
    };

    var renderData = { name: label || initial || userCode || '', alt: label || userCode || '', isActive: isActive };
    if (avatarUrl)
    {
      renderData.src = avatarUrl;
    }
    var renderOptions = { size: 32, shape: 'circle', nameOverlay: true, initialsFallback: true };

    if (avatarService && typeof avatarService.render === 'function')
    {
      var renderWithService = function ()
      {
        try
        {
          avatarService.render(wrapper, renderData, renderOptions);
        }
        catch (error)
        {
          window.console.warn('[target-detail] failed to render participant avatar', error);
          fallback();
        }
      };

      if (avatarService.jobs)
      {
        renderWithService();
      }
      else if (bootPromise && typeof bootPromise.then === 'function')
      {
        bootPromise.then(renderWithService).catch(function (error)
        {
          window.console.warn('[target-detail] failed to complete avatar service boot for participant avatar', error);
          fallback();
        });
      }
      else
      {
        renderWithService();
      }
    }
    else
    {
      fallback();
    }

    return wrapper;
  }

  function isActiveParticipant(participant)
  {
    return Boolean(participant) && participant.isActive !== false;
  }

  function resolveThreadParticipants(thread, viewer)
  {
    if (!thread || !Array.isArray(thread.participants))
    {
      return [];
    }
    var viewerCode = viewer && viewer.userCode ? viewer.userCode : '';
    return thread.participants.filter(function (participant)
    {
      return isActiveParticipant(participant) && participant.userCode !== viewerCode;
    });
  }

  function formatThreadMeta(thread)
  {
    if (thread && thread.lastActivityDisplay)
    {
      return thread.lastActivityDisplay;
    }
    return '';
  }

  function createMessageAvatar(participant, avatarService, bootPromise)
  {
    var wrapper = createElement('div', 'target-bbs__message-avatar');
    wrapper.classList.add('c-user-avatar-host');
    var avatarUrl = participant && participant.avatarUrl ? normalizeText(participant.avatarUrl) : '';
    var initial = normalizeText(participant && (participant.avatarInitial || participant.displayName || participant.userCode));
    var name = normalizeText(participant && (participant.displayName || participant.userCode));
    var userCode = normalizeText(participant && participant.userCode);
    if (userCode)
    {
      wrapper.dataset.userCode = userCode;
    }
    if (name || userCode)
    {
      wrapper.setAttribute('aria-label', name || userCode);
      wrapper.title = name || userCode;
    }
    if (name)
    {
      wrapper.dataset.userDisplay = name;
      wrapper.dataset.userName = name;
    }
    var renderData = { name: name || initial || userCode || '', alt: name || userCode || '' };
    if (avatarUrl)
    {
      renderData.src = avatarUrl;
    }
    var renderOptions = {
      size: 40,
      shape: 'circle',
      nameOverlay: true,
      initialsFallback: true
    };
    var renderFallback = function ()
    {
      try
      {
        var fallbackData = Object.assign({}, renderData);
        delete fallbackData.src;
        avatarService.render(wrapper, fallbackData, renderOptions);
      }
      catch (error)
      {
        window.console.warn('[target-detail] failed to render fallback message avatar', error);
      }
    };
    if (avatarService && typeof avatarService.render === 'function')
    {
      var renderWithService = function ()
      {
        try
        {
          avatarService.render(wrapper, renderData, renderOptions);
        }
        catch (error)
        {
          window.console.warn('[target-detail] failed to render message avatar', error);
          renderFallback();
        }
      };
      if (avatarService.jobs)
      {
        renderWithService();
      }
      else
      {
        var promise = bootPromise;
        if (!promise && typeof avatarService.boot === 'function')
        {
          try
          {
            promise = avatarService.boot();
          }
          catch (error)
          {
            window.console.warn('[target-detail] failed to boot avatar service for message avatar', error);
            renderFallback();
            return wrapper;
          }
        }
        if (promise && typeof promise.then === 'function')
        {
          promise.then(renderWithService).catch(function (error)
          {
            window.console.warn('[target-detail] failed to complete avatar service boot for message avatar', error);
            renderFallback();
          });
        }
        else
        {
          renderWithService();
        }
      }
    }
    return wrapper;
  }

  function resolveParticipantFromThread(thread, userCode)
  {
    if (!thread || !Array.isArray(thread.participants))
    {
      return null;
    }
    for (var i = 0; i < thread.participants.length; i += 1)
    {
      var participant = thread.participants[i];
      if (isActiveParticipant(participant) && participant.userCode === userCode)
      {
        return participant;
      }
    }
    return null;
  }

  class TargetDetailBbs
  {
    constructor(page)
    {
      this.page = page;
      this.refs = {
        container: null,
        root: null,
        threadList: null,
        messageViewport: null,
        composerInput: null,
        composerButton: null,
        composerAttachmentList: null,
        attachmentModal: null,
        threadHeaderTitle: null,
        threadHeaderMeta: null,
        recipientContainer: null,
        threadAddButton: null,
        messagePlaceholder: null,
        refreshButton: null
      };
      this.state = {
        threads: [],
        participants: [],
        viewer: null,
        selectedThread: null,
        isReloading: false,
        composerAttachments: []
      };
      this.buttonService = null;
      this.avatarService = page && page.avatarService ? page.avatarService : null;
      this.avatarServiceBootPromise = null;
      this.highlightTimer = null;
      this.contentUploaderService = null;
      this.pendingUploadResults = [];
      this.contentLibrary = [];
      this.isLoadingContentLibrary = false;
    }

    async render()
    {
      this.refs.container = this.page && this.page.refs && this.page.refs.tabPanels
        ? this.page.refs.tabPanels.bbs
        : null;
      if (!this.refs.container)
      {
        return;
      }
      this.refs.container.innerHTML = '';
      this.buildLayout();
      await this.loadContext();
      this.renderThreadList();
      this.renderThreadDetail();
    }

    buildLayout()
    {
      var root = createElement('div', 'target-bbs target-bbs--board-view');

      var header = createElement('header', 'target-bbs__header');
      var headerTop = createElement('div', 'target-bbs__header-top');
      var title = createElement('h3', 'target-detail__section-title target-bbs__heading');
      title.textContent = '掲示板';
      headerTop.appendChild(title);

      var headerActions = createElement('div', 'target-bbs__header-actions');
      var refreshButton = this.createBannerButton({
        buttonType: 'expandable-icon-button/reload',
        label: '再読み込み',
        ariaLabel: '再読み込み',
        hoverLabel: '掲示板を再読み込み',
        title: '掲示板を再読み込み'
      });
      refreshButton.classList.add('target-bbs__reload');
      refreshButton.addEventListener('click', () =>
      {
        this.reloadBbss();
      });
      this.refs.refreshButton = refreshButton;
      headerActions.appendChild(refreshButton);
      headerTop.appendChild(headerActions);
      header.appendChild(headerTop);

      var summary = createElement('p', 'target-bbs__summary');
      summary.textContent = '掲示板形式でやり取りを残し、履歴を時系列で追いながらチームと情報共有できます。';
      header.appendChild(summary);
      root.appendChild(header);

      var layout = createElement('div', 'target-bbs__layout');

      var threadPane = createElement('section', 'target-bbs__thread-pane');
      var threadPaneHeader = createElement('div', 'target-bbs__thread-pane-header');
      var heading = createElement('div', 'target-bbs__thread-heading');
      var headingTitle = createElement('h4');
      headingTitle.textContent = 'スレッド';
      heading.appendChild(headingTitle);
      threadPaneHeader.appendChild(heading);

      var threadActions = createElement('div', 'target-bbs__thread-actions');
      var addButton = null;
      var addButtonOptions = {
        baseClass: 'target-management__icon-button target-management__icon-button--primary target-bbs__thread-add',
        label: 'スレッドを追加',
        ariaLabel: 'スレッドを追加',
        hoverLabel: 'スレッドを追加',
        title: 'スレッドを追加'
      };
      var buttonService = this.getButtonService();
      if (buttonService && typeof buttonService.createActionButton === 'function')
      {
        try
        {
          addButton = buttonService.createActionButton('expandable-icon-button/add', addButtonOptions);
        }
        catch (error)
        {
          window.console.warn('[target-detail] failed to create thread add button', error);
        }
      }
      if (!addButton)
      {
        addButton = this.createBannerButton(Object.assign({
          buttonType: 'expandable-icon-button/add'
        }, addButtonOptions));
      }
      addButton.addEventListener('click', () =>
      {
        this.handleThreadCreate();
      });
      this.refs.threadAddButton = addButton;
      threadActions.appendChild(addButton);
      threadPaneHeader.appendChild(threadActions);
      threadPane.appendChild(threadPaneHeader);

      var threadList = createElement('div', 'target-bbs__thread-list');
      this.refs.threadList = threadList;
      threadPane.appendChild(threadList);

      var messagePane = createElement('section', 'target-bbs__message-pane');
      var messageHeader = createElement('header', 'target-bbs__message-header');
      var messageTitleRow = createElement('div', 'target-bbs__message-title-row');
      var messageTitle = createElement('h4', 'target-bbs__message-title');
      this.refs.threadHeaderTitle = messageTitle;
      var messageMeta = createElement('p', 'target-bbs__message-meta');
      this.refs.threadHeaderMeta = messageMeta;
      messageTitleRow.appendChild(messageTitle);
      messageTitleRow.appendChild(messageMeta);
      messageHeader.appendChild(messageTitleRow);

      var recipientActions = createElement('div', 'target-bbs__recipient-actions');
      var recipientList = createElement('div', 'target-bbs__recipient-list');
      this.refs.recipientContainer = recipientList;
      recipientActions.appendChild(recipientList);
      messageHeader.appendChild(recipientActions);

      var messageActions = createElement('div', 'target-bbs__message-actions');
      var threadEditButton = this.createBannerButton({
        buttonType: 'expandable-icon-button/edit',
        label: 'スレッドを編集',
        ariaLabel: 'スレッド名を編集',
        hoverLabel: 'スレッド名を編集',
        title: 'スレッド名を編集'
      });
      threadEditButton.classList.add('target-bbs__thread-edit');
      threadEditButton.addEventListener('click', () =>
      {
        this.handleThreadRename(this.state.selectedThread);
      });
      this.refs.threadEditButton = threadEditButton;
      messageActions.appendChild(threadEditButton);

      var scrollTopButton = this.createBannerButton({
        buttonType: 'expandable-icon-button/up',
        label: '最上部へ',
        ariaLabel: 'スレッドの最上部へ移動',
        hoverLabel: 'スレッドの最上部へ移動',
        title: 'スレッドの最上部へ移動'
      });
      scrollTopButton.classList.add('target-bbs__scroll-top');
      scrollTopButton.addEventListener('click', () =>
      {
        this.scrollThreadToTop();
      });
      this.refs.scrollToTopButton = scrollTopButton;
      messageActions.appendChild(scrollTopButton);

      messageHeader.appendChild(messageActions);
      messagePane.appendChild(messageHeader);

      var messageIntro = createElement('div', 'target-bbs__board-guide');
      var introTitle = createElement('p', 'target-bbs__board-guide-title');
      introTitle.textContent = '掲示板';
      this.refs.boardGuideTitle = introTitle;
      var introDivider = createElement('hr', 'target-bbs__board-divider');
      messageIntro.appendChild(introTitle);
      messageIntro.appendChild(introDivider);
      messagePane.appendChild(messageIntro);

      var messageViewport = createElement('div', 'target-bbs__message-viewport target-bbs__post-list');
      this.refs.messageViewport = messageViewport;
      messagePane.appendChild(messageViewport);

      var composer = createElement('div', 'target-bbs__composer');
      var composerLabel = createElement('label', 'target-bbs__composer-label');
      composerLabel.textContent = '投稿内容';
      var composerInput = createElement('textarea', 'target-bbs__composer-input');
      composerInput.rows = 5;
      composerInput.placeholder = '本文を入力（議事録・議題・連絡事項など）';
      this.refs.composerInput = composerInput;
      composerLabel.appendChild(composerInput);
      composer.appendChild(composerLabel);
      var composerActions = createElement('div', 'target-bbs__composer-actions');
      var composerButtons = createElement('div', 'target-bbs__composer-buttons');
      var attachmentButton = this.createBannerButton({
        buttonType: 'content-uploader-primary',
        label: '添付',
        ariaLabel: 'ファイルを添付'
      });
      attachmentButton.classList.add('target-bbs__composer-attach');
      attachmentButton.addEventListener('click', () =>
      {
        this.openAttachmentModal();
      });
      composerButtons.appendChild(attachmentButton);
      var sendButton = this.createBannerButton({
        buttonType: 'announcement-create',
        label: '投稿する',
        ariaLabel: 'メッセージを投稿する'
      });
      sendButton.classList.add('target-bbs__composer-send');
      this.refs.composerButton = sendButton;
      sendButton.addEventListener('click', () =>
      {
        this.handleSendMessage();
      });
      composerButtons.appendChild(sendButton);
      composerActions.appendChild(composerButtons);
      var attachmentList = createElement('div', 'target-bbs__composer-attachments');
      this.refs.composerAttachmentList = attachmentList;
      composerActions.appendChild(attachmentList);
      this.renderComposerAttachments();
      var composerNote = createElement('p', 'target-bbs__composer-note');
      composerNote.textContent = '投稿はスレッド全員に公開されます。箇条書きや小見出しを活用し、経緯がわかるように記載してください。';
      composerActions.appendChild(composerNote);
      composer.appendChild(composerActions);
      this.refs.messagePlaceholder = composer;
      messagePane.appendChild(composer);

      layout.appendChild(threadPane);
      layout.appendChild(messagePane);
      root.appendChild(layout);

      this.refs.root = root;
      this.refs.container.appendChild(root);
    }

    async loadContext()
    {
      var context = await this.page.loadBbss({ force: true });
      this.state.threads = Array.isArray(context && context.threads) ? context.threads.slice() : [];
      this.state.participants = Array.isArray(context && context.participants) ? context.participants.slice() : [];
      this.state.viewer = context ? context.viewer || null : null;
      var selected = this.state.selectedThread;
      if (selected)
      {
        selected = this.findThreadByCode(selected.threadCode);
      }
      if (!selected)
      {
        selected = this.state.threads.length ? this.state.threads[0] : null;
      }
      this.state.selectedThread = selected;
      this.page.state.bbss = context;
    }

    async reloadBbss()
    {
      if (this.state.isReloading)
      {
        return;
      }

      this.state.isReloading = true;
      if (this.refs.refreshButton)
      {
        this.refs.refreshButton.disabled = true;
      }

      try
      {
        await this.loadContext();
        this.renderThreadList();
        this.renderThreadDetail();
      }
      finally
      {
        this.state.isReloading = false;
        if (this.refs.refreshButton)
        {
          this.refs.refreshButton.disabled = false;
        }
      }
    }

    findThreadByCode(threadCode)
    {
      var code = normalizeText(threadCode);
      if (!code)
      {
        return null;
      }
      for (var i = 0; i < this.state.threads.length; i += 1)
      {
        var thread = this.state.threads[i];
        if (thread && thread.threadCode === code)
        {
          return thread;
        }
      }
      return null;
    }

    getViewerUserCode()
    {
      return normalizeText(this.state && this.state.viewer && this.state.viewer.userCode);
    }

    isSupervisorUser()
    {
      return Boolean(this.page && typeof this.page.isSupervisorUser === 'function' && this.page.isSupervisorUser());
    }

    canDeleteThread(thread)
    {
      var creatorCode = normalizeText(thread && thread.createdByUserCode);
      var viewerCode = this.getViewerUserCode();
      return Boolean(this.isSupervisorUser() || (creatorCode && viewerCode && creatorCode === viewerCode));
    }

    canDeleteMessage(message)
    {
      var senderCode = normalizeText(message && (message.senderUserCode || message.senderCode));
      var viewerCode = this.getViewerUserCode();
      return Boolean(this.isSupervisorUser() || (senderCode && viewerCode && senderCode === viewerCode));
    }

    normalizeCodeList(codes)
    {
      var normalized = uniqueCodes(codes || []);
      normalized.sort();
      return normalized;
    }

    getThreadRecipientCodes(thread)
    {
      var recipients = resolveThreadParticipants(thread, this.state && this.state.viewer);
      return this.normalizeCodeList(extractRecipientCodes(recipients));
    }

    findThreadByRecipients(recipientCodes)
    {
      var targetCodes = this.normalizeCodeList(recipientCodes);
      if (!targetCodes.length)
      {
        return null;
      }
      for (var i = 0; i < this.state.threads.length; i += 1)
      {
        var thread = this.state.threads[i];
        var codes = this.getThreadRecipientCodes(thread);
        if (codes.length !== targetCodes.length)
        {
          continue;
        }
        var isSame = true;
        for (var j = 0; j < targetCodes.length; j += 1)
        {
          if (codes[j] !== targetCodes[j])
          {
            isSame = false;
            break;
          }
        }
        if (isSame)
        {
          return thread;
        }
      }
      return null;
    }

    renderThreadList()
    {
      if (!this.refs.threadList)
      {
        return;
      }
      this.refs.threadList.innerHTML = '';
      if (!this.state.threads.length)
      {
        var empty = createElement('p', 'target-bbs__thread-empty');
        empty.textContent = THREAD_EMPTY_TEXT;
        this.refs.threadList.appendChild(empty);
        return;
      }
      for (var i = 0; i < this.state.threads.length; i += 1)
      {
        var thread = this.state.threads[i];
        var item = this.renderThreadItem(thread);
        this.refs.threadList.appendChild(item);
      }
    }

    highlightThread(threadCode)
    {
      if (!this.refs.threadList || !threadCode)
      {
        return;
      }
      var selector = '[data-thread-code="' + threadCode + '"]';
      var item = this.refs.threadList.querySelector(selector);
      if (!item)
      {
        this.renderThreadList();
        item = this.refs.threadList.querySelector(selector);
      }
      if (!item)
      {
        return;
      }
      var highlighted = this.refs.threadList.querySelectorAll('.target-bbs__thread.is-duplicate');
      for (var i = 0; i < highlighted.length; i += 1)
      {
        if (highlighted[i] !== item)
        {
          highlighted[i].classList.remove('is-duplicate');
        }
      }
      item.classList.add('is-duplicate');
      if (typeof item.scrollIntoView === 'function')
      {
        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (this.highlightTimer)
      {
        window.clearTimeout(this.highlightTimer);
      }
      this.highlightTimer = window.setTimeout(() =>
      {
        item.classList.remove('is-duplicate');
        this.highlightTimer = null;
      }, 2000);
    }

    renderThreadItem(thread)
    {
      var item = createElement('article', 'target-bbs__thread');
      item.setAttribute('role', 'button');
      item.setAttribute('data-thread-code', thread.threadCode);
      item.tabIndex = 0;
      var isActive = this.state.selectedThread && this.state.selectedThread.threadCode === thread.threadCode;
      if (isActive)
      {
        item.classList.add('is-active');
      }

      var header = createElement('div', 'target-bbs__thread-header');

      var info = createElement('div', 'target-bbs__thread-info');
      var nameRow = createElement('div', 'target-bbs__thread-name-row');
      var name = createElement('p', 'target-bbs__thread-name');
      name.textContent = thread.title || 'スレッド';
      nameRow.appendChild(name);
      info.appendChild(nameRow);

      var metaRow = createElement('div', 'target-bbs__thread-meta-row');
      var meta = createElement('time', 'target-bbs__thread-meta');
      if (thread.lastActivityAt)
      {
        meta.setAttribute('datetime', thread.lastActivityAt);
      }
      meta.textContent = formatThreadMeta(thread) || '—';
      metaRow.appendChild(meta);

      var metaActions = createElement('div', 'target-bbs__thread-meta-actions');
      var editButton = this.createRoundActionButton('edit', {
        label: '',
        hoverLabel: 'スレッド名を編集',
        ariaLabel: 'このスレッドを編集',
        srLabel: 'スレッドを編集'
      }, 'target-bbs__thread-edit-inline');
      editButton.addEventListener('click', (event) =>
      {
        event.stopPropagation();
        event.preventDefault();
        this.handleThreadRename(thread, editButton);
      });
      metaActions.appendChild(editButton);

      if (this.canDeleteThread(thread))
      {
        var deleteButton = this.createRoundActionButton('delete', {
          label: '',
          hoverLabel: 'スレッドを削除',
          ariaLabel: 'このスレッドを削除',
          srLabel: 'スレッドを削除'
        }, 'target-bbs__thread-delete');
        deleteButton.addEventListener('click', (event) =>
        {
          event.stopPropagation();
          event.preventDefault();
          this.handleDeleteThread(thread, deleteButton);
        });
        metaActions.appendChild(deleteButton);
      }
      metaRow.appendChild(metaActions);
      info.appendChild(metaRow);

      header.appendChild(info);
      item.appendChild(header);

      var selectHandler = () =>
      {
        this.selectThread(thread.threadCode);
      };
      item.addEventListener('click', selectHandler);
      item.addEventListener('keydown', (event) =>
      {
        if (event.key === 'Enter' || event.key === ' ')
        {
          event.preventDefault();
          selectHandler();
        }
      });

      return item;
    }

    getThreadParticipantsForDisplay(thread)
    {
      var recipients = resolveThreadParticipants(thread, this.state.viewer);
      if (recipients.length)
      {
        return recipients;
      }
      if (thread && Array.isArray(thread.participants))
      {
        recipients = thread.participants.filter(isActiveParticipant);
      }
      if (recipients.length)
      {
        return recipients;
      }
      var fallbackParticipants = Array.isArray(this.state.participants) ? this.state.participants : [];
      var viewerCode = this.state && this.state.viewer && this.state.viewer.userCode
        ? this.state.viewer.userCode
        : '';
      return fallbackParticipants.filter(function (participant)
      {
        return isActiveParticipant(participant) && normalizeText(participant.userCode) !== viewerCode;
      });
    }

    buildThreadParticipantNames(thread)
    {
      var participants = this.getThreadParticipantsForDisplay(thread);
      var names = [];
      for (var i = 0; i < participants.length; i += 1)
      {
        var participant = participants[i];
        var name = normalizeText(participant && (participant.displayName || participant.userCode));
        if (name)
        {
          names.push(name);
        }
      }
      return names.join('・');
    }

    renderThreadParticipants(thread)
    {
      var container = createElement('div', 'target-bbs__thread-participants');
      var participants = this.getThreadParticipantsForDisplay(thread);
      if (!participants.length)
      {
        var placeholder = createElement('span', 'target-bbs__thread-participant-empty');
        placeholder.textContent = '参加者情報がありません';
        container.appendChild(placeholder);
        return container;
      }
      var avatarService = this.getAvatarService();
      var bootPromise = this.avatarServiceBootPromise;
      for (var i = 0; i < participants.length; i += 1)
      {
        container.appendChild(this.renderThreadParticipant(participants[i], avatarService, bootPromise));
      }
      this.bindAvatarPopovers(container);
      return container;
    }

    renderThreadParticipant(participant, avatarService, bootPromise)
    {
      var item = createElement('div', 'target-bbs__thread-participant');
      var avatarHost = createElement('span', 'target-bbs__thread-avatar');
      avatarHost.classList.add('c-user-avatar-host');
      var displayName = normalizeText(participant && (participant.displayName || participant.userCode));
      var userCode = normalizeText(participant && participant.userCode);
      var name = displayName || userCode || 'ユーザー';
      var avatarUrl = participant && participant.avatarUrl ? normalizeText(participant.avatarUrl) : '';
      var initial = normalizeText(participant && (participant.avatarInitial || participant.displayName || participant.userCode)) || '？';
      avatarHost.setAttribute('aria-label', name);
      avatarHost.title = name;
      avatarHost.dataset.userDisplay = name;
      avatarHost.dataset.userName = name;
      if (userCode)
      {
        avatarHost.dataset.userCode = userCode;
      }
      if (avatarUrl)
      {
        avatarHost.dataset.avatarSrc = avatarUrl;
      }
      avatarHost.dataset.avatarAlt = name;

      var fallback = function ()
      {
        avatarHost.innerHTML = '';
        var initialNode = createElement('span', 'target-bbs__thread-avatar-initial');
        initialNode.textContent = initial.charAt(0);
        avatarHost.appendChild(initialNode);
      };

      var renderData = { name: name, alt: name };
      if (avatarUrl)
      {
        renderData.src = avatarUrl;
      }
      var renderOptions = { size: 28, shape: 'circle', initialsFallback: true, nameOverlay: false };

      if (avatarService && typeof avatarService.render === 'function')
      {
        var renderWithService = function ()
        {
          try
          {
            avatarService.render(avatarHost, renderData, renderOptions);
          }
          catch (error)
          {
            window.console.warn('[target-detail] failed to render thread avatar', error);
            fallback();
          }
        };
        if (avatarService.jobs)
        {
          renderWithService();
        }
        else if (bootPromise && typeof bootPromise.then === 'function')
        {
          bootPromise.then(renderWithService).catch(function (error)
          {
            window.console.warn('[target-detail] failed to complete avatar service boot for thread avatar', error);
            fallback();
          });
        }
        else
        {
          renderWithService();
        }
      }
      else
      {
        fallback();
      }

      var label = createElement('span', 'target-bbs__thread-participant-name');
      label.textContent = name;
      item.appendChild(avatarHost);
      item.appendChild(label);
      return item;
    }

    bindAvatarPopovers(container)
    {
      var avatarService = this.getAvatarService();
      if (!container || !avatarService || typeof avatarService.eventUpdate !== 'function')
      {
        return;
      }
      var anchors = container.querySelectorAll(
        '.target-bbs__thread-avatar, .target-bbs__recipient-avatar, .target-bbs__message-avatar'
      );
      if (!anchors.length)
      {
        return;
      }
      var options = {
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
        dismissOnMouseLeave: true,
        popover: { placement: 'top-start', offset: 12, dismissOnMouseLeave: true }
      };

      var bind = function ()
      {
        try
        {
          avatarService.eventUpdate(anchors, options);
        }
        catch (error)
        {
          window.console.warn('[target-detail] failed to bind bbs avatar popovers', error);
        }
      };

      var bootPromise = this.avatarServiceBootPromise;
      if (avatarService.jobs || !bootPromise || typeof bootPromise.then !== 'function')
      {
        bind();
        return;
      }

      bootPromise.then(bind).catch(function (error)
      {
        window.console.warn('[target-detail] failed to complete avatar service boot for bbs popovers', error);
      });
    }

    selectThread(threadCode)
    {
      var thread = this.findThreadByCode(threadCode);
      if (!thread)
      {
        return;
      }
      this.state.selectedThread = thread;
      this.renderThreadList();
      this.renderThreadDetail();
    }

    renderRecipients(thread)
    {
      if (!this.refs.recipientContainer)
      {
        return;
      }
      this.refs.recipientContainer.innerHTML = '';
      if (!thread)
      {
        return;
      }
      var recipients = this.getThreadParticipantsForDisplay(thread);
      if (!recipients.length)
      {
        var placeholder = createElement('p', 'target-bbs__recipient-empty');
        placeholder.textContent = 'ターゲットの参加者全員が投稿できます';
        this.refs.recipientContainer.appendChild(placeholder);
        return;
      }
      var avatarService = this.getAvatarService();
      var bootPromise = this.avatarServiceBootPromise;
      recipients.forEach((participant) =>
      {
        var recipient = createElement('button', 'target-bbs__recipient');
        recipient.type = 'button';
        recipient.setAttribute('aria-pressed', 'false');
        var avatar = createAvatarFromParticipant(participant, 'target-bbs__recipient-avatar', avatarService, bootPromise);
        recipient.appendChild(avatar);
        var name = createElement('span', 'target-bbs__recipient-name');
        name.textContent = participant.displayName || participant.userCode || 'ユーザー';
        recipient.appendChild(name);
        this.refs.recipientContainer.appendChild(recipient);
      });
      this.bindAvatarPopovers(this.refs.recipientContainer);
    }

    renderThreadDetail()
    {
      var thread = this.state.selectedThread;
      this.renderRecipients(thread);
      if (!this.refs.threadHeaderTitle || !this.refs.threadHeaderMeta)
      {
        return;
      }
      if (!thread)
      {
        this.refs.threadHeaderTitle.textContent = 'スレッドを選択';
        this.refs.threadHeaderMeta.textContent = '';
        if (this.refs.boardGuideTitle)
        {
          this.refs.boardGuideTitle.textContent = 'スレッドを選択';
        }
        if (this.refs.threadEditButton)
        {
          this.refs.threadEditButton.disabled = true;
        }
        if (this.refs.scrollToTopButton)
        {
          this.refs.scrollToTopButton.disabled = true;
        }
        this.renderMessages(null);
        this.setComposerEnabled(false);
        this.renderMessagePlaceholder(THREAD_SELECT_TEXT);
        return;
      }
      this.refs.threadHeaderTitle.textContent = thread.title || '掲示板';
      this.refs.threadHeaderMeta.textContent = formatThreadMeta(thread);
      if (this.refs.boardGuideTitle)
      {
        this.refs.boardGuideTitle.textContent = thread.title || '掲示板';
      }
      if (this.refs.threadEditButton)
      {
        this.refs.threadEditButton.disabled = false;
      }
      if (this.refs.scrollToTopButton)
      {
        this.refs.scrollToTopButton.disabled = false;
      }
      this.renderMessages(thread);
      this.setComposerEnabled(true);
      this.renderComposerAttachments();
    }

    renderMessagePlaceholder(text)
    {
      if (!this.refs.messageViewport)
      {
        return;
      }
      this.refs.messageViewport.innerHTML = '';
      var empty = createElement('p', 'target-bbs__message-empty');
      empty.textContent = text;
      this.refs.messageViewport.appendChild(empty);
    }

    renderMessages(thread)
    {
      if (!this.refs.messageViewport)
      {
        return;
      }
      this.refs.messageViewport.innerHTML = '';
      if (!thread)
      {
        return;
      }
      if (!thread.messages || !thread.messages.length)
      {
        this.renderMessagePlaceholder(BBS_EMPTY_TEXT);
        return;
      }
      var list = createElement('div', 'target-bbs__post-stack');
      for (var i = 0; i < thread.messages.length; i += 1)
      {
        var message = thread.messages[i];
        var item = this.renderMessage(message, thread);
        list.appendChild(item);
      }
      this.refs.messageViewport.appendChild(list);
      this.bindAvatarPopovers(this.refs.messageViewport);
    }

    renderMessage(message, thread)
    {
      var senderCode = message ? normalizeText(message.senderUserCode || message.senderCode) : '';
      var isSelf = Boolean(this.state.viewer && senderCode && this.state.viewer.userCode === senderCode);
      var wrapper = createElement('article', 'target-bbs__message target-bbs__message--board');
      if (isSelf)
      {
        wrapper.classList.add('target-bbs__message--owner');
      }

      var participant = resolveParticipantFromThread(thread, senderCode) || (senderCode ? { userCode: senderCode, displayName: senderCode } : null);
      var authorName = participant && (participant.displayName || participant.userCode) ? (participant.displayName || participant.userCode) : '不明なユーザー';

      var body = createElement('div', 'target-bbs__message-body');
      var content = createElement('p', 'target-bbs__post-text');
      content.textContent = message.content || '';
      body.appendChild(content);
      if (message && Array.isArray(message.attachments) && message.attachments.length)
      {
        body.appendChild(this.renderMessageAttachments(message, thread));
      }

      wrapper.appendChild(body);
      var header = createElement('header', 'target-bbs__post-header');
      var headerRow = createElement('div', 'target-bbs__message-row');
      var authorBlock = createElement('div', 'target-bbs__message-author');
      var avatarWrapper = createElement('div', 'target-bbs__message-avatar-wrapper');
      avatarWrapper.appendChild(createMessageAvatar(participant, this.getAvatarService(), this.avatarServiceBootPromise));
      authorBlock.appendChild(avatarWrapper);
      var author = createElement('span', 'target-bbs__message-author-name');
      author.textContent = authorName;
      authorBlock.appendChild(author);

      var actionBlock = createElement('div', 'target-bbs__post-actions target-bbs__message-meta-block');
      var timestamp = createElement('time', 'target-bbs__message-time');
      if (message.sentAt)
      {
        timestamp.setAttribute('datetime', message.sentAt);
      }
      timestamp.textContent = message.sentAtDisplay || '';
      actionBlock.appendChild(timestamp);
      if (this.canDeleteMessage(message))
      {
        var deleteButton = this.createRoundActionButton('delete', {
          label: '',
          hoverLabel: '投稿を削除',
          ariaLabel: 'この投稿を削除',
          srLabel: '投稿を削除'
        }, 'target-bbs__message-delete');
        deleteButton.addEventListener('click', () =>
        {
          this.handleDeleteMessage(thread, message, deleteButton);
        });
        actionBlock.appendChild(deleteButton);
      }
      headerRow.appendChild(authorBlock);
      headerRow.appendChild(actionBlock);
      header.appendChild(headerRow);

      var divider = createElement('hr', 'target-bbs__message-divider');

      wrapper.appendChild(header);
      wrapper.appendChild(divider);
      return wrapper;
    }

    renderMessageAttachments(message, thread)
    {
      var container = createElement('div', 'target-bbs__attachments');
      var attachments = Array.isArray(message && message.attachments) ? message.attachments.filter(Boolean) : [];
      if (!attachments.length)
      {
        container.textContent = '添付なし';
        container.classList.add('is-empty');
        return container;
      }
      attachments.forEach((attachment) =>
      {
        var item = createElement('div', 'target-bbs__attachment');
        var title = resolveAttachmentTitle(attachment);
        var info = createElement('div', 'target-bbs__attachment-info');
        var label = createElement('span', 'target-bbs__attachment-label');
        label.textContent = resolveAttachmentTypeLabel(attachment);
        info.appendChild(label);
        var name = createElement('button', 'target-bbs__attachment-name target-bbs__attachment-title');
        name.type = 'button';
        name.textContent = title;
        name.setAttribute('aria-label', title + ' をプレビュー');
        name.addEventListener('click', () =>
        {
          this.handleAttachmentPreview(attachment);
        });
        info.appendChild(name);
        item.appendChild(info);

        var actions = createElement('div', 'target-bbs__attachment-actions');
        var previewButton = this.createRoundActionButton('detail', { label: '', ariaLabel: '添付をプレビュー', hoverLabel: 'プレビュー' }, 'target-bbs__attachment-preview');
        previewButton.addEventListener('click', () =>
        {
          this.handleAttachmentPreview(attachment);
        });
        actions.appendChild(previewButton);

        var downloadUrl = this.resolveAttachmentDownloadUrl(attachment);
        var downloadButton = this.createRoundActionButton('download', {
          element: 'a',
          label: '',
          ariaLabel: '添付をダウンロード',
          hoverLabel: 'ダウンロード',
          href: downloadUrl || '#',
          target: downloadUrl ? '_blank' : undefined,
          rel: downloadUrl ? 'noopener' : undefined
        }, 'target-bbs__attachment-download');
        if (!downloadUrl)
        {
          downloadButton.setAttribute('aria-disabled', 'true');
          downloadButton.addEventListener('click', function (event)
          {
            event.preventDefault();
          });
        }
        actions.appendChild(downloadButton);

        if (this.canDeleteMessage(message))
        {
          var deleteButton = this.createRoundActionButton('delete', { label: '', ariaLabel: '添付を削除', hoverLabel: '削除' }, 'target-bbs__attachment-delete');
          deleteButton.addEventListener('click', () =>
          {
            this.handleAttachmentDelete(thread, message, attachment, deleteButton);
          });
          actions.appendChild(deleteButton);
        }

        item.appendChild(actions);
        container.appendChild(item);
      });

      return container;
    }

    scrollThreadToTop()
    {
      if (!this.refs.messageViewport)
      {
        return;
      }
      if (typeof this.refs.messageViewport.scrollTo === 'function')
      {
        this.refs.messageViewport.scrollTo({ top: 0, behavior: 'smooth' });
      }
      else
      {
        this.refs.messageViewport.scrollTop = 0;
      }
    }

    renderComposerAttachments()
    {
      var host = this.refs.composerAttachmentList;
      if (!host)
      {
        return;
      }
      var attachments = Array.isArray(this.state.composerAttachments) ? this.state.composerAttachments.filter(Boolean) : [];
      host.innerHTML = '';
      if (!attachments.length)
      {
        host.classList.add('is-hidden');
        host.setAttribute('hidden', 'hidden');
        return;
      }
      host.classList.remove('is-hidden');
      host.removeAttribute('hidden');
      var title = createElement('p', 'target-bbs__composer-attachments-title');
      title.textContent = '添付ファイル';
      host.appendChild(title);
      var list = createElement('ul', 'target-bbs__composer-attachments-list');
      attachments.forEach((attachment, index) =>
      {
        var row = createElement('li', 'target-bbs__composer-attachment');
        var label = createElement('span', 'target-bbs__composer-attachment-name');
        label.textContent = attachment && (attachment.fileName || attachment.label || attachment.contentCode) ? (attachment.fileName || attachment.label || attachment.contentCode) : '添付ファイル';
        row.appendChild(label);
        var remove = this.createRoundActionButton('delete', { label: '', ariaLabel: '添付を削除', hoverLabel: '削除' }, 'target-bbs__composer-attachment-remove');
        remove.addEventListener('click', () =>
        {
          this.removeComposerAttachment(index);
        });
        row.appendChild(remove);
        list.appendChild(row);
      });
      host.appendChild(list);
    }

    setComposerEnabled(enabled)
    {
      var composer = this.refs.messagePlaceholder;
      if (composer)
      {
        composer.classList.toggle('is-disabled', !enabled);
      }
      if (this.refs.composerInput)
      {
        this.refs.composerInput.disabled = !enabled;
      }
      if (this.refs.composerButton)
      {
        this.refs.composerButton.disabled = !enabled;
        this.refs.composerButton.classList.toggle('is-disabled', !enabled);
      }
    }

    removeComposerAttachment(index)
    {
      if (!Array.isArray(this.state.composerAttachments))
      {
        return;
      }
      var copy = this.state.composerAttachments.slice();
      copy.splice(index, 1);
      this.state.composerAttachments = copy;
      this.renderComposerAttachments();
    }

    resolveAttachmentPreviewUrl(attachment)
    {
      if (!attachment)
      {
        return '';
      }
      if (attachment.previewUrl)
      {
        return attachment.previewUrl;
      }
      if (attachment.playbackUrl)
      {
        return attachment.playbackUrl;
      }
      if (attachment.streamUrl)
      {
        return attachment.streamUrl;
      }
      if (attachment.youtubeUrl)
      {
        return attachment.youtubeUrl;
      }
      if (attachment.posterUrl)
      {
        return attachment.posterUrl;
      }
      if (attachment.thumbnailUrl)
      {
        return attachment.thumbnailUrl;
      }
      if (attachment.previewImage)
      {
        return attachment.previewImage;
      }
      if (attachment.previewImageUrl)
      {
        return attachment.previewImageUrl;
      }
      if (attachment.imageUrl)
      {
        return attachment.imageUrl;
      }
      var url = attachment.previewUrl || attachment.url || '';
      if (url)
      {
        return url;
      }
      if (attachment.downloadUrl)
      {
        return attachment.downloadUrl;
      }
      if (attachment.contentCode)
      {
        return this.buildContentFileUrl({ contentCode: attachment.contentCode });
      }
      return '';
    }

    resolveAttachmentDownloadUrl(attachment)
    {
      if (!attachment)
      {
        return '';
      }
      if (attachment.downloadUrl)
      {
        return attachment.downloadUrl;
      }
      if (attachment.url)
      {
        return attachment.url;
      }
      if (attachment.contentCode)
      {
        return this.buildContentFileUrl({ contentCode: attachment.contentCode });
      }
      return '';
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

    handleAttachmentPreview(attachment)
    {
      var resolvedUrl = this.resolveAttachmentPreviewUrl(attachment) || this.resolveAttachmentDownloadUrl(attachment);
      var type = resolvePreviewType(attachment, resolvedUrl);
      if (type === 'video')
      {
        this.openVideoAttachmentPreview(attachment);
        return;
      }
      if (type === 'audio')
      {
        this.openAudioAttachmentPreview(attachment);
        return;
      }
      if (type === 'image')
      {
        this.openImageAttachmentPreview(attachment);
        return;
      }
      if (type === 'pdf')
      {
        this.openPdfAttachmentPreview(attachment);
        return;
      }
      this.openGenericAttachmentPreview(attachment, resolvedUrl);
    }

    async openPdfAttachmentPreview(attachment)
    {
      var service = this.page && this.page.pdfModalService;
      if (!service)
      {
        this.showAttachmentPreviewError();
        return;
      }
      var url = this.resolveAttachmentPreviewUrl(attachment) || this.resolveAttachmentDownloadUrl(attachment);
      if (!url && attachment && attachment.contentCode)
      {
        url = this.buildContentFileUrl({ contentCode: attachment.contentCode });
      }
      if (!url)
      {
        this.showAttachmentPreviewError();
        return;
      }
      var title = resolveAttachmentTitle(attachment);
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
        this.showAttachmentPreviewError();
      }
    }

    openAudioAttachmentPreview(attachment)
    {
      var service = this.page && this.page.audioModalService;
      if (!service)
      {
        this.showAttachmentPreviewError();
        return;
      }
      var url = this.resolveAttachmentPreviewUrl(attachment) || this.resolveAttachmentDownloadUrl(attachment);
      if (!url && attachment && attachment.contentCode)
      {
        url = this.buildContentFileUrl({ contentCode: attachment.contentCode });
      }
      if (!url)
      {
        this.showAttachmentPreviewError();
        return;
      }
      service.show(url, { ariaLabel: resolveAttachmentTitle(attachment) });
    }

    openImageAttachmentPreview(attachment)
    {
      var service = this.page && this.page.imageModalService;
      if (!service)
      {
        this.showAttachmentPreviewError();
        return;
      }
      var url = this.resolveAttachmentPreviewUrl(attachment) || this.resolveAttachmentDownloadUrl(attachment);
      if (!url && attachment && attachment.contentCode)
      {
        url = this.buildContentFileUrl({ contentCode: attachment.contentCode });
      }
      if (!url)
      {
        this.showAttachmentPreviewError();
        return;
      }
      var title = resolveAttachmentTitle(attachment);
      service.show(url, { alt: title, caption: title });
    }

    openVideoAttachmentPreview(attachment)
    {
      var service = this.page && this.page.videoModalService;
      if (!service)
      {
        throw new Error('[target-detail] video modal service is not available');
      }
      var title = resolveAttachmentTitle(attachment);
      if (attachment && attachment.youtubeUrl)
      {
        var youtubeUrl = this.resolveAttachmentPreviewUrl(attachment);
        if (!youtubeUrl)
        {
          this.showAttachmentPreviewError();
          return;
        }
        service.openYouTube(youtubeUrl, { autoplay: false, title: title });
        return;
      }
      if (attachment && attachment.contentCode)
      {
        try
        {
          var spec = { contentCode: attachment.contentCode, title: title };
          if (attachment.content)
          {
            spec.contentRecord = attachment.content;
          }
          service.openContentVideo(spec, { autoplay: false });
          return;
        }
        catch (_error)
        {
          // fallback to url handling below
        }
      }
      var url = this.resolveAttachmentPreviewUrl(attachment);
      if (!url)
      {
        this.showAttachmentPreviewError();
        return;
      }
      service.openHtml5(url, { autoplay: false, title: title });
    }

    openGenericAttachmentPreview(attachment, resolvedUrl)
    {
      var url = resolvedUrl || this.resolveAttachmentPreviewUrl(attachment);
      if (!url)
      {
        this.showAttachmentPreviewError();
        return;
      }
      var service = this.page && typeof this.page.getContentPreviewService === 'function'
        ? this.page.getContentPreviewService()
        : null;
      if (service && typeof service.show === 'function')
      {
        service.show({ src: url, title: resolveAttachmentTitle(attachment) });
        return;
      }
      window.open(url, '_blank');
    }

    showAttachmentPreviewError()
    {
      if (this.page && typeof this.page.showToast === 'function')
      {
        this.page.showToast('error', 'プレビューできる添付ファイルが見つかりませんでした。');
      }
    }

    async handleAttachmentDelete(thread, message, attachment, button)
    {
      if (!thread || !message || !attachment || !attachment.attachmentCode)
      {
        return;
      }
      if (button)
      {
        button.disabled = true;
      }
      try
      {
        var context = await this.page.deleteBbsAttachment(thread.threadCode, message.messageCode, attachment.attachmentCode);
        this.updateContext(context, thread.threadCode);
      }
      catch (error)
      {
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('error', '添付ファイルの削除に失敗しました。');
        }
        window.console.error('[target-detail] failed to delete bbs attachment', error);
      }
      finally
      {
        if (button)
        {
          button.disabled = false;
        }
      }
    }

    async selectSenderUser(thread)
    {
      var participants = this.getThreadParticipantsForDisplay(thread);
      var availableUsers = [];
      var seen = Object.create(null);
      participants.forEach(function (participant)
      {
        if (!participant)
        {
          return;
        }
        var code = normalizeText(participant.userCode || participant.code || participant.id);
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
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('error', 'スレッドの参加者が見つかりません。');
        }
        return null;
      }

      var service = this.page && this.page.userSelectModalService;
      if (!service || typeof service.open !== 'function')
      {
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('error', 'ユーザー選択モーダルを起動できません。');
        }
        return null;
      }

      var resolveUserCode = function (user)
      {
        if (!user)
        {
          return '';
        }
        return normalizeText(user.userCode || user.code || user.id || '');
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
              modalTitle: '送信者を選択',
              modalDescription: 'メッセージの送信ユーザーを選択してください。',
              actionLabel: '選択',
              applyLabel: '選択する',
              singleActionHeader: '選択',
              multipleActionHeader: '選択'
            },
            emptyMessage: 'このスレッドの参加者が見つかりません。',
            onSelect: (user) =>
            {
              finish(resolveUserCode(user));
            },
            onApply: (users) =>
            {
              var selected = Array.isArray(users) && users.length ? users[0] : null;
              finish(resolveUserCode(selected));
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
          window.console.error('[target-detail] failed to open sender selector', error);
          finish(null);
        }
      });
    }

    async openAttachmentModal()
    {
      if (!this.refs.attachmentModal)
      {
        this.refs.attachmentModal = this.createAttachmentModal();
      }
      var modal = this.refs.attachmentModal;
      modal.selectedContents = Array.isArray(this.state.composerAttachments) ? this.state.composerAttachments.slice() : [];
      this.renderAttachmentSelection(modal);
      this.setAttachmentFeedback(modal, '', null);
      this.switchAttachmentTab(modal, 'contents');
      modal.root.removeAttribute('hidden');
      modal.root.setAttribute('aria-hidden', 'false');
      modal.root.classList.add('is-open');
      modal.fileInput.value = '';
      modal.restoreTarget = document.activeElement;
      if (modal.confirmButton && typeof modal.confirmButton.focus === 'function')
      {
        modal.confirmButton.focus();
      }
    }

    closeAttachmentModal()
    {
      if (!this.refs.attachmentModal)
      {
        return;
      }
      var modal = this.refs.attachmentModal;
      modal.root.setAttribute('hidden', 'hidden');
      modal.root.setAttribute('aria-hidden', 'true');
      modal.root.classList.remove('is-open');
      this.setAttachmentFeedback(modal, '', null);
      if (modal.restoreTarget && typeof modal.restoreTarget.focus === 'function')
      {
        modal.restoreTarget.focus();
      }
    }

    switchAttachmentTab(modal, tabKey)
    {
      if (!modal || !modal.tabButtons || !modal.tabPanels)
      {
        return;
      }
      var targetKey = tabKey === 'upload' ? 'upload' : 'contents';
      ['contents', 'upload'].forEach((key) =>
      {
        var button = modal.tabButtons[key];
        var panel = modal.tabPanels[key];
        var isActive = key === targetKey;
        if (button)
        {
          button.classList.toggle('is-active', isActive);
          button.setAttribute('aria-selected', isActive ? 'true' : 'false');
          button.setAttribute('tabindex', isActive ? '0' : '-1');
        }
        if (panel)
        {
          panel.hidden = !isActive;
        }
      });
      modal.activeTab = targetKey;
      if (targetKey === 'upload' && !this.contentLibrary.length)
      {
        this.loadContentLibrary(modal);
      }
    }

    getContentsSelectModalService()
    {
      if (this.page && this.page.contentsSelectModalService)
      {
        return this.page.contentsSelectModalService;
      }
      return null;
    }

    openContentsSelectModal(modal)
    {
      var service = this.getContentsSelectModalService();
      if (!service || typeof service.open !== 'function')
      {
        this.setAttachmentFeedback(modal, 'コンテンツ選択モーダルを利用できません。', 'error');
        return;
      }

      var selectedItems = [];
      if (service.jobs && service.jobs.data && typeof service.jobs.data.normalizeItem === 'function')
      {
        var attachments = Array.isArray(modal && modal.selectedContents) ? modal.selectedContents : [];
        selectedItems = attachments.map(function (attachment)
        {
          var raw = attachment && (attachment.content || attachment.raw || attachment);
          var normalized = raw ? service.jobs.data.normalizeItem(raw) : null;
          if (normalized)
          {
            normalized.raw = normalized.raw || raw;
            return normalized;
          }
          return null;
        }).filter(Boolean);
      }

      var handleSelection = (items) =>
      {
        if (!items)
        {
          return;
        }
        var list = Array.isArray(items) ? items : [items];
        list.forEach((entry) =>
        {
          if (entry)
          {
            this.addContentSelection(modal, entry.raw || entry);
          }
        });
      };

      try
      {
        service.open({
          title: 'コンテンツを選択',
          multiple: true,
          selected: selectedItems,
          onSelect: handleSelection,
          onApply: handleSelection,
          onClose: () =>
          {
            if (modal && modal.tabButtons && modal.tabButtons.contents && typeof modal.tabButtons.contents.focus === 'function')
            {
              modal.tabButtons.contents.focus();
            }
          },
          forceRefresh: true
        });
      }
      catch (error)
      {
        window.console.error('[target-detail] failed to open content select modal', error);
      }
    }

    createAttachmentModal()
    {
      var backdrop = createElement('div', 'target-bbs__modal-backdrop');
      backdrop.setAttribute('hidden', 'hidden');
      var modal = createElement('div', 'target-bbs__modal');
      var modalRefs = null;
      var titleBlock = createElement('div', 'target-bbs__modal-header');
      var heading = createElement('h3', 'target-bbs__modal-title');
      heading.textContent = 'ファイルを添付';
      var descriptionEl = createElement('p', 'target-bbs__modal-description');
      descriptionEl.textContent = 'コンテンツ管理から選択するか、ファイルをアップロードして添付します。';
      titleBlock.appendChild(heading);
      titleBlock.appendChild(descriptionEl);
      modal.appendChild(titleBlock);

      var form = createElement('div', 'target-bbs__modal-form');
      var tabs = createElement('div', 'target-bbs__modal-tabs');
      tabs.setAttribute('role', 'tablist');

      var contentsTabId = 'target-bbs__attachment-tab-contents';
      var uploadTabId = 'target-bbs__attachment-tab-upload';
      var contentsPanelId = 'target-bbs__attachment-panel-contents';
      var uploadPanelId = 'target-bbs__attachment-panel-upload';

      var contentsTab = createElement('button', 'target-bbs__modal-tab is-active');
      contentsTab.id = contentsTabId;
      contentsTab.type = 'button';
      contentsTab.textContent = 'コンテンツ管理から選択';
      contentsTab.dataset.tab = 'contents';
      contentsTab.setAttribute('role', 'tab');
      contentsTab.setAttribute('aria-selected', 'true');
      contentsTab.setAttribute('aria-controls', contentsPanelId);
      contentsTab.setAttribute('tabindex', '0');
      tabs.appendChild(contentsTab);

      var uploadTab = createElement('button', 'target-bbs__modal-tab');
      uploadTab.id = uploadTabId;
      uploadTab.type = 'button';
      uploadTab.textContent = 'ファイルをアップロード';
      uploadTab.dataset.tab = 'upload';
      uploadTab.setAttribute('role', 'tab');
      uploadTab.setAttribute('aria-selected', 'false');
      uploadTab.setAttribute('aria-controls', uploadPanelId);
      uploadTab.setAttribute('tabindex', '-1');
      tabs.appendChild(uploadTab);
      form.appendChild(tabs);

      var feedback = createElement('p', 'target-bbs__modal-feedback');
      form.appendChild(feedback);

      var panels = createElement('div', 'target-bbs__modal-panels');

      var contentsPanel = createElement('div', 'target-bbs__modal-panel');
      contentsPanel.id = contentsPanelId;
      contentsPanel.dataset.tab = 'contents';
      contentsPanel.setAttribute('role', 'tabpanel');
      contentsPanel.setAttribute('aria-labelledby', contentsTabId);
      var contentsSummary = createElement('p', 'target-bbs__modal-description');
      contentsSummary.textContent = 'コンテンツ管理で選択する場合は、コンテンツ選択モーダルを開いてください。';
      var openContentsButton = this.createBannerButton({ buttonType: 'content-uploader-primary', label: 'コンテンツ選択モーダルを開く' });
      openContentsButton.addEventListener('click', () =>
      {
        this.openContentsSelectModal(modalRefs);
      });
      contentsPanel.appendChild(contentsSummary);
      contentsPanel.appendChild(openContentsButton);
      panels.appendChild(contentsPanel);

      var uploadPanel = createElement('div', 'target-bbs__modal-panel');
      uploadPanel.id = uploadPanelId;
      uploadPanel.dataset.tab = 'upload';
      uploadPanel.setAttribute('role', 'tabpanel');
      uploadPanel.setAttribute('aria-labelledby', uploadTabId);
      uploadPanel.hidden = true;
      var actionsRow = createElement('div', 'target-bbs__modal-actions-row');

      var uploadButton = this.createBannerButton({ buttonType: 'content-uploader-primary', label: 'ファイルをアップロード' });
      uploadButton.addEventListener('click', () =>
      {
        if (modalRefs && modalRefs.fileInput)
        {
          modalRefs.fileInput.click();
        }
      });
      actionsRow.appendChild(uploadButton);
      uploadPanel.appendChild(actionsRow);

      var contentList = createElement('div', 'target-bbs__content-library');
      uploadPanel.appendChild(contentList);

      var uploadField = createElement('div', 'target-bbs__upload-field');
      var fileInput = createElement('input', 'target-bbs__upload-input');
      fileInput.type = 'file';
      fileInput.multiple = true;
      fileInput.addEventListener('change', () =>
      {
        this.uploadAttachmentsFromFiles(fileInput.files, modalRefs);
      });
      uploadField.appendChild(fileInput);
      uploadPanel.appendChild(uploadField);
      panels.appendChild(uploadPanel);

      form.appendChild(panels);

      var handleTabSwitch = (key) =>
      {
        this.switchAttachmentTab(modalRefs, key);
      };
      contentsTab.addEventListener('click', () => handleTabSwitch('contents'));
      uploadTab.addEventListener('click', () => handleTabSwitch('upload'));

      var selection = createElement('div', 'target-bbs__attachment-selection');
      form.appendChild(selection);

      var footer = createElement('div', 'target-bbs__modal-actions');
      var cancel = createElement('button', 'target-bbs__modal-button target-bbs__modal-button--ghost');
      cancel.type = 'button';
      cancel.textContent = 'キャンセル';
      cancel.addEventListener('click', () =>
      {
        this.closeAttachmentModal();
      });
      var submit = createElement('button', 'target-bbs__modal-button target-bbs__modal-button--primary');
      submit.type = 'button';
      submit.textContent = '添付する';
      submit.addEventListener('click', () =>
      {
        this.state.composerAttachments = Array.isArray(modalRefs && modalRefs.selectedContents) ? modalRefs.selectedContents.slice() : [];
        this.renderComposerAttachments();
        this.closeAttachmentModal();
      });
      footer.appendChild(cancel);
      footer.appendChild(submit);

      modalRefs = {
        root: backdrop,
        contentList: contentList,
        feedback: feedback,
        selection: selection,
        fileInput: fileInput,
        confirmButton: submit,
        tabButtons: { contents: contentsTab, upload: uploadTab },
        tabPanels: { contents: contentsPanel, upload: uploadPanel },
        activeTab: 'contents',
        selectedContents: []
      };

      modal.appendChild(form);
      modal.appendChild(footer);
      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);

      return modalRefs;
    }

    setAttachmentFeedback(modal, message, type)
    {
      if (!modal || !modal.feedback)
      {
        return;
      }
      modal.feedback.textContent = message || '';
      modal.feedback.className = 'target-bbs__modal-feedback';
      if (type)
      {
        modal.feedback.classList.add('target-bbs__modal-feedback--' + type);
      }
    }

    renderAttachmentSelection(modal)
    {
      if (!modal || !modal.selection)
      {
        return;
      }
      var selections = Array.isArray(modal.selectedContents) ? modal.selectedContents.filter(Boolean) : [];
      modal.selection.innerHTML = '';
      var title = createElement('p', 'target-bbs__composer-attachments-title');
      title.textContent = '選択中の添付';
      modal.selection.appendChild(title);
      if (!selections.length)
      {
        var empty = createElement('p', 'target-bbs__composer-attachments-empty');
        empty.textContent = 'まだ添付がありません。';
        modal.selection.appendChild(empty);
        return;
      }
      var list = createElement('ul', 'target-bbs__composer-attachments-list');
      selections.forEach((attachment, index) =>
      {
        var row = createElement('li', 'target-bbs__composer-attachment');
        var label = createElement('span', 'target-bbs__composer-attachment-name');
        label.textContent = attachment && (attachment.fileName || attachment.label || attachment.contentCode) ? (attachment.fileName || attachment.label || attachment.contentCode) : '添付ファイル';
        row.appendChild(label);
        var remove = this.createRoundActionButton('delete', { label: '', ariaLabel: '添付を削除', hoverLabel: '削除' }, 'target-bbs__composer-attachment-remove');
        remove.addEventListener('click', () =>
        {
          modal.selectedContents.splice(index, 1);
          this.renderAttachmentSelection(modal);
        });
        row.appendChild(remove);
        list.appendChild(row);
      });
      modal.selection.appendChild(list);
    }

    async loadContentLibrary(modal)
    {
      if (this.isLoadingContentLibrary)
      {
        return;
      }
      this.isLoadingContentLibrary = true;
      this.setAttachmentFeedback(modal, '登録済みコンテンツを読み込み中です…', 'info');
      try
      {
        var payload = await this.page.callApi('ContentList', {}, { requestType: 'Contents' });
        this.contentLibrary = this.normalizeContentLibrary(payload);
        this.renderContentLibrary(modal);
        this.setAttachmentFeedback(modal, '', null);
      }
      catch (error)
      {
        window.console.error('[target-detail] failed to load content library', error);
        this.setAttachmentFeedback(modal, 'コンテンツ一覧の取得に失敗しました。', 'error');
      }
      finally
      {
        this.isLoadingContentLibrary = false;
      }
    }

    normalizeContentLibrary(payload)
    {
      var list = [];
      if (Array.isArray(payload && payload.usersContents))
      {
        list = payload.usersContents.filter(Boolean);
      }
      return list.map(function (entry)
      {
        var label = entry && (entry.fileName || entry.title || entry.contentCode || 'コンテンツ');
        return { label: label, raw: entry };
      });
    }

    renderContentLibrary(modal)
    {
      if (!modal || !modal.contentList)
      {
        return;
      }
      modal.contentList.innerHTML = '';
      var list = this.contentLibrary.slice(0, 50);
      if (!list.length)
      {
        var empty = createElement('p', 'target-bbs__composer-attachments-empty');
        empty.textContent = 'コンテンツがありません。';
        modal.contentList.appendChild(empty);
        return;
      }
      list.forEach((entry) =>
      {
        var button = createElement('button', 'target-bbs__content-item');
        button.type = 'button';
        button.textContent = entry.label;
        button.addEventListener('click', () =>
        {
          this.addContentSelection(modal, entry.raw);
        });
        modal.contentList.appendChild(button);
      });
    }

    addContentSelection(modal, entry)
    {
      if (!modal)
      {
        return;
      }
      var attachments = this.buildAttachmentsFromContents([entry]);
      if (!attachments || !attachments.length)
      {
        return;
      }
      if (!Array.isArray(modal.selectedContents))
      {
        modal.selectedContents = [];
      }
      attachments.forEach((attachment) =>
      {
        var exists = modal.selectedContents.some(function (item)
        {
          return item && attachment && item.contentCode === attachment.contentCode;
        });
        if (!exists)
        {
          modal.selectedContents.push(attachment);
        }
      });
      this.renderAttachmentSelection(modal);
    }

    buildAttachmentsFromContents(contents)
    {
      if (this.page && typeof this.page.buildAttachmentsFromContents === 'function')
      {
        return this.page.buildAttachmentsFromContents(contents);
      }
      var list = Array.isArray(contents) ? contents : [];
      return list.map(function (content)
      {
        if (!content)
        {
          return null;
        }
        var contentCode = content.contentCode || content.code || '';
        return {
          contentCode: contentCode,
          label: content.fileName || content.title || contentCode,
          contentType: content.contentType,
          mimeType: content.mimeType,
          fileName: content.fileName || content.title || contentCode,
          downloadUrl: content.downloadUrl || content.url || ''
        };
      }).filter(Boolean);
    }

    async uploadAttachmentsFromFiles(fileList, modal)
    {
      if (!fileList || !fileList.length)
      {
        return;
      }
      var files = Array.prototype.slice.call(fileList);
      this.setAttachmentFeedback(modal, 'ファイルをアップロードしています…', 'info');
      try
      {
        var uploads = await Promise.all(files.map((file) => this.uploadAttachmentContent(file)));
        var attachments = this.buildAttachmentsFromUploadResults(uploads);
        if (!Array.isArray(modal.selectedContents))
        {
          modal.selectedContents = [];
        }
        modal.selectedContents = modal.selectedContents.concat(attachments);
        this.renderAttachmentSelection(modal);
        this.setAttachmentFeedback(modal, 'アップロードが完了しました。', 'success');
      }
      catch (error)
      {
        window.console.error('[target-detail] failed to upload attachments', error);
        this.setAttachmentFeedback(modal, 'アップロードに失敗しました。', 'error');
      }
    }

    buildAttachmentsFromUploadResults(results)
    {
      var list = Array.isArray(results) ? results : [];
      return list.map(function (result)
      {
        var content = result && (result.content || result.response || result.result || result);
        var contentCode = content && (content.contentCode || content.code || content.contentsCode);
        if (!contentCode)
        {
          return null;
        }
        return {
          contentCode: contentCode,
          fileName: content.fileName || contentCode,
          contentType: content.contentType,
          mimeType: content.mimeType,
          fileSize: content.fileSize,
          downloadUrl: content.downloadUrl || content.url || ''
        };
      }).filter(Boolean);
    }

    uploadAttachmentContent(file, options)
    {
      if (!file)
      {
        return Promise.reject(new Error('ファイルを選択してください。'));
      }
      var formData = new window.FormData();
      var fileName = file.name || 'bbs-attachment';
      formData.append('fileName', fileName);
      formData.append('file', file, fileName);
      var requestOptions = window.Utils.buildApiRequestOptions('Contents', 'ContentUpload', formData);
      return this.sendUploadRequestWithProgress(requestOptions, options || {});
    }

    sendUploadRequestWithProgress(requestOptions, options)
    {
      var onProgress = options && typeof options.onProgress === 'function' ? options.onProgress : null;
      return new Promise(function (resolve, reject)
      {
        var xhr = new window.XMLHttpRequest();
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
        if (requestOptions && requestOptions.data)
        {
          xhr.send(requestOptions.data);
        }
        else
        {
          xhr.send();
        }
      });
    }

    async handleSendMessage()
    {
      var thread = this.state.selectedThread;
      if (!thread || !this.refs.composerInput || !this.refs.composerButton)
      {
        return;
      }
      var content = normalizeText(this.refs.composerInput.value);
      if (!content)
      {
        this.refs.composerInput.focus();
        return;
      }

      var senderUserCode = null;
      var requiresSenderSelection = this.page && typeof this.page.isSupervisorUser === 'function' && this.page.isSupervisorUser();
      if (requiresSenderSelection)
      {
        this.refs.composerButton.disabled = true;
        this.refs.composerButton.textContent = '送信者を選択中…';
        senderUserCode = await this.selectSenderUser(thread);
        this.refs.composerButton.disabled = false;
        this.refs.composerButton.textContent = '投稿する';
        if (!senderUserCode)
        {
          return;
        }
      }
      this.refs.composerButton.disabled = true;
      this.refs.composerButton.textContent = '投稿中…';
      try
      {
        var attachments = Array.isArray(this.state.composerAttachments) ? this.state.composerAttachments.filter(Boolean) : [];
        var appliedAttachments = attachments.map(function (attachment)
        {
          return attachment ? Object.assign({}, attachment) : attachment;
        });
        var context = await this.page.createBbsMessage(thread.threadCode, content, senderUserCode, attachments);
        this.updateContext(context, thread.threadCode);
        this.applyAttachmentsToLatestMessage(thread.threadCode, appliedAttachments);
        this.refs.composerInput.value = '';
        this.state.composerAttachments = [];
        this.renderComposerAttachments();
      }
      catch (error)
      {
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('error', 'メッセージの送信に失敗しました。');
        }
        window.console.error('[target-detail] failed to send bbs message', error);
      }
      finally
      {
        this.refs.composerButton.disabled = false;
        this.refs.composerButton.textContent = '投稿する';
      }
    }

    applyAttachmentsToLatestMessage(threadCode, attachments)
    {
      var hasAttachments = Array.isArray(attachments) && attachments.filter(Boolean).length;
      if (!threadCode || !hasAttachments)
      {
        return;
      }
      var thread = this.findThreadByCode(threadCode);
      if (!thread || !Array.isArray(thread.messages) || !thread.messages.length)
      {
        return;
      }
      var latestMessage = thread.messages[thread.messages.length - 1];
      if (!latestMessage || (Array.isArray(latestMessage.attachments) && latestMessage.attachments.length))
      {
        return;
      }
      latestMessage.attachments = attachments.filter(Boolean);
      this.renderThreadDetail();
    }

    updateContext(context, preferThreadCode)
    {
      if (!context)
      {
        return;
      }
      var mergedThreads = this.mergeThreads(
        Array.isArray(this.state.threads) ? this.state.threads : [],
        Array.isArray(context.threads) ? context.threads : []
      );
      var mergedParticipants = this.mergeParticipants(
        Array.isArray(this.state.participants) ? this.state.participants : [],
        Array.isArray(context.participants) ? context.participants : []
      );
      this.state.threads = mergedThreads;
      this.state.participants = mergedParticipants;
      this.state.viewer = context.viewer || this.state.viewer || null;
      var nextThread = null;
      var desiredCode = normalizeText(preferThreadCode || context.threadCode);
      if (desiredCode)
      {
        nextThread = this.findThreadByCode(desiredCode);
      }
      if (!nextThread && this.state.threads.length)
      {
        nextThread = this.state.threads[0];
      }
      this.state.selectedThread = nextThread;
      this.page.state.bbss = Object.assign({}, context, {
        threads: mergedThreads,
        participants: mergedParticipants,
        viewer: this.state.viewer
      });
      this.renderThreadList();
      this.renderThreadDetail();
    }

    mergeThreads(current, next)
    {
      var merged = [];
      var index = Object.create(null);
      var existingByCode = Object.create(null);
      var currentList = current || [];
      for (var i = 0; i < currentList.length; i += 1)
      {
        var currentThread = currentList[i];
        if (currentThread && currentThread.threadCode)
        {
          existingByCode[currentThread.threadCode] = currentThread;
        }
      }
      var append = function (list)
      {
        for (var j = 0; j < list.length; j += 1)
        {
          var thread = list[j];
          if (!thread || !thread.threadCode)
          {
            continue;
          }
          var existing = existingByCode[thread.threadCode];
          if (existing && (!Array.isArray(thread.participants) || !thread.participants.length))
          {
            thread = Object.assign({}, thread, { participants: existing.participants });
          }
          if (index[thread.threadCode] == null)
          {
            index[thread.threadCode] = merged.length;
            merged.push(thread);
            continue;
          }
          merged[index[thread.threadCode]] = merged[index[thread.threadCode]] || thread;
        }
      };
      append(next || []);
      append(currentList);
      merged.sort(function (a, b)
      {
        return (b ? b.lastActivityValue || 0 : 0) - (a ? a.lastActivityValue || 0 : 0);
      });
      return merged;
    }

    mergeParticipants(current, next)
    {
      var merged = [];
      var seen = Object.create(null);
      var append = function (list)
      {
        for (var i = 0; i < list.length; i += 1)
        {
          var participant = list[i];
          var code = participant && participant.userCode;
          if (!code || seen[code])
          {
            continue;
          }
          seen[code] = true;
          merged.push(participant);
        }
      };
      append(next || []);
      append(current || []);
      return merged;
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
      else if (window.Services && window.Services.UserAvatar)
      {
        this.avatarService = new window.Services.UserAvatar({
          size: 40,
          shape: 'circle',
          nameOverlay: true,
          initialsFallback: true
        });
      }
      if (this.avatarService && !this.avatarService.jobs && !this.avatarServiceBootPromise && typeof this.avatarService.boot === 'function')
      {
        this.avatarServiceBootPromise = this.avatarService.boot();
      }
      return this.avatarService;
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

    createBannerButton(options)
    {
      var opts = options || {};
      var label = opts.label || '';
      var ariaLabel = opts.ariaLabel || label || '';
      var svc = this.getButtonService();
      var button = null;
      if (svc && typeof svc.createActionButton === 'function')
      {
        try
        {
          button = svc.createActionButton(opts.buttonType || 'target-create', {
            label: label,
            ariaLabel: ariaLabel,
            hoverLabel: opts.hoverLabel || label,
            title: opts.title || label,
            type: 'button'
          });
        }
        catch (error)
        {
          window.console.warn('[target-detail] failed to create banner button', error);
        }
      }
      if (button)
      {
        return button;
      }
      var fallback = createElement('button', opts.fallbackClass || 'btn btn--primary');
      fallback.type = 'button';
      fallback.textContent = label;
      if (ariaLabel)
      {
        fallback.setAttribute('aria-label', ariaLabel);
      }
      return fallback;
    }

    createRoundActionButton(buttonType, options, extraClass)
    {
      var opts = options || {};
      var svc = this.getButtonService();
      var button = null;
      if (svc && typeof svc.createActionButton === 'function')
      {
        try
        {
          button = svc.createActionButton(buttonType, Object.assign({ type: 'button' }, opts));
        }
        catch (error)
        {
          window.console.warn('[target-detail] failed to create round action button', error);
        }
      }
      if (!button)
      {
        button = createElement('button', 'table-action-button table-action-button--' + buttonType);
        button.type = 'button';
        if (opts.ariaLabel)
        {
          button.setAttribute('aria-label', opts.ariaLabel);
        }
      }
      if (extraClass)
      {
        button.classList.add(extraClass);
      }
      return button;
    }

    async handleDeleteThread(thread, button)
    {
      if (!thread || !thread.threadCode || !this.canDeleteThread(thread))
      {
        return;
      }
      if (thread.messages && thread.messages.length)
      {
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('error', 'メッセージが存在するためスレッドを削除できません。');
        }
        return;
      }
      if (!this.page || !this.page.confirmDialogService)
      {
        return;
      }
      var confirmed = await this.page.confirmDialogService.open('このスレッドを削除しますか？', { type: 'warning' });
      if (!confirmed)
      {
        return;
      }
      if (button)
      {
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
      }
      try
      {
        await this.page.deleteBbsThread(thread.threadCode);
        await this.loadContext();
        this.renderThreadList();
        this.renderThreadDetail();
      }
      catch (error)
      {
        window.console.error('[target-detail] failed to delete bbs thread', error);
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('error', 'スレッドの削除に失敗しました。');
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

    async handleDeleteMessage(thread, message, button)
    {
      if (!thread || !message || !message.messageCode || !this.canDeleteMessage(message))
      {
        return;
      }
      if (!this.page || !this.page.confirmDialogService)
      {
        return;
      }
      var confirmed = await this.page.confirmDialogService.open('このメッセージを削除しますか？', { type: 'warning' });
      if (!confirmed)
      {
        return;
      }
      if (button)
      {
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
      }
      try
      {
        var context = await this.page.deleteBbsMessage(thread.threadCode, message.messageCode);
        this.updateContext(context, thread.threadCode);
      }
      catch (error)
      {
        window.console.error('[target-detail] failed to delete message', error);
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('error', 'メッセージの削除に失敗しました。');
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

    async openUserSelectModal()
    {
      var service = this.page && this.page.userSelectModalService;
      if (!service || typeof service.open !== 'function')
      {
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('error', 'ユーザー選択モーダルを起動できません。');
        }
        return;
      }
      var participants = Array.isArray(this.state.participants) ? this.state.participants : [];
      var availableUsers = [];
      var participantMap = Object.create(null);
      participants.forEach(function (participant)
      {
        if (!participant)
        {
          return;
        }
        var code = normalizeText(participant.userCode || participant.code || participant.id);
        var key = code || normalizeText(participant.displayName);
        if (!key || participantMap[key])
        {
          return;
        }
        if (!code)
        {
          return;
        }
        if (participant.isActive === false)
        {
          return;
        }
        participantMap[key] = true;
        availableUsers.push(Object.assign({}, participant, { userCode: code }));
      });
      var session = service.open({
        multiple: true,
        availableUsers: availableUsers,
        emptyMessage: 'このターゲットの参加者が見つかりません。',
        onApply: (users) =>
        {
          this.handleThreadCreate(users);
        },
        onSelect: (user) =>
        {
          this.handleThreadCreate([user]);
        }
      });
      return session;
    }

    deriveThreadTitleFromRecipients(recipientCodes)
    {
      var codes = this.normalizeCodeList(recipientCodes || []);
      if (!codes.length)
      {
        return '新規スレッド';
      }
      var participants = Array.isArray(this.state.participants) ? this.state.participants : [];
      var names = codes.map((code) =>
      {
        var participant = participants.find(function (entry)
        {
          return entry && entry.userCode === code;
        });
        if (participant)
        {
          return participant.displayName || participant.userCode || code;
        }
        return code;
      }).filter(Boolean);
      if (!names.length)
      {
        return '新規スレッド';
      }
      return names.join('・');
    }

    openThreadTitleModal(options)
    {
      var title = normalizeText(options && options.title) || 'スレッドを編集';
      var description = normalizeText(options && options.description)
        || 'スレッド名を入力してください。';
      var confirmLabel = normalizeText(options && options.confirmLabel) || '保存';
      var cancelLabel = normalizeText(options && options.cancelLabel) || 'キャンセル';
      var defaultValue = normalizeText(options && options.defaultValue) || '';

      var backdrop = createElement('div', 'target-bbs__modal-backdrop');
      var modal = createElement('div', 'target-bbs__modal');
      var titleBlock = createElement('div', 'target-bbs__modal-header');
      var heading = createElement('h3', 'target-bbs__modal-title');
      heading.textContent = title;
      titleBlock.appendChild(heading);

      var descriptionEl = createElement('p', 'target-bbs__modal-description');
      descriptionEl.textContent = description;
      titleBlock.appendChild(descriptionEl);

      var form = createElement('form', 'target-bbs__modal-form');
      var field = createElement('label', 'target-bbs__modal-field');
      var inputLabel = createElement('span', 'target-bbs__modal-label');
      inputLabel.textContent = 'スレッド名';
      var input = createElement('input', 'target-bbs__modal-input');
      input.type = 'text';
      input.name = 'threadTitle';
      input.value = defaultValue;
      input.placeholder = 'スレッド名を入力';
      input.autocomplete = 'off';
      field.appendChild(inputLabel);
      field.appendChild(input);
      form.appendChild(field);

      var error = createElement('p', 'target-bbs__modal-error');
      error.setAttribute('aria-live', 'polite');
      form.appendChild(error);

      var actions = createElement('div', 'target-bbs__modal-actions');
      var cancel = createElement('button', 'target-bbs__modal-button target-bbs__modal-button--ghost');
      cancel.type = 'button';
      cancel.textContent = cancelLabel || 'キャンセル';
      var submit = createElement('button', 'target-bbs__modal-button target-bbs__modal-button--primary');
      submit.type = 'submit';
      submit.textContent = confirmLabel || '保存';
      actions.appendChild(cancel);
      actions.appendChild(submit);
      form.appendChild(actions);

      modal.appendChild(titleBlock);
      modal.appendChild(form);
      backdrop.appendChild(modal);

      return new Promise((resolve) =>
      {
        var closed = false;
        var handleKey = function (event)
        {
          if (event.key === 'Escape')
          {
            document.removeEventListener('keydown', handleKey);
            finish(null);
          }
        };

        var finish = (value) =>
        {
          if (closed)
          {
            return;
          }
          closed = true;
          document.removeEventListener('keydown', handleKey);
          if (backdrop.parentNode)
          {
            backdrop.parentNode.removeChild(backdrop);
          }
          resolve(value);
        };

        var validate = () =>
        {
          var value = normalizeText(input.value);
          if (!value)
          {
            error.textContent = 'スレッド名を入力してください。';
            input.focus();
            return null;
          }
          error.textContent = '';
          return value;
        };

        form.addEventListener('submit', (event) =>
        {
          event.preventDefault();
          var value = validate();
          if (value == null)
          {
            return;
          }
          finish(value);
        });

        cancel.addEventListener('click', () =>
        {
          finish(null);
        });

        backdrop.addEventListener('click', (event) =>
        {
          if (event.target === backdrop)
          {
            finish(null);
          }
        });

        document.addEventListener('keydown', handleKey);

        window.setTimeout(() =>
        {
          input.focus();
          input.select();
        }, 0);

        document.body.appendChild(backdrop);
      });
    }

    async promptThreadTitle(defaultTitle)
    {
      var suggested = defaultTitle || '新規スレッド';
      var input = await this.openThreadTitleModal({
        title: 'スレッド名を編集',
        description: 'スレッドのタイトルを入力してください。',
        confirmLabel: '保存する',
        defaultValue: suggested
      });
      if (input == null)
      {
        return null;
      }
      var normalized = normalizeText(input);
      if (!normalized)
      {
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('error', 'スレッド名を入力してください。');
        }
        return null;
      }
      return normalized;
    }

    async handleThreadCreate(users)
    {
      var recipients = this.normalizeCodeList(extractRecipientCodes(users));
      var duplicateThread = this.findThreadByRecipients(recipients);
      if (duplicateThread)
      {
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('error', '選択した参加者のスレッドは既に存在します。');
        }
        this.highlightThread(duplicateThread.threadCode);
        return;
      }
      var defaultTitle = this.deriveThreadTitleFromRecipients(recipients);
      var threadTitle = await this.promptThreadTitle(defaultTitle);
      if (threadTitle == null)
      {
        return;
      }
      if (this.refs.threadAddButton)
      {
        this.refs.threadAddButton.disabled = true;
        this.refs.threadAddButton.textContent = '作成中…';
      }
      try
      {
        var context = await this.page.createBbsThread({
          recipientCodes: recipients,
          threadType: recipients.length === 1 ? 'direct' : 'group',
          content: null,
          threadTitle: threadTitle
        });
        this.updateContext(context, context && context.threadCode);
      }
      catch (error)
      {
        window.console.error('[target-detail] failed to create bbs thread', error);
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('error', 'スレッドの作成に失敗しました。');
        }
      }
      finally
      {
        if (this.refs.threadAddButton)
        {
          this.refs.threadAddButton.disabled = false;
          this.refs.threadAddButton.textContent = 'スレッドを追加';
        }
      }
    }

    async handleThreadRename(thread, sourceButton)
    {
      if (!thread)
      {
        return;
      }
      var nextTitle = await this.promptThreadTitle(thread.title);
      if (nextTitle == null)
      {
        return;
      }
      var editButton = sourceButton || this.refs.threadEditButton;
      var shouldUpdateLabel = editButton && editButton === this.refs.threadEditButton;
      var originalLabel = shouldUpdateLabel && typeof editButton.textContent === 'string'
        ? editButton.textContent
        : null;
      if (editButton)
      {
        editButton.disabled = true;
        if (shouldUpdateLabel)
        {
          editButton.textContent = '更新中…';
        }
      }
      try
      {
        var context = await this.page.updateBbsThreadTitle(thread.threadCode, nextTitle);
        this.updateContext(context, thread.threadCode);
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('success', 'スレッド名を更新しました。');
        }
      }
      catch (error)
      {
        window.console.error('[target-detail] failed to rename bbs thread', error);
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('error', 'スレッド名の更新に失敗しました。');
        }
      }
      finally
      {
        if (editButton)
        {
          editButton.disabled = false;
          if (shouldUpdateLabel && originalLabel != null)
          {
            editButton.textContent = originalLabel;
          }
        }
      }
    }
  }

  var NS = window.TargetDetail || (window.TargetDetail = {});
  NS.JobBbs = NS.JobBbs || TargetDetailBbs;
})(window, document);
