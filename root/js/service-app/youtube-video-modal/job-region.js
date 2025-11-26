(function () {
  'use strict';

  var w = window;

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

    getRegion(container, CSS)
    {
      container = this.resolveContainer(container);
      return container.querySelector('.' + CSS.region);
    }

    ensureRegion(container, CSS, zIndex)
    {
      container = this.resolveContainer(container);
      var region = this.getRegion(container, CSS);
      if (!region) {
        region = document.createElement('div');
        region.className = CSS.region;
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
      } else if (typeof zIndex !== 'undefined' && zIndex !== null) {
        region.style.zIndex = String(zIndex);
      }
      return region;
    }

    cleanupIfEmpty(CSS)
    {
      var regions = document.querySelectorAll('.' + CSS.region);
      for (var i = 0; i < regions.length; i++) {
        var region = regions[i];
        if (!region.querySelector('.' + CSS.modal)) {
          if (region.parentNode) region.parentNode.removeChild(region);
        }
      }
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.YoutubeVideoModal || (Services.YoutubeVideoModal = {});
  NS.JobRegion = NS.JobRegion || JobRegion;

})(window, document);
