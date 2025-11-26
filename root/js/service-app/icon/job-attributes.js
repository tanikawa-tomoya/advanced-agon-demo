(function () {
  
  'use strict';

  class JobAttributes
  {
    constructor(service)
    {
      this.service = service;
    }

    normalizeClassList(value)
    {
      if (!value) return [];
      if (Array.isArray(value)) {
        return value.reduce(function (acc, v) {
          if (typeof v === 'string') acc = acc.concat(v.split(/\s+/g).filter(Boolean));
          return acc;
        }, []);
      }
      if (typeof value === 'string') {
        return value.split(/\s+/g).filter(Boolean);
      }
      return [];
    }

    applyAttributes(node, attributes)
    {
      if (!node || !attributes) return;
      for (var k in attributes) {
        if (!Object.prototype.hasOwnProperty.call(attributes, k)) continue;
        var v = attributes[k];
        if (v === null || typeof v === 'undefined') continue;
        node.setAttribute(k, String(v));
      }
    }

    applyDataset(node, dataset)
    {
      if (!node || !dataset) return;
      for (var k in dataset) {
        if (!Object.prototype.hasOwnProperty.call(dataset, k)) continue;
        node.dataset[k] = String(dataset[k]);
      }
    }

    createSrText(text, cls)
    {
      var span = document.createElement('span');
      span.className = cls || 'u-sr-only';
      span.textContent = String(text || '');
      return span;
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.Icon || (Services.Icon = {});
  NS.JobAttribute = NS.JobAttribute || JobAttribute;    

})(window, document);
