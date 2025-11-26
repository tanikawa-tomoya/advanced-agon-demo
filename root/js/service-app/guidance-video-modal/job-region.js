(function () {

  'use strict';
  
  var POS_CLASSES = ['is-center','is-top','is-bottom','is-left','is-right'];

  class JobRegion
  {
    constructor(service)
    {
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
      return container.querySelector('.c-gvm-region');
    }

    ensureRegion(container, position, zIndex) {
      container = this.resolveContainer(container);
      var region = this.getRegion(container);
      if (!region) {
        region = document.createElement('div');
        region.className = 'c-gvm-region';
        this.applyRegionPosition(region, position || 'center');
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
            var cs = w.getComputedStyle(container);
            if (cs && cs.position === 'static') container.style.position = 'relative';
          } catch (e) {}
        }
        if (typeof zIndex !== 'undefined' && zIndex !== null) {
          region.style.zIndex = String(zIndex);
        }
        container.appendChild(region);
      } else {
        this.applyRegionPosition(region, position || 'center');
        if (typeof zIndex !== 'undefined' && zIndex !== null) {
          region.style.zIndex = String(zIndex);
        }
      }
      return region;
    }

    applyRegionPosition(region, position) {
      POS_CLASSES.forEach(function (c) { region.classList.remove(c); });
      var cls = 'is-' + String(position || 'center');
      region.classList.add(cls);
    }

    isRegionEmpty(region) {
      return !region.querySelector('.c-gvm');
    }

    removeRegion(region) {
      if (region && region.parentNode) region.parentNode.removeChild(region);
    }

    removeAllRegions() {
      var nodes = document.querySelectorAll('.c-gvm-region');
      for (var i = 0; i < nodes.length; i++) this.removeRegion(nodes[i]);
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.GuidanceVideoModal || (Services.GuidanceVideoModal = {});
  NS.JobRegion = NS.JobRegion || JobRegion;    

})(window, document);
