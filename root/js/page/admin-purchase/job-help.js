(function (window, document) {
  'use strict';

  class JobHelp
  {
    constructor(pageInstance)
    {
      this.page = pageInstance;
      this.selectorConfig = pageInstance.selectorConfig;
    }

    async run()
    {
      this._bindEvents();
    }

    _bindEvents()
    {
      const sel = this.selectorConfig;
      jQuery(document).off('click.purchaseHelpOpen').on('click.purchaseHelpOpen', sel.helpButton, (ev) => {
        ev.preventDefault();
        this.page.helpModalService.open(sel.helpModal);
      });

      jQuery(document).off('click.purchaseHelpClose').on('click.purchaseHelpClose', sel.helpModal + ' [data-modal-close]', (ev) => {
        ev.preventDefault();
        this.page.helpModalService.close(sel.helpModal);
      });
    }
  }

  window.AdminPurchase = window.AdminPurchase || {};
  window.AdminPurchase.JobHelp = JobHelp;
})(window, document);
