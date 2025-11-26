(function () {

  'use strict';

  function removePlacementClasses(el, prefix)
  {
    var classes = Array.prototype.slice.call(el.classList);
    for (var i = 0; i < classes.length; i++) {
      if (classes[i].indexOf(prefix) === 0) el.classList.remove(classes[i]);
    }
  }

  class JobTooltip
  {
    constructor(service)
    {
      this.service = service;
    }

    createTooltip(opts)
    {
      var css = this.service.CSS;
      var id = opts.id || ('tooltip-' + Date.now());
      var role = this.service.config.ariaRole || 'tooltip';
      var allowHTML = !!opts.allowHTML;
      var sanitize = typeof opts.sanitize === 'function' ? opts.sanitize : null;
      var content = (typeof opts.content !== 'undefined') ? opts.content : '';
      var typeClass = opts.typeClass || 'is-default';
      var placement = String(opts.placement || 'top');

      var tip = document.createElement('div');
      tip.className = css.BASE + ' ' + typeClass + ' ' + css.PLACEMENT_PREFIX + placement;
      tip.id = id;
      tip.setAttribute('role', role);
      tip.setAttribute('data-placement', placement);
      tip.style.position = 'absolute';
      tip.style.pointerEvents = 'auto';

      var inner = document.createElement('div');
      inner.className = css.CONTENT;
      if (allowHTML) {
        inner.innerHTML = sanitize ? sanitize(String(content || '')) : String(content || '');
      } else {
        inner.textContent = String(content || '');
      }

      var arrow = document.createElement('div');
      arrow.className = css.ARROW;

      tip.appendChild(inner);
      tip.appendChild(arrow);

      return tip;
    }

    updateTooltip(tip, updates, css) {
      if (!tip || !updates) return;
      css = css || this.service.CSS;
      if (Object.prototype.hasOwnProperty.call(updates, 'content')) {
        var inner = tip.querySelector('.' + css.CONTENT);
        if (inner) {
          if (updates.allowHTML) {
            var sanitize = typeof updates.sanitize === 'function' ? updates.sanitize : null;
            inner.innerHTML = sanitize ? sanitize(String(updates.content || '')) : String(updates.content || '');
          } else {
            inner.textContent = String(updates.content || '');
          }
        }
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'typeClass')) {
        var classes = Array.prototype.slice.call(tip.classList);
        for (var i = 0; i < classes.length; i++) {
          if (classes[i].indexOf('is-') === 0) tip.classList.remove(classes[i]);
        }
        tip.classList.add(String(updates.typeClass));
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'placement')) {
        removePlacementClasses(tip, css.PLACEMENT_PREFIX);
        var p = String(updates.placement);
        tip.classList.add(css.PLACEMENT_PREFIX + p);
        tip.setAttribute('data-placement', p);
      }
    }

    removeTooltip(tip) {
      if (!tip) return;
      if (tip.parentNode) tip.parentNode.removeChild(tip);
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.Tooltip || (Services.Tooltip = {});
  NS.JobTooltip = NS.JobTooltip || JobTooltip;        

})(window, document);
