(function () {
  'use strict';

  class JobRegion
  {
    constructor(service) {
      this.service = service;
    }

    resolveContainer(ref)
    {
      if (!ref) return document.body;
      if (typeof ref === 'string') {
        var el = document.querySelector(ref);
        return el || document.body;
      }
      if (ref && ref.nodeType === 1) return ref;
      return document.body;
    }

    getRegion(container)
    {
      container = this.resolveContainer(container);
      return container.querySelector('.c-help-modal-region');
    }

    ensureRegion(container, position, zIndex)
    {
      container = this.resolveContainer(container);
      var region = this.getRegion(container);
      if (!region) {
        region = document.createElement('div');
        region.className = 'c-help-modal-region is-' + String(position || 'center');
        if (container === document.body) {
          region.style.position = 'fixed';
          region.style.top = '0';
          region.style.left = '0';
          region.style.width = '100%';
          region.style.height = '100%';
        } else {
          region.style.position = 'absolute';
          region.style.top = '0';
          region.style.left = '0';
          region.style.right = '0';
          region.style.bottom = '0';
          try {
            var cs = window.getComputedStyle(container);
            if (cs && cs.position === 'static') container.style.position = 'relative';
          } catch (e) {}
        }
        if (typeof zIndex !== 'undefined' && zIndex !== null) {
          region.style.zIndex = String(zIndex);
        }
        container.appendChild(region);
      } else {
        // 位置クラス更新
        var classes = Array.prototype.slice.call(region.classList).filter(function (c) { return c.indexOf('is-') === 0; });
        classes.forEach(function (c) { region.classList.remove(c); });
        region.classList.add('is-' + String(position || 'center'));
        if (typeof zIndex !== 'undefined' && zIndex !== null) {
          region.style.zIndex = String(zIndex);
        }
      }
      return region;
    }

    mount(region, overlay, zIndex) {
      if (typeof zIndex === 'number') overlay.style.zIndex = String(zIndex);
      region.appendChild(overlay);
      overlay.classList.add('is-open');
      // overlay 自身で close 要求を投げるので、ここで拾って閉じる
      overlay.addEventListener('helpmodal:request-close', () => {
        if (this.service && typeof this.service.dismiss === 'function') this.service.dismiss();
      }, true);
      return overlay;
    }

    unmount(overlay) {
      if (!overlay) return;
      overlay.classList.remove('is-open');
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    isRegionEmpty(region) {
      return !region.querySelector('.c-help-modal');
    }

    removeRegion(region) {
      if (region && region.parentNode) region.parentNode.removeChild(region);
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.HelpModal || (Services.HelpModal = {});
  NS.JobRegion = NS.JobRegion || JobRegion;  

})(window, document);
