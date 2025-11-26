(function () {

  'use strict';

  class JobTrigger
  {
    constructor(service)
    {
      this.service = service;
      this._states = new Map();
    }

    bind(host, users, cfg)
    {
      if (!host) return null;
      this.unbind(host);

      var self = this;
      var show = function ()
      {
        self.service.showPopover(host, users, cfg);
      };
      var hide = function (ev)
      {
        var related = ev && ev.relatedTarget;
        if (self.service.isPopoverElement(host, related))
        {
          return;
        }
        self.service.hidePopover(host);
      };

      host.addEventListener('mouseenter', show, true);
      host.addEventListener('focusin', show, true);
      host.addEventListener('mouseleave', hide, true);
      host.addEventListener('focusout', hide, true);
      this._states.set(host, { show: show, hide: hide });
      return host;
    }

    unbind(host)
    {
      var state = this._states.get(host);
      if (!state) return false;
      host.removeEventListener('mouseenter', state.show, true);
      host.removeEventListener('focusin', state.show, true);
      host.removeEventListener('mouseleave', state.hide, true);
      host.removeEventListener('focusout', state.hide, true);
      this._states.delete(host);
      this.service.hidePopover(host);
      return true;
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.UserlistAvatar || (Services.UserlistAvatar = {});
  NS.JobTrigger = NS.JobTrigger || JobTrigger;

})(window, document);
