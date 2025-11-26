(function () {

  'use strict';

  class JobPopover
  {
    constructor(service)
    {
      this.service = service;
    }

    build(users, cfg, avatarService)
    {
      var doc = document;
      var container = doc.createElement('div');
      container.className = 'c-userlist-avatar__popover';

      var list = doc.createElement('div');
      list.className = 'c-userlist-avatar__popover-list';

      for (var i = 0; i < users.length; i += 1)
      {
        var user = users[i] || {};
        var item = doc.createElement('div');
        item.className = 'c-userlist-avatar__popover-item';

        var avatarHost = doc.createElement('div');
        avatarHost.className = 'c-userlist-avatar__popover-avatar';
        avatarService.render(avatarHost, {
          src: user.src,
          name: user.name,
          alt: user.name,
          isActive: user.isActive
        }, {
          size: cfg.popoverAvatarSize,
          shape: 'circle'
        });

        var body = doc.createElement('div');
        body.className = 'c-userlist-avatar__popover-body';

        var identity = doc.createElement('div');
        identity.className = 'c-userlist-avatar__popover-identity';

        var name = doc.createElement('div');
        name.className = 'c-userlist-avatar__popover-name';
        name.textContent = String(user.name || '');
        identity.appendChild(name);

        if (user.role) {
          var role = doc.createElement('div');
          role.className = 'c-userlist-avatar__popover-role';
          role.textContent = String(user.role || '');
          identity.appendChild(role);
        }

        body.appendChild(identity);

        if (user.isActive === false) {
          var status = doc.createElement('div');
          status.className = 'c-userlist-avatar__popover-status is-inactive';
          status.textContent = '非アクティブ';
          body.appendChild(status);
        }

        item.appendChild(avatarHost);
        item.appendChild(body);
        list.appendChild(item);
      }

      container.appendChild(list);
      return container;
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.UserlistAvatar || (Services.UserlistAvatar = {});
  NS.JobPopover = NS.JobPopover || JobPopover;

})(window, document);
