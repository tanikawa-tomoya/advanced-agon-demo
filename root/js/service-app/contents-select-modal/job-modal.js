(function ()
{
  'use strict';

  function createElement(tag, className)
  {
    var el = document.createElement(tag);
    if (className)
    {
      el.className = className;
    }
    return el;
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
      this.buttonService = this.service && this.service.buttonService;
      this.previewServicesPromise = null;
      this.videoModalService = null;
      this.imageModalService = null;
      this.pdfModalService = null;
      this.audioModalService = null;
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

    getElementZIndex(element)
    {
      if (!element)
      {
        return null;
      }
      var value = window.getComputedStyle(element).zIndex;
      var parsed = Number(value);
      if (typeof parsed === 'number' && !Number.isNaN(parsed))
      {
        return parsed;
      }
      return null;
    }

    getActiveModalZIndex()
    {
      var modals = document.querySelectorAll('.screen-modal.is-open');
      var maxZIndex = null;
      for (var i = 0; i < modals.length; i += 1)
      {
        var current = this.getElementZIndex(modals[i]);
        if (current === null)
        {
          continue;
        }
        if (maxZIndex === null || current > maxZIndex)
        {
          maxZIndex = current;
        }
      }
      return maxZIndex;
    }

    getButtonService()
    {
      if (!this.buttonService && window.Services && typeof window.Services.button === 'function')
      {
        this.buttonService = new window.Services.button();
        if (typeof this.buttonService.boot === 'function')
        {
          this.buttonService.boot();
        }
      }
      return this.buttonService;
    }

    formatBytes(value)
    {
      if (typeof value !== 'number' || value < 0 || !isFinite(value))
      {
        return '';
      }
      if (window.Utils && typeof window.Utils.formatBytes === 'function')
      {
        try
        {
          return window.Utils.formatBytes(value);
        }
        catch (error)
        {
          // ignore
        }
      }
      var units = ['B', 'KB', 'MB', 'GB', 'TB'];
      var size = value;
      var unitIndex = 0;
      while (size >= 1024 && unitIndex < units.length - 1)
      {
        size /= 1024;
        unitIndex += 1;
      }
      return size.toFixed(unitIndex ? 1 : 0) + units[unitIndex];
    }

    resolveSizeLabel(raw)
    {
      var source = raw || {};
      var size = source.size || source.fileSize || source.length || source.bytes;
      if (typeof size === 'string' && size.trim())
      {
        var parsed = Number(size);
        if (!Number.isNaN(parsed))
        {
          size = parsed;
        }
      }
      if (typeof size === 'number' && size >= 0)
      {
        return this.formatBytes(size);
      }
      return '';
    }

    resolveKindLabel(kind)
    {
      var map = {
        movie: '動画',
        image: '画像',
        audio: '音声',
        pdf: 'PDF',
        file: 'ファイル'
      };
      return map[kind] || 'コンテンツ';
    }

    buildMetaText(item)
    {
      var metaParts = [];
      var kindLabel = this.resolveKindLabel(item.kind);
      var sizeLabel = this.resolveSizeLabel(item.raw);
      if (kindLabel)
      {
        metaParts.push(kindLabel);
      }
      if (sizeLabel)
      {
        metaParts.push(sizeLabel);
      }
      if (item.updatedAtLabel)
      {
        metaParts.push(item.updatedAtLabel);
      }
      return metaParts.join(' / ');
    }

    resolveDurationLabel(item)
    {
      if (!item || item.kind !== 'movie')
      {
        return '';
      }
      var label = item.durationLabel || '';
      if (!label && item.raw && item.raw.durationLabel)
      {
        label = String(item.raw.durationLabel);
      }
      return label;
    }

    resolveFileName(item)
    {
      if (!item)
      {
        return '';
      }
      var raw = item.raw || {};
      return item.fileName || raw.fileName || raw.name || '';
    }

    createBadgeElement(kind)
    {
      var badge = createElement('span', 'contents-select-modal__badge');
      var kindKey = (kind || 'content').toLowerCase();
      badge.textContent = this.resolveKindLabel(kindKey);
      badge.dataset.kind = kindKey;
      return badge;
    }

    createDurationBadge(label)
    {
      var badge = createElement('span', 'contents-select-modal__duration');
      badge.textContent = label;
      return badge;
    }

    createGuidanceBadge(kind)
    {
      var kindKey = (kind || 'content').toLowerCase();
      var badge = createElement('span', 'target-detail__guidance-type-badge');
      badge.className += ' target-detail__guidance-type-badge--' + kindKey;
      badge.textContent = this.resolveKindLabel(kindKey);
      return badge;
    }

    createEmbossPlaceholder()
    {
      var host = createElement('div', 'contents-select-modal__thumb-emboss target-detail__guidance-thumb-emboss-host');
      var emboss = createElement('div', 'target-detail__guidance-thumb-emboss');
      var corner = createElement('span', 'target-detail__guidance-thumb-emboss-corner');
      emboss.appendChild(corner);
      host.appendChild(emboss);
      return host;
    }

    createThumbnail(item)
    {
      var wrapper = createElement('div', 'contents-select-modal__thumb');
      var media = createElement('div', 'contents-select-modal__thumb-media');
      var kindKey = (item && item.kind ? item.kind : '').toLowerCase();
      var requiresEmboss = kindKey === 'pdf' || kindKey === 'file';
      if (requiresEmboss)
      {
        media.classList.add('contents-select-modal__thumb-media--emboss');
        media.appendChild(this.createGuidanceBadge(kindKey || 'file'));
      }
      else
      {
        var badge = this.createBadgeElement(item.kind);
        media.appendChild(badge);
      }
      if (item.thumbnailUrl && !requiresEmboss)
      {
        var img = document.createElement('img');
        img.src = item.thumbnailUrl;
        img.alt = item.title || 'コンテンツサムネイル';
        img.loading = 'lazy';
        media.appendChild(img);
      }
      else if (requiresEmboss)
      {
        var embossPlaceholder = this.createEmbossPlaceholder();
        media.appendChild(embossPlaceholder);
      }
      else
      {
        var placeholder = createElement('div', 'contents-select-modal__thumb-placeholder');
        placeholder.textContent = this.resolveKindLabel(item.kind);
        media.appendChild(placeholder);
      }
      var durationLabel = this.resolveDurationLabel(item);
      if (durationLabel)
      {
        media.appendChild(this.createDurationBadge(durationLabel));
      }
      wrapper.appendChild(media);
      return wrapper;
    }

    async ensurePreviewServices()
    {
      if (this.previewServicesPromise)
      {
        return this.previewServicesPromise;
      }

      var cfg = (this.service && typeof this.service.getApiConfig === 'function')
        ? this.service.getApiConfig('ContentVideoGet')
        : (this.service && this.service.config ? this.service.config : {});
      var apiOptions = {
        requestType: cfg.requestType || 'Contents',
        apiEndpoint: cfg.endpoint || '',
        apiToken: cfg.token || ''
      };

      this.previewServicesPromise = window.Utils.loadScriptsSync([
        'js/service-app/video-modal/main.js',
        'js/service-app/image-modal/main.js',
        'js/service-app/pdf-modal/main.js',
        'js/service-app/audio-modal/main.js'
      ])
        .then(() =>
        {
          this.videoModalService = new window.Services.VideoModal({ api: apiOptions });
          this.imageModalService = new window.Services.ImageModal();
          this.pdfModalService = new window.Services.PdfModal({ showDownload: true, showOpenInNewTab: true });
          this.audioModalService = new window.Services.AudioModal();
          return Promise.all([
            this.videoModalService.boot(),
            this.imageModalService.boot(),
            this.pdfModalService.boot(),
            this.audioModalService.boot()
          ]);
        })
        .catch((error) =>
        {
          this.previewServicesPromise = null;
          throw error;
        });

      return this.previewServicesPromise;
    }

    resolvePreviewImageUrl(item)
    {
      var dataJob = this.service && this.service.jobs ? this.service.jobs.data : null;
      var record = item && item.raw ? item.raw : null;
      var imageUrl = '';

      if (dataJob && typeof dataJob.buildContentImageUrl === 'function')
      {
        imageUrl = dataJob.buildContentImageUrl(record || item, { variant: 'thumbnail' });
      }

      if (!imageUrl && item && item.fileUrl)
      {
        imageUrl = item.fileUrl;
      }

      if (!imageUrl && item && item.thumbnailUrl)
      {
        imageUrl = item.thumbnailUrl;
      }

      return imageUrl;
    }

    resolvePreviewFileUrl(item)
    {
      var dataJob = this.service && this.service.jobs ? this.service.jobs.data : null;
      var record = item && item.raw ? item.raw : null;
      var fileUrl = item && item.fileUrl ? item.fileUrl : '';

      if (!fileUrl && dataJob && typeof dataJob.buildContentFileUrl === 'function')
      {
        fileUrl = dataJob.buildContentFileUrl(record || item);
      }

      return fileUrl;
    }

    async openPreviewModal(item)
    {
      if (!item)
      {
        return;
      }

      var text = this.service.config.text || {};
      try
      {
        await this.ensurePreviewServices();
      }
      catch (error)
      {
        window.console.error('[contents-select-modal] failed to prepare preview services', error);
        return;
      }

      var kind = (item.kind || '').toLowerCase();
      var record = item.raw || {};

      if ((kind === 'movie' || kind === 'video') && this.videoModalService && typeof this.videoModalService.openContentVideo === 'function')
      {
        var contentCode = record.contentCode || record.content_code || record.contentId || record.contentID;
        var spec = {
          contentCode: contentCode,
          quality: '',
          title: item.title || '',
          contentRecord: record || null
        };

        var openedVideo = false;

        if (contentCode)
        {
          try
          {
            await this.videoModalService.openContentVideo(spec, { autoplay: false });
          }
          catch (error)
          {
            window.console.error('[contents-select-modal] failed to open video preview', error);
          }
          openedVideo = true;
        }

        var videoUrl = this.resolvePreviewFileUrl(item);
        if (videoUrl)
        {
          try
          {
            this.videoModalService.openHtml5(videoUrl, { title: item.title || '', autoplay: false });
          }
          catch (error)
          {
            window.console.error('[contents-select-modal] failed to open video url preview', error);
          }
          openedVideo = true;
        }
        if (!openedVideo)
        {
          this.service.toastService.error(text.previewUnavailableMessage);
        }
        return;
      }

      if (kind === 'image' && this.imageModalService && typeof this.imageModalService.show === 'function')
      {
        var imageUrl = this.resolvePreviewImageUrl(item);
        var openedImage = false;
        if (imageUrl)
        {
          try
          {
            this.imageModalService.show(imageUrl, { alt: item.title || '', caption: item.title || '' });
          }
          catch (error)
          {
            window.console.error('[contents-select-modal] failed to open image preview', error);
          }
          openedImage = true;
        }
        if (!openedImage)
        {
          this.service.toastService.error(text.previewUnavailableMessage);
        }
        return;
      }

      if (kind === 'pdf' && this.pdfModalService && typeof this.pdfModalService.show === 'function')
      {
        var pdfUrl = this.resolvePreviewFileUrl(item);
        var openedPdf = false;
        if (pdfUrl)
        {
          try
          {
            this.pdfModalService.show({
              title: item.title || 'PDF',
              src: pdfUrl,
              ariaLabel: item.title || 'PDF',
              showDownload: true,
              showOpenInNewTab: true
            });
          }
          catch (error)
          {
            window.console.error('[contents-select-modal] failed to open pdf preview', error);
          }
          openedPdf = true;
        }
        if (!openedPdf)
        {
          this.service.toastService.error(text.previewUnavailableMessage);
        }
        return;
      }

      if (kind === 'audio' && this.audioModalService && typeof this.audioModalService.show === 'function')
      {
        var audioUrl = this.resolvePreviewFileUrl(item);
        var openedAudio = false;
        if (audioUrl)
        {
          try
          {
            this.audioModalService.show(audioUrl, { title: item.title || '', autoplay: false });
          }
          catch (error)
          {
            window.console.error('[contents-select-modal] failed to open audio preview', error);
          }
          openedAudio = true;
        }
        if (!openedAudio)
        {
          this.service.toastService.error(text.previewUnavailableMessage);
        }
        return;
      }

      this.service.toastService.error(text.previewUnsupportedMessage);
    }

    buildContentInfo(item)
    {
      var container = createElement('div', 'contents-select-modal__info');
      var title = createElement('div', 'contents-select-modal__info-title');
      title.textContent = item.title || '-';
      var meta = createElement('div', 'contents-select-modal__info-meta');
      meta.textContent = this.buildMetaText(item);
      container.appendChild(title);
      container.appendChild(meta);
      var fileName = this.resolveFileName(item);
      if (fileName)
      {
        var name = createElement('div', 'contents-select-modal__info-name');
        name.textContent = fileName;
        container.appendChild(name);
      }
      if (item.description)
      {
        var desc = createElement('div', 'contents-select-modal__info-desc');
        desc.textContent = item.description;
        container.appendChild(desc);
      }
      return container;
    }

    ensureElements()
    {
      if (this.elements)
      {
        return this.elements;
      }
      var text = this.service.config.text;
      var modal = createElement('div', 'screen-modal contents-select-modal');
      modal.setAttribute('aria-hidden', 'true');
      modal.setAttribute('hidden', 'hidden');
      modal.dataset.modal = 'contents-select-modal';

      var overlay = createElement('div', 'screen-modal__overlay');
      overlay.setAttribute('data-modal-close', 'true');
      modal.appendChild(overlay);

      var dialog = createElement('section', 'screen-modal__content contents-select-modal__dialog');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-labelledby', 'contents-select-modal-title');

      var closeButton = createElement('button', 'screen-modal__close');
      closeButton.type = 'button';
      closeButton.setAttribute('data-modal-close', 'true');
      closeButton.setAttribute('aria-label', 'モーダルを閉じる');
      closeButton.textContent = '×';
      dialog.appendChild(closeButton);

      var header = createElement('header', 'screen-modal__header contents-select-modal__header');
      var titleWrap = createElement('div', 'contents-select-modal__titles');
      var title = createElement('h2', 'screen-modal__title');
      title.id = 'contents-select-modal-title';
      title.textContent = text.modalTitle;
      titleWrap.appendChild(title);
      if (text.modalDescription)
      {
        var description = createElement('p', 'screen-modal__summary');
        description.id = 'contents-select-modal-summary';
        description.textContent = text.modalDescription;
        titleWrap.appendChild(description);
        dialog.setAttribute('aria-describedby', 'contents-select-modal-summary');
      }
      header.appendChild(titleWrap);

      var viewToggle = createElement('div', 'contents-select-modal__view-toggle');
      var listToggle = createElement('button', 'contents-select-modal__toggle is-active');
      listToggle.type = 'button';
      listToggle.setAttribute('data-view', 'list');
      listToggle.textContent = text.viewListLabel;
      var panelToggle = createElement('button', 'contents-select-modal__toggle');
      panelToggle.type = 'button';
      panelToggle.setAttribute('data-view', 'panel');
      panelToggle.textContent = text.viewPanelLabel;
      viewToggle.appendChild(listToggle);
      viewToggle.appendChild(panelToggle);
      header.appendChild(viewToggle);

      dialog.appendChild(header);

      var body = createElement('div', 'screen-modal__body contents-select-modal__body');

      var controls = createElement('div', 'contents-select-modal__controls');
      var form = createElement('form', 'contents-select-modal__filters');
      form.setAttribute('role', 'search');
      var keywordWrap = createElement('label', 'contents-select-modal__field');
      var keywordTitle = createElement('span', 'contents-select-modal__label');
      keywordTitle.textContent = text.keywordLabel;
      var keywordInput = document.createElement('input');
      keywordInput.type = 'search';
      keywordInput.className = 'contents-select-modal__input';
      keywordInput.placeholder = text.searchPlaceholder;
      keywordInput.setAttribute('aria-label', text.keywordLabel);
      keywordWrap.appendChild(keywordTitle);
      keywordWrap.appendChild(keywordInput);

      var createdWrap = createElement('div', 'contents-select-modal__field contents-select-modal__field--range');
      var createdTitle = createElement('span', 'contents-select-modal__label');
      createdTitle.textContent = text.createdAtLabel;
      var createdRange = createElement('div', 'contents-select-modal__range');
      var createdFromInput = document.createElement('input');
      createdFromInput.type = 'date';
      createdFromInput.className = 'contents-select-modal__input contents-select-modal__input--date';
      createdFromInput.setAttribute('aria-label', text.createdFromLabel || text.createdAtLabel);
      var createdSeparator = createElement('span', 'contents-select-modal__range-separator');
      createdSeparator.textContent = text.createdRangeSeparator || '～';
      var createdToInput = document.createElement('input');
      createdToInput.type = 'date';
      createdToInput.className = 'contents-select-modal__input contents-select-modal__input--date';
      createdToInput.setAttribute('aria-label', text.createdToLabel || text.createdAtLabel);
      createdRange.appendChild(createdFromInput);
      createdRange.appendChild(createdSeparator);
      createdRange.appendChild(createdToInput);
      createdWrap.appendChild(createdTitle);
      createdWrap.appendChild(createdRange);

      var kindWrap = createElement('label', 'contents-select-modal__field');
      var kindTitle = createElement('span', 'contents-select-modal__label');
      kindTitle.textContent = text.kindLabel;
      var kindSelect = document.createElement('select');
      kindSelect.className = 'contents-select-modal__input';
      kindSelect.setAttribute('data-filter-kind', 'true');
      kindWrap.appendChild(kindTitle);
      kindWrap.appendChild(kindSelect);

      form.appendChild(keywordWrap);
      form.appendChild(createdWrap);
      form.appendChild(kindWrap);

      var feedback = createElement('div', 'contents-select-modal__feedback');
      feedback.setAttribute('role', 'status');
      feedback.setAttribute('aria-live', 'polite');
      feedback.hidden = true;

      controls.appendChild(form);
      controls.appendChild(feedback);
      body.appendChild(controls);

      var results = createElement('div', 'contents-select-modal__results');
      var listView = createElement('div', 'contents-select-modal__list is-active');
      listView.setAttribute('data-view-mode', 'list');
      var panelView = createElement('div', 'contents-select-modal__panels');
      panelView.setAttribute('data-view-mode', 'panel');
      results.appendChild(listView);
      results.appendChild(panelView);
      body.appendChild(results);

      dialog.appendChild(body);

      var footer = createElement('footer', 'screen-modal__footer contents-select-modal__footer');
      footer.setAttribute('data-actions', 'true');
      footer.hidden = true;
      var selectAllButton = createElement('button', 'btn btn--ghost');
      selectAllButton.type = 'button';
      selectAllButton.setAttribute('data-action', 'select-all');
      selectAllButton.textContent = text.selectAllLabel;
      var deselectAllButton = createElement('button', 'btn btn--ghost');
      deselectAllButton.type = 'button';
      deselectAllButton.setAttribute('data-action', 'deselect-all');
      deselectAllButton.textContent = text.deselectAllLabel;
      var applyButton = createElement('button', 'btn btn--primary');
      applyButton.type = 'button';
      applyButton.setAttribute('data-action', 'apply');
      applyButton.textContent = text.applyLabel;
      var cancelButton = createElement('button', 'btn btn--ghost');
      cancelButton.type = 'button';
      cancelButton.setAttribute('data-action', 'cancel');
      cancelButton.textContent = text.cancelLabel;
      footer.appendChild(selectAllButton);
      footer.appendChild(deselectAllButton);
      footer.appendChild(applyButton);
      footer.appendChild(cancelButton);

      dialog.appendChild(footer);
      modal.appendChild(dialog);

      this.elements = {
        modal: modal,
        dialog: dialog,
        overlay: overlay,
        closeButton: closeButton,
        listToggle: listToggle,
        panelToggle: panelToggle,
        keywordInput: keywordInput,
        createdFromInput: createdFromInput,
        createdToInput: createdToInput,
        kindSelect: kindSelect,
        feedback: feedback,
        listView: listView,
        panelView: panelView,
        footer: footer,
        applyButton: applyButton,
        selectAllButton: selectAllButton,
        deselectAllButton: deselectAllButton,
        cancelButton: cancelButton
      };

      document.body.appendChild(modal);
      return this.elements;
    }

    setFeedback(feedback, message, type)
    {
      if (!feedback)
      {
        return;
      }
      feedback.textContent = message || '';
      feedback.hidden = !message;
      feedback.dataset.type = type || 'info';
    }

    setViewMode(mode)
    {
      if (!this.elements)
      {
        return;
      }
      var listMode = this.elements.listView;
      var panelMode = this.elements.panelView;
      var listToggle = this.elements.listToggle;
      var panelToggle = this.elements.panelToggle;
      if (mode === 'panel')
      {
        listMode.classList.remove('is-active');
        panelMode.classList.add('is-active');
        listToggle.classList.remove('is-active');
        panelToggle.classList.add('is-active');
      }
      else
      {
        listMode.classList.add('is-active');
        panelMode.classList.remove('is-active');
        listToggle.classList.add('is-active');
        panelToggle.classList.remove('is-active');
      }
    }

    createKindOptions(select, kinds)
    {
      if (!select)
      {
        return;
      }
      select.innerHTML = '';
      var allOption = document.createElement('option');
      allOption.value = '';
      allOption.textContent = 'すべて';
      select.appendChild(allOption);
      for (var i = 0; i < kinds.length; i += 1)
      {
        var option = document.createElement('option');
        option.value = kinds[i];
        option.textContent = kinds[i];
        select.appendChild(option);
      }
    }

    renderList(container, items, context)
    {
      if (!container)
      {
        return;
      }
      var buttonService = this.getButtonService();
      container.innerHTML = '';
      if (!items.length)
      {
        var empty = createElement('p', 'contents-select-modal__empty');
        empty.textContent = context.emptyMessage;
        container.appendChild(empty);
        return;
      }
      var table = createElement('table', 'contents-select-modal__table');
      var thead = document.createElement('thead');
      var headRow = document.createElement('tr');
      var columns = ['サムネイル', 'コンテンツ情報', '更新日', '操作'];
      for (var i = 0; i < columns.length; i += 1)
      {
        var th = document.createElement('th');
        th.textContent = columns[i];
        headRow.appendChild(th);
      }
      thead.appendChild(headRow);
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      for (var j = 0; j < items.length; j += 1)
      {
        var item = items[j];
        var tr = document.createElement('tr');
        tr.dataset.contentId = item.id;
        if (context.isSelected(item))
        {
          tr.classList.add('is-selected');
        }
        var thumbCell = document.createElement('td');
        thumbCell.className = 'contents-select-modal__thumb-cell';
        thumbCell.appendChild(this.createThumbnail(item));
        tr.appendChild(thumbCell);

        var infoCell = document.createElement('td');
        infoCell.appendChild(this.buildContentInfo(item));
        tr.appendChild(infoCell);

        var updatedCell = document.createElement('td');
        updatedCell.textContent = item.updatedAtLabel || '';
        tr.appendChild(updatedCell);

        var actionCell = document.createElement('td');
        actionCell.className = 'contents-select-modal__actions';
        var previewButton = buttonService.createActionButton('preview', {
          srLabel: context.previewLabel,
          hoverLabel: context.previewLabel,
          ariaLabel: context.previewLabel + ' ' + (item.title || ''),
          baseClass: 'table-action-button'
        });
        previewButton.addEventListener('click', (function (entry)
        {
          return function (event)
          {
            event.preventDefault();
            context.onPreview(entry);
          };
        })(item));
        var selectButton = buttonService.createActionButton('select', {
          srLabel: context.actionLabel,
          hoverLabel: context.actionLabel,
          ariaLabel: context.actionLabel + ' ' + (item.title || ''),
          baseClass: 'table-action-button'
        });
        selectButton.addEventListener('click', (function (entry)
        {
          return function (event)
          {
            event.preventDefault();
            context.onSelect(entry);
          };
        })(item));
        actionCell.appendChild(previewButton);
        actionCell.appendChild(selectButton);
        tr.appendChild(actionCell);

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      container.appendChild(table);
    }

    renderPanels(container, items, context)
    {
      if (!container)
      {
        return;
      }
      var buttonService = this.getButtonService();
      container.innerHTML = '';
      if (!items.length)
      {
        var empty = createElement('p', 'contents-select-modal__empty');
        empty.textContent = context.emptyMessage;
        container.appendChild(empty);
        return;
      }
      for (var i = 0; i < items.length; i += 1)
      {
        var item = items[i];
        var card = createElement('article', 'contents-select-modal__card');
        if (context.isSelected(item))
        {
          card.classList.add('is-selected');
        }
        var media = createElement('div', 'contents-select-modal__card-media');
        media.appendChild(this.createBadgeElement(item.kind));
        if (item.thumbnailUrl)
        {
          var img = document.createElement('img');
          img.src = item.thumbnailUrl;
          img.alt = item.title || 'コンテンツプレビュー';
          img.loading = 'lazy';
          media.appendChild(img);
        }
        else
        {
          var placeholder = createElement('div', 'contents-select-modal__card-placeholder');
          placeholder.textContent = this.resolveKindLabel(item.kind);
          media.appendChild(placeholder);
        }
        var durationLabel = this.resolveDurationLabel(item);
        if (durationLabel)
        {
          media.appendChild(this.createDurationBadge(durationLabel));
        }
        card.appendChild(media);

        var body = createElement('div', 'contents-select-modal__card-body');
        var title = createElement('h3', 'contents-select-modal__card-title');
        title.textContent = item.title || '-';
        var meta = createElement('p', 'contents-select-modal__card-meta');
        meta.textContent = this.buildMetaText(item);
        var fileName = this.resolveFileName(item);
        var name = fileName ? createElement('p', 'contents-select-modal__card-name') : null;
        if (name)
        {
          name.textContent = fileName;
        }
        var desc = createElement('p', 'contents-select-modal__card-desc');
        desc.textContent = item.description || '';
        body.appendChild(title);
        body.appendChild(meta);
        if (name)
        {
          body.appendChild(name);
        }
        body.appendChild(desc);

        var actions = createElement('div', 'contents-select-modal__card-actions');
        if (context.multiple)
        {
          var toggle = buttonService.createActionButton('select', {
            srLabel: context.isSelected(item) ? '選択解除' : context.actionLabel,
            hoverLabel: context.isSelected(item) ? '選択解除' : context.actionLabel,
            ariaLabel: (context.isSelected(item) ? '選択解除' : context.actionLabel) + ' ' + (item.title || ''),
            baseClass: 'table-action-button'
          });
          toggle.addEventListener('click', (function (entry)
          {
            return function (event)
            {
              event.preventDefault();
              var willSelect = !context.isSelected(entry);
              context.toggleSelection(entry, willSelect);
            };
          })(item));
          actions.appendChild(toggle);
        }
        var previewButton = buttonService.createActionButton('preview', {
          srLabel: context.previewLabel,
          hoverLabel: context.previewLabel,
          ariaLabel: context.previewLabel + ' ' + (item.title || ''),
          baseClass: 'table-action-button'
        });
        previewButton.addEventListener('click', (function (entry)
        {
          return function (event)
          {
            event.preventDefault();
            context.onPreview(entry);
          };
        })(item));
        var selectButton = buttonService.createActionButton('select', {
          srLabel: context.actionLabel,
          hoverLabel: context.actionLabel,
          ariaLabel: context.actionLabel + ' ' + (item.title || ''),
          baseClass: 'table-action-button'
        });
        selectButton.addEventListener('click', (function (entry)
        {
          return function (event)
          {
            event.preventDefault();
            context.onSelect(entry);
          };
        })(item));
        actions.appendChild(previewButton);
        actions.appendChild(selectButton);
        body.appendChild(actions);

        card.appendChild(body);
        container.appendChild(card);
      }
    }

    updateSummary(feedback, total, shown)
    {
      if (!feedback)
      {
        return;
      }
      if (!total)
      {
        this.setFeedback(feedback, '', 'info');
        return;
      }
      var message = '全' + formatNumber(total) + '件中 ' + formatNumber(shown) + '件を表示';
      this.setFeedback(feedback, message, 'info');
    }

    open(options)
    {
      var elements = this.ensureElements();
      var text = this.service.config.text;
      var modal = elements.modal;
      var dialog = elements.dialog;
      var keywordInput = elements.keywordInput;
      var createdFromInput = elements.createdFromInput;
      var createdToInput = elements.createdToInput;
      var kindSelect = elements.kindSelect;
      var feedback = elements.feedback;
      var listView = elements.listView;
      var panelView = elements.panelView;
      var footer = elements.footer;
      var applyButton = elements.applyButton;
      var cancelButton = elements.cancelButton;
      var selectAllButton = elements.selectAllButton;
      var deselectAllButton = elements.deselectAllButton;
      var listToggle = elements.listToggle;
      var panelToggle = elements.panelToggle;
      var closeButtons = [elements.closeButton, elements.overlay];

      var multiple = typeof options.multiple === 'boolean' ? options.multiple : this.service.config.multiple;
      var viewMode = options.viewMode === 'panel' ? 'panel' : 'list';
      var selectedMap = new Map();
      var selectedIdSet = new Set();
      var active = true;
      var items = [];
      var filteredItems = [];
      var ownerParams = options.ownerParams || {};
      var ownerUserId = ownerParams.userId || options.userId || '';
      var ownerUserCode = ownerParams.userCode || options.userCode || options.owner || '';
      if (ownerUserId)
      {
        ownerUserId = String(ownerUserId).trim();
      }
      if (ownerUserCode)
      {
        ownerUserCode = String(ownerUserCode).trim();
      }

      if (Array.isArray(options.selected))
      {
        options.selected.forEach(function (entry)
        {
          if (entry && entry.id)
          {
            selectedIdSet.add(String(entry.id));
            selectedMap.set(String(entry.id), entry);
          }
        });
      }

      this.setViewMode(viewMode);

      var updateApplyState = () =>
      {
        if (!multiple)
        {
          return;
        }
        var hasSelection = selectedMap.size > 0;
        applyButton.disabled = !hasSelection;
        deselectAllButton.disabled = !hasSelection;
      };

      var updateSelectAllState = () =>
      {
        if (!multiple)
        {
          return;
        }
        selectAllButton.disabled = filteredItems.length === 0;
      };

      var renderContext = {
        multiple: multiple,
        emptyMessage: text.emptyMessage,
        actionLabel: text.actionLabel,
        previewLabel: text.previewLabel,
        onSelect: (item) =>
        {
          if (multiple)
          {
            var id = item && item.id;
            if (!id)
            {
              return;
            }
            var willSelect = !selectedIdSet.has(id);
            if (willSelect)
            {
              selectedIdSet.add(id);
              selectedMap.set(id, item);
            }
            else
            {
              selectedIdSet.delete(id);
              selectedMap.delete(id);
            }
            updateApplyState();
            this.renderPanels(panelView, filteredItems, renderContext);
            this.renderList(listView, filteredItems, renderContext);
            return;
          }
          if (typeof options.onSelect === 'function')
          {
            options.onSelect(item);
          }
          close('select', [item]);
        },
        onPreview: (item) =>
        {
          this.openPreviewModal(item);
        },
        isSelected: function (entry)
        {
          return entry && entry.id && selectedIdSet.has(entry.id);
        },
        toggleSelection: (item, checked) =>
        {
          if (!item || !item.id)
          {
            return;
          }
          if (checked)
          {
            selectedIdSet.add(item.id);
            selectedMap.set(item.id, item);
          }
          else
          {
            selectedIdSet.delete(item.id);
            selectedMap.delete(item.id);
          }
          updateApplyState();
          this.renderPanels(panelView, filteredItems, renderContext);
          this.renderList(listView, filteredItems, renderContext);
        }
      };

      var applyFilter = () =>
      {
        var keyword = keywordInput.value || '';
        var kind = kindSelect.value || '';
        var createdFrom = createdFromInput.value || '';
        var createdTo = createdToInput.value || '';
        filteredItems = this.service.jobs.data.filterList(items, {
          keyword: keyword,
          kind: kind,
          createdFrom: createdFrom,
          createdTo: createdTo
        });
        var limited = typeof this.service.config.resultLimit === 'number'
          ? filteredItems.slice(0, this.service.config.resultLimit)
          : filteredItems;
        filteredItems = limited;
        this.renderList(listView, filteredItems, renderContext);
        this.renderPanels(panelView, filteredItems, renderContext);
        updateApplyState();
        updateSelectAllState();
        this.updateSummary(feedback, items.length, filteredItems.length);
      };

      var handleSubmit = (event) =>
      {
        event.preventDefault();
        applyFilter();
      };

      var handleInput = () =>
      {
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
        if (!selectedItems.length)
        {
          this.service.toastService.error(text.emptySelectionMessage);
          return;
        }
        if (typeof options.onApply === 'function')
        {
          options.onApply(selectedItems);
        }
        close('apply', selectedItems);
      };

      var handleCancel = (event) =>
      {
        event.preventDefault();
        close('cancel');
      };

      var handleSelectAll = (event) =>
      {
        event.preventDefault();
        if (!multiple || !filteredItems.length)
        {
          return;
        }
        filteredItems.forEach(function (entry)
        {
          if (entry && entry.id)
          {
            selectedIdSet.add(entry.id);
            selectedMap.set(entry.id, entry);
          }
        });
        updateApplyState();
        updateSelectAllState();
        this.renderPanels(panelView, filteredItems, renderContext);
        this.renderList(listView, filteredItems, renderContext);
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
        updateApplyState();
        updateSelectAllState();
        this.renderPanels(panelView, filteredItems, renderContext);
        this.renderList(listView, filteredItems, renderContext);
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

      var handleViewToggle = (event) =>
      {
        var target = event.currentTarget;
        var mode = target && target.getAttribute('data-view');
        if (mode)
        {
          viewMode = mode;
          this.setViewMode(viewMode);
        }
      };

      var cleanup = () =>
      {
        keywordInput.removeEventListener('input', handleInput);
        createdFromInput.removeEventListener('change', handleInput);
        createdToInput.removeEventListener('change', handleInput);
        kindSelect.removeEventListener('change', handleInput);
        listToggle.removeEventListener('click', handleViewToggle);
        panelToggle.removeEventListener('click', handleViewToggle);
        if (footer)
        {
          footer.hidden = true;
        }
        if (applyButton)
        {
          applyButton.removeEventListener('click', handleApply);
          applyButton.disabled = false;
        }
        if (cancelButton)
        {
          cancelButton.removeEventListener('click', handleCancel);
        }
        if (selectAllButton)
        {
          selectAllButton.removeEventListener('click', handleSelectAll);
        }
        if (deselectAllButton)
        {
          deselectAllButton.removeEventListener('click', handleDeselectAll);
        }
        closeButtons.forEach(function (btn)
        {
          if (btn)
          {
            btn.removeEventListener('click', handleClose);
          }
        });
        modal.removeEventListener('keydown', handleKeydown);
        this.setFeedback(feedback, '', 'info');
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('hidden', 'hidden');
        document.body.classList.remove('is-modal-open');
      };

      var close = (reason, payload) =>
      {
        if (!active)
        {
          return;
        }
        active = false;
        cleanup();
        if (typeof options.onClose === 'function')
        {
          options.onClose(reason || 'cancel', payload);
        }
        this.activeSession = null;
      };

      closeButtons.forEach(function (btn)
      {
        if (btn)
        {
          btn.addEventListener('click', handleClose);
        }
      });
      modal.addEventListener('keydown', handleKeydown);
      keywordInput.addEventListener('input', handleInput);
      createdFromInput.addEventListener('change', handleInput);
      createdToInput.addEventListener('change', handleInput);
      kindSelect.addEventListener('change', handleInput);
      listToggle.addEventListener('click', handleViewToggle);
      panelToggle.addEventListener('click', handleViewToggle);

      if (multiple)
      {
        footer.hidden = false;
        applyButton.disabled = true;
        applyButton.addEventListener('click', handleApply);
        cancelButton.addEventListener('click', handleCancel);
        selectAllButton.hidden = false;
        deselectAllButton.hidden = false;
        selectAllButton.addEventListener('click', handleSelectAll);
        deselectAllButton.addEventListener('click', handleDeselectAll);
      }
      else
      {
        footer.hidden = true;
        selectAllButton.hidden = true;
        deselectAllButton.hidden = true;
      }

      modal.removeAttribute('hidden');
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('is-open');
      document.body.classList.add('is-modal-open');
      dialog.setAttribute('aria-busy', 'true');
      keywordInput.value = options.keyword || '';
      createdFromInput.value = options.createdFrom || '';
      createdToInput.value = options.createdTo || '';
      kindSelect.value = options.kind || '';
      this.setFeedback(feedback, text.loadingMessage, 'loading');

      var handleLoaded = (list) =>
      {
        if (!active)
        {
          return;
        }
        items = this.service.jobs.data.filterList(
          this.service.jobs.data.normalizeList(list),
          {}
        );
        var kinds = this.service.jobs.data.collectKinds(items);
        this.createKindOptions(kindSelect, kinds);
        if (options.kind)
        {
          kindSelect.value = options.kind;
        }
        applyFilter();
        dialog.removeAttribute('aria-busy');
        if (!items.length)
        {
          this.setFeedback(feedback, text.emptyMessage, 'info');
        }
      };

      var handleError = (error) =>
      {
        if (!active)
        {
          return;
        }
        dialog.removeAttribute('aria-busy');
        var message = error && error.message ? error.message : text.errorMessage;
        this.setFeedback(feedback, message, 'error');
        items = [];
        filteredItems = [];
        this.renderList(listView, filteredItems, renderContext);
        this.renderPanels(panelView, filteredItems, renderContext);
      };

      var zIndex = this.resolveZIndex(options.zIndex);
      var baseZIndex = this.getElementZIndex(modal);
      var activeZIndex = this.getActiveModalZIndex();
      if (activeZIndex !== null)
      {
        var raisedZIndex = activeZIndex + 10;
        if (zIndex === null || zIndex <= activeZIndex)
        {
          zIndex = raisedZIndex;
        }
      }
      if (zIndex === null)
      {
        zIndex = baseZIndex;
      }
      if (zIndex !== null)
      {
        modal.style.zIndex = String(zIndex);
      }
      else
      {
        modal.style.removeProperty('z-index');
      }

      var preloaded = Array.isArray(options.contents) ? options.contents : null;
      if (preloaded)
      {
        window.requestAnimationFrame(() =>
        {
          handleLoaded(preloaded);
        });
      }
      else
      {
        this.service.jobs.data.getContents({
          forceRefresh: options.forceRefresh,
          userId: ownerUserId,
          userCode: ownerUserCode
        })
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
          keywordInput.focus();
        }
        catch (error)
        {
          // ignore
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
  var NS = Services.ContentsSelectModal || (Services.ContentsSelectModal = {});
  NS.JobModal = NS.JobModal || JobModal;

})(window, document);
