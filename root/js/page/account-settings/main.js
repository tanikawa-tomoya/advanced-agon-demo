(function () {
  'use strict';

  class AccountSettings
  {
    constructor(name)
    {
      // Initialize the User Settings page controller
      this.name = name || 'account-settings';
      this.pageRoot = document.querySelector('[data-page="account-settings"]') || document.body;
      this.root = document.querySelector('[data-settings-root]') || this.pageRoot;
      if (!this.root) {
        throw new Error('[account-settings] root element not found. Put data-settings-root on the container.');
      }

      // State tracking whether there are unsaved changes in form or avatar
      this.state = {
        mounted: false,
        activeTab: 'profile',
        hasUnsavedChanges: false,
        profileChanged: false,
        notificationChanged: false,
        avatarChanged: false,
        profile: null,
        userId: null
      };

      // Configuration and DOM selectors for this page
      this.config = {
        pageKey: 'account-settings',
        title: 'ユーザー設定',
        selectors: {
          form: '#account-settings-form',
          tabRoot: '.account-settings-screen__tabs',
          tabPanel: '[data-tab-panel]',
          profilePanel: '[data-tab-panel="profile"]',
          notificationPanel: '[data-tab-panel="notifications"]',
          avatarInput: '[data-role="avatar-input"]',
          avatarImg: '[data-role="avatar-img"]',
          avatarPlaceholder: '[data-avatar-placeholder]',
          avatarFilename: '[data-avatar-filename]',
          avatarChooseButton: '[data-action="choose-avatar"]',
          avatarResetButton: '[data-action="delete-avatar"]',
          avatarField: '.mock-control--avatar',
          tabTrigger: '[data-tab]',
          helpTrigger: '[data-help="account-settings"]',
          profileSaveButton: '#account-settings-profile-save',
          notificationSaveButton: '#account-settings-notifications-save',
          avatarSaveButton: '#account-settings-avatar-save',
          unsavedChangesIndicator: '[data-unsaved-changes-indicator]'
        },
        api: {
          requestType: 'User',
          saveType: 'UserUpdate',
          uploadAvatar: window.Utils.getApiEndpoint(),
          uploadType: 'UserUpdate'
        },
        avatarEndpoint: window.Utils.getApiEndpoint() + '?requestType=User&type=UserAvatar',
        apiToken: window.Utils.getApiToken(),
        avatarVariant: 'medium',
        uploadMaxSizeMB: 5,
        acceptImageTypes: ['image/png', 'image/jpeg', 'image/webp'],
        avatarSettingId: 'account-settings-avatar-setting',
        emptyFilenameText: '選択されていません'
      };

      this.jobs = {};
      this.services = { header: null, helpModal: null, button: null, breadcrumb: null, toast: null, avatarSetting: null };
    }

    async boot()
    {
      // Ensure the user is logged in; otherwise redirect to login
      if (await window.Services.sessionInstance.getUser() == null) {
        window.location.href = "/login.html";
        return;
      }

      // Load required scripts and initialize services
      await this._loadScripts();
      this.initConfig();
      this.initServices();
      await this._bootServices();
      await this.renderBreadcrumbs();
      this.initJobs();
      this._emit('service-app:header:set', { title: this.config.title });
      await this._runJobsSequentially();
      await this._hydrateInitialState();

      // Bind form submission and Save button events, then update initial UI state
      this._bindFormEvents();
      this.updateUnsavedChangesState(true);

      this._bindHelpButton();
      this.state.mounted = true;
    }

    async _hydrateInitialState()
    {
      var profile = await this._getSessionProfile();
      if (!profile)
      {
        return;
      }
      if (this.jobs.profile && typeof this.jobs.profile.applyProfileData === 'function')
      {
        this.jobs.profile.applyProfileData(profile);
      }
      else
      {
        this._applyProfileFallback(profile);
      }
      if (this.jobs.avatar && typeof this.jobs.avatar.applyProfile === 'function')
      {
        this.jobs.avatar.applyProfile(profile);
      }
      else
      {
        this._applyAvatarFallback(profile);
      }
    }

    _applyProfileFallback(profile)
    {
      var displayName = this._resolveProfileName(profile);
      var mail = this._resolveProfileMail(profile);
      var role = this._resolveProfileRole(profile);
      var nameInput = this.root.querySelector('input[name="displayName"]');
      var mailInput = this.root.querySelector('input[name="mail"]');
      var roleInput = this.root.querySelector('input[name="role"]');
      if (nameInput)
      {
        nameInput.value = displayName;
      }
      if (mailInput)
      {
        mailInput.value = mail;
      }
      if (roleInput)
      {
        roleInput.value = role;
      }
    }

    _applyAvatarFallback(profile)
    {
      var avatar = this._resolveProfileAvatar(profile);
      if (!avatar || !avatar.url)
      {
        return;
      }
      var img = this.root.querySelector(this.config.selectors.avatarImg);
      var placeholder = this.root.querySelector(this.config.selectors.avatarPlaceholder);
      if (img)
      {
        img.src = avatar.url;
        img.removeAttribute('hidden');
      }
      if (placeholder)
      {
        placeholder.setAttribute('hidden', 'hidden');
      }
      var filename = this.root.querySelector(this.config.selectors.avatarFilename);
      if (filename)
      {
        filename.textContent = avatar.fileName || '';
      }
    }

    _resolveProfileName(profile)
    {
      if (!profile)
      {
        return '';
      }
      var keys = ['displayName', 'name', 'userDisplayName'];
      for (var i = 0; i < keys.length; i += 1)
      {
        var value = profile[keys[i]];
        if (typeof value === 'string' && value.trim())
        {
          return value.trim();
        }
      }
      return '';
    }

    _resolveProfileMail(profile)
    {
      if (!profile)
      {
        return '';
      }
      var keys = ['mail', 'mail', 'userMail'];
      for (var i = 0; i < keys.length; i += 1)
      {
        var value = profile[keys[i]];
        if (typeof value === 'string' && value.trim())
        {
          return value.trim();
        }
      }
      return '';
    }

    _resolveProfileRole(profile)
    {
      if (!profile)
      {
        return '';
      }
      var keys = ['role', 'userRole', 'position'];
      for (var i = 0; i < keys.length; i += 1)
      {
        var value = profile[keys[i]];
        if (typeof value === 'string' && value.trim())
        {
          return value.trim();
        }
      }
      return '';
    }

    _resolveProfileAvatar(profile)
    {
      if (!profile)
      {
        return null;
      }
      var avatar = null;
      if (profile.avatar && typeof profile.avatar === 'object')
      {
        avatar = profile.avatar;
      }
      var url = '';
      if (avatar && typeof avatar.url === 'string' && avatar.url.trim())
      {
        url = avatar.url.trim();
      }
      else if (avatar && typeof avatar.src === 'string' && avatar.src.trim())
      {
        url = avatar.src.trim();
      }
      else if (typeof profile.avatarUrl === 'string' && profile.avatarUrl.trim())
      {
        url = profile.avatarUrl.trim();
      }
      else if (typeof profile.avatarUrlMedium === 'string' && profile.avatarUrlMedium.trim())
      {
        url = profile.avatarUrlMedium.trim();
      }
      else if (typeof profile.avatarUrlSmall === 'string' && profile.avatarUrlSmall.trim())
      {
        url = profile.avatarUrlSmall.trim();
      }
      var fileName = '';
      if (avatar && typeof avatar.fileName === 'string' && avatar.fileName.trim())
      {
        fileName = avatar.fileName.trim();
      }
      else if (typeof profile.avatarFileName === 'string' && profile.avatarFileName.trim())
      {
        fileName = profile.avatarFileName.trim();
      }
      else if (typeof profile.imageFileName === 'string' && profile.imageFileName.trim())
      {
        fileName = profile.imageFileName.trim();
      }
      if (!url)
      {
        return null;
      }
      return { url: url, fileName: fileName };
    }

    async _loadScripts()
    {
      var base = '/js/page/account-settings/';
      var scripts = [
        { src: '/js/service-app/header/main.js' },
        { src: '/js/service-app/button/main.js' },
        { src: '/js/service-app/help-modal/main.js' },
        { src: '/js/service-app/breadcrumb/main.js' },
        { src: '/js/service-app/toast/main.js' },
        { src: '/js/service-app/avatar-setting/main.js' },
        { src: base + 'job-tabs.js' },
        { src: base + 'job-profile.js' },
        { src: base + 'job-notification.js' },
        { src: base + 'job-avatar.js' },
        { src: base + 'job-help.js' }
      ];
      await window.Utils.loadScriptsSync(scripts);
    }

    initServices()
    {
      this.services.header = new window.Services.Header({
        display: { forceLoginButton: false, hideLoginButton: false, showUserInfoWhenLoggedin: true }
      });
      this.services.helpModal = new window.Services.HelpModal({ closeOnEsc: true, closeOnBackdrop: true });
      this.services.button = new window.Services.button();
      var breadcrumbContainer = document.querySelector('.screen-page') || this.root || document.body;
      this.services.breadcrumb = new window.Services.Breadcrumb({ container: breadcrumbContainer });
      this.services.toast = new window.Services.Toast({ position: 'top-right', duration: 3000 });
      this.services.avatarSetting = new window.Services.AvatarSetting({
        acceptImageTypes: this.config.acceptImageTypes,
        uploadMaxSizeMB: this.config.uploadMaxSizeMB,
        emptyFilenameText: this.config.emptyFilenameText
      });
    }

    async _bootServices() {
      var tasks = [];
      if (this.services.header && typeof this.services.header.boot === 'function') {
        tasks.push(this.services.header.boot('.site-header'));
      }
      if (this.services.helpModal && typeof this.services.helpModal.boot === 'function') {
        tasks.push(this.services.helpModal.boot());
      }
      if (this.services.button && typeof this.services.button.boot === 'function') {
        tasks.push(this.services.button.boot());
      }
      if (this.services.breadcrumb && typeof this.services.breadcrumb.boot === 'function') {
        tasks.push(this.services.breadcrumb.boot());
      }
      if (this.services.toast && typeof this.services.toast.boot === 'function') {
        tasks.push(this.services.toast.boot());
      }
      if (this.services.avatarSetting && typeof this.services.avatarSetting.boot === 'function') {
        tasks.push(this.services.avatarSetting.boot());
      }
      await Promise.all(tasks);
    }

    async renderBreadcrumbs() {
      var breadcrumb = this.services && this.services.breadcrumb;
      if (!breadcrumb || typeof breadcrumb.render !== 'function') {
        return;
      }
      var profile = await this._getSessionProfile();
      breadcrumb.render([
        { label: 'ダッシュボード', href: this._resolveDashboardHref(profile) },
        { label: 'アカウント設定' }
      ]);
    }

    async _getSessionProfile() {
      if (this.state && this.state.profile) {
        return this.state.profile;
      }
      var session = window.Services && window.Services.sessionInstance;
      if (!session) {
        return null;
      }
      var profile = null;
      if (typeof session.getUser === 'function') {
        profile = await session.getUser();
      }
      if (!profile && typeof session.loadFromStorage === 'function') {
        profile = await session.loadFromStorage();
      }
      if (!profile && typeof session.syncFromServer === 'function') {
        profile = await session.syncFromServer();
      }
      if (profile) {
        this.state.profile = profile;
      }
      return profile;
    }

    async getUserId()
    {
      if (this.state && this.state.userId) {
        return this.state.userId;
      }
      var profile = await this._getSessionProfile();
      var userId = this._extractUserId(profile);
      if (userId) {
        this.state.userId = userId;
        return userId;
      }
      return null;
    }

    _extractUserId(profile)
    {
      if (!profile || typeof profile !== 'object') {
        return '';
      }
      var keys = ['id', 'userId', 'userID', 'user_id', 'uid'];
      for (var i = 0; i < keys.length; i += 1) {
        var value = profile[keys[i]];
        if (value === undefined || value === null) {
          continue;
        }
        var normalized = String(value).trim();
        if (normalized !== '') {
          return normalized;
        }
      }
      return '';
    }

    _resolveDashboardHref(profile) {
      return this._isPrivilegedProfile(profile) ? 'dashboard.html' : 'dashboard.html';
    }

    _isPrivilegedProfile(profile) {
      if (!profile) {
        return false;
      }
      var isSupervisor = profile.isSupervisor === true || profile.isSupervisor === 1 || profile.isSupervisor === '1';
      var isOperator = profile.isOperator === true || profile.isOperator === 1 || profile.isOperator === '1';
      return !!(isSupervisor || isOperator);
    }

    initJobs()
    {
      // Instantiate job handlers for each section (tabs, profile, notifications, avatar, help)
      var namespace = window.AccountSettings || {};
      this.jobs = {
        tabs: namespace.JobTabs ? new namespace.JobTabs(this) : null,
        profile: namespace.JobProfile ? new namespace.JobProfile(this) : null,
        notification: namespace.JobNotification ? new namespace.JobNotification(this) : null,
        avatar: namespace.JobAvatar ? new namespace.JobAvatar(this) : null,
        help: new window.AccountSettingsJobHelp({ root: this.root, config: this.config, helpModal: this.services.helpModal })
      };
      this.pipeline = [this.jobs.tabs, this.jobs.profile, this.jobs.notification, this.jobs.avatar];
    }

    initConfig() {
      // Override default config with any data attributes present on page/container
      var ds = {};
      if (this.pageRoot && this.pageRoot.dataset) {
        for (var key in this.pageRoot.dataset) {
          if (Object.prototype.hasOwnProperty.call(this.pageRoot.dataset, key)) {
            ds[key] = this.pageRoot.dataset[key];
          }
        }
      }
      if (this.root && this.root.dataset) {
        for (var key2 in this.root.dataset) {
          if (Object.prototype.hasOwnProperty.call(this.root.dataset, key2)) {
            ds[key2] = this.root.dataset[key2];
          }
        }
      }

      if (ds.title) this.config.title = ds.title;
      if (ds.apiSave) this.config.api.endpoint = ds.apiSave;
      if (ds.apiEndpoint) this.config.api.endpoint = ds.apiEndpoint;
      if (ds.apiUpload) this.config.api.uploadAvatar = ds.apiUpload;
      if (ds.apiRequestType) this.config.api.requestType = ds.apiRequestType;
      if (ds.apiUploadType) this.config.api.uploadType = ds.apiUploadType;
      if (ds.apiSaveType) this.config.api.saveType = ds.apiSaveType;

      if (ds.uploadMaxSizeMb) {
        var n = Number(ds.uploadMaxSizeMb);
        if (!isNaN(n) && n > 0) {
          this.config.uploadMaxSizeMB = n;
        }
      }
    }

    async _runJobsSequentially()
    {
      // Run each job's initialization sequentially (tabs, profile, notification, avatar)
      var queue = this.pipeline || [];
      for (var i = 0; i < queue.length; i += 1)
      {
        var job = queue[i];
        if (job && typeof job.run === 'function')
        {
          await job.run();
        }
      }
    }

    setProfileChanged(isChanged)
    {
      this._updateChangeFlag('profileChanged', isChanged);
    }

    setNotificationChanged(isChanged)
    {
      this._updateChangeFlag('notificationChanged', isChanged);
    }

    setAvatarChanged(isChanged)
    {
      this._updateChangeFlag('avatarChanged', isChanged);
    }

    _updateChangeFlag(key, value)
    {
      var next = !!value;
      if (this.state[key] === next) {
        return;
      }
      this.state[key] = next;
      this.updateUnsavedChangesState();
    }

    updateUnsavedChangesState(force)
    {
      // Recompute whether any unsaved changes exist and update UI accordingly
      var hasProfileChange = !!this.state.profileChanged;
      var hasNotificationChange = !!this.state.notificationChanged;
      var hasAvatarChange = !!this.state.avatarChanged;
      var next = !!(hasProfileChange || hasNotificationChange || hasAvatarChange);
      if (force || next !== this.state.hasUnsavedChanges)
      {
        this.state.hasUnsavedChanges = next;
      }
      this._updateSaveButtonState({
        profile: hasProfileChange,
        notification: hasNotificationChange,
        avatar: hasAvatarChange
      });
      var indicator = this.root.querySelector(this.config.selectors.unsavedChangesIndicator);
      if (indicator) {
        if (next) {
          indicator.removeAttribute('hidden');
        }
        else {
          indicator.setAttribute('hidden', 'hidden');
        }
      }
    }

    _updateSaveButtonState(flags)
    {
      var selectors = this.config.selectors || {};
      var mapping = [
        { selector: selectors.profileSaveButton, active: !!flags.profile },
        { selector: selectors.notificationSaveButton, active: !!flags.notification },
        { selector: selectors.avatarSaveButton, active: !!flags.avatar }
      ];
      mapping.forEach(function (entry) {
        if (!entry.selector) {
          return;
        }
        var node = this.root.querySelector(entry.selector);
        if (!node) {
          return;
        }
        node.disabled = !entry.active;
        node.classList.toggle('is-active', entry.active);
      }, this);
    }

    async handleAvatarSaved(avatar)
    {
      var baseProfile = this.state.profile || await this._getSessionProfile();
      var updatedProfile = this._applyAvatarToProfile(baseProfile, avatar);
      this.state.profile = updatedProfile;
      await this._updateSessionProfile(updatedProfile);
      await this.restartHeaderService(updatedProfile);
    }

    _applyAvatarToProfile(profile, avatar)
    {
      var current = profile && typeof profile === 'object' ? Object.assign({}, profile) : {};
      var nextAvatar = avatar && typeof avatar === 'object' ? Object.assign({}, avatar) : null;
      if (nextAvatar && nextAvatar.url) {
        current.avatar = Object.assign({}, current.avatar || {}, {
          url: nextAvatar.url,
          fileName: nextAvatar.fileName || ''
        });
        current.avatarUrl = nextAvatar.url;
        current.avatarUrlMedium = nextAvatar.url;
        current.avatarUrlSmall = nextAvatar.url;
      }
      else {
        current.avatar = null;
        delete current.avatarUrl;
        delete current.avatarUrlMedium;
        delete current.avatarUrlSmall;
      }
      return current;
    }

    async _updateSessionProfile(profile)
    {
      var service = window.Services && window.Services.sessionInstance;
      if (!service || typeof service.setUser !== 'function') {
        return;
      }
      await service.setUser(profile || null);
    }

    async restartHeaderService(profile)
    {
      var header = this.services && this.services.header;
      if (!header) {
        return;
      }
      var selector = (header.config && header.config.mountSelector) || '.site-header';
      if (typeof header.restart === 'function') {
        await header.restart(selector);
      }
      else if (typeof header.boot === 'function') {
        await header.boot(selector);
      }
      if (profile && typeof header.setUser === 'function') {
        header.setUser(profile, { normalize: true });
      }
    }

    _bindFormEvents()
    {
      var self = this;
      var form = this.root.querySelector(this.config.selectors.form);
      if (!form) {
        return;
      }
      var $ = this._resolveJquery();
      if ($) {
        $(form).off('submit.accountSettingsForm').on('submit.accountSettingsForm', function (event) {
          event.preventDefault();
          self._triggerActiveTabSave();
        });
        return;
      }
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        self._triggerActiveTabSave();
      });
    }

    _triggerActiveTabSave()
    {
      var tab = this.state.activeTab;
      if (tab === 'notifications' && this.jobs.notification && typeof this.jobs.notification.handleSave === 'function') {
        this.jobs.notification.handleSave();
        return;
      }
      if (tab === 'avatar' && this.jobs.avatar && typeof this.jobs.avatar.handleSave === 'function') {
        this.jobs.avatar.handleSave();
        return;
      }
      if (this.jobs.profile && typeof this.jobs.profile.handleSave === 'function') {
        this.jobs.profile.handleSave();
      }
    }

    _bindHelpButton()
    {
      // Bind the help icon/button to open the help modal
      var self = this;
      var triggers = this.root.querySelectorAll(this.config.selectors.helpTrigger);
      var $ = this._resolveJquery();
      if ($ && triggers && triggers.length) {
        $(triggers).off('click.accountSettingsHelp').on('click.accountSettingHelp', function (event) {
          event.preventDefault();
          var topic = this.getAttribute('data-help') || 'account-settings';
          if (self.jobs.help && typeof self.jobs.help.open === 'function') {
            self.jobs.help.open(topic);
          }
        });
        return;
      }
      Array.prototype.forEach.call(triggers, function (trigger) {
        trigger.addEventListener('click', function (event) {
          event.preventDefault();
          var topic = trigger.getAttribute('data-help') || 'account-settings';
          if (self.jobs.help && typeof self.jobs.help.open === 'function') {
            self.jobs.help.open(topic);
          }
        });
      });
    }

    _resolveJquery()
    {
      if (window.jQuery && typeof window.jQuery === 'function') {
        return window.jQuery;
      }
      if (window.$ && typeof window.$ === 'function') {
        return window.$;
      }
      return null;
    }

    _emit(name, detail) {
      var ev = new CustomEvent(name, { detail: detail });
      window.dispatchEvent(ev);
    }

    showToast(message, type)
    {
      var toastType = type || 'info';
      if (this.services && this.services.toast) {
        this.services.toast.show(message, { type: toastType });
      }
      this._emit('service-app:toast', { message: message, type: toastType });
    }

    toggleOverlay(show)
    {
      this._emit('service-app:loading', { show: !!show });
    }
  }

  window.AccountSettings = window.AccountSettings || AccountSettings;
})(window, document);
