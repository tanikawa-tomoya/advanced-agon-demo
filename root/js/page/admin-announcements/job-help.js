(function (window, document) {
  'use strict';

  class AdminAnnouncementJobHelp {
    constructor(pageInstance) {
      this.page = pageInstance;
      this.trigger = document.getElementById('announcement-management-help-button');
      this.modal = document.getElementById('announcement-management-help-modal');
      this._bindOnce();
    }

    _bindOnce() {
      var self = this;
      if (!this.modal || !this.trigger) { return; }
      if (this._bound) { return; }
      this._bound = true;
      var closers = this.modal.querySelectorAll('[data-modal-close]');
      for (var i = 0; i < closers.length; i += 1) {
        closers[i].addEventListener('click', function (ev) {
          ev.preventDefault();
          self.close();
        });
      }
      this.modal.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' || ev.key === 'Esc') {
          ev.preventDefault();
          self.close();
        }
      });
    }

    open() {
      if (!this.modal || !this.trigger) { return; }
      this.modal.removeAttribute('hidden');
      this.modal.setAttribute('aria-hidden', 'false');
      this.modal.classList.add('is-open');
      this.trigger.setAttribute('aria-expanded', 'true');
      document.body.classList.add('is-modal-open');
      var focusTarget = this.modal.querySelector('[data-modal-initial-focus]') || this.modal.querySelector('[data-modal-close]');
      if (focusTarget && typeof focusTarget.focus === 'function') {
        setTimeout(function () { focusTarget.focus(); }, 0);
      }
    }

    close() {
      if (!this.modal || !this.trigger) { return; }
      this.modal.setAttribute('aria-hidden', 'true');
      this.modal.setAttribute('hidden', 'hidden');
      this.modal.classList.remove('is-open');
      this.trigger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('is-modal-open');
      try { this.trigger.focus(); } catch (err) {}
    }
  }

  var NS = window.AdminAnnouncement || (window.AdminAnnouncement = {});
  NS.JobHelp = AdminAnnouncementJobHelp;
})(window, document);
