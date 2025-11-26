(function () {

  'use strict';

  var w = window;
  var POS_SUFFIXES = [
    'top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center'
  ];

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
      return container.querySelector('.c-toast-region');
    }

    ensureRegion(container, position, zIndex)
    {
      container = this.resolveContainer(container);
      var region = this.getRegion(container);
      if (!region) {
        region = document.createElement('div');
        region.className = 'c-toast-region';
        container.appendChild(region);
      }
      this.applyRegionPosition(region, position || 'top-right');

      if (container === document.body) {
        region.removeAttribute('style');
      } else {
        region.style.position = 'absolute';
        region.style.top = '0';
        region.style.left = '0';
        region.style.right = '0';
        region.style.height = '0';
        region.style.pointerEvents = 'none';
        try {
          var cs = w.getComputedStyle(container);
          if (cs && cs.position === 'static') container.style.position = 'relative';
        } catch (e) {}
      }
      if (typeof zIndex !== 'undefined' && zIndex !== null) {
        region.style.zIndex = String(zIndex);
      } else if (container === document.body) {
        region.style.removeProperty && region.style.removeProperty('z-index');
      }
      return region;
    }

    applyRegionPosition(region, position) {
      var suffix = String(position || 'top-right');
      POS_SUFFIXES.forEach(function (name) {
        region.classList.remove('is-' + name);
        region.classList.remove('c-toast-region--' + name);
      });
      region.classList.add('is-' + suffix);
      region.classList.add('c-toast-region--' + suffix);
    }

    isRegionEmpty(region) {
      return !region.querySelector('.c-toast');
    }

    removeRegion(region) {
      if (region && region.parentNode) region.parentNode.removeChild(region);
    }

    removeAllRegions() {
      var nodes = document.querySelectorAll('.c-toast-region');
      for (var i = 0; i < nodes.length; i++) this.removeRegion(nodes[i]);
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.Toast || (Services.Toast = {});
  NS.JobRegion = NS.JobRegion || JobRegion;    

})(window, document);
