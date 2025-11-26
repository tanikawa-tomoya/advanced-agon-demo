(function (window) {
  'use strict';

  function escapeHtml(value) {
    var str = String(value == null ? '' : value);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  class AdminAnnouncementJobDetailModal {
    constructor(pageInstance) {
      this.page = pageInstance;
      this._viewJob = null;
      this._avatarService = null;
    }

    open(id) {
      var announcement = this.page.findAnnouncement(id);
      if (!announcement) { return; }
      if (!this._countAudienceUsers(announcement)) {
        this._setDetailAudienceLoading();
        this._fetchAudienceUsersForAnnouncement(announcement);
      }
      this._renderDetailModal(announcement);
      this._toggleDetailModal(true);
    }

    close() {
      this._toggleDetailModal(false);
    }

    _renderDetailModal(announcement) {
      var el = this.page.elements;
      if (el.detailModalTitle && el.detailModalTitle.length) {
        el.detailModalTitle.text(announcement.title || '(無題)');
      }
      if (el.detailModalMeta && el.detailModalMeta.length) {
        el.detailModalMeta.text(this._buildDetailMeta(announcement));
      }
      if (el.detailModalContent && el.detailModalContent.length) {
        el.detailModalContent.html(this._formatContent(announcement.content));
      }
      if (this.page.elements.detailModalAudience && this.page.elements.detailModalAudience.length) {
        this.page.elements.detailModalAudience.html(this._buildDetailAudienceSection(announcement));
        this._mountDetailAudienceAvatars();
      }
    }

    _toggleDetailModal(open) {
      var modal = this.page.elements.detailModal;
      if (!modal || !modal.length) { return; }
      if (open) {
        modal.removeClass('hidden').addClass('is-open');
        modal.removeAttr('hidden');
        modal.attr('aria-hidden', 'false');
        modal.attr('data-modal-open', 'true');
        if (document && document.body && document.body.classList) {
          document.body.classList.add('is-modal-open');
        }
        var focusTarget = modal.find('[data-modal-initial-focus]').first();
        if (focusTarget && focusTarget.length && focusTarget[0] && typeof focusTarget[0].focus === 'function') {
          focusTarget[0].focus();
        }
        this._bindDetailModalKeyClose();
        return;
      }
      modal.removeClass('is-open').attr('aria-hidden', 'true');
      modal.attr('hidden', 'hidden');
      modal.removeAttr('data-modal-open');
      modal.addClass('hidden');
      this._unbindDetailModalKeyClose();
      if (!document.querySelector('.screen-modal.is-open, .c-help-modal.is-open, [data-modal-open="true"]')) {
        if (document && document.body && document.body.classList) {
          document.body.classList.remove('is-modal-open');
        }
      }
    }

    _bindDetailModalKeyClose() {
      if (this.page._detailModalKeyBound) { return; }
      var self = this;
      this.page._detailModalKeyHandler = function (ev) {
        var key = ev.key || ev.keyCode;
        var isEscape = key === 'Escape' || key === 'Esc' || key === 27;
        if (!isEscape) { return; }
        var modal = self.page.elements.detailModal;
        if (!modal || !modal.length || !modal.hasClass('is-open')) { return; }
        ev.preventDefault();
        self.close();
      };
      document.addEventListener('keydown', this.page._detailModalKeyHandler);
      this.page._detailModalKeyBound = true;
    }

    _unbindDetailModalKeyClose() {
      if (!this.page._detailModalKeyBound) { return; }
      document.removeEventListener('keydown', this.page._detailModalKeyHandler);
      this.page._detailModalKeyHandler = null;
      this.page._detailModalKeyBound = false;
    }

    _buildDetailAudienceSection(announcement) {
      var TEXT = this.page.textConfig || {};
      var header = TEXT.formAudienceLabel || '表示対象';
      var emptyText = TEXT.formAudienceEmpty || '対象ユーザーはまだ選択されていません。';
      var list = Array.isArray(announcement && announcement.audienceUsers) ? announcement.audienceUsers : [];
      var html = '' +
        '<div class="announcement-management__detail-audience">' +
        '  <h3 class="announcement-management__detail-audience-title">' + escapeHtml(header) + '</h3>';
      if (!list.length) {
        html += '<p class="announcement-management__detail-audience-empty">' + escapeHtml(emptyText) + '</p>';
        html += '</div>';
        return html;
      }
      html += '' +
        '  <div class="announcement-management__detail-audience-table-wrapper">' +
        '    <table class="announcement-management__detail-audience-table">' +
        '      <thead>' +
        '        <tr>' +
        '          <th scope="col">ユーザー</th>' +
        '          <th scope="col">ユーザーコード</th>' +
        '          <th scope="col">ロール</th>' +
        '        </tr>' +
        '      </thead>' +
        '      <tbody>';
      for (var i = 0; i < list.length; i += 1) {
        var entry = list[i] || {};
        var userCode = entry.userCode || '―';
        var role = entry.role || '―';
        html += '' +
          '<tr>' +
          '  <th scope="row">' + this._buildAudienceUserCell(entry) + '</th>' +
          '  <td>' + escapeHtml(userCode) + '</td>' +
          '  <td>' + escapeHtml(role) + '</td>' +
          '</tr>';
      }
      html += '      </tbody>' +
        '    </table>' +
        '  </div>' +
        '</div>';
      return html;
    }

    _setDetailAudienceLoading() {
      var container = this.page.elements.detailModalAudience;
      if (!container || !container.length) { return; }
      var text = this.page.textConfig.recipientsLoading || '確認状況を読み込み中…';
      container.html('<p class="announcement-management__detail-audience-empty">' + escapeHtml(text) + '</p>');
    }

    _fetchAudienceUsersForAnnouncement(announcement) {
      if (!announcement || !announcement.id) { return null; }
      var self = this;
      var request = this.page.callApi('AnnouncementRecipients', { id: announcement.id }, { errorMessage: this.page.textConfig.recipientsError });
      request.then(function (result) {
        var recipients = Array.isArray(result && result.recipients) ? result.recipients : [];
        announcement.audienceUsers = self._normalizeAudienceUsers(recipients);
        if (self.page.elements.detailModalAudience && self.page.elements.detailModalAudience.length) {
          self.page.elements.detailModalAudience.html(self._buildDetailAudienceSection(announcement));
          self._mountDetailAudienceAvatars();
        }
      }).catch(function (error) {
        if (error && error.isAbort) { return; }
        var message = (error && error.message) ? error.message : self.page.textConfig.recipientsError;
        if (self.page.toastService) {
          self.page.toastService.error(message);
        }
        if (self.page.elements.detailModalAudience && self.page.elements.detailModalAudience.length) {
          self.page.elements.detailModalAudience.html('<p class="announcement-management__detail-audience-empty">' + escapeHtml(message) + '</p>');
        }
      });
      return request;
    }

    _buildDetailMeta(announcement) {
      var job = this._getViewJob();
      if (job && typeof job._buildDetailMeta === 'function') {
        return job._buildDetailMeta(announcement);
      }
      return '';
    }

    _formatContent(content) {
      var job = this._getViewJob();
      if (job && typeof job._formatContent === 'function') {
        return job._formatContent(content);
      }
      return '';
    }

    _countAudienceUsers(announcement) {
      var job = this._getViewJob();
      if (job && typeof job._countAudienceUsers === 'function') {
        return job._countAudienceUsers(announcement);
      }
      var list = Array.isArray(announcement && announcement.audienceUsers) ? announcement.audienceUsers : [];
      return list.length;
    }

    _normalizeAudienceUsers(list) {
      var job = this._getViewJob();
      if (job && typeof job._normalizeAudienceUsers === 'function') {
        return job._normalizeAudienceUsers(list);
      }
      return Array.isArray(list) ? list : [];
    }

    _buildAudienceUserCell(entry) {
      var userLabel = entry.displayName || entry.userCode || '―';
      var avatarLabel = entry.displayName || entry.userCode || userLabel || '';
      var avatarAlt = avatarLabel ? (avatarLabel + 'のアバター') : '対象ユーザーのアバター';
      var avatarSrc = entry.avatarUrl || entry.avatar || '';
      var avatarAttrs = [
        'class="announcement-management__detail-audience-avatar"',
        'data-announcement-audience-avatar="1"',
        'data-avatar-name="' + escapeAttr(avatarLabel) + '"',
        'data-avatar-alt="' + escapeAttr(avatarAlt) + '"'
      ];
      if (avatarSrc) {
        avatarAttrs.push('data-avatar-src="' + escapeAttr(avatarSrc) + '"');
      }
      var html = '' +
        '<div class="announcement-management__detail-audience-user">' +
        '  <span ' + avatarAttrs.join(' ') + '></span>' +
        '  <span class="announcement-management__detail-audience-name">' + escapeHtml(userLabel) + '</span>' +
        '</div>';
      return html;
    }

    _mountDetailAudienceAvatars() {
      var svc = this._getAvatarService();
      var container = this.page.elements.detailModalAudience;
      if (!svc || !container || !container.length) { return; }
      var nodes = container[0].querySelectorAll('[data-announcement-audience-avatar]');
      if (!nodes || !nodes.length) { return; }
      var fallbackSrc = this._getFallbackAvatarSrc();
      for (var i = 0; i < nodes.length; i += 1) {
        var node = nodes[i];
        var data = {
          name: node.getAttribute('data-avatar-name') || '',
          alt: node.getAttribute('data-avatar-alt') || ''
        };
        var src = node.getAttribute('data-avatar-src');
        if (src) {
          data.src = src;
        } else if (fallbackSrc) {
          data.src = fallbackSrc;
        }
        try {
          svc.render(node, data, { size: 32, shape: 'circle' });
        } catch (error) {
          if (window.console && typeof window.console.warn === 'function') {
            window.console.warn('[AdminAnnouncement.JobDetailModal] failed to render audience avatar', error);
          }
        }
      }
    }

    _getAvatarService() {
      if (this.page && this.page.avatarService) {
        this._avatarService = this.page.avatarService;
        return this._avatarService;
      }
      return this._avatarService || null;
    }

    _getFallbackAvatarSrc() {
      var svc = this._getAvatarService();
      if (svc && svc.config && svc.config.fallbackAvatarSrc) {
        var candidate = String(svc.config.fallbackAvatarSrc || '').trim();
        if (candidate) { return candidate; }
      }
      return '/image/user-avatar.svg';
    }

    _getViewJob() {
      if (this._viewJob) { return this._viewJob; }
      var ctor = window.AdminAnnouncement && window.AdminAnnouncement.JobList;
      this._viewJob = ctor ? new ctor(this.page) : null;
      return this._viewJob;
    }
  }

  var NS = window.AdminAnnouncement || (window.AdminAnnouncement = {});
  NS.JobDetailModal = AdminAnnouncementJobDetailModal;
})(window);
