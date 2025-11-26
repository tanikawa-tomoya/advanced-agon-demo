(function (w, document) {
  'use strict';

  function JobHelp(pageInstance) {
    this.page = pageInstance || {};
    var selectors = (this.page.selectorConfig) || {};
    this.button = document.querySelector(selectors.helpButton || '#user-management-help-button');
    this.modal = document.querySelector(selectors.helpModal || '#user-management-help-modal');
    this._handleKeydown = this._handleKeydown.bind(this);
  }

  JobHelp.prototype.open = function () {
    if (!this.modal) { return; }
    this.modal.removeAttribute('hidden');
    this.modal.setAttribute('aria-hidden', 'false');
    this.modal.classList.add('is-open');
    if (this.button) {
      this.button.setAttribute('aria-expanded', 'true');
    }
    document.body.classList.add('is-modal-open');
    this._focusInitial();
    document.addEventListener('keydown', this._handleKeydown, true);
  };

  JobHelp.prototype.close = function () {
    if (!this.modal) { return; }
    this.modal.setAttribute('hidden', 'hidden');
    this.modal.setAttribute('aria-hidden', 'true');
    this.modal.classList.remove('is-open');
    document.body.classList.remove('is-modal-open');
    document.removeEventListener('keydown', this._handleKeydown, true);
    if (this.button) {
      this.button.setAttribute('aria-expanded', 'false');
      if (typeof this.button.focus === 'function') {
        setTimeout(() => { this.button.focus(); }, 0);
      }
    }
  };

  JobHelp.prototype._focusInitial = function () {
    if (!this.modal) { return; }
    var target = this.modal.querySelector('[data-modal-initial-focus]') || this.modal.querySelector('[data-modal-close]');
    if (target && typeof target.focus === 'function') {
      setTimeout(function () { target.focus(); }, 0);
    }
  };

  JobHelp.prototype._handleKeydown = function (event) {
    var key = event && (event.key || event.keyCode);
    if (key === 'Escape' || key === 'Esc' || key === 27) {
      event.preventDefault();
      this.close();
    }
  };

  w.AdminUser = w.AdminUser || {};
  w.AdminUser.JobHelp = JobHelp;
})(window, document);
