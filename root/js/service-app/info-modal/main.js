(function () {
  'use strict';

  class InfoModalService extends window.Services.HelpModal
  {
    constructor(options)
    {
      super(options);
    }

    initConfig()
    {
      super.initConfig();
      this.config.overlayClassName = 'c-help-modal c-info-modal';
      this.config.contentClassName = 'c-help-modal__content';
      this.config.defaultSanitizeFn = function (html) { return html; };
      this.config.idPrefix = 'infomodal-';
    }

    show(content, opts)
    {
      var merged = Object.assign({}, opts || {});
      if (typeof merged.sanitizeFn !== 'function' && typeof this.config.defaultSanitizeFn === 'function')
      {
        merged.sanitizeFn = this.config.defaultSanitizeFn;
      }
      return super.show(content, merged);
    }
  }

  window.Services = window.Services || {};
  window.Services.InfoModal = InfoModalService;
})();
