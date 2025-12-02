(function ()
{
  'use strict';

  var USER_SELECT_MODAL_DEBUG = false;

  function createElement(tag, className)
  {
    var el = document.createElement(tag);
    if (className)
    {
      el.className = className;
    }
    return el;
  }

  function resolveAvatarUrl(user)
  {
    if (!user || typeof user !== 'object')
    {
      return '';
    }
    var avatar = user.avatar;
    if (avatar && typeof avatar === 'object')
    {
      var keys = ['src', 'url', 'href'];
      for (var i = 0; i < keys.length; i += 1)
      {
        if (avatar[keys[i]])
        {
          return String(avatar[keys[i]]).trim();
        }
      }
    }
    var candidates = [avatar, user.avatarUrl, user.avatarURL, user.photoUrl, user.photoURL, user.imageUrl, user.imageURL];
    for (var j = 0; j < candidates.length; j += 1)
    {
      var value = candidates[j];
      if (typeof value === 'string' && value.trim())
      {
        return value.trim();
      }
    }
    return '';
  }

  function createAvatar(user)
  {
    var wrapper = createElement('span', 'user-search-modal__avatar');
    var url = resolveAvatarUrl(user);
    if (url)
    {
      var img = createElement('img');
      img.src = url;
      img.alt = '';
      img.loading = 'lazy';
      wrapper.appendChild(img);
      return wrapper;
    }
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'user-search-modal__avatar-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    var head = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    head.setAttribute('cx', '12');
    head.setAttribute('cy', '8');
    head.setAttribute('r', '4');
    head.setAttribute('fill', 'none');
    head.setAttribute('stroke', 'currentColor');
    head.setAttribute('stroke-width', '1.5');
    var body = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    body.setAttribute('d', 'M4 20c0-4 4-6 8-6s8 2 8 6');
    body.setAttribute('fill', 'none');
    body.setAttribute('stroke', 'currentColor');
    body.setAttribute('stroke-width', '1.5');
    body.setAttribute('stroke-linecap', 'round');
    body.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(head);
    svg.appendChild(body);
    wrapper.appendChild(svg);
    return wrapper;
  }

  function formatNumber(value)
  {
    try
    {
      if (!formatNumber.formatter)
      {
        formatNumber.formatter = new window.Intl.NumberFormat('ja-JP');
      }
      return formatNumber.formatter.format(value);
    }
    catch (error)
    {
      return String(value);
    }
  }

  class JobModal
  {
    constructor(service)
    {
      this.service = service;
      this.elements = null;
      this.activeSession = null;
    }

    resolveZIndex(optionValue)
    {
      var value = (typeof optionValue === 'number') ? optionValue : this.service.config.zIndex;
      if (typeof value === 'number' && value === value)
      {
        return value;
      }
      return null;
    }

    ensureElements()
    {
      if (this.elements)
      {
        return this.elements;
      }
      var text = this.service.config.text;
      var modal = createElement('div', 'screen-modal');
      modal.setAttribute('aria-hidden', 'true');
      modal.setAttribute('hidden', 'hidden');
      modal.dataset.modal = 'user-select-modal';

      var overlay = createElement('div', 'screen-modal__overlay');
      overlay.setAttribute('data-modal-close', 'true');
      modal.appendChild(overlay);

      var dialog = createElement('section', 'screen-modal__content user-search-modal');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-labelledby', 'user-select-modal-title');
      dialog.setAttribute('aria-describedby', 'user-select-modal-summary');

      var closeButton = createElement('button', 'screen-modal__close');
      closeButton.type = 'button';
      closeButton.setAttribute('data-modal-close', 'true');
      closeButton.setAttribute('aria-label', 'モーダルを閉じる');
      closeButton.textContent = '×';
      dialog.appendChild(closeButton);

      var header = createElement('header', 'screen-modal__header');
      var title = createElement('h2', 'screen-modal__title');
      title.id = 'user-select-modal-title';
      title.textContent = text.modalTitle;
      var description = createElement('p', 'screen-modal__summary');
      description.id = 'user-select-modal-summary';
      description.textContent = text.modalDescription;
      header.appendChild(title);
      header.appendChild(description);
      dialog.appendChild(header);

      var body = createElement('div', 'screen-modal__body user-search-modal__body');
      var form = createElement('form', 'user-search-modal__form');
      form.setAttribute('role', 'search');
      var label = createElement('label', 'user-search-modal__label');
      var labelText = createElement('span');
      labelText.textContent = text.keywordLabel;
      var input = document.createElement('input');
      input.type = 'search';
      input.className = 'user-management__input user-search-modal__input';
      input.placeholder = text.searchPlaceholder;
      input.setAttribute('aria-label', text.modalTitle);
      label.appendChild(labelText);
      label.appendChild(input);
      var summary = createElement('p', 'user-search-modal__summary');
      summary.setAttribute('data-summary', 'true');
      form.appendChild(label);
      form.appendChild(summary);
      body.appendChild(form);

      var feedback = createElement('div', 'user-management__feedback user-search-modal__feedback');
      feedback.setAttribute('role', 'status');
      feedback.setAttribute('aria-live', 'polite');
      feedback.hidden = true;
      body.appendChild(feedback);

      var results = createElement('div', 'user-search-modal__results');
      results.setAttribute('data-results', 'true');
      body.appendChild(results);

      dialog.appendChild(body);

      var footer = createElement('footer', 'screen-modal__footer user-search-modal__footer');
      footer.setAttribute('data-actions', 'true');
      footer.hidden = true;
      var selectAllButton = createElement('button', 'btn btn--ghost');
      selectAllButton.type = 'button';
      selectAllButton.setAttribute('data-action', 'select-all');
      var deselectAllButton = createElement('button', 'btn btn--ghost');
      deselectAllButton.type = 'button';
      deselectAllButton.setAttribute('data-action', 'deselect-all');
      var cancelButton = createElement('button', 'btn btn--ghost');
      cancelButton.type = 'button';
      cancelButton.setAttribute('data-action', 'cancel');
      cancelButton.textContent = text.cancelLabel;
      var applyButton = createElement('button', 'btn btn--primary');
      applyButton.type = 'button';
      applyButton.setAttribute('data-action', 'apply');
      applyButton.textContent = text.applyLabel;
      footer.appendChild(selectAllButton);
      footer.appendChild(deselectAllButton);
      footer.appendChild(cancelButton);
      footer.appendChild(applyButton);
      dialog.appendChild(footer);

      modal.appendChild(dialog);
      document.body.appendChild(modal);

      this.elements = {
        modal: modal,
        overlay: overlay,
        dialog: dialog,
        closeButtons: [overlay, closeButton],
        searchForm: form,
        searchInput: input,
        summary: summary,
        feedback: feedback,
        results: results,
        actions: footer,
        applyButton: applyButton,
        selectAllButton: selectAllButton,
        deselectAllButton: deselectAllButton,
        cancelButton: cancelButton,
        title: title,
        description: description
      };
      return this.elements;
    }

    setFeedback(element, message, type)
    {
      if (!element)
      {
        return;
      }
      element.classList.remove('is-error', 'is-success', 'is-loading');
      if (!message)
      {
        element.textContent = '';
        element.hidden = true;
        return;
      }
      element.hidden = false;
      element.textContent = message;
      if (type === 'error')
      {
        element.classList.add('is-error');
      }
      else if (type === 'loading')
      {
        element.classList.add('is-loading');
      }
      else if (type === 'success')
      {
        element.classList.add('is-success');
      }
    }

    filterByKeyword(items, keyword)
    {
      var q = (keyword || '').trim().toLowerCase();
      if (!q)
      {
        return items.slice();
      }
      var tokens = q.split(/\s+/);
      return items.filter(function (item)
      {
        var hay = (item && item._searchText) ? String(item._searchText).toLowerCase() : '';
        if (!hay)
        {
          return false;
        }
        return tokens.every(function (token)
        {
          return hay.indexOf(token) >= 0;
        });
      });
    }

    renderTable(container, items, context)
    {
      container.innerHTML = '';
      if (!items.length)
      {
        if (context.emptyMessage)
        {
          var empty = createElement('p', 'user-search-modal__empty');
          empty.textContent = context.emptyMessage;
          container.appendChild(empty);
        }
        return;
      }
      var table = createElement('table', 'user-table user-search-modal__table');
      var thead = document.createElement('thead');
      var headerRow = document.createElement('tr');
      var headers = ['氏名', 'ユーザーコード', 'メール', '所属'];
      for (var i = 0; i < headers.length; i += 1)
      {
        var th = document.createElement('th');
        th.scope = 'col';
        th.textContent = headers[i];
        headerRow.appendChild(th);
      }
      var actionHeader = document.createElement('th');
      actionHeader.scope = 'col';
      actionHeader.textContent = context.multiple
        ? context.multipleActionHeader
        : context.singleActionHeader;
      headerRow.appendChild(actionHeader);
      thead.appendChild(headerRow);
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      items.forEach((item) =>
      {
        var row = document.createElement('tr');
        var identityCell = document.createElement('td');
        var identity = createElement('div', 'user-search-modal__identity' + (context.multiple ? '' : ' user-search-modal__identity--interactive'));
        identity.appendChild(createAvatar(item));
        var nameLabel = createElement('span', 'user-search-modal__name');
        nameLabel.textContent = item.displayName || '—';
        identity.appendChild(nameLabel);
        identityCell.appendChild(identity);
        row.appendChild(identityCell);

        var codeCell = document.createElement('td');
        codeCell.textContent = item.userCode || '—';
        row.appendChild(codeCell);

        var mailCell = document.createElement('td');
        mailCell.textContent = item.mail || '—';
        row.appendChild(mailCell);

        var groupCell = document.createElement('td');
        groupCell.textContent = item.userGroup || '—';
        row.appendChild(groupCell);

        var actionCell = document.createElement('td');
        if (context.multiple)
        {
          var selector = createElement('label', 'content-item__action content-item__action--select user-search-modal__selector');
          var checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'user-search-modal__checkbox';
          checkbox.checked = context.isSelected(item);
          row.classList.toggle('is-selected', checkbox.checked);
          var hiddenLabel = createElement('span', 'visually-hidden');
          var identityText = item.displayName || item.userCode || 'ユーザー';
          hiddenLabel.textContent = identityText + 'を選択';
          selector.appendChild(checkbox);
          selector.appendChild(hiddenLabel);
          checkbox.addEventListener('change', (event) =>
          {
            event.stopPropagation();
            context.toggleSelection(item, checkbox.checked);
            row.classList.toggle('is-selected', checkbox.checked);
          });
          selector.addEventListener('click', (event) =>
          {
            event.stopPropagation();
          });
          row.addEventListener('click', () =>
          {
            checkbox.checked = !checkbox.checked;
            context.toggleSelection(item, checkbox.checked);
            row.classList.toggle('is-selected', checkbox.checked);
          });
          actionCell.appendChild(selector);
        }
        else
        {
          var button = createElement('button', 'btn btn--ghost');
          button.type = 'button';
          button.textContent = context.actionLabel;
          button.addEventListener('click', (event) =>
          {
            event.preventDefault();
            context.onSelect(item);
          });
          row.addEventListener('click', (event) =>
          {
            event.preventDefault();
            context.onSelect(item);
          });
          actionCell.appendChild(button);
        }
        row.appendChild(actionCell);
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      container.appendChild(table);
    }

    open(options)
    {
      options = options || {};
      var elems = this.ensureElements();
      if (this.activeSession)
      {
        this.close('cancel');
      }
      var text = Object.assign({}, this.service.config.text, options.text || {});
      elems.title.textContent = options.title || text.modalTitle;
      elems.description.textContent = options.description || text.modalDescription;
      elems.searchInput.placeholder = options.searchPlaceholder || text.searchPlaceholder;

      var multiple = typeof options.multiple === 'boolean' ? options.multiple : this.service.config.multiple;
      var resolvedZIndex = this.resolveZIndex(options.zIndex);
      if (elems.modal)
      {
        if (resolvedZIndex === null)
        {
          elems.modal.style.removeProperty('z-index');
        }
        else
        {
          elems.modal.style.zIndex = String(resolvedZIndex);
        }
      }
      var resultLimit = typeof options.resultLimit === 'number' ? options.resultLimit : this.service.config.resultLimit;
      var emptyMessage = options.emptyMessage || text.emptyMessage;
      var loadingMessage = options.loadingMessage || text.loadingMessage;
      var errorMessage = options.errorMessage || text.errorMessage;
      var selectedIds = Array.isArray(options.selectedCodes) ? options.selectedCodes : [];
      var excludedIds = Array.isArray(options.excludeCodes) ? options.excludeCodes : [];
      var availableUsers = Array.isArray(options.availableUsers) ? options.availableUsers : null;
      var loadOptions = options.loadOptions || {};
      var initialKeyword = options.initialKeyword || '';

      if (USER_SELECT_MODAL_DEBUG)
      {
        window.console.log('[user-select-modal] open called', {
          fromOptions: {
            availableUsers: availableUsers ? availableUsers.length : 0,
            selectedIds: selectedIds.length,
            excludedIds: excludedIds.length,
            initialKeyword: initialKeyword,
            multiple: multiple,
            resultLimit: resultLimit
          }
        });
      }

      var selectedIdSet = new window.Set();
      selectedIds.forEach(function (value)
      {
        if (typeof value === 'string' && value.trim())
        {
          selectedIdSet.add(value.trim().toLowerCase());
        }
      });
      var excludedIdSet = new window.Set();
      excludedIds.forEach(function (value)
      {
        if (typeof value === 'string' && value.trim())
        {
          excludedIdSet.add(value.trim().toLowerCase());
        }
      });
      var selectedMap = new window.Map();

      var closeButtons = elems.closeButtons;
      var dialog = elems.dialog;
      var modal = elems.modal;
      var searchForm = elems.searchForm;
      var searchInput = elems.searchInput;
      var summary = elems.summary;
      var feedback = elems.feedback;
      var results = elems.results;
      var actions = elems.actions;
      var applyButton = elems.applyButton;
      var selectAllButton = elems.selectAllButton;
      var deselectAllButton = elems.deselectAllButton;
      var cancelButton = elems.cancelButton;

      if (applyButton)
      {
        applyButton.textContent = text.applyLabel;
      }
      if (cancelButton)
      {
        cancelButton.textContent = text.cancelLabel;
      }
      if (selectAllButton)
      {
        selectAllButton.textContent = text.selectAllLabel;
      }
      if (deselectAllButton)
      {
        deselectAllButton.textContent = text.deselectAllLabel;
      }

      var previousFocus = document.activeElement;
      var active = true;
      var items = [];
      var currentViewItems = [];

      var updateSummary = function (total, shown)
      {
        if (!summary)
        {
          return;
        }
        if (!total)
        {
          summary.textContent = '';
          return;
        }
        summary.textContent = '全' + formatNumber(total) + '件中 ' + formatNumber(shown) + '件を表示';
      };

      var updateApplyButtonState = function ()
      {
        if (!multiple || !applyButton)
        {
          return;
        }
        applyButton.disabled = selectedMap.size === 0;
      };

      var updateSelectAllButtonState = function ()
      {
        if (!multiple || !selectAllButton)
        {
          return;
        }
        selectAllButton.disabled = currentViewItems.length === 0;
      };

      var updateDeselectAllButtonState = function ()
      {
        if (!multiple || !deselectAllButton)
        {
          return;
        }
        deselectAllButton.disabled = selectedMap.size === 0;
      };

      var normalizeId = function (item)
      {
        if (!item)
        {
          return '';
        }
        var id = item.userCode || '';
        return id ? id.trim().toLowerCase() : '';
      };

      var hydrateSelection = function (list)
      {
        list.forEach(function (entry)
        {
          var id = normalizeId(entry);
          if (id && selectedIdSet.has(id))
          {
            selectedMap.set(id, entry);
          }
        });
        updateApplyButtonState();
        updateDeselectAllButtonState();
      };

      var renderContext = {
        multiple: multiple,
        emptyMessage: emptyMessage,
        actionLabel: text.actionLabel,
        singleActionHeader: text.singleActionHeader,
        multipleActionHeader: text.multipleActionHeader,
        isSelected: function (item)
        {
          var id = normalizeId(item);
          return !!(id && selectedIdSet.has(id));
        },
        toggleSelection: function (item, checked)
        {
          var id = normalizeId(item);
          if (!id)
          {
            return;
          }
          if (checked)
          {
            selectedIdSet.add(id);
            selectedMap.set(id, item);
          }
          else
          {
            selectedIdSet.delete(id);
            selectedMap.delete(id);
          }
          updateApplyButtonState();
          updateDeselectAllButtonState();
        },
        onSelect: function (item)
        {
          if (typeof options.onSelect === 'function')
          {
            options.onSelect(item);
          }
          close('select');
        }
      };

      var applyFilter = () =>
      {
        if (!active)
        {
          return;
        }
        var keyword = searchInput.value || '';
        var filtered = this.filterByKeyword(items, keyword);
        var limited = typeof resultLimit === 'number' ? filtered.slice(0, resultLimit) : filtered;
        currentViewItems = limited;
        this.renderTable(results, limited, renderContext);
        updateSummary(items.length, filtered.length);
        updateSelectAllButtonState();
      };

      var handleInput = () =>
      {
        applyFilter();
      };

      var handleSubmit = (event) =>
      {
        event.preventDefault();
        applyFilter();
      };

      var handleApply = (event) =>
      {
        event.preventDefault();
        if (!multiple)
        {
          return;
        }
        var selectedItems = Array.from(selectedMap.values());
        if (typeof options.onApply === 'function')
        {
          options.onApply(selectedItems);
        }
        close('apply');
      };

      var handleCancel = (event) =>
      {
        event.preventDefault();
        close('cancel');
      };

      var handleSelectAll = (event) =>
      {
        event.preventDefault();
        if (!multiple || !currentViewItems.length)
        {
          return;
        }
        currentViewItems.forEach(function (entry)
        {
          var id = normalizeId(entry);
          if (id)
          {
            selectedIdSet.add(id);
            selectedMap.set(id, entry);
          }
        });
        updateApplyButtonState();
        updateDeselectAllButtonState();
        applyFilter();
      };

      var handleDeselectAll = (event) =>
      {
        event.preventDefault();
        if (!multiple || !selectedMap.size)
        {
          return;
        }
        selectedIdSet.clear();
        selectedMap.clear();
        updateApplyButtonState();
        updateDeselectAllButtonState();
        applyFilter();
      };

      var handleClose = (event) =>
      {
        if (event)
        {
          event.preventDefault();
        }
        close('cancel');
      };

      var handleKeydown = (event) =>
      {
        if (event.key === 'Escape' || event.key === 'Esc' || event.keyCode === 27)
        {
          event.preventDefault();
          close('cancel');
        }
      };

      updateSelectAllButtonState();

      var cleanup = () =>
      {
        closeButtons.forEach(function (button)
        {
          button.removeEventListener('click', handleClose);
        });
        modal.removeEventListener('keydown', handleKeydown);
        searchInput.removeEventListener('input', handleInput);
        searchForm.removeEventListener('submit', handleSubmit);
        if (applyButton)
        {
          applyButton.removeEventListener('click', handleApply);
        }
        if (selectAllButton)
        {
          selectAllButton.removeEventListener('click', handleSelectAll);
        }
        if (deselectAllButton)
        {
          deselectAllButton.removeEventListener('click', handleDeselectAll);
        }
        if (cancelButton)
        {
          cancelButton.removeEventListener('click', handleCancel);
        }
        document.body.classList.remove('is-modal-open');
      };

      var close = (reason) =>
      {
        if (!active)
        {
          return;
        }
        active = false;
        cleanup();
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('hidden', 'hidden');
        dialog.removeAttribute('aria-busy');
        this.setFeedback(feedback, '', 'info');
        updateSummary(0, 0);
        results.innerHTML = '';
        if (previousFocus && typeof previousFocus.focus === 'function')
        {
          try
          {
            previousFocus.focus();
          }
          catch (error)
          {
            // ignore
          }
        }
        if (typeof options.onClose === 'function')
        {
          options.onClose(reason || 'cancel');
        }
        this.activeSession = null;
      };

      closeButtons.forEach(function (button)
      {
        button.addEventListener('click', handleClose);
      });
      modal.addEventListener('keydown', handleKeydown);
      searchInput.addEventListener('input', handleInput);
      searchForm.addEventListener('submit', handleSubmit);
      if (multiple)
      {
        actions.hidden = false;
        applyButton.disabled = true;
        applyButton.addEventListener('click', handleApply);
        if (selectAllButton)
        {
          selectAllButton.hidden = false;
          selectAllButton.disabled = true;
          selectAllButton.addEventListener('click', handleSelectAll);
        }
        if (deselectAllButton)
        {
          deselectAllButton.hidden = false;
          deselectAllButton.disabled = true;
          deselectAllButton.addEventListener('click', handleDeselectAll);
        }
        cancelButton.addEventListener('click', handleCancel);
      }
      else
      {
        actions.hidden = true;
        if (selectAllButton)
        {
          selectAllButton.hidden = true;
          selectAllButton.disabled = true;
        }
        if (deselectAllButton)
        {
          deselectAllButton.hidden = true;
          deselectAllButton.disabled = true;
        }
      }

      modal.removeAttribute('hidden');
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('is-open');
      document.body.classList.add('is-modal-open');
      dialog.setAttribute('aria-busy', 'true');
      searchInput.value = initialKeyword;
      results.innerHTML = '';
      updateSummary(0, 0);
      if (availableUsers)
      {
        this.setFeedback(feedback, '', 'info');
      }
      else
      {
        this.setFeedback(feedback, loadingMessage, 'loading');
      }

      var handleLoaded = (list) =>
      {
        if (!active)
        {
          return;
        }
        if (USER_SELECT_MODAL_DEBUG)
        {
          window.console.log('[user-select-modal] handleLoaded raw list', {
            rawLength: Array.isArray(list) ? list.length : 'n/a',
            hasAvailableUsers: !!availableUsers
          });
        }
        items = this.service.jobs.data.normalizeList(list).filter(function (entry)
        {
          return entry && entry.isActive !== false;
        });
        if (USER_SELECT_MODAL_DEBUG)
        {
          window.console.log('[user-select-modal] normalized available items', {
            total: items.length,
            excluded: excludedIdSet.size
          });
        }
        if (excludedIdSet.size)
        {
          items = items.filter(function (entry)
          {
            var id = normalizeId(entry);
            return !(id && excludedIdSet.has(id));
          });
        }
        if (USER_SELECT_MODAL_DEBUG)
        {
          window.console.log('[user-select-modal] items after exclusion', items.length);
        }
        hydrateSelection(items);
        dialog.removeAttribute('aria-busy');
        this.setFeedback(feedback, items.length ? '' : emptyMessage, 'info');
        applyFilter();
      };

      var handleError = (error) =>
      {
        if (!active)
        {
          return;
        }
        if (USER_SELECT_MODAL_DEBUG)
        {
          window.console.log('[user-select-modal] handleError', error);
        }
        dialog.removeAttribute('aria-busy');
        if (error && this.service.isSessionExpiredReason(error.code))
        {
          close('session-expired');
          return;
        }
        var message = error && error.message ? error.message : errorMessage;
        this.setFeedback(feedback, message, 'error');
        items = [];
        results.innerHTML = '';
        updateSummary(0, 0);
        currentViewItems = [];
        updateSelectAllButtonState();
      };

      if (availableUsers)
      {
        window.requestAnimationFrame(() =>
        {
          handleLoaded(availableUsers);
        });
      }
      else
      {
        this.service.jobs.data.getAllUsers(loadOptions)
          .then((list) =>
          {
            handleLoaded(list);
          })
          .catch((error) =>
          {
            handleError(error);
          });
      }

      window.requestAnimationFrame(() =>
      {
        try
        {
          searchInput.select();
          searchInput.focus();
        }
        catch (error)
        {
          searchInput.focus();
        }
      });

      this.activeSession = { close: close };
      return { close: close };
    }

    close(reason)
    {
      if (this.activeSession && typeof this.activeSession.close === 'function')
      {
        this.activeSession.close(reason || 'cancel');
      }
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.UserSelectModal || (Services.UserSelectModal = {});
  NS.JobModal = NS.JobModal || JobModal;

})(window, document);
