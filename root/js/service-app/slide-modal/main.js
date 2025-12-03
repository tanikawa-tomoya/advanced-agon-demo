(function () {
  'use strict';

  class SlideModalService extends window.Services.HelpModal
  {
    constructor(options)
    {
      super(options);
      this.currentSlide = null;
      this.pages = [];
      this.currentIndex = 0;
      this._dialog = null;
      this._els = {};
      this._handlers = {};
    }

    initConfig()
    {
      super.initConfig();
      this.config.overlayClassName = 'c-help-modal c-slide-modal';
      this.config.contentClassName = 'c-help-modal__content c-slide-modal__content';
      this.config.showWatermark = false;
      this.config.defaultSanitizeFn = function (html) { return html; };
    }

    async boot()
    {
      await super.boot();
      return this;
    }

    showSlide(slide, opts)
    {
      this.currentSlide = this._normalizeSlide(slide);
      this.pages = this.currentSlide.pages;
      this.currentIndex = this._clampIndex((opts && typeof opts.startIndex === 'number') ? opts.startIndex : 0);

      var dialog = super.show({
        title: this.currentSlide.title,
        html: this._buildBodyHtml()
      }, opts);

      this._dialog = dialog;
      this._resolveElements(dialog);
      this._bindControls();
      this._renderPage();
      return dialog;
    }

    dismiss()
    {
      this._unbindControls();
      this._dialog = null;
      this.pages = [];
      this.currentSlide = null;
      return super.dismiss();
    }

    _buildBodyHtml()
    {
      var slideDescription = this.escapeHtml(this.currentSlide.description || '');
      return ''
        + '<div class="c-slide-modal__body" data-slide-modal-root>'
        + '  <div class="c-slide-modal__image" data-slide-modal-image>'
        + '    <p class="c-slide-modal__empty">画像がありません</p>'
        + '  </div>'
        + '  <div class="c-slide-modal__panel">'
        + '    <p class="c-slide-modal__summary" data-slide-modal-summary>' + slideDescription + '</p>'
        + '    <p class="c-slide-modal__page" data-slide-modal-page></p>'
        + '    <div class="c-slide-modal__description" data-slide-modal-description></div>'
        + '    <div class="c-slide-modal__controls">'
        + '      <button type="button" class="btn btn--ghost" data-slide-modal-prev>前のページ</button>'
        + '      <button type="button" class="btn btn--primary" data-slide-modal-next>次のページ</button>'
        + '    </div>'
        + '  </div>'
        + '</div>';
    }

    _resolveElements(dialog)
    {
      var body = dialog && dialog.querySelector ? dialog.querySelector('.c-help-modal__body') : null;
      this._els = {
        body: body,
        image: body ? body.querySelector('[data-slide-modal-image]') : null,
        description: body ? body.querySelector('[data-slide-modal-description]') : null,
        summary: body ? body.querySelector('[data-slide-modal-summary]') : null,
        page: body ? body.querySelector('[data-slide-modal-page]') : null,
        prev: body ? body.querySelector('[data-slide-modal-prev]') : null,
        next: body ? body.querySelector('[data-slide-modal-next]') : null
      };
    }

    _bindControls()
    {
      var self = this;
      var els = this._els || {};
      if (els.prev) {
        this._handlers.prev = function (e) {
          e.preventDefault();
          self._changePage(-1);
        };
        els.prev.addEventListener('click', this._handlers.prev, true);
      }
      if (els.next) {
        this._handlers.next = function (e) {
          e.preventDefault();
          self._changePage(1);
        };
        els.next.addEventListener('click', this._handlers.next, true);
      }
    }

    _unbindControls()
    {
      var els = this._els || {};
      if (els.prev && this._handlers.prev) {
        els.prev.removeEventListener('click', this._handlers.prev, true);
      }
      if (els.next && this._handlers.next) {
        els.next.removeEventListener('click', this._handlers.next, true);
      }
      this._handlers = {};
    }

    _changePage(delta)
    {
      var nextIndex = this._clampIndex(this.currentIndex + delta);
      if (nextIndex === this.currentIndex) {
        return;
      }
      this.currentIndex = nextIndex;
      this._renderPage();
    }

    _renderPage()
    {
      var els = this._els || {};
      var pages = Array.isArray(this.pages) ? this.pages : [];
      var total = pages.length;
      var page = total ? pages[this.currentIndex] : null;

      if (els.page) {
        els.page.textContent = total ? (this.currentIndex + 1) + ' / ' + total : '0 / 0';
      }

      if (els.description) {
        var description = (page && page.description) || this.currentSlide.description || '';
        els.description.textContent = description || '説明が登録されていません';
      }

      if (els.summary) {
        els.summary.textContent = this.currentSlide.description || '';
        els.summary.style.display = this.currentSlide.description ? 'block' : 'none';
      }

      if (els.image) {
        if (page && page.image && (page.image.url || page.image.thumbnailUrl)) {
          var src = page.image.url || page.image.thumbnailUrl;
          var altText = page.description || this.currentSlide.title || 'スライド画像';
          els.image.innerHTML = '<img src="' + this.escapeHtml(src) + '" alt="' + this.escapeHtml(altText) + '" />';
        } else {
          els.image.innerHTML = '<p class="c-slide-modal__empty">画像がありません</p>';
        }
      }

      if (els.prev) {
        els.prev.disabled = !(total > 0 && this.currentIndex > 0);
      }
      if (els.next) {
        els.next.disabled = !(total > 0 && this.currentIndex < total - 1);
      }
    }

    _clampIndex(index)
    {
      var total = Array.isArray(this.pages) ? this.pages.length : 0;
      if (total <= 0) {
        return 0;
      }
      if (index < 0) {
        return 0;
      }
      if (index >= total) {
        return total - 1;
      }
      return index;
    }

    _normalizeSlide(slide)
    {
      var pages = Array.isArray(slide && slide.pages) ? slide.pages.slice() : [];
      var normalizedPages = [];
      for (var i = 0; i < pages.length; i += 1) {
        var page = pages[i] || {};
        normalizedPages.push({
          description: page.description || '',
          image: page.image || null
        });
      }
      return {
        title: (slide && slide.title) || 'スライド',
        description: (slide && slide.description) || '',
        pages: normalizedPages
      };
    }

    escapeHtml(text)
    {
      return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  }

  window.Services = window.Services || {};
  window.Services.SlideModal = SlideModalService;
})();
