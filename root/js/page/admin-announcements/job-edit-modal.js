(function (window) {
  'use strict';

  class AdminAnnouncementJobEditModal {
    constructor(pageInstance) {
      this.page = pageInstance;
    }

    open(id) {
      if (!id) { return; }
      var announcement = this.page.findAnnouncement(id);
      if (!announcement) {
        if (this.page.toastService) {
          this.page.toastService.error('指定されたお知らせが見つかりませんでした。');
        }
        return;
      }
      var state = this.page.state;
      var el = this.page.elements;
      state.formMode = 'edit';
      state.formEditingId = id;
      this.page.setFormVisible(true);
      this.page.clearFormFeedback();
      if (el.formTitle && el.formTitle.length) {
        el.formTitle.text(this.page.textConfig.formTitleEdit);
      }
      if (el.formSubmit && el.formSubmit.length) {
        el.formSubmit.text(this.page.textConfig.formSubmitEdit);
      }
      if (el.formTitleInput && el.formTitleInput.length) {
        el.formTitleInput.val(announcement.title || '');
      }
      if (el.formContentInput && el.formContentInput.length) {
        el.formContentInput.val(announcement.content || '');
      }
      if (el.formIdInput && el.formIdInput.length) {
        el.formIdInput.val(id);
      }
      if (typeof this.page.setFormAudienceSelectionFromRecord === 'function') {
        this.page.setFormAudienceSelectionFromRecord(announcement);
      } else if (typeof this.page.setFormAudienceSelection === 'function') {
        this.page.setFormAudienceSelection([]);
      }
      if (typeof this.page.getFormAudienceSelection === 'function') {
        var selection = this.page.getFormAudienceSelection();
        if (Array.isArray(selection)) {
          announcement.audienceUsers = selection.slice();
        }
      }
      if (!Array.isArray(announcement.audienceUsers) || !announcement.audienceUsers.length) {
        this._ensureAudienceSelectionForEdit(announcement);
      }
      if (el.formTitleInput && el.formTitleInput.length && typeof el.formTitleInput.focus === 'function') {
        el.formTitleInput.focus();
      }
    }

    _ensureAudienceSelectionForEdit(announcement) {
      if (!announcement || !announcement.id) { return null; }
      if (Array.isArray(announcement.audienceUsers) && announcement.audienceUsers.length) { return null; }
      var self = this;
      var request = this.page.callApi('AnnouncementRecipients', { id: announcement.id }, { errorMessage: this.page.textConfig.recipientsError });
      request.then(function (result) {
        var recipients = Array.isArray(result && result.recipients) ? result.recipients : [];
        var normalized = self._normalizeAudienceFromRecipients(recipients);
        announcement.audienceUsers = normalized.slice();
        announcement.recipients = normalized.slice();
        if (typeof self.page.setFormAudienceSelection === 'function') {
          self.page.setFormAudienceSelection(normalized);
        }
      }).catch(function (error) {
        if (error && error.isAbort) { return; }
        var message = (error && error.message) ? error.message : self.page.textConfig.recipientsError;
        self.page.showFormFeedback(message);
        if (self.page.toastService) {
          self.page.toastService.error(message);
        }
      });
      return request;
    }

    _normalizeAudienceFromRecipients(list) {
      return this._normalizeAudienceUsers(list);
    }

    _normalizeAudienceUsers(list) {
      var normalized = [];
      var seen = Object.create(null);
      var source = Array.isArray(list) ? list : [];
      for (var i = 0; i < source.length; i += 1) {
        var user = this._normalizeAudienceEntry(source[i]);
        if (!user) { continue; }
        var key = this._buildAudienceKey(user);
        if (!key || seen[key]) { continue; }
        seen[key] = true;
        normalized.push(user);
      }
      return normalized;
    }

    _normalizeAudienceEntry(entry) {
      if (!entry || typeof entry !== 'object') { return null; }
      var userCode = entry.userCode || entry.code || '';
      var trimmedCode = userCode ? String(userCode).trim() : '';
      var displayName = entry.displayName || entry.name || trimmedCode;
      if (!trimmedCode && !displayName) { return null; }
      return {
        userCode: trimmedCode,
        displayName: displayName || trimmedCode,
        role: entry.role || ''
      };
    }

    _buildAudienceKey(user) {
      if (!user) { return ''; }
      if (user.userCode) { return String(user.userCode).toLowerCase(); }
      if (user.displayName) { return String(user.displayName).toLowerCase(); }
      return '';
    }
  }

  var NS = window.AdminAnnouncement || (window.AdminAnnouncement = {});
  NS.JobEditModal = AdminAnnouncementJobEditModal;
})(window);
