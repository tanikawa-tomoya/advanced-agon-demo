(function () {

  'use strict';

  class JobLayer
  {
    constructor(service)
    {
      this.service = service;
    }

    resolveElement(ref)
    {
      if (!ref) return null;
      if (typeof ref === 'string') {
        return document.querySelector(ref);
      }
      if (ref && ref.nodeType === 1) return ref;
      return null;
    }

    ensureLayer(container, zIndex)
    {
      container = container || document.body;
      var css = this.service.CSS;
      var layer = document.querySelector('.' + css.LAYER);
      if (!layer) {
        layer = document.createElement('div');
        layer.className = css.LAYER;
        layer.style.position = 'absolute';
        layer.style.top = '0';
        layer.style.left = '0';
        layer.style.width = '0';
        layer.style.height = '0';
        layer.style.zIndex = String(typeof zIndex === 'number' ? zIndex : this.service.config.zIndex || 10000);
        layer.style.pointerEvents = 'none';
        container.appendChild(layer);
      } else if (typeof zIndex === 'number') {
        layer.style.zIndex = String(zIndex);
      }
      return layer;
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.Tooltip || (Services.Tooltip = {});
  NS.JobLayer = NS.JobLayer || JobLayer;    

})(window, document);
