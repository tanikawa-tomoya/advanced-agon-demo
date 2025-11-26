(function (w, d) {

  'use strict';

  class UserlistAvatarService
  {
    constructor(options)
    {
      this.jobs = null;
      this.avatarService = null;
      this._states = new Map();
      this._popovers = new Map();
      this.initConfig(options);
    }

    initConfig(options)
    {
      this.DEFAULTS = Object.freeze({
        size: 28,
        popoverAvatarSize: 48,
        overlap: -8,
        rootClass: 'c-userlist-avatar',
        itemClass: 'c-userlist-avatar__item',
        popoverPlacement: 'top-start',
        popoverOffset: 12,
        popoverIdPrefix: 'userspopover-',
        focusable: true,
        zIndex: null,
        nameOverlay: true,
        overlayMaxLength: 3
      });
      this.config = Object.assign({}, this.DEFAULTS, options || {});
    }

    async boot()
    {
      var scripts = [
        'js/service-app/userlist-avatar/job-inline.js',
        'js/service-app/userlist-avatar/job-popover.js',
        'js/service-app/userlist-avatar/job-trigger.js'
      ];

      if (!(w.Services && w.Services.UserAvatar))
      {
        scripts.unshift('js/service-app/user-avatar/main.js');
      }

      await w.Utils.loadScriptsSync(scripts);

      this.avatarService = this._ensureAvatarService();
      await this.avatarService.boot();

      this.jobs = {
        inline: new w.Services.UserlistAvatar.JobInline(this),
        popover: new w.Services.UserlistAvatar.JobPopover(this),
        trigger: new w.Services.UserlistAvatar.JobTrigger(this)
      };
      return this;
    }

    render(target, users, opts)
    {
      var el = this._resolveElement(target);
      if (!el) return null;

      var cfg = Object.assign({}, this.config, opts || {});
      var normalized = this.jobs.inline.normalizeUsers(users || []);
      this.jobs.inline.render(el, normalized, cfg, this.avatarService);
      this.jobs.trigger.bind(el, normalized, cfg);
      this._states.set(el, { users: normalized, cfg: cfg });
      return el;
    }

    rerender(target)
    {
      var el = this._resolveElement(target);
      if (!el) return null;
      var state = this._states.get(el);
      if (!state) return null;
      return this.render(el, state.users, state.cfg);
    }

    showPopover(anchor, users, cfg)
    {
      if (!anchor || !users || !users.length) return null;
      this.hidePopover(anchor);
      var content = this.jobs.popover.build(users, cfg, this.avatarService);
      var idPrefix = (cfg && cfg.popoverIdPrefix) || this.config.popoverIdPrefix;
      var pop = this.avatarService.showPopover(anchor, content, {
        id: idPrefix ? (idPrefix + Date.now()) : undefined,
        placement: (cfg && cfg.popoverPlacement) || this.config.popoverPlacement,
        offset: (cfg && Object.prototype.hasOwnProperty.call(cfg, 'popoverOffset')) ? cfg.popoverOffset : this.config.popoverOffset,
        dismissOnMouseLeave: true,
        trapFocus: false,
        role: 'list',
        ariaLabel: '対象者',
        zIndex: (cfg && Object.prototype.hasOwnProperty.call(cfg, 'zIndex')) ? cfg.zIndex : this.config.zIndex
      });
      if (pop) this._popovers.set(anchor, pop);
      return pop;
    }

    hidePopover(anchor)
    {
      if (!anchor) return false;
      var pop = this._popovers.get(anchor);
      if (pop)
      {
        this.avatarService.hidePopover(pop);
        this._popovers.delete(anchor);
        return true;
      }
      return this.avatarService.hidePopover(anchor);
    }

    isPopoverElement(anchor, node)
    {
      var pop = this._popovers.get(anchor);
      return !!(pop && node && pop.contains(node));
    }

    _ensureAvatarService()
    {
      if (this.avatarService) return this.avatarService;
      var Constructor = w.Services && w.Services.UserAvatar;
      return new Constructor();
    }

    _resolveElement(target)
    {
      if (!target) return null;
      if (typeof target === 'string') return d.querySelector(target);
      if (target.nodeType === 1) return target;
      return null;
    }
  }

  w.Services = w.Services || {};
  w.Services.UserlistAvatar = UserlistAvatarService;

})(window, document);
