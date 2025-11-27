(function () {
  'use strict';

  class JobView
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
      if (ref && ref.nodeType === 1) { return ref; }
      return document.body;
    }

    createBlock(options)
    {
      var block = document.createElement('div');
      block.className = 'c-fixed-overlay-vertical-block';
      block.classList.add(options.position === 'right' ? 'is-right' : 'is-left');
      block.style.top = this._toCssLength(options.offsetTop);
      if (options.position === 'right') {
        block.style.right = this._toCssLength(options.offsetRight);
        block.style.left = 'auto';
      } else {
        block.style.left = this._toCssLength(options.offsetLeft);
        block.style.right = 'auto';
      }
      block.style.borderWidth = this._toCssLength(options.borderWidth);
      block.style.borderColor = options.borderColor;
      block.style.borderStyle = 'solid';
      block.style.backgroundColor = this._resolveBackgroundColor(options.backgroundColor, options.backgroundOpacity);
      block.style.zIndex = String(options.zIndex);

      var title = document.createElement('div');
      title.className = 'c-fixed-overlay-vertical-block__title';
      title.textContent = options.title || '';
      if (options.titleFont) { title.style.fontFamily = options.titleFont; }

      var list = document.createElement('ul');
      list.className = 'c-fixed-overlay-vertical-block__list';
      if (options.detailFont) { list.style.fontFamily = options.detailFont; }

      var details = Array.isArray(options.details) ? options.details : [];
      for (var i = 0; i < details.length; i++) {
        var text = details[i];
        var item = document.createElement('li');
        item.className = 'c-fixed-overlay-vertical-block__item';
        item.textContent = (text == null) ? '' : String(text);
        list.appendChild(item);
      }

      block.appendChild(title);
      block.appendChild(list);
      return block;
    }

    updateBlock(node, options)
    {
      if (!node || node.className.indexOf('c-fixed-overlay-vertical-block') === -1) { return null; }
      var parent = node.parentNode;
      if (parent) {
        var nextBlock = this.createBlock(options);
        parent.replaceChild(nextBlock, node);
        return nextBlock;
      }
      return null;
    }

    removeBlock(node)
    {
      if (!node || !node.parentNode) return false;
      node.parentNode.removeChild(node);
      return true;
    }

    _resolveBackgroundColor(color, opacity)
    {
      var alpha = typeof opacity === 'number' ? Math.min(Math.max(opacity, 0), 1) : null;
      var hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
      if (alpha !== null && typeof color === 'string' && hexMatch.test(color.trim())) {
        var hex = color.trim().substring(1);
        if (hex.length === 3) {
          hex = hex.split('').map(function (c) { return c + c; }).join('');
        }
        var r = parseInt(hex.substr(0, 2), 16);
        var g = parseInt(hex.substr(2, 2), 16);
        var b = parseInt(hex.substr(4, 2), 16);
        return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
      }
      return color || 'rgba(38, 38, 38, 0.8)';
    }

    _toCssLength(value)
    {
      if (typeof value === 'number' && isFinite(value)) { return value + 'px'; }
      if (typeof value === 'string' && value.trim().length > 0) { return value.trim(); }
      return '0px';
    }
  }

  var Services = window.Services = window.Services || {};
  var NS = Services.FixedOverlayVerticalBlock || (Services.FixedOverlayVerticalBlock = {});
  NS.JobView = NS.JobView || JobView;

})(window, document);
