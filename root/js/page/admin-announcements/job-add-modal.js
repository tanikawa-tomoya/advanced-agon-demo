(function (window) {
  'use strict';

  class AdminAnnouncementJobAddModal {
    constructor(pageInstance) {
      this.page = pageInstance;
    }

    open() {
      var state = this.page.state;
      var el = this.page.elements;
      state.formMode = 'create';
      state.formEditingId = '';
      this.page.setFormVisible(true);
      this.page.clearFormFeedback();
      if (el.formTitle && el.formTitle.length) {
        el.formTitle.text(this.page.textConfig.formTitleCreate);
      }
      if (el.formSubmit && el.formSubmit.length) {
        el.formSubmit.text(this.page.textConfig.formSubmitCreate);
      }
      if (el.formTitleInput && el.formTitleInput.length) {
        el.formTitleInput.val('');
      }
      if (el.formContentInput && el.formContentInput.length) {
        el.formContentInput.val('');
      }
      if (el.formIdInput && el.formIdInput.length) {
        el.formIdInput.val('');
      }
      if (typeof this.page.setFormAudienceSelection === 'function') {
        this.page.setFormAudienceSelection([]);
      }
      if (el.formTitleInput && el.formTitleInput.length && typeof el.formTitleInput.focus === 'function') {
        el.formTitleInput.focus();
      }
    }
  }

  var NS = window.AdminAnnouncement || (window.AdminAnnouncement = {});
  NS.JobAddModal = AdminAnnouncementJobAddModal;
})(window);
