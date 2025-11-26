(function () {

  'use strict';

  class JobBuildAvatar
  {
    constructor(service)
    {
      this.service = service;
    }

    createAvatar(cfg, data)
    {
      var id = String(cfg.id || ('avatar-' + Date.now()));
      var size = Number(cfg.size || 40);
      var classRoot = String(cfg.classRoot || 'c-user-avatar');
      var altFromName = !!cfg.altFromName;
      var nameOverlay = !!cfg.nameOverlay;
      var initialsFallback = !!cfg.initialsFallback;

      var wrapper = document.createElement('div');
      wrapper.className = classRoot;
      wrapper.id = id;
      wrapper.style.width = size + 'px';
      wrapper.style.height = size + 'px';
      wrapper.style.position = 'relative';
      wrapper.style.overflow = 'hidden';
      wrapper.style.display = 'inline-block';

      var img = document.createElement('img');
      img.className = classRoot + '__img';
      img.width = size;
      img.height = size;
      img.referrerPolicy = 'no-referrer';

      var src = String((data && data.src) || '');
      var name = String((data && data.name) || '');
      var alt = String((data && data.alt) || '');
      var isActive = !(data && data.isActive === false);

      if (!alt && altFromName) alt = name || '';

      img.alt = alt;
      if (src) img.src = src;

      var self = this;
      img.onerror = function () {
        if (!initialsFallback) return;
        // フォールバック: 頭文字SVGを data URL として表示
        var initials = self._toInitials(name || alt || '');
        var svg = self._svgDataURL(initials, size);
        img.src = svg;
      };

      wrapper.appendChild(img);

      var overlay = null;
      if (nameOverlay) {
        overlay = this._createNameOverlay(classRoot, name || alt || '');
        if (overlay) wrapper.appendChild(overlay);
        wrapper.classList.add(classRoot + '--with-name-overlay');
      }

      this._applyActiveState(wrapper, isActive, classRoot);

      // 内部状態を保持（update 用）
      wrapper.__ua = {
        img: img,
        size: size,
        name: name,
        altFromName: altFromName,
        nameOverlay: nameOverlay,
        nameOverlayEl: overlay,
        initialsFallback: initialsFallback,
        classRoot: classRoot,
        isActive: isActive
      };
      return wrapper;
    }

    updateAvatar(wrapper, updates) {
      if (!wrapper || !updates) return;
      var st = wrapper.__ua || (wrapper.__ua = {});
      var img = st.img || wrapper.querySelector('img');
      if (!img) return;

      if (Object.prototype.hasOwnProperty.call(updates, 'size')) {
        var size = Number(updates.size);
        if (size > 0) {
          wrapper.style.width = size + 'px';
          wrapper.style.height = size + 'px';
          img.width = size;
          img.height = size;
          st.size = size;
        }
      }

      if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
        st.name = String(updates.name || '');
        if (st.altFromName && (!updates.alt && !img.alt)) {
          img.alt = st.name;
        }
        if (st.nameOverlayEl) {
          st.nameOverlayEl.textContent = st.name || img.alt || '';
        }
      }

      if (Object.prototype.hasOwnProperty.call(updates, 'alt')) {
        img.alt = String(updates.alt || '');
        if (st.nameOverlayEl && !st.name) {
          st.nameOverlayEl.textContent = img.alt;
        }
      }

      if (Object.prototype.hasOwnProperty.call(updates, 'src')) {
        var src = String(updates.src || '');
        if (src) {
          img.onerror = null; // 一旦既存を外してから再設定
          img.src = src;
          var self = this;
          img.onerror = function () {
            if (!st.initialsFallback) return;
            var initials = self._toInitials(st.name || img.alt || '');
            var svg = self._svgDataURL(initials, st.size || img.width || 40);
            img.src = svg;
          };
        }
      }

      if (Object.prototype.hasOwnProperty.call(updates, 'nameOverlay')) {
        st.nameOverlay = !!updates.nameOverlay;
        if (st.nameOverlay && !st.nameOverlayEl) {
          st.nameOverlayEl = this._createNameOverlay(st.classRoot, st.name || img.alt || '');
          if (st.nameOverlayEl) {
            wrapper.appendChild(st.nameOverlayEl);
            wrapper.classList.add(st.classRoot + '--with-name-overlay');
          }
        } else if (!st.nameOverlay && st.nameOverlayEl) {
          if (st.nameOverlayEl.parentNode === wrapper) {
            wrapper.removeChild(st.nameOverlayEl);
          }
          st.nameOverlayEl = null;
          wrapper.classList.remove(st.classRoot + '--with-name-overlay');
        }
      }

      if (Object.prototype.hasOwnProperty.call(updates, 'isActive')) {
        st.isActive = !(updates.isActive === false);
        this._applyActiveState(wrapper, st.isActive, st.classRoot);
      }
    }

    _applyActiveState(wrapper, isActive, classRoot) {
      if (!wrapper) return;
      var inactiveClass = classRoot + '--inactive';
      var activeValue = isActive === false ? 'false' : 'true';
      wrapper.classList.toggle(inactiveClass, isActive === false);
      wrapper.setAttribute('data-user-active', activeValue);
    }

    _toInitials(name) {
      if (!name) return '?';
      var parts = String(name).trim().split(/\s+/);
      var first = parts[0] ? parts[0][0] : '';
      var last = parts.length > 1 ? parts[parts.length - 1][0] : '';
      var res = (first + last) || first || '?';
      return res.toUpperCase().slice(0, 2);
    }

    _svgDataURL(initials, size) {
      var s = Number(size || 40);
      var fontSize = Math.round(s * 0.45);
      var bg = '#CBD5E1'; // neutral bg
      var fg = '#0F172A'; // dark text
      var svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '" viewBox="0 0 ' + s + ' ' + s + '">' +
        '<rect width="' + s + '" height="' + s + '" fill="' + bg + '"/>' +
        '<text x="50%" y="50%" dy="0.36em" text-anchor="middle" font-family="sans-serif" font-size="' + fontSize + '" fill="' + fg + '">' +
        this._escapeXml(initials) +
        '</text></svg>';
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

    _escapeXml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    _createNameOverlay(classRoot, label) {
      var overlay = document.createElement('span');
      overlay.className = classRoot + '__name-overlay';
      overlay.textContent = String(label || '');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.position = 'absolute';
      overlay.style.left = '0';
      overlay.style.right = '0';
      overlay.style.bottom = '0';
      overlay.style.padding = '4px 6px';
      overlay.style.background = 'linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.55) 80%)';
      overlay.style.color = '#ffffff';
      overlay.style.fontSize = '0.75rem';
      overlay.style.lineHeight = '1.2';
      overlay.style.textAlign = 'center';
      overlay.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.45)';
      overlay.style.boxSizing = 'border-box';
      overlay.style.whiteSpace = 'nowrap';
      overlay.style.overflow = 'hidden';
      overlay.style.textOverflow = 'ellipsis';
      overlay.style.pointerEvents = 'none';
      return overlay;
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.UserAvatar || (Services.UserAvatar = {});
  NS.JobBuildAvatar = NS.JobBuildAvatar || JobBuildAvatar;  

})(window, document);
