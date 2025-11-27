(function () {
  'use strict';

  function sanitizeHelpHtml(html) {
    if (typeof html !== 'string') { return ''; }
    var container = document.createElement('div');
    container.innerHTML = html;
    var forbidden = container.querySelectorAll('script, style, iframe, object, embed');
    for (var i = 0; i < forbidden.length; i += 1) {
      var node = forbidden[i];
      if (node && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
    var elements = container.querySelectorAll('*');
    for (var j = 0; j < elements.length; j += 1) {
      var el = elements[j];
      var attrs = el.attributes;
      for (var k = attrs.length - 1; k >= 0; k -= 1) {
        var attr = attrs[k];
        var name = attr.name.toLowerCase();
        if (name.indexOf('on') === 0) {
          el.removeAttribute(attr.name);
          continue;
        }
        if ((name === 'href' || name === 'src') && /\s*javascript:/i.test(attr.value || '')) {
          el.removeAttribute(attr.name);
        }
      }
    }
    return container.innerHTML;
  }

  class JobHelp {
    constructor(pageInstance) {
      this.pageInstance = pageInstance;
      this.button = document.querySelector(pageInstance.selectorConfig.helpButton);
      this.modal = document.querySelector(pageInstance.selectorConfig.helpModal);
    }

    run() {
      if (this.button) {
        this.button.addEventListener('click', this.open.bind(this));
      }
      if (this.modal) {
        var closers = this.modal.querySelectorAll('[data-modal-close]');
        for (var i = 0; i < closers.length; i += 1) {
          closers[i].addEventListener('click', this.close.bind(this));
        }
      }
    }

    open(event) {
      if (event) {
        event.preventDefault();
      }
      this.pageInstance.helpModalService.show({
        title: 'コンテンツアクセス管理のポイント',
        html: this._serializeModalBody(),
        sanitizeFn: sanitizeHelpHtml
      });
    }

    close(event) {
      if (event) {
        event.preventDefault();
      }
      if (this.pageInstance && this.pageInstance.helpModalService && typeof this.pageInstance.helpModalService.dismiss === 'function') {
        this.pageInstance.helpModalService.dismiss();
      }
    }

    _serializeModalBody() {
      if (!this.modal) {
        return '';
      }
      var body = this.modal.querySelector('.c-help-modal__body');
      var summary = this.modal.querySelector('.c-help-modal__summary');
      var title = this.modal.querySelector('.c-help-modal__title');
      var html = '';
      if (title) { html += '<h2>' + title.textContent + '</h2>'; }
      if (summary) { html += '<p>' + summary.innerHTML + '</p>'; }
      if (body) { html += body.innerHTML; }
      return html;
    }
  }

  window.AdminContentsAccess = window.AdminContentsAccess || {};
  window.AdminContentsAccess.JobHelp = JobHelp;
})(window, document);
