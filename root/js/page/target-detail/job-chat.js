(function ()
{
  'use strict';

  var CHAT_EMPTY_TEXT = 'メッセージがありません。最初のメッセージを送信してください。';
  var THREAD_EMPTY_TEXT = 'チャットスレッドがまだありません。右上の「スレッドを追加」から作成してください。';
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

  function createAvatarFromParticipant(participant, baseClass, avatarService, bootPromise)
  {
    var className = baseClass || 'target-chat__thread-avatar';
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
    var wrapper = createElement('div', 'target-chat__message-avatar');
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

  class TargetDetailChat
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
        isReloading: false
      };
      this.buttonService = null;
      this.avatarService = page && page.avatarService ? page.avatarService : null;
      this.avatarServiceBootPromise = null;
      this.highlightTimer = null;
    }

    async render()
    {
      this.refs.container = this.page && this.page.refs && this.page.refs.tabPanels
        ? this.page.refs.tabPanels.chat
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
      var root = createElement('div', 'target-chat');

      var header = createElement('header', 'target-chat__header');
      var headerTop = createElement('div', 'target-chat__header-top');
      var title = createElement('h3', 'target-detail__section-title target-chat__heading');
      title.textContent = 'チャット';
      headerTop.appendChild(title);

      var headerActions = createElement('div', 'target-chat__header-actions');
      var refreshButton = this.createBannerButton({
        buttonType: 'expandable-icon-button/reload',
        label: '再読み込み',
        ariaLabel: '再読み込み',
        hoverLabel: 'チャットを再読み込み',
        title: 'チャットを再読み込み'
      });
      refreshButton.classList.add('target-chat__reload');
      refreshButton.addEventListener('click', () =>
      {
        this.reloadChats();
      });
      this.refs.refreshButton = refreshButton;
      headerActions.appendChild(refreshButton);
      headerTop.appendChild(headerActions);
      header.appendChild(headerTop);

      var summary = createElement('p', 'target-chat__summary');
      summary.textContent = '担当者とのやり取りや連絡事項をスレッド単位で管理できます。';
      header.appendChild(summary);
      root.appendChild(header);

      var layout = createElement('div', 'target-chat__layout');

      var threadPane = createElement('section', 'target-chat__thread-pane');
      var threadPaneHeader = createElement('div', 'target-chat__thread-pane-header');
      var heading = createElement('div', 'target-chat__thread-heading');
      var headingTitle = createElement('h4');
      headingTitle.textContent = 'スレッド';
      heading.appendChild(headingTitle);
      threadPaneHeader.appendChild(heading);

      var threadActions = createElement('div', 'target-chat__thread-actions');
      var addButton = null;
      var addButtonOptions = {
        baseClass: 'target-management__icon-button target-management__icon-button--primary target-chat__thread-add',
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
        this.openUserSelectModal();
      });
      this.refs.threadAddButton = addButton;
      threadActions.appendChild(addButton);
      threadPaneHeader.appendChild(threadActions);
      threadPane.appendChild(threadPaneHeader);

      var threadList = createElement('div', 'target-chat__thread-list');
      this.refs.threadList = threadList;
      threadPane.appendChild(threadList);

      var messagePane = createElement('section', 'target-chat__message-pane');
      var messageHeader = createElement('header', 'target-chat__message-header');
      var messageTitleRow = createElement('div', 'target-chat__message-title-row');
      var messageTitle = createElement('h4', 'target-chat__message-title');
      this.refs.threadHeaderTitle = messageTitle;
      var messageMeta = createElement('p', 'target-chat__message-meta');
      this.refs.threadHeaderMeta = messageMeta;
      messageTitleRow.appendChild(messageTitle);
      messageTitleRow.appendChild(messageMeta);
      messageHeader.appendChild(messageTitleRow);

      var recipientActions = createElement('div', 'target-chat__recipient-actions');
      var recipientList = createElement('div', 'target-chat__recipient-list');
      this.refs.recipientContainer = recipientList;
      recipientActions.appendChild(recipientList);
      messageHeader.appendChild(recipientActions);
      messagePane.appendChild(messageHeader);

      var messageViewport = createElement('div', 'target-chat__message-viewport');
      this.refs.messageViewport = messageViewport;
      messagePane.appendChild(messageViewport);

      var composer = createElement('div', 'target-chat__composer');
      var composerLabel = createElement('label', 'target-chat__composer-label');
      composerLabel.textContent = 'メッセージ';
      var composerInput = createElement('textarea', 'target-chat__composer-input');
      composerInput.rows = 3;
      composerInput.placeholder = 'メッセージを入力';
      this.refs.composerInput = composerInput;
      composerLabel.appendChild(composerInput);
      composer.appendChild(composerLabel);
      var composerActions = createElement('div', 'target-chat__composer-actions');
      var composerButtons = createElement('div', 'target-chat__composer-buttons');
      var sendButton = this.createBannerButton({
        buttonType: 'announcement-create',
        label: '送信',
        ariaLabel: 'メッセージを送信'
      });
      sendButton.classList.add('target-chat__composer-send');
      this.refs.composerButton = sendButton;
      sendButton.addEventListener('click', () =>
      {
        this.handleSendMessage();
      });
      composerButtons.appendChild(sendButton);
      composerActions.appendChild(composerButtons);
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
      var context = await this.page.loadChats({ force: true });
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
      this.page.state.chats = context;
    }

    async reloadChats()
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
        var empty = createElement('p', 'target-chat__thread-empty');
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
      var highlighted = this.refs.threadList.querySelectorAll('.target-chat__thread.is-duplicate');
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
      var item = createElement('article', 'target-chat__thread');
      item.setAttribute('role', 'button');
      item.setAttribute('data-thread-code', thread.threadCode);
      item.tabIndex = 0;
      var isActive = this.state.selectedThread && this.state.selectedThread.threadCode === thread.threadCode;
      if (isActive)
      {
        item.classList.add('is-active');
      }

      var header = createElement('div', 'target-chat__thread-header');
      header.appendChild(this.renderThreadParticipants(thread));

      var info = createElement('div', 'target-chat__thread-info');
      var metaRow = createElement('div', 'target-chat__thread-meta-row');
      var meta = createElement('time', 'target-chat__thread-meta');
      if (thread.lastActivityAt)
      {
        meta.setAttribute('datetime', thread.lastActivityAt);
      }
      meta.textContent = formatThreadMeta(thread) || '—';
      metaRow.appendChild(meta);

      if (this.canDeleteThread(thread))
      {
        var deleteButton = this.createRoundActionButton('delete', {
          label: '',
          hoverLabel: 'スレッドを削除',
          ariaLabel: 'このスレッドを削除',
          srLabel: 'スレッドを削除'
        }, 'target-chat__thread-delete');
        deleteButton.addEventListener('click', (event) =>
        {
          event.stopPropagation();
          event.preventDefault();
          this.handleDeleteThread(thread, deleteButton);
        });
        metaRow.appendChild(deleteButton);
      }
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
        return thread.participants.filter(isActiveParticipant);
      }
      return [];
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
      var container = createElement('div', 'target-chat__thread-participants');
      var participants = this.getThreadParticipantsForDisplay(thread);
      if (!participants.length)
      {
        var placeholder = createElement('span', 'target-chat__thread-participant-empty');
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
      var item = createElement('div', 'target-chat__thread-participant');
      var avatarHost = createElement('span', 'target-chat__thread-avatar');
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
        var initialNode = createElement('span', 'target-chat__thread-avatar-initial');
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

      var label = createElement('span', 'target-chat__thread-participant-name');
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
        '.target-chat__thread-avatar, .target-chat__recipient-avatar, .target-chat__message-avatar'
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
          window.console.warn('[target-detail] failed to bind chat avatar popovers', error);
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
        window.console.warn('[target-detail] failed to complete avatar service boot for chat popovers', error);
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
      var recipients = resolveThreadParticipants(thread, this.state.viewer);
      if (!recipients.length)
      {
        return;
      }
      var avatarService = this.getAvatarService();
      var bootPromise = this.avatarServiceBootPromise;
      recipients.forEach((participant) =>
      {
        var recipient = createElement('button', 'target-chat__recipient');
        recipient.type = 'button';
        recipient.setAttribute('aria-pressed', 'false');
        var avatar = createAvatarFromParticipant(participant, 'target-chat__recipient-avatar', avatarService, bootPromise);
        recipient.appendChild(avatar);
        var name = createElement('span', 'target-chat__recipient-name');
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
        this.renderMessages(null);
        this.setComposerEnabled(false);
        this.renderMessagePlaceholder(THREAD_SELECT_TEXT);
        return;
      }
      this.refs.threadHeaderTitle.textContent = thread.title || 'チャット';
      this.refs.threadHeaderMeta.textContent = formatThreadMeta(thread);
      this.renderMessages(thread);
      this.setComposerEnabled(true);
    }

    renderMessagePlaceholder(text)
    {
      if (!this.refs.messageViewport)
      {
        return;
      }
      this.refs.messageViewport.innerHTML = '';
      var empty = createElement('p', 'target-chat__message-empty');
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
        this.renderMessagePlaceholder(CHAT_EMPTY_TEXT);
        return;
      }
      for (var i = 0; i < thread.messages.length; i += 1)
      {
        var message = thread.messages[i];
        var item = this.renderMessage(message, thread);
        this.refs.messageViewport.appendChild(item);
      }
      this.bindAvatarPopovers(this.refs.messageViewport);
      this.refs.messageViewport.scrollTop = this.refs.messageViewport.scrollHeight;
    }

    renderMessage(message, thread)
    {
      var senderCode = message ? normalizeText(message.senderUserCode || message.senderCode) : '';
      var isSelf = Boolean(this.state.viewer && senderCode && this.state.viewer.userCode === senderCode);
      var wrapper = createElement('article', 'target-chat__message');
      wrapper.classList.add(isSelf ? 'target-chat__message--self' : 'target-chat__message--other');

      var row = createElement('div', 'target-chat__message-row');

      var metaColumn = createElement('div', 'target-chat__message-meta-block');
      var timestamp = createElement('time', 'target-chat__message-time');
      if (message.sentAt)
      {
        timestamp.setAttribute('datetime', message.sentAt);
      }
      timestamp.textContent = message.sentAtDisplay || '';
      metaColumn.appendChild(timestamp);

      if (this.canDeleteMessage(message))
      {
        var deleteButton = this.createRoundActionButton('delete', {
          label: '',
          hoverLabel: '削除',
          ariaLabel: 'このメッセージを削除',
          srLabel: 'メッセージを削除'
        }, 'target-chat__message-delete');
        deleteButton.addEventListener('click', () =>
        {
          this.handleDeleteMessage(thread, message, deleteButton);
        });
        metaColumn.appendChild(deleteButton);
      }

      var body = createElement('div', 'target-chat__message-body');
      if (!isSelf)
      {
        var participant = resolveParticipantFromThread(thread, senderCode) || (senderCode ? { userCode: senderCode, displayName: senderCode } : null);
        var avatarWrapper = createElement('div', 'target-chat__message-avatar-wrapper');
        avatarWrapper.appendChild(createMessageAvatar(participant, this.getAvatarService(), this.avatarServiceBootPromise));
        body.appendChild(avatarWrapper);
      }

      var bubble = createElement('div', 'target-chat__bubble');
      var content = createElement('p', 'target-chat__message-info');
      content.textContent = message.content || '';
      bubble.appendChild(content);
      body.appendChild(bubble);

      if (isSelf)
      {
        row.appendChild(metaColumn);
        row.appendChild(body);
      }
      else
      {
        row.appendChild(body);
        row.appendChild(metaColumn);
      }

      wrapper.appendChild(row);
      return wrapper;
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

    async selectSenderUser(thread)
    {
      var participants = resolveThreadParticipants(thread, this.state && this.state.viewer);
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
        this.refs.composerButton.textContent = '送信';
        if (!senderUserCode)
        {
          return;
        }
      }
      this.refs.composerButton.disabled = true;
      this.refs.composerButton.textContent = '送信中…';
      try
      {
        var context = await this.page.createChatMessage(thread.threadCode, content, senderUserCode);
        this.updateContext(context, thread.threadCode);
        this.refs.composerInput.value = '';
      }
      catch (error)
      {
        if (this.page && typeof this.page.showToast === 'function')
        {
          this.page.showToast('error', 'メッセージの送信に失敗しました。');
        }
        window.console.error('[target-detail] failed to send chat message', error);
      }
      finally
      {
        this.refs.composerButton.disabled = false;
        this.refs.composerButton.textContent = '送信';
      }
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
      this.page.state.chats = Object.assign({}, context, {
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
        await this.page.deleteChatThread(thread.threadCode);
        await this.loadContext();
        this.renderThreadList();
        this.renderThreadDetail();
      }
      catch (error)
      {
        window.console.error('[target-detail] failed to delete chat thread', error);
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
        var context = await this.page.deleteChatMessage(thread.threadCode, message.messageCode);
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

    async handleThreadCreate(users)
    {
      var recipients = extractRecipientCodes(users);
      if (!recipients.length)
      {
        return;
      }
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
      if (this.refs.threadAddButton)
      {
        this.refs.threadAddButton.disabled = true;
        this.refs.threadAddButton.textContent = '作成中…';
      }
      try
      {
        var context = await this.page.createChatThread({
          recipientCodes: recipients,
          threadType: recipients.length === 1 ? 'direct' : 'group',
          content: null
        });
        this.updateContext(context, context && context.threadCode);
      }
      catch (error)
      {
        window.console.error('[target-detail] failed to create chat thread', error);
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
  }

  var NS = window.TargetDetail || (window.TargetDetail = {});
  NS.JobChat = NS.JobChat || TargetDetailChat;
})(window, document);
