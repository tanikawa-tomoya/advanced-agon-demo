(function () {

  'use strict';

  class JobInline
  {
    constructor(service)
    {
      this.service = service;
    }

    normalizeUsers(list)
    {
      var users = [];
      if (!list) return users;
      var src = Array.isArray(list) ? list : [list];
      for (var i = 0; i < src.length; i += 1)
      {
        var normalized = this._normalizeUser(src[i]);
        if (normalized) users.push(normalized);
      }
      return users;
    }

    render(host, users, cfg, avatarService)
    {
      if (!host) return null;
      while (host.firstChild) host.removeChild(host.firstChild);
      if (cfg.rootClass) host.classList.add(cfg.rootClass);
      if (cfg.focusable && !host.hasAttribute('tabindex'))
      {
        host.setAttribute('tabindex', '0');
      }

      var frag = document.createDocumentFragment();
      for (var i = 0; i < users.length; i += 1)
      {
        var user = users[i];
        var item = document.createElement('div');
        item.className = cfg.itemClass;
        if (i > 0 && typeof cfg.overlap === 'number')
        {
          item.style.marginLeft = String(cfg.overlap) + 'px';
        }
        var avatarHost = document.createElement('div');
        avatarHost.className = 'c-userlist-avatar__avatar';
        var overlayLabel = this._buildOverlayLabel(user.name, cfg.overlayMaxLength);
        avatarService.render(avatarHost, {
          src: user.src,
          name: overlayLabel,
          alt: user.name,
          isActive: user.isActive
        }, {
          size: cfg.size,
          shape: 'circle',
          nameOverlay: !!cfg.nameOverlay,
          altFromName: true
        });
        item.appendChild(avatarHost);
        frag.appendChild(item);
      }
      host.appendChild(frag);
      return host;
    }

    _normalizeUser(entry)
    {
      if (!entry) return null;
      if (typeof entry === 'string')
      {
        return { name: String(entry), role: '', src: '' };
      }
      if (typeof entry !== 'object') return null;
      var name = String(entry.name || entry.displayName || entry.label || '') || '';
      var role = '';
      var roleKeys = ['role', 'title', 'position', 'type'];
      for (var i = 0; i < roleKeys.length; i += 1)
      {
        var key = roleKeys[i];
        if (Object.prototype.hasOwnProperty.call(entry, key))
        {
          role = String(entry[key] || '');
          break;
        }
      }
      var src = this._resolveAvatar(entry);
      return { name: name, role: role, src: src, isActive: this._isActiveUser(entry) };
    }

    _resolveAvatar(candidate)
    {
      if (!candidate || typeof candidate !== 'object')
      {
        return '';
      }
      var keys = ['src', 'url', 'href', 'imageUrl', 'imageURL', 'avatar', 'avatarUrl', 'avatarURL', 'photoUrl', 'photoURL'];
      for (var i = 0; i < keys.length; i += 1)
      {
        var key = keys[i];
        if (!Object.prototype.hasOwnProperty.call(candidate, key))
        {
          continue;
        }
        var value = candidate[key];
        if (typeof value === 'string' && value.trim())
        {
          return value;
        }
      }
      return '';
    }

    _buildOverlayLabel(name, maxLength)
    {
      var label = String(name || '');
      var limit = Number(maxLength);
      if (!limit || limit < 1) return label;
      if (label.length <= limit) return label;
      return label.slice(0, limit) + '…';
    }

    _isActiveUser(entry)
    {
      if (!entry) return true;
      var value = entry.isActive;
      if (value === false || value === 0 || value === '0' || value === 'false')
      {
        return false;
      }
      return true;
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.UserlistAvatar || (Services.UserlistAvatar = {});
  NS.JobInline = NS.JobInline || JobInline;

})(window, document);
