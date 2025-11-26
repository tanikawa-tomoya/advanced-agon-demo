(function () {

  'use strict';

  function uniq(list)
  {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      if (out.indexOf(list[i]) < 0) out.push(list[i]);
    }
    return out;
  }

  class JobAria
  {
    constructor(service)
    {
      this.service = service;
    }

    addDescribedby(el, id)
    {
      if (!el || !id) return;
      var cur = el.getAttribute('aria-describedby') || '';
      var parts = cur ? cur.split(/\s+/).filter(Boolean) : [];
      parts.push(String(id));
      parts = uniq(parts);
      el.setAttribute('aria-describedby', parts.join(' '));
    }

    removeDescribedby(el, id) {
      if (!el || !id) return;
      var cur = el.getAttribute('aria-describedby') || '';
      if (!cur) return;
      var parts = cur.split(/\s+/).filter(Boolean).filter(function (p) { return p !== String(id); });
      if (parts.length) el.setAttribute('aria-describedby', parts.join(' '));
      else el.removeAttribute('aria-describedby');
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.Tooltip || (Services.Tooltip = {});
  NS.JobAria = NS.JobAria || JobAria;  

})(window, document);
